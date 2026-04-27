import { google } from "googleapis";

import type {
  YouTubeBroadcastLifecycle,
  YouTubePrivacyStatus,
  YouTubeStreamHealth,
} from "../../types/youtube-streaming.js";

export type YouTubeLiveApiSetupInput = {
  title: string;
  privacy: YouTubePrivacyStatus;
};

export type YouTubeLiveResourceMetadata = {
  streamId: string;
  broadcastId: string;
  title: string;
  privacy: YouTubePrivacyStatus;
  lifecycle: YouTubeBroadcastLifecycle;
  streamHealth: YouTubeStreamHealth;
  watchUrl: string;
};

export type YouTubeStreamIngestion = {
  ingestionUrl: string;
  streamName: string;
};

export type YouTubeLiveApi = {
  setupBroadcast(input: YouTubeLiveApiSetupInput): Promise<YouTubeLiveResourceMetadata>;
  getStreamIngestion(streamId: string): Promise<YouTubeStreamIngestion>;
  getStreamStatus(streamId: string): Promise<{ streamId: string; health: YouTubeStreamHealth }>;
  transition(input: {
    broadcastId: string;
    status: "testing" | "live" | "complete";
  }): Promise<Omit<YouTubeLiveResourceMetadata, "streamId" | "streamHealth">>;
  transitionWhenActive(input: {
    broadcastId: string;
    streamId: string;
    status: "testing" | "live";
  }): Promise<Omit<YouTubeLiveResourceMetadata, "streamId" | "streamHealth">>;
};

export type YouTubeLiveApiOptions = {
  youtubeClient?: YouTubeClientLike;
  auth?: unknown;
  now?: () => string;
};

export type YouTubeClientLike = {
  liveStreams: {
    insert(input: Record<string, unknown>): Promise<{ data: Record<string, unknown> }>;
    list(input: Record<string, unknown>): Promise<{ data: { items?: Array<Record<string, unknown>> } }>;
  };
  liveBroadcasts: {
    insert(input: Record<string, unknown>): Promise<{ data: Record<string, unknown> }>;
    bind(input: Record<string, unknown>): Promise<{ data: Record<string, unknown> }>;
    transition(input: Record<string, unknown>): Promise<{ data: Record<string, unknown> }>;
    list(input: Record<string, unknown>): Promise<{ data: { items?: Array<Record<string, unknown>> } }>;
  };
};

export class YouTubeLiveApiError extends Error {
  readonly code: "stream-inactive" | "youtube-api";
  readonly safeMessage: string;

