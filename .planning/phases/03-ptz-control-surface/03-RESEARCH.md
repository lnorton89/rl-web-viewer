# Phase 3: PTZ Control Surface - Research

**Researched:** 2026-04-14
**Domain:** Reolink PTZ CGI/API + Fastify/React control surface
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pan and tilt should use press-and-hold controls rather than click-per-step as the primary interaction.
- **D-02:** Zoom should use explicit click actions for zoom in and zoom out rather than continuous hold behavior.
- **D-03:** PTZ controls should live in a dedicated panel attached to the viewer layout instead of floating over the video by default.
- **D-04:** The panel can sit beside the viewer on larger screens or below it on smaller screens as long as it remains clearly part of the viewer surface.
- **D-05:** PTZ movement should stop immediately when the user releases the pan or tilt control.
- **D-06:** The UI should also expose a clearly visible Stop control as a recovery path for pointer-loss, focus-loss, or unexpected motion cases.
- **D-07:** Presets should render as a simple labeled list or grid rather than a hidden disclosure-first pattern.
- **D-08:** Preset controls should only appear when the connected camera capability snapshot says preset support is available.

### Claude's Discretion
- Exact PTZ button shapes, iconography, and visual styling
- Whether the dedicated PTZ panel is side-by-side or stacked for a given viewport width
- Whether keyboard support fits cleanly in this phase or should stay deferred
- Exact preset ordering and empty-state copy when preset metadata is sparse

### Deferred Ideas (OUT OF SCOPE)
- Patrol route authoring or editing remains future work rather than part of this phase.
- Rich keyboard-first PTZ interaction is optional and can move to a later phase if it complicates the primary pointer workflow.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PTZ-01 | User can pan, tilt, and zoom the camera from the web dashboard. | Use backend-owned `PtzCtrl` routes for motion and bounded zoom pulses; reuse `ReolinkSession`; keep browser logic pointer-driven only. |
| PTZ-02 | User can stop PTZ movement promptly from the dashboard after starting motion. | Use press-hold `PtzCtrl` start + explicit `Stop`, pointer capture, `pointercancel`, `lostpointercapture`, `blur`, `visibilitychange`, and a server-side watchdog stop timer. |
| PTZ-03 | User can view and trigger saved PTZ presets when the connected camera/firmware supports them. | Load enabled presets from `GetPtzPreset`, gate via `supportsPtzPreset`, and recall via `PtzCtrl` `ToPos` using the preset id. |
</phase_requirements>

## Summary

Phase 3 should extend the existing control plane rather than introduce any direct browser-to-camera logic. The repo already has the correct seams: Fastify route plugins, a reusable authenticated `ReolinkSession`, persisted capability snapshots, and a viewer-first React shell. The planner should add a PTZ-specific service and route plugin that owns all camera PTZ traffic, hides credentials and token handling from the browser, and returns only browser-safe capability and preset data.

For the RLC-423S class API, pan/tilt/zoom all route through `PtzCtrl`, presets are discovered through `GetPtzPreset`, and preset recall uses `PtzCtrl` with `ToPos`. The critical behavior is that motion is continuous until `Stop` is sent. That means Phase 3 is not just a button-layout task: the browser must treat press-and-hold as a start/stop lifecycle, and the backend should add a short watchdog stop timer so pointer loss, tab switching, or dropped requests do not leave the camera moving.

There are firmware-level inconsistencies the plan must absorb instead of ignoring. The API guide and community SDKs disagree on zoom direction naming (`ZoomInc` vs `ZoomDec`), and one SDK disagrees on whether preset recall uses `id` or `index`. The planner should treat those as adapter-verified details for this exact firmware, not as universal truths, and should budget one hardware verification step plus fixture capture early in the phase.

**Primary recommendation:** Add a `reolink-ptz` backend service plus `ptzRoutes` Fastify plugin, implement pan/tilt as press-hold `PtzCtrl` start plus guaranteed `Stop`, implement zoom as short server-side pulses, and render presets only from `GetPtzPreset` entries whose `enable` flag is truthy.

## Project Constraints (from CLAUDE.md)

