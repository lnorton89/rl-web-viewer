import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type {
  PtzPreset,
  PtzDirection,
  PtzStopReason,
  PtzZoomDirection,
} from "../../../src/types/ptz.js";
import {
  fetchPtzAdvanced,
  fetchPtzBootstrap,
  pulsePtzZoom,
  recallPtzPreset,
  setFocus,
  setIris,
  setSpeed,
  startPtzMotion,
  stopPtzMotion,
} from "../lib/ptz-api.js";

const BOOTSTRAP_STATUS_COPY = "Loading PTZ...";
const READY_STATUS_COPY = "PTZ ready.";
const HOLD_HELPER_COPY = "Hold to move. Release to stop.";
const UNSUPPORTED_COPY = "PTZ is not available for this camera profile.";
const COMMAND_FAILURE_COPY =
  "PTZ command did not finish. Release the control, press Stop Camera once, then retry.";
const STOPPED_COPY = "Motion stopped";

type MotionSession = {
  button: HTMLButtonElement;
  direction: PtzDirection;
  pointerId: number;
  started: boolean;
  stopReason: PtzStopReason | null;
};

export type PtzBusyAction =
  | { kind: "bootstrapping" }
  | { kind: "moving"; direction: PtzDirection }
  | { kind: "stopping"; reason: PtzStopReason }
  | { kind: "zoom"; direction: PtzZoomDirection }
  | { kind: "preset"; presetId: number }
  | null;

type MotionButtonProps = {
  "aria-pressed": boolean;
  disabled: boolean;
  onLostPointerCapture: () => void;
  onPointerCancel: () => void;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
};

type UsePtzControlsResult = {
  errorText: string | null;
  activeDirection: PtzDirection | null;
  busyAction: PtzBusyAction;
  hasVisibleStop: boolean;
  presets: PtzPreset[];
  statusText: string;
  supportsPtzControl: boolean;
  supportsPtzPreset: boolean;
  focusValue: number;
  irisValue: number;
  speedValue: number;
  getMotionButtonProps(direction: PtzDirection): MotionButtonProps;
  pulseZoom(direction: PtzZoomDirection): Promise<void>;
  recallPreset(presetId: number): Promise<void>;
  stopMotion(reason?: PtzStopReason): Promise<void>;
  setFocus(value: number): Promise<void>;
  setIris(value: number): Promise<void>;
  setSpeed(value: number): Promise<void>;
};

