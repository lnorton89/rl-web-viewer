import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

const pluginValuesSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .default({});

const pluginStateSchema = z.object({
  enabled: z.boolean().default(false),
  values: pluginValuesSchema,
});

export const pluginConfigSchema = z.object({
  plugins: z.record(z.string(), pluginStateSchema).default({}),
});

export type PluginConfig = z.infer<typeof pluginConfigSchema>;
export type PluginConfigState = z.infer<typeof pluginStateSchema>;

export function defaultPluginConfigPath(): string {
  return path.resolve(process.cwd(), ".local", "plugins", "plugin.config.json");
}

export async function loadPluginConfig(
  configPath = defaultPluginConfigPath(),
): Promise<PluginConfig> {
  try {
    const raw = await readFile(configPath, "utf8");
    return pluginConfigSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isFileNotFound(error)) {
      return pluginConfigSchema.parse({});
    }

    throw error;
  }
}

export async function savePluginConfig(
  config: PluginConfig,
  configPath = defaultPluginConfigPath(),
): Promise<PluginConfig> {
  await mkdir(path.dirname(configPath), { recursive: true });
  const parsed = pluginConfigSchema.parse(config);
  await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  const verified = await loadPluginConfig(configPath);

  pluginConfigSchema.parse(verified);
  return verified;
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
