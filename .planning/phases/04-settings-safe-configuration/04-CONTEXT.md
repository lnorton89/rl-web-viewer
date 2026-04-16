# Phase 4: Settings & Safe Configuration - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a browser-based settings surface that can inspect a safe subset of camera configuration, edit a confirmed v1 subset, and verify writes by re-reading the camera after submission. This phase covers settings inspection, cautious edit flows, validation, write feedback, and post-write confirmation. Network reconfiguration, storage management, alarm workflows, and broader system administration remain out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Settings Scope
- **D-01:** The editable v1 subset should focus on image/display settings, stream settings, and time/NTP settings.
- **D-02:** Network, storage, and alarm-oriented settings should stay out of the editable Phase 4 scope even if some of them are readable.

### Editing Workflow
- **D-03:** Settings edits should be staged at the section level rather than saved field-by-field immediately.
- **D-04:** Each editable section should present an explicit Review and Apply step before the app sends writes to the camera.

### Verification Feedback
- **D-05:** After a successful write, the app should perform a fresh re-read from the camera rather than trusting local optimistic state.
- **D-06:** The UI should show a compact before/after summary and mark the section as verified once the re-read confirms the new values.

### Failure Handling
- **D-07:** The app should show inline field errors when it can map validation failures cleanly to specific inputs.
- **D-08:** Broader rejections should still surface section-level camera or API feedback rather than collapsing into a generic error message.

### Read-Only Versus Editable Split
- **D-09:** Phase 4 should expose a wider read-only settings view where it is safe and useful, even when those settings are not yet editable.
- **D-10:** Only the safest confirmed subset should be editable in Phase 4; readable-only categories must stay clearly inspect-only.

### the agent's Discretion
- Exact settings categories and field list inside the approved v1 subset
- The shape and visual treatment of the section-level review step
- Whether verified before/after output is shown inline, in a compact callout, or as a small diff summary
- The exact boundary between read-only informational sections and hidden unsupported areas

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and product intent
- `.planning/PROJECT.md` - project vision, LAN-only scope, and the requirement for conservative configuration writes
- `.planning/REQUIREMENTS.md` - Phase 4 requirements `CONF-01` through `CONF-04`
- `.planning/ROADMAP.md` - Phase 4 goal, success criteria, and relationship to prior viewer and PTZ phases
- `.planning/STATE.md` - current project position after Phase 3 completion and the active handoff into Phase 4

### Prior phase decisions
- `.planning/phases/01-camera-connectivity-capability-map/01-CONTEXT.md` - locked decisions about local config, capability probing, and sanitized debug capture
- `.planning/phases/02-browser-live-view-pipeline/02-CONTEXT.md` - locked decisions about auto-start viewer behavior, fallback handling, and diagnostics staying secondary
- `.planning/phases/03-ptz-control-surface/03-CONTEXT.md` - locked decisions about attached control-surface layout and capability-gated UI behavior

### Existing implementation references
- `src/config/camera-config.ts` - current local camera registration/config persistence
- `src/camera/reolink-session.ts` - authenticated request path and retry behavior that settings reads and writes should reuse
- `src/camera/capability-snapshot.ts` - normalized capability source for gating readable/editable settings categories
- `src/server/create-server.ts` and existing `src/server/routes/*` - browser-safe Fastify control plane patterns to extend for settings APIs
- `web/src/App.tsx` - current viewer-first dashboard composition that Phase 4 will extend with a settings surface

### Device-specific local reference
- `camera_stats.txt` - known model, hardware, and firmware details for the target RLC-423S

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/camera/reolink-session.ts` already owns token-authenticated request and retry behavior that settings operations should share.
- `src/camera/reolink-discovery.ts` and the saved capability snapshot pipeline already prove the app can normalize camera responses before they reach the browser.
- `src/server/routes/live-view.ts` and `src/server/routes/ptz.ts` show the current Fastify pattern for browser-safe control endpoints.
- `web/src/App.tsx` already composes the viewer, PTZ panel, and secondary diagnostics in one dashboard shell that Phase 4 can extend.
- `src/diagnostics/debug-capture.ts` already exists for sanitized unsupported or surprising camera behavior if settings writes expose firmware quirks.

### Established Patterns
- Capability-aware behavior is normalized before UI rendering, so unsupported settings categories should be hidden or read-only from app-level flags rather than raw CGI behavior.
- The browser should keep talking only to the local Node app, never directly to the camera.
- Diagnostics stay secondary to the primary control experience, so settings validation and failure states should be clear without turning the main UI into a raw protocol console.
- Conservative write behavior is already a project-level constraint, so read, validate, write, and verify should be treated as a first-class flow rather than an implementation detail.

### Integration Points
- Phase 4 will extend the existing dashboard with a settings surface that complements live view and PTZ instead of replacing them.
- The backend needs read and write services that reuse current session handling, capability gating, and sanitized error capture before exposing browser routes.
- The frontend needs section-scoped editing state, review/apply affordances, and verified refresh results that fit the existing viewer-first shell.

</code_context>

<specifics>
## Specific Ideas

- The settings experience should feel trustworthy first and fast second: easy to inspect, hard to misapply, and explicit about what changed.
- A wider read-only view is useful even when edit coverage stays intentionally narrow in v1.
- Successful writes should prove themselves by showing what the camera reports after the change, not just what the browser attempted to send.

</specifics>

<deferred>
## Deferred Ideas

- Network reconfiguration remains out of scope for this phase because it carries a higher risk of disconnecting the local control path.
- Storage, alarm, and broader system-management categories can stay inspect-only or deferred until the safe write subset is proven.
- Broad "edit everything the API exposes" behavior is intentionally deferred in favor of a smaller verified subset.

</deferred>

---
*Phase: 04-settings-safe-configuration*
*Context gathered: 2026-04-15*
