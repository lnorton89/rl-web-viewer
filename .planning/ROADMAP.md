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

---

*Roadmap created: 2026-04-13*
*v1.0 archived: 2026-04-16*
*v1.1 started: 2026-04-16*