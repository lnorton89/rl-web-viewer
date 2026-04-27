---
phase: 09-plugin-system-youtube-streaming
plan: "03"
subsystem: media
tags: [youtube, ffmpeg, googleapis, plugins, process-lifecycle, redaction]
requires:
  - phase: 09-plugin-system-youtube-streaming
    provides: Plugin runtime and YouTube OAuth token storage from 09-01 and 09-02
provides:
  - YouTube Live API adapter for live stream/broadcast setup, bind, status, ingestion, and transitions
  - Browser-safe persisted YouTube stream metadata in plugin config values
  - FFmpeg RTSP-to-RTMPS argument builder with redaction helpers
  - FFmpeg availability checks with actionable unavailable status
  - Supervised, idempotent YouTube egress start/stop/status service
  - YouTube plugin stream.setup, stream.start, stream.stop, and stream.status actions
affects: [phase-09, youtube-streaming, plugin-ui, media-egress]
tech-stack:
  added: []
  patterns:
    - Injectable YouTube Live API, OAuth, FFmpeg runtime, camera source, and process runner dependencies
    - Secret-bearing process arguments are built server-side and only redacted diagnostics leave the service
    - Plugin stream actions return accepted=false safe status for unavailable prerequisites
key-files:
  created:
    - src/plugins/youtube/youtube-live-api.ts
    - src/media/youtube-ffmpeg-config.ts
    - src/media/youtube-runtime.ts
    - src/media/youtube-stream-service.ts
    - tests/plugins/youtube-live-workflow.test.ts
    - tests/media/youtube-egress.test.ts
  modified:
    - src/types/youtube-streaming.ts
    - src/plugins/youtube/youtube-oauth.ts
    - src/plugins/youtube/youtube-plugin.ts
    - tests/server/plugin-routes.test.ts
key-decisions:
  - "Use FFmpeg discovery/unavailable status rather than adding a downloader in Wave 3."
  - "Persist only safe YouTube resource IDs and share metadata; treat ingestionInfo and process args as server-only secrets."
  - "Allow public privacy in config but block public setup/start unless the action body explicitly confirms it."
patterns-established:
  - "YouTube egress service owns process lifecycle state and exposes browser-safe streaming status DTOs."
  - "Default YouTube Live API construction uses the stored OAuth token path from the Wave 2 service."
requirements-completed: [PLUG-03]
duration: 8min
completed: 2026-04-27
---

# Phase 9 Plan 03: YouTube Live Egress Lifecycle Summary

**YouTube Live setup plus idempotent FFmpeg RTSP-to-RTMPS egress with strict browser-safe status and diagnostics**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-27T03:30:05Z
- **Completed:** 2026-04-27T03:38:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added mocked PLUG-03 workflow tests for setup, missing prerequisites, start/stop idempotency, process redaction, and route browser-safety.
- Implemented a YouTube Live API adapter for stream/broadcast creation, binding, stream health, ingestion lookup, and lifecycle transition.
- Added FFmpeg egress helpers and service orchestration that launches at most one process, redacts RTSP/RTMP(S)/stream-key material, and reports actionable unavailable states.
- Wired YouTube plugin stream actions through the existing plugin runtime without starting Wave 4 UI work.

## Task Commits

1. **Task 0: Create Wave 0 YouTube streaming workflow tests** - `9d2cfb9` (test)
2. **Task 1/2: Implement YouTube Live API, FFmpeg egress service, and plugin actions** - `66ec4df` (feat)
3. **Auto-fix: Attach OAuth client to default YouTube Live API** - `8b42c3a` (fix)

## Files Created/Modified

