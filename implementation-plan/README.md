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
| 13 ✅ | Crowdsourcing app: add product, add shop, confirm, flag, badges, progress | both |
| 14 ✅ | Server-side language: user locale, push/email text, translated names | both |

## Phase 7 — Internationalization ✅ (checkpoints 11 and 14)

Spanish (es-AR) stays the default; English and German are added. The app
follows the phone's language, with a manual choice in settings.

- **Checkpoint 11:** every string moves out of the screens into per-language
  catalogs (`i18next` with `expo-localization`); plurals, dates, numbers and
  money format by locale (pesos and euros are already written by hand in
  `formatMoney`, which moves onto `Intl`); a language picker; a test that
  fails when a key exists in one language and not in the others. Messages
  built from facts (alerts, push) compose from the catalog.
- **Checkpoint 14 ✅ (garner-app `ffeda68`):** the backend learns the user's
  language (`users.locale`, sent by the app) so push and email text are
  written in it (`messageText` replaces the Spanish-only `pushText`,
  CON-056); categories carry `translations`, which the app shows.

## Phase 8 — Crowdsourced products and shops ✅ (checkpoints 12 and 13)

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

### App (checkpoint 13 ✅, garner-app `34cc3b4` `b118016`)

- **Add a product** (from a failed search or barcode scan: "No lo
  encuentro — agregarlo"): barcode prefilled from the scan, name, brand
  (search or add), category, size and unit. Duplicate suggestions shown
  first ("¿Es este?"). No photo: the server takes no pictures from
  shoppers yet (MCON-041).
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

Backend: unit (weight, publication rule, duplicate detection, quotas,
addition status), e2e (creator-only visibility switches at 10 priced
products, a flag threshold pulls an entry, offline ids, unlisted brands,
chains hidden until a shop is public). Merging is not built (CON-054).
App: tests for form validation, badges, the progress card and sending a
product added offline; the web e2e adds a product, confirms and reports
one, adds a shop, adds a product offline and checks Mis aportes, then has a
moderator hide what it added. The seed has one community product and two
private shops (6 and 9 of 10). Checkpoint steps in `docs/checkpoints.md`.

### Risks to decide later

- Whether `weight` should be exposed as a "Popular" sort option.
- Moderation tooling beyond API endpoints (an admin web page) — needed
  before real users, not before the MVP.
- Legal: user-uploaded photos and names need terms and a takedown path.

## Phase 9 — Shopping and adding, faster

Asked for by the user after trying phases 7 and 8: fewer taps for the two
things done in a shop — starting a trip, and adding a product the catalog
lacks.

| Checkpoint | What | Repo |
| --- | --- | --- |
| 15 ✅ | Compra detects the shop from the phone's position; a single-store trip expects that store's prices | both |
| 16 ✅ | Barcode lookup: our catalog first, then Open Food Facts, through the backend | backend |
| 17 ✅ | Add product by scanning: scan button in the form, fields and photo prefilled from the lookup | mobile |
| with 17 ✅ | Portuguese (pt-BR) as the fourth language, app and server | both |

### Checkpoint 15 ✅ — The shop you are in (garner-app `1b9c254`, garner-mobile `3f60d7a`)

Compra's "¿Dónde comprás?" card lists shops within 2 km of the phone's own
position and preselects the nearest within 300 m ("Estás en …"); _Cambiar_
picks another, _Sin súper fijo_ or back to automatic. Starting sends
`storeId` when the shop prices in the list's currency, and the backend
expects that store's current prices on every line (CON-057, MCON-044).

### Why a barcode lookup

Scanning an unknown code already opens "Agregar producto" with the code
filled in, but the shopper still types name, brand and size. An open
product database answers most codes with those details: scanning then
becomes "¿Es este? Alfajor Havanna Chocolate 50 g" → check → _Agregar_.
The product is still the shopper's: COMMUNITY, _Sin verificar_, under the
same duplicate checks and daily limits (Phase 8). The lookup only fills the
form.

**Source: Open Food Facts** (world.openfoodfacts.org), free and open.
Strong coverage in Austria and Germany, patchier in Argentina (local brands
often missing): when it has nothing, the form is filled by hand as today.

### Checkpoint 16 ✅ — Backend: `GET /v1/product-lookup/{code}` (garner-app `69697d7`)

- **Our catalog first.** A code we know answers `{ match: 'CATALOG',
  productId, name }`, so the app opens the existing product instead of
  offering to add it again.
- **Then Open Food Facts**, server to server, never from the phone:
  `GET /api/v2/product/{code}?fields=product_name,product_name_es,
  product_name_en,product_name_de,brands,quantity,categories_tags,
  image_front_url,image_front_small_url`, with the identifying
  `User-Agent: Garner/<version> (<contact>)` they require, a 3 s timeout and
  their read rate limit respected. Answers `{ match: 'OPEN_FOOD_FACTS',
  name, brandName, packageSize, unit, categoryId | null, imageUrl,
  attribution }`, or `{ match: 'NONE' }`.
- **Turning their data into ours** (pure functions, unit-tested): the name
  in the shopper's language when there is one; the first brand; `quantity`
  ("500 g", "1,5 l", "6 x 330 ml") into size and unit, or nothing when it
  cannot be read; their category tags (`en:dairies`, `en:beverages`, …)
  into our categories by a small mapping table, else no category (the
  shopper picks).
- **Cache** in Redis: found answers a week, "not found" a day, so a code
  scanned by many shoppers costs one request; failures (timeout, 5xx) are
  not cached and answer `NONE`, never an error the form must handle.
- **Photos without trusting links.** Phase 8 ignores image links from
  shoppers. Adding a product may now say `photoFromLookup: true`; the
  server takes the image URL from *its own* cached lookup of that barcode,
  never from the request. The product keeps `imageSource:
  'OPEN_FOOD_FACTS'` so the app can credit it.
- **Config:** `OPEN_FOOD_FACTS_URL` (overridable, so tests and the web e2e
  use a local stand-in), `OPEN_FOOD_FACTS_USER_AGENT`.
- **Tests:** unit (quantity parsing, category mapping, name choice), e2e
  against a stand-in server (catalog match, found, not found, timeout,
  cache hit, `photoFromLookup` uses the cached image and ignores any link
  sent).

### Checkpoint 17 ✅ — App: scan to add

- **Scan button in the form's barcode field.** It opens the scanner in a
  "pick a code" mode that returns the code to the form instead of
  searching the catalog. Typing a code still works (web, damaged labels).
- **Lookup as soon as there is a valid code** (scanned, typed, or brought
  from the scanner's "Agregarlo al catálogo"):
  - in our catalog → "Ya está en Garner: …" with _Ver el producto_;
  - found in Open Food Facts → "Lo encontramos en Open Food Facts": name,
    brand, size, unit and category filled in (all editable), the photo
    shown with "Foto: Open Food Facts (CC BY-SA)";
  - not found, or no connection → nothing changes; the shopper types.
- **What the shopper typed wins**: a lookup arriving late never overwrites
  a field already edited.
- **Credit** wherever an Open Food Facts photo shows (product screen,
  tiles): a small "Open Food Facts" line on the product screen; and an
  "Acerca de / Datos" note in Preferencias with the licences.
- Offline: no lookup, the form works as today and queues the product.
- **Tests:** form logic (prefill without overwriting); the web e2e serves a
  stand-in Open Food Facts (`e2e/open-food-facts-stub.mjs`, backend started
  with `OPEN_FOOD_FACTS_URL=http://localhost:3999`), types a known code
  (catalog match) and a stand-in code through the scan sheet, checks the
  prefill and adds the product. The photo path is covered by the backend's
  e2e (the stand-in serves no https images).
- **Portuguese** (asked for with this checkpoint): every catalog in pt-BR,
  `AR$ 1.390` / `€ 1,15` / `R$ 19,90`, the server's push and email phrases,
  category names (CON-059).

### Risks and decisions

- **Licences.** The database is under the ODbL (attribution; share-alike
  applies to the database, so we copy only what a shopper confirms, one
  product at a time, never bulk), photos under CC BY-SA (credit each).
  Needs a line in the terms, and a legal look before launch.
- **Data quality.** Entries are volunteers'; that is why the lookup only
  suggests and the product stays _Sin verificar_.
- **Dependence on an outside service.** Down or slow means `NONE`: adding
  by hand always works.
- **Barcode prefixes** (779… Argentina, 90–91 Austria) say who registered
  the code, not where the product is sold: not used.

## Roadmap after Phase 9

Decided with the user on 2026-10-23: a full category taxonomy first (it is
the backbone for browsing, adding products, list order, and importing real
prices), then what real users need, then real prices, then shipping.

| Phase | Checkpoints | What | Repo |
| --- | --- | --- | --- |
| 10 ✅ | 18, 19 | Category taxonomy: data, API, labels | backend |
| 10 ✅ | 20, 21 | Categories in the app: browse, pick, list by aisle | mobile |
| 11 | 22–25 | Ready for real users: password reset, account deletion, profile, terms, moderation page | both |
| 12 | 26–28 | Real prices: Argentina's public price data, Vienna sources, data quality | backend |
| 13 | 29–31 | Ship: builds, real-device checks, store listings | mobile |
| — | — | Backlog, fitted in where it helps | both |

## Phase 10 — Categories for everything

Today the catalog has four categories (Almacén, Lácteos › Leche, Bebidas).
A real supermarket has twenty departments and around 150 aisles; the full
list is in [`taxonomy.md`](taxonomy.md). The app must work with that many:
four chips in a row does not scale to twenty, and a product form cannot
show 150 chips.

### Checkpoint 18 ✅ — Backend: the taxonomy as data

- **One file, versioned in garner-app:** `data/taxonomy.json`. Each category:
  `slug`, `parent`, names in es/en/de/pt, `position` (aisle order within its parent),
  `synonyms` per language (search: "gaseosa", "soda", "Limo", "refrigerante"),
  and `offTags` (the Open Food Facts tags that map to it).
- **Applied, not seeded:** `pnpm run taxonomy:sync` upserts by slug and is run
  on every deploy (after migrations) and by the seed. It never deletes a
  category with products: a retired slug gets `isActive: false` and
  `replacedBy`, and its products move to the replacement in the same sync.
  Existing slugs (`almacen`, `lacteos`, `leche`, `bebidas`) keep their
  meaning.
- **Schema:** `categories` gains `position`, `isActive`,
  `replacedById`, `synonyms` (JSON per language). Two levels only
  (department › aisle); a product belongs to an aisle, or to a department
  when nobody knows the aisle.
- **API:**
  - `GET /v1/categories` gains `position`, `synonyms`, and
    `?tree=true` returning departments with their aisles nested.
  - `GET /v1/categories/{id}/summary`: product count (public, active) and
    how many have a price near a point (for "nothing here yet" states).
  - Search matches category names and synonyms in the shopper's language:
    typing "limpieza" offers the department as a filter, not only products
    with that word.
- **Open Food Facts mapping** moves from the code table into `offTags`, so
  scanning maps to an aisle (`en:yogurts` → Yogures), not only a department.
- **Moderators** can create categories only through the file (reviewed in a
  pull request), not the API: `POST /v1/categories` is retired (kept as 410
  with a pointer) so the catalog's shape changes in one place.
- **Tests:** the file validates (unique slugs, existing parents, all four
  languages, no cycles, ≤ 2 levels); sync is
  idempotent; retiring a slug moves its products; search by synonym.

### Checkpoint 19 ✅ — Backend: product labels

- Diet and lifestyle **labels**, separate from categories: `gluten-free` (sin
  TACC), `vegan`, `vegetarian`, `organic`, `lactose-free`, `sugar-free`,
  `kosher`, `halal`. A product has any number; they come from Open Food
  Facts (`labels_tags`) when scanned, or the shopper ticks them, and the team
  can correct them.
- `GET /v1/products?labels=gluten-free,vegan` filters; `ProductResponse`
  carries `labels`.
- Labels a shopper adds count as unverified like the rest of the product
  (Phase 8 rules).

### Checkpoint 20 ✅ — App: browsing by category

- **Buscar with an empty search** shows the departments as a list of names
  (twenty fit in a scroll), instead of the row of chips.
- **A department** opens its aisles as chips above the products (Lácteos ›
  Yogures), with a breadcrumb back; the products list filters by the aisle
  or the whole department.
- **Typing** still searches products, and a matching category appears as a
  first row ("Limpieza — ver todo").
- **Label filters** (sin TACC, vegano, …) as toggle chips under the search.
- **Product screen** shows its department › aisle, tappable.
- **Empty aisles** say so and offer "Agregar producto" in that aisle.
- Names from the category's translations (`categoryName`). No icons
  (decided with the user): categories are shown by name.

### Checkpoint 21 ✅ (except interests) — App: picking a category, and lists by aisle

- **Agregar producto**: the category field becomes a picker sheet: search
  box (names and synonyms), departments by name, then aisles. A lookup
  prefill selects the aisle; the shopper can change it in two taps.
- **Lists sorted by aisle** (`sortMode: CATEGORY`, which the backend
  already has): items grouped under department headings in aisle order, so
  the list reads in the order of a walk through the shop. A toggle in the
  list's options; the trip shows the same grouping.
- **Preferences interests** (already `interests: string[]` of slugs) get a
  department picker, so Inicio's price drops can favour what the shopper
  buys.
- **Tests:** picker search, grouping order, the web e2e browses Bebidas ›
  Gaseosas, adds a product in an aisle, and sorts a list by aisle.

## Phase 11 — Ready for real users

What no stranger can use Garner without, and what the app stores require.

- **Checkpoint 22 ✅ — Password reset** (garner-app `0da4913`). "¿Olvidaste tu contraseña?" on sign-in;
  an email with a one-time link (or a 6-digit code for the phone), valid 30
  minutes, single use, rate limited; all sessions signed out after a reset.
  Emails in the user's language.
- **Checkpoint 23 ✅ — Account: profile and deletion** (garner-app `6ef0297`; email change moved to the backlog). A Cuenta screen: name,
  email (change with confirmation), password change, language, sign out of
  every device. **Delete my account** (required by Apple and Google): asks
  again, then removes personal data (lists, trips, alerts, devices,
  preferences); shared contributions (prices, products, shops) stay,
  anonymised, so the catalog does not break. A matching web page for
  deleting without the app.
- **Checkpoint 24 — Terms, privacy, licences.** In-app and web pages: terms
  of use (user content, takedown requests), privacy policy (what is stored,
  location use, email, push), and credits (Open Food Facts ODbL and CC
  BY-SA, map data). Accepting terms at sign-up, with the version recorded.
  A "Report a problem" contact.
- **Checkpoint 25 — Moderation page.** A small web page for moderators (same
  API, role-guarded): the review queue with product or shop details, flags
  and their reasons, verify / hide / restore, and the audit log. Plus merging
  duplicate products (deferred in CON-054): move barcodes, list items, alerts
  and prices across the three databases, then retire the duplicate.

## Phase 12 — Real prices

Without them Garner only shows the seed. The backend already has the
external price sources module (adapters, scheduled imports, product
matching); it needs real sources.

- **Checkpoint 26 — Argentina's public price data.** Argentina's government
  publishes supermarket prices by store (the SEPA / "Precios Claros" data).
  First a feasibility check: is it still published, its format and
  frequency, licence and terms of reuse, coverage (chains, provinces). Then
  an adapter: stores matched to ours (or created as VERIFIED), products
  matched by barcode first (the data carries EANs), categories mapped to the
  taxonomy, prices as EXTERNAL_API observations with their own weight.
- **Checkpoint 27 — Vienna.** No public dataset is known. Research what is
  allowed (supermarkets' public online prices and their terms, partnerships,
  open data); if nothing is, Vienna relies on shoppers, and Open Food Facts
  fills product details. Decide with the user.
- **Checkpoint 28 — Data quality.** Outlier checks on imported prices, stale
  sources flagged, a coverage report per city (products with a price near
  a point), and the import status on the moderation page.

## Phase 13 — Ship

- **Checkpoint 29 — Development builds.** EAS builds: Android (free) and iOS
  (needs the Apple Developer account). Verify on real phones what Expo Go
  and the web cannot: push notifications end to end (MCON-037), the map pin
  in Agregar tienda, the scan sheet's camera, shop detection walking into a
  real shop (tune `HERE_KM`).
- **Checkpoint 30 — Look and feel for the stores.** App icon and splash,
  store screenshots and descriptions in four languages, dark theme.
- **Checkpoint 31 — Release.** TestFlight and Play internal testing with a
  few real shoppers; crash reporting; Maestro end-to-end tests on a device
  replacing the web walk-through where it cannot see (native tab bar,
  camera, maps).

## Backlog

Fitted in where they help, not scheduled:

- Choosing interests (departments) in preferences, for Inicio (left from checkpoint 21).
- A trip ordered by aisle, like its list.
- Product photos taken by shoppers, reviewed (for what Open Food Facts lacks).
- Adding to lists offline (queue list items like trip changes).
- Correcting a product's details (shoppers propose, the team or enough
  confirmations accept).
- Shop opening hours added by shoppers.
- Price per unit comparison (per kg / per litre) in search and lists.
- Sharing a list with someone (household).
- Changing the account's email, with a code to the new address (left from checkpoint 23).
- European Portuguese, more languages.

## Later

Superseded by the roadmap above (Phases 10–13 and the backlog).
