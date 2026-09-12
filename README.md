# RoadAssist Frontend

React + Vite + MUI rider app powering RoadAssist (alley-safe motorbike routing, hazard reporting, roadside assistance, vehicle profiles, saved routes). MapTiler SDK for maps and place search. Talks to the [RoadAssist backend](../ROADASSISTAPP_BE) over its `/api` proxy.

## Quick Start

```bash
npm install
cp src/config/appConfig.json.example src/config/appConfig.json  # then fill in keys
npm run dev
```

The backend emulator stack must be running — dev proxies `/api` to `http://localhost:5001` (rewritten to the `asia-southeast1/api` function, see `vite.config.ts`).

## Scripts

```bash
npm run dev       # vite dev server with HMR
npm run build     # tsc -b + vite build
npm run lint      # oxlint, must be clean
npm run preview   # serve the production build locally
```

## Config

`src/config/appConfig.json` (copy from `appConfig.json.example`):

| Key | Purpose |
|---|---|
| `firebase.apiKey` / `authDomain` / `projectId` | Firebase web app credentials (Auth) |
| `apiBaseUrl` | API prefix (`/api` in dev, via the vite proxy) |
| `authEmulatorUrl` | Auth emulator URL, used only when `VITE_USE_AUTH_EMULATOR=true` |
| `maptilerKey` | MapTiler Cloud key (map tiles + geocoding) |

`.env` (see `.env.example`):

| Var | Purpose |
|---|---|
| `VITE_USE_AUTH_EMULATOR` | `true` routes sign-in through the local Auth emulator; unset/`false` uses production Firebase Auth |

## Authentication

Email/password via Firebase (`src/auth/firebase.ts`). `AuthContext` holds the `{uid, token}` session in state + `localStorage`, refreshes ID tokens, and clears the session on the `roadassist:unauthorized` event fired by `api/client.ts` on 401s. Every backend call sends `Authorization: Bearer <idToken>`.

- **Login tab** — `signInWithEmailAndPassword`, then the session is stored.
- **Create-account tab** — `POST /users/register` (public; creates the Auth user and its Firestore doc), then signs in as above.

## Screens

| Route | Screen | Purpose |
|---|---|---|
| `/` | Home | Entry cards into each flow |
| `/route` | Route planner | A/B place search (Vietnam-filtered MapTiler autocomplete) or map tap, up to 10 stops, vehicle width, up to 3 route alternatives with a selectable chip row (`N · km · min`) and tappable map pills, live hazard/width detours, save plan |
| `/hazards` | Nearby hazards + my reports | Browse nearby flags, confirm, retract own reports |
| `/dispatch` | Roadside assistance | Create and track help tickets |
| `/vehicle` | My vehicle | Vehicle profiles and ride setup |
| `/saved` | Saved routes | Open, rename, delete, re-route saved plans |
| `/more` | Settings | Appearance, language (EN/VI), sign out |

Unauthenticated visits redirect to `/login`; the bottom tab bar appears once signed in.

## Maps & Search

Maps render through `@maptiler/sdk` (`components/MapView.tsx`, styles in `map/style.ts`). The map uses the `streets-v4` style URL — the SDK (v4) rejects bare style names like `"streets-v2"` (deprecated), so always pass a full `style.json` URL. `components/ErrorBoundary.tsx` wraps `<Routes>` in `App.tsx`, so a screen crash (e.g. a map-layer error) renders an error instead of blanking the app. Place search (`api/places.ts` + `components/PlaceField.tsx`) uses the SDK's bundled `geocoding.forward`, hard-filtered to Vietnam (`country: ["vn"]`) with the UI language passed through. Map-tapped points keep coordinate labels (no reverse geocoding).

## Route alternatives (FE)

`POST /routes` returns `{cached, routes}`. `hooks/useRoutePlanner.ts` holds `routes: RouteOption[]` + `selected` index and derives `result` for the active option, so fabs/pills/zones follow selection automatically. `RouteScreen` renders a chip row (`N · km · min`, tap to select) and `services/routeView.drawRoutePills` draws one tappable pill per route — selected `#0284c7`, alternatives `#94a3b8` at 0.75 opacity, bare `km · min` label. `drawRoutes` colors the lines to match.

## Full Documentation

- [Architecture](./documentation/ARCHITECTURE.md) — Layered design (screens → hooks → services → api), dependency rules, current map
