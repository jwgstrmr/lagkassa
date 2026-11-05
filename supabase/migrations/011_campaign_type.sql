-- =============================================
-- Migration 011 – händelsetyp: försäljning, avgift eller övrigt
--
-- * Försäljning – barnen betalar in det de sålt för (kakor, bingolotter …)
-- * Avgift      – fast belopp per barn (cup, läger …)
-- * Övrigt      – ingen uppföljning per barn (avslutning, sponsring …)
-- Ersätter valet "följ upp inbetalningar per barn" plus ett valfritt belopp.
-- =============================================

BEGIN;

ALTER TABLE public.campaigns
  ADD COLUMN type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('sale', 'fee', 'other'));

-- Befintliga händelser får typen utifrån hur de är inställda
UPDATE public.campaigns c SET type = CASE
  WHEN c.amount_per_child_ore IS NOT NULL THEN 'fee'
  WHEN EXISTS (SELECT 1 FROM public.campaign_participants p WHERE p.campaign_id = c.id) THEN 'sale'
  ELSE 'other'
END;

-- Bara avgifter har ett belopp per barn, och de har alltid ett
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_amount_matches_type
  CHECK ((type = 'fee') = (amount_per_child_ore IS NOT NULL));

COMMIT;
