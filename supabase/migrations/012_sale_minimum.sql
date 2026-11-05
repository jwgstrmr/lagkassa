-- =============================================
-- Migration 012 – försäljning kan ha ett minimum per barn
--
-- T.ex. minst 10 lotter à 50 kr = 500 kr. Barnet är klart när minst så mycket är
-- inbetalt men får betala in mer. Avgifter har alltid ett belopp, övrigt aldrig.
-- =============================================

BEGIN;

ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_amount_matches_type;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_amount_matches_type
  CHECK (
    (type = 'fee' AND amount_per_child_ore IS NOT NULL)
    OR type = 'sale'
    OR (type = 'other' AND amount_per_child_ore IS NULL)
  );

COMMIT;
