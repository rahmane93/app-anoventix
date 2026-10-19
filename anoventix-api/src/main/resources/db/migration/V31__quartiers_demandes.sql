-- =====================================================================
--  V31 — Quartier manquant : entrée technique « Autre quartier » et
--        demandes d'ajout (DEC-22)
-- =====================================================================

-- Entrée technique d'une commune : une annonce dont le quartier n'existe pas y est rattachée. Elle n'est
-- jamais proposée dans les listes de quartiers et s'affiche avec le nom de la commune seul (RG-05-16, RG-05-18).
ALTER TABLE localisation ADD COLUMN IF NOT EXISTS technique BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS demande_quartier (
    id                  BIGSERIAL PRIMARY KEY,
    nom                 VARCHAR(100) NOT NULL,
    localisation_id     VARCHAR(255) NOT NULL REFERENCES localisation (id),
    annonce_id          BIGINT       NOT NULL REFERENCES annonce (id) ON DELETE CASCADE,
    demandeur_id        UUID         NOT NULL REFERENCES account (id),
    statut              VARCHAR(20)  NOT NULL DEFAULT 'EN_ATTENTE',
    motif_refus         VARCHAR(255),
    localisation_finale VARCHAR(255) REFERENCES localisation (id),
    date_demande        TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    date_decision       TIMESTAMP(6),
    decide_par          VARCHAR(100),
    CONSTRAINT demande_quartier_statut_check CHECK (statut IN ('EN_ATTENTE', 'AJOUTEE', 'RATTACHEE', 'REFUSEE'))
);
CREATE INDEX IF NOT EXISTS idx_demande_quartier_attente ON demande_quartier (date_demande) WHERE statut = 'EN_ATTENTE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_demande_quartier_annonce_attente
    ON demande_quartier (annonce_id) WHERE statut = 'EN_ATTENTE';
