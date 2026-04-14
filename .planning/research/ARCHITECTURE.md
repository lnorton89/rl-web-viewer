# Research: Architecture

## Suggested Components

### 1. Browser Dashboard

Responsibilities:

- Render live view
- Present PTZ controls
- Present device info and editable settings
- Show diagnostics and unsupported-feature messaging

Boundary:

- Talks only to the local Node app, never directly to the camera

### 2. Local App Server

Responsibilities:

- Host the UI
- Expose internal API routes for camera control and configuration
- Protect credentials from the browser
- Centralize retries, logging, and request validation

Boundary:

- Talks to the browser on one side and the camera adapter/media layers on the other

### 3. Camera Session + Adapter Layer

Responsibilities:

- Authenticate to the camera
- Manage session token/login lifecycle
- Normalize model/firmware-specific APIs into stable app-level operations
- Publish a capability map to the rest of the system

Boundary:

- Owns direct CGI/control requests to the camera

### 4. Media Layer

Responsibilities:

- Connect to RTSP or snapshot endpoints
- Bridge or transcode camera output into a browser-consumable stream
- Handle stream fallback and status reporting

Boundary:

- Owns media transport concerns; should stay separate from PTZ/settings logic

### 5. Settings/Config Service

Responsibilities:

- Read current camera configuration
- Validate edits before writing
- Perform safe write flows and verify applied changes

Boundary:

- Uses the adapter layer; should not know raw firmware quirks directly

### 6. Diagnostics / Fixture Capture

Responsibilities:

- Capture raw request/response samples in debug mode
- Record unsupported endpoints and error payloads
- Feed tests and future model-support work

## Data Flow

1. User opens the local dashboard in a browser.
2. Browser requests live view, PTZ actions, or settings through the Node app.
3. Node app routes control requests through the camera adapter/session layer.
4. Adapter logs in if needed, issues CGI/config requests, and returns normalized results.
5. Media requests go through the media layer, which exposes a browser-safe live view path.
6. Diagnostics capture unexpected responses and capability differences for debugging.

## Suggested Build Order

1. Camera session/authentication and device info discovery
2. Capability map for the RLC-423S firmware
3. Live-view media pipeline in the browser
4. PTZ controls
5. Read-only settings/config pages
6. Safe config writes with validation and verification
7. Hardening, diagnostics, and adapter abstraction cleanup

This order reduces risk by proving connectivity and media compatibility before spending time on polished controls and configuration editors.
