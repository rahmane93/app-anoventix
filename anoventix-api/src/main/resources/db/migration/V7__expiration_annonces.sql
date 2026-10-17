-- =====================================================================
--  V7 — Expiration automatique des annonces
-- =====================================================================
--  date_expiration : fin de validité (création / remise en ligne + 180 j).
--  relance_expiration_envoyee : email « expire bientôt » déjà envoyé.
--  Annonces existantes : échéance fixée à +180 jours à partir du déploiement
--  (et non de leur date de création), pour éviter une expiration massive
--  dès le premier passage du job.
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('annonce') IS NOT NULL THEN
        ALTER TABLE annonce
            ADD COLUMN IF NOT EXISTS date_expiration TIMESTAMP,
            ADD COLUMN IF NOT EXISTS relance_expiration_envoyee BOOLEAN NOT NULL DEFAULT FALSE;

        UPDATE annonce
           SET date_expiration = now() + INTERVAL '180 days'
         WHERE date_expiration IS NULL;

        -- Nouveau motif EXPIREE : la contrainte CHECK générée par Hibernate (ddl-auto)
        -- ne liste que les valeurs d'origine et n'est jamais mise à jour par Hibernate.
        -- Sans ce remplacement, la clôture automatique échouerait en base.
        ALTER TABLE annonce DROP CONSTRAINT IF EXISTS annonce_motif_cloture_check;
        ALTER TABLE annonce ADD CONSTRAINT annonce_motif_cloture_check
            CHECK (motif_cloture IN ('VENDU', 'LOUE', 'RETIRE', 'EXPIREE'));
    END IF;
END $$;
