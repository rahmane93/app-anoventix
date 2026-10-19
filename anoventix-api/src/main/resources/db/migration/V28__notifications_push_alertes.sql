-- =====================================================================
--  V28 — Notifications push (DEC-13) et alertes de recherche (DEC-16)
-- =====================================================================

-- Appareils Android du compte : un jeton Expo par appareil, supprimé à la déconnexion, à l'anonymisation
-- ou quand le service d'envoi le déclare invalide (RG-06-23).
CREATE TABLE IF NOT EXISTS appareil_push (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              UUID         NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    jeton                VARCHAR(200) NOT NULL UNIQUE,
    plateforme           VARCHAR(20)  NOT NULL,
    date_enregistrement  TIMESTAMP(6) NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appareil_push_user ON appareil_push (user_id);

-- Les deux interrupteurs du profil (RG-11-09).
ALTER TABLE account ADD COLUMN IF NOT EXISTS notif_messages BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE account ADD COLUMN IF NOT EXISTS notif_alertes  BOOLEAN NOT NULL DEFAULT TRUE;

-- Date à laquelle une annonce est devenue visible du public (création ou remise en ligne) : base des
-- alertes de recherche (RG-04-21). Posée par le même déclencheur que visible_public.
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS visible_depuis TIMESTAMP(6);

CREATE OR REPLACE FUNCTION annonce_calculer_visibilite()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
    NEW.visible_public := annonce_est_visible(NEW.actif, NEW.statut_moderation, NEW.owner_id);
    IF NEW.visible_public AND (TG_OP = 'INSERT' OR NOT COALESCE(OLD.visible_public, FALSE)) THEN
        NEW.visible_depuis := NOW();
    END IF;
    RETURN NEW;
END;
$$;

UPDATE annonce SET visible_depuis = COALESCE(date_creation, NOW()) WHERE visible_public AND visible_depuis IS NULL;

CREATE INDEX IF NOT EXISTS idx_annonce_visible_depuis ON annonce (visible_depuis) WHERE visible_public;

-- Alertes de recherche : critères enregistrés au format JSON (mêmes paramètres que la recherche).
CREATE TABLE IF NOT EXISTS alerte_recherche (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 UUID         NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    nom                     VARCHAR(80)  NOT NULL,
    criteres                TEXT         NOT NULL,
    active                  BOOLEAN      NOT NULL DEFAULT TRUE,
    date_creation           TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    derniere_verification   TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    derniere_notification   TIMESTAMP(6),
    derniere_ouverture      TIMESTAMP(6)
);
CREATE INDEX IF NOT EXISTS idx_alerte_user ON alerte_recherche (user_id);
CREATE INDEX IF NOT EXISTS idx_alerte_active ON alerte_recherche (derniere_verification) WHERE active;
