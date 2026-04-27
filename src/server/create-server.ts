import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";

import { diagnosticsPlugin } from "./plugins/diagnostics.js";
import {
  liveViewRoutes,
  type LiveViewRouteDependencies,
} from "./routes/live-view.js";
import { ptzRoutes, type PtzRouteDependencies } from "./routes/ptz.js";
import {
  settingsRoutes,
  type SettingsRouteDependencies,
} from "./routes/settings.js";
import {
  audioRoutes,
  type AudioRouteDependencies,
} from "./routes/audio.js";
import {
  pluginsRoutes,
  type PluginRouteDependencies,
} from "./routes/plugins.js";

export type CreateServerOptions = {
  audio?: AudioRouteDependencies;
  liveView?: LiveViewRouteDependencies;
  plugins?: PluginRouteDependencies;
  ptz?: PtzRouteDependencies;
  settings?: SettingsRouteDependencies;
  staticRoot?: string;
};

export async function createServer(
  options: CreateServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify();
  const staticRoot = options.staticRoot ?? resolveStaticRoot();

  await mkdir(staticRoot, { recursive: true });
  await app.register(fastifyStatic, {
    root: staticRoot,
    prefix: "/",
    index: false,
  });

  app.get("/", async (_request, reply) => {
    const indexFile =
      path.resolve(staticRoot) === path.resolve(process.cwd(), "web", "dist")
        ? "index.html"
        : path.join("web", "index.html");

    if (existsSync(path.join(staticRoot, indexFile))) {
      return reply.sendFile(indexFile);
    }

    reply.type("text/html");
    return reply.send(
      "<!doctype html><html><body><div id=\"app\"></div></body></html>",
    );
  });

  await app.register(diagnosticsPlugin);

  await app.register(liveViewRoutes, options.liveView ?? {});
  await app.register(ptzRoutes, options.ptz ?? {});
  await app.register(settingsRoutes, options.settings ?? {});
  await app.register(audioRoutes, options.audio ?? {});
  await app.register(pluginsRoutes, options.plugins ?? {});

  return app;
}

function resolveStaticRoot(): string {
  const preferredRoot = path.resolve(process.cwd(), "web", "dist");

  if (existsSync(preferredRoot)) {
    return preferredRoot;
  }

  return path.resolve(process.cwd(), "dist");
}
