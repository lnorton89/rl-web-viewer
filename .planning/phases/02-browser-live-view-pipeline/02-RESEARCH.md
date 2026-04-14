# Phase 02: Browser Live View Pipeline - Research

**Researched:** 2026-04-13
**Domain:** Browser-safe live video delivery for a local Node.js Reolink control plane
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Stream Strategy
- **D-01:** Phase 2 should optimize for a low-latency live-view path first rather than a compatibility-first or ship-anything-fast approach.
- **D-02:** The implementation must include a simpler fallback mode when the preferred low-latency stream cannot run successfully.

### Quality And Fallback Selection
- **D-03:** The viewer should auto-pick the best available live mode on startup instead of forcing manual mode selection first.
- **D-04:** The user should still be able to switch manually to other available stream qualities or fallback views after startup.

### Viewer Lifecycle
- **D-05:** The viewer should auto-start when the page opens rather than waiting for a click-to-play flow.
- **D-06:** The viewer should reconnect automatically if the stream drops.

### Status And Failure UX
- **D-07:** The viewer should show clear in-view states such as connecting, live, reconnecting, and failed.
- **D-08:** Failure states should include a retry action and a short human-readable reason rather than only a generic spinner or opaque error.

### the agent's Discretion
- Exact streaming protocol and browser transport choice for the preferred low-latency path
- Exact fallback mode implementation
- Reconnect timing and backoff policy
- Viewer layout, styling, and visual treatment of status overlays
- Whether debug details stay behind a secondary diagnostics surface rather than in the primary viewer

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LIVE-01 | User can open a live view of the camera in a modern browser without Flash or browser plugins. | Use MediaMTX as the RTSP ingest/relay layer and serve WebRTC/WHEP into a browser `<video>` element, with HLS and snapshot fallback paths. |
| LIVE-02 | User can switch between available stream qualities or fallback viewing modes exposed by the connected camera/media pipeline. | Model quality as `main` / `sub` and transport as `webrtc` / `hls` / `snapshot`, gate options from persisted capability data plus live stream health, and keep manual switching in the viewer. |
| LIVE-03 | User can see actionable live-view status and error messages when the media connection fails or the stream format is unsupported. | Implement a viewer state machine with explicit `connecting`, `live`, `reconnecting`, and `failed` states, surface short reasons, and route failures into existing debug capture plus transport-specific diagnostics. |
</phase_requirements>

## Summary

Phase 2 should be planned as a three-part system, not "just a player": a local Node app server, a dedicated media relay, and a browser viewer with an explicit state machine. The best fit for the preferred low-latency path is `RTSP -> MediaMTX -> WebRTC/WHEP -> browser`, because it keeps camera credentials out of the browser, preserves a future multi-model adapter boundary, and uses a current-purpose media server instead of hand-rolled RTSP/WebRTC code. MediaMTX also gives an immediate browser-safe fallback path through HLS and exposes configuration/auth hooks that the Node app can own.

The fallback strategy should not be a second-class afterthought. Reolink officially exposes RTSP main/sub streams, RTMP main/ext/sub streams, and JPEG snapshot URLs. For this repo, the least risky plan is: prefer WebRTC on startup, fall back to HLS when WebRTC connectivity is the problem, and fall back to snapshot mode when live transport or codec support is the problem. Direct Reolink RTMP/FLV can work, but it is more vendor-specific and less aligned with the project's "capability-aware adapter + separate media layer" direction.

This phase also introduces the first browser-facing layer in the repo. Plan for a lightweight React + Vite client served by a Fastify backend, not a one-off HTML file, because Phase 3 and Phase 4 will need persistent dashboard state, diagnostics panels, and transport-aware controls. The viewer must own its startup/reconnect/failure UX instead of delegating that to an iframe or opaque player widget.

**Primary recommendation:** Use a Fastify-served React/Vite dashboard backed by a local MediaMTX sidecar, auto-start with WebRTC/WHEP, fall back to HLS then snapshot, and gate every mode from persisted capabilities plus live transport health.