- `src/plugins/youtube/youtube-live-api.ts` - YouTube Live API adapter with setup, ingestion, stream status, and transition helpers.
- `src/media/youtube-ffmpeg-config.ts` - Pure FFmpeg argument construction and redaction helpers.
- `src/media/youtube-runtime.ts` - FFmpeg executable availability checks and disabled-state reason.
- `src/media/youtube-stream-service.ts` - Egress workflow service with injected adapters, singleton process state, start/stop/status, and sanitized diagnostics.
- `src/plugins/youtube/youtube-plugin.ts` - Stream setup/start/stop/status plugin actions and safe metadata persistence.
- `src/plugins/youtube/youtube-oauth.ts` - Authenticated OAuth client creation for default Live API calls.
- `src/types/youtube-streaming.ts` - Extended stream status and persisted metadata contracts.
- `tests/plugins/youtube-live-workflow.test.ts` - Mocked YouTube Live workflow and plugin-runtime coverage.
- `tests/media/youtube-egress.test.ts` - FFmpeg args, runtime unavailable, process lifecycle, and redaction coverage.
- `tests/server/plugin-routes.test.ts` - Adjusted route validation coverage for public privacy handling.

## Decisions Made

- FFmpeg is discovered from `FFMPEG_PATH` or `ffmpeg` on PATH; missing FFmpeg disables start with an actionable reason instead of crashing.
- Setup may create YouTube resources with connected auth even if FFmpeg/camera source is not currently available; start enforces all runtime prerequisites.
- Public broadcasts are allowed as saved config values for future UI control, but setup/start require explicit `confirmPublic: true`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Attached stored OAuth credentials to default YouTube Live API client**
- **Found during:** Final review before summary
- **Issue:** The initial default Live API factory created a googleapis YouTube client without applying the Wave 2 stored OAuth credentials.
- **Fix:** Exposed `createAuthenticatedClient()` from the OAuth service and wrapped the default Live API factory so each Live API call uses the stored token credentials.
- **Files modified:** `src/plugins/youtube/youtube-oauth.ts`, `src/plugins/youtube/youtube-plugin.ts`
- **Verification:** `npm test -- tests/plugins/youtube-live-workflow.test.ts tests/media/youtube-egress.test.ts tests/server/plugin-routes.test.ts`; `npm run build`
- **Committed in:** `8b42c3a`

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Correctness/security integration fix only. No Wave 4 UI work or real credential/process use was added.

## Known Stubs

None that block PLUG-03. Tests use fake YouTube, OAuth, camera-source, runtime, and process adapters by design; no real YouTube credentials, camera credentials, stream keys, or FFmpeg process are used.

## Issues Encountered

- The local `gsd-sdk query` command is unavailable in this repo's installed SDK, so planning updates were made directly in markdown files.
- Vite still emits the existing large chunk warning during build; this is unrelated to Wave 3.

## Verification

- `npm test -- tests/plugins/youtube-live-workflow.test.ts tests/media/youtube-egress.test.ts tests/server/plugin-routes.test.ts` - passed, 3 files / 15 tests.
- `npm run build` - passed (`tsc`, then Vite build). Vite emitted the existing large chunk warning.

## User Setup Required

Real streaming still requires user-provided setup outside committed files:

- Install FFmpeg or set `FFMPEG_PATH` to a local executable.
- Ensure the YouTube channel is eligible for live streaming.
- Complete the Wave 2 Desktop OAuth client import and auth consent flow.

## Next Phase Readiness

Plan 09-04 can build dashboard controls against the existing plugin route actions and share metadata. UI code should continue to treat `stream.setup`, `stream.start`, `stream.stop`, and `stream.status` responses as browser-safe DTOs and never render ingestion URLs, stream names, RTSP URLs, OAuth tokens, or process args.

## Self-Check: PASSED

- Created files exist: `src/plugins/youtube/youtube-live-api.ts`, `src/media/youtube-ffmpeg-config.ts`, `src/media/youtube-runtime.ts`, `src/media/youtube-stream-service.ts`, `tests/plugins/youtube-live-workflow.test.ts`, `tests/media/youtube-egress.test.ts`.
- Task commits exist: `9d2cfb9`, `66ec4df`, `8b42c3a`.
- Verification commands passed.
- Stub scan found no PLUG-03-blocking stubs in created/modified plan files.

---
*Phase: 09-plugin-system-youtube-streaming*
*Completed: 2026-04-27*
