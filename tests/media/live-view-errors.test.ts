import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CapabilitySnapshot } from "../../src/camera/capability-snapshot.js";
import type { CameraConfig } from "../../src/config/camera-config.js";
import {
  buildLiveViewBootstrap,
  classifyLiveViewFailure,
} from "../../src/media/live-view-service.js";

describe("live-view bootstrap failures", () => {
  let workingDirectory: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    workingDirectory = await mkdtemp(path.join(os.tmpdir(), "reolink-live-view-"));
    process.chdir(workingDirectory);
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("classifies common live-view errors into short reasons", () => {
    expect(classifyLiveViewFailure(new Error("ENOENT: mediamtx.exe missing"))).toBe(
      "Required live-view files are missing",
    );
    expect(classifyLiveViewFailure(new Error("operation timed out"))).toBe(
      "Live view timed out",
    );
    expect(classifyLiveViewFailure(new Error("unsupported codec"))).toBe(
      "Camera firmware is not supported for live view",
    );
  });

  it("returns failed diagnostics and writes a sanitized artifact when no mode is supported", async () => {
    await writeConfig(createConfig());
    await writeCapabilitySnapshot(
      createSnapshot({
        supportsLiveView: false,
        supportsSnapshot: false,
      }),
    );

    const bootstrap = await buildLiveViewBootstrap("127.0.0.1:4000");
    const debugFiles = await readFileFromDebugDirectory(workingDirectory);

    expect(bootstrap.preferredModeId).toBeNull();
    expect(bootstrap.fallbackOrder).toEqual([]);
    expect(bootstrap.diagnostics.reason).toBe("No supported live-view mode is available");
    expect(debugFiles).toContain('"command": "live-view-bootstrap"');
    expect(debugFiles).toContain('"reason": "No supported live-view mode is available"');
  });

  it("hydrates enabled modes with browser-safe playback URLs", async () => {
    await writeConfig(createConfig());
    await writeCapabilitySnapshot(createSnapshot());

    const bootstrap = await buildLiveViewBootstrap("localhost:4000");
    const webrtcMain = bootstrap.modes.find((mode) => mode.id === "webrtc:main");
    const hlsSub = bootstrap.modes.find((mode) => mode.id === "hls:sub");
    const snapshotMain = bootstrap.modes.find((mode) => mode.id === "snapshot:main");

    expect(bootstrap.preferredModeId).toBe("webrtc:main");
    expect(webrtcMain?.playback.whepUrl).toBe(
      "http://localhost:8889/camera_main/whep",
    );
    expect(hlsSub?.playback.hlsUrl).toBe(
      "http://localhost:8888/camera_sub/index.m3u8",
    );
    expect(snapshotMain?.playback.snapshotUrl).toBe(
      "/api/live-view/snapshot/main",
    );
  });
});

async function writeConfig(config: CameraConfig): Promise<void> {
  const configPath = path.resolve(process.cwd(), ".local", "camera.config.json");
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

async function writeCapabilitySnapshot(snapshot: CapabilitySnapshot): Promise<void> {
  const snapshotPath = path.resolve(
    process.cwd(),
    ".local",
    "capabilities",
    "192-168-1-140-rlc-423s.json",
  );
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

function createConfig(): CameraConfig {
  return {
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
}

function createSnapshot(
  overrides: Partial<CapabilitySnapshot> = {},
): CapabilitySnapshot {
  return {
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
    ...overrides,
  };
}

async function readFileFromDebugDirectory(cwd: string): Promise<string> {
  const debugDirectory = path.resolve(cwd, ".local", "debug");
  const files = await readdir(debugDirectory);
  const artifact = await readFile(path.join(debugDirectory, files[0] ?? ""), "utf8");
  return artifact;
}
