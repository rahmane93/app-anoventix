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

    /**
     * Activer le mode fixe une date d'effet à J+30 (préavis, email aux comptes concernés) ; le désactiver est
     * immédiat (DEC-18, RG-08-27).
     */
    void setModeActif(boolean actif);

    /** Date d'effet du mode licence ; vide si le mode est coupé ou en vigueur sans préavis. */
    java.util.Optional<java.time.LocalDate> getDateEffet();

    /** Mode activé et en vigueur : seul cas où annonces gratuites et licences s'appliquent. */
    boolean isModeEffectif();

    /** Lance les clés activées avant l'ouverture du mode (DEC-28) ; retourne le nombre de clés démarrées. */
    int demarrerLicencesEnAttente();

    /** Tarifs et numéro de contact affichés aux utilisateurs pour acheter une licence. */
    ReglagesLicenceDTO getReglages();

    ReglagesLicenceDTO setReglages(ReglagesLicenceDTO reglages);

    /** Liste admin des clés, filtrée par statut (TOUTES, LIBRE, ACTIVE, EXPIREE) et recherche. */
    PageResponse<LicenceAdminResponse> listerCles(String statut, String recherche, java.time.LocalDate du,
                                                  java.time.LocalDate au, Pageable pageable);

    LicenceResponse getMaLicence(UUID userId);

    /**
     * Active une clé sur le compte de l'utilisateur : 1 an, prolonge une licence encore valide. Avant l'ouverture
     * du mode licence, la clé est « en attente de démarrage » (DEC-28). Une clé nominative n'est activable que par
     * son acheteur (DEC-17).
     */
    LicenceResponse activer(UUID userId, String cle);

    /** Vend une clé nominative : acheteur, montant, moyen et référence de paiement, reçu par email (DEC-17). */
    LicenceAdminResponse vendre(String admin, com.app.AnnoncesAPI.payload.request.VenteLicenceRequest vente);

    /** Affecte un acheteur à une clé au porteur d'avant la mise en service (RG-08-26). */
    LicenceAdminResponse affecterAcheteur(String admin, Long licenceId,
                                          com.app.AnnoncesAPI.payload.request.VenteLicenceRequest vente);

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
