-- =====================================================================
--  V38 — ECART-35 : documents disponibles en liste fermée
-- =====================================================================
--  L'API acceptait un texte libre. Les valeurs existantes sont ramenées aux codes de la liste
--  (TITRE_FONCIER, DONATION, ACTE_DE_VENTE, CERTIFICAT_USAGE_FONCIER, AUTRE), séparés par des virgules ;
--  un document non reconnu devient AUTRE.

WITH morceaux AS (
    SELECT a.id,
           CASE
               WHEN upper(btrim(m.brut)) IN ('TITRE_FONCIER', 'DONATION', 'ACTE_DE_VENTE', 'CERTIFICAT_USAGE_FONCIER', 'AUTRE')
                   THEN upper(btrim(m.brut))
               WHEN lower(unaccent(m.brut)) LIKE '%titre%foncier%' THEN 'TITRE_FONCIER'
               WHEN lower(unaccent(m.brut)) LIKE '%donation%' THEN 'DONATION'
               WHEN lower(unaccent(m.brut)) LIKE '%acte%vente%' THEN 'ACTE_DE_VENTE'
               WHEN lower(unaccent(m.brut)) LIKE '%usage%foncier%' THEN 'CERTIFICAT_USAGE_FONCIER'
               ELSE 'AUTRE'
           END AS code
    FROM annonce a
    CROSS JOIN LATERAL unnest(string_to_array(a.documents_disponibles, ',')) AS m(brut)
    WHERE btrim(m.brut) <> ''
),
distincts AS (
    SELECT DISTINCT id, code FROM morceaux
),
codes AS (
    SELECT id,
           string_agg(code, ',' ORDER BY array_position(
               ARRAY['TITRE_FONCIER', 'DONATION', 'ACTE_DE_VENTE', 'CERTIFICAT_USAGE_FONCIER', 'AUTRE'], code)) AS valeur
    FROM distincts
    GROUP BY id
)
UPDATE annonce a
SET documents_disponibles = c.valeur
FROM codes c
WHERE a.id = c.id AND a.documents_disponibles IS DISTINCT FROM c.valeur;

UPDATE annonce SET documents_disponibles = 'AUTRE' WHERE btrim(documents_disponibles) = '';
