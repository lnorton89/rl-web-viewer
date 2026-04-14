import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import type { CameraConfig } from "../src/config/camera-config.js";
import type {
  ReolinkApiResponse,
  ReolinkRequest,
} from "../src/types/reolink.js";
import {
  ReolinkSession,
  isAuthFailureResponse,
  isTokenExpired,
} from "../src/camera/reolink-session.js";

type Fixture<TRequest, TResponse> = {
  request: TRequest;
  response: TResponse;
};

const config: CameraConfig = {
  baseUrl: "http://192.168.1.140",
  username: "admin",
  password: "",
  modelHint: "RLC-423S",
  notes: "",
  snapshot: {
    model: "",
    hardVer: "",
    firmVer: "",
  },
};

const silentLogger = {
  debug: () => undefined,
  warn: () => undefined,
};

describe("ReolinkSession", () => {
  it("parses Token leaseTime from the Login response", async () => {
    const loginFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("login.json");
    const fetchMock = vi.fn(async () => jsonResponse(loginFixture.response));

    const session = new ReolinkSession(config, {
      fetch: fetchMock as typeof fetch,
      now: () => 1_000,
      logger: silentLogger,
    });

    const token = await session.login();

    expect(token.name).toBe("fixture-token");
    expect(token.leaseTime).toBe(3600);
    expect(token.expiresAt).toBe(3_601_000);
    expect(isTokenExpired(token, 3_600_999)).toBe(false);
  });

  it("reuses the cached token across repeated login calls", async () => {
    const loginFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("login.json");
    const fetchMock = vi.fn(async () => jsonResponse(loginFixture.response));

    const session = new ReolinkSession(config, {
      fetch: fetchMock as typeof fetch,
      now: () => 2_000,
      logger: silentLogger,
    });

    const first = await session.login();
    const second = await session.login();

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forces a re-login and retry when the auth state is invalidated", async () => {
    const loginFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("login.json");
    const abilityFixture = await loadFixture<
      Fixture<readonly ReolinkRequest[], readonly ReolinkApiResponse[]>
    >("get-ability.json");
    const authFailure: readonly ReolinkApiResponse[] = [
      {
        cmd: "GetAbility",
        code: 1,
        error: {
          detail: "please login first",
          rspCode: -6,
        },
      },
    ];
    const responseQueue = [
      loginFixture.response,
      authFailure,
      loginFixture.response,
      abilityFixture.response,
    ];
    const fetchMock = vi.fn(async () =>
      jsonResponse(responseQueue.shift() ?? authFailure),
    );

    const session = new ReolinkSession(config, {
      fetch: fetchMock as typeof fetch,
      now: () => 3_000,
      logger: silentLogger,
    });

    const response = await session.requestJson<
      readonly ReolinkApiResponse[]
    >(abilityFixture.request);
    const calls = fetchMock.mock.calls as unknown as Array<
      [RequestInfo | URL, RequestInit | undefined]
    >;

    expect(isAuthFailureResponse(authFailure)).toBe(true);
    expect(response[0]?.code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(String(calls[0]?.[0])).toContain("?cmd=Login");
    expect(String(calls[1]?.[0])).toContain("?token=");
    expect(String(calls[2]?.[0])).toContain("?cmd=Login");
    expect(String(calls[3]?.[0])).toContain("?token=");
  });
});

async function loadFixture<T>(name: string): Promise<T> {
  const fileUrl = new URL(`./fixtures/reolink/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw) as T;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
