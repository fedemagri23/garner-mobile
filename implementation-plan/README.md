# Implementation plan

The Garner mobile app, built in phases. Each phase is delivered as one or
more **usable checkpoints**: wherever work stops, the app runs against the
real backend and can be checked by hand, following `docs/checkpoints.md`
(automated by `npm run e2e:web`). Lint, typecheck, tests and CI are green,
journeys logged, and the checkpoint committed.

The screens follow the mockups (Garner mobile mockups canvas). The API is the
backend's committed contract, `openapi.json` in `garner-app`; the backend's
`docs/client-guide.md` is the rules of the road (auth, errors, money,
offline retries).

## Phase 1 — Foundation ✅ (checkpoint 1)

Expo SDK 57 + Expo Router + TypeScript, in Spanish (es-AR). (Built on SDK 58,
moved back to 57 until Expo Go for 58 reaches the App Store: MCON-015.)

- Generated, typed API client (`npm run api:generate`), checked against the
  backend's master in CI.
- Session: sign in, sign up, sign out; the refresh token in the keychain;
  one refresh at a time, ahead of expiry and after a 401; restored behind the
  splash screen at launch.
- Design tokens and base components from the mockups: Text, Button,
  TextField, Screen.
- The five tabs as native tabs, each with its own stack.

| Uses | |
| --- | --- |
| `POST /v1/auth/register`, `/login`, `/refresh`, `/logout` | session |
| `GET /v1/users/me` | home greeting |

## Phase 2 — Find a price ✅ (checkpoints 2 and 3)

Search, barcode lookup, a product's prices near me, price history.

- **Checkpoint 2 ✅:** location with its fallback, search with category
  chips and paging, the product screen (prices near me with confidence,
  30-day history), and Inicio's "Bajaron cerca tuyo".
- **Checkpoint 3 ✅:** barcode scanning (or typing the code), and "A la
  lista" from a product.

- Location: permission, current position (`expo-location`), falling back to
  the saved one from preferences.
- Search with debounce and paging; category chips.
- Barcode scanning (`expo-camera`) → product, or "not in the catalog".
- Product: prices by store near me with the confidence label per price, the
  30-day history, add to list.
- Home: price drops nearby. (The list's savings card needs an optimization
  run, so it moved to phase 3.)

| Uses | |
| --- | --- |
| `GET /v1/products`, `/products/{id}`, `/products/barcode/{code}`, `/categories` | catalog |
| `GET /v1/products/{id}/prices` (lat/lon), `/prices/history` | comparison |
| `GET\|PATCH /v1/users/me/preferences` | saved location |
| `GET /v1/stores/nearby` | store picker |
| `GET /v1/price-drops` (lat/lon) | Bajaron cerca tuyo |

**Backend work first ✅:** `GET /v1/price-drops?latitude&longitude&radiusKm`
in the price-intelligence module (garner-app `915b86f`), for the Home
mockup's "Bajaron cerca tuyo".

## Phase 3 — Lists and where to buy ✅ (checkpoints 4 and 5)

- **Checkpoint 4 ✅:** the Listas tab — create (in the local currency),
  rename, duplicate, delete; add products from the list; quantities;
  estimated total.
- **Checkpoint 5 ✅:** where to buy — request, poll, the three alternatives,
  the stops on a map; optimization preferences; Inicio's savings card; and
  optimization only over stores in the list's currency (garner-app
  `c4a79ad`, CON-044 resolved).

- Lists: create, rename, delete, duplicate; add, remove, reorder items;
  quantities; estimated total.
- Where to buy: request an optimization, poll it, show the three
  alternatives (simplest, balanced, cheapest) with savings, distance and time,
  and the stops on a map (`react-native-maps`).
- Optimization preferences.
- Home: the list's savings card, from its latest optimization.

| Uses | |
| --- | --- |
| `/v1/shopping-lists/**` | lists |
| `POST /v1/shopping-lists/{id}/optimize`, `GET /v1/optimizations/{id}` | where to buy |
| `GET\|PATCH /v1/optimization-preferences` | limits |

## Phase 4 — Shopping mode, offline ✅ (checkpoints 6 and 7)

- **Checkpoint 6 ✅:** the trip — start from a list or from a plan (each
  line at the plan's store and price, garner-app `4fed85a`), one stop at a
  time, tick items off with the price paid, pause, finish with a summary, or
  abandon. Online only.
- **Checkpoint 7 ✅:** offline — the persisted outbox, replay in order on
  reconnect, sync state on screen, a session that survives losing the
  signal, and a trip that opens without one. Price reports with their own
  client id belong to phase 5, where the app first reports prices by hand.

The spec's hardest requirement (§27): a trip survives a lost connection.

- Start a trip from a list or a plan; check items off by stop; record the
  price paid.
- A persisted outbox of mutations (trip item updates, price reports), each
  with its client id, replayed in order on reconnect; the queue survives an
  app restart.
- Visible state: what is waiting to sync, and when it did.
- Complete, pause, abandon.

| Uses | |
| --- | --- |
| `/v1/shopping-sessions/**` | trips |
| `POST /v1/price-observations` with a client `id` and `observedAt` | idempotent reports |

## Phase 5 — Contributions ✅ (checkpoint 8)

Done: "Informar precio" from a product (and so from the scanner, which opens
the product), with an optional photo of the shelf label, sent when there is a
connection; "Mis aportes" with each price's standing; backend names on each
contribution (garner-app `ab5da96`, CON-047).

- Report a price from the product screen or the scanner, with a photo of the
  shelf label (`expo-image-picker`, upload then attach).
- My contributions and their status.

| Uses | |
| --- | --- |
| `POST /v1/price-evidence` (multipart `photo`), `POST /v1/price-observations` | reporting |
| `GET /v1/price-observations/mine` | history |

## Phase 6 — Alerts and notifications (checkpoints 9 and 10 ✅ (10 untested on a phone, MCON-037))

- **Checkpoint 9 ✅:** alerts from a product ("Avisame si baja": below a
  price, a percentage, cheaper nearby), Mis alertas (pause, delete), the
  Avisos inbox with unread state and a badge on the tab, preferences
  (alerts, email, quiet hours, spacing), messages written in Spanish from
  the facts the backend now keeps (garner-app `f979809`, `9cc800d`).
- **Checkpoint 10:** push — a device-token store and an Expo push channel in
  the backend, then registering the phone and showing a message that arrives
  while the app is closed.

- Create, pause and delete price alerts from a product.
- Inbox with unread state; notification preferences, quiet hours, email
  opt-in.
- Push via Expo Notifications.

| Uses | |
| --- | --- |
| `/v1/price-alerts/**`, `/v1/notifications/**`, `/v1/notification-preferences` | alerts |

**Backend work first:** push needs a device-token store
(`POST|DELETE /v1/devices`) and an Expo push channel beside in-app and email —
one more `NotificationChannel`.

## Later

Dark theme, profile and account settings, password reset (needs backend),
app icon and splash artwork, EAS builds and store submission, end-to-end
tests with Maestro.
