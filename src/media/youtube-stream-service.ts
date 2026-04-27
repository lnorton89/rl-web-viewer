import { spawn, type ChildProcess } from "node:child_process";

import { loadCapabilitySnapshot } from "../camera/capability-snapshot.js";
import { resolveReolinkLiveStreams } from "../camera/reolink-live-streams.js";
import { loadCameraConfig } from "../config/camera-config.js";
import type { YouTubeAuthStatus } from "../types/youtube-streaming.js";
import type {
  YouTubeBroadcastLifecycle,
  YouTubePersistedStreamConfig,
  YouTubePrivacyStatus,
  YouTubeStreamingStatus,
  YouTubeStreamHealth,
} from "../types/youtube-streaming.js";
import {
  buildYouTubeFfmpegArgs,
  redactSecretBearingString,
  redactYouTubeEgressArgs,
} from "./youtube-ffmpeg-config.js";
import {
  getFfmpegAvailability,
  type FfmpegAvailability,
} from "./youtube-runtime.js";
import type { YouTubeLiveApi } from "../plugins/youtube/youtube-live-api.js";

export type YouTubeStreamStartInput = {
  title?: string;
  privacy?: YouTubePrivacyStatus;
  confirmPublic?: boolean;
};

export type YouTubeStreamStopInput = {
  reason?: "user" | "shutdown" | "failure";
};

export type YouTubeStreamActionResult = {
  accepted: boolean;
  status: YouTubeStreamingStatus;
};

export type YouTubeProcessLike = {
  pid?: number | null;
  killed?: boolean;
  stdout?: { on(eventName: string, handler: (...args: unknown[]) => void): unknown } | null;
  stderr?: { on(eventName: string, handler: (...args: unknown[]) => void): unknown } | null;
  once(eventName: "spawn" | "exit" | "error", handler: (...args: unknown[]) => void): unknown;
  kill(signal?: NodeJS.Signals): boolean;
};

export type YouTubeProcessRunner = {
  spawn(command: string, args: string[], options: {
    stdio: ["ignore", "pipe", "pipe"];
    windowsHide: true;
  }): YouTubeProcessLike;
};

export type YouTubeStreamServiceOptions = {
  now?: () => string;
  oauth: {
    getStatus(): Promise<YouTubeAuthStatus>;
  };
  youtube: YouTubeLiveApi;
  ffmpegAvailability?: () => Promise<FfmpegAvailability>;
  processRunner?: YouTubeProcessRunner;
  resolveCameraSource?: () => Promise<string | null>;
  loadStreamConfig: () => Promise<YouTubePersistedStreamConfig>;
  saveStreamConfig: (
    config: YouTubePersistedStreamConfig,
  ) => Promise<YouTubePersistedStreamConfig>;
};

type ProcessState = {
  state: "stopped" | "starting" | "running" | "failed";
  pid: number | null;
  reason: string | null;
  diagnostics: string[];
};

export type YouTubeStreamService = {
  setup(input: YouTubeStreamStartInput): Promise<YouTubeStreamActionResult>;
  start(input: YouTubeStreamStartInput): Promise<YouTubeStreamActionResult>;
  stop(input?: YouTubeStreamStopInput): Promise<YouTubeStreamActionResult>;
  getStatus(): Promise<YouTubeStreamingStatus>;
};

