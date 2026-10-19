package com.app.AnnoncesAPI.services;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.entities.Annonce;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.repositories.AnnonceRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.MediaRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.media.MediaService;

/**
 * Cycle de vie RGPD d'un compte supprimé par son propriétaire :
 * <ol>
 *   <li>demande : compte désactivé immédiatement, réactivable pendant
 *       {@link User#DELAI_GRACE_SUPPRESSION_JOURS} jours ;</li>
 *   <li>délai écoulé : anonymisation irréversible des données personnelles (job quotidien).</li>
 * </ol>
 * Un administrateur peut aussi supprimer un compte immédiatement ({@link #supprimerParAdministrateur}) :
 * annonces et photos effacées puis anonymisation, sans délai de grâce.
 * Les messages sont conservés (intégrité des échanges), mais ne pointent plus que vers un
 * compte anonyme.
 */
@Service
public class CompteSuppressionService {

    private static final Logger logger = LoggerFactory.getLogger(CompteSuppressionService.class);

    public static final String MOTIF_SUPPRESSION_DEMANDEE = "Suppression demandée par l'utilisateur";
    public static final String MOTIF_ANONYMISE = "Compte anonymisé (RGPD)";
    static final String NOM_ENTREPRISE_SUPPRIMEE = "Entreprise supprimée";
    /** Posé sur les agents désactivés parce que le compte du PROFESSIONNEL a été supprimé. */
    static final String MOTIF_ENTREPRISE_SUPPRIMEE = "Compte de l'entreprise supprimé";

    private final UserRepository userRepository;
    private final AnnonceRepository annonceRepository;
    private final EntrepriseRepository entrepriseRepository;
    private final MediaRepository mediaRepository;
    private final MediaService mediaService;
    private final PasswordEncoder passwordEncoder;
    private final SessionService sessionService;

    public CompteSuppressionService(UserRepository userRepository,
                                    AnnonceRepository annonceRepository,
                                    EntrepriseRepository entrepriseRepository,
                                    MediaRepository mediaRepository,
                                    MediaService mediaService,
                                    PasswordEncoder passwordEncoder,
                                    SessionService sessionService) {
        this.sessionService = sessionService;
        this.userRepository = userRepository;
        this.annonceRepository = annonceRepository;
        this.entrepriseRepository = entrepriseRepository;
        this.mediaRepository = mediaRepository;
        this.mediaService = mediaService;
        this.passwordEncoder = passwordEncoder;
    }

    /** Suppression demandée par l'utilisateur : désactivation immédiate, réversible pendant le délai de grâce. */
    @Transactional
    public void demanderSuppression(User user) {
        annonceRepository.deactivateByOwnerId(user.getId());
        user.setStatut(StatutUtilisateur.INACTIF);
        user.setMotifStatut(MOTIF_SUPPRESSION_DEMANDEE);
        user.setDateSuppressionDemandee(LocalDateTime.now());
        userRepository.save(user);
        sessionService.fermerToutesLesSessions(user.getId());

        // Un PROFESSIONNEL emporte son entreprise : sinon ses agents continueraient à publier
        // sous une entreprise orpheline.
        entrepriseRepository.findByAnnonceurProfessionnel(user).ifPresent(entreprise -> {
            entreprise.setActive(false);
            entrepriseRepository.save(entreprise);
            for (User agent : agentsActifs(entreprise, user)) {
                annonceRepository.deactivateByOwnerId(agent.getId());
                agent.setStatut(StatutUtilisateur.INACTIF);
                agent.setMotifStatut(MOTIF_ENTREPRISE_SUPPRIMEE);
                userRepository.save(agent);
                sessionService.fermerToutesLesSessions(agent.getId());
            }
        });
        logger.info("Suppression de compte demandée pour l'utilisateur ID={}", user.getId());
    }

