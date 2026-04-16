import { loadCameraConfig, type CameraConfig } from "../config/camera-config.js";
import {
  loadCapabilitySnapshot,
  type CapabilitySnapshot,
} from "./capability-snapshot.js";
import { writeDebugArtifact } from "../diagnostics/debug-capture.js";
import { ReolinkSession } from "./reolink-session.js";
import type { ReolinkApiResponse, ReolinkRequest } from "../types/reolink.js";
import {
  EDITABLE_SETTINGS_SECTION_IDS,
  SETTINGS_SECTION_IDS,
  SETTINGS_SECTION_META,
  SETTINGS_WRITE_STRATEGIES,
  createUnavailableSettingsBootstrap,
  getSectionFieldSpecs,
  type EditableSettingsSectionId,
  type ImageSettingsDraft,
  type ImageSettingsValue,
  type IspSettingsValue,
  type OsdSettingsDraft,
  type OsdSettingsValue,
  type SettingsApplyFailure,
  type SettingsApplySuccess,
  type SettingsBootstrap,
  type SettingsDiffRow,
  type SettingsSection,
  type SettingsSectionDraftMap,
  type SettingsSectionId,
  type SettingsSectionValueMap,
  type SettingsService,
  type StreamProfileValue,
  type StreamSettingsDraft,
  type StreamSettingsValue,
  type TimeSettingsDraft,
  type TimeSettingsValue,
} from "../types/settings.js";

const DEFAULT_CHANNEL = 0;

type SessionLike = Pick<ReolinkSession, "requestJson">;

type CreateReolinkSettingsServiceOptions = {
  config?: CameraConfig;
  configPath?: string;
  snapshotPath?: string;
  session?: SessionLike;
  debugArtifactDirectory?: string;
  loadSnapshot?: (
    config: CameraConfig,
    snapshotPath?: string,
  ) => Promise<CapabilitySnapshot>;
};

type TimeResponseValue = {
  Time?: {
    channel?: unknown;
    timeZone?: unknown;
    timeFmt?: unknown;
    hourFmt?: unknown;
    year?: unknown;
    mon?: unknown;
    day?: unknown;
    hour?: unknown;
    min?: unknown;
    sec?: unknown;
    Dst?: {
      enable?: unknown;
      offset?: unknown;
      startMon?: unknown;
      startWeek?: unknown;
      startWeekday?: unknown;
      startHour?: unknown;
      endMon?: unknown;
      endWeek?: unknown;
      endWeekday?: unknown;
      endHour?: unknown;
    };
  };
};

type NtpResponseValue = {
  Ntp?: {
    enable?: unknown;
    server?: unknown;
    port?: unknown;
    interval?: unknown;
  };
};

type ImageResponseValue = {
  Image?: {
    channel?: unknown;
    bright?: unknown;
    contrast?: unknown;
    hue?: unknown;
    saturation?: unknown;
    sharpen?: unknown;
  };
};

type OsdResponseValue = {
  Osd?: {
    channel?: unknown;
    osdChannel?: {
      enable?: unknown;
      name?: unknown;
      pos?: unknown;
    };
    osdTime?: {
      enable?: unknown;
      pos?: unknown;
    };
  };
};

type IspResponseValue = {
  Isp?: {
    channel?: unknown;
    dayNight?: unknown;
    backLight?: unknown;
    antiFlicker?: unknown;
    exposureMode?: unknown;
    nr3d?: unknown;
  };
};

type EncResponseValue = {
  Enc?: {
    channel?: unknown;
    audio?: unknown;
    mainStream?: {
      size?: unknown;
      frameRate?: unknown;
      bitRate?: unknown;
      profile?: unknown;
    };
    subStream?: {
      size?: unknown;
      frameRate?: unknown;
      bitRate?: unknown;
      profile?: unknown;
    };
  };
};

type SettingsReadState = {
  timeRaw: NonNullable<TimeResponseValue["Time"]>;
  ntpRaw: NonNullable<NtpResponseValue["Ntp"]>;
  imageRaw: NonNullable<ImageResponseValue["Image"]>;
  osdRaw: NonNullable<OsdResponseValue["Osd"]>;
  ispRaw: NonNullable<IspResponseValue["Isp"]>;
  encRaw: NonNullable<EncResponseValue["Enc"]>;
  time: TimeSettingsValue;
  osd: OsdSettingsValue;
  image: ImageSettingsValue;
  stream: StreamSettingsValue;
  isp: IspSettingsValue;
};

