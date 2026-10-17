-- =====================================================================
--  V4 — Motif de modération communiqué au propriétaire
-- =====================================================================
--  Renseigné au masquage / rejet d'une annonce par un modérateur,
--  effacé à la remise en ligne. NULL pour les annonces existantes.
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('annonce') IS NOT NULL THEN
        ALTER TABLE annonce
            ADD COLUMN IF NOT EXISTS motif_moderation VARCHAR(500);
    END IF;
END $$;
