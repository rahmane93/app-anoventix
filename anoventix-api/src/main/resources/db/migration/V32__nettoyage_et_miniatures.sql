-- =====================================================================
--  V32 — ECART-43 : nettoyage de l'ancien modèle crédits / mise en avant
--        ECART-55 : miniatures des photos
-- =====================================================================

-- Remplacés par la licence annuelle depuis V8 ; plus aucun code ne les utilise.
DROP TABLE IF EXISTS credit_transaction;
DROP TABLE IF EXISTS credit_compte;
ALTER TABLE annonce DROP COLUMN IF EXISTS boost_expiration;

-- Une photo enregistrée avec ses variantes a une miniature (_t, 400 px) et une version moyenne (_m, 1080 px)
-- à côté du fichier d'origine. Les photos plus anciennes sont rattrapées par une tâche de fond.
ALTER TABLE medias ADD COLUMN IF NOT EXISTS variantes BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_medias_sans_variantes ON medias (id) WHERE NOT variantes;
