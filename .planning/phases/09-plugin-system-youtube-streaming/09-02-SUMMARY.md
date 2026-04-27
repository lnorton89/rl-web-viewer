---
phase: 09-plugin-system-youtube-streaming
plan: "02"
subsystem: auth
tags: [youtube, oauth, googleapis, zod, plugins, diagnostics]
requires:
  - phase: 09-plugin-system-youtube-streaming
    provides: Static first-party plugin runtime, safe /api/plugins routes, and plugin config storage from 09-01
provides:
  - Google OAuth client dependencies for YouTube auth
  - Validated YouTube Desktop OAuth client config storage under .local/plugins/youtube
  - Server-side OAuth token store with redacted browser auth status DTOs
  - YouTube OAuth begin, callback, refresh, and revoke service
  - First-party YouTube plugin auth/config/status actions through the plugin runtime
  - Route and diagnostics redaction coverage for OAuth tokens, auth codes, client secrets, and media URLs
affects: [phase-09, youtube-streaming, plugin-runtime, diagnostics, youtube-live-api]
tech-stack:
  added: [googleapis, google-auth-library]
  patterns:
    - Injectable OAuth client factory for fake Google auth tests
    - Separate server-only token/config storage and browser-safe status builders
    - OAuth callback state persisted and verified before token exchange
key-files:
  created:
    - src/types/youtube-streaming.ts
    - src/config/youtube-config.ts
    - src/plugins/youtube/youtube-oauth.ts
    - src/plugins/youtube/youtube-plugin.ts
    - tests/plugins/youtube-oauth.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/plugins/plugin-registry.ts
    - src/server/routes/plugins.ts
    - src/diagnostics/debug-capture.ts
    - tests/server/plugin-routes.test.ts
key-decisions:
  - "Use Google Desktop OAuth client JSON import into .local/plugins/youtube rather than environment variables or bundled client credentials."
  - "Keep OAuth tokens, refresh tokens, client secrets, auth codes, and media URLs server-only; browser/plugin route payloads expose only redacted status."
  - "Keep YouTube auth actions on the existing static first-party plugin runtime instead of adding dynamic plugin loading."
patterns-established:
  - "YouTube OAuth services accept an injectable OAuth client factory for deterministic tests without real Google credentials."
  - "Plugin auth actions may return provider-specific redacted DTOs as extra payload fields while keeping generic PluginStatus intact."
requirements-completed: [PLUG-02]
duration: 10min
completed: 2026-04-27
---

# Phase 9 Plan 02: YouTube OAuth Auth Flow Summary

**YouTube Desktop OAuth config import with server-side token storage, refresh/revoke actions, and route-level secret redaction**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-27T03:14:41Z
- **Completed:** 2026-04-27T03:24:30Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added `googleapis` and `google-auth-library` through npm so `package-lock.json` reflects the installed dependency graph.
- Implemented `.local/plugins/youtube` storage for Desktop OAuth client config, callback state, and OAuth tokens with Zod validation and reload verification.
- Added YouTube OAuth begin/callback/refresh/revoke service using offline YouTube scope and state verification before token exchange.
- Replaced the Wave 1 placeholder with a first-party YouTube plugin module exposing safe config/auth/status actions through the existing plugin runtime and `/api/plugins` route.
- Extended route/debug secret guards to cover bearer tokens and OAuth auth codes, with tests proving serialized responses and sanitized debug payloads do not expose token/client/media secrets.

## Task Commits

1. **Task 0: Create Wave 0 YouTube OAuth tests** - `4684768` (test)
2. **Task 1/2: Add Google dependencies, config/token store, OAuth service, and plugin auth actions** - `20938e1` (feat)

## Files Created/Modified

- `package.json` / `package-lock.json` - Added Google client dependencies with npm.
- `src/types/youtube-streaming.ts` - Browser-safe YouTube auth/streaming DTO contracts.
- `src/config/youtube-config.ts` - Desktop OAuth client validation, token persistence, callback state paths, and redacted auth status builder.
- `src/plugins/youtube/youtube-oauth.ts` - OAuth URL generation, state persistence, callback exchange, token refresh, and revoke service.
- `src/plugins/youtube/youtube-plugin.ts` - First-party YouTube plugin config/auth/status actions.
- `src/plugins/plugin-registry.ts` - Static registry now loads the concrete YouTube plugin and supports test injection of YouTube OAuth dependencies.
- `src/server/routes/plugins.ts` - Added bearer-token unsafe payload detection.
- `src/diagnostics/debug-capture.ts` - Redacts authorization headers and OAuth auth-code fields in debug artifacts.
- `tests/plugins/youtube-oauth.test.ts` - Fake Google OAuth client coverage for config import, token persistence, begin/callback/refresh/revoke, and debug redaction.
- `tests/server/plugin-routes.test.ts` - Route-level YouTube auth action dispatch coverage with serialized secret-leak assertions.

