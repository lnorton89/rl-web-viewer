---
phase: 09-plugin-system-youtube-streaming
plan: "04"
subsystem: ui
tags: [react, mui, plugins, youtube, streaming, jsdom]
requires:
  - phase: 09-plugin-system-youtube-streaming
    provides: Plugin runtime, YouTube OAuth, and YouTube egress contracts from 09-01 through 09-03
provides:
  - Typed browser clients for `/api/plugins` and YouTube streaming plugin actions
  - React hooks for generic plugin state and YouTube streaming command state
  - Dashboard navigation entry for plugin and YouTube streaming controls
  - YouTube panel with auth, setup, start, stop, refresh, revoke, status, and safe watch URL share controls
  - jsdom coverage for PLUG-04 state rendering and browser secret-boundary assertions
affects: [phase-09, plugin-ui, youtube-streaming, dashboard]
tech-stack:
  added: []
  patterns:
    - "API clients keep `/api/plugins` fetch details isolated from components."
    - "Hooks own async status/action state and abort initial fetches on unmount."
    - "YouTube UI renders safe DTO fields only and sanitizes forbidden secret-like strings before DOM output."
key-files:
  created:
    - web/src/lib/plugin-api.ts
    - web/src/lib/youtube-streaming-api.ts
    - web/src/hooks/use-plugins.ts
    - web/src/hooks/use-youtube-streaming.ts
    - web/src/components/PluginPanel.tsx
    - web/src/components/YoutubeStreamingPanel.tsx
    - tests/web/plugin-panel.test.tsx
  modified:
    - web/src/components/LayoutShell.tsx
    - web/src/App.tsx
key-decisions:
  - "Use the existing `/api/plugins/:pluginId/actions/:actionId` route surface for all YouTube UI commands rather than adding a separate browser route."
  - "Require explicit checkbox confirmation in the panel before invoking a public broadcast start."
  - "Sanitize rendered panel text defensively even though server DTOs are already expected to be browser-safe."
patterns-established:
  - "Plugin dashboard sections are wired through `LayoutShell` and `App.tsx` like existing Live View and Settings sections."
  - "Share controls copy/open only validated YouTube watch URLs and never render ingestion or stream-key metadata."
requirements-completed: [PLUG-04]
duration: 9min
completed: 2026-04-27
---

# Phase 9 Plan 04: Dashboard Plugin Panel Summary

**React plugin dashboard with YouTube streaming controls, safe watch sharing, and DOM-level secret-leak tests**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-27T03:43:02Z
- **Completed:** 2026-04-27T03:51:50Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added PLUG-04 jsdom coverage for navigation, YouTube auth/setup/runtime/lifecycle states, disabled start prerequisites, public-start confirmation, safe share controls, and DOM secret blocking.
- Implemented typed plugin and YouTube browser API clients plus hooks for initial status loading, action state, safe error messages, refresh-after-action behavior, and unmount aborts.
- Wired a new Plugins navigation destination into the dashboard and added panels for plugin runtime status and YouTube streaming controls.
- Added defensive UI sanitization so token names, client secret labels, RTSP/RTMP(S) URLs, stream names, and camera credential-like text are not rendered if a future unsafe DTO slips through.

## Task Commits

1. **Task 0: Create Wave 0 plugin panel tests** - `fb6b0d9` (test)
2. **Task 1/2: Implement browser API clients, hooks, panels, and navigation wiring** - `283a147` (feat)

## Files Created/Modified

