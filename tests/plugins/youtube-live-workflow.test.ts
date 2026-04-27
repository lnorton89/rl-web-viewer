import { mkdtemp } from "node:fs/promises";
import { EventEmitter } from "node:events";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { savePluginConfig } from "../../src/config/plugin-config.js";
import {
  saveYouTubeConfig,
  saveYouTubeTokens,
} from "../../src/config/youtube-config.js";
import { createPluginRuntime } from "../../src/plugins/plugin-registry.js";
import { createYouTubeLiveApi } from "../../src/plugins/youtube/youtube-live-api.js";
import type { PluginActionResult, PluginSummary } from "../../src/types/plugins.js";

const forbiddenFragments = [
  "access_token",
  "refresh_token",
  "client_secret",
  "rtsp://",
  "rtmp://",
  "rtmps://",
  "unit-test-stream-key",
  "camera-password",
  "streamName",
] as const;

describe("YouTube Live workflow", () => {
  it("creates a live stream, broadcast, binding, and persists only safe metadata", async () => {
    const calls: string[] = [];
    const api = createYouTubeLiveApi({
      youtubeClient: createFakeYouTubeClient(calls),
    });

    const setup = await api.setupBroadcast({
      title: "Driveway Camera",
      privacy: "unlisted",
    });

    expect(calls).toEqual([
      "liveStreams.insert",
      "liveBroadcasts.insert",
      "liveBroadcasts.bind",
    ]);
    expect(setup.streamId).toBe("stream-123");
    expect(setup.broadcastId).toBe("broadcast-123");
    expect(setup.watchUrl).toBe("https://www.youtube.com/watch?v=broadcast-123");
    expectSafe(JSON.stringify(setup));
  });

  it("normalizes premature transition when stream input is not active", async () => {
    const api = createYouTubeLiveApi({
      youtubeClient: createFakeYouTubeClient([], {
        streamStatus: "inactive",
      }),
    });

    await expect(
      api.transitionWhenActive({
        broadcastId: "broadcast-123",
        streamId: "stream-123",
        status: "live",
      }),
    ).rejects.toMatchObject({
      code: "stream-inactive",
      safeMessage: "YouTube has not detected active stream input yet.",
    });
  });

  it("setup action creates safe share metadata through plugin runtime", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-youtube-live-"));
    const configPath = path.join(directory, "plugin.config.json");
    await savePluginConfig(
      {
        plugins: {
          "youtube-streaming": {
            enabled: true,
            values: {
              title: "Driveway Camera",
              privacy: "unlisted",
            },
          },
        },
      },
      configPath,
    );
    await saveYouTubeConfig(createDesktopClientJson(), path.join(directory, "client.json"));
    await saveYouTubeTokens(
      {
        access_token: "ya29.unit-test-access-token",
        refresh_token: "unit-test-refresh-token",
      },
      path.join(directory, "tokens.json"),
    );
    const runtime = createPluginRuntime({
      configPath,
      now: () => "2026-04-27T00:00:00.000Z",
      youtube: {
        configPath: path.join(directory, "client.json"),
        tokensPath: path.join(directory, "tokens.json"),
        liveApiFactory: () =>
          createYouTubeLiveApi({
            youtubeClient: createFakeYouTubeClient([]),
          }),
      },
    });

    const result = await runtime.invokeAction("youtube-streaming", "stream.setup", {});
    const summary = (await runtime.listPlugins())[0] as PluginSummary;

    expect(result.accepted).toBe(true);
    expect(summary.share.available).toBe(true);
    expect(summary.share.url).toBe("https://www.youtube.com/watch?v=broadcast-123");
    expectSafe(JSON.stringify(result));
    expectSafe(JSON.stringify(summary));
  });

  it("start returns safe unavailable statuses for missing prerequisites", async () => {
    const runtime = createPluginRuntime({
      now: () => "2026-04-27T00:00:00.000Z",
      youtube: {
        ffmpegAvailability: async () => ({
          available: false,
          executablePath: null,
          reason: "Install FFmpeg and ensure ffmpeg is on PATH.",
        }),
      },
    });

    const result = (await runtime.invokeAction(
      "youtube-streaming",
      "stream.start",
      {},
    )) as PluginActionResult & { stream?: unknown };

    expect(result.accepted).toBe(false);
    expect(JSON.stringify(result.stream)).toMatch(/ffmpeg/i);
    expectSafe(JSON.stringify(result));
  });

  it("start, repeated start, stop, and repeated stop are idempotent and safe", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-youtube-run-"));
    const configPath = path.join(directory, "plugin.config.json");
    await savePluginConfig(
      {
        plugins: {
          "youtube-streaming": {
            enabled: true,
            values: {
              title: "Driveway Camera",
              privacy: "unlisted",
              streamId: "stream-123",
              broadcastId: "broadcast-123",
              watchUrl: "https://www.youtube.com/watch?v=broadcast-123",
            },
          },
        },
      },
      configPath,
    );
    await saveYouTubeConfig(createDesktopClientJson(), path.join(directory, "client.json"));
    await saveYouTubeTokens(
      {
        access_token: "ya29.unit-test-access-token",
        refresh_token: "unit-test-refresh-token",
      },
      path.join(directory, "tokens.json"),
    );
    const runtime = createPluginRuntime({
      configPath,
      now: () => "2026-04-27T00:00:00.000Z",
      youtube: {
        configPath: path.join(directory, "client.json"),
        tokensPath: path.join(directory, "tokens.json"),
        ffmpegAvailability: async () => ({
          available: true,
          executablePath: "C:/tools/ffmpeg.exe",
          reason: null,
        }),
        resolveCameraSource: async () =>
          "rtsp://admin:camera-password@192.168.1.140:554/h264Preview_01_main",
        liveApiFactory: () =>
          createYouTubeLiveApi({
            youtubeClient: createFakeYouTubeClient([], {
              streamStatus: "active",
            }),
          }),
        processRunner: {
          spawn: () => ({
            pid: 321,
            killed: false,
            stdout: new EventEmitter(),
            stderr: new EventEmitter(),
            once(_event: string, handler: () => void) {
              queueMicrotask(handler);
              return this;
            },
            kill() {
              this.killed = true;
              return true;
            },
          }),
        },
      },
    });

    const firstStart = await runtime.invokeAction("youtube-streaming", "stream.start", {});
    const secondStart = await runtime.invokeAction("youtube-streaming", "stream.start", {});
    const firstStop = await runtime.invokeAction("youtube-streaming", "stream.stop", {});
    const secondStop = await runtime.invokeAction("youtube-streaming", "stream.stop", {});

    expect(firstStart.accepted).toBe(true);
    expect(secondStart.accepted).toBe(true);
    expect(firstStop.accepted).toBe(true);
    expect(secondStop.accepted).toBe(true);
    expectSafe(JSON.stringify({ firstStart, secondStart, firstStop, secondStop }));
  });
});

