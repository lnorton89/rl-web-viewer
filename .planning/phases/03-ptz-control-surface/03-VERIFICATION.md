---
phase: 03-ptz-control-surface
verified: 2026-04-15T07:02:50Z
status: passed
score: 4/4 must-haves verified
human_verification:
  - test: "Pan/tilt and zoom against the live RLC-423S feed"
    expected: "The camera moves in the requested direction or zoom step while live view remains visible beside the PTZ panel."
    why_human: "Real camera motion, transport responsiveness, and user-perceived control confidence cannot be proven from mocked tests."
  - test: "Release, blur, hidden-tab, and Stop Camera stop recovery"
    expected: "Motion stops promptly on release, pointer loss, window blur, hidden-tab transitions, and the visible Stop control."
    why_human: "The hook and backend watchdog are implemented and tested, but actual stop timing depends on browser/device behavior and camera response."
  - test: "Preset visibility and recall accuracy"
    expected: "Only enabled presets appear, and recalling one moves the camera to the stored position."
    why_human: "Enabled presets and landing accuracy depend on the real camera's saved preset state."
---

# Phase 3: PTZ Control Surface Verification Report

**Phase Goal:** Deliver dependable PTZ operations through the dashboard once the live view and capability map are proven.
**Verified:** 2026-04-15T07:02:50Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | The dashboard can pan, tilt, and zoom beside live view through the local control plane. | VERIFIED | `App.tsx` mounts `LiveViewerFrame` and `PtzPanel` in one `viewer-ptz-cluster` (`web/src/App.tsx:35-47`); the panel exposes motion and zoom controls (`web/src/components/PtzPanel.tsx:56-145`); browser actions call `/api/ptz/*` via `ptz-api.ts` (`web/src/lib/ptz-api.ts:12-63`); UI lifecycle coverage passes (`tests/web/ptz-controls.test.tsx:148-183`). |
| 2 | Stop behavior is defended against normal release and failure paths so motion does not continue unexpectedly. | VERIFIED | Backend watchdog auto-stops after 5000ms and zoom pulses stop after 250ms (`src/camera/reolink-ptz.ts:212-216`, `144-171`); the hook stops on `pointerup`, `pointercancel`, `lostpointercapture`, `blur`, and `visibilitychange` (`web/src/hooks/use-ptz-controls.ts:166-195`, `234-252`, `321-335`); adapter and UI tests cover these paths (`tests/camera/reolink-ptz.test.ts:214-292`, `tests/web/ptz-controls.test.tsx:72-145`). |
| 3 | Supported presets are loaded, shown, and recallable from the UI. | VERIFIED | The service loads enabled presets only and recalls them through `ToPos` (`src/camera/reolink-ptz.ts:72-88`, `181-208`, `275-321`); routes expose `/api/ptz/presets/:presetId/recall` (`src/server/routes/ptz.ts:119-133`); the UI renders a visible preset grid and disables it during recall (`web/src/components/PtzPanel.tsx:150-156`, `web/src/components/PtzPresetGrid.tsx:15-64`); tests cover render, recall, and busy-state disabling (`tests/web/ptz-controls.test.tsx:165-267`). |
| 4 | Unsupported PTZ features are gated from capabilities instead of showing dead controls. | VERIFIED | Route layer blocks unsupported control/preset actions with `409` based on bootstrap capabilities (`src/server/routes/ptz.ts:173-205`); the hook stores `supportsPtzControl`/`supportsPtzPreset` from bootstrap (`web/src/hooks/use-ptz-controls.ts:202-215`); the panel hides motion/zoom when PTZ is unsupported and hides presets when preset support is false (`web/src/components/PtzPanel.tsx:35-41`, `150-156`); route and UI tests verify both unsupported cases (`tests/server/ptz-routes.test.ts:81-127`, `tests/web/ptz-controls.test.tsx:185-224`). |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `src/types/ptz.ts` | Shared PTZ DTOs and service contract | VERIFIED | Declares normalized direction, stop, zoom, preset, bootstrap, and service types (`src/types/ptz.ts:1-52`). |
| `src/camera/reolink-ptz.ts` | Adapter-owned PTZ service with capability gating, watchdog stop, zoom pulse, preset normalization, and debug capture | VERIFIED | Implements all service methods and uses snapshot/session/debug helpers (`src/camera/reolink-ptz.ts:57-232`, `275-510`). |
| `tests/camera/reolink-ptz.test.ts` | Fixture-backed PTZ adapter coverage | VERIFIED | Covers bootstrap, preset filtering, motion, idempotent stop, watchdog, zoom mapping, recall, and debug artifacts (`tests/camera/reolink-ptz.test.ts:57-397`). |
| `src/server/routes/ptz.ts` | Browser-safe PTZ bootstrap and command routes | VERIFIED | Exposes `/api/ptz`, motion, stop, zoom, and preset recall with validation and capability gating (`src/server/routes/ptz.ts:49-223`). |
| `src/server/create-server.ts` | PTZ route plugin mounted into the Fastify app server | VERIFIED | Registers `ptzRoutes` beside `liveViewRoutes` (`src/server/create-server.ts:49-50`). |
| `tests/server/ptz-routes.test.ts` | PTZ route and app-server coverage | VERIFIED | Exercises validation, capability gating, mounted routes, and coexistence with `/api/live-view` (`tests/server/ptz-routes.test.ts:20-216`). |
| `web/src/lib/ptz-api.ts` | Browser PTZ client for local Fastify routes | VERIFIED | All browser PTZ calls target `/api/ptz` endpoints only (`web/src/lib/ptz-api.ts:12-109`). |
| `web/src/hooks/use-ptz-controls.ts` | PTZ bootstrap/state machine for hold-to-move, stop recovery, zoom, and presets | VERIFIED | Fetches bootstrap, owns motion session lifecycle, and drives all PTZ actions (`web/src/hooks/use-ptz-controls.ts:66-421`). |
| `web/src/components/PtzPanel.tsx` | Attached PTZ panel with visible stop, zoom, and preset surface | VERIFIED | Renders the approved copy, stop action, motion pad, zoom buttons, and capability-gated presets (`web/src/components/PtzPanel.tsx:28-160`). |
| `web/src/components/PtzPresetGrid.tsx` | Visible preset grid | VERIFIED | Shows a visible grid when presets exist and an explicit empty state otherwise (`web/src/components/PtzPresetGrid.tsx:10-65`). |
| `tests/web/ptz-controls.test.tsx` | jsdom PTZ UI and hook coverage | VERIFIED | Covers release/stop fallbacks, zoom, layout mount, preset gating, unsupported states, and preset busy state (`tests/web/ptz-controls.test.tsx:72-267`). |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `src/camera/reolink-ptz.ts` | `src/camera/reolink-session.ts` | Shared authenticated request path | WIRED | PTZ preset and command calls use `session.requestJson(...)` (`src/camera/reolink-ptz.ts:290-292`, `344-345`). |
| `src/camera/reolink-ptz.ts` | `src/camera/capability-snapshot.ts` | Capability-gated PTZ and preset exposure | WIRED | Snapshot load and support assertions drive bootstrap and control gating (`src/camera/reolink-ptz.ts:71-79`, `92-93`, `145-146`, `175-179`). |
| `src/camera/reolink-ptz.ts` | `src/diagnostics/debug-capture.ts` | Sanitized PTZ debug artifact capture | WIRED | Unexpected preset/PTZ responses call `writeDebugArtifact(...)` through `captureDebugArtifact()` (`src/camera/reolink-ptz.ts:296-317`, `352-365`, `489-510`). |
| `src/server/create-server.ts` | `src/server/routes/ptz.ts` | Fastify PTZ plugin mount | WIRED | `createServer()` registers `ptzRoutes` at startup (`src/server/create-server.ts:49-50`). |
| `src/server/routes/ptz.ts` | `src/camera/reolink-ptz.ts` | Route delegation to backend PTZ service | WIRED | Plugin resolves `createReolinkPtzService` and delegates all endpoints to the service (`src/server/routes/ptz.ts:53-59`, `61-133`). |
| `src/server/routes/ptz.ts` | `src/types/ptz.ts` | Shared PTZ DTOs | WIRED | Route imports and returns `PtzBootstrap`, directions, stop reasons, and zoom directions from shared types (`src/server/routes/ptz.ts:4-11`, `221-223`). |
| `web/src/hooks/use-ptz-controls.ts` | `web/src/lib/ptz-api.ts` | Browser PTZ actions use the local Fastify API | WIRED | Hook imports bootstrap/start/stop/zoom/recall helpers and calls them for every PTZ action (`web/src/hooks/use-ptz-controls.ts:10-16`, `143`, `202`, `285`, `358`, `389`). |
| `web/src/App.tsx` | `web/src/components/PtzPanel.tsx` | Viewer-adjacent PTZ mount | WIRED | `App` mounts `PtzPanel` inside the shared viewer cluster above mode switching and diagnostics (`web/src/App.tsx:35-61`). |
| `web/src/components/PtzPanel.tsx` | `web/src/hooks/use-ptz-controls.ts` | Hook-driven lifecycle and preset state | WIRED | `PtzPanel` consumes the hook's state and actions directly (`web/src/components/PtzPanel.tsx:4-18`, `65-155`). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `src/camera/reolink-ptz.ts` | `snapshot.supportsPtzControl` / `snapshot.supportsPtzPreset` | `loadCapabilitySnapshot(config, snapshotPath)` | Yes - reads persisted capability JSON from `.local/capabilities/*` and validates it with Zod (`src/camera/capability-snapshot.ts:97-103`) | FLOWING |
| `src/camera/reolink-ptz.ts` | `presets` | `session.requestJson([{ cmd: "GetPtzPreset", ... }])` | Yes - fetches camera CGI preset data and normalizes enabled entries only (`src/camera/reolink-ptz.ts:285-321`) | FLOWING |
| `src/camera/reolink-ptz.ts` | motion / zoom / recall command results | `session.requestJson([{ cmd: "PtzCtrl", ... }])` | Yes - sends authenticated PTZ CGI requests over `ReolinkSession.executeRequest()` (`src/camera/reolink-ptz.ts:334-366`, `src/camera/reolink-session.ts:191-229`) | FLOWING |
| `src/server/routes/ptz.ts` | bootstrap and command responses | `PtzService` methods | Yes - routes return service DTOs directly after validation/gating (`src/server/routes/ptz.ts:61-133`) | FLOWING |
| `web/src/hooks/use-ptz-controls.ts` | `supportsPtzControl`, `supportsPtzPreset`, `presets` | `fetchPtzBootstrap()` -> `GET /api/ptz` | Yes - bootstrap response populates React state used by panel/grid rendering (`web/src/hooks/use-ptz-controls.ts:199-232`) | FLOWING |
| `web/src/components/PtzPanel.tsx` | visible controls and preset section | `usePtzControls()` state | Yes - render paths are driven by real bootstrap state and in-flight action state, not hardcoded placeholders (`web/src/components/PtzPanel.tsx:35-156`) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Adapter PTZ contract | `npx vitest run tests/camera/reolink-ptz.test.ts` | Passed | PASS |
| PTZ route surface and mounted server behavior | `npx vitest run tests/server/ptz-routes.test.ts` | Passed | PASS |
| PTZ UI lifecycle and live-view co-mount | `npx vitest run tests/web/ptz-controls.test.tsx tests/web/live-view-controls.test.tsx` | Passed | PASS |
| Full automated regression suite | `npm test` | `15` files, `61` tests passed | PASS |
| Production build | `npm run build` | `build:server` and `build:web` passed; existing large-chunk warning only | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `PTZ-01` | `03-01`, `03-02`, `03-03` | User can pan, tilt, and zoom the camera from the web dashboard. | SATISFIED | Adapter maps motion and zoom operations (`src/camera/reolink-ptz.ts:91-171`); routes expose browser-safe PTZ endpoints (`src/server/routes/ptz.ts:69-117`); UI renders motion and zoom controls (`web/src/components/PtzPanel.tsx:56-145`); unit, route, and UI tests pass. |
| `PTZ-02` | `03-01`, `03-02`, `03-03` | User can stop PTZ movement promptly from the dashboard after starting motion. | SATISFIED | Backend watchdog plus explicit stop exist (`src/camera/reolink-ptz.ts:117-142`, `212-216`); stop endpoint is mounted (`src/server/routes/ptz.ts:86-100`); hook covers release, pointer cancellation, blur, visibility-hidden, and explicit stop (`web/src/hooks/use-ptz-controls.ts:166-195`, `234-252`, `327-335`, `401-405`); tests pass. |
| `PTZ-03` | `03-01`, `03-02`, `03-03` | User can view and trigger saved PTZ presets when the connected camera/firmware supports them. | SATISFIED | Enabled presets are loaded and normalized (`src/camera/reolink-ptz.ts:275-321`); preset recall route is exposed (`src/server/routes/ptz.ts:119-133`); the UI renders a visible preset grid only when supported (`web/src/components/PtzPanel.tsx:150-156`, `web/src/components/PtzPresetGrid.tsx:36-64`); tests cover support/no-support/busy cases. |

