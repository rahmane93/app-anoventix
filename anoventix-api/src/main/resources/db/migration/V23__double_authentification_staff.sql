-- =====================================================================
--  V23 — Double authentification du staff par code email (DEC-03)
-- =====================================================================
--  Les modérateurs et administrateurs voient les pièces d'identité, lisent
--  des conversations signalées et suppriment des comptes : un mot de passe
--  volé ne doit pas suffire.
--
--  verification_connexion : un défi par tentative de connexion. Le code à
--    6 chiffres envoyé par email n'est jamais stocké en clair ; il vaut
--    10 minutes, 5 essais, une seule fois.
--  code_secours : 8 codes à usage unique, remis une seule fois à la première
--    connexion avec double authentification, pour se connecter quand l'email
--    est indisponible. Stockés hachés.
--  account.codes_secours_generes_le : vide tant que les codes n'ont pas été
--    remis (première connexion avec double authentification).
-- =====================================================================

CREATE TABLE IF NOT EXISTS verification_connexion (
    id          UUID PRIMARY KEY,
    user_id     UUID          NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    code_hash   VARCHAR(100)  NOT NULL,
    cree_le     TIMESTAMP(6)  NOT NULL,
    expire_le   TIMESTAMP(6)  NOT NULL,
    tentatives  INTEGER       NOT NULL DEFAULT 0,
    utilise_le  TIMESTAMP(6),
    annule_le   TIMESTAMP(6)
);

CREATE INDEX IF NOT EXISTS idx_verification_connexion_user ON verification_connexion (user_id, cree_le DESC);

CREATE TABLE IF NOT EXISTS code_secours (
    id          UUID PRIMARY KEY,
    user_id     UUID          NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    code_hash   VARCHAR(100)  NOT NULL,
    cree_le     TIMESTAMP(6)  NOT NULL,
    utilise_le  TIMESTAMP(6)
);

CREATE INDEX IF NOT EXISTS idx_code_secours_user ON code_secours (user_id);

ALTER TABLE account ADD COLUMN IF NOT EXISTS codes_secours_generes_le TIMESTAMP(6);
