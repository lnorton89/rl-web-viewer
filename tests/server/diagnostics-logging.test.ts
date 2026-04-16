import { describe, expect, it } from "vitest";

import {
  createDiagnosticsLoggerBindings,
  createOperationDiagnostics,
  type DiagnosticsBindings,
  type OperationDiagnosticsService,
} from "../../src/diagnostics/operation-diagnostics.js";

describe("diagnostics logging", () => {
  describe("createOperationDiagnostics", () => {
    it("creates a diagnostics object with required fields", () => {
      const diagnostics = createOperationDiagnostics({
        requestId: "req-123",
        adapterId: "reolink-rlc-423s",
        scope: "live-view",
        cameraHost: "192.168.1.100",
      });

      expect(diagnostics).toMatchObject({
        requestId: "req-123",
        adapterId: "reolink-rlc-423s",
        scope: "live-view",
        cameraHost: "192.168.1.100",
      });
    });

    it("supports optional outcome and artifactPath", () => {
      const diagnostics = createOperationDiagnostics({
        requestId: "req-456",
        adapterId: "reolink-rlc-423s",
        scope: "probe",
        cameraHost: "192.168.1.100",
        outcome: "failed",
        artifactPath: "/path/to/artifact.json",
      });

      expect(diagnostics.outcome).toBe("failed");
      expect(diagnostics.artifactPath).toBe("/path/to/artifact.json");
    });

    it("returns only the specified fields", () => {
      const diagnostics = createOperationDiagnostics({
        requestId: "req-789",
        adapterId: "test-adapter",
        scope: "ptz",
        cameraHost: "192.168.1.200",
      });

      const keys = Object.keys(diagnostics);
      expect(keys).toContain("requestId");
      expect(keys).toContain("adapterId");
      expect(keys).toContain("scope");
      expect(keys).toContain("cameraHost");
      expect(keys).not.toContain("password");
      expect(keys).not.toContain("token");
    });
  });

  describe("createDiagnosticsLoggerBindings", () => {
    it("returns sanitized logger bindings without secrets", () => {
      const bindings = createDiagnosticsLoggerBindings({
        requestId: "req-abc",
        adapterId: "reolink-rlc-423s",
        scope: "settings",
        cameraHost: "192.168.1.100",
      });

      expect(bindings.requestId).toBe("req-abc");
      expect(bindings.adapterId).toBe("reolink-rlc-423s");
      expect(bindings.scope).toBe("settings");
      expect(bindings.cameraHost).toBe("192.168.1.100");

      // Should not contain sensitive fields
      expect(bindings).not.toHaveProperty("password");
      expect(bindings).not.toHaveProperty("token");
      expect(bindings).not.toHaveProperty("rtspUrl");
    });

    it("includes optional fields when provided", () => {
      const bindings = createDiagnosticsLoggerBindings({
        requestId: "req-xyz",
        adapterId: "reolink-rlc-423s",
        scope: "live-view",
        cameraHost: "192.168.1.100",
        outcome: "success",
        artifactPath: "/path/to/debug.json",
      });

      expect(bindings.outcome).toBe("success");
      expect(bindings.artifactPath).toBe("/path/to/debug.json");
    });

    it("does not log username or password even if cameraHost is a URL", () => {
      const bindings = createDiagnosticsLoggerBindings({
        requestId: "req-url",
        adapterId: "test",
        scope: "probe",
        cameraHost: "admin:password@192.168.1.100",
      });

      // Should sanitize credentials embedded in cameraHost
      expect(bindings.cameraHost).not.toContain("admin");
      expect(bindings.cameraHost).not.toContain("password");
      expect(bindings.cameraHost).toContain("192.168.1.100");
    });
  });

  describe("integration with debug-capture artifact linkage", () => {
    it("provides a path suitable for log linkage from writeDebugArtifact result", async () => {
      const { writeDebugArtifact } = await import(
        "../../src/diagnostics/debug-capture.js"
      );
      const { mkdtemp, readFile } = await import("node:fs/promises");
      const fsPath = await import("node:path");
      const os = await import("node:os");

      const directory = await mkdtemp(fsPath.join(os.tmpdir(), "reolink-diagnostics-test-"));
      const filePath = await writeDebugArtifact({
        command: "TestCommand",
        endpoint: "/api/test",
        status: 200,
        responseBody: { value: "test" },
      }, directory);

      // Verify the file was written
      const content = await readFile(filePath, "utf8");
      expect(content).toContain("TestCommand");

      const diagnostics = createOperationDiagnostics({
        requestId: "req-artifact",
        adapterId: "test",
        scope: "live-view",
        cameraHost: "127.0.0.1",
        outcome: "failed",
        artifactPath: filePath,
      });

      expect(diagnostics.artifactPath).toBe(filePath);
      expect(diagnostics.artifactPath).toContain("testcommand");
    });
  });
});

