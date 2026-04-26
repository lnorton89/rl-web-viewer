import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { CameraConfig } from "../src/config/camera-config.js";
import {
  buildCapabilitySnapshot,
  saveCapabilitySnapshot,
} from "../src/camera/capability-snapshot.js";
import type {
  ReolinkAbility,
  ReolinkApiResponse,
  ReolinkDeviceInfo,
  ReolinkNetPort,
} from "../src/types/reolink.js";

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

describe("capability snapshot", () => {
  it("normalizes supportsLiveView, supportsPtzControl, and supportsPtzPreset", async () => {
    const [devInfoFixture, netPortFixture, abilityFixture] = await Promise.all([
      loadFixture<Fixture<unknown, readonly ReolinkApiResponse[]>>(
        "get-dev-info.json",
      ),
      loadFixture<Fixture<unknown, readonly ReolinkApiResponse[]>>(
        "get-net-port.json",
      ),
      loadFixture<Fixture<unknown, readonly ReolinkApiResponse[]>>(
        "get-ability.json",
      ),
    ]);
    const devInfo = (devInfoFixture.response[0]?.value as { DevInfo: ReolinkDeviceInfo }).DevInfo;
    const ports = (netPortFixture.response[0]?.value as { NetPort: ReolinkNetPort }).NetPort;
    const ability = (abilityFixture.response[0]?.value as { Ability: ReolinkAbility }).Ability;

    const snapshot = buildCapabilitySnapshot({
      identity: {
        model: devInfo.model,
        hardVer: devInfo.hardVer,
        firmVer: devInfo.firmVer,
      },
      ports,
      ability,
      audioNum: devInfo.audioNum,
    });

    expect(snapshot.supportsLiveView).toBe(true);
    expect(snapshot.supportsPtzControl).toBe(true);
    expect(snapshot.supportsPtzPreset).toBe(true);
    expect(snapshot.supportsPtzPatrol).toBe(true);
    expect(snapshot.supportsAudio).toBe(true);
  });

  it("persists a capability snapshot to disk", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-snapshot-"));
    const snapshot = buildCapabilitySnapshot({
      identity: {
        model: "RLC-423S",
        hardVer: "IPC_3816M",
        firmVer: "v2.0.0.1055_17110905_v1.0.0.30",
      },
      ports: {
        httpPort: 80,
        httpsPort: 443,
        mediaPort: 9000,
        onvifPort: 8000,
        rtmpPort: 1935,
        rtspPort: 554,
      },
      ability: {
        abilityChn: [
          {
            live: { permit: 4, ver: 1 },
            ptzCtrl: { permit: 1, ver: 1 },
            ptzPreset: { permit: 7, ver: 1 },
            ptzPatrol: { permit: 7, ver: 1 },
            snap: { permit: 6, ver: 1 },
          },
        ],
        exportCfg: { permit: 4, ver: 1 },
      },
    });
    const filePath = path.join(directory, "snapshot.json");

    await saveCapabilitySnapshot(snapshot, config, filePath);

    const persisted = JSON.parse(await readFile(filePath, "utf8")) as {
      supportsPtzPreset: boolean;
    };
    expect(persisted.supportsPtzPreset).toBe(true);
  });
});

async function loadFixture<T>(name: string): Promise<T> {
  const fileUrl = new URL(`./fixtures/reolink/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw) as T;
}