## Project Constraints (from CLAUDE.md)

- Node.js is the primary application environment.
- v1 is LAN-only and single-user.
- The first supported device is the RLC-423S on firmware `v2.0.0.1055_17110905_v1.0.0.30`.
- No Flash or browser-plugin dependencies are acceptable.
- Camera-specific logic should live behind capability-aware adapters.
- Configuration writes should use read/validate/write/verify flows.
- The architecture should keep a browser dashboard, local app server, camera adapter/session layer, separate media layer, and debug/fixture capture as distinct responsibilities.
- Planning artifacts should stay in the GSD workflow; recommendations here should not assume bypassing it.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| MediaMTX | `v1.17.1` (published 2026-03-31) | RTSP ingest plus WebRTC/WHEP and HLS egress | Current-purpose media relay for IP cameras; avoids hand-rolling RTSP/WebRTC/HLS plumbing and supports browser embedding, auth, proxying, and offline behavior. |
| Fastify | `5.8.4` (published 2026-03-23) | Local app server, API routes, static asset hosting, process supervision | Fits the repo's Node-first backend and gives a clean boundary for credentials, diagnostics, and later PTZ/settings routes. |
| React | `19.2.5` (published 2026-04-08) | Viewer UI and dashboard state | Best fit for the first real browser layer because later phases will add PTZ, settings, and diagnostics to the same surface. |
| React DOM | `19.2.5` (published 2026-04-08) | Browser renderer for the dashboard | Required with React; current stable release verified against npm. |
| Vite | `8.0.8` (published 2026-04-09) | Frontend dev server, bundling, production manifest | Official backend-integration path exists for serving a React app from an existing backend. |
| hls.js | `1.6.16` (published 2026-04-13) | Cross-browser HLS playback fallback | Standard HLS player for MSE-capable browsers; official MediaMTX embed docs use it for custom HLS playback. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@fastify/static` | `9.1.0` (published 2026-04-07) | Serve built Vite assets from Fastify | Use in production to host the built dashboard from the Node app. |
| `@vitejs/plugin-react` | `6.0.1` (published 2026-03-13) | React support for Vite | Required if using React with Vite. |
| `jsdom` | `29.0.2` (published 2026-04-07) | Browser-like test environment for Vitest | Needed once client-side viewer tests exist. |
| `@testing-library/react` | `16.3.2` (published 2026-01-19) | UI interaction and rendering assertions | Use for viewer state and manual switching tests. |
| `@testing-library/user-event` | `14.6.1` (published 2025-01-21) | Realistic UI interaction simulation | Use for mode switching, retry button, and overlay UX tests. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MediaMTX | Direct Reolink RTMP/FLV path | Lower initial moving parts, but vendor-specific, less portable across models, and still requires custom browser playback plumbing. |
| WebRTC + HLS dual-path | HLS-only | Simpler transport plan, but violates the low-latency-first phase decision and degrades live feel. |
| React + Vite | Vanilla TypeScript UI | Smaller initial footprint, but Phase 3/4 dashboard growth becomes harder and test ergonomics get worse. |

**Installation:**
```bash
npm install fastify @fastify/static react react-dom hls.js
npm install -D vite @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
```

**Media relay install:** download MediaMTX `v1.17.1` for Windows (`mediamtx_v1.17.1_windows_amd64.zip`) or run the official Docker image if you prefer containerized local tooling.

**Version verification:** Before implementation, re-check package versions with:
```bash
npm view fastify version
npm view react version
npm view react-dom version
npm view vite version
npm view @vitejs/plugin-react version
npm view hls.js version
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
  camera/          # Existing adapter/session/capability code stays here
  config/          # Existing config loading plus live-view/media config
  diagnostics/     # Existing debug capture plus live-view failure artifacts
  media/           # MediaMTX config generation, source mapping, health probes, sidecar supervisor
  server/          # Fastify app, HTML shell, API routes, mode selection endpoints
  types/           # Shared transport, viewer-state, and diagnostics types
