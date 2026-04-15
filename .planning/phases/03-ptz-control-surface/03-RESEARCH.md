# Phase 03: PTZ Control Surface - Research

**Researched:** 2026-04-14
**Domain:** Browser PTZ and preset control for the local Reolink dashboard
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Motion Interaction
- **D-01:** Pan and tilt should use press-and-hold controls rather than click-per-step as the primary interaction.
- **D-02:** Zoom should use explicit click actions for zoom in and zoom out rather than continuous hold behavior.

### PTZ Layout
- **D-03:** PTZ controls should live in a dedicated panel attached to the viewer layout instead of floating over the video by default.
- **D-04:** The panel can sit beside the viewer on larger screens or below it on smaller screens as long as it remains clearly part of the viewer surface.

### Stop And Safety Behavior
- **D-05:** PTZ movement should stop immediately when the user releases the pan or tilt control.
- **D-06:** The UI should also expose a clearly visible Stop control as a recovery path for pointer-loss, focus-loss, or unexpected motion cases.

### Preset Presentation
- **D-07:** Presets should render as a simple labeled list or grid rather than a hidden disclosure-first pattern.
- **D-08:** Preset controls should only appear when the connected camera capability snapshot says preset support is available.

### the agent's Discretion
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
| PTZ-01 | User can pan, tilt, and zoom the camera from the web dashboard. | Add a PTZ adapter/service around `PtzCtrl` with browser-safe Fastify routes and UI controls that map hold events to motion ops and click events to zoom ops. |
| PTZ-02 | User can stop PTZ movement promptly from the dashboard after starting motion. | Treat stop as a first-class backend command, fire it on pointer/key release and cancel/blur paths, and keep a visible Stop control in the UI. |
| PTZ-03 | User can view and trigger saved PTZ presets when supported. | Read presets with `GetPtzPreset`, normalize enabled slots only, and call them through an adapter route rather than exposing raw command payloads to the browser. |
</phase_requirements>

## Summary

Phase 3 should be planned as a thin extension of the existing local control plane, not as a browser-direct camera integration. The RLC-423S firmware already accepts `PtzCtrl` commands for movement, stop, zoom, and preset recall through the same tokenized CGI path Phase 1 established, so the lowest-risk approach is to add a PTZ adapter/service layer in Node, expose browser-safe Fastify routes, and wire a dedicated PTZ panel into the React dashboard next to the existing live viewer.

The real firmware behavior we verified on `http://192.168.1.140` is strong enough to plan confidently. `PtzCtrl` with `Left`, `Stop`, `ZoomInc`, and `ToPos` all returned success (`code: 0`, `rspCode: 200`). `GetPtzPreset` returned a 64-slot preset array with `{ channel, enable, id, name }` entries. `SetPtzPreset` is configuration-sensitive: it can change whether a preset slot is enabled, so Phase 3 should avoid exposing preset editing in the UI and keep the scope to reading and recalling presets only.

The critical design risk is not “can the camera move?” but “can the browser reliably stop it?” Press-and-hold PTZ only feels safe if stop dispatch survives pointer release, pointer cancel, lost capture, window blur, and component unmount. Plan for stop behavior as a small state machine in both the browser and server: motion start, stop, in-flight dedupe, and explicit failure surfacing. This phase also needs fixture-backed tests for payload construction and route behavior, plus a focused human verification pass with the real camera because stop timing and motion confidence are hard to prove in unit tests alone.

**Primary recommendation:** Add a dedicated PTZ adapter/service + Fastify route layer around `PtzCtrl` and `GetPtzPreset`, drive the UI from capability-gated browser-safe DTOs, use press-and-hold pan/tilt with guaranteed stop-on-release and explicit Stop, and keep presets read-and-recall only in v1.

## Project Constraints (from AGENTS.md)

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
| Fastify | `5.8.5` | Browser-safe PTZ API routes | Already in repo and already owns the live-view bootstrap boundary. |
| React | `19.2.5` | PTZ panel and preset UI | Existing dashboard is already React-based and should own PTZ interaction state too. |
| Vitest | `4.1.4` | PTZ service, route, and UI behavior tests | Existing test runner and phase-verification tooling already use it. |
| Zod | `4.3.6` | PTZ request/response normalization | Existing repo pattern for parsing camera responses and browser-safe DTOs. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` | `16.3.2` | PTZ press/release and preset UI tests | Use for pointer lifecycle and visible control-state assertions. |
| `@testing-library/user-event` | `14.6.1` | Realistic button and pointer interactions | Use for hold-to-move, click-to-zoom, and preset trigger coverage. |
| `pino` | `10.3.1` | PTZ route/service logging | Reuse existing structured logging for PTZ failures and retries. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| App-owned PTZ routes | Browser sends camera CGI directly | Faster demo path, but leaks credentials/tokens and bypasses capability gating, retries, and diagnostics. |
| Press-and-hold pan/tilt | Timed movement bursts only | Simpler stop semantics, but contradicts the locked UX decision and feels less direct. |
| Read-only presets + recall | Full preset create/edit/delete in Phase 3 | Technically possible, but it crosses into configuration-writing behavior and raises the risk of unintended camera-state changes. |

## Architecture Patterns

### Recommended Project Structure
```text
src/
  camera/
    reolink-ptz.ts         # PTZ command and preset adapter around ReolinkSession
  server/
    routes/
      ptz.ts               # Browser-safe PTZ and preset endpoints
  types/
    ptz.ts                 # Shared browser-safe PTZ DTOs and command enums
