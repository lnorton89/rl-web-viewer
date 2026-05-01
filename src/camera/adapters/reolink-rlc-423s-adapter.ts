import { buildCapabilitySnapshot } from "../capability-snapshot.js";
import { probeCamera } from "../reolink-discovery.js";
import { resolveReolinkLiveStreams } from "../reolink-live-streams.js";
import { createReolinkPtzService } from "../reolink-ptz.js";
import { createReolinkSettingsService } from "../reolink-settings.js";
import type { CameraAdapter } from "./camera-adapter.js";

export function createRlc423sAdapter(): CameraAdapter {
  return {
    adapterId: "reolink-rlc-423s",
    matchesIdentity(identity) {
      return identity.model.toLowerCase().includes("rlc-423s");
    },
    probe: probeCamera,
    buildCapabilitySnapshot,
    resolveLiveStreams: resolveReolinkLiveStreams,
    createPtzService: createReolinkPtzService,
    createSettingsService: createReolinkSettingsService,
    classifyFailure(scope, error) {
      const message = `${scope} ${normalizeErrorMessage(error)}`.toLowerCase();

      if (message.includes("enoent") || message.includes("missing")) {
        return "Required files are missing";
      }

      if (
        message.includes("401") ||
        message.includes("unauthorized") ||
        message.includes("authentication") ||
        message.includes("invalid credentials") ||
        message.includes("bad credentials")
      ) {
        return "Camera authentication failed. Update the camera password in settings.";
      }

      if (
        message.includes("eacces") ||
        message.includes("denied") ||
        message.includes("forbidden")
      ) {
        return "Access was denied";
      }

      if (
        message.includes("timed out") ||
        message.includes("timeout") ||
        message.includes("etimedout")
      ) {
        return "Request timed out";
      }

      if (
        message.includes("unsupported") ||
        message.includes("model mismatch") ||
        message.includes("no live stream adapter")
      ) {
        return "Firmware or model is unsupported";
      }

      return "Operation failed";
    },
  };
}

function normalizeErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : "";
    const message =
      "message" in error && typeof error.message === "string" ? error.message : "";

    return `${code} ${message}`.trim();
  }

  return String(error);
}
