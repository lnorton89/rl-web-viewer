export const SETTINGS_SECTION_IDS = [
  "time",
  "osd",
  "image",
  "stream",
  "isp",
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTION_IDS)[number];

export const EDITABLE_SETTINGS_SECTION_IDS = [
  "time",
  "osd",
  "image",
  "stream",
] as const;

export type EditableSettingsSectionId =
  (typeof EDITABLE_SETTINGS_SECTION_IDS)[number];

export const READ_ONLY_SETTINGS_SECTION_IDS = ["isp"] as const;

export type ReadOnlySettingsSectionId =
  (typeof READ_ONLY_SETTINGS_SECTION_IDS)[number];

export type SettingsFieldPrimitive = string | number | boolean | null;

export type SettingsFieldKind =
  | "toggle"
  | "text"
  | "number"
  | "select"
  | "read-only";

export type SettingsFieldConstraints = {
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  integer?: boolean;
};

export type SettingsFieldOption = {
  value: SettingsFieldPrimitive;
  label: string;
  description?: string;
};

export type SettingsFieldSpec = {
  sectionId: SettingsSectionId;
  fieldPath: string;
  kind: SettingsFieldKind;
  label: string;
  editable: boolean;
  defaultValue: SettingsFieldPrimitive;
  currentValue?: SettingsFieldPrimitive;
  description?: string;
  constraints?: SettingsFieldConstraints;
  options?: readonly SettingsFieldOption[];
};

export type SettingsDiffRow = {
  fieldPath: string;
  label: string;
  beforeValue: SettingsFieldPrimitive;
  afterValue: SettingsFieldPrimitive;
  verified: boolean;
};

export type SettingsFieldError = {
  fieldPath: string;
  message: string;
  code?: string;
};

export type SettingsSectionStatus = "editable" | "read-only";

export type SettingsWriteStrategy = "patch" | "full-object" | "read-only";

export type DstSettings = {
  enable: boolean;
  offset: number;
  startMon: number;
  startWeek: number;
  startWeekday: number;
  startHour: number;
  endMon: number;
  endWeek: number;
  endWeekday: number;
  endHour: number;
};

export type TimeSettingsValue = {
  ntp: {
    enable: boolean;
    server: string;
    port: number;
    interval: number;
  };
  time: {
    timeZone: number;
    timeFmt: string;
    hourFmt: number;
  };
  dst: DstSettings;
  currentClock: {
    year: number;
    mon: number;
    day: number;
    hour: number;
    min: number;
    sec: number;
  };
};

export type OsdSettingsValue = {
  osdChannel: {
    enable: boolean;
    name: string;
    pos: string;
  };
  osdTime: {
    enable: boolean;
    pos: string;
  };
};

export type ImageSettingsValue = {
  bright: number;
  contrast: number;
  hue: number;
  saturation: number;
  sharpen: number;
};

export type StreamProfileValue = {
  size: string;
  frameRate: number;
  bitRate: number;
  profile: string;
};

export type StreamSettingsValue = {
  subStream: StreamProfileValue;
  mainStreamSummary: StreamProfileValue;
  audioEnabled: boolean;
};

export type IspSettingsValue = {
  dayNight: string;
  backLight: string;
  antiFlicker: string;
  exposureMode: string;
  nr3d: number;
};

export type SettingsSectionValueMap = {
  time: TimeSettingsValue;
  osd: OsdSettingsValue;
  image: ImageSettingsValue;
  stream: StreamSettingsValue;
  isp: IspSettingsValue;
};

export type TimeSettingsDraft = {
  ntp?: Partial<TimeSettingsValue["ntp"]>;
  time?: Partial<TimeSettingsValue["time"]>;
  dst?: Partial<TimeSettingsValue["dst"]>;
};

export type OsdSettingsDraft = {
  osdChannel?: Partial<OsdSettingsValue["osdChannel"]>;
  osdTime?: Partial<OsdSettingsValue["osdTime"]>;
};

export type ImageSettingsDraft = Partial<ImageSettingsValue>;

