-- =====================================================================
--  V20 — Faute dans le libellé d'un motif de signalement
-- =====================================================================
--  Le motif est stocké sous forme de libellé (ECART-26) : on corrige
--  « Conenu inaproprié » dans les signalements existants, comme dans
--  l'énumération MotifSignalement.
-- =====================================================================

UPDATE signalements SET motif = 'Contenu inapproprié' WHERE motif = 'Conenu inaproprié';
