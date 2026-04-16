# Roadmap: Reolink RLC-423S Node Console

## Overview

**7 phases** | **17 v1 requirements mapped** | All v1 requirements covered | v1.0 gaps closing

## Phases

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Camera Connectivity & Capability Map | Establish reliable local auth, discovery, and adapter/capability foundations for the RLC-423S | CONN-01, CONN-02, CONN-03, CONN-04, COMP-01, COMP-02, COMP-03 | 5 |
| 2 | Browser Live View Pipeline | Deliver a modern live-view path that works in a browser without Flash | LIVE-01, LIVE-02, LIVE-03 | 4 |
| 3 | PTZ Control Surface | Expose responsive pan/tilt/zoom and preset operations in the local dashboard | PTZ-01, PTZ-02, PTZ-03 | 4 |
| 4 | Settings & Safe Configuration | Add read/write settings management with validation and verification loops | CONF-01, CONF-02, CONF-03, CONF-04 | 4 |
| 5 | Hardening & Modular Expansion Base | 3/3 | Complete   | 2026-04-16 |
| 6 | Phase 1 Verification & Capability Wiring | Close v1.0 audit gaps — verify Phase 1, confirm capability snapshot wiring | Gap closure | 3 |
| 7 | Real-Camera E2E Hardening | Run real-camera E2E pass for complete v1.0 milestone | Gap closure | 5 |

## Phase Details

### Phase 1: Camera Connectivity & Capability Map

Goal: Establish reliable local authentication, device discovery, and a firmware-aware adapter boundary for the RLC-423S before deeper UI work begins.

Requirements:

- CONN-01
- CONN-02
- CONN-03
- CONN-04
- COMP-01
- COMP-02
- COMP-03

Success criteria:

1. A local app instance can connect to the RLC-423S by LAN IP and authenticate successfully.
2. The app can read and display device identity data that matches the known model, hardware, and firmware.
3. The adapter layer publishes a capability profile for this camera/firmware and the UI/API can consume it.
4. Authentication expiry or invalid-session cases are detected and recovered without manual restart.
5. Debug mode can capture raw unsupported/unexpected camera responses for troubleshooting.

**UI hint**: no

### Phase 2: Browser Live View Pipeline

Goal: Replace the Flash-era viewing path with a browser-safe live-view experience backed by the local app.

Requirements:

- LIVE-01
- LIVE-02
- LIVE-03

Success criteria:

1. The dashboard can render live video in a modern browser without Flash or plugins.
2. The user can choose between supported stream qualities or fallback view modes.
3. The app surfaces stream startup, reconnect, and failure states clearly in the UI.
4. The live-view implementation is documented enough to support later model expansion without re-architecting the control plane.

**Plans:** 4 plans

Plans:
- [x] 02-01-PLAN.md - Bootstrap the live-view workspace, shared contracts, and mode matrix
- [x] 02-02-PLAN.md - Implement the MediaMTX runtime, live-view service, and Fastify routes
- [x] 02-03-PLAN.md - Implement the viewer transport adapters, API client, and state machine
- [x] 02-04-PLAN.md - Build the React viewer shell, controls, and diagnostics surfaces

**UI hint**: yes

### Phase 3: PTZ Control Surface

Goal: Deliver dependable PTZ operations through the dashboard once the live view and capability map are proven.

Requirements:

- PTZ-01
- PTZ-02
- PTZ-03

Success criteria:

1. The user can pan, tilt, and zoom the RLC-423S from the dashboard while watching live view.
2. PTZ stop behavior is responsive and does not leave the camera moving unexpectedly.
3. Supported presets are listed and can be triggered from the UI.
4. Unsupported PTZ features are disabled or hidden based on the capability profile.

**UI hint**: yes

**Plans:** 3 plans

