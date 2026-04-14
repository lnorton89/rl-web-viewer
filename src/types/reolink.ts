export type ReolinkCommand =
  | "Login"
  | "GetDevInfo"
  | "GetAbility"
  | "GetNetPort"
  | (string & {});

export type ReolinkRequest = {
  cmd: ReolinkCommand;
  action?: number;
  param?: Record<string, unknown>;
};

export type ReolinkApiError = {
  detail?: string;
  rspCode?: number;
  [key: string]: unknown;
};

export type ReolinkApiResponse<TValue = unknown> = {
  cmd: string;
  code: number;
  value?: TValue;
  error?: ReolinkApiError;
};

export type CameraIdentity = {
  model: string;
  hardVer: string;
  firmVer: string;
};

export type CapabilityPermit = {
  permit: number;
  ver: number;
};

export type ReolinkAbilityChannel = Record<string, CapabilityPermit>;

export type ReolinkAbility = {
  abilityChn?: ReolinkAbilityChannel[];
} & Record<string, CapabilityPermit | ReolinkAbilityChannel[] | unknown>;

export type ReolinkDeviceInfo = CameraIdentity & {
  B485: number;
  IOInputNum: number;
  IOOutputNum: number;
  audioNum: number;
  buildDay: string;
  cfgVer: string;
  channelNum: number;
  detail: string;
  diskNum: number;
  name: string;
  serial: string;
  type: string;
  wifi: number;
};

export type ReolinkNetPort = {
  httpPort: number;
  httpsPort: number;
  mediaPort: number;
  onvifPort: number;
  rtmpPort: number;
  rtspPort: number;
};

export type CapabilitySnapshotIdentity = Partial<CameraIdentity>;

export type ReolinkSessionToken = {
  name: string;
  leaseTime: number;
  expiresAt: number;
};