export function createReolinkSettingsService(
  options: CreateReolinkSettingsServiceOptions = {},
): SettingsService {
  const resolveConfig = createConfigResolver(options);
  const resolveSnapshot = createSnapshotResolver(options, resolveConfig);
  const resolveSession = createSessionResolver(options, resolveConfig);

  async function getBootstrap(): Promise<SettingsBootstrap> {
    const snapshot = await resolveSnapshot();

    if (!snapshot.supportsConfigRead) {
      return createUnavailableSettingsBootstrap();
    }

    const state = await readAllSettings({
      resolveConfig,
      resolveSession,
      debugArtifactDirectory: options.debugArtifactDirectory,
    });

    const sections = SETTINGS_SECTION_IDS.map((sectionId) =>
      buildSection(sectionId, state[sectionId]),
    );

    return {
      supportsConfigRead: true,
      sectionIds: SETTINGS_SECTION_IDS,
      editableSectionIds: EDITABLE_SETTINGS_SECTION_IDS,
      readOnlySectionIds: ["isp"],
      fieldSpecs: sections.flatMap((section) => section.fieldSpecs),
      sections,
    };
  }

  async function applySection<TId extends EditableSettingsSectionId>(
    sectionId: TId,
    draft: SettingsSectionDraftMap[TId],
  ): Promise<SettingsApplySuccess<TId> | SettingsApplyFailure<TId>> {
    const snapshot = await resolveSnapshot();

    if (!snapshot.supportsConfigRead) {
      return createFailure(sectionId, {
        code: "unsupported",
        message: "Settings are unavailable because config reads are not supported.",
      });
    }

    switch (sectionId) {
      case "time":
        return applyTimeSection({
          draft: draft as TimeSettingsDraft,
          resolveConfig,
          resolveSession,
          debugArtifactDirectory: options.debugArtifactDirectory,
        }) as Promise<SettingsApplySuccess<TId> | SettingsApplyFailure<TId>>;
      case "osd":
        return applyOsdSection({
          draft: draft as OsdSettingsDraft,
          resolveConfig,
          resolveSession,
          debugArtifactDirectory: options.debugArtifactDirectory,
        }) as Promise<SettingsApplySuccess<TId> | SettingsApplyFailure<TId>>;
      case "image":
        return applyImageSection({
          draft: draft as ImageSettingsDraft,
          resolveConfig,
          resolveSession,
          debugArtifactDirectory: options.debugArtifactDirectory,
        }) as Promise<SettingsApplySuccess<TId> | SettingsApplyFailure<TId>>;
      case "stream":
        return applyStreamSection({
          draft: draft as StreamSettingsDraft,
          resolveConfig,
          resolveSession,
          debugArtifactDirectory: options.debugArtifactDirectory,
        }) as Promise<SettingsApplySuccess<TId> | SettingsApplyFailure<TId>>;
    }
  }

  return {
    getBootstrap,
    applySection,
  };
}

function createConfigResolver(
  options: CreateReolinkSettingsServiceOptions,
): () => Promise<CameraConfig> {
  let configPromise: Promise<CameraConfig> | null = null;

  return async () => {
    configPromise ??=
      options.config != null
        ? Promise.resolve(options.config)
        : loadCameraConfig(options.configPath);
    return configPromise;
  };
}

function createSnapshotResolver(
  options: CreateReolinkSettingsServiceOptions,
  resolveConfig: () => Promise<CameraConfig>,
): () => Promise<CapabilitySnapshot> {
  const loadSnapshotImpl = options.loadSnapshot ?? loadCapabilitySnapshot;
  let snapshotPromise: Promise<CapabilitySnapshot> | null = null;

  return async () => {
    snapshotPromise ??= resolveConfig().then((config) =>
      loadSnapshotImpl(config, options.snapshotPath),
    );
    return snapshotPromise;
  };
}

