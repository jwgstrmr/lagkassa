-- =============================================
-- Migration 010 – inga kategorier, bara intäkt och utgift
--
-- Kategorierna tas bort. Händelser är det som grupperar pengarna, och fristående
-- intäkter och utgifter beskrivs med en valfri text. Fristående poster utan
-- beskrivning får kategorins namn som beskrivning, så att inget tappas bort.
-- =============================================

BEGIN;

UPDATE public.transactions t SET description = c.name
FROM public.categories c
WHERE t.category_id = c.id AND t.campaign_id IS NULL AND t.description IS NULL;

DROP TRIGGER transactions_set_category ON public.transactions;
DROP TRIGGER campaigns_sync_category ON public.campaigns;
DROP FUNCTION public.set_transaction_category();
DROP FUNCTION public.sync_campaign_category();

ALTER TABLE public.transactions DROP COLUMN category_id;
ALTER TABLE public.campaigns DROP COLUMN category_id;
DROP TABLE public.categories;

-- Nya lag utan förifyllda kategorier
CREATE OR REPLACE FUNCTION public.new_team(p_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO teams (name) VALUES (trim(p_name)) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.new_team(TEXT) FROM PUBLIC, anon, authenticated;

COMMIT;
