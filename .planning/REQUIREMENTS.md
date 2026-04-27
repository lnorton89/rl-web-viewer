# Requirements: Reolink RLC-423S Node Console

**Defined:** 2026-04-16
**Milestone:** v1.1
**Core Value:** Modern UI dashboard + feature parity with built-in Reolink web dashboard

## v1.1 Requirements

### UI Modernization

- [ ] **UI-01**: User can view all controls in a single desktop browser window without scrolling.
- [ ] **UI-02**: User can access Live View, PTZ, and Settings from a unified navigation.
- [ ] **UI-03**: UI uses a modern framework (React/Vue/Svelte) instead of current implementation.

### PTZ Enhancement

- [ ] **PTZ-04**: User can adjust camera focus (near/far) from the PTZ panel.
- [ ] **PTZ-05**: User can adjust camera iris (open/close) from the PTZ panel.
- [ ] **PTZ-06**: User can adjust PTZ movement speed via slider control.

### Live View Enhancement

- [ ] **LIVE-04**: User can hear audio from the camera during live view (if camera supports audio input).

### Network & System

- [ ] **NET-01**: User can view camera network information (IP, subnet, gateway, MAC).
- [ ] **NET-02**: User can change camera network settings (IP, subnet, gateway).

### Settings Parity (v1.1 targeted)

- [ ] **CONF-05**: User can control anti-flicker (50Hz/60Hz/Off).
- [ ] **CONF-06**: User can control white balance mode and manual gains.
- [ ] **CONF-07**: User can control backlight compensation (BLC/DRC).
- [ ] **CONF-08**: User can control day/night mode.

### User Management

- [ ] **USER-01**: User can change the camera admin password through the app.

### Plugin System & YouTube Streaming

- [x] **PLUG-01**: Plugins can be discovered, configured, enabled, disabled, and invoked through stable server APIs.
- [x] **PLUG-02**: YouTube plugin handles authentication setup without exposing secrets to browser responses or logs.
- [ ] **PLUG-03**: YouTube plugin can create/configure a stream target and control streaming from the existing camera media pipeline.
- [ ] **PLUG-04**: Dashboard exposes plugin status, controls, and sharing information for the YouTube stream.

## v1.0 Requirements (Carried Forward)

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

## v2 Requirements (Backlog)

Future milestones - not in v1.1 scope:

- Multi-camera support
- SD card playback
- Recording to local storage
- Motion detection alerts
- Mobile companion app
- Cloud backup

---

*Requirements defined: 2026-04-16 for v1.1*