function createDesktopClientJson(): Record<string, unknown> {
  return {
    installed: {
      client_id: "unit-test-client-id.apps.googleusercontent.com",
      client_secret: "unit-test-client-secret",
      redirect_uris: ["http://127.0.0.1:4000/oauth2callback"],
    },
  };
}

function createFakeYouTubeClient(
  calls: string[],
  options: { streamStatus?: string } = {},
) {
  return {
    liveStreams: {
      insert: async () => {
        calls.push("liveStreams.insert");
        return {
          data: {
            id: "stream-123",
            snippet: { title: "Driveway Camera" },
            status: { streamStatus: options.streamStatus ?? "ready" },
            cdn: {
              ingestionInfo: {
                rtmpsIngestionAddress: "rtmps://a.rtmps.youtube.com/live2",
                ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
                streamName: "unit-test-stream-key",
              },
            },
          },
        };
      },
      list: async () => {
        calls.push("liveStreams.list");
        return {
          data: {
            items: [
              {
                id: "stream-123",
                status: { streamStatus: options.streamStatus ?? "ready" },
                cdn: {
                  ingestionInfo: {
                    rtmpsIngestionAddress: "rtmps://a.rtmps.youtube.com/live2",
                    streamName: "unit-test-stream-key",
                  },
                },
              },
            ],
          },
        };
      },
    },
    liveBroadcasts: {
      insert: async () => {
        calls.push("liveBroadcasts.insert");
        return {
          data: {
            id: "broadcast-123",
            snippet: { title: "Driveway Camera" },
            status: { privacyStatus: "unlisted", lifeCycleStatus: "created" },
          },
        };
      },
      bind: async () => {
        calls.push("liveBroadcasts.bind");
        return {
          data: {
            id: "broadcast-123",
            snippet: { title: "Driveway Camera" },
            status: { privacyStatus: "unlisted", lifeCycleStatus: "ready" },
          },
        };
      },
      transition: async ({ broadcastStatus }: { broadcastStatus: string }) => {
        calls.push(`liveBroadcasts.transition:${broadcastStatus}`);
        return {
          data: {
            id: "broadcast-123",
            snippet: { title: "Driveway Camera" },
            status: {
              privacyStatus: "unlisted",
              lifeCycleStatus: broadcastStatus,
            },
          },
        };
      },
      list: async () => ({
        data: {
          items: [
            {
              id: "broadcast-123",
              snippet: { title: "Driveway Camera" },
              status: { privacyStatus: "unlisted", lifeCycleStatus: "ready" },
            },
          ],
        },
      }),
    },
  };
}

function expectSafe(serialized: string): void {
  for (const fragment of forbiddenFragments) {
    expect(serialized).not.toContain(fragment);
  }
}
