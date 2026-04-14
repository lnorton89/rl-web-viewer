import type { CapabilitySnapshot } from "./capability-snapshot.js";
import type { CameraConfig } from "../config/camera-config.js";

export const REOLINK_MAIN_STREAM_SUFFIX = "h264Preview_01_main";
export const REOLINK_SUB_STREAM_SUFFIX = "h264Preview_01_sub";

export type ReolinkLiveStream = {
  quality: "main" | "sub";
  rtspPath: string;
  sourceUrl: string;
};

export type ResolvedReolinkLiveStreams = {
  main: ReolinkLiveStream;
  sub: ReolinkLiveStream;
};

export function resolveReolinkLiveStreams(
  config: CameraConfig,
  snapshot: CapabilitySnapshot,
): ResolvedReolinkLiveStreams {
  if (!snapshot.supportsLiveView || snapshot.ports.rtsp <= 0) {
    throw new Error("Persisted capability snapshot does not support live view");
  }

  const model = (snapshot.identity.model || config.modelHint).toLowerCase();

  if (!model.includes("rlc-423s")) {
    throw new Error(
      `No live stream adapter is available for ${snapshot.identity.model || config.modelHint}`,
    );
  }

  return {
    main: buildStream(config, snapshot, "main", REOLINK_MAIN_STREAM_SUFFIX),
    sub: buildStream(config, snapshot, "sub", REOLINK_SUB_STREAM_SUFFIX),
  };
}

function buildStream(
  config: CameraConfig,
  snapshot: CapabilitySnapshot,
  quality: "main" | "sub",
  rtspPath: string,
): ReolinkLiveStream {
  const cameraUrl = new URL(config.baseUrl);
  const username = encodeURIComponent(config.username);
  const password = encodeURIComponent(config.password);
  const credentials = `${username}:${password}`;
  const port = snapshot.ports.rtsp > 0 ? snapshot.ports.rtsp : 554;

  return {
    quality,
    rtspPath,
    sourceUrl: `rtsp://${credentials}@${cameraUrl.hostname}:${port}/${rtspPath}`,
  };
}
