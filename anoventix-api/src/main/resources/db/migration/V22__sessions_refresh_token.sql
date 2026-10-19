-- =====================================================================
--  V22 — Sessions : jetons de rafraîchissement en base (ECART-21, ECART-51)
-- =====================================================================
--  Jusqu'ici, la révocation d'un jeton de rafraîchissement vivait en
--  mémoire : un redémarrage de l'API réactivait les jetons révoqués à la
--  déconnexion (valables 7 jours), et un jeton volé puis rejoué n'était
--  pas détectable.
--
--  Chaque jeton émis est enregistré (id = claim « jti »). À chaque
--  rafraîchissement le jeton est remplacé par un nouveau de la même
--  « famille » (une famille = une session d'un appareil). Rejouer un jeton
--  déjà utilisé révoque toute la famille : l'attaquant et la victime sont
--  déconnectés, et la victime se reconnecte avec son mot de passe.
--
--  Les jetons émis avant cette migration n'ont pas de jti : ils restent
--  valables jusqu'à leur expiration (7 jours au plus) puis disparaissent.
-- =====================================================================

CREATE TABLE IF NOT EXISTS refresh_token (
    id          UUID PRIMARY KEY,
    famille_id  UUID          NOT NULL,
    user_id     UUID          NOT NULL REFERENCES account (id) ON DELETE CASCADE,
    cree_le     TIMESTAMP(6)  NOT NULL,
    expire_le   TIMESTAMP(6)  NOT NULL,
    utilise_le  TIMESTAMP(6),
    revoque_le  TIMESTAMP(6)
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_user    ON refresh_token (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_famille ON refresh_token (famille_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expire  ON refresh_token (expire_le);
