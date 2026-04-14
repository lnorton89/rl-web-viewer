# Phase 2: Browser Live View Pipeline - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the Flash-era viewing path with a browser-safe live-view experience backed by the existing local Node control plane. This phase covers the viewing path, quality and fallback selection, and live-view status/error behavior. PTZ controls and settings editing remain separate later phases.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and product intent
- `.planning/PROJECT.md` - project vision, constraints, LAN-only scope, and live-view replacement goal
- `.planning/REQUIREMENTS.md` - Phase 2 requirements `LIVE-01` through `LIVE-03`
- `.planning/ROADMAP.md` - Phase 2 goal, success criteria, and relationship to PTZ/settings phases
- `.planning/STATE.md` - current project position and completed Phase 1 context

### Prior phase foundations
- `.planning/phases/01-camera-connectivity-capability-map/01-CONTEXT.md` - locked decisions from the connectivity/capability foundation phase
- `.planning/phases/01-camera-connectivity-capability-map/01-03-SUMMARY.md` - what shipped in Phase 1, including capability snapshots, debug capture, and the live probe path

### Device-specific local reference
- `camera_stats.txt` - known model, hardware, and firmware for the target RLC-423S

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/camera/reolink-session.ts` - reusable authenticated request path and token retry behavior for any live-view control-plane setup
- `src/camera/reolink-discovery.ts` - discovery helpers that can inform stream capability checks or startup validation
- `src/camera/capability-snapshot.ts` - persisted app-level capability flags that should gate which live-view modes appear
- `src/config/camera-config.ts` - existing local config loading for the single-camera LAN workflow
- `src/diagnostics/debug-capture.ts` - opt-in artifact capture for stream negotiation or playback failures
- `src/index.ts` - existing probe entrypoint proving local-only discovery and snapshot persistence

### Established Patterns
- Capability-aware behavior is normalized before UI work begins; Phase 2 should keep the viewer driven by app-level capability flags rather than raw CGI fields.
- Local-first operation is already established; no cloud, UID, or WAN dependency path should appear in the Phase 2 viewer flow.
- Diagnostics are opt-in and sanitized, so any stream troubleshooting should follow that same pattern.

### Integration Points
- Phase 2 will likely extend the current local Node entrypoint into a browser-facing app/server layer because no frontend or web UI code exists yet.
- The live-view pipeline should consume persisted capability snapshots when deciding which viewer modes and quality choices to show.
- Stream startup and failure handling should connect to the existing debug-capture path for unsupported transport or playback behavior.

</code_context>

<specifics>
## Specific Ideas

- The preferred live-view experience should feel modern and low-latency rather than merely "compatible enough."
- Mode selection should not slow down first paint; the viewer should choose the best available option first, then let the user switch if needed.
- Status belongs in the viewer itself, not as a hidden log-only detail.

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---
*Phase: 02-browser-live-view-pipeline*
*Context gathered: 2026-04-13*
