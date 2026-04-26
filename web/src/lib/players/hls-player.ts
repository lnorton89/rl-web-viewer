import Hls from "hls.js";

import {
  normalizePlayerError,
  type PlayerAttachment,
  type PlayerOptions,
} from "./player-contract.js";

const HLS_FAILURE_MESSAGE = "HLS playback could not start";
const NATIVE_HLS_MIME_TYPE = "application/vnd.apple.mpegurl";

export function attachHlsPlayer(
  video: HTMLVideoElement,
  playlistUrl: string,
  options: PlayerOptions = {},
): PlayerAttachment {
  let destroyed = false;
  let settled = false;
  let hls: Hls | null = null;

  video.autoplay = true;
  video.playsInline = true;

  const ready = new Promise<void>((resolve, reject) => {
    const handleLoadedData = () => {
      if (destroyed || settled) {
        return;
      }

      settled = true;
      void video.play().catch(() => {});
      resolve();
    };

    const fail = (error: unknown) => {
      const reason = normalizePlayerError(error, HLS_FAILURE_MESSAGE);

      if (!settled) {
        settled = true;
        reject(new Error(reason));
      }

      if (!destroyed) {
        options.onError?.(reason);
      }
    };

    const handleVideoError = () => {
      fail(video.error?.message ?? HLS_FAILURE_MESSAGE);
    };

    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleVideoError);

    if (video.canPlayType(NATIVE_HLS_MIME_TYPE) !== "") {
      video.src = playlistUrl;
      video.load();
      return;
    }

    if (!Hls.isSupported()) {
      queueMicrotask(() => {
        fail("This browser does not support HLS playback");
      });
      return;
    }

    hls = new Hls();
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        hls?.destroy();
        hls = null;
        fail(data.details ?? data.type ?? HLS_FAILURE_MESSAGE);
      }
    });
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls?.loadSource(playlistUrl);
    });
    hls.attachMedia(video);
  });

  return {
    ready,
    destroy() {
      destroyed = true;
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    },
  };
}