    /**
     * Annule les effets de {@link #demanderSuppression} sur l'entreprise après une réactivation
     * pendant le délai de grâce. Les annonces restent masquées : le propriétaire les réaffiche
     * une à une (elles peuvent être obsolètes).
     */
    @Transactional
    public void restaurerApresReactivation(User user) {
        entrepriseRepository.findByAnnonceurProfessionnel(user).ifPresent(entreprise -> {
            entreprise.setActive(true);
            entrepriseRepository.save(entreprise);
            for (User agent : userRepository.findByEntrepriseId(entreprise.getId())) {
                if (MOTIF_ENTREPRISE_SUPPRIMEE.equals(agent.getMotifStatut())) {
                    agent.setStatut(Boolean.TRUE.equals(agent.getMustChangePassword()) || agent.getActivationCode() != null
                            ? StatutUtilisateur.EN_ATTENTE_ACTIVATION
                            : StatutUtilisateur.ACTIF);
                    agent.setMotifStatut(null);
                    userRepository.save(agent);
                }
            }
        });
    }

    /**
     * Suppression par un administrateur : immédiate et définitive (pas de délai de grâce).
     * Un PROFESSIONNEL emporte son entreprise et tous ses agents.
     */
    @Transactional
    public void supprimerParAdministrateur(User user) {
        effacerCompteEtEntreprise(user);
        logger.info("Compte ID={} supprimé par un administrateur", user.getId());
    }

    /** Compte resté sans connexion 3 mois après sa relance d'inactivité (SFG §11.2) : effacé comme à l'échéance RGPD. */
    @Transactional
    public void supprimerPourInactivite(java.util.UUID userId) {
        // Chargé dans la transaction : l'effacement parcourt des collections paresseuses (favoris…).
        userRepository.findById(userId).ifPresent(this::effacerCompteEtEntreprise);
        logger.info("Compte ID={} anonymisé pour inactivité", userId);
    }

    /**
     * Efface le compte et, pour un PROFESSIONNEL, son entreprise et tous ses agents : annonces
     * désactivées, photos et pièces d'identité supprimées du disque, données personnelles anonymisées.
     * Commun à la suppression par un administrateur et à l'échéance du délai de grâce (ECART-15).
     */
    private void effacerCompteEtEntreprise(User user) {
        entrepriseRepository.findByAnnonceurProfessionnel(user).ifPresent(entreprise -> {
            for (User agent : userRepository.findByEntrepriseId(entreprise.getId())) {
                if (!agent.getId().equals(user.getId())) {
                    effacerCompte(agent);
                }
            }
            anonymiserEntreprise(entreprise);
        });
        effacerCompte(user);
    }

    /** Annonces (désactivées, photos effacées) puis données personnelles du compte. */
    private void effacerCompte(User user) {
        annonceRepository.retirerDesFavorisParProprietaire(user.getId());
        for (Annonce annonce : annonceRepository.findAllByOwnerId(user.getId())) {
            List<Media> medias = mediaRepository.findByAnnonceId(annonce.getId());
            medias.forEach(m -> mediaService.deleteMediaFromDisk(m.getUrl()));
            mediaRepository.deleteAll(medias);
            if (annonce.getMedias() != null) {
                annonce.getMedias().clear();
            }
            // Désactivée et non supprimée : conversations, signalements et historique
            // de modération y restent rattachés.
            annonce.setActif(false);
            annonce.setStatutModeration(StatutAnnonce.DESACTIVEE);
            annonceRepository.save(annonce);
        }
        anonymiser(user);
    }

    private void anonymiserEntreprise(Entreprise entreprise) {
        if (entreprise.getPhotoProfil() != null) {
            mediaService.deleteMediaFromDisk(entreprise.getPhotoProfil());
        }
        if (entreprise.getJustificatifRccmUrl() != null) {
            mediaService.deletePieceIdentite(entreprise.getJustificatifRccmUrl());
        }
        entreprise.setJustificatifRccmUrl(null);
        entreprise.setStatutVerification(com.app.AnnoncesAPI.enums.StatutVerificationEntreprise.NON_VERIFIEE);
        entreprise.setNom(NOM_ENTREPRISE_SUPPRIMEE);
        entreprise.setDescription(null);
        entreprise.setNumeroRCCM(null);
        entreprise.setAdresse(null);
        entreprise.setTelephone(null);
        entreprise.setEmail(null);
        entreprise.setPhotoProfil(null);
        entreprise.setActive(false);
        entrepriseRepository.save(entreprise);
    }

