-- =====================================================================
--  V15 — Visibilité publique d'une annonce, calculée en un seul endroit
-- =====================================================================
--  Règle (SFG §8) : une annonce est visible du public si elle est en ligne
--  (actif), publiée par la modération et si le compte propriétaire n'est
--  pas masqué par l'administrateur.
--
--  Jusqu'ici la règle était recopiée dans une dizaine de requêtes (JPQL,
--  SQL natif, Specification). Elle est désormais écrite UNE fois, dans
--  annonce_est_visible(), et stockée dans annonce.visible_public, que les
--  requêtes publiques se contentent de filtrer.
--
--  La colonne est tenue à jour par la base, y compris pour les mises à
--  jour en masse qui ne passent pas par les entités :
--   - trg_annonce_visibilite : à chaque écriture d'une annonce ;
--   - trg_account_visibilite : quand une donnée du propriétaire qui entre
--     dans la règle change (aujourd'hui annonces_masquees).
--
--  Faire évoluer la règle (DEC-01 compte ACTIF, DEC-12 entreprise active) :
--  nouvelle migration qui remplace annonce_est_visible(), étend la liste
--  des colonnes surveillées par les triggers et recalcule la colonne ;
--  modifier aussi Annonce.estVisiblePubliquement() (contrôles en mémoire).
--  VisibiliteAnnonceTest vérifie que les deux définitions concordent.
--
--  SET search_path FROM CURRENT : les fonctions trouvent leurs tables dans
--  le schéma de l'application (anoventix en prod) même appelées depuis une
--  session dont le search_path diffère (psql, script de maintenance).
-- =====================================================================

ALTER TABLE annonce ADD COLUMN IF NOT EXISTS visible_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION annonce_est_visible(p_actif BOOLEAN, p_statut VARCHAR, p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path FROM CURRENT
AS $$
    SELECT COALESCE(p_actif, FALSE)
       AND p_statut = 'PUBLIEE'
       AND EXISTS (SELECT 1 FROM account u
                    WHERE u.id = p_owner_id
                      AND NOT u.annonces_masquees);
$$;

CREATE OR REPLACE FUNCTION annonce_calculer_visibilite()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
    NEW.visible_public := annonce_est_visible(NEW.actif, NEW.statut_moderation, NEW.owner_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_annonce_visibilite ON annonce;
CREATE TRIGGER trg_annonce_visibilite
    BEFORE INSERT OR UPDATE ON annonce
    FOR EACH ROW EXECUTE FUNCTION annonce_calculer_visibilite();

CREATE OR REPLACE FUNCTION account_propager_visibilite()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
    -- Réécrit visible_public ; trg_annonce_visibilite le recalcule.
    UPDATE annonce SET visible_public = visible_public WHERE owner_id = NEW.id;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_account_visibilite ON account;
CREATE TRIGGER trg_account_visibilite
    AFTER UPDATE OF annonces_masquees ON account
    FOR EACH ROW
    WHEN (OLD.annonces_masquees IS DISTINCT FROM NEW.annonces_masquees)
    EXECUTE FUNCTION account_propager_visibilite();

-- Rattrapage des annonces existantes (le trigger fait le calcul).
UPDATE annonce SET visible_public = visible_public;

-- Catalogue public : filtre sur la visibilité, tri par date de création.
CREATE INDEX IF NOT EXISTS idx_annonce_visible_date
    ON annonce (date_creation DESC) WHERE visible_public;
