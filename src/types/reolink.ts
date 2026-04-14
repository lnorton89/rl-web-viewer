export type ReolinkCommand =
  | "Login"
  | "GetDevInfo"
  | "GetAbility"
  | "GetNetPort";

export type CameraIdentity = {
  model: string;
  hardVer: string;
  firmVer: string;
};

export type CapabilityPermit = {
  permit: number;
  ver: number;
};

export type CapabilitySnapshotIdentity = Partial<CameraIdentity>;
