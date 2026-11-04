-- =============================================
-- Migration 008 – vad varje barn ska betala till en händelse
--
-- En händelse kan ha ett belopp per barn (cupavgift, bingolotter …) och vilka barn
-- det gäller. Det barnet betalat är händelsens intäkter kopplade till barnet –
-- skillnaden är vad som är kvar att betala. Föräldrar ser bara sina egna barns rader.
-- =============================================

BEGIN;

ALTER TABLE public.campaigns
  ADD COLUMN amount_per_child_ore BIGINT CHECK (amount_per_child_ore > 0);

CREATE TABLE public.campaign_participants (
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (campaign_id, child_id)
);
CREATE INDEX idx_campaign_participants_child ON public.campaign_participants(child_id);

CREATE OR REPLACE FUNCTION public.campaign_team_id(p_campaign_id UUID)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT team_id FROM campaigns WHERE id = p_campaign_id;
$$;

ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_participants_select" ON public.campaign_participants FOR SELECT TO authenticated
  USING (public.is_team_admin(public.campaign_team_id(campaign_id)) OR public.is_guardian(child_id));

CREATE POLICY "campaign_participants_write" ON public.campaign_participants FOR ALL TO authenticated
  USING (public.is_team_admin(public.campaign_team_id(campaign_id)))
  WITH CHECK (
    public.is_team_admin(public.campaign_team_id(campaign_id))
    AND public.child_in_team(child_id, public.campaign_team_id(campaign_id))
  );

COMMIT;
