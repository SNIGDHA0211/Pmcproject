# Frontend API Performance Audit

Date: 2026-08-06  
Scope: React (Vite) PMC frontend — no backend API or payload changes.

---

## Executive summary

On **PMC Head login**, the app could fire **~25–40 HTTP calls** before the user clicks anything: projects (2–4×), DPRs, documents, alerts pagination, an **8-module activity blast**, and **projects again** for actor enrichment.

**StrictMode is off** (`index.tsx`) — duplicates are from code paths, not React double-mount.

### Fixes applied in this pass

| Fix | What it does |
|-----|----------------|
| `utils/apiGetCache.ts` + Axios adapter | In-flight GET dedupe + 15–45s TTL cache; mutations invalidate related GETs |
| `loadProjectsForActorFallback` | Uses shared project-row cache (`fetchAllProjectRows`) instead of a bare list |
| `App.fetchAlerts` | Loads directory + projects **once**, passes into activity + pending summary |
| `UserManagementPage` | Stops re-paginating all projects on every App `projects` identity change |

---

## Audit table (highest impact)

| Component | API called | Times per load (before) | Why | Fix | Est. improvement |
|-----------|------------|-------------------------|-----|-----|------------------|
| App `fetchData` | `GET /projects-data/projects/?page_size=1000` | 1 + follow-ups | Bootstrap PMC Head | Keep one fetch; GET cache collapses remounts | High |
| App `fetchData` | `GET /dpr/` | 1 | Full DPR dump on login | GET cache; later pass `dprs` to review tab | Medium |
| `buildPmcHeadExecutiveProjectOptions` | projects filters / search / available-users | 0–10 | After list already loaded | Row cache + GET dedupe | High |
| `loadProjectsForActorFallback` ×3 | `GET /projects-data/projects/` | **3× per alerts** | App, activity feed, pending summary each called it | Share App projects + row cache | **Very high** |
| `fetchPmcHeadActivityNotifications` | 8× `page_size=200` modules | Every login + alerts tab + 60s poll | Synthetic activity feed | Pass shared projects; GET TTL; consider gate on idle | **Very high** |
| `loadUserDirectory` | `available-users` × 8 roles | 1 blast / session | Role fan-out | In-session cache (already) + GET cache | Medium |
| `fetchAllAlerts` | `/alerts/?page_size=200` pages | 1–25 pages | Full history | Cap / since filter (future) | Medium |
| `UserManagementPage` | projects page loop | Re-ran on `[projects]` | App list already present | Mount-once + merge App titles | High |
| `Projects.tsx` detail | dashboard-data, cost-perf, progress, … | ~8–15 / project open | Separate effects | GET cache overlaps Financial tab | Medium–high |
| `Dashboard` / Financial | cost-perf, progress, cashflow, … | Overlap with Projects | Same project charts | financialDataCache + GET cache | Medium |
| `MyScopesPage` fallback | `/monthly-scope/` per project | N | N+1 if my-scopes empty | Prefer single list API (future) | Medium |
| `PMCHead360Dashboard` | `GET /projects/overview/` | 1 | Good aggregate | Keep | Already OK |
| `projectVitalsService` N+1 | dashboard-data × N | Dead code | Unused | Do not rewire | — |

---

## Categories asked

| Finding | Status |
|---------|--------|
| Duplicate requests | Yes — projects ×3 on alerts; activity + App overlap |
| Repeated useEffect | `UserManagement [allowed, projects]`; alerts 60s poll |
| Parent/child same endpoint | App projects/DPRs vs children re-fetch |
| StrictMode duplicate | **No** — StrictMode commented out |
| Sequential → parallel | Most heavy paths already `Promise.all`; alerts enrichment was sequential triple projects |
| Unnecessary `page_size=1000` | Still used for PMC Head; mitigated by cache/dedupe |
| APIs fetched unused | Dead vitals progressive loader unused |
| Multiple times one page load | Login storm listed above |
| Should cache | Projects, DPRs, available-users, overview, cost/progress lists |
| Should prefetch | Overview after projects (optional next) |
| Should lazy-load | Activity blast when opening Alerts (not every login) — partial |
| Unnecessary re-renders | App `setProjects` identity churn retriggered User Mgmt |
| Redux/Context dispatches | AuthContext once; no Redux |
| Duplicate Axios | Main + DPR + alerts/meeting clients; GET cache on main + DPR |
| Missing request deduplication | **Added** via `installGetRequestCache` |

---

## How to verify

1. Login as PMC Head with Network open (Disable cache off).
2. Filter XHR: `projects`, `dpr`, `alerts`, `health-safety`, `manpower`.
3. Expect: **one** projects list for identical URL within ~45s; activity modules still run once per alerts refresh, but **not** three extra projects lists.
4. Open User Management twice quickly — second open should hit GET cache for projects pages.

---

## Recommended next steps (not done)

1. ~~Gate 8-module activity blast to Alerts tab only (not every login).~~ **Done in Sprint 1** — see `docs/SPRINT1_STARTUP_PERFORMANCE.md`
2. ~~Parallel Overview + Projects + idle financial prefetch.~~ **Done in Sprint 2** — see `docs/SPRINT2_PARALLEL_PREFETCH.md`
3. Pass App `dprs` into `DPRReviewDashboard` instead of re-listing.
4. Replace My Scopes per-project monthly-scope fan-out with one filtered call.
5. Lower PMC Head `page_size=1000` once backend supports stable pagination cursor.
