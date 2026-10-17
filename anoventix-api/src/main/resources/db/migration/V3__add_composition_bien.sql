-- =====================================================================
--  V3 — Composition des biens bâtis
-- =====================================================================
--  Ajoute nb_pieces, nb_chambres, nb_salles_bain sur bien_immo.
--  Colonnes nullables : toujours NULL pour un bien non bâti (TERRAIN,
--  DOMAINE, vendus ou loués en l'état) et pour les annonces existantes.
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('bien_immo') IS NOT NULL THEN
        ALTER TABLE bien_immo
            ADD COLUMN IF NOT EXISTS nb_pieces INTEGER,
            ADD COLUMN IF NOT EXISTS nb_chambres INTEGER,
            ADD COLUMN IF NOT EXISTS nb_salles_bain INTEGER;
    END IF;
END $$;
