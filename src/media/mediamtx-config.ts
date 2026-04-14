import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ResolvedReolinkLiveStreams } from "../camera/reolink-live-streams.js";

export const MEDIAMTX_MAIN_PATH = "camera_main";
export const MEDIAMTX_SUB_PATH = "camera_sub";

export type MediaMtxSourceMap = Record<
  typeof MEDIAMTX_MAIN_PATH | typeof MEDIAMTX_SUB_PATH,
  string
>;

export function defaultMediaMtxConfigPath(): string {
  return path.resolve(process.cwd(), ".local", "runtime", "mediamtx.yml");
}

export function buildMediaMtxSourceMap(
  streams: ResolvedReolinkLiveStreams,
): MediaMtxSourceMap {
  return {
    [MEDIAMTX_MAIN_PATH]: streams.main.sourceUrl,
    [MEDIAMTX_SUB_PATH]: streams.sub.sourceUrl,
  };
}

export function buildMediaMtxConfig(sourceMap: MediaMtxSourceMap): string {
  return [
    "hlsAddress: :8888",
    "webrtcAddress: :8889",
    "paths:",
    `  ${MEDIAMTX_MAIN_PATH}:`,
    `    source: ${sourceMap.camera_main}`,
    "    sourceOnDemand: yes",
    `  ${MEDIAMTX_SUB_PATH}:`,
    `    source: ${sourceMap.camera_sub}`,
    "    sourceOnDemand: yes",
    "",
  ].join("\n");
}

export async function writeMediaMtxConfig(
  sourceMap: MediaMtxSourceMap,
  configPath = defaultMediaMtxConfigPath(),
): Promise<string> {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, buildMediaMtxConfig(sourceMap), "utf8");
  return configPath;
}
