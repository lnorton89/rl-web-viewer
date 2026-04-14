import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CameraConfig } from "../config/camera-config.js";
import type {
  CameraIdentity,
  ReolinkAbility,
  ReolinkNetPort,
} from "../types/reolink.js";

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
