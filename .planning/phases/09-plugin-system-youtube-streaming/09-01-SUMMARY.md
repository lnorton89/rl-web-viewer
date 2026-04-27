---
phase: 09-plugin-system-youtube-streaming
plan: "01"
subsystem: api
tags: [fastify, zod, plugins, diagnostics, config]
requires:
  - phase: 03-live-view-enhancement
    provides: Existing live-view/media route patterns and browser-safe response guards
provides:
  - Static first-party plugin registry and runtime dispatcher
  - Browser-safe plugin DTO contracts and server-only plugin module contracts
  - Validated plugin config storage under .local/plugins/plugin.config.json
  - /api/plugins route surface for list, status, enable, disable, config, and action dispatch
  - Expanded diagnostics redaction for OAuth, RTSP, RTMP(S), stream key, and client secret values
affects: [phase-09, youtube-streaming, plugin-ui, diagnostics]
tech-stack:
  added: []
  patterns:
    - Fastify route dependency injection with lazy plugin runtime resolution
    - Static first-party plugin registration with idempotent built-in loading
    - Zod-validated read/write/reload config persistence
key-files:
  created:
    - src/types/plugins.ts
    - src/plugins/plugin-contract.ts
    - src/plugins/plugin-registry.ts
    - src/config/plugin-config.ts
    - src/server/routes/plugins.ts
    - tests/plugins/plugin-runtime.test.ts
    - tests/server/plugin-routes.test.ts
  modified:
    - src/server/create-server.ts
    - src/diagnostics/debug-capture.ts
key-decisions:
  - "Represent YouTube as a static first-party plugin runtime target without OAuth or streaming implementation in Wave 1."
  - "Use route-level unsafe payload assertions for every /api/plugins success and normalized failure response."
  - "Persist plugin enabled/config state through a validated .local/plugins/plugin.config.json store with reload verification."
patterns-established:
  - "PluginRuntime exposes list, status, enable, disable, configure, and invokeAction methods for server routes."
  - "Plugin browser DTOs contain only safe metadata: ids, labels, capabilities, status, config field metadata, action metadata, and share metadata."
requirements-completed: [PLUG-01]
duration: 8min
completed: 2026-04-27
---

# Phase 9 Plan 01: Plugin Runtime Foundation Summary

**Static first-party plugin runtime with safe Fastify APIs, validated local config, and blocking secret-leak tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-27T03:02:00Z
- **Completed:** 2026-04-27T03:10:20Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Added PLUG-01 executable tests for static registry idempotency, route status codes, server wiring, config persistence, and browser-safe payloads.
- Implemented plugin DTOs, server-only plugin contracts, static registry/runtime, and read/validate/write/verify plugin config storage.
- Mounted `/api/plugins` through `createServer` with injectable dependencies and route-level unsafe payload assertions.
- Expanded diagnostics redaction to cover OAuth token names, client secrets, RTSP URLs, RTMP(S) URLs, stream names, ingestion URLs, and camera passwords.

## Task Commits

1. **Task 0: Create Wave 0 plugin runtime tests** - `e9aacd9` (test)
2. **Task 1: Implement plugin contracts, static registry, config store, and debug redaction** - `525272c` (feat)
3. **Task 2: Add Fastify plugin routes and server wiring** - `0f463ff` (feat)

## Files Created/Modified

- `src/types/plugins.ts` - Browser-safe plugin DTO and action/config result contracts.
- `src/plugins/plugin-contract.ts` - Server-only plugin module/runtime interfaces and normalized runtime error type.
- `src/plugins/plugin-registry.ts` - Static idempotent built-in registry and runtime dispatcher.
- `src/config/plugin-config.ts` - Validated `.local/plugins/plugin.config.json` load/save store with reload verification.
- `src/server/routes/plugins.ts` - `/api/plugins` list/status/enable/disable/config/action routes with Zod parsing and unsafe payload guards.
- `src/server/create-server.ts` - Plugin route dependency option and route registration.
- `src/diagnostics/debug-capture.ts` - Expanded recursive sanitizer for plugin, OAuth, and media secrets.
- `tests/plugins/plugin-runtime.test.ts` - Runtime, config, and debug redaction coverage.
- `tests/server/plugin-routes.test.ts` - Route behavior, status-code, safety, and `createServer` mounting coverage.

## Decisions Made

- Kept plugin loading static and first-party only; no filesystem path, npm package, or browser-provided plugin code is loaded.
- Added a minimal YouTube plugin runtime target for PLUG-01 only; OAuth, YouTube API calls, FFmpeg egress, and UI remain for later Wave 2+ plans.
- Made `/api/plugins` response safety fail closed by asserting serialized payloads before `reply.send`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed route/test TypeScript build failures**
- **Found during:** Overall verification
- **Issue:** The new route used a Zod error branch TypeScript could not narrow, and the server mounting test used an invalid live-view diagnostics state.
- **Fix:** Added explicit safe error-message selection and changed the test fixture state to an existing `ViewerStateKind`.
- **Files modified:** `src/server/routes/plugins.ts`, `tests/server/plugin-routes.test.ts`
- **Verification:** `npm test -- tests/plugins/plugin-runtime.test.ts tests/server/plugin-routes.test.ts tests/debug-capture.test.ts` and `npm run build`
- **Committed in:** `0f463ff`

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Correctness-only fix required for the planned build gate. No scope expansion.

## Known Stubs

None that block PLUG-01. The YouTube plugin target is intentionally limited to the generic runtime contract in this plan; OAuth, streaming process control, and dashboard UI are assigned to Wave 2+ plans.

## Issues Encountered

- The local `gsd-sdk query` command is unavailable in this repo's installed SDK, so planning updates were made directly in markdown files.

## Verification

- `npm test -- tests/plugins/plugin-runtime.test.ts tests/server/plugin-routes.test.ts tests/debug-capture.test.ts` - passed, 3 files / 12 tests.
- `npm run build` - passed (`tsc`, then Vite build). Vite emitted the existing large chunk warning.

## User Setup Required

None - no external service configuration required for PLUG-01.

## Next Phase Readiness

Plan 09-02 can build YouTube OAuth on top of the plugin runtime by adding a concrete first-party plugin implementation behind the existing `PluginModule` contract. Secret-bearing values must remain server-only and continue to pass the route/debug redaction checks established here.

## Self-Check: PASSED

- Created files exist.
- Task commits exist: `e9aacd9`, `525272c`, `0f463ff`.
- Verification commands passed.

---
*Phase: 09-plugin-system-youtube-streaming*
*Completed: 2026-04-27*
