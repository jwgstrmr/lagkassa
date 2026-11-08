-- =============================================
-- Migration 016 – bara huvudadmin hanterar spelare, lag och föräldrar
--
-- * Spelarregistret, barnens lag och föräldrarnas kopplingar sköts av huvudadmin, en nivå
--   ovanför lagen. Ekonomiansvariga ser fortfarande lagets spelare och deras föräldrar men
--   ändrar dem inte – de sköter pengarna: ingående saldo, intäkter, utgifter och händelser.
-- * Inbjudningar och konton som väntar på att kopplas är huvudadmins.
-- =============================================

BEGIN;

-- Barnen: läses som förut (can_admin_child), ändras bara av huvudadmin
DROP POLICY "children_update" ON public.children;
DROP POLICY "children_delete" ON public.children;
CREATE POLICY "children_update" ON public.children FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "children_delete" ON public.children FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY "team_children_insert" ON public.team_children;
DROP POLICY "team_children_delete" ON public.team_children;
CREATE POLICY "team_children_insert" ON public.team_children FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY "team_children_delete" ON public.team_children FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY "child_guardians_insert" ON public.child_guardians;
DROP POLICY "child_guardians_delete" ON public.child_guardians;
CREATE POLICY "child_guardians_insert" ON public.child_guardians FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY "child_guardians_delete" ON public.child_guardians FOR DELETE TO authenticated
  USING (public.is_super_admin());

DROP POLICY "invites_select" ON public.invites;
DROP POLICY "invites_delete" ON public.invites;
CREATE POLICY "invites_select" ON public.invites FOR SELECT TO authenticated
  USING (public.is_super_admin());
CREATE POLICY "invites_delete" ON public.invites FOR DELETE TO authenticated
  USING (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.create_child(p_name TEXT, p_team_ids UUID[])
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  INSERT INTO children (name) VALUES (trim(p_name)) RETURNING id INTO new_id;
  INSERT INTO team_children (team_id, child_id)
  SELECT DISTINCT unnest(COALESCE(p_team_ids, '{}')), new_id;
  RETURN new_id;
END;
$$;

-- Kopplar barn och lag som ekonomiansvarig till en e-postadress. Finns kontot kopplas det
-- direkt, annars ersätts inbjudan – en inbjudan utan barn och lag tas bort.
CREATE OR REPLACE FUNCTION public.invite_user(p_email TEXT, p_child_ids UUID[], p_admin_team_ids UUID[])
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  clean_email TEXT := lower(trim(p_email));
  kids UUID[] := array(SELECT DISTINCT unnest(COALESCE(p_child_ids, '{}')));
  teams_in UUID[] := array(SELECT DISTINCT unnest(COALESCE(p_admin_team_ids, '{}')));
  target UUID;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT id INTO target FROM profiles WHERE lower(email) = clean_email;
  IF target IS NOT NULL THEN
    INSERT INTO child_guardians (child_id, profile_id)
    SELECT unnest(kids), target
    ON CONFLICT DO NOTHING;
    INSERT INTO team_members (team_id, profile_id, role)
    SELECT unnest(teams_in), target, 'admin'
    ON CONFLICT DO NOTHING;
    RETURN 'added';
  END IF;

  IF cardinality(kids) = 0 AND cardinality(teams_in) = 0 THEN
    DELETE FROM invites WHERE lower(email) = clean_email;
  ELSE
    INSERT INTO invites (email, child_ids, admin_team_ids) VALUES (clean_email, kids, teams_in)
    ON CONFLICT (lower(email))
      DO UPDATE SET child_ids = EXCLUDED.child_ids, admin_team_ids = EXCLUDED.admin_team_ids;
  END IF;
  RETURN 'invited';
END;
$$;

-- Som före migration 009: ekonomiansvariga kopplar inte längre konton, så de behöver inte se
-- konton utan lag
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

COMMIT;
