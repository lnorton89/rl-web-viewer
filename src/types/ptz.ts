export type PtzDirection = "up" | "down" | "left" | "right";

export type PtzZoomDirection = "in" | "out";

export type FocusResult = { focusValue: number };
export type IrisResult = { irisValue: number };
export type SpeedResult = { speedValue: number };

export type PtzStopReason =
  | "release"
  | "explicit-stop"
  | "pointer-cancel"
  | "blur"
  | "visibility-hidden"
  | "watchdog";

export type PtzPreset = {
  id: number;
  name: string;
};

export type PtzBootstrap = {
  supportsPtzControl: boolean;
  supportsPtzPreset: boolean;
  hasVisibleStop: true;
  stopDeadlineMs: number;
  zoomPulseMs: number;
  presets: PtzPreset[];
};

export type MotionStartResult = {
  direction: PtzDirection;
  stopDeadlineMs: number;
};

export type MotionStopResult = {
  stopped: boolean;
  reason: PtzStopReason;
};

export type ZoomPulseResult = {
  direction: PtzZoomDirection;
  pulseMs: number;
};

export type PresetRecallResult = {
  presetId: number;
};

export interface PtzService {
  getBootstrap(): Promise<PtzBootstrap>;
  startMotion(direction: PtzDirection): Promise<MotionStartResult>;
  stopMotion(reason: PtzStopReason): Promise<MotionStopResult>;
  pulseZoom(direction: PtzZoomDirection): Promise<ZoomPulseResult>;
  recallPreset(presetId: number): Promise<PresetRecallResult>;
  setFocus(value: number): Promise<FocusResult>;
  setIris(value: number): Promise<IrisResult>;
  setSpeed(value: number): Promise<SpeedResult>;
}
