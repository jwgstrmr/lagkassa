-- =============================================
-- Migration 017 – inga inbjudningar
--
-- Alla registrerar sig själva via länken till /registrera och hamnar under Huvudadmin →
-- Användare → Väntar på koppling, där huvudadmin kopplar dem till barn och lag. En inbjudan
-- var bara samma koppling gjord i förväg på en e-postadress, så den behövs inte längre.
--
-- * handle_new_user() skapar bara profilen – inga inbjudningar löses in.
-- * invite_user() och setup_team() (lag + ekonomiansvarig i SQL-editorn) försvinner med
--   tabellen. Lag och ekonomiansvariga läggs upp av huvudadmin i appen.
--
-- Inbjudningar som ännu inte lösts in tas bort. De personerna hamnar under Väntar på
-- koppling när de registrerar sig, som alla andra.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, children_note)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    left(NULLIF(trim(NEW.raw_user_meta_data->>'children_note'), ''), 200)
  );
  RETURN NEW;
END;
$$;

DROP FUNCTION public.invite_user(TEXT, UUID[], UUID[]);
DROP FUNCTION public.setup_team(TEXT, TEXT);
DROP TABLE public.invites;

COMMIT;
