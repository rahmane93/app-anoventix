package com.app.AnnoncesAPI.repositories;

import java.util.UUID;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.app.AnnoncesAPI.entities.AuditEvent;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.ActionAudit.CibleAudit;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long>, JpaSpecificationExecutor<AuditEvent> {

    /**
     * Filtres facultatifs du journal (null = ignoré). Une Specification plutôt qu'une
     * requête « :p IS NULL », que PostgreSQL ne sait pas typer quand p est null.
     */
    static Specification<AuditEvent> filtres(UUID acteurId, ActionAudit action, CibleAudit cibleType, String cibleId) {
        return (root, query, cb) -> cb.and(
                acteurId == null ? cb.conjunction() : cb.equal(root.get("acteurId"), acteurId),
                action == null ? cb.conjunction() : cb.equal(root.get("action"), action),
                cibleType == null ? cb.conjunction() : cb.equal(root.get("cibleType"), cibleType),
                cibleId == null ? cb.conjunction() : cb.equal(root.get("cibleId"), cibleId));
    }
}
