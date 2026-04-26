import { useCallback, useEffect, useState } from "react";
import {
  fetchAudioCapability,
  setMute,
  setVolume,
  applyAudioToVideo,
} from "../lib/audio-api.js";

const STORAGE_KEY_MUTED = "audio-muted";
const STORAGE_KEY_VOLUME = "audio-volume";
const DEFAULT_VOLUME = 75;

export interface AudioControlsState {
  hasAudio: boolean;
  isMuted: boolean;
  volume: number;
  setMuted: (muted: boolean) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  applyToVideo: (video: HTMLVideoElement) => void;
}

function loadStoredVolume(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed;
      }
    }
  } catch {
    // localStorage not available
  }
  return DEFAULT_VOLUME;
}

function loadStoredMuted(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MUTED);
    if (stored !== null) {
      return stored === "true";
    }
  } catch {
    // localStorage not available
  }
  return true;
}

function saveVolume(volume: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
  } catch {
    // localStorage not available
  }
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
  } catch {
    // localStorage not available
  }
}

export function useAudioControls(): AudioControlsState {
  const [hasAudio, setHasAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(loadStoredMuted);
  const [volume, setVolumeState] = useState(loadStoredVolume);

  useEffect(() => {
    const abortController = new AbortController();

    void fetchAudioCapability(abortController.signal)
      .then(({ hasAudio: audioSupported }) => {
        setHasAudio(audioSupported);
      })
      .catch(() => {
        setHasAudio(false);
      });

    return () => {
      abortController.abort();
    };
  }, []);

  const setMutedHandler = useCallback(async (muted: boolean) => {
    setIsMuted(muted);
    saveMuted(muted);

    try {
      await setMute(muted);
    } catch {
      // API call failed, but UI state is already updated
    }
  }, []);

  const setVolumeHandler = useCallback(async (vol: number) => {
    setVolumeState(vol);
    saveVolume(vol);

    try {
      await setVolume(vol);
    } catch {
      // API call failed, but UI state is already updated
    }
  }, []);

  const applyToVideo = useCallback(
    (video: HTMLVideoElement) => {
      applyAudioToVideo(video, volume, isMuted);
    },
    [volume, isMuted],
  );

  return {
    hasAudio,
    isMuted,
    volume,
    setMuted: setMutedHandler,
    setVolume: setVolumeHandler,
    applyToVideo,
  };
}
