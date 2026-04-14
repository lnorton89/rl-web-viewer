# Research: Pitfalls

## 1. Assuming Browser Live View Is "Just RTSP"

Why it happens:

- Reolink exposes RTSP, but browsers do not natively consume RTSP.

Warning signs:

- The app can fetch a camera stream URL but cannot render it in the browser reliably.
- Playback works in VLC but not in the dashboard.

Prevention:

- Treat media delivery as a separate problem from camera control.
- Prove the browser-safe streaming path early with the real camera/firmware.

Phase to address:

- Phase 2

## 2. Firmware-Specific CGI Differences

Why it happens:

- Reolink behavior varies by model and firmware, and the public docs are incomplete.

Warning signs:

- Commands that work in a reference library or docs return different fields or fail on this camera.
- Some settings appear in the vendor UI but not in a generic API list.

Prevention:

- Build a capability map for the exact RLC-423S firmware.
- Keep raw response capture available in debug mode.
- Normalize behavior through a model adapter instead of scattering assumptions everywhere.

Phase to address:

- Phase 1

## 3. Unsafe Configuration Writes

Why it happens:

- Camera settings often have hidden dependencies, value ranges, or firmware-specific rules.

Warning signs:

- Setting changes appear to "succeed" but do not stick.
- A write unexpectedly changes related fields or degrades camera behavior.

Prevention:

- Start read-only, then move to narrow, validated write support.
- Use read/compare/write/verify flows for config changes.
- Keep the first editable settings subset intentionally small.

Phase to address:

- Phase 4

## 4. Session Expiry and Silent Authentication Failures

Why it happens:

- Token/login lifetimes and retry behavior are easy to under-handle.

Warning signs:

- PTZ or settings calls fail only after the app has been idle.
- The first action works but later actions return generic errors.

Prevention:

- Centralize login/session management.
- Detect auth failures and re-authenticate automatically where safe.

Phase to address:

- Phase 1

## 5. PTZ Command Races

Why it happens:

- PTZ controls are stateful and timing-sensitive; repeated commands can overlap.

Warning signs:

- The camera keeps moving after the UI says stop.
- Rapid input causes erratic motion or stale state.

Prevention:

- Design PTZ around start/stop semantics, not just fire-and-forget clicks.
- Debounce or serialize control actions where needed.

Phase to address:

- Phase 3

## 6. Treating Unsupported Features As Errors Instead Of Capabilities

Why it happens:

- Expanding to more models later becomes painful if unsupported functions throw hard failures instead of being modeled explicitly.

Warning signs:

- UI elements appear for features this camera/firmware does not support.
- Adding a second model requires invasive rewrites.

Prevention:

- Publish capability flags from the adapter layer.
- Hide or disable unsupported controls intentionally.

Phase to address:

- Phase 1 and Phase 5