function createSessionResolver(
  options: CreateReolinkSettingsServiceOptions,
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

async function readAllSettings(input: {
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}): Promise<SettingsReadState> {
  const [config, session] = await Promise.all([
    input.resolveConfig(),
    input.resolveSession(),
  ]);
  const request = [
    createReadRequest("GetTime"),
    createReadRequest("GetNtp"),
    createReadRequest("GetImage"),
    createReadRequest("GetOsd"),
    createReadRequest("GetIsp"),
    createReadRequest("GetEnc"),
  ] as const;
  const response =
    await session.requestJson<readonly ReolinkApiResponse[]>(request);
  const responseMap = new Map(response.map((entry) => [entry.cmd, entry]));

  const timeRaw = extractPayload<TimeResponseValue["Time"]>(
    responseMap.get("GetTime"),
    "GetTime",
    "Time",
  );
  const ntpRaw = extractPayload<NtpResponseValue["Ntp"]>(
    responseMap.get("GetNtp"),
    "GetNtp",
    "Ntp",
  );
  const imageRaw = extractPayload<ImageResponseValue["Image"]>(
    responseMap.get("GetImage"),
    "GetImage",
    "Image",
  );
  const osdRaw = extractPayload<OsdResponseValue["Osd"]>(
    responseMap.get("GetOsd"),
    "GetOsd",
    "Osd",
  );
  const ispRaw = extractPayload<IspResponseValue["Isp"]>(
    responseMap.get("GetIsp"),
    "GetIsp",
    "Isp",
  );
  const encRaw = extractPayload<EncResponseValue["Enc"]>(
    responseMap.get("GetEnc"),
    "GetEnc",
    "Enc",
  );

  if (!timeRaw || !ntpRaw || !imageRaw || !osdRaw || !ispRaw || !encRaw) {
    await captureDebugArtifact({
      config,
      command: "GetSettings",
      requestBody: request,
      responseBody: response,
      status: 422,
      debugArtifactDirectory: input.debugArtifactDirectory,
    });
    throw new Error("Malformed settings payload from camera");
  }

  return {
    timeRaw,
    ntpRaw,
    imageRaw,
    osdRaw,
    ispRaw,
    encRaw,
    time: normalizeTimeSection(timeRaw, ntpRaw),
    osd: normalizeOsdSection(osdRaw),
    image: normalizeImageSection(imageRaw),
    stream: normalizeStreamSection(encRaw),
    isp: normalizeIspSection(ispRaw),
  };
}

async function readTimeState(input: {
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}) {
  const [config, session] = await Promise.all([
    input.resolveConfig(),
    input.resolveSession(),
  ]);
  const request = [createReadRequest("GetTime"), createReadRequest("GetNtp")] as const;
  const response =
    await session.requestJson<readonly ReolinkApiResponse[]>(request);
  const responseMap = new Map(response.map((entry) => [entry.cmd, entry]));
  const timeRaw = extractPayload<TimeResponseValue["Time"]>(
    responseMap.get("GetTime"),
    "GetTime",
    "Time",
  );
  const ntpRaw = extractPayload<NtpResponseValue["Ntp"]>(
    responseMap.get("GetNtp"),
    "GetNtp",
    "Ntp",
  );

  if (!timeRaw || !ntpRaw) {
    await captureDebugArtifact({
      config,
      command: "GetTime/GetNtp",
      requestBody: request,
      responseBody: response,
      status: 422,
      debugArtifactDirectory: input.debugArtifactDirectory,
    });
    throw new Error("Malformed time settings payload from camera");
  }

  return {
    config,
    session,
    timeRaw,
    ntpRaw,
    value: normalizeTimeSection(timeRaw, ntpRaw),
  };
}

async function readOsdState(input: {
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}) {
  const [config, session] = await Promise.all([
    input.resolveConfig(),
    input.resolveSession(),
  ]);
  const request = [createReadRequest("GetOsd")] as const;
  const response =
    await session.requestJson<readonly ReolinkApiResponse[]>(request);
  const osdRaw = extractPayload<OsdResponseValue["Osd"]>(
    response[0],
    "GetOsd",
    "Osd",
  );

  if (!osdRaw) {
    await captureDebugArtifact({
      config,
      command: "GetOsd",
      requestBody: request,
      responseBody: response,
      status: 422,
      debugArtifactDirectory: input.debugArtifactDirectory,
    });
    throw new Error("Malformed OSD payload from camera");
  }

  return {
    config,
    session,
    osdRaw,
    value: normalizeOsdSection(osdRaw),
  };
}

async function readImageState(input: {
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}) {
  const [config, session] = await Promise.all([
    input.resolveConfig(),
    input.resolveSession(),
  ]);
  const request = [createReadRequest("GetImage")] as const;
  const response =
    await session.requestJson<readonly ReolinkApiResponse[]>(request);
  const imageRaw = extractPayload<ImageResponseValue["Image"]>(
    response[0],
    "GetImage",
    "Image",
  );

  if (!imageRaw) {
    await captureDebugArtifact({
      config,
      command: "GetImage",
      requestBody: request,
      responseBody: response,
      status: 422,
      debugArtifactDirectory: input.debugArtifactDirectory,
    });
    throw new Error("Malformed image payload from camera");
  }

  return {
    config,
    session,
    imageRaw,
    value: normalizeImageSection(imageRaw),
  };
}

async function readStreamState(input: {
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}) {
  const [config, session] = await Promise.all([
    input.resolveConfig(),
    input.resolveSession(),
  ]);
  const request = [createReadRequest("GetEnc")] as const;
  const response =
    await session.requestJson<readonly ReolinkApiResponse[]>(request);
  const encRaw = extractPayload<EncResponseValue["Enc"]>(
    response[0],
    "GetEnc",
    "Enc",
  );

  if (!encRaw) {
    await captureDebugArtifact({
      config,
      command: "GetEnc",
      requestBody: request,
      responseBody: response,
      status: 422,
      debugArtifactDirectory: input.debugArtifactDirectory,
    });
    throw new Error("Malformed stream payload from camera");
  }

  return {
    config,
    session,
    encRaw,
    value: normalizeStreamSection(encRaw),
  };
}

async function applyTimeSection(input: {
  draft: TimeSettingsDraft;
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}): Promise<SettingsApplySuccess<"time"> | SettingsApplyFailure<"time">> {
  const beforeState = await readTimeState(input);
  const writeCommands: ReolinkRequest[] = [];

  if (input.draft.ntp && Object.keys(input.draft.ntp).length > 0) {
    writeCommands.push({
      cmd: "SetNtp",
      action: 0,
      param: {
        Ntp: normalizeNtpDraft(input.draft.ntp),
      },
    });
  }

  const timePayload = normalizeTimeDraft(input.draft);
  if (timePayload) {
    writeCommands.push({
      cmd: "SetTime",
      action: 0,
      param: {
        Time: timePayload,
      },
    });
  }

  if (writeCommands.length === 0) {
    return createFailure("time", {
      code: "validation",
      message: "No editable fields were provided for this section.",
    });
  }

  const writeResponse =
    await beforeState.session.requestJson<readonly ReolinkApiResponse[]>(
      writeCommands,
    );
  const writeFailure = await maybeCreateWriteFailure({
    sectionId: "time",
    draft: input.draft,
    config: beforeState.config,
    requestBody: writeCommands,
    responseBody: writeResponse,
    debugArtifactDirectory: input.debugArtifactDirectory,
  });

  if (writeFailure) {
    return writeFailure;
  }

  const afterState = await readTimeState(input);
  const changedFields = buildDiffRows("time", beforeState.value, afterState.value);

  if (changedFields.length === 0) {
    return createFailure("time", {
      code: "no-camera-change-detected",
      message: "No camera change detected after verification reread.",
    });
  }

  return {
    ok: true,
    sectionId: "time",
    verified: true,
    before: beforeState.value,
    after: afterState.value,
    changedFields,
  };
}

async function applyOsdSection(input: {
  draft: OsdSettingsDraft;
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}): Promise<SettingsApplySuccess<"osd"> | SettingsApplyFailure<"osd">> {
  const beforeState = await readOsdState(input);
  const osdPayload = normalizeOsdDraft(input.draft);

  if (!osdPayload) {
    return createFailure("osd", {
      code: "validation",
      message: "No editable fields were provided for this section.",
    });
  }

  const writeCommands = [
    {
      cmd: "SetOsd",
      action: 0,
      param: {
        Osd: {
          ...beforeState.osdRaw,
          ...osdPayload,
          osdChannel: osdPayload.osdChannel
            ? {
                ...beforeState.osdRaw.osdChannel,
                ...osdPayload.osdChannel,
              }
            : beforeState.osdRaw.osdChannel,
          osdTime: osdPayload.osdTime
            ? {
                ...beforeState.osdRaw.osdTime,
                ...osdPayload.osdTime,
              }
            : beforeState.osdRaw.osdTime,
        },
      },
    },
  ] as const satisfies readonly ReolinkRequest[];
  const writeResponse =
    await beforeState.session.requestJson<readonly ReolinkApiResponse[]>(
      writeCommands,
    );
  const writeFailure = await maybeCreateWriteFailure({
    sectionId: "osd",
    draft: input.draft,
    config: beforeState.config,
    requestBody: writeCommands,
    responseBody: writeResponse,
    debugArtifactDirectory: input.debugArtifactDirectory,
  });

  if (writeFailure) {
    return writeFailure;
  }

  const afterState = await readOsdState(input);
  const changedFields = buildDiffRows("osd", beforeState.value, afterState.value);

  if (changedFields.length === 0) {
    return createFailure("osd", {
      code: "no-camera-change-detected",
      message: "No camera change detected after verification reread.",
    });
  }

  return {
    ok: true,
    sectionId: "osd",
    verified: true,
    before: beforeState.value,
    after: afterState.value,
    changedFields,
  };
}

async function applyImageSection(input: {
  draft: ImageSettingsDraft;
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}): Promise<SettingsApplySuccess<"image"> | SettingsApplyFailure<"image">> {
  const beforeState = await readImageState(input);

  if (Object.keys(input.draft).length === 0) {
    return createFailure("image", {
      code: "validation",
      message: "No editable fields were provided for this section.",
    });
  }

  const writeCommands = [
    {
      cmd: "SetImage",
      action: 0,
      param: {
        Image: {
          ...beforeState.imageRaw,
          ...input.draft,
        },
      },
    },
  ] as const satisfies readonly ReolinkRequest[];
  const writeResponse =
    await beforeState.session.requestJson<readonly ReolinkApiResponse[]>(
      writeCommands,
    );
  const writeFailure = await maybeCreateWriteFailure({
    sectionId: "image",
    draft: input.draft,
    config: beforeState.config,
    requestBody: writeCommands,
    responseBody: writeResponse,
    debugArtifactDirectory: input.debugArtifactDirectory,
  });

  if (writeFailure) {
    return writeFailure;
  }

  const afterState = await readImageState(input);
  const changedFields = buildDiffRows(
    "image",
    beforeState.value,
    afterState.value,
  );

  if (changedFields.length === 0) {
    return createFailure("image", {
      code: "no-camera-change-detected",
      message: "No camera change detected after verification reread.",
    });
  }

  return {
    ok: true,
    sectionId: "image",
    verified: true,
    before: beforeState.value,
    after: afterState.value,
    changedFields,
  };
}

async function applyStreamSection(input: {
  draft: StreamSettingsDraft;
  resolveConfig: () => Promise<CameraConfig>;
  resolveSession: () => Promise<SessionLike>;
  debugArtifactDirectory?: string;
}): Promise<SettingsApplySuccess<"stream"> | SettingsApplyFailure<"stream">> {
  const beforeState = await readStreamState(input);

  if (!input.draft.subStream || Object.keys(input.draft.subStream).length === 0) {
    return createFailure("stream", {
      code: "validation",
      message: "No editable fields were provided for this section.",
    });
  }

  const writeCommands = [
    {
      cmd: "SetEnc",
      action: 0,
      param: {
        Enc: {
          ...beforeState.encRaw,
          subStream: {
            ...beforeState.encRaw.subStream,
            ...input.draft.subStream,
          },
        },
      },
    },
  ] as const satisfies readonly ReolinkRequest[];
  const writeResponse =
    await beforeState.session.requestJson<readonly ReolinkApiResponse[]>(
      writeCommands,
    );
  const writeFailure = await maybeCreateWriteFailure({
    sectionId: "stream",
    draft: input.draft,
    config: beforeState.config,
    requestBody: writeCommands,
    responseBody: writeResponse,
    debugArtifactDirectory: input.debugArtifactDirectory,
  });

  if (writeFailure) {
    return writeFailure;
  }

  const afterState = await readStreamState(input);
  const changedFields = buildDiffRows(
    "stream",
    beforeState.value,
    afterState.value,
  );

  if (changedFields.length === 0) {
    return createFailure("stream", {
      code: "no-camera-change-detected",
      message: "No camera change detected after verification reread.",
    });
  }

  return {
    ok: true,
    sectionId: "stream",
    verified: true,
    before: beforeState.value,
    after: afterState.value,
    changedFields,
  };
}

function createReadRequest(cmd: string): ReolinkRequest {
  return {
    cmd,
    action: 1,
    param: {
      channel: DEFAULT_CHANNEL,
    },
  };
}

function extractPayload<TPayload>(
  response: ReolinkApiResponse | undefined,
  command: string,
  key: string,
): TPayload | null {
  if (!response || response.code !== 0 || !response.value) {
    throw new Error(`${command} failed while reading settings`);
  }

  const payload = (response.value as Record<string, unknown>)[key];
  return payload && typeof payload === "object" ? (payload as TPayload) : null;
}

function normalizeTimeSection(
  timeRaw: NonNullable<TimeResponseValue["Time"]>,
  ntpRaw: NonNullable<NtpResponseValue["Ntp"]>,
): TimeSettingsValue {
  return {
    ntp: {
      enable: normalizeBoolean(ntpRaw.enable),
      server: normalizeString(ntpRaw.server),
      port: normalizeNumber(ntpRaw.port),
      interval: normalizeNumber(ntpRaw.interval),
    },
    time: {
      timeZone: normalizeNumber(timeRaw.timeZone),
      timeFmt: normalizeString(timeRaw.timeFmt),
      hourFmt: normalizeNumber(timeRaw.hourFmt),
    },
    dst: {
      enable: normalizeBoolean(timeRaw.Dst?.enable),
      offset: normalizeNumber(timeRaw.Dst?.offset),
      startMon: normalizeNumber(timeRaw.Dst?.startMon),
      startWeek: normalizeNumber(timeRaw.Dst?.startWeek),
      startWeekday: normalizeNumber(timeRaw.Dst?.startWeekday),
      startHour: normalizeNumber(timeRaw.Dst?.startHour),
      endMon: normalizeNumber(timeRaw.Dst?.endMon),
      endWeek: normalizeNumber(timeRaw.Dst?.endWeek),
      endWeekday: normalizeNumber(timeRaw.Dst?.endWeekday),
      endHour: normalizeNumber(timeRaw.Dst?.endHour),
    },
    currentClock: {
      year: normalizeNumber(timeRaw.year),
      mon: normalizeNumber(timeRaw.mon),
      day: normalizeNumber(timeRaw.day),
      hour: normalizeNumber(timeRaw.hour),
      min: normalizeNumber(timeRaw.min),
      sec: normalizeNumber(timeRaw.sec),
    },
  };
}

function normalizeOsdSection(
  osdRaw: NonNullable<OsdResponseValue["Osd"]>,
): OsdSettingsValue {
  return {
    osdChannel: {
      enable: normalizeBoolean(osdRaw.osdChannel?.enable),
      name: normalizeString(osdRaw.osdChannel?.name),
      pos: normalizeString(osdRaw.osdChannel?.pos),
    },
    osdTime: {
      enable: normalizeBoolean(osdRaw.osdTime?.enable),
      pos: normalizeString(osdRaw.osdTime?.pos),
    },
  };
}

function normalizeImageSection(
  imageRaw: NonNullable<ImageResponseValue["Image"]>,
): ImageSettingsValue {
  return {
    bright: normalizeNumber(imageRaw.bright),
    contrast: normalizeNumber(imageRaw.contrast),
    hue: normalizeNumber(imageRaw.hue),
    saturation: normalizeNumber(imageRaw.saturation),
    sharpen: normalizeNumber(imageRaw.sharpen),
  };
}

function normalizeStreamSection(
  encRaw: NonNullable<EncResponseValue["Enc"]>,
): StreamSettingsValue {
  return {
    subStream: normalizeStreamProfile(encRaw.subStream),
    mainStreamSummary: normalizeStreamProfile(encRaw.mainStream),
    audioEnabled: normalizeBoolean(encRaw.audio),
  };
}

function normalizeIspSection(
  ispRaw: NonNullable<IspResponseValue["Isp"]>,
): IspSettingsValue {
  return {
    dayNight: normalizeString(ispRaw.dayNight),
    backLight: normalizeString(ispRaw.backLight),
    antiFlicker: normalizeString(ispRaw.antiFlicker),
    exposureMode: normalizeString(ispRaw.exposureMode),
    nr3d: normalizeNumber(ispRaw.nr3d),
  };
}

function normalizeStreamProfile(
  value: NonNullable<EncResponseValue["Enc"]>["subStream"],
): StreamProfileValue {
  return {
    size: normalizeString(value?.size),
    frameRate: normalizeNumber(value?.frameRate),
    bitRate: normalizeNumber(value?.bitRate),
    profile: normalizeString(value?.profile),
  };
}

function normalizeNtpDraft(
  draft: NonNullable<TimeSettingsDraft["ntp"]>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(draft)) {
    result[key] = typeof value === "boolean" ? (value ? 1 : 0) : value;
  }

  return result;
}

