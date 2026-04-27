import { useCallback, useEffect, useState } from "react";

import type { YouTubeStreamingStatus } from "../../../src/types/youtube-streaming.js";
import {
  beginYouTubeAuth,
  fetchYouTubeStreamingStatus,
  refreshYouTubeAuth,
  revokeYouTubeAuth,
  setupYouTubeStreaming,
  startYouTubeStreaming,
  stopYouTubeStreaming,
  type YouTubeStreamCommandInput,
} from "../lib/youtube-streaming-api.js";

export function useYouTubeStreaming(): {
  authUrl: string | null;
  beginAuth(): Promise<void>;
  error: string | null;
  isLoading: boolean;
  pendingAction: string | null;
  refresh(): Promise<void>;
  refreshAuth(): Promise<void>;
  revokeAuth(): Promise<void>;
  setup(input?: YouTubeStreamCommandInput): Promise<void>;
  start(input?: YouTubeStreamCommandInput): Promise<void>;
  status: YouTubeStreamingStatus | null;
  stop(): Promise<void>;
} {
  const [status, setStatus] = useState<YouTubeStreamingStatus | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const nextStatus = await fetchYouTubeStreamingStatus(signal);

      if (signal?.aborted) {
        return;
      }

      setStatus(nextStatus);
    } catch (nextError) {
      if (signal?.aborted) {
        return;
      }

      setError(
        getErrorMessage(nextError, "YouTube streaming status could not be loaded."),
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    void refresh(abortController.signal);
    return () => abortController.abort();
  }, [refresh]);

  const runAction = useCallback(
    async (
      actionId: string,
      action: () => Promise<YouTubeStreamingStatus | void>,
      options: { refreshAfter?: boolean } = { refreshAfter: true },
    ) => {
      setPendingAction(actionId);
      setError(null);

      try {
        const nextStatus = await action();

        if (nextStatus) {
          setStatus(nextStatus);
        }

        if (options.refreshAfter !== false) {
          await refresh();
        }
      } catch (nextError) {
        setError(getErrorMessage(nextError, "YouTube streaming action failed."));
      } finally {
        setPendingAction(null);
      }
    },
    [refresh],
  );

  const beginAuth = useCallback(
    () =>
      runAction(
        "auth.begin",
        async () => {
          const result = await beginYouTubeAuth();
          setAuthUrl(result.authUrl);
        },
        { refreshAfter: true },
      ),
    [runAction],
  );

  const refreshAuth = useCallback(
    () =>
      runAction("auth.refresh", async () => {
        await refreshYouTubeAuth();
      }),
    [runAction],
  );

  const revokeAuth = useCallback(
    () =>
      runAction("auth.revoke", async () => {
        await revokeYouTubeAuth();
        setAuthUrl(null);
      }),
    [runAction],
  );

  const setup = useCallback(
    (input: YouTubeStreamCommandInput = {}) =>
      runAction("stream.setup", () => setupYouTubeStreaming(input)),
    [runAction],
  );

  const start = useCallback(
    (input: YouTubeStreamCommandInput = {}) =>
      runAction("stream.start", () => startYouTubeStreaming(input)),
    [runAction],
  );

  const stop = useCallback(
    () => runAction("stream.stop", () => stopYouTubeStreaming()),
    [runAction],
  );

  return {
    authUrl,
    beginAuth,
    error,
    isLoading,
    pendingAction,
    refresh: () => refresh(),
    refreshAuth,
    revokeAuth,
    setup,
    start,
    status,
    stop,
  };
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim() !== ""
  ) {
    return error.message;
  }

  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }

  return fallbackMessage;
}