export type StreamSettingsDraft = {
  subStream?: Partial<StreamProfileValue>;
};

export type SettingsSectionDraftMap = {
  time: TimeSettingsDraft;
  osd: OsdSettingsDraft;
  image: ImageSettingsDraft;
  stream: StreamSettingsDraft;
  isp: never;
};

export type SettingsSection<TId extends SettingsSectionId = SettingsSectionId> = {
  id: TId;
  title: string;
  description: string;
  status: SettingsSectionStatus;
  editable: boolean;
  strategy: SettingsWriteStrategy;
  fieldSpecs: SettingsFieldSpec[];
  value: SettingsSectionValueMap[TId];
};

export type SettingsBootstrap = {
  supportsConfigRead: boolean;
  sectionIds: readonly SettingsSectionId[];
  editableSectionIds: readonly EditableSettingsSectionId[];
  readOnlySectionIds: readonly ReadOnlySettingsSectionId[];
  fieldSpecs: readonly SettingsFieldSpec[];
  sections: SettingsSection[];
};

export type SettingsApplySuccess<
  TId extends EditableSettingsSectionId = EditableSettingsSectionId,
> = {
  ok: true;
  sectionId: TId;
  verified: true;
  before: SettingsSectionValueMap[TId];
  after: SettingsSectionValueMap[TId];
  changedFields: SettingsDiffRow[];
};

export type SettingsApplyFailure<
  TId extends SettingsSectionId = SettingsSectionId,
> = {
  ok: false;
  sectionId: TId;
  verified: false;
  message: string;
  code:
    | "unsupported"
    | "validation"
    | "camera-reject"
    | "no-camera-change-detected";
  fieldErrors: SettingsFieldError[];
  rspCode?: number;
  debugArtifactPath?: string;
};

export type SettingsApplyResult<
  TId extends SettingsSectionId = SettingsSectionId,
> = TId extends EditableSettingsSectionId
  ? SettingsApplySuccess<TId> | SettingsApplyFailure<TId>
  : SettingsApplyFailure<TId>;

export interface SettingsService {
  getBootstrap(): Promise<SettingsBootstrap>;
  applySection<TId extends EditableSettingsSectionId>(
    sectionId: TId,
    draft: SettingsSectionDraftMap[TId],
  ): Promise<SettingsApplySuccess<TId> | SettingsApplyFailure<TId>>;
}

export const SETTINGS_WRITE_STRATEGIES = {
  time: "patch",
  osd: "full-object",
  image: "full-object",
  stream: "full-object",
  isp: "read-only",
} as const satisfies Record<SettingsSectionId, SettingsWriteStrategy>;

export const SETTINGS_SECTION_META = {
  time: {
    title: "Time & Sync",
    description: "NTP, timezone, display format, and DST rules.",
  },
  osd: {
    title: "Display Overlay",
    description: "Camera name and timestamp overlay placement.",
  },
  image: {
    title: "Basic Image Tuning",
    description: "Brightness, contrast, hue, saturation, and sharpening.",
  },
  stream: {
    title: "Stream Profile",
    description: "Sub-stream controls with main stream kept inspect-only.",
  },
  isp: {
    title: "Camera Tuning",
    description: "Firmware-specific ISP values exposed for inspection only.",
  },
} as const satisfies Record<
  SettingsSectionId,
  { title: string; description: string }
>;

const OSD_POSITION_OPTIONS = [
  { value: "Upper Left", label: "Upper Left" },
  { value: "Top Center", label: "Top Center" },
  { value: "Upper Right", label: "Upper Right" },
  { value: "Lower Left", label: "Lower Left" },
  { value: "Bottom Center", label: "Bottom Center" },
  { value: "Lower Right", label: "Lower Right" },
] as const satisfies readonly SettingsFieldOption[];

const STREAM_SIZE_OPTIONS = [
  { value: "640x360", label: "640 x 360" },
  { value: "896x512", label: "896 x 512" },
  { value: "1280x720", label: "1280 x 720" },
] as const satisfies readonly SettingsFieldOption[];