Plans:
- [x] 03-01-PLAN.md - Define the PTZ contracts, Reolink adapter behavior, and fixture-backed camera tests
- [x] 03-02-PLAN.md - Expose browser-safe PTZ Fastify routes and mount them in the local app server
- [x] 03-03-PLAN.md - Build the attached PTZ panel, hook lifecycle, and browser interaction tests

### Phase 4: Settings & Safe Configuration

Goal: Add read/write configuration management in a way that is explicit, validated, and safe for the known firmware.

Requirements:

- CONF-01
- CONF-02
- CONF-03
- CONF-04

Success criteria:

1. The user can inspect a meaningful subset of current camera settings from the dashboard.
2. The user can edit the supported v1 settings subset and submit changes from the app.
3. Failed writes return precise validation or camera API feedback instead of generic errors.
4. Successful writes can be re-read from the camera to confirm the new values actually took effect.

**UI hint**: yes

**Plans:** 3 plans

Plans:
- [x] 04-01-PLAN.md - Define shared settings contracts, safe setter strategies, and verified camera service coverage
- [x] 04-02-PLAN.md - Expose browser-safe settings routes and mount them on the Fastify control plane
- [x] 04-03-PLAN.md - Build the settings panel, section review UX, and browser interaction tests

### Phase 5: Hardening & Modular Expansion Base

Goal: Reduce operational rough edges, improve observability, and leave a clean foundation for future Reolink model adapters.

Requirements:

- Cross-cutting polish for all prior phases

Success criteria:

1. The app has a documented adapter contract and clear extension points for additional Reolink models.
2. Core user flows for connect, view, PTZ, and settings hold up under repeated local use.
3. Debug and logging outputs are good enough to investigate future firmware/model gaps quickly.
4. The project is ready for `$gsd-plan-phase` work on expansion without having to restructure the foundations.

**UI hint**: yes

**Plans:** 3/3 plans complete

Plans:
- [x] 05-01-PLAN.md - Define the explicit camera adapter contract, registry, and RLC-423S implementation seam
- [x] 05-02-PLAN.md - Centralize backend diagnostics and harden live-view/runtime repeatability
- [x] 05-03-PLAN.md - Polish repeated-use browser flows and complete a real-camera hardening pass

## Sequence Rationale

The roadmap de-risks the two biggest unknowns first:

1. Whether this specific RLC-423S firmware can be normalized cleanly through a local adapter
2. What browser-safe live-view strategy works best for the camera

Once those are stable, PTZ and settings become straightforward feature layers instead of guesswork stacked on top of unknown transport behavior.

### Phase 6: Phase 1 Verification & Capability Wiring

Goal: Close v1.0 audit gaps — verify Phase 1 requirements and confirm capability snapshot wiring to downstream phases.

Requirements:

- Gap closure — Phase 1 verification missing
- Gap closure — Cross-phase capability snapshot wiring

Success criteria:

1. Phase 1 requirements (CONN-01 through COMP-03) verified with evidence.
2. Capability snapshot is consumed by Phase 2 live-view, Phase 3 PTZ, and Phase 4 settings.
3. Cross-phase wiring documented and tested.

**Depends on:** Phase 5

**UI hint**: no

**Plans:** 1 plan

Plans:
- [x] 06-01-PLAN.md - Verify Phase 1 requirements and confirm capability snapshot wiring

### Phase 7: Real-Camera E2E Hardening

Goal: Complete the real-camera verification pass for v1.0 milestone completeness.

Requirements:

- Gap closure — Real-camera E2E pass incomplete

Success criteria:

1. Start app → confirm viewer connects to RLC-423S
2. Retry Live View → verify recovery without restart
3. PTZ hold/release → confirm "Motion stopped" state
4. Apply safe setting → confirm "Verified" reread
5. Open diagnostics post-failure → confirm short reason without credentials

**Depends on:** Phase 6

**UI hint**: no

**Plans:** 1 plan

Plans:
- [x] 07-01-PLAN.md — Real-camera E2E hardening pass

---
*Roadmap created: 2026-04-13*
*Updated: 2026-04-16*