  constructor(code: "stream-inactive" | "youtube-api", safeMessage: string) {
    super(safeMessage);
    this.name = "YouTubeLiveApiError";
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

export function createYouTubeLiveApi(
  options: YouTubeLiveApiOptions = {},
): YouTubeLiveApi {
  const youtubeClient =
    options.youtubeClient ??
    (google.youtube({
      version: "v3",
      auth: options.auth as never,
    }) as unknown as YouTubeClientLike);
  const now = options.now ?? (() => new Date().toISOString());

  return {
    async setupBroadcast(input) {
      try {
        const stream = await youtubeClient.liveStreams.insert({
          part: ["snippet", "cdn", "contentDetails", "status"],
          requestBody: {
            snippet: { title: input.title },
            cdn: {
              ingestionType: "rtmp",
              resolution: "variable",
              frameRate: "variable",
            },
            contentDetails: { isReusable: true },
          },
        });
        const streamId = requireString(stream.data.id, "YouTube stream id is missing.");
        const broadcast = await youtubeClient.liveBroadcasts.insert({
          part: ["snippet", "contentDetails", "status"],
          requestBody: {
            snippet: {
              title: input.title,
              scheduledStartTime: now(),
            },
            status: {
              privacyStatus: input.privacy,
              selfDeclaredMadeForKids: false,
            },
            contentDetails: {
              enableAutoStart: false,
              enableAutoStop: false,
              monitorStream: { enableMonitorStream: true },
            },
          },
        });
        const broadcastId = requireString(
          broadcast.data.id,
          "YouTube broadcast id is missing.",
        );
        const binding = await youtubeClient.liveBroadcasts.bind({
          id: broadcastId,
          streamId,
          part: ["id", "snippet", "contentDetails", "status"],
        });
        const bound = binding.data;

        return {
          streamId,
          broadcastId,
          title: getSnippetTitle(bound, input.title),
          privacy: getPrivacy(bound, input.privacy),
          lifecycle: getLifecycle(bound, "ready"),
          streamHealth: getStreamHealth(stream.data, "ready"),
          watchUrl: buildWatchUrl(broadcastId),
        };
      } catch (error) {
        throw normalizeYouTubeError(error);
      }
    },
    async getStreamIngestion(streamId) {
      const stream = await getStream(youtubeClient, streamId);
      const info = getObject(getObject(stream.cdn).ingestionInfo);
      const ingestionUrl =
        getOptionalString(info.rtmpsIngestionAddress) ??
        getOptionalString(info.ingestionAddress);
      const streamName = getOptionalString(info.streamName);

      if (!ingestionUrl || !streamName) {
        throw new YouTubeLiveApiError(
          "youtube-api",
          "YouTube stream ingestion details are unavailable.",
        );
      }

      return { ingestionUrl, streamName };
    },
    async getStreamStatus(streamId) {
      const stream = await getStream(youtubeClient, streamId);
      return {
        streamId,
        health: getStreamHealth(stream, "unknown"),
      };
    },
    async transition(input) {
      try {
        const result = await youtubeClient.liveBroadcasts.transition({
          id: input.broadcastId,
          broadcastStatus: input.status,
          part: ["id", "snippet", "contentDetails", "status"],
        });
        return buildBroadcastMetadata(result.data, input.broadcastId, input.status);
      } catch (error) {
        throw normalizeYouTubeError(error);
      }
    },
    async transitionWhenActive(input) {
      const streamStatus = await this.getStreamStatus(input.streamId);

      if (streamStatus.health !== "active") {
        throw new YouTubeLiveApiError(
          "stream-inactive",
          "YouTube has not detected active stream input yet.",
        );
      }

      return this.transition({
        broadcastId: input.broadcastId,
        status: input.status,
      });
    },
  };
}

async function getStream(
  youtubeClient: YouTubeClientLike,
  streamId: string,
): Promise<Record<string, unknown>> {
  const result = await youtubeClient.liveStreams.list({
    id: [streamId],
    part: ["id", "snippet", "cdn", "status"],
  });
  const stream = result.data.items?.[0];

  if (!stream) {
    throw new YouTubeLiveApiError("youtube-api", "YouTube stream was not found.");
  }

  return stream;
}

function buildBroadcastMetadata(
  data: Record<string, unknown>,
  fallbackId: string,
  fallbackLifecycle: YouTubeBroadcastLifecycle,
): Omit<YouTubeLiveResourceMetadata, "streamId" | "streamHealth"> {
  const broadcastId = getOptionalString(data.id) ?? fallbackId;
  return {
    broadcastId,
    title: getSnippetTitle(data, "YouTube Live"),
    privacy: getPrivacy(data, "unlisted"),
    lifecycle: getLifecycle(data, fallbackLifecycle),
    watchUrl: buildWatchUrl(broadcastId),
  };
}

function normalizeYouTubeError(error: unknown): YouTubeLiveApiError {
  if (error instanceof YouTubeLiveApiError) {
    return error;
  }

  return new YouTubeLiveApiError("youtube-api", "YouTube Live API request failed.");
}

function getSnippetTitle(data: Record<string, unknown>, fallback: string): string {
  return getOptionalString(getObject(data.snippet).title) ?? fallback;
}

function getPrivacy(
  data: Record<string, unknown>,
  fallback: YouTubePrivacyStatus,
): YouTubePrivacyStatus {
  const value = getOptionalString(getObject(data.status).privacyStatus);
  return value === "private" || value === "unlisted" || value === "public"
    ? value
    : fallback;
}

function getLifecycle(
  data: Record<string, unknown>,
  fallback: YouTubeBroadcastLifecycle,
): YouTubeBroadcastLifecycle {
  const value = getOptionalString(getObject(data.status).lifeCycleStatus);
  if (
    value === "created" ||
    value === "ready" ||
    value === "testing" ||
    value === "live" ||
    value === "complete"
  ) {
    return value;
  }

  return fallback;
}

function getStreamHealth(
  data: Record<string, unknown>,
  fallback: YouTubeStreamHealth,
): YouTubeStreamHealth {
  const value = getOptionalString(getObject(data.status).streamStatus);
  if (value === "inactive" || value === "ready" || value === "active" || value === "error") {
    return value;
  }

  if (value === "noData") {
    return "inactive";
  }

  return fallback;
}

function getObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requireString(value: unknown, message: string): string {
  const resolved = getOptionalString(value);

  if (!resolved) {
    throw new YouTubeLiveApiError("youtube-api", message);
  }

  return resolved;
}

function buildWatchUrl(broadcastId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(broadcastId)}`;
}