## Decisions Made

- Desktop OAuth client JSON is imported and stored server-side under `.local/plugins/youtube/client.json`; no Google client secret is shipped or required in env vars.
- OAuth callback state is persisted in `.local/plugins/youtube/oauth-state.json` and must match before token exchange.
- Auth/config actions are available through the existing plugin route surface; live broadcast creation and FFmpeg egress remain explicitly deferred to Plan 09-03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended debug redaction for OAuth auth codes and bearer tokens**
- **Found during:** Task 2
- **Issue:** Wave 1 diagnostics redacted token fields and media URLs, but OAuth callback `code` fields and bearer authorization strings could still appear in debug artifacts.
- **Fix:** Redacted `authorization`, `code`, `authCode`, and `auth_code` keys and masked inline bearer values.
- **Files modified:** `src/diagnostics/debug-capture.ts`
- **Verification:** `npm test -- tests/plugins/plugin-runtime.test.ts tests/plugins/youtube-oauth.test.ts tests/server/plugin-routes.test.ts`
- **Committed in:** `20938e1`

**2. [Rule 3 - Blocking] Registered the concrete YouTube plugin in the static runtime**
- **Found during:** Task 2
- **Issue:** The plan's file list omitted `src/plugins/plugin-registry.ts`, but OAuth actions could not run through the runtime while Wave 1's placeholder plugin remained embedded there.
- **Fix:** Moved YouTube behavior into `src/plugins/youtube/youtube-plugin.ts` and updated the static registry to construct that plugin, with test injection for OAuth dependencies.
- **Files modified:** `src/plugins/plugin-registry.ts`, `src/plugins/youtube/youtube-plugin.ts`
- **Verification:** `npm test -- tests/plugins/plugin-runtime.test.ts tests/plugins/youtube-oauth.test.ts tests/server/plugin-routes.test.ts`
- **Committed in:** `20938e1`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both were required to meet PLUG-02 secret-boundary and runtime acceptance criteria. No Wave 3 streaming work was started.

## Known Stubs

None that block PLUG-02. YouTube live broadcast creation, ingestion URLs, FFmpeg egress, and dashboard controls remain intentionally unimplemented for Plans 09-03 and 09-04.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: oauth-token-store | `src/config/youtube-config.ts` | New server-side OAuth client and token storage under `.local/plugins/youtube`; mitigated by Zod validation, server-only DTO builders, and route/debug redaction tests. |

## Issues Encountered

- The local `gsd-sdk query` command is unavailable in this repo's installed SDK, so planning updates were made directly in markdown files.
- Task 1 and Task 2 were committed together because the RED test file imports the OAuth service and plugin runtime injection points; Task 1 verification could not pass independently without Task 2's service module.
- `npm install` reported 2 moderate vulnerabilities in the dependency tree. No `npm audit fix` was run because it was outside the plan and may alter unrelated package versions.

## Verification

- `npm test -- tests/plugins/plugin-runtime.test.ts tests/plugins/youtube-oauth.test.ts tests/server/plugin-routes.test.ts` - passed, 3 files / 19 tests.
- `npm run build` - passed (`tsc`, then Vite build). Vite emitted the existing large chunk warning.

## User Setup Required

Real YouTube OAuth still requires user setup outside the repo:

- Create/select a Google Cloud project.
- Enable YouTube Data API v3.
- Create a Desktop app OAuth client.
- Import the downloaded Desktop OAuth client JSON through the local plugin config/API flow.

No real credentials or tokens were used in tests or committed files.

## Next Phase Readiness

Plan 09-03 can build YouTube Live API resource creation and FFmpeg egress on top of the connected server-side OAuth token store. It should continue using the redacted DTO and route/debug leak tests established here, especially for RTMP(S) ingestion URLs and stream names.

## Self-Check: PASSED

- Created files exist: `src/types/youtube-streaming.ts`, `src/config/youtube-config.ts`, `src/plugins/youtube/youtube-oauth.ts`, `src/plugins/youtube/youtube-plugin.ts`, `tests/plugins/youtube-oauth.test.ts`.
- Task commits exist: `4684768`, `20938e1`.
- Verification commands passed.
- Stub scan found no PLUG-02-blocking stubs in created/modified plan files.

---
*Phase: 09-plugin-system-youtube-streaming*
*Completed: 2026-04-27*
