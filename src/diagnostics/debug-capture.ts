import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type DebugArtifactInput = {
  timestamp?: string;
  command: string;
  endpoint: string;
  status: number;
  requestBody?: unknown;
  responseBody: unknown;
};

export function defaultDebugArtifactDirectory(): string {
  return path.resolve(process.cwd(), ".local", "debug");
}

export function sanitizeForDebug(value: unknown, parentKey = ""): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForDebug(entry, parentKey));
  }

  if (typeof value === "string") {
    return sanitizeStringForDebug(value);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      const keyLower = key.toLowerCase();
      const parentLower = parentKey.toLowerCase();
      const outputKey = getDebugKey(key, keyLower);

      if (isSecretKey(keyLower)) {
        return [outputKey, "[REDACTED]"];
      }

      if (keyLower.includes("token")) {
        if (typeof entryValue === "string") {
          return [outputKey, maskTokenLikeValue(entryValue)];
        }

        return [outputKey, sanitizeForDebug(entryValue, key)];
      }

      if (parentLower === "token" && keyLower === "name") {
        return [outputKey, maskTokenLikeValue(entryValue)];
      }

      return [outputKey, sanitizeForDebug(entryValue, key)];
    }),
  );
}

export async function writeDebugArtifact(
  artifact: DebugArtifactInput,
  directory = defaultDebugArtifactDirectory(),
): Promise<string> {
  await mkdir(directory, { recursive: true });
  const timestamp = artifact.timestamp ?? new Date().toISOString();
  const fileName = `${timestamp.replace(/[:.]/g, "-")}-${slugify(artifact.command)}.json`;
  const filePath = path.join(directory, fileName);
  const sanitized = {
    timestamp,
    command: artifact.command,
    endpoint: artifact.endpoint,
    status: artifact.status,
    requestBody: sanitizeForDebug(artifact.requestBody),
    responseBody: sanitizeForDebug(artifact.responseBody),
  };

  await writeFile(filePath, `${JSON.stringify(sanitized, null, 2)}\n`, "utf8");
  return filePath;
}

function maskTokenLikeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return "[MASKED_TOKEN]";
  }

  return sanitizeForDebug(value, "token");
}

function isSecretKey(keyLower: string): boolean {
  return (
    keyLower.includes("password") ||
    keyLower.includes("secret") ||
    keyLower.includes("streamname") ||
    keyLower.includes("stream_name") ||
    keyLower.includes("ingestion") ||
    keyLower.includes("rtsp") ||
    keyLower.includes("rtmp")
  );
}

function getDebugKey(key: string, keyLower: string): string {
  if (
    keyLower === "access_token" ||
    keyLower === "refresh_token" ||
    keyLower === "client_secret" ||
    keyLower === "streamname" ||
    keyLower === "stream_name"
  ) {
    return "redacted";
  }

  return key;
}

function sanitizeStringForDebug(value: string): string {
  if (/^rtmps?:\/\//i.test(value) || /^rtsp:\/\//i.test(value)) {
    return "[REDACTED]";
  }

  return value
    .replace(/rtmps?:\/\/[^\s"']+/gi, "[REDACTED]")
    .replace(/rtsp:\/\/[^\s"']+/gi, "[REDACTED]");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
