import {
  buildYouTubeAuthStatus,
  saveYouTubeConfig,
} from "../../config/youtube-config.js";
import type { PluginConfigState } from "../../config/plugin-config.js";
import type {
  PluginActionResult,
  PluginConfigField,
  PluginConfigPatch,
  PluginConfigResult,
  PluginId,
  PluginStatus,
  PluginSummary,
} from "../../types/plugins.js";
import {
  PluginRuntimeError,
  type PluginActionContext,
  type PluginModule,
} from "../plugin-contract.js";
import {
  createYouTubeOAuthService,
  type YouTubeOAuthServiceOptions,
} from "./youtube-oauth.js";

export type YouTubePluginOptions = YouTubeOAuthServiceOptions;

const YOUTUBE_PLUGIN_ID: PluginId = "youtube-streaming";

export function createYouTubePlugin(
  options: YouTubePluginOptions = {},
): PluginModule {
  return {
    id: YOUTUBE_PLUGIN_ID,
    async getSummary(context) {
      const status = await buildPluginStatus(context, options);
      const state = getPluginState(context.config, YOUTUBE_PLUGIN_ID);
      const authStatus = await buildYouTubeAuthStatus({
        configPath: options.configPath,
        tokensPath: options.tokensPath,
        now: options.now ?? context.now,
      });

      return {
        id: YOUTUBE_PLUGIN_ID,
        label: "YouTube Streaming",
        description: "Stream the local camera feed to YouTube Live.",
        enabled: state.enabled,
        capabilities: ["configuration", "actions", "share-metadata"],
        status,
        actions: buildActions(state.enabled, authStatus.connected),
        config: buildConfigFields(state.values, authStatus.configured),
        share: {
          available: false,
          url: null,
          label: null,
        },
      } satisfies PluginSummary;
    },
    getStatus(context) {
      return buildPluginStatus(context, options);
    },
    async enable(patch, context) {
      const current = getPluginState(context.config, YOUTUBE_PLUGIN_ID);
      const config = setPluginState(context.config, YOUTUBE_PLUGIN_ID, {
        enabled: true,
        values: {
          ...current.values,
          ...validateConfigValues(patch),
        },
      });
      const verified = await context.saveConfig(config);

      return buildConfigResult(context, verified);
    },
    async disable(patch, context) {
      const current = getPluginState(context.config, YOUTUBE_PLUGIN_ID);
      const config = setPluginState(context.config, YOUTUBE_PLUGIN_ID, {
        enabled: false,
        values: {
          ...current.values,
          ...validateConfigValues(patch),
        },
      });
      const verified = await context.saveConfig(config);

      return buildConfigResult(context, verified);
    },
    async configure(patch, context) {
      const current = getPluginState(context.config, YOUTUBE_PLUGIN_ID);
      const values = patch.values ?? {};
      const oauthClient = values.oauthClient;

      if (oauthClient !== undefined) {
        await saveYouTubeConfig(oauthClient, options.configPath);
      }

      const config = setPluginState(context.config, YOUTUBE_PLUGIN_ID, {
        ...current,
        values: {
          ...current.values,
          ...validateConfigValues(patch),
        },
      });
      const verified = await context.saveConfig(config);

      return buildConfigResult(context, verified);
    },
    async invokeAction(actionId, body, context) {
      const service = createYouTubeOAuthService({
        ...options,
        now: options.now ?? context.now,
      });

      if (actionId === "auth.begin") {
        const result = await service.beginAuth(parseRedirectBody(body));
        return buildActionResult(context, actionId, {
          message: result.authUrl,
          auth: result.status,
        });
      }

      if (actionId === "auth.callback") {
        const result = await service.completeCallback(parseCallbackBody(body));
        return buildActionResult(context, actionId, {
          auth: result.status,
        });
      }

      if (actionId === "auth.refresh") {
        const result = await service.refresh();
        return buildActionResult(context, actionId, {
          auth: result.status,
        });
      }

      if (actionId === "auth.revoke") {
        const result = await service.revoke();
        return buildActionResult(context, actionId, {
          auth: result.status,
        });
      }

      if (actionId === "start" || actionId === "stop") {
        const state = getPluginState(context.config, YOUTUBE_PLUGIN_ID);

        if (!state.enabled) {
          throw new PluginRuntimeError("disabled", "Plugin is disabled.", 409);
        }

        return buildActionResult(context, actionId, {
          message: `${actionId} accepted by plugin runtime.`,
        });
      }

      throw new PluginRuntimeError(
        "unsupported",
        `Unsupported action: ${actionId}`,
        409,
      );
    },
  };
}

async function buildPluginStatus(
  context: PluginActionContext,
  options: YouTubePluginOptions,
): Promise<PluginStatus> {
  const state = getPluginState(context.config, YOUTUBE_PLUGIN_ID);
  const authStatus = await buildYouTubeAuthStatus({
    configPath: options.configPath,
    tokensPath: options.tokensPath,
    now: options.now ?? context.now,
  });

  if (!state.enabled) {
    return {
      pluginId: YOUTUBE_PLUGIN_ID,
      state: "disabled",
      message: "Enable the plugin before invoking streaming actions.",
      updatedAt: context.now(),
    };
  }

  if (!authStatus.configured) {
    return {
      pluginId: YOUTUBE_PLUGIN_ID,
      state: "needs-configuration",
      message: "Import a Desktop OAuth client before connecting YouTube.",
      updatedAt: context.now(),
    };
  }

  return {
    pluginId: YOUTUBE_PLUGIN_ID,
    state: "enabled",
    message: authStatus.connected
      ? "YouTube account is connected."
      : "YouTube OAuth client is configured but not connected.",
    updatedAt: context.now(),
  };
}

