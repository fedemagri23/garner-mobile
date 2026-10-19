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
