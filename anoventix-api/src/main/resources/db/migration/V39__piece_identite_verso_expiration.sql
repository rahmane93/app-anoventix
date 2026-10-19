-- =====================================================================
--  V39 — ECART-28 : verso et date d'expiration de la pièce d'identité
-- =====================================================================
--  Verso obligatoire pour la carte d'identité et le permis (deux faces) ; date d'expiration saisie à l'envoi,
--  une pièce expirée est refusée et ne peut pas être validée.

ALTER TABLE account ADD COLUMN IF NOT EXISTS piece_identite_verso_url VARCHAR(500);
ALTER TABLE account ADD COLUMN IF NOT EXISTS date_expiration_piece DATE;
