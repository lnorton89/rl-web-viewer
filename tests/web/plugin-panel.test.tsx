import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PluginSummary } from "../../src/types/plugins.js";
import type { YouTubeStreamingStatus } from "../../src/types/youtube-streaming.js";
import App from "../../web/src/App.js";
import { YoutubeStreamingPanel } from "../../web/src/components/YoutubeStreamingPanel.js";
import { useLiveView } from "../../web/src/hooks/use-live-view.js";
import { useYouTubeStreaming } from "../../web/src/hooks/use-youtube-streaming.js";
import {
  fetchPlugins,
  invokePluginAction,
} from "../../web/src/lib/plugin-api.js";
import {
  fetchYouTubeStreamingStatus,
  startYouTubeStreaming,
} from "../../web/src/lib/youtube-streaming-api.js";

vi.mock("../../web/src/hooks/use-live-view.js", () => ({
  useLiveView: vi.fn(),
}));

vi.mock("../../web/src/hooks/use-youtube-streaming.js", () => ({
  useYouTubeStreaming: vi.fn(),
}));

vi.mock("../../web/src/components/PtzPanel.js", () => ({
  PtzPanel: () => <div data-testid="ptz-panel" />,
}));

vi.mock("../../web/src/components/SettingsPanel.js", () => ({
  SettingsPanel: () => <div data-testid="settings-panel" />,
}));

vi.mock("../../web/src/lib/plugin-api.js", () => ({
  fetchPluginStatus: vi.fn(),
  fetchPlugins: vi.fn(),
  invokePluginAction: vi.fn(),
}));

vi.mock("../../web/src/lib/youtube-streaming-api.js", () => ({
  beginYouTubeAuth: vi.fn(),
  fetchYouTubeStreamingStatus: vi.fn(),
  refreshYouTubeAuth: vi.fn(),
  revokeYouTubeAuth: vi.fn(),
  setupYouTubeStreaming: vi.fn(),
  startYouTubeStreaming: vi.fn(),
  stopYouTubeStreaming: vi.fn(),
}));

const useLiveViewMock = vi.mocked(useLiveView);
const useYouTubeStreamingMock = vi.mocked(useYouTubeStreaming);
const fetchPluginsMock = vi.mocked(fetchPlugins);
const invokePluginActionMock = vi.mocked(invokePluginAction);
const fetchYouTubeStreamingStatusMock = vi.mocked(fetchYouTubeStreamingStatus);
const startYouTubeStreamingMock = vi.mocked(startYouTubeStreaming);

