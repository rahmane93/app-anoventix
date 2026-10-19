package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.dto.ReglagesLicenceDTO;
import com.app.AnnoncesAPI.entities.Licence;
import com.app.AnnoncesAPI.entities.ParametrePlateforme;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.MoyenPaiement;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeLicence;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.exceptions.LicenceRequiseException;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.payload.request.VenteLicenceRequest;
import com.app.AnnoncesAPI.payload.response.LicenceAdminResponse;
import com.app.AnnoncesAPI.payload.response.LicenceResponse;
import com.app.AnnoncesAPI.payload.response.PageResponse;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.LicenceRepository;
import com.app.AnnoncesAPI.repositories.ParametrePlateformeRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.Utilities.Identifiants;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LicenceServiceImpl implements LicenceService {

    private static final Logger logger = LoggerFactory.getLogger(LicenceServiceImpl.class);

    static final String PARAM_MODE_ACTIF = "licence.mode-actif";
    /** Date à laquelle le mode licence s'applique, J+30 après son activation (DEC-18). */
    static final String PARAM_DATE_EFFET = "licence.date-effet";
    static final String PARAM_PRIX_PARTICULIER = "licence.prix-particulier";
    static final String PARAM_PRIX_PROFESSIONNEL = "licence.prix-professionnel";
    static final String PARAM_CONTACT_TELEPHONE = "licence.contact-telephone";

    /** Préavis entre l'activation du mode licence et son entrée en vigueur. */
    static final int JOURS_PREAVIS = 30;

    private static final Set<String> STATUTS_LISTE = Set.of("TOUTES", "LIBRE", "EN_ATTENTE", "ACTIVE", "EXPIREE");
    private static final DateTimeFormatter DATE_FR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Sans 0/O ni 1/I : clé dictée ou recopiée à la main. */
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Value("${licence.annonces-gratuites:5}")
    private int annoncesGratuites;

    private final LicenceRepository licenceRepository;
    private final ParametrePlateformeRepository parametreRepository;
    private final BienImmoRepository bienImmoRepository;
    private final UserRepository userRepository;
    private final EntrepriseRepository entrepriseRepository;
    private final EmailNotificationService emailNotificationService;
    private final AuditService audit;

    // ─── Mode licence ─────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public boolean isModeActif() {
        return parametreRepository.findById(PARAM_MODE_ACTIF)
                .map(p -> Boolean.parseBoolean(p.getValeur()))
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<LocalDate> getDateEffet() {
        if (!isModeActif()) {
            return Optional.empty();
        }
        return lireParam(PARAM_DATE_EFFET).map(LocalDate::parse);
    }

    /** Mode activé ET en vigueur : seul cas où les annonces gratuites et les licences s'appliquent. */
    @Override
    @Transactional(readOnly = true)
    public boolean isModeEffectif() {
        if (!isModeActif()) {
            return false;
        }
        return lireParam(PARAM_DATE_EFFET).map(LocalDate::parse).map(d -> !LocalDate.now().isBefore(d)).orElse(true);
    }

    @Override
    @Transactional
    public void setModeActif(boolean actif) {
        boolean dejaActif = isModeActif();
        parametreRepository.save(new ParametrePlateforme(PARAM_MODE_ACTIF, String.valueOf(actif)));
        if (!actif) {
            // Désactiver reste immédiat (RG-08-27).
            ecrireParam(PARAM_DATE_EFFET, null);
            return;
        }
        if (dejaActif) {
            return;
        }
        // Activation : préavis de 30 jours, avec un email aux comptes qui seraient concernés (E21).
        LocalDate effet = LocalDate.now().plusDays(JOURS_PREAVIS);
        ecrireParam(PARAM_DATE_EFFET, effet);
        prevenirComptesConcernes(effet);
    }

    private void prevenirComptesConcernes(LocalDate effet) {
        ReglagesLicenceDTO reglages = getReglages();
        // Les annonces gratuites sont comptées par compte, ou par entreprise (partagées entre le pro et ses agents).
        Map<UUID, User> destinataires = new LinkedHashMap<>();
        for (Object[] ligne : bienImmoRepository.proprietairesAuDela(annoncesGratuites)) {
            userRepository.findById((UUID) ligne[0]).ifPresent(u -> destinataires.put(u.getId(), u));
        }
        for (Object[] ligne : bienImmoRepository.entreprisesAuDela(annoncesGratuites)) {
            entrepriseRepository.findById((UUID) ligne[0])
                    .map(e -> e.getAnnonceurProfessionnel())
                    .ifPresent(u -> destinataires.put(u.getId(), u));
        }
        for (User u : destinataires.values()) {
            if (u.getStatut() != StatutUtilisateur.ACTIF || estExempte(u) || aLicenceValide(u)) {
                continue;
            }
            Long prix = u.isAnnonceurProfessionnel() ? reglages.getPrixProfessionnel() : reglages.getPrixParticulier();
            StringBuilder message = new StringBuilder()
                    .append("Le mode licence s'appliquera à partir du ").append(effet.format(DATE_FR))
                    .append(". Au-delà de ").append(annoncesGratuites)
                    .append(" annonces actives, une licence annuelle sera nécessaire pour publier, modifier ou remettre ")
                    .append("des annonces en ligne ; vos annonces restent visibles.");
            if (prix != null) {
                message.append("\nPrix de la licence annuelle : ").append(prix).append(" GNF.");
            }
            if (reglages.getContactTelephone() != null) {
                message.append("\nPour acheter une licence : ").append(reglages.getContactTelephone()).append(".");
            }
            message.append("\nJusqu'à cette date, la publication reste libre.");
            emailNotificationService.notifier(u, "Le mode licence arrive le " + effet.format(DATE_FR),
                    "Licence annuelle : préavis de 30 jours", message.toString());
        }
        logger.info("Mode licence activé, date d'effet {} : {} compte(s) prévenu(s)", effet, destinataires.size());
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
    public PageResponse<LicenceAdminResponse> listerCles(String statut, String recherche, LocalDate du, LocalDate au,
                                                         Pageable pageable) {
        String s = statut == null ? "TOUTES" : statut.trim().toUpperCase();
        if (!STATUTS_LISTE.contains(s)) {
            throw new IllegalArgumentException("Statut inconnu : " + statut);
        }
        String q = recherche == null ? "" : recherche.trim().toUpperCase();
        LocalDateTime debut = du == null ? LocalDateTime.of(2000, 1, 1, 0, 0) : du.atStartOfDay();
        LocalDateTime fin = au == null ? LocalDateTime.of(2100, 1, 1, 0, 0) : au.plusDays(1).atStartOfDay();
        return PageResponse.of(licenceRepository.rechercher(s, q, LocalDate.now(), debut, fin, pageable)
                .map(this::versReponseAdmin));
    }

    private LicenceAdminResponse versReponseAdmin(Licence l) {
        return LicenceAdminResponse.builder()
                .id(l.getId())
                .cle(l.getCle())
                .type(l.getType())
                .statut(statut(l))
                .ownerEmail(l.getOwner() != null ? l.getOwner().getEmail() : null)
                .acheteurEmail(l.getAcheteur() != null ? l.getAcheteur().getEmail() : null)
                .montant(l.getMontant())
                .moyenPaiement(l.getMoyenPaiement())
                .referencePaiement(l.getReferencePaiement())
                .generePar(l.getGenerePar())
                .dateVente(l.getDateVente())
                .dateDebut(l.getDateDebut())
                .dateFin(l.getDateFin())
                .createdAt(l.getCreatedAt())
                .build();
    }

    private static String statut(Licence l) {
        if (l.getOwner() == null) {
            return "LIBRE";
        }
        if (l.getDateFin() == null) {
            return "EN_ATTENTE";
        }
        return estValide(l) ? "ACTIVE" : "EXPIREE";
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

    /** Licence démarrée qui expire le plus tard ; les clés en attente de démarrage n'en font pas partie. */
    private Optional<Licence> licenceCourante(User owner) {
        return licenceRepository.findFirstByOwnerIdAndDateFinIsNotNullOrderByDateFinDesc(owner.getId());
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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
        TypeLicence typeCompte = typeDuCompte(user);
        if (typeCompte == null) {
            throw new IllegalStateException("Ce type de compte ne peut pas activer de licence.");
        }

        Licence licence = licenceRepository.findByCle(cle.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Clé de licence invalide."));
        if (licence.getOwner() != null) {
            throw new IllegalStateException("Cette clé de licence a déjà été utilisée.");
        }
        // Clé nominative : seul l'acheteur peut l'activer (RG-08-25). Une clé au porteur reste ouverte à tous.
        if (licence.getAcheteur() != null && !licence.getAcheteur().getId().equals(user.getId())) {
            throw new IllegalStateException("Cette clé est réservée à un autre compte.");
        }
        if (licence.getType() != typeCompte) {
            throw new IllegalStateException(licence.getType() == TypeLicence.PROFESSIONNEL
                    ? "Cette clé est réservée aux comptes professionnels."
                    : "Cette clé est réservée aux comptes particuliers.");
        }

        licence.setOwner(user);
        licence.setDateActivation(LocalDateTime.now());
        if (isModeEffectif()) {
            // Renouvellement : la nouvelle année démarre au lendemain de la licence en cours.
            LocalDate debut = licenceCourante(user)
                    .filter(LicenceServiceImpl::estValide)
                    .map(l -> l.getDateFin().plusDays(1))
                    .orElse(LocalDate.now());
            demarrer(licence, debut);
        }
        // Sinon (mode inactif ou en préavis) : « en attente de démarrage », sans dates (RG-08-28).
        licenceRepository.save(licence);

        return toResponse(user);
    }

    private static void demarrer(Licence licence, LocalDate debut) {
        licence.setDateDebut(debut);
        licence.setDateFin(debut.plusYears(1).minusDays(1));
    }

    /**
     * Le jour où le mode prend effet, les clés activées d'avance démarrent : la première ce jour-là, les
     * suivantes à la suite (RG-08-28). Passe chaque nuit et au démarrage de l'application (rattrapage).
     */
    @Override
    @Transactional
    public int demarrerLicencesEnAttente() {
        if (!isModeEffectif()) {
            return 0;
        }
        LocalDate aujourdhui = LocalDate.now();
        int demarrees = 0;
        Map<UUID, LocalDate> prochainDebut = new LinkedHashMap<>();
        for (Licence l : licenceRepository.findByOwnerIsNotNullAndDateFinIsNullOrderByDateActivationAsc()) {
            UUID owner = l.getOwner().getId();
            LocalDate debut = prochainDebut.computeIfAbsent(owner, id -> licenceCourante(l.getOwner())
                    .filter(LicenceServiceImpl::estValide)
                    .map(c -> c.getDateFin().plusDays(1))
                    .orElse(aujourdhui));
            demarrer(l, debut);
            licenceRepository.save(l);
            prochainDebut.put(owner, l.getDateFin().plusDays(1));
            demarrees++;
        }
        if (demarrees > 0) {
            logger.info("Licences : {} clé(s) en attente de démarrage lancée(s)", demarrees);
        }
        return demarrees;
    }

    @Scheduled(cron = "0 5 0 * * *")
    public void demarrerChaqueNuit() {
        try {
            demarrerLicencesEnAttente();
        } catch (RuntimeException e) {
            logger.error("Licences : échec du démarrage des clés en attente", e);
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void rattrapageAuDemarrage() {
        demarrerChaqueNuit();
    }

    // ─── Vente ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public LicenceAdminResponse vendre(String admin, VenteLicenceRequest vente) {
        User acheteur = trouverAcheteur(vente.getAcheteur());
        TypeLicence type = typeDuCompte(acheteur);
        if (type == null) {
            throw new IllegalArgumentException("Ce compte ne peut pas acheter de licence (particulier ou professionnel uniquement).");
        }
        String cle;
        do {
            cle = "ANX-" + bloc() + "-" + bloc() + "-" + bloc();
        } while (licenceRepository.findByCle(cle).isPresent());
        Licence licence = new Licence();
        licence.setCle(cle);
        licence.setType(type);
        enregistrerVente(licence, acheteur, vente, admin);
        licenceRepository.save(licence);
        audit.enregistrer(ActionAudit.LICENCE_VENDUE, licence.getId(),
                acheteur.getEmail() + " · " + vente.getMontant() + " GNF · " + vente.getMoyenPaiement());
        envoyerRecu(licence, acheteur);
        return versReponseAdmin(licence);
    }

    @Override
    @Transactional
    public LicenceAdminResponse affecterAcheteur(String admin, Long licenceId, VenteLicenceRequest vente) {
        Licence licence = licenceRepository.findById(licenceId)
                .orElseThrow(() -> new ResourceNotFoundException("Clé de licence introuvable."));
        if (licence.getOwner() != null) {
            throw new IllegalStateException("Cette clé est déjà activée : son acheteur ne peut plus changer.");
        }
        if (licence.getAcheteur() != null) {
            throw new IllegalStateException("Cette clé a déjà un acheteur.");
        }
        User acheteur = trouverAcheteur(vente.getAcheteur());
        if (typeDuCompte(acheteur) != licence.getType()) {
            throw new IllegalArgumentException("Cette clé est de type " + licence.getType()
                    + " : le compte de l'acheteur n'est pas du même type.");
        }
        enregistrerVente(licence, acheteur, vente, admin);
        licenceRepository.save(licence);
        audit.enregistrer(ActionAudit.LICENCE_ACHETEUR_AFFECTE, licence.getId(), acheteur.getEmail());
        envoyerRecu(licence, acheteur);
        return versReponseAdmin(licence);
    }

    private void enregistrerVente(Licence licence, User acheteur, VenteLicenceRequest vente, String admin) {
        String reference = vente.getReferencePaiement() == null ? null : vente.getReferencePaiement().trim();
        if (vente.getMoyenPaiement() != MoyenPaiement.ESPECES && (reference == null || reference.isEmpty())) {
            throw new IllegalArgumentException("La référence de la transaction est obligatoire (sauf pour un paiement en espèces).");
        }
        licence.setAcheteur(acheteur);
        licence.setMontant(vente.getMontant());
        licence.setMoyenPaiement(vente.getMoyenPaiement());
        licence.setReferencePaiement(reference == null || reference.isEmpty() ? null : reference);
        licence.setGenerePar(admin);
        licence.setDateVente(LocalDateTime.now());
    }

    private User trouverAcheteur(String saisie) {
        String email = Identifiants.normaliserEmail(saisie);
        Optional<User> parEmail = email != null && email.contains("@") ? userRepository.findByEmail(email) : Optional.empty();
        User acheteur = parEmail.or(() -> {
            String tel = Identifiants.normaliserTelephone(saisie);
            return tel == null ? Optional.<User>empty() : userRepository.findByTelephone(tel);
        }).orElseThrow(() -> new ResourceNotFoundException("Aucun compte ne correspond à « " + saisie + " »."));
        if (acheteur.getStatut() != StatutUtilisateur.ACTIF) {
            throw new IllegalStateException("Le compte de l'acheteur n'est pas actif.");
        }
        return acheteur;
    }

    /** Reçu de la vente (E20) : la clé est un secret, le message est effacé de la file après l'envoi. */
    private void envoyerRecu(Licence l, User acheteur) {
        StringBuilder message = new StringBuilder()
                .append("Merci pour votre achat. Voici votre licence annuelle AnoventiX.\n")
                .append("Clé : ").append(l.getCle()).append("\n")
                .append("Type : ").append(l.getType() == TypeLicence.PROFESSIONNEL ? "Professionnel" : "Particulier").append("\n")
                .append("Montant : ").append(l.getMontant()).append(" GNF\n")
                .append("Paiement : ").append(l.getMoyenPaiement().getLibelle());
        if (l.getReferencePaiement() != null) {
            message.append(" (réf. ").append(l.getReferencePaiement()).append(")");
        }
        message.append("\nDate : ").append(l.getDateVente().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
                .append("\nCette clé ne peut être activée que depuis votre compte, dans « Ma licence ».");
        emailNotificationService.notifierSensible(acheteur, "Votre licence AnoventiX", "Reçu de votre licence annuelle",
                message.toString());
    }

    private static TypeLicence typeDuCompte(User user) {
        return user.isAnnonceurProfessionnel() ? TypeLicence.PROFESSIONNEL
                : user.isParticulier() ? TypeLicence.PARTICULIER
                : null;
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
        if (estExempte(owner) || !isModeEffectif()) {
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
        return !estExempte(user) && isModeEffectif()
                && compterActives(user) > annoncesGratuites && !aLicenceValide(user);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean limiteParLicence(User user) {
        return !estExempte(user) && isModeEffectif() && !aLicenceValide(user);
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
        List<Licence> enAttente = new ArrayList<>(licenceRepository.findByOwnerIdAndDateFinIsNullOrderByDateActivationAsc(owner.getId()));
        String statut = courante.filter(LicenceServiceImpl::estValide).isPresent() ? "ACTIVE"
                : !enAttente.isEmpty() ? "EN_ATTENTE"
                : courante.isPresent() ? "EXPIREE"
                : "AUCUNE";
        ReglagesLicenceDTO reglages = getReglages();
        Long prix = owner.isAnnonceurProfessionnel() ? reglages.getPrixProfessionnel()
                : owner.isParticulier() ? reglages.getPrixParticulier()
                : null;
        Optional<LocalDate> effet = getDateEffet();
        return LicenceResponse.builder()
                .modeActif(isModeActif())
                .dateEffet(effet.orElse(null))
                .enPreavis(isModeActif() && !isModeEffectif())
                .statut(statut)
                .type(courante.map(Licence::getType).or(() -> enAttente.stream().findFirst().map(Licence::getType)).orElse(null))
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
