import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { sanitizeForDebug } from "../../src/diagnostics/debug-capture.js";
import {
  buildYouTubeAuthStatus,
  loadYouTubeConfig,
  loadYouTubeTokens,
  saveYouTubeConfig,
  saveYouTubeTokens,
  youtubeConfigSchema,
} from "../../src/config/youtube-config.js";
import { createPluginRuntime } from "../../src/plugins/plugin-registry.js";
import { createYouTubeOAuthService } from "../../src/plugins/youtube/youtube-oauth.js";
import type { YouTubeAuthStatus } from "../../src/types/youtube-streaming.js";

const desktopClientJson = {
  installed: {
    client_id: "unit-test-client-id.apps.googleusercontent.com",
    client_secret: "unit-test-client-secret",
    redirect_uris: ["http://127.0.0.1:4000/oauth2callback"],
  },
};

const forbiddenPayloadFragments = [
  "access_token",
  "refresh_token",
  "client_secret",
  "Bearer ",
  "ya29.",
  "unit-test-refresh-token",
  "unit-test-client-secret",
  "unit-test-auth-code",
  "rtsp://",
  "rtmp://",
  "rtmps://",
  "streamName",
] as const;

describe("YouTube OAuth config and token storage", () => {
  it("validates Desktop OAuth client JSON and rejects unsupported shapes", () => {
    expect(youtubeConfigSchema.parse(desktopClientJson).clientId).toBe(
      "unit-test-client-id.apps.googleusercontent.com",
    );

    expect(() =>
      youtubeConfigSchema.parse({
        web: {
          client_id: "web-client",
          client_secret: "web-secret",
        },
      }),
    ).toThrow();
    expect(() =>
      youtubeConfigSchema.parse({
        installed: {
          client_id: "missing-secret",
        },
      }),
    ).toThrow();
  });

  it("stores OAuth client and token files server-side while exposing only redacted auth status", async () => {
    const paths = await createTempYouTubePaths();

    await saveYouTubeConfig(desktopClientJson, paths.configPath);
    await saveYouTubeTokens(
      {
        access_token: "ya29.unit-test-access-token",
        refresh_token: "unit-test-refresh-token",
        token_type: "Bearer",
        scope: "https://www.googleapis.com/auth/youtube",
        expiry_date: 1_800_000_000_000,
      },
      paths.tokensPath,
    );

    const configRaw = await readFile(paths.configPath, "utf8");
    const tokenRaw = await readFile(paths.tokensPath, "utf8");
    const status = await buildYouTubeAuthStatus({
      configPath: paths.configPath,
      tokensPath: paths.tokensPath,
      now: () => "2026-04-27T00:00:00.000Z",
    });

    expect(configRaw).toContain("unit-test-client-secret");
    expect(tokenRaw).toContain("unit-test-refresh-token");
    expect(status).toMatchObject({
      configured: true,
      connected: true,
      state: "connected",
      hasRefreshToken: true,
    });
    expectBrowserSafe(status);
  });

  it("creates parent directories, writes parsed JSON, reloads, and verifies", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-youtube-"));
    const configPath = path.join(directory, "nested", "client.json");
    const tokensPath = path.join(directory, "nested", "tokens.json");

    const config = await saveYouTubeConfig(desktopClientJson, configPath);
    const tokens = await saveYouTubeTokens(
      {
        access_token: "ya29.unit-test-access-token",
        refresh_token: "unit-test-refresh-token",
        expiry_date: 1_800_000_000_000,
      },
      tokensPath,
    );

    const loadedConfig = await loadYouTubeConfig(configPath);
    expect(loadedConfig?.clientId).toBe(config.clientId);
    expect((await loadYouTubeTokens(tokensPath))?.refresh_token).toBe(
      tokens.refresh_token,
    );
  });
});

