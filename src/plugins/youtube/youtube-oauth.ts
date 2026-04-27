import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

import {
  buildYouTubeAuthStatus,
  clearYouTubeTokens,
  defaultYouTubeConfigPath,
  defaultYouTubeOAuthStatePath,
  defaultYouTubeTokensPath,
  getYouTubeOAuthScope,
  loadYouTubeConfig,
  loadYouTubeTokens,
  saveYouTubeTokens,
  type YouTubeConfig,
  type YouTubeTokens,
} from "../../config/youtube-config.js";
import type { YouTubeAuthStatus } from "../../types/youtube-streaming.js";

type OAuthClientOptions = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type OAuthClientLike = {
  generateAuthUrl(options: Record<string, unknown>): string;
  getToken(code: string): Promise<{ tokens: Record<string, unknown> }>;
  setCredentials(tokens: Record<string, unknown>): void;
  refreshAccessToken?(): Promise<{ credentials: Record<string, unknown> }>;
  revokeCredentials(): Promise<unknown>;
  on?(eventName: "tokens", handler: (tokens: Record<string, unknown>) => void): void;
};

export type YouTubeOAuthServiceOptions = {
  configPath?: string;
  tokensPath?: string;
  statePath?: string;
  now?: () => string;
  oauthClientFactory?: (options: OAuthClientOptions) => OAuthClientLike;
};

export type YouTubeOAuthService = {
  createAuthenticatedClient(): Promise<OAuthClientLike>;
  beginAuth(input: { redirectUri?: string }): Promise<{
    authUrl: string;
    state: string;
    status: YouTubeAuthStatus;
  }>;
  completeCallback(input: { code: string; state: string }): Promise<{
    status: YouTubeAuthStatus;
  }>;
  refresh(): Promise<{ status: YouTubeAuthStatus }>;
  revoke(): Promise<{ status: YouTubeAuthStatus }>;
  getStatus(): Promise<YouTubeAuthStatus>;
};

const oauthStateSchema = z
  .object({
    state: z.string().min(16),
    redirectUri: z.string().url(),
    createdAt: z.string().min(1),
  })
  .strict();

export function createYouTubeOAuthService(
  options: YouTubeOAuthServiceOptions = {},
): YouTubeOAuthService {
  const configPath = options.configPath ?? defaultYouTubeConfigPath();
  const tokensPath = options.tokensPath ?? defaultYouTubeTokensPath();
  const statePath = options.statePath ?? defaultYouTubeOAuthStatePath();
  const now = options.now ?? (() => new Date().toISOString());
  const oauthClientFactory = options.oauthClientFactory ?? createGoogleOAuthClient;

  async function createClient(redirectUri?: string): Promise<OAuthClientLike> {
    const config = await requireConfig(configPath);
    const resolvedRedirectUri =
      redirectUri ?? config.redirectUris[0] ?? "http://127.0.0.1:4000/oauth2callback";
    const client = oauthClientFactory({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: resolvedRedirectUri,
    });

    client.on?.("tokens", (tokens) => {
      void mergeAndSaveTokens(tokensPath, tokens);
    });

    return client;
  }

  return {
    async createAuthenticatedClient() {
      const client = await createClient();
      const tokens = await requireTokens(tokensPath);
      client.setCredentials(tokens);
      return client;
    },
    async beginAuth(input) {
      const redirectUri =
        input.redirectUri ?? "http://127.0.0.1:4000/api/plugins/youtube-streaming/oauth/callback";
      const state = randomBytes(24).toString("base64url");
      const client = await createClient(redirectUri);

      await saveOAuthState(
        {
          state,
          redirectUri,
          createdAt: now(),
        },
        statePath,
      );

      const authUrl = client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [getYouTubeOAuthScope()],
        state,
      });

      return {
        authUrl,
        state,
        status: await buildYouTubeAuthStatus({
          configPath,
          tokensPath,
          pendingState: state,
          now,
        }),
      };
    },
    async completeCallback(input) {
      if (!input.code.trim()) {
        throw new Error("OAuth callback code is required.");
      }

      const state = await loadOAuthState(statePath);

      if (!state || state.state !== input.state) {
        throw new Error("OAuth callback state did not match.");
      }

      const client = await createClient(state.redirectUri);
      const { tokens } = await client.getToken(input.code);
      const parsed = await saveYouTubeTokens(tokens, tokensPath);

      client.setCredentials(parsed);
      await clearOAuthState(statePath);

      return {
        status: await buildYouTubeAuthStatus({
          configPath,
          tokensPath,
          now,
        }),
      };
    },
    async refresh() {
      const client = await createClient();
      const currentTokens = await requireTokens(tokensPath);
      client.setCredentials(currentTokens);

      const refreshed = client.refreshAccessToken
        ? (await client.refreshAccessToken()).credentials
        : currentTokens;

      await saveYouTubeTokens(
        {
          ...currentTokens,
          ...refreshed,
          refresh_token: refreshed.refresh_token ?? currentTokens.refresh_token,
        },
        tokensPath,
      );

      return {
        status: await buildYouTubeAuthStatus({
          configPath,
          tokensPath,
          now,
        }),
      };
    },
    async revoke() {
      const client = await createClient();
      const currentTokens = await loadYouTubeTokens(tokensPath);

      if (currentTokens) {
        client.setCredentials(currentTokens);
        await client.revokeCredentials();
      }

      await clearYouTubeTokens(tokensPath);
      await clearOAuthState(statePath);

      return {
        status: await buildYouTubeAuthStatus({
          configPath,
          tokensPath,
          now,
        }),
      };
    },
    async getStatus() {
      return buildYouTubeAuthStatus({
        configPath,
        tokensPath,
        now,
      });
    },
  };
}

function createGoogleOAuthClient(options: OAuthClientOptions): OAuthClientLike {
  return new OAuth2Client({
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    redirectUri: options.redirectUri,
  }) as unknown as OAuthClientLike;
}

async function requireConfig(configPath: string): Promise<YouTubeConfig> {
  const config = await loadYouTubeConfig(configPath);

  if (!config) {
    throw new Error("YouTube OAuth client is not configured.");
  }

  return config;
}

async function requireTokens(tokensPath: string): Promise<YouTubeTokens> {
  const tokens = await loadYouTubeTokens(tokensPath);

  if (!tokens) {
    throw new Error("YouTube credentials are not connected.");
  }

  return tokens;
}

async function mergeAndSaveTokens(
  tokensPath: string,
  tokens: Record<string, unknown>,
): Promise<void> {
  const currentTokens = await loadYouTubeTokens(tokensPath);
  await saveYouTubeTokens(
    {
      ...currentTokens,
      ...tokens,
      refresh_token: tokens.refresh_token ?? currentTokens?.refresh_token,
    },
    tokensPath,
  );
}

async function saveOAuthState(
  state: z.infer<typeof oauthStateSchema>,
  statePath: string,
): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  const parsed = oauthStateSchema.parse(state);
  await writeFile(statePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

async function loadOAuthState(
  statePath: string,
): Promise<z.infer<typeof oauthStateSchema> | null> {
  try {
    const raw = await readFile(statePath, "utf8");
    return oauthStateSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }
}

async function clearOAuthState(statePath: string): Promise<void> {
  await rm(statePath, { force: true });
}
