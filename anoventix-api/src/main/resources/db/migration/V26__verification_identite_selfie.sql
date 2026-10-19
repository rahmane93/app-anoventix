-- =====================================================================
--  V26 — EVO-01 : selfie de vérification d'identité, traçabilité du dossier
--        (DEC-08, DEC-25, DEC-26)
-- =====================================================================
--  Le dossier de vérification = photo de la pièce + selfie. Le statut existant
--  (statut_piece_identite) s'applique au dossier entier.
-- =====================================================================

ALTER TABLE account ADD COLUMN IF NOT EXISTS selfie_url VARCHAR(500);
ALTER TABLE account ADD COLUMN IF NOT EXISTS date_envoi_verification TIMESTAMP(6);
ALTER TABLE account ADD COLUMN IF NOT EXISTS date_decision_verification TIMESTAMP(6);
ALTER TABLE account ADD COLUMN IF NOT EXISTS decision_verification_par VARCHAR(100);

-- Dossiers existants : la date de décision n'a jamais été enregistrée. On prend la date de mise en
-- service pour que les fichiers soient supprimés 30 jours après (RG-02-41) ; l'auteur reste inconnu.
UPDATE account
   SET date_decision_verification = NOW()
 WHERE statut_piece_identite IN ('VALIDEE', 'REJETEE')
   AND date_decision_verification IS NULL;

-- File de vérification : plus anciens dossiers d'abord (RG-02-40).
CREATE INDEX IF NOT EXISTS idx_account_verification_attente
    ON account (date_envoi_verification NULLS FIRST)
    WHERE statut_piece_identite = 'EN_ATTENTE';
