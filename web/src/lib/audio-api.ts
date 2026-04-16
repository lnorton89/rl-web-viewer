const AUDIO_ENDPOINT = "/api/audio";

export interface AudioCapability {
  hasAudio: boolean;
}

export async function fetchAudioCapability(
  signal?: AbortSignal,
): Promise<AudioCapability> {
  const response = await fetch(`${AUDIO_ENDPOINT}/capability`, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    return { hasAudio: false };
  }

  try {
    const data = (await response.json()) as { hasAudio?: boolean };
    return { hasAudio: data.hasAudio ?? false };
  } catch {
    return { hasAudio: false };
  }
}

export async function setVolume(
  volume: number,
  signal?: AbortSignal,
): Promise<{ volume: number }> {
  const response = await fetch(`${AUDIO_ENDPOINT}/volume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ volume }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Volume request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { volume?: number };
  return { volume: data.volume ?? volume };
}

export async function setMute(
  muted: boolean,
  signal?: AbortSignal,
): Promise<{ muted: boolean }> {
  const response = await fetch(`${AUDIO_ENDPOINT}/mute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ muted }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Mute request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { muted?: boolean };
  return { muted: data.muted ?? muted };
}

export function applyAudioToVideo(
  video: HTMLVideoElement,
  volume: number,
  muted: boolean,
): void {
  video.volume = volume / 100;
  video.muted = muted;
}
