import path from "node:path";

import { describe, expect, it } from "vitest";

import type { CapabilitySnapshot } from "../../src/camera/capability-snapshot.js";
import type { CameraConfig } from "../../src/config/camera-config.js";
import { resolveReolinkLiveStreams } from "../../src/camera/reolink-live-streams.js";
import {
  MEDIAMTX_MAIN_PATH,
  MEDIAMTX_SUB_PATH,
  buildMediaMtxConfig,
  buildMediaMtxSourceMap,
} from "../../src/media/mediamtx-config.js";
import {
  MEDIAMTX_RELEASE_ZIP,
  defaultMediaMtxExecutablePath,
  defaultMediaMtxRuntimeDirectory,
} from "../../src/media/mediamtx-runtime.js";

describe("MediaMTX runtime and config", () => {
  it("pins the runtime under the expected local tools directory", () => {
    const runtimeDirectory = defaultMediaMtxRuntimeDirectory();
    const executablePath = defaultMediaMtxExecutablePath();

    expect(runtimeDirectory).toContain(path.join(".local", "tools"));
    expect(runtimeDirectory).toContain("mediamtx-v1.17.1");
    expect(executablePath).toBe(path.join(runtimeDirectory, "mediamtx.exe"));
  });

  it("keeps the official release zip name pinned", () => {
    expect(MEDIAMTX_RELEASE_ZIP).toBe("mediamtx_v1.17.1_windows_amd64.zip");
  });

  it("generates camera_main and camera_sub relay config from adapter-resolved sources", () => {
    const streams = resolveReolinkLiveStreams(createConfig(), createSnapshot());
    const yaml = buildMediaMtxConfig(buildMediaMtxSourceMap(streams));

    expect(streams.main.rtspPath).toBe("h264Preview_01_main");
    expect(streams.sub.rtspPath).toBe("h264Preview_01_sub");
    expect(yaml).toContain(`${MEDIAMTX_MAIN_PATH}:`);
    expect(yaml).toContain(`${MEDIAMTX_SUB_PATH}:`);
    expect(yaml).toContain("sourceOnDemand: yes");
    expect(yaml).toContain("rtsp://admin:@192.168.1.140:554/h264Preview_01_main");
    expect(yaml).toContain("rtsp://admin:@192.168.1.140:554/h264Preview_01_sub");
  });
});

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

function createSnapshot(): CapabilitySnapshot {
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
    supportsAudio: true,
  };
}
