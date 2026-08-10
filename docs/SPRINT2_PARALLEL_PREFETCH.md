# Sprint 2 — Parallel Bootstrap & Idle Prefetch Report

Date: 2026-08-07  
Depends on: Sprint 1 (`docs/SPRINT1_STARTUP_PERFORMANCE.md`)  
Scope: **When** Overview / Projects / financial GETs run — not payloads, UI, permissions, or routing.

---

## Summary

Startup no longer waits for Projects before Overview (or vice versa).

```
Login (/me)
    ├─► GET /projects/overview/     ──► render 360 cards ASAP
    └─► GET /projects-data/projects/ ──► dropdowns / merge / filters
              │
              └─ (idle) prefetch progress / cost / budget / cashflow
                 for top projects (GET cache warm)
```

Alerts, Notifications, DPR, and Activity remain **lazy** (Sprint 1).

---

## What changed

| Piece | Change |
|-------|--------|
| `utils/dashboardBootstrap.ts` | Overview seed + subscribe; idle financial prefetch |
| `App.tsx` | `prefetchDefaultProjectOverview()` **parallel** with `fetchData()` |
| `PMCHead360Dashboard.tsx` | Apply bootstrap seed immediately; revalidate via same GET (cache/dedupe) |
| `utils/authStorage.ts` | Clear overview seed on logout / cache clear |

---

## Startup behavior

### Before (post–Sprint 1)

1. `/me`
2. Projects list
3. Dashboard mounts
4. Overview fetch (waterfall after projects + mount)

### After (Sprint 2)

1. `/me`
2. **Parallel:** Overview + Projects (neither awaits the other)
3. Overview seed → cards render (projects may still be `[]`)
4. Projects arrive → merge / selectors fill
5. Idle: warm financial/chart GETs for up to 3 projects

---

## Metrics (expected)

| Metric | Before Sprint 2 | After Sprint 2 |
|--------|-----------------|----------------|
| Overview vs Projects | Sequential (projects then overview) | **Parallel** |
| Dashboard first paint (cards) | After overview (blocked by projects mount path) | As soon as **Overview** returns |
| Time to interactive | ≈ max(projects, overview) + chain | ≈ **max**(projects, overview) without chain |
| Startup API count (PMC Head) | ~3–8 (Sprint 1) | Same core count; idle adds 0–12 warm GETs later |
| Duplicate Overview | Possible remount double | **In-flight dedupe + TTL** via `apiGetCache` |
| Cache hits on Financial open | Cold | Higher after idle prefetch |

*Re-measure in DevTools (Disable cache off for cache-hit view; on for cold).*

---

## Prefetch rules (Phase 8)

**Do prefetch (idle):**

- Project progress chart  
- Cost performance  
- Budget performance  
- Cashflow  

**Do not prefetch:**

- Alerts / notifications  
- DPR  
- Activity feed (8-module)  

---

## How to verify

1. Cold login as PMC Head → Network: Overview and Projects start in the **same window** (no Overview waiting on Projects).
2. Cards appear when Overview finishes even if Projects still pending.
3. After ~1–2s idle, progress/cost/budget/cashflow GETs for a few projects may appear (low priority).
4. Open Financial / project charts soon after → prefer **cache hits**.
5. Open Alerts / DPR → still first-load fetch (Sprint 1), not idle-prefetched.

---

## Largest improvements

1. Removed Overview←Projects waterfall.  
2. Progressive card render from Overview seed.  
3. Silent financial/chart warm during idle for faster later navigation.
