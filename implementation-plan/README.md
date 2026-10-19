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

Expo SDK 58 + Expo Router + TypeScript, in Spanish (es-AR).

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

## Phase 2 — Find a price (checkpoint 2 ✅, checkpoint 3 next)

Search, barcode lookup, a product's prices near me, price history.

- **Checkpoint 2 ✅:** location with its fallback, search with category
  chips and paging, the product screen (prices near me with confidence,
  30-day history), and Inicio's "Bajaron cerca tuyo".
- **Checkpoint 3:** barcode scanning and add to list.

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

## Phase 3 — Lists and where to buy

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

## Phase 4 — Shopping mode, offline

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

## Phase 5 — Contributions

- Report a price from the product screen or the scanner, with a photo of the
  shelf label (`expo-image-picker`, upload then attach).
- My contributions and their status.

| Uses | |
| --- | --- |
| `POST /v1/price-evidence` (multipart `photo`), `POST /v1/price-observations` | reporting |
| `GET /v1/price-observations/mine` | history |

## Phase 6 — Alerts and notifications

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
