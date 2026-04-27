import {
  loadPluginConfig,
  savePluginConfig,
} from "../config/plugin-config.js";
import {
  PluginRuntimeError,
  type PluginActionContext,
  type PluginModule,
  type PluginRuntime,
} from "./plugin-contract.js";
import {
  createYouTubePlugin,
  type YouTubePluginOptions,
} from "./youtube/youtube-plugin.js";

type PluginRuntimeOptions = {
  configPath?: string;
  now?: () => string;
  youtube?: YouTubePluginOptions;
};

let registeredPlugins: PluginModule[] = [];

export function registerPlugins(): readonly PluginModule[] {
  if (registeredPlugins.length === 0) {
    registeredPlugins = [createYouTubePlugin()];
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
  const plugins = options.youtube
    ? [createYouTubePlugin({ ...options.youtube, now })]
    : getRegisteredPlugins();

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
    const plugin = plugins.find((candidate) => candidate.id === pluginId);

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
        plugins.map((plugin) => plugin.getSummary(context)),
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