**Plan Summary Cross-Check:** The key files claimed in `03-01-SUMMARY.md`, `03-02-SUMMARY.md`, and `03-03-SUMMARY.md` all exist in the repo, and the documented commits `36ed69e`, `1f7cbe0`, `a3334e2`, `a2a7e59`, `7388ac5`, and `5b8bdbb` all resolve in git.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `(none)` | - | No blocker stubs or placeholder implementations found in phase files. | Info | The only `return []` / `return null` matches are validation and normalization guards in `reolink-ptz.ts` and `ptz.ts`, not user-visible stubs. |

### Human Verification Required

### 1. Live PTZ With Viewer

**Test:** Start live view, then hold each pan/tilt direction and click both zoom buttons from the attached PTZ panel.
**Expected:** The live viewer remains visible, the camera moves in the requested direction, and each zoom click produces one bounded zoom step.
**Why human:** The code paths are wired and tested, but only a real RLC-423S can confirm physical motion direction and perceived control confidence while viewing.
**Result:** approved by user on 2026-04-15.

### 2. Stop Recovery Timing

**Test:** Start motion, then release normally; repeat with awkward pointer movement, browser blur, hidden-tab transition, and the visible `Stop Camera` button.
**Expected:** The camera stops promptly in every case and does not continue moving unexpectedly.
**Why human:** jsdom verifies event coverage and the backend watchdog exists, but real stop timing depends on browser behavior, camera latency, and the physical device.
**Result:** approved by user on 2026-04-15.

### 3. Preset Recall Accuracy

**Test:** Save at least one enabled preset on the camera, refresh the dashboard, and recall it from the visible preset grid.
**Expected:** Only enabled presets appear, and recalling one lands the camera on the stored position.
**Why human:** The real camera state determines which presets exist and whether the stored position is correct.
**Result:** approved by user on 2026-04-15.

### Gaps Summary

No code or wiring gaps were found for Phase 3. The backend adapter, Fastify PTZ routes, React hook/panel, responsive viewer attachment, capability gating, and automated tests all line up with the phase plans and roadmap success criteria. The remaining hardware checks were approved by the user on 2026-04-15, so Phase 3 verification is complete.

---

_Verified: 2026-04-15T07:02:50Z_
_Verifier: Claude (gsd-verifier)_
