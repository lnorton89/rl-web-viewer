import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance } from "fastify";

import {
  liveViewRoutes,
  type LiveViewRouteDependencies,
} from "./routes/live-view.js";

export type CreateServerOptions = {
  liveView?: LiveViewRouteDependencies;
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

  await app.register(liveViewRoutes, options.liveView ?? {});

  return app;
}

function resolveStaticRoot(): string {
  const preferredRoot = path.resolve(process.cwd(), "web", "dist");

  if (existsSync(preferredRoot)) {
    return preferredRoot;
  }

  return path.resolve(process.cwd(), "dist");
}
