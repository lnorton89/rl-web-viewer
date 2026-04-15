import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PtzBootstrap } from "../../src/types/ptz.js";
import { usePtzControls } from "../../web/src/hooks/use-ptz-controls.js";
import {
  fetchPtzBootstrap,
  pulsePtzZoom,
  recallPtzPreset,
  startPtzMotion,
  stopPtzMotion,
} from "../../web/src/lib/ptz-api.js";

vi.mock("../../web/src/lib/ptz-api.js", () => ({
  fetchPtzBootstrap: vi.fn(),
  startPtzMotion: vi.fn(),
  stopPtzMotion: vi.fn(),
  pulsePtzZoom: vi.fn(),
  recallPtzPreset: vi.fn(),
}));

const fetchPtzBootstrapMock = vi.mocked(fetchPtzBootstrap);
const startPtzMotionMock = vi.mocked(startPtzMotion);
const stopPtzMotionMock = vi.mocked(stopPtzMotion);
const pulsePtzZoomMock = vi.mocked(pulsePtzZoom);
const recallPtzPresetMock = vi.mocked(recallPtzPreset);

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
