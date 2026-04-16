---
phase: 05-hardening-modular-expansion-base
plan: 01
subsystem: api
tags: [node, typescript, vitest, adapters, reolink]
requires:
  - phase: 01-camera-connectivity-capability-map
    provides: capability snapshots, discovery helpers, and fixture-backed camera probing
  - phase: 03-ptz-control-surface
    provides: PTZ service contracts and Reolink PTZ behavior
  - phase: 04-settings-safe-configuration
    provides: settings service contracts and verified write flows
provides:
  - explicit CameraAdapter contract for discovery, capabilities, live view, PTZ, settings, and failure classification
  - registry surface for resolving model adapters without leaking Reolink details upward
  - concrete RLC-423S adapter module and fixture-backed contract coverage
affects: [phase-05-plan-02, phase-05-plan-03, future-model-adapters]
tech-stack:
  added: []
  patterns: [adapter registry, adapter-owned failure classification, fixture-backed extension seam]
key-files:
  created:
    - src/camera/adapters/camera-adapter.ts
    - src/camera/adapters/reolink-rlc-423s-adapter.ts
    - docs/camera-adapters.md
  modified:
    - src/camera/adapters/index.ts
    - tests/camera/adapter-contract.test.ts
key-decisions:
  - "Keep one top-level CameraAdapter interface so future model work plugs into a single seam instead of separate discovery/live/PTZ/settings registries."
  - "Keep the existing reolink-* modules as compatibility helpers in this plan while moving ownership and failure classification onto the adapter module."
patterns-established:
  - "Model-specific behavior is registered through src/camera/adapters/index.ts and resolved by identity matching."
  - "Future adapter work must prove behavior with fixture-backed contract tests before touching shared layers."
requirements-completed: [PH5-SC1, PH5-SC4]
duration: 5 min
completed: 2026-04-15
---

# Phase 5 Plan 1: Define the explicit camera adapter contract, registry, and RLC-423S implementation seam Summary

**Explicit CameraAdapter and RLC-423S registry seam for discovery, live view, PTZ, settings, and normalized failure classification**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-15T21:41:58-07:00
- **Completed:** 2026-04-15T21:44:35-07:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added one shared `CameraAdapter` contract covering the existing model-specific camera seams.
- Registered the Phase 5 RLC-423S adapter through a dedicated registry surface and concrete adapter module.
- Documented the future-model workflow and backed the seam with contract tests plus existing PTZ/settings coverage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define the shared adapter contract, registry, and contract-first tests** - `ba39f22` (test), `fb89f50` (feat)
2. **Task 2: Implement the RLC-423S adapter and move existing camera seams behind it** - `1cb7625` (test), `02ed290` (feat)

## Files Created/Modified
- `src/camera/adapters/camera-adapter.ts` - shared camera adapter interface and service option types
- `src/camera/adapters/index.ts` - adapter registry and identity-based resolution surface
- `src/camera/adapters/reolink-rlc-423s-adapter.ts` - concrete RLC-423S adapter factory and failure classification
- `tests/camera/adapter-contract.test.ts` - contract coverage for registry ownership, extension docs, and failure normalization
- `docs/camera-adapters.md` - future-model extension instructions and fixture expectations

## Decisions Made
- Keep one adapter object responsible for discovery, capability normalization, stream resolution, PTZ service creation, settings service creation, and diagnostics classification.
- Defer route or browser rewiring to later plans and preserve the existing `reolink-*` exports as compatibility helpers in this plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- PowerShell rejected `&&` during the first commit attempt; reran the commit with PowerShell-native command separators and continued without code changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 plan 02 can consume the registry and adapter-owned failure classification without restructuring the camera stack first.
- No blockers found for the remaining hardening plans.

## Self-Check: PASSED

- Created files verified on disk: `src/camera/adapters/camera-adapter.ts`, `src/camera/adapters/index.ts`, `src/camera/adapters/reolink-rlc-423s-adapter.ts`, `tests/camera/adapter-contract.test.ts`, `docs/camera-adapters.md`
- Commits verified in git history: `ba39f22`, `fb89f50`, `1cb7625`, `02ed290`

---
*Phase: 05-hardening-modular-expansion-base*
*Completed: 2026-04-15*
