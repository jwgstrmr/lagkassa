-- =============================================
-- Migration 021 – jobb i saknade inbetalningar
--
-- * open_dues() tar med jobb där ersättningen inte kommit. Appen visar bara avslutade händelser
--   under Admin → Uppföljning, så ett avslutat jobb utan ersättning försvinner inte längre.
--   Föräldrarnas Att betala räknas i appen och tar fortfarande inte med jobb.
-- =============================================

BEGIN;

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
      -- Inbetalningar minus återbetalningar till barnet
      COALESCE((
        SELECT SUM(CASE WHEN tr.kind = 'income' THEN tr.amount_ore ELSE -tr.amount_ore END)
        FROM transactions tr
        WHERE tr.campaign_id = c.id AND tr.child_id = ch.id
      ), 0)::BIGINT AS paid
    FROM campaign_participants p
    JOIN campaigns c ON c.id = p.campaign_id
    JOIN teams t ON t.id = c.team_id
    JOIN children ch ON ch.id = p.child_id AND ch.deleted_at IS NULL
    JOIN team_children tc ON tc.child_id = ch.id AND tc.team_id = c.team_id
    -- Händelser som inte börjat än kan inte sakna inbetalningar
    WHERE is_team_admin(c.team_id) AND (c.start_date IS NULL OR c.start_date <= CURRENT_DATE)
      AND c.type IN ('sale', 'fee', 'job')
  ) d (team_id, team_name, campaign_id, campaign_name, child_id, child_name, expected_ore, paid_ore)
  WHERE (d.expected_ore IS NOT NULL AND d.paid_ore < d.expected_ore)
     OR (d.expected_ore IS NULL AND d.paid_ore <= 0)
  ORDER BY d.team_name, d.campaign_name, d.child_name;
$$;

COMMIT;
