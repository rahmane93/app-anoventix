-- =====================================================================
--  V29 — Licences : vente nominative et trace de la vente (DEC-17),
--        démarrage différé (DEC-28)
-- =====================================================================
--  Les clés générées avant la mise en service restent au porteur
--  (acheteur_id nul) ; l'administrateur peut leur affecter un acheteur.

ALTER TABLE licence ADD COLUMN IF NOT EXISTS acheteur_id UUID REFERENCES account (id);
ALTER TABLE licence ADD COLUMN IF NOT EXISTS montant BIGINT;
ALTER TABLE licence ADD COLUMN IF NOT EXISTS moyen_paiement VARCHAR(20);
ALTER TABLE licence ADD COLUMN IF NOT EXISTS reference_paiement VARCHAR(100);
ALTER TABLE licence ADD COLUMN IF NOT EXISTS genere_par VARCHAR(100);
ALTER TABLE licence ADD COLUMN IF NOT EXISTS date_vente TIMESTAMP(6);
-- Ordre d'activation : sert à enchaîner les clés « en attente de démarrage » (DEC-28).
ALTER TABLE licence ADD COLUMN IF NOT EXISTS date_activation TIMESTAMP(6);

UPDATE licence SET date_activation = date_debut::timestamp WHERE owner_id IS NOT NULL AND date_activation IS NULL;

CREATE INDEX IF NOT EXISTS idx_licence_acheteur ON licence (acheteur_id);
CREATE INDEX IF NOT EXISTS idx_licence_en_attente ON licence (date_activation) WHERE owner_id IS NOT NULL AND date_fin IS NULL;
