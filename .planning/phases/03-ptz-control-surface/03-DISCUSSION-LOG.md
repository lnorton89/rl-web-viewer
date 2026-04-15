# Phase 3: PTZ Control Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-04-14T19:00:00-07:00
**Phase:** 03-ptz-control-surface
**Areas discussed:** Motion interaction, PTZ layout, Stop and safety behavior, Preset presentation

---

## Motion Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Press-and-hold pan/tilt + click zoom | Hold controls for pan and tilt, click actions for zoom in and zoom out, keyboard later if it fits cleanly | x |
| Click-per-step only | Use discrete click actions for pan, tilt, and zoom | |
| Dual-mode controls | Support both hold-to-move and step controls from day one | |

**User's choice:** Press-and-hold pan/tilt + click zoom
**Notes:** The primary motion model should favor responsive direct control without requiring multiple modes in v1.

---

## PTZ Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated PTZ panel | Put PTZ controls next to or below the viewer rather than overlaying the video by default | x |
| Viewer overlay | Put PTZ controls directly over the live-view surface | |
| Hybrid layout | Use both an overlay and a separate expanded panel | |

**User's choice:** Dedicated PTZ panel
**Notes:** PTZ should feel attached to the viewer, but not obscure the video as the default experience.

---

## Stop And Safety Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Stop on release + visible Stop button | Movement stops on release and the UI also keeps an explicit Stop control visible | x |
| Explicit Stop only | Motion continues until the user presses a Stop button | |
| Timed bursts only | Replace continuous control with short timed movement bursts | |

**User's choice:** Stop on release + visible Stop button
**Notes:** Safety and confidence matter more than minimalism here, so the control surface should have both automatic stop-on-release and a clear manual recovery path.

---

## Preset Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Simple labeled list/grid | Show presets plainly when supported instead of hiding them behind a disclosure | x |
| Hidden disclosure | Keep presets tucked behind a disclosure until expanded | |
| Always prominent | Keep presets highly prominent next to the PTZ pad at all times | |

**User's choice:** Simple labeled list/grid
**Notes:** Presets should be easy to trigger in v1, but only when the capability snapshot confirms support.

---

## the agent's Discretion

- Exact PTZ button shapes and iconography
- Responsive placement details for the dedicated PTZ panel
- Whether keyboard support fits Phase 3 cleanly or stays deferred
- Exact preset ordering and empty-state messaging

## Deferred Ideas

- Patrol route editing and richer PTZ authoring remain future work.
