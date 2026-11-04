-- =============================================
-- Migration 003 – intäkter från en insats kan kopplas till ett barn
--
-- Föräldern ser då barnets bidrag till kassan, inte bara vad barnet sålt för.
-- Bara intäkter med insats kan ha barn, och barnet måste höra till samma lag.
-- =============================================

BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  ADD CONSTRAINT transactions_child_needs_campaign
    CHECK (child_id IS NULL OR (kind = 'income' AND campaign_id IS NOT NULL));

CREATE INDEX idx_transactions_child ON public.transactions(child_id);

DROP POLICY "transactions_write" ON public.transactions;
CREATE POLICY "transactions_write" ON public.transactions FOR ALL TO authenticated
  USING (public.is_team_admin(team_id))
  WITH CHECK (
    public.is_team_admin(team_id)
    AND (child_id IS NULL OR public.child_team_id(child_id) = team_id)
  );

-- Tas insatsen bort försvinner kopplingen till insatsen – då kan barnet inte heller vara kvar
CREATE OR REPLACE FUNCTION public.clear_transaction_child()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.campaign_id IS NULL OR NEW.kind <> 'income' THEN
    NEW.child_id = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_clear_child BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.clear_transaction_child();

COMMIT;