function normalizeTimeDraft(draft: TimeSettingsDraft): Record<string, unknown> | null {
  const timeValue: Record<string, unknown> = {};

  if (draft.time) {
    for (const [key, value] of Object.entries(draft.time)) {
      timeValue[key] = value;
    }
  }

  if (draft.dst && Object.keys(draft.dst).length > 0) {
    timeValue.Dst = Object.fromEntries(
      Object.entries(draft.dst).map(([key, value]) => [
        key,
        typeof value === "boolean" ? (value ? 1 : 0) : value,
      ]),
    );
  }

  return Object.keys(timeValue).length > 0 ? timeValue : null;
}

function normalizeOsdDraft(
  draft: OsdSettingsDraft,
): {
  osdChannel?: Record<string, unknown>;
  osdTime?: Record<string, unknown>;
} | null {
  const osdValue: {
    osdChannel?: Record<string, unknown>;
    osdTime?: Record<string, unknown>;
  } = {};

  if (draft.osdChannel && Object.keys(draft.osdChannel).length > 0) {
    osdValue.osdChannel = Object.fromEntries(
      Object.entries(draft.osdChannel).map(([key, value]) => [
        key,
        typeof value === "boolean" ? (value ? 1 : 0) : value,
      ]),
    );
  }

  if (draft.osdTime && Object.keys(draft.osdTime).length > 0) {
    osdValue.osdTime = Object.fromEntries(
      Object.entries(draft.osdTime).map(([key, value]) => [
        key,
        typeof value === "boolean" ? (value ? 1 : 0) : value,
      ]),
    );
  }

  return Object.keys(osdValue).length > 0 ? osdValue : null;
}

