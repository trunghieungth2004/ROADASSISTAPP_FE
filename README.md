# RoadAssist Frontend

React + Vite + MUI rider app powering RoadAssist (alley-safe motorbike routing, hazard reporting, roadside assistance, vehicle profiles, saved routes). MapTiler SDK for maps and place search. Talks to the [RoadAssist backend](../ROADASSISTAPP_BE) over its `/api` proxy.

## Quick Start

```bash
npm install
cp src/config/appConfig.json.example src/config/appConfig.json  # then fill in keys
npm run dev
```

The backend emulator stack must be running — dev proxies `/api` to `http://localhost:5001` (rewritten to the `asia-southeast1/api` function, see `vite.config.ts`).

For local development create `.env.local` with:

```bash
VITE_API_BASE_URL=/api
VITE_DEV_API_PROXY=https://asia-southeast1-roadassistapp-c2e37.cloudfunctions.net
```

This is required because `src/config/appConfig.json` contains the production API URL. Calling production directly from `localhost` is blocked by the backend CORS allowlist. The Vite dev/preview proxy makes the request server-side and avoids CORS.

To use the local Firebase Functions emulator instead, set `VITE_DEV_API_PROXY=http://localhost:5001` and start the functions emulator under the default project. Set `VITE_USE_AUTH_EMULATOR=true` only when also running the Auth emulator.

## Scripts

```bash
npm run dev       # vite dev server with HMR
npm run build     # tsc -b + vite build
npm run lint      # oxlint, must be clean
npm test          # vitest: i18n parity, API client, label helpers
npm run preview   # serve the production build locally
```

## Config

`src/config/appConfig.json` (copy from `appConfig.json.example`):

| Key | Purpose |
|---|---|
| `firebase.apiKey` / `authDomain` / `projectId` / `storageBucket` | Firebase web app credentials (Auth + Storage uploads; bucket defaults to `<projectId>.firebasestorage.app`) |
| `apiBaseUrl` | API prefix (`/api` in dev, via the vite proxy) |
| `authEmulatorUrl` | Auth emulator URL, used only when `VITE_USE_AUTH_EMULATOR=true` |
| `maptilerKey` | MapTiler Cloud key (map tiles + geocoding) |
| `firebase.messagingSenderId` | Firebase Cloud Messaging sender ID |
| `firebase.appId` | Firebase web app ID |
| `firebase.messagingVapidKey` | Web Push VAPID public key; can also use `VITE_FIREBASE_VAPID_KEY` |

`.env` (see `.env.example`):

| Var | Purpose |
|---|---|
| `VITE_USE_AUTH_EMULATOR` | `true` routes sign-in through the local Auth emulator; unset/`false` uses production Firebase Auth |
| `VITE_FIREBASE_VAPID_KEY` | Web Push VAPID key for admin browser notifications |

## Admin browser notifications

Admins can enable browser push from `/admin` → Dashboard. `npm run predev` / `npm run prebuild` generates `public/firebase-messaging-sw.js` from `src/config/appConfig.json`. Web Push requires HTTPS, browser notification permission, `messagingSenderId`, `appId`, and a VAPID key configured in Firebase Console.

## Authentication

Email/password via Firebase (`src/auth/firebase.ts`). `AuthContext` holds the `{uid, token}` session in state + `localStorage`, refreshes ID tokens, and clears the session on the `roadassist:unauthorized` event fired by `api/client.ts` on 401s. Every backend call sends `Authorization: Bearer <idToken>`.

Token freshness: the context subscribes with `onIdTokenChanged` (not `onAuthStateChanged`, which skips same-user token rotations) and persists every new token, so the stored token survives the ~1 h Firebase lifetime. A session check runs on mount, every 60 s, and when the tab regains focus — `getIdToken(false)` (cached, no network); a terminal auth error (`user-token-expired`, `invalid-user-token`, `user-disabled`, `user-not-found`) signs out automatically, while `network-request-failed` is ignored so offline never logs you out. On a backend 401, `api/client.ts` does one silent forced refresh + retry (via a refresher registered by `AuthContext`, so `api/*` never imports auth/React) and only signs out if that fails; a backend 403 `"User is inactive"` also forces logout.

- **Login tab** — `signInWithEmailAndPassword`, then the session is stored.
- **Create-account tab** — `POST /users/register` (public; creates the Auth user and its Firestore doc), then signs in as above.

## Screens