web/
  src/             # React viewer, overlays, dashboard shell, transport hooks
  public/          # Static assets if needed
tests/
  media/           # Source mapping, fallback selection, supervisor tests
  server/          # Route and config generation tests
  web/             # Viewer state/mode switching tests (jsdom)
```

### Pattern 1: Capability-Gated Mode Matrix
**What:** Separate stream quality from transport. Quality is camera/media intent (`main`, `sub`). Transport is browser delivery (`webrtc`, `hls`, `snapshot`).
**When to use:** Always. Do not expose raw protocol URLs or raw CGI fields directly to the viewer.
**Example:**
```ts
type StreamQuality = "main" | "sub";
type StreamTransport = "webrtc" | "hls" | "snapshot";

type LiveMode = {
  id: `${StreamTransport}:${StreamQuality}`;
  quality: StreamQuality;
  transport: StreamTransport;
  enabled: boolean;
};

function buildLiveModes(snapshot: CapabilitySnapshot): LiveMode[] {
  if (!snapshot.supportsLiveView || snapshot.ports.rtsp === 0) {
    return [];
  }

  return [
    { id: "webrtc:main", quality: "main", transport: "webrtc", enabled: true },
    { id: "webrtc:sub", quality: "sub", transport: "webrtc", enabled: true },
    { id: "hls:main", quality: "main", transport: "hls", enabled: true },
    { id: "hls:sub", quality: "sub", transport: "hls", enabled: true },
    { id: "snapshot:main", quality: "main", transport: "snapshot", enabled: snapshot.supportsSnapshot },
    { id: "snapshot:sub", quality: "sub", transport: "snapshot", enabled: snapshot.supportsSnapshot },
  ];
}
```
Source: existing repo capability snapshot design plus Reolink RTSP/RTMP/snapshot documentation.

### Pattern 2: Node-Owned Media Sidecar
**What:** The Node app owns camera credentials and supervises MediaMTX as a local sidecar. The browser only sees app URLs.
**When to use:** For every live-view request. Do not send camera credentials or raw camera URLs to the browser.
**Example:**
```yaml
paths:
  camera_main:
    source: rtsp://CAMERA_USER:CAMERA_PASS@camera-ip:554/h264Preview_01_main
    sourceOnDemand: yes
  camera_sub:
    source: rtsp://CAMERA_USER:CAMERA_PASS@camera-ip:554/h264Preview_01_sub
    sourceOnDemand: yes
```
Source: MediaMTX proxy / on-demand source pattern and Reolink RTSP main/sub URL conventions.

### Pattern 3: Viewer State Machine, Not Ad-Hoc Flags
**What:** Model viewer lifecycle as explicit states with reasons and retry policy.
**When to use:** Always. Startup, reconnect, and failure UX is a phase requirement, not decoration.
**Example:**
```ts
type ViewerState =
  | { kind: "idle" }
  | { kind: "connecting"; modeId: string }
  | { kind: "live"; modeId: string }
  | { kind: "reconnecting"; modeId: string; attempt: number; reason: string }
  | { kind: "failed"; modeId: string; reason: string; canRetry: true };
