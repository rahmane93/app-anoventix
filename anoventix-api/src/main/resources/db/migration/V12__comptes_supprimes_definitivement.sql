-- =====================================================================
--  V12 — Comptes supprimés définitivement
-- =====================================================================
--  date_suppression_definitive : posée à l'anonymisation (suppression par
--  un administrateur, ou délai de grâce RGPD écoulé). Non null ⇒ le compte
--  n'est plus listé ni compté (utilisateurs, entreprises, statistiques).
--  Les comptes déjà anonymisés sont reconnus à leur motif de statut.
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('account') IS NOT NULL THEN
        ALTER TABLE account
            ADD COLUMN IF NOT EXISTS date_suppression_definitive TIMESTAMP;

        UPDATE account
           SET date_suppression_definitive = NOW()
         WHERE motif_statut = 'Compte anonymisé (RGPD)'
           AND date_suppression_definitive IS NULL;
    END IF;
END $$;
