<!-- GSD:project-start source:PROJECT.md -->
## Project

**Reolink RLC-423S Node Console**

This project is a local Node.js application that replaces the legacy Flash-dependent browser dashboard for a Reolink RLC-423S IP camera on the LAN. It is being built first for a single camera and a single user, but the internals should stay modular so future Reolink models can be added without rewriting the whole app.

**Core Value:** Reliable local live view and PTZ/control of the RLC-423S from a modern browser without depending on Flash, cloud services, or the old vendor web UI.

### Constraints

- **Tech stack**: Node.js application — requested project direction and core implementation environment.
- **Network scope**: LAN-only in v1 — this is for personal use on the local network for now.
- **Target hardware**: Reolink RLC-423S first — initial support should be correct for the known camera before expanding.
- **Compatibility**: No Flash or browser plugins — the replacement must work in a modern browser.
- **Architecture**: Modular by model/capability — future Reolink models should fit through adapters rather than forks.
- **Safety**: Configuration writes must be conservative — camera settings changes can be destructive or firmware-specific, so read/validate/write flows matter.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Control Plane
- **Node.js + TypeScript** for the main application layer
- **Fastify or Express** for a local HTTP API and UI hosting
- **Zod or equivalent runtime validation** for camera responses and config payloads
- The project is explicitly a Node.js app.
- Runtime validation matters because Reolink firmware and CGI responses can vary by model and version.
- A local backend gives one place to handle credentials, session tokens, retries, capability detection, and write safety.
### UI Layer
- **Browser UI served by the Node app**
- A lightweight SPA or server-rendered app is fine; the main requirement is a responsive local dashboard for live view, PTZ, and settings.
- The user need is a modern replacement for the legacy browser dashboard, so the browser remains the right interaction surface.
### Camera Control Interface
- **Reolink CGI/API requests** as the primary control/config interface
- **Adapter-based command layer** keyed by model/firmware capability
- Reolink support docs show `cgi-bin/api.cgi` usage for snapshots.
- The `reolinkapigo` project describes token-based login and many GET/SET API calls discovered from the vendor UI.
### Media Interface
- **RTSP from camera** as the raw live-view source where available
- **Browser-friendly relay/transcode layer** for live view in the web UI
- Preferred first exploration: consume RTSP and expose browser-compatible playback through a local relay/transcode path.
- Safe fallback for early development: periodic snapshots/JPEG endpoints while the live stream pipeline is still being stabilized.
- Browsers do not natively play RTSP.
- Reolink support docs document RTSP URL formats and separate main/sub streams.
- The Go reference library also treats streaming as a distinct concern from camera control.
### Tooling / Diagnostics
- Structured debug logging for raw request/response traces
- Capability snapshots per discovered camera/firmware
- Mock fixtures from captured responses for tests
- Firmware-specific surprises are expected, and unsupported endpoints need to be easy to inspect without packet archaeology every time.
## Recommendation Summary
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
