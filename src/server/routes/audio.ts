import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";

const volumeBodySchema = z.object({
  volume: z.number().int().min(0).max(100),
});

const muteBodySchema = z.object({
  muted: z.boolean(),
});

export type AudioRouteDependencies = {
  getAudioCapability?: () => Promise<boolean>;
  setVolume?: (volume: number) => Promise<void>;
  setMute?: (muted: boolean) => Promise<void>;
};

export const audioRoutes: FastifyPluginAsync<AudioRouteDependencies> = async (
  app,
  options,
) => {
  const getAudioCapability = options.getAudioCapability ?? (async () => false);
  const setVolume = options.setVolume ?? (async () => {});
  const setMute = options.setMute ?? (async () => {});

  app.get("/api/audio/capability", async (_request, reply) => {
    const hasAudio = await getAudioCapability();
    return reply.send({ hasAudio });
  });

  app.post("/api/audio/volume", async (request, reply) => {
    const body = parseBody(volumeBodySchema, request.body, reply);

    if (!body) {
      return;
    }

    await setVolume(body.volume);
    return reply.send({ volume: body.volume });
  });

  app.post("/api/audio/mute", async (request, reply) => {
    const body = parseBody(muteBodySchema, request.body, reply);

    if (!body) {
      return;
    }

    await setMute(body.muted);
    return reply.send({ muted: body.muted });
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
