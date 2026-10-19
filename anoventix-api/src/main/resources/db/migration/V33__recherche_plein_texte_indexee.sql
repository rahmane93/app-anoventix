-- =====================================================================
--  V33 — ECART-46 : recherche plein texte indexée
-- =====================================================================
--  Le texte de recherche (titre, description, type de bien, lieu) était recalculé pour toutes les annonces
--  à chaque requête. Il est désormais stocké dans annonce.recherche_doc, tenu à jour par la base, avec un
--  index GIN : la recherche ne parcourt plus que les annonces qui correspondent.
-- =====================================================================

ALTER TABLE annonce ADD COLUMN IF NOT EXISTS recherche_doc tsvector;

CREATE OR REPLACE FUNCTION annonce_calculer_recherche()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
    NEW.recherche_doc := to_tsvector('french', unaccent(
        coalesce(NEW.titre, '') || ' ' ||
        coalesce(NEW.description, '') || ' ' ||
        coalesce(NEW.type_bien, '') || ' ' ||
        coalesce((SELECT CASE WHEN l.technique THEN '' ELSE coalesce(l.quartier, '') END || ' ' ||
                         coalesce(l.commune, '') || ' ' || coalesce(l.prefecture, '') || ' ' || coalesce(l.region, '')
                    FROM localisation l WHERE l.id = NEW.localisation_id), '')
    ));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_annonce_recherche ON annonce;
CREATE TRIGGER trg_annonce_recherche
    BEFORE INSERT OR UPDATE OF titre, description, type_bien, localisation_id ON annonce
    FOR EACH ROW EXECUTE FUNCTION annonce_calculer_recherche();

-- Un quartier ou une commune renommés mettent à jour le texte de recherche de leurs annonces.
CREATE OR REPLACE FUNCTION localisation_propager_recherche()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
    UPDATE annonce SET titre = titre WHERE localisation_id = NEW.id;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_localisation_recherche ON localisation;
CREATE TRIGGER trg_localisation_recherche
    AFTER UPDATE OF quartier, commune, prefecture, region ON localisation
    FOR EACH ROW EXECUTE FUNCTION localisation_propager_recherche();

-- Rattrapage des annonces existantes (le déclencheur fait le calcul).
UPDATE annonce SET titre = titre;

CREATE INDEX IF NOT EXISTS idx_annonce_recherche_doc ON annonce USING GIN (recherche_doc);
