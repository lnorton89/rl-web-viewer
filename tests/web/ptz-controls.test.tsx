import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveMode, LiveModeId } from "../../src/types/live-view.js";
import type { PtzBootstrap } from "../../src/types/ptz.js";
import App from "../../web/src/App.js";
import { usePtzControls } from "../../web/src/hooks/use-ptz-controls.js";
import { useLiveView } from "../../web/src/hooks/use-live-view.js";
import {
  fetchPtzAdvanced,
  fetchPtzBootstrap,
  pulsePtzZoom,
  recallPtzPreset,
  startPtzMotion,
  stopPtzMotion,
} from "../../web/src/lib/ptz-api.js";

vi.mock("../../web/src/lib/ptz-api.js", () => ({
  fetchPtzAdvanced: vi.fn(),
  fetchPtzBootstrap: vi.fn(),
  startPtzMotion: vi.fn(),
  stopPtzMotion: vi.fn(),
  pulsePtzZoom: vi.fn(),
  recallPtzPreset: vi.fn(),
}));

vi.mock("../../web/src/hooks/use-live-view.js", () => ({
  useLiveView: vi.fn(),
}));

vi.mock("../../web/src/components/SettingsPanel.js", () => ({
  SettingsPanel: () => <div data-testid="settings-panel" />,
}));

const fetchPtzBootstrapMock = vi.mocked(fetchPtzBootstrap);
const fetchPtzAdvancedMock = vi.mocked(fetchPtzAdvanced);
const startPtzMotionMock = vi.mocked(startPtzMotion);
const stopPtzMotionMock = vi.mocked(stopPtzMotion);
const pulsePtzZoomMock = vi.mocked(pulsePtzZoom);
const recallPtzPresetMock = vi.mocked(recallPtzPreset);
const useLiveViewMock = vi.mocked(useLiveView);

let visibilityState = "visible";

describe("ptz controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installPointerCaptureMocks();
    visibilityState = "visible";

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibilityState,
    });

    fetchPtzBootstrapMock.mockResolvedValue(createBootstrap());
    fetchPtzAdvancedMock.mockResolvedValue({
      focus: 50,
      iris: 50,
      speed: 5,
    });
    startPtzMotionMock.mockResolvedValue({
      direction: "up",
      stopDeadlineMs: 5000,
    });
    stopPtzMotionMock.mockResolvedValue({
      stopped: true,
      reason: "release",
    });
    pulsePtzZoomMock.mockResolvedValue({
      direction: "in",
      pulseMs: 250,
    });
    recallPtzPresetMock.mockResolvedValue({
      presetId: 2,
    });
    useLiveViewMock.mockReturnValue(createLiveViewState());
  });

  afterEach(() => {
    cleanup();
  });

  it("motion starts once per hold and stops on release", async () => {
    const deferredStart = createDeferred<void>();
    startPtzMotionMock.mockReturnValueOnce(
      deferredStart.promise.then(() => ({
        direction: "up",
        stopDeadlineMs: 5000,
      })),
    );

    render(<HookHarness />);

    await waitFor(() => {
      expect(fetchPtzBootstrapMock).toHaveBeenCalledOnce();
    });

    const upButton = screen.getByRole("button", { name: "Up" });

    fireEvent.pointerDown(upButton, { pointerId: 7 });
    fireEvent.pointerDown(upButton, { pointerId: 7 });
    fireEvent.pointerUp(upButton, { pointerId: 7 });

    expect(startPtzMotionMock).toHaveBeenCalledOnce();
    expect(startPtzMotionMock).toHaveBeenCalledWith("up");
    expect(stopPtzMotionMock).not.toHaveBeenCalled();

    deferredStart.resolve();

    await waitFor(() => {
      expect(stopPtzMotionMock).toHaveBeenCalledWith("release");
    });
  });

  it("stop fallbacks cover pointer cancel, lostpointercapture, blur, hidden tabs, and explicit stop", async () => {
    render(<HookHarness />);

    await waitFor(() => {
      expect(fetchPtzBootstrapMock).toHaveBeenCalledOnce();
    });

    const leftButton = screen.getByRole("button", { name: "Left" });
    const rightButton = screen.getByRole("button", { name: "Right" });
    const upButton = screen.getByRole("button", { name: "Up" });
    const downButton = screen.getByRole("button", { name: "Down" });
    const stopButton = screen.getByRole("button", { name: "Stop Camera" });

    fireEvent.pointerDown(leftButton, { pointerId: 1 });
    fireEvent.pointerCancel(leftButton, { pointerId: 1 });
    await waitFor(() => {
      expect(stopPtzMotionMock).toHaveBeenCalledWith("pointer-cancel");
    });

    fireEvent.pointerDown(rightButton, { pointerId: 2 });
    fireEvent(rightButton, new Event("lostpointercapture", { bubbles: true }));
    await waitFor(() => {
      expect(stopPtzMotionMock).toHaveBeenCalledWith("pointer-cancel");
    });

    fireEvent.pointerDown(upButton, { pointerId: 3 });
    window.dispatchEvent(new Event("blur"));
    await waitFor(() => {
      expect(stopPtzMotionMock).toHaveBeenCalledWith("blur");
    });

    fireEvent.pointerDown(downButton, { pointerId: 4 });
    visibilityState = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => {
      expect(stopPtzMotionMock).toHaveBeenCalledWith("visibility-hidden");
    });

    fireEvent.click(stopButton);
    await waitFor(() => {
      expect(stopPtzMotionMock).toHaveBeenCalledWith("explicit-stop");
    });
  });

  it("zoom uses discrete click actions without sending motion commands", async () => {
    render(<HookHarness />);

    await waitFor(() => {
      expect(fetchPtzBootstrapMock).toHaveBeenCalledOnce();
    });

    fireEvent.click(screen.getByRole("button", { name: "Zoom In" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom Out" }));

    await waitFor(() => {
      expect(pulsePtzZoomMock).toHaveBeenCalledWith("in");
      expect(pulsePtzZoomMock).toHaveBeenCalledWith("out");
    });
    expect(startPtzMotionMock).not.toHaveBeenCalled();
  });

  it("renders ptz controls in live view sidebar", async () => {
    render(<App />);

    await waitFor(() => {
      expect(fetchPtzBootstrapMock).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByTestId("ptz-panel")).not.toBeNull();
    });

    expect(screen.getByText("PTZ Control")).not.toBeNull();
  });

  it("shows unsupported message when ptz is not supported", async () => {
    fetchPtzBootstrapMock.mockResolvedValue(
      createBootstrap({
        supportsPtzControl: false,
        supportsPtzPreset: false,
        hasVisibleStop: false,
        presets: [],
      }),
    );

    render(<App />);

    await waitFor(() => {
      expect(fetchPtzBootstrapMock).toHaveBeenCalled();
    });

    expect(screen.getByTestId("ptz-panel")).not.toBeNull();
    expect(screen.getByText("PTZ is not available for this camera profile.")).not.toBeNull();
  });
});

