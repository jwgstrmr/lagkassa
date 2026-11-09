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

- **Huvudadmin**: ser och administrerar alla lag. Det är bara huvudadmin som skapar lag och sätter deras namn och ingående saldo, lägger till spelare i spelarregistret (en spelare kan vara med i flera lag) och kopplar användare som föräldrar och ekonomiansvariga. Det görs under Huvudadmin, en nivå ovanför lagen – inte per lag.
- **Ekonomiansvarig**: sköter pengarna i ett eller flera lag – intäkter, utgifter och händelser. Följer upp under Admin: Översikt visar saknade inbetalningar och hur de pågående händelserna går, och Spelare lagets spelare, deras föräldrar och inbetalningar. Ändrar inte spelare, föräldrar eller laget.
- **Förälder**: kopplas till sina barn och ser automatiskt alla lag barnen är med i – saldo, diagram, transaktioner och händelsernas totaler, men bara sina egna barns försäljning.

Alla registrerar sig själva på `/registrera` – det finns inga inbjudningar och det skickas inga mejl.

Vid registreringen skriver man vad barnet heter. Ett konto som inte är kopplat till något barn eller lag kommer inte in i appen. Det hamnar under Huvudadmin → Användare → Väntar på koppling. Där väljer huvudadmin vilka barn i registret kontot ska kopplas till. Det är alltid registrets barn som kopplas – det användaren skrev är bara en hjälp och visas tillsammans med förslag på barn med liknande namn tills kontot är kopplat till ett barn. Därefter kommer användaren in, utan att behöva ladda om.

Felregistreringar och dubbletter tar huvudadmin bort med soptunnan i användarens vy. Kontot försvinner ur inloggningen tillsammans med kopplingarna till barn och lag, men bokförda poster står kvar. Man kan inte ta bort sig själv, och en huvudadmin måste först förlora rollen. Personen kan registrera sig igen med samma adress.

Spelare och Användare har samma lagfilter. En spelare kan vara med i flera lag, och en användare kan vara förälder till barn i flera lag och ekonomiansvarig i flera lag – allt väljs i samma vy, med det filtrerade lagets barn först.

## Pengar

Det här är ingen bokföring, bara öppenhet med vad som kommer in och går ut. Belopp lagras i öre. Saldot är det ingående saldot plus alla intäkter och utgifter.

Det ingående saldot sätts en gång per lag: det som fanns i kassan den dag laget började använda appen. Allt därefter bokförs i appen, så saldot räknas vidare mellan åren utan att något sätts om. På Hem visas det skilt från intäkterna, så att det syns vad laget faktiskt har tjänat.

I kassans statistik räknas en händelses kostnader (t.ex. inköpet av kakorna) av mot händelsens intäkter – händelsen blir en intäkt med sitt netto, eller en utgift om den gått back. Utgifter är annars bara fristående utgifter.

En händelse (kakförsäljning, bingolotter …) samlar sina intäkter och kostnader (t.ex. inköpet). Intäkter och utgifter kan få ett namn, t.ex. domare eller sponsring. I en händelse är namnet valfritt, t.ex. inköpet av kakorna. Det finns inga kategorier – händelserna är det som grupperar pengarna. Intäkter och utgifter kan kopplas till ett eller flera barn, eller till inget barn alls. Barnets intäkter är vad som betalats in för barnet. En kostnad kopplad till ett barn i en händelse är en återbetalning (t.ex. en inställd cup) och räknas av från det barnet betalat in. Vad barnet tjänat till kassan är barnets del av händelsens netto, fördelat efter vad barnet betalat in – går händelsen back räknas det som 0.

En händelse är en **försäljning** (barnen betalar in det de sålt för, eventuellt med ett minimum per barn), en **avgift** (fast belopp per barn, t.ex. cup), ett **jobb** (barnen jobbar och laget får en ersättning, eventuellt ett belopp per barn) eller **övrigt** (ingen uppföljning per barn). Vid försäljning och avgift väljs vilka barn som ska betala in, och händelsens intäkter kopplade till barnet räknas som inbetalt. Ekonomiansvarig ser vem som har betalat och vad som saknas i händelsen, och föräldrar ser om deras egna barns inbetalningar är registrerade.

Hem och Händelser ser likadana ut för ekonomiansvarig som för föräldrarna. Uppföljningen ligger under Admin → Översikt. Avslutade visar försäljningar och avgifter som är slut men där barn inte betalat klart, med det som slutade först överst – under en pågående händelse är det väntat att alla inte betalat än. Pågående visar hur många som är klara och vad som är kvar, med det som slutar först överst. Andra lag man är ekonomiansvarig för visas som en rad per lag med avslutade händelser där inbetalningar saknas, och ett tryck byter till laget. Siffran på Admin i menyn är antalet sådana händelser i alla ens lag.

Föräldrar ser vad pengarna i en händelse kom från och gick till: kostnader och intäkter som inte gäller något barn visas var för sig, barnens inbetalningar och återbetalningar bara som summor.

Under Att betala på Hem ser föräldrar allt som återstår för de egna barnen, även i avslutade händelser, med tidigast sista dag först. Har laget ett Swish-nummer (Huvudadmin → Lag) öppnar knappen Swisha appen med numret, beloppet och barnets namn och händelsen ifyllda. Länken följer formatet i Swish dokumentation för QR-koder (`https://app.swish.nu/1/p/sw/?sw=…&amt=…&msg=…`), med mobilnummer skrivna som 4670…. Det äldre `swish://payment?data=…` ger "Felaktig länk" i iPhone.

Vid jobb väljs vilka barn som jobbar. Ersättningen bokförs som intäkter kopplade till barnen när den kommer. Den räknas till vad barnet tjänat till kassan men inte som inbetalt av familjen, och jobb hamnar aldrig bland saknade inbetalningar – föräldrarna har inget att betala.
