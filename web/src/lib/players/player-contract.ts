export type PlayerAttachment = {
  ready: Promise<void>;
  destroy(): void;
};

export type PlayerOptions = {
  onError?: (reason: string) => void;
};

export function normalizePlayerError(
  error: unknown,
  fallbackMessage: string,
): string {
  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim() !== ""
  ) {
    return error.message;
  }

  return fallbackMessage;
}
