-- =====================================================================
--  V19 — Recherche plein texte insensible aux accents (ECART-57)
-- =====================================================================
--  « Kipe » doit trouver « Kipé ». Extension fournie avec PostgreSQL
--  (contrib) et déclarée « trusted » : le propriétaire de la base peut
--  la créer sans être superutilisateur.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;
