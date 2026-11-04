-- =============================================
-- Migration 004 – huvudadmin, barn i flera lag och föräldrar via barnen
--
-- * Huvudadmin (profiles.is_super_admin) ser och administrerar alla lag, skapar lag,
--   lägger barn i lag och tilldelar användare.
-- * Ett barn kan vara med i flera lag (team_children). children.team_id försvinner.
-- * team_members innehåller bara ekonomiansvariga. Föräldrar får tillgång till de lag
--   deras barn är med i – läggs barnet i ett nytt lag ser föräldern det direkt.
-- * Inbjudningar gäller användaren, inte ett lag: barn att koppla och lag att vara
--   ekonomiansvarig i.
-- =============================================

BEGIN;

-- =============================================
-- HUVUDADMIN
-- =============================================

ALTER TABLE public.profiles ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Användare får bara ändra sitt namn – inte göra sig själva till huvudadmin
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT is_super_admin FROM profiles WHERE id = auth.uid()), FALSE);
$$;

-- =============================================
-- BARN I FLERA LAG
-- =============================================

CREATE TABLE public.team_children (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, child_id)
);
CREATE INDEX idx_team_children_child ON public.team_children(child_id);

INSERT INTO public.team_children (team_id, child_id) SELECT team_id, id FROM public.children;

-- Allt som byggde på children.team_id byggs om längre ner
DROP POLICY "children_select" ON public.children;
DROP POLICY "children_insert" ON public.children;
DROP POLICY "children_update" ON public.children;
DROP POLICY "children_delete" ON public.children;
DROP POLICY "child_guardians_select" ON public.child_guardians;
DROP POLICY "child_guardians_insert" ON public.child_guardians;
DROP POLICY "child_guardians_delete" ON public.child_guardians;
DROP POLICY "campaign_sales_write" ON public.campaign_sales;
DROP POLICY "transactions_write" ON public.transactions;
DROP FUNCTION public.child_team_id(UUID);
DROP FUNCTION public.invite_member(UUID, TEXT, TEXT, UUID[]);

ALTER TABLE public.children DROP COLUMN team_id;

-- =============================================
-- EKONOMIANSVARIGA – föräldrar finns inte längre i team_members
-- =============================================

DELETE FROM public.team_members WHERE role = 'parent';
ALTER TABLE public.team_members DROP CONSTRAINT team_members_role_check;
ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check CHECK (role = 'admin');
ALTER TABLE public.team_members ALTER COLUMN role SET DEFAULT 'admin';

DROP POLICY "team_members_insert" ON public.team_members;
DROP POLICY "team_members_update" ON public.team_members;
DROP POLICY "team_members_delete" ON public.team_members;
CREATE POLICY "team_members_write" ON public.team_members FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- =============================================
-- BEHÖRIGHETSHJÄLPARE
-- =============================================

CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT is_super_admin() OR EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND profile_id = auth.uid() AND role = 'admin'
  );
$$;

