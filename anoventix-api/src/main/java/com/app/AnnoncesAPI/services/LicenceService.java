package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.dto.ReglagesLicenceDTO;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.TypeLicence;
import com.app.AnnoncesAPI.payload.response.LicenceAdminResponse;
import com.app.AnnoncesAPI.payload.response.LicenceResponse;
import com.app.AnnoncesAPI.payload.response.PageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LicenceService {

    /** Mode licence activé par l'administrateur (faux par défaut). */
    boolean isModeActif();

    void setModeActif(boolean actif);

    /** Tarifs et numéro de contact affichés aux utilisateurs pour acheter une licence. */
    ReglagesLicenceDTO getReglages();

    ReglagesLicenceDTO setReglages(ReglagesLicenceDTO reglages);

    /** Liste admin des clés, filtrée par statut (TOUTES, LIBRE, ACTIVE, EXPIREE) et recherche. */
    PageResponse<LicenceAdminResponse> listerCles(String statut, String recherche, Pageable pageable);

    LicenceResponse getMaLicence(UUID userId);

    /** Active une clé sur le compte de l'utilisateur (1 an, prolonge une licence encore valide). */
    LicenceResponse activer(UUID userId, String cle);

    /** Génère une nouvelle clé non attribuée. */
    String genererCle(TypeLicence type);

    /**
     * Mode actif : au-delà des annonces actives gratuites, une licence valide est exigée
     * pour publier ou remettre en ligne. Sans effet si le mode est coupé.
     */
    void verifierPublication(User owner);

    /**
     * Compte bloqué : mode actif, plus d'annonces actives que le gratuit et pas de licence
     * valide. Restent permis : messagerie, navigation, clôturer / masquer / supprimer.
     */
    boolean estBloque(User user);

    /** Mode actif et pas de licence valide : le compte est plafonné aux annonces gratuites. */
    boolean limiteParLicence(User user);

    int getAnnoncesGratuites();

    /** Refuse (402) les fonctions d'annonceur d'un compte bloqué : modification, tableau de bord. */
    void verifierNonBloque(User user);
}
