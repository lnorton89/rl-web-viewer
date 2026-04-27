# Roadmap: Reolink RLC-423S Node Console

## Overview

**v1.0** complete | [Milestones](./milestones/v1.0/ROADMAP.md)

**v1.1** in progress (UI modernization + feature parity)

## Phases

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|----------------|
| 1 | UI Modernization | Modern framework-based desktop UI with no scrolling | UI-01, UI-02, UI-03 | 4 |
| 2 | PTZ Enhancement | Add focus, iris, speed controls | PTZ-04, PTZ-05, PTZ-06 | 4 |
| 3 | Live View Enhancement | Add audio playback | LIVE-04 | 1 |
| 4 | Network & System | Network info and settings | NET-01, NET-02 | 3 |
| 5 | Settings Parity | Advanced ISP controls | CONF-05, CONF-06, CONF-07, CONF-08 | 4 |
| 6 | User Management | Password change | USER-01 | 1 |
| 9 | Plugin System & YouTube Streaming | Extensible plugin runtime with first YouTube live stream plugin | PLUG-01, PLUG-02, PLUG-03, PLUG-04 | 4 |

Plans:
- [x] 01-01-PLAN.md — MUI foundation (dependencies, theme, LayoutShell)
- [x] 01-02-PLAN.md — Component integration (LiveViewer, PTZ, Settings sections)

## Phase Details

### Phase 1: UI Modernization

Goal: Rebuild the React dashboard with a modern framework approach that fits in a desktop browser window without scrolling.

Requirements:

- UI-01: Single window, no scrolling
- UI-02: Unified navigation for Live/PTZ/Settings
- UI-03: Modern framework implementation

Success criteria:

1. All controls fit in a 1920x1080 desktop window without scrolling.
2. Navigation provides quick access to Live View, PTZ, and Settings.
3. UI uses current React best practices with proper component organization.

**UI hint**: yes

### Phase 2: PTZ Enhancement

Goal: Add missing PTZ controls to match the built-in dashboard.

Requirements:

- PTZ-04: Focus control (near/far)
- PTZ-05: Iris control (open/close)
- PTZ-06: Speed slider

Success criteria:

1. Focus slider or buttons control camera focus.
2. Iris slider or buttons control camera aperture.
3. Speed slider affects PTZ movement speed.

**Depends on:** Phase 1

**UI hint**: yes

### Phase 3: Live View Enhancement

Goal: Add audio support when camera has audio input.

Requirements:

- LIVE-04: Audio playback

Success criteria:

1. Audio stream plays during live view if camera supports it.
2. Audio control (mute/volume) available in UI.

**Depends on:** Phase 1

**UI hint**: yes

### Phase 4: Network & System

Goal: Expose camera network configuration.

Requirements:

- NET-01: View network info
- NET-02: Edit network settings

Success criteria:

1. Camera IP, subnet, gateway, MAC displayed.
2. Network settings can be edited and applied.

**Depends on:** Phase 1

**UI hint**: yes

### Phase 5: Settings Parity

Goal: Complete advanced image settings coverage.

Requirements:

- CONF-05: Anti-flicker control
- CONF-06: White balance control
- CONF-07: Backlight compensation
- CONF-08: Day/night mode

Success criteria:

1. Anti-flicker (50Hz/60Hz/Off) controllable.
2. White balance mode and manual gains controllable.
3. BLC/DRC controls available.
4. Day/night mode switchable.

**Depends on:** Phase 1

**UI hint**: yes

### Phase 6: User Management

Goal: Allow password change from the app.

Requirements:

- USER-01: Change password

Success criteria:

1. User can change admin password through the app.

**Depends on:** Phase 1

**UI hint**: yes

### Phase 8: Live View Enhancement

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 7
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd-plan-phase 8 to break down)

### Phase 9: Plugin System & YouTube Streaming

Goal: Add an extensible plugin system and ship the first plugin for streaming the camera live view to YouTube.

Requirements:

- PLUG-01: Plugin runtime and extension contract
- PLUG-02: YouTube authentication and credential storage flow
- PLUG-03: YouTube stream setup, start/stop control, and status reporting
- PLUG-04: Shareable stream metadata and UI integration

Success criteria:

1. Plugins can be discovered, configured, enabled, disabled, and invoked through stable server APIs.
2. YouTube plugin handles auth setup without exposing secrets to browser responses or logs.
3. YouTube plugin can create/configure a stream target and control streaming from the existing camera media pipeline.
4. Dashboard exposes plugin status, controls, and sharing information for the YouTube stream.

**Depends on:** Phase 3, Phase 4

**UI hint**: yes

Plans:
- [x] 09-01-PLAN.md — Plugin runtime, contracts, config, registry, routes, and secret guards
- [ ] 09-02-PLAN.md — YouTube OAuth client, token store, auth actions, and redacted status
- [ ] 09-03-PLAN.md — YouTube Live API setup plus FFmpeg egress start/stop/status lifecycle
- [ ] 09-04-PLAN.md — Dashboard plugin panel, YouTube controls, and share metadata UI

---

*Roadmap created: 2026-04-13*
*v1.0 archived: 2026-04-16*
*v1.1 started: 2026-04-16*
