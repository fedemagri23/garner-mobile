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
   its store, the day, **Con foto**, and a status: **Ya cuenta** for the seeded
   shopper (an established account); a brand-new account would see **En
   revisión · No cambia los precios hasta que otros lo confirmen**.
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

_Phase 6 · 2026-10-21 · backend `9b83f41`, app `f27f085`._

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

## Checkpoint 10 — Avisos on the phone, with the app closed

**What works:** Avisos → Preferencias has **Avisos en el teléfono**. Turning it
on asks the system for permission, registers this phone with the backend, and
price alerts then arrive as notifications (in Spanish, with the price) even
with the app closed. Tapping one opens the product. **Enviar una prueba**
sends a test message. Signing out forgets the phone.

**Needs a real build.** Expo's push needs a development build or an installed
app, not Expo Go on Android (Expo docs, SDK 53+). Expo Go on iPhone is left to
try; if it cannot, the switch shows "No pudimos activarlos" or "Esta versión de
la app todavía no está registrada…". It has not been run on a phone (MCON-037).

**Check in Expo Go / web (what can be seen there)**

1. Avisos → Preferencias: the card **Avisos en el teléfono** is there. On the
   web (and Expo Go on Android) it says it is not available here, and the
   switch is off and disabled.
2. On iPhone in Expo Go: flip it. Either the system asks permission and the
   card then offers **Enviar una prueba**, or it says why it cannot. Both are
   expected outcomes.

**Check with a development build (iPhone needs a paid Apple developer account)**

1. Flip the switch, allow notifications, tap **Enviar una prueba**: a
   notification "Garner — Si ves esto, los avisos funcionan en este teléfono."
