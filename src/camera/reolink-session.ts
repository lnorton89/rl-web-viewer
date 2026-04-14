import pino from "pino";
import { z } from "zod";

import type {
  ReolinkApiError,
  ReolinkApiResponse,
  ReolinkRequest,
  ReolinkSessionToken,
} from "../types/reolink.js";
import type { CameraConfig } from "../config/camera-config.js";

type LoggerLike = {
  debug(bindings: Record<string, unknown>, message: string): void;
  warn(bindings: Record<string, unknown>, message: string): void;
};

const defaultLogger = pino({ name: "reolink-session" });

const apiErrorSchema = z
  .object({
    detail: z.string().optional(),
    rspCode: z.number().optional(),
  })
  .catchall(z.unknown());

const apiResponseSchema = z.array(
  z.object({
    cmd: z.string(),
    code: z.number(),
    value: z.unknown().optional(),
    error: apiErrorSchema.optional(),
  }),
);

const loginResponseSchema = z.array(
  z.object({
    cmd: z.string(),
    code: z.number(),
    value: z.object({
      Token: z.object({
        name: z.string(),
        leaseTime: z.number().nonnegative(),
      }),
    }),
    error: apiErrorSchema.optional(),
  }),
);

export function isTokenExpired(
  token: Pick<ReolinkSessionToken, "expiresAt">,
  now = Date.now(),
): boolean {
  return token.expiresAt <= now;
}

export function isAuthFailureResponse(
  responses: readonly ReolinkApiResponse[],
): boolean {
  return responses.some((response) => {
    if (response.code === 0) {
      return false;
    }

    const error = response.error;
    const detail = String(error?.detail ?? "").toLowerCase();

    return (
      error?.rspCode === -6 ||
      detail.includes("login") ||
      detail.includes("token")
    );
  });
}

function buildApiUrl(baseUrl: string, params: Record<string, string>): string {
  const url = new URL("/cgi-bin/api.cgi", withTrailingSlash(baseUrl));

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function withTrailingSlash(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function createLoginPayload(config: CameraConfig): ReolinkRequest[] {
  return [
    {
      cmd: "Login",
      action: 0,
      param: {
        User: {
          userName: config.username,
          password: config.password,
        },
      },
    },
  ];
}

async function parseJsonResponse(
  response: Response,
): Promise<readonly ReolinkApiResponse[]> {
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`Reolink request failed with HTTP ${response.status}`);
  }

  return apiResponseSchema.parse(JSON.parse(rawText));
}

export class ReolinkSession {
  private token: ReolinkSessionToken | null = null;

  private readonly fetchImpl: typeof fetch;

  private readonly now: () => number;

  private readonly logger: LoggerLike;

  constructor(
    private readonly config: CameraConfig,
    options?: {
      fetch?: typeof fetch;
      now?: () => number;
      logger?: LoggerLike;
    },
  ) {
    this.fetchImpl = options?.fetch ?? fetch;
    this.now = options?.now ?? Date.now;
    this.logger = options?.logger ?? defaultLogger;
  }

  getToken(): ReolinkSessionToken | null {
    return this.token;
  }

  invalidateToken(): void {
    this.token = null;
  }

  async login(force = false): Promise<ReolinkSessionToken> {
    if (!force && this.token && !isTokenExpired(this.token, this.now())) {
      return this.token;
    }

    this.logger.debug(
      {
        baseUrl: this.config.baseUrl,
        username: this.config.username,
      },
      "requesting reolink session token",
    );

    const response = await this.fetchImpl(
      buildApiUrl(this.config.baseUrl, { cmd: "Login" }),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(createLoginPayload(this.config)),
      },
    );

    const loginResponses = loginResponseSchema.parse(
      await parseJsonResponse(response),
    );
    const tokenValue = loginResponses[0]?.value?.Token;

    if (!tokenValue) {
      throw new Error("Login did not return a token");
    }

    this.token = {
      ...tokenValue,
      expiresAt: this.now() + tokenValue.leaseTime * 1000,
    };

    return this.token;
  }

  async requestJson<TResponse extends readonly ReolinkApiResponse[]>(
    commands: readonly ReolinkRequest[],
  ): Promise<TResponse> {
    await this.login();
    return this.executeRequest<TResponse>(commands, true);
  }

  private async executeRequest<TResponse extends readonly ReolinkApiResponse[]>(
    commands: readonly ReolinkRequest[],
    retry: boolean,
  ): Promise<TResponse> {
    const token = await this.login();
    const response = await this.fetchImpl(
      buildApiUrl(this.config.baseUrl, { token: token.name }),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(commands),
      },
    );

    const parsed = (await parseJsonResponse(response)) as TResponse;

    if (retry && isAuthFailureResponse(parsed)) {
      this.logger.warn(
        {
          baseUrl: this.config.baseUrl,
          detail: getFirstErrorDetail(parsed),
        },
        "camera token rejected, retrying with a fresh login",
      );
      this.invalidateToken();
      await this.login(true);
      return this.executeRequest<TResponse>(commands, false);
    }

    return parsed;
  }
}

function getFirstErrorDetail(
  responses: readonly ReolinkApiResponse[],
): ReolinkApiError | undefined {
  return responses.find((response) => response.code !== 0)?.error;
}
