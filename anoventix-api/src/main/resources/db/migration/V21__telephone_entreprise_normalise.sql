-- =====================================================================
--  V21 — Téléphones d'entreprise au format +XXX (ECART-44)
-- =====================================================================
--  Même normalisation que celle des comptes (V6) : espaces, tirets, points
--  et parenthèses retirés, préfixe 00 remplacé par +. Les lignes qui
--  entreraient en conflit avec une autre entreprise ne sont PAS modifiées :
--  à traiter à la main. Détection :
--    SELECT regexp_replace(regexp_replace(telephone, '[\s\-.()]', '', 'g'), '^00', '+'), count(*)
--      FROM entreprises WHERE telephone IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- =====================================================================

UPDATE entreprises e
   SET telephone = regexp_replace(regexp_replace(e.telephone, '[\s\-.()]', '', 'g'), '^00', '+')
 WHERE e.telephone IS NOT NULL
   AND e.telephone <> regexp_replace(regexp_replace(e.telephone, '[\s\-.()]', '', 'g'), '^00', '+')
   AND NOT EXISTS (
         SELECT 1 FROM entreprises b
          WHERE b.id <> e.id
            AND b.telephone IS NOT NULL
            AND regexp_replace(regexp_replace(b.telephone, '[\s\-.()]', '', 'g'), '^00', '+')
              = regexp_replace(regexp_replace(e.telephone, '[\s\-.()]', '', 'g'), '^00', '+'));
