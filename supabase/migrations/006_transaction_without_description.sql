-- =============================================
-- Migration 006 – intäkter och utgifter utan beskrivning, båda kan gälla ett barn
--
-- I en insats räcker belopp, kategori och barn – beskrivningen blir valfri.
-- Även utgifter kan kopplas till ett barn (t.ex. barnets cupavgift) och räknas
-- då av från barnets bidrag. Barn kräver fortfarande en insats.
-- =============================================

BEGIN;

ALTER TABLE public.transactions ALTER COLUMN description DROP NOT NULL;

ALTER TABLE public.transactions DROP CONSTRAINT transactions_child_needs_campaign;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_child_needs_campaign
  CHECK (child_id IS NULL OR campaign_id IS NOT NULL);

-- Tas insatsen bort försvinner kopplingen till insatsen – då kan barnet inte heller vara kvar
CREATE OR REPLACE FUNCTION public.clear_transaction_child()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.campaign_id IS NULL THEN
    NEW.child_id = NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
