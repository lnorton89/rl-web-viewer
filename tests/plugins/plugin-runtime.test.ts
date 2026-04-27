import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createPluginRuntime,
  getRegisteredPlugins,
  registerPlugins,
} from "../../src/plugins/plugin-registry.js";
import {
  loadPluginConfig,
  savePluginConfig,
} from "../../src/config/plugin-config.js";
import { sanitizeForDebug } from "../../src/diagnostics/debug-capture.js";

const forbiddenPayloadFragments = [
  "access_token",
  "refresh_token",
  "client_secret",
  "rtsp://",
  "rtmp://",
  "rtmps://",
  "streamName",
  "password",
] as const;

describe("plugin runtime", () => {
  it("registers built-in plugins idempotently without duplicate ids", () => {
    const first = registerPlugins();
    const second = registerPlugins();
    const registered = getRegisteredPlugins();

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(registered).toHaveLength(1);
    expect(new Set(registered.map((plugin) => plugin.id)).size).toBe(
      registered.length,
    );
    expect(registered[0]?.id).toBe("youtube-streaming");
  });

  it("returns browser-safe summaries, status, config metadata, and action results", async () => {
    const runtime = createPluginRuntime({
      configPath: await createTempConfigPath(),
    });

    const summary = await runtime.listPlugins();
    const status = await runtime.getPluginStatus("youtube-streaming");
    const configured = await runtime.configurePlugin("youtube-streaming", {
      values: {
        title: "Driveway Camera",
        privacy: "unlisted",
      },
    });
    const enabled = await runtime.enablePlugin("youtube-streaming", {});

    expect(summary[0]).toMatchObject({
      id: "youtube-streaming",
      label: "YouTube Streaming",
      enabled: false,
    });
    expect(status.pluginId).toBe("youtube-streaming");
    expect(configured.verified).toBe(true);
    expect(enabled.status.state).toBe("enabled");

    expectBrowserSafe(summary);
    expectBrowserSafe(status);
    expectBrowserSafe(configured);
    expectBrowserSafe(enabled);
  });

  it("normalizes unknown plugins, disabled actions, unsupported actions, and validation failures", async () => {
    const runtime = createPluginRuntime({
      configPath: await createTempConfigPath(),
    });

    await expect(runtime.getPluginStatus("missing")).rejects.toMatchObject({
      code: "not-found",
      statusCode: 404,
    });
    await expect(
      runtime.invokeAction("youtube-streaming", "start", {}),
    ).rejects.toMatchObject({
      code: "disabled",
      statusCode: 409,
    });
    await runtime.enablePlugin("youtube-streaming", {});
    await expect(
      runtime.invokeAction("youtube-streaming", "missing", {}),
    ).rejects.toMatchObject({
      code: "unsupported",
      statusCode: 409,
    });
    await expect(
      runtime.configurePlugin("youtube-streaming", {
        values: {
          privacy: "friends-only",
        },
      }),
    ).rejects.toMatchObject({
      code: "validation",
      statusCode: 422,
    });
  });

  it("validates plugin config writes and reloads the verified persisted value", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-plugins-"));
    const configPath = path.join(directory, "plugin.config.json");

    await savePluginConfig(
      {
        plugins: {
          "youtube-streaming": {
            enabled: true,
            values: {
              title: "Driveway Camera",
              privacy: "private",
            },
          },
        },
      },
      configPath,
    );

    const raw = await readFile(configPath, "utf8");
    const loaded = await loadPluginConfig(configPath);

    expect(raw).toContain("\"youtube-streaming\"");
    expect(loaded.plugins["youtube-streaming"]?.enabled).toBe(true);
    expect(loaded.plugins["youtube-streaming"]?.values.title).toBe(
      "Driveway Camera",
    );
  });

  it("redacts OAuth, camera, and streaming secrets from debug payloads", () => {
    const sanitized = sanitizeForDebug({
      access_token: "ya29.access",
      refresh_token: "refresh-secret",
      client_secret: "client-secret",
      cameraPassword: "camera-secret",
      rtspUrl: "rtsp://admin:password@192.168.1.10/h264Preview_01_main",
      ingestionUrl: "rtmps://a.rtmps.youtube.com/live2/stream-key",
      streamName: "abcd-efgh-ijkl",
    });

    expectBrowserSafe(sanitized);
    expect(JSON.stringify(sanitized)).toContain("[REDACTED]");
  });
});

function expectBrowserSafe(payload: unknown): void {
  const serialized = JSON.stringify(payload);

  for (const fragment of forbiddenPayloadFragments) {
    expect(serialized).not.toContain(fragment);
  }
}

async function createTempConfigPath(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-plugins-"));
  return path.join(directory, "plugin.config.json");
}
