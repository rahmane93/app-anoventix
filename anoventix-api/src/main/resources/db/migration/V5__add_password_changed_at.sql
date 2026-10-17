-- =====================================================================
--  V5 — Révocation des JWT au changement de mot de passe
-- =====================================================================
--  Ajoute password_changed_at (timestamp ms epoch) sur account.
--  Tout JWT dont la date d'émission (iat) est antérieure est rejeté.
--  NULL pour les comptes existants : aucun token n'est invalidé.
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('account') IS NOT NULL THEN
        ALTER TABLE account
            ADD COLUMN IF NOT EXISTS password_changed_at BIGINT;
    END IF;
END $$;
