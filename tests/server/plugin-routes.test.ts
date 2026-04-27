import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { createServer } from "../../src/server/create-server.js";
import { pluginsRoutes } from "../../src/server/routes/plugins.js";
import type { PluginRuntime } from "../../src/plugins/plugin-contract.js";
import type {
  PluginActionResult,
  PluginStatus,
  PluginSummary,
} from "../../src/types/plugins.js";

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

describe("plugin routes", () => {
  it("lists browser-safe plugin summaries", async () => {
    const app = await createApp(createFakeRuntime());

    const response = await app.inject({
      method: "GET",
      url: "/api/plugins",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<PluginSummary[]>()).toHaveLength(1);
    expectBrowserSafe(response.body);

    await app.close();
  });

  it("returns plugin status and 404 for unknown plugins", async () => {
    const app = await createApp(createFakeRuntime());

    const found = await app.inject({
      method: "GET",
      url: "/api/plugins/youtube-streaming",
    });
    const missing = await app.inject({
      method: "GET",
      url: "/api/plugins/missing",
    });

    expect(found.statusCode).toBe(200);
    expect(found.json<PluginStatus>().pluginId).toBe("youtube-streaming");
    expectBrowserSafe(found.body);
    expect(missing.statusCode).toBe(404);

    await app.close();
  });

  it("maps malformed, disabled, unsupported, and validation failures to stable status codes", async () => {
    const app = await createApp(createFakeRuntime());

    const malformedEnable = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/enable",
      payload: [],
    });
    const malformedConfig = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/config",
      payload: [],
    });
    const malformedAction = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/actions/start",
      payload: [],
    });
    const disabled = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/actions/start",
      payload: {},
    });
    const unsupported = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/actions/missing",
      payload: {},
    });
    const validation = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/config",
      payload: {
        values: {
          privacy: "public",
        },
      },
    });

    expect(malformedEnable.statusCode).toBe(400);
    expect(malformedConfig.statusCode).toBe(400);
    expect(malformedAction.statusCode).toBe(400);
    expect(disabled.statusCode).toBe(409);
    expect(unsupported.statusCode).toBe(409);
    expect(validation.statusCode).toBe(422);

    await app.close();
  });

  it("accepts enable, disable, config, and action requests with browser-safe DTOs", async () => {
    const runtime = createFakeRuntime();
    const app = await createApp(runtime);

    const config = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/config",
      payload: {
        values: {
          title: "Driveway Camera",
          privacy: "unlisted",
        },
      },
    });
    const enable = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/enable",
      payload: {},
    });
    const action = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/actions/start",
      payload: {
        dryRun: true,
      },
    });
    const disable = await app.inject({
      method: "POST",
      url: "/api/plugins/youtube-streaming/disable",
      payload: {},
    });

    expect(config.statusCode).toBe(200);
    expect(enable.statusCode).toBe(200);
    expect(action.statusCode).toBe(202);
    expect(action.json<PluginActionResult>().accepted).toBe(true);
    expect(disable.statusCode).toBe(200);
    expectBrowserSafe(config.body);
    expectBrowserSafe(enable.body);
    expectBrowserSafe(action.body);
    expectBrowserSafe(disable.body);

    await app.close();
  });

  it("mounts through createServer without breaking existing route dependency options", async () => {
    const staticRoot = await mkdtemp(path.join(os.tmpdir(), "reolink-static-"));
    await mkdirIndex(staticRoot);
    const app = await createServer({
      staticRoot,
      liveView: {
        buildLiveViewBootstrap: async () => ({
          preferredModeId: "snapshot:main",
          fallbackOrder: ["snapshot:main"],
          modes: [
            {
              id: "snapshot:main",
              label: "Snapshot Main",
              quality: "main",
              transport: "snapshot",
              enabled: true,
              playback: {
                hlsUrl: null,
                snapshotUrl: "/api/live-view/snapshot/main",
                whepUrl: null,
              },
            },
          ],
          diagnostics: {
            state: "live",
            currentModeId: "snapshot:main",
            nextFallbackModeId: null,
            reason: null,
          },
        }),
      },
      plugins: {
        createPluginRuntime: () => createFakeRuntime(),
      },
    });

    const plugins = await app.inject({
      method: "GET",
      url: "/api/plugins",
    });
    const liveView = await app.inject({
      method: "GET",
      url: "/api/live-view",
    });

    expect(plugins.statusCode).toBe(200);
    expect(liveView.statusCode).toBe(200);

    await app.close();
  });
});

