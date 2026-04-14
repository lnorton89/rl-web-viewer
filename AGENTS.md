# Agents Guide

## Project

**Reolink RLC-423S Node Console**

This project is a local Node.js application that replaces the legacy Flash-dependent browser dashboard for a Reolink RLC-423S IP camera on the LAN. It starts with one camera for one user, but the implementation should stay modular enough to support additional Reolink models later.

**Core value:** Reliable local live view and PTZ/control of the RLC-423S from a modern browser without depending on Flash, cloud services, or the old vendor web UI.

## Working Constraints

- Node.js is the primary application environment.
- v1 is LAN-only and single-user.
- The first supported device is the RLC-423S on firmware `v2.0.0.1055_17110905_v1.0.0.30`.
- No Flash or browser-plugin dependencies are acceptable.
- Camera-specific logic should live behind capability-aware adapters.
- Configuration writes should use read/validate/write/verify flows.

## Suggested Architecture

- Browser dashboard for live view, PTZ, settings, and diagnostics
- Local Node app server for UI hosting, API routes, credentials, and retries
- Camera session/adapter layer for auth, capability detection, and normalized control APIs
- Separate media layer for browser-safe live view
- Debug/fixture capture for unsupported or firmware-specific behavior

## GSD Workflow

Use GSD commands so planning artifacts stay aligned with implementation work:

- `$gsd-discuss-phase 1` to refine the Phase 1 approach
- `$gsd-plan-phase 1` to create the execution plan
- `$gsd-execute-phase 1` after planning is approved

Do not bypass the planning flow unless the user explicitly asks for ad hoc work.
