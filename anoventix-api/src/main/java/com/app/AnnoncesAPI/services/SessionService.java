package com.app.AnnoncesAPI.services;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import com.app.AnnoncesAPI.entities.RefreshToken;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.RefreshTokenRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.security.JwtUtils;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

import io.jsonwebtoken.Claims;

/**
 * Sessions des appareils : jetons de rafraîchissement enregistrés en base, à usage unique,
 * avec détection de rejeu (ECART-21, ECART-51).
 *
 * <ul>
 *   <li>Une connexion ouvre une session (une « famille » de jetons).</li>
 *   <li>Chaque rafraîchissement consomme le jeton et en délivre un nouveau de la même famille.</li>
 *   <li>Un jeton déjà consommé, présenté après le délai de tolérance, est un rejeu : toute la
 *       famille est révoquée, l'attaquant comme le titulaire doivent se reconnecter.</li>
 * </ul>
 *
 * Les jetons antérieurs à ce mécanisme (sans identifiant) sont acceptés jusqu'à leur expiration
 * et remplacés au premier rafraîchissement.
 */
@Service
public class SessionService {

    private static final Logger logger = LoggerFactory.getLogger(SessionService.class);

    /**
     * Deux rafraîchissements du même jeton, très rapprochés, sont un cas normal (deux onglets,
     * un réessai réseau) et non un vol : tolérés pendant ce délai, sans révoquer la famille.
     */
    static final Duration TOLERANCE_REJEU = Duration.ofSeconds(10);

    /** Les comptes du staff se reconnectent chaque jour (DEC-03, RG-01-38). */
    static final Duration DUREE_SESSION_STAFF = Duration.ofHours(24);

    /** Résultat d'un rafraîchissement : le compte et le nouveau jeton à remettre au client. */
    public record Rotation(User user, String refreshToken, Duration duree) {}

    private final RefreshTokenRepository tokens;
    private final UserRepository users;
    private final JwtUtils jwtUtils;
    private final TransactionTemplate transaction;

