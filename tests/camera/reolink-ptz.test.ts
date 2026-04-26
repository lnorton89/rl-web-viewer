import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

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
  supportsAudio: true,
};

describe("reolink ptz service", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds bootstrap defaults and preset normalization from enabled fixture slots", async () => {
    const presetFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("get-ptz-preset.json");
    const requestJson = createSessionRequestMock().mockResolvedValue(
      presetFixture.response,
    );
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
    const requestJson = createSessionRequestMock().mockResolvedValue([
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
    const requestJson = createSessionRequestMock();
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
    const requestJson = createSessionRequestMock().mockResolvedValue([
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

  it("starts motion with exactly one PTZ command per call", async () => {
    const ptzFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("ptz-ctrl.json");
    const requestJson = createSessionRequestMock().mockResolvedValue(
      ptzFixture.response,
    );
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.startMotion("left");

    expect(result).toEqual({
      direction: "left",
      stopDeadlineMs: 5000,
    });
    expect(requestJson).toHaveBeenCalledTimes(1);
    expect(requestJson).toHaveBeenCalledWith([
      {
        cmd: "PtzCtrl",
        action: 0,
        param: {
          channel: 0,
          op: "Left",
          speed: 25,
        },
      },
    ]);
  });

  it("treats explicit stop as idempotent stop when no motion is active", async () => {
    const requestJson = createSessionRequestMock();
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.stopMotion("explicit-stop");

    expect(result).toEqual({
      stopped: false,
      reason: "explicit-stop",
    });
    expect(requestJson).not.toHaveBeenCalled();
  });

  it("auto-stops motion when the watchdog timer expires", async () => {
    vi.useFakeTimers();

    const ptzFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("ptz-ctrl.json");
    const requestJson = createSessionRequestMock().mockResolvedValue(
      ptzFixture.response,
    );
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    await service.startMotion("up");
    await vi.advanceTimersByTimeAsync(5000);

    expect(requestJson).toHaveBeenCalledTimes(2);
    expect(requestJson.mock.calls[1]?.[0]).toEqual([
      {
        cmd: "PtzCtrl",
        action: 0,
        param: {
          channel: 0,
          op: "Stop",
        },
      },
    ]);
  });

  it("pulses zoom in with a bounded stop and keeps the zoom mapping adapter-owned", async () => {
    vi.useFakeTimers();

    const ptzFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("ptz-ctrl.json");
    const requestJson = createSessionRequestMock().mockResolvedValue(
      ptzFixture.response,
    );
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const promise = service.pulseZoom("in");
    await flushPromises();

    expect(requestJson).toHaveBeenCalledTimes(1);
    expect(requestJson.mock.calls[0]?.[0]).toEqual([
      {
        cmd: "PtzCtrl",
        action: 0,
        param: {
          channel: 0,
          op: "ZoomInc",
          speed: 25,
        },
      },
    ]);

    await vi.advanceTimersByTimeAsync(250);

    await expect(promise).resolves.toEqual({
      direction: "in",
      pulseMs: 250,
    });
    expect(requestJson.mock.calls[1]?.[0]).toEqual([
      {
        cmd: "PtzCtrl",
        action: 0,
        param: {
          channel: 0,
          op: "Stop",
        },
      },
    ]);
  });

  it("maps zoom out to the opposite camera operation", async () => {
    vi.useFakeTimers();

    const ptzFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("ptz-ctrl.json");
    const requestJson = createSessionRequestMock().mockResolvedValue(
      ptzFixture.response,
    );
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const promise = service.pulseZoom("out");
    await flushPromises();

    expect(requestJson).toHaveBeenCalledTimes(1);
    expect(requestJson.mock.calls[0]?.[0]).toEqual([
      {
        cmd: "PtzCtrl",
        action: 0,
        param: {
          channel: 0,
          op: "ZoomDec",
          speed: 25,
        },
      },
    ]);

    await vi.advanceTimersByTimeAsync(250);
    await promise;
  });

  it("recalls presets with ToPos using the preset id", async () => {
    const presetFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("get-ptz-preset.json");
    const ptzFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("ptz-ctrl.json");
    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce(presetFixture.response)
      .mockResolvedValueOnce(ptzFixture.response);
    const service = createReolinkPtzService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.recallPreset(5);

    expect(result).toEqual({
      presetId: 5,
    });
    expect(requestJson.mock.calls[1]?.[0]).toEqual([
      {
        cmd: "PtzCtrl",
        action: 0,
        param: {
          channel: 0,
          op: "ToPos",
          id: 5,
          speed: 60,
        },
      },
    ]);
  });

  it("writes a debug artifact when preset recall sees a rejected PTZ response", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-ptz-debug-"));
    const presetFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("get-ptz-preset.json");
    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce(presetFixture.response)
      .mockResolvedValueOnce([
        {
          cmd: "PtzCtrl",
          code: 1,
          error: {
            detail: "preset denied",
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

    await expect(service.recallPreset(1)).rejects.toThrow("PTZ command failed");

    const files = await readDirectory(directory);
    expect(files).toHaveLength(1);
    expect(await readFile(path.join(directory, files[0]!), "utf8")).toContain(
      '"command": "PtzCtrl"',
    );
  });
});

type SessionRequest = <TResponse extends readonly ReolinkApiResponse[]>(
  commands: readonly ReolinkRequest[],
) => Promise<TResponse>;

type SessionRequestMock = ReturnType<
  typeof vi.fn<
    (commands: readonly ReolinkRequest[]) => Promise<readonly ReolinkApiResponse[]>
  >
> &
  SessionRequest;

function createSessionRequestMock(): SessionRequestMock {
  return vi.fn<
    (commands: readonly ReolinkRequest[]) => Promise<readonly ReolinkApiResponse[]>
  >() as SessionRequestMock;
}

async function loadFixture<T>(name: string): Promise<T> {
  const fileUrl = new URL(`../fixtures/reolink/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw) as T;
}

async function readDirectory(directory: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  return readdir(directory);
}

async function flushPromises(iterations = 10): Promise<void> {
  for (let index = 0; index < iterations; index += 1) {
    await Promise.resolve();
  }
}
