# Checkpoints

Every stopping point of development is a usable app. Each checkpoint below
says how to run it and what to check by hand; `npm run e2e:web` walks the same
checks automatically in a browser.

## Running everything

You need: Docker, Node 22, pnpm (backend) and npm (app). For a phone, the
**Expo Go** app from the App Store or Google Play, on the same Wi-Fi as your
computer. The app is on Expo SDK 57, so Expo Go must support SDK 57 — the
store version does (MCON-015).

**1. The backend**, in `garner-app`:

```bash
docker compose up -d --wait        # Postgres, Redis, S3 mock, Mailpit
pnpm install                       # first time only
pnpm run prisma:migrate:deploy     # first time, and after pulling migrations
pnpm run seed                      # demo data; safe to re-run
pnpm run start:dev                 # http://localhost:3000
```

For the web version of the app, the backend's `.env` must allow the Expo web
origin: `CORS_ORIGINS=http://localhost:8081` (in `.env.example`). A phone
needs nothing extra.

**2. The app**, in `garner-mobile`:

```bash
npm install                        # first time, and after pulling
npm start                          # then scan the QR code with Expo Go
npm run web                        # or open it in the browser instead
```

On a phone, the app finds the backend on the computer running `npm start`. If
it cannot ("No pudimos conectarnos"), check that the phone and the computer
are on the same network and that port 3000 is not blocked by a firewall, or
set the address explicitly: `EXPO_PUBLIC_API_URL=http://<your-ip>:3000 npm start`.

**Accounts** (from the seed, password `correct-horse-battery`):
`shopper@garner.test` (Fede, a shopper) and `admin@garner.test`.

**The demo world** has six products sold in two neighbourhoods:

- **Buenos Aires**, around the Obelisco, in pesos: Coto Centro, Carrefour
  Almagro, Día Caballito. The shopper's saved location, "Centro", is here.
- **Vienna**, around Stephansplatz, in euros: Billa Rotenturmstraße, Spar
  Mariahilfer Straße, Hofer Landstraße, with Austrian opening hours read on
  Vienna's clock.

"Near you" means within 5 km. With your phone in central Vienna you see the
Vienna stores; anywhere else, switch to Centro (checkpoint 2, step 2).

Running the backend's e2e tests (`pnpm run test:e2e`) wipes the development
databases; run `pnpm run seed` again afterwards.

**Automated walk-through** (backend and `npm run web` running, Chrome
installed): `npm run e2e:web`.

---

## Checkpoint 1 — Sign in, sign up, the five sections

_Phase 1 · 2026-10-19 · backend `6f55f14`, app: this commit._

What a person can do: create an account, sign in and out, stay signed in
across launches, and move between the five sections, which say what arrives
in which phase.

**Check by hand**

1. Open the app. You land on **Ingresar** with "Pagá menos por la misma
   compra." — never on a half-loaded screen.
2. Sign in as `shopper@garner.test` with a wrong password. The message
   **"Email o contraseña incorrectos."** appears; you stay on the screen.
3. Sign in with `correct-horse-battery`. You land on **Inicio** with
   **"Hola, Fede"**.
4. Tap each tab — **Buscar, Listas, Compra, Avisos** — each shows its title
   and which phase fills it. Tap **Inicio** again: still signed in.
5. **Phone only:** close the app completely and reopen it. You go straight to
   Inicio, signed in — the session is restored from the keychain. (On the web
   a reload signs you out by design: MCON-003.)
6. Tap **Cerrar sesión**: back on Ingresar. Reopen the app: still signed out.
7. Tap **Crear cuenta**, and try `shopper@garner.test` again: **"Ya
   existe una cuenta con ese email."** Try a 5-character password: a message
   asks for at least 10. Then use a new email and a password of 10 or more
   characters: you land on Inicio greeted by the new name.
8. With the backend stopped, try to sign in: **"No pudimos conectarnos.
   Revisá tu conexión."**

**Known limits**

- Inicio's savings card and the other sections are placeholders until their
  phases.
- The app icon and splash are Expo's defaults; artwork comes later.
- On iOS 26 the tab bar is the system's Liquid Glass bar and ignores the
  background colour; that is the platform, not a bug.

---

## Checkpoint 2 — What dropped nearby, search, a product's prices

_Phase 2 · 2026-10-19 · backend `86e5d5f`, app `ae0c923`._

