import type { CameraIdentity } from "../../types/reolink.js";
import type { CameraAdapter } from "./camera-adapter.js";
import { createRlc423sAdapter } from "./reolink-rlc-423s-adapter.js";

let registeredAdapters: CameraAdapter[] = [];

export function registerCameraAdapters(): readonly CameraAdapter[] {
  if (registeredAdapters.length === 0) {
    registeredAdapters = [createRlc423sAdapter()];
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