export function createYouTubeStreamService(
  options: YouTubeStreamServiceOptions,
): YouTubeStreamService {
  const now = options.now ?? (() => new Date().toISOString());
  const ffmpegAvailability = options.ffmpegAvailability ?? getFfmpegAvailability;
  const processRunner =
    options.processRunner ??
    ({
      spawn(command, args, spawnOptions) {
        return spawn(command, args, spawnOptions) as unknown as YouTubeProcessLike;
      },
    } satisfies YouTubeProcessRunner);
  const resolveCameraSource = options.resolveCameraSource ?? resolveDefaultCameraSource;
  let runningProcess: YouTubeProcessLike | null = null;
  let processState: ProcessState = {
    state: "stopped",
    pid: null,
    reason: null,
    diagnostics: [],
  };

  async function persistSafePatch(
    patch: YouTubePersistedStreamConfig,
  ): Promise<YouTubePersistedStreamConfig> {
    const current = await options.loadStreamConfig();
    return options.saveStreamConfig({
      ...current,
      ...patch,
    });
  }

  async function setup(input: YouTubeStreamStartInput): Promise<YouTubeStreamActionResult> {
    const auth = await options.oauth.getStatus();
    if (!auth.configured || !auth.connected) {
      return {
        accepted: false,
        status: await buildStatus({
          auth,
          reason: "Connect YouTube before setting up a stream.",
        }),
      };
    }

    validatePublicPrivacy(input);
    const current = await options.loadStreamConfig();
    const title = input.title ?? current.title ?? "Camera Live Stream";
    const privacy = input.privacy ?? current.privacy ?? "unlisted";
    const metadata = await options.youtube.setupBroadcast({ title, privacy });
    await persistSafePatch({
      streamId: metadata.streamId,
      broadcastId: metadata.broadcastId,
      title: metadata.title,
      privacy: metadata.privacy,
      lifecycle: metadata.lifecycle,
      streamHealth: metadata.streamHealth,
      watchUrl: metadata.watchUrl,
    });

    return {
      accepted: true,
      status: await buildStatus({ auth }),
    };
  }

  async function start(input: YouTubeStreamStartInput): Promise<YouTubeStreamActionResult> {
    const auth = await options.oauth.getStatus();
    const availability = await ffmpegAvailability();
    const source = await resolveCameraSource();
    const readiness = await getReadiness(auth, availability, source);

    if (readiness) {
      processState = {
        ...processState,
        state: "failed",
        reason: readiness,
      };
      return {
        accepted: false,
        status: await buildStatus({ auth, reason: readiness }),
      };
    }

    validatePublicPrivacy(input);

    if (runningProcess && processState.state === "running") {
      return {
        accepted: true,
        status: await buildStatus({ auth }),
      };
    }

    let config = await options.loadStreamConfig();

    if (!config.streamId || !config.broadcastId) {
      const setupResult = await setup(input);

      if (!setupResult.accepted) {
        return setupResult;
      }

      config = await options.loadStreamConfig();
    }

    if (!config.streamId || !config.broadcastId) {
      return unavailable(auth, "Create a YouTube stream before starting.");
    }

    const ingestion = await options.youtube.getStreamIngestion(config.streamId);

    if (!ingestion.streamName) {
      return unavailable(auth, "YouTube stream key is unavailable.");
    }

    const args = buildYouTubeFfmpegArgs({
      inputRtspUrl: source as string,
      ingestionUrl: ingestion.ingestionUrl,
      streamName: ingestion.streamName,
    });
    const redactedArgs = redactYouTubeEgressArgs(args);
    processState = {
      state: "starting",
      pid: null,
      reason: null,
      diagnostics: [`ffmpeg ${redactedArgs.join(" ")}`],
    };
    const processRef = processRunner.spawn(
      availability.executablePath as string,
      args,
      {
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    runningProcess = processRef;
    processState = {
      ...processState,
      state: "running",
      pid: processRef.pid ?? null,
    };

    processRef.stderr?.on("data", (chunk: unknown) => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      appendDiagnostic(text);
    });
    processRef.once("exit", () => {
      runningProcess = null;
      processState = {
        ...processState,
        state: processState.state === "failed" ? "failed" : "stopped",
        pid: null,
        reason: processState.reason ?? "FFmpeg process exited.",
      };
    });
    processRef.once("error", (error: unknown) => {
      runningProcess = null;
      processState = {
        ...processState,
        state: "failed",
        pid: null,
        reason: classifyProcessFailure(error),
      };
    });

    const stream = await options.youtube.getStreamStatus(config.streamId);
    await persistSafePatch({ streamHealth: stream.health });

    if (stream.health === "active") {
      const broadcast = await options.youtube.transition({
        broadcastId: config.broadcastId,
        status: "live",
      });
      await persistSafePatch({
        lifecycle: broadcast.lifecycle,
        watchUrl: broadcast.watchUrl,
        privacy: broadcast.privacy,
        title: broadcast.title,
      });
    }

    return {
      accepted: true,
      status: await buildStatus({ auth }),
    };
  }

  async function stop(
    input: YouTubeStreamStopInput = {},
  ): Promise<YouTubeStreamActionResult> {
    const auth = await options.oauth.getStatus();
    const reason = input.reason ?? "user";
    const processRef = runningProcess;

    if (processRef && !processRef.killed) {
      processRef.kill();
    }

    runningProcess = null;
    processState = {
      ...processState,
      state: "stopped",
      pid: null,
      reason: `Stopped by ${reason}.`,
    };

    const config = await options.loadStreamConfig();

    if (
      config.broadcastId &&
      (config.lifecycle === "live" || config.lifecycle === "testing")
    ) {
      const broadcast = await options.youtube.transition({
        broadcastId: config.broadcastId,
        status: "complete",
      });
      await persistSafePatch({
        lifecycle: broadcast.lifecycle,
        watchUrl: broadcast.watchUrl,
        privacy: broadcast.privacy,
        title: broadcast.title,
      });
    }

    return {
      accepted: true,
      status: await buildStatus({ auth }),
    };
  }

  async function buildStatus(input: {
    auth: YouTubeAuthStatus;
    reason?: string | null;
  }): Promise<YouTubeStreamingStatus> {
    const config = await options.loadStreamConfig();
    return {
      auth: input.auth,
      title: config.title ?? null,
      privacy: config.privacy ?? "unlisted",
      broadcastLifecycle: input.reason
        ? "error"
        : config.lifecycle ?? "not-created",
      streamHealth: input.reason ? "unknown" : config.streamHealth ?? "unknown",
      share: {
        available: Boolean(config.watchUrl),
        watchUrl: config.watchUrl ?? null,
        label: config.title ?? null,
      },
      process: {
        state: input.reason ? "failed" : processState.state,
        pid: processState.pid,
        reason: input.reason ?? processState.reason,
        diagnostics: processState.diagnostics.slice(-5),
      },
      updatedAt: now(),
    };
  }

  async function unavailable(
    auth: YouTubeAuthStatus,
    reason: string,
  ): Promise<YouTubeStreamActionResult> {
    processState = {
      ...processState,
      state: "failed",
      reason,
    };
    return {
      accepted: false,
      status: await buildStatus({ auth, reason }),
    };
  }

  function appendDiagnostic(text: string): void {
    const sanitized = redactSecretBearingString(text.trim());

    if (!sanitized) {
      return;
    }

    processState = {
      ...processState,
      diagnostics: [...processState.diagnostics, sanitized].slice(-10),
    };
  }

  return {
    setup,
    start,
    stop,
    async getStatus() {
      return buildStatus({ auth: await options.oauth.getStatus() });
    },
  };
}

async function resolveDefaultCameraSource(): Promise<string | null> {
  try {
    const config = await loadCameraConfig();
    const snapshot = await loadCapabilitySnapshot(config);
    return resolveReolinkLiveStreams(config, snapshot).main.sourceUrl;
  } catch {
    return null;
  }
}

async function getReadiness(
  auth: YouTubeAuthStatus,
  availability: FfmpegAvailability,
  source: string | null,
): Promise<string | null> {
  if (!auth.configured || !auth.connected) {
    if (!availability.available) {
      return availability.reason ?? "FFmpeg is unavailable.";
    }

    return "Connect YouTube before starting a stream.";
  }

  if (!availability.available) {
    return availability.reason ?? "FFmpeg is unavailable.";
  }

  if (source === null || source.length === 0) {
    return "Camera RTSP source is unavailable.";
  }

  return null;
}

function validatePublicPrivacy(input: YouTubeStreamStartInput): void {
  if (input.privacy === "public" && input.confirmPublic !== true) {
    throw new Error("Public broadcasts require explicit confirmation.");
  }
}

function classifyProcessFailure(error: unknown): string {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("enoent")) {
    return "FFmpeg executable was not found.";
  }

  if (message.includes("eacces")) {
    return "FFmpeg executable cannot be run.";
  }

  return "FFmpeg process failed.";
}
