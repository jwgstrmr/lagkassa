-- =============================================
-- Migration 014 – händelsetypen jobb
--
-- Barnen gör ett jobb (städning, funktionär på en cup …) och laget får en ersättning
-- för varje barn som jobbade. Ingen förälder ska betala in något, så jobb hör inte
-- till saknade inbetalningar. Ersättning per barn är valfri, som minimum vid försäljning.
-- =============================================

BEGIN;

ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_type_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_type_check
  CHECK (type IN ('sale', 'fee', 'job', 'other'));

ALTER TABLE public.campaigns DROP CONSTRAINT campaigns_amount_matches_type;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_amount_matches_type
  CHECK (
    (type = 'fee' AND amount_per_child_ore IS NOT NULL)
    OR type IN ('sale', 'job')
    OR (type = 'other' AND amount_per_child_ore IS NULL)
  );

-- Som i 009, men bara händelser där barnen betalar in
CREATE OR REPLACE FUNCTION public.open_dues()
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  campaign_id UUID,
  campaign_name TEXT,
  child_id UUID,
  child_name TEXT,
  expected_ore BIGINT,
  paid_ore BIGINT
) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT * FROM (
    SELECT t.id, t.name, c.id, c.name, ch.id, ch.name, c.amount_per_child_ore,
      COALESCE((
        SELECT SUM(tr.amount_ore) FROM transactions tr
        WHERE tr.campaign_id = c.id AND tr.child_id = ch.id AND tr.kind = 'income'
      ), 0)::BIGINT AS paid
    FROM campaign_participants p
    JOIN campaigns c ON c.id = p.campaign_id
    JOIN teams t ON t.id = c.team_id
    JOIN children ch ON ch.id = p.child_id AND ch.deleted_at IS NULL
    JOIN team_children tc ON tc.child_id = ch.id AND tc.team_id = c.team_id
    -- Händelser som inte börjat än kan inte sakna inbetalningar
    WHERE is_team_admin(c.team_id) AND (c.start_date IS NULL OR c.start_date <= CURRENT_DATE)
      AND c.type IN ('sale', 'fee')
  ) d (team_id, team_name, campaign_id, campaign_name, child_id, child_name, expected_ore, paid_ore)
  WHERE (d.expected_ore IS NOT NULL AND d.paid_ore < d.expected_ore)
     OR (d.expected_ore IS NULL AND d.paid_ore = 0)
  ORDER BY d.team_name, d.campaign_name, d.child_name;
$$;

COMMIT;
