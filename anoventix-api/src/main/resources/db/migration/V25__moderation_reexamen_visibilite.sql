-- =====================================================================
--  V25 — Phase 3 : visibilité (DEC-01, DEC-12), réexamen (DEC-09),
--        code de motif des signalements (ECART-26), masquage automatique
--        (DEC-11)
-- =====================================================================

-- ── Visibilité : compte ACTIF et entreprise active ───────────────────────
--  DEC-01 : les annonces d'un compte qui n'est pas ACTIF (suspendu, désactivé,
--  en attente) ne sont pas visibles. DEC-12 : celles des membres d'une
--  entreprise désactivée non plus. Même mécanique que V15 : la fonction est
--  la seule définition de la règle, les triggers recalculent la colonne.
CREATE OR REPLACE FUNCTION annonce_est_visible(p_actif BOOLEAN, p_statut VARCHAR, p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path FROM CURRENT
AS $$
    SELECT COALESCE(p_actif, FALSE)
       AND p_statut = 'PUBLIEE'
       AND EXISTS (SELECT 1 FROM account u
                    WHERE u.id = p_owner_id
                      AND NOT u.annonces_masquees
                      AND u.statut = 'ACTIF'
                      AND (u.entreprise_id IS NULL
                           OR EXISTS (SELECT 1 FROM entreprises e
                                       WHERE e.id = u.entreprise_id AND e.active)));
$$;

DROP TRIGGER IF EXISTS trg_account_visibilite ON account;
CREATE TRIGGER trg_account_visibilite
    AFTER UPDATE OF annonces_masquees, statut, entreprise_id ON account
    FOR EACH ROW
    WHEN (OLD.annonces_masquees IS DISTINCT FROM NEW.annonces_masquees
          OR OLD.statut IS DISTINCT FROM NEW.statut
          OR OLD.entreprise_id IS DISTINCT FROM NEW.entreprise_id)
    EXECUTE FUNCTION account_propager_visibilite();

CREATE OR REPLACE FUNCTION entreprise_propager_visibilite()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
    UPDATE annonce SET visible_public = visible_public
     WHERE owner_id IN (SELECT id FROM account WHERE entreprise_id = NEW.id);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_entreprise_visibilite ON entreprises;
CREATE TRIGGER trg_entreprise_visibilite
    AFTER UPDATE OF active ON entreprises
    FOR EACH ROW
    WHEN (OLD.active IS DISTINCT FROM NEW.active)
    EXECUTE FUNCTION entreprise_propager_visibilite();

UPDATE annonce SET visible_public = visible_public;

-- ── Réexamen d'une annonce masquée (DEC-09) ──────────────────────────────
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS reexamen_demande BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS date_reexamen TIMESTAMP(6);
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS message_reexamen VARCHAR(500);
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS nb_reexamens INTEGER NOT NULL DEFAULT 0;
-- Date du dernier masquage : sert à lister les modifications faites depuis,
-- et à ignorer les signalements antérieurs à une remise en ligne (RG-09-35).
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS date_masquage TIMESTAMP(6);
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS masquage_automatique BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_annonce_reexamen
    ON annonce (date_reexamen) WHERE reexamen_demande;

-- ── Code du motif de signalement (ECART-26) ──────────────────────────────
--  Le libellé reste affiché ; le code sert aux règles (masquage automatique).
ALTER TABLE signalements ADD COLUMN IF NOT EXISTS code_motif VARCHAR(30);

UPDATE signalements SET code_motif = CASE motif
    WHEN 'Contenu inapproprié'       THEN 'CONTENU_INAPPROPRIE'
    WHEN 'Déjà vendu / loué'         THEN 'DEJA_VENDU_LOUE'
    WHEN 'Arnaque / fraude'          THEN 'ARNAQUE_FRAUDE'
    WHEN 'Annonce en double'         THEN 'ANNONCE_EN_DOUBLE'
    WHEN 'Infos incorrectes'         THEN 'INFOS_INCORRECTES'
    WHEN 'Mauvaise catégorie'        THEN 'MAUVAISE_CATEGORIE'
    WHEN 'Problème de localisation'  THEN 'PROBLEME_LOCALISATION'
    ELSE 'AUTRE' END
 WHERE code_motif IS NULL;

CREATE INDEX IF NOT EXISTS idx_signalement_arnaque
    ON signalements (annonce_id) WHERE code_motif = 'ARNAQUE_FRAUDE' AND statut = 'EN_ATTENTE' AND NOT annule;
