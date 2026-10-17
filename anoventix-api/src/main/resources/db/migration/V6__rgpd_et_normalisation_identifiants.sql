-- =====================================================================
--  V6 — Suppression RGPD + normalisation des identifiants de connexion
-- =====================================================================
--  1. date_suppression_demandee : date de la demande de suppression par
--     l'utilisateur (délai de grâce de 30 jours avant anonymisation).
--  2. Emails en minuscules et téléphones au format +XXX, comme le fait
--     désormais l'application à chaque saisie (Identifiants.java).
--     Les lignes qui entreraient en conflit avec un compte existant ne sont
--     PAS modifiées : à traiter à la main. Requêtes de détection :
--       SELECT lower(email), count(*) FROM account GROUP BY lower(email) HAVING count(*) > 1;
--       SELECT regexp_replace(regexp_replace(telephone, '[\s\-.()]', '', 'g'), '^00', '+'), count(*)
--         FROM account WHERE telephone IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- =====================================================================

-- Sur une base vierge la table n'existe pas encore : Hibernate (ddl-auto=update)
-- la créera ensuite avec toutes ses colonnes, la migration est donc sans effet.
DO $$
BEGIN
    IF to_regclass('account') IS NOT NULL THEN
        ALTER TABLE account
            ADD COLUMN IF NOT EXISTS date_suppression_demandee TIMESTAMP;

        UPDATE account a
           SET email = lower(a.email)
         WHERE a.email <> lower(a.email)
           AND NOT EXISTS (
                 SELECT 1 FROM account b
                  WHERE b.id <> a.id AND lower(b.email) = lower(a.email));

        UPDATE account a
           SET telephone = regexp_replace(regexp_replace(a.telephone, '[\s\-.()]', '', 'g'), '^00', '+')
         WHERE a.telephone IS NOT NULL
           AND a.telephone <> regexp_replace(regexp_replace(a.telephone, '[\s\-.()]', '', 'g'), '^00', '+')
           AND NOT EXISTS (
                 SELECT 1 FROM account b
                  WHERE b.id <> a.id
                    AND b.telephone IS NOT NULL
                    AND regexp_replace(regexp_replace(b.telephone, '[\s\-.()]', '', 'g'), '^00', '+')
                      = regexp_replace(regexp_replace(a.telephone, '[\s\-.()]', '', 'g'), '^00', '+'));
    END IF;
END $$;
