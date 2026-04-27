import {
  loadPluginConfig,
  savePluginConfig,
  type PluginConfig,
  type PluginConfigState,
} from "../config/plugin-config.js";
import type {
  PluginActionResult,
  PluginConfigField,
  PluginConfigPatch,
  PluginConfigResult,
  PluginId,
  PluginStatus,
  PluginSummary,
} from "../types/plugins.js";
import {
  PluginRuntimeError,
  type PluginActionContext,
  type PluginModule,
  type PluginRuntime,
} from "./plugin-contract.js";

type PluginRuntimeOptions = {
  configPath?: string;
  now?: () => string;
};

let registeredPlugins: PluginModule[] = [];

export function registerPlugins(): readonly PluginModule[] {
  if (registeredPlugins.length === 0) {
    registeredPlugins = [createYoutubeStreamingPlugin()];
  }

  return registeredPlugins;
}

export function getRegisteredPlugins(): readonly PluginModule[] {
  return registerPlugins();
}

export function createPluginRuntime(
  options: PluginRuntimeOptions = {},
): PluginRuntime {
  const now = options.now ?? (() => new Date().toISOString());

  async function createContext(): Promise<PluginActionContext> {
    return {
      config: await loadPluginConfig(options.configPath),
      async saveConfig(config) {
        return savePluginConfig(config, options.configPath);
      },
      now,
    };
  }

  async function resolvePlugin(pluginId: string): Promise<{
    plugin: PluginModule;
    context: PluginActionContext;
  }> {
    const plugin = getRegisteredPlugins().find(
      (candidate) => candidate.id === pluginId,
    );

    if (!plugin) {
      throw new PluginRuntimeError(
        "not-found",
        `Unknown plugin: ${pluginId}`,
        404,
      );
    }

    return {
      plugin,
      context: await createContext(),
    };
  }

  return {
    async listPlugins() {
      const context = await createContext();
      return Promise.all(
        getRegisteredPlugins().map((plugin) => plugin.getSummary(context)),
      );
    },
    async getPluginStatus(pluginId) {
      const { plugin, context } = await resolvePlugin(pluginId);
      return plugin.getStatus(context);
    },
    async enablePlugin(pluginId, patch) {
      const { plugin, context } = await resolvePlugin(pluginId);
      return plugin.enable(patch, context);
    },
    async disablePlugin(pluginId, patch) {
      const { plugin, context } = await resolvePlugin(pluginId);
      return plugin.disable(patch, context);
    },
    async configurePlugin(pluginId, patch) {
      const { plugin, context } = await resolvePlugin(pluginId);
      return plugin.configure(patch, context);
    },
    async invokeAction(pluginId, actionId, body) {
      const { plugin, context } = await resolvePlugin(pluginId);
      return plugin.invokeAction(actionId, body, context);
    },
  };
}

