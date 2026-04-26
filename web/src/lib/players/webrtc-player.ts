import {
  MediaMTXWebRTCReader,
  type MediaMTXWebRTCReaderConfig,
} from "./mediamtx-webrtc-reader.js";
import {
  normalizePlayerError,
  type PlayerAttachment,
  type PlayerOptions,
} from "./player-contract.js";

const WEBRTC_FAILURE_MESSAGE = "WebRTC playback could not start";

export function attachWebRtcPlayer(
  video: HTMLVideoElement,
  whepUrl: string,
  options: PlayerOptions = {},
): PlayerAttachment {
  let destroyed = false;
  let settled = false;
  let reader: MediaMTXWebRTCReader | null = null;
  let mediaStream: MediaStream | null = null;

  const ready = new Promise<void>((resolve, reject) => {
    const fail = (error: unknown) => {
      const reason = normalizePlayerError(error, WEBRTC_FAILURE_MESSAGE);

      if (!settled) {
        settled = true;
        reject(new Error(reason));
      }

      if (!destroyed) {
        options.onError?.(reason);
      }
    };

    const config: MediaMTXWebRTCReaderConfig = {
      url: whepUrl,
      onError: (reason) => {
        reader?.close();
        fail(reason);
      },
      onTrack: (event) => {
        if (destroyed) {
          return;
        }

        video.autoplay = true;
        video.playsInline = true;

        const nextStream =
          event.streams[0] ??
          mediaStream ??
          new MediaStream(event.track ? [event.track] : []);

        if (
          event.track &&
          !nextStream.getTracks().some((track) => track.id === event.track.id)
        ) {
          nextStream.addTrack(event.track);
        }

        mediaStream = nextStream;

        if (video.srcObject !== nextStream) {
          video.srcObject = nextStream;
        }

        void video.play().catch(() => {});

        if (!settled) {
          settled = true;
          resolve();
        }
      },
    };

    reader = new MediaMTXWebRTCReader(config);
  });

  return {
    ready,
    destroy() {
      destroyed = true;
      reader?.close();
      mediaStream = null;
      video.pause();
      video.srcObject = null;
      video.removeAttribute("src");
      video.load();
    },
  };
}
