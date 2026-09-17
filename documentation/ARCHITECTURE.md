# Architecture

## Layered Architecture

```
┌────────────────────────────────────────────────────┐
│  Screens (presentation + composition)              │
│  - route-level views: layout, JSX, wiring          │
│  - own only screen-scoped UI state (dialogs, snack)│
│  - never call fetch, never touch map imperatively  │
└────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────┐
│  Hooks (stateful orchestration)                    │
│  - useRoutePlanner, usePlaceSearch, …              │
│  - own state machines + side-effect sequencing     │
│  - the only layer that calls services and api      │
└────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────┐
│  Services (pure logic, no React)                   │
│  - formatting, geo math, map-layer builders        │
│  - routeView, …                                    │
└────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────┐
│  Data Access (api/*)                               │
│  - thin typed wrappers over api/client (fetch)     │
│  - MapTiler geocoding client (api/places)          │
│  - no UI logic, no React imports                   │
└────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────┐
│  Platform (map/*, auth/*, storage)                 │
│  - MapTiler SDK setup, Firebase auth, localStorage │
└────────────────────────────────────────────────────┘

Cross-cutting: context/* (session, language), theme, i18n, config.
```

Mirrors the BE layering (`ARCHITECTURE.md` there): presentation → logic →
data access. The FE-native twist is that the logic tier is split into
**hooks** (stateful: what happens over time) and **services** (pure: what
things look like / compute to).

## Dependency rules

1. Dependencies point **one way, down**: screens → hooks → services →
   api/platform. Never upward, never sideways between features.
2. `components/*` are presentational: props in, JSX out. They never import
   from `api/*`, `hooks/*`, or `map/*` (map instances arrive via props).
3. `api/*` modules never import React, MUI, or map code — types + fetch
   only.
4. `services/*` never import React or `api/*` — pure functions of their
   arguments.
5. One hook owns one state machine; screens compose hooks, hooks never
   import screens.

## Where new code goes

| New code | Home | Example |
|---|---|---|
| Route-level view, dialog, snackbar state | `screens/` | `RouteScreen` JSX + save dialog |
| Reusable stateful flow (fetch + state + retry) | `hooks/` | `usePlaceSearch`, `useRoutePlanner` |
| Formatting, geo math, marker/layer builders | `services/` | `routeView.drawRoute`, `formatCoord` |
| Backend endpoint wrapper + DTO types | `api/` | `flagsNear`, `Flag` |
| Reusable UI with no data fetching | `components/` | `PlaceField`, `FlagSheet` |
| Session, language, theme, strings, config | `context/`, `theme.ts`, `i18n/`, `config/` | — |

## Current map

- `screens/RouteScreen.tsx` — route planner view; orchestration extracted
  to `hooks/useRoutePlanner.ts`, search to `hooks/usePlaceSearch.ts`,
  map drawing to `services/routeView.ts`. The planner holds
  `routes: RouteOption[]` + `selected` and derives `result`, so the chip
  row (`N · km · min`, tap to select), fabs, and pills all follow the
  active option; `drawRoutePills` renders one tappable pill per route
  (selected `#0284c7`, alternatives `#94a3b8` at 0.75). The Find button
  splits once `result` exists: Find half (primary, search icon) | Save
  route half (success green, save icon); an extended Fab labeled Saved
  (report-sized) floats above the planner card (left) and opens
  `components/SavedRoutesSheet.tsx` (bottom sheet with per-route Open /
  Rename / Delete, loads inline via `planner.openSavedRoute`, no
  navigation); stops still enter through the `+` search field and its
  pick-on-map button.
- `services/routeView.ts` — `drawRoutes` always frames the route with
  `fitBounds`; saved-route opens use an instant jump (`duration: 0`) set
  by `loadSavedRoute` so the camera skips the animated flight (and its
  tile burst), while fresh finds/reroutes keep the animated fit.
- `components/ErrorBoundary.tsx` — class boundary wrapped around
  `<Routes>` in `App.tsx`; a screen/effect crash renders the error
  instead of unmounting the app.
- `map/style.ts` — basemap is the `streets-v4` style URL (SDK v4 rejects
  bare style names; `streets-v2` is deprecated client-side).
  `brandTileUrl()` builds the blurred map-tile backdrop shared by the
  login panel and the More-screen brand header.