describe("diagnostics service factory", () => {
  it("creates a diagnostics service with request-scoped factory", async () => {
    const Fastify = (await import("fastify")).default;
    const { createDiagnosticsService } = await import(
      "../../src/server/plugins/diagnostics.js"
    );

    const app = Fastify({ logger: false });
    const diagnosticsService = createDiagnosticsService(app);

    let capturedDiagnostics: DiagnosticsBindings | null = null;

    app.get("/test", async (request) => {
      capturedDiagnostics = diagnosticsService.createForRequest({
        id: request.id,
      });
      return { ok: true };
    });

    const response = await app.inject({ method: "GET", url: "/test" });
    expect(response.statusCode).toBe(200);
    expect(capturedDiagnostics).not.toBeNull();
    expect(capturedDiagnostics!.requestId).toBeDefined();
    expect(capturedDiagnostics!.requestId!.length).toBeGreaterThan(0);
  });

  it("creates scope-scoped diagnostics without request", async () => {
    const Fastify = (await import("fastify")).default;
    const { createDiagnosticsService } = await import(
      "../../src/server/plugins/diagnostics.js"
    );

    const app = Fastify({ logger: false });
    const diagnostics = createDiagnosticsService(app);

    const scopeDiagnostics = diagnostics.createForScope({
      adapterId: "reolink-rlc-423s",
      scope: "probe",
      cameraHost: "192.168.1.100",
    });

    expect(scopeDiagnostics.requestId).toBeNull();
    expect(scopeDiagnostics.adapterId).toBe("reolink-rlc-423s");
    expect(scopeDiagnostics.scope).toBe("probe");
    expect(scopeDiagnostics.cameraHost).toBe("192.168.1.100");
  });

  it("creates diagnostics bindings that can be extended with operation context", async () => {
    const Fastify = (await import("fastify")).default;
    const { createDiagnosticsService } = await import(
      "../../src/server/plugins/diagnostics.js"
    );

    const app = Fastify({ logger: false });
    const diagnosticsService = createDiagnosticsService(app);

    let capturedDiagnostics: (DiagnosticsBindings & { outcome: string }) | null = null;

    app.get("/test-with-op", async (request) => {
      const base = diagnosticsService.createForRequest({ id: request.id });
      capturedDiagnostics = {
        ...base,
        adapterId: "test-adapter",
        scope: "live-view" as const,
        cameraHost: "192.168.1.50",
        outcome: "success" as const,
      };
      return { ok: true };
    });

    const response = await app.inject({ method: "GET", url: "/test-with-op" });
    expect(response.statusCode).toBe(200);
    expect(capturedDiagnostics!.requestId).toBeDefined();
    expect(capturedDiagnostics!.adapterId).toBe("test-adapter");
    expect(capturedDiagnostics!.scope).toBe("live-view");
    expect(capturedDiagnostics!.cameraHost).toBe("192.168.1.50");
    expect(capturedDiagnostics!.outcome).toBe("success");
  });
});
