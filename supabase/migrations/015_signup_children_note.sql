-- =============================================
-- Migration 015 – barnets namn vid registreringen
--
-- * Den som registrerar sig skriver i fritext vad barnet heter (profiles.children_note).
--   Huvudadmin och ekonomiansvariga ser det på konton som inte är kopplade än och vet
--   då vilket barn kontot ska kopplas till.
-- * Användaren kan ändra texten själv, t.ex. medan kontot väntar på att kopplas.
-- =============================================

BEGIN;

ALTER TABLE public.profiles ADD COLUMN children_note TEXT
  CHECK (char_length(children_note) <= 200);

GRANT UPDATE (full_name, children_note) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
BEGIN
  INSERT INTO profiles (id, full_name, email, children_note)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    left(NULLIF(trim(NEW.raw_user_meta_data->>'children_note'), ''), 200)
  );

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

COMMIT;
