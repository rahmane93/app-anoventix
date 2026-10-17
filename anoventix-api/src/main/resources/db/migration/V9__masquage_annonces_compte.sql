-- =====================================================================
--  V9 — Masquage système des annonces d'un compte (administrateur)
-- =====================================================================
--  Drapeau au niveau du compte : les annonces sont exclues des vues
--  publiques sans modifier leur propre état (actif, statut, clôture).
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('account') IS NOT NULL THEN
        ALTER TABLE account
            ADD COLUMN IF NOT EXISTS annonces_masquees BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS motif_masquage_annonces VARCHAR(500),
            ADD COLUMN IF NOT EXISTS date_masquage_annonces TIMESTAMP(6);
    END IF;
END $$;
