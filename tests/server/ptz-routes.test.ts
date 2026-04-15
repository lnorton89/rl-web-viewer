import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ptzRoutes } from "../../src/server/routes/ptz.js";
import type { PtzBootstrap, PtzService } from "../../src/types/ptz.js";

describe("ptz routes", () => {
  const apps: Array<Awaited<ReturnType<typeof createApp>>> = [];

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
});

async function createApp(service: PtzService) {
  const app = Fastify();
  await app.register(ptzRoutes, {
    createPtzService: () => service,
  });
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
