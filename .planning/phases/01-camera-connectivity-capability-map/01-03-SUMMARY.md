---
phase: 01-camera-connectivity-capability-map
plan: 03
subsystem: diagnostics
tags: [capabilities, debug, probe-cli, local-config, reolink]
requires:
  - phase: 01-camera-connectivity-capability-map
    provides: Shared auth/session manager, discovery helpers, and sanitized fixtures
provides:
  - Firmware-aware capability snapshot format and persistence
  - Opt-in debug artifact writer with password/token redaction
  - Local probe entrypoint verified against the live RLC-423S
affects: [live-view, ptz, settings, future-model-adapters]
tech-stack:
  added: [local probe cli, debug artifact persistence]
  patterns: [normalized capability flags, opt-in debug sidecar artifacts]
key-files:
  created: [src/camera/capability-snapshot.ts, src/diagnostics/debug-capture.ts, tests/capability-snapshot.test.ts, tests/debug-capture.test.ts]
  modified: [src/index.ts, src/config/camera-config.ts, src/camera/reolink-discovery.ts, src/camera/reolink-session.ts, tests/reolink-session.test.ts]
key-decisions:
  - "Persist normalized capability snapshots under `.local/capabilities/` using the camera host and model so later phases can reuse observed firmware behavior."
  - "Keep debug capture opt-in via config or `--debug`, with password fields redacted and token-like values masked before any artifact hits disk."
patterns-established:
  - "Capability boundary: convert raw `GetAbility` data into app-level booleans before UI code consumes it."
  - "Probe workflow: load local config, run discovery, persist snapshot, and optionally emit sanitized debug artifacts in one local-only command."
requirements-completed: [CONN-03, COMP-01, COMP-02, COMP-03]
duration: 1 min
completed: 2026-04-14
---

# Phase 1 Plan 3: Capability And Debug Summary

**Normalized capability snapshot persistence, sanitized debug capture, and a live-verified local probe command for the RLC-423S**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-14T01:54:56Z
- **Completed:** 2026-04-14T01:55:35Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Added a stable capability snapshot format that turns raw firmware abilities into app-level flags for live view, PTZ, snapshot, and config-read support.
- Implemented opt-in debug artifacts that preserve useful probe evidence without leaking raw passwords or tokens.
- Shipped a local `probe` command and verified it live against `192.168.1.140`, including snapshot persistence under `.local/capabilities/`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize and persist a firmware-aware capability snapshot** - `64e5660` (feat)
2. **Task 2: Implement opt-in debug capture with redaction** - `a983695` (feat)
3. **Task 3: Expose a local, no-cloud probe entry point for Phase 1 smoke checks** - `5bcc30d` (feat)

## Files Created/Modified
- `src/camera/capability-snapshot.ts` - Capability normalization plus local snapshot persistence
- `src/diagnostics/debug-capture.ts` - Sanitized debug artifact writer and recursive redaction helpers
- `src/index.ts` - Local `probe` entrypoint that loads config, runs discovery, saves the snapshot, and prints a concise result
- `src/config/camera-config.ts` - Added the config-backed debug toggle used by the probe command
- `src/camera/reolink-session.ts` - Exposed the configured username to downstream discovery calls
- `src/camera/reolink-discovery.ts` - Switched `GetAbility` to use the configured username when present
- `tests/capability-snapshot.test.ts` - Snapshot normalization and persistence coverage
- `tests/debug-capture.test.ts` - Password/token redaction coverage
- `tests/reolink-session.test.ts` - Updated session test config to reflect the debug toggle

## Decisions Made
- Stored capability snapshots under `.local/capabilities/` keyed by camera host and model so future phases can reuse observed behavior without reparsing raw responses.
- Left debug artifact capture off by default and enabled it through config or `--debug` so normal LAN use stays quiet while troubleshooting remains available on demand.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Use the configured username for `GetAbility` instead of hardcoding `admin`**
- **Found during:** Task 3 (Expose a local, no-cloud probe entry point for Phase 1 smoke checks)
- **Issue:** The discovery helper still assumed `admin`, which would break capability probing for any future non-default credential set.
- **Fix:** Exposed the session username and threaded it into `GetAbility`.
- **Files modified:** `src/camera/reolink-session.ts`, `src/camera/reolink-discovery.ts`
- **Verification:** `npm test` and `npm run probe` both passed after the change.
- **Committed in:** `5bcc30d`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix keeps the Phase 1 adapter reusable without changing the intended scope.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 1 is complete and ready to hand off to Phase 2 live-view planning.
- Later UI work can now rely on a real local probe path, persisted capability flags, and sanitized diagnostics instead of raw CGI assumptions.

---
*Phase: 01-camera-connectivity-capability-map*
*Completed: 2026-04-14*
