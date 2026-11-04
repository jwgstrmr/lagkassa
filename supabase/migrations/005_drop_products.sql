-- =============================================
-- Migration 005 – insatser består bara av intäkter och utgifter
--
-- Produkter och antal sålda per barn tas bort. Inköp bokförs som utgifter och
-- barnens inbetalningar som intäkter kopplade till barnet – det räcker för att
-- visa öppet vad som kommit in och gått ut. Det här är ingen bokföring.
-- =============================================

BEGIN;

DROP FUNCTION public.campaign_summary(UUID);
DROP TABLE public.campaign_sales;
DROP TABLE public.campaign_products;
DROP FUNCTION public.campaign_team_id(UUID);

COMMIT;
