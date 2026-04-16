import { buildCapabilitySnapshot } from "../capability-snapshot.js";
import { probeCamera } from "../reolink-discovery.js";
import { resolveReolinkLiveStreams } from "../reolink-live-streams.js";
import { createReolinkPtzService } from "../reolink-ptz.js";
import { createReolinkSettingsService } from "../reolink-settings.js";
import type { CameraIdentity } from "../../types/reolink.js";
import type { CameraAdapter } from "./camera-adapter.js";

let registeredAdapters: CameraAdapter[] = [];

export function registerCameraAdapters(): readonly CameraAdapter[] {
  if (registeredAdapters.length === 0) {
    registeredAdapters = [createRegisteredRlc423sAdapter()];
  }

  return registeredAdapters;
}

export function getRegisteredCameraAdapters(): readonly CameraAdapter[] {
  return registerCameraAdapters();
}

export function resolveCameraAdapter(
  identity: CameraIdentity,
): CameraAdapter | undefined {
  return registerCameraAdapters().find((adapter) =>
    adapter.matchesIdentity(identity),
  );
}

function createRegisteredRlc423sAdapter(): CameraAdapter {
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

  return String(error);
}
