# Sprint 1 — Startup API Optimization Report

Date: 2026-08-07  
Scope: React/Vite PMC frontend — **when** data is requested (not payloads, routing, permissions, or UI contracts).

---

## Summary

Login/bootstrap no longer fans out Alerts, Activity Feed, Pending Summary, DPR list, or Documents.

**Priority after auth (`/me` via AuthContext):**

1. Project list (`GET /projects-data/projects/`)
2. Dashboard shell / PMC Head Overview (`GET /projects/overview/` from `PMCHead360Dashboard`)
3. Deferred: executive project enrichment (`setTimeout(0)`)
4. On demand: Alerts, Activity, Notifications, DPR, Documents

Existing `utils/apiGetCache.ts` (in-flight dedupe + TTL) remains the reuse layer for repeat visits.

---

## What changed

| Area | Before | After |
|------|--------|--------|
| `App.fetchData` | `Promise.all(projects, dprs)` + documents + sync executive enrich | **Projects only**; unlock UI; enrich deferred |
| Alerts on login | `fetchAlerts()` on every `currentUser` | **Removed** |
| Alerts page | Refresh + 60s poll + activity | Same, but **first load gated** on `activeTab === 'alerts'`; `includeActivity: true` |
| Notification bell | Used preloaded alerts | Opens → `fetchAlerts({ includeActivity: false })` |
| Activity / pending | Every login with alerts | **Only** when Alerts page requests `includeActivity: true` |
| DPR | Always in `fetchData` | Lazy when `dpr_records` or non–PMC-Head `dashboard` |
| Documents | Always after projects | Lazy for non–PMC-Head `dashboard` only |
| Cache reuse | Already installed | Unchanged; subsequent opens hit TTL cache |

---

## Startup API count (PMC Head, estimate)

Measured as distinct network families on first paint after login (Disable cache ON for “Before/After cold”).

| Call family | Before | After |
|-------------|--------|-------|
| Auth `/me` (or equivalent profile) | 1 | 1 |
| Projects list | 1 (+ optional enrich 0–N) | 1 (+ enrich deferred) |
| DPR `/dpr/` | 1 | **0** |
| Project documents | 1 | **0** |
| Alerts pages | 1–N | **0** |
| Activity 8-module blast | 8 | **0** |
| Pending summary deps | shared with alerts | **0** |
| Overview `/projects/overview/` | 1 (dashboard) | 1 (dashboard) |
| **Approx. cold startup XHR** | **~25–40** | **~3–8** (me + projects + overview + light enrich) |

Opening **Alerts** later adds alerts + (PMC Head) activity/pending once; GET cache covers revisits within TTL.

Opening **notification bell** adds alert history only (no activity blast).

Opening **DPR Review** loads DPR via `DPRReviewDashboard` / App `fetchDprs` as needed (cache shared).

---

## Duplicate requests

| Scenario | Before | After |
|----------|--------|-------|
| Projects ×3 on alerts enrich | Mitigated earlier + shared `projectsRef` | Same; alerts not on login |
| Login DPR + Review DPR | Often 2× | Login **0**; Review 1 (+ cache) |
| Alerts login + Alerts tab | 2× full pipelines | Login **0**; tab 1 |

---

## Perceived performance

| Metric | Before | After (expected) |
|--------|--------|------------------|
| Time to first dashboard render | Blocked behind projects+DPR (+ alerts race) | After **projects** settle; Overview fetches in parallel with paint |
| Time to interactive | Waited for alerts/activity storm | Interactive once projects + overview shell ready |
| Network waterfall | Wide parallel fan-out | Narrow: me → projects → overview; secondary on navigation |

*Exact ms depends on network/backend; re-measure in DevTools Performance + Network on a cold login.*

---

## How to verify

1. Log out → clear site data (or hard reload with Disable cache).
2. Login as PMC Head; Network filter: `dpr`, `alerts`, `health-safety`, `manpower`, `monthly-scope`, `documents`.
3. Expect **no** those families until you open Alerts / bell / DPR / (non–PMC dashboard docs).
4. Open Alerts once → activity modules fire; reopen within ~15–30s → prefer cache hits.
5. Confirm Overview cards still load via `/projects/overview/`.

---

## Largest improvements

1. **Defer 8-module activity feed** off login (highest cost).
2. **Defer alerts pagination** off login.
3. **Defer DPR list** off login.
4. **Earlier UI unlock** after projects only.

---

## Out of scope (unchanged)

- Backend Redis / query work  
- Request/response payloads  
- Business rules, permissions, routing, visual layout  
- Financial detail APIs (still on Financial / project open — Priority 3 when those screens mount)