describe("plugin dashboard panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    useLiveViewMock.mockReturnValue(createLiveViewState());
    useYouTubeStreamingMock.mockReturnValue(createHookState());
    fetchPluginsMock.mockResolvedValue([createPlugin()]);
  });

  afterEach(() => {
    cleanup();
  });

  it("exposes plugin streaming navigation and renders the panel", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole("button", { name: /plugins/i }));

    expect(
      screen.getByRole("heading", { name: "Plugins & Streaming" }),
    ).not.toBeNull();
    expect(screen.getByRole("heading", { name: "YouTube Streaming" })).not.toBeNull();
  });

  it.each([
    {
      name: "configuration missing",
      status: createStatus({
        auth: { configured: false, connected: false, state: "missing-client" },
      }),
      expected: "OAuth client missing",
    },
    {
      name: "disconnected",
      status: createStatus({
        auth: { configured: true, connected: false, state: "disconnected" },
      }),
      expected: "Disconnected",
    },
    {
      name: "FFmpeg missing",
      status: createStatus({
        process: {
          state: "failed",
          pid: null,
          reason: "FFmpeg executable was not found.",
          diagnostics: ["Install FFmpeg or set FFMPEG_PATH."],
        },
      }),
      expected: "FFmpeg executable was not found.",
    },
    {
      name: "ready",
      status: createStatus({
        auth: { configured: true, connected: true, state: "connected" },
        broadcastLifecycle: "ready",
        streamHealth: "ready",
      }),
      expected: "Ready",
    },
    {
      name: "running",
      status: createStatus({
        auth: { configured: true, connected: true, state: "connected" },
        broadcastLifecycle: "live",
        streamHealth: "active",
        process: { state: "running", pid: 1234, reason: null, diagnostics: [] },
      }),
      expected: "Running",
    },
    {
      name: "failed",
      status: createStatus({
        process: {
          state: "failed",
          pid: null,
          reason: "YouTube rejected the transition.",
          diagnostics: [],
        },
      }),
      expected: "YouTube rejected the transition.",
    },
  ])("shows %s state", ({ status, expected }) => {
    useYouTubeStreamingMock.mockReturnValue(createHookState({ status }));

    render(<YoutubeStreamingPanel />);

    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });

  it("disables start until auth, setup, and runtime prerequisites are ready", () => {
    for (const status of [
      createStatus({
        auth: { configured: false, connected: false, state: "missing-client" },
      }),
      createStatus({
        auth: { configured: true, connected: false, state: "disconnected" },
      }),
      createStatus({
        auth: { configured: true, connected: true, state: "connected" },
        broadcastLifecycle: "not-created",
      }),
      createStatus({
        auth: { configured: true, connected: true, state: "connected" },
        broadcastLifecycle: "ready",
        process: {
          state: "failed",
          pid: null,
          reason: "FFmpeg executable was not found.",
          diagnostics: [],
        },
      }),
    ]) {
      useYouTubeStreamingMock.mockReturnValue(createHookState({ status }));
      const { unmount } = render(<YoutubeStreamingPanel />);
      expect(
        (screen.getByRole("button", { name: "Start Streaming" }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      unmount();
    }

    useYouTubeStreamingMock.mockReturnValue(
      createHookState({
        status: createStatus({
          auth: { configured: true, connected: true, state: "connected" },
          broadcastLifecycle: "ready",
          streamHealth: "ready",
        }),
      }),
    );

    render(<YoutubeStreamingPanel />);

    expect(
      (screen.getByRole("button", { name: "Start Streaming" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("renders only safe share metadata when a watch URL is available", () => {
    useYouTubeStreamingMock.mockReturnValue(
      createHookState({
        status: createStatus({
          title: "Driveway Camera",
          privacy: "unlisted",
          broadcastLifecycle: "live",
          streamHealth: "active",
          share: {
            available: true,
            watchUrl: "https://www.youtube.com/watch?v=abc123",
            label: "Driveway Camera",
          },
          process: { state: "running", pid: 12, reason: null, diagnostics: [] },
        }),
      }),
    );

    render(<YoutubeStreamingPanel />);

    expect(screen.getByText("Driveway Camera")).not.toBeNull();
    expect(screen.getAllByText("unlisted").length).toBeGreaterThan(0);
    expect(screen.getAllByText("live").length).toBeGreaterThan(0);
    expect(screen.getAllByText("active").length).toBeGreaterThan(0);
    expect(screen.getByText("https://www.youtube.com/watch?v=abc123")).not.toBeNull();
  });

  it("requires explicit confirmation before starting a public broadcast", async () => {
    const user = userEvent.setup();
    const start = vi.fn().mockResolvedValue(undefined);
    useYouTubeStreamingMock.mockReturnValue(
      createHookState({
        start,
        status: createStatus({
          auth: { configured: true, connected: true, state: "connected" },
          broadcastLifecycle: "ready",
          privacy: "public",
          streamHealth: "ready",
        }),
      }),
    );

    render(<YoutubeStreamingPanel />);

    await user.click(screen.getByRole("button", { name: "Start Streaming" }));
    expect(start).not.toHaveBeenCalled();
    await user.click(screen.getByLabelText("Confirm public broadcast"));
    await user.click(screen.getByRole("button", { name: "Start Streaming" }));

    expect(start).toHaveBeenCalledWith({ confirmPublic: true });
  });

  it("copies and opens the watch URL only", async () => {
    const user = userEvent.setup();
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });
    useYouTubeStreamingMock.mockReturnValue(
      createHookState({
        status: createStatus({
          share: {
            available: true,
            watchUrl: "https://www.youtube.com/watch?v=share-safe",
            label: "Front Door",
          },
        }),
      }),
    );

    render(<YoutubeStreamingPanel />);

    await user.click(screen.getByRole("button", { name: "Copy Watch URL" }));
    await user.click(screen.getByRole("button", { name: "Open Watch Page" }));

    expect(writeText).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=share-safe",
    );
    expect(open).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=share-safe",
      "_blank",
      "noopener,noreferrer",
    );
    open.mockRestore();
  });

  it("never renders token, ingestion, stream name, or camera credential material", () => {
    useYouTubeStreamingMock.mockReturnValue(
      createHookState({
        status: createStatus({
          title: "access_token refresh_token client_secret",
          share: {
            available: true,
            watchUrl: "https://www.youtube.com/watch?v=safe",
            label: "streamName camera admin password",
          },
          process: {
            state: "failed",
            pid: null,
            reason: "rtsp://admin:password@camera rtmps://ingest.example/live",
            diagnostics: ["rtmp://example/live streamName"],
          },
        }),
      }),
    );

    render(<YoutubeStreamingPanel />);

    expectSerializedDomToBeSafe();
  });
});

describe("plugin browser API clients", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses JSON headers, parses error payloads, and accepts AbortSignal", async () => {
    const actualPluginApi = await vi.importActual<
      typeof import("../../web/src/lib/plugin-api.js")
    >("../../web/src/lib/plugin-api.js");
    const abortController = new AbortController();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Plugin unavailable" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(actualPluginApi.fetchPlugins(abortController.signal)).rejects.toThrow(
      "Plugin unavailable",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plugins",
      expect.objectContaining({
        headers: { Accept: "application/json" },
        method: "GET",
        signal: abortController.signal,
      }),
    );

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    await actualPluginApi.invokePluginAction("youtube-streaming", "stream.start", {
      confirmPublic: true,
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/plugins/youtube-streaming/actions/stream.start",
      expect.objectContaining({
        body: JSON.stringify({ confirmPublic: true }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
  });

  it("wraps YouTube status and start helpers around safe plugin actions", async () => {
    const actualYouTubeApi = await vi.importActual<
      typeof import("../../web/src/lib/youtube-streaming-api.js")
    >("../../web/src/lib/youtube-streaming-api.js");
    invokePluginActionMock.mockResolvedValueOnce({
      accepted: true,
      actionId: "stream.status",
      ok: true,
      pluginId: "youtube-streaming",
      status: createPlugin().status,
      stream: createStatus(),
    });
    invokePluginActionMock.mockResolvedValueOnce({
      accepted: true,
      actionId: "stream.start",
      ok: true,
      pluginId: "youtube-streaming",
      status: createPlugin().status,
      stream: createStatus({ broadcastLifecycle: "live" }),
    });

    await expect(actualYouTubeApi.fetchYouTubeStreamingStatus()).resolves.toMatchObject({
      broadcastLifecycle: "not-created",
    });
    await expect(actualYouTubeApi.startYouTubeStreaming({ confirmPublic: true })).resolves.toMatchObject({
      broadcastLifecycle: "live",
    });
  });
});

describe("YouTube streaming hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchYouTubeStreamingStatusMock.mockResolvedValue(createStatus());
    startYouTubeStreamingMock.mockResolvedValue(createStatus({ broadcastLifecycle: "live" }));
  });

  afterEach(() => {
    cleanup();
  });

  it("fetches status, exposes safe command errors, and refreshes after actions", async () => {
    const actualHook = await vi.importActual<
      typeof import("../../web/src/hooks/use-youtube-streaming.js")
    >("../../web/src/hooks/use-youtube-streaming.js");
    function Harness() {
      const hook = actualHook.useYouTubeStreaming();
      return (
        <div>
          <p>{hook.status?.broadcastLifecycle ?? "loading"}</p>
          <p>{hook.error ?? ""}</p>
          <button type="button" onClick={() => void hook.start({ confirmPublic: true })}>
            Start
          </button>
        </div>
      );
    }

    const user = userEvent.setup();

    render(<Harness />);

    await screen.findByText("not-created");
    await user.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => {
      expect(fetchYouTubeStreamingStatusMock).toHaveBeenCalledTimes(2);
    });

    startYouTubeStreamingMock.mockRejectedValueOnce(new Error("Start rejected safely"));
    await user.click(screen.getByRole("button", { name: "Start" }));

    await screen.findByText("Start rejected safely");
  });
});