describe("YouTube OAuth service", () => {
  it("begins auth with offline YouTube scope and returns a browser-safe status", async () => {
    const paths = await createTempYouTubePaths();
    await saveYouTubeConfig(desktopClientJson, paths.configPath);
    const fakeClient = new FakeOAuthClient();
    const service = createYouTubeOAuthService({
      configPath: paths.configPath,
      statePath: paths.statePath,
      tokensPath: paths.tokensPath,
      oauthClientFactory: () => fakeClient,
      now: () => "2026-04-27T00:00:00.000Z",
    });

    const result = await service.beginAuth({
      redirectUri: "http://127.0.0.1:4000/api/plugins/youtube-streaming/oauth/callback",
    });

    expect(fakeClient.lastAuthOptions).toMatchObject({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/youtube"],
    });
    expect(result.authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(result.status.state).toBe("pending");
    expectBrowserSafe(result.status);
  });

  it("exchanges callback codes, saves tokens server-side, and returns connected status", async () => {
    const paths = await createTempYouTubePaths();
    await saveYouTubeConfig(desktopClientJson, paths.configPath);
    const fakeClient = new FakeOAuthClient();
    const service = createYouTubeOAuthService({
      configPath: paths.configPath,
      statePath: paths.statePath,
      tokensPath: paths.tokensPath,
      oauthClientFactory: () => fakeClient,
      now: () => "2026-04-27T00:00:00.000Z",
    });
    const begin = await service.beginAuth({
      redirectUri: "http://127.0.0.1:4000/api/plugins/youtube-streaming/oauth/callback",
    });

    const result = await service.completeCallback({
      code: "unit-test-auth-code",
      state: begin.state,
    });

    expect(fakeClient.exchangedCode).toBe("unit-test-auth-code");
    expect(result.status).toMatchObject({
      connected: true,
      state: "connected",
    });
    expect((await loadYouTubeTokens(paths.tokensPath))?.refresh_token).toBe(
      "unit-test-refresh-token",
    );
    expectBrowserSafe(result);
  });

  it("refreshes and revokes server-side credentials without exposing token material", async () => {
    const paths = await createTempYouTubePaths();
    await saveYouTubeConfig(desktopClientJson, paths.configPath);
    await saveYouTubeTokens(
      {
        access_token: "ya29.unit-test-access-token",
        refresh_token: "unit-test-refresh-token",
        expiry_date: 1,
      },
      paths.tokensPath,
    );
    const fakeClient = new FakeOAuthClient();
    const service = createYouTubeOAuthService({
      configPath: paths.configPath,
      statePath: paths.statePath,
      tokensPath: paths.tokensPath,
      oauthClientFactory: () => fakeClient,
      now: () => "2026-04-27T00:00:00.000Z",
    });

    const refreshed = await service.refresh();
    const revoked = await service.revoke();

    expect(fakeClient.lastCredentialsSet?.refresh_token).toBe(
      "unit-test-refresh-token",
    );
    expect(fakeClient.revoked).toBe(true);
    expect(refreshed.status.state).toBe("connected");
    expect(revoked.status.state).toBe("disconnected");
    expect(await loadYouTubeTokens(paths.tokensPath)).toBeNull();
    expectBrowserSafe(refreshed);
    expectBrowserSafe(revoked);
  });
});

describe("YouTube plugin OAuth actions", () => {
  it("imports client config and dispatches auth actions through the plugin runtime with redacted responses", async () => {
    const paths = await createTempYouTubePaths();
    const fakeClient = new FakeOAuthClient();
    const runtime = createPluginRuntime({
      configPath: paths.pluginConfigPath,
      youtube: {
        configPath: paths.configPath,
        statePath: paths.statePath,
        tokensPath: paths.tokensPath,
        oauthClientFactory: () => fakeClient,
      },
      now: () => "2026-04-27T00:00:00.000Z",
    });

    const configured = await runtime.configurePlugin("youtube-streaming", {
      values: {
        oauthClient: desktopClientJson,
      },
    });
    const begin = await runtime.invokeAction("youtube-streaming", "auth.begin", {
      redirectUri: "http://127.0.0.1:4000/api/plugins/youtube-streaming/oauth/callback",
    });
    const callback = await runtime.invokeAction(
      "youtube-streaming",
      "auth.callback",
      {
        code: "unit-test-auth-code",
        state: getAuthState(begin as unknown as { auth?: unknown }),
      },
    );
    const refreshed = await runtime.invokeAction(
      "youtube-streaming",
      "auth.refresh",
      {},
    );
    const revoked = await runtime.invokeAction(
      "youtube-streaming",
      "auth.revoke",
      {},
    );

    expect(configured.verified).toBe(true);
    expect(getAuth(callback as unknown as { auth?: unknown }).state).toBe(
      "connected",
    );
    expectBrowserSafe(configured);
    expectBrowserSafe(begin);
    expectBrowserSafe(callback);
    expectBrowserSafe(refreshed);
    expectBrowserSafe(revoked);
  });

  it("keeps serialized responses and debug artifacts free of OAuth, media, and stream secrets", () => {
    const payload = sanitizeForDebug({
      authorization: "Bearer ya29.unit-test-access-token",
      access_token: "ya29.unit-test-access-token",
      refresh_token: "unit-test-refresh-token",
      client_secret: "unit-test-client-secret",
      code: "unit-test-auth-code",
      rtspUrl: "rtsp://admin:password@192.168.1.10/h264Preview_01_main",
      ingestionUrl: "rtmps://a.rtmps.youtube.com/live2",
      streamName: "stream-key",
    });

    expectBrowserSafe(payload);
  });
});

class FakeOAuthClient {
  lastAuthOptions: Record<string, unknown> | null = null;
  exchangedCode: string | null = null;
  credentials: Record<string, unknown> | null = null;
  lastCredentialsSet: Record<string, unknown> | null = null;
  revoked = false;
  private tokensHandler: ((tokens: Record<string, unknown>) => void) | null =
    null;

  generateAuthUrl(options: Record<string, unknown>): string {
    this.lastAuthOptions = options;
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${String(options.state)}`;
  }

  async getToken(code: string): Promise<{ tokens: Record<string, unknown> }> {
    this.exchangedCode = code;
    return {
      tokens: {
        access_token: "ya29.unit-test-access-token",
        refresh_token: "unit-test-refresh-token",
        token_type: "Bearer",
        scope: "https://www.googleapis.com/auth/youtube",
        expiry_date: 1_800_000_000_000,
      },
    };
  }

  setCredentials(tokens: Record<string, unknown>): void {
    this.credentials = tokens;
    this.lastCredentialsSet = tokens;
  }

  on(eventName: string, handler: (tokens: Record<string, unknown>) => void): void {
    if (eventName === "tokens") {
      this.tokensHandler = handler;
    }
  }

  async refreshAccessToken(): Promise<{
    credentials: Record<string, unknown>;
  }> {
    const credentials = {
      access_token: "ya29.unit-test-refreshed-token",
      refresh_token: this.credentials?.refresh_token,
      expiry_date: 1_900_000_000_000,
    };
    this.tokensHandler?.(credentials);
    return { credentials };
  }

  async revokeCredentials(): Promise<void> {
    this.revoked = true;
    this.credentials = null;
  }
}

function expectBrowserSafe(payload: unknown): void {
  const serialized =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  for (const fragment of forbiddenPayloadFragments) {
    expect(serialized).not.toContain(fragment);
  }
}

function getAuthState(result: { auth?: unknown }): string {
  const auth = getAuth(result);
  expect(auth.pendingState).toEqual(expect.any(String));
  return auth.pendingState ?? "";
}

function getAuth(result: { auth?: unknown }): YouTubeAuthStatus {
  expect(result.auth).toBeDefined();
  return result.auth as YouTubeAuthStatus;
}

async function createTempYouTubePaths(): Promise<{
  configPath: string;
  pluginConfigPath: string;
  statePath: string;
  tokensPath: string;
}> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-youtube-"));
  return {
    configPath: path.join(directory, "client.json"),
    pluginConfigPath: path.join(directory, "plugin.config.json"),
    statePath: path.join(directory, "oauth-state.json"),
    tokensPath: path.join(directory, "tokens.json"),
  };
}
