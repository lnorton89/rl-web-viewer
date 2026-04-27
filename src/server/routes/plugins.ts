import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";

import {
  createPluginRuntime,
} from "../../plugins/plugin-registry.js";
import {
  PluginRuntimeError,
  type PluginRuntime,
} from "../../plugins/plugin-contract.js";
import type { PluginConfigPatch } from "../../types/plugins.js";

export type PluginRouteDependencies = {
  createPluginRuntime?: () => Promise<PluginRuntime> | PluginRuntime;
};

const paramsSchema = z.object({
  pluginId: z.string().min(1),
});

const actionParamsSchema = paramsSchema.extend({
  actionId: z.string().min(1),
});

const requestObjectSchema = z.object({}).catchall(z.unknown());

const configPatchSchema = z
  .object({
    values: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const UNSAFE_PLUGIN_PATTERNS = [
  /access_token/i,
  /refresh_token/i,
  /client_secret/i,
  /rtsp:\/\//i,
  /rtmp:\/\//i,
  /rtmps:\/\//i,
  /streamName/,
  /password/i,
] as const;

export const pluginsRoutes: FastifyPluginAsync<PluginRouteDependencies> = async (
  app,
  options,
) => {
  const createRuntime = options.createPluginRuntime ?? createPluginRuntime;
  let runtimePromise: Promise<PluginRuntime> | null = null;

  async function resolveRuntime(): Promise<PluginRuntime> {
    runtimePromise ??= Promise.resolve(createRuntime());
    return runtimePromise;
  }

  app.get("/api/plugins", async (_request, reply) => {
    const runtime = await resolveRuntime();
    return sendSafe(reply, await runtime.listPlugins());
  });

  app.get("/api/plugins/:pluginId", async (request, reply) => {
    const params = parseParams(paramsSchema, request.params, reply);

    if (!params) {
      return;
    }

    const runtime = await resolveRuntime();
    return handleRuntimeCall(reply, () =>
      runtime.getPluginStatus(params.pluginId),
    );
  });

  app.post("/api/plugins/:pluginId/enable", async (request, reply) => {
    const params = parseParams(paramsSchema, request.params, reply);
    const body = parseObjectBody(request.body, reply);

    if (!params || !body) {
      return;
    }

    const runtime = await resolveRuntime();
    return handleRuntimeCall(reply, () =>
      runtime.enablePlugin(params.pluginId, body),
    );
  });

  app.post("/api/plugins/:pluginId/disable", async (request, reply) => {
    const params = parseParams(paramsSchema, request.params, reply);
    const body = parseObjectBody(request.body, reply);

    if (!params || !body) {
      return;
    }

    const runtime = await resolveRuntime();
    return handleRuntimeCall(reply, () =>
      runtime.disablePlugin(params.pluginId, body),
    );
  });

  app.post("/api/plugins/:pluginId/config", async (request, reply) => {
    const params = parseParams(paramsSchema, request.params, reply);
    const body = parseConfigBody(request.body, reply);

    if (!params || !body) {
      return;
    }

    const runtime = await resolveRuntime();
    return handleRuntimeCall(reply, () =>
      runtime.configurePlugin(params.pluginId, body),
    );
  });

  app.post(
    "/api/plugins/:pluginId/actions/:actionId",
    async (request, reply) => {
      const params = parseParams(actionParamsSchema, request.params, reply);
      const body = parseObjectBody(request.body, reply);

      if (!params || !body) {
        return;
      }

      const runtime = await resolveRuntime();
      return handleRuntimeCall(
        reply,
        () =>
          runtime.invokeAction(params.pluginId, params.actionId, body),
        202,
      );
    },
  );
};

function parseParams<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  reply: FastifyReply,
): z.infer<T> | null {
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  reply.code(400);
  void reply.send({
    error: parsed.error.issues[0]?.message ?? "Invalid route parameters",
  });
  return null;
}

function parseObjectBody(
  data: unknown,
  reply: FastifyReply,
): PluginConfigPatch | null {
  const parsed = requestObjectSchema.safeParse(data);

  if (parsed.success && !Array.isArray(parsed.data)) {
    return parsed.data;
  }

  reply.code(400);
  void reply.send({
    error: "Request body must be a JSON object.",
  });
  return null;
}

function parseConfigBody(
  data: unknown,
  reply: FastifyReply,
): PluginConfigPatch | null {
  const parsed = configPatchSchema.safeParse(data);

  if (parsed.success && !Array.isArray(parsed.data)) {
    return parsed.data;
  }

  reply.code(400);
  void reply.send({
    error: !parsed.success
      ? (parsed.error.issues[0]?.message ?? "Invalid request body")
      : "Invalid request body",
  });
  return null;
}

async function handleRuntimeCall(
  reply: FastifyReply,
  action: () => Promise<unknown>,
  successCode = 200,
): Promise<unknown> {
  try {
    const payload = await action();

    reply.code(successCode);
    return sendSafe(reply, payload);
  } catch (error) {
    if (isRuntimeError(error)) {
      const payload = {
        error: error.message,
        code: error.code,
      };

      assertBrowserSafePluginPayload(payload);
      reply.code(error.statusCode);
      return reply.send(payload);
    }

    throw error;
  }
}

function isRuntimeError(error: unknown): error is PluginRuntimeError {
  if (error instanceof PluginRuntimeError) {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error.statusCode === 404 ||
      error.statusCode === 409 ||
      error.statusCode === 422) &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

function sendSafe(reply: FastifyReply, payload: unknown): unknown {
  assertBrowserSafePluginPayload(payload);
  return reply.send(payload);
}

export function assertBrowserSafePluginPayload(payload: unknown): void {
  const serialized = JSON.stringify(payload);

  for (const pattern of UNSAFE_PLUGIN_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error("Plugin payload contained provider or camera secrets");
    }
  }
}
