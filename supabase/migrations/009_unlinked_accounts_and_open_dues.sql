-- =============================================
-- Migration 009 – konton utan lag och saknade inbetalningar
--
-- * Ekonomiansvariga ser konton som inte hör till något lag – t.ex. en förälder som
--   registrerat sig med en annan e-postadress än inbjudan – och kan koppla dem till barn.
-- * open_dues(): barn som ska betala in till en händelse men inte är klara, i alla lag
--   där man är ekonomiansvarig.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.can_see_profile(p_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT p_profile_id = auth.uid()
    OR is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM team_members a
      JOIN team_members m ON m.team_id = a.team_id
      WHERE a.profile_id = auth.uid() AND m.profile_id = p_profile_id
    )
    OR EXISTS (
      SELECT 1 FROM child_guardians g
      WHERE g.profile_id = p_profile_id AND can_admin_child(g.child_id)
    )
    -- Konton utan barn och utan lag – ekonomiansvariga ska kunna koppla dem
    OR (
      EXISTS (SELECT 1 FROM team_members WHERE profile_id = auth.uid() AND role = 'admin')
      AND NOT EXISTS (SELECT 1 FROM child_guardians WHERE profile_id = p_profile_id)
      AND NOT EXISTS (SELECT 1 FROM team_members WHERE profile_id = p_profile_id)
    );
$$;

-- RLS gäller – bara händelser i lag där man är ekonomiansvarig kommer med
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
  ) d (team_id, team_name, campaign_id, campaign_name, child_id, child_name, expected_ore, paid_ore)
  WHERE (d.expected_ore IS NOT NULL AND d.paid_ore < d.expected_ore)
     OR (d.expected_ore IS NULL AND d.paid_ore = 0)
  ORDER BY d.team_name, d.campaign_name, d.child_name;
$$;

COMMIT;
