---
phase: 3
slug: ptz-control-surface
status: approved
shadcn_initialized: false
preset: none
created: 2026-04-14
reviewed_at: 2026-04-14T20:06:42.3494178-07:00
---

# Phase 3 - UI Design Contract

> Visual and interaction contract for the PTZ control surface. This phase extends the existing Phase 2 viewer shell rather than introducing a new admin layout or component system.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none - preserve the existing handcrafted Phase 2 CSS shell |
| Preset | not applicable |
| Component library | none |
| Icon library | inline SVG only |
| Font | IBM Plex Sans |

---

## Layout Contract

- Keep the dashboard viewer-first. The live viewer remains the largest surface and the PTZ panel reads as attached support, not a separate screen.
- At `980px` and wider, render the viewer and PTZ panel in a two-column layout: viewer `minmax(0, 1.6fr)`, PTZ panel `minmax(320px, 360px)`.
- Below `980px`, stack the PTZ panel directly under the viewer with the viewer first in reading order.
- Keep `ModeSwitcher` and `DiagnosticsDisclosure` below the viewer/PTZ cluster at full width. PTZ must not push diagnostics above primary controls.
- PTZ controls do not float over the video. The only viewer overlay remains live-view status from Phase 2.
- Reuse the current card language from `mode-switcher` and `diagnostics-disclosure`: 24px panel padding, 12px radius, 1px low-contrast border, soft dark gradient fill.

---

## Control Grouping

- Group 1: `Pan / Tilt`
  Use a 3x3 control pad inside the PTZ panel.
  Top-center `Up`, middle-left `Left`, middle-center `Stop Camera`, middle-right `Right`, bottom-center `Down`.
- Group 2: `Zoom`
  Place `Zoom In` and `Zoom Out` as a separate two-button stack adjacent to the pan/tilt pad on desktop and directly below it on narrow widths.
- Group 3: `Presets`
  Render presets as a visible two-column grid below motion controls when `supportsPtzPreset` is true.
  Hide the entire presets section when preset support is false.
- Use section labels and helper text, not long descriptions:
  `Pan / Tilt` -> `Hold to move. Release to stop.`
  `Zoom` -> `Tap for a short zoom step.`
  `Presets` -> `Recall saved camera positions.`

---

## Interaction Contract

- Pan and tilt use press-and-hold only. One pointer-down sends one motion-start command. Repeating commands while held is not allowed.
- Release behavior is mandatory on `pointerup`, `pointercancel`, `lostpointercapture`, window `blur`, and document `visibilitychange` to `hidden`.
- Only one motion direction may be active at a time. While moving, disable the other directional buttons until stop is sent.
- `Stop Camera` is always visible whenever PTZ control is supported. Do not hide it in a disclosure, overflow menu, or icon-only affordance.
- `Zoom In` and `Zoom Out` are discrete click actions. Each click represents one bounded zoom pulse, not continuous hold behavior.
- Preset buttons are click-to-recall actions. While one preset is recalling, disable the rest of the preset grid until the request settles.
- Keyboard-triggered PTZ movement is out of scope for this phase. Standard focus and `Enter`/`Space` activation on buttons still apply.

### State Rules

- Idle:
  Neutral dark buttons with low-contrast border. Helper copy visible.
- Holding motion:
  Active directional button switches to accent fill, accent border, brighter label, and inset shadow.
  Show inline status text: `Moving {direction}...`
- Release or explicit stop:
  Replace motion text with `Stopping camera...` immediately.
  When stop resolves, show `Motion stopped` for 1.2s, then return to helper copy.
- Stop confidence:
  `Stop Camera` uses the destructive color even though it is not a destructive data action.
  On click, the button remains visually active until the stop request settles.
- Busy:
  Temporarily disable controls that would conflict with the in-flight action and keep the rest readable at full opacity.
- Unsupported:
  If `supportsPtzControl` is false, hide motion and zoom groups and show one panel message instead:
  `PTZ is not available for this camera profile.`
  If `supportsPtzPreset` is false, hide presets entirely instead of showing disabled dead controls.

---

## Spacing Scale

Declared values (must be multiples of 4):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon offsets, status-dot spacing |
| sm | 8px | Tight label-to-helper spacing, compact button gaps |
| md | 16px | Default internal spacing, control group gaps |
| lg | 24px | Card padding, dashboard section gaps |
| xl | 32px | Viewer/PTZ cluster spacing, overlay inset parity |
| 2xl | 48px | Mobile page padding, major vertical breaks |
| 3xl | 64px | Desktop page top padding |

Exceptions: `44px` minimum hit area for any pill or icon-led button, `56px` square minimum for directional controls, `12px` corner radius for attached PTZ cards to match the existing viewer shell.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |
| Heading | 20px | 600 | 1.2 |
| Display | 32px | 600 | 1.1 |

Use the existing IBM Plex Sans stack. Keep PTZ headings aligned with current section headings; do not introduce condensed techno styling or oversized dashboard numerics.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#12161b` | App shell background, viewer-adjacent negative space |
| Secondary (30%) | `#1d242c` | PTZ panel, preset grid surface, support cards |
| Accent (10%) | `#63c7b2` | Active motion state, selected preset, focus ring, live/ready labels, non-destructive retry actions |
| Destructive | `#c65a5a` | `Stop Camera`, failed stop/error text, emergency recovery emphasis |

Accent reserved for: active directional button fill and border, selected preset button, support-label/kicker text, status dots that indicate healthy live or active control state, and visible focus treatment. Do not use accent on every idle control.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Stop Camera |
| Empty state heading | No saved presets |
| Empty state body | Save a preset in the camera first, then refresh this panel to recall it here. |
| Error state | PTZ command did not finish. Release the control, press Stop Camera once, then retry. |
| Destructive confirmation | None: Stop Camera executes immediately and shows stop-progress feedback in-panel. |

### Tone

- Keep copy terse, operational, and local-first.
- Prefer short sentence fragments over admin phrasing.
- Match existing viewer language such as `Connecting`, `Live`, and `Retry Live View`.
- Avoid words like `submit`, `manage`, `configure`, or `administration` inside the PTZ surface.

### Required Visible Labels

- Panel kicker: `Camera Control`
- Panel heading: `PTZ Control`
- Motion helper: `Hold to move. Release to stop.`
- Zoom helper: `Tap for a short zoom step.`
- Preset heading: `Presets`

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable - shadcn not initialized |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Sources Used

- `03-CONTEXT.md`: motion, layout, stop, and preset decisions `D-01` through `D-08`
- `03-RESEARCH.md`: stop lifecycle, capability gating, press-hold semantics, and preset visibility rules
- `web/src/App.tsx`: viewer-first dashboard composition
- `web/src/styles.css`: existing font, color tokens, spacing rhythm, card language, and 44px button minimums
- `web/src/components/LiveViewerFrame.tsx`: preserve the viewer as the primary surface
- `web/src/components/ModeSwitcher.tsx`: existing attached-card and pill-button pattern
- `web/src/components/DiagnosticsDisclosure.tsx`: diagnostics remain secondary
- `web/src/components/ViewerStatusOverlay.tsx`: match current copy tone and short status language
