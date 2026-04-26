import {
  normalizePlayerError,
  type PlayerAttachment,
  type PlayerOptions,
} from "./player-contract.js";

const SNAPSHOT_FAILURE_MESSAGE = "Snapshot playback could not start";

export function attachSnapshotPlayer(
  image: HTMLImageElement,
  snapshotUrl: string,
  refreshMs = 1000,
  options: PlayerOptions = {},
): PlayerAttachment {
  let destroyed = false;
  let settled = false;
  let refreshTimer: number | null = null;
  let activeObjectUrl: string | null = null;
  let pendingObjectUrl: string | null = null;
  let activeRequest: AbortController | null = null;

  const releaseObjectUrl = (objectUrl: string | null) => {
    if (objectUrl !== null) {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleLoad = () => {
    if (pendingObjectUrl !== null) {
      releaseObjectUrl(activeObjectUrl);
      activeObjectUrl = pendingObjectUrl;
      pendingObjectUrl = null;
    }

    if (!settled) {
      settled = true;
      resolveReady?.();
    }
  };

  const handleError = () => {
    failRequest(SNAPSHOT_FAILURE_MESSAGE);
  };

  let resolveReady: (() => void) | null = null;
  let rejectReady: ((error: Error) => void) | null = null;

  const failRequest = (error: unknown) => {
    const reason = normalizePlayerError(error, SNAPSHOT_FAILURE_MESSAGE);

    if (!settled) {
      settled = true;
      rejectReady?.(new Error(reason));
    }

    if (!destroyed) {
      options.onError?.(reason);
    }
  };

  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;

    const renderSnapshot = async () => {
      if (destroyed || activeRequest !== null) {
        return;
      }

      const request = new AbortController();
      activeRequest = request;

      try {
        const response = await fetch(snapshotUrl, {
          cache: "no-store",
          signal: request.signal,
        });

        if (!response.ok) {
          throw new Error(
            `Snapshot request failed with HTTP ${response.status}`,
          );
        }

        const objectUrl = URL.createObjectURL(await response.blob());

        if (destroyed) {
          releaseObjectUrl(objectUrl);
          return;
        }

        releaseObjectUrl(pendingObjectUrl);
        pendingObjectUrl = objectUrl;
        image.src = objectUrl;
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        failRequest(error);
      } finally {
        if (activeRequest === request) {
          activeRequest = null;
        }
      }
    };

    image.decoding = "async";
    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);

    void renderSnapshot();
    refreshTimer = window.setInterval(renderSnapshot, refreshMs);
  });

  return {
    ready,
    destroy() {
      destroyed = true;

      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
      }

      activeRequest?.abort();
      activeRequest = null;
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
      releaseObjectUrl(pendingObjectUrl);
      pendingObjectUrl = null;
      releaseObjectUrl(activeObjectUrl);
      activeObjectUrl = null;
      image.removeAttribute("src");
    },
  };
}
