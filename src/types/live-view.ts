export type StreamQuality = "main" | "sub";

export type StreamTransport = "webrtc" | "hls" | "snapshot";

export type LiveModeId =
  | "webrtc:main"
  | "webrtc:sub"
  | "hls:main"
  | "hls:sub"
  | "snapshot:main"
  | "snapshot:sub";

export type ViewerStateKind =
  | "connecting"
  | "live"
  | "reconnecting"
  | "failed";

export type LiveViewPlayback = {
  whepUrl: string | null;
  hlsUrl: string | null;
  snapshotUrl: string | null;
};

export type LiveMode = {
  id: LiveModeId;
  label: string;
  transport: StreamTransport;
  quality: StreamQuality;
  enabled: boolean;
  playback: LiveViewPlayback;
  disabledReason?: string;
};

export type LiveViewBootstrap = {
  modes: LiveMode[];
  preferredModeId: LiveModeId | null;
  fallbackOrder: LiveModeId[];
  diagnostics: LiveViewDiagnostics;
};

export type LiveViewDiagnostics = {
  state: ViewerStateKind;
  currentModeId: LiveModeId | null;
  nextFallbackModeId: LiveModeId | null;
  reason: string | null;
};

export type LiveViewHealth = {
  relay: "starting" | "ready" | "failed";
  reason?: string;
};