2. Close the app. Report a lower price for the milk from another session (or
   the backend's API): a notification "Leche … bajó a …" arrives; tap it, the
   product opens.

**Known limits**

- The last hop (Expo to Apple/Google to the phone) is untested here; the
  backend is tested against a stand-in for Expo's service.
- One account's phone is moved to whoever registers it next.

## Checkpoint 11 — The app in Spanish, English and German

**What works:** the whole app speaks the language of the phone (Spanish,
English or German; anything else falls back to Spanish). Dates, plurals and
prices follow it: `$ 1.390` / `AR$1,390` / `1.390 ARS`, `€ 1,15` / `€1.15` /
`1,15 €`. You can also pick a language yourself: on the sign-in screen, and in
Avisos → Preferencias → Idioma. The choice is remembered.

**Check**

1. Set the phone to English, open the app (or Avisos → Preferencias → Idioma →
   English): _Hi, Fede_, _What are we buying today?_, tabs _Home, Search, Lists,
   Shop, Alerts_. In Vienna, prices read _€0.69_.
2. Switch to Deutsch: _Hallo, Fede_, _Was kaufen wir heute?_, prices _0,69 €_,
   dates like _19. Sept._. Open a product, a list, the plan, a trip: nothing is
   left in Spanish.
3. Choose _Como el teléfono_ (_Same as the phone_ / _Wie das Telefon_) to follow
   the phone again.
4. On the sign-in screen the three languages are offered too.

**Known limits**

- After changing language the screens restart; on a phone you may land on Inicio rather than staying in Preferencias (MCON-038).
- Push and email followed the language from checkpoint 14 on; product names
  are not translated (MCON-040).

## Checkpoint 13 — Adding products and shops

**What works:** anyone can add a product the catalog lacks, and a shop the app
does not know. A product is visible to everyone at once, marked _Sin
verificar_; others can say _Existe y está bien_ or _Reportar_ it. A shop is
seen only by whoever added it until 10 different products have a price there;
a card says how many are left. _Mis aportes_ lists what you added and where
each stands. A product added with no connection waits on the phone and is
added when it returns.

**Check** (signed in as `shopper@garner.test`, by the Obelisco)

1. Buscar → type _alfajor santafesino_ → _No lo encuentro — agregarlo_. Change
   the name to _Alfajor_: _¿Es alguno de estos?_ lists _Alfajor Artesanal de
   Maicena_. Type a full name back, a new brand (_Usar “…” como marca nueva_),
   pick _Almacén_, a size, _Agregar producto_ → _¡Agregado!_ → _Ver el
   producto_: _Sin verificar_, _Lo agregaste vos._
2. Escanear → type `4006381333931` → _Agregarlo al catálogo_: the form opens
   with the barcode filled in.
3. Open _Alfajor Artesanal de Maicena_ (the neighbour's): _Existe y está bien_
   → _1 persona confirmó que existe._; tap again to take it back. _Reportar_ →
   pick a reason → _Enviar reporte_ → _Lo reportaste_.
4. Open any product → _Informar precio_ → _¿No está tu súper? Agregalo_. Pick a
   chain or _Otra_, a name, move the pin on the map (a phone; the web uses
   where you are), address, city, country → _¡Tienda agregada!_ with _Faltan
   10 productos con precio…_. Back in _Informar precio_ the shop is listed with
   _Solo vos · faltan 10 productos_.
5. In Vienna, _Nah&Frisch Singerstraße_ is at 9 of 10: report one more
   product's price there and it becomes public (its _Solo vos_ mark goes).
6. Inicio → _Mis aportes_ → _Lo que agregaste_: your products (_La ven todos ·
   Sin verificar_) and shops (_Solo vos la ves · faltan N productos_); tap a shop
   for its card.
7. Airplane mode → add a product → _Guardado en el teléfono_; _Mis aportes_
   shows it _Por enviar_. Back online, it turns into a normal entry.
8. A tap on a shop under a product's prices opens its card (chain, address,
   _Verificado_ or _Sin verificar_, and _Reportar esta tienda_ for someone
   else's).

**Known limits**

- No photo for a product yet: the server does not take shoppers' pictures
  (MCON-041).
- A product waiting offline cannot be opened or priced until it is sent.
- Moderation (verify, hide) is through the API only; merging duplicates is
  not built (CON-054).

## Checkpoint 14 — Push, email and categories in your language

**What works:** the server knows the language the app is showing and writes
what reaches you with the app closed in it: push notifications (the test
push too) and alert emails, with prices written that language's way. Category
names are translated: _Lácteos_ is _Dairy_ in English and _Milchprodukte_ in
German. Product, brand and shop names stay as printed on the package or the
shop front.

**Check**

1. Avisos → Preferencias → Idioma → Deutsch. In Suchen the category chips read
   _Vorrat, Milchprodukte, Getränke_.
2. With a development build and push on: _Enviar una prueba_ (now _Test
   senden_) arrives as _Wenn du das siehst, funktionieren Benachrichtigungen
   auf diesem Handy._
3. With email alerts on (Mailpit at http://localhost:8025): set an alert,
   report a lower price from another account; the email's subject is in
   German, e.g. _Leche Entera La Serenísima 1L ist auf 1.150 ARS gefallen_, and
   its footer too.
4. Back to Español: the next message is in Spanish again.

**Known limits**

- API error messages the app does not map to its own words stay English.
- Messages already stored before the change keep their text when they have
  no price facts (reminders).

## Checkpoint 15 — Compra knows which shop you are in

**What works:** opening Compra, the app looks where the phone is and, when it
is within about 300 m of a shop it knows, says _Estás en …_ (_Lo detectamos
por tu ubicación · a 120 m_). Starting a list then shops at that store: every
line is bought there and the expected price is that store's own, where it has
one. _Cambiar_ picks another shop nearby or _Sin súper fijo_ (each product at
the store it had on the list, as before); _Detectar por mi ubicación_ goes
back to automatic. A shop that charges in another currency is not used for a
list in a different one. Informar precio marks the shop it preselects
_Detectado por tu ubicación_ in the same case.

**Check**

1. Stand in (or next to) a seeded shop — or set the phone's location near
   one, e.g. Stephansplatz for _Billa Rotenturmstraße_. Compra: _Estás en
   Billa Rotenturmstraße_, and under _Compra en Viena_: _En Billa
   Rotenturmstraße, con sus precios_. _Compra semanal_ (pesos) says that shop
   charges in another currency.
2. _Empezar_: the trip has one stop, the shop, with its prices.
3. _Cambiar_ → another shop: _Comprás en …_, _Lo elegiste vos_. _Cambiar_ →
   _Sin súper fijo_, or _Detectar por mi ubicación_.
4. Away from any shop (the Obelisco is 600 m from Coto Centro): _No detectamos
   un súper donde estás._ — starting works as before.

**Known limits**

- The phone's position is asked once and kept 5 minutes; walking into a shop
  right after opening the app may take that long to be noticed (or reopen the
  app).
- Detection uses the phone's position even when the location chip is on the
  saved place, since it is about where you are standing.

## Checkpoints 16 and 17 — Add a product by scanning it; Portuguese

**What works:** in "Agregar producto" the barcode comes first, with a scan
button. As soon as there is a code (scanned, typed, or brought from the
scanner's _Agregarlo al catálogo_):

- a code Garner already has says _Ya está en Garner: …_ with _Ver el
  producto_;
- a code Open Food Facts knows fills in name, brand, size, unit and category
  (all editable; what you already typed is never overwritten) and shows its
  photo, credited _Foto: Open Food Facts (CC BY-SA)_ — _Quitar la foto_ adds
  the product without it;
- an unknown code, or no connection, changes nothing: fill it in by hand.

The product screen credits the photo, and Avisos → Preferencias says where
product data comes from. The app also speaks **Português** (Brazilian): pick
it in Idioma; push and email follow.

**Check** (the backend needs internet to reach Open Food Facts)

1. Buscar → search anything missing → _No lo encuentro — agregarlo_ → tap the
   barcode button and scan a package from home (Austrian and German products
   are best covered; many Argentine ones are too). The form fills in, with a
   photo when they have one. _Agregar producto_ → _Ver el producto_: the photo
   and its credit.
2. Type `7791234000029` in the barcode field: _Ya está en Garner: Arroz Largo
   Fino 1kg_.
3. Type a made-up valid code such as `2000000000008`: nothing is suggested.
4. Escanear (from Inicio) → a code not in Garner → _Agregarlo al catálogo_: the
   form opens and fills in by itself.
5. Avisos → Preferencias → Idioma → _Português_: _Olá, Fede_, prices `€ 0,69` /
   `AR$ 1.390`, categories _Mercearia, Laticínios, Bebidas_.

**Known limits**

- Open Food Facts data is volunteers': check it before adding; the product
  stays _Sin verificar_.
- Set `OPEN_FOOD_FACTS_USER_AGENT` to a contact address before launch (they ask
  for one); a legal look at the ODbL and photo credits is pending (CON-058).

## Create a product from a list

**What works:** in a list, typing in _Agregar producto_ a product the catalog
does not have shows _Crear “…” y agregarlo_ (and, when there are matches but
none is right, _¿No es ninguno? Crear “…”_). It opens _Agregar producto_ with
the name filled in and _Al terminar se agrega a …_; _Crear y agregar a la
lista_ creates it, puts it on the list and goes straight back. In that form,
tapping a suggestion (_¿Es alguno de estos?_) or a code Garner already knows
(_Agregar este a la lista_) adds that one instead. Scanning works as in
checkpoint 17.

**Check**

1. Listas → _Compra semanal_ → type `bizcochos de grasa` in _Agregar producto_ →
   _Crear “bizcochos de grasa” y agregarlo_.
2. Pick _Almacén_ (scan a code if you have one) → _Crear y agregar a la lista_:
   you are back on the list with the new product on it.
3. Again with `alfajor`: _¿No es ninguno? Crear “alfajor”_ → in the form, tap
   _Alfajor Artesanal de Maicena_ under _¿Es alguno de estos?_: it is added to
   the list and the form closes.

**Known limits**

- Without a connection the product is saved on the phone but not put on the
  list: add it from the list once it is sent.

## Checkpoint 18 — Every category a supermarket has

**What works:** the catalog knows 20 departments and 121 aisles (the list:
`implementation-plan/taxonomy.md`; the data: `garner-app/data/taxonomy.json`),
named in the app's four languages. In _Agregar producto_ the category is a
picker: type to search (names and everyday words in any language —
"gaseosa", "Limo", "refresco") or open a department and choose an aisle. A
scanned product lands in its aisle when Open Food Facts says which. The
demo products now sit in aisles (Pan Lactal in _Panadería › Pan lactal_).

After pulling, apply the categories once (the seed also does it):

```bash
cd ~/Desktop/personal/garner/garner-app
pnpm run prisma:migrate:deploy
pnpm run taxonomy:sync
```

**Check**

1. Buscar: the chips list the twenty departments; _Lácteos y huevos_ shows the
   milk.
2. Agregar producto → _Elegí una categoría_: departments by name; open
   _Bebidas_ → its aisles and _Todo Bebidas_. Type `limo` (or `gaseosa`):
   _Gaseosas, Bebidas_.
3. Switch to English/German/Portuguese: the picker and the chips follow.

**Known limits**

- Browsing by department in Buscar, and lists sorted by aisle,
  are checkpoints 20 and 21; search does not yet match category names.

## Checkpoints 19–21 — Diet labels, browsing departments, lists by aisle

**What works**

- **Labels:** products can be _Sin TACC, Vegano, Vegetariano, Orgánico, Sin
  lactosa, Sin azúcar, Kosher, Halal_. Tick them when adding a product (a
  scanned one comes with Open Food Facts' labels ticked); they show on the
  product and in search results; the chips under Buscar's search box filter
  by them (all ticked labels must match).
- **Buscar** opens on the list of departments. A department shows its aisles
  as chips (_Todo Lácteos y huevos, Leche, Yogures…_) above its products,
  with _Departamentos_ / _Volver a …_ to go back up. Typing an everyday word
  for a category offers _Ver todo en …_ (try `soda` → Agua, `limo` →
  Gaseosas).
- **Lists by aisle:** a list's _Más opciones_ → _Ordenar por pasillo_ groups
  its products under department headings in the order a shop is laid out;
  _Orden manual_ goes back.

**Check**

1. Buscar: _Departamentos_ with Almacén, Lácteos y huevos, Limpieza… Tap
   _Lácteos y huevos_ → the milk; _Yogures_ → empty; _Volver a Lácteos y
   huevos_ → _Departamentos_.
2. Type `soda` → _Ver todo en Agua_ → the water, under _Volver a Bebidas_.
3. Tap _Sin TACC_ under the search box: only the rice (seeded gluten-free and
   vegan); tap it again to clear.
4. Agregar producto: tick _Vegano_; after adding, the product shows it.
5. Listas → _Compra semanal_ → _Más opciones_ → _Ordenar por pasillo_: the
   products under _Almacén_, _Lácteos y huevos_, _Bebidas_…

**Known limits**

- A trip keeps the list's own order, not the aisle grouping.
- Choosing interests (departments you buy) in preferences is not built yet.
- Only the team can correct labels on products others added.

## Checkpoint 22 — Forgot your password

**What works:** _¿Olvidaste tu contraseña?_ on sign-in. Enter your email →
_Enviar código_: a 6-digit code arrives by email (in your language). Enter it
with a new password → _Cambiar contraseña_ → sign in with the new one. The
code works once, for 30 minutes, and dies after five wrong tries; at most
three codes an hour. Resetting signs the account out on every phone. The
screen never says whether an email has an account.

**Check** — to receive the email locally, start the backend with Mailpit as
its mail server and read it at http://localhost:8025:

```bash
cd ~/Desktop/personal/garner/garner-app
SMTP_URL=smtp://127.0.0.1:1025 pnpm run start:dev
```

(Without `SMTP_URL` the code is printed in the backend's terminal instead.)

1. Sign out → _¿Olvidaste tu contraseña?_ → `shopper@garner.test` → _Enviar
   código_.
2. Open Mailpit, copy the code; enter it and a new password (10+ characters)
   → _Listo_ → sign in with it.
3. Run `pnpm run seed` afterwards to put the demo password back.

## Checkpoint 23 — Your account

**What works:** Inicio → _Cuenta_: change the name others see; the email
(read only for now); the language; change the password (the current one is
asked; other phones are signed out, this one stays signed in); _Cerrar sesión
en todos los dispositivos_; and _Eliminar mi cuenta_: it asks for the password,
then erases your lists, trips, alerts, messages and preferences and signs you
out. Prices, products and shops you added stay for everyone, without your
name. Without the app, the same is at
`http://<server>:3000/v1/account-deletion` (email and password).

**Check**

1. Inicio → _Cuenta_ → change the name → _Guardar_ → Inicio greets you by it.
2. Change the password with a wrong current one: _La contraseña actual no es
   correcta._; with the right one: _Listo_, still signed in.
3. Create a throwaway account, then _Eliminar mi cuenta_ → wrong password
   refused; right one → back on sign-in, and that email can no longer sign in
   (it can sign up again).
4. Open `http://localhost:3000/v1/account-deletion` in a browser: the web form.
5. `pnpm run seed` afterwards puts the demo accounts back as they were.

**Known limits**

- Changing the email is not offered yet.
- A deleted account's already-issued access token works for up to 15 minutes
  (refreshing fails at once).
