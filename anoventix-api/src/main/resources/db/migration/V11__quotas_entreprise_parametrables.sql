-- =====================================================================
--  V11 — Quotas des comptes professionnels paramétrables
-- =====================================================================
--  Les quotas d'une entreprise deviennent des exceptions facultatives :
--  NULL = valeur globale (parametre_plateforme : quota.agents.defaut,
--  quota.annonces.defaut ; 5 et 50 si absentes).
--  Les anciennes valeurs codées en dur (20 / 100) sont effacées : toutes
--  les entreprises existantes passent sur la valeur globale.
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('entreprises') IS NOT NULL THEN
        ALTER TABLE entreprises
            ALTER COLUMN quota_annonces DROP NOT NULL,
            ALTER COLUMN quota_agents DROP NOT NULL;

        UPDATE entreprises SET quota_annonces = NULL, quota_agents = NULL;
    END IF;
END $$;