- `web/src/lib/plugin-api.ts` - Typed fetch helpers for plugin list/status/config/enable/disable/action APIs.
- `web/src/lib/youtube-streaming-api.ts` - YouTube-specific wrappers over safe plugin actions.
- `web/src/hooks/use-plugins.ts` - Generic plugin list/action hook with loading, error, pending action, refresh, and abort handling.
- `web/src/hooks/use-youtube-streaming.ts` - YouTube status/action hook for auth, setup, start, stop, refresh, revoke, and status reload.
- `web/src/components/PluginPanel.tsx` - Plugin dashboard entry point with runtime status and YouTube panel composition.
- `web/src/components/YoutubeStreamingPanel.tsx` - YouTube auth, stream lifecycle, runtime, public confirmation, and safe watch URL UI.
- `web/src/components/LayoutShell.tsx` - Added Plugins navigation item.
- `web/src/App.tsx` - Added Plugins section render branch.
- `tests/web/plugin-panel.test.tsx` - PLUG-04 component, hook, API, and DOM secret-boundary coverage.
- `.planning/phases/09-plugin-system-youtube-streaming/deferred-items.md` - Deferred full-suite issue outside Wave 4 file ownership.

## Decisions Made

- Kept YouTube UI commands on the existing plugin action route surface to avoid adding another browser API boundary.
- Treated public broadcast start as a two-step UI action: user clicks Start, then must check the public confirmation box before the hook action is invoked.
- Displayed only YouTube watch URLs for share controls and validated the host/protocol before copy/open.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added defensive UI text and URL sanitization**
- **Found during:** Task 2
- **Issue:** The plan requires the dashboard to never render token names, OAuth/client secrets, RTSP URLs, RTMP(S) ingestion URLs, stream names, or camera credentials. The server should already enforce this, but component tests intentionally passed unsafe strings through mocked hooks.
- **Fix:** Added panel-level forbidden-pattern filtering for visible text and strict YouTube watch URL validation before copy/open controls.
- **Files modified:** `web/src/components/YoutubeStreamingPanel.tsx`, `tests/web/plugin-panel.test.tsx`
- **Verification:** `npm test -- tests/web/plugin-panel.test.tsx`
- **Committed in:** `283a147`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Strengthened the browser secret boundary without adding new product scope.

## Known Stubs

None. The UI depends on existing plugin route DTOs and test doubles only in jsdom coverage; no placeholder UI data is hardcoded into production components.

## Threat Flags

None. This plan added browser-side API clients and UI only; it did not add new network endpoints, auth storage, file access, or server-side trust boundaries.

## Issues Encountered

- The local `gsd-sdk query` command is unavailable in this repo's installed SDK, matching earlier Phase 9 summaries, so planning updates were made directly in markdown files.
- `npm test` has one out-of-scope failure in `tests/plugins/plugin-runtime.test.ts`: it expects public privacy configuration to reject, while Wave 09-03 changed the server contract to allow public config and enforce confirmation at setup/start. This was recorded in `deferred-items.md` instead of editing a non-owned file.
- Vite still emits the existing large chunk warning during build.

## Verification

- `npm test -- tests/web/plugin-panel.test.tsx` - passed, 1 file / 15 tests.
- `npm run build` - passed (`tsc`, then Vite build). Vite emitted the existing large chunk warning.
- `npm test` - failed with 31 files / 173 tests passing and 1 out-of-scope failing test in `tests/plugins/plugin-runtime.test.ts`.

## User Setup Required

Real YouTube use still requires the setup from prior waves:

- Import a Desktop OAuth client JSON through the local plugin config/API flow.
- Complete YouTube OAuth consent.
- Install FFmpeg or set `FFMPEG_PATH`.
- Use a YouTube channel eligible for live streaming.

## Next Phase Readiness

PLUG-04 UI integration is complete. Before treating the whole repository as fully green, update the stale public-privacy runtime test noted in `deferred-items.md`.

## Self-Check: PASSED

- Created files exist: `web/src/lib/plugin-api.ts`, `web/src/lib/youtube-streaming-api.ts`, `web/src/hooks/use-plugins.ts`, `web/src/hooks/use-youtube-streaming.ts`, `web/src/components/PluginPanel.tsx`, `web/src/components/YoutubeStreamingPanel.tsx`, `tests/web/plugin-panel.test.tsx`.
- Task commits exist: `fb6b0d9`, `283a147`.
- Focused PLUG-04 verification and build passed.
- Full-suite residual failure is documented as out of scope.

---
*Phase: 09-plugin-system-youtube-streaming*
*Completed: 2026-04-27*
