---
phase: 01-camera-connectivity-capability-map
plan: 02
subsystem: api
tags: [reolink, session, cgi, discovery, vitest, fixtures]
requires:
  - phase: 01-camera-connectivity-capability-map
    provides: Local config persistence, shared project foundation, and fixture scaffold
provides:
  - Token-authenticated Reolink session manager with retry-on-auth-failure
  - Safe read-only discovery probes for device info, ports, and abilities
  - Sanitized request/response fixture set captured from the target RLC-423S
affects: [capability-snapshot, diagnostics, probe-cli, live-view, ptz]
tech-stack:
  added: [node-fetch-runtime, zod, vitest]
  patterns: [token-cached session execution, fixture-backed CGI parsing]
key-files:
  created: [src/camera/reolink-session.ts, src/camera/reolink-discovery.ts, tests/reolink-session.test.ts, tests/reolink-discovery.test.ts]
  modified: [src/types/reolink.ts]
key-decisions:
  - "Use `?cmd=Login` for the login bootstrap on this firmware, then switch to token-authenticated POST requests to `/cgi-bin/api.cgi?token=...` for shared request execution."
  - "Store discovery fixtures as sanitized request/response pairs so tests model real camera behavior without preserving live tokens."
patterns-established:
  - "Session handling: centralize login, token caching, auth-failure detection, and one-shot retry inside `ReolinkSession`."
  - "Discovery parsing: extract `GetDevInfo`, `GetNetPort`, and `GetAbility` through narrow helpers before building higher-level capability snapshots."
requirements-completed: [CONN-02, CONN-04]
duration: 1 min
completed: 2026-04-14
---

# Phase 1 Plan 2: Session And Discovery Summary

**Retry-capable Reolink CGI session handling with firmware-grounded discovery probes and sanitized RLC-423S fixtures**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-14T01:49:01Z
- **Completed:** 2026-04-14T01:49:30Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Built one shared login and request path that caches tokens and retries once after auth-state loss.
- Added read-only discovery helpers that extract the exact RLC-423S identity, port map, and raw ability tree.
- Captured sanitized fixtures from the live camera so session and discovery tests stay grounded in real firmware responses.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the token-authenticated Reolink session manager** - `81f0045` (feat)
2. **Task 2: Implement safe read-only discovery probes** - `fd6766b` (feat)
3. **Task 3: Store the known-good camera payload fixtures used by the discovery tests** - `0c4ffdc` (test)

## Files Created/Modified
- `src/types/reolink.ts` - Expanded shared CGI request, response, token, identity, and ability types
- `src/camera/reolink-session.ts` - Token login, cached token reuse, auth-failure detection, and retryable request execution
- `src/camera/reolink-discovery.ts` - Safe `GetDevInfo`, `GetNetPort`, `GetAbility`, and combined `probeCamera()` helpers
- `tests/reolink-session.test.ts` - Session token parsing, cache reuse, and re-login coverage
- `tests/reolink-discovery.test.ts` - Identity, port parsing, and raw ability verification coverage
- `tests/fixtures/reolink/login.json` - Sanitized login request/response pair with a placeholder token
- `tests/fixtures/reolink/get-dev-info.json` - Captured RLC-423S identity payload
- `tests/fixtures/reolink/get-net-port.json` - Captured HTTP/HTTPS/media/ONVIF/RTSP port payload
- `tests/fixtures/reolink/get-ability.json` - Captured raw ability tree proving `live`, `ptzCtrl`, and `ptzPreset`

## Decisions Made
- Standardized the bootstrap flow around `?cmd=Login` because that matches the observed firmware behavior, then kept the steady-state request path on token-authenticated POSTs.
- Kept fixtures as request/response pairs rather than response-only blobs so later debug-capture and probe work can reuse the same real-world shapes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Ready for `01-03` to normalize the raw ability tree into a reusable capability snapshot.
- The probe entrypoint can now build on stable auth and discovery primitives instead of ad hoc camera calls.

---
*Phase: 01-camera-connectivity-capability-map*
*Completed: 2026-04-14*
