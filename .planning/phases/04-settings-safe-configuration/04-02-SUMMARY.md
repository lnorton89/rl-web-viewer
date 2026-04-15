---
phase: 04-settings-safe-configuration
plan: 02
subsystem: api
tags: [fastify, settings, zod, vitest, reolink]
requires:
  - phase: 04-settings-safe-configuration
    provides: Shared settings DTOs, metadata-driven field specs, and verified settings service behavior
  - phase: 03-ptz-control-surface
    provides: Mounted Fastify control-plane pattern beside live view
provides:
  - Browser-safe Fastify settings bootstrap and apply routes
  - Mounted settings API surface on the existing live-view and PTZ control plane
  - Metadata-driven route validation for field-level and section-level settings failures
affects: [settings-panel, control-plane, fastify-routes, settings-api]
tech-stack:
  added: [none]
  patterns: [metadata-driven route validation, Fastify-owned settings control plane, TDD route implementation]
key-files:
  created: [src/server/routes/settings.ts, tests/server/settings-routes.test.ts]
  modified: [src/server/create-server.ts]
key-decisions:
  - "Derive route validation from shared settings fieldSpecs so numeric bounds and select options stay aligned with the service/bootstrap contract."
  - "Return structured 409/422 settings failures with fieldErrors and optional sectionError so the browser can distinguish unsupported writes from rejected values."
patterns-established:
  - "Settings route pattern: resolve an injected SettingsService once per plugin, assert browser-safe payloads, and validate drafts from shared metadata before calling applySection()."
  - "Mounted server pattern: register settings after PTZ so live view, PTZ, and settings share one Fastify-owned LAN control plane."
requirements-completed: [CONF-01, CONF-03, CONF-04]
duration: 7 min
completed: 2026-04-15
---

# Phase 4 Plan 2: Settings Safe Configuration Summary

**Browser-safe Fastify settings routes with metadata-driven validation and verified apply responses mounted beside live view and PTZ**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-15T19:52:00Z
- **Completed:** 2026-04-15T19:59:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `settingsRoutes` with `/api/settings` bootstrap and `/api/settings/:sectionId/apply` endpoints that reject unsafe payloads before they reach the browser.
- Validated editable section drafts from shared `fieldSpecs`, `constraints`, and `options` metadata so route-level field errors stay aligned with the service contract.
- Mounted the settings plugin in `createServer()` and expanded server coverage to exercise `/api/settings`, `/api/live-view`, and `/api/ptz` through one Fastify app.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the settings route plugin with exact section apply contracts and precise error payloads** - `6693dd6` (test), `77a6f8f` (feat)
2. **Task 2: Mount settings routes in the app server and finish control-plane coverage** - `9809046` (feat)

_Note: Task 1 followed TDD and produced separate RED and GREEN commits._

## Files Created/Modified
- `src/server/routes/settings.ts` - Defines the browser-safe settings Fastify plugin, metadata-driven validation, and structured apply failures.
- `src/server/create-server.ts` - Accepts settings route dependencies and registers the settings plugin on the shared control plane.
- `tests/server/settings-routes.test.ts` - Covers browser-safe bootstrap behavior, field errors, section-level failures, verified apply responses, and mounted server behavior.

## Decisions Made
- Kept route validation coupled to shared field metadata instead of duplicating slider bounds or select options in route-local schemas.
- Kept read-only or unsupported sections on structured `409` responses so the browser can render a section-level rejection without guessing.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed TypeScript build blockers in the new route helper types and test doubles**
- **Found during:** Task 2 (Mount settings routes in the app server and finish control-plane coverage)
- **Issue:** `npm run build:server` failed because the new route helper used a recursively-defined type alias and the test helper returned an over-constrained generic mock for `SettingsService.applySection()`.
- **Fix:** Replaced the recursive alias with an interface-based tree type and split the test helper into a concrete `service` object plus explicit mock handles.
- **Files modified:** `src/server/routes/settings.ts`, `tests/server/settings-routes.test.ts`
- **Verification:** `npm run build:server`, `npx vitest run tests/server/settings-routes.test.ts --project node`
- **Committed in:** `9809046`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required to complete the planned build and mounted-route verification. No scope creep.

## Issues Encountered
- The plan’s documented `vitest ... -x` command is not supported by `vitest@4.1.4`, so verification used the equivalent non-watch run command without `-x`.
- Fastify rejects a raw string POST payload with `415` before route code runs, so the malformed-body test was adjusted to use a JSON array and exercise the route’s own `400` body-shape branch.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The dashboard can now call `/api/settings` and `/api/settings/:sectionId/apply` from the same Fastify surface that already serves live view and PTZ.
- Plan `04-03` can build the settings panel directly against structured field metadata, field-level validation errors, section-level rejections, and verified before/after apply responses.

## Known Stubs

None.

## Self-Check: PASSED
- Verified `.planning/phases/04-settings-safe-configuration/04-02-SUMMARY.md` exists.
- Verified task commits `6693dd6`, `77a6f8f`, and `9809046` exist in git history.