- Use Node.js as the primary application environment.
- Keep v1 LAN-only and single-user.
- Target the RLC-423S first, specifically firmware `v2.0.0.1055_17110905_v1.0.0.30`.
- Do not depend on Flash or browser plugins.
- Keep camera-specific behavior behind capability-aware adapters.
- Keep write/control flows conservative and explicit rather than optimistic.
- Stay inside the GSD planning workflow for implementation work.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fastify` | `5.8.5` | Local PTZ API routes and UI hosting | Already established in the repo; keeps credentials and retries server-side. |
| `react` | `19.2.5` | PTZ panel, press-hold controls, preset UI | Already drives the viewer shell and fits pointer-event control surfaces cleanly. |
| `zod` | `4.3.6` | Route body validation and camera response parsing | The repo already uses runtime validation for firmware-varying responses. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `4.1.4` | Node and jsdom validation for PTZ service/routes/UI | Use for adapter, route, and browser lifecycle tests. |
| `src/camera/reolink-session.ts` | repo-local | Login, token reuse, auth retry | Use for every PTZ command instead of inventing another camera client. |
| `src/camera/capability-snapshot.ts` | repo-local | PTZ and preset gating | Use before exposing any PTZ or preset UI/API. |
| `src/diagnostics/debug-capture.ts` | repo-local | Sanitized artifact capture for firmware surprises | Use when preset payloads or PTZ responses do not match expected shapes. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Backend-owned PTZ routes | Browser calls camera CGI directly | Reject: exposes credentials/tokens, duplicates auth logic, and breaks the repo's control-plane boundary. |
| `PtzCtrl` zoom pulse | `StartZoomFocus` absolute zoom position flow | `StartZoomFocus` is more stateful and needs absolute zoom-position management; too much surface area for this phase. |
| Capability snapshot gating | Raw ability parsing in React | Reject: duplicates backend normalization and risks UI drift across models/firmware. |

**Installation:**
```bash
# No new package install is recommended for Phase 3.
# Reuse the repo-pinned stack already present in package.json.
```

**Version verification:** Verified from npm on 2026-04-14:
- `fastify` `5.8.5` - published `2026-04-14T12:07:12.232Z`
- `react` `19.2.5` - published `2026-04-08T18:39:24.455Z`
- `vitest` `4.1.4` - published `2026-04-09T07:36:52.741Z`
- `zod` `4.3.6` - published `2026-01-22T19:14:35.382Z`

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── camera/
│   └── reolink-ptz.ts         # PTZ command builders, response parsing, preset loading
├── server/
│   └── routes/
│       └── ptz.ts             # Fastify PTZ bootstrap and command routes
├── types/
│   └── ptz.ts                 # Browser-safe PTZ contracts
└── diagnostics/
    └── debug-capture.ts       # Reused for unexpected PTZ responses

web/src/
├── components/
│   ├── PtzPanel.tsx           # Dedicated PTZ panel attached to the viewer layout
│   └── PtzPresetGrid.tsx      # Simple visible preset list/grid
├── hooks/
│   └── use-ptz-controls.ts    # Pointer lifecycle and stop guarantees
└── lib/
    └── ptz-api.ts             # Browser API client

tests/
├── camera/
│   └── reolink-ptz.test.ts
├── server/
│   └── ptz-routes.test.ts
├── web/
│   └── ptz-controls.test.tsx
└── fixtures/
    └── reolink/
        ├── get-ptz-preset.json
        ├── ptz-ctrl.json
        └── ptz-check-state.json
```

### Pattern 1: Backend-Owned PTZ Service
**What:** Keep PTZ request building, token reuse, capability checks, and response parsing in a dedicated backend service next to `reolink-session.ts`.
**When to use:** For every pan, tilt, zoom, stop, and preset operation.
**Example:**
```typescript
// Source: Reolink Camera HTTP API User Guide v7 + reolinkapipy PTZ mixin
const body = [
  {
    cmd: "PtzCtrl",
    action: 0,
    param: { channel: 0, op: "Left", speed: 25 },
  },
];
```

### Pattern 2: Press-and-Hold With Guaranteed Stop
**What:** On pointer down, send one motion-start command and capture the pointer. On `pointerup`, `pointercancel`, `lostpointercapture`, window `blur`, or document `visibilitychange` to `hidden`, send `Stop` once if motion is active.
**When to use:** Pan/tilt controls and any future hold-style PTZ interaction.
**Example:**
```typescript
// Source: MDN setPointerCapture / pointercancel / lostpointercapture / visibilitychange
function beginMotion(event: React.PointerEvent<HTMLButtonElement>, direction: PtzDirection) {
  event.currentTarget.setPointerCapture(event.pointerId);
  void api.startMotion(direction);
  motionRef.current = direction;
}

function ensureStop() {
  if (motionRef.current === null) return;
  motionRef.current = null;
  void api.stopMotion();
}
```