web/src/
  components/
    PtzPanel.tsx
    PtzPad.tsx
    PresetList.tsx
  hooks/
    use-ptz-controls.ts    # Hold/release/stop lifecycle
  lib/
    ptz-api.ts             # Fetch wrapper for PTZ routes
tests/
  camera/
    reolink-ptz.test.ts
  server/
    ptz-routes.test.ts
  web/
    ptz-controls.test.tsx
```

### Pattern 1: Adapter-Normalized PTZ Operations
**What:** Wrap raw Reolink commands in app-level operations such as `move(direction)`, `stop()`, `zoom(direction)`, and `callPreset(id)`.
**When to use:** Always. The browser should not know CGI command names or payload shape.
**Example:**
```ts
type PtzMoveOp =
  | "Left"
  | "Right"
  | "Up"
  | "Down"
  | "LeftUp"
  | "LeftDown"
  | "RightUp"
  | "RightDown";

type PtzZoomOp = "ZoomInc" | "ZoomDec";

await session.requestJson([
  { cmd: "PtzCtrl", action: 0, param: { channel: 0, op: "Left", speed: 32 } },
]);
```
Source: verified against the local RLC-423S and corroborated by the Reolink wrapper/OpenAPI docs.

### Pattern 2: Stop-As-A-First-Class Route
**What:** Expose an explicit stop endpoint, not just implicit UI cleanup.
**When to use:** On pointer release, pointer cancel, window blur, route teardown, and manual Stop.
**Example:**
```ts
await session.requestJson([
  { cmd: "PtzCtrl", action: 0, param: { channel: 0, op: "Stop" } },
]);
```
Source: verified against the local RLC-423S.

### Pattern 3: Read-Only Preset Normalization
**What:** Fetch raw preset slots, then publish a browser DTO containing only enabled presets and stable labels.
**When to use:** Always. Raw camera slots are sparse and firmware-shaped.
**Example:**
```ts
type PtzPresetDto = {
  id: number;
  name: string;
};

