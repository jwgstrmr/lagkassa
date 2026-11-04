-- =============================================
-- Mockade användare för att testa appen – körs i SQL-editorn, inte en migration
--
-- Förälder:          foralder@lagkassa.test / foralder123
-- Ekonomiansvarig:   ekonomi@lagkassa.test  / ekonomi123
--
-- Båda hör till laget i v_team_name, eller lagets första lag om det är NULL.
-- Föräldern får två testbarn i laget och en inbetalning per barn och händelse.
-- Följer en händelse upp inbetalningar per barn är testbarnen med där också.
-- Kör igen utan att något dubbleras. Städa bort allt med mock_users_cleanup.sql.
-- =============================================

DO $$
DECLARE
  v_team_name TEXT := NULL;  -- t.ex. 'Flickor 2017'
  v_team UUID;
  v_user UUID;
  v_parent UUID;
  v_admin UUID;
  v_child UUID;
  v_u RECORD;
  v_kid RECORD;
BEGIN
  SELECT id INTO v_team FROM public.teams
  WHERE v_team_name IS NULL OR name = v_team_name
  ORDER BY created_at LIMIT 1;
  IF v_team IS NULL THEN
    RAISE EXCEPTION 'Laget finns inte – kontrollera v_team_name eller skapa ett lag först';
  END IF;

  FOR v_u IN
    SELECT * FROM (VALUES
      ('foralder@lagkassa.test', 'foralder123', 'Test Förälder'),
      ('ekonomi@lagkassa.test',  'ekonomi123',  'Test Ekonomiansvarig')
    ) AS u(email, password, full_name)
  LOOP
    SELECT id INTO v_user FROM auth.users WHERE email = v_u.email;

    IF v_user IS NULL THEN
      v_user := gen_random_uuid();

      -- Tomma strängar i token-kolumnerna – Supabase Auth klarar inte NULL där
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
        v_u.email, extensions.crypt(v_u.password, extensions.gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', v_u.full_name),
        NOW(), NOW(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), v_user, v_user::TEXT, 'email',
        jsonb_build_object('sub', v_user::TEXT, 'email', v_u.email, 'email_verified', true),
        NOW(), NOW(), NOW()
      );
    END IF;

    IF v_u.email LIKE 'foralder@%' THEN v_parent := v_user; ELSE v_admin := v_user; END IF;
  END LOOP;

  -- Profilerna skapas av handle_new_user()
  INSERT INTO public.team_members (team_id, profile_id, role)
  VALUES (v_team, v_admin, 'admin')
  ON CONFLICT DO NOTHING;

  -- Föräldern får tillgång till laget via barnen
  FOR v_kid IN
    SELECT * FROM (VALUES ('Testbarn', 50000), ('Testbarn 2', 30000)) AS k(name, amount)
  LOOP
    v_child := NULL;
    SELECT c.id INTO v_child FROM public.children c
    JOIN public.team_children tc ON tc.child_id = c.id AND tc.team_id = v_team
    WHERE c.name = v_kid.name AND c.deleted_at IS NULL;
    IF v_child IS NULL THEN
      INSERT INTO public.children (name) VALUES (v_kid.name) RETURNING id INTO v_child;
      INSERT INTO public.team_children (team_id, child_id) VALUES (v_team, v_child);
    END IF;

    INSERT INTO public.child_guardians (child_id, profile_id)
    VALUES (v_child, v_parent)
    ON CONFLICT DO NOTHING;

    -- Med där händelsen följer upp inbetalningar per barn
    INSERT INTO public.campaign_participants (campaign_id, child_id)
    SELECT DISTINCT p.campaign_id, v_child
    FROM public.campaign_participants p
    JOIN public.campaigns c ON c.id = p.campaign_id
    WHERE c.team_id = v_team
    ON CONFLICT DO NOTHING;

    -- En inbetalning per händelse – kategorin ärvs från händelsen
    INSERT INTO public.transactions (team_id, date, kind, amount_ore, campaign_id, child_id, description)
    SELECT v_team, CURRENT_DATE, 'income', v_kid.amount, c.id, v_child,
      'Inbetalning ' || v_kid.name || ' (mock)'
    FROM public.campaigns c
    WHERE c.team_id = v_team
      AND NOT EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.child_id = v_child AND t.campaign_id = c.id
          AND t.description = 'Inbetalning ' || v_kid.name || ' (mock)'
      );
  END LOOP;
END;
$$;