What a person can do: see which products got cheaper this week near them,
search the catalog by name or category, and open a product to see where it
is cheapest nearby, how sure we are of each price, and how it moved over the
last 30 days.

Pull both repos, then in `garner-app` run `pnpm run prisma:migrate:deploy`
(there is a new migration) and `pnpm run seed`; in `garner-mobile`,
`npm install`.

**Check by hand**

1. Sign in as `shopper@garner.test`. The app asks to use your location —
   allow it. Inicio shows a chip at the top right, **Tu ubicación**, and the
   section **Bajaron cerca tuyo** with three products:
   **Leche Entera La Serenísima 1L** at Día Caballito **−12%**, **Agua Mineral
   2L** at Coto Centro **−7%**, **Aceite de Girasol 900ml** at Carrefour
   Almagro **−6%**, each with its price and how far the store is.
2. **Not in central Buenos Aires?** The section says _"Esta semana no bajó
   nada cerca tuyo."_ Tap the chip: it switches to **Centro**, the saved
   place, and the three drops appear. Tap it again to go back. (Deny the
   location permission instead and the app starts on Centro by itself, with a
   chip that only shows it.)
3. Tap the milk. Its screen shows **La Serenísima · 1 L · Leche**, a
   **Últimos 30 días** chart with its average, and **Cerca tuyo, más barato
   primero**: Día Caballito **$ 1.320** _el más barato_, Carrefour Almagro
   **$ 1.390** _+ $ 70_, Coto Centro **$ 1.490** _+ $ 170_, each with its
   distance and **Visto en las últimas 24 h** in green. Tap the back arrow:
   back on Inicio.
4. Tap **Buscar productos** on Inicio: the Buscar tab opens with **6
   productos** and the chips **Todo, Almacén, Bebidas, Lácteos**.
5. Type `arroz`: after a moment, **1 producto**, Arroz Largo Fino 1kg. Type
   `caviar`: _"No encontramos productos para “caviar”."_
6. Clear the search and tap **Lácteos**: the milk, though it sits in the
   subcategory Leche. Tap **Bebidas**: Agua Mineral 2L. Tap it: its prices,
   with Día Caballito cheapest. Back, then **Todo**.
7. Sign out and in again as a new account (Crear cuenta): with the location
   allowed, Inicio shows the drops near you; denied, it says to allow it,
   since a new account has no saved place.
8. **In Vienna** (phone location within 5 km of Stephansplatz), with the
   chip on **Tu ubicación**: Inicio shows **Agua Mineral 2L** at Spar
   **€ 0,69 −12%**, the milk at Hofer **€ 1,15 −10%**, and the rice at Billa
   **−8%**. The milk's screen lists Hofer **€ 1,15** _el más barato_, Spar
   **€ 1,29** _+ € 0,14_, Billa **€ 1,39** _+ € 0,24_, and its chart is in
   euros. After 20:00 on a weekday, 18:00 on Saturday or on Sunday, each
   store also says _cerrado ahora_. Tap the chip to flip to Centro and back:
   prices switch between pesos and euros, never mixed.

**Known limits**

- Barcode scanning and "add to list" arrive in checkpoint 3; the savings
  card on Inicio in phase 3, with lists.
- Search results show brand and package, not the "desde" price of the
  mockup (MCON-008).
- The chart ends yesterday: today's drop shows in the prices, not yet in the
  chart, whose trend can still read "subió" (MCON-009).
- In Expo Go the location prompt is Expo Go's own; the app's Spanish text
  ("Garner usa tu ubicación…") shows in a development build.
- On the web, the browser asks for location instead; `npm run e2e:web` places
  it at the Obelisco.

---

## Checkpoint 3 — Scan a barcode, add to a list

_Phase 2 · 2026-10-20 · backend `4d857fb`, app `d5d67c3`._

What a person can do: point the camera at a product's barcode and land on its
prices, or type the code; and add a product to a list from its screen.

Pull both repos, run `pnpm run seed` in `garner-app` (every product now has
a barcode) and `npm install` in `garner-mobile` (the camera is new).

**Something to scan:** open `garner-mobile/docs/barcodes.svg` on your
computer — seven barcodes: the six products, and one that is not in the
catalog. Real products in a Vienna or Buenos Aires supermarket are not in
the demo catalog, so they all give the "no lo tenemos" answer.

