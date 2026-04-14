import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CameraConfig } from "../config/camera-config.js";
import type {
  CameraIdentity,
  ReolinkAbility,
  ReolinkNetPort,
} from "../types/reolink.js";
import { z } from "zod";

export type CapabilitySnapshot = {
  identity: CameraIdentity;
  ports: {
    http: number;
    https: number;
    media: number;
    onvif: number;
    rtsp: number;
  };
  supportsLiveView: boolean;
  supportsPtzControl: boolean;
  supportsPtzPreset: boolean;
  supportsPtzPatrol: boolean;
  supportsSnapshot: boolean;
  supportsConfigRead: boolean;
};

const capabilitySnapshotSchema = z.object({
  identity: z.object({
    model: z.string(),
    hardVer: z.string(),
    firmVer: z.string(),
  }),
  ports: z.object({
    http: z.number(),
    https: z.number(),
    media: z.number(),
    onvif: z.number(),
    rtsp: z.number(),
  }),
  supportsLiveView: z.boolean(),
  supportsPtzControl: z.boolean(),
  supportsPtzPreset: z.boolean(),
  supportsPtzPatrol: z.boolean(),
  supportsSnapshot: z.boolean(),
  supportsConfigRead: z.boolean(),
});

export function buildCapabilitySnapshot(input: {
  identity: CameraIdentity;
  ports: ReolinkNetPort;
  ability: ReolinkAbility;
}): CapabilitySnapshot {
  return {
    identity: input.identity,
    ports: {
      http: input.ports.httpPort,
      https: input.ports.httpsPort,
      media: input.ports.mediaPort,
      onvif: input.ports.onvifPort,
      rtsp: input.ports.rtspPort,
    },
    supportsLiveView: hasChannelPermit(input.ability, "live"),
    supportsPtzControl: hasChannelPermit(input.ability, "ptzCtrl"),
    supportsPtzPreset: hasChannelPermit(input.ability, "ptzPreset"),
    supportsPtzPatrol: hasChannelPermit(input.ability, "ptzPatrol"),
    supportsSnapshot: hasChannelPermit(input.ability, "snap"),
    supportsConfigRead:
      hasRootPermit(input.ability, "exportCfg") ||
      hasRootPermit(input.ability, "devInfo") ||
      hasRootPermit(input.ability, "user"),
  };
}

export function defaultCapabilitySnapshotPath(
  config: CameraConfig,
  identity = config.snapshot,
): string {
  const host = new URL(config.baseUrl).hostname;
  const model = identity.model || config.modelHint || "camera";
  const fileName = `${slugify(`${host}-${model}`)}.json`;

  return path.resolve(process.cwd(), ".local", "capabilities", fileName);
}

export async function saveCapabilitySnapshot(
  snapshot: CapabilitySnapshot,
  config: CameraConfig,
  snapshotPath = defaultCapabilitySnapshotPath(config, snapshot.identity),
): Promise<string> {
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshotPath;
}

export async function loadCapabilitySnapshot(
  config: CameraConfig,
  snapshotPath = defaultCapabilitySnapshotPath(config),
): Promise<CapabilitySnapshot> {
  const raw = await readFile(snapshotPath, "utf8");
  return capabilitySnapshotSchema.parse(JSON.parse(raw));
}

function hasChannelPermit(ability: ReolinkAbility, key: string): boolean {
  const channel = ability.abilityChn?.[0];
  const value = channel?.[key];

  return hasPermit(value);
}

function hasRootPermit(ability: ReolinkAbility, key: string): boolean {
  return hasPermit(ability[key]);
}

function hasPermit(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const permit = (value as { permit?: unknown }).permit;
  return typeof permit === "number" && permit > 0;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