function normalizePresets(raw: { id: number; name: string; enable: number }[]) {
  return raw
    .filter((preset) => preset.enable === 1)
    .map((preset) => ({ id: preset.id, name: preset.name || `Preset ${preset.id}` }));
}
```
Source: `GetPtzPreset` response shape verified against the local camera.

### Pattern 4: UI Hold Lifecycle With Server Failsafe
**What:** Let the browser initiate motion on press and always send stop on release/cancel, while the server remains the only PTZ authority.
**When to use:** For every continuous pan/tilt interaction.
**Recommended lifecycle:** `pointerdown -> move` then `pointerup/pointercancel/lostpointercapture/blur -> stop`

### Anti-Patterns to Avoid
- **Preset editing in Phase 3:** `SetPtzPreset` mutates camera state. We verified this accidentally by enabling a previously disabled slot, then restoring it. Keep Phase 3 to recall-only.
- **Single “fire and forget” movement requests:** Without guaranteed release-path stop handling, the camera can keep moving longer than intended.
- **Raw CGI payloads in the browser:** Breaks the existing credentials and capability boundary established in Phases 1 and 2.
- **UI-only gating:** PTZ support must be checked in the backend too, not just hidden in React.
- **Treating stop failures like silent no-ops:** If stop fails, that should surface clearly because it is safety-relevant behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Direct browser-to-camera PTZ | Manual fetches from React to `/cgi-bin/api.cgi` | Fastify PTZ routes backed by `ReolinkSession` | Preserves credential safety, retries, logging, and capability gating. |
| Ad-hoc event listeners scattered across components | Separate one-off handlers per button | A shared `usePtzControls()` hook | Centralizes release/cancel/blur stop logic and reduces regressions. |
| Raw preset arrays in the UI | Direct rendering of 64 firmware slots | Normalized enabled preset DTOs | Keeps the UI simple and avoids leaking firmware quirks. |
| “Looks good in browser” verification only | Manual-only PTZ validation | Fixture/unit/jsdom coverage plus a small human UAT pass | Stop timing and capability gating need both automated and live-camera checks. |

## Common Pitfalls

### Pitfall 1: Missing stop on non-happy-path pointer exits
**What goes wrong:** The user drags out of the control, changes tabs, or loses pointer capture and the camera keeps moving.
**Why it happens:** Only `pointerup` is handled.
**How to avoid:** Handle `pointerup`, `pointercancel`, `lostpointercapture`, `mouseleave` where appropriate, window blur, and component teardown.
**Warning signs:** PTZ works in simple clicks but occasionally “sticks” during quick drags or tab switches.

### Pitfall 2: Treating presets as harmless read-only data
**What goes wrong:** A recall or test command unexpectedly mutates preset state.
**Why it happens:** `SetPtzPreset` is both configuration and action-shaped depending on payload.
**How to avoid:** Keep Phase 3 on `GetPtzPreset` + recall-only flow, and isolate any future preset editing behind a separate settings/config phase.
**Warning signs:** Preset `enable` or names change during tests.

### Pitfall 3: UI gating without backend validation
**What goes wrong:** Hidden controls stay safe in the browser, but crafted requests can still hit unsupported PTZ routes.
**Why it happens:** Capability checks are only performed in React.
**How to avoid:** Check `supportsPtzControl` and `supportsPtzPreset` in the service/route layer before sending camera commands.
**Warning signs:** Backend executes PTZ routes even when capability snapshots say the feature is unsupported.

### Pitfall 4: Coupling PTZ availability to live-view transport state
**What goes wrong:** PTZ becomes unavailable just because WebRTC/HLS fell back or reconnects.
**Why it happens:** Viewer state and control state are modeled as one thing.
**How to avoid:** Keep PTZ capability/command state separate from media transport state, while still colocating the UI.
**Warning signs:** PTZ buttons disappear or disable during temporary video reconnects.

### Pitfall 5: No fixture coverage for firmware-shaped preset responses
**What goes wrong:** The first live preset list works, but sparse or disabled slots break rendering later.
**Why it happens:** Tests only cover ideal arrays, not camera-shaped arrays.
**How to avoid:** Save sanitized PTZ fixture payloads and test normalization against disabled, unnamed, and sparse entries.
**Warning signs:** Preset UI shows dozens of blank rows or crashes on missing names.

## Code Examples

Verified patterns from the live camera and current community docs:

### Motion Start
```json
[{
  "cmd": "PtzCtrl",
  "action": 0,
  "param": {
    "channel": 0,
    "op": "Left",
    "speed": 32
  }
}]
```
Observed result: `code: 0`, `value.rspCode: 200` on the local RLC-423S.

### Guaranteed Stop
```json
[{
  "cmd": "PtzCtrl",
  "action": 0,
  "param": {
    "channel": 0,
    "op": "Stop"
  }
}]
```
Observed result: `code: 0`, `value.rspCode: 200` on the local RLC-423S.

### Zoom
```json
[{
  "cmd": "PtzCtrl",
  "action": 0,
  "param": {
    "channel": 0,
    "op": "ZoomInc",
    "speed": 32
  }
}]
```
Observed result: `code: 0`, `value.rspCode: 200` on the local RLC-423S.

### Preset Discovery
```json
[{
  "cmd": "GetPtzPreset",
  "action": 0,
  "param": {
    "channel": 0
  }
}]
```
Observed result: 64 preset slots with `{ channel, enable, id, name }`.

### Preset Recall Candidate
```json
[{
  "cmd": "PtzCtrl",
  "action": 0,
  "param": {
    "channel": 0,
    "op": "ToPos",
    "id": 1
  }
}]
```
Observed result: `code: 0`, `value.rspCode: 200` on the local RLC-423S.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flash-era PTZ inside vendor web UI | Browser UI talking to a local app-owned PTZ API | 2020s | Keeps modern browser compatibility and fits the app-owned control plane already used for live view. |
| Raw vendor command strings mixed into UI code | Capability-gated adapter/service APIs | 2020s | Easier to test, safer for future model expansion, and consistent with prior phases. |
| Manual-only PTZ verification | Unit/jsdom route and interaction tests plus short live-camera UAT | Current repo workflow | Better confidence in stop semantics without pretending everything can be simulated perfectly. |

## Open Questions

1. **What speed should v1 default to for movement and zoom?**
   - What we know: `speed: 32` is accepted by the local camera and common wrapper docs describe a 1-64 range.
   - What's unclear: whether `32` feels best for this exact camera in browser-driven hold control.
   - Recommendation: plan for a fixed default speed in Phase 3, validate it during human UAT, and defer user-adjustable speed to later if needed.

2. **Should diagonal movement ship in Phase 3 UI?**
   - What we know: the command family supports diagonal ops (`LeftUp`, `LeftDown`, `RightUp`, `RightDown`) in community docs.
   - What's unclear: whether the first PTZ surface should include diagonals or keep the pad to cardinal directions plus zoom.
   - Recommendation: leave this to planner discretion unless the UI spec later makes it explicit.

3. **How should the UI represent “no enabled presets”?**
   - What we know: the current camera returned 64 preset slots and all were initially disabled.
   - What's unclear: whether the best v1 behavior is a hidden section, an empty-state note, or a disabled container.
   - Recommendation: plan for a compact empty state only when preset support exists but no enabled presets are available.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Fastify server, React build, existing app runtime | Yes | `v22.18.0` | n/a |
| npm | Dependency installation and scripts | Yes | `10.9.3` | n/a |
| Vitest | PTZ automated coverage | Yes | `4.1.4` (repo) | n/a |
| Live camera on LAN | PTZ UAT and fixture capture | Yes | RLC-423S `v2.0.0.1055_17110905_v1.0.0.30` | Use sanitized fixtures for automation if camera unavailable |

**Missing dependencies with no fallback:**
- None.

**Missing dependencies with fallback:**
- None. Phase 3 can build on the existing server, browser, and test stack.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `Vitest 4.1.4` |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts -x` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PTZ-01 | Browser can start pan/tilt motion and trigger zoom through app-owned routes | unit + route + jsdom | `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts tests/web/ptz-controls.test.tsx -x` | No - Wave 0 |
| PTZ-02 | Stop fires on release and manual Stop reaches the backend command path | route + jsdom | `npx vitest run tests/server/ptz-routes.test.ts tests/web/ptz-controls.test.tsx -x` | No - Wave 0 |
| PTZ-03 | Enabled presets are normalized, listed, and callable | unit + route + jsdom | `npx vitest run tests/camera/reolink-ptz.test.ts tests/server/ptz-routes.test.ts tests/web/ptz-controls.test.tsx -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** targeted `vitest` command for the files touched in that task
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green plus a short live-camera UAT pass covering move, stop, and preset behavior

### Wave 0 Gaps
- [ ] `tests/camera/reolink-ptz.test.ts` - covers PTZ payload construction, capability gating, and preset normalization
- [ ] `tests/server/ptz-routes.test.ts` - covers browser-safe PTZ endpoints, stop route behavior, and route-level validation/errors
- [ ] `tests/web/ptz-controls.test.tsx` - covers hold/release stop behavior, zoom clicks, and preset rendering/triggering
- [ ] Sanitized PTZ fixture payloads under `tests/fixtures/reolink/` for `GetPtzPreset` and representative PTZ command responses

## Sources

### Primary (HIGH confidence)
- Local live-camera probing against `http://192.168.1.140` using the existing tokenized CGI flow in this repo
  Commands verified: `PtzCtrl` (`Left`, `Stop`, `ZoomInc`, `ToPos`), `GetPtzPreset`, `SetPtzPreset`
