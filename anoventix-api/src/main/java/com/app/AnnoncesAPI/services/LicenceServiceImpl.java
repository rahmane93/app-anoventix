package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.dto.ReglagesLicenceDTO;
import com.app.AnnoncesAPI.entities.Licence;
import com.app.AnnoncesAPI.entities.ParametrePlateforme;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.TypeLicence;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.exceptions.LicenceRequiseException;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.payload.response.LicenceAdminResponse;
import com.app.AnnoncesAPI.payload.response.LicenceResponse;
import com.app.AnnoncesAPI.payload.response.PageResponse;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.LicenceRepository;
import com.app.AnnoncesAPI.repositories.ParametrePlateformeRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LicenceServiceImpl implements LicenceService {

    static final String PARAM_MODE_ACTIF = "licence.mode-actif";
    static final String PARAM_PRIX_PARTICULIER = "licence.prix-particulier";
    static final String PARAM_PRIX_PROFESSIONNEL = "licence.prix-professionnel";
    static final String PARAM_CONTACT_TELEPHONE = "licence.contact-telephone";

    private static final Set<String> STATUTS_LISTE = Set.of("TOUTES", "LIBRE", "ACTIVE", "EXPIREE");

    /** Sans 0/O ni 1/I : clé dictée ou recopiée à la main. */
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Value("${licence.annonces-gratuites:5}")
    private int annoncesGratuites;

    private final LicenceRepository licenceRepository;
    private final ParametrePlateformeRepository parametreRepository;
    private final BienImmoRepository bienImmoRepository;
    private final UserRepository userRepository;

    // ─── Mode licence ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public boolean isModeActif() {
        return parametreRepository.findById(PARAM_MODE_ACTIF)
                .map(p -> Boolean.parseBoolean(p.getValeur()))
                .orElse(false);
    }

    @Override
    @Transactional
    public void setModeActif(boolean actif) {
        parametreRepository.save(new ParametrePlateforme(PARAM_MODE_ACTIF, String.valueOf(actif)));
    }

    // ─── Réglages de vente ────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ReglagesLicenceDTO getReglages() {
        return ReglagesLicenceDTO.builder()
                .prixParticulier(lireParam(PARAM_PRIX_PARTICULIER).map(Long::valueOf).orElse(null))
                .prixProfessionnel(lireParam(PARAM_PRIX_PROFESSIONNEL).map(Long::valueOf).orElse(null))
                .contactTelephone(lireParam(PARAM_CONTACT_TELEPHONE).orElse(null))
                .build();
    }

    @Override
    @Transactional
    public ReglagesLicenceDTO setReglages(ReglagesLicenceDTO reglages) {
        ecrireParam(PARAM_PRIX_PARTICULIER, reglages.getPrixParticulier());
        ecrireParam(PARAM_PRIX_PROFESSIONNEL, reglages.getPrixProfessionnel());
        String tel = reglages.getContactTelephone();
        ecrireParam(PARAM_CONTACT_TELEPHONE, tel == null || tel.isBlank() ? null : tel.trim());
        return getReglages();
    }

    private Optional<String> lireParam(String cle) {
        return parametreRepository.findById(cle).map(ParametrePlateforme::getValeur);
    }

    /** Valeur null : le réglage est supprimé (non renseigné). */
    private void ecrireParam(String cle, Object valeur) {
        if (valeur == null) {
            parametreRepository.deleteById(cle);
        } else {
            parametreRepository.save(new ParametrePlateforme(cle, valeur.toString()));
        }
    }

    // ─── Liste admin ──────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public PageResponse<LicenceAdminResponse> listerCles(String statut, String recherche, Pageable pageable) {
        String s = statut == null ? "TOUTES" : statut.trim().toUpperCase();
        if (!STATUTS_LISTE.contains(s)) {
            throw new IllegalArgumentException("Statut inconnu : " + statut);
        }
        String q = recherche == null ? "" : recherche.trim().toUpperCase();
        return PageResponse.of(licenceRepository.rechercher(s, q, LocalDate.now(), pageable)
                .map(l -> LicenceAdminResponse.builder()
                        .id(l.getId())
                        .cle(l.getCle())
                        .type(l.getType())
                        .statut(l.getOwner() == null ? "LIBRE" : estValide(l) ? "ACTIVE" : "EXPIREE")
                        .ownerEmail(l.getOwner() != null ? l.getOwner().getEmail() : null)
                        .dateDebut(l.getDateDebut())
                        .dateFin(l.getDateFin())
                        .createdAt(l.getCreatedAt())
                        .build()));
    }

    // ─── Titulaire ────────────────────────────────────────────────────────────

    /** Les AGENT_PROFESSIONNEL sont couverts par la licence de leur PROFESSIONNEL. */
    private User resolveOwner(User user) {
        if (user.getRole() != null
                && user.getRole().getName() == TypeRole.AGENT_PROFESSIONNEL
                && user.getEntreprise() != null
                && user.getEntreprise().getAnnonceurProfessionnel() != null) {
            return user.getEntreprise().getAnnonceurProfessionnel();
        }
        return user;
    }

    private Optional<Licence> licenceCourante(User owner) {
        return licenceRepository.findFirstByOwnerIdOrderByDateFinDesc(owner.getId());
    }

    private static boolean estValide(Licence licence) {
        return licence.getDateFin() != null && !licence.getDateFin().isBefore(LocalDate.now());
    }

    // ─── Lecture / activation ─────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public LicenceResponse getMaLicence(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        return toResponse(user);
    }

    @Override
    @Transactional
    public LicenceResponse activer(UUID userId, String cle) {
        if (!isModeActif()) {
            throw new IllegalStateException("Les licences ne sont pas encore ouvertes à l'activation.");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        TypeLicence typeCompte = user.isAnnonceurProfessionnel() ? TypeLicence.PROFESSIONNEL
                : user.isParticulier() ? TypeLicence.PARTICULIER
                : null;
        if (typeCompte == null) {
            throw new IllegalStateException("Ce type de compte ne peut pas activer de licence.");
        }

        Licence licence = licenceRepository.findByCle(cle.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Clé de licence invalide."));
        if (licence.getOwner() != null) {
            throw new IllegalStateException("Cette clé de licence a déjà été utilisée.");
        }
        if (licence.getType() != typeCompte) {
            throw new IllegalStateException(licence.getType() == TypeLicence.PROFESSIONNEL
                    ? "Cette clé est réservée aux comptes professionnels."
                    : "Cette clé est réservée aux comptes particuliers.");
        }

        // Renouvellement : la nouvelle année démarre au lendemain de la licence en cours.
        LocalDate debut = licenceCourante(user)
                .filter(LicenceServiceImpl::estValide)
                .map(l -> l.getDateFin().plusDays(1))
                .orElse(LocalDate.now());
        licence.setOwner(user);
        licence.setDateDebut(debut);
        licence.setDateFin(debut.plusYears(1).minusDays(1));
        licenceRepository.save(licence);

        return toResponse(user);
    }

    @Override
    @Transactional
    public String genererCle(TypeLicence type) {
        String cle;
        do {
            cle = "ANX-" + bloc() + "-" + bloc() + "-" + bloc();
        } while (licenceRepository.findByCle(cle).isPresent());
        Licence licence = new Licence();
        licence.setCle(cle);
        licence.setType(type);
        licenceRepository.save(licence);
        return cle;
    }

    private static String bloc() {
        StringBuilder sb = new StringBuilder(4);
        for (int i = 0; i < 4; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }

    // ─── Contrôle à la publication ────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public void verifierPublication(User owner) {
        if (estExempte(owner) || !isModeActif()) {
            return;
        }
        if (compterActives(owner) >= annoncesGratuites && !aLicenceValide(owner)) {
            throw new LicenceRequiseException("Vous avez atteint vos " + annoncesGratuites
                    + " annonces gratuites. Activez une licence annuelle pour publier davantage.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean estBloque(User user) {
        return !estExempte(user) && isModeActif()
                && compterActives(user) > annoncesGratuites && !aLicenceValide(user);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean limiteParLicence(User user) {
        return !estExempte(user) && isModeActif() && !aLicenceValide(user);
    }

    @Override
    public int getAnnoncesGratuites() {
        return annoncesGratuites;
    }

    @Override
    @Transactional(readOnly = true)
    public void verifierNonBloque(User user) {
        if (estBloque(user)) {
            throw new LicenceRequiseException("Votre compte dépasse les " + annoncesGratuites
                    + " annonces gratuites sans licence valide. Activez une licence ou clôturez des annonces.");
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static boolean estExempte(User user) {
        return user.isAdministrateur() || user.isModerateur();
    }

    /** Entreprise : les annonces gratuites sont partagées entre le pro et ses agents. */
    private long compterActives(User user) {
        return user.getEntreprise() != null
                ? bienImmoRepository.countActiveAnnoncesByEntreprise(user.getEntreprise().getId())
                : bienImmoRepository.countByOwnerIdAndActifTrue(user.getId());
    }

    private boolean aLicenceValide(User user) {
        return licenceCourante(resolveOwner(user)).filter(LicenceServiceImpl::estValide).isPresent();
    }

    private LicenceResponse toResponse(User user) {
        User owner = resolveOwner(user);
        Optional<Licence> courante = licenceCourante(owner);
        String statut = courante.map(l -> estValide(l) ? "ACTIVE" : "EXPIREE").orElse("AUCUNE");
        ReglagesLicenceDTO reglages = getReglages();
        Long prix = owner.isAnnonceurProfessionnel() ? reglages.getPrixProfessionnel()
                : owner.isParticulier() ? reglages.getPrixParticulier()
                : null;
        return LicenceResponse.builder()
                .modeActif(isModeActif())
                .statut(statut)
                .type(courante.map(Licence::getType).orElse(null))
                .dateDebut(courante.map(Licence::getDateDebut).orElse(null))
                .dateFin(courante.map(Licence::getDateFin).orElse(null))
                .compteOwner(owner.getEmail())
                .partage(!owner.getId().equals(user.getId()))
                .annoncesGratuites(annoncesGratuites)
                .annoncesActives(compterActives(user))
                .bloque(estBloque(user))
                .prix(prix)
                .contactTelephone(reglages.getContactTelephone())
                .build();
    }
}