export function usePtzControls(): UsePtzControlsResult {
  const [presets, setPresets] = useState<PtzPreset[]>([]);
  const [supportsPtzControl, setSupportsPtzControl] = useState(false);
  const [supportsPtzPreset, setSupportsPtzPreset] = useState(false);
  const [hasVisibleStop, setHasVisibleStop] = useState(false);
  const [activeDirection, setActiveDirection] = useState<PtzDirection | null>(
    null,
  );
  const [busyAction, setBusyAction] = useState<PtzBusyAction>({
    kind: "bootstrapping",
  });
  const [statusText, setStatusText] = useState(BOOTSTRAP_STATUS_COPY);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [focusValue, setFocusValue] = useState(50);
  const [irisValue, setIrisValue] = useState(50);
  const [speedValue, setSpeedValue] = useState(5);

  const motionSessionRef = useRef<MotionSession | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const statusTimerRef = useRef<number | null>(null);

  const clearStatusTimer = useCallback(() => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
  }, []);

  const setTransientStatus = useCallback(
    (copy: string, durationMs = 1200) => {
      clearStatusTimer();
      setStatusText(copy);
      statusTimerRef.current = window.setTimeout(() => {
        setStatusText(HOLD_HELPER_COPY);
        statusTimerRef.current = null;
      }, durationMs);
    },
    [clearStatusTimer],
  );

  const releaseMotionCapture = useCallback((session: MotionSession | null) => {
    if (session === null) {
      return;
    }

    try {
      if (session.button.hasPointerCapture(session.pointerId)) {
        session.button.releasePointerCapture(session.pointerId);
      }
    } catch {
      // Ignore browsers or test environments without pointer capture support.
    }
  }, []);

  const resetMotionSession = useCallback(
    (session: MotionSession | null) => {
      if (motionSessionRef.current === session) {
        motionSessionRef.current = null;
      }

      releaseMotionCapture(session);
      setActiveDirection(null);
    },
    [releaseMotionCapture],
  );

  const finishStop = useCallback(
    async (reason: PtzStopReason, session: MotionSession | null) => {
      if (stopPromiseRef.current !== null) {
        return stopPromiseRef.current;
      }

      clearStatusTimer();
      setBusyAction({
        kind: "stopping",
        reason,
      });
      setStatusText("Stopping camera...");
      setErrorText(null);

      const stopPromise = stopPtzMotion(reason)
        .then(() => {
          setTransientStatus(STOPPED_COPY);
        })
        .catch((error: unknown) => {
          setStatusText(COMMAND_FAILURE_COPY);
          setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
        })
        .finally(() => {
          if (stopPromiseRef.current === stopPromise) {
            stopPromiseRef.current = null;
          }

          resetMotionSession(session);
          setBusyAction(null);
        });

      stopPromiseRef.current = stopPromise;
      return stopPromise;
    },
    [clearStatusTimer, resetMotionSession, setTransientStatus],
  );

  const requestStop = useCallback(
    async (reason: PtzStopReason, force = false) => {
      const session = motionSessionRef.current;

      if (session === null) {
        if (!force || !supportsPtzControl) {
          return;
        }

        await finishStop(reason, null);
        return;
      }

      session.stopReason =
        reason === "explicit-stop" || session.stopReason === null
          ? reason
          : session.stopReason;

      if (!session.started) {
        clearStatusTimer();
        setBusyAction({
          kind: "stopping",
          reason: session.stopReason,
        });
        setStatusText("Stopping camera...");
        return;
      }

      await finishStop(session.stopReason, session);
    },
    [clearStatusTimer, finishStop, supportsPtzControl],
  );

  useEffect(() => {
    const abortController = new AbortController();

    void fetchPtzBootstrap(abortController.signal)
      .then((bootstrap) => {
        if (abortController.signal.aborted) {
          return;
        }

        setSupportsPtzControl(bootstrap.supportsPtzControl);
        setSupportsPtzPreset(bootstrap.supportsPtzPreset);
        setHasVisibleStop(bootstrap.hasVisibleStop);
        setPresets(bootstrap.presets);
        setBusyAction(null);
        setStatusText(
          bootstrap.supportsPtzControl ? READY_STATUS_COPY : UNSUPPORTED_COPY,
        );
        setErrorText(null);

        if (bootstrap.supportsPtzControl) {
          void fetchPtzAdvanced(abortController.signal)
            .then(({ focus, iris, speed }) => {
              setFocusValue(focus);
              setIrisValue(iris);
              setSpeedValue(speed);
            })
            .catch(() => {});
        }
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        setBusyAction(null);
        setStatusText(UNSUPPORTED_COPY);
        setErrorText(getErrorMessage(error, UNSUPPORTED_COPY));
      });

    return () => {
      abortController.abort();
      clearStatusTimer();
    };
  }, [clearStatusTimer]);

  useEffect(() => {
    function handleBlur() {
      void requestStop("blur");
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        void requestStop("visibility-hidden");
      }
    }

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requestStop]);

  const beginMotion = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, direction: PtzDirection) => {
      if (!supportsPtzControl || motionSessionRef.current !== null) {
        return;
      }

      clearStatusTimer();
      setErrorText(null);
      setActiveDirection(direction);
      setBusyAction({
        kind: "moving",
        direction,
      });
      setStatusText(`Moving ${formatDirection(direction)}...`);

      const button = event.currentTarget;
      const session: MotionSession = {
        button,
        direction,
        pointerId: event.pointerId,
        started: false,
        stopReason: null,
      };
      motionSessionRef.current = session;

      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // Ignore environments without pointer capture support.
      }

      void startPtzMotion(direction)
        .then(() => {
          if (motionSessionRef.current !== session) {
            return;
          }

          session.started = true;

          if (session.stopReason !== null) {
            void finishStop(session.stopReason, session);
          }
        })
        .catch((error: unknown) => {
          if (motionSessionRef.current !== session) {
            return;
          }

          resetMotionSession(session);
          setBusyAction(null);
          setStatusText(COMMAND_FAILURE_COPY);
          setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
        });
    },
    [clearStatusTimer, finishStop, resetMotionSession, supportsPtzControl],
  );

  const getMotionButtonProps = useCallback(
    (direction: PtzDirection): MotionButtonProps => {
      const directionLocked =
        activeDirection !== null && activeDirection !== direction;
      const actionLocked =
        busyAction?.kind === "bootstrapping" ||
        busyAction?.kind === "zoom" ||
        busyAction?.kind === "preset" ||
        busyAction?.kind === "stopping";

      return {
        "aria-pressed": activeDirection === direction,
        disabled: !supportsPtzControl || directionLocked || actionLocked,
        onPointerDown: (event) => {
          beginMotion(event, direction);
        },
        onPointerUp: () => {
          void requestStop("release");
        },
        onPointerCancel: () => {
          void requestStop("pointer-cancel");
        },
        onLostPointerCapture: () => {
          void requestStop("pointer-cancel");
        },
      };
    },
    [activeDirection, beginMotion, busyAction, requestStop, supportsPtzControl],
  );

  const pulseZoom = useCallback(
    async (direction: PtzZoomDirection) => {
      if (!supportsPtzControl || motionSessionRef.current !== null) {
        return;
      }

      clearStatusTimer();
      setBusyAction({
        kind: "zoom",
        direction,
      });
      setStatusText(
        direction === "in" ? "Zooming in..." : "Zooming out...",
      );
      setErrorText(null);

      try {
        await pulsePtzZoom(direction);
        setTransientStatus(READY_STATUS_COPY);
      } catch (error: unknown) {
        setStatusText(COMMAND_FAILURE_COPY);
        setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
      } finally {
        setBusyAction(null);
      }
    },
    [clearStatusTimer, setTransientStatus, supportsPtzControl],
  );

  const recallPreset = useCallback(
    async (presetId: number) => {
      if (
        !supportsPtzControl ||
        !supportsPtzPreset ||
        motionSessionRef.current !== null
      ) {
        return;
      }

      clearStatusTimer();
      setBusyAction({
        kind: "preset",
        presetId,
      });
      setStatusText("Recalling preset...");
      setErrorText(null);

      try {
        await recallPtzPreset(presetId);
        setTransientStatus("Preset recalled");
      } catch (error: unknown) {
        setStatusText(COMMAND_FAILURE_COPY);
        setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
      } finally {
        setBusyAction(null);
      }
    },
    [clearStatusTimer, setTransientStatus, supportsPtzControl, supportsPtzPreset],
  );

  const stopMotion = useCallback(
    async (reason: PtzStopReason = "explicit-stop") => {
      await requestStop(reason, reason === "explicit-stop");
    },
    [requestStop],
  );

  const setFocusHandler = useCallback(
    async (value: number) => {
      if (!supportsPtzControl) {
        return;
      }

      try {
        const result = await setFocus(value);
        setFocusValue(result.focusValue);
        setTransientStatus(`Focus set to ${result.focusValue}`);
      } catch (error: unknown) {
        setStatusText(COMMAND_FAILURE_COPY);
        setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
      }
    },
    [supportsPtzControl, setTransientStatus],
  );

  const setIrisHandler = useCallback(
    async (value: number) => {
      if (!supportsPtzControl) {
        return;
      }

      try {
        const result = await setIris(value);
        setIrisValue(result.irisValue);
        setTransientStatus(`Iris set to ${result.irisValue}`);
      } catch (error: unknown) {
        setStatusText(COMMAND_FAILURE_COPY);
        setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
      }
    },
    [supportsPtzControl, setTransientStatus],
  );

  const setSpeedHandler = useCallback(
    async (value: number) => {
      if (!supportsPtzControl) {
        return;
      }

      try {
        const result = await setSpeed(value);
        setSpeedValue(result.speedValue);
        setTransientStatus(`Speed set to ${result.speedValue}`);
      } catch (error: unknown) {
        setStatusText(COMMAND_FAILURE_COPY);
        setErrorText(getErrorMessage(error, COMMAND_FAILURE_COPY));
      }
    },
    [supportsPtzControl, setTransientStatus],
  );

  return {
    errorText,
    activeDirection,
    busyAction,
    hasVisibleStop,
    presets,
    statusText,
    supportsPtzControl,
    supportsPtzPreset,
    focusValue,
    irisValue,
    speedValue,
    getMotionButtonProps,
    pulseZoom,
    recallPreset,
    stopMotion,
    setFocus: setFocusHandler,
    setIris: setIrisHandler,
    setSpeed: setSpeedHandler,
  };
}

function formatDirection(direction: PtzDirection): string {
  return direction[0]!.toUpperCase() + direction.slice(1);
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim() !== ""
  ) {
    return error.message;
  }

  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }

  return fallbackMessage;
}
