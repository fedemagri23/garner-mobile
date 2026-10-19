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
