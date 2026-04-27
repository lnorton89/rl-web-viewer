import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { YouTubeAuthStatus } from "../types/youtube-streaming.js";

const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";

const installedClientSchema = z
  .object({
    client_id: z.string().min(1),
    client_secret: z.string().min(1),
    redirect_uris: z.array(z.string().url()).min(1).default([]),
  })
  .strict();

const importedDesktopClientSchema = z
  .object({
    installed: installedClientSchema,
  })
  .strict();

export const youtubeConfigSchema = importedDesktopClientSchema.transform(
  ({ installed }) => ({
    clientId: installed.client_id,
    clientSecret: installed.client_secret,
    redirectUris: installed.redirect_uris,
  }),
);

const storedYouTubeConfigSchema = z
  .object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    redirectUris: z.array(z.string().url()).min(1).default([]),
  })
  .strict();

const youtubeTokensSchema = z
  .object({
    access_token: z.string().min(1).optional(),
    refresh_token: z.string().min(1).optional(),
    scope: z.string().optional(),
    token_type: z.string().optional(),
    expiry_date: z.number().int().positive().optional(),
  })
  .passthrough();

export type YouTubeConfig = z.infer<typeof storedYouTubeConfigSchema>;
export type YouTubeTokens = z.infer<typeof youtubeTokensSchema>;

export function defaultYouTubePluginDirectory(): string {
  return path.resolve(process.cwd(), ".local", "plugins", "youtube");
}

export function defaultYouTubeConfigPath(): string {
  return path.join(defaultYouTubePluginDirectory(), "client.json");
}

export function defaultYouTubeTokensPath(): string {
  return path.join(defaultYouTubePluginDirectory(), "tokens.json");
}

export function defaultYouTubeOAuthStatePath(): string {
  return path.join(defaultYouTubePluginDirectory(), "oauth-state.json");
}

export async function loadYouTubeConfig(
  configPath = defaultYouTubeConfigPath(),
): Promise<YouTubeConfig | null> {
  try {
    const raw = await readFile(configPath, "utf8");
    return storedYouTubeConfigSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isFileNotFound(error)) {
      return null;
    }

    throw error;
  }
}

export async function saveYouTubeConfig(
  config: unknown,
  configPath = defaultYouTubeConfigPath(),
): Promise<YouTubeConfig> {
  await mkdir(path.dirname(configPath), { recursive: true });
  const parsed = parseYouTubeConfig(config);
  await writeFile(configPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  const verified = await loadYouTubeConfig(configPath);

  if (!verified) {
    throw new Error("YouTube OAuth client config was not written");
  }

  return storedYouTubeConfigSchema.parse(verified);
}

export async function loadYouTubeTokens(
  tokensPath = defaultYouTubeTokensPath(),
): Promise<YouTubeTokens | null> {
  try {
    const raw = await readFile(tokensPath, "utf8");
    return youtubeTokensSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (isFileNotFound(error)) {
      return null;
    }

    throw error;
  }
}

export async function saveYouTubeTokens(
  tokens: unknown,
  tokensPath = defaultYouTubeTokensPath(),
): Promise<YouTubeTokens> {
  await mkdir(path.dirname(tokensPath), { recursive: true });
  const parsed = youtubeTokensSchema.parse(tokens);
  await writeFile(tokensPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  const verified = await loadYouTubeTokens(tokensPath);

  if (!verified) {
    throw new Error("YouTube OAuth tokens were not written");
  }

  return youtubeTokensSchema.parse(verified);
}

export async function clearYouTubeTokens(
  tokensPath = defaultYouTubeTokensPath(),
): Promise<void> {
  await rm(tokensPath, { force: true });
}

export async function buildYouTubeAuthStatus(options: {
  configPath?: string;
  tokensPath?: string;
  pendingState?: string;
  now?: () => string;
} = {}): Promise<YouTubeAuthStatus> {
  const now = options.now ?? (() => new Date().toISOString());
  const [config, tokens] = await Promise.all([
    loadYouTubeConfig(options.configPath),
    loadYouTubeTokens(options.tokensPath),
  ]);

  if (!config) {
    return {
      configured: false,
      connected: false,
      state: "missing-client",
      message: "Import a Desktop OAuth client before connecting YouTube.",
      hasRefreshToken: false,
      authorizedScopes: [],
      expiresAt: null,
      updatedAt: now(),
      ...(options.pendingState ? { pendingState: options.pendingState } : {}),
    };
  }

  if (options.pendingState) {
    return {
      configured: true,
      connected: false,
      state: "pending",
      message: "YouTube authorization is waiting for the OAuth callback.",
      hasRefreshToken: Boolean(tokens?.refresh_token),
      authorizedScopes: parseScopes(tokens?.scope),
      expiresAt: formatExpiry(tokens?.expiry_date),
      updatedAt: now(),
      pendingState: options.pendingState,
    };
  }

  if (tokens?.access_token || tokens?.refresh_token) {
    return {
      configured: true,
      connected: true,
      state: "connected",
      message: "YouTube account is connected.",
      hasRefreshToken: Boolean(tokens.refresh_token),
      authorizedScopes: parseScopes(tokens.scope),
      expiresAt: formatExpiry(tokens.expiry_date),
      updatedAt: now(),
    };
  }

  return {
    configured: true,
    connected: false,
    state: "disconnected",
    message: "YouTube OAuth client is configured but not connected.",
    hasRefreshToken: false,
    authorizedScopes: [],
    expiresAt: null,
    updatedAt: now(),
  };
}

export function parseYouTubeConfig(config: unknown): YouTubeConfig {
  const stored = storedYouTubeConfigSchema.safeParse(config);

  if (stored.success) {
    return stored.data;
  }

  return youtubeConfigSchema.parse(config);
}

export function getYouTubeOAuthScope(): string {
  return YOUTUBE_SCOPE;
}

function parseScopes(scope: string | undefined): readonly string[] {
  return scope
    ?.split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0) ?? [];
}

function formatExpiry(expiryDate: number | undefined): string | null {
  return typeof expiryDate === "number"
    ? new Date(expiryDate).toISOString()
    : null;
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
