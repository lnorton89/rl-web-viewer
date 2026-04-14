import { describe, expect, it } from "vitest";

import type { CapabilitySnapshot } from "../../src/camera/capability-snapshot.js";
import {
  DEFAULT_MODE_ORDER,
  buildFallbackOrder,
  buildLiveModes,
  pickPreferredMode,
} from "../../src/media/live-view-modes.js";

describe("live-view modes", () => {
  it("uses the planned startup order for supported live and snapshot modes", () => {
    const modes = buildLiveModes(createSnapshot());

    expect(DEFAULT_MODE_ORDER).toEqual([
      "webrtc:main",
      "webrtc:sub",
      "hls:sub",
      "snapshot:main",
    ]);
    expect(buildFallbackOrder(modes)).toEqual([
      "webrtc:main",
      "webrtc:sub",
      "hls:sub",
      "snapshot:main",
    ]);
    expect(pickPreferredMode(modes)?.id).toBe("webrtc:main");
    expect(modes.find((mode) => mode.id === "hls:main")?.enabled).toBe(true);
    expect(modes.find((mode) => mode.id === "snapshot:sub")?.enabled).toBe(true);
  });

  it("disables snapshot fallback when supportsSnapshot is false", () => {
    const modes = buildLiveModes(
      createSnapshot({
        supportsSnapshot: false,
      }),
    );

    expect(buildFallbackOrder(modes)).toEqual([
      "webrtc:main",
      "webrtc:sub",
      "hls:sub",
    ]);
    expect(modes.find((mode) => mode.id === "snapshot:main")?.enabled).toBe(false);
    expect(modes.find((mode) => mode.id === "snapshot:sub")?.enabled).toBe(false);
  });

  it("falls back to snapshot-only modes when supportsLiveView is false", () => {
    const modes = buildLiveModes(
      createSnapshot({
        supportsLiveView: false,
      }),
    );

    expect(buildFallbackOrder(modes)).toEqual(["snapshot:main"]);
    expect(pickPreferredMode(modes)?.id).toBe("snapshot:main");
    expect(modes.find((mode) => mode.id === "webrtc:main")?.enabled).toBe(false);
    expect(modes.find((mode) => mode.id === "hls:sub")?.enabled).toBe(false);
  });
});

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
