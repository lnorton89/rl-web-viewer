---
phase: 02-ptz-enhancement
context: v1.1
created: 2026-04-16
---

# Phase 2: PTZ Enhancement - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Add missing PTZ controls to match the built-in dashboard. Focus, iris, and speed controls for enhanced PTZ operation.

Requirements:
- PTZ-04: Focus control (near/far)
- PTZ-05: Iris control (open/close)
- PTZ-06: Speed slider

Success criteria:
1. Focus slider or buttons control camera focus.
2. Iris slider or buttons control camera aperture.
3. Speed slider affects PTZ movement speed.

</domain>

<decisions>
## Implementation Decisions

### Focus Control (PTZ-04)
- **D-01:** Slider with +/- buttons, not buttons-only
- Range: 0-100 (camera API expects 0-100)
- Positioned in PTZ panel below zoom controls
- MUI Slider component with increment/decrement buttons

### Iris Control (PTZ-05)
- **D-02:** Slider with open/close buttons, not buttons-only
- Range: 0-100 (camera API expects 0-100)
- Positioned in PTZ panel below focus controls
- MUI Slider component with open/close buttons

### Speed Control (PTZ-06)
- **D-03:** Speed slider affects PTZ movement speed
- Range: 1-10 (camera API expects 1-10, default 5)
- Positioned in PTZ panel above pan/tilt controls
- Default value persisted in local state

### Component Integration
- **D-04:** PTZ controls in right sidebar of Live View
- PtzPanel displayed in 280px right sidebar on live view page
- Navigation sidebar shows only Live View and Settings
- Follow existing MUI Paper pattern for the panel

### API Design
- **D-05:** PTZ service interface extends to support focus/iris/speed
- New endpoints: /api/ptz/focus, /api/ptz/iris, /api/ptz/speed
- No new backend service - extend existing reolink-ptz.ts

</decisions>

<canonical_refs>
## Canonical References

### PTZ Implementation
- `src/types/ptz.ts` — PTZ type definitions to extend
- `src/camera/reolink-ptz.ts` — PTZ service implementation
- `src/server/routes/ptz.ts` — PTZ API routes
- `web/src/components/PtzControlsInline.tsx` — Inline PTZ controls in Live View
- `web/src/components/PtzPanel.tsx` — Full PTZ panel (presets, motion controls)
- `web/src/hooks/use-ptz-controls.ts` — Existing PTZ hook

### MUI Components
- `web/src/theme/theme.ts` — Dark theme configuration (Phase 1)
- `@mui/material Slider` — MUI Slider component
- `@mui/material IconButton` — Icon buttons for controls
- `@mui/material Tooltip` — Hover tooltips

### Camera API
- RLC-423S firmware v2.0.0.1055 API for focus/iris/speed commands

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `usePtzControls` hook: Provides PTZ control logic, extend for focus/iris
- MUI Slider: Already used in theme, available in project
- PtzPanel.tsx: Existing component, add new sections

### Established Patterns
- MUI Paper > section structure for grouping
- CSS modules for component styling
- Dark theme colors from Phase 1

### Integration Points
- PTZ route: Extend with focus/iris/speed endpoints
- PtzPanel: Add new control sections below zoom
- usePtzControls: Add new functions for focus/Iris/speed

</code_context>

<specifics>
## Specific Ideas

- Speed affects pan/tilt movement speed only (not zoom)
- Focus and iris use same 0-100 range as camera API
- Controls visible only when PTZ is available (feature detection)
- PTZ controls inline in Live View for quick access while viewing
- Full PtzPanel retained for preset management and detailed controls

</specifics>

<deferred>
## Deferred Ideas

None — all requirements covered in this phase scope.

</deferred>

---

*Phase: 02-ptz-enhancement*
*Context gathered: 2026-04-16*
*Auto-discuss: Selected default options for all gray areas*