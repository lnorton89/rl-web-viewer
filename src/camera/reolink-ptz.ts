import { loadCameraConfig, type CameraConfig } from "../config/camera-config.js";
import {
  loadCapabilitySnapshot,
  type CapabilitySnapshot,
} from "./capability-snapshot.js";
import { writeDebugArtifact } from "../diagnostics/debug-capture.js";
import { ReolinkSession } from "./reolink-session.js";
import type { ReolinkApiResponse, ReolinkRequest } from "../types/reolink.js";
import type {
  MotionStartResult,
  MotionStopResult,
  PresetRecallResult,
  PtzBootstrap,
  PtzPreset,
  PtzService,
  PtzStopReason,
  PtzDirection,
  PtzZoomDirection,
  ZoomPulseResult,
} from "../types/ptz.js";

const DEFAULT_CHANNEL = 0;
const DEFAULT_STOP_DEADLINE_MS = 5000;
const DEFAULT_ZOOM_PULSE_MS = 250;
const DEFAULT_MOVE_SPEED = 25;
const DEFAULT_PRESET_SPEED = 60;

type SessionLike = Pick<ReolinkSession, "requestJson">;

type TimeoutHandle = ReturnType<typeof setTimeout>;

type CreateReolinkPtzServiceOptions = {
  config?: CameraConfig;
  configPath?: string;
  snapshotPath?: string;
  session?: SessionLike;
  debugArtifactDirectory?: string;
  loadSnapshot?: (
    config: CameraConfig,
    snapshotPath?: string,
  ) => Promise<CapabilitySnapshot>;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
};

type PresetResponseValue = {
  PtzPreset?: unknown;
};

type PresetEntry = {
  enable?: unknown;
  id?: unknown;
  name?: unknown;
};

export function createReolinkPtzService(
  options: CreateReolinkPtzServiceOptions = {},
): PtzService {
  const resolveConfig = createConfigResolver(options);
  const resolveSnapshot = createSnapshotResolver(options, resolveConfig);
  const resolveSession = createSessionResolver(options, resolveConfig);
  const setTimer = options.setTimeout ?? globalThis.setTimeout;
  const clearTimer = options.clearTimeout ?? globalThis.clearTimeout;

  let activeMotion: PtzDirection | null = null;
  let watchdogTimer: TimeoutHandle | null = null;

  return {
    async getBootstrap(): Promise<PtzBootstrap> {
      const snapshot = await resolveSnapshot();
      const presets = snapshot.supportsPtzPreset
        ? await loadEnabledPresets({
            resolveConfig,
            resolveSession,
            snapshot,
            debugArtifactDirectory: options.debugArtifactDirectory,
          })
        : [];

      return {
        supportsPtzControl: snapshot.supportsPtzControl,
        supportsPtzPreset: snapshot.supportsPtzPreset,
        hasVisibleStop: true,
        stopDeadlineMs: DEFAULT_STOP_DEADLINE_MS,
        zoomPulseMs: DEFAULT_ZOOM_PULSE_MS,
        presets,
      };
    },

    async startMotion(_direction: PtzDirection): Promise<MotionStartResult> {
      throw new Error("PTZ motion control is not available yet");
    },

    async stopMotion(reason: PtzStopReason): Promise<MotionStopResult> {
      if (watchdogTimer) {
        clearTimer(watchdogTimer);
        watchdogTimer = null;
      }

      if (!activeMotion) {
        return {
          stopped: false,
          reason,
        };
      }

      activeMotion = null;

      return {
        stopped: true,
        reason,
      };
    },

    async pulseZoom(_direction: PtzZoomDirection): Promise<ZoomPulseResult> {
      throw new Error("PTZ zoom control is not available yet");
    },

    async recallPreset(_presetId: number): Promise<PresetRecallResult> {
      throw new Error("PTZ preset recall is not available yet");
    },
  };
}

