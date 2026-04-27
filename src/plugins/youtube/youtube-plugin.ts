import {
  buildYouTubeAuthStatus,
  saveYouTubeConfig,
} from "../../config/youtube-config.js";
import {
  createYouTubeStreamService,
  type YouTubeProcessRunner,
  type YouTubeStreamService,
  type YouTubeStreamStartInput,
} from "../../media/youtube-stream-service.js";
import type { FfmpegAvailability } from "../../media/youtube-runtime.js";
import type {
  YouTubeBroadcastLifecycle,
  YouTubePersistedStreamConfig,
  YouTubePrivacyStatus,
  YouTubeStreamHealth,
} from "../../types/youtube-streaming.js";
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
  createYouTubeLiveApi,
  type YouTubeLiveApi,
} from "./youtube-live-api.js";
import {
  createYouTubeOAuthService,
  type YouTubeOAuthService,
  type YouTubeOAuthServiceOptions,
} from "./youtube-oauth.js";

export type YouTubePluginOptions = YouTubeOAuthServiceOptions & {
  liveApiFactory?: () => YouTubeLiveApi;
  ffmpegAvailability?: () => Promise<FfmpegAvailability>;
  processRunner?: YouTubeProcessRunner;
  resolveCameraSource?: () => Promise<string | null>;
};

const YOUTUBE_PLUGIN_ID: PluginId = "youtube-streaming";