- `screens/MoreScreen.tsx` — profile card (avatar initials, name,
  email, Admin/Rider chip, service badges, active vehicle) with a
  rename dialog (`PUT /users/profile`), then Home, saved routes,
  Roles, an admin-only entry to `/admin`, appearance, language,
  sign-out. Home lives here, not in the bottom tabs (`/route`,
  `/hazards`, `/vehicle`, `/more`); `/` still renders
  `HomeScreen` and stays the post-login landing. The Assist tab stays in
  the bottom nav as a disabled "Soon" entry — roadside assistance is
  mobile-first and lives in the mobile app; the web client no longer
  calls any `/dispatch/*`, `/ratings`, or `/shops/*` endpoint.
- `components/PlaceField.tsx` — search-first A/B input (MapTiler
  autocomplete + pick-on-map), reused by the planner card.
- `api/places.ts` — MapTiler forward-geocoding client (Vietnam-filtered)
  plus `reverseGeocode` for labeling map-tapped points.
- `screens/AdminScreen.tsx` — `/admin`, gated by `RequireAdmin`
  (`bundle.user.role === "1"`): Users tab (search, role/status/trust
  edits), Flags tab (full queue via `POST /flags/all`, moderation,
  expiry sweep), Alleys tab (load a segment by ID, edit passability).
  First admin is bootstrapped manually in Firestore (`users/{uid}.role
  = "1"`); the gate 403s everyone else.
- `screens/RolePickerScreen.tsx` — post-first-login rider chooser
  (`/roles`, re-openable from More). Role pick is skippable and
  defaults to Rider; every completion path writes
  `PUT /users/onboard`. Login redirects to `/roles` until the server
  reports `onboarded`, then `VehicleGate` (`App.tsx`) pins users
  without any vehicle to `/vehicle` (admins exempt) until one exists.
- `screens/VehicleScreen.tsx` — profiles now include `CAR` (1.9 m
  default); "Use for routing" persists via `PUT /users/activeVehicle`
  and drives routing. CAR/VAN/TRUCK profiles can be designated the tow
  vehicle (`PUT /vehicleProfiles/tow`, one per user). An empty list
  shows the onboarding hint; creating the first profile syncs
  `ProfileContext`.
- `screens/RouteScreen.tsx` — no width input: `useRoutePlanner`
  routes with `width`/`vehicleType` straight from the active vehicle
  (no auto-width fallback). Without an active vehicle the Find/Reroute
  buttons disable and an alert links to `/vehicle`.
- `components/FlagDetailSheet.tsx` — Deny button beside Confirm for
  others' suggested flags (vote tracked in `storage/votedFlags.ts`).
- `components/NearbyFlags.tsx`, `components/MapView.tsx` — pre-layer
  components; `NearbyFlags` still fetches its own data (next extraction
  candidate if it grows).
- `storage/` — localStorage-backed mini-stores (`votedFlags`) plus
  the `roadassist.profile` mirror.
- `context/ProfileContext.tsx` — login bootstrap: `POST /users/me`
  after sign-in and on cold start, mirrored to localStorage for offline
  starts; exposes user, vehicles, active vehicle, onboarding state, and
  the `activateVehicle` / `markOnboarded` writers. Auto-activates the
  first profile once when a user owns vehicles but none is active.
  Refresh failures set `loadFailed` (plus a console warning) so screens
  can show "couldn't load profile + retry" instead of "no vehicles".
- `context/AuthContext.tsx` — session owner: persists every token from
  `onIdTokenChanged` (same-user rotations included, so the stored token
  never goes stale), validates the session on mount / every 60 s / on
  tab-focus with a cached `getIdToken(false)` (terminal errors sign out,
  network errors ignored), and registers a forced-refresh provider into
  `api/client.setTokenRefresher` so the 401 retry seam needs no
  React/auth import in `api/*`.
- `api/client.ts` — on a 401, retries once with a silently refreshed
  token; a still-failing 401 or a 403 `"User is inactive"` fires
  `roadassist:unauthorized`, which signs out and `RequireAuth` redirects
  to `/login`.
- `i18n/` — strings split by language (`en.ts` source of truth for the
  `Strings` type, `vi.ts`, `index.ts` record); `config/index.ts` —
  config facade over `config/appConfig.json`.

## Verification

- `npm run build` (`tsc -b` + `vite build`) must pass — types enforce the
  layer seams (e.g. services take plain data, hooks return plain state).
- `npm run lint` (`oxlint`) must be clean.
- No test runner is configured; behavior changes are verified by a manual
  pass over the affected screen (search, tap, swap, stops, find, save).
