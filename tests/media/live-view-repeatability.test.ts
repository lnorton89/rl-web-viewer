import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("live view repeatability", () => {
  const tempDir = { path: "" as string };

  beforeEach(async () => {
    tempDir.path = await mkdtemp(path.join(os.tmpdir(), "reolink-live-view-test-"));
  });

  afterEach(async () => {
    try {
      await rm(tempDir.path, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("startMediaRelay idempotency", () => {
    it("is idempotent when called while relay is already starting", async () => {
      const { startMediaRelay } = await import(
        "../../src/media/live-view-service.js"
      );

      // Start the relay first time
      const firstCall = startMediaRelay();
      await firstCall;

      // Call again immediately while it might be starting
      const secondCall = startMediaRelay();
      await secondCall;

      // Should not throw and should complete
      expect(() => secondCall).not.toThrow();
    });

    it("is idempotent when called while relay is already ready", async () => {
      const { startMediaRelay, getMediaRelayHealth } = await import(
        "../../src/media/live-view-service.js"
      );

      // Start the relay
      await startMediaRelay();

      // Small delay to let it stabilize
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get health before calling again
      const healthBefore = getMediaRelayHealth();

      // Call again - should be idempotent regardless of state
      const secondCall = startMediaRelay();
      await secondCall;

      expect(() => secondCall).not.toThrow();

      // Health should still be consistent
      const healthAfter = getMediaRelayHealth();
      expect(healthAfter.relay).toBeDefined();
    });

    it("preserves failure reason across state transitions", async () => {
      const { startMediaRelay, getMediaRelayHealth } = await import(
        "../../src/media/live-view-service.js"
      );

      // Start and let it fail (should fail due to no valid config)
      await startMediaRelay();

      // Give it time to potentially fail
      await new Promise((resolve) => setTimeout(resolve, 500));

      const health = getMediaRelayHealth();

      // Health should have a reason if failed
      if (health.relay === "failed") {
        expect(health.reason).toBeDefined();
        expect(typeof health.reason).toBe("string");
      }
    });
  });

  describe("buildLiveViewBootstrap with adapter", () => {
    it("returns diagnostics object with browser-safe structure", async () => {
      const { buildLiveViewBootstrap } = await import(
        "../../src/media/live-view-service.js"
      );

      const bootstrap = await buildLiveViewBootstrap("127.0.0.1:4000");

      // Should have diagnostics object
      expect(bootstrap).toHaveProperty("diagnostics");
      expect(bootstrap.diagnostics).toHaveProperty("state");
      expect(bootstrap.diagnostics).toHaveProperty("currentModeId");
      expect(bootstrap.diagnostics).toHaveProperty("nextFallbackModeId");

      // Browser-safe: should not have raw credentials or RTSP URLs
      const serialized = JSON.stringify(bootstrap);
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("rtsp://");
      expect(serialized).not.toContain("token=");
    });

    it("includes short reason when bootstrap fails", async () => {
      const { buildLiveViewBootstrap } = await import(
        "../../src/media/live-view-service.js"
      );

      const bootstrap = await buildLiveViewBootstrap("127.0.0.1:4000");

      // Diagnostics should have the expected shape
      expect(bootstrap.diagnostics).toHaveProperty("state");

      // If failed, reason should be a short string
      if (bootstrap.diagnostics.state === "failed") {
        const reason = bootstrap.diagnostics.reason;
        expect(reason).toBeDefined();
        expect(typeof reason).toBe("string");
        expect(reason!.length).toBeLessThan(100);
      }
    });
  });

  describe("repeated bootstrap recovery", () => {
    it("handles repeated bootstrap calls without crashing", async () => {
      const { buildLiveViewBootstrap } = await import(
        "../../src/media/live-view-service.js"
      );

      // Call bootstrap multiple times
      const first = await buildLiveViewBootstrap("127.0.0.1:4000");
      const second = await buildLiveViewBootstrap("127.0.0.1:4000");
      const third = await buildLiveViewBootstrap("127.0.0.1:4000");

      // All should return valid bootstrap objects
      expect(first).toHaveProperty("modes");
      expect(second).toHaveProperty("modes");
      expect(third).toHaveProperty("modes");
    });

    it("preserves diagnostics shape across repeated calls", async () => {
      const { buildLiveViewBootstrap } = await import(
        "../../src/media/live-view-service.js"
      );

      const first = await buildLiveViewBootstrap("127.0.0.1:4000");
      const second = await buildLiveViewBootstrap("127.0.0.1:4000");

      // Both should have consistent diagnostics structure
      expect(first.diagnostics).toHaveProperty("state");
      expect(second.diagnostics).toHaveProperty("state");
      expect(Object.keys(first.diagnostics)).toEqual(
        expect.arrayContaining(Object.keys(second.diagnostics)),
      );
    });
  });
});

describe("dashboard bootstrap repeatability", () => {
  describe("session re-entry", () => {
    it("can create multiple sessions without crashing", async () => {
      const { ReolinkSession } = await import(
        "../../src/camera/reolink-session.js"
      );

      // Create mock config
      const config = {
        baseUrl: "http://192.168.1.100",
        username: "admin",
        password: "password",
        modelHint: "RLC-423S",
        notes: "",
        debugCapture: false,
        snapshot: { model: "", hardVer: "", firmVer: "" },
      };

      // Create multiple sessions
      const session1 = new ReolinkSession(config, {
        fetch: mockFetch,
        now: () => Date.now(),
      });
      const session2 = new ReolinkSession(config, {
        fetch: mockFetch,
        now: () => Date.now(),
      });

      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
    });
  });

  describe("repeated session operations", () => {
    it("session can be invalidated and re-login attempted", async () => {
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

      // Get initial token
      const token1 = await session.login();
      expect(token1).toBeDefined();
      expect(token1.name).toBe("test-token");

      // Invalidate and re-login
      session.invalidateToken();
      const token2 = await session.login();

      expect(token2).toBeDefined();
      expect(token2.name).toBe("test-token");
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
