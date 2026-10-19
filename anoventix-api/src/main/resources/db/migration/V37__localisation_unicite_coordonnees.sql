-- =====================================================================
--  V37 — ECART-45 : unicité des quartiers et coordonnées de référence
-- =====================================================================

-- Point de référence d'un quartier (ou d'une commune, pour son entrée technique) : centre la carte de
-- l'assistant de publication avant que l'annonceur ne place son bien. Facultatif, saisi par l'administration.
ALTER TABLE localisation ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9, 6);
ALTER TABLE localisation ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);
ALTER TABLE localisation ADD CONSTRAINT localisation_latitude_check  CHECK (latitude  BETWEEN -90  AND 90);
ALTER TABLE localisation ADD CONSTRAINT localisation_longitude_check CHECK (longitude BETWEEN -180 AND 180);

-- Un quartier n'existe qu'une fois par commune (à la casse et aux espaces près ; les accents sont contrôlés par
-- l'API). Une base qui contiendrait déjà des doublons n'est pas bloquée : l'index est alors à créer après
-- fusion, l'API refusant de toute façon tout nouveau doublon.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM localisation WHERE NOT technique
        GROUP BY lower(btrim(region)), lower(btrim(prefecture)), lower(btrim(commune)), lower(btrim(quartier))
        HAVING COUNT(*) > 1
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS uq_localisation_quartier ON localisation
            (lower(btrim(region)), lower(btrim(prefecture)), lower(btrim(commune)), lower(btrim(quartier)))
            WHERE NOT technique;
    ELSE
        RAISE NOTICE 'Quartiers en double : index uq_localisation_quartier non créé.';
    END IF;
END $$;
