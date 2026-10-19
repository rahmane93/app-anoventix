-- =====================================================================
--  V30 — Locations : caution et avance en nombre de mois (DEC-23)
-- =====================================================================
--  Deux champs facultatifs, sans objet pour une vente. Le loyer reste mensuel.
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS caution_mois INTEGER;
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS avance_mois INTEGER;
ALTER TABLE annonce ADD CONSTRAINT annonce_caution_mois_check CHECK (caution_mois IS NULL OR caution_mois BETWEEN 0 AND 12);
ALTER TABLE annonce ADD CONSTRAINT annonce_avance_mois_check CHECK (avance_mois IS NULL OR avance_mois BETWEEN 0 AND 24);
