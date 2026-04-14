# Reolink RLC-423S Node Console

## What This Is

This project is a local Node.js application that replaces the legacy Flash-dependent browser dashboard for a Reolink RLC-423S IP camera on the LAN. It is being built first for a single camera and a single user, but the internals should stay modular so future Reolink models can be added without rewriting the whole app.

## Core Value

Reliable local live view and PTZ/control of the RLC-423S from a modern browser without depending on Flash, cloud services, or the old vendor web UI.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Connect to the RLC-423S over the LAN, authenticate safely, and understand what this firmware exposes.
- [ ] Provide modern browser-based live view and PTZ control for the camera.
- [ ] Read and update core camera settings/configuration from the local app.

### Out of Scope

- Multi-user access control — this starts as a single-user LAN tool for one operator.
- Remote WAN/cloud access — local-network access is the priority and lowers the initial security surface.
- Broad multi-model support in v1 — the architecture should allow it later, but the first delivery targets the RLC-423S only.
- Playback, recordings library, and NVR workflows — important adjacent areas, but not part of the first Flash-replacement goal.

## Context

The current camera is a Reolink RLC-423S with hardware `IPC_3816M` and firmware `v2.0.0.1055_17110905_v1.0.0.30`, based on the local camera notes captured on April 13, 2026. The existing browser dashboard depends on Flash-era behavior, so the practical goal is not just "make a UI", but to re-create the needed local camera capabilities with a modern Node-based control plane and browser-friendly media path.

Relevant ecosystem context:

- Reolink exposes local browser access for compatible cameras on the LAN and uses `cgi-bin/api.cgi` endpoints for at least part of its control surface.
- Reolink support documentation shows direct snapshot and RTSP patterns for compatible cameras, which strongly suggests a split between control/config APIs and media transport concerns.
- The `ReolinkCameraAPI/reolinkapigo` repository is a useful reference because it documents token-based login, RTSP/WebRTC-oriented streaming work, PTZ support, and a long list of GET/SET camera endpoints discovered from the vendor UI.

This project should assume firmware variance and undocumented behavior. The first version needs enough diagnostics and adapter structure to survive that reality rather than hard-coding a fragile happy path.

## Constraints

- **Tech stack**: Node.js application — requested project direction and core implementation environment.
- **Network scope**: LAN-only in v1 — this is for personal use on the local network for now.
- **Target hardware**: Reolink RLC-423S first — initial support should be correct for the known camera before expanding.
- **Compatibility**: No Flash or browser plugins — the replacement must work in a modern browser.
- **Architecture**: Modular by model/capability — future Reolink models should fit through adapters rather than forks.
- **Safety**: Configuration writes must be conservative — camera settings changes can be destructive or firmware-specific, so read/validate/write flows matter.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build a local Node.js app instead of extending the legacy web UI | The vendor dashboard depends on Flash-era behavior and is no longer a good base | — Pending |
| Optimize for one RLC-423S on the LAN first | Tight scope reduces protocol risk and gets to a useful tool faster | — Pending |
| Keep a modular camera adapter boundary from day one | Future Reolink model support is desired, but should not slow down v1 delivery | — Pending |
| Prioritize live view, PTZ, settings, and config ahead of broader features | These are the user-stated replacements for the old dashboard that matter most | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization*
