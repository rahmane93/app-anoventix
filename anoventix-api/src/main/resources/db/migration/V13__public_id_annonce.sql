-- Identifiant public non devinable des annonces : il remplace l'id auto-incrémenté
-- dans les URLs partagées (/annonce/<slug>-<public_id>), qui permettait d'énumérer
-- les annonces. L'id numérique reste la clé interne.
ALTER TABLE annonce ADD COLUMN IF NOT EXISTS public_id varchar(16);

-- 12 caractères hexadécimaux aléatoires (48 bits) ; gen_random_uuid() est natif depuis Postgres 13.
UPDATE annonce
SET public_id = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
WHERE public_id IS NULL;

ALTER TABLE annonce ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE annonce ADD CONSTRAINT uk_annonce_public_id UNIQUE (public_id);
