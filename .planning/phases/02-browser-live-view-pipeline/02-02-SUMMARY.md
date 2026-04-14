---
phase: 02-browser-live-view-pipeline
plan: 02
subsystem: api
tags: [fastify, mediamtx, reolink, rtsp, whep, hls, vitest]
requires:
  - phase: 02-browser-live-view-pipeline
    provides: Shared live-view types, mode selection, and browser workspace build settings
  - phase: 01-camera-connectivity-capability-map
    provides: Persisted camera config, capability snapshots, and Reolink session handling
provides:
  - Pinned MediaMTX runtime bootstrap and generic relay config generation
  - Adapter-owned Reolink RTSP path mapping for the RLC-423S live streams
  - Fastify live-view bootstrap, snapshot proxy, and relay health endpoints
affects: [viewer-ui, relay-health, snapshot-fallback]
tech-stack:
  added: [none]
  patterns: [adapter-owned stream mapping, browser-safe bootstrap serialization, Fastify-owned credential boundary]
key-files:
  created: [src/camera/reolink-live-streams.ts, src/media/mediamtx-runtime.ts, src/media/mediamtx-config.ts, src/media/live-view-service.ts, src/server/create-server.ts, src/server/routes/live-view.ts, tests/media/mediamtx-runtime-config.test.ts, tests/media/live-view-errors.test.ts, tests/server/live-view-routes.test.ts]
  modified: [src/camera/capability-snapshot.ts, src/types/live-view.ts, src/index.ts, package.json]
key-decisions:
  - "Keep firmware-specific RTSP suffixes in `src/camera/reolink-live-streams.ts` so the generic media layer only sees app-owned relay paths and source URLs."
  - "Validate `/api/live-view` responses against a browser-safe serialization boundary so camera credentials, tokens, and raw RTSP URLs cannot leak through future backend changes."
  - "Start the Fastify app by default and make `probe` an explicit subcommand so the repo can serve the browser API without losing the Phase 1 discovery path."
patterns-established:
  - "Relay bootstrap pattern: load persisted config and capability state, resolve adapter streams, write MediaMTX config, and then expose only WHEP/HLS/snapshot app URLs."
  - "Route ownership pattern: Fastify routes translate backend state into a constrained JSON contract and proxy camera snapshots server-side."
requirements-completed: [LIVE-01, LIVE-02, LIVE-03]
duration: 15 min
completed: 2026-04-14
---

# Phase 2 Plan 2: Browser Live View Control Plane Summary

**Pinned MediaMTX relay bootstrap with browser-safe live-view routes and a Fastify-owned snapshot proxy for the RLC-423S**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-14T22:05:00Z
- **Completed:** 2026-04-14T22:20:49Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Added a pinned Windows MediaMTX bootstrap flow, generic relay config generation, and adapter-owned Reolink RTSP source mapping for the known RLC-423S firmware.
- Implemented a live-view service that builds browser-safe WHEP, HLS, and snapshot playback URLs from persisted config and capability state, with failure classification and sanitized debug artifacts.
- Exposed the live-view backend through Fastify with `/api/live-view`, `/api/live-view/snapshot/:quality`, and `/api/live-view/health`, then switched the default entrypoint to the app server while preserving `probe`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the pinned MediaMTX runtime, adapter-backed stream mapping, and live-view bootstrap service** - `ec85771` (feat)
2. **Task 2: Expose the live-view bootstrap, snapshot proxy, and static dashboard routes through Fastify** - `b5bc7ef` (feat)

