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

## Order of Phases 7 and 8

The crowdsourcing app screens (Phase 8) add a lot of new text, so the app
is made translatable first and those screens are built in three languages
from the start, instead of being written in Spanish and translated after.
The crowdsourcing backend does not depend on languages, so it can go in
between. The order:

| Checkpoint | What | Repo |
| --- | --- | --- |
| 11 ✅ | App translatable: catalogs, locale formatting, language picker | mobile |
| 12 ✅ | Crowdsourcing backend: origin, visibility, weight, create/confirm/flag, review queue | backend |
| 13 | Crowdsourcing app: add product, add shop, confirm, flag, badges, progress | mobile |
| 14 | Server-side language: user locale, push/email text, translated names | both |

## Phase 7 — Internationalization

Spanish (es-AR) stays the default; English and German are added. The app
follows the phone's language, with a manual choice in settings.

- **Checkpoint 11:** every string moves out of the screens into per-language
  catalogs (`i18next` with `expo-localization`); plurals, dates, numbers and
  money format by locale (pesos and euros are already written by hand in
  `formatMoney`, which moves onto `Intl`); a language picker; a test that
  fails when a key exists in one language and not in the others. Messages
  built from facts (alerts, push) compose from the catalog.
- **Checkpoint 14:** the backend learns the user's language (`users.locale`,
  sent by the app) so push and email text are written in it (replacing the
  Spanish-only `pushText`, CON-048/049); category names get translations.

## Phase 8 — Crowdsourced products and shops

### Rules (decided with the user)

- **Products** are visible to everyone from the moment they are added,
  marked *Sin verificar*. Search and recommendations rank them by a weight
  made of **user confirmations and price updates**, so a well-confirmed
  product outranks a fresh one, and a team-verified one outranks both.
- **Shops** are visible only to their creator until **at least 10 different
  products have an accepted price at that shop**. Then they appear to
  everyone, still *Sin verificar* until the team verifies them.
- Garner's team (moderator/admin roles, which exist) marks things
  **verified**, merges duplicates, hides bad entries.

### Data model (core database)

- `Product`: `origin` (`VERIFIED` | `COMMUNITY`, existing rows `VERIFIED`),
  `createdById` (null for team), `confirmationCount`, `flagCount`,
  `weight` (derived, see below), `moderationStatus`
  (`ACTIVE` | `UNDER_REVIEW` | `HIDDEN` | `MERGED`), `mergedIntoId`.
- `StoreLocation`: the same `origin`, `createdById`, `moderationStatus`,
  plus `pricedProductCount` and `publishedAt` (null while private).
  `Supermarket` (the chain) gets `origin`/`createdById` too, since a user
  may add a chain that does not exist.
- `ProductConfirmation` and `ContentFlag`: one row per (user, target); a
  unique key makes confirming or flagging twice a no-op. Flags carry a
  reason (`DUPLICATE` | `WRONG_INFO` | `NOT_EXIST` | `INAPPROPRIATE`).
- Prices live in a different database (no foreign keys across them), so
  `pricedProductCount` is a **counter in core**, updated when a price
  observation is accepted (the `PriceObservationAccepted` event): each
  (store, product, person) is a row in `StorePriceContributor`, which makes
  the count exact and idempotent (distinct products, not distinct prices).

### Weight (ranking)

`weight` is recomputed when a confirmation, flag or accepted price arrives:

- verified: a large fixed bonus
- + distinct confirming users (capped, so one popular entry doesn't
  dominate forever)
- + distinct users with an accepted price update in the last 90 days
- − flags from distinct users
- a small decay for entries with no activity.

Search orders by text relevance first, then weight; recommendations and
the plan's store/product choices read it too. One user's own entry never
counts toward its own weight (the creator is excluded from confirmations).

### Backend API (checkpoint 12 ✅, garner-app `f968005`)

