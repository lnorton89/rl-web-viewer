import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  sanitizeForDebug,
  writeDebugArtifact,
} from "../src/diagnostics/debug-capture.js";

describe("debug capture", () => {
  it("redacts password fields and masks token values", () => {
    const sanitized = sanitizeForDebug({
      request: {
        User: {
          userName: "admin",
          password: "",
        },
      },
      response: {
        Token: {
          name: "fixture-token",
          leaseTime: 3600,
        },
      },
    });
    const serialized = JSON.stringify(sanitized);

    expect(serialized).toContain("password");
    expect(serialized).not.toContain('"password":""');
    expect(serialized).not.toContain("fixture-token");
    expect(serialized).toContain("[MASKED_TOKEN]");
  });

  it("writes a sanitized debug artifact to disk", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "reolink-debug-"));
    const filePath = await writeDebugArtifact(
      {
        timestamp: "2026-04-14T01:50:00.000Z",
        command: "Login",
        endpoint: "/cgi-bin/api.cgi?cmd=Login",
        status: 200,
        requestBody: {
          User: {
            userName: "admin",
            password: "",
          },
        },
        responseBody: {
          Token: {
            name: "fixture-token",
            leaseTime: 3600,
          },
        },
      },
      directory,
    );

    const artifact = await readFile(filePath, "utf8");

    expect(artifact).toContain('"command": "Login"');
    expect(artifact).toContain('"status": 200');
    expect(artifact).not.toContain('"password": ""');
    expect(artifact).not.toContain("fixture-token");
  });
});
