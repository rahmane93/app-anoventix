package com.app.AnnoncesAPI.services;

import com.app.AnnoncesAPI.entities.BienImmo;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.MotifCloture;
import com.app.AnnoncesAPI.enums.StatutAnnonce;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.payload.response.ProStatsResponse;
import com.app.AnnoncesAPI.payload.response.ProStatsResponse.AgentPerf;
import com.app.AnnoncesAPI.payload.response.ProStatsResponse.ConformiteStats;
import com.app.AnnoncesAPI.payload.response.ProStatsResponse.EquipeStats;
import com.app.AnnoncesAPI.payload.response.ProStatsResponse.MessagerieStats;
import com.app.AnnoncesAPI.payload.response.ProStatsResponse.PortefeuilleStats;
import com.app.AnnoncesAPI.payload.response.ProStatsResponse.TopAnnonceItem;
import com.app.AnnoncesAPI.payload.response.ProStatsResponse.VisibiliteStats;
import com.app.AnnoncesAPI.repositories.AvertissementRepository;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.ConversationRepository;
import com.app.AnnoncesAPI.repositories.MessageRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProStatsServiceImpl implements ProStatsService {

    private final UserRepository userRepository;
    private final BienImmoRepository bienImmoRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final AvertissementRepository avertissementRepository;
    private final LicenceService licenceService;
    private final QuotaEntrepriseService quotaService;

    @Override
    @Transactional(readOnly = true)
    public ProStatsResponse getStats(Authentication authentication) {
        UUID userId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur non trouvé"));
        licenceService.verifierNonBloque(user);

        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        // Le professionnel a tous les droits sur les annonces de ses agents (DEC-27) : son tableau de bord porte sur
        // toute l'entreprise. Un agent, un particulier ou un professionnel sans entreprise ne voit que ses annonces.
        boolean entreprise = user.isAnnonceurProfessionnel() && user.getEntreprise() != null;
        Set<UUID> owners = entreprise
                ? userRepository.findByEntrepriseId(user.getEntreprise().getId()).stream()
                        .map(User::getId).collect(Collectors.toCollection(HashSet::new))
                : new HashSet<>();
        owners.add(userId);

        return ProStatsResponse.builder()
                .perimetre(entreprise ? "ENTREPRISE" : "PERSONNEL")
                .portefeuille(buildPortefeuille(owners, startOfMonth))
                .visibilite(buildVisibilite(owners))
                .messagerie(buildMessagerie(userId))
                .equipe(buildEquipe(user))
                .conformite(buildConformite(user, userId))
                .build();
    }

    private PortefeuilleStats buildPortefeuille(Set<UUID> owners, LocalDateTime startOfMonth) {
        long publiees  = bienImmoRepository.countEnLigneForOwners(owners, StatutAnnonce.PUBLIEE);
        // Masquer et rejeter mettent actif = false : compter sans ce filtre (ECART-07).
        long masquees  = bienImmoRepository.countByStatutForOwners(owners, StatutAnnonce.MASQUEE);
        long rejetees  = bienImmoRepository.countByStatutForOwners(owners, StatutAnnonce.REJETEE);

        long vendu  = bienImmoRepository.countCloturesForOwnersSince(owners, MotifCloture.VENDU,  startOfMonth);
        long loue   = bienImmoRepository.countCloturesForOwnersSince(owners, MotifCloture.LOUE,   startOfMonth);
        long retire = bienImmoRepository.countCloturesForOwnersSince(owners, MotifCloture.RETIRE, startOfMonth);
        long totalClotures = vendu + loue + retire;
        double tauxConversion = totalClotures > 0 ? (vendu + loue) * 100.0 / totalClotures : 0.0;

        Map<String, Long> repartition = new LinkedHashMap<>();
        for (Object[] row : bienImmoRepository.countByTypeAnnonceForOwners(owners)) {
            repartition.put(((TypeAnnonce) row[0]).name(), (Long) row[1]);
        }

        return PortefeuilleStats.builder()
                .annoncesPubliees(publiees)
                .annoncesMasquees(masquees)
                .annoncesRejetees(rejetees)
                .clotureesVenduCeMois(vendu)
                .clotureesLoueCeMois(loue)
                .clotureesRetireCeMois(retire)
                .tauxConversionMois(tauxConversion)
                .repartitionParType(repartition)
                .build();
    }

    private VisibiliteStats buildVisibilite(Set<UUID> owners) {
        Long rawVues = bienImmoRepository.sumVueCountForOwners(owners);
        long totalVues = rawVues != null ? rawVues : 0L;

        List<BienImmo> top5 = bienImmoRepository.findTopByVueCountForOwners(owners, PageRequest.of(0, 5));
        List<TopAnnonceItem> top5Items = top5.stream()
                .map(b -> TopAnnonceItem.builder()
                        .id(b.getId())
                        .titre(b.getTitre())
                        .referenceAnnonce(b.getReferenceAnnonce())
                        .vueCount(b.getVueCount())
                        .nbFavoris(b.getNbFavoris())
                        .build())
                .collect(Collectors.toList());

        return VisibiliteStats.builder()
                .totalVues(totalVues)
                .top5ParVues(top5Items)
                .totalFavoris(bienImmoRepository.countTotalFavorisForOwners(owners))
                .build();
    }

    private MessagerieStats buildMessagerie(UUID userId) {
        long totalConversations = conversationRepository.countByParticipant(userId);
        long messagesNonLus     = messageRepository.countUnreadByUserId(userId);
        long convAsOwner        = conversationRepository.countConversationsAsOwner(userId);
        long convWithReply      = conversationRepository.countConversationsWithUserReply(userId);
        double tauxReponse      = convAsOwner > 0 ? convWithReply * 100.0 / convAsOwner : 0.0;

        return MessagerieStats.builder()
                .totalConversations(totalConversations)
                .messagesNonLus(messagesNonLus)
                .tauxReponse(tauxReponse)
                .build();
    }

    private EquipeStats buildEquipe(User user) {
        if (!user.isAnnonceurProfessionnel() || user.getEntreprise() == null) {
            return null;
        }

        UUID entrepriseId = user.getEntreprise().getId();

        // L'équipe, ce sont les agents : le professionnel n'y figure pas (le quota d'agents l'exclut aussi).
        List<User> agents = userRepository.findByEntrepriseId(entrepriseId).stream()
                .filter(agent -> !agent.getId().equals(user.getId()))
                .filter(agent -> agent.getDateSuppressionDefinitive() == null)
                .toList();
        long agentsActifs    = agents.stream().filter(a -> a.getStatut() == StatutUtilisateur.ACTIF).count();
        long agentsSuspendus = agents.stream().filter(a -> a.getStatut() == StatutUtilisateur.SUSPENDU).count();

        Map<UUID, long[]> statsMap = new HashMap<>();
        for (Object[] row : bienImmoRepository.findAgentStatsByEntreprise(entrepriseId)) {
            UUID agentId   = (UUID) row[0];
            long nbAnnonces = ((Number) row[1]).longValue();
            long totalVues  = row[2] != null ? ((Number) row[2]).longValue() : 0L;
            statsMap.put(agentId, new long[]{nbAnnonces, totalVues});
        }

        List<AgentPerf> performances = agents.stream()
                .map(agent -> {
                    long[] s = statsMap.getOrDefault(agent.getId(), new long[]{0L, 0L});
                    String displayName = buildAgentDisplayName(agent);
                    return AgentPerf.builder()
                            .agentId(agent.getId())
                            .agentUsername(displayName)
                            .agentPrenom(agent.getPrenom())
                            .agentNom(agent.getNom())
                            .agentEmail(agent.getEmail())
                            .nbAnnonces(s[0])
                            .totalVues(s[1])
                            .build();
                })
                .sorted(Comparator.comparingLong(AgentPerf::getTotalVues).reversed())
                .collect(Collectors.toList());

        // Pas de « meilleur agent » tant qu'aucune annonce de l'équipe n'a de vue.
        AgentPerf top = performances.isEmpty() || performances.get(0).getTotalVues() == 0
                ? null : performances.get(0);

        return EquipeStats.builder()
                .agentsActifs(agentsActifs)
                .agentsSuspendus(agentsSuspendus)
                .performances(performances)
                .topAgentUsername(top != null ? top.getAgentUsername() : null)
                .topAgentPrenom(top != null ? top.getAgentPrenom() : null)
                .topAgentNom(top != null ? top.getAgentNom() : null)
                .topAgentEmail(top != null ? top.getAgentEmail() : null)
                .build();
    }

    private String buildAgentDisplayName(User agent) {
        String prenom = agent.getPrenom() != null ? agent.getPrenom().trim() : "";
        String nom    = agent.getNom()    != null ? agent.getNom().trim()    : "";
        String full   = (prenom + " " + nom).trim();
        if (!full.isBlank()) {
            return full + " (" + agent.getEmail() + ")";
        }
        return agent.getEmail();
    }

    private ConformiteStats buildConformite(User user, UUID userId) {
        // Annonces en ligne (une annonce masquée ou rejetée n'est jamais actif = true).
        long annoncesActives = bienImmoRepository.countByOwnerIdAndActifTrueAndStatutModeration(userId, StatutAnnonce.PUBLIEE);

        int quotaMax = 0;
        int annoncesRestantes = 0;
        boolean canCreate = false;
        long companyActive = 0;

        Entreprise entreprise = user.getEntreprise();
        if (entreprise != null) {
            companyActive = quotaService.annoncesActives(entreprise);
            quotaMax = quotaService.quotaAnnonces(entreprise);
            canCreate = quotaService.peutCreerAnnonce(entreprise, companyActive);
            annoncesRestantes = (int) Math.max(0, quotaMax - companyActive);
        }

        // Mode licence actif sans licence valide : la vraie limite est celle des annonces gratuites.
        boolean limiteParLicence = entreprise != null && licenceService.limiteParLicence(user)
                && licenceService.getAnnoncesGratuites() < quotaMax;
        if (limiteParLicence) {
            quotaMax = licenceService.getAnnoncesGratuites();
            annoncesRestantes = (int) Math.max(0, quotaMax - companyActive);
            canCreate = canCreate && companyActive < quotaMax;
        }

        // Mêmes conditions que la création d'une annonce (BienImmoServiceImpl.create) : pièce validée, annonces non
        // masquées, entreprise active, quota et licence.
        String motif = null;
        if (user.getStatutPieceIdentite() != com.app.AnnoncesAPI.enums.StatutPieceIdentite.VALIDEE) {
            motif = "Votre pièce d'identité doit être validée avant de pouvoir publier.";
        } else if (user.isAnnoncesMasquees()) {
            motif = "Vos annonces sont masquées par la modération : la publication est suspendue.";
        } else if (user.isAnnonceurProfessionnel() && entreprise == null) {
            motif = "Créez votre entreprise avant de publier.";
        } else if (entreprise != null && !Boolean.TRUE.equals(entreprise.getActive())) {
            motif = "Votre entreprise est désactivée : la publication est suspendue.";
        } else if (!canCreate && entreprise != null) {
            motif = limiteParLicence
                    ? "Limite des annonces gratuites atteinte : une licence est nécessaire."
                    : "Quota d'annonces actives atteint (" + quotaMax + " maximum).";
        }
        if (entreprise != null) {
            canCreate = motif == null;
        }

        return ConformiteStats.builder()
                .motifPublicationImpossible(motif)
                .statutPieceIdentite(user.getStatutPieceIdentite() != null ? user.getStatutPieceIdentite().name() : null)
                .nbAvertissements(avertissementRepository.countEnVigueur(userId))
                .annoncesActives(annoncesActives)
                .quotaMax(quotaMax)
                .annoncesRestantes(annoncesRestantes)
                .canCreateAnnonce(canCreate)
                .limiteParLicence(limiteParLicence)
                .build();
    }
}
