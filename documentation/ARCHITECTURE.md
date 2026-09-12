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
│  Platform (map/*, auth/*, storage, vehicleWidth)    │
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
  (selected `#0284c7`, alternatives `#94a3b8` at 0.75).
- `components/ErrorBoundary.tsx` — class boundary wrapped around
  `<Routes>` in `App.tsx`; a screen/effect crash renders the error
  instead of unmounting the app.
- `map/style.ts` — basemap is the `streets-v4` style URL (SDK v4 rejects
  bare style names; `streets-v2` is deprecated client-side).
- `components/PlaceField.tsx` — search-first A/B input (MapTiler
  autocomplete + pick-on-map), reused by the planner card.
- `api/places.ts` — MapTiler forward-geocoding client (Vietnam-filtered).
- `components/NearbyFlags.tsx`, `components/MapView.tsx` — pre-layer
  components; `NearbyFlags` still fetches its own data (next extraction
  candidate if it grows).
- `storage/` — localStorage-backed mini-stores (`vehicleWidth`,
  `votedFlags`).
- `i18n/` — strings split by language (`en.ts` source of truth for the
  `Strings` type, `vi.ts`, `index.ts` record); `config/index.ts` —
  config facade over `config/appConfig.json`.

## Verification

- `npm run build` (`tsc -b` + `vite build`) must pass — types enforce the
  layer seams (e.g. services take plain data, hooks return plain state).
- `npm run lint` (`oxlint`) must be clean.
- No test runner is configured; behavior changes are verified by a manual
  pass over the affected screen (search, tap, swap, stops, find, save).