### Pattern 3: Capability-Gated PTZ Bootstrap
**What:** Load capability flags and the current enabled preset list from the backend before rendering PTZ UI.
**When to use:** Initial PTZ panel mount and after any reconnect that could change the capability snapshot.
**Example:**
```typescript
// Source: repo capability snapshot pattern + Reolink GetPtzPreset response shape
type PtzBootstrap = {
  supportsPtzControl: boolean;
  supportsPtzPreset: boolean;
  presets: Array<{ id: number; name: string; enabled: boolean }>;
};
```

### Anti-Patterns to Avoid
- **Direct browser-to-camera CGI calls:** This leaks credentials and duplicates token handling.
- **Repeated move-command spam while the button is held:** `PtzCtrl` movement is continuous; send start once and stop once.
- **Hard-coding preset slots in the UI:** `GetPtzPreset` returns disabled slots and optional extra fields; render enabled results only.
- **Hard-coding zoom labels before device verification:** The documentation and SDKs disagree on `ZoomInc` vs `ZoomDec`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Camera auth/retry | A second PTZ-specific session client | `ReolinkSession` | It already handles login, token caching, and auth retry. |
| Feature gating | Raw ability parsing in React | `CapabilitySnapshot` flags | The repo already normalizes `supportsPtzControl` and `supportsPtzPreset`. |
| Stop safety | Mouse-only event handling | Pointer Events + capture + page lifecycle fallbacks | Touch, pen, viewport gestures, and tab changes all need explicit stop handling. |
| Zoom click semantics | Absolute zoom-position state machine | Short `PtzCtrl` zoom pulses with auto-stop | Bounded pulses match the UX decision without introducing position bookkeeping. |
| Firmware diagnostics | Ad hoc console logging | `writeDebugArtifact()` | Unexpected PTZ payloads need sanitized reusable artifacts. |

**Key insight:** Phase 3 should reuse the repo's existing control-plane primitives and add the minimum new PTZ adapter/service logic. The risk is firmware variance, not missing frontend widgets.

## Common Pitfalls

### Pitfall 1: Missing Stop Leaves The Camera Moving
**What goes wrong:** A motion command succeeds, but release/focus-loss does not send `Stop`, so the camera keeps moving.
**Why it happens:** `PtzCtrl` move commands are continuous; stop is a separate command.
**How to avoid:** Use pointer capture, `pointercancel`, `lostpointercapture`, window `blur`, document `visibilitychange`, and a backend watchdog stop timer.
**Warning signs:** Motion continues after pointer release, tab switch, or failed network round-trip.

### Pitfall 2: Zoom Direction Names Are Not Trustworthy Across Sources
**What goes wrong:** The UI labels "Zoom In" and "Zoom Out" opposite to the camera behavior.
**Why it happens:** The API guide and community SDKs disagree on whether `ZoomInc` means in or out.
**How to avoid:** Put the mapping behind the PTZ adapter and verify on the actual RLC-423S firmware before freezing labels.
**Warning signs:** First hardware test shows the lens moving opposite to the button label even though the API call returned success.

### Pitfall 3: Preset Payload Shapes Are Inconsistent
**What goes wrong:** Presets parse incorrectly or recall fails even though support is present.
**Why it happens:** Firmware examples include disabled slots, optional `imgName`, and conflicting slot indexing examples; one SDK uses `index` where the API guide and another SDK use `id`.
**How to avoid:** Parse leniently, keep only enabled presets for UI, prefer `id` for recall, and capture debug artifacts on rejection.
**Warning signs:** Empty preset UI despite `supportsPtzPreset`, or `ToPos` returning an error for a visible preset.

### Pitfall 4: Preset Accuracy May Depend On Calibration
**What goes wrong:** A preset recalls to the wrong physical position.
**Why it happens:** Later API docs and community docs expose `GetPtzCheckState` and `PtzCheck`, and community guidance reports drift when calibration is incomplete on some PTZ models.
**How to avoid:** Keep calibration out of scope for this phase, but document the risk, capture artifacts, and add a manual verification step for preset recall accuracy.
**Warning signs:** Preset recall succeeds at the API level but lands visibly off target.