function HookHarness() {
  const controls = usePtzControls();

  return (
    <div>
      <button type="button" {...controls.getMotionButtonProps("up")}>
        Up
      </button>
      <button type="button" {...controls.getMotionButtonProps("left")}>
        Left
      </button>
      <button type="button" {...controls.getMotionButtonProps("right")}>
        Right
      </button>
      <button type="button" {...controls.getMotionButtonProps("down")}>
        Down
      </button>
      <button
        type="button"
        onClick={() => {
          void controls.stopMotion();
        }}
      >
        Stop Camera
      </button>
      <button
        type="button"
        onClick={() => {
          void controls.pulseZoom("in");
        }}
      >
        Zoom In
      </button>
      <button
        type="button"
        onClick={() => {
          void controls.pulseZoom("out");
        }}
      >
        Zoom Out
      </button>
      <button
        type="button"
        onClick={() => {
          void controls.recallPreset(2);
        }}
      >
        Recall Driveway
      </button>
      <p>{controls.statusText}</p>
      <p>{controls.activeDirection ?? "idle"}</p>
    </div>
  );
}

function createBootstrap(
  overrides: Partial<PtzBootstrap> = {},
): PtzBootstrap {
  return {
    supportsPtzControl: true,
    supportsPtzPreset: true,
    hasVisibleStop: true,
    stopDeadlineMs: 5000,
    zoomPulseMs: 250,
    presets: [
      {
        id: 2,
        name: "Driveway",
      },
    ],
    ...overrides,
  };
}

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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function installPointerCaptureMocks() {
  const captureState = new WeakMap<object, Set<number>>();

  Object.defineProperty(HTMLButtonElement.prototype, "setPointerCapture", {
    configurable: true,
    value(pointerId: number) {
      const activePointers = captureState.get(this) ?? new Set<number>();
      activePointers.add(pointerId);
      captureState.set(this, activePointers);
    },
  });

  Object.defineProperty(HTMLButtonElement.prototype, "releasePointerCapture", {
    configurable: true,
    value(pointerId: number) {
      captureState.get(this)?.delete(pointerId);
    },
  });

  Object.defineProperty(HTMLButtonElement.prototype, "hasPointerCapture", {
    configurable: true,
    value(pointerId: number) {
      return captureState.get(this)?.has(pointerId) ?? false;
    },
  });
}
