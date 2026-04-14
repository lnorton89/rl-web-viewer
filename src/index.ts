import { pathToFileURL } from "node:url";

import { buildCapabilitySnapshot, saveCapabilitySnapshot } from "./camera/capability-snapshot.js";
import { probeCamera } from "./camera/reolink-discovery.js";
import { ReolinkSession } from "./camera/reolink-session.js";
import { loadCameraConfig } from "./config/camera-config.js";
import { writeDebugArtifact } from "./diagnostics/debug-capture.js";

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  probe().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`probe failed: ${message}`);
    process.exitCode = 1;
  });
}
