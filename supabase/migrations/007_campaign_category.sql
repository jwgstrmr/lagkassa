-- =============================================
-- Migration 007 – kategorin sitter på insatsen
--
-- Kategorier har ingen typ längre – en kategori (Cuper, Försäljning …) samlar både
-- intäkter och utgifter. En insats har en kategori och dess intäkter och utgifter
-- ärver den. Transaktioner utan insats väljer fortfarande kategori själva.
-- =============================================

BEGIN;

ALTER TABLE public.campaigns
  ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Befintliga insatser får den kategori flest av deras transaktioner har
UPDATE public.campaigns c SET category_id = (
  SELECT t.category_id FROM public.transactions t
  WHERE t.campaign_id = c.id AND t.category_id IS NOT NULL
  GROUP BY t.category_id
  ORDER BY COUNT(*) DESC
  LIMIT 1
);

UPDATE public.transactions t SET category_id = c.category_id
FROM public.campaigns c
WHERE t.campaign_id = c.id;

-- En lista i stället för två – intäktskategorierna först, som förut
UPDATE public.categories c SET sort_order = o.pos
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY kind DESC, sort_order, name) - 1 AS pos
  FROM public.categories
) o
WHERE c.id = o.id;

ALTER TABLE public.categories DROP COLUMN kind;

-- =============================================
-- ARV FRÅN INSATSEN
-- =============================================

CREATE OR REPLACE FUNCTION public.set_transaction_category()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL THEN
    NEW.category_id = (SELECT category_id FROM campaigns WHERE id = NEW.campaign_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_set_category BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_transaction_category();

CREATE OR REPLACE FUNCTION public.sync_campaign_category()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE transactions SET category_id = NEW.category_id WHERE campaign_id = NEW.id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER campaigns_sync_category AFTER UPDATE OF category_id ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.sync_campaign_category();

-- =============================================
-- NYA LAG – kategorier utan typ
-- =============================================

CREATE OR REPLACE FUNCTION public.new_team(p_name TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO teams (name) VALUES (trim(p_name)) RETURNING id INTO new_id;
  INSERT INTO categories (team_id, name, color, sort_order) VALUES
    (new_id, 'Försäljning',   '#3987e5', 0),
    (new_id, 'Medlemsavgift', '#199e70', 1),
    (new_id, 'Sponsring',     '#9085e9', 2),
    (new_id, 'Cuper',         '#d95926', 3),
    (new_id, 'Domare',        '#c98500', 4),
    (new_id, 'Material',      '#d55181', 5),
    (new_id, 'Resor',         '#008300', 6),
    (new_id, 'Avslutning',    '#e66767', 7);
  RETURN new_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.new_team(TEXT) FROM PUBLIC, anon, authenticated;

COMMIT;
