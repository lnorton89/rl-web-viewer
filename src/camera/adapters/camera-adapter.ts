import type { CapabilitySnapshot } from "../capability-snapshot.js";
import type { ReolinkRequestExecutor } from "../reolink-discovery.js";
import type { ResolvedReolinkLiveStreams } from "../reolink-live-streams.js";
import type { ReolinkSession } from "../reolink-session.js";
import type { CameraConfig } from "../../config/camera-config.js";
import type {
  CameraIdentity,
  ReolinkAbility,
  ReolinkDeviceInfo,
  ReolinkNetPort,
} from "../../types/reolink.js";
import type { PtzService } from "../../types/ptz.js";
import type { SettingsService } from "../../types/settings.js";

export type CameraProbeResult = {
  identity: CameraIdentity;
  devInfo: ReolinkDeviceInfo;
  ports: ReolinkNetPort;
  ability: ReolinkAbility;
  rawAbility: ReolinkAbility;
};

type AdapterSession = Pick<ReolinkSession, "requestJson">;

export type CameraAdapterPtzServiceOptions = {
  config?: CameraConfig;
  configPath?: string;
  snapshotPath?: string;
  session?: AdapterSession;
  debugArtifactDirectory?: string;
  loadSnapshot?: (
    config: CameraConfig,
    snapshotPath?: string,
  ) => Promise<CapabilitySnapshot>;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  wait?: (ms: number) => Promise<void>;
};

export type CameraAdapterSettingsServiceOptions = {
  config?: CameraConfig;
  configPath?: string;
  snapshotPath?: string;
  session?: AdapterSession;
  debugArtifactDirectory?: string;
  loadSnapshot?: (
    config: CameraConfig,
    snapshotPath?: string,
  ) => Promise<CapabilitySnapshot>;
};

export interface CameraAdapter {
  adapterId: string;
  matchesIdentity(identity: CameraIdentity): boolean;
  probe(session: ReolinkRequestExecutor): Promise<CameraProbeResult>;
  buildCapabilitySnapshot(input: {
    identity: CameraIdentity;
    ports: ReolinkNetPort;
    ability: ReolinkAbility;
  }): CapabilitySnapshot;
  resolveLiveStreams(
    config: CameraConfig,
    snapshot: CapabilitySnapshot,
  ): ResolvedReolinkLiveStreams;
  createPtzService(options: CameraAdapterPtzServiceOptions): PtzService;
  createSettingsService(
    options: CameraAdapterSettingsServiceOptions,
  ): SettingsService;
  classifyFailure(
    scope: "probe" | "live-view" | "ptz" | "settings",
    error: unknown,
  ): string;
}