| Route | Screen | Purpose |
|---|---|---|
| `/` | Landing / Home | Public landing page for logged-out visitors; the existing Home entry cards for signed-in users |
| `/welcome` | Landing | Public landing alias |
| `/route` | Route planner | A/B place search (Vietnam-filtered MapTiler autocomplete) or map tap, up to 10 stops, vehicle width, up to 3 route alternatives with a selectable chip row (`N · km · min`) and tappable map pills, live hazard/width detours, save plan |
| `/hazards` | Nearby hazards + my reports | Mobile-style nearby/mine tabs, type filters, optional map picker, report sheet, confirm/deny/retract, hazard chat |
| `/vehicle` | My vehicle | Vehicle profiles, ride setup, tow-vehicle designation |
| `/saved` | Saved routes | Open, rename, delete, re-route saved plans |
| `/more` | Settings | Mobile-style profile header (points/reports/confirmed), provider/vehicle/bills/warranty/saved/roles rows, appearance, language, notifications, support, diagnostics, admin (admins), sign out |
| `/providers` | Providers | Manage owned SHOP/TOW/MOBILE_SHOP providers, availability, edit, revoke; search the directory and read reviews |
| `/bills` | Bills & payments | Rider bills, payee bills, payout account + withdrawals, payout history |
| `/bills/:ticketId` | Bill detail | Itemized bill, Cash/SePay payment, cash confirmation, ratings and disputes |
| `/support` | Support | Rider support requests: list tickets, send a new request, read replies |
| `/diagnostics` | Diagnostics | API reachability and client configuration checks |
| `/track/:token` | Live tracking | Public read-only request tracker shared from the mobile app (status, helper, ETA) |
| `/roles` | Rider onboarding | Skippable ride onboarding; optional SHOP, TOW and MOBILE_SHOP registration |
| `/admin` | Admin (role `1` only) | Left-sidebar console with list-left/detail-right panels: dashboard queue cards + recent audit activity, users (filters, trust, rider license), flags (map + photos + type/status filters), provider requests/reports, payouts (requests + batch history), payments ledger, disputes (both parties, ticket context, chat transcript, confirmed rulings), refunds, financial reports, support, warranty, grouped config with dirty-state save, audit search, payments audit |

Admin sections use confirm dialogs for money and moderation decisions, required reasons for denials/suspensions, masked bank accounts, and pending-count badges in the sidebar. FE-only beyond the mobile app: route planning, saved routes, bills, warranty claims, provider configuration, support, diagnostics, and the admin console.

Roadside assistance (`/dispatch`) is intentionally **mobile-only**. The Assist tab and `/dispatch` screen show download links for the RoadAssist mobile app on GitHub instead of calling `/dispatch/*` from the web. The mobile app handles SOS, mechanic, walk-in, tow, provider radars and jobs.

Mobile download: <https://github.com/trunghieungth2004/ROADASSISTAPP_MOBILE/releases/latest>

Unauthenticated visits redirect to `/login`; the bottom tab bar appears once signed in.

## Maps & Search

Maps render through `@maptiler/sdk` (`components/MapView.tsx`, styles in `map/style.ts`). The map uses the `streets-v4` style URL — the SDK (v4) rejects bare style names like `"streets-v2"` (deprecated), so always pass a full `style.json` URL. `components/ErrorBoundary.tsx` wraps `<Routes>` in `App.tsx`, so a screen crash (e.g. a map-layer error) renders an error instead of blanking the app. Place search (`api/places.ts` + `components/PlaceField.tsx`) uses the SDK's bundled `geocoding.forward`, hard-filtered to Vietnam (`country: ["vn"]`) with the UI language passed through. Map-tapped points keep coordinate labels (no reverse geocoding).

## Route alternatives (FE)

`POST /routes` returns `{cached, routes}`. `hooks/useRoutePlanner.ts` holds `routes: RouteOption[]` + `selected` index and derives `result` for the active option, so fabs/pills/zones follow selection automatically. `RouteScreen` renders a chip row (`N · km · min`, tap to select) and `services/routeView.drawRoutePills` draws one tappable pill per route — selected `#0284c7`, alternatives `#94a3b8` at 0.75 opacity, bare `km · min` label. `drawRoutes` colors the lines to match.

## Full Documentation

- [Architecture](./documentation/ARCHITECTURE.md) — Layered design (screens → hooks → services → api), dependency rules, current map
