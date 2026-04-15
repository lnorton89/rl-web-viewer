import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createServer } from "../../src/server/create-server.js";
import { ptzRoutes } from "../../src/server/routes/ptz.js";
import type { LiveViewBootstrap } from "../../src/types/live-view.js";
import type { PtzBootstrap, PtzService } from "../../src/types/ptz.js";

const apps: Array<{ close: () => Promise<unknown> }> = [];

describe("ptz routes", () => {
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("returns ptz bootstrap through the local browser-safe route", async () => {
    const service = createPtzService();
    const app = await createApp(service);

    const response = await app.inject({
      method: "GET",
      url: "/api/ptz",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<PtzBootstrap>()).toEqual(createBootstrap());
    expect(service.getBootstrap).toHaveBeenCalledOnce();
    expect(response.body).not.toContain("password");
    expect(response.body).not.toContain("token=");
  });

  it.each([
    {
      name: "motion direction payloads",
      url: "/api/ptz/motion/start",
      payload: { direction: "north" },
    },
    {
      name: "stop reason payloads",
      url: "/api/ptz/stop",
      payload: { reason: "panic" },
    },
    {
      name: "zoom direction payloads",
      url: "/api/ptz/zoom",
      payload: { direction: "closer" },
    },
  ])("rejects invalid $name", async ({ url, payload }) => {
    const service = createPtzService();
    const app = await createApp(service);

    const response = await app.inject({
      method: "POST",
      url,
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>().error).toBeTruthy();
  });

  it("rejects invalid preset ids", async () => {
    const service = createPtzService();
    const app = await createApp(service);

    const response = await app.inject({
      method: "POST",
      url: "/api/ptz/presets/not-a-number/recall",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: string }>()).toEqual({
      error: "Invalid input: expected number, received NaN",
    });
  });

  it.each([
    "/api/ptz/motion/start",
    "/api/ptz/stop",
    "/api/ptz/zoom",
  ])("returns unsupported control errors for %s", async (url) => {
    const service = createPtzService({
      bootstrap: createBootstrap({
        supportsPtzControl: false,
      }),
    });
    const app = await createApp(service);

    const response = await app.inject({
      method: "POST",
      url,
      payload:
        url === "/api/ptz/motion/start"
          ? { direction: "up" }
          : url === "/api/ptz/zoom"
            ? { direction: "in" }
            : {},
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "PTZ control is not available for this camera profile.",
    });
  });

  it("returns unsupported preset errors when presets are unavailable", async () => {
    const service = createPtzService({
      bootstrap: createBootstrap({
        supportsPtzPreset: false,
      }),
    });
    const app = await createApp(service);

    const response = await app.inject({
      method: "POST",
      url: "/api/ptz/presets/2/recall",
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "PTZ presets are not available for this camera profile.",
    });
  });

  it("mounts ptz routes through createServer and preserves /api/live-view", async () => {
    const staticRoot = await createStaticRoot();
    const service = createPtzService();
    const app = await createServer({
      staticRoot,
      liveView: {
        buildLiveViewBootstrap: async () => createLiveViewBootstrap(),
        fetchSnapshot: async () => ({
          body: new Uint8Array([1, 2, 3]),
          contentType: "image/jpeg",
        }),
        getMediaRelayHealth: () => ({
          relay: "ready",
          reason: null,
        }),
      },
      ptz: {
        createPtzService: () => service,
      },
    });
    apps.push(app);

    const [bootstrapResponse, motionResponse, stopResponse, zoomResponse, presetResponse] =
      await Promise.all([
        app.inject({
          method: "GET",
          url: "/api/ptz",
        }),
        app.inject({
          method: "POST",
          url: "/api/ptz/motion/start",
          payload: { direction: "left" },
        }),
        app.inject({
          method: "POST",
          url: "/api/ptz/stop",
          payload: {},
        }),
        app.inject({
          method: "POST",
          url: "/api/ptz/zoom",
          payload: { direction: "in" },
        }),
        app.inject({
          method: "POST",
          url: "/api/ptz/presets/2/recall",
        }),
      ]);
    const liveViewResponse = await app.inject({
      method: "GET",
      url: "/api/live-view",
    });

    expect(bootstrapResponse.statusCode).toBe(200);
    expect(bootstrapResponse.json<PtzBootstrap>()).toEqual(createBootstrap());

    expect(motionResponse.statusCode).toBe(202);
    expect(motionResponse.json()).toEqual({
      direction: "left",
      stopDeadlineMs: 5000,
    });
    expect(service.startMotion).toHaveBeenCalledWith("left");

    expect(stopResponse.statusCode).toBe(200);
    expect(stopResponse.json()).toEqual({
      stopped: true,
      reason: "explicit-stop",
    });
    expect(service.stopMotion).toHaveBeenCalledWith("explicit-stop");

    expect(zoomResponse.statusCode).toBe(202);
    expect(zoomResponse.json()).toEqual({
      direction: "in",
      pulseMs: 250,
    });
    expect(service.pulseZoom).toHaveBeenCalledWith("in");

    expect(presetResponse.statusCode).toBe(202);
    expect(presetResponse.json()).toEqual({
      presetId: 2,
    });
    expect(service.recallPreset).toHaveBeenCalledWith(2);

    expect(liveViewResponse.statusCode).toBe(200);
    expect(liveViewResponse.json<LiveViewBootstrap>()).toEqual(
      createLiveViewBootstrap(),
    );
  });
});

async function createApp(service: PtzService) {
  const app = Fastify();
  await app.register(ptzRoutes, {
    createPtzService: () => service,
  });
  apps.push(app);
  return app;
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

function createPtzService(input: { bootstrap?: PtzBootstrap } = {}): PtzService {
  const bootstrap = input.bootstrap ?? createBootstrap();

  return {
    getBootstrap: vi.fn(async () => bootstrap),
    startMotion: vi.fn(async (direction) => ({
      direction,
      stopDeadlineMs: bootstrap.stopDeadlineMs,
    })),
    stopMotion: vi.fn(async (reason) => ({
      stopped: true,
      reason,
    })),
    pulseZoom: vi.fn(async (direction) => ({
      direction,
      pulseMs: bootstrap.zoomPulseMs,
    })),
    recallPreset: vi.fn(async (presetId) => ({
      presetId,
    })),
  };
}

async function createStaticRoot(): Promise<string> {
  const staticRoot = await mkdtemp(path.join(os.tmpdir(), "reolink-static-"));
  const webDirectory = path.join(staticRoot, "web");

  await import("node:fs/promises").then(({ mkdir }) =>
    mkdir(webDirectory, { recursive: true }),
  );
  await writeFile(
    path.join(webDirectory, "index.html"),
    "<!doctype html><html><body><div id=\"app\"></div></body></html>",
    "utf8",
  );

  return staticRoot;
}

function createLiveViewBootstrap(): LiveViewBootstrap {
  return {
    preferredModeId: "webrtc:main",
    fallbackOrder: ["webrtc:main", "hls:sub", "snapshot:main"],
    modes: [
      {
        id: "webrtc:main",
        label: "WebRTC Main",
        quality: "main",
        transport: "webrtc",
        enabled: true,
        playback: {
          whepUrl: "http://127.0.0.1:8889/camera_main/whep",
          hlsUrl: null,
          snapshotUrl: "/api/live-view/snapshot/main",
        },
      },
      {
        id: "hls:sub",
        label: "HLS Sub",
        quality: "sub",
        transport: "hls",
        enabled: true,
        playback: {
          whepUrl: null,
          hlsUrl: "http://127.0.0.1:8888/camera_sub/index.m3u8",
          snapshotUrl: "/api/live-view/snapshot/sub",
        },
      },
      {
        id: "snapshot:main",
        label: "Snapshot Main",
        quality: "main",
        transport: "snapshot",
        enabled: true,
        playback: {
          whepUrl: null,
          hlsUrl: null,
          snapshotUrl: "/api/live-view/snapshot/main",
        },
      },
    ],
    diagnostics: {
      state: "connecting",
      currentModeId: "webrtc:main",
      nextFallbackModeId: "hls:sub",
      reason: null,
    },
  };
}