const STREAM_PROFILE_OPTIONS = [
  { value: "Baseline", label: "Baseline" },
  { value: "Main", label: "Main" },
  { value: "High", label: "High" },
] as const satisfies readonly SettingsFieldOption[];

const TIME_FORMAT_OPTIONS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD" },
] as const satisfies readonly SettingsFieldOption[];

const HOUR_FORMAT_OPTIONS = [
  { value: 0, label: "12-hour" },
  { value: 1, label: "24-hour" },
] as const satisfies readonly SettingsFieldOption[];

export const SETTINGS_FIELD_SPECS = {
  "time.ntp.enable": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.ntp.enable",
    kind: "toggle",
    label: "Automatic Time Sync",
    defaultValue: true,
  }),
  "time.ntp.server": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.ntp.server",
    kind: "text",
    label: "NTP Server",
    defaultValue: "pool.ntp.org",
    constraints: {
      minLength: 1,
      maxLength: 128,
    },
  }),
  "time.ntp.port": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.ntp.port",
    kind: "number",
    label: "NTP Port",
    defaultValue: 123,
    constraints: {
      min: 1,
      max: 65535,
      step: 1,
      integer: true,
    },
  }),
  "time.ntp.interval": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.ntp.interval",
    kind: "number",
    label: "Sync Interval (minutes)",
    defaultValue: 60,
    constraints: {
      min: 1,
      max: 1440,
      step: 1,
      integer: true,
    },
  }),
  "time.time.timeZone": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.time.timeZone",
    kind: "number",
    label: "Time Zone",
    defaultValue: -8,
    constraints: {
      min: -12,
      max: 14,
      step: 0.5,
    },
  }),
  "time.time.timeFmt": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.time.timeFmt",
    kind: "select",
    label: "Date Format",
    defaultValue: "MM/DD/YYYY",
    options: TIME_FORMAT_OPTIONS,
  }),
  "time.time.hourFmt": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.time.hourFmt",
    kind: "select",
    label: "Clock Format",
    defaultValue: 1,
    options: HOUR_FORMAT_OPTIONS,
  }),
  "time.dst.enable": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.enable",
    kind: "toggle",
    label: "Daylight Saving Time",
    defaultValue: true,
  }),
  "time.dst.offset": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.offset",
    kind: "number",
    label: "DST Offset (hours)",
    defaultValue: 1,
    constraints: {
      min: 0,
      max: 2,
      step: 1,
      integer: true,
    },
  }),
  "time.dst.startMon": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.startMon",
    kind: "number",
    label: "DST Start Month",
    defaultValue: 3,
    constraints: { min: 1, max: 12, step: 1, integer: true },
  }),
  "time.dst.startWeek": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.startWeek",
    kind: "number",
    label: "DST Start Week",
    defaultValue: 2,
    constraints: { min: 1, max: 5, step: 1, integer: true },
  }),
  "time.dst.startWeekday": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.startWeekday",
    kind: "number",
    label: "DST Start Weekday",
    defaultValue: 0,
    constraints: { min: 0, max: 6, step: 1, integer: true },
  }),
  "time.dst.startHour": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.startHour",
    kind: "number",
    label: "DST Start Hour",
    defaultValue: 2,
    constraints: { min: 0, max: 23, step: 1, integer: true },
  }),
  "time.dst.endMon": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.endMon",
    kind: "number",
    label: "DST End Month",
    defaultValue: 11,
    constraints: { min: 1, max: 12, step: 1, integer: true },
  }),
  "time.dst.endWeek": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.endWeek",
    kind: "number",
    label: "DST End Week",
    defaultValue: 1,
    constraints: { min: 1, max: 5, step: 1, integer: true },
  }),
  "time.dst.endWeekday": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.endWeekday",
    kind: "number",
    label: "DST End Weekday",
    defaultValue: 0,
    constraints: { min: 0, max: 6, step: 1, integer: true },
  }),
  "time.dst.endHour": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.dst.endHour",
    kind: "number",
    label: "DST End Hour",
    defaultValue: 2,
    constraints: { min: 0, max: 23, step: 1, integer: true },
  }),
  "time.currentClock.year": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.currentClock.year",
    kind: "read-only",
    label: "Current Year",
    editable: false,
    defaultValue: 0,
  }),
  "time.currentClock.mon": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.currentClock.mon",
    kind: "read-only",
    label: "Current Month",
    editable: false,
    defaultValue: 0,
  }),
  "time.currentClock.day": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.currentClock.day",
    kind: "read-only",
    label: "Current Day",
    editable: false,
    defaultValue: 0,
  }),
  "time.currentClock.hour": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.currentClock.hour",
    kind: "read-only",
    label: "Current Hour",
    editable: false,
    defaultValue: 0,
  }),
  "time.currentClock.min": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.currentClock.min",
    kind: "read-only",
    label: "Current Minute",
    editable: false,
    defaultValue: 0,
  }),
  "time.currentClock.sec": createFieldSpec({
    sectionId: "time",
    fieldPath: "time.currentClock.sec",
    kind: "read-only",
    label: "Current Second",
    editable: false,
    defaultValue: 0,
  }),
  "osd.osdChannel.enable": createFieldSpec({
    sectionId: "osd",
    fieldPath: "osd.osdChannel.enable",
    kind: "toggle",
    label: "Show Camera Name",
    defaultValue: true,
  }),
  "osd.osdChannel.name": createFieldSpec({
    sectionId: "osd",
    fieldPath: "osd.osdChannel.name",
    kind: "text",
    label: "Camera Name",
    defaultValue: "Camera",
    constraints: {
      minLength: 1,
      maxLength: 32,
    },
  }),
  "osd.osdChannel.pos": createFieldSpec({
    sectionId: "osd",
    fieldPath: "osd.osdChannel.pos",
    kind: "select",
    label: "Camera Name Position",
    defaultValue: "Upper Left",
    options: OSD_POSITION_OPTIONS,
  }),
  "osd.osdTime.enable": createFieldSpec({
    sectionId: "osd",
    fieldPath: "osd.osdTime.enable",
    kind: "toggle",
    label: "Show Timestamp",
    defaultValue: true,
  }),
  "osd.osdTime.pos": createFieldSpec({
    sectionId: "osd",
    fieldPath: "osd.osdTime.pos",
    kind: "select",
    label: "Timestamp Position",
    defaultValue: "Lower Right",
    options: OSD_POSITION_OPTIONS,
  }),
  "image.bright": createFieldSpec({
    sectionId: "image",
    fieldPath: "image.bright",
    kind: "number",
    label: "Brightness",
    defaultValue: 128,
    constraints: {
      min: 0,
      max: 255,
      step: 1,
    },
  }),
  "image.contrast": createFieldSpec({
    sectionId: "image",
    fieldPath: "image.contrast",
    kind: "number",
    label: "Contrast",
    defaultValue: 128,
    constraints: {
      min: 0,
      max: 255,
      step: 1,
    },
  }),
  "image.hue": createFieldSpec({
    sectionId: "image",
    fieldPath: "image.hue",
    kind: "number",
    label: "Hue",
    defaultValue: 128,
    constraints: {
      min: 0,
      max: 255,
      step: 1,
    },
  }),
  "image.saturation": createFieldSpec({
    sectionId: "image",
    fieldPath: "image.saturation",
    kind: "number",
    label: "Saturation",
    defaultValue: 128,
    constraints: {
      min: 0,
      max: 255,
      step: 1,
    },
  }),
  "image.sharpen": createFieldSpec({
    sectionId: "image",
    fieldPath: "image.sharpen",
    kind: "number",
    label: "Sharpness",
    defaultValue: 128,
    constraints: {
      min: 0,
      max: 255,
      step: 1,
    },
  }),
  "stream.subStream.size": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.subStream.size",
    kind: "select",
    label: "Sub-stream Resolution",
    defaultValue: "640x360",
    options: STREAM_SIZE_OPTIONS,
  }),
  "stream.subStream.frameRate": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.subStream.frameRate",
    kind: "number",
    label: "Sub-stream Frame Rate",
    defaultValue: 10,
    constraints: {
      min: 1,
      max: 25,
      step: 1,
      integer: true,
    },
  }),
  "stream.subStream.bitRate": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.subStream.bitRate",
    kind: "number",
    label: "Sub-stream Bit Rate",
    defaultValue: 512,
    constraints: {
      min: 64,
      max: 4096,
      step: 1,
      integer: true,
    },
  }),
  "stream.subStream.profile": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.subStream.profile",
    kind: "select",
    label: "Sub-stream Profile",
    defaultValue: "Main",
    options: STREAM_PROFILE_OPTIONS,
  }),
  "stream.mainStreamSummary.size": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.mainStreamSummary.size",
    kind: "read-only",
    label: "Main Stream Resolution",
    editable: false,
    defaultValue: "3072x1728",
  }),
  "stream.mainStreamSummary.frameRate": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.mainStreamSummary.frameRate",
    kind: "read-only",
    label: "Main Stream Frame Rate",
    editable: false,
    defaultValue: 25,
  }),
  "stream.mainStreamSummary.bitRate": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.mainStreamSummary.bitRate",
    kind: "read-only",
    label: "Main Stream Bit Rate",
    editable: false,
    defaultValue: 6144,
  }),
  "stream.mainStreamSummary.profile": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.mainStreamSummary.profile",
    kind: "read-only",
    label: "Main Stream Profile",
    editable: false,
    defaultValue: "High",
  }),
  "stream.audioEnabled": createFieldSpec({
    sectionId: "stream",
    fieldPath: "stream.audioEnabled",
    kind: "read-only",
    label: "Audio Enabled",
    editable: false,
    defaultValue: true,
  }),
  "isp.dayNight": createFieldSpec({
    sectionId: "isp",
    fieldPath: "isp.dayNight",
    kind: "read-only",
    label: "Day/Night Mode",
    editable: false,
    defaultValue: "Auto",
  }),
  "isp.backLight": createFieldSpec({
    sectionId: "isp",
    fieldPath: "isp.backLight",
    kind: "read-only",
    label: "Backlight Mode",
    editable: false,
    defaultValue: "DynamicRangeControl",
  }),
  "isp.antiFlicker": createFieldSpec({
    sectionId: "isp",
    fieldPath: "isp.antiFlicker",
    kind: "read-only",
    label: "Anti-Flicker",
    editable: false,
    defaultValue: "60Hz",
  }),
  "isp.exposureMode": createFieldSpec({
    sectionId: "isp",
    fieldPath: "isp.exposureMode",
    kind: "read-only",
    label: "Exposure Mode",
    editable: false,
    defaultValue: "Auto",
  }),
  "isp.nr3d": createFieldSpec({
    sectionId: "isp",
    fieldPath: "isp.nr3d",
    kind: "read-only",
    label: "3D Noise Reduction",
    editable: false,
    defaultValue: 0,
  }),
} as const satisfies Record<string, SettingsFieldSpec>;

export function getSectionFieldSpecs(
  sectionId: SettingsSectionId,
): SettingsFieldSpec[] {
  return Object.values(SETTINGS_FIELD_SPECS)
    .filter((fieldSpec) => fieldSpec.sectionId === sectionId)
    .map((fieldSpec) => ({ ...fieldSpec }));
}

export function createUnavailableSettingsBootstrap(): SettingsBootstrap {
  return {
    supportsConfigRead: false,
    sectionIds: SETTINGS_SECTION_IDS,
    editableSectionIds: EDITABLE_SETTINGS_SECTION_IDS,
    readOnlySectionIds: READ_ONLY_SETTINGS_SECTION_IDS,
    fieldSpecs: Object.values(SETTINGS_FIELD_SPECS).map((fieldSpec) => ({
      ...fieldSpec,
    })),
    sections: [],
  };
}

function createFieldSpec(
  input: Omit<SettingsFieldSpec, "editable"> & { editable?: boolean },
): SettingsFieldSpec {
  return {
    editable: input.editable ?? input.kind !== "read-only",
    ...input,
  };
}
