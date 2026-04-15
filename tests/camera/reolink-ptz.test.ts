import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { createReolinkPtzService } from "../../src/camera/reolink-ptz.js";
import type { CapabilitySnapshot } from "../../src/camera/capability-snapshot.js";
import type { CameraConfig } from "../../src/config/camera-config.js";
import type { ReolinkApiResponse, ReolinkRequest } from "../../src/types/reolink.js";

type Fixture<TRequest, TResponse> = {
  request: TRequest;
  response: TResponse;
};

const config: CameraConfig = {
  baseUrl: "http://192.168.1.140",
  username: "admin",
  password: "",
  modelHint: "RLC-423S",
  notes: "",
  debugCapture: false,
  snapshot: {
    model: "RLC-423S",
    hardVer: "IPC_3816M",
    firmVer: "v2.0.0.1055_17110905_v1.0.0.30",
  },
};

const snapshot: CapabilitySnapshot = {
  identity: {
    model: "RLC-423S",
    hardVer: "IPC_3816M",
    firmVer: "v2.0.0.1055_17110905_v1.0.0.30",
  },
  ports: {
    http: 80,
    https: 443,
    media: 9000,
    onvif: 8000,
    rtsp: 554,
  },
  supportsLiveView: true,
  supportsPtzControl: true,
  supportsPtzPreset: true,
  supportsPtzPatrol: true,
  supportsSnapshot: true,
  supportsConfigRead: true,
};

describe("reolink ptz service", () => {
  it("builds bootstrap defaults and preset normalization from enabled fixture slots", async () => {
    const presetFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("get-ptz-preset.json");
    const requestJson = vi
      .fn<SessionRequest>()
      .mockResolvedValue(presetFixture.response);
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const bootstrap = await service.getBootstrap();

    expect(bootstrap).toEqual({
      supportsPtzControl: true,
      supportsPtzPreset: true,
      hasVisibleStop: true,
      stopDeadlineMs: 5000,
      zoomPulseMs: 250,
      presets: [
        { id: 1, name: "Home" },
        { id: 5, name: "Loading Dock" },
      ],
    });
    expect(requestJson).toHaveBeenCalledTimes(1);
    expect(requestJson).toHaveBeenCalledWith(presetFixture.request);
  });

  it("returns an empty preset list when preset normalization sees no enabled entries", async () => {
    const requestJson = vi.fn<SessionRequest>().mockResolvedValue([
      {
        cmd: "GetPtzPreset",
        code: 0,
        value: {
          PtzPreset: [
            { id: 2, name: "Disabled", enable: 0 },
            { id: 7, name: "", enable: false },
          ],
        },
      },
    ]);
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const bootstrap = await service.getBootstrap();

    expect(bootstrap.presets).toEqual([]);
    expect(bootstrap.supportsPtzPreset).toBe(true);
    expect(requestJson).toHaveBeenCalledTimes(1);
  });

  it("returns no presets when supportsPtzPreset is false", async () => {
    const requestJson = vi.fn<SessionRequest>();
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => ({
        ...snapshot,
        supportsPtzPreset: false,
      }),
    });

    const bootstrap = await service.getBootstrap();

    expect(bootstrap.supportsPtzPreset).toBe(false);
    expect(bootstrap.presets).toEqual([]);
    expect(requestJson).not.toHaveBeenCalled();
  });

  it("writes a debug artifact when preset normalization sees a malformed payload", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-ptz-debug-"));
    const requestJson = vi.fn<SessionRequest>().mockResolvedValue([
      {
        cmd: "GetPtzPreset",
        code: 0,
        value: {
          PtzPreset: {
            id: 1,
          },
        },
      },
    ]);
    const service = createReolinkPtzService({
      config: {
        ...config,
        debugCapture: true,
      },
      session: { requestJson },
      loadSnapshot: async () => snapshot,
      debugArtifactDirectory: directory,
    });

    const bootstrap = await service.getBootstrap();
    const files = await readDirectory(directory);

    expect(bootstrap.presets).toEqual([]);
    expect(files).toHaveLength(1);
    expect(await readFile(path.join(directory, files[0]!), "utf8")).toContain(
      '"command": "GetPtzPreset"',
    );
  });
});

type SessionRequest = <TResponse extends readonly ReolinkApiResponse[]>(
  commands: readonly ReolinkRequest[],
) => Promise<TResponse>;

async function loadFixture<T>(name: string): Promise<T> {
  const fileUrl = new URL(`../fixtures/reolink/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw) as T;
}

async function readDirectory(directory: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  return readdir(directory);
}
