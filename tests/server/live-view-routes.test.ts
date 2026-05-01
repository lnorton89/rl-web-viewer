import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { LiveViewBootstrap } from "../../src/types/live-view.js";
import { createServer } from "../../src/server/create-server.js";

describe("live-view routes", () => {
  let staticRoot: string;

  beforeEach(async () => {
    staticRoot = await mkdtemp(path.join(os.tmpdir(), "reolink-static-"));
    await mkdirIndex(staticRoot);
  });

  afterEach(async () => {
    // Fastify closes its own temp handles in each test; no extra cleanup required.
  });

  it("returns preferredModeId, fallbackOrder, modes, and browser-safe playback fields", async () => {
    const app = await createServer({
      staticRoot,
      liveView: {
        buildLiveViewBootstrap: async () => createBootstrap(),
        fetchSnapshot: async () => ({
          body: new Uint8Array([1, 2, 3]),
          contentType: "image/jpeg",
        }),
        getMediaRelayHealth: () => ({
          relay: "ready",
          reason: null,
        }),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/live-view",
    });
    const payload = response.json<LiveViewBootstrap>();
    const serialized = response.body;

    expect(response.statusCode).toBe(200);
    expect(payload.preferredModeId).toBe("webrtc:main");
    expect(payload.fallbackOrder).toEqual([
      "webrtc:main",
      "webrtc:sub",
      "hls:sub",
      "snapshot:main",
    ]);
    expect(payload.modes[0]?.playback.whepUrl).toBe(
      "http://127.0.0.1:8889/camera_main/whep",
    );
    expect(payload.modes[1]?.playback.hlsUrl).toBe(
      "http://127.0.0.1:8888/camera_sub/index.m3u8",
    );
    expect(payload.modes[2]?.playback.snapshotUrl).toBe(
      "/api/live-view/snapshot/main",
    );
    expect(serialized).not.toContain("token=");
    expect(serialized).not.toContain("rtsp://");
    expect(serialized).not.toContain("secret-password");

    await app.close();
  });

  it("rejects invalid snapshot quality values", async () => {
    const app = await createServer({
      staticRoot,
      liveView: {
        buildLiveViewBootstrap: async () => createBootstrap(),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/live-view/snapshot/invalid",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "quality must be main or sub",
    });

    await app.close();
  });

  it("returns relay health reasons for playback troubleshooting", async () => {
    const app = await createServer({
      staticRoot,
      liveView: {
        buildLiveViewBootstrap: async () => createBootstrap(),
        getMediaRelayHealth: () => ({
          relay: "failed",
          reason: "Camera authentication failed. Update the camera password in settings.",
        }),
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/live-view/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      relay: "failed",
      reason: "Camera authentication failed. Update the camera password in settings.",
    });

    await app.close();
  });
});

async function mkdirIndex(staticRoot: string): Promise<void> {
  const webDirectory = path.join(staticRoot, "web");
  await import("node:fs/promises").then(({ mkdir }) =>
    mkdir(webDirectory, { recursive: true }),
  );
  await writeFile(
    path.join(webDirectory, "index.html"),
    "<!doctype html><html><body><div id=\"app\"></div></body></html>",
    "utf8",
  );
}

function createBootstrap(): LiveViewBootstrap {
  return {
    preferredModeId: "webrtc:main",
    fallbackOrder: ["webrtc:main", "webrtc:sub", "hls:sub", "snapshot:main"],
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
      nextFallbackModeId: "webrtc:sub",
      reason: null,
    },
  };
}