    /** Job quotidien : anonymise les comptes dont le délai de grâce est écoulé. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void anonymiserComptesExpires() {
        LocalDateTime limite = LocalDateTime.now().minusDays(User.DELAI_GRACE_SUPPRESSION_JOURS);
        List<User> comptes = userRepository.findByDateSuppressionDemandeeBefore(limite);
        for (User user : comptes) {
            // Garde-fou : ne jamais anonymiser un compte revenu actif entre-temps.
            if (user.getStatut() != StatutUtilisateur.INACTIF) {
                user.setDateSuppressionDemandee(null);
                userRepository.save(user);
                continue;
            }
            // Un professionnel emporte son entreprise et ses agents : avant ce correctif, seul son
            // compte était anonymisé et ses agents gardaient leurs données personnelles (ECART-15).
            effacerCompteEtEntreprise(user);
        }
        if (!comptes.isEmpty()) {
            logger.info("{} compte(s) anonymisé(s) (délai de grâce RGPD écoulé)", comptes.size());
        }
    }

    /** Efface irréversiblement les données personnelles du compte. */
    void anonymiser(User user) {
        sessionService.fermerToutesLesSessions(user.getId());
        // Appareils de notification et alertes de recherche : supprimés avec le compte (RG-06-23, RG-04-22).
        userRepository.supprimerNotificationsEtAlertes(user.getId());
        // Fichiers d'abord : une fois les chemins effacés en base, ils seraient introuvables.
        if (user.getPhotoProfil() != null) {
            mediaService.deleteMediaFromDisk(user.getPhotoProfil());
        }
        if (user.getPieceIdentiteUrl() != null) {
            mediaService.deletePieceIdentite(user.getPieceIdentiteUrl());
        }
        if (user.getSelfieUrl() != null) {
            mediaService.deletePieceIdentite(user.getSelfieUrl());
        }
        if (user.getPieceIdentiteVersoUrl() != null) {
            mediaService.deletePieceIdentite(user.getPieceIdentiteVersoUrl());
        }

        // ≤ 50 caractères (@Size sur User.email) et unique.
        user.setEmail("supprime-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20)
                + "@anonyme.invalid");
        user.setPrenom("Utilisateur");
        user.setNom("supprimé");
        user.setTelephone(null);
        user.setPhotoProfil(null);
        user.setPieceIdentiteUrl(null);
        user.setSelfieUrl(null);
        user.setPieceIdentiteVersoUrl(null);
        user.setDateExpirationPiece(null);
        user.setDateEnvoiVerification(null);
        user.setDateDecisionVerification(null);
        user.setDecisionVerificationPar(null);
        user.setNumeroPieceIdentite(null);
        user.setTypePieceIdentite(null);
        user.setStatutPieceIdentite(null);
        user.setMotifRejetPieceIdentite(null);
        user.setActivationCode(null);
        user.setActivationCodeExpiry(null);
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        user.setPassword(passwordEncoder.encode(motDePasseAleatoire()));
        user.setPasswordChangedAt(System.currentTimeMillis());
        user.getFavoris().clear();
        user.setStatut(StatutUtilisateur.INACTIF);
        user.setMotifStatut(MOTIF_ANONYMISE);
        user.setDateSuppressionDemandee(null);
        user.setDateSuppressionDefinitive(LocalDateTime.now());
        userRepository.save(user);
    }

    private List<User> agentsActifs(Entreprise entreprise, User proprietaire) {
        return userRepository.findByEntrepriseId(entreprise.getId()).stream()
                .filter(u -> !u.getId().equals(proprietaire.getId()))
                .filter(u -> u.getStatut() != StatutUtilisateur.INACTIF)
                .toList();
    }

    private static String motDePasseAleatoire() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }
}
