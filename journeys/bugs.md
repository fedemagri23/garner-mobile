# Bugs

Defects found and repaired: what broke, why, and the fix. Notation as in the
backend's `journeys/README.md`; ids are sequential and never renumbered.

## Phase 1 — foundation

### MBUG-001 — The backend contract had no /v1 prefix, so no route type-checked
- **Phase:** 1 · **Area:** api · **Scope:** production code (backend) · **Found by:** typecheck · **Fixed in:** garner-app 9cabb49
- **Symptom:** `api.POST('/v1/auth/login')` failed to compile: the generated schema only had `/auth/login`.
- **Cause:** The backend's contract export enabled header versioning instead of URI versioning (garner-app BUG-017).
- **Fix:** Fixed in the backend, with a test comparing the committed contract with what the app serves; the schema here was regenerated.

### MBUG-002 — On the web, the tab bar covered the top of every screen
- **Phase:** 1 · **Area:** navigation · **Scope:** production code · **Found by:** web smoke test (screenshot) · **Fixed in:** 2cfeee9
- **Symptom:** In the browser the greeting "Hola, Fede" was hidden under a floating tab bar at the top, and the fifth tab, Avisos, was cut off at phone width.
- **Cause:** Native tabs render on the web as a floating top bar; they are designed for iOS and Android.
- **Fix:** A web-only layout (`(app)/_layout.web.tsx`) uses Expo Router's JavaScript tabs, a bottom bar like the mockups'. Native platforms keep the native tab bar.

### MBUG-003 — Nullable fields came through the contract as empty objects
- **Phase:** 2 · **Area:** api · **Scope:** production code (backend) · **Found by:** typecheck · **Fixed in:** garner-app b23c522
- **Symptom:** A product's `packageLabel` and `imageUrl`, and the saved location's `latitude`, were typed `Record<string, never> | null`, so the search rows and the location fallback could not read them.
- **Cause:** The backend described 81 nullable fields as bare objects (garner-app BUG-018).
- **Fix:** Fixed in the backend, whose contract test now fails on untyped fields; the schema here was regenerated.

### MBUG-004 — The web walk-through tapped a row on a hidden tab
- **Phase:** 2 · **Area:** e2e · **Scope:** test · **Found by:** web smoke test · **Fixed in:** ae0c923
- **Symptom:** "A search result opens the product" timed out: tapping "Agua Mineral 2L" in Buscar never showed its prices.
- **Cause:** On the web, an inactive tab stays laid out, only covered. The helper picked the first row with that text that had a layout box, which was the same product in Inicio's "Bajaron cerca tuyo", so the product opened on the hidden Inicio stack.
- **Fix:** The helper only taps an element that is on top at its own centre (`elementFromPoint`), the way a finger would.

### MBUG-005 — The generated client demanded request fields the server defaults
- **Phase:** 2 · **Area:** api · **Scope:** production code · **Found by:** typecheck · **Fixed in:** d5d67c3
- **Symptom:** Creating a list failed to compile without `sortMode`, though the backend declares it optional with a default of `MANUAL`; the same held for a store's `timeZone` and three other request fields.
- **Cause:** openapi-typescript 7 treats any schema property with a `default` as required (`defaultNonNullable`, on by default), which is right for responses and wrong for requests.
- **Fix:** `npm run api:generate` passes `--default-non-nullable=false`. Only five request fields changed, all optional on the server.

### MBUG-006 — Back from a scanned product jumped to another tab
- **Phase:** 2 · **Area:** navigation · **Scope:** production code · **Found by:** web smoke test · **Fixed in:** d5d67c3
- **Symptom:** After scanning a code from Inicio, the product opened in Buscar, and its back arrow went to Inicio while Buscar kept showing the product.
- **Cause:** The scanner opens the product directly, so Buscar's stack held only that screen. `router.canGoBack()` looks at every navigator, found the tabs' history, and went back a tab. A first attempt replaced the scanner with the product, which mounted a second copy of the tabs on the root stack.
- **Fix:** The scanner closes, then navigates to the product in Buscar. The product's back arrow pops its own stack when there is a screen beneath, and otherwise opens its tab's first screen.

### MBUG-007 — A new list could silently be made in the wrong currency
- **Phase:** 3 · **Area:** lists · **Scope:** production code · **Found by:** web smoke test (screenshot) · **Fixed in:** d248a9a
- **Symptom:** In Vienna, with the nearest-store lookup refused by the rate limiter, "Nueva lista" came up with **Pesos (ARS)** selected; "Crear 'Mi lista'" in "A la lista" fell back to pesos the same way. A list's currency cannot be changed afterwards, so the shopper would have been left with a peso list priced at euro stores.
- **Cause:** Both fell back to `ARS` whenever the local currency was unknown — still loading, no location, no store nearby, or a failed lookup.
- **Fix:** Nothing is preselected unless the currency of the nearby stores is known; until the shopper picks one, the list cannot be created, and the sheet says why ("Elegí la moneda…" or "Buscando la moneda…").

