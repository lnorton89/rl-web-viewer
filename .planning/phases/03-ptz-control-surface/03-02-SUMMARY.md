---
phase: 03-ptz-control-surface
plan: 02
subsystem: api
tags: [fastify, ptz, zod, vitest, reolink]
requires:
  - phase: 03-ptz-control-surface
    provides: PTZ contracts, adapter-owned Reolink PTZ service, and fixture-backed PTZ service tests
  - phase: 02-browser-live-view-pipeline
    provides: Fastify app server, live-view route pattern, and browser-safe control-plane boundary
provides:
  - Browser-safe Fastify PTZ bootstrap and command routes
  - Mounted PTZ API surface on the local app server beside live view
  - Route-level capability gating and invalid payload coverage for PTZ actions
affects: [viewer-ui, ptz-panel, presets, control-plane]
tech-stack:
  added: [none]
  patterns: [Fastify-owned PTZ route plugin, route-layer capability gating, injected PTZ service factories for server tests]
key-files:
  created: [src/server/routes/ptz.ts]
  modified: [src/server/create-server.ts, tests/server/ptz-routes.test.ts, tests/camera/reolink-ptz.test.ts]
key-decisions:
  - "Keep PTZ browser traffic on the existing Fastify control plane so the dashboard never needs camera credentials, tokens, or raw CGI payloads."
  - "Gate motion, stop, zoom, and preset recall in the route layer from the PTZ bootstrap capability snapshot so unsupported actions fail before reaching the adapter."
patterns-established:
  - "PTZ route pattern: resolve an injected PtzService once per plugin, validate request contracts with Zod, and return only shared PTZ DTOs."
  - "Mounted server pattern: register PTZ after live view in createServer so later UI code can consume one LAN-local control plane."
requirements-completed: [PTZ-01, PTZ-02, PTZ-03]
duration: 4 min
completed: 2026-04-14
---

# Phase 3 Plan 2: PTZ Control Surface Summary

**Fastify-owned PTZ bootstrap, motion, zoom, stop, and preset routes mounted on the local app server with capability gating**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-15T06:39:00Z
- **Completed:** 2026-04-15T06:43:01Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `ptzRoutes` with browser-safe PTZ bootstrap, motion start, stop, zoom, and preset recall endpoints.
- Enforced route-layer Zod validation plus `409` capability gating for unsupported PTZ control and preset actions.
- Mounted the PTZ plugin in `createServer()` and expanded tests to exercise the app-level PTZ API alongside existing live-view behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the PTZ route plugin with browser-safe DTOs and capability-gated command endpoints** - `a3334e2` (feat)
2. **Task 2: Mount the PTZ routes in the app server and finish end-to-end server coverage** - `a2a7e59` (feat)

## Files Created/Modified
- `src/server/routes/ptz.ts` - Defines the PTZ Fastify plugin, request validation, capability gating, and safe response contracts.
- `src/server/create-server.ts` - Accepts PTZ route dependencies and registers the PTZ plugin in the local app server.
- `tests/server/ptz-routes.test.ts` - Covers bootstrap, invalid payloads, unsupported actions, and mounted server behavior through `createServer()`.
- `tests/camera/reolink-ptz.test.ts` - Fixes the generic session mock typing so the server TypeScript build can pass during PTZ route verification.

## Decisions Made
- Kept PTZ route dependencies injectable through `createPtzService` so server tests can stay isolated from real camera auth and CGI behavior.
- Reused `PtzService.getBootstrap()` as the route-layer capability source, which keeps unsupported controls blocked by the same normalized snapshot the UI will consume later.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed generic PTZ session mock typing in camera tests**
- **Found during:** Task 2 (Mount the PTZ routes in the app server and finish end-to-end server coverage)
- **Issue:** `npm run build:server` failed because `tests/camera/reolink-ptz.test.ts` used `vi.fn<SessionRequest>()`, which no longer satisfied the generic `requestJson` signature expected by `createReolinkPtzService`.
- **Fix:** Replaced the raw generic mocks with a typed `createSessionRequestMock()` helper that preserves Vitest mock APIs while satisfying the service session contract.
- **Files modified:** `tests/camera/reolink-ptz.test.ts`
- **Verification:** `npm run build:server`, `npx vitest run tests/server/ptz-routes.test.ts`
- **Committed in:** `a2a7e59`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation was required to make the planned Task 2 verification succeed. No scope creep.

## Issues Encountered
- `npm run build:server` initially failed on a pre-existing Vitest mock typing mismatch in `tests/camera/reolink-ptz.test.ts`; the helper conversion resolved it without changing PTZ service behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The browser now has one mounted PTZ API surface to call: `/api/ptz`, `/api/ptz/motion/start`, `/api/ptz/stop`, `/api/ptz/zoom`, and `/api/ptz/presets/:presetId/recall`.
- Phase `03-03` can build the PTZ panel and hook lifecycle directly against the mounted Fastify endpoints without exposing camera auth or raw CGI semantics in the browser.

## Known Stubs

None.

## Self-Check: PASSED
- Verified `.planning/phases/03-ptz-control-surface/03-02-SUMMARY.md` exists.
- Verified task commits `a3334e2` and `a2a7e59` exist in git history.
