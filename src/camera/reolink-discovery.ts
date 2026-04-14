import { z } from "zod";

import type {
  CameraIdentity,
  ReolinkAbility,
  ReolinkApiResponse,
  ReolinkDeviceInfo,
  ReolinkNetPort,
  ReolinkRequest,
} from "../types/reolink.js";

export type ReolinkRequestExecutor = {
  getUsername?(): string;
  requestJson<TResponse extends readonly ReolinkApiResponse[]>(
    commands: readonly ReolinkRequest[],
  ): Promise<TResponse>;
};

const capabilityPermitSchema = z.object({
  permit: z.number(),
  ver: z.number(),
});

const devInfoSchema = z.object({
  B485: z.number(),
  IOInputNum: z.number(),
  IOOutputNum: z.number(),
  audioNum: z.number(),
  buildDay: z.string(),
  cfgVer: z.string(),
  channelNum: z.number(),
  detail: z.string(),
  diskNum: z.number(),
  firmVer: z.string(),
  hardVer: z.string(),
  model: z.string(),
  name: z.string(),
  serial: z.string(),
  type: z.string(),
  wifi: z.number(),
});

const netPortSchema = z.object({
  httpPort: z.number(),
  httpsPort: z.number(),
  mediaPort: z.number(),
  onvifPort: z.number(),
  rtmpPort: z.number(),
  rtspPort: z.number(),
});

const abilityChannelSchema = z.record(z.string(), capabilityPermitSchema);
const abilitySchema = z.record(
  z.string(),
  z.union([capabilityPermitSchema, z.array(abilityChannelSchema), z.unknown()]),
);

export async function getDevInfo(
  session: ReolinkRequestExecutor,
): Promise<ReolinkDeviceInfo> {
  const responses = await session.requestJson<
    readonly ReolinkApiResponse<{ DevInfo: ReolinkDeviceInfo }>[]
  >([{ cmd: "GetDevInfo" }]);
  const payload = getSuccessfulValue(responses, "GetDevInfo");
  return devInfoSchema.parse(payload.DevInfo);
}

export async function getNetPort(
  session: ReolinkRequestExecutor,
): Promise<ReolinkNetPort> {
  const responses = await session.requestJson<
    readonly ReolinkApiResponse<{ NetPort: ReolinkNetPort }>[]
  >([{ cmd: "GetNetPort", action: 0, param: {} }]);
  const payload = getSuccessfulValue(responses, "GetNetPort");
  return netPortSchema.parse(payload.NetPort);
}

export async function getAbility(
  session: ReolinkRequestExecutor,
): Promise<ReolinkAbility> {
  const username = session.getUsername?.() ?? "admin";
  const responses = await session.requestJson<
    readonly ReolinkApiResponse<{ Ability: ReolinkAbility }>[]
  >([
    {
      cmd: "GetAbility",
      action: 0,
      param: {
        User: {
          userName: username,
        },
      },
    },
  ]);
  const payload = getSuccessfulValue(responses, "GetAbility");
  return abilitySchema.parse(payload.Ability);
}

export async function probeCamera(session: ReolinkRequestExecutor): Promise<{
  identity: CameraIdentity;
  devInfo: ReolinkDeviceInfo;
  ports: ReolinkNetPort;
  ability: ReolinkAbility;
  rawAbility: ReolinkAbility;
}> {
  const [devInfo, ports, ability] = await Promise.all([
    getDevInfo(session),
    getNetPort(session),
    getAbility(session),
  ]);

  return {
    identity: {
      model: devInfo.model,
      hardVer: devInfo.hardVer,
      firmVer: devInfo.firmVer,
    },
    devInfo,
    ports,
    ability,
    rawAbility: ability,
  };
}

function getSuccessfulValue<TValue>(
  responses: readonly ReolinkApiResponse<TValue>[],
  command: string,
): TValue {
  const response = responses.find((entry) => entry.cmd === command);

  if (!response) {
    throw new Error(`Missing ${command} response`);
  }

  if (response.code !== 0 || response.value === undefined) {
    const detail = response.error?.detail ?? "unknown error";
    throw new Error(`${command} failed: ${detail}`);
  }

  return response.value;
}
