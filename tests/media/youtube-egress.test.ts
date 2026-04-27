import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import {
  buildYouTubeFfmpegArgs,
  redactYouTubeEgressArgs,
} from "../../src/media/youtube-ffmpeg-config.js";
import { getFfmpegAvailability } from "../../src/media/youtube-runtime.js";
import { createYouTubeStreamService } from "../../src/media/youtube-stream-service.js";

const forbiddenFragments = [
  "rtsp://",
  "rtmps://",
  "rtmp://",
  "camera-password",
  "unit-test-stream-key",
  "admin:",
] as const;

describe("YouTube FFmpeg egress", () => {
  it("builds RTSP-to-RTMPS FLV args and redacts secret-bearing values", () => {
    const args = buildYouTubeFfmpegArgs({
      inputRtspUrl:
        "rtsp://admin:camera-password@192.168.1.140:554/h264Preview_01_main",
      ingestionUrl: "rtmps://a.rtmps.youtube.com/live2",
      streamName: "unit-test-stream-key",
    });

    expect(args).toContain("-rtsp_transport");
    expect(args).toContain("-i");
    expect(args).toContain("-f");
    expect(args).toContain("flv");
    expect(args.join(" ")).toContain("rtmps://a.rtmps.youtube.com/live2/unit-test-stream-key");

    const redacted = redactYouTubeEgressArgs(args).join(" ");
    expect(redacted).toContain("[REDACTED_RTSP_URL]");
    expect(redacted).toContain("[REDACTED_RTMP_URL]");
    expectSafe(redacted);
  });

  it("reports FFmpeg unavailable without throwing when the executable is missing", async () => {
    const availability = await getFfmpegAvailability({
      executablePath: "Z:/does-not-exist/ffmpeg.exe",
    });

    expect(availability.available).toBe(false);
    expect(availability.reason).toMatch(/ffmpeg/i);
    expectSafe(JSON.stringify(availability));
  });

  it("starts one fake process, reports idempotent start, and redacts diagnostics", async () => {
    const process = new FakeProcess(1234);
    const runner = {
      started: [] as Array<{ command: string; args: string[]; options: unknown }>,
      spawn(command: string, args: string[], options: unknown) {
        this.started.push({ command, args, options });
        queueMicrotask(() => process.emit("spawn"));
        return process;
      },
    };
    const service = createYouTubeStreamService({
      now: () => "2026-04-27T00:00:00.000Z",
      ffmpegAvailability: async () => ({
        available: true,
        executablePath: "C:/tools/ffmpeg.exe",
        reason: null,
      }),
      processRunner: runner,
      resolveCameraSource: async () =>
        "rtsp://admin:camera-password@192.168.1.140:554/h264Preview_01_main",
      oauth: createConnectedOAuth(),
      youtube: createActiveYouTubeApi(),
      loadStreamConfig: async () => createPersistedStreamConfig(),
      saveStreamConfig: async (config) => config,
    });

    const first = await service.start({});
    const second = await service.start({});
    process.stderr.emit("data", Buffer.from("rtsp://admin:camera-password@camera failed unit-test-stream-key"));

    expect(first.accepted).toBe(true);
    expect(second.status.process.state).toBe("running");
    expect(runner.started).toHaveLength(1);
    expect(runner.started[0]?.options).toMatchObject({ windowsHide: true });
    expectSafe(JSON.stringify(await service.getStatus()));
  });

  it("makes stop idempotent and completes applicable broadcasts", async () => {
    const process = new FakeProcess(1234);
    const transitions: string[] = [];
    const service = createYouTubeStreamService({
      now: () => "2026-04-27T00:00:00.000Z",
      ffmpegAvailability: async () => ({
        available: true,
        executablePath: "C:/tools/ffmpeg.exe",
        reason: null,
      }),
      processRunner: {
        spawn() {
          queueMicrotask(() => process.emit("spawn"));
          return process;
        },
      },
      resolveCameraSource: async () =>
        "rtsp://admin:camera-password@192.168.1.140:554/h264Preview_01_main",
      oauth: createConnectedOAuth(),
      youtube: createActiveYouTubeApi({
        transition: async ({ status }: { status: "testing" | "live" | "complete" }) => {
          transitions.push(status);
          return {
            broadcastId: "broadcast-123",
            title: "Driveway",
            privacy: "unlisted",
            lifecycle: status === "complete" ? "complete" : "live",
            watchUrl: "https://www.youtube.com/watch?v=broadcast-123",
          };
        },
      }),
      loadStreamConfig: async () => ({
        ...createPersistedStreamConfig(),
        lifecycle: "live",
      }),
      saveStreamConfig: async (config) => config,
    });

    await service.start({});
    const firstStop = await service.stop({ reason: "user" });
    const secondStop = await service.stop({ reason: "user" });

    expect(firstStop.accepted).toBe(true);
    expect(secondStop.status.process.state).toBe("stopped");
    expect(transitions).toContain("complete");
    expectSafe(JSON.stringify(firstStop));
    expectSafe(JSON.stringify(secondStop));
  });
});

class FakeProcess extends EventEmitter {
  readonly stderr = new EventEmitter();
  readonly stdout = new EventEmitter();
  killed = false;

  constructor(readonly pid: number) {
    super();
  }

  kill(): boolean {
    this.killed = true;
    queueMicrotask(() => this.emit("exit", 0, null));
    return true;
  }
}

function createConnectedOAuth() {
  return {
    getStatus: async () => ({
      configured: true,
      connected: true,
      state: "connected" as const,
      message: "connected",
      hasRefreshToken: true,
      authorizedScopes: ["https://www.googleapis.com/auth/youtube"],
      expiresAt: null,
      updatedAt: "2026-04-27T00:00:00.000Z",
    }),
  };
}

function createPersistedStreamConfig() {
  return {
    streamId: "stream-123",
    broadcastId: "broadcast-123",
    title: "Driveway",
    privacy: "unlisted" as const,
    lifecycle: "ready" as const,
    streamHealth: "ready" as const,
    watchUrl: "https://www.youtube.com/watch?v=broadcast-123",
  };
}

function createActiveYouTubeApi(overrides: Record<string, unknown> = {}) {
  return {
    setupBroadcast: async () => ({
      streamId: "stream-123",
      broadcastId: "broadcast-123",
      title: "Driveway",
      privacy: "unlisted" as const,
      lifecycle: "ready" as const,
      streamHealth: "ready" as const,
      watchUrl: "https://www.youtube.com/watch?v=broadcast-123",
    }),
    getStreamIngestion: async () => ({
      ingestionUrl: "rtmps://a.rtmps.youtube.com/live2",
      streamName: "unit-test-stream-key",
    }),
    getStreamStatus: async () => ({
      streamId: "stream-123",
      health: "active" as const,
    }),
    transition: async ({ status }: { status: "testing" | "live" | "complete" }) => ({
      broadcastId: "broadcast-123",
      title: "Driveway",
      privacy: "unlisted" as const,
      lifecycle: status === "complete" ? "complete" as const : "live" as const,
      watchUrl: "https://www.youtube.com/watch?v=broadcast-123",
    }),
    transitionWhenActive: async ({ status }: { status: "testing" | "live" }) => ({
      broadcastId: "broadcast-123",
      title: "Driveway",
      privacy: "unlisted" as const,
      lifecycle: status,
      watchUrl: "https://www.youtube.com/watch?v=broadcast-123",
    }),
    ...overrides,
  };
}

function expectSafe(serialized: string): void {
  for (const fragment of forbiddenFragments) {
    expect(serialized).not.toContain(fragment);
  }
}
