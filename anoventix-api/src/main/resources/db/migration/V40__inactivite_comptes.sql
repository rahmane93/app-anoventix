-- =====================================================================
--  V40 — Comptes inactifs (SFG §11.2, DEC-26)
-- =====================================================================
--  Dernière activité (connexion ou rafraîchissement de session) et date de la relance « compte inactif ».
--  Relance après 2 ans sans connexion, anonymisation 3 mois plus tard.

ALTER TABLE account ADD COLUMN IF NOT EXISTS derniere_connexion TIMESTAMP(6);
ALTER TABLE account ADD COLUMN IF NOT EXISTS date_relance_inactivite TIMESTAMP(6);

-- Les comptes existants partent de la mise en service : aucun n'est relancé avant deux ans.
UPDATE account SET derniere_connexion = NOW() WHERE derniere_connexion IS NULL;
ALTER TABLE account ALTER COLUMN derniere_connexion SET DEFAULT NOW();