-- Ekonomiansvarig, huvudadmin eller förälder till ett barn i laget
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT is_team_admin(p_team_id) OR EXISTS (
    SELECT 1
    FROM team_children tc
    JOIN children c ON c.id = tc.child_id AND c.deleted_at IS NULL
    JOIN child_guardians g ON g.child_id = tc.child_id
    WHERE tc.team_id = p_team_id AND g.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_guardian(p_child_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM child_guardians WHERE child_id = p_child_id AND profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.child_in_team(p_child_id UUID, p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM team_children WHERE child_id = p_child_id AND team_id = p_team_id);
$$;

-- Huvudadmin, eller ekonomiansvarig i något av barnets lag
CREATE OR REPLACE FUNCTION public.can_admin_child(p_child_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT is_super_admin() OR EXISTS (
    SELECT 1
    FROM team_children tc
    JOIN team_members m ON m.team_id = tc.team_id
    WHERE tc.child_id = p_child_id AND m.profile_id = auth.uid() AND m.role = 'admin'
  );
$$;

-- Huvudadmin ser alla. Ekonomiansvariga ser varandra och föräldrar till barnen de ansvarar för
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
    );
$$;

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.team_children ENABLE ROW LEVEL SECURITY;

-- Barn skapas via create_child() så att de alltid hamnar i ett lag
CREATE POLICY "children_select" ON public.children FOR SELECT TO authenticated
  USING (public.can_admin_child(id) OR public.is_guardian(id));
CREATE POLICY "children_update" ON public.children FOR UPDATE TO authenticated
  USING (public.can_admin_child(id)) WITH CHECK (public.can_admin_child(id));
CREATE POLICY "children_delete" ON public.children FOR DELETE TO authenticated
  USING (public.can_admin_child(id));

CREATE POLICY "team_children_select" ON public.team_children FOR SELECT TO authenticated
  USING (public.is_team_admin(team_id) OR public.is_guardian(child_id));
CREATE POLICY "team_children_insert" ON public.team_children FOR INSERT TO authenticated
  WITH CHECK (public.is_team_admin(team_id) AND public.can_admin_child(child_id));
CREATE POLICY "team_children_delete" ON public.team_children FOR DELETE TO authenticated
  USING (public.is_team_admin(team_id));

CREATE POLICY "child_guardians_select" ON public.child_guardians FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.can_admin_child(child_id));
CREATE POLICY "child_guardians_insert" ON public.child_guardians FOR INSERT TO authenticated
  WITH CHECK (public.can_admin_child(child_id));
CREATE POLICY "child_guardians_delete" ON public.child_guardians FOR DELETE TO authenticated
  USING (public.can_admin_child(child_id));

CREATE POLICY "campaign_sales_write" ON public.campaign_sales FOR ALL TO authenticated
  USING (public.is_team_admin(public.campaign_team_id(campaign_id)))
  WITH CHECK (
    public.is_team_admin(public.campaign_team_id(campaign_id))
    AND public.child_in_team(child_id, public.campaign_team_id(campaign_id))
  );

CREATE POLICY "transactions_write" ON public.transactions FOR ALL TO authenticated
  USING (public.is_team_admin(team_id))
  WITH CHECK (
    public.is_team_admin(team_id)
    AND (child_id IS NULL OR public.child_in_team(child_id, team_id))
  );

-- =============================================
-- INBJUDNINGAR – per användare
-- =============================================

CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  child_ids UUID[] NOT NULL DEFAULT '{}',
  admin_team_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_invites_email ON public.invites(lower(email));

WITH e AS (SELECT DISTINCT lower(email) AS email FROM public.team_invites)
INSERT INTO public.invites (email, child_ids, admin_team_ids)
SELECT
  e.email,
  COALESCE((SELECT array_agg(DISTINCT x) FROM public.team_invites t, unnest(t.child_ids) x
            WHERE lower(t.email) = e.email), '{}'),
  COALESCE((SELECT array_agg(DISTINCT t.team_id) FROM public.team_invites t
            WHERE lower(t.email) = e.email AND t.role = 'admin'), '{}')
FROM e;

DROP TABLE public.team_invites;

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Ekonomiansvariga ser inbjudningar till barn de ansvarar för. Skapas via invite_user()
CREATE POLICY "invites_select" ON public.invites FOR SELECT TO authenticated
  USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM unnest(child_ids) c WHERE public.can_admin_child(c)));
CREATE POLICY "invites_delete" ON public.invites FOR DELETE TO authenticated
  USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM unnest(child_ids) c WHERE public.can_admin_child(c)));

-- =============================================
-- NY ANVÄNDARE
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);

  SELECT * INTO inv FROM invites WHERE lower(email) = lower(NEW.email);
  IF FOUND THEN
    INSERT INTO child_guardians (child_id, profile_id)
    SELECT c.id, NEW.id FROM children c
    WHERE c.id = ANY (inv.child_ids) AND c.deleted_at IS NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO team_members (team_id, profile_id, role)
    SELECT t.id, NEW.id, 'admin' FROM teams t
    WHERE t.id = ANY (inv.admin_team_ids)
    ON CONFLICT DO NOTHING;

    DELETE FROM invites WHERE id = inv.id;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- RPC
-- =============================================

