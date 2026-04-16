# Phase 03: Live View Enhancement - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Add audio playback capability to the live view when the camera has audio input, with visual indicators and detailed controls for muting/unmuting and volume adjustment.

</domain>

<decisions>
## Implementation Decisions

### Audio Feature Scope
- **D-01:** Audio playback with mute/unmute toggle
- **D-02:** Volume slider control
- **D-03:** Visual audio indicator when audio is playing
- **D-04:** Audio state persistence (remember mute/volume settings)

### UI Integration
- **D-05:** Audio controls integrated into the Live View sidebar alongside PTZ controls
- **D-06:** Clear visual feedback for audio state (muted/unmuted icon, volume level)

### Technical Approach
- **D-07:** Camera audio capability detection via camera API
- **D-08:** Graceful handling when camera has no audio (hide controls)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `usePtzControls` hook: Can serve as pattern for audio state hook
- `PtzPanel` component: Audio controls should integrate here or share sidebar space
- MUI components: IconButton, Slider, Tooltip already in use

### Established Patterns
- Sidebar-based controls (PTZ panel in right sidebar)
- State hooks with API integration
- Disabled state handling for unsupported features

### Integration Points
- Live View page (`App.tsx`)
- Audio API endpoint on camera (if available)
- Playback state management

</code_context>

<specifics>
## Specific Ideas

- Audio icon in status bar alongside video
- Volume slider similar to PTZ speed slider
- Mute button with clear on/off state

</specifics>

<deferred>
## Deferred Ideas

None — scope stays focused on audio playback.

</deferred>

---

*Phase: 03-live-view-enhancement*
*Context gathered: 2026-04-16*
