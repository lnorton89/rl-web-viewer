---
phase: 02-browser-live-view-pipeline
plan: 03
subsystem: ui
tags: [react, vite, webrtc, hls, mediamtx, vitest]
requires:
  - phase: 02-browser-live-view-pipeline
    provides: Shared live-view mode contracts, startup order, and Fastify live-view bootstrap routes
provides:
  - Browser bootstrap client for `/api/live-view`
  - Transport-aware WebRTC, HLS, and snapshot player adapters driven by backend playback URLs
  - `useLiveView()` state machine with retry, fallback, and media-ref binding contracts
  - jsdom lifecycle coverage for connecting, live, reconnecting, failed, retry, and manual mode switching
affects: [live-view-ui-shell, diagnostics-panel, browser-playback]
tech-stack:
  added: [@types/react, @types/react-dom]
  patterns: [backend-owned playback URLs, adapter-backed media binding contract, retry-then-fallback viewer state machine]
key-files:
  created: [web/src/lib/live-view-api.ts, web/src/lib/players/mediamtx-webrtc-reader.ts, web/src/lib/players/webrtc-player.ts, web/src/lib/players/hls-player.ts, web/src/lib/players/snapshot-player.ts, web/src/hooks/use-live-view.ts, tests/web/live-view-viewer.test.tsx]
  modified: [src/types/live-view.ts, package.json, package-lock.json]
key-decisions:
  - "Keep browser playback adapters thin and consume the backend-provided `whepUrl`, `hlsUrl`, and `snapshotUrl` fields directly instead of reconstructing transport URLs in the browser."
  - "Expose a hook-to-frame contract of `renderKind`, `activePlayback`, and callback refs so the later viewer shell can mount the correct media surface without embedding transport logic in UI components."
patterns-established:
  - "Viewer lifecycle: auto-start the preferred mode, retry the active mode at 1s/2s/5s, then step down the fallback ladder before landing in `failed`."
  - "Adapter binding: mount the real `<video>` or `<img>` element in React and let the hook attach/detach the active transport adapter through callback refs."
requirements-completed: [LIVE-01, LIVE-03]
duration: 17 min
completed: 2026-04-14
---

# Phase 2 Plan 3: Browser Live View Pipeline Summary

**Transport-aware browser playback with vendored MediaMTX WHEP handling, fallback adapters, and a tested live-view state machine**

## Performance

- **Duration:** 17 min
- **Started:** 2026-04-14T22:08:00Z
- **Completed:** 2026-04-14T22:25:09Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Added a typed browser bootstrap client for `/api/live-view` and transport adapters for WebRTC, HLS, and 1 fps snapshot fallback, all driven by backend-owned playback URLs.
- Implemented `useLiveView()` with auto-start, retry delays `[1000, 2000, 5000]`, fallback stepping, terminal failure handling, and explicit `bindVideoElement` / `bindImageElement` media contracts for the future viewer frame.
- Added jsdom coverage proving the viewer reaches `Connecting`, `Live`, `Reconnecting`, and `Live View Failed`, supports `Retry Live View`, binds real DOM media elements, and derives `nextFallbackModeId` correctly.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement the bootstrap client and transport adapters around the shared playback contract** - `7a82411` (feat)
2. **Task 2: Build the viewer hook state machine and lifecycle tests** - `d91d3ba` (feat)

## Files Created/Modified
- `web/src/lib/live-view-api.ts` - Fetches the shared live-view bootstrap contract from `/api/live-view` without remapping playback fields.
- `web/src/lib/players/mediamtx-webrtc-reader.ts` - Vendors the official MediaMTX browser WHEP reader locally for the WebRTC path.
- `web/src/lib/players/webrtc-player.ts`, `web/src/lib/players/hls-player.ts`, `web/src/lib/players/snapshot-player.ts` - Wrap the supported transports behind a uniform adapter contract with ready and teardown handling.
- `web/src/hooks/use-live-view.ts` - Encodes the browser viewer state machine, retry policy, fallback ladder, and media-ref binding contract.
- `tests/web/live-view-viewer.test.tsx` - Covers viewer lifecycle transitions, retry behavior, fallback metadata, and media element binding in jsdom.
- `src/types/live-view.ts` - Tightens the shared viewer state contract to the exact Phase 2 labels.
- `package.json`, `package-lock.json` - Add the React DOM type packages required for the browser hook and test workspace.

## Decisions Made
- Use a thin adapter interface returning `ready` plus `destroy()` so the hook owns lifecycle state and fallback behavior rather than letting player libraries retry implicitly.
- Cancel the MediaMTX reader's internal restart path at the wrapper layer so Phase 2 retry timing stays in the hook's state machine and remains testable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing React type packages for the browser workspace**
- **Found during:** Task 2 (Build the viewer hook state machine and lifecycle tests)
- **Issue:** `tsc -p web/tsconfig.json --noEmit` failed once the hook and jsdom test were added because the repo did not include `@types/react` or `@types/react-dom`.
- **Fix:** Installed `@types/react` and `@types/react-dom`, then re-ran the browser TypeScript build and targeted jsdom tests.
- **Files modified:** `package.json`, `package-lock.json`
- **Verification:** `npx tsc -p web/tsconfig.json --noEmit`, `npx vitest run tests/web/live-view-viewer.test.tsx`
- **Committed in:** `d91d3ba`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required to make the planned browser hook and jsdom test work in the existing workspace. No scope creep.

## Issues Encountered
- `vitest 4.1.4` still does not accept the plan's `-x` flag in this repo, so the targeted viewer test was run without `-x`. The underlying test target passed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `LiveViewerFrame` in plan `02-04` can consume `renderKind`, `activePlayback`, `bindVideoElement`, and `bindImageElement` directly without re-implementing transport rules.
- The browser layer now has explicit viewer state and fallback metadata ready for diagnostics overlays and mode controls.

## Self-Check: PASSED
- Verified `.planning/phases/02-browser-live-view-pipeline/02-03-SUMMARY.md` exists.
- Verified task commits `7a82411` and `d91d3ba` exist in git history.

---
*Phase: 02-browser-live-view-pipeline*
*Completed: 2026-04-14*
