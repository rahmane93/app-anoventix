-- =====================================================================
--  V2 — Expiration des tokens d'activation (P1.4)
-- =====================================================================
--  Ajoute la colonne activation_code_expiry sur la table account.
--
--  Sémantique :
--   - NULL  : pas de token actif (compte déjà activé OU compte legacy
--             créé avant cette migration — accepté pour compatibilité).
--   - long  : timestamp ms epoch d'expiration. Si System.currentTimeMillis()
--             > activation_code_expiry, le token est rejeté.
--
--  Durée par défaut : 48 heures (cf. AuthServiceImpl.ACTIVATION_TTL_MS).
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('account') IS NOT NULL THEN
        ALTER TABLE account
            ADD COLUMN IF NOT EXISTS activation_code_expiry BIGINT;
    END IF;
END $$;
