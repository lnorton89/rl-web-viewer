import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  LiveMode,
  LiveModeId,
  LiveViewBootstrap,
} from "../../src/types/live-view.js";
import { useLiveView } from "../../web/src/hooks/use-live-view.js";
import { fetchLiveViewBootstrap } from "../../web/src/lib/live-view-api.js";
import { attachHlsPlayer } from "../../web/src/lib/players/hls-player.js";
import { attachSnapshotPlayer } from "../../web/src/lib/players/snapshot-player.js";
import { attachWebRtcPlayer } from "../../web/src/lib/players/webrtc-player.js";

vi.mock("../../web/src/lib/live-view-api.js", () => ({
  fetchLiveViewBootstrap: vi.fn(),
}));

vi.mock("../../web/src/lib/players/webrtc-player.js", () => ({
  attachWebRtcPlayer: vi.fn(),
}));

vi.mock("../../web/src/lib/players/hls-player.js", () => ({
  attachHlsPlayer: vi.fn(),
}));

vi.mock("../../web/src/lib/players/snapshot-player.js", () => ({
  attachSnapshotPlayer: vi.fn(),
}));

type MockAttachment = {
  destroy: () => void;
  destroyMock: ReturnType<typeof vi.fn>;
  element: Element;
  fail: (reason: string) => void;
  resolve: () => void;
  url: string;
};

const fetchLiveViewBootstrapMock = vi.mocked(fetchLiveViewBootstrap);
const attachWebRtcPlayerMock = vi.mocked(attachWebRtcPlayer);
const attachHlsPlayerMock = vi.mocked(attachHlsPlayer);
const attachSnapshotPlayerMock = vi.mocked(attachSnapshotPlayer);

const webrtcAttachments: MockAttachment[] = [];
const hlsAttachments: MockAttachment[] = [];
const snapshotAttachments: MockAttachment[] = [];

