import { useCallback, useEffect, useRef, useState } from "react";

import type {
  LiveMode,
  LiveModeId,
  LiveViewBootstrap,
  LiveViewPlayback,
  ViewerStateKind,
} from "../../../src/types/live-view.js";
import {
  fetchLiveViewBootstrap,
  fetchLiveViewHealth,
} from "../lib/live-view-api.js";
import { attachHlsPlayer } from "../lib/players/hls-player.js";
import type { PlayerAttachment } from "../lib/players/player-contract.js";
import { attachSnapshotPlayer } from "../lib/players/snapshot-player.js";
import { attachWebRtcPlayer } from "../lib/players/webrtc-player.js";

const RETRY_DELAYS_MS = [1000, 2000, 5000] as const;
const BOOTSTRAP_FAILURE_MESSAGE = "Live view could not start";
const PLAYBACK_UNAVAILABLE_MESSAGE = "This live mode is missing a playback URL";

type ViewerState = {
  kind: ViewerStateKind;
  reason?: string;
};

type ActiveAttempt = {
  modeId: LiveModeId;
  retryCount: number;
};

export function useLiveView(): {
  state: ViewerState;
  modes: LiveMode[];
  currentModeId: LiveModeId | null;
  fallbackOrder: LiveModeId[];
  nextFallbackModeId: LiveModeId | null;
  renderKind: "video" | "image";
  activePlayback: LiveViewPlayback | null;
  videoElement: HTMLVideoElement | null;
  bindVideoElement(node: HTMLVideoElement | null): void;
  bindImageElement(node: HTMLImageElement | null): void;
  selectMode(modeId: LiveModeId): Promise<void>;
  retry(): Promise<void>;
} {
  const [bootstrap, setBootstrap] = useState<LiveViewBootstrap | null>(null);
  const [state, setState] = useState<ViewerState>({ kind: "connecting" });
  const [currentModeId, setCurrentModeId] = useState<LiveModeId | null>(null);
  const [activationNonce, setActivationNonce] = useState(0);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null,
  );

  const attachmentRef = useRef<PlayerAttachment | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const attemptTokenRef = useRef(0);
  const activeAttemptRef = useRef<ActiveAttempt | null>(null);

  const modes = bootstrap?.modes ?? [];
  const fallbackOrder = bootstrap?.fallbackOrder ?? [];
  const activeMode = findMode(modes, currentModeId);
  const renderKind = activeMode?.transport === "snapshot" ? "image" : "video";
  const activePlayback = activeMode?.playback ?? null;
  const nextFallbackModeId = getNextFallbackModeId(fallbackOrder, currentModeId);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const resetAttachment = useCallback(() => {
    attachmentRef.current?.destroy();
    attachmentRef.current = null;
  }, []);

  const beginMode = useCallback(
    (modeId: LiveModeId, reason?: string) => {
      clearRetryTimer();
      activeAttemptRef.current = {
        modeId,
        retryCount: 0,
      };
      setCurrentModeId(modeId);
      setState(reason ? { kind: "connecting", reason } : { kind: "connecting" });
      setActivationNonce((value: number) => value + 1);
    },
    [clearRetryTimer],
  );

  const handleBootstrapFailure = useCallback((reason: string) => {
    clearRetryTimer();
    resetAttachment();
    setCurrentModeId(null);
    setState({ kind: "failed", reason });
  }, [clearRetryTimer, resetAttachment]);

  const handlePlaybackFailure = useCallback(
    (modeId: LiveModeId, reason: string) => {
      const currentAttempt = activeAttemptRef.current;

      if (currentAttempt === null || currentAttempt.modeId !== modeId) {
        return;
      }

      const applyAuthFailureIfPresent = () => {
        void resolvePlaybackFailureReason(reason).then((resolvedReason) => {
          if (!isAuthFailureReason(resolvedReason)) {
            return;
          }

          const latestAttempt = activeAttemptRef.current;

          if (latestAttempt === null) {
            return;
          }

          activeAttemptRef.current = null;
          resetAttachment();
          clearRetryTimer();
          setState({ kind: "failed", reason: resolvedReason });
        });
      };

      resetAttachment();

      if (isAuthFailureReason(reason)) {
        activeAttemptRef.current = null;
        clearRetryTimer();
        setState({ kind: "failed", reason });
        return;
      }

      if (currentAttempt.retryCount < RETRY_DELAYS_MS.length) {
        const nextRetryCount = currentAttempt.retryCount + 1;
        const retryDelay = RETRY_DELAYS_MS[currentAttempt.retryCount];

        activeAttemptRef.current = {
          modeId,
          retryCount: nextRetryCount,
        };
        setState({ kind: "reconnecting", reason });
        clearRetryTimer();
        retryTimerRef.current = window.setTimeout(() => {
          setActivationNonce((value: number) => value + 1);
        }, retryDelay);
        applyAuthFailureIfPresent();
        return;
      }

      const fallbackModeId = getNextFallbackModeId(fallbackOrder, modeId);

      if (fallbackModeId !== null) {
        activeAttemptRef.current = {
          modeId: fallbackModeId,
          retryCount: 0,
        };
        setState({ kind: "reconnecting", reason });
        setCurrentModeId(fallbackModeId);
        setActivationNonce((value: number) => value + 1);
        applyAuthFailureIfPresent();
        return;
      }

      activeAttemptRef.current = null;
      setState({ kind: "failed", reason });
      void resolvePlaybackFailureReason(reason).then((resolvedReason) => {
        const latestAttempt = activeAttemptRef.current;

        if (latestAttempt !== null || !isAuthFailureReason(resolvedReason)) {
          return;
        }

        setState({ kind: "failed", reason: resolvedReason });
      });
    },
    [clearRetryTimer, fallbackOrder, resetAttachment],
  );

  useEffect(() => {
    const abortController = new AbortController();

    void fetchLiveViewBootstrap(abortController.signal)
      .then((nextBootstrap) => {
        if (abortController.signal.aborted) {
          return;
        }

        setBootstrap(nextBootstrap);

        const initialModeId =
          nextBootstrap.preferredModeId ?? nextBootstrap.fallbackOrder[0] ?? null;

        if (initialModeId === null) {
          handleBootstrapFailure(
            nextBootstrap.diagnostics.reason ?? BOOTSTRAP_FAILURE_MESSAGE,
          );
          return;
        }

        beginMode(
          initialModeId,
          nextBootstrap.diagnostics.reason ?? undefined,
        );
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        handleBootstrapFailure(getErrorMessage(error, BOOTSTRAP_FAILURE_MESSAGE));
      });

    return () => {
      abortController.abort();
      clearRetryTimer();
      resetAttachment();
    };
  }, [beginMode, clearRetryTimer, handleBootstrapFailure, resetAttachment]);

  useEffect(() => {
    if (bootstrap === null || currentModeId === null) {
      return;
    }

    const mode = findMode(bootstrap.modes, currentModeId);

    if (mode === null) {
      handlePlaybackFailure(currentModeId, PLAYBACK_UNAVAILABLE_MESSAGE);
      return;
    }

    const mediaNode =
      mode.transport === "snapshot" ? imageElement : videoElement;

    if (mediaNode === null) {
      return;
    }

    const playbackUrl = getPlaybackUrl(mode);

    if (playbackUrl === null) {
      handlePlaybackFailure(mode.id, PLAYBACK_UNAVAILABLE_MESSAGE);
      return;
    }

    const token = attemptTokenRef.current + 1;
    attemptTokenRef.current = token;
    resetAttachment();

    if (activeAttemptRef.current?.modeId !== mode.id) {
      activeAttemptRef.current = {
        modeId: mode.id,
        retryCount: 0,
      };
    }

    setState((currentState: ViewerState) =>
      currentState.kind === "reconnecting"
        ? currentState
        : { kind: "connecting" },
    );

    const attachment =
      mode.transport === "webrtc"
        ? attachWebRtcPlayer(mediaNode as HTMLVideoElement, playbackUrl, {
            onError: (reason) => {
              if (attemptTokenRef.current !== token) {
                return;
              }

              handlePlaybackFailure(mode.id, reason);
            },
          })
        : mode.transport === "hls"
          ? attachHlsPlayer(mediaNode as HTMLVideoElement, playbackUrl, {
              onError: (reason) => {
                if (attemptTokenRef.current !== token) {
                  return;
                }

                handlePlaybackFailure(mode.id, reason);
              },
            })
          : attachSnapshotPlayer(
              mediaNode as HTMLImageElement,
              playbackUrl,
              1000,
              {
                onError: (reason) => {
                  if (attemptTokenRef.current !== token) {
                    return;
                  }

                  handlePlaybackFailure(mode.id, reason);
                },
              },
            );

    attachmentRef.current = attachment;

    void attachment.ready
      .then(() => {
        if (attemptTokenRef.current !== token) {
          return;
        }

        activeAttemptRef.current = {
          modeId: mode.id,
          retryCount: 0,
        };
        setState({ kind: "live" });
      })
      .catch(() => {});

    return () => {
      if (attemptTokenRef.current === token) {
        attachmentRef.current = null;
      }

      attachment.destroy();
    };
  }, [
    activationNonce,
    bootstrap,
    currentModeId,
    handlePlaybackFailure,
    imageElement,
    resetAttachment,
    videoElement,
  ]);

  const bindVideoElement = useCallback((node: HTMLVideoElement | null) => {
    setVideoElement(node);
  }, []);

  const bindImageElement = useCallback((node: HTMLImageElement | null) => {
    setImageElement(node);
  }, []);

  const selectMode = useCallback(
    async (modeId: LiveModeId) => {
      beginMode(modeId);
    },
    [beginMode],
  );

  const retry = useCallback(async () => {
    const retryModeId =
      currentModeId ?? bootstrap?.preferredModeId ?? bootstrap?.fallbackOrder[0] ?? null;

    if (retryModeId === null) {
      handleBootstrapFailure(BOOTSTRAP_FAILURE_MESSAGE);
      return;
    }

    beginMode(retryModeId);
  }, [beginMode, bootstrap, currentModeId, handleBootstrapFailure]);

  return {
    state,
    modes,
    currentModeId,
    fallbackOrder,
    nextFallbackModeId,
    renderKind,
    activePlayback,
    videoElement,
    bindVideoElement,
    bindImageElement,
    selectMode,
    retry,
  };
}

