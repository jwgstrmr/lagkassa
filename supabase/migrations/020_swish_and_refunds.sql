-- =============================================
-- Migration 020 – Swish per lag och återbetalningar
--
-- * teams.swish_number: dit föräldrarna betalar. Sätts av huvudadmin under Huvudadmin → Lag
--   och visas för föräldrarna under Att betala, med en knapp som öppnar Swish ifyllt.
-- * En kostnad kopplad till ett barn i en händelse är en återbetalning (t.ex. en inställd cup)
--   och räknas av från det barnet betalat in – även i saknade inbetalningar.
-- =============================================

BEGIN;

ALTER TABLE public.teams ADD COLUMN swish_number TEXT
  CHECK (swish_number ~ '^[0-9 +-]{5,20}$');

-- Returtypen ändras, så funktionen måste skapas om
DROP FUNCTION public.my_teams();
CREATE FUNCTION public.my_teams()
RETURNS TABLE (
  id UUID,
  name TEXT,
  opening_balance_ore BIGINT,
  opening_date DATE,
  created_at TIMESTAMPTZ,
  role TEXT,
  swish_number TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT t.id, t.name, t.opening_balance_ore, t.opening_date, t.created_at,
    CASE WHEN is_team_admin(t.id) THEN 'admin' ELSE 'parent' END,
    t.swish_number
  FROM teams t
  WHERE is_team_member(t.id)
  ORDER BY t.name;
$$;

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
      AND c.type IN ('sale', 'fee')
  ) d (team_id, team_name, campaign_id, campaign_name, child_id, child_name, expected_ore, paid_ore)
  WHERE (d.expected_ore IS NOT NULL AND d.paid_ore < d.expected_ore)
     OR (d.expected_ore IS NULL AND d.paid_ore <= 0)
  ORDER BY d.team_name, d.campaign_name, d.child_name;
$$;

COMMIT;
