package com.app.AnnoncesAPI.services;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.entities.AlerteRecherche;
import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;
import com.app.AnnoncesAPI.enums.TypeUsage;
import com.app.AnnoncesAPI.exceptions.ConflitException;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.repositories.AlerteRechercheRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.BienImmoSpecification;
import com.app.AnnoncesAPI.repositories.UserRepository;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

/**
 * Alertes de recherche (DEC-16, RG-04-20 à RG-04-22) : critères enregistrés, vérifiés chaque heure ; au plus
 * une notification push par alerte et par jour, qui indique le nombre de nouvelles annonces.
 */
@Service
public class AlerteRechercheService {

    private static final Logger logger = LoggerFactory.getLogger(AlerteRechercheService.class);

    public static final int ALERTES_MAX = 10;
    static final int MOIS_SANS_OUVERTURE = 6;

    /** Critères d'une alerte : les paramètres de la recherche, tous facultatifs. */
    public record Criteres(TypeAnnonce typeAnnonce, TypeBien typeBien, TypeUsage typeUsage,
                           BigDecimal prixMin, BigDecimal prixMax,
                           String region, String prefecture, String commune, String quartier,
                           String q, Integer nbPiecesMin, Integer nbChambresMin,
                           Double surfaceMin, Double surfaceMax) {

        boolean vide() {
            return typeAnnonce == null && typeBien == null && typeUsage == null && prixMin == null && prixMax == null
                    && vide(region) && vide(prefecture) && vide(commune) && vide(quartier) && vide(q)
                    && nbPiecesMin == null && nbChambresMin == null && surfaceMin == null && surfaceMax == null;
        }

        private static boolean vide(String s) {
            return s == null || s.isBlank();
        }
    }

    private final AlerteRechercheRepository alertes;
    private final UserRepository utilisateurs;
    private final BienImmoRepository annonces;
    private final PushService push;
    private final ObjectMapper mapper;

