package com.app.AnnoncesAPI.services;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app.AnnoncesAPI.dto.EntrepriseDTO;
import com.app.AnnoncesAPI.dto.QuotasDTO;
import com.app.AnnoncesAPI.entities.Entreprise;
import com.app.AnnoncesAPI.entities.ParametrePlateforme;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.exceptions.ResourceNotFoundException;
import com.app.AnnoncesAPI.mappers.EntrepriseMapper;
import com.app.AnnoncesAPI.repositories.BienImmoRepository;
import com.app.AnnoncesAPI.repositories.EntrepriseRepository;
import com.app.AnnoncesAPI.repositories.ParametrePlateformeRepository;

import lombok.RequiredArgsConstructor;

/**
 * Quotas des comptes professionnels : une valeur globale réglée par l'administrateur
 * (ParametrePlateforme), qu'une entreprise peut remplacer par sa propre valeur
 * (colonne non nulle sur l'entreprise = exception).
 */
@Service
@RequiredArgsConstructor
public class QuotaEntrepriseService {

    static final String PARAM_QUOTA_AGENTS = "quota.agents.defaut";
    static final String PARAM_QUOTA_ANNONCES = "quota.annonces.defaut";
    public static final int QUOTA_AGENTS_DEFAUT = 5;
    public static final int QUOTA_ANNONCES_DEFAUT = 50;

    private final ParametrePlateformeRepository parametreRepository;
    private final BienImmoRepository bienImmoRepository;
    private final EntrepriseRepository entrepriseRepository;
    private final EntrepriseMapper entrepriseMapper;

    // ─── Valeurs globales ───────────────────────────────────────────────

    public QuotasDTO getDefauts() {
        return new QuotasDTO(lireEntier(PARAM_QUOTA_AGENTS, QUOTA_AGENTS_DEFAUT),
                lireEntier(PARAM_QUOTA_ANNONCES, QUOTA_ANNONCES_DEFAUT));
    }

    @Transactional
    public QuotasDTO setDefauts(QuotasDTO quotas) {
        parametreRepository.save(new ParametrePlateforme(PARAM_QUOTA_AGENTS, String.valueOf(quotas.getQuotaAgents())));
        parametreRepository.save(new ParametrePlateforme(PARAM_QUOTA_ANNONCES, String.valueOf(quotas.getQuotaAnnonces())));
        return getDefauts();
    }

    private int lireEntier(String cle, int defaut) {
        return parametreRepository.findById(cle)
                .map(ParametrePlateforme::getValeur)
                .map(v -> {
                    try {
                        return Integer.parseInt(v.trim());
                    } catch (NumberFormatException e) {
                        return defaut;
                    }
                })
                .orElse(defaut);
    }

    // ─── Quotas effectifs d'une entreprise ──────────────────────────────

    public int quotaAgents(Entreprise entreprise) {
        return entreprise.getQuotaAgents() != null ? entreprise.getQuotaAgents() : getDefauts().getQuotaAgents();
    }

    public int quotaAnnonces(Entreprise entreprise) {
        return entreprise.getQuotaAnnonces() != null ? entreprise.getQuotaAnnonces() : getDefauts().getQuotaAnnonces();
    }

    /**
     * Agents qui occupent une place : ni le propriétaire, ni les agents retirés (INACTIF).
     * Même périmètre que la liste des agents de l'entreprise.
     */
    public int nombreAgents(Entreprise entreprise) {
        return (int) entreprise.getAgents().stream()
                .filter(agent -> !estProprietaire(entreprise, agent))
                .filter(agent -> agent.getStatut() != StatutUtilisateur.INACTIF)
                .count();
    }

    private static boolean estProprietaire(Entreprise entreprise, User user) {
        return entreprise.getAnnonceurProfessionnel() != null
                && entreprise.getAnnonceurProfessionnel().getId().equals(user.getId());
    }

    public boolean peutAjouterAgent(Entreprise entreprise) {
        return nombreAgents(entreprise) < quotaAgents(entreprise);
    }

    public long annoncesActives(Entreprise entreprise) {
        return bienImmoRepository.countActiveAnnoncesByEntreprise(entreprise.getId());
    }

    public boolean peutCreerAnnonce(Entreprise entreprise, long annoncesActives) {
        return annoncesActives < quotaAnnonces(entreprise);
    }

    /** Exception d'une entreprise ; une valeur nulle la ramène à la valeur globale. */
    @Transactional
    public EntrepriseDTO setQuotasEntreprise(UUID entrepriseId, QuotasDTO quotas) {
        Entreprise entreprise = entrepriseRepository.findById(entrepriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Entreprise non trouvée avec l'ID: " + entrepriseId));
        entreprise.setQuotaAgents(quotas.getQuotaAgents());
        entreprise.setQuotaAnnonces(quotas.getQuotaAnnonces());
        return toDTO(entrepriseRepository.save(entreprise));
    }

    /** DTO avec les quotas effectifs et les places réellement restantes. */
    public EntrepriseDTO toDTO(Entreprise entreprise) {
        EntrepriseDTO dto = entrepriseMapper.toDTO(entreprise);
        QuotasDTO defauts = getDefauts();
        int quotaAgents = entreprise.getQuotaAgents() != null ? entreprise.getQuotaAgents() : defauts.getQuotaAgents();
        int quotaAnnonces = entreprise.getQuotaAnnonces() != null ? entreprise.getQuotaAnnonces() : defauts.getQuotaAnnonces();
        int agents = nombreAgents(entreprise);
        dto.setQuotaAgents(quotaAgents);
        dto.setQuotaAnnonces(quotaAnnonces);
        dto.setQuotaAgentsPersonnalise(entreprise.getQuotaAgents() != null);
        dto.setQuotaAnnoncesPersonnalise(entreprise.getQuotaAnnonces() != null);
        dto.setNombreAgents(agents);
        dto.setAgentsRestants(Math.max(0, quotaAgents - agents));
        dto.setAnnoncesRestantes((int) Math.max(0, quotaAnnonces - annoncesActives(entreprise)));
        return dto;
    }
}
