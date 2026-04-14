# Research: Stack

## Recommended Stack

### Control Plane

- **Node.js + TypeScript** for the main application layer
- **Fastify or Express** for a local HTTP API and UI hosting
- **Zod or equivalent runtime validation** for camera responses and config payloads

Why:

- The project is explicitly a Node.js app.
- Runtime validation matters because Reolink firmware and CGI responses can vary by model and version.
- A local backend gives one place to handle credentials, session tokens, retries, capability detection, and write safety.

### UI Layer

- **Browser UI served by the Node app**
- A lightweight SPA or server-rendered app is fine; the main requirement is a responsive local dashboard for live view, PTZ, and settings.

Why:

- The user need is a modern replacement for the legacy browser dashboard, so the browser remains the right interaction surface.

### Camera Control Interface

- **Reolink CGI/API requests** as the primary control/config interface
- **Adapter-based command layer** keyed by model/firmware capability

Evidence:

- Reolink support docs show `cgi-bin/api.cgi` usage for snapshots.
- The `reolinkapigo` project describes token-based login and many GET/SET API calls discovered from the vendor UI.

### Media Interface

- **RTSP from camera** as the raw live-view source where available
- **Browser-friendly relay/transcode layer** for live view in the web UI

Likely implementation options:

- Preferred first exploration: consume RTSP and expose browser-compatible playback through a local relay/transcode path.
- Safe fallback for early development: periodic snapshots/JPEG endpoints while the live stream pipeline is still being stabilized.

Why:

- Browsers do not natively play RTSP.
- Reolink support docs document RTSP URL formats and separate main/sub streams.
- The Go reference library also treats streaming as a distinct concern from camera control.

### Tooling / Diagnostics

- Structured debug logging for raw request/response traces
- Capability snapshots per discovered camera/firmware
- Mock fixtures from captured responses for tests

Why:

- Firmware-specific surprises are expected, and unsupported endpoints need to be easy to inspect without packet archaeology every time.

## Recommendation Summary

Build a local Node.js app with a clear split between:

1. Camera adapter/control layer
2. Media relay layer
3. Browser dashboard

That separation best matches the known Reolink ecosystem and reduces the risk that streaming quirks or firmware quirks leak across the whole codebase.