async function createApp(runtime: PluginRuntime) {
  const app = Fastify();
  await app.register(pluginsRoutes, {
    createPluginRuntime: () => runtime,
  });
  return app;
}

async function mkdirIndex(staticRoot: string): Promise<void> {
  const webDirectory = path.join(staticRoot, "web");
  await import("node:fs/promises").then(({ mkdir }) =>
    mkdir(webDirectory, { recursive: true }),
  );
  await writeFile(
    path.join(webDirectory, "index.html"),
    "<!doctype html><html><body><div id=\"app\"></div></body></html>",
    "utf8",
  );
}

function createFakeRuntime(): PluginRuntime {
  let enabled = false;

  const status = (): PluginStatus => ({
    pluginId: "youtube-streaming",
    state: enabled ? "enabled" : "disabled",
    message: enabled
      ? "YouTube streaming controls are available."
      : "Enable the plugin before invoking actions.",
    updatedAt: "2026-04-27T00:00:00.000Z",
  });

  const summary = (): PluginSummary => ({
    id: "youtube-streaming",
    label: "YouTube Streaming",
    description: "Stream the local camera feed to YouTube Live.",
    enabled,
    capabilities: ["configuration", "actions", "share-metadata"],
    status: status(),
    actions: [
      {
        id: "start",
        label: "Start",
        enabled,
        disabledReason: enabled ? null : "Plugin is disabled.",
      },
    ],
    config: [
      {
        id: "privacy",
        label: "Privacy",
        kind: "select",
        required: true,
        value: "unlisted",
        options: [
          { label: "Private", value: "private" },
          { label: "Unlisted", value: "unlisted" },
        ],
      },
    ],
    share: {
      available: false,
      url: null,
      label: null,
    },
  });

  return {
    async listPlugins() {
      return [summary()];
    },
    async getPluginStatus(pluginId) {
      if (pluginId !== "youtube-streaming") {
        throw Object.assign(new Error("Unknown plugin"), {
          code: "not-found",
          statusCode: 404,
        });
      }

      return status();
    },
    async enablePlugin(_pluginId, _body) {
      enabled = true;
      return {
        ok: true,
        pluginId: "youtube-streaming",
        verified: true,
        status: status(),
      };
    },
    async disablePlugin(_pluginId, _body) {
      enabled = false;
      return {
        ok: true,
        pluginId: "youtube-streaming",
        verified: true,
        status: status(),
      };
    },
    async configurePlugin(_pluginId, patch) {
      if (patch.values?.privacy === "public") {
        throw Object.assign(new Error("Privacy must be private or unlisted"), {
          code: "validation",
          statusCode: 422,
        });
      }

      return {
        ok: true,
        pluginId: "youtube-streaming",
        verified: true,
        status: status(),
      };
    },
    async invokeAction(_pluginId, actionId) {
      if (actionId !== "start") {
        throw Object.assign(new Error("Unsupported action"), {
          code: "unsupported",
          statusCode: 409,
        });
      }

      if (!enabled) {
        throw Object.assign(new Error("Plugin is disabled"), {
          code: "disabled",
          statusCode: 409,
        });
      }

      return {
        ok: true,
        pluginId: "youtube-streaming",
        actionId,
        accepted: true,
        status: status(),
      };
    },
  };
}

function expectBrowserSafe(serialized: string): void {
  for (const fragment of forbiddenPayloadFragments) {
    expect(serialized).not.toContain(fragment);
  }
}
