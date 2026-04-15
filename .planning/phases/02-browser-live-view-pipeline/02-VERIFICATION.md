---
phase: 02-browser-live-view-pipeline
verified: 2026-04-15T01:41:03.8620032Z
status: human_needed
score: 13/13 must-haves verified
human_verification:
  - test: "Real browser live startup against the configured RLC-423S"
    expected: "Opening the local app shows Connecting, then Live, with browser-safe playback and no Flash or plugin dependency."
    why_human: "Requires a real camera, MediaMTX sidecar startup, and actual browser media negotiation."
  - test: "Manual mode switching in a real browser session"
    expected: "Switching between supported WebRTC, HLS, and snapshot modes changes the active surface without exposing camera URLs or credentials."
    why_human: "Needs end-to-end browser playback plus an actual camera-backed relay."
  - test: "Failure and recovery handling with the camera or relay disrupted"
    expected: "The viewer shows Reconnecting, then Live View Failed with a short reason, and Retry Live View can recover when the source returns."
    why_human: "Requires inducing real relay or camera failures and observing user-facing behavior."
---

# Phase 2: Browser Live View Pipeline Verification Report

**Phase Goal:** Replace the Flash-era viewing path with a browser-safe live-view experience backed by the local app.
**Verified:** 2026-04-15T01:41:03.8620032Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The app can derive browser-safe live-view modes from the persisted capability snapshot before any UI is rendered | ✓ VERIFIED | `src/media/live-view-modes.ts` builds modes from `CapabilitySnapshot`; `tests/media/live-mode-selection.test.ts` covers live, snapshot-disabled, and no-live-view cases |
| 2 | The backend and frontend share typed browser playback endpoints instead of reconstructing WHEP, HLS, or snapshot URLs ad hoc | ✓ VERIFIED | `src/types/live-view.ts` defines `LiveViewPlayback`; `web/src/lib/live-view-api.ts` returns the typed bootstrap; `web/src/hooks/use-live-view.ts` consumes `whepUrl`, `hlsUrl`, and `snapshotUrl` directly |
| 3 | Phase 2 can install, typecheck, smoke-test, and build the browser workspace required for live view before backend and UI plans branch | ✓ VERIFIED | `package.json`, `vitest.config.ts`, `web/vite.config.ts`, `web/index.html`, and `tests/web/browser-workspace.test.tsx` exist; `npm run build` passed |
| 4 | The browser can request live-view URLs and fallback metadata from the local app without receiving camera credentials | ✓ VERIFIED | `src/server/routes/live-view.ts` returns `/api/live-view` and rejects unsafe payloads; `tests/server/live-view-routes.test.ts` asserts no `token=`, `rtsp://`, or password leakage |
| 5 | The app can bootstrap a preferred low-latency live mode and expose fallback and snapshot routes for later UI use | ✓ VERIFIED | `src/media/live-view-service.ts` builds preferred/fallback modes and playback URLs; `src/server/routes/live-view.ts` exposes `/api/live-view`, `/api/live-view/snapshot/:quality`, and `/api/live-view/health` |
| 6 | Live-view startup and bootstrap failures can be surfaced as short reasons and sanitized diagnostics | ✓ VERIFIED | `classifyLiveViewFailure()` and `writeDebugArtifact()` sanitize output; `tests/media/live-view-errors.test.ts` verifies short reasons and debug artifact creation |
| 7 | The app can start the correct live stream for the connected camera while keeping firmware-specific path selection inside the adapter layer | ✓ VERIFIED | `src/camera/reolink-live-streams.ts` owns `h264Preview_01_main` and `h264Preview_01_sub`; `src/media/mediamtx-config.ts` only uses generic `camera_main` and `camera_sub` |
| 8 | The dashboard auto-starts a browser-safe live mode when the page opens | ✓ VERIFIED | `web/src/hooks/use-live-view.ts` fetches bootstrap on mount and begins the preferred mode; `tests/web/live-view-viewer.test.tsx` verifies auto-start |
| 9 | The viewer state machine uses backend-provided playback endpoints rather than rebuilding URLs in the browser | ✓ VERIFIED | `web/src/hooks/use-live-view.ts` selects player URLs from `mode.playback`; player adapters accept explicit URLs; viewer tests verify attachment URLs |
| 10 | The viewer shows connecting, live, reconnecting, and failed states with retry and short reasons before UI chrome is layered on top | ✓ VERIFIED | `web/src/hooks/use-live-view.ts` models the four states and retry delays; `tests/web/live-view-viewer.test.tsx` covers lifecycle, fallback, and retry |
| 11 | The user can switch between supported stream qualities and fallback modes after startup | ✓ VERIFIED | `web/src/components/ModeSwitcher.tsx` renders available modes and calls `selectMode`; `tests/web/live-view-controls.test.tsx` verifies manual switching |
| 12 | The viewer shows connecting, live, reconnecting, and failed states in-frame with retry and short reasons | ✓ VERIFIED | `web/src/components/ViewerStatusOverlay.tsx` renders the exact labels and retry button; `tests/web/live-view-controls.test.tsx` verifies label coverage and `Retry Live View` |
| 13 | Diagnostics stay secondary while still exposing current mode, last reason, and next fallback | ✓ VERIFIED | `web/src/components/DiagnosticsDisclosure.tsx` stays collapsed by default and only shows hook-provided mode, reason, and `nextFallbackModeId`; controls test verifies the disclosure behavior |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `package.json` | Browser/live-view stack scripts and deps | ✓ VERIFIED | Contains `build:web`, `dev:web`, Fastify, React, `hls.js`, and test/build scripts |
| `src/types/live-view.ts` | Shared live-view contract | ✓ VERIFIED | Exports `StreamQuality`, `StreamTransport`, `LiveModeId`, `ViewerStateKind`, `LiveViewPlayback`, `LiveViewBootstrap`, and `LiveViewDiagnostics` |
| `src/media/live-view-modes.ts` | Capability-gated mode matrix and fallback order | ✓ VERIFIED | Encodes `DEFAULT_MODE_ORDER`, builds enabled modes, and computes fallback order |
| `src/camera/reolink-live-streams.ts` | Adapter-owned Reolink RTSP path selection | ✓ VERIFIED | Keeps firmware-specific `h264Preview_01_main` and `h264Preview_01_sub` out of the generic media layer |
| `tests/media/mediamtx-runtime-config.test.ts` | MediaMTX pinning and relay config coverage | ✓ VERIFIED | Covers pinned runtime path/ZIP and `camera_main`/`camera_sub` config generation |
| `src/media/live-view-service.ts` | Live-view bootstrap, relay startup, failure classification | ✓ VERIFIED | Builds app-owned playback URLs, health state, and sanitized bootstrap failures |
| `src/server/routes/live-view.ts` | Fastify live-view routes | ✓ VERIFIED | Implements `/api/live-view`, `/api/live-view/snapshot/:quality`, and `/api/live-view/health` |
| `tests/media/live-view-errors.test.ts` | Failure classification and bootstrap diagnostics coverage | ✓ VERIFIED | Covers `classifyLiveViewFailure`, unsupported-mode bootstrap, and browser-safe playback fields |
| `web/src/hooks/use-live-view.ts` | Viewer state machine and media binding contract | ✓ VERIFIED | Exposes `renderKind`, callback refs, fallback metadata, manual selection, and retry |
| `web/src/lib/live-view-api.ts` | Browser bootstrap client | ✓ VERIFIED | Fetches `/api/live-view` and returns the typed contract |
| `tests/web/live-view-viewer.test.tsx` | Viewer lifecycle and player-binding coverage | ✓ VERIFIED | Verifies mount, transitions, fallback, retry, and callback-ref binding |
| `web/src/components/LiveViewerFrame.tsx` | Viewer surface and overlay composition | ✓ VERIFIED | Mounts `<video>` or `<img>` based on `renderKind` and hands nodes back through callback refs |
| `web/src/components/ModeSwitcher.tsx` | Manual transport/quality selector | ✓ VERIFIED | Renders the supported mode list and uses hook-driven selection |
| `tests/web/live-view-controls.test.tsx` | UI coverage for controls and diagnostics | ✓ VERIFIED | Verifies overlay labels, retry button, diagnostics disclosure, and hook-provided next fallback |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/camera/capability-snapshot.ts` | `src/media/live-view-modes.ts` | normalized capability flags mapped into enabled live-view modes | ✓ WIRED | `buildLiveModes()` consumes `CapabilitySnapshot.supportsLiveView`, `supportsSnapshot`, and `ports.rtsp` |
| `src/camera/reolink-live-streams.ts` | `src/media/mediamtx-config.ts` | adapter-resolved camera stream sources mapped onto generic app relay paths | ✓ WIRED | `buildMediaMtxSourceMap()` maps adapter outputs to `camera_main` and `camera_sub` |
| `src/server/routes/live-view.ts` | `src/media/live-view-service.ts` | bootstrap JSON returned from the Fastify route | ✓ WIRED | Route calls `buildLiveViewBootstrap()` and returns its JSON payload |
| `web/src/hooks/use-live-view.ts` | `/api/live-view` | bootstrap fetch on mount | ✓ WIRED | Hook calls `fetchLiveViewBootstrap()` on mount; helper targets `/api/live-view` |
| `web/src/hooks/use-live-view.ts` | `web/src/lib/players/webrtc-player.ts`, `hls-player.ts`, `snapshot-player.ts` | selected transport attaches the matching playback adapter | ✓ WIRED | Hook dispatches to `attachWebRtcPlayer`, `attachHlsPlayer`, or `attachSnapshotPlayer` from mode transport |
| `web/src/hooks/use-live-view.ts` | `web/src/components/LiveViewerFrame.tsx` | the hook exposes callback refs and render target for the frame | ✓ WIRED | `App.tsx` passes `renderKind`, `bindVideoElement`, and `bindImageElement` into `LiveViewerFrame` |
| `web/src/App.tsx` | `web/src/components/LiveViewerFrame.tsx` | app passes media-binding contract and viewer state into the frame | ✓ WIRED | `App.tsx` passes current mode label, retry, fallback id, render kind, playback, and binding refs |
| `web/src/components/LiveViewerFrame.tsx` | `web/src/hooks/use-live-view.ts` | frame mounts the correct media surface and returns the DOM node through callback refs | ✓ WIRED | `<video>` and `<img>` refs are conditionally bound to hook callbacks |
| `web/src/components/ModeSwitcher.tsx` | `web/src/hooks/use-live-view.ts` | manual mode selection stays sticky until definitive failure | ✓ WIRED | `ModeSwitcher` invokes `onSelectMode`, which is `useLiveView().selectMode` from `App.tsx` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/media/live-view-service.ts` | `hydratedModes`, `preferredModeId`, `fallbackOrder` | `loadCameraConfig()` + `loadCapabilitySnapshot()` + `resolveReolinkLiveStreams()` | Yes | ✓ FLOWING |
| `src/server/routes/live-view.ts` | live-view bootstrap JSON | `buildLiveViewBootstrap(request.headers.host)` | Yes | ✓ FLOWING |
| `src/server/routes/live-view.ts` | snapshot bytes | `fetchCameraSnapshot()` server-side `fetch()` to `/cgi-bin/api.cgi?cmd=Snap...` | Yes | ✓ FLOWING |
| `web/src/lib/live-view-api.ts` | `LiveViewBootstrap` | `fetch('/api/live-view')` | Yes | ✓ FLOWING |
| `web/src/hooks/use-live-view.ts` | `activePlayback`, `currentModeId`, `nextFallbackModeId` | bootstrap contract plus hook-managed retry/fallback state | Yes | ✓ FLOWING |
| `web/src/App.tsx` | viewer and diagnostics props | `useLiveView()` return value | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Phase 02 server and browser bundles build successfully | `npm run build` | Passed; server TypeScript build succeeded and Vite emitted `dist/.vite/manifest.json`, `dist/web/index.html`, CSS, and JS assets | ✓ PASS |
| Phase 02 media/server/browser tests pass | `npx vitest run tests/media/live-mode-selection.test.ts tests/media/mediamtx-runtime-config.test.ts tests/media/live-view-errors.test.ts tests/server/live-view-routes.test.ts tests/web/browser-workspace.test.tsx tests/web/live-view-viewer.test.tsx tests/web/live-view-controls.test.tsx` | Passed; 7 test files, 21 tests | ✓ PASS |
| Planned `vitest -x` verification commands remain runnable | `npx vitest run ... -x` | Current Vitest 4.1.4 rejects `-x` as an unknown option; equivalent supported command above passed | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `LIVE-01` | `02-01`, `02-02`, `02-03` | User can open a live view of the camera in a modern browser without Flash or browser plugins | ✓ SATISFIED | Browser-safe contract, Fastify live-view API, WebRTC/HLS/snapshot adapters, React entrypoint, and passing browser/viewer tests |
| `LIVE-02` | `02-01`, `02-02`, `02-04` | User can switch between available stream qualities or fallback viewing modes exposed by the connected camera/media pipeline | ✓ SATISFIED | Capability-gated mode matrix, fallback order, `ModeSwitcher`, and controls tests |
| `LIVE-03` | `02-02`, `02-03`, `02-04` | User can see actionable live-view status and error messages when the media connection fails or the stream format is unsupported | ✓ SATISFIED | `classifyLiveViewFailure()`, viewer retry/failure states, overlay labels, diagnostics disclosure, and passing tests |

