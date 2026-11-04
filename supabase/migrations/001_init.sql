-- =============================================
-- Lagkassan – grundschema
-- Migration 001
--
-- Allt data tillhör ett lag. Admin (ekonomiansvarig) skriver, föräldrar läser.
-- Föräldrar ser lagets totaler men bara sina egna barns försäljning.
-- Belopp lagras i öre som positiva heltal – kind avgör om det är in eller ut.
-- =============================================

BEGIN;

-- =============================================
-- TABELLER
-- =============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_email ON public.profiles(lower(email));

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  opening_balance_ore BIGINT NOT NULL DEFAULT 0,
  opening_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'parent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, profile_id)
);
CREATE INDEX idx_team_members_profile ON public.team_members(profile_id);

-- Inbjudan till en e-postadress som ännu inte har konto – löses in vid registrering
CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('admin', 'parent')),
  child_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_team_invites_email ON public.team_invites(team_id, lower(email));

CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_children_team ON public.children(team_id);

CREATE TABLE public.child_guardians (
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (child_id, profile_id)
);
CREATE INDEX idx_child_guardians_profile ON public.child_guardians(profile_id);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  color TEXT NOT NULL DEFAULT '#A0A0A0',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_categories_team ON public.categories(team_id);

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_campaigns_team ON public.campaigns(team_id);

CREATE TABLE public.campaign_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_ore BIGINT NOT NULL CHECK (price_ore >= 0),
  cost_ore BIGINT NOT NULL DEFAULT 0 CHECK (cost_ore >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, campaign_id)
);
CREATE INDEX idx_campaign_products_campaign ON public.campaign_products(campaign_id);

CREATE TABLE public.campaign_sales (
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, child_id),
  -- Produkten måste höra till samma insats
  FOREIGN KEY (product_id, campaign_id)
    REFERENCES public.campaign_products(id, campaign_id) ON DELETE CASCADE
);
CREATE INDEX idx_campaign_sales_campaign ON public.campaign_sales(campaign_id);
CREATE INDEX idx_campaign_sales_child ON public.campaign_sales(child_id);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  amount_ore BIGINT NOT NULL CHECK (amount_ore > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transactions_team_date ON public.transactions(team_id, date DESC);
CREATE INDEX idx_transactions_campaign ON public.transactions(campaign_id);

-- =============================================
-- UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER campaign_sales_updated_at BEFORE UPDATE ON public.campaign_sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- BEHÖRIGHETSHJÄLPARE
-- SECURITY DEFINER så att policies inte rekurserar genom varandras RLS
-- =============================================

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members WHERE team_id = p_team_id AND profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id AND profile_id = auth.uid() AND role = 'admin'
  );
$$;

-- Vårdnadshavare som fortfarande är med i barnets lag
CREATE OR REPLACE FUNCTION public.is_guardian(p_child_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM child_guardians g
    JOIN children c ON c.id = g.child_id
    JOIN team_members m ON m.team_id = c.team_id AND m.profile_id = g.profile_id
    WHERE g.child_id = p_child_id AND g.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.child_team_id(p_child_id UUID)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT team_id FROM children WHERE id = p_child_id;
$$;

CREATE OR REPLACE FUNCTION public.campaign_team_id(p_campaign_id UUID)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT team_id FROM campaigns WHERE id = p_campaign_id;
$$;

-- Admin ser namn och e-post på lagets medlemmar
CREATE OR REPLACE FUNCTION public.can_see_profile(p_profile_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT p_profile_id = auth.uid() OR EXISTS (
    SELECT 1
    FROM team_members a
    JOIN team_members m ON m.team_id = a.team_id
    WHERE a.profile_id = auth.uid() AND a.role = 'admin' AND m.profile_id = p_profile_id
  );
$$;

-- =============================================
-- RLS
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiler
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.can_see_profile(id));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Lag – skapas via create_team()
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated
  USING (public.is_team_member(id));
CREATE POLICY "teams_update" ON public.teams FOR UPDATE TO authenticated
  USING (public.is_team_admin(id)) WITH CHECK (public.is_team_admin(id));
CREATE POLICY "teams_delete" ON public.teams FOR DELETE TO authenticated
  USING (public.is_team_admin(id));

-- Medlemmar
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_team_admin(team_id));
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.is_team_admin(team_id));
CREATE POLICY "team_members_update" ON public.team_members FOR UPDATE TO authenticated
  USING (public.is_team_admin(team_id)) WITH CHECK (public.is_team_admin(team_id));
CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE TO authenticated
  USING (public.is_team_admin(team_id));

-- Inbjudningar
CREATE POLICY "team_invites_all_admin" ON public.team_invites FOR ALL TO authenticated
  USING (public.is_team_admin(team_id)) WITH CHECK (public.is_team_admin(team_id));

-- Barn – föräldrar ser bara sina egna
CREATE POLICY "children_select" ON public.children FOR SELECT TO authenticated
  USING (public.is_team_admin(team_id) OR public.is_guardian(id));
CREATE POLICY "children_insert" ON public.children FOR INSERT TO authenticated
  WITH CHECK (public.is_team_admin(team_id));
CREATE POLICY "children_update" ON public.children FOR UPDATE TO authenticated
  USING (public.is_team_admin(team_id)) WITH CHECK (public.is_team_admin(team_id));
CREATE POLICY "children_delete" ON public.children FOR DELETE TO authenticated
  USING (public.is_team_admin(team_id));

-- Kopplingar barn ↔ förälder
CREATE POLICY "child_guardians_select" ON public.child_guardians FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_team_admin(public.child_team_id(child_id)));
CREATE POLICY "child_guardians_insert" ON public.child_guardians FOR INSERT TO authenticated
  WITH CHECK (public.is_team_admin(public.child_team_id(child_id)));