- Existing repo code and artifacts
  `.planning/phases/03-ptz-control-surface/03-CONTEXT.md`
  `.planning/REQUIREMENTS.md`
  `src/camera/reolink-session.ts`
  `src/camera/capability-snapshot.ts`
  `src/server/create-server.ts`
  `src/server/routes/live-view.ts`
  `web/src/App.tsx`
  `web/src/hooks/use-live-view.ts`

### Secondary (MEDIUM confidence)
- ReolinkCameraAPI/reolinkapigo README - confirms token-based camera API workflow and PTZ support goals
  https://github.com/ReolinkCameraAPI/reolinkapigo
- `mosleyit/reolink_api_wrapper` generated docs/OpenAPI - PTZ op constants and request schema details
  https://pkg.go.dev/github.com/mosleyit/reolink_api_wrapper
  https://raw.githubusercontent.com/mosleyit/reolink_api_wrapper/main/docs/reolink-camera-api-openapi.yaml

### Tertiary (LOW confidence)
- Reolink support search / CGI support references
  https://support.reolink.com/search/?query=cgi&utf8=%E2%9C%93

## Metadata

**Confidence breakdown:**
- PTZ command family: HIGH - verified directly against the local camera.
- Preset read/recall strategy: MEDIUM - read path is verified, recall shape is accepted, but user-facing semantics still need a human UAT pass.
- Architecture: HIGH - existing repo boundaries already strongly imply the right split for PTZ work.
- Pitfalls: HIGH - we directly observed that preset writes can change camera state and that stop must be treated as a safety path.

**Research date:** 2026-04-14
**Valid until:** 2026-05-14
