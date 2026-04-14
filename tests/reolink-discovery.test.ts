import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  getAbility,
  getDevInfo,
  getNetPort,
  probeCamera,
  type ReolinkRequestExecutor,
} from "../src/camera/reolink-discovery.js";
import type { ReolinkApiResponse } from "../src/types/reolink.js";

type Fixture<TRequest, TResponse> = {
  request: TRequest;
  response: TResponse;
};

describe("reolink discovery", () => {
  it("parses the exact RLC-423S device identity from fixtures", async () => {
    const devInfoFixture = await loadFixture<
      Fixture<unknown, readonly ReolinkApiResponse[]>
    >("get-dev-info.json");
    const session = createFixtureSession({
      GetDevInfo: devInfoFixture.response,
    });

    const devInfo = await getDevInfo(session);

    expect(devInfo.model).toBe("RLC-423S");
    expect(devInfo.hardVer).toBe("IPC_3816M");
    expect(devInfo.firmVer).toBe("v2.0.0.1055_17110905_v1.0.0.30");
  });

  it("parses HTTP, HTTPS, RTSP, ONVIF, and media ports from fixtures", async () => {
    const netPortFixture = await loadFixture<
      Fixture<unknown, readonly ReolinkApiResponse[]>
    >("get-net-port.json");
    const session = createFixtureSession({
      GetNetPort: netPortFixture.response,
    });

    const ports = await getNetPort(session);

    expect(ports.httpPort).toBe(80);
    expect(ports.httpsPort).toBe(443);
    expect(ports.rtspPort).toBe(554);
    expect(ports.onvifPort).toBe(8000);
    expect(ports.mediaPort).toBe(9000);
  });

  it("returns raw GetAbility keys like live, ptzCtrl, and ptzPreset", async () => {
    const abilityFixture = await loadFixture<
      Fixture<unknown, readonly ReolinkApiResponse[]>
    >("get-ability.json");
    const session = createFixtureSession({
      GetAbility: abilityFixture.response,
    });

    const ability = await getAbility(session);
    const channel = ability.abilityChn?.[0];

    expect(channel).toHaveProperty("live");
    expect(channel).toHaveProperty("ptzCtrl");
    expect(channel).toHaveProperty("ptzPreset");
  });

  it("combines identity, ports, and raw ability data in probeCamera()", async () => {
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
    const session = createFixtureSession({
      GetDevInfo: devInfoFixture.response,
      GetNetPort: netPortFixture.response,
      GetAbility: abilityFixture.response,
    });

    const probe = await probeCamera(session);

    expect(probe.identity).toEqual({
      model: "RLC-423S",
      hardVer: "IPC_3816M",
      firmVer: "v2.0.0.1055_17110905_v1.0.0.30",
    });
    expect(probe.ports.httpPort).toBe(80);
    expect(probe.rawAbility.abilityChn?.[0]).toHaveProperty("ptzCtrl");
  });
});

async function loadFixture<T>(name: string): Promise<T> {
  const fileUrl = new URL(`./fixtures/reolink/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw) as T;
}

function createFixtureSession(
  responses: Record<string, readonly ReolinkApiResponse[]>,
): ReolinkRequestExecutor {
  return {
    async requestJson<TResponse extends readonly ReolinkApiResponse[]>(
      commands: { cmd: string }[],
    ): Promise<TResponse> {
      const command = commands[0]?.cmd;
      const response = responses[command];

      if (!response) {
        throw new Error(`Missing fixture response for ${command}`);
      }

      return response as TResponse;
    },
  };
}