```
Source: phase decisions plus MediaMTX/HLS.js event-driven playback APIs.

### Pattern 4: Prefer WebRTC, Degrade Gracefully
**What:** Auto-select the lowest-risk low-latency mode first, then move down a fixed fallback ladder.
**When to use:** On initial page load and after unrecoverable transport errors.
**Recommended startup order:** `webrtc:main` -> `webrtc:sub` -> `hls:sub` -> `snapshot:main`

### Anti-Patterns to Avoid
- **Browser talks directly to camera:** Leaks credentials, breaks the local control-plane boundary, and makes diagnostics/auth retries harder.
- **Opaque iframe player as the main implementation:** Fast to demo, but it blocks the required state/error UX and manual mode switching.
- **Transport and quality treated as the same setting:** Makes fallback behavior confusing and harder to test.
- **Single indefinite spinner:** Violates `LIVE-03`; show explicit reasoned states and a retry action.
- **Automatic retry with no ceiling or diagnostics:** Creates failure loops that hide real unsupported-mode problems.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RTSP ingestion and browser-safe egress | Custom RTSP parser + WebRTC server + HLS packager | MediaMTX | This is the exact class of infrastructure MediaMTX already solves, including auth, path mapping, WHEP, HLS, and offline behavior. |
| HLS browser playback | Manual MSE append pipeline | hls.js | Browser support, MSE edge cases, and native-HLS fallback are already solved. |
| Frontend bundling and backend asset plumbing | Bespoke dev server + hashed asset loader | Vite backend integration | Official guide already covers dev and production backend integration. |
| UI interaction testing | Manual DOM harness | Testing Library + jsdom + Vitest | Faster phase verification and better regression coverage for viewer states. |

**Key insight:** The risky part of this phase is transport behavior under real browser conditions. Save engineering time for stream probing, diagnostics, and viewer UX; do not spend it rebuilding media infrastructure.

## Common Pitfalls

### Pitfall 1: Assuming "RTSP port present" means "browser playback works"
**What goes wrong:** Planning assumes any RTSP-capable camera stream is browser-ready once relayed.
**Why it happens:** RTSP availability and browser codec support are separate problems.
**How to avoid:** Add a Wave 0 live probe that confirms main/sub codec, audio codec, and actual browser playback through WebRTC and HLS.
**Warning signs:** WebRTC connects but video never renders, or HLS manifest loads but playback stalls immediately.

### Pitfall 2: Treating WebRTC failure as total live-view failure
**What goes wrong:** The app declares the stream broken when the real issue is WebRTC connectivity, CORS, or auth headers.
**Why it happens:** WebRTC and HLS fail for different reasons; only one transport is being observed.
**How to avoid:** Keep HLS as a separate fallback path, and record which transport failed plus the last human-readable reason.
**Warning signs:** WebRTC errors on some browsers while HLS or snapshot still works.

### Pitfall 3: Using main/sub only as a transport fallback
**What goes wrong:** The UI makes "sub" feel like a broken backup instead of a deliberate low-bandwidth quality choice.
**Why it happens:** Quality and transport are collapsed into a single setting.
**How to avoid:** Keep `quality` and `transport` independent in both server and UI models.
**Warning signs:** Manual switching cannot express "WebRTC sub" or "HLS main" cleanly.

### Pitfall 4: Forgetting that Reolink's legacy URLs embed credentials
**What goes wrong:** URLs copied from vendor docs end up in client logs, browser history, or debug artifacts.
**Why it happens:** Reolink examples frequently show user/password in query strings.
**How to avoid:** Terminate credentials inside the Node app or MediaMTX config; sanitize every captured artifact using the existing debug path.
**Warning signs:** Browser devtools or app logs reveal raw camera usernames, passwords, or tokenized URLs.

### Pitfall 5: Reconnect loops that hide unsupported-mode bugs
**What goes wrong:** The viewer repeatedly retries a mode that will never work and never exposes why.
**Why it happens:** Retry logic is added before failure classification.
**How to avoid:** Cap retries per mode, classify failure type, and step down the fallback ladder when a mode is unsupported.
**Warning signs:** Viewer alternates between `connecting` and `reconnecting` forever with no actionable reason.

## Code Examples

Verified patterns from official sources:

### MediaMTX WebRTC Reader Setup
```ts
let reader: MediaMTXWebRTCReader | null = null;

