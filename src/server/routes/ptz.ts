import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";

import { createReolinkPtzService } from "../../camera/reolink-ptz.js";
import type {
  PtzBootstrap,
  PtzDirection,
  PtzService,
  PtzStopReason,
  PtzZoomDirection,
} from "../../types/ptz.js";

export type PtzRouteDependencies = {
  createPtzService?: () => Promise<PtzService> | PtzService;
};

const ptzDirectionSchema = z.enum(["up", "down", "left", "right"]);
const ptzStopReasonSchema = z.enum([
  "release",
  "explicit-stop",
  "pointer-cancel",
  "blur",
  "visibility-hidden",
  "watchdog",
]);
const ptzZoomDirectionSchema = z.enum(["in", "out"]);

const startMotionBodySchema = z.object({
  direction: ptzDirectionSchema,
});

const stopMotionBodySchema = z.object({
  reason: ptzStopReasonSchema.optional(),
});

const zoomBodySchema = z.object({
  direction: ptzZoomDirectionSchema,
});

const presetParamsSchema = z.object({
  presetId: z.coerce.number().int().nonnegative(),
});

const PTZ_CONTROL_UNAVAILABLE_ERROR =
  "PTZ control is not available for this camera profile.";
const PTZ_PRESET_UNAVAILABLE_ERROR =
  "PTZ presets are not available for this camera profile.";

export const ptzRoutes: FastifyPluginAsync<PtzRouteDependencies> = async (
  app,
  options,
) => {
  const createService = options.createPtzService ?? createReolinkPtzService;
  let servicePromise: Promise<PtzService> | null = null;

  async function resolveService(): Promise<PtzService> {
    servicePromise ??= Promise.resolve(createService());
    return servicePromise;
  }

  app.get("/api/ptz", async (_request, reply) => {
    const service = await resolveService();
    const bootstrap = await service.getBootstrap();

    assertBrowserSafeBootstrap(bootstrap);
    return reply.send(bootstrap);
  });

  app.post("/api/ptz/motion/start", async (request, reply) => {
    const body = parseBody(startMotionBodySchema, request.body, reply);

    if (!body) {
      return;
    }

    const service = await resolveService();

    if (!(await requireControlSupport(service, reply))) {
      return;
    }

    reply.code(202);
    return reply.send(await service.startMotion(body.direction));
  });

  app.post("/api/ptz/stop", async (request, reply) => {
    const body = parseBody(stopMotionBodySchema, request.body, reply);

    if (!body) {
      return;
    }

    const service = await resolveService();

    if (!(await requireControlSupport(service, reply))) {
      return;
    }

    return reply.send(await service.stopMotion(body.reason ?? "explicit-stop"));
  });

  app.post("/api/ptz/zoom", async (request, reply) => {
    const body = parseBody(zoomBodySchema, request.body, reply);

    if (!body) {
      return;
    }

    const service = await resolveService();

    if (!(await requireControlSupport(service, reply))) {
      return;
    }

    reply.code(202);
    return reply.send(await service.pulseZoom(body.direction));
  });

  app.post("/api/ptz/presets/:presetId/recall", async (request, reply) => {
    const params = parseParams(presetParamsSchema, request.params, reply);

    if (!params) {
      return;
    }

    const service = await resolveService();

    if (!(await requirePresetSupport(service, reply))) {
      return;
    }

    reply.code(202);
    return reply.send(await service.recallPreset(params.presetId));
  });
};

function parseBody<T extends z.ZodTypeAny>(
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
    error: parsed.error.issues[0]?.message ?? "Invalid request body",
  });
  return null;
}

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

async function requireControlSupport(
  service: PtzService,
  reply: FastifyReply,
): Promise<boolean> {
  const bootstrap = await service.getBootstrap();

  if (bootstrap.supportsPtzControl) {
    return true;
  }

  reply.code(409);
  await reply.send({
    error: PTZ_CONTROL_UNAVAILABLE_ERROR,
  });
  return false;
}

async function requirePresetSupport(
  service: PtzService,
  reply: FastifyReply,
): Promise<boolean> {
  const bootstrap = await service.getBootstrap();

  if (bootstrap.supportsPtzPreset) {
    return true;
  }

  reply.code(409);
  await reply.send({
    error: PTZ_PRESET_UNAVAILABLE_ERROR,
  });
  return false;
}

function assertBrowserSafeBootstrap(bootstrap: PtzBootstrap): void {
  const serialized = JSON.stringify(bootstrap);

  if (/password|token=|cgi-bin\/api\.cgi/i.test(serialized)) {
    throw new Error("PTZ bootstrap contained camera credentials");
  }
}

export const ptzRouteSchemas = {
  ptzDirectionSchema,
  ptzStopReasonSchema,
  ptzZoomDirectionSchema,
};

export type PtzRouteDirection = PtzDirection;
export type PtzRouteStopReason = PtzStopReason;
export type PtzRouteZoomDirection = PtzZoomDirection;