## Code Examples

Verified patterns from current sources:

### Motion Start
```typescript
// Source: Reolink Camera HTTP API User Guide v7 (PtzCtrl)
const moveLeft = [
  {
    cmd: "PtzCtrl",
    action: 0,
    param: { channel: 0, op: "Left", speed: 25 },
  },
];
```

### Motion Stop
```typescript
// Source: Reolink Camera HTTP API User Guide v7 + reolinkapipy PTZ mixin
const stop = [
  {
    cmd: "PtzCtrl",
    action: 0,
    param: { channel: 0, op: "Stop" },
  },
];
```

### Preset Discovery
```typescript
// Source: Reolink Camera HTTP API User Guide v7 (GetPtzPreset)
const getPresets = [
  {
    cmd: "GetPtzPreset",
    action: 1,
    param: { channel: 0 },
  },
];
```

### Preset Recall
```typescript
// Source: Reolink Camera HTTP API User Guide v7 + reolinkapipy PTZ mixin
const recallPreset = (id: number) => [
  {
    cmd: "PtzCtrl",
    action: 0,
    param: { channel: 0, op: "ToPos", id, speed: 60 },
  },
];
```

### Browser Stop Safety
```typescript
// Source: MDN pointer and page lifecycle docs
button.onpointerdown = (event) => {
  button.setPointerCapture(event.pointerId);
  startMotion();
};

button.onpointerup = ensureStop;
button.onpointercancel = ensureStop;
button.onlostpointercapture = ensureStop;
window.addEventListener("blur", ensureStop);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") ensureStop();
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flash/plugin PTZ in the vendor browser UI | Local Node/Fastify control plane issuing JSON CGI commands | Modern browser baseline + existing repo architecture | PTZ stays browser-safe and LAN-local without exposing camera auth to the SPA. |
| Mouse-only press/release handling | Pointer Events with capture and page lifecycle stop fallbacks | Pointer capture baseline July 2020; `visibilitychange` baseline April 2021 | Better stop safety on touch, pen, focus-loss, and tab switches. |
| Static preset assumptions | Runtime `GetPtzPreset` query filtered by `enable` | API guide v7 + community SDK examples | UI reflects the actual saved presets instead of showing dead controls. |

**Deprecated/outdated:**
- Direct browser login to the camera CGI from app JavaScript.
- Any Flash- or plugin-era PTZ UI assumptions.
- Building Phase 3 around `StartZoomFocus` absolute position management when the UX decision is click-based zoom, not full zoom-position control.

## Open Questions

1. **Which operation is visually "Zoom In" on firmware `v2.0.0.1055_17110905_v1.0.0.30`?**
   - What we know: the API guide and community SDKs disagree on `ZoomInc` vs `ZoomDec`.
   - What's unclear: which op maps to the user-facing label on this exact camera.
   - Recommendation: verify on hardware in the first PTZ adapter task and keep the mapping adapter-owned.

2. **Does this firmware accept only `id` for `ToPos`, or does it also accept `index`?**
   - What we know: the API guide and Python SDK use `id`; the Go SDK uses `index`.
   - What's unclear: whether `index` is an alias or a library bug.
   - Recommendation: implement `id`, capture debug on failure, and add an adapter fallback only if the camera rejects it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Fastify routes, PTZ service, tests | Yes | `v22.18.0` | - |
| npm | Existing scripts and targeted Vitest runs | Yes | `10.9.3` | - |
| Local camera config | Manual PTZ verification | Yes | `.local/camera.config.json` present | Fixture and jsdom tests if hardware is unavailable |
| Capability snapshot | Capability gating and local PTZ planning | Yes | `RLC-423S / v2.0.0.1055_17110905_v1.0.0.30` | Re-run probe if snapshot is stale |

**Missing dependencies with no fallback:**
- None found during research.

**Missing dependencies with fallback:**
- Live camera reachability was not probed during research. PTZ stop semantics and zoom-direction mapping still need one hardware validation pass; fixture tests cover everything else.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest 4.1.4` |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts tests/web/ptz-controls.test.tsx` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PTZ-01 | Pan, tilt, and zoom commands map to browser-safe routes and adapter calls | unit + route + jsdom | `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts tests/web/ptz-controls.test.tsx` | No - Wave 0 |
| PTZ-02 | Motion stops on release, cancel, blur, visibility loss, and explicit Stop CTA | route + jsdom | `npx vitest run tests/server/ptz-routes.test.ts tests/web/ptz-controls.test.tsx` | No - Wave 0 |
| PTZ-03 | Enabled presets render and recall correctly when supported | unit + route + jsdom | `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts tests/web/ptz-controls.test.tsx` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts tests/web/ptz-controls.test.tsx`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green plus one manual hardware check for press-hold stop and zoom direction before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/fixtures/reolink/get-ptz-preset.json` - real or sanitized preset payload for the target firmware
- [ ] `tests/fixtures/reolink/ptz-ctrl.json` - success response fixture for motion/stop/zoom commands
- [ ] `tests/fixtures/reolink/ptz-check-state.json` - optional fixture for calibration/drift diagnostics
- [ ] `tests/camera/reolink-ptz.test.ts` - adapter request/response parsing, preset filtering, and `ToPos` payload tests
- [ ] `tests/server/ptz-routes.test.ts` - route schemas, capability gating, browser-safe payloads, and watchdog stop behavior
- [ ] `tests/web/ptz-controls.test.tsx` - pointer hold/release/cancel/blur visibility tests and preset rendering tests

## Sources

### Primary (HIGH confidence)
- [Reolink Camera HTTP API User Guide v7 (2022 PDF mirror)](https://forum.iobroker.net/assets/uploads/files/1694077622272-reolink-kamera-api-2022.pdf) - `GetPtzPreset`, `PtzCtrl`, `GetZoomFocus`, `StartZoomFocus`, `GetPtzCheckState`, `PtzCheck`
- [setPointerCapture() - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) - pointer capture semantics and release behavior
- [pointercancel - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event) - cancel conditions that require stop recovery
- [lostpointercapture - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/lostpointercapture_event) - release event for captured pointers
- [visibilitychange - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event) - hidden-page stop fallback
- [blur - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event) - focus-loss stop fallback
- [create-server.ts](C:/Users/Lawrence/Documents/Dev/reolink/src/server/create-server.ts) - current Fastify plugin registration pattern
- [live-view.ts](C:/Users/Lawrence/Documents/Dev/reolink/src/server/routes/live-view.ts) - browser-safe route contract pattern
- [reolink-session.ts](C:/Users/Lawrence/Documents/Dev/reolink/src/camera/reolink-session.ts) - session reuse and auth retry
- [capability-snapshot.ts](C:/Users/Lawrence/Documents/Dev/reolink/src/camera/capability-snapshot.ts) - PTZ capability flags
- [App.tsx](C:/Users/Lawrence/Documents/Dev/reolink/web/src/App.tsx) and [styles.css](C:/Users/Lawrence/Documents/Dev/reolink/web/src/styles.css) - current viewer-shell integration point
- [vitest.config.ts](C:/Users/Lawrence/Documents/Dev/reolink/vitest.config.ts) - current node/jsdom test split

### Secondary (MEDIUM confidence)
- [reolinkapipy PTZ mixin](https://raw.githubusercontent.com/ReolinkCameraAPI/reolinkapipy/master/reolinkapi/mixins/ptz.py) - current community-maintained PTZ command naming and preset handling
- [reolinkapipy GetPtzPresets example](https://raw.githubusercontent.com/ReolinkCameraAPI/reolinkapipy/master/examples/response/GetPtzPresets.json) - preset payload variance (`imgName`, slot indexing examples)
- [reolinkapigo PTZ mixin](https://raw.githubusercontent.com/ReolinkCameraAPI/reolinkapigo/main/internal/pkg/api/ptz_mixin.go) - cross-check for motion/preset command usage
- [reolinkapigo zoom mixin](https://raw.githubusercontent.com/ReolinkCameraAPI/reolinkapigo/main/internal/pkg/api/zoom_mixin.go) - cross-check that zoom uses `PtzCtrl` and separate stop behavior

### Tertiary (LOW confidence)
- None. Unverified single-source claims were not elevated into recommendations.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - the repo already uses the recommended stack, and package versions were verified from npm.
- Architecture: HIGH - the current Fastify, session, capability, React, and Vitest seams make the PTZ fit straightforward.
- Pitfalls: MEDIUM - the main remaining risk is firmware/API inconsistency around zoom direction, preset indexing, and calibration behavior.

**Research date:** 2026-04-14
**Valid until:** 2026-05-14
