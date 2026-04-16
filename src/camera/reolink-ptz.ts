import { loadCameraConfig, type CameraConfig } from "../config/camera-config.js";
import {
  loadCapabilitySnapshot,
  type CapabilitySnapshot,
} from "./capability-snapshot.js";
import { writeDebugArtifact } from "../diagnostics/debug-capture.js";
import { ReolinkSession } from "./reolink-session.js";
import type { ReolinkApiResponse, ReolinkRequest } from "../types/reolink.js";
import type {
  FocusResult,
  IrisResult,
  MotionStartResult,
  MotionStopResult,
  PresetRecallResult,
  PtzBootstrap,
  PtzPreset,
  PtzService,
  PtzStopReason,
  PtzDirection,
  PtzZoomDirection,
  SpeedResult,
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
  wait?: (ms: number) => Promise<void>;
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
  const wait = options.wait ?? ((ms: number) => delay(ms, setTimer));

  let activeMotion: PtzDirection | null = null;
  let watchdogTimer: TimeoutHandle | null = null;

  async function getBootstrap(): Promise<PtzBootstrap> {
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
  }

  async function startMotion(direction: PtzDirection): Promise<MotionStartResult> {
    const snapshot = await resolveSnapshot();
    assertSupportsPtzControl(snapshot);

    const request = [
      createPtzCtrlRequest(directionToOperation(direction), {
        speed: DEFAULT_MOVE_SPEED,
      }),
    ] as const;

    await sendPtzCtrlRequest({
      request,
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });

    activeMotion = direction;
    resetWatchdog();

    return {
      direction,
      stopDeadlineMs: DEFAULT_STOP_DEADLINE_MS,
    };
  }

  async function stopMotion(reason: PtzStopReason): Promise<MotionStopResult> {
    clearWatchdog();

    if (!activeMotion) {
      return {
        stopped: false,
        reason,
      };
    }

    const request = [createPtzCtrlRequest("Stop")] as const;

    await sendPtzCtrlRequest({
      request,
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });

    activeMotion = null;

    return {
      stopped: true,
      reason,
    };
  }

  async function pulseZoom(direction: PtzZoomDirection): Promise<ZoomPulseResult> {
    const snapshot = await resolveSnapshot();
    assertSupportsPtzControl(snapshot);

    const request = [
      createPtzCtrlRequest(zoomDirectionToOperation(direction), {
        speed: DEFAULT_MOVE_SPEED,
      }),
    ] as const;

    await sendPtzCtrlRequest({
      request,
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });
    await wait(DEFAULT_ZOOM_PULSE_MS);
    await sendPtzCtrlRequest({
      request: [createPtzCtrlRequest("Stop")] as const,
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });

    return {
      direction,
      pulseMs: DEFAULT_ZOOM_PULSE_MS,
    };
  }

  async function recallPreset(presetId: number): Promise<PresetRecallResult> {
    const snapshot = await resolveSnapshot();

    if (!snapshot.supportsPtzPreset) {
      throw new Error("Persisted capability snapshot does not support PTZ presets");
    }

    const presets = await loadEnabledPresets({
      resolveConfig,
      resolveSession,
      snapshot,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });
    const targetPreset = presets.find((preset) => preset.id === presetId);

    if (!targetPreset) {
      throw new Error(`PTZ preset ${presetId} is not available`);
    }

    const request = [
      createPtzCtrlRequest("ToPos", {
        id: targetPreset.id,
        speed: DEFAULT_PRESET_SPEED,
      }),
    ] as const;

    await sendPtzCtrlRequest({
      request,
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });

    return {
      presetId: targetPreset.id,
    };
  }

  async function setFocus(value: number): Promise<FocusResult> {
    const snapshot = await resolveSnapshot();
    assertSupportsPtzControl(snapshot);

    const clampedValue = Math.max(0, Math.min(100, value));

    const request = [
      {
        cmd: "SetFocus",
        action: 0,
        param: {
          channel: DEFAULT_CHANNEL,
          focus: clampedValue,
          op: "SetFocus",
        },
      },
    ] as const;

    await sendPtzCtrlRequest({
      request,
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });

    return { focusValue: clampedValue };
  }

  async function setIris(value: number): Promise<IrisResult> {
    const snapshot = await resolveSnapshot();
    assertSupportsPtzControl(snapshot);

    const clampedValue = Math.max(0, Math.min(100, value));

    const request = [
      {
        cmd: "SetIris",
        action: 0,
        param: {
          channel: DEFAULT_CHANNEL,
          iris: clampedValue,
          op: "SetIris",
        },
      },
    ] as const;

    await sendPtzCtrlRequest({
      request,
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });

    return { irisValue: clampedValue };
  }

  async function setSpeed(value: number): Promise<SpeedResult> {
    const snapshot = await resolveSnapshot();
    assertSupportsPtzControl(snapshot);

    const clampedValue = Math.max(1, Math.min(10, value));

    const request = [
      {
        cmd: "SetPtzSpeed",
        action: 0,
        param: {
          channel: DEFAULT_CHANNEL,
          speed: clampedValue,
          op: "SetPtzSpeed",
        },
      },
    ] as const;

    await sendPtzCtrlRequest({
      request,
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });

    return { speedValue: clampedValue };
  }

  function resetWatchdog(): void {
    clearWatchdog();
    watchdogTimer = setTimer(() => {
      void stopMotion("watchdog");
    }, DEFAULT_STOP_DEADLINE_MS);
  }

  function clearWatchdog(): void {
    if (watchdogTimer) {
      clearTimer(watchdogTimer);
      watchdogTimer = null;
    }
  }

  return {
    getBootstrap,
    startMotion,
    stopMotion,
    pulseZoom,
    recallPreset,
    setFocus,
    setIris,
    setSpeed,
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

type PtzCtrlOperation =
  | "Up"
  | "Down"
  | "Left"
  | "Right"
  | "Stop"
  | "ZoomInc"
  | "ZoomDec"
  | "ToPos";

async function sendPtzCtrlRequest(input: {
  request: readonly ReolinkRequest[];
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}): Promise<void> {
  const [config, session] = await Promise.all([
    input.resolveConfig(),
    input.resolveSession(),
  ]);
  const response =
    await session.requestJson<readonly ReolinkApiResponse[]>(input.request);
  const firstResponse = response[0];

  if (firstResponse?.code === 0) {
    return;
  }

  await captureDebugArtifact({
    config,
    command: "PtzCtrl",
    requestBody: input.request,
    responseBody: response,
    status: firstResponse?.code ?? 500,
    debugArtifactDirectory: input.debugArtifactDirectory,
  });

  const detail =
    typeof firstResponse?.error?.detail === "string"
      ? `: ${firstResponse.error.detail}`
      : "";
  throw new Error(`PTZ command failed${detail}`);
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

function createPtzCtrlRequest(
  op: PtzCtrlOperation,
  extraParam: Record<string, unknown> = {},
): ReolinkRequest {
  return {
    cmd: "PtzCtrl",
    action: 0,
    param: {
      channel: DEFAULT_CHANNEL,
      op,
      ...extraParam,
    },
  };
}

function directionToOperation(direction: PtzDirection): PtzCtrlOperation {
  switch (direction) {
    case "up":
      return "Up";
    case "down":
      return "Down";
    case "left":
      return "Left";
    case "right":
      return "Right";
  }
}

function zoomDirectionToOperation(direction: PtzZoomDirection): PtzCtrlOperation {
  switch (direction) {
    case "in":
      return "ZoomInc";
    case "out":
      return "ZoomDec";
  }
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

function assertSupportsPtzControl(snapshot: CapabilitySnapshot): void {
  if (!snapshot.supportsPtzControl) {
    throw new Error("Persisted capability snapshot does not support PTZ control");
  }
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

function delay(ms: number, setTimer: typeof setTimeout): Promise<void> {
  return new Promise((resolve) => {
    setTimer(resolve, ms);
  });
}
