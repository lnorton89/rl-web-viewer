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

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      const keyLower = key.toLowerCase();
      const parentLower = parentKey.toLowerCase();

      if (keyLower.includes("password")) {
        return [key, "[REDACTED]"];
      }

      if (keyLower.includes("token")) {
        if (typeof entryValue === "string") {
          return [key, maskTokenLikeValue(entryValue)];
        }

        return [key, sanitizeForDebug(entryValue, key)];
      }

      if (parentLower === "token" && keyLower === "name") {
        return [key, maskTokenLikeValue(entryValue)];
      }

      return [key, sanitizeForDebug(entryValue, key)];
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
