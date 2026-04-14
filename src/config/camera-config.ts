import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

const snapshotSchema = z.object({
  model: z.string().default(""),
  hardVer: z.string().default(""),
  firmVer: z.string().default(""),
});

export const cameraConfigSchema = z.object({
  baseUrl: z.url(),
  username: z.string(),
  password: z.string(),
  modelHint: z.string().default("RLC-423S"),
  notes: z.string().default(""),
  snapshot: snapshotSchema.default({
    model: "",
    hardVer: "",
    firmVer: "",
  }),
});

export type CameraConfig = z.infer<typeof cameraConfigSchema>;

export function defaultConfigPath(): string {
  return path.resolve(process.cwd(), ".local", "camera.config.json");
}

export async function loadCameraConfig(
  configPath = defaultConfigPath(),
): Promise<CameraConfig> {
  const raw = await readFile(configPath, "utf8");
  return cameraConfigSchema.parse(JSON.parse(raw));
}

export async function saveCameraConfig(
  config: CameraConfig,
  configPath = defaultConfigPath(),
): Promise<void> {
  await mkdir(path.dirname(configPath), { recursive: true });
  const parsed = cameraConfigSchema.parse(config);
  await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}
