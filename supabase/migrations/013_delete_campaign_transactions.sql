-- =============================================
-- Migration 013 – tas en händelse bort följer dess intäkter och kostnader med
--
-- Tidigare blev de kvar i kassan utan koppling till händelsen.
-- =============================================

BEGIN;

ALTER TABLE public.transactions DROP CONSTRAINT transactions_campaign_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;

COMMIT;