function buildSection<TId extends SettingsSectionId>(
  sectionId: TId,
  value: SettingsSectionValueMap[TId],
): SettingsSection<TId> {
  const meta = SETTINGS_SECTION_META[sectionId];
  const fieldSpecs = getSectionFieldSpecs(sectionId).map((fieldSpec) => ({
    ...fieldSpec,
    currentValue: getValueAtPath(value, stripSectionPrefix(fieldSpec.fieldPath)),
  }));

  return {
    id: sectionId,
    title: meta.title,
    description: meta.description,
    status: sectionId === "isp" ? "read-only" : "editable",
    editable: sectionId !== "isp",
    strategy: SETTINGS_WRITE_STRATEGIES[sectionId],
    fieldSpecs,
    value,
  };
}

function buildDiffRows<TId extends SettingsSectionId>(
  sectionId: TId,
  before: SettingsSectionValueMap[TId],
  after: SettingsSectionValueMap[TId],
): SettingsDiffRow[] {
  return getSectionFieldSpecs(sectionId)
    .filter((fieldSpec) => fieldSpec.editable)
    .flatMap((fieldSpec) => {
      const localPath = stripSectionPrefix(fieldSpec.fieldPath);
      const beforeValue = getValueAtPath(before, localPath);
      const afterValue = getValueAtPath(after, localPath);

      return Object.is(beforeValue, afterValue)
        ? []
        : [
            {
              fieldPath: fieldSpec.fieldPath,
              label: fieldSpec.label,
              beforeValue,
              afterValue,
              verified: true,
            },
          ];
    });
}

