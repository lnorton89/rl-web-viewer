import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveMode, LiveModeId } from "../../src/types/live-view.js";
import App from "../../web/src/App.js";
import { useLiveView } from "../../web/src/hooks/use-live-view.js";

vi.mock("../../web/src/hooks/use-live-view.js", () => ({
  useLiveView: vi.fn(),
}));

vi.mock("../../web/src/components/PtzPanel.js", () => ({
  PtzPanel: () => <div data-testid="ptz-panel" />,
}));

vi.mock("../../web/src/components/SettingsPanel.js", () => ({
  SettingsPanel: () => <div data-testid="settings-panel" />,
}));

const useLiveViewMock = vi.mocked(useLiveView);

describe("live view controls", () => {
  const selectMode = vi.fn();
  const retry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useLiveViewMock.mockReturnValue(
      createLiveViewState({
        retry,
        selectMode,
      }),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the approved overlay labels across viewer states", () => {
    for (const [stateKind, label] of [
      ["connecting", "Connecting"],
      ["live", "Live"],
      ["reconnecting", "Reconnecting"],
      ["failed", "Live View Failed"],
    ] as const) {
      useLiveViewMock.mockReturnValue(
        createLiveViewState({
          state: { kind: stateKind, reason: "Transport reason" },
        }),
      );

      const { unmount } = render(<App />);
      expect(screen.getByText(label)).not.toBeNull();
      unmount();
    }
  });

  it("uses the exact Retry Live View label when the viewer fails", () => {
    useLiveViewMock.mockReturnValue(
      createLiveViewState({
        state: { kind: "failed", reason: "Snapshot endpoint returned 503" },
      }),
    );

    render(<App />);

    expect(
      screen.getByRole("button", { name: "Retry Live View" }),
    ).not.toBeNull();
  });

  it("switches modes through the hook and keeps diagnostics collapsed by default", () => {
    render(<App />);

    expect(screen.queryByText("Last reason")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "HLS Sub" }));

    expect(selectMode).toHaveBeenCalledWith("hls:sub");
  });

  it("shows diagnostics only after toggling and uses the hook-provided next fallback id", () => {
    useLiveViewMock.mockReturnValue(
      createLiveViewState({
        currentModeId: "webrtc:main",
        nextFallbackModeId: "snapshot:sub",
        state: { kind: "reconnecting", reason: "WebRTC handshake timed out" },
      }),
    );

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Diagnostics" }));

    expect(screen.getByText("Last reason")).not.toBeNull();
    expect(screen.getAllByText("WebRTC handshake timed out").length).toBeGreaterThan(0);
    expect(screen.getAllByText("snapshot:sub").length).toBeGreaterThan(0);
    expect(screen.queryByText("/stream/hls/sub.m3u8")).toBeNull();
  });
});

function createLiveViewState(overrides: {
  currentModeId?: LiveModeId | null;
  nextFallbackModeId?: LiveModeId | null;
  retry?: () => Promise<void>;
  selectMode?: (modeId: LiveModeId) => Promise<void>;
  state?: { kind: "connecting" | "live" | "reconnecting" | "failed"; reason?: string };
} = {}) {
  const modes = createModes();

  return {
    activePlayback: {
      hlsUrl: "/stream/hls/sub.m3u8",
      snapshotUrl: "/stream/snapshot/main.jpg",
      whepUrl: "/stream/whep/main",
    },
    bindImageElement: vi.fn(),
    bindVideoElement: vi.fn(),
    currentModeId: overrides.currentModeId ?? "webrtc:main",
    fallbackOrder: ["webrtc:main", "webrtc:sub", "hls:sub", "snapshot:main"],
    modes,
    nextFallbackModeId: overrides.nextFallbackModeId ?? "hls:sub",
    renderKind: "video" as const,
    retry: overrides.retry ?? vi.fn(),
    selectMode: overrides.selectMode ?? vi.fn(),
    state: overrides.state ?? { kind: "live" as const },
  };
}

function createModes(): LiveMode[] {
  return [
    createMode("webrtc:main", "WebRTC Main"),
    createMode("webrtc:sub", "WebRTC Sub"),
    createMode("hls:sub", "HLS Sub"),
    createMode("snapshot:main", "Snapshot Main"),
  ];
}

function createMode(modeId: LiveModeId, label: string): LiveMode {
  const transport = modeId.split(":")[0] as LiveMode["transport"];
  const quality = modeId.split(":")[1] as LiveMode["quality"];

  return {
    enabled: true,
    id: modeId,
    label,
    playback: {
      hlsUrl: "/stream/hls/sub.m3u8",
      snapshotUrl: "/stream/snapshot/main.jpg",
      whepUrl: "/stream/whep/main",
    },
    quality,
    transport,
  };
}