function createConfigResolver(
  options: CreateReolinkPtzServiceOptions,
): () => Promise<CameraConfig> {
  let configPromise: Promise<CameraConfig> | null = null;

  return async () => {
    configPromise ??=
      options.config
        ? Promise.resolve(options.config)
        : loadCameraConfig(options.configPath);
    return configPromise;
  };
}

function createSnapshotResolver(
  options: CreateReolinkPtzServiceOptions,
  resolveConfig: () => Promise<CameraConfig>,
): () => Promise<CapabilitySnapshot> {
  const loadSnapshotImpl = options.loadSnapshot ?? loadCapabilitySnapshot;

  return async () => {
    const config = await resolveConfig();
    return loadSnapshotImpl(config, options.snapshotPath);
  };
}

function createSessionResolver(
  options: CreateReolinkPtzServiceOptions,
  resolveConfig: () => Promise<CameraConfig>,
): () => Promise<SessionLike> {
  let sessionPromise: Promise<SessionLike> | null = null;

  return async () => {
    sessionPromise ??= options.session
      ? Promise.resolve(options.session)
      : resolveConfig().then((config) => new ReolinkSession(config));
    return sessionPromise;
  };
}

async function loadEnabledPresets(input: {
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  snapshot: CapabilitySnapshot;
  debugArtifactDirectory?: string;
}): Promise<PtzPreset[]> {
  if (!input.snapshot.supportsPtzPreset) {
    return [];
  }

  const [config, session] = await Promise.all([
    input.resolveConfig(),
    input.resolveSession(),
  ]);
  const request = [createPresetRequest()] as const;
  const response = await session.requestJson<readonly ReolinkApiResponse<PresetResponseValue>[]>(
    request,
  );
  const firstResponse = response[0];

  if (!firstResponse || firstResponse.code !== 0) {
    await captureDebugArtifact({
      config,
      command: "GetPtzPreset",
      requestBody: request,
      responseBody: response,
      status: firstResponse?.code ?? 500,
      debugArtifactDirectory: input.debugArtifactDirectory,
    });
    return [];
  }

  const presets = normalizePresetEntries(firstResponse.value?.PtzPreset);

  if (!presets) {
    await captureDebugArtifact({
      config,
      command: "GetPtzPreset",
      requestBody: request,
      responseBody: response,
      status: 422,
      debugArtifactDirectory: input.debugArtifactDirectory,
    });
    return [];
  }

  return presets;
}

function createPresetRequest(): ReolinkRequest {
  return {
    cmd: "GetPtzPreset",
    action: 1,
    param: {
      channel: DEFAULT_CHANNEL,
    },
  };
}

function normalizePresetEntries(value: unknown): PtzPreset[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const presets = value
    .map(normalizePresetEntry)
    .filter((preset): preset is PtzPreset => preset !== null);

  presets.sort((left, right) => left.id - right.id);
  return presets;
}

function normalizePresetEntry(entry: unknown): PtzPreset | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const preset = entry as PresetEntry;

  if (!isPresetEnabled(preset.enable)) {
    return null;
  }

  const id = normalizeInteger(preset.id);

  if (id === null) {
    return null;
  }

  const rawName = typeof preset.name === "string" ? preset.name.trim() : "";
  const name = rawName.length > 0 ? rawName : `Preset ${id}`;

  return {
    id,
    name,
  };
}

function isPresetEnabled(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }

  return false;
}

function normalizeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return Number(value);
  }

  return null;
}

async function captureDebugArtifact(input: {
  config: CameraConfig;
  command: string;
  requestBody: unknown;
  responseBody: unknown;
  status: number;
  debugArtifactDirectory?: string;
}): Promise<void> {
  if (!input.config.debugCapture) {
    return;
  }

  await writeDebugArtifact(
    {
      command: input.command,
      endpoint: new URL("/cgi-bin/api.cgi", withTrailingSlash(input.config.baseUrl)).toString(),
      status: input.status,
      requestBody: input.requestBody,
      responseBody: input.responseBody,
    },
    input.debugArtifactDirectory,
  );
}

function withTrailingSlash(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