reader = new MediaMTXWebRTCReader({
  url: "http://127.0.0.1:8889/camera_main/whep",
  onTrack: (event) => {
    video.srcObject = event.streams[0];
  },
  onError: (error) => {
    setViewerState({
      kind: "reconnecting",
      modeId: "webrtc:main",
      attempt: 1,
      reason: String(error),
    });
  },
});
```
Source: https://mediamtx.org/docs/features/embed-streams-in-a-website

### HLS Fallback Detection
```ts
if (video.canPlayType("application/vnd.apple.mpegurl")) {
  video.src = "http://127.0.0.1:8888/camera_sub/index.m3u8";
} else if (Hls.isSupported()) {
  const hls = new Hls();
  hls.attachMedia(video);
  hls.on(Hls.Events.MEDIA_ATTACHED, () => {
    hls.loadSource("http://127.0.0.1:8888/camera_sub/index.m3u8");
  });
}
```
Source: https://github.com/video-dev/hls.js/ and https://mediamtx.org/docs/features/embed-streams-in-a-website

### React Bootstrap for an Existing Backend
```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("app")!).render(<App />);
```
Source: https://react.dev/learn/add-react-to-an-existing-project

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flash/browser-plugin vendor playback | Browser-native `<video>` playback via WebRTC/WHEP or HLS relay | 2020s | Eliminates plugin dependence and keeps compatibility with modern browsers. |
| Direct camera protocols in browser | Local app-owned credentials + media relay sidecar | 2020s | Better security boundary, retry control, and future adapter portability. |
| One transport path only | Preferred low-latency path plus explicit fallback ladder | 2023-2026 streaming tooling | Lets the app distinguish unsupported codecs from transient connectivity failures. |

**Deprecated/outdated:**
- Flash-era browser access: incompatible with the project constraints and unnecessary once the local app owns the media path.
- Vendor-specific URL playback as the primary architecture: useful for probing and fallback, but not the right long-term interface boundary.

## Open Questions

1. **What exact codecs does this RLC-423S firmware expose on main and sub RTSP streams?**
   - What we know: the camera exposes RTSP/RTMP ports, Reolink documents H.264-focused RTMP behavior, and the target model is older than the H.265-heavy newer lineup.
   - What's unclear: whether main and sub are both H.264, whether audio is present, and whether any stream requires re-encoding for reliable browser playback.
   - Recommendation: make live codec probing a Wave 0 task before UI polish.

2. **How should MediaMTX be shipped on Windows for this repo?**
   - What we know: Docker is available locally, but `mediamtx` is not installed.
   - What's unclear: whether the project wants a pinned downloaded binary, a checked-in tool bootstrap, or a Docker-based local runtime.
   - Recommendation: decide this explicitly in planning; treat it as execution-critical, not incidental.

3. **Should snapshot fallback be still-only or polled at a low interval?**
   - What we know: Reolink officially supports JPEG snapshot URLs, and snapshot fallback is the most robust unsupported-format escape hatch.
   - What's unclear: whether "fallback viewing mode" in this phase should imply a periodically refreshed image or a manual retry still.
   - Recommendation: plan for low-frequency auto-refresh (for example 1-2 fps equivalent) only if it does not complicate failure UX; otherwise ship manual-refresh snapshot first.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Fastify server, Vite build, existing app runtime | Yes | `v22.18.0` | n/a |
| npm | Dependency installation and scripts | Yes | `10.9.3` | n/a |
| Git | Commit docs and normal repo workflow | Yes | `2.51.1.windows.1` | n/a |
| Docker | Optional MediaMTX runtime path | Yes | `29.4.0` | Use native MediaMTX binary instead |
| MediaMTX binary | Preferred relay/runtime for live view | No | n/a | Download pinned Windows zip or run Docker image |
| ffmpeg / ffprobe | Optional re-encoding and codec inspection | No | n/a | Avoid re-encoding in Phase 2, probe with MediaMTX/manual browser checks, and use snapshot fallback |

**Missing dependencies with no fallback:**
- None. Phase 2 is executable without a preinstalled global dependency if the plan includes a pinned MediaMTX bootstrap step.

**Missing dependencies with fallback:**
- MediaMTX is not installed globally. Use the pinned Windows release zip or Docker.
- ffmpeg is not installed. Plan around H.264-first transport and snapshot fallback unless live probing proves transcoding is required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `Vitest 4.1.4` |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/live-view/*.test.ts -x` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIVE-01 | Browser-safe live view boots with a preferred mode and usable fallback URLs | unit + integration | `npx vitest run tests/media/live-mode-selection.test.ts tests/server/live-view-routes.test.ts -x` | No - Wave 0 |
| LIVE-02 | Manual quality and fallback switching keeps transport and quality choices explicit | unit + jsdom | `npx vitest run tests/media/live-mode-selection.test.ts tests/web/live-view-controls.test.tsx -x` | No - Wave 0 |
| LIVE-03 | Viewer surfaces connecting/live/reconnecting/failed states with retry and human-readable reason | jsdom + unit | `npx vitest run tests/web/live-view-viewer.test.tsx tests/media/live-view-errors.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** targeted `vitest` command for the files touched in that task
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green plus one live manual smoke check against the real camera before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/media/live-mode-selection.test.ts` - covers startup ordering and fallback ladder for `LIVE-01` and `LIVE-02`
- [ ] `tests/server/live-view-routes.test.ts` - covers app-owned URLs, auth boundary, and diagnostics hooks for `LIVE-01` and `LIVE-03`
- [ ] `tests/web/live-view-viewer.test.tsx` - covers overlay states, retry button, and reconnect UX for `LIVE-03`
- [ ] `tests/web/live-view-controls.test.tsx` - covers manual mode and quality selection for `LIVE-02`
- [ ] Browser-like test environment: install `jsdom`, `@testing-library/react`, and `@testing-library/user-event`

