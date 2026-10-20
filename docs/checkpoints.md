# Checkpoints

Every stopping point of development is a usable app. Each checkpoint below
says how to run it and what to check by hand; `npm run e2e:web` walks the same
checks automatically in a browser.

## Running everything

You need: Docker, Node 22, pnpm (backend) and npm (app). For a phone, the
**Expo Go** app from the App Store or Google Play, on the same Wi-Fi as your
computer.

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
