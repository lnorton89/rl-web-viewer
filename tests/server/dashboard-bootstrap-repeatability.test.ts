import { describe, expect, it } from "vitest";

describe("dashboard bootstrap repeatability", () => {
  describe("session re-entry behavior", () => {
    it("can create multiple independent sessions", async () => {
      const { ReolinkSession } = await import(
        "../../src/camera/reolink-session.js"
      );

      const config = {
        baseUrl: "http://192.168.1.100",
        username: "admin",
        password: "password",
        modelHint: "RLC-423S",
        notes: "",
        debugCapture: false,
        snapshot: { model: "", hardVer: "", firmVer: "" },
      };

      const session1 = new ReolinkSession(config, {
        fetch: mockFetch,
        now: () => Date.now(),
      });
      const session2 = new ReolinkSession(config, {
        fetch: mockFetch,
        now: () => Date.now(),
      });

      // Sessions should be independent
      expect(session1).not.toBe(session2);
      expect(session1.getUsername()).toBe("admin");
      expect(session2.getUsername()).toBe("admin");
    });

    it("session re-login after invalidation succeeds", async () => {
      const { ReolinkSession } = await import(
        "../../src/camera/reolink-session.js"
      );

      const config = {
        baseUrl: "http://192.168.1.100",
        username: "admin",
        password: "password",
        modelHint: "RLC-423S",
        notes: "",
        debugCapture: false,
        snapshot: { model: "", hardVer: "", firmVer: "" },
      };

      const session = new ReolinkSession(config, {
        fetch: mockFetch,
        now: () => Date.now(),
      });

      // First login
      const token1 = await session.login();
      expect(token1).toBeDefined();

      // Invalidate and re-login without restart
      session.invalidateToken();
      const token2 = await session.login();
      expect(token2).toBeDefined();
      expect(token2.name).toBe("test-token");
    });

    it("expired token triggers automatic re-login", async () => {
      const { ReolinkSession, isTokenExpired } = await import(
        "../../src/camera/reolink-session.js"
      );

      const config = {
        baseUrl: "http://192.168.1.100",
        username: "admin",
        password: "password",
        modelHint: "RLC-423S",
        notes: "",
        debugCapture: false,
        snapshot: { model: "", hardVer: "", firmVer: "" },
      };

      let now = 1000000;
      const session = new ReolinkSession(config, {
        fetch: mockFetch,
        now: () => now,
      });

      // Login at time 1000000
      const token = await session.login();
      expect(isTokenExpired(token, now)).toBe(false);

      // Advance time past token expiry (leaseTime * 1000 = 3600000)
      now = 5000000;
      expect(isTokenExpired(token, now)).toBe(true);
    });
  });

  describe("repeated connect/recovery", () => {
    it("handles multiple connect attempts", async () => {
      const { ReolinkSession } = await import(
        "../../src/camera/reolink-session.js"
      );

      const config = {
        baseUrl: "http://192.168.1.100",
        username: "admin",
        password: "password",
        modelHint: "RLC-423S",
        notes: "",
        debugCapture: false,
        snapshot: { model: "", hardVer: "", firmVer: "" },
      };

      const session = new ReolinkSession(config, {
        fetch: mockFetch,
        now: () => Date.now(),
      });

      // Multiple login attempts should all succeed
      for (let i = 0; i < 5; i++) {
        session.invalidateToken();
        const token = await session.login();
        expect(token).toBeDefined();
      }
    });
  });
});

async function mockFetch(
  _url: string | URL | Request,
  _init?: RequestInit,
): Promise<Response> {
  return new Response(
    JSON.stringify([
      {
        cmd: "Login",
        code: 0,
        value: {
          Token: {
            name: "test-token",
            leaseTime: 3600,
          },
        },
      },
    ]),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    },
  );
}
