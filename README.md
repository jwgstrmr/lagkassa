# Lagkassan

Visar lagets kassa för föräldrarna. Ekonomiansvarig (admin) registrerar intäkter, utgifter och händelser. Föräldrar kan bara läsa. De ser saldot, vad pengarna går till och sina egna barns försäljning.

Stacken är densamma som i training-planner: React 19, Vite, Tailwind v4, React Query och Supabase.

## Kom igång

1. Skapa ett nytt Supabase-projekt.
2. Kör migrationerna i `supabase/migrations/` i ordning i projektets SQL-editor.
3. Registrera ditt konto i appen och gör dig till huvudadmin i SQL-editorn:
   ```sql
   UPDATE public.profiles SET is_super_admin = TRUE WHERE email = 'du@exempel.se';
   ```
   Därefter skapas lag, barn och användare i appen under Huvudadmin.
4. Under Authentication → Sign In / Providers: stäng av *Confirm email* om föräldrar ska komma in direkt efter registrering.
   Under Authentication → URL Configuration: sätt *Site URL* till appens adress och lägg till `<adress>/nytt-losenord` under *Redirect URLs* – dit leder länken i mejlet för glömt lösenord.
5. Kopiera `.env.example` till `.env.local` och fyll i URL och anon-nyckel.
6. Kör `npm install` och sedan `npm run dev`.

## Roller

- **Huvudadmin**: ser och administrerar alla lag. Skapar lag, har barnregistret (ett barn kan vara med i flera lag) och tilldelar användare som ekonomiansvariga och föräldrar.
- **Ekonomiansvarig**: sköter ett eller flera lag – spelare, föräldrar, ingående saldo, intäkter, utgifter och händelser.
- **Förälder**: kopplas till sina barn och ser automatiskt alla lag barnen är med i – saldo, diagram, transaktioner och händelsernas totaler, men bara sina egna barns försäljning.

Inbjudningar görs med e-postadress. Finns inget konto ännu sparas inbjudan och löses in när personen registrerar sig med samma adress. Det skickas inget mejl, så dela länken till `/registrera` (kopieringsknappen bredvid Bjud in).

## Pengar

Det här är ingen bokföring, bara öppenhet med vad som kommer in och går ut. Belopp lagras i öre. Saldot är det ingående saldot plus alla intäkter och utgifter.

I kassans statistik räknas en händelses kostnader (t.ex. inköpet av kakorna) av mot händelsens intäkter – händelsen blir en intäkt med sitt netto, eller en utgift om den gått back. Utgifter är annars bara fristående utgifter.

En händelse (kakförsäljning, bingolotter …) samlar sina intäkter och kostnader (t.ex. inköpet). Intäkter och utgifter kan få ett namn, t.ex. domare eller sponsring. I en händelse är namnet valfritt, t.ex. inköpet av kakorna. Det finns inga kategorier – händelserna är det som grupperar pengarna. Intäkter och utgifter kan kopplas till ett eller flera barn, eller till inget barn alls. Barnets intäkter är vad som betalats in för barnet. Vad barnet tjänat till kassan är barnets del av händelsens netto, fördelat efter vad barnet betalat in – går händelsen back räknas det som 0.

En händelse är en **försäljning** (barnen betalar in det de sålt för, eventuellt med ett minimum per barn), en **avgift** (fast belopp per barn, t.ex. cup) eller **övrigt** (ingen uppföljning per barn). Vid försäljning och avgift väljs vilka barn som ska betala in, och händelsens intäkter kopplade till barnet räknas som inbetalt. Ekonomiansvarig ser vem som har betalat och vad som saknas, och föräldrar ser om deras egna barns inbetalningar är registrerade.
