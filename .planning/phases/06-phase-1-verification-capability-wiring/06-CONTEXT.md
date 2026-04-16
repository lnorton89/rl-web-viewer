# Phase 6: Phase 1 Verification & Capability Wiring - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify Phase 1 requirements (CONN-01 through COMP-03) with evidence and confirm the capability snapshot is consumed by Phase 2 (live-view), Phase 3 (PTZ), and Phase 4 (settings). This phase closes the gap identified in the v1.0 milestone audit where Phase 1 verification was missing and cross-phase capability wiring could not be confirmed.

**Phase 1 Success Criteria to Verify:**
1. A local app instance can connect to the RLC-423S by LAN IP and authenticate successfully. (CONN-01)
2. The app can read and display device identity data that matches the known model, hardware, and firmware. (CONN-02)
3. The adapter layer publishes a capability profile for this camera/firmware and the UI/API can consume it. (COMP-01)
4. Authentication expiry or invalid-session cases are detected and recovered without manual restart. (CONN-04)
5. Debug mode can capture raw unsupported/unexpected camera responses for troubleshooting. (COMP-03)

**Note:** CONN-03 (LAN-only operation) is implicit in the architecture and not explicitly tested.

</domain>

<decisions>
## Implementation Decisions

### Verification Strategy
- **D-01:** Phase 6 creates a verification report documenting evidence for each Phase 1 requirement rather than re-implementing.
- **D-02:** Automated test evidence takes priority; manual human verification is marked as required where tests cannot cover hardware behavior.

### Verification Evidence Sources
- **D-03:** Evidence sources include: passing automated tests, code structure verification, cross-phase wiring traces, and human verification for real-camera behavior.

### Cross-Phase Wiring Confirmation
- **D-04:** Phase 2 VERIFICATION.md already confirms snapshot → live-view modes wiring.
- **D-05:** Phase 3 VERIFICATION.md already confirms snapshot → PTZ wiring.
- **D-06:** Phase 4 VERIFICATION.md confirms snapshot → settings wiring for reads.
- **D-07:** Phase 6 must synthesize the wiring evidence and confirm the full capability snapshot consumption chain.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Audit findings
- `.planning/v1.0-MILESTONE-AUDIT.md` — Gap analysis showing Phase 1 unverified and cross-phase wiring needs confirmation

### Phase 1 implementation context
- `.planning/phases/01-camera-connectivity-capability-map/01-CONTEXT.md` — Phase 1 decisions on capability discovery, snapshot persistence, and debug capture
- `.planning/phases/01-camera-connectivity-capability-map/01-VALIDATION.md` — Validation strategy (note: `nyquist_compliant: false`, `wave_0_complete: false`)
- `.planning/phases/01-camera-connectivity-capability-map/01-01-SUMMARY.md` — Plan 01-01 completed
- `.planning/phases/01-camera-connectivity-capability-map/01-02-SUMMARY.md` — Plan 01-02 completed
- `.planning/phases/01-camera-connectivity-capability-map/01-03-SUMMARY.md` — Plan 01-03 completed

### Phase 1 source code (verification targets)
- `src/camera/reolink-session.ts` — Authentication and session management
- `src/camera/capability-snapshot.ts` — Capability discovery and snapshot persistence
- `src/camera/reolink-discovery.ts` — Device identity and info retrieval
- `src/diagnostics/debug-capture.ts` — Debug artifact capture and sanitization
- `tests/camera/*.test.ts` — Automated test coverage

### Existing verification patterns
- `.planning/phases/02-browser-live-view-pipeline/02-VERIFICATION.md` — Pattern: observable truths, required artifacts, key link verification, requirements coverage
- `.planning/phases/03-ptz-control-surface/03-VERIFICATION.md` — Pattern: same structure with data-flow traces

### Capability wiring evidence
- `src/camera/capability-snapshot.ts` — Creates and persists capability snapshot
- `src/media/live-view-modes.ts` — Consumes snapshot for live-view mode matrix
- `src/camera/reolink-ptz.ts` — Consumes snapshot for PTZ capability gating
- `src/camera/reolink-settings.ts` — Consumes snapshot for settings capability gating
- `src/index.ts` — Builds and persists snapshot at app startup

### Requirements reference
- `.planning/REQUIREMENTS.md` — CONN-01 through CONN-04 and COMP-01 through COMP-03 definitions

</canonical_refs>

<code_context>
## Existing Code Insights

### Phase 1 Test Coverage
- `tests/camera/reolink-session.test.ts` — Session authentication and retry coverage
- `tests/camera/reolink-discovery.test.ts` — Device info retrieval coverage
- `tests/camera/capability-snapshot.test.ts` — Snapshot building, persistence, and loading coverage
- `tests/camera/reolink-ptz.test.ts` — PTZ bootstrap uses capability snapshot
- `tests/camera/reolink-settings.test.ts` — Settings capability gating from snapshot

### Capability Snapshot Wiring Map
| Consumer | What It Uses | Verification Status |
|----------|--------------|---------------------|
| `src/index.ts` | Creates snapshot at startup | To verify |
| `src/media/live-view-modes.ts` | `supportsLiveView`, `supportsSnapshot`, `ports.rtsp` | Verified in Phase 2 |
| `src/camera/reolink-ptz.ts` | `supportsPtzControl`, `supportsPtzPreset` | Verified in Phase 3 |
| `src/camera/reolink-settings.ts` | `supportsConfigRead`, `supportsConfigWrite` | Verified in Phase 4 |

### Verification Evidence Gaps (from audit)
1. Phase 1 has NO 01-VERIFICATION.md file
2. Phase 1 VALIDATION.md shows `nyquist_compliant: false` and `wave_0_complete: false`
3. Cannot confirm capability snapshot consumption without Phase 1 verification

</code_context>

<specifics>
## Specific Requirements to Verify

### CONN-01: Camera Registration
- User can register the RLC-423S by LAN IP, username, and password
- Evidence: `.local/camera.config.json` stores config; `loadCameraConfig()` reads it; `src/index.ts` prompts for input

### CONN-02: Device Identity Display
- User can validate connectivity and see model, hardware, firmware
- Evidence: `getDevInfo()` returns identity; `src/index.ts` logs model/firmVer; Phase 2/3 verified device info flows to UI

### CONN-03: LAN-Only Operation
- App works on local network without Reolink cloud
- Evidence: Architecture is LAN-only; no cloud dependencies in code

### CONN-04: Session Recovery
- Auth failures detected and recovered without manual restart
- Evidence: `ReolinkSession` handles token expiry; tests cover retry logic

### COMP-01: Capability Profile
- App identifies camera model/firmware and loads correct capability profile
- Evidence: `buildCapabilitySnapshot()` probes camera; persisted snapshot used by downstream phases

### COMP-02: Capability Gating
- User only sees supported controls
- Evidence: Routes gate on capability flags; UI hides unsupported controls (verified in Phase 2, 3, 4)

### COMP-03: Debug Capture
- Debug mode captures unsupported/unexpected API responses
- Evidence: `debug-capture.ts` writes sanitized artifacts; PTZ and live-view use it

</specifics>

<deferred>
## Deferred Ideas

None — this phase stays within verification scope.

</deferred>

---
*Phase: 06-phase-1-verification-capability-wiring*
*Context gathered: 2026-04-16*