Orphaned requirements: none. The plan frontmatter requirement IDs match Phase 2 in `REQUIREMENTS.md`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `web/src/lib/players/mediamtx-webrtc-reader.ts` | 1 | `@ts-nocheck` on vendored upstream helper | ℹ️ Info | The pinned MediaMTX reader is intentionally vendored and not type-checked; not a blocker, but future local edits in this file have weaker TS safety |

### Human Verification Required

### 1. Real Browser Live Startup

**Test:** Start the local app with a valid `.local/camera.config.json` and persisted capability snapshot, then open the dashboard in a modern browser on the LAN.
**Expected:** The viewer shows `Connecting`, then `Live`, and actual camera video or snapshot fallback appears without Flash or plugins.
**Why human:** Requires the real RLC-423S, MediaMTX runtime bootstrap, and browser media negotiation.

### 2. Manual Mode Switching

**Test:** While live view is running, use the mode buttons to switch among supported WebRTC, HLS, and snapshot modes.
**Expected:** The active mode changes, the correct media surface remains mounted, and diagnostics stay secondary.
**Why human:** Needs end-to-end media playback from the real camera and browser UX confirmation.

### 3. Failure and Recovery UX

**Test:** Interrupt the camera or relay after playback starts, then restore it and use `Retry Live View`.
**Expected:** The UI shows `Reconnecting`, then `Live View Failed` with a short reason when recovery is exhausted, and `Retry Live View` recovers when the source returns.
**Why human:** Requires inducing real transport failures and observing user-facing timing and messaging.

### Gaps Summary

No implementation gaps were found in the Phase 02 codebase relative to the declared plan must-haves. The remaining work is human validation of real camera-backed playback and failure behavior, which cannot be proven from static inspection and automated local tests alone.

---

_Verified: 2026-04-15T01:41:03.8620032Z_
_Verifier: Claude (gsd-verifier)_
