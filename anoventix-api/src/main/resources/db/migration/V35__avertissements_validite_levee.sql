-- =====================================================================
--  V35 — ECART-24 : avertissements valables 6 mois, levée par un administrateur
-- =====================================================================

-- Le compteur était recalculé à chaque lecture : la colonne n'a jamais été tenue à jour.
ALTER TABLE account DROP COLUMN IF EXISTS nb_avertissements;

-- Un avertissement levé (émis par erreur) ne compte plus mais reste dans l'historique.
ALTER TABLE avertissements ADD COLUMN IF NOT EXISTS date_levee  TIMESTAMP(6);
ALTER TABLE avertissements ADD COLUMN IF NOT EXISTS leve_par    VARCHAR(100);
ALTER TABLE avertissements ADD COLUMN IF NOT EXISTS motif_levee VARCHAR(200);
