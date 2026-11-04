-- =============================================
-- Migration 002 – lag skapas av den som driftar appen, inte av användarna
--
-- create_team() kunde anropas av alla inloggade. Nu skapas lag med setup_team()
-- i SQL-editorn och ekonomiansvarig kopplas direkt – finns inget konto ännu sparas
-- en inbjudan som löses in vid registrering. Lag går inte heller att ta bort från appen.
-- =============================================

BEGIN;

DROP FUNCTION IF EXISTS public.create_team(TEXT);

DROP POLICY IF EXISTS "teams_delete" ON public.teams;

CREATE OR REPLACE FUNCTION public.setup_team(p_name TEXT, p_admin_email TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
  admin_id UUID;
  clean_email TEXT := lower(trim(p_admin_email));
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

  SELECT id INTO admin_id FROM profiles WHERE lower(email) = clean_email;
  IF admin_id IS NOT NULL THEN
    INSERT INTO team_members (team_id, profile_id, role) VALUES (new_id, admin_id, 'admin');
  ELSE
    INSERT INTO team_invites (team_id, email, role) VALUES (new_id, clean_email, 'admin');
  END IF;

  RETURN new_id;
END;
$$;

-- Bara SQL-editorn (postgres/service_role) – inte appens användare
REVOKE EXECUTE ON FUNCTION public.setup_team(TEXT, TEXT) FROM PUBLIC, anon, authenticated;

COMMIT;