function buildConfigFields(
  values: Record<string, unknown>,
  oauthConfigured: boolean,
): readonly PluginConfigField[] {
  return [
    {
      id: "title",
      label: "Title",
      kind: "text",
      required: true,
      value: getStringValue(values.title, "Camera Live Stream"),
    },
    {
      id: "privacy",
      label: "Privacy",
      kind: "select",
      required: true,
      value: getStringValue(values.privacy, "unlisted"),
      options: [
        { label: "Private", value: "private" },
        { label: "Unlisted", value: "unlisted" },
      ],
    },
    {
      id: "oauthConfigured",
      label: "OAuth Client",
      kind: "toggle",
      required: true,
      value: oauthConfigured,
    },
  ];
}

function buildActions(
  enabled: boolean,
  connected: boolean,
): PluginSummary["actions"] {
  return [
    {
      id: "auth.begin",
      label: "Connect",
      enabled: true,
      disabledReason: null,
    },
    {
      id: "auth.refresh",
      label: "Refresh",
      enabled: connected,
      disabledReason: connected ? null : "YouTube account is not connected.",
    },
    {
      id: "auth.revoke",
      label: "Disconnect",
      enabled: connected,
      disabledReason: connected ? null : "YouTube account is not connected.",
    },
    {
      id: "start",
      label: "Start",
      enabled,
      disabledReason: enabled ? null : "Plugin is disabled.",
    },
    {
      id: "stop",
      label: "Stop",
      enabled,
      disabledReason: enabled ? null : "Plugin is disabled.",
    },
  ];
}

function buildConfigResult(
  context: PluginActionContext,
  config: PluginActionContext["config"],
): PluginConfigResult {
  return {
    ok: true,
    pluginId: YOUTUBE_PLUGIN_ID,
    verified: true,
    status: buildStaticPluginStatus(context, config),
  };
}

function buildActionResult(
  context: PluginActionContext,
  actionId: string,
  extra: Record<string, unknown>,
): PluginActionResult {
  return {
    ok: true,
    pluginId: YOUTUBE_PLUGIN_ID,
    actionId,
    accepted: true,
    status: buildStaticPluginStatus(context, context.config),
    ...extra,
  };
}

function buildStaticPluginStatus(
  context: PluginActionContext,
  config: PluginActionContext["config"],
): PluginStatus {
  const state = getPluginState(config, YOUTUBE_PLUGIN_ID);

  return {
    pluginId: YOUTUBE_PLUGIN_ID,
    state: state.enabled ? "enabled" : "disabled",
    message: state.enabled
      ? "YouTube streaming controls are available."
      : "Enable the plugin before invoking streaming actions.",
    updatedAt: context.now(),
  };
}

function getPluginState(
  config: PluginActionContext["config"],
  pluginId: PluginId,
): PluginConfigState {
  return {
    enabled: config.plugins[pluginId]?.enabled ?? false,
    values: config.plugins[pluginId]?.values ?? {},
  };
}

function setPluginState(
  config: PluginActionContext["config"],
  pluginId: PluginId,
  state: PluginConfigState,
): PluginActionContext["config"] {
  return {
    plugins: {
      ...config.plugins,
      [pluginId]: state,
    },
  };
}

function validateConfigValues(
  patch: PluginConfigPatch,
): PluginConfigState["values"] {
  const values = patch.values ?? {};
  const title =
    values.title == null ? undefined : getRequiredString(values.title);
  const privacy =
    values.privacy == null ? undefined : getRequiredString(values.privacy);

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

function parseRedirectBody(body: unknown): { redirectUri?: string } {
  if (typeof body !== "object" || body === null) {
    return {};
  }

  const redirectUri = "redirectUri" in body ? body.redirectUri : undefined;

  if (redirectUri === undefined) {
    return {};
  }

  if (typeof redirectUri === "string" && redirectUri.length > 0) {
    return { redirectUri };
  }

  throw new PluginRuntimeError(
    "validation",
    "redirectUri must be a non-empty string.",
    422,
  );
}

function parseCallbackBody(body: unknown): { code: string; state: string } {
  if (typeof body !== "object" || body === null) {
    throw new PluginRuntimeError(
      "validation",
      "OAuth callback body must be an object.",
      422,
    );
  }

  const code = "code" in body ? body.code : undefined;
  const state = "state" in body ? body.state : undefined;

  if (
    typeof code === "string" &&
    code.length > 0 &&
    typeof state === "string" &&
    state.length > 0
  ) {
    return { code, state };
  }

  throw new PluginRuntimeError(
    "validation",
    "OAuth callback code and state are required.",
    422,
  );
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
