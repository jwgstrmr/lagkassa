-- =============================================
-- Migration 019 – huvudadmin tar bort konton
--
-- T.ex. felregistreringar och dubbletter under Väntar på koppling. Kontot tas bort ur
-- inloggningen (auth.users) och profilen följer med, liksom kopplingarna till barn
-- (child_guardians) och lag som ekonomiansvarig (team_members). Bokförda poster står kvar –
-- transactions.created_by blir tomt. Personen kan registrera sig igen med samma adress.
--
-- Man kan inte ta bort sig själv, och en huvudadmin måste först förlora rollen.
-- =============================================

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_user(p_profile_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot delete yourself';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id AND is_super_admin) THEN
    RAISE EXCEPTION 'cannot delete a super admin';
  END IF;

  DELETE FROM auth.users WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;

COMMIT;
