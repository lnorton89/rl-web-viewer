import type { CapabilitySnapshot } from "../camera/capability-snapshot.js";
import type {
  LiveMode,
  LiveModeId,
  LiveViewPlayback,
  StreamQuality,
  StreamTransport,
} from "../types/live-view.js";

type LiveModeDefinition = {
  id: LiveModeId;
  label: string;
  quality: StreamQuality;
  transport: StreamTransport;
};

const EMPTY_PLAYBACK: LiveViewPlayback = {
  whepUrl: null,
  hlsUrl: null,
  snapshotUrl: null,
};

const LIVE_MODE_DEFINITIONS: readonly LiveModeDefinition[] = [
  {
    id: "webrtc:main",
    label: "WebRTC Main",
    quality: "main",
    transport: "webrtc",
  },
  {
    id: "webrtc:sub",
    label: "WebRTC Sub",
    quality: "sub",
    transport: "webrtc",
  },
  {
    id: "hls:main",
    label: "HLS Main",
    quality: "main",
    transport: "hls",
  },
  {
    id: "hls:sub",
    label: "HLS Sub",
    quality: "sub",
    transport: "hls",
  },
  {
    id: "snapshot:main",
    label: "Snapshot Main",
    quality: "main",
    transport: "snapshot",
  },
  {
    id: "snapshot:sub",
    label: "Snapshot Sub",
    quality: "sub",
    transport: "snapshot",
  },
] as const;

export const DEFAULT_MODE_ORDER: LiveModeId[] = [
  "webrtc:main",
  "webrtc:sub",
  "hls:sub",
  "snapshot:main",
];

export function buildLiveModes(snapshot: CapabilitySnapshot): LiveMode[] {
  const liveTransportEnabled =
    snapshot.supportsLiveView === true && snapshot.ports.rtsp > 0;

  return LIVE_MODE_DEFINITIONS.map((definition) => ({
    ...definition,
    enabled: isModeEnabled(definition.transport, liveTransportEnabled, snapshot),
    playback: { ...EMPTY_PLAYBACK },
  }));
}

export function pickPreferredMode(modes: readonly LiveMode[]): LiveMode | null {
  const modeMap = new Map(modes.map((mode) => [mode.id, mode] as const));

  for (const modeId of buildFallbackOrder(modes)) {
    const mode = modeMap.get(modeId);

    if (mode?.enabled) {
      return mode;
    }
  }

  return null;
}

export function buildFallbackOrder(modes: readonly LiveMode[]): LiveModeId[] {
  const enabledModeIds = new Set(
    modes.filter((mode) => mode.enabled).map((mode) => mode.id),
  );

  return DEFAULT_MODE_ORDER.filter((modeId) => enabledModeIds.has(modeId));
}

function isModeEnabled(
  transport: StreamTransport,
  liveTransportEnabled: boolean,
  snapshot: CapabilitySnapshot,
): boolean {
  if (transport === "snapshot") {
    return snapshot.supportsSnapshot === true;
  }

  return liveTransportEnabled;
}
