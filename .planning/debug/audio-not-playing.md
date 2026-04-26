---
status: root-cause-found
trigger: "no audio controls or audio playing back"
created: "2026-04-16T17:55:00.000Z"
updated: "2026-04-16T18:10:00.000Z"
---

# Debug: Audio Not Playing Back

## Symptoms

- **Expected:** Audio controls (mute/unmute, volume) appear in the PTZ sidebar; audio plays back from the live view stream when unmuted
- **Actual:** No audio controls visible; no audio playing back from the live view
- **Error messages:** None (silent failure)
- **Timeline:** Since Phase 3 implementation (commit 41f23e7)
- **Reproduction:** Open the app, observe PTZ sidebar — no AudioPanel rendered; video has no audio

## Evidence

- timestamp: 2026-04-16T17:55:00Z
  file: web/src/components/LiveViewerFrame.tsx:49
  finding: "Video element has hardcoded `muted` attribute — `<video muted>` always silences audio"
  severity: root-cause

- timestamp: 2026-04-16T17:55:00Z
  file: web/src/hooks/use-audio-controls.ts:108-113
  finding: "applyToVideo callback exists but is never invoked on the actual video element — no wiring between AudioPanel/LiveViewerFrame"
  severity: root-cause

- timestamp: 2026-04-16T17:55:00Z
  file: web/src/components/AudioPanel.tsx:8
  finding: "AudioPanel returns null when hasAudio is false — if server returns hasAudio:false, controls are hidden entirely"
  severity: contributory

- timestamp: 2026-04-16T17:55:00Z
  file: src/index.ts:67-79
  finding: "audioSupported is read from capability snapshot at server startup only; if snapshot missing or audioNum=0, hasAudio returns false"
  severity: contributory

## Current Focus

hypothesis: "Two root causes: (1) `<video muted>` hardcodes silence in LiveViewerFrame, (2) `applyToVideo` is never connected to the video element. Contributory: `hasAudio` may return false if capability snapshot is missing/empty."
test: "Remove hardcoded muted, wire applyToVideo to the video element, verify audio controls render and affect playback"
expecting: "Audio controls visible when camera supports audio; unmute/volume changes applied to video element"
next_action: "gather initial evidence"
reasoning_checkpoint: |
  The audio feature was implemented in Phase 3 but has two disconnection points:
  1. The video element in LiveViewerFrame.tsx has `muted` as a static JSX attribute, which forces the video to always be muted regardless of audio control state
  2. The `applyToVideo` method from `useAudioControls` is only used inside AudioPanel (which doesn't have the video element ref) — there is no wiring between the audio hook and the actual video element in LiveViewerFrame

  Fix approach:
  - Remove `muted` from the video element JSX
  - Add a controlled muted state driven by the audio hook
  - Wire `applyToVideo` to the video element via a ref or callback
  - Optionally make `hasAudio` detection more resilient (check stream rather than just snapshot)

## Eliminated

## Resolution

root_cause: |
  Two root causes confirmed by source inspection:
  1. `<video muted>` in LiveViewerFrame.tsx:49 is a static JSX attribute that forces `HTMLVideoElement.muted = true` on every render, overriding any programmatic audio control.
  2. `useAudioControls().applyToVideo` is never called with the actual video element ref. The video element is held by `useLiveView` (via `bindVideoElement` → `setVideoElement`), but `useAudioControls` is only used inside `AudioPanel` which has no access to the video element. There is no effect or callback wiring audio state to the video DOM node.
  Contributory: `hasAudio` returns false when no capability snapshot exists or `audioNum=0`, causing `AudioPanel` to render null and hide all controls.

fix: |
  1. Remove `muted` from the `<video>` JSX in LiveViewerFrame.tsx
  2. Add a `useEffect` in the component tree that has access to both the video element ref (from useLiveView) and the audio controls state (from useAudioControls), applying `applyAudioToVideo` whenever either changes
  3. Start `isMuted` as `true` in useAudioControls (for autoplay policy compliance), then let the user unmute
  4. Lift `useAudioControls` to App.tsx so both the video element and AudioPanel can share the same audio state

verification: |
  - Audio controls render in PTZ sidebar when camera supports audio
  - Unmuting via AudioPanel sets video.muted = false and audio plays
  - Volume slider changes video.volume proportionally
  - Muting again silences audio
  - No capability snapshot → AudioPanel hidden gracefully (no crash)

files_changed:
  - web/src/components/LiveViewerFrame.tsx
  - web/src/hooks/use-audio-controls.ts
  - web/src/components/AudioPanel.tsx
  - web/src/App.tsx
