import type { PluginActionResult } from "../../../src/types/plugins.js";
import type {
  YouTubeAuthStatus,
  YouTubePrivacyStatus,
  YouTubeStreamingStatus,
} from "../../../src/types/youtube-streaming.js";
import { invokePluginAction } from "./plugin-api.js";

const YOUTUBE_PLUGIN_ID = "youtube-streaming";

type YouTubeActionResult = PluginActionResult & {
  auth?: YouTubeAuthStatus;
  message?: string;
  stream?: YouTubeStreamingStatus;
};

export type YouTubeStreamCommandInput = {
  confirmPublic?: boolean;
  privacy?: YouTubePrivacyStatus;
  title?: string;
};

export async function fetchYouTubeStreamingStatus(
  signal?: AbortSignal,
): Promise<YouTubeStreamingStatus> {
  const result = await invokePluginAction<YouTubeActionResult>(
    YOUTUBE_PLUGIN_ID,
    "stream.status",
    {},
    signal,
  );
  return requireStreamStatus(result);
}

export async function beginYouTubeAuth(): Promise<{
  auth: YouTubeAuthStatus | null;
  authUrl: string | null;
}> {
  const result = await invokePluginAction<YouTubeActionResult>(
    YOUTUBE_PLUGIN_ID,
    "auth.begin",
    {},
  );

  return {
    auth: result.auth ?? null,
    authUrl: isSafeBrowserUrl(result.message) ? result.message : null,
  };
}

export async function refreshYouTubeAuth(): Promise<YouTubeAuthStatus | null> {
  const result = await invokePluginAction<YouTubeActionResult>(
    YOUTUBE_PLUGIN_ID,
    "auth.refresh",
    {},
  );
  return result.auth ?? null;
}

export async function revokeYouTubeAuth(): Promise<YouTubeAuthStatus | null> {
  const result = await invokePluginAction<YouTubeActionResult>(
    YOUTUBE_PLUGIN_ID,
    "auth.revoke",
    {},
  );
  return result.auth ?? null;
}

export async function setupYouTubeStreaming(
  input: YouTubeStreamCommandInput = {},
): Promise<YouTubeStreamingStatus> {
  const result = await invokePluginAction<YouTubeActionResult>(
    YOUTUBE_PLUGIN_ID,
    "stream.setup",
    sanitizeCommandInput(input),
  );
  return requireStreamStatus(result);
}

export async function startYouTubeStreaming(
  input: YouTubeStreamCommandInput = {},
): Promise<YouTubeStreamingStatus> {
  const result = await invokePluginAction<YouTubeActionResult>(
    YOUTUBE_PLUGIN_ID,
    "stream.start",
    sanitizeCommandInput(input),
  );
  return requireStreamStatus(result);
}

export async function stopYouTubeStreaming(): Promise<YouTubeStreamingStatus> {
  const result = await invokePluginAction<YouTubeActionResult>(
    YOUTUBE_PLUGIN_ID,
    "stream.stop",
    { reason: "user" },
  );
  return requireStreamStatus(result);
}

function requireStreamStatus(
  result: YouTubeActionResult,
): YouTubeStreamingStatus {
  if (result.stream) {
    return result.stream;
  }

  throw new Error("YouTube streaming status was not returned.");
}

function sanitizeCommandInput(
  input: YouTubeStreamCommandInput,
): Record<string, unknown> {
  return {
    ...(input.title ? { title: input.title } : {}),
    ...(input.privacy ? { privacy: input.privacy } : {}),
    ...(input.confirmPublic === true ? { confirmPublic: true } : {}),
  };
}

function isSafeBrowserUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
