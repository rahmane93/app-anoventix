package com.app.AnnoncesAPI.services;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.app.AnnoncesAPI.entities.AuditEvent;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.ActionAudit.CibleAudit;
import com.app.AnnoncesAPI.repositories.AuditEventRepository;
import com.app.AnnoncesAPI.security.AdresseClient;
import com.app.AnnoncesAPI.services.profiles.UserDetailsImpl;

/**
 * Journal d'audit des actions du staff et du système (ECART-63).
 *
 * Appelé explicitement par les services, dans leur transaction : une action annulée
 * (exception, rollback) ne laisse pas de trace, une action réussie en laisse toujours une.
 * L'acteur et l'adresse IP sont pris dans la requête en cours ; hors requête
 * authentifiée (tâche planifiée, règle automatique), l'acteur est « Système ».
 */
@Service
public class AuditService {

    static final String SYSTEME = "Système";
    private static final int MOTIF_MAX = 1000;

    private final AuditEventRepository repository;
    private final AdresseClient adresseClient;

    public AuditService(AuditEventRepository repository, AdresseClient adresseClient) {
        this.repository = repository;
        this.adresseClient = adresseClient;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enregistrer(ActionAudit action, Object cibleId, String motif) {
        UserDetailsImpl acteur = acteurCourant();
        repository.save(new AuditEvent(
                acteur == null ? null : acteur.getId(),
                acteur == null ? SYSTEME : acteur.getUsername(),
                acteur == null ? null : role(acteur),
                action,
                String.valueOf(cibleId),
                tronquer(motif),
                adresseIp()));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void enregistrer(ActionAudit action, Object cibleId) {
        enregistrer(action, cibleId, null);
    }

    @Transactional(readOnly = true)
    public Page<AuditEvent> rechercher(UUID acteurId, ActionAudit action, CibleAudit cibleType,
                                       String cibleId, Pageable pageable) {
        Pageable trie = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Order.desc("date"), Sort.Order.desc("id")));
        return repository.findAll(AuditEventRepository.filtres(acteurId, action, cibleType, cibleId), trie);
    }

    private static UserDetailsImpl acteurCourant() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof UserDetailsImpl user ? user : null;
    }

    private static String role(UserDetailsImpl acteur) {
        return acteur.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(a -> a.replaceFirst("^ROLE_", ""))
                .findFirst()
                .orElse(null);
    }

    private String adresseIp() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs
                ? adresseClient.de(attrs.getRequest())
                : null;
    }

    private static String tronquer(String motif) {
        if (motif == null || motif.isBlank()) {
            return null;
        }
        String m = motif.trim();
        return m.length() <= MOTIF_MAX ? m : m.substring(0, MOTIF_MAX);
    }
}