### MBUG-008 — The web walk-through typed into a sheet that was closing
- **Phase:** 3 · **Area:** e2e · **Scope:** test · **Found by:** web smoke test · **Fixed in:** d248a9a
- **Symptom:** "A new list is created in the local currency" timed out: after "Crear lista", the new list's "Agregar producto" field stayed empty although the test had typed into it. Other steps failed now and then when a tap landed on a row of a sheet still sliding in.
- **Cause:** React Native's Modal on the web keeps a focus trap until it unmounts, so keystrokes went back to the closing sheet's field; and taps were aimed at elements still moving. The "€ 1,15" and "$ 890" checks also matched prices on hidden screens of other tabs, so they proved nothing.
- **Fix:** One helper decides what a finger could tap — on top at its centre, no longer moving, and inside the open modal if there is one — and `press`, `typeInto` and the new `shown` (visible text only) all use it. The walk-through deletes the lists it creates.

### MBUG-009 — The savings card's button read its icon aloud
- **Phase:** 3 · **Area:** accessibility · **Scope:** production code · **Found by:** web smoke test · **Fixed in:** 33a6eb1
- **Symptom:** The walk-through could not find "Ver el plan" on Inicio; a screen reader would have announced the button with the chevron icon's glyph after its text.
- **Cause:** The button's name came from its contents, which include the icon font's private-use character.
- **Fix:** The button carries an explicit accessible label. The walk-through also scrolls a target below the fold into view before tapping it — the card made "Cerrar sesión" fall off the first screen.

### MBUG-010 — On iPhone, the tab bar covered a list's total and its plan button
- **Phase:** 3 · **Area:** layout · **Scope:** production code · **Found by:** the developer, on an iPhone · **Fixed in:** e92a0c3
- **Symptom:** In a list, "Total estimado" and "¿Dónde conviene comprar?" sat under the bottom tab bar and could not be seen or tapped; the plan screen's Preferencias and Recalcular were at the same risk.
- **Cause:** On iOS the native tab bar floats over the screen, and only a screen's first scroll view is inset for it automatically. Bars fixed at the bottom of a screen were laid out to the screen's edge, behind the tab bar. The web build, whose tab bar takes its own space, and the automated walk-through could not show it.
- **Fix:** A `BottomBar` component pads fixed bottom bars by the tab bar's height as the system reports it for that screen (`SafeAreaView` from `react-native-screens/experimental`, as Expo's native tabs guide recommends; zero on Android, a plain view on the web). The list and plan use it, and their scroll views no longer add a tab-bar inset they do not touch.
- **Superseded by:** MBUG-011 — this fix did not work on the phone and made things worse.

### MBUG-011 — The first fix for the tab bar left a half-screen box and the list still covered
- **Phase:** 3 · **Area:** layout · **Scope:** production code · **Found by:** the developer, on an iPhone · **Fixed in:** aa68542
- **Symptom:** After MBUG-010's fix, the plan screen's box holding Preferencias and Recalcular grew from the bottom to about the middle of the screen, and a list's total and plan button were still under the tab bar.
- **Cause:** The `SafeAreaView` from `react-native-screens/experimental` is `flex: 1` by default, so it split the screen with the scroll view above it. And the same fix turned off the scroll views' automatic content insets — the one mechanism that does clear the floating tab bar on iOS.
- **Fix:** Nothing is fixed to the bottom of a screen inside the tabs any more. A list's total and "¿Dónde conviene comprar?" end its scrolling content (with "Dónde comprar" also at the top, next to ···), and the plan's buttons end the plan. Every scroll view inside the tabs asks for automatic content insets explicitly (`contentInsetAdjustmentBehavior="automatic"`), so iOS insets the end of the content for the tab bar whether or not it is a screen's first scroll view. `BottomBar` is gone.

### MBUG-012 — The walk-through could not see headings or tick checkboxes
- **Phase:** 4 · **Area:** e2e · **Scope:** test · **Found by:** web smoke test · **Fixed in:** 9f97a54
- **Symptom:** "Compra terminada" was on screen but `shown()` never found it, and `press()` could not tick an item's circle.
- **Cause:** React Native Web renders `accessibilityRole="header"` text as `h1`–`h6`, and `shown()` only looked in `div` and `span`; `press()` did not include `role="checkbox"`.
- **Fix:** Both look for those elements too.

### MBUG-013 — The two-stop trip step could not reach the tabs or read the stop
- **Phase:** 4 · **Area:** e2e · **Scope:** test · **Found by:** web smoke test · **Fixed in:** this commit
- **Symptom:** "A trip can follow a plan stop by stop" timed out, although the plan and the two-stop trip were right on screen.
- **Cause:** Three test assumptions. The plan's tabs had scrolled under the map, and the helper only scrolled targets that were off screen, not ones covered on screen. "Parada 1 de 2" is uppercased by CSS, and `innerText` returns the uppercased text. And the step expected the rice's name without the "× 2" the screen rightly shows.
- **Fix:** A covered target is scrolled to the middle and looked at again; `shown()` compares `textContent`, the text as written; the expectation includes the quantity.