async function maybeCreateWriteFailure<TId extends EditableSettingsSectionId>(input: {
  sectionId: TId;
  draft: SettingsSectionDraftMap[TId];
  config: CameraConfig;
  requestBody: unknown;
  responseBody: readonly ReolinkApiResponse[];
  debugArtifactDirectory?: string;
}): Promise<SettingsApplyFailure<TId> | null> {
  const failedResponse = input.responseBody.find((response) => !isWriteSuccess(response));

  if (!failedResponse) {
    return null;
  }

  const rspCode = failedResponse.error?.rspCode;

  if (rspCode !== -4 && rspCode !== -6 && rspCode !== -9) {
    await captureDebugArtifact({
      config: input.config,
      command: failedResponse.cmd,
      requestBody: input.requestBody,
      responseBody: input.responseBody,
      status: failedResponse.code || 500,
      debugArtifactDirectory: input.debugArtifactDirectory,
    });
  }

  if (rspCode === -4) {
    const fieldPath = getSingleDraftFieldPath(input.sectionId, input.draft);

    return createFailure(input.sectionId, {
      code: "camera-reject",
      message: "The camera rejected one or more values for this section.",
      rspCode,
      fieldErrors: fieldPath
        ? [
            {
              fieldPath,
              message: "The camera rejected the requested value.",
              code: "invalid-value",
            },
          ]
        : [],
    });
  }

  if (rspCode === -6) {
    return createFailure(input.sectionId, {
      code: "camera-reject",
      message: "The camera rejected authentication for this write.",
      rspCode,
    });
  }

  if (rspCode === -9) {
    return createFailure(input.sectionId, {
      code: "camera-reject",
      message: "This camera firmware does not allow that setting write.",
      rspCode,
    });
  }

  return createFailure(input.sectionId, {
    code: "camera-reject",
    message: "The camera rejected this settings write.",
    rspCode,
  });
}

