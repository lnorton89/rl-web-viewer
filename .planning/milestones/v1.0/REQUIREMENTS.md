# v1.0 Milestone Requirements

## v1 Requirements (All Complete)

### Connectivity

- [x] **CONN-01**: User can register the RLC-423S in the app by entering its LAN IP address, username, and password.
- [x] **CONN-02**: User can validate connectivity and see the connected camera's model, hardware, and firmware details before using controls.
- [x] **CONN-03**: User can use the app entirely on the local network without requiring Reolink cloud account or UID-based access.
- [x] **CONN-04**: User can keep using controls after session expiry because the app detects auth failures and re-authenticates automatically.

### Live View

- [x] **LIVE-01**: User can open a live view of the camera in a modern browser without Flash or browser plugins.
- [x] **LIVE-02**: User can switch between available stream qualities or fallback viewing modes exposed by the connected camera/media pipeline.
- [x] **LIVE-03**: User can see actionable live-view status and error messages when the media connection fails or the stream format is unsupported.

### PTZ Control

- [x] **PTZ-01**: User can pan, tilt, and zoom the camera from the web dashboard.
- [x] **PTZ-02**: User can stop PTZ movement promptly from the dashboard after starting motion.
- [x] **PTZ-03**: User can view and trigger saved PTZ presets when the connected camera/firmware supports them.

### Settings & Configuration

- [x] **CONF-01**: User can inspect current camera settings exposed by the app for the connected RLC-423S.
- [x] **CONF-02**: User can edit a safe v1 subset of camera settings from the dashboard.
- [x] **CONF-03**: User can submit a settings change and see exact validation or API failure feedback if the camera rejects it.
- [x] **CONF-04**: User can refresh settings after a write and confirm the camera reports the updated values.

### Compatibility & Diagnostics

- [x] **COMP-01**: The app identifies the connected camera model/firmware and loads the correct capability profile for the RLC-423S.
- [x] **COMP-02**: User only sees controls that are supported by the connected camera/firmware, rather than broken or misleading UI.
- [x] **COMP-03**: User can enable a debug mode that captures unsupported or unexpected API responses for troubleshooting and future model support.

---

**Requirement Outcomes:** All 17 requirements validated and verified through automated tests + real-camera E2E pass.

*Archived: 2026-04-16*