-- =============================================
-- Migration 018 – bara huvudadmin ändrar lagen
--
-- Lagets namn och ingående saldo sätts under Huvudadmin → Lag, där lagen också skapas.
-- Det ingående saldot sätts en gång – det som fanns i kassan när laget började använda
-- appen. Ekonomiansvariga sköter pengarna därefter: intäkter, utgifter och händelser.
-- =============================================

BEGIN;

DROP POLICY "teams_update" ON public.teams;
CREATE POLICY "teams_update" ON public.teams FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

COMMIT;