    public AlerteRechercheService(AlerteRechercheRepository alertes, UserRepository utilisateurs,
                                  BienImmoRepository annonces, PushService push, ObjectMapper mapper) {
        this.alertes = alertes;
        this.utilisateurs = utilisateurs;
        this.annonces = annonces;
        this.push = push;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<AlerteRecherche> lister(UUID userId) {
        return alertes.findByUserIdOrderByDateCreationDesc(userId);
    }

    @Transactional
    public AlerteRecherche creer(UUID userId, String nom, Criteres criteres) {
        if (criteres == null || criteres.vide()) {
            throw new IllegalArgumentException("Une alerte a besoin d'au moins un critère de recherche.");
        }
        if (alertes.countByUserId(userId) >= ALERTES_MAX) {
            throw new ConflitException("Vous avez atteint le maximum de " + ALERTES_MAX + " alertes : supprimez-en une.");
        }
        AlerteRecherche a = new AlerteRecherche();
        a.setUser(utilisateurs.getReferenceById(userId));
        a.setNom(nomValide(nom, "Ma recherche"));
        a.setCriteres(serialiser(criteres));
        return alertes.save(a);
    }

    @Transactional
    public AlerteRecherche modifier(UUID userId, Long id, String nom, Boolean active) {
        AlerteRecherche a = trouver(userId, id);
        if (nom != null) {
            a.setNom(nomValide(nom, a.getNom()));
        }
        if (active != null) {
            a.setActive(active);
            if (active) {
                // Reprise : on ne notifie que les annonces apparues après la reprise.
                a.setDerniereVerification(LocalDateTime.now());
            }
        }
        return a;
    }

    @Transactional
    public void supprimer(UUID userId, Long id) {
        alertes.delete(trouver(userId, id));
    }

    /** L'utilisateur a ouvert la notification : l'alerte n'est pas « abandonnée » (RG-04-22). */
    @Transactional
    public AlerteRecherche marquerOuverte(UUID userId, Long id) {
        AlerteRecherche a = trouver(userId, id);
        a.setDerniereOuverture(LocalDateTime.now());
        return a;
    }

    public Criteres lireCriteres(AlerteRecherche a) {
        try {
            return mapper.readValue(a.getCriteres(), Criteres.class);
        } catch (JacksonException e) {
            throw new IllegalStateException("Critères d'alerte illisibles (alerte " + a.getId() + ")", e);
        }
    }

    // ── Tâche horaire ──────────────────────────────────────────────────────

    @Scheduled(cron = "0 0 * * * *")
    public void verifier() {
        try {
            int envoyees = verifier(LocalDateTime.now());
            if (envoyees > 0) {
                logger.info("Alertes de recherche : {} notification(s) envoyée(s)", envoyees);
            }
        } catch (RuntimeException e) {
            logger.error("Alertes de recherche : échec de la vérification", e);
        }
    }

    @Transactional
    public int verifier(LocalDateTime maintenant) {
        int envoyees = 0;
        for (AlerteRecherche a : alertes.findByActiveTrue()) {
            try {
                if (traiter(a, maintenant)) {
                    envoyees++;
                }
            } catch (RuntimeException e) {
                logger.warn("Alerte {} ignorée : {}", a.getId(), e.getMessage());
            }
        }
        return envoyees;
    }

    private boolean traiter(AlerteRecherche a, LocalDateTime maintenant) {
        // Alerte dont les notifications ne sont plus ouvertes depuis 6 mois : mise en pause.
        LocalDateTime reference = a.getDerniereOuverture() != null ? a.getDerniereOuverture() : a.getDateCreation();
        if (a.getDerniereNotification() != null && reference.isBefore(maintenant.minusMonths(MOIS_SANS_OUVERTURE))) {
            a.setActive(false);
            return false;
        }
        User user = a.getUser();
        if (user.getStatut() != StatutUtilisateur.ACTIF || !user.isNotifAlertes()) {
            return false;
        }
        long nouvelles = annonces.count(specification(lireCriteres(a), a.getDerniereVerification()));
        if (nouvelles == 0) {
            a.setDerniereVerification(maintenant);
            return false;
        }
        // Une notification par alerte et par jour : sinon les annonces s'accumulent jusqu'au prochain envoi.
        if (a.getDerniereNotification() != null && a.getDerniereNotification().isAfter(maintenant.minusDays(1))) {
            return false;
        }
        a.setDerniereVerification(maintenant);
        a.setDerniereNotification(maintenant);
        push.notifier(user.getId(), "Nouvelles annonces",
                nouvelles + (nouvelles > 1 ? " nouvelles annonces" : " nouvelle annonce") + " pour « " + a.getNom() + " »",
                Map.of("type", "alerte", "alerteId", a.getId()));
        return true;
    }

    private Specification<BienImmo> specification(Criteres c, LocalDateTime depuis) {
        List<Long> idsTexte = c.q() == null || c.q().isBlank() ? null : annonces.findIdsByFullTextSearch(c.q().trim());
        return BienImmoSpecification.buildFilter(null, c.typeAnnonce(), c.typeBien(), c.typeUsage(),
                        c.prixMin(), c.prixMax(), c.region(), c.prefecture(), c.commune(), c.quartier(),
                        idsTexte, c.nbPiecesMin(), c.nbChambresMin(), c.surfaceMin(), c.surfaceMax())
                .and(BienImmoSpecification.visibleDepuisApres(depuis));
    }

    // ── Outils ─────────────────────────────────────────────────────────────

    private AlerteRecherche trouver(UUID userId, Long id) {
        return alertes.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Alerte introuvable."));
    }

    private static String nomValide(String nom, String defaut) {
        String n = nom == null ? "" : nom.trim();
        if (n.isEmpty()) {
            return defaut;
        }
        if (n.length() > 80) {
            throw new IllegalArgumentException("Le nom d'une alerte ne peut pas dépasser 80 caractères.");
        }
        return n;
    }

    private String serialiser(Criteres c) {
        try {
            return mapper.writeValueAsString(c);
        } catch (JacksonException e) {
            throw new IllegalArgumentException("Critères d'alerte invalides.");
        }
    }
}
