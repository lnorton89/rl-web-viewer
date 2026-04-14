# Requirements: Reolink RLC-423S Node Console

**Defined:** 2026-04-13
**Core Value:** Reliable local live view and PTZ/control of the RLC-423S from a modern browser without depending on Flash, cloud services, or the old vendor web UI.

## v1 Requirements

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

- [ ] **PTZ-01**: User can pan, tilt, and zoom the camera from the web dashboard.
- [ ] **PTZ-02**: User can stop PTZ movement promptly from the dashboard after starting motion.
- [ ] **PTZ-03**: User can view and trigger saved PTZ presets when the connected camera/firmware supports them.

### Settings & Configuration

- [ ] **CONF-01**: User can inspect current camera settings exposed by the app for the connected RLC-423S.
- [ ] **CONF-02**: User can edit a safe v1 subset of camera settings from the dashboard.
- [ ] **CONF-03**: User can submit a settings change and see exact validation or API failure feedback if the camera rejects it.
- [ ] **CONF-04**: User can refresh settings after a write and confirm the camera reports the updated values.

### Compatibility & Diagnostics

- [x] **COMP-01**: The app identifies the connected camera model/firmware and loads the correct capability profile for the RLC-423S.
- [x] **COMP-02**: User only sees controls that are supported by the connected camera/firmware, rather than broken or misleading UI.
- [x] **COMP-03**: User can enable a debug mode that captures unsupported or unexpected API responses for troubleshooting and future model support.

## v2 Requirements

### Expanded Device Support

- **MULT-01**: User can add more than one camera to the app.
- **MULT-02**: User can connect compatible Reolink models beyond the RLC-423S through additional adapters.

### Expanded Camera Features

- **PLAY-01**: User can browse recordings or playback history from the dashboard.
- **ALRM-01**: User can inspect and configure alarm or motion-triggered behavior.
- **PTZ-04**: User can create, edit, and delete PTZ presets or patrol routes.

### Access & Operations

- **AUTH-01**: User can protect the local dashboard with its own app-level login.
- **REM-01**: User can access the dashboard remotely beyond the LAN.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Reolink cloud/P2P integration | LAN-only access is the intended v1 scope |
| Multi-user roles and permissions | Single-user personal workflow for now |
| NVR-focused workflows | The initial target is one standalone RLC-423S |
| Mobile-native apps | Browser-based local dashboard is sufficient for v1 |
| Broad cross-model support on day one | Architecture should allow it, but delivery targets one known model first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONN-01 | Phase 1 | Complete |
| CONN-02 | Phase 1 | Complete |
| CONN-03 | Phase 1 | Complete |
| CONN-04 | Phase 1 | Complete |
| COMP-01 | Phase 1 | Complete |
| COMP-02 | Phase 1 | Complete |
| COMP-03 | Phase 1 | Complete |
| LIVE-01 | Phase 2 | Complete |
| LIVE-02 | Phase 2 | Complete |
| LIVE-03 | Phase 2 | Complete |
| PTZ-01 | Phase 3 | Pending |
| PTZ-02 | Phase 3 | Pending |
| PTZ-03 | Phase 3 | Pending |
| CONF-01 | Phase 4 | Pending |
| CONF-02 | Phase 4 | Pending |
| CONF-03 | Phase 4 | Pending |
| CONF-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-14 after Phase 1 completion*