**Check by hand**

1. Sign in as `shopper@garner.test`. On Inicio, the green barcode button
   next to the search field opens **Escaneá el código**. The app asks for the
   camera — allow it.
2. Point the phone at **Arroz Largo Fino 1kg** on the barcode sheet. Without
   tapping anything, the scanner closes and the rice opens in the Buscar tab,
   with its prices near you. Its back arrow returns to the search.
3. Open the scanner again (also from the button beside Buscar's search
   field) and point it at **Fuera del catálogo**: _"Todavía no tenemos este
   producto en el catálogo."_ with its code. Tap **Escanear otro**.
4. Type `7791234000028` in the field under the camera and tap **Buscar**:
   _"Ese código no parece un código de barras válido."_ (the last digit is
   wrong). Type `7790070410122`: the milk opens.
5. On the milk, tap **A la lista**. The sheet lists **Compra semanal — 4
   productos · ya tiene 2**. Tap it: _"Ahora hay 3 en Compra semanal."_, and
   the row says _ya tiene 3_. Tap **Listo**.
6. Open **Pan Lactal 500g** from Buscar, **A la lista**, tap Compra
   semanal: _"Ahora hay 2…"_ — it was already on the list once.
7. Create a new account, open any product and tap **A la lista**: _"Todavía
   no tenés listas."_ Tap **Crear “Mi lista” y agregar**: _"Agregado a Mi
   lista."_ In Vienna, that list is in euros; near the Obelisco, in pesos.
8. Deny the camera (or use the web build): the scanner says it needs the
   camera, with a button to allow it (or to open Settings once denied for
   good), and the typed code still works.

**Known limits**

- The Listas tab, where you see and edit a list, is phase 3; until then the
  item counts in the "A la lista" sheet show what changed.
- A scanned product opens in Buscar, whichever tab you scanned from
  (MCON-014).
- After **Escanear otro**, a code still in front of the camera is read
  again straight away.
