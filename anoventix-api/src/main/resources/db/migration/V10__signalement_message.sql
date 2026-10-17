-- =====================================================================
--  V10 — Contexte du signalement d'un message
-- =====================================================================
--  motif_signalement : motif choisi par le signaleur (MotifSignalementMessage).
--  date_signalement  : date du signalement.
--  signale_par_id    : participant ayant signalé le message.
--  Signalements antérieurs : colonnes nulles (motif inconnu).
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('message') IS NOT NULL THEN
        ALTER TABLE message
            ADD COLUMN IF NOT EXISTS motif_signalement VARCHAR(30),
            ADD COLUMN IF NOT EXISTS date_signalement TIMESTAMP(6),
            ADD COLUMN IF NOT EXISTS signale_par_id UUID;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_message_signale_par'
        ) THEN
            ALTER TABLE message
                ADD CONSTRAINT fk_message_signale_par
                FOREIGN KEY (signale_par_id) REFERENCES account (id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;
