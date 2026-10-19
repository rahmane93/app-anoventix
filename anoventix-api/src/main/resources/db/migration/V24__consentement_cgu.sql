-- =====================================================================
--  V24 — Preuve du consentement aux CGU (ECART-41)
-- =====================================================================
--  L'app faisait cocher les CGU mais le serveur n'en gardait aucune trace.
--  Désormais chaque inscription enregistre la date d'acceptation et la
--  version des CGU alors en vigueur (app.cgu.version).
--  NULL pour les comptes créés avant cette migration : leur acceptation
--  n'a jamais été enregistrée.
-- =====================================================================

ALTER TABLE account ADD COLUMN IF NOT EXISTS cgu_acceptees_le TIMESTAMP(6);
ALTER TABLE account ADD COLUMN IF NOT EXISTS cgu_version VARCHAR(20);
