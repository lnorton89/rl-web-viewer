# Phase 5: Hardening & Modular Expansion Base - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Reduce operational rough edges across live view, PTZ, settings, and diagnostics while leaving a cleaner adapter boundary for future Reolink models. This phase covers cross-cutting reliability, repeated-use resilience, observability polish, and explicit extension seams for additional model adapters. New end-user feature domains such as multi-camera support, playback, alarms, or remote access remain out of scope.

</domain>

<decisions>
## Implementation Decisions

### Hardening Scope
- **D-01:** Phase 5 should focus on repeated-use reliability of the existing v1 flows rather than introducing net-new camera features.
- **D-02:** The hardening target should cover connect, live view, PTZ, and settings as one continuous local dashboard experience instead of treating each area in isolation.

### Adapter Expansion Base
- **D-03:** The codebase should end Phase 5 with an explicit documented adapter contract for future Reolink models.
- **D-04:** Firmware- or model-specific quirks should stay behind adapter-owned modules and fixtures instead of leaking further into routes, UI hooks, or shared browser contracts.

### Diagnostics and Observability
- **D-05:** Diagnostics should stay secondary in the main UI, but logging and debug artifacts should become more actionable for future unsupported models and firmware gaps.
- **D-06:** The app should favor structured, sanitized diagnostics and operator-readable failure states over raw protocol dumps in the main flow.

### UX and Operational Polish
- **D-07:** Phase 5 should prioritize low-friction polish that improves trust during normal local use, especially around refresh, retry, verified state, and repeated interaction loops.
- **D-08:** UX polish should preserve the existing viewer-first layout rather than reshaping the dashboard architecture late in v1.

### Verification and Readiness
- **D-09:** Phase 5 should strengthen repeatability tests and end-to-end confidence around the existing feature set before opening follow-on work for additional models.
- **D-10:** The final output should leave clear extension points and documentation so a future phase can add another model adapter without restructuring the foundations.

### the agent's Discretion
- The exact split between backend hardening, browser polish, and documentation work inside Phase 5
- The specific adapter-contract format and where it lives
- Which reliability gaps should be addressed through tests only versus runtime behavior changes
- How much additional diagnostics surface belongs in the UI versus files, summaries, or backend responses

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and product intent
- `.planning/PROJECT.md` - project vision, modularity goal, and the requirement to survive firmware variance
- `.planning/REQUIREMENTS.md` - completed v1 requirements plus future `MULT-02` expansion direction
- `.planning/ROADMAP.md` - Phase 5 goal, success criteria, and overall sequencing rationale
- `.planning/STATE.md` - current handoff after Phase 4 and the transition into the final hardening phase

### Prior phase decisions
- `.planning/phases/01-camera-connectivity-capability-map/01-CONTEXT.md` - local config, capability probing, and sanitized debug capture decisions
- `.planning/phases/02-browser-live-view-pipeline/02-CONTEXT.md` - startup, fallback, reconnect, and diagnostics decisions for live view
- `.planning/phases/03-ptz-control-surface/03-CONTEXT.md` - PTZ lifecycle, stop safety, and attached control-surface decisions
- `.planning/phases/04-settings-safe-configuration/04-CONTEXT.md` - conservative write verification, shared field metadata, and inspect-versus-edit boundaries

### Existing implementation references
- `src/camera/` - current session, discovery, PTZ, settings, and live-stream adapter behavior
- `src/server/routes/` and `src/server/create-server.ts` - browser-safe control plane patterns and route boundaries
- `src/diagnostics/debug-capture.ts` - current sanitized debug artifact behavior
- `web/src/App.tsx` and `web/src/components/` - current viewer-first dashboard shell and attached control surfaces
- `tests/` - fixture-backed backend tests and browser interaction coverage that Phase 5 should strengthen rather than bypass

### Device-specific local reference
- `camera_stats.txt` - known model, hardware, and firmware details for the target RLC-423S

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The app already has separate camera, media, server, diagnostics, and browser layers, so Phase 5 can harden seams instead of inventing them.
- Capability snapshots, sanitized debug capture, and fixture-backed tests already exist and should anchor future adapter work.
- The viewer shell already supports live view, PTZ, settings, retry, and secondary diagnostics in one composition, so polish should build on that shell rather than replacing it.
- Fastify routes already keep credentials and raw camera calls out of the browser, which remains a non-negotiable boundary.

### Established Patterns
- Firmware-specific behavior belongs in adapter-owned modules, not spread across the browser or route layers.
- Success paths are increasingly verified by rereads or capability-gated contracts instead of optimistic local assumptions.
- Diagnostics stay secondary in the primary UI, but structured enough to support troubleshooting and future expansion.
- Feature work has used shared typed contracts plus Vitest coverage, so hardening should keep the same contract-first approach.

### Integration Points
- Phase 5 can touch all existing layers if needed, but should do so to reinforce boundaries and repeatability rather than add unrelated features.
- Documentation and extension contracts should match the actual code seams already present in `src/camera`, `src/media`, `src/server`, and `web/src`.
- Any browser polish should stay aligned with the current viewer-first composition so later multi-model or multi-camera work inherits a stable shell.

</code_context>

<specifics>
## Specific Ideas

- A concise adapter contract plus one clear example of model-specific responsibilities would make future expansion much safer than relying on tribal knowledge.
- Repeated local use matters more than one-shot demos in this phase, so restart/retry/reapply loops and status clarity deserve first-class attention.
- Debug outputs should help answer "what differed on this firmware?" quickly without exposing credentials or flooding the main UI.

</specifics>

<deferred>
## Deferred Ideas

- Multi-camera management and additional model implementations remain future work even though this phase should prepare for them.
- Playback, recordings, alarms, patrol editing, and remote access stay out of scope.
- A large visual redesign is deferred; Phase 5 should polish and stabilize the current dashboard language instead.

</deferred>

---
*Phase: 05-hardening-modular-expansion-base*
*Context gathered: 2026-04-15*
