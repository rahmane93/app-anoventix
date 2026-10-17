-- =====================================================================
--  V18 — Email d'un compte : 100 caractères (ECART-10)
-- =====================================================================
--  L'inscription d'un agent acceptait 100 caractères mais la colonne n'en
--  stockait que 50 : erreur 500 entre 51 et 100. Une seule longueur,
--  100, pour l'inscription, la création d'agent et le compte.
-- =====================================================================

ALTER TABLE account ALTER COLUMN email TYPE VARCHAR(100);