function expectSerializedDomToBeSafe() {
  const serialized = document.body.innerHTML;

  for (const unsafe of [
    "access_token",
    "refresh_token",
    "client_secret",
    "rtsp://",
    "rtmp://",
    "rtmps://",
    "streamName",
    "password",
    "admin:",
  ]) {
    expect(serialized).not.toContain(unsafe);
  }
}

function createHookState(overrides: Partial<ReturnType<typeof useYouTubeStreaming>> = {}) {
  return {
    authUrl: null,
    beginAuth: vi.fn(),
    error: null,
    isLoading: false,
    pendingAction: null,
    refresh: vi.fn(),
    refreshAuth: vi.fn(),
    revokeAuth: vi.fn(),
    setup: vi.fn(),
    start: vi.fn(),
    status: createStatus(),
    stop: vi.fn(),
    ...overrides,
  };
}

function createStatus(
  overrides: Partial<YouTubeStreamingStatus> & {
    auth?: Partial<YouTubeStreamingStatus["auth"]>;
    process?: Partial<YouTubeStreamingStatus["process"]>;
    share?: Partial<YouTubeStreamingStatus["share"]>;
  } = {},
): YouTubeStreamingStatus {
  return {
    auth: {
      authorizedScopes: [],
      configured: true,
      connected: true,
      expiresAt: null,
      hasRefreshToken: true,
      message: "YouTube account is connected.",
      state: "connected",
      updatedAt: "2026-04-27T00:00:00Z",
      ...overrides.auth,
    },
    broadcastLifecycle: overrides.broadcastLifecycle ?? "not-created",
    privacy: overrides.privacy ?? "unlisted",
    process: {
      diagnostics: [],
      pid: null,
      reason: null,
      state: "stopped",
      ...overrides.process,
    },
    share: {
      available: false,
      label: null,
      watchUrl: null,
      ...overrides.share,
    },
    streamHealth: overrides.streamHealth ?? "unknown",
    title: overrides.title ?? "Camera Live Stream",
    updatedAt: overrides.updatedAt ?? "2026-04-27T00:00:00Z",
  };
}

function createPlugin(overrides: Partial<PluginSummary> = {}): PluginSummary {
  return {
    actions: [],
    capabilities: ["configuration", "actions", "share-metadata"],
    config: [],
    description: "Stream the local camera feed to YouTube Live.",
    enabled: true,
    id: "youtube-streaming",
    label: "YouTube Streaming",
    share: {
      available: false,
      label: null,
      url: null,
    },
    status: {
      message: "YouTube streaming controls are available.",
      pluginId: "youtube-streaming",
      state: "enabled",
      updatedAt: "2026-04-27T00:00:00Z",
    },
    ...overrides,
  };
}

function createLiveViewState() {
  return {
    activePlayback: null,
    bindImageElement: vi.fn(),
    bindVideoElement: vi.fn(),
    currentModeId: null,
    fallbackOrder: [],
    modes: [],
    nextFallbackModeId: null,
    renderKind: "video" as const,
    retry: vi.fn(),
    selectMode: vi.fn(),
    state: { kind: "live" as const },
    videoElement: null,
  };
}