- Reporting the price on the shelf after a scan (the mockup's form) is
  phase 5.
- In Expo Go the camera prompt is Expo Go's own; the app's Spanish text
  shows in a development build.

---

## Checkpoint 4 — Your lists

_Phase 3 · 2026-10-20 · backend `4d857fb`, app `d248a9a`._

What a person can do: see their lists, create one in the right currency,
rename, copy or delete it, add products to it from the list itself, change
quantities, and see what the list should cost.

Nothing new to install; pull both repos and run `pnpm run seed` in
`garner-app` for a clean "Compra semanal".

**Check by hand**

1. Sign in as `shopper@garner.test`. Tap **Listas**: **Tus listas** shows
   **Compra semanal — 4 productos · $ … estimado · editada hoy**.
2. Tap it. Each item shows − quantity +, its name and its price for that
   quantity; Agua Mineral 2L says _sin precio_ (the seed gave it none). At
   the bottom, **Total estimado**, and a note that 1 product has no price.
3. In **Agregar producto**, type `galle`: Galletitas Surtidas Arcor 400g
   appears below. Tap it: _"Agregado: Galletitas Surtidas Arcor 400g."_, the
   list has 5 products, and the cookies cost the cheapest price near you in
   the list's currency: $ 1.490 near the Obelisco. In Vienna they show _sin
   precio_ — this list is in pesos and the stores there price in euros;
   step 7 makes a euro list.
4. Tap **+** on the cookies: the line doubles. Tap **−** twice: the second
   time (the trash icon) removes them.
5. Tap **···** (Más opciones) → **Cambiar el nombre**, rename it, **Guardar**.
   Then **···** → **Duplicar la lista**: "… (copia)" opens. **···** →
   **Eliminar la lista** → it asks first → **Sí, eliminar**: back on the
   original.
6. Tap an item's name: its product screen opens inside Listas; back returns
   to the list.
7. Back on **Tus listas**, tap **Nueva**. With your phone in Vienna, **Euros
   (EUR)** is already selected ("La de los súper cerca tuyo"); near the
   Obelisco, Pesos. Name it and **Crear lista**: the empty list opens. Add
   milk: € 1,15 in Vienna.
8. Deny location (or be far from any store): **Nueva** selects no currency
   and **Crear lista** stays disabled until you pick one — a list's currency
   cannot be changed later.

**Known limits**

- Prices on a list are the cheapest nearby when each item was added, and do
  not update (MCON-016). "¿Dónde conviene comprar?" — the real plan — is
  checkpoint 5.
- No drag to reorder, and quantities go one by one (MCON-017).
- Inicio's savings card is still a placeholder until checkpoint 5.

---

## Checkpoint 5 — Where to buy

_Phase 3 · 2026-10-20 · backend `27a44c3`, app `33a6eb1`._

What a person can do: ask where to buy a list and see three ways to do it —
one store, a balance, or the cheapest within their limits — with what each
saves, the extra distance and time, and the stops on a map; change those
limits; and see the savings on Inicio.

Pull both repos, run `pnpm run seed` in `garner-app` (it adds "Compra en
Viena", a euro list), and `npm install` in `garner-mobile` (the map is new).

**Check by hand**

1. Sign in as `shopper@garner.test`. On Inicio, the green card says
   **COMPRA SEMANAL · 4 PRODUCTOS** and offers **Calcular el plan** (or, if
   a plan exists, its savings and **Ver el plan**).
2. **Near the Obelisco** (or with the chip on Centro): Listas → Compra
   semanal → **¿Dónde conviene comprar?** "Comparando precios…" for a
   moment, then the map with you (blue) and the numbered stops, and the
   tabs **Más simple · Equilibrado · Más barato** on Equilibrado.
3. Each tab shows **Ahorrás**, **Recorrido** and **Tiempo aprox.**, the stops
   with what you spend at each, and the **Total**. **Más barato** is
   Carrefour Almagro, and the note says there is a cheaper plan "pero te
   hace caminar o manejar más de lo que elegiste" — that one is Día, past
   your 5 km. Tap a stop: its address and what to buy there, with prices.
4. **Preferencias** → raise **Recorrido extra** to 10 km → **Guardar y
   calcular**: now Más barato goes to Día Caballito ($ 8.140, +7,6 km,
   +18 min), and the "cheaper plan" note is gone. Put it back to 5 km after.
5. Back on Inicio: the card shows **$ … de ahorro**, "Calculado hoy", and
   where you split the shop; **Ver el plan** opens it.
6. **In Vienna** (chip on Tu ubicación): Listas → **Compra en Viena** →
   ¿Dónde conviene comprar?: the Vienna stores on the map, in euros;
   **Más barato** is Hofer Landstraße.
7. Open **Compra semanal** from Vienna, or **Compra en Viena** near the
   Obelisco: _"Ningún súper cerca tuyo tiene precios en pesos/euros para
   esta lista."_ — a list is only priced in its own currency.

**Known limits**

- "Empezar la compra" (shopping mode) is phase 4.
- The least an extra stop must save is not editable (MCON-021).
- On the web the map is a schematic without streets (MCON-020).
- Inicio shows the last plan; it does not recalculate on its own
  (MCON-019).

---

## Checkpoint 6 — Shopping

_Phase 4 · 2026-10-20 · backend `0076b98`, app `3e080eb`._

What a person can do: start a trip from a list, or from a plan so each
product is waiting at the store the plan chose; go one stop at a time, tick
products off with the price on the shelf; pause and continue; finish and see
what they spent; or abandon the trip.

Pull both repos; nothing new to install. Run `pnpm run seed` in
`garner-app` for clean demo lists.

**Check by hand**

1. Sign in as `shopper@garner.test` and tap **Compra**: your lists with
   products, each with **Empezar**. Tap it on **Compra semanal**.
2. The trip shows **0 / 4**, a bar, and a highlighted card for the first
   product: **Leche Entera La Serenísima 1L × 2 · Esperado $ 1.400 c/u**, with
   the price field filled with 1.400. Type `1.350` and tap **Listo**: **1 /
   4**, the row says "Pagado $ 1.350 c/u" and **$ 2.700**, and the card moves
   to the next product.
3. Tap the circle of another product to tick it without a price; tap it
   again to untick it. Tap a product's name to make it the highlighted one.
4. **···** → **Pausar**: "Compra en pausa" with **Seguir**. Close the app
   and reopen it: Compra is still on the same trip.
5. **Terminar la compra** (at the end of the stop): it says how many you
   bought, and that your list does not change. **Terminar**: **Compra
   terminada**, what you spent, how far from what you expected, and that no
   price is shared — this trip had no stores. **Listo**.
6. Listas → Compra semanal → **¿Dónde conviene comprar?** → **Preferencias**
   → raise **Tiempo extra** to 40 min → **Guardar y calcular** → **Más
   barato**: the rice at **Coto Centro**, the rest at **Carrefour Almagro**.
   **Empezar la compra**: Compra opens on **Parada 1 de 2 · Coto Centro**
   with the rice at Coto's price; **Siguiente parada** goes to Carrefour
   (0 / 3), **Anterior** back. Put Tiempo extra back to 20 min afterwards.
   In Vienna, **Compra en Viena** → Más barato → Empezar la compra: one stop,
   Hofer Landstraße, in euros.
7. Finish a plan trip after typing a price: the summary says your price
   now counts for others — it becomes a price report for that store.
   (This changes the demo's prices; `pnpm run seed` puts them back.)
8. **···** → **Abandonar** → it asks first → **Sí, abandonar**: back to the
   lists.

**Known limits**

- Without a connection, ticks and prices fail for now; checkpoint 7 makes
  the trip work offline (MCON-022).
- A trip is fixed when it starts; starting the same list again returns the
  trip in progress (MCON-023).
- A trip started from Compra has no stores, so its prices are not shared
  (MCON-024).

---

## Checkpoint 7 — Shopping without a connection

_Phase 4 · 2026-10-21 · backend `0076b98`, app `e0fd995`._

What a person can do: keep shopping when the signal drops. Ticks, prices
paid, pausing and finishing are kept on the phone and sent, in order, when
the connection returns; the screen says what is still waiting.

Pull `garner-mobile` and run `npm install` (two small packages are new: local
storage and the network state). Nothing changes in `garner-app`.

**Check by hand** (this needs the phone — it cannot be tried at a desk)

1. Sign in as `shopper@garner.test`, **Compra** → **Empezar** on **Compra
   semanal**. With a signal, tick a product: no banner, nothing waiting.
2. Turn on **airplane mode** (or walk into a lift). A dark banner appears:
   **Sin conexión · lo que marques se envía al volver**.
3. Tick **Pan Lactal**, then type a price for the highlighted product and tap
   **Listo**. Both work at once; the banner says **2 cambios esperan para
   enviarse**, and each changed line says **por enviar** in orange.
4. **Close the app completely** (swipe it away), still offline, and open it
   again: you are still signed in, on the same trip, with your two changes
   still waiting. (Before, this opened Ingresar.)
5. Turn airplane mode off. Within a few seconds the banner says **Enviando…**
   and then **Todo enviado**, and the orange **por enviar** goes away. The
   server now has them: open the trip on another device, or check it at the
   desk with `GET /v1/shopping-sessions`.
6. Back offline, **Terminar la compra** → **Terminar**: the summary appears at
   once, with **Tu compra se envía cuando vuelva la conexión**. Turn the
   signal on: the note goes away, and Compra shows the lists again.
7. While changes are still waiting, **Empezar** is off: _"Estamos enviando tu
   compra anterior"_.

**Known limits**

- **Empezar** needs a connection (MCON-026); a trip finished offline does not
  show its summary again if the app is restarted before it is sent.
- Signing out erases changes not yet sent (MCON-027).
- "Sin conexión" is the phone's word plus the last request's (MCON-028).
- Not yet tried on a real phone: only in the browser, with Chrome's offline
  mode, and with unit tests for the queue, the storage and the session.

---

## Checkpoint 8 — Report a price

_Phase 5 · 2026-10-21 · backend `ab5da96`, app `2ebc026`._

What a person can do: report the price on a shelf, with a photo of the label
if they want; see every price they have reported and where it stands; and do
both without a signal.

Pull both repos; in `garner-mobile` run `npm install` (three packages are new:
the photo picker, local files and the network state). Run `pnpm run seed` in
`garner-app`. Use a **new account** (Crear cuenta) for steps 2 to 6 so your
usual account's history stays clean — your reports are real data.

**Check by hand** (the camera needs the phone)

1. Open a product (search **Agua Mineral 2L**) and tap **Informar precio** at
   the bottom. The screen lists the stores nearest you — in central Buenos
   Aires, **Coto Centro, Carrefour Almagro, Día Caballito**, each with the last
   known price; in Vienna, **Billa, Hofer, Spar**. The nearest is selected.
2. Type a price (for the water at Coto, `960`). Tap **Sacar foto del cartel**:
   allow the camera, photograph a label (any paper will do), accept. The photo
   shows with **Pesa más**; the bin removes it. **Elegir una foto** takes one
   from the gallery instead.
3. **Enviar precio**: **¡Gracias!** — "Tu precio ya llegó" once it has.
4. **Ver mis aportes** (also on Inicio, above Cerrar sesión): the price with
   its store, the day, **Con foto**, and a status — for a new account usually
   **En revisión · No cambia los precios hasta que otros lo confirmen**.
5. **Offline:** open another product, **Informar precio**, put the phone in
   airplane mode, type a price, add a photo and **Enviar precio**: **¡Gracias!
   Tu precio se envía cuando vuelva la conexión**. **Ver mis aportes** shows it
   on top, **Por enviar · con foto**, in orange.
6. Close the app, reopen it still offline: the price is still waiting. Turn
   airplane mode off: within seconds it is sent, and it leaves the orange list
   for the ordinary one.
7. A price far from the usual (the water at `99999`) is refused: the banner
   says **No pudimos enviar 1 precio, que el servidor no aceptó**.

**Known limits**

- A price can be reported only at one of the six nearest known stores
  (MCON-030); a shop not in the catalog cannot be reported at.
- A new account's prices start in review (MCON-031).
- Not yet tried on a real phone: the camera, the photo's trip through the
  documents folder and the upload from a phone file were tested only in the
  browser, with a file picked from disk.

---

## Checkpoint 9 — Alerts and messages

_Phase 6 · 2026-10-21 · backend `9b83f41`, app: this commit._

What a person can do: ask to be told when a product gets cheaper, read what
their alerts found, and choose how and when to be reached.

Pull both repos. In `garner-app`: `pnpm run prisma:migrate:deploy` (two new
migrations) and `pnpm run seed` (it gives `shopper@garner.test` three alerts
and four messages). Nothing new to install in `garner-mobile`.

**Check by hand**

1. Sign in as `shopper@garner.test`. The **Avisos** tab has a red badge:
   **3**. Open it: **3 sin leer**, **Mis alertas (3)**, and messages in
   Spanish, newest first, under **Hoy** and **Esta semana**: **Leche Entera
   La Serenísima 1L bajó a $ 1.320**, **Agua Mineral 2L: −7%**, the milk at
   Hofer **−10% … € 1,15, antes € 1,29**, and **Aceite de Girasol 900ml más
   barato cerca**. Unread ones have a green dot.
2. Tap the water message: its product opens. Go back: **2 sin leer**, the dot
   is gone and the badge says 2.
3. **Mis alertas (3)**: each says what it watches — _Cuando baje de $ 1.400 ·
   cerca tuyo (5 km)_, _Cuando baje 5% o más · Coto Centro_, _Cuando un súper
   cerca tuyo sea el más barato (5 km)_. Flip a switch: **En pausa**; flip it
   back.
4. Search **Leche Entera**, open it, tap **Avisame si baja**. Pick **Baja de
   un precio**, type `1.300`, **Crear alerta**: _Listo: te avisamos en Avisos_.
   **Ver mis alertas** shows it first. **Borrar** → it asks → **Sí, borrar**.
   (The other two kinds: **Baja un porcentaje** with 5, 10, 15 or 20%, and
   **Más barato cerca**.)
5. In Avisos, the slider icon at the top: **Preferencias**. Turn on **No
   molestar de noche**: **Desde 22:00 Hasta 07:00**, adjustable, in your
   phone's time. Turn it off again. **Entre dos avisos de una alerta** is how
   long an alert waits before speaking again.
6. **In Vienna** (location on Tu ubicación): make an alert on any product: it
   is in euros, and only hears about the stores within your radius there. An
   alert made in Buenos Aires never speaks of Vienna's prices.
7. To see a message arrive for real: with the backend running, make an alert
   from a product (say, the milk, "Baja un porcentaje", 5%), then report a
   lower price from the product's **Informar precio**. Messages show up in
   Avisos after the server recomputes the price — a few seconds — when you
   pull down to refresh.

**Known limits**

- Messages arrive when the app asks (opening Avisos, pulling down, the badge
  every minute); nothing arrives with the app closed until push, next
  (MCON-033).
- Quiet hours drift an hour after daylight saving changes (MCON-034).
- Email shows as unavailable unless the server is set up to send it.