-- Lag med förifyllda kategorier – används av create_team() och setup_team()
CREATE OR REPLACE FUNCTION public.new_team(p_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO teams (name) VALUES (trim(p_name)) RETURNING id INTO new_id;
  INSERT INTO categories (team_id, name, kind, color, sort_order) VALUES
    (new_id, 'Försäljning',   'income',  '#3987e5', 0),
    (new_id, 'Medlemsavgift', 'income',  '#199e70', 1),
    (new_id, 'Sponsring',     'income',  '#9085e9', 2),
    (new_id, 'Cuper',         'expense', '#d95926', 0),
    (new_id, 'Domare',        'expense', '#c98500', 1),
    (new_id, 'Material',      'expense', '#d55181', 2),
    (new_id, 'Resor',         'expense', '#008300', 3),
    (new_id, 'Avslutning',    'expense', '#e66767', 4);
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.new_team(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_team(p_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  RETURN new_team(p_name);
END;
$$;

-- SQL-editorn: lag + ekonomiansvarig. Utan konto sparas en inbjudan
CREATE OR REPLACE FUNCTION public.setup_team(p_name TEXT, p_admin_email TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID := new_team(p_name);
  admin_id UUID;
  clean_email TEXT := lower(trim(p_admin_email));
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE lower(email) = clean_email;
  IF admin_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, profile_id, role) VALUES (new_id, admin_id, 'admin');
  ELSE
    INSERT INTO invites (email, admin_team_ids) VALUES (clean_email, ARRAY[new_id])
    ON CONFLICT (lower(email))
      DO UPDATE SET admin_team_ids = array(SELECT DISTINCT unnest(invites.admin_team_ids || EXCLUDED.admin_team_ids));
  END IF;
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.setup_team(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Nytt barn direkt i ett eller flera lag. Utan lag får bara huvudadmin skapa barn
CREATE OR REPLACE FUNCTION public.create_child(p_name TEXT, p_team_ids UUID[])
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
  t UUID;
BEGIN
  IF COALESCE(cardinality(p_team_ids), 0) = 0 AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  FOREACH t IN ARRAY COALESCE(p_team_ids, '{}') LOOP
    IF NOT is_team_admin(t) THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
  END LOOP;

  INSERT INTO children (name) VALUES (trim(p_name)) RETURNING id INTO new_id;
  INSERT INTO team_children (team_id, child_id)
  SELECT DISTINCT unnest(COALESCE(p_team_ids, '{}')), new_id;
  RETURN new_id;
END;
$$;

-- Kopplar barn (och för huvudadmin: lag som ekonomiansvarig) till en e-postadress.
-- Finns kontot kopplas det direkt, annars sparas eller kompletteras en inbjudan.
-- En ekonomiansvarig ändrar bara de barn hen ansvarar för – resten av inbjudan står kvar.
CREATE OR REPLACE FUNCTION public.invite_user(p_email TEXT, p_child_ids UUID[], p_admin_team_ids UUID[])
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean_email TEXT := lower(trim(p_email));
  kids UUID[] := COALESCE(p_child_ids, '{}');
  teams_in UUID[] := COALESCE(p_admin_team_ids, '{}');
  target UUID;
  existing invites%ROWTYPE;
  c UUID;
BEGIN
  IF NOT is_super_admin()
     AND NOT EXISTS (SELECT 1 FROM team_members WHERE profile_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF cardinality(teams_in) > 0 AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  FOREACH c IN ARRAY kids LOOP
    IF NOT can_admin_child(c) THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
  END LOOP;

  SELECT id INTO target FROM profiles WHERE lower(email) = clean_email;
  IF target IS NOT NULL THEN
    INSERT INTO child_guardians (child_id, profile_id)
    SELECT DISTINCT unnest(kids), target
    ON CONFLICT DO NOTHING;
    INSERT INTO team_members (team_id, profile_id, role)
    SELECT DISTINCT unnest(teams_in), target, 'admin'
    ON CONFLICT DO NOTHING;
    RETURN 'added';
  END IF;

  SELECT * INTO existing FROM invites WHERE lower(email) = clean_email;
  IF FOUND THEN
    kids := array(
      SELECT DISTINCT x FROM unnest(existing.child_ids || kids) x
      WHERE x = ANY (kids) OR NOT can_admin_child(x)
    );
    IF NOT is_super_admin() THEN
      teams_in := existing.admin_team_ids;
    END IF;
    IF cardinality(kids) = 0 AND cardinality(teams_in) = 0 THEN
      DELETE FROM invites WHERE id = existing.id;
    ELSE
      UPDATE invites SET child_ids = kids, admin_team_ids = teams_in WHERE id = existing.id;
    END IF;
  ELSIF cardinality(kids) > 0 OR cardinality(teams_in) > 0 THEN
    INSERT INTO invites (email, child_ids, admin_team_ids) VALUES (clean_email, kids, teams_in);
  END IF;

  RETURN 'invited';
END;
$$;

-- Huvudadmin gör andra till huvudadmin – men kan inte ta bort sig själv
CREATE OR REPLACE FUNCTION public.set_super_admin(p_profile_id UUID, p_value BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF p_profile_id = auth.uid() AND NOT p_value THEN
    RAISE EXCEPTION 'cannot remove yourself';
  END IF;
  UPDATE profiles SET is_super_admin = p_value WHERE id = p_profile_id;
END;
$$;

-- Lagen användaren har tillgång till och sin roll i dem
CREATE OR REPLACE FUNCTION public.my_teams()
RETURNS TABLE (
  id UUID,
  name TEXT,
  opening_balance_ore BIGINT,
  opening_date DATE,
  created_at TIMESTAMPTZ,
  role TEXT
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT t.id, t.name, t.opening_balance_ore, t.opening_date, t.created_at,
    CASE WHEN is_team_admin(t.id) THEN 'admin' ELSE 'parent' END
  FROM teams t
  WHERE is_team_member(t.id)
  ORDER BY t.name;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_children, public.invites TO authenticated;

COMMIT;