function isWriteSuccess(response: ReolinkApiResponse): boolean {
  if (response.code !== 0) {
    return false;
  }

  const rspCode = (response.value as { rspCode?: unknown } | undefined)?.rspCode;
  return rspCode === undefined || rspCode === 200;
}

function getSingleDraftFieldPath<TId extends EditableSettingsSectionId>(
  sectionId: TId,
  draft: SettingsSectionDraftMap[TId],
): string | null {
  const fieldPaths = collectDraftFieldPaths(sectionId, draft as object);
  return fieldPaths.length === 1 ? fieldPaths[0] : null;
}

function collectDraftFieldPaths(
  sectionId: string,
  value: object,
  segments: string[] = [],
): string[] {
  return Object.entries(value).flatMap(([key, entryValue]) => {
    const nextSegments = [...segments, key];

    if (
      entryValue != null &&
      typeof entryValue === "object" &&
      !Array.isArray(entryValue)
    ) {
      return collectDraftFieldPaths(sectionId, entryValue as object, nextSegments);
    }

    return [`${sectionId}.${nextSegments.join(".")}`];
  });
}

function stripSectionPrefix(fieldPath: string): string {
  return fieldPath.split(".").slice(1).join(".");
}

function getValueAtPath(root: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return null;
    }

    return (current as Record<string, unknown>)[segment] ?? null;
  }, root) as string | number | boolean | null;
}

function createFailure<TId extends SettingsSectionId>(
  sectionId: TId,
  input: Omit<
    SettingsApplyFailure<TId>,
    "ok" | "sectionId" | "verified" | "fieldErrors"
  > & { fieldErrors?: SettingsApplyFailure<TId>["fieldErrors"] },
): SettingsApplyFailure<TId> {
  return {
    ok: false,
    sectionId,
    verified: false,
    ...input,
    fieldErrors: input.fieldErrors ?? [],
  };
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value > 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }

  return false;
}

function normalizeNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value : "";
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
