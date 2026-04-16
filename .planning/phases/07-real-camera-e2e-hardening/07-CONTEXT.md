---
phase: 07-real-camera-e2e-hardening
context: gap-closure
created: 2026-04-16
---

# Phase 7 Context: Real-Camera E2E Hardening

## Purpose

Complete real-camera verification pass for v1.0 milestone closure.

## Verification Strategy

**Manual browser verification** — Gap closure for Plan 05-03 Task 3 that was marked `human-verify` with `blocking`.

This approach:
- Works immediately without CI/hardware setup
- Provides real feedback on actual camera behavior
- Documents the procedure for future reference

## Test Isolation (PTZ)

- Each test starts with camera at known position (Preset 1)
- After PTZ tests: return camera to Preset 1 (teardown)
- Tests leave camera in known state

## CI Integration

**Not included** — Manual verification procedure only.

Real-camera CI tests require:
- Camera IP in environment variables
- Always-on camera in test environment
- Network reliability guarantees

Future: automate if camera stays in dedicated test environment.

## Failure Context

Capture on verification failure:
- Timestamp
- Operation name
- Short reason (from app, e.g., "Relay unavailable")
- Correlation refs (requestId)

DO NOT capture:
- Credentials, tokens, passwords
- Raw RTSP URLs
- Camera authentication tokens

## Procedures

### 1. Viewer Connect
1. Start app with configured camera
2. Open browser → dashboard loads
3. Expected: "Live" state within 10 seconds

### 2. Retry Live View
1. Disconnect camera or relay manually
2. Click "Retry Live View"
3. Expected: recovery without app restart

### 3. PTZ Hold/Release
1. Hold pan/tilt direction
2. Release
3. Expected: "Motion stopped" state, camera stops moving

### 4. Settings Apply
1. Edit any editable field
2. Click "Apply"
3. Expected: "Verified" state after camera reread

### 5. Diagnostics
1. Trigger a failure (e.g., disconnect relay)
2. Open diagnostics panel
3. Expected: short reason without credentials

## Cross-Phase Context

- **Phase 1:** Capability snapshot must exist
- **Phase 2:** Live-view routes respond
- **Phase 3:** PTZ routes respond
- **Phase 4:** Settings routes respond

All phases verified upstream in Phase 6.

---
*CONTEXT created during discuss-phase 7*