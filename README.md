# Reolink RLC-423S Node Console

A modern, local Node.js application that replaces the legacy Flash-dependent browser dashboard for the **Reolink RLC-423S** IP camera. Provides reliable LAN-only live view, PTZ control, and camera settings management from any modern browser — no Flash, no cloud, no vendor web UI required.

## Features

- **Live View** — Browser-safe video streaming via WebRTC, HLS, or snapshot fallback, relayed through a local MediaMTX runtime
- **PTZ Control** — Pan/Tilt/Zoom controls with preset management for supported cameras
- **Camera Settings** — Read/validate/write flows for camera configuration with Zod runtime validation
- **Capability Detection** — Automatic probing of camera model, firmware, ports, and supported features
- **Debug Diagnostics** — Sanitized request/response capture for firmware-specific troubleshooting
- **Modular Architecture** — Camera-specific logic behind capability-aware adapters, ready for future Reolink models

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js + TypeScript |
| **Backend** | Fastify (local HTTP server) |
| **Frontend** | React 19 + Vite |
| **Validation** | Zod (runtime schema validation) |
| **Media Relay** | MediaMTX (`v1.17.1`) for RTSP → WebRTC/HLS |
| **Testing** | Vitest + Testing Library |
| **Logging** | Pino (structured debug logging) |

## Prerequisites

- **Node.js** (v20+ recommended)
- **npm** (or equivalent package manager)
- **Windows** (MediaMTX bootstrap currently supports Windows only)
- A **Reolink RLC-423S** camera on your LAN (firmware `v2.0.0.1055_17110905_v1.0.0.30` tested)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your Camera

Create a camera configuration file at `.local/camera.config.json`:

```json
{
  "baseUrl": "http://192.168.1.100",
  "username": "admin",
  "password": "your-camera-password",
  "modelHint": "RLC-423S",
  "notes": "Front yard camera",
  "debugCapture": false,
  "snapshot": {
    "model": "",
    "hardVer": "",
    "firmVer": ""
  }
}
```

Replace `baseUrl` with your camera's LAN IP address and update `username`/`password` accordingly.

### 3. Probe the Camera (Optional)

Verify connectivity and discover camera capabilities:

```bash
npm run probe
```

This outputs a capability summary and saves a snapshot to `.local/capabilities/`. Add `--debug` to capture a sanitized debug artifact in `.local/debug/`.

### 4. Start the Server

```bash
npm start
```

The application will:
1. Start the MediaMTX media relay (downloads automatically on first run if missing)
2. Launch the Fastify server at `http://127.0.0.1:4000`
3. Serve the React dashboard

Open your browser to **`http://localhost:4000`** to access the live view dashboard.

### Development Mode

For frontend development with hot module replacement:

```bash
npm run dev:web
```

## Project Structure

```
reolink/
├── src/
│   ├── camera/              # Camera communication layer
│   │   ├── reolink-session.ts        # Auth, token management, request execution
│   │   ├── reolink-discovery.ts      # Capability probing (GetDevInfo, GetAbility, etc.)
│   │   ├── reolink-ptz.ts            # PTZ control commands
│   │   ├── reolink-settings.ts       # Camera settings read/write
│   │   ├── reolink-live-streams.ts   # Live stream URL generation
│   │   └── capability-snapshot.ts    # Normalized capability detection
│   ├── server/              # Fastify backend
│   │   ├── create-server.ts          # Server bootstrap and route registration
│   │   └── routes/                   # API route handlers
│   │       ├── live-view.ts          # Live view playback endpoints
│   │       ├── ptz.ts                # PTZ control endpoints
│   │       └── settings.ts           # Camera settings endpoints
│   ├── media/               # Media relay layer
│   │   ├── live-view-service.ts      # MediaMTX lifecycle management
│   │   ├── mediamtx-runtime.ts       # MediaMTX download, extraction, execution
│   │   ├── mediamtx-config.ts        # MediaMTX configuration generation
│   │   └── live-view-modes.ts        # Live mode definitions and fallback logic
│   ├── config/              # Configuration management
│   │   └── camera-config.ts          # Camera config load/save with Zod validation
│   ├── diagnostics/         # Debug tooling
│   │   └── debug-capture.ts          # Sanitized request/response capture
│   ├── types/               # Shared TypeScript types
│   │   ├── reolink.ts                # Core Reolink API types
│   │   ├── live-view.ts              # Live view and streaming types
│   │   ├── ptz.ts                    # PTZ control types
│   │   └── settings.ts               # Camera settings types
│   └── index.ts             # Application entry point
├── web/                     # React frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   │   ├── LiveViewerFrame.tsx   # Video/image viewer container
│   │   │   ├── ModeSwitcher.tsx      # Transport mode selector
│   │   │   ├── PtzPanel.tsx          # PTZ controls UI
│   │   │   ├── SettingsPanel.tsx     # Camera settings UI
│   │   │   └── ...
│   │   ├── hooks/           # React hooks
│   │   │   ├── use-live-view.ts      # Live view state and playback logic
│   │   │   ├── use-ptz-controls.ts   # PTZ control bindings
│   │   │   └── use-settings.ts       # Settings form state
│   │   ├── lib/             # Frontend utilities
│   │   │   ├── players/              # Player implementations
│   │   │   │   ├── webrtc-player.ts  # WebRTC playback
│   │   │   │   ├── hls-player.ts     # HLS.js-based playback
│   │   │   │   └── snapshot-player.ts# Periodic snapshot refresh
│   │   │   ├── live-view-api.ts      # API client for live view
│   │   │   ├── ptz-api.ts            # API client for PTZ
│   │   │   └── settings-api.ts       # API client for settings
│   │   ├── App.tsx          # Root component
│   │   ├── main.tsx         # Entry point
│   │   └── styles.css       # Global styles
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
├── tests/                   # Test suite
│   ├── fixtures/reolink/    # Captured API responses for testing
│   ├── camera/              # Camera layer tests
│   ├── server/              # Server route tests
│   ├── media/               # Media relay tests
│   └── web/                 # Component tests
├── .local/                  # Runtime artifacts (git-ignored)
│   ├── camera.config.json   # Your camera configuration
│   ├── capabilities/        # Capability snapshots per camera
│   ├── debug/               # Sanitized debug captures
│   └── tools/               # MediaMTX runtime directory
├── .planning/               # GSD planning artifacts
└── package.json
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Dashboard                     │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Live Viewer  │  │ PTZ Panel│  │ Settings Panel    │  │
│  │ (WebRTC/HLS/ │  │          │  │ (read/validate/   │  │
│  │  Snapshot)   │  │          │  │  write)           │  │
│  └──────┬───────┘  └────┬─────┘  └────────┬──────────┘  │
└─────────┼───────────────┼─────────────────┼─────────────┘
          │               │                 │
          ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Fastify Server                        │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ live-view    │  │ ptz      │  │ settings          │  │
│  │ routes       │  │ routes   │  │ routes            │  │
│  └──────┬───────┘  └────┬─────┘  └────────┬──────────┘  │
└─────────┼───────────────┼─────────────────┼─────────────┘
          │               │                 │
          ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                  Camera Session Layer                    │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Reolink      │  │ Capability│  │ Debug Capture     │  │
│  │ Session (auth│  │ Snapshot  │  │ (sanitized logs)  │  │
│  │ + token mgmt)│  │           │  │                   │  │
│  └──────┬───────┘  └──────────┘  └───────────────────┘  │
└─────────┼───────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│                    Media Layer                           │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Live View    │  │ MediaMTX │  │ Live Mode         │  │
│  │ Service      │  │ (RTSP →  │  │ Definitions +     │  │
│  │              │  │ WebRTC/  │  │ Fallback Logic    │  │
│  │              │  │ HLS)     │  │                   │  │
│  └──────────────┘  └──────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│              Reolink RLC-423S Camera (LAN)              │
│  RTSP streams + CGI/API (cgi-bin/api.cgi)               │
└─────────────────────────────────────────────────────────┘
```

## Live View Modes

The dashboard supports multiple streaming transports with automatic fallback:

| Mode | Transport | Quality | Description |
|------|-----------|---------|-------------|
| WebRTC Main | WebRTC | High (main stream) | Lowest latency, preferred when available |
| WebRTC Sub | WebRTC | Lower (sub stream) | Lower bandwidth WebRTC stream |
| HLS Main | HLS | High (main stream) | HTTP-based streaming fallback |
| HLS Sub | HLS | Lower (sub stream) | Lower bandwidth HLS stream |
| Snapshot Main | JPEG | High (main stream) | Periodic snapshot refresh |
| Snapshot Sub | JPEG | Lower (sub stream) | Lower bandwidth snapshots |

The default fallback order is: **WebRTC Main → WebRTC Sub → HLS Sub → Snapshot Main**.

## Camera Configuration

### Config File Location

`.local/camera.config.json`

### Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `baseUrl` | URL | Yes | Camera's LAN URL (e.g., `http://192.168.1.100`) |
| `username` | string | Yes | Camera admin username |
| `password` | string | Yes | Camera admin password |
| `modelHint` | string | No | Model hint if auto-detection fails (default: `"RLC-423S"`) |
| `notes` | string | No | Free-form notes about the camera |
| `debugCapture` | boolean | No | Enable debug artifact capture (default: `false`) |
| `snapshot` | object | No | Cached capability snapshot (auto-populated by `probe`) |

### Safety

All configuration writes use **read → validate → write → verify** flows. The camera config itself is validated against a Zod schema before being written to disk.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Build and start the production server |
| `npm run build` | Build server (TypeScript) and web (Vite) assets |
| `npm run build:server` | Build server TypeScript only |
| `npm run build:web` | Build web frontend with Vite |
| `npm run dev:web` | Start Vite dev server for frontend development |
| `npm test` | Run the full test suite with Vitest |
| `npm run probe` | Probe camera capabilities and save snapshot |

## Debugging

### Probe with Debug Capture

```bash
npm run probe -- --debug
```

This saves a sanitized debug artifact to `.local/debug/` with:
- Masked tokens and redacted passwords
- Full request/response payloads
- Timestamp for correlation

### Debug Artifact Sanitization

The debug capture system automatically:
- Redacts any field containing `"password"` in the key name
- Masks token values with `[MASKED_TOKEN]`
- Recursively sanitizes nested objects

## Testing

```bash
npm test
```

The test suite covers:
- **Camera layer** — Session management, capability discovery, PTZ, settings
- **Server routes** — Live view, PTZ, settings API endpoints
- **Media layer** — Live mode selection, MediaMTX configuration
- **Web components** — Live viewer, PTZ controls, settings panel
- **Fixtures** — Captured Reolink API responses for deterministic testing

### Test Fixtures

Real API responses from a RLC-423S are stored in `tests/fixtures/reolink/` and used for deterministic unit/integration tests:

- `login.json` — Token login response
- `get-dev-info.json` — Device identity
- `get-net-port.json` — Network port configuration
- `get-ability.json` — Camera capability matrix
- `ptz-ctrl.json` — PTZ control response
- `get-ptz-preset.json` — PTZ preset definitions
- `get-*.json` — Various settings responses (ISP, OSD, image, enc, NTP, time)

## Adding Support for Additional Reolink Models

The architecture is designed to be model-agnostic:

1. **Capability Detection** — `probeCamera()` discovers what a camera supports at runtime
2. **Capability Snapshot** — Normalized boolean flags (`supportsPtzControl`, `supportsLiveView`, etc.)
3. **Adapter Pattern** — All camera communication goes through `ReolinkSession` and typed command builders
4. **Model Hint** — Config file supports `modelHint` for disambiguation when auto-detection needs a nudge

To add a new model:
1. Run `npm run probe -- --debug` against the new camera
2. Review the capability snapshot in `.local/capabilities/`
3. Add model-specific fixtures to `tests/fixtures/reolink/` if needed
4. Extend capability flags in `capability-snapshot.ts` if new features are discovered

## Constraints

- **LAN-only** — No cloud dependencies, no external access in v1
- **Single-user** — Designed for personal/local network use
- **Windows-first** — MediaMTX bootstrap currently supports Windows only (expandable)
- **No Flash** — Fully modern browser-based, no plugins required

## License

Private project — not intended for public distribution.
