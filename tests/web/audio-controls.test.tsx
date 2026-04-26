import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AudioPanel } from "../../web/src/components/AudioPanel.js";
import type { AudioControlsState } from "../../web/src/hooks/use-audio-controls.js";

describe("audio controls", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when camera has no audio", () => {
    const controls: AudioControlsState = {
      hasAudio: false,
      isMuted: false,
      volume: 75,
      setMuted: vi.fn(),
      setVolume: vi.fn(),
      applyToVideo: vi.fn(),
    };

    render(<AudioPanel controls={controls} />);

    expect(screen.queryByRole("button", { name: /unmute audio/i })).toBeNull();
    expect(screen.queryByRole("slider", { name: /audio volume/i })).toBeNull();
  });

  it("renders mute button and volume slider when camera has audio", () => {
    const controls: AudioControlsState = {
      hasAudio: true,
      isMuted: false,
      volume: 75,
      setMuted: vi.fn(),
      setVolume: vi.fn(),
      applyToVideo: vi.fn(),
    };

    render(<AudioPanel controls={controls} />);

    expect(screen.getByRole("button", { name: /mute audio/i })).not.toBeNull();
    expect(screen.getByRole("slider", { name: /audio volume/i })).not.toBeNull();
  });

  it("shows unmute button when audio is muted", () => {
    const controls: AudioControlsState = {
      hasAudio: true,
      isMuted: true,
      volume: 50,
      setMuted: vi.fn(),
      setVolume: vi.fn(),
      applyToVideo: vi.fn(),
    };

    render(<AudioPanel controls={controls} />);

    expect(screen.getByRole("button", { name: /unmute audio/i })).not.toBeNull();
  });
});
