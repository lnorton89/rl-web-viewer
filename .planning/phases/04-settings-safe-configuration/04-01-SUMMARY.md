---
phase: 04-settings-safe-configuration
plan: 01
subsystem: api
tags: [reolink, settings, vitest, capability-snapshot, diagnostics]
requires:
  - phase: 01-camera-connectivity-capability-map
    provides: authenticated Reolink sessions, persisted camera config, capability snapshots, and debug artifact capture
  - phase: 02-browser-live-view-pipeline
    provides: the viewer-first dashboard shell and browser-safe backend route patterns this settings work will feed
provides:
  - shared settings DTOs, section ids, field metadata, and apply result contracts in `src/types/settings.ts`
  - `createReolinkSettingsService()` with capability-gated bootstrap reads, patch/full-object setter routing, and verified rereads
  - sanitized settings fixtures plus fixture-backed tests for bootstrap metadata, setter strategy, camera reject mapping, and reread verification
affects: [04-02-PLAN.md, 04-03-PLAN.md, settings-routes, settings-ui]
tech-stack:
  added: []
  patterns: [shared field metadata for route and UI consumers, setter-specific merge strategy, reread verification after every successful write]
key-files:
  created: [src/types/settings.ts, src/camera/reolink-settings.ts, tests/camera/reolink-settings.test.ts, tests/fixtures/reolink/get-time.json, tests/fixtures/reolink/get-ntp.json, tests/fixtures/reolink/get-image.json, tests/fixtures/reolink/get-osd.json, tests/fixtures/reolink/get-isp.json, tests/fixtures/reolink/get-enc.json]
  modified: [src/types/settings.ts, src/camera/reolink-settings.ts, tests/camera/reolink-settings.test.ts]
key-decisions:
  - "Keep the safe settings boundary explicit in `src/types/settings.ts` so backend validation and React controls consume one field metadata source."
  - "Use a hard setter matrix: `time` and `osd` stay patch-friendly while `image` and `stream` always re-read and send full camera objects."
  - "Treat camera rereads as the source of truth for success and fail writes when verification shows no camera change."
patterns-established:
  - "Capability-gated settings bootstrap: return no sections when `supportsConfigRead` is false rather than letting later layers infer camera support."
  - "Verified write lifecycle: read current state, apply via patch or full-object strategy, reread, then diff normalized fields."
requirements-completed: [CONF-02, CONF-03, CONF-04]
duration: 14min
completed: 2026-04-15
---

# Phase 04 Plan 01: Settings Contract and Service Summary

**Shared settings contracts and a verified Reolink settings service with fixture-backed bootstrap, setter strategy, and reread coverage**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-15T19:32:46Z
- **Completed:** 2026-04-15T19:46:30Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added the shared Phase 4 settings contract surface in `src/types/settings.ts`, including section ids, editable/read-only boundaries, field specs, constraints, select options, and apply result contracts.
- Implemented `createReolinkSettingsService()` so backend code now owns capability-gated reads, normalized bootstrap output, patch versus full-object setter behavior, camera reject mapping, debug capture for malformed or unexpected responses, and verified rereads.
- Added sanitized firmware fixtures plus fixture-backed Vitest coverage for bootstrap metadata, hidden settings when `supportsConfigRead` is false, patch/full-object strategy differences, verified diffs, and `rspCode` failure paths.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the shared settings contracts, section ids, and firmware fixtures** - `a6176b4` (`test`), `96c3182` (`feat`)
2. **Task 2: Implement the Reolink settings service with reread verification and setter-specific merge rules** - `69cc5c3` (`test`), `4fb73e7` (`feat`)

## Files Created/Modified

- `src/types/settings.ts` - Shared settings DTOs, section metadata, field constraints/options, and service contracts for later route and UI work.
- `src/camera/reolink-settings.ts` - Capability-aware Reolink settings adapter/service with normalized bootstrap reads, patch/full-object apply flows, verified rereads, reject mapping, and debug capture.
- `tests/camera/reolink-settings.test.ts` - Fixture-backed node tests covering contract metadata, bootstrap gating, setter strategy branching, verified diffs, and reject paths.
- `tests/fixtures/reolink/get-time.json` - Sanitized `GetTime` payload for the target firmware.
- `tests/fixtures/reolink/get-ntp.json` - Sanitized `GetNtp` payload for the target firmware.
- `tests/fixtures/reolink/get-image.json` - Sanitized `GetImage` payload for the target firmware.
- `tests/fixtures/reolink/get-osd.json` - Sanitized `GetOsd` payload for the target firmware.
- `tests/fixtures/reolink/get-isp.json` - Sanitized `GetIsp` payload for the target firmware.
- `tests/fixtures/reolink/get-enc.json` - Sanitized `GetEnc` payload for the target firmware.

## Decisions Made

- Kept all safe editable boundaries and control metadata in a shared types module so Fastify and React can stay synchronized without duplicating constraints.
- Split setter behavior by confirmed firmware semantics: patch writes for `time` and `osd`, full-object merge writes for `image` and `stream`.
- Verified successful writes by rereading the camera and returning normalized `changedFields`, instead of trusting submitted drafts or write return codes alone.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced unsupported Vitest `-x` usage with the equivalent single-file runs**
- **Found during:** Task 2 verification
- **Issue:** The installed `vitest@4.1.4` CLI rejected `-x`, so the plan's verify command could not run as written.
- **Fix:** Used `npx vitest run tests/camera/reolink-settings.test.ts` for the same targeted verification scope.
- **Files modified:** None
- **Verification:** Targeted settings test file passed after implementation.
- **Committed in:** N/A (tooling-only execution adjustment)

**2. [Rule 3 - Blocking] Tightened `createFailure()` typing after the server build exposed compile-only helper issues**
- **Found during:** Task 2 implementation
- **Issue:** The initial failure helper typing required `fieldErrors` on every call site and produced TypeScript errors even though runtime behavior was correct.
- **Fix:** Updated the helper signature to supply a default empty `fieldErrors` array and accept optional overrides.
- **Files modified:** `src/camera/reolink-settings.ts`
- **Verification:** `npm run build:server`
- **Committed in:** `4fb73e7`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both deviations were required to complete verification and keep the new service buildable. No scope creep.

## Issues Encountered

- Task 1 verification in the plan assumes service behavior before Task 2 exists. I resolved that by using Task 1 to lock the shared contract and strategy metadata first, then drove the live service behavior in Task 2 with the same test file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 04-02 can expose browser-safe settings routes directly on top of `SettingsService` and reuse the shared field metadata instead of rebuilding validation per route.
- Plan 04-03 can consume the bootstrap sections, editable/read-only split, and verified apply result contracts without reaching into raw camera payloads.
- The remaining Phase 4 work is UI and route integration, not adapter semantics; the backend settings boundary and verified write behavior are now pinned by fixtures and tests.

## Self-Check: PASSED

- Found `.planning/phases/04-settings-safe-configuration/04-01-SUMMARY.md`
- Found task commit `a6176b4`
- Found task commit `96c3182`
- Found task commit `69cc5c3`
- Found task commit `4fb73e7`

---
*Phase: 04-settings-safe-configuration*
*Completed: 2026-04-15*
