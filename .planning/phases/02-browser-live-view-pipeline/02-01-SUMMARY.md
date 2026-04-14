---
phase: 02-browser-live-view-pipeline
plan: 01
subsystem: ui
tags: [react, vite, fastify, vitest, live-view]
requires:
  - phase: 01-camera-connectivity-capability-map
    provides: Persisted capability snapshots and normalized firmware-aware camera flags
provides:
  - Browser live-view workspace with Vite, React, and Fastify-ready dependencies
  - Shared live-view transport, playback, bootstrap, and diagnostics contracts
  - Capability-gated startup and fallback mode ladder for browser-safe live view
affects: [mediamtx-runtime, fastify-live-view-routes, viewer-ui]
tech-stack:
  added: [fastify, @fastify/static, react, react-dom, vite, @vitejs/plugin-react, hls.js, jsdom, @testing-library/react, @testing-library/user-event]
  patterns: [split vitest node-jsdom projects, shared playback endpoint contract, capability-gated live-mode ladder]
key-files:
  created: [web/vite.config.ts, web/tsconfig.json, web/index.html, tests/web/browser-workspace.test.tsx, src/types/live-view.ts, src/media/live-view-modes.ts, tests/media/live-mode-selection.test.ts]
  modified: [package.json, package-lock.json, vitest.config.ts]
key-decisions:
  - "Keep browser playback URLs in a shared `LiveViewPlayback` contract so backend routes own WHEP/HLS/snapshot path construction and the viewer only consumes typed endpoints."
  - "Encode the startup and fallback ladder as `webrtc:main -> webrtc:sub -> hls:sub -> snapshot:main` while still exposing `hls:main` and `snapshot:sub` as manual-capability options."
patterns-established:
  - "Workspace split: run browser smoke tests in jsdom while keeping the rest of the repo in a node Vitest environment."
  - "Mode matrix: derive enabled live-view modes from persisted capability flags and RTSP/snapshot support before any UI renders."
requirements-completed: [LIVE-01, LIVE-02]
duration: 7 min
completed: 2026-04-14
---

# Phase 2 Plan 1: Browser Live View Workspace Summary

**React/Vite browser workspace bootstrap with shared live-view playback contracts and a capability-gated mode-selection ladder**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-14T21:58:00Z
- **Completed:** 2026-04-14T22:05:01Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Added the Phase 2 browser toolchain, including Fastify/React/Vite dependencies, a dedicated `web/` workspace, and split Vitest environments for node and jsdom coverage.
- Defined shared live-view contracts so future backend and frontend plans can exchange typed transport, quality, playback, bootstrap, and diagnostics data without reconstructing URLs ad hoc.
- Locked the capability-driven startup and fallback ladder in code and tests before MediaMTX, server routes, or viewer components branch into later plans.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the browser live-view toolchain and dual-environment test setup** - `1794dbb` (chore)
2. **Task 2: Define the shared live-view contract and capability-driven mode matrix** - `473d7e1` (feat)

## Files Created/Modified
- `package.json` - Added the browser live-view dependencies and the `build:web`, `build:server`, and `dev:web` scripts.
- `package-lock.json` - Locked the new browser stack packages for reproducible installs.
- `vitest.config.ts` - Split Vitest into node and jsdom projects so browser tests stay isolated.
- `web/vite.config.ts` - Established the Vite browser workspace with React, localhost dev settings, manifest output, and explicit `web/index.html` input.
- `web/tsconfig.json` - Added browser-focused TypeScript settings for JSX and DOM libraries.
- `web/index.html` - Added the initial app mount point for the browser dashboard.
- `tests/web/browser-workspace.test.tsx` - Added a jsdom smoke test for the app mount and Vite workspace settings.
- `src/types/live-view.ts` - Added the shared live-view transport, playback, bootstrap, and diagnostics contracts.
- `src/media/live-view-modes.ts` - Encoded the capability-aware live-mode matrix, preferred-mode selection, and fallback order.
- `tests/media/live-mode-selection.test.ts` - Added coverage for startup order, snapshot-disabled behavior, and snapshot-only fallback when `supportsLiveView` is false.

## Decisions Made
- Shared live-view data is now expressed through typed contracts in `src/types/live-view.ts`, which keeps browser endpoint construction on the backend side of the boundary.
- The browser workspace is validated in-repo with a dedicated jsdom smoke test instead of relying on later viewer tests to prove the toolchain works.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stabilized the browser workspace test against Vitest's transformed module URLs**
- **Found during:** Task 1 (Add the browser live-view toolchain and dual-environment test setup)
- **Issue:** Reading `web/index.html` through `import.meta.url` failed under the jsdom test runtime because the transformed module URL was not a file URL.
- **Fix:** Switched the test to read `web/index.html` from an explicit repo-relative path.
- **Files modified:** `tests/web/browser-workspace.test.tsx`
- **Verification:** `npx vitest run tests/web/browser-workspace.test.tsx`
- **Committed in:** `1794dbb`

**2. [Rule 3 - Blocking] Corrected the browser TypeScript config for config-file imports**
- **Found during:** Task 1 (Add the browser live-view toolchain and dual-environment test setup)
- **Issue:** `web/tsconfig.json` initially referenced a nonexistent `jsdom` type library and TypeScript rejected the `web/vite.config.ts` import used by the smoke test.
- **Fix:** Removed the invalid `jsdom` type entry and enabled `allowImportingTsExtensions` so the test could import the Vite config directly.
- **Files modified:** `web/tsconfig.json`
- **Verification:** `npx tsc -p web/tsconfig.json --noEmit`
- **Committed in:** `1794dbb`

**3. [Rule 3 - Blocking] Added an explicit Vite HTML input while keeping the required `root: "."`**
- **Found during:** Task 1 (Add the browser live-view toolchain and dual-environment test setup)
- **Issue:** `vite build --config web/vite.config.ts` resolved `index.html` from the repo root and failed before the workspace could build.
- **Fix:** Added `build.rollupOptions.input = "web/index.html"` to point the planned build command at the browser entry file.
- **Files modified:** `web/vite.config.ts`
- **Verification:** `npx vite build --config web/vite.config.ts`
- **Committed in:** `1794dbb`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All three fixes were required to make the planned browser workspace and verification commands function on the current toolchain. No scope creep.

## Issues Encountered
- `vitest 4.1.4` no longer accepts the plan's `-x` flag. Equivalent targeted test runs were executed without `-x`, and the underlying tests/builds still passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 now has a working browser workspace, shared live-view types, and a tested mode-selection ladder for the backend routing and viewer plans to build on.
- Later plans can consume `src/types/live-view.ts` and `src/media/live-view-modes.ts` directly instead of re-deciding playback endpoints or startup order.

## Self-Check: PASSED
- Verified `.planning/phases/02-browser-live-view-pipeline/02-01-SUMMARY.md` exists.
- Verified task commits `1794dbb` and `473d7e1` exist in git history.

---
*Phase: 02-browser-live-view-pipeline*
*Completed: 2026-04-14*
