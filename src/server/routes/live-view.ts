import type { FastifyPluginAsync } from "fastify";

import { loadCameraConfig, type CameraConfig } from "../../config/camera-config.js";
import {
  buildLiveViewBootstrap,
  getMediaRelayHealth,
  type MediaRelayHealth,
} from "../../media/live-view-service.js";
import type { LiveViewBootstrap } from "../../types/live-view.js";

export type SnapshotQuality = "main" | "sub";

export type LiveViewRouteDependencies = {
  buildLiveViewBootstrap?: (requestHost: string) => Promise<LiveViewBootstrap>;
  fetchSnapshot?: (
    quality: SnapshotQuality,
  ) => Promise<{ body: Uint8Array; contentType: string }>;
  getMediaRelayHealth?: () => MediaRelayHealth;
};

const UNSAFE_BOOTSTRAP_PATTERNS = [
  /"baseUrl":/i,
  /"username":/i,
  /"password":/i,
  /token=/i,
  /rtsp:\/\//i,
] as const;

export const liveViewRoutes: FastifyPluginAsync<LiveViewRouteDependencies> = async (
  app,
  options,
) => {
  const resolveBootstrap = options.buildLiveViewBootstrap ?? buildLiveViewBootstrap;
  const resolveSnapshot = options.fetchSnapshot ?? fetchCameraSnapshot;
  const resolveRelayHealth = options.getMediaRelayHealth ?? getMediaRelayHealth;

  app.get("/api/live-view", async (request, reply) => {
    const bootstrap = await resolveBootstrap(
      request.headers.host ?? "127.0.0.1:4000",
    );

    assertBrowserSafeBootstrap(bootstrap);
    reply.send(bootstrap);
  });

  app.get("/api/live-view/snapshot/:quality", async (request, reply) => {
    const quality = request.params as { quality?: string };

    if (quality.quality !== "main" && quality.quality !== "sub") {
      reply.code(400);
      return reply.send({
        error: "quality must be main or sub",
      });
    }

    const snapshot = await resolveSnapshot(quality.quality);
    reply.header("Cache-Control", "no-store");
    reply.type(snapshot.contentType || "image/jpeg");
    return reply.send(Buffer.from(snapshot.body));
  });

  app.get("/api/live-view/health", async (_request, reply) => {
    const health = resolveRelayHealth();

    if (health.relay === "ready") {
      return reply.send({
        relay: health.relay,
      });
    }

    return reply.send({
      relay: health.relay,
      reason: health.reason ?? "Live view is unavailable",
    });
  });
};

export async function fetchCameraSnapshot(
  quality: SnapshotQuality,
): Promise<{ body: Uint8Array; contentType: string }> {
  const config = await loadCameraConfig();
  const response = await fetch(buildSnapshotUrl(config, quality));

  if (!response.ok) {
    throw new Error(`Snapshot request failed with HTTP ${response.status}`);
  }

  return {
    body: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "image/jpeg",
  };
}

function buildSnapshotUrl(config: CameraConfig, quality: SnapshotQuality): string {
  const url = new URL("/cgi-bin/api.cgi", withTrailingSlash(config.baseUrl));

  url.searchParams.set("cmd", "Snap");
  url.searchParams.set("channel", "0");
  url.searchParams.set("stream", quality === "main" ? "main" : "sub");
  url.searchParams.set("rs", Date.now().toString(36));
  url.searchParams.set("user", config.username);
  url.searchParams.set("password", config.password);

  return url.toString();
}

function assertBrowserSafeBootstrap(bootstrap: LiveViewBootstrap): void {
  const serialized = JSON.stringify(bootstrap);

  for (const pattern of UNSAFE_BOOTSTRAP_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error("Live-view bootstrap contained camera credentials");
    }
  }
}

function withTrailingSlash(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
