import { access } from "node:fs/promises";
import { constants } from "node:fs";

export type FfmpegAvailability = {
  available: boolean;
  executablePath: string | null;
  reason: string | null;
};

export type FfmpegAvailabilityOptions = {
  executablePath?: string;
};

export async function resolveFfmpegExecutable(
  options: FfmpegAvailabilityOptions = {},
): Promise<string | null> {
  const executablePath = options.executablePath ?? process.env.FFMPEG_PATH ?? "ffmpeg";

  if (executablePath === "ffmpeg") {
    return executablePath;
  }

  try {
    await access(executablePath, constants.X_OK);
    return executablePath;
  } catch {
    return null;
  }
}

export async function getFfmpegAvailability(
  options: FfmpegAvailabilityOptions = {},
): Promise<FfmpegAvailability> {
  const executablePath = await resolveFfmpegExecutable(options);

  if (!executablePath) {
    return {
      available: false,
      executablePath: null,
      reason: "Install FFmpeg and ensure ffmpeg is on PATH, or set FFMPEG_PATH to the executable.",
    };
  }

  return {
    available: true,
    executablePath,
    reason: null,
  };
}
