# Phase 14 — Every screen: phones, tablets, mobile web, computers

**Status: in progress** (started 2026-11-03).

The goal: Garner works and looks right on different iPhones and Android
phones, tablets and foldables, phone browsers, and computers of any size, from
one codebase. A layout adapts to the space it has, not to a device list.

## Where the app stands today

Audited on SDK 58 (`e320eac`).

| Area | Today | Consequence |
| --- | --- | --- |
| Layout | No breakpoints; nothing reads the window size | On a 1440 px screen every row and form stretches edge to edge |
| Orientation | `orientation: portrait` for the whole app | Tablets and foldables are locked too |
| iPad | `ios.supportsTablet` is unset (Expo's default is `false`) | A standalone build would not be a real iPad app |
| Safe areas | Handled for top and bottom; `Screen` only uses `top`, nothing handles left/right | Fine in portrait; a notch would cover content in landscape |
| Fixed sizes | Scanner frame 260×150, plan map 260 high, shop pin map 220 high, location chip 170 wide | Too big on very narrow screens, too small on large ones |
| Scanner | Two copies: `app/scan.tsx` and `scan-code-sheet.tsx` | Every camera fix has to be made twice |
| Sheets | Always a bottom panel, full width, 80% high | Looks wrong on tablets and computers |
| Keyboard | `KeyboardAvoidingView` only on sign-in, sign-up, reset and sheets | Long forms (add product, add shop, report price) are unverified |
| Text size | No test with the phone's larger text sizes | Rows and buttons may clip |
| Web tabs | Bottom bar, fixed 64 px, in `_layout.web.tsx`, described there as "for development" | Ignores the home indicator; wrong on a computer |
| Web session | Refresh token in memory: **a reload signs out** | Blocks the web as a real product |
| Web maps | Schematic drawing; the shop pin cannot be moved | No real map on the web |
| Web document | No `+html.tsx`, so no `viewport-fit=cover`; no name, theme colour or install metadata | Safe areas are unavailable in phone browsers |
| Web details | No hover or keyboard states; the search box shows a browser outline inside its rounded border | Feels like a stretched phone app |
| Web camera | `expo-camera` scans through `BarcodeDetector` or its bundled fallback | Should work, but browsers only allow the camera over HTTPS or localhost; never tried on a real browser camera |
| Tests | The web e2e runs only at 390×844 | No size other than one phone is ever checked |

Already right, and to be kept:

- Top insets come from `SafeAreaView`, so the Dynamic Island, notches and
  Android cutouts are already avoided in portrait.
- Native tabs are the platform's own (Liquid Glass, Material).
- Nothing is pinned to the bottom of a tab screen (MBUG-010/011). Expo's docs
  confirm the tab bar moves on iPad and cannot be measured, so this rule stays.

## Rules for the whole phase

1. **Size classes, from the window, not the device.** A phone-sized browser
   window on a computer gets the phone layout; an iPad in Split View may get
   the phone layout too.

   | Class | Width | Who | Navigation | Content |
   | --- | --- | --- | --- | --- |
   | Compact | under 600 | Phones, folded foldables, narrow windows | Bottom tabs | One column |
   | Medium | 600–1023 | Tablets, unfolded foldables, small windows | Native tabs on apps, side rail on the web | One centred column, or two panes where they help |
   | Expanded | 1024 and up | Large tablets, computers | Native tabs on apps, side bar on the web | Two panes, limited width |

2. **The smallest supported width is 280.** Below that the app only has to stay
   usable by scrolling; nothing may be cut off with no way to reach it.
3. **Routes do not change.** Every screen keeps its URL and deep link; two-pane
   layouts are how a route is shown, not new routes.
4. **No device checks for layout.** `Platform.OS` is for capabilities (camera,
   push, secure storage), never for sizes.
5. **Every checkpoint runs in all four languages.** German and Portuguese are
   the longest texts, so they are what breaks a narrow layout.

## Devices to support

Sizes are approximate, in points or CSS pixels, and are confirmed when the
matrix is built.

| Group | Examples | Size | What to look at |
| --- | --- | --- | --- |
| Small iPhone | SE (home button) | 375×667 | No island, short screen, keyboard takes half of it |
| iPhone with notch | mini, 13/14 | 375×812, 390×844 | Notch, home indicator |
| iPhone with island | 15, 16, 17 | 393×852 | Dynamic Island, camera with several lenses |
| Large iPhone | Pro Max / Plus | 430×932 | One-hand reach, wide rows |
| Small Android | Budget phones | 360×640 | Three-button navigation bar, slower device |
| Android with cutout | Galaxy S, Pixel | 360×780, 412×915 | Punch-hole camera, gesture navigation |
| Foldable, folded | Galaxy Z Fold cover, Flip | 280–344 wide | The narrowest real screens |
| Foldable, open | Galaxy Z Fold, Pixel Fold | About 673×841 | Folding and unfolding while in use |
| Tablet | iPad mini, iPad, Android tablet | 744×1133 and up | Rotation, Split View, tab bar at the top |
| Phone browser | iOS Safari, Android Chrome | Same as phones | Moving address bar, zoom on focus, camera permission |
| Computer | Laptop, desktop, ultrawide | 1280×800 to 2560×1440 | Mouse, keyboard, window resizing, long lines |

## Checkpoints

Each one leaves the app usable and gets manual steps in `docs/checkpoints.md`,
like every other checkpoint.

### Checkpoint 32 — Foundation (size: M) ✅

- `useLayout()`: the size class and width, updating live when the window
  changes or the phone rotates. Breakpoints go in `theme/tokens.ts`.
- `Screen` handles all four safe-area edges and limits content width: about 720
  for reading and forms, wider for two panes.
- `Sheet` stays a bottom panel on compact and becomes a centred dialog from
  medium up.
- `+html.tsx`: `viewport-fit=cover`, theme colour, no browser outline inside
  fields (replaced by the app's own focus style).
- **Automated size check.** The web e2e gains a screen-by-screen sweep over a
  list of widths (280, 320, 360, 390, 430, 600, 768, 1024, 1440, 2560) and fails
  on sideways scrolling, an element off screen or covered, or a tappable target
  under 44 px. It saves a screenshot per screen and size.

Done when: the sweep passes locally (like the web walk-through, it needs the
whole backend, which CI does not start; CI checks that the web pages build and
carry the app), and existing phone screens look unchanged at 390. ✅

### Checkpoint 33 — Every phone, portrait (size: M) ✅

- Go through all screens with the sweep and fix what it finds, narrowest first:
  rows that wrap badly, buttons side by side that no longer fit, long German
  labels, the location chip.
- Fixed sizes become proportional, with limits: the plan map and pin map take a
  share of the screen height, so a short iPhone SE still shows the content.
- **Larger text:** check at the system's large text sizes; set limits only where
  a layout really cannot grow (tab labels, tiles), never across the app.
- **Keyboard:** every form keeps the focused field and the submit button
  reachable, on iOS and Android, with three-button navigation and gestures.
- Android back button and gesture: closes sheets and modal screens first.

Done when: every screen passes at 280–430, in Spanish and German (the longest of
the four; a separate run for the other two adds nothing the parity test and German
do not catch), and at large text on the phones available. The large-text and
keyboard checks need a real phone: they are in `docs/checkpoints.md` for the user's
iPhone, and Android stays unchecked until there is a device or emulator.

### Checkpoint 34 — Camera, photos and maps on real hardware (size: M)

**Code done; waiting on real phones.** Built: one scanner, proportional frame,
keyboard handling, every camera state. Photos already compress and explain the
limit. Not verified: focus on real lenses (no `zoom` or lens setting added until a
phone shows it is needed), and dragging the pin on Android inside a scrolling form.

- One scanner component replaces the two copies. The frame is proportional, the
  camera fills the space between the safe areas, and the camera area never sits
  under the island or a cutout's controls.
- **Phones with several lenses:** newer iPhone Pro models focus poorly up close
  on the main lens, which is exactly how barcodes get scanned. Test on real
  phones; if needed use a small `zoom` (Android, iOS, web) and, on iOS only,
  `autofocus` and `selectedLens`. Android models vary, so `zoom` is the common
  tool.
- Every camera state on every platform: permission asked, denied, denied for
  good (link to settings), no camera (type the code), torch only where it exists.
- Photo of a price label: large photos from any phone are still accepted and the
  5 MB limit explained.
- Maps use the shop's real proportions at each size; the map pin can be dragged
  with a finger without scrolling the page.

Done when: a barcode scans first try at normal distance on every phone
available, including one Pro iPhone and one budget Android.

### Checkpoint 35 — Tablets, foldables and rotation (size: L)

- `ios.supportsTablet: true`. Orientation follows **decision 2** below.
- Medium and expanded layouts in the app, sharing the web's two-pane components:
  - Buscar: departments and results beside the product.
  - Listas: lists beside the open list.
  - Plan: map beside the stops.
  - Compra: the items beside the stop summary.
  - Avisos: messages beside the message's product.
- Survive changes without losing what was being typed or the scroll position:
  rotating, folding and unfolding, entering Split View.
- Left and right safe areas in landscape.

Done when: all of this works on a tablet in both orientations, and folding in
the middle of a trip loses nothing.

### Checkpoint 36 — The web as a real product, on phones (size: L)

**Partly done, ahead of 35 because the user hit it (2026-11-04).** Done: staying
signed in (the cookie below, verified on Firefox and Chrome), reload and deep links,
real maps with a draggable pin. The web build is now a single-page app
(`output: single`): static output cannot serve routes with an id. So **any host must
rewrite unknown paths to `index.html`** (`e2e/serve-web.mjs` shows it), and the API
and web must share a site (`app.` and `api.` of one domain), since the cookie is
`SameSite=Strict`. Still open: address lookup when placing a pin, phone browser
details, install as an app, HTTPS camera.

- **Staying signed in.** Replace the in-memory token. Recommended: the backend
  sets the refresh token as an `HttpOnly`, `Secure`, `SameSite` cookie for
  browsers, so page scripts cannot read it; apps keep the secure keychain. Needs
  backend work, CSRF protection, and the production origin in `CORS_ORIGINS`.
- Remove "development only" from the web target's comments and docs.
- Real page behaviour: reload, back and forward, opening a deep link while signed
  out, and no flash of the wrong screen.
- Phone browser details: safe areas with `viewport-fit=cover`, tab bar above the
  home indicator, moving address bar (`dvh`), no zoom when a field gets focus
  (fields stay at 16 px or more).
- **Real map on the web** per **decision 3**: stops in the plan and a draggable
  pin in Agregar tienda, with address lookup.
- Camera and location prompts explained, over HTTPS. Push stays unavailable on
  the web; email alerts are offered instead.
- Installable (PWA): name, icons, theme colour. No offline web in this phase:
  the outbox works, but the app's pages are not cached.

Done when: on iOS Safari and Android Chrome a person can sign in, scan, shop and
reload without losing the session.

### Checkpoint 37 — Computers (size: M)

- Navigation: a side rail, then a side bar, replacing the bottom tabs from medium
  up. Built with `expo-router/ui` headless tabs in `_layout.web.tsx`, as Expo's
  docs recommend.
- The two-pane layouts from checkpoint 35; on very wide screens the content stays
  centred and limited, without long lines.
- Mouse: hover states, pointer cursor, scrollbars that do not shift the layout.
- Keyboard: a visible focus state everywhere, a sensible Tab order, Enter submits,
  Esc closes dialogs, `/` focuses search.
- What a computer does not have: no camera means typing the code first; shop
  detection is not offered as "you are here" from a laptop's rough position, and
  the shop is chosen by hand.
- Live window resizing across size classes without losing state.

Done when: the whole walk-through can be done with only a keyboard at 1440, and
the window can be dragged from 2560 to 320 with nothing breaking.

### Checkpoint 38 — Real-device round (size: M)

- Run the manual route on every device available, in the matrix above.
- Maestro flows for what the web e2e cannot see: native tab bar, island and cutout
  layouts, camera permission, keyboard, rotation.
- Fix what appears, and write the supported list in `docs/`.

Done when: every group in the matrix has been checked on a real device, or is
listed as checked only on an emulator or not at all.

## What can be verified from where

This machine is Linux, which limits what can be checked without help.

| Check | How | Limit |
| --- | --- | --- |
| Every web size, every screen | Automated in CI (checkpoint 32) | A browser cannot show native safe areas, tabs or the camera |
| Android phones, foldables, tablets, cutouts | Android emulator with device profiles | Needs installing here; camera is simulated |
| Your iPhone | Expo Go | One model; `supportsTablet` and other build settings do not apply in Expo Go |
| Other iPhones, iPads | **iOS Simulator needs a Mac** | See decision 4 |
| Real camera focus | Real phones only | Emulators cannot test it |

## Decisions (made by the user, 2026-11-03)

1. **The web is a real product**, phones first, then computers.
2. **Phones stay in portrait.** Tablets, open foldables and computers rotate and
   resize freely.
3. **Web maps use MapLibre.**
4. **Testing:** the user's own iPhone and iPad. Other Apple models stay unchecked
   unless someone lends one, and the supported list will say so.

## Order, and how this fits the roadmap

32 → 33 → 34 are worth doing first, even if the web decision waits: they make the
app right on every phone, which is what you and your friends will use.

35 needs a tablet build to be fully checked. 36 and 37 depend on decision 1, and
36's camera and sign-in testing needs HTTPS, so it works best after hosting.
38 needs the builds from checkpoint 29, so it runs alongside Phase 13, and the
store screenshots of checkpoint 30 come after it.

Out of scope: a dark theme (checkpoint 30), offline web pages, and new features.