function findMode(
  modes: LiveMode[],
  modeId: LiveModeId | null,
): LiveMode | null {
  if (modeId === null) {
    return null;
  }

  return modes.find((mode) => mode.id === modeId) ?? null;
}

function getPlaybackUrl(mode: LiveMode): string | null {
  switch (mode.transport) {
    case "webrtc":
      return mode.playback.whepUrl;
    case "hls":
      return mode.playback.hlsUrl;
    case "snapshot":
      return mode.playback.snapshotUrl;
  }
}

function getNextFallbackModeId(
  fallbackOrder: LiveModeId[],
  modeId: LiveModeId | null,
): LiveModeId | null {
  if (modeId === null) {
    return fallbackOrder[0] ?? null;
  }

  const currentIndex = fallbackOrder.indexOf(modeId);

  if (currentIndex === -1) {
    return null;
  }

  return fallbackOrder[currentIndex + 1] ?? null;
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

async function resolvePlaybackFailureReason(reason: string): Promise<string> {
  try {
    const health = await fetchLiveViewHealth();

    if (health.relay === "failed" && typeof health.reason === "string") {
      const trimmedReason = health.reason.trim();

      if (trimmedReason !== "") {
        return trimmedReason;
      }
    }
  } catch {
    // The original player error is still useful when health is unavailable.
  }

  return reason;
}

function isAuthFailureReason(reason: string): boolean {
  const normalizedReason = reason.toLowerCase();

  return (
    normalizedReason.includes("authentication failed") ||
    normalizedReason.includes("unauthorized") ||
    normalizedReason.includes("401") ||
    normalizedReason.includes("invalid credentials")
  );
}
