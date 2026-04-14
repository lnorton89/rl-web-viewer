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

  const ready = new Promise<void>((resolve, reject) => {
    const fail = (error: unknown) => {
      const reason = normalizePlayerError(error, SNAPSHOT_FAILURE_MESSAGE);

      if (!settled) {
        settled = true;
        reject(new Error(reason));
      }

      if (!destroyed) {
        options.onError?.(reason);
      }
    };

    const renderSnapshot = () => {
      if (destroyed) {
        return;
      }

      const url = new URL(snapshotUrl, window.location.href);
      url.searchParams.set("_ts", Date.now().toString());
      image.src = url.toString();
    };

    image.decoding = "async";
    image.addEventListener("load", () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });
    image.addEventListener("error", () => {
      fail(SNAPSHOT_FAILURE_MESSAGE);
    });

    renderSnapshot();
    refreshTimer = window.setInterval(renderSnapshot, refreshMs);
  });

  return {
    ready,
    destroy() {
      destroyed = true;

      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
      }

      image.removeAttribute("src");
    },
  };
}
