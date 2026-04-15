# Phase 3: PTZ Control Surface - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Add dependable pan, tilt, zoom, and preset controls to the existing local browser dashboard. This phase covers command interaction, stop behavior, and preset triggering while the live viewer is running. Settings editing, patrol authoring, and broader camera-management features remain separate later phases.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and product intent
- `.planning/PROJECT.md` - project vision, LAN-only scope, and Flash replacement goal for the RLC-423S dashboard
- `.planning/REQUIREMENTS.md` - Phase 3 requirements `PTZ-01` through `PTZ-03` plus compatibility gating expectations
- `.planning/ROADMAP.md` - Phase 3 goal, success criteria, and relationship to the already-complete live-view phase
- `.planning/STATE.md` - current project position after Phase 2 completion and the active handoff into Phase 3

### Prior phase decisions
- `.planning/phases/01-camera-connectivity-capability-map/01-CONTEXT.md` - locked decisions about local config, capability probing, and debug capture
- `.planning/phases/02-browser-live-view-pipeline/02-CONTEXT.md` - locked decisions about auto-start live view, fallback handling, in-view status, and diagnostics staying secondary
- `.planning/phases/02-browser-live-view-pipeline/02-04-SUMMARY.md` - what shipped in the viewer shell and where PTZ UI must now integrate

### Device-specific local reference
- `camera_stats.txt` - known model, hardware, and firmware details for the target RLC-423S

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `web/src/App.tsx` - current dashboard composition already centers the live viewer and can host a dedicated PTZ panel in the same layout.
- `web/src/components/LiveViewerFrame.tsx` - established viewer container and status overlay surface that PTZ work should complement rather than replace.
- `web/src/hooks/use-live-view.ts` - existing viewer state machine already tracks live-view state, retry flow, and mode selection while PTZ runs alongside it.
- `src/camera/capability-snapshot.ts` - normalized capability flags already expose `supportsPtzControl`, `supportsPtzPreset`, and `supportsPtzPatrol` for UI/API gating.
- `src/server/create-server.ts` and `src/server/routes/live-view.ts` - existing Fastify server and browser API structure give PTZ commands a natural place in the local control plane.
- `src/camera/reolink-session.ts` - authenticated request/retry behavior already exists and should be reused for PTZ command calls.
- `src/diagnostics/debug-capture.ts` - opt-in sanitized artifact capture already exists for unsupported or surprising camera behavior.

### Established Patterns
- Capability-aware behavior is normalized before UI rendering, so unsupported PTZ or preset features should be hidden or disabled from app-level flags rather than raw CGI responses.
- The dashboard keeps diagnostics secondary to primary controls, so PTZ should stay focused on control confidence first and troubleshooting second.
- The local Fastify plus React split is already established, so PTZ should extend the current browser-to-local-server path rather than introduce a second control surface.

### Integration Points
- Phase 3 will extend the current viewer dashboard with a PTZ panel and preset surface that live alongside the existing mode switcher and diagnostics disclosure.
- The backend needs PTZ routes or services that reuse current session handling and capability snapshots before exposing browser-safe control endpoints.
- Stop behavior must coordinate cleanly with pointer or button lifecycle in the React UI while sending the correct camera stop command through the Node control plane.

</code_context>

<specifics>
## Specific Ideas

- The dashboard should feel like live view and PTZ belong to one control station rather than separate screens.
- PTZ controls should prioritize confidence and recoverability over visual flair, especially around stop behavior.
- Presets should stay simple in v1: easy to see, easy to trigger, and absent when unsupported.

</specifics>

<deferred>
## Deferred Ideas

- Patrol route authoring or editing remains future work rather than part of this phase.
- Rich keyboard-first PTZ interaction is optional and can move to a later phase if it complicates the primary pointer workflow.

</deferred>

---
*Phase: 03-ptz-control-surface*
*Context gathered: 2026-04-14*
