-- =====================================================================
--  V34 — ECART-29 : blocage d'un interlocuteur, archivage et suppression
--        d'une conversation (pour soi)
-- =====================================================================

CREATE TABLE IF NOT EXISTS blocage_utilisateur (
    id            BIGSERIAL PRIMARY KEY,
    bloqueur_id   UUID         NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    bloque_id     UUID         NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    date_blocage  TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_blocage UNIQUE (bloqueur_id, bloque_id),
    CONSTRAINT blocage_pas_soi_meme CHECK (bloqueur_id <> bloque_id)
);
CREATE INDEX IF NOT EXISTS idx_blocage_bloque ON blocage_utilisateur (bloque_id);

-- État de la conversation pour chacun des deux participants : ACTIVE, ARCHIVEE ou SUPPRIMEE (masquée pour
-- soi seulement). Un nouveau message la remet dans la boîte de son destinataire.
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS etat_participant_one VARCHAR(10) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE conversation ADD COLUMN IF NOT EXISTS etat_participant_two VARCHAR(10) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE conversation ADD CONSTRAINT conversation_etat_one_check CHECK (etat_participant_one IN ('ACTIVE', 'ARCHIVEE', 'SUPPRIMEE'));
ALTER TABLE conversation ADD CONSTRAINT conversation_etat_two_check CHECK (etat_participant_two IN ('ACTIVE', 'ARCHIVEE', 'SUPPRIMEE'));
