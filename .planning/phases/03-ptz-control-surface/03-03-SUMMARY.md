---
phase: 03-ptz-control-surface
plan: 03
subsystem: ui
tags: [react, vite, ptz, presets, vitest]
requires:
  - phase: 02-browser-live-view-pipeline
    provides: Viewer-first dashboard shell with the live-view frame, mode switcher, diagnostics disclosure, and App composition points
  - phase: 03-ptz-control-surface
    provides: Browser-safe PTZ route contracts and normalized PTZ bootstrap data from plan 03-02
provides:
  - Browser PTZ API client for the Fastify PTZ control routes
  - `usePtzControls()` hold-to-move state machine with release, blur, visibility, and pointer-loss stop recovery
  - Viewer-attached PTZ panel with visible stop, zoom, and preset controls
  - jsdom coverage for PTZ motion lifecycle, preset gating, and App-level layout wiring
affects: [settings-shell, browser-diagnostics, future-camera-adapters]
tech-stack:
  added: []
  patterns: [hook-owned PTZ pointer lifecycle, viewer-adjacent control panel, visible capability-gated preset grid]
key-files:
  created: [web/src/lib/ptz-api.ts, web/src/components/PtzPanel.tsx, web/src/components/PtzPresetGrid.tsx]
  modified: [web/src/hooks/use-ptz-controls.ts, web/src/App.tsx, web/src/styles.css, tests/web/ptz-controls.test.tsx, tests/web/live-view-controls.test.tsx]
key-decisions:
  - "Keep the PTZ interaction lifecycle inside `usePtzControls()` and let `PtzPanel` consume hook-driven button props so `App.tsx` only owns dashboard composition."
  - "Attach PTZ controls beside the live viewer at desktop widths and stack them directly below on smaller screens so the panel feels like part of the viewer surface instead of a detached admin section."
  - "Keep PTZ coverage in `tests/web/ptz-controls.test.tsx` and isolate existing live-view tests from the new panel mount so Phase 2 viewer assertions do not become coupled to PTZ bootstrap fetches."
patterns-established:
  - "PTZ browser contract: all pan, tilt, zoom, stop, and preset calls flow through `web/src/lib/ptz-api.ts` to `/api/ptz` routes rather than touching camera CGI directly."
  - "Viewer attachment: related control panels mount inside a shared `viewer-ptz-cluster` above secondary controls so the shell can grow without displacing diagnostics or transport selection."
requirements-completed: [PTZ-01, PTZ-02, PTZ-03]
duration: 9 min
completed: 2026-04-14
---

# Phase 3 Plan 3: PTZ Control Surface Summary

**Viewer-adjacent PTZ controls with hook-owned stop recovery, explicit zoom actions, and visible preset recall for the browser dashboard**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-14T23:46:56.3354163-07:00
- **Completed:** 2026-04-14T23:56:07.9986565-07:00
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added a dedicated browser PTZ client plus `usePtzControls()` to own bootstrap loading, hold-to-move behavior, explicit stop recovery, discrete zoom, and preset recall.
- Attached a dedicated PTZ panel to the viewer shell with the approved copy, always-visible `Stop Camera`, and a visible preset grid that only renders when preset capability is present.
- Expanded jsdom coverage to prove PTZ motion-stop fallbacks, preset disabling during recall, unsupported-state gating, and the App-level `viewer-ptz-cluster` layout.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the browser PTZ API client and hook-driven stop lifecycle** - `7388ac5` (feat)
2. **Task 2: Attach the PTZ panel to the viewer layout and render visible preset controls** - `5b8bdbb` (feat)

## Files Created/Modified
- `web/src/lib/ptz-api.ts` - Centralizes browser-safe calls to the Fastify PTZ routes.
- `web/src/hooks/use-ptz-controls.ts` - Implements PTZ bootstrap, hold-to-move state, stop fallbacks, zoom pulses, and preset recall state.
- `web/src/components/PtzPanel.tsx` - Renders the attached PTZ panel, motion pad, stop action, zoom controls, and unsupported state.
- `web/src/components/PtzPresetGrid.tsx` - Renders the visible preset grid and disables recalls while one preset is in flight.
- `web/src/App.tsx` - Mounts the PTZ panel inside the new `viewer-ptz-cluster` ahead of mode switching and diagnostics.
- `web/src/styles.css` - Adds the PTZ card, control grid, preset grid, and responsive cluster layout at `980px`.
- `tests/web/ptz-controls.test.tsx` - Verifies hook behavior plus App-level PTZ layout, preset gating, and unsupported handling.
- `tests/web/live-view-controls.test.tsx` - Keeps existing live-view tests focused on viewer behavior by mocking the new PTZ panel mount.

## Decisions Made
- Kept PTZ interaction state in the hook rather than splitting motion lifecycle across `App.tsx` and panel components. This keeps pointer capture, blur/visibility listeners, and stop semantics in one place.
- Preserved the Phase 2 viewer hierarchy by inserting PTZ beside the viewer and leaving mode selection and diagnostics below the viewer/PTZ cluster.
- Treated preset rendering as a first-class visible grid, not a disclosure, so the UI stays capability-aware without hiding available saved positions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Isolated the existing live-view App test from the new PTZ mount**
- **Found during:** Task 2 (Attach the PTZ panel to the viewer layout and render visible preset controls)
- **Issue:** `tests/web/live-view-controls.test.tsx` renders `App.tsx`, and once the PTZ panel mounted there it would start exercising PTZ bootstrap behavior that the Phase 2 live-view test was never designed to own.
- **Fix:** Mocked `PtzPanel` in the live-view test so viewer-shell assertions stay scoped to live-view behavior while PTZ coverage lives in `tests/web/ptz-controls.test.tsx`.
- **Files modified:** `tests/web/live-view-controls.test.tsx`
- **Verification:** `npx vitest run tests/web/ptz-controls.test.tsx tests/web/live-view-controls.test.tsx`
- **Committed in:** `5b8bdbb`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required to keep existing App-level viewer tests stable after adding the PTZ surface. No scope creep.

## Issues Encountered
- Parallel execution briefly hit a transient `.git/index.lock` during staging. Retrying after the competing git operation cleared allowed the planned task commit flow to continue unchanged.
- `vite build` still emits the existing large-chunk warning from the browser bundle, but the PTZ work itself built successfully and did not introduce a new build failure.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 4 can attach settings and safe write flows to the existing viewer/dashboard shell without revisiting the PTZ pointer lifecycle or layout contract.
- Manual camera verification from the plan remains outstanding: physical motion-stop behavior, zoom direction confirmation, and preset landing accuracy were not exercised in this execution run.

## Self-Check: PASSED
- Verified `.planning/phases/03-ptz-control-surface/03-03-SUMMARY.md` exists.
- Verified task commits `7388ac5` and `5b8bdbb` exist in git history.

---
*Phase: 03-ptz-control-surface*
*Completed: 2026-04-14*