CREATE POLICY "child_guardians_delete" ON public.child_guardians FOR DELETE TO authenticated
  USING (public.is_team_admin(public.child_team_id(child_id)));

-- Kategorier, insatser och transaktioner – alla i laget läser, admin skriver
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));
CREATE POLICY "categories_write" ON public.categories FOR ALL TO authenticated
  USING (public.is_team_admin(team_id)) WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "campaigns_select" ON public.campaigns FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));
CREATE POLICY "campaigns_write" ON public.campaigns FOR ALL TO authenticated
  USING (public.is_team_admin(team_id)) WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "campaign_products_select" ON public.campaign_products FOR SELECT TO authenticated
  USING (public.is_team_member(public.campaign_team_id(campaign_id)));
CREATE POLICY "campaign_products_write" ON public.campaign_products FOR ALL TO authenticated
  USING (public.is_team_admin(public.campaign_team_id(campaign_id)))
  WITH CHECK (public.is_team_admin(public.campaign_team_id(campaign_id)));

CREATE POLICY "transactions_select" ON public.transactions FOR SELECT TO authenticated
  USING (public.is_team_member(team_id));
CREATE POLICY "transactions_write" ON public.transactions FOR ALL TO authenticated
  USING (public.is_team_admin(team_id)) WITH CHECK (public.is_team_admin(team_id));

-- Försäljning per barn – föräldrar ser bara sina egna barns rader
CREATE POLICY "campaign_sales_select" ON public.campaign_sales FOR SELECT TO authenticated
  USING (
    public.is_team_admin(public.campaign_team_id(campaign_id))
    OR public.is_guardian(child_id)
  );
CREATE POLICY "campaign_sales_write" ON public.campaign_sales FOR ALL TO authenticated
  USING (public.is_team_admin(public.campaign_team_id(campaign_id)))
  WITH CHECK (
    public.is_team_admin(public.campaign_team_id(campaign_id))
    AND public.child_team_id(child_id) = public.campaign_team_id(campaign_id)
  );

-- =============================================
-- NY ANVÄNDARE – profil + inlösta inbjudningar
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);

  FOR inv IN
    SELECT * FROM team_invites WHERE lower(email) = lower(NEW.email)
  LOOP
    INSERT INTO team_members (team_id, profile_id, role)
    VALUES (inv.team_id, NEW.id, inv.role)
    ON CONFLICT DO NOTHING;

    INSERT INTO child_guardians (child_id, profile_id)
    SELECT c.id, NEW.id FROM children c
    WHERE c.id = ANY (inv.child_ids) AND c.team_id = inv.team_id
    ON CONFLICT DO NOTHING;

    DELETE FROM team_invites WHERE id = inv.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RPC
-- =============================================

-- Skapar ett lag med inloggad användare som admin och förifyllda kategorier
CREATE OR REPLACE FUNCTION public.create_team(p_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO teams (name) VALUES (trim(p_name)) RETURNING id INTO new_id;
  INSERT INTO team_members (team_id, profile_id, role) VALUES (new_id, auth.uid(), 'admin');

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

-- Lägger till en befintlig användare direkt, annars sparas en inbjudan.
-- Returnerar 'added' eller 'invited'.
CREATE OR REPLACE FUNCTION public.invite_member(
  p_team_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_child_ids UUID[]
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target UUID;
  clean_email TEXT := lower(trim(p_email));
BEGIN
  IF NOT is_team_admin(p_team_id) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF p_role NOT IN ('admin', 'parent') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  SELECT id INTO target FROM profiles WHERE lower(email) = clean_email;

  IF target IS NOT NULL THEN
    INSERT INTO team_members (team_id, profile_id, role)
    VALUES (p_team_id, target, p_role)
    ON CONFLICT (team_id, profile_id) DO UPDATE SET role = EXCLUDED.role;

    INSERT INTO child_guardians (child_id, profile_id)
    SELECT c.id, target FROM children c
    WHERE c.id = ANY (p_child_ids) AND c.team_id = p_team_id
    ON CONFLICT DO NOTHING;

    RETURN 'added';
  END IF;

  INSERT INTO team_invites (team_id, email, role, child_ids)
  VALUES (p_team_id, clean_email, p_role, COALESCE(p_child_ids, '{}'))
  ON CONFLICT (team_id, lower(email))
    DO UPDATE SET role = EXCLUDED.role, child_ids = EXCLUDED.child_ids;

  RETURN 'invited';
END;
$$;

-- Lagets totala försäljning per insats och produkt, utan uppdelning per barn
CREATE OR REPLACE FUNCTION public.campaign_summary(p_team_id UUID)
RETURNS TABLE (
  campaign_id UUID,
  product_id UUID,
  quantity BIGINT,
  revenue_ore BIGINT,
  profit_ore BIGINT,
  sellers BIGINT
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT
    p.campaign_id,
    p.id,
    COALESCE(SUM(s.quantity), 0)::BIGINT,
    COALESCE(SUM(s.quantity * p.price_ore), 0)::BIGINT,
    COALESCE(SUM(s.quantity * (p.price_ore - p.cost_ore)), 0)::BIGINT,
    COUNT(DISTINCT s.child_id) FILTER (WHERE s.quantity > 0)
  FROM campaign_products p
  JOIN campaigns c ON c.id = p.campaign_id
  LEFT JOIN campaign_sales s ON s.product_id = p.id
  WHERE c.team_id = p_team_id AND is_team_member(p_team_id)
  GROUP BY p.campaign_id, p.id;
$$;

-- Nyare Supabase-projekt exponerar inte alltid nya tabeller automatiskt – RLS styr ändå vad som syns
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

COMMIT;
