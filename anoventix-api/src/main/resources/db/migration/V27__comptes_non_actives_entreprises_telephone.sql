-- =====================================================================
--  V27 — DEC-06 (purge des comptes non activés), DEC-04 (vérification des entreprises)
-- =====================================================================

-- Vrai une fois la relance à J+5 envoyée (E19) : une seule par compte.
ALTER TABLE account ADD COLUMN IF NOT EXISTS relance_activation_envoyee BOOLEAN NOT NULL DEFAULT FALSE;

-- Sélection quotidienne des comptes jamais activés.
CREATE INDEX IF NOT EXISTS idx_account_non_active
    ON account (created_at) WHERE statut = 'EN_ATTENTE_ACTIVATION' AND parent_user_id IS NULL;

-- ── Vérification des entreprises (DEC-04) ────────────────────────────────
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS statut_verification VARCHAR(20) NOT NULL DEFAULT 'NON_VERIFIEE';
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS justificatif_rccm_url VARCHAR(500);
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS date_envoi_verification TIMESTAMP(6);
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS date_decision_verification TIMESTAMP(6);
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS decision_verification_par VARCHAR(100);
ALTER TABLE entreprises ADD COLUMN IF NOT EXISTS motif_rejet_verification VARCHAR(255);

-- Le RCCM n'est réservé qu'une fois vérifié (RG-07-28) : plusieurs entreprises non vérifiées peuvent
-- déclarer le même numéro, une seule peut le faire vérifier.
ALTER TABLE entreprises DROP CONSTRAINT IF EXISTS entreprises_numerorccm_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_entreprise_rccm_verifiee
    ON entreprises (numerorccm) WHERE statut_verification = 'VERIFIEE';

-- File de vérification : plus anciennes demandes d'abord.
CREATE INDEX IF NOT EXISTS idx_entreprise_verification_attente
    ON entreprises (date_envoi_verification) WHERE statut_verification = 'EN_ATTENTE';