function createYoutubeStreamingPlugin(): PluginModule {
  const id: PluginId = "youtube-streaming";

  return {
    id,
    getSummary(context) {
      const state = getPluginState(context.config, id);
      const status = buildStatus(id, state, context.now());

      return {
        id,
        label: "YouTube Streaming",
        description: "Stream the local camera feed to YouTube Live.",
        enabled: state.enabled,
        capabilities: ["configuration", "actions", "share-metadata"],
        status,
        actions: [
          {
            id: "start",
            label: "Start",
            enabled: state.enabled,
            disabledReason: state.enabled ? null : "Plugin is disabled.",
          },
          {
            id: "stop",
            label: "Stop",
            enabled: state.enabled,
            disabledReason: state.enabled ? null : "Plugin is disabled.",
          },
        ],
        config: buildConfigFields(state),
        share: {
          available: false,
          url: null,
          label: null,
        },
      };
    },
    getStatus(context) {
      return buildStatus(id, getPluginState(context.config, id), context.now());
    },
    async enable(patch, context) {
      const config = setPluginState(context.config, id, {
        ...getPluginState(context.config, id),
        values: validateConfigPatch(patch),
        enabled: true,
      });
      const verified = await context.saveConfig(config);

      return buildConfigResult(id, verified, context.now());
    },
    async disable(patch, context) {
      const config = setPluginState(context.config, id, {
        ...getPluginState(context.config, id),
        values: validateConfigPatch(patch),
        enabled: false,
      });
      const verified = await context.saveConfig(config);

      return buildConfigResult(id, verified, context.now());
    },
    async configure(patch, context) {
      const current = getPluginState(context.config, id);
      const values = validateConfigPatch(patch);
      const config = setPluginState(context.config, id, {
        ...current,
        values: {
          ...current.values,
          ...values,
        },
      });
      const verified = await context.saveConfig(config);

      return buildConfigResult(id, verified, context.now());
    },
    invokeAction(actionId, _body, context) {
      if (actionId !== "start" && actionId !== "stop") {
        throw new PluginRuntimeError(
          "unsupported",
          `Unsupported action: ${actionId}`,
          409,
        );
      }

      const state = getPluginState(context.config, id);

      if (!state.enabled) {
        throw new PluginRuntimeError(
          "disabled",
          "Plugin is disabled.",
          409,
        );
      }

      return {
        ok: true,
        pluginId: id,
        actionId,
        accepted: true,
        status: buildStatus(id, state, context.now()),
        message: `${actionId} accepted by plugin runtime.`,
      } satisfies PluginActionResult;
    },
  };
}

function buildConfigFields(state: PluginConfigState): readonly PluginConfigField[] {
  return [
    {
      id: "title",
      label: "Title",
      kind: "text",
      required: true,
      value: getStringValue(state.values.title, "Camera Live Stream"),
    },
    {
      id: "privacy",
      label: "Privacy",
      kind: "select",
      required: true,
      value: getStringValue(state.values.privacy, "unlisted"),
      options: [
        { label: "Private", value: "private" },
        { label: "Unlisted", value: "unlisted" },
      ],
    },
  ];
}

function buildStatus(
  pluginId: PluginId,
  state: PluginConfigState,
  updatedAt: string,
): PluginStatus {
  return {
    pluginId,
    state: state.enabled ? "enabled" : "disabled",
    message: state.enabled
      ? "YouTube streaming controls are available."
      : "Enable the plugin before invoking actions.",
    updatedAt,
  };
}

function buildConfigResult(
  pluginId: PluginId,
  config: PluginConfig,
  updatedAt: string,
): PluginConfigResult {
  return {
    ok: true,
    pluginId,
    verified: true,
    status: buildStatus(pluginId, getPluginState(config, pluginId), updatedAt),
  };
}

function getPluginState(
  config: PluginConfig,
  pluginId: PluginId,
): PluginConfigState {
  return {
    enabled: config.plugins[pluginId]?.enabled ?? false,
    values: config.plugins[pluginId]?.values ?? {},
  };
}

function setPluginState(
  config: PluginConfig,
  pluginId: PluginId,
  state: PluginConfigState,
): PluginConfig {
  return {
    plugins: {
      ...config.plugins,
      [pluginId]: state,
    },
  };
}

function validateConfigPatch(patch: PluginConfigPatch): PluginConfigState["values"] {
  const values = patch.values ?? {};
  const title =
    values.title == null ? undefined : getRequiredString(values.title);
  const privacy =
    values.privacy == null
      ? undefined
      : getRequiredString(values.privacy);

  if (privacy !== undefined && privacy !== "private" && privacy !== "unlisted") {
    throw new PluginRuntimeError(
      "validation",
      "Privacy must be private or unlisted.",
      422,
    );
  }

  return {
    ...(title === undefined ? {} : { title }),
    ...(privacy === undefined ? {} : { privacy }),
  };
}

function getRequiredString(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw new PluginRuntimeError(
    "validation",
    "Plugin configuration values must be non-empty strings.",
    422,
  );
}

function getStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
