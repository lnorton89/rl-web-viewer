# Phase 03: Live View Enhancement — UI Design Contract

**Gathered:** 2026-04-16
**Status:** Approved

<overview>
## UI Overview

Audio controls integrated into the Live View sidebar alongside existing PTZ controls.

### Placement
- Audio controls appear in the right sidebar (`PtzPanel` area or new `AudioPanel` section)
- Volume slider below PTZ speed slider
- Mute toggle button with audio icon

### Components
1. **Mute Toggle** — IconButton with speaker/muted icon
2. **Volume Slider** — MUI Slider (0-100 range)
3. **Audio Indicator** — Small icon in live view status area

</overview>

<layout>
## Layout & Structure

### Sidebar Panel
```
┌─────────────────────────┐
│ PTZ Controls            │
├─────────────────────────┤
│ Focus  [=======] 50    │
│ Iris   [=======] 50    │
│ Speed  [=======]  5    │
├─────────────────────────┤
│ Audio                   │  ← New section header
├─────────────────────────┤
│ 🔊 Mute   [====] 75   │  ← IconButton + Slider
├─────────────────────────┤
│ [Preset buttons]         │
└─────────────────────────┘
```

### Responsive Behavior
- Fixed 280px sidebar width (matches PTZ panel)
- Scrollable if content exceeds viewport

</layout>

<components>
## Component Specifications

### 1. AudioMuteButton (IconButton)

**Appearance:**
- Size: `size="medium"` (40x40px)
- Icon: `VolumeUp` when unmuted, `VolumeOff` when muted
- Color: `primary` when unmuted, `disabled` when muted

**States:**
- Default: VolumeUp icon, primary color
- Muted: VolumeOff icon, grey/disabled color
- Hover: Slight background highlight
- Disabled: When camera has no audio capability

**Tooltip:** "Mute audio" / "Unmute audio"

### 2. AudioVolumeSlider (Slider)

**Appearance:**
- Min: 0, Max: 100, Default: 75
- Width: fills available space
- Show value label on hover

**States:**
- Default: Primary color track
- Muted: Disabled appearance (grey)
- Dragging: Active state with value tooltip

**Integration:** Synced with mute state — slider disabled when muted

### 3. AudioStatusIndicator (Typography)

**Appearance:**
- Small text/icon near live view status
- Shows "Audio: On" or "Audio: Off" or audio icon

**Location:** In the live viewer overlay status area

</components>

<spacing>
## Spacing System

- Sidebar padding: 16px
- Section gap: 24px
- Control label gap: 8px
- Slider margin: 8px vertical

</spacing>

<typography>
## Typography

- Section headers: H6, `secondary.main` color
- Labels: Body2, `text.primary`
- Values: Body2, `text.secondary`

</typography>

<color>
## Color Usage

- Primary actions: MUI theme primary
- Secondary elements: MUI theme secondary
- Text: MUI theme text colors
- Disabled state: MUI theme action.disabled

No custom colors needed — use MUI theme tokens.

</color>

<interactions>
## Interactions

### Mute Toggle
- Click: Toggle mute state
- Keyboard: Enter/Space to toggle
- Visual feedback: Icon and color change immediately

### Volume Slider
- Drag: Real-time volume adjustment
- Click track: Jump to position
- Arrow keys: Increment/decrement by 5

### Audio State Persistence
- Store mute state and volume in localStorage
- Restore on page load

</interactions>

<accessibility>
## Accessibility

- All controls keyboard accessible
- aria-label on mute button: "Mute audio" / "Unmute audio"
- aria-label on slider: "Audio volume"
- Screen reader announces volume changes

</accessibility>

---

*Phase: 03-live-view-enhancement*
*UI-SPEC approved: 2026-04-16*
