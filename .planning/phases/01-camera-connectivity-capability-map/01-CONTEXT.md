# Phase 1: Camera Connectivity & Capability Map - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish reliable local authentication, device discovery, session recovery, capability detection, and debug capture for the specific RLC-423S firmware in this project. This phase defines how the app connects to and understands the camera; live view, PTZ UI, and settings UI are separate later phases.

</domain>

<decisions>
## Implementation Decisions

### Connection Setup
- **D-01:** Phase 1 should use a first-run local config file for camera connection details rather than environment variables or hardcoded values.
- **D-02:** The config format should be designed to leave room for future per-camera metadata and adapter-related fields, even though v1 supports only one RLC-423S.

### Credential Handling
- **D-03:** Credentials may be persisted locally in v1 for speed and practicality on the LAN-first single-user workflow.
- **D-04:** Credential persistence should be implemented in a way that keeps a clear upgrade path to stronger secret handling later, rather than baking in a throwaway format.

### Capability Discovery
- **D-05:** The app should actively probe the camera on connect/startup and derive capability information from the real firmware instead of relying only on a static RLC-423S profile.
- **D-06:** The probed result should be saved as a capability snapshot for this known camera/firmware so later phases can build against observed behavior.

### Debug Capture
- **D-07:** Raw request/response capture should be opt-in, not always on.
- **D-08:** When debug capture is enabled, the app should write raw request/response snapshots to disk for unsupported or unexpected behavior so future model support and troubleshooting have concrete evidence.

### the agent's Discretion
- Exact local config file format and storage path
- The internal shape of the capability snapshot
- Log rotation and redaction details for debug artifacts
- Retry/backoff mechanics around reconnect and session renewal

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and project intent
- `.planning/PROJECT.md` - project vision, constraints, target firmware context, and non-goals
- `.planning/REQUIREMENTS.md` - Phase 1 requirements `CONN-01` through `CONN-04` and `COMP-01` through `COMP-03`
- `.planning/ROADMAP.md` - Phase 1 goal, success criteria, and boundary relative to later phases
- `.planning/STATE.md` - current project status and active phase

### Research context
- `.planning/research/SUMMARY.md` - distilled stack, table stakes, and roadmap implications
- `.planning/research/STACK.md` - recommended separation between Node control layer, media layer, and browser app
- `.planning/research/ARCHITECTURE.md` - suggested adapter/session boundaries and capability-map responsibilities
- `.planning/research/PITFALLS.md` - firmware variance, session expiry, and capability modeling pitfalls relevant to Phase 1

### Device-specific local reference
- `camera_stats.txt` - known model, hardware, firmware, and client version for the target camera

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No application code exists yet in this repository, so Phase 1 should establish the first reusable connectivity, adapter, and diagnostics primitives.

### Established Patterns
- There are no existing source-code patterns yet; the strongest current patterns come from the planning docs, which favor adapter boundaries, capability-aware behavior, and conservative configuration writes.

### Integration Points
- Phase 1 should create the foundations that later phases connect to: connection/config loading, camera session management, capability snapshot storage, and debug artifact generation.

</code_context>

<specifics>
## Specific Ideas

- The user accepted the recommended defaults for all identified gray areas in Phase 1.
- The single-user, LAN-only context makes local persisted credentials acceptable for v1.
- Capability discovery should reflect the actual observed RLC-423S firmware rather than assumptions from model name alone.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---
*Phase: 01-camera-connectivity-capability-map*
*Context gathered: 2026-04-13*
