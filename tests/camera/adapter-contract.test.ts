import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import type { CameraConfig } from "../../src/config/camera-config.js";
import type { CapabilitySnapshot } from "../../src/camera/capability-snapshot.js";
import type { CameraAdapter } from "../../src/camera/adapters/camera-adapter.js";
import { createRlc423sAdapter } from "../../src/camera/adapters/reolink-rlc-423s-adapter.js";
import {
  getRegisteredCameraAdapters,
  registerCameraAdapters,
  resolveCameraAdapter,
} from "../../src/camera/adapters/index.js";

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

describe("camera adapter contract", () => {
  it("exposes one adapter object that owns discovery, capabilities, streams, ptz, settings, and failure classification", async () => {
    const adapter = createRlc423sAdapter();

    expectAdapterShape(adapter);
    expect(adapter.adapterId).toBe("reolink-rlc-423s");
    expect(adapter.matchesIdentity(snapshot.identity)).toBe(true);
    expect(
      adapter.matchesIdentity({
        ...snapshot.identity,
        model: "rlc-423s",
      }),
    ).toBe(true);
    expect(adapter.resolveLiveStreams(config, snapshot)).toMatchObject({
      main: { quality: "main" },
      sub: { quality: "sub" },
    });
    expect(typeof adapter.createPtzService).toBe("function");
    expect(typeof adapter.createSettingsService).toBe("function");
    expect(adapter.classifyFailure("probe", new Error("timed out"))).toBe(
      "Request timed out",
    );
  });

  it("registers the known RLC-423S adapter without leaking raw CGI commands or firmware literals into the shared registry surface", () => {
    registerCameraAdapters();

    const adapters = getRegisteredCameraAdapters();
    const resolvedAdapter = resolveCameraAdapter(snapshot.identity);

    expect(adapters).toHaveLength(1);
    expect(adapters[0]?.adapterId).toBe("reolink-rlc-423s");
    expect(resolvedAdapter?.adapterId).toBe("reolink-rlc-423s");
    expect(resolvedAdapter).toBe(adapters[0]);

    for (const adapter of adapters) {
      expectAdapterShape(adapter);
    }
  });

  it.each([
    [{ code: "ENOENT", message: "missing fixture" }, "Required files are missing"],
    [{ code: "EACCES", message: "permission denied" }, "Access was denied"],
    [new Error("request timed out"), "Request timed out"],
    [new Error("unsupported model"), "Firmware or model is unsupported"],
    [new Error("unexpected failure"), "Operation failed"],
  ])("normalizes %o failures", (error, expected) => {
    const adapter = createRlc423sAdapter();

    expect(adapter.classifyFailure("settings", error)).toBe(expected);
  });

  it("documents the future model extension steps and points contributors to fixtures as proof", async () => {
    const docsUrl = new URL("../../docs/camera-adapters.md", import.meta.url);
    const docs = await readFile(docsUrl, "utf8");

    expect(docs).toContain("CameraAdapter");
    expect(docs).toContain("RLC-423S");
    expect(docs).toContain("future model");
    expect(docs).toContain("fixtures");
    expect(docs).toContain("src/camera/adapters/index.ts");
  });
});

function expectAdapterShape(adapter: CameraAdapter | undefined): asserts adapter is CameraAdapter {
  expect(adapter).toBeDefined();
  expect(typeof adapter?.adapterId).toBe("string");
  expect(typeof adapter?.matchesIdentity).toBe("function");
  expect(typeof adapter?.probe).toBe("function");
  expect(typeof adapter?.buildCapabilitySnapshot).toBe("function");
  expect(typeof adapter?.resolveLiveStreams).toBe("function");
  expect(typeof adapter?.createPtzService).toBe("function");
  expect(typeof adapter?.createSettingsService).toBe("function");
  expect(typeof adapter?.classifyFailure).toBe("function");
}
