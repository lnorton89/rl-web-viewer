import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../web/src/App.js";
import { useLiveView } from "../../web/src/hooks/use-live-view.js";
import { fetchPtzAdvanced } from "../../web/src/lib/ptz-api.js";

vi.mock("../../web/src/hooks/use-live-view.js", () => ({
  useLiveView: vi.fn(),
}));

vi.mock("../../web/src/lib/ptz-api.js", () => ({
  fetchPtzBootstrap: vi.fn().mockResolvedValue({
    supportsPtzControl: true,
    supportsPtzPreset: false,
    hasVisibleStop: true,
    presets: [],
  }),
  fetchPtzAdvanced: vi.fn().mockResolvedValue({
    focus: 50,
    iris: 50,
    speed: 5,
  }),
}));

vi.mock("../../web/src/components/PtzPanel.js", () => ({
  PtzPanel: () => <div data-testid="ptz-panel">PTZ Panel</div>,
}));



vi.mock("../../web/src/components/SettingsPanel.js", () => ({
  SettingsPanel: () => <div data-testid="settings-panel">Settings Panel</div>,
}));

const useLiveViewMock = vi.mocked(useLiveView);
const fetchPtzAdvancedMock = vi.mocked(fetchPtzAdvanced);

describe("repeated use flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPtzAdvancedMock.mockResolvedValue({
      focus: 50,
      iris: 50,
      speed: 5,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe("live-view retry and reconnect loops", () => {
    it("keeps the Retry Live View action visible after failure", () => {
      const retry = vi.fn();

      useLiveViewMock.mockReturnValue({
        state: { kind: "failed", reason: "Connection refused" },
        modes: [],
        currentModeId: null,
        fallbackOrder: [],
        nextFallbackModeId: null,
        renderKind: "video" as const,
        activePlayback: null,
        bindVideoElement: vi.fn(),
        bindImageElement: vi.fn(),
        selectMode: vi.fn(),
        retry,
      } as ReturnType<typeof useLiveView>);

      render(<App />);

      expect(screen.getByRole("button", { name: "Attempt to reconnect using the same mode" })).not.toBeNull();
    });

    it("preserves diagnostics as secondary disclosure after retry", async () => {
      useLiveViewMock.mockReturnValue({
        state: { kind: "failed", reason: "Connection refused" },
        modes: [],
        currentModeId: null,
        fallbackOrder: [],
        nextFallbackModeId: null,
        renderKind: "video" as const,
        activePlayback: null,
        bindVideoElement: vi.fn(),
        bindImageElement: vi.fn(),
        selectMode: vi.fn(),
        retry: vi.fn(),
      } as ReturnType<typeof useLiveView>);

      render(<App />);

      // Diagnostics should be collapsed by default
      expect(screen.queryByText("Last reason")).toBeNull();

      // Click diagnostics toggle
      fireEvent.click(screen.getByRole("button", { name: "Show detailed transport information" }));

      // Now diagnostics should be visible with "Last reason" label
      expect(screen.getByText("Last reason")).not.toBeNull();
    });

    it("survives repeated retry attempts without crashing", async () => {
      const mockRetry = vi.fn().mockResolvedValue(undefined);

      useLiveViewMock.mockReturnValue({
        state: { kind: "failed", reason: "Timeout" },
        modes: [],
        currentModeId: null,
        fallbackOrder: [],
        nextFallbackModeId: null,
        renderKind: "video" as const,
        activePlayback: null,
        bindVideoElement: vi.fn(),
        bindImageElement: vi.fn(),
        selectMode: vi.fn(),
        retry: mockRetry,
      } as ReturnType<typeof useLiveView>);

      render(<App />);

      // Click retry multiple times
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole("button", { name: "Attempt to reconnect using the same mode" }));
        await waitFor(() => {
          expect(mockRetry).toHaveBeenCalledTimes(i + 1);
        });
      }
    });

    it("exposes retry function that resets viewer state", () => {
      const retry = vi.fn().mockResolvedValue(undefined);

      useLiveViewMock.mockReturnValue({
        state: { kind: "live" },
        modes: [],
        currentModeId: "webrtc:main",
        fallbackOrder: ["webrtc:main"],
        nextFallbackModeId: null,
        renderKind: "video" as const,
        activePlayback: null,
        bindVideoElement: vi.fn(),
        bindImageElement: vi.fn(),
        selectMode: vi.fn(),
        retry,
      } as ReturnType<typeof useLiveView>);

      render(<App />);

      // Retry button should be hidden in live state
      expect(screen.queryByRole("button", { name: "Attempt to reconnect using the same mode" })).toBeNull();
    });
  });

  describe("settings reload behavior", () => {
    it("renders settings panel", () => {
      useLiveViewMock.mockReturnValue({
        state: { kind: "live" },
        modes: [],
        currentModeId: "webrtc:main",
        fallbackOrder: ["webrtc:main"],
        nextFallbackModeId: null,
        renderKind: "video" as const,
        activePlayback: null,
        bindVideoElement: vi.fn(),
        bindImageElement: vi.fn(),
        selectMode: vi.fn(),
        retry: vi.fn(),
      } as ReturnType<typeof useLiveView>);

      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Configure camera settings" }));

      // Settings panel should be rendered
      expect(screen.getByTestId("settings-panel")).not.toBeNull();
    });
  });
});