export function createYouTubePlugin(
  options: YouTubePluginOptions = {},
): PluginModule {
  let streamService: YouTubeStreamService | null = null;
  let localStreamConfig: ReturnType<typeof extractStreamConfig> | null = null;

  function getStreamService(context: PluginActionContext): YouTubeStreamService {
    localStreamConfig ??= extractStreamConfig(
      getPluginState(context.config, YOUTUBE_PLUGIN_ID).values,
    );
    const oauthService = createYouTubeOAuthService({
      ...options,
      now: options.now ?? context.now,
    });
    streamService ??= createYouTubeStreamService({
      now: options.now ?? context.now,
      oauth: oauthService,
      youtube: options.liveApiFactory?.() ?? createAuthenticatedLiveApi(oauthService),
      ffmpegAvailability: options.ffmpegAvailability,
      processRunner: options.processRunner,
      resolveCameraSource: options.resolveCameraSource,
      loadStreamConfig: async () => localStreamConfig ?? {},
      saveStreamConfig: async (streamConfig) => {
        const latest = context.config;
        const current = getPluginState(latest, YOUTUBE_PLUGIN_ID);
        const verified = await context.saveConfig(
          setPluginState(latest, YOUTUBE_PLUGIN_ID, {
            ...current,
            values: {
              ...current.values,
              ...streamConfig,
            },
          }),
        );

        localStreamConfig = extractStreamConfig(
          getPluginState(verified, YOUTUBE_PLUGIN_ID).values,
        );

        return localStreamConfig;
      },
    });

    return streamService;
  }

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
        share: buildShare(state.values),
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

      if (
        actionId === "stream.setup" ||
        actionId === "stream.start" ||
        actionId === "stream.stop" ||
        actionId === "stream.status" ||
        actionId === "start" ||
        actionId === "stop"
      ) {
        const state = getPluginState(context.config, YOUTUBE_PLUGIN_ID);

        if (!state.enabled) {
          throw new PluginRuntimeError("disabled", "Plugin is disabled.", 409);
        }

        const service = getStreamService(context);

        if (actionId === "stream.setup") {
          const result = await safeStreamCall(() =>
            service.setup(parseStreamBody(body, state.values)),
          );
          return buildActionResult(context, actionId, {
            accepted: result.accepted,
            stream: result.status,
            status: pluginStatusFromStream(context, result.status),
          });
        }

        if (actionId === "stream.start" || actionId === "start") {
          const result = await safeStreamCall(() =>
            service.start(parseStreamBody(body, state.values)),
          );
          return buildActionResult(context, actionId, {
            accepted: result.accepted,
            stream: result.status,
            status: pluginStatusFromStream(context, result.status),
          });
        }

        if (actionId === "stream.stop" || actionId === "stop") {
          const result = await safeStreamCall(() =>
            service.stop(parseStopBody(body)),
          );
          return buildActionResult(context, actionId, {
            accepted: result.accepted,
            stream: result.status,
            status: pluginStatusFromStream(context, result.status),
          });
        }

        const status = await service.getStatus();
        return buildActionResult(context, actionId, {
          accepted: true,
          stream: status,
          status: pluginStatusFromStream(context, status),
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

function createAuthenticatedLiveApi(oauthService: YouTubeOAuthService): YouTubeLiveApi {
  async function resolveApi(): Promise<YouTubeLiveApi> {
    return createYouTubeLiveApi({
      auth: await oauthService.createAuthenticatedClient(),
    });
  }

  return {
    async setupBroadcast(input) {
      return (await resolveApi()).setupBroadcast(input);
    },
    async getStreamIngestion(streamId) {
      return (await resolveApi()).getStreamIngestion(streamId);
    },
    async getStreamStatus(streamId) {
      return (await resolveApi()).getStreamStatus(streamId);
    },
    async transition(input) {
      return (await resolveApi()).transition(input);
    },
    async transitionWhenActive(input) {
      return (await resolveApi()).transitionWhenActive(input);
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
        { label: "Public", value: "public" },
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
      id: "stream.setup",
      label: "Set Up Stream",
      enabled,
      disabledReason: enabled ? null : "Plugin is disabled.",
    },
    {
      id: "stream.start",
      label: "Start",
      enabled,
      disabledReason: enabled ? null : "Plugin is disabled.",
    },
    {
      id: "stream.stop",
      label: "Stop",
      enabled,
      disabledReason: enabled ? null : "Plugin is disabled.",
    },
    {
      id: "stream.status",
      label: "Status",
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

  if (
    privacy !== undefined &&
    privacy !== "private" &&
    privacy !== "unlisted" &&
    privacy !== "public"
  ) {
    throw new PluginRuntimeError(
      "validation",
      "Privacy must be private, unlisted, or public.",
      422,
    );
  }

  return {
    ...(title === undefined ? {} : { title }),
    ...(privacy === undefined ? {} : { privacy }),
  };
}

function extractStreamConfig(
  values: Record<string, unknown>,
): YouTubePersistedStreamConfig {
  return {
    ...(getOptionalString(values.streamId) ? { streamId: getOptionalString(values.streamId) } : {}),
    ...(getOptionalString(values.broadcastId)
      ? { broadcastId: getOptionalString(values.broadcastId) }
      : {}),
    ...(getOptionalString(values.title) ? { title: getOptionalString(values.title) } : {}),
    ...(getPrivacyValue(values.privacy) ? { privacy: getPrivacyValue(values.privacy) } : {}),
    ...(getLifecycleValue(values.lifecycle)
      ? { lifecycle: getLifecycleValue(values.lifecycle) }
      : {}),
    ...(getHealthValue(values.streamHealth)
      ? { streamHealth: getHealthValue(values.streamHealth) }
      : {}),
    ...(getOptionalString(values.watchUrl)
      ? { watchUrl: getOptionalString(values.watchUrl) }
      : {}),
  };
}

function buildShare(values: Record<string, unknown>): PluginSummary["share"] {
  const watchUrl = getOptionalString(values.watchUrl);
  const title = getOptionalString(values.title);

  return {
    available: Boolean(watchUrl),
    url: watchUrl ?? null,
    label: title ?? null,
  };
}

function parseStreamBody(
  body: unknown,
  values: Record<string, unknown>,
): YouTubeStreamStartInput {
  const input = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
  const title = getOptionalString(input.title) ?? getOptionalString(values.title);
  const privacy = getPrivacyValue(input.privacy) ?? getPrivacyValue(values.privacy);
  const confirmPublic = input.confirmPublic === true;

  return {
    ...(title ? { title } : {}),
    ...(privacy ? { privacy } : {}),
    confirmPublic,
  };
}

function parseStopBody(body: unknown): { reason?: "user" | "shutdown" | "failure" } {
  const input = typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
  const reason = input.reason;

  if (reason === "shutdown" || reason === "failure" || reason === "user") {
    return { reason };
  }

  return { reason: "user" };
}

async function safeStreamCall<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new PluginRuntimeError(
      "validation",
      error instanceof Error ? error.message : "YouTube stream action failed.",
      422,
    );
  }
}

function pluginStatusFromStream(
  context: PluginActionContext,
  stream: { broadcastLifecycle: string; process: { state: string; reason: string | null } },
): PluginStatus {
  const failed = stream.process.state === "failed";
  return {
    pluginId: YOUTUBE_PLUGIN_ID,
    state: failed ? "needs-configuration" : "enabled",
    message: failed
      ? stream.process.reason ?? "YouTube streaming is unavailable."
      : `YouTube stream is ${stream.broadcastLifecycle}.`,
    updatedAt: context.now(),
  };
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getPrivacyValue(value: unknown): YouTubePrivacyStatus | undefined {
  return value === "private" || value === "unlisted" || value === "public"
    ? value
    : undefined;
}

function getLifecycleValue(value: unknown): YouTubeBroadcastLifecycle | undefined {
  return value === "not-created" ||
    value === "created" ||
    value === "ready" ||
    value === "testing" ||
    value === "live" ||
    value === "complete" ||
    value === "error"
    ? value
    : undefined;
}

function getHealthValue(value: unknown): YouTubeStreamHealth | undefined {
  return value === "unknown" ||
    value === "inactive" ||
    value === "ready" ||
    value === "active" ||
    value === "error"
    ? value
    : undefined;
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