    public SessionService(RefreshTokenRepository tokens, UserRepository users, JwtUtils jwtUtils,
                          PlatformTransactionManager transactionManager) {
        this.tokens = tokens;
        this.users = users;
        this.jwtUtils = jwtUtils;
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Ouvre une nouvelle session (connexion) et renvoie son premier jeton. */
    @Transactional
    public String ouvrirSession(User user) {
        return emettre(user, UUID.randomUUID());
    }

    public Duration dureeSession(User user) {
        boolean staff = user.getRole() != null
                && (user.getRole().getName() == TypeRole.MODERATEUR
                    || user.getRole().getName() == TypeRole.ADMINISTRATEUR);
        return staff ? DUREE_SESSION_STAFF : jwtUtils.dureeRefresh();
    }

    /**
     * Consomme un jeton de rafraîchissement et en délivre un autre.
     *
     * Le rejeu révoque la famille, et cette révocation doit être enregistrée alors même que la
     * requête échoue. La rotation s'exécute donc dans sa propre transaction (REQUIRES_NEW, quel
     * que soit l'appelant : AuthServiceImpl est transactionnel et annulerait tout en cas
     * d'exception) et l'échec en sort comme une valeur, levée seulement une fois la transaction
     * validée.
     */
    public Rotation tourner(String refreshJwt) {
        Resultat resultat = transaction.execute(statut -> {
            try {
                return new Resultat(tournerEnBase(refreshJwt), null);
            } catch (AuthenticationException e) {
                return new Resultat(null, e);
            }
        });
        if (resultat.echec() != null) {
            throw resultat.echec();
        }
        return resultat.rotation();
    }

    private record Resultat(Rotation rotation, AuthenticationException echec) {}

    private Rotation tournerEnBase(String refreshJwt) {
        Claims claims = jwtUtils.parseValidClaims(refreshJwt)
                .filter(c -> JwtUtils.isOfType(c, JwtUtils.TYPE_REFRESH))
                .orElseThrow(SessionService::invalide);

        if (claims.getId() == null) {
            return tournerJetonHerite(claims);
        }

        RefreshToken token = tokens.verrouiller(identifiant(claims.getId())).orElseThrow(SessionService::invalide);
        if (token.estRevoque() || token.estExpire()) {
            throw invalide();
        }
        if (token.getUtiliseLe() != null && token.getUtiliseLe().plus(TOLERANCE_REJEU).isBefore(LocalDateTime.now())) {
            tokens.revoquerFamille(token.getFamilleId(), LocalDateTime.now());
            logger.warn("Jeton de rafraîchissement rejoué : session {} révoquée (compte {})",
                    token.getFamilleId(), token.getUserId());
            throw invalide();
        }

        User user = users.findById(token.getUserId()).orElseThrow(SessionService::invalide);
        verifierCompte(user, claims);

        token.marquerUtilise();
        return new Rotation(user, emettre(user, token.getFamilleId()), dureeSession(user));
    }

    /** Jeton émis avant la table refresh_token : valable une dernière fois, remplacé par un jeton suivi. */
    private Rotation tournerJetonHerite(Claims claims) {
        User user = users.findByEmail(claims.getSubject()).orElseThrow(SessionService::invalide);
        verifierCompte(user, claims);
        return new Rotation(user, emettre(user, UUID.randomUUID()), dureeSession(user));
    }

    /** Un compte suspendu ou désactivé ne prolonge pas sa session, ni après un changement de mot de passe. */
    private void verifierCompte(User user, Claims claims) {
        if (!UserDetailsImpl.build(user).isEnabled()) {
            throw new DisabledException("Votre compte n'est pas actif. Contactez l'administrateur.");
        }
        if (JwtUtils.isIssuedBefore(claims, user.getPasswordChangedAt())) {
            throw new BadCredentialsException(
                    "Session expirée suite à un changement de mot de passe. Veuillez vous reconnecter.");
        }
    }

    /** Déconnexion : met fin à la session de l'appareil (toute la famille du jeton). */
    @Transactional
    public void fermerSession(String refreshJwt) {
        jwtUtils.parseValidClaims(refreshJwt)
                .filter(c -> JwtUtils.isOfType(c, JwtUtils.TYPE_REFRESH) && c.getId() != null)
                .flatMap(c -> tokens.findById(identifiant(c.getId())))
                .ifPresent(t -> tokens.revoquerFamille(t.getFamilleId(), LocalDateTime.now()));
    }

    /** Mot de passe changé, compte suspendu ou supprimé : tous les appareils sont déconnectés. */
    @Transactional
    public void fermerToutesLesSessions(UUID userId) {
        tokens.revoquerTousDe(userId, LocalDateTime.now());
    }

    @Scheduled(cron = "0 20 3 * * *")
    @Transactional
    public void purgerJetonsExpires() {
        // Un jour de marge : un jeton expiré reste lisible un peu, pour le diagnostic.
        int supprimes = tokens.supprimerExpiresAvant(LocalDateTime.now().minusDays(1));
        logger.info("Sessions : {} jeton(s) de rafraîchissement expiré(s) supprimé(s)", supprimes);
    }

    private String emettre(User user, UUID familleId) {
        UUID id = UUID.randomUUID();
        Instant expiration = Instant.now().plus(dureeSession(user));
        tokens.save(new RefreshToken(id, familleId, user.getId(),
                LocalDateTime.ofInstant(expiration, ZoneId.systemDefault())));
        return jwtUtils.generateRefreshToken(user.getEmail(), id, familleId, expiration);
    }

    private static UUID identifiant(String jti) {
        try {
            return UUID.fromString(jti);
        } catch (IllegalArgumentException e) {
            throw invalide();
        }
    }

    private static BadCredentialsException invalide() {
        return new BadCredentialsException("Refresh token invalide ou expiré.");
    }
}