describe("useLiveView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    webrtcAttachments.length = 0;
    hlsAttachments.length = 0;
    snapshotAttachments.length = 0;

    attachWebRtcPlayerMock.mockImplementation((element, url, options = {}) =>
      createAttachment(webrtcAttachments, element, url, options.onError),
    );
    attachHlsPlayerMock.mockImplementation((element, url, options = {}) =>
      createAttachment(hlsAttachments, element, url, options.onError),
    );
    attachSnapshotPlayerMock.mockImplementation(
      (element, url, _refreshMs, options = {}) =>
        createAttachment(snapshotAttachments, element, url, options.onError),
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("auto-starts the preferred mode, binds the video element, and reaches Live", async () => {
    fetchLiveViewBootstrapMock.mockResolvedValue(
      createBootstrap({
        preferredModeId: "webrtc:main",
        fallbackOrder: ["webrtc:main", "hls:sub", "snapshot:main"],
        modes: [
          createMode("webrtc:main", { whepUrl: "/whep/main" }),
          createMode("hls:sub", { hlsUrl: "/hls/sub/index.m3u8" }),
          createMode("snapshot:main", { snapshotUrl: "/snap/main.jpg" }),
        ],
      }),
    );

    render(<LiveViewHarness />);

    expect(await screen.findByText("Connecting")).not.toBeNull();

    await waitFor(() => {
      expect(attachWebRtcPlayerMock).toHaveBeenCalledTimes(1);
    });

    expect(webrtcAttachments[0]?.element).toBe(screen.getByTestId("video"));
    expect(webrtcAttachments[0]?.url).toBe("/whep/main");
    expect(screen.getByTestId("current-mode").textContent).toBe("webrtc:main");
    expect(screen.getByTestId("next-fallback").textContent).toBe("hls:sub");

    await act(async () => {
      webrtcAttachments[0]?.resolve();
    });

    expect(await screen.findByText("Live")).not.toBeNull();
  });

  it("shows Reconnecting and falls back after exhausting retries on the active mode", async () => {
    vi.useFakeTimers();

    fetchLiveViewBootstrapMock.mockResolvedValue(
      createBootstrap({
        preferredModeId: "webrtc:main",
        fallbackOrder: ["webrtc:main", "hls:sub", "snapshot:main"],
        modes: [
          createMode("webrtc:main", { whepUrl: "/whep/main" }),
          createMode("hls:sub", { hlsUrl: "/hls/sub/index.m3u8" }),
          createMode("snapshot:main", { snapshotUrl: "/snap/main.jpg" }),
        ],
      }),
    );

    render(<LiveViewHarness />);

    await flushAsyncWork();
    expect(attachWebRtcPlayerMock).toHaveBeenCalledTimes(1);

    act(() => {
      webrtcAttachments[0]?.fail("WebRTC handshake timed out");
    });

    expect(screen.getByText("Reconnecting")).not.toBeNull();
    expect(screen.getByTestId("reason").textContent).toBe(
      "WebRTC handshake timed out",
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(attachWebRtcPlayerMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      webrtcAttachments[1]?.fail("WebRTC handshake timed out");
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(attachWebRtcPlayerMock).toHaveBeenCalledTimes(3);

    await act(async () => {
      webrtcAttachments[2]?.fail("WebRTC handshake timed out");
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(attachWebRtcPlayerMock).toHaveBeenCalledTimes(4);

    act(() => {
      webrtcAttachments[3]?.fail("WebRTC handshake timed out");
    });

    await flushAsyncWork();
    expect(attachHlsPlayerMock).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("current-mode").textContent).toBe("hls:sub");
    expect(screen.getByTestId("next-fallback").textContent).toBe("snapshot:main");
  });

  it("lands in Live View Failed after the fallback ladder is exhausted and retries the failed mode", async () => {
    vi.useFakeTimers();

    fetchLiveViewBootstrapMock.mockResolvedValue(
      createBootstrap({
        preferredModeId: "snapshot:main",
        fallbackOrder: ["snapshot:main"],
        modes: [createMode("snapshot:main", { snapshotUrl: "/snap/main.jpg" })],
      }),
    );

    render(<LiveViewHarness />);

    await flushAsyncWork();
    expect(attachSnapshotPlayerMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      snapshotAttachments[0]?.fail("Snapshot endpoint returned 503");
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(attachSnapshotPlayerMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      snapshotAttachments[1]?.fail("Snapshot endpoint returned 503");
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(attachSnapshotPlayerMock).toHaveBeenCalledTimes(3);

    await act(async () => {
      snapshotAttachments[2]?.fail("Snapshot endpoint returned 503");
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });
    expect(attachSnapshotPlayerMock).toHaveBeenCalledTimes(4);

    act(() => {
      snapshotAttachments[3]?.fail("Snapshot endpoint returned 503");
    });

    await flushAsyncWork();
    expect(screen.getByText("Live View Failed")).not.toBeNull();
    expect(screen.getByTestId("reason").textContent).toBe(
      "Snapshot endpoint returned 503",
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry Live View" }));

    await flushAsyncWork();
    expect(attachSnapshotPlayerMock).toHaveBeenCalledTimes(5);

    await act(async () => {
      snapshotAttachments[4]?.resolve();
    });

    await flushAsyncWork();
    expect(screen.getByText("Live")).not.toBeNull();
  });

  it("switches to the snapshot surface on manual selection and binds the image element", async () => {
    fetchLiveViewBootstrapMock.mockResolvedValue(
      createBootstrap({
        preferredModeId: "webrtc:main",
        fallbackOrder: ["webrtc:main", "snapshot:main"],
        modes: [
          createMode("webrtc:main", { whepUrl: "/whep/main" }),
          createMode("snapshot:main", { snapshotUrl: "/snap/main.jpg" }),
        ],
      }),
    );

    render(<LiveViewHarness />);

    await waitFor(() => {
      expect(attachWebRtcPlayerMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      webrtcAttachments[0]?.resolve();
    });

    fireEvent.click(screen.getByTestId("select-snapshot:main"));

    await waitFor(() => {
      expect(attachSnapshotPlayerMock).toHaveBeenCalledTimes(1);
    });

    expect(snapshotAttachments[0]?.element).toBe(screen.getByTestId("image"));
    expect(screen.getByTestId("render-kind").textContent).toBe("image");
    expect(screen.getByTestId("current-mode").textContent).toBe("snapshot:main");
  });
});

function LiveViewHarness() {
  const liveView = useLiveView();

  return (
    <div>
      <div aria-live="polite">{toViewerLabel(liveView.state.kind)}</div>
      <div data-testid="reason">{liveView.state.reason ?? ""}</div>
      <div data-testid="current-mode">{liveView.currentModeId ?? ""}</div>
      <div data-testid="next-fallback">{liveView.nextFallbackModeId ?? ""}</div>
      <div data-testid="render-kind">{liveView.renderKind}</div>

      {liveView.renderKind === "image" ? (
        <img
          alt="snapshot surface"
          data-testid="image"
          ref={liveView.bindImageElement}
        />
      ) : (
        <video data-testid="video" ref={liveView.bindVideoElement} />
      )}

      <button type="button" onClick={() => void liveView.retry()}>
        Retry Live View
      </button>

      {liveView.modes.map((mode) => (
        <button
          key={mode.id}
          data-testid={`select-${mode.id}`}
          type="button"
          onClick={() => void liveView.selectMode(mode.id)}
        >
          {mode.id}
        </button>
      ))}
    </div>
  );
}

function createAttachment(
  store: MockAttachment[],
  element: Element,
  url: string,
  onError?: (reason: string) => void,
) {
  let resolveReady!: () => void;
  let rejectReady!: (error: Error) => void;

  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const destroyMock = vi.fn();

  const attachment: MockAttachment = {
    destroy: () => {
      destroyMock();
    },
    destroyMock,
    element,
    fail(reason: string) {
      onError?.(reason);
      rejectReady(new Error(reason));
    },
    resolve() {
      resolveReady();
    },
    url,
  };

  store.push(attachment);

  return {
    destroy: attachment.destroy,
    ready,
  };
}

function createBootstrap(overrides: Partial<LiveViewBootstrap>): LiveViewBootstrap {
  return {
    diagnostics: {
      currentModeId: overrides.preferredModeId ?? null,
      nextFallbackModeId: null,
      reason: null,
      state: "connecting",
    },
    fallbackOrder: [],
    modes: [],
    preferredModeId: null,
    ...overrides,
  };
}

function createMode(
  modeId: LiveModeId,
  playback: Partial<LiveMode["playback"]> = {},
): LiveMode {
  const transport = modeId.split(":")[0] as LiveMode["transport"];
  const quality = modeId.split(":")[1] as LiveMode["quality"];

  return {
    disabledReason: undefined,
    enabled: true,
    id: modeId,
    label: modeId,
    playback: {
      hlsUrl: null,
      snapshotUrl: null,
      whepUrl: null,
      ...playback,
    },
    quality,
    transport,
  };
}

function toViewerLabel(kind: "connecting" | "live" | "reconnecting" | "failed") {
  switch (kind) {
    case "connecting":
      return "Connecting";
    case "live":
      return "Live";
    case "reconnecting":
      return "Reconnecting";
    case "failed":
      return "Live View Failed";
  }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
  });
}