## Sources

### Primary (HIGH confidence)
- MediaMTX docs - WebRTC clients, web browser playback, embedding, authentication, proxying, and always-available behavior
  https://mediamtx.org/docs/read/webrtc
  https://mediamtx.org/docs/read/web-browsers
  https://mediamtx.org/docs/features/embed-streams-in-a-website
  https://mediamtx.org/docs/features/authentication
  https://mediamtx.org/docs/features/proxy
  https://mediamtx.org/docs/features/always-available
- MediaMTX official release metadata - current binary version and publish date
  https://github.com/bluenviron/mediamtx/releases/tag/v1.17.1
- Reolink official support - RTMP URL formats, snapshot URLs, browser access constraints
  https://support.reolink.com/articles/23528840063769-Introduction-to-Real-Time-Messaging-Protocol-RTMP/
  https://support.reolink.com/articles/360007011233-How-to-Capture-Live-JPEG-Image-of-Reolink-Cameras-via-Web-Browsers/
  https://support.reolink.com/articles/900000501083-Which-Cameras-NVRs-Home-Hub-Can-be-Accessed-via-Web-Browsers/
- Vite official docs - backend integration and manifest-driven production serving
  https://vite.dev/guide/backend-integration.html
- React official docs - adding React to an existing project
  https://react.dev/learn/add-react-to-an-existing-project
- hls.js official GitHub README - supported environments and fallback detection pattern
  https://github.com/video-dev/hls.js/
- npm registry package metadata - current versions and publish dates
  https://www.npmjs.com/package/fastify
  https://www.npmjs.com/package/@fastify/static
  https://www.npmjs.com/package/react
  https://www.npmjs.com/package/react-dom
  https://www.npmjs.com/package/vite
  https://www.npmjs.com/package/@vitejs/plugin-react
  https://www.npmjs.com/package/hls.js
  https://www.npmjs.com/package/jsdom
  https://www.npmjs.com/package/@testing-library/react
  https://www.npmjs.com/package/@testing-library/user-event

### Secondary (MEDIUM confidence)
- None.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - current versions were verified from npm or official release metadata, and the transport/server choices are backed by official docs.
- Architecture: MEDIUM - the overall shape is well-supported, but the exact codec behavior of this firmware still needs a live probe.
- Pitfalls: MEDIUM - well-supported by official transport/browser docs, but some failure modes depend on the real camera stream and chosen Windows runtime packaging.

**Research date:** 2026-04-13
**Valid until:** 2026-05-13
