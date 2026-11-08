-- =============================================
-- Mockad användare som väntar på att kopplas – körs i SQL-editorn, inte en migration
--
-- Väntande:  vantar@lagkassa.test / vantar123
--
-- Som om någon registrerat sig och skrivit "Testbarn" som barnets namn. Kontot är inte
-- kopplat till något barn eller lag, så det hamnar under Huvudadmin → Användare →
-- Väntar på koppling. Kör igen för att göra kontot väntande på nytt efter ett test.
-- Kräver migration 015. Städa bort med mock_users_cleanup.sql.
-- =============================================

DO $$
DECLARE
  v_email TEXT := 'vantar@lagkassa.test';
  v_note TEXT := 'Testbarn';
  v_user UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'children_note'
  ) THEN
    RAISE EXCEPTION 'Kör migration 015_signup_children_note.sql först';
  END IF;

  SELECT id INTO v_user FROM auth.users WHERE email = v_email;

  IF v_user IS NULL THEN
    v_user := gen_random_uuid();

    -- Tomma strängar i token-kolumnerna – Supabase Auth klarar inte NULL där
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
      v_email, extensions.crypt('vantar123', extensions.gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', 'Test Väntande', 'children_note', v_note),
      NOW(), NOW(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user, v_user::TEXT, 'email',
      jsonb_build_object('sub', v_user::TEXT, 'email', v_email, 'email_verified', true),
      NOW(), NOW(), NOW()
    );
  END IF;

  -- Tillbaka till väntande: inga barn, inga lag och barnets namn som vid registreringen
  DELETE FROM public.child_guardians WHERE profile_id = v_user;
  DELETE FROM public.team_members WHERE profile_id = v_user;
  UPDATE public.profiles
  SET full_name = 'Test Väntande', children_note = v_note, is_super_admin = FALSE
  WHERE id = v_user;
END;
$$;
