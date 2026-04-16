import { spawn, type ChildProcess } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";

import { loadCapabilitySnapshot } from "../camera/capability-snapshot.js";
import { resolveCameraAdapter } from "../camera/adapters/index.js";
import { resolveReolinkLiveStreams } from "../camera/reolink-live-streams.js";
import { loadCameraConfig } from "../config/camera-config.js";
import { writeDebugArtifact } from "../diagnostics/debug-capture.js";
import {
  MEDIAMTX_MAIN_PATH,
  MEDIAMTX_SUB_PATH,
  buildMediaMtxConfig,
  buildMediaMtxSourceMap,
  defaultMediaMtxConfigPath,
  writeMediaMtxConfig,
} from "./mediamtx-config.js";
import { ensureMediaMtxRuntime } from "./mediamtx-runtime.js";
import {
  buildFallbackOrder,
  buildLiveModes,
  pickPreferredMode,
} from "./live-view-modes.js";
import type {
  LiveMode,
  LiveViewBootstrap,
} from "../types/live-view.js";

export type MediaRelayHealth = {
  relay: "starting" | "ready" | "failed";
  reason: string | null;
};

let relayProcess: ChildProcess | null = null;
let relayHealth: MediaRelayHealth = {
  relay: "failed",
  reason: "Media relay not started",
};

export async function buildLiveViewBootstrap(
  requestHost: string,
): Promise<LiveViewBootstrap> {
  try {
    const config = await loadCameraConfig();
    const snapshot = await loadCapabilitySnapshot(config);
    const modes = buildLiveModes(snapshot);
    const liveStreams = snapshot.supportsLiveView
      ? resolveReolinkLiveStreams(config, snapshot)
      : null;
    const playbackHost = normalizePlaybackHost(requestHost);
    const hydratedModes = modes.map((mode) =>
      hydrateMode(mode, playbackHost, Boolean(liveStreams)),
    );
    const preferredMode = pickPreferredMode(hydratedModes);
    const fallbackOrder = buildFallbackOrder(hydratedModes);

    if (!preferredMode) {
      return await buildBootstrapFailure(
        hydratedModes,
        "No supported live-view mode is available",
      );
    }

    return {
      preferredModeId: preferredMode.id,
      fallbackOrder,
      modes: hydratedModes,
      diagnostics: {
        state: "connecting",
        currentModeId: preferredMode.id,
        nextFallbackModeId: fallbackOrder[1] ?? null,
        reason: null,
      },
    };
  } catch (error) {
    return buildBootstrapFailure([], classifyLiveViewFailure(error), error);
  }
}

export async function startMediaRelay(): Promise<void> {
  if (relayProcess && !relayProcess.killed) {
    return;
  }

  relayHealth = {
    relay: "starting",
    reason: null,
  };

  try {
    const config = await loadCameraConfig();
    const snapshot = await loadCapabilitySnapshot(config);

    if (!snapshot.supportsLiveView || snapshot.ports.rtsp <= 0) {
      relayHealth = {
        relay: "failed",
        reason: "Live view is unavailable for this camera",
      };
      return;
    }

    const streams = resolveReolinkLiveStreams(config, snapshot);
    const configPath = await writeMediaMtxConfig(buildMediaMtxSourceMap(streams));
    const executablePath = await ensureMediaMtxRuntime();

    const processRef = spawn(executablePath, [configPath], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    relayProcess = processRef;

    processRef.once("spawn", () => {
      relayHealth = {
        relay: "ready",
        reason: null,
      };
    });

    processRef.stdout?.on("data", () => undefined);
    processRef.stderr?.on("data", (chunk) => {
      const text = chunk.toString().trim();

      if (!text) {
        return;
      }

      relayHealth = {
        relay: "failed",
        reason: classifyLiveViewFailure(new Error(text)),
      };
    });

    processRef.once("exit", () => {
      relayProcess = null;
      relayHealth = {
        relay: "failed",
        reason: relayHealth.reason ?? "Media relay exited unexpectedly",
      };
    });
  } catch (error) {
    relayHealth = {
      relay: "failed",
      reason: classifyLiveViewFailure(error),
    };
  }
}

export function getMediaRelayHealth(): MediaRelayHealth {
  return { ...relayHealth };
}

export function classifyLiveViewFailure(error: unknown): string {
  // Use local classification
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("enoent") || message.includes("missing")) {
    return "Required live-view files are missing";
  }

  if (message.includes("unsupported")) {
    return "Camera firmware is not supported for live view";
  }

  if (message.includes("timed out") || message.includes("timeout")) {
    return "Live view timed out";
  }

  if (message.includes("access denied") || message.includes("eacces")) {
    return "Live view access was denied";
  }

  if (message.includes("snapshot") && message.includes("support")) {
    return "Snapshot fallback is unavailable";
  }

  return "Live view is unavailable";
}

export function classifyLiveViewFailureWithAdapter(
  error: unknown,
  model: string,
): string {
  // Try to use adapter classification first
  const adapter = resolveCameraAdapter({
    model,
    hardVer: "",
    firmVer: "",
  });

  if (adapter) {
    return adapter.classifyFailure("live-view", error);
  }

  // Fall back to local classification
  return classifyLiveViewFailure(error);
}

function hydrateMode(
  mode: LiveMode,
  playbackHost: string,
  hasLiveStreams: boolean,
): LiveMode {
  if (!mode.enabled) {
    return {
      ...mode,
      disabledReason:
        mode.transport === "snapshot"
          ? "Snapshot fallback is unavailable"
          : "Live transport is unavailable",
    };
  }

  const relayPath = mode.quality === "main" ? MEDIAMTX_MAIN_PATH : MEDIAMTX_SUB_PATH;

  return {
    ...mode,
    playback: {
      whepUrl:
        mode.transport !== "snapshot" && hasLiveStreams
          ? `http://${playbackHost}:8889/${relayPath}/whep`
          : null,
      hlsUrl:
        mode.transport !== "snapshot" && hasLiveStreams
          ? `http://${playbackHost}:8888/${relayPath}/index.m3u8`
          : null,
      snapshotUrl: `/api/live-view/snapshot/${mode.quality}`,
    },
  };
}

async function buildBootstrapFailure(
  modes: LiveMode[],
  reason: string,
  error?: unknown,
): Promise<LiveViewBootstrap> {
  await writeDebugArtifact({
    command: "live-view-bootstrap",
    endpoint: "/api/live-view",
    status: 503,
    responseBody: {
      reason,
      error:
        error instanceof Error
          ? {
              message: error.message,
            }
          : error,
      runtimeConfigExists: await pathExists(defaultMediaMtxConfigPath()),
      runtimeConfigPreview:
        modes.length > 0
          ? buildMediaMtxConfig({
              camera_main: "rtsp://[redacted]@camera/h264Preview_01_main",
              camera_sub: "rtsp://[redacted]@camera/h264Preview_01_sub",
            })
          : null,
    },
  });

  return {
    preferredModeId: null,
    fallbackOrder: [],
    modes,
    diagnostics: {
      state: "failed",
      currentModeId: null,
      nextFallbackModeId: null,
      reason,
    },
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function normalizePlaybackHost(requestHost: string): string {
  try {
    const url = new URL(`http://${requestHost}`);
    return url.hostname;
  } catch {
    return "127.0.0.1";
  }
}