## Files Created/Modified
- `src/camera/reolink-live-streams.ts` - Resolves the RLC-423S main/sub RTSP suffixes into adapter-owned source URLs.
- `src/media/mediamtx-runtime.ts` - Pins MediaMTX `v1.17.1`, the official Windows zip name, and the local runtime install path.
- `src/media/mediamtx-config.ts` - Generates `.local/runtime/mediamtx.yml` with `camera_main` and `camera_sub` relay paths.
- `src/media/live-view-service.ts` - Builds browser-safe bootstrap payloads, starts the relay, tracks relay health, and classifies failures.
- `src/server/create-server.ts` - Creates the Fastify app, registers static serving, and mounts the live-view route module.
- `src/server/routes/live-view.ts` - Owns the bootstrap, snapshot proxy, and relay health endpoints plus response sanitization.
- `src/index.ts` - Starts Fastify by default, starts the relay, and keeps `probe` available as an explicit command.
- `src/camera/capability-snapshot.ts` - Added persisted capability snapshot loading for the live-view bootstrap path.
- `src/types/live-view.ts` - Extended the shared bootstrap contract with diagnostics and per-mode disabled reasons.
- `tests/media/mediamtx-runtime-config.test.ts` - Covers runtime pinning and relay config generation.
- `tests/media/live-view-errors.test.ts` - Covers failure classification, no-supported-mode behavior, and safe playback URL hydration.
- `tests/server/live-view-routes.test.ts` - Covers the Fastify JSON contract, credential leakage guardrails, and invalid snapshot quality handling.
- `package.json` - Updated the `probe` script to use the new explicit subcommand.

## Decisions Made
- Live-view relay configuration stays generic in the media layer; only the camera adapter knows the firmware-specific RTSP suffixes.
- `/api/live-view` rejects unsafe bootstrap payloads if they ever contain `baseUrl`, `username`, `password`, `token=`, or raw RTSP URLs.
- The app starts Fastify even when the relay cannot come up, and reports relay state through `/api/live-view/health` instead of failing startup outright.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added persisted capability loading and richer shared diagnostics fields**
- **Found during:** Task 1 (Build the pinned MediaMTX runtime, adapter-backed stream mapping, and live-view bootstrap service)
- **Issue:** The existing Phase 01 snapshot module only wrote capability files, and the shared live-view contract did not yet include the diagnostics/disabled-reason fields the bootstrap service needed.
- **Fix:** Added `loadCapabilitySnapshot()` plus the missing `diagnostics` and `disabledReason` contract fields so the bootstrap path could read persisted state and describe failures cleanly.
- **Files modified:** `src/camera/capability-snapshot.ts`, `src/types/live-view.ts`
- **Verification:** `npx vitest run tests/media/mediamtx-runtime-config.test.ts tests/media/live-view-errors.test.ts`, `npm run build:server`
- **Committed in:** `ec85771`

**2. [Rule 3 - Blocking] Kept the existing Vite output layout while making Fastify static serving work**
- **Found during:** Task 2 (Expose the live-view bootstrap, snapshot proxy, and static dashboard routes through Fastify)
- **Issue:** The Phase 01 browser workspace currently builds assets into `dist/web`, while the plan text referenced `web/dist`.
- **Fix:** Implemented Fastify static-root resolution that prefers `web/dist` if it exists but falls back to the current `dist` output so the existing workspace contract remains valid.
- **Files modified:** `src/server/create-server.ts`
- **Verification:** `npm run build:web`, startup smoke test against `GET /api/live-view/health`
- **Committed in:** `b5bc7ef`

**3. [Rule 3 - Blocking] Updated the repo `probe` script after changing the default entrypoint behavior**
- **Found during:** Task 2 (Expose the live-view bootstrap, snapshot proxy, and static dashboard routes through Fastify)
- **Issue:** Switching `src/index.ts` to start Fastify by default would have broken the existing `npm run probe` command unless it passed the new `probe` subcommand explicitly.
- **Fix:** Updated `package.json` so `npm run probe` now runs `node --import tsx src/index.ts probe`.
- **Files modified:** `package.json`
- **Verification:** `npm run probe`
- **Committed in:** `b5bc7ef`

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 blocking)
**Impact on plan:** All deviations were needed to make the planned server/control-plane work correctly on the current repo layout. No scope creep.

## Issues Encountered
- `vitest 4.1.4` does not accept the plan's `-x` flag. Equivalent targeted test runs were executed without `-x`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The repo now exposes the browser-facing backend contract the viewer UI can consume directly: safe bootstrap metadata, app-owned snapshot URLs, and relay health.
- The next live-view UI plan can build against `/api/live-view` and `/api/live-view/health` without needing camera credentials or RTSP URL knowledge in the browser.

## Self-Check: PASSED
- Verified `.planning/phases/02-browser-live-view-pipeline/02-02-SUMMARY.md` exists.
- Verified task commits `ec85771` and `b5bc7ef` exist in git history.

---
*Phase: 02-browser-live-view-pipeline*
*Completed: 2026-04-14*
