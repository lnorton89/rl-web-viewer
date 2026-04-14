import { pathToFileURL } from "node:url";

import { buildCapabilitySnapshot, saveCapabilitySnapshot } from "./camera/capability-snapshot.js";
import { probeCamera } from "./camera/reolink-discovery.js";
import { ReolinkSession } from "./camera/reolink-session.js";
import { loadCameraConfig } from "./config/camera-config.js";
import { writeDebugArtifact } from "./diagnostics/debug-capture.js";
import { startMediaRelay } from "./media/live-view-service.js";
import { createServer } from "./server/create-server.js";

export async function probe(args = process.argv.slice(2)): Promise<void> {
  const config = await loadCameraConfig();
  const debugEnabled = config.debugCapture || args.includes("--debug");
  const session = new ReolinkSession(config);
  const probeResult = await probeCamera(session);
  const snapshot = buildCapabilitySnapshot({
    identity: probeResult.identity,
    ports: probeResult.ports,
    ability: probeResult.ability,
  });
  const snapshotPath = await saveCapabilitySnapshot(snapshot, {
    ...config,
    snapshot: probeResult.identity,
  });

  let debugPath: string | null = null;

  if (debugEnabled) {
    debugPath = await writeDebugArtifact({
      command: "probe",
      endpoint: "/cgi-bin/api.cgi?token=<masked>",
      status: 200,
      requestBody: {
        baseUrl: config.baseUrl,
        debug: true,
      },
      responseBody: {
        devInfo: probeResult.devInfo,
        ports: probeResult.ports,
        ability: probeResult.rawAbility,
      },
    });
  }

  const lines = [
    "probe: ok",
    `model: ${snapshot.identity.model}`,
    `firmVer: ${snapshot.identity.firmVer}`,
    `supportsLiveView: ${snapshot.supportsLiveView}`,
    `supportsPtzControl: ${snapshot.supportsPtzControl}`,
    `supportsPtzPreset: ${snapshot.supportsPtzPreset}`,
    `snapshotPath: ${snapshotPath}`,
  ];

  if (debugPath) {
    lines.push(`debugPath: ${debugPath}`);
  }

  console.log(lines.join("\n"));
}

export async function startServer(): Promise<void> {
  const port = Number(process.env.PORT ?? 4000);

  await startMediaRelay();
  const app = await createServer();
  await app.listen({
    host: "127.0.0.1",
    port,
  });
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const [command, ...rest] = args;

  if (command === "probe") {
    await probe(rest);
    return;
  }

  await startServer();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`startup failed: ${message}`);
    process.exitCode = 1;
  });
}