- `POST /v1/products` is open to any signed-in user: a shopper's product is
  COMMUNITY (the team's stay VERIFIED). Name, category, optional brand,
  size/unit, barcodes; a shopper's image link is ignored.
- `GET /v1/product-suggestions?name=` — "is it one of these?" before adding.
- `POST /v1/stores` likewise: chain by `supermarketId`, or a new one by
  `supermarketName`; a shopper's shop is created private.
- `POST|DELETE /v1/products/:id/confirmations` → `{ confirmations }`.
- `POST /v1/products/:id/flags`, `POST /v1/stores/:id/flags` with a reason.
- Products carry `origin` and `confirmationCount`; shops carry `origin`,
  `visibility` (PUBLIC | PRIVATE) and, while private, `publication`
  (`pricedProducts`, `productsNeeded`, `productsRemaining`). Search ranks by
  weight; hidden and flag-pulled entries leave it. A private shop is only in
  its creator's `/v1/stores/nearby` and `GET /v1/stores/:id`.
- Moderators: `GET /v1/moderation/queue`,
  `POST /v1/moderation/{products|stores}/:id/{verify|hide|restore}`.
  Merging duplicates is deferred (CON-054).

### Integrity and abuse protection

- **Duplicates:** creation checks before inserting — barcode already
  exists (return the existing product instead of creating one), normalized
  name + brand + size match (suggest it, the client may confirm "it's
  different"), a store within ~50 m of the same chain (suggest it). The
  name normalizer already exists.
- **Rate limits and quotas:** per-user daily limits on creating products
  and shops (Redis limiter exists), tighter for accounts new in the last
  24 h; a daily cap of flags.
- **Barcode checksum:** already validated by the domain; a barcode cannot
  be attached to two products.
- **Input safety:** length limits, no URLs or HTML in names, images
  uploaded through the existing evidence storage path (size/type checks),
  coordinates validated and a store must be on land inside a plausible
  country range.
- **Anti-self-dealing:** the creator's own confirmations and prices don't
  count toward a product's weight. A shop's 10 products must be accepted by
  the price pipeline (its existing fraud heuristics and review statuses
  apply). *(An earlier draft also required prices from 3 different people;
  dropped, since nobody but the creator can see a private shop to price it —
  CON-051.)* A private shop's prices stay out of comparisons, plans, drops and
  other people's alerts until it is public (CON-052).
- **Auto-hide:** flags from N distinct users (e.g. 3, weighted by the
  flagger's own trust) set `UNDER_REVIEW` and drop the entry from search
  until a moderator restores it.
- **Trust:** a simple per-user score (accepted contributions up,
  hidden/rejected ones down) used to weight flags and to loosen or
  tighten the quotas.
- **Auditing:** every moderation action and every create is logged
  (who, what, when) in a table, never exposing reasons to the creator.
- **Privacy:** the creator's identity is never exposed to other users;
  deleting an account keeps the content, drops `createdById`.

### App (checkpoint 13)

- **Add a product** (from a failed search or barcode scan: "No lo
  encuentro — agregarlo"): barcode prefilled from the scan, name, brand
  (search or add), category, size and unit, optional photo. Duplicate
  suggestions shown first ("¿Es este?").
- **Add a shop**: choose chain (or add), place a pin on the map (starting at
  the user's location), name and address, opening hours optional.
  Afterwards a card shows *"Solo vos lo ves: faltan 7 productos con
  precio para que lo vean todos"* with a progress bar; reporting a price at
  it counts.
- **Sin verificar badge** on products and shops; a verified tick
  for the team's.
- **Confirm** ("Existe y está bien") and **Flag** ("Reportar") actions on a
  community product/shop, with reason picker.
- **Mis aportes** gets the user's products and shops, with their status
  (private, public, under review, verified, hidden).
- Offline: creating a product is queued in the outbox like a price report
  (the client generates the id), with a placeholder shown meanwhile.

### Tests and checkpoint

Backend: unit (weight, publication rule, duplicate detection, quotas),
e2e (creator-only visibility switches at 10 products from 3 users, a flag
threshold hides, a merge moves everything). App: tests for the form
validation and badges, the web e2e covers add-product and add-shop. The
seed gets one community product and a private shop at 6 of 10.
Checkpoint steps in `docs/checkpoints.md`.

### Risks to decide later

- Whether `weight` should be exposed as a "Popular" sort option.
- Moderation tooling beyond API endpoints (an admin web page) — needed
  before real users, not before the MVP.
- Legal: user-uploaded photos and names need terms and a takedown path.

## Later

Dark theme, profile and account settings, password reset (needs backend),
app icon and splash artwork, EAS builds and store submission, end-to-end
tests with Maestro.
