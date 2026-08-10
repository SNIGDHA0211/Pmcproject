# Global Project Store — Migration Report

Frontend-only: single source of truth for projects / overview / dropdown. Backend APIs, payloads, permissions, routing, and UI unchanged.

## Architecture

```
Component
  ↓
Project Store (`stores/projectStore.ts`)
  ↓
apiGetCache (TTL + in-flight dedupe)
  ↓
Axios
  ↓
Backend (unchanged)
```

Selectors: `hooks/useProjectStore.ts` via `useSyncExternalStore` (subscribe to slices only).

## Data sources

| Store field | Endpoint | Notes |
|---|---|---|
| `projects` | `GET /projects-data/projects/` | Same as before (`projectApi.getProjects`) |
| `overview` | `GET /projects/overview/` | Via `getProjectOverview` |
| `dropdownProjects` | Derived from projects | **No** `/projects/dropdown/` in this codebase |
| Init / sites | `GET /projects/init-list/` | Remains on `ProjectInit` (site list, not portfolio) |

## Startup flow

On login (`App.tsx`):

```ts
projectStore.setBootstrapUser(user);
projectStore.bootstrapParallel(); // Overview ∥ Projects — neither awaits the other
```

- Overview can paint before projects finish (store updates progressively).
- Dropdown options populate when projects land (and PMC Head enrich runs in background).
- Sprint 1 lazy Alerts / DPR / Documents unchanged.
- Sprint 2 idle financial prefetch still runs after first projects arrive.

## Mutations

After create / delete / complete / complete-billing / site-init create:

1. `invalidateAll()` (marks stale + drops related GET cache keys)
2. Single `refreshAfterMutation()` (projects + overview once)

Pages no longer each re-fetch independently.

## Components migrated

| Module | Before | After |
|---|---|---|
| `App.tsx` | Local `projects` / `selectedProjectId` + `fetchData` | Store selectors + `bootstrapParallel` / `refreshAfterMutation` |
| `PMCHead360Dashboard` | Local overview fetch + bootstrap seed | `useOverviewCards` / `loadOverview` |
| `UserManagementPage` | Paginated `getProjects` on open | Prefers `projectStore.loadProjects` (fallback pagination if empty) |
| `MyScopesPage` | Direct `getProjects` when props empty | `projectStore.loadProjects` |
| Logout / `clearAppDataCaches` | Cleared GET + overview seed | Also `projectStore.clearStore()` |

Still receive `projects` as props from App (same UI): Dashboard, Portfolio, Financial, Filters, Reports, Layout selector, etc. — data now originates from the store.

## Duplicate requests removed

| Call site | Change |
|---|---|
| App login `getProjects` + Overview prefetch | Unified in store; one in-flight promise per family |
| PMC Head overview re-fetch on mount | Joins store / GET cache instead of a second independent client fetch when fresh |
| User Management open | Uses store when warm (avoids extra paginated storm) |
| MyScopes fallback | Uses store |

## Remaining direct project API calls (intentional)

| Location | Why |
|---|---|
| `stores/projectStore.ts` | Sole portfolio list + overview loader |
| `utils/pmcHeadExecutiveProjects.ts` | Enrichment / search / TL stubs (background, not UI list ownership) |
| `utils/projectActorFallback.ts` | Alerts actor enrichment fallback |
| `UserManagementPage` fallback pagination | Only if store empty |
| `ProjectInit` `getInitProjects` | Site init-list (different resource) |
| `services/projectOverviewService.ts` | HTTP helper used by the store |

## Cache hit behavior

1. Store TTL fresh → **no** `apiGetCache` / HTTP  
2. Store empty/stale → `apiGetCache` (may serve without HTTP)  
3. Miss → Axios → backend  

In-flight: concurrent `loadProjects` / `loadOverview` share one Promise.

## Performance notes

- Selectors avoid whole-store subscriptions (`useProjects` vs `useOverviewCards`).
- Background refresh keeps existing data (`loadingOverview` false when cards already present).
- Overview request sequencing ignores stale responses when filters change mid-flight.

## Verification checklist

- [ ] Login as PMC Head: Network shows one Overview + one Projects (plus enrich GETs as before)
- [ ] Open User Management: no duplicate projects storm when store warm
- [ ] Create / delete / complete project: one coordinated refresh
- [ ] Logout / login: store cleared; fresh bootstrap
- [ ] Non–PMC-Head roles: projects still load; overview bootstrap only when PMC Head path uses it

## Expected result

One Global Project Store; shared project state; mutations refresh once; startup remains parallelized; GET cache, Redis (server), request dedupe, lazy loading, and idle prefetch preserved.
