-- =====================================================================
--  V36 — ECART-49 : ordre des photos d'une annonce
-- =====================================================================
--  Les photos envoyées une à une recevaient toutes l'ordre 1 : l'ordre réel (et donc la photo principale)
--  dépendait du hasard de la base. Renumérotation 1..n par annonce, dans l'ordre d'envoi.

UPDATE medias m
SET ordre = r.rang
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY annonce_id ORDER BY ordre NULLS LAST, id) AS rang
    FROM medias
) r
WHERE m.id = r.id;

CREATE INDEX IF NOT EXISTS idx_medias_annonce_ordre ON medias (annonce_id, ordre);
