---
phase: 02-browser-live-view-pipeline
plan: 04
subsystem: ui
tags: [react, vite, live-view, diagnostics, vitest]
requires:
  - phase: 02-browser-live-view-pipeline
    provides: Browser playback adapters, `useLiveView()`, and the callback-ref media binding contract from plan 02-03
provides:
  - Viewer-first React shell with in-frame live-state overlays
  - Manual transport and quality switching through hook-provided live-view modes
  - Collapsed diagnostics disclosure showing current mode, last reason, and next fallback metadata
  - jsdom coverage for overlay labels, retry CTA, diagnostics toggling, and manual mode switching
affects: [ptz-surface, settings-shell, browser-playback]
tech-stack:
  added: []
  patterns: [viewer-first live-view shell, segmented mode controls, disclosure-based diagnostics]
key-files:
  created: [web/src/main.tsx, web/src/App.tsx, web/src/components/LiveViewerFrame.tsx, web/src/components/ViewerStatusOverlay.tsx, web/src/components/ModeSwitcher.tsx, web/src/components/DiagnosticsDisclosure.tsx, tests/web/live-view-controls.test.tsx]
  modified: [web/index.html, web/src/styles.css]
key-decisions:
  - "Keep diagnostics collapsed by default and show only hook-provided mode, reason, and `nextFallbackModeId` metadata so transport details stay secondary without recomputing fallback logic in the UI."
  - "Drive the mode switcher directly from the backend-labeled `LiveMode` list so manual selection stays consistent with capability gating and sticky-mode behavior already implemented in `useLiveView()`."
patterns-established:
  - "Viewer shell: mount the real media surface in a dominant frame, then layer status, retry, and fallback context inside the frame rather than in detached toasts."
  - "Diagnostics UX: keep troubleshooting data behind a disclosure while exposing short reasons and next-step context in the primary viewer."
requirements-completed: [LIVE-02, LIVE-03]
duration: 4 min
completed: 2026-04-14
---

# Phase 2 Plan 4: Browser Live View Pipeline Summary

**Viewer-first React shell with in-frame live states, manual mode switching, and secondary diagnostics for the browser live-view pipeline**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-14T18:29:35-07:00
- **Completed:** 2026-04-14T18:33:59-07:00
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Built the React entrypoint, viewer shell, media frame, and in-frame overlay system around `useLiveView()` with the exact Phase 2 status labels.
- Added manual mode switching with hook-driven labels like `WebRTC Main`, `HLS Sub`, and `Snapshot Main`, keeping the browser UI aligned with the capability-aware mode matrix.
- Added a collapsed diagnostics disclosure and jsdom coverage proving retry labeling, overlay states, manual switching, and hook-provided fallback metadata.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the viewer shell, status overlay, and layout contract** - `7dc520e` (feat)
2. **Task 2: Add the manual mode switcher, diagnostics disclosure, and UI interaction tests** - `c1fff54` (feat)

## Files Created/Modified
- `web/src/main.tsx` - Mounts the React viewer app into the Vite HTML shell.
- `web/src/App.tsx` - Composes the viewer frame, mode switcher, and diagnostics disclosure around `useLiveView()`.
- `web/src/components/LiveViewerFrame.tsx` - Mounts the correct `<video>` or `<img>` element and passes callback refs back to the hook.
- `web/src/components/ViewerStatusOverlay.tsx` - Renders the exact approved state labels, short reasons, retry CTA, fallback context, and polite live region.
- `web/src/components/ModeSwitcher.tsx` - Exposes manual transport and quality selection through 44px minimum-hit-area buttons.
- `web/src/components/DiagnosticsDisclosure.tsx` - Keeps diagnostics collapsed by default while surfacing current mode, last reason, and next fallback metadata.
- `web/src/styles.css` - Establishes the approved IBM Plex Sans viewer shell, dark surfaces, accent usage, and control styling.
- `web/index.html` - Loads the new React entry module.
- `tests/web/live-view-controls.test.tsx` - Verifies manual mode switching, diagnostics toggling, overlay labels, retry copy, and hook-provided fallback rendering.

## Decisions Made
- Keep the viewer frame as the dominant surface and move supporting transport data below it instead of introducing broader dashboard chrome before PTZ and settings phases.
- Surface the exact `nextFallbackModeId` string from the hook in both the overlay and diagnostics panel so the UI never forks the fallback ladder logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Wired the React entry module into `web/index.html`**
- **Found during:** Task 1 (Build the viewer shell, status overlay, and layout contract)
- **Issue:** `vite build` initially succeeded with almost no transformed modules because the HTML shell did not load `web/src/main.tsx`, which meant the browser app would not mount.
- **Fix:** Added the module script tag for `./src/main.tsx` in `web/index.html`, then re-ran the production build to confirm the full viewer bundle emitted.
- **Files modified:** `web/index.html`
- **Verification:** `npm run build:web`
- **Committed in:** `7dc520e`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The fix was necessary for correctness and stayed fully within the planned browser-shell scope.

## Issues Encountered
- `vitest 4.1.4` in this repo still rejects the plan's `-x` flag, so the targeted controls test was run as `npx vitest run tests/web/live-view-controls.test.tsx` instead.
- `vite build` emits a chunk-size warning because the existing browser playback layer includes the vendored MediaMTX reader; the build still completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 can attach PTZ controls beneath the existing viewer shell without reworking the live-view frame, overlay, or diagnostics structure.
- The browser UI now exposes stable control and diagnostics surfaces that match the hook contract from 02-03 and remain safe from camera credential leakage.

## Self-Check: PASSED
- Verified `.planning/phases/02-browser-live-view-pipeline/02-04-SUMMARY.md` exists.
- Verified task commits `7dc520e` and `c1fff54` exist in git history.

---
*Phase: 02-browser-live-view-pipeline*
*Completed: 2026-04-14*
