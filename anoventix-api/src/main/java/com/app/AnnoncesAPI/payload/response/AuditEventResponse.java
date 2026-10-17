package com.app.AnnoncesAPI.payload.response;

import java.time.LocalDateTime;
import java.util.UUID;

import com.app.AnnoncesAPI.entities.AuditEvent;
import com.app.AnnoncesAPI.enums.ActionAudit;
import com.app.AnnoncesAPI.enums.ActionAudit.CibleAudit;

/** Entrée du journal d'audit, telle que la voit l'administrateur. */
public record AuditEventResponse(
        Long id,
        LocalDateTime date,
        UUID acteurId,
        String acteurLibelle,
        String acteurRole,
        ActionAudit action,
        CibleAudit cibleType,
        String cibleId,
        String motif,
        String adresseIp) {

    public static AuditEventResponse of(AuditEvent e) {
        return new AuditEventResponse(e.getId(), e.getDate(), e.getActeurId(), e.getActeurLibelle(),
                e.getActeurRole(), e.getAction(), e.getCibleType(), e.getCibleId(), e.getMotif(),
                e.getAdresseIp());
    }
}
