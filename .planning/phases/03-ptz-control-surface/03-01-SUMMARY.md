---
phase: 03-ptz-control-surface
plan: 01
subsystem: api
tags: [reolink, ptz, vitest, capability-snapshot, diagnostics]
requires:
  - phase: 01-camera-connectivity-capability-map
    provides: authenticated Reolink sessions, persisted camera config, and normalized capability snapshots
  - phase: 02-browser-live-view-pipeline
    provides: the viewer shell and browser-safe backend patterns the PTZ surface will attach to
provides:
  - shared PTZ DTOs and service interface in `src/types/ptz.ts`
  - `createReolinkPtzService()` with capability-gated bootstrap, enabled-only preset normalization, motion control, stop watchdog, zoom pulse, and preset recall
  - sanitized PTZ fixtures and fixture-backed Vitest coverage for bootstrap, presets, motion, zoom, watchdog, and debug capture
affects: [03-02-PLAN.md, 03-03-PLAN.md, ptz-routes, ptz-ui]
tech-stack:
  added: []
  patterns: [adapter-owned PTZ op mapping, capability-gated preset exposure, backend watchdog stop safety]
key-files:
  created: [src/types/ptz.ts, src/camera/reolink-ptz.ts, tests/camera/reolink-ptz.test.ts, tests/fixtures/reolink/get-ptz-preset.json, tests/fixtures/reolink/ptz-ctrl.json]
  modified: [src/camera/reolink-ptz.ts, tests/camera/reolink-ptz.test.ts]
key-decisions:
  - "Keep raw PTZ operation names private to `src/camera/reolink-ptz.ts` and expose only normalized PTZ direction contracts upward."
  - "Load presets only when `supportsPtzPreset` is true and filter disabled slots out before routes or UI consume them."
  - "Own stop safety in the backend with a 5000ms watchdog and 250ms zoom pulse instead of duplicating timing rules in later layers."
patterns-established:
  - "Capability-gated PTZ bootstrap: snapshot flags decide whether presets are loaded or hidden before browser code sees them."
  - "Fixture-backed adapter testing: camera request shapes and firmware quirks are locked down with sanitized JSON fixtures."
requirements-completed: [PTZ-01, PTZ-02, PTZ-03]
duration: 5min
completed: 2026-04-14
---

# Phase 03 Plan 01: PTZ Adapter Contract and Service Summary

**Capability-gated Reolink PTZ contracts and adapter logic with enabled-only preset normalization, stop watchdog protection, and fixture-backed camera tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-15T06:31:00Z
- **Completed:** 2026-04-15T06:36:09Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added the shared Phase 3 PTZ contract surface in `src/types/ptz.ts` for bootstrap, motion, stop, zoom, and preset recall.
- Implemented `createReolinkPtzService()` so backend code now owns capability gating, preset normalization, motion start/stop, zoom pulse timing, preset recall, and debug artifact capture.
- Added sanitized PTZ fixtures plus fixture-backed Vitest coverage for bootstrap defaults, preset filtering, idempotent stop, watchdog stop, zoom mapping, `ToPos` recall, and rejected-response diagnostics.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the PTZ contracts, preset fixtures, and bootstrap normalization path** - `36ed69e` (`feat`)
2. **Task 2: Implement motion, stop, zoom, and preset recall inside the adapter-owned PTZ service** - `1f7cbe0` (`feat`)

## Files Created/Modified

- `src/types/ptz.ts` - Shared DTOs and the `PtzService` interface for later route and UI plans.
- `src/camera/reolink-ptz.ts` - Reolink PTZ adapter/service with capability checks, enabled preset normalization, motion control, zoom mapping, watchdog stop, and debug capture.
- `tests/camera/reolink-ptz.test.ts` - Fixture-backed unit coverage for bootstrap, preset normalization, watchdog behavior, zoom pulses, idempotent stop, and preset recall.
- `tests/fixtures/reolink/get-ptz-preset.json` - Sanitized preset payload with enabled and disabled slots for the target firmware shape.
- `tests/fixtures/reolink/ptz-ctrl.json` - Sanitized PTZ command success payload used across motion and zoom tests.

## Decisions Made

- Kept raw Reolink PTZ operation names inside the adapter so later Fastify and React layers only work with normalized PTZ direction types.
- Used enabled-only preset normalization and capability gating to prevent dead preset controls from appearing upstream.
- Put the stop watchdog and zoom pulse timing in the backend service so route and UI work can stay thin and consistent.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-02 can expose browser-safe PTZ routes directly on top of `PtzService` without re-deriving firmware PTZ commands or preset filtering.
- Plan 03-03 can consume the shared PTZ DTOs and trust the backend bootstrap payload for stop timing and preset visibility.
- Remaining Phase 3 work is still required before PTZ is user-complete in the dashboard; this plan established the backend contract and test coverage the next plans depend on.

## Self-Check: PASSED

- Found `.planning/phases/03-ptz-control-surface/03-01-SUMMARY.md`
- Found task commit `36ed69e`
- Found task commit `1f7cbe0`

---
*Phase: 03-ptz-control-surface*
*Completed: 2026-04-14*
