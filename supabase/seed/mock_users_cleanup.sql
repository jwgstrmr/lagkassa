-- Tar bort de mockade användarna, testbarnen och allt bokfört på dem

BEGIN;

CREATE TEMP TABLE mock_children ON COMMIT DROP AS
SELECT c.id FROM public.children c
JOIN public.child_guardians g ON g.child_id = c.id
JOIN auth.users u ON u.id = g.profile_id
WHERE u.email = 'foralder@lagkassa.test' AND c.name IN ('Testbarn', 'Testbarn 2');

-- Även sådant som lagts till på testbarnen i appen
DELETE FROM public.transactions
WHERE child_id IN (SELECT id FROM mock_children) OR description LIKE '% (mock)';

-- Lagkopplingar, föräldrakopplingar och deltagande i händelser följer med
DELETE FROM public.children WHERE id IN (SELECT id FROM mock_children);

-- Profiler och lagmedlemskap följer med
DELETE FROM auth.users WHERE email IN ('foralder@lagkassa.test', 'ekonomi@lagkassa.test', 'vantar@lagkassa.test');

COMMIT;
