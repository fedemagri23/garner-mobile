# Garner — Mobile

The Garner app: compare grocery prices near you, plan where to buy your list,
and record what you paid while you shop. Expo (SDK 57), Expo Router,
TypeScript, React Query.

The backend is [`garner-app`](https://github.com/fedemagri23/garner-app); its
`docs/client-guide.md` is required reading before touching the API layer.

## Running it

```bash
npm install
npm start            # then press i / a, or scan the QR code with Expo Go
```

The app talks to the backend on the same computer as the Expo dev server
(`http://<that computer's address>:3000`), which is what makes a phone on the
same network reach it. Point it anywhere else with `EXPO_PUBLIC_API_URL`:

```bash
EXPO_PUBLIC_API_URL=https://staging.example.com npm start
```

Start the backend with `docker compose up -d --wait && pnpm run seed && pnpm
run start:dev` in `garner-app`; the seed's shopper is `shopper@garner.test` /
`correct-horse-battery`.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run api:check     # the generated client matches the backend contract
npm run e2e:web       # walks the checkpoints in Chrome against a running backend
```

CI runs the first four on every push, plus an Android bundle. `e2e:web` needs
the backend and `npm run web` running; see `docs/checkpoints.md`, which also
has every checkpoint's manual check.

## The API client

`src/api/schema.d.ts` is generated from the backend's `openapi.json` — never
edit it by hand:

```bash
npm run api:generate  # from ../garner-app/openapi.json, else GitHub master
```

Every call is typed by path: `api.GET('/v1/products/{id}', { params: { path: { id } } })`.
`unwrap` turns an error answer into an `ApiError` carrying the server's
message.

## Layout

```
src/
├── app/                 routes (Expo Router): sign-in, sign-up, (app) tabs
├── api/                 generated schema, typed client, authenticated fetch
├── session/             token manager, keychain storage, session provider
├── features/<area>/     queries and components per product area
├── components/          design-system components from the mockups
├── theme/               colours, type, spacing
└── lib/                 small shared helpers
```

## How work is recorded

- `implementation-plan/` — the phases, what each uses from the API, and
  backend work each one needs first.
- `journeys/bugs.md` and `journeys/considerations.md` — defects found and
  deliberate trade-offs, appended before every push, in the same notation as
  the backend's.
