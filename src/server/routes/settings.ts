import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { z } from "zod";

import { createReolinkSettingsService } from "../../camera/reolink-settings.js";
import type {
  EditableSettingsSectionId,
  SettingsApplyFailure,
  SettingsFieldError,
  SettingsFieldPrimitive,
  SettingsFieldSpec,
  SettingsSectionDraftMap,
  SettingsSectionId,
  SettingsService,
} from "../../types/settings.js";
import {
  EDITABLE_SETTINGS_SECTION_IDS,
  SETTINGS_SECTION_IDS,
} from "../../types/settings.js";

export type SettingsRouteDependencies = {
  createSettingsService?: () => Promise<SettingsService> | SettingsService;
};

type SettingsRouteSectionError = {
  message: string;
  code: string;
  rspCode?: number;
  debugArtifactPath?: string;
};

type SettingsRouteFailure<TId extends SettingsSectionId = SettingsSectionId> =
  SettingsApplyFailure<TId> & {
    sectionError?: SettingsRouteSectionError;
  };

type DraftValidationResult<TId extends EditableSettingsSectionId> =
  | {
      ok: true;
      draft: SettingsSectionDraftMap[TId];
    }
  | {
      ok: false;
      failure: SettingsRouteFailure<TId>;
    };

type DraftTree = Record<string, DraftTree | SettingsFieldSpec>;

const paramsSchema = z.object({
  sectionId: z.string(),
});

const draftBodySchema = z.object({}).catchall(z.unknown());

const UNSAFE_SETTINGS_PATTERNS = [
  /"baseUrl":/i,
  /"username":/i,
  /"password":/i,
  /token=/i,
  /cgi-bin\/api\.cgi/i,
  /rtsp:\/\//i,
] as const;

const editableSectionIdSet = new Set<string>(EDITABLE_SETTINGS_SECTION_IDS);
const settingsSectionIdSet = new Set<string>(SETTINGS_SECTION_IDS);

export const settingsRoutes: FastifyPluginAsync<SettingsRouteDependencies> = async (
  app,
  options,
) => {
  const createService =
    options.createSettingsService ?? createReolinkSettingsService;
  let servicePromise: Promise<SettingsService> | null = null;

  async function resolveService(): Promise<SettingsService> {
    servicePromise ??= Promise.resolve(createService());
    return servicePromise;
  }

  app.get("/api/settings", async (_request, reply) => {
    const service = await resolveService();
    const bootstrap = await service.getBootstrap();

    assertBrowserSafePayload(bootstrap);
    return reply.send(bootstrap);
  });

  app.post("/api/settings/:sectionId/apply", async (request, reply) => {
    const params = parseParams(request.params, reply);

    if (!params) {
      return;
    }

    const sectionId = parseSectionId(params.sectionId, reply);

    if (!sectionId) {
      return;
    }

    if (!isEditableSectionId(sectionId)) {
      reply.code(409);
      return reply.send(
        createUnsupportedFailure(
          sectionId,
          `Settings section ${sectionId} is read-only in Phase 4.`,
        ),
      );
    }

    const draft = parseDraftBody(request.body, reply);

    if (!draft) {
      return;
    }

    const service = await resolveService();
    const bootstrap = await service.getBootstrap();

    assertBrowserSafePayload(bootstrap);

    if (!bootstrap.supportsConfigRead) {
      reply.code(409);
      return reply.send(
        createUnsupportedFailure(
          sectionId,
          "Settings are unavailable because config reads are not supported.",
        ),
      );
    }

    const section = bootstrap.sections.find(
      (candidate) => candidate.id === sectionId,
    );

    if (!section || !section.editable) {
      reply.code(409);
      return reply.send(
        createUnsupportedFailure(
          sectionId,
          `Settings section ${sectionId} is not editable for this camera profile.`,
        ),
      );
    }

    const validation = validateDraft(sectionId, draft, section.fieldSpecs);

    if (!validation.ok) {
      const failure = validation.failure;
      assertBrowserSafePayload(failure);
      reply.code(422);
      return reply.send(failure);
    }

    const result = await service.applySection(sectionId, validation.draft);

    if (!result.ok) {
      const failure = decorateFailure(result);
      assertBrowserSafePayload(failure);
      reply.code(result.code === "unsupported" ? 409 : 422);
      return reply.send(failure);
    }

    assertBrowserSafePayload(result);
    return reply.send(result);
  });
};

function parseParams(data: unknown, reply: FastifyReply): { sectionId: string } | null {
  const parsed = paramsSchema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  reply.code(400);
  void reply.send({
    error: parsed.error.issues[0]?.message ?? "Invalid route parameters",
  });
  return null;
}

function parseSectionId(
  sectionId: string,
  reply: FastifyReply,
): SettingsSectionId | null {
  if (settingsSectionIdSet.has(sectionId)) {
    return sectionId as SettingsSectionId;
  }

  reply.code(400);
  void reply.send({
    error: `sectionId must be one of ${SETTINGS_SECTION_IDS.join(", ")}`,
  });
  return null;
}

function parseDraftBody(
  data: unknown,
  reply: FastifyReply,
): Record<string, unknown> | null {
  const parsed = draftBodySchema.safeParse(data);

  if (parsed.success && !Array.isArray(parsed.data)) {
    return parsed.data;
  }

  reply.code(400);
  void reply.send({
    error: "Request body must be a JSON object.",
  });
  return null;
}

function isEditableSectionId(
  sectionId: SettingsSectionId,
): sectionId is EditableSettingsSectionId {
  return editableSectionIdSet.has(sectionId);
}

function validateDraft<TId extends EditableSettingsSectionId>(
  sectionId: TId,
  draft: Record<string, unknown>,
  fieldSpecs: readonly SettingsFieldSpec[],
): DraftValidationResult<TId> {
  const schema = buildDraftSchema(fieldSpecs);
  const parsed = schema.safeParse(draft);

  if (!parsed.success) {
    return {
      ok: false,
      failure: createValidationFailure(sectionId, parsed.error.issues),
    };
  }

  if (collectLeafValues(parsed.data).length === 0) {
    return {
      ok: false,
      failure: {
        ok: false,
        sectionId,
        verified: false,
        code: "validation",
        message: "No editable fields were provided for this section.",
        fieldErrors: [],
        sectionError: {
          message: "No editable fields were provided for this section.",
          code: "validation",
        },
      },
    };
  }

  return {
    ok: true,
    draft: parsed.data as SettingsSectionDraftMap[TId],
  };
}

function buildDraftSchema(
  fieldSpecs: readonly SettingsFieldSpec[],
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const tree: DraftTree = {};

  for (const fieldSpec of fieldSpecs.filter((spec) => spec.editable)) {
    insertFieldSpec(tree, stripSectionPrefix(fieldSpec.fieldPath), fieldSpec);
  }

  return buildObjectSchema(tree);
}

function insertFieldSpec(
  tree: DraftTree,
  fieldPath: string,
  fieldSpec: SettingsFieldSpec,
): void {
  const [segment, ...rest] = fieldPath.split(".");

  if (!segment) {
    return;
  }

  if (rest.length === 0) {
    tree[segment] = fieldSpec;
    return;
  }

  const branch = tree[segment];
  const nextTree =
    branch && !isFieldSpec(branch) ? branch : ({} satisfies DraftTree);

  tree[segment] = nextTree;
  insertFieldSpec(nextTree, rest.join("."), fieldSpec);
}

function buildObjectSchema(tree: DraftTree): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, value] of Object.entries(tree)) {
    shape[key] = isFieldSpec(value)
      ? createFieldSchema(value).optional()
      : buildObjectSchema(value).strict().optional();
  }

  return z.object(shape).strict();
}

function createFieldSchema(fieldSpec: SettingsFieldSpec): z.ZodTypeAny {
  switch (fieldSpec.kind) {
    case "toggle":
      return z.boolean({
        message: `${fieldSpec.label} must be true or false.`,
      });
    case "text": {
      let schema = z.string({
        message: `${fieldSpec.label} must be a string.`,
      });

      if (fieldSpec.constraints?.minLength != null) {
        schema = schema.min(fieldSpec.constraints.minLength, {
          message: `${fieldSpec.label} must be at least ${fieldSpec.constraints.minLength} characters.`,
        });
      }

      if (fieldSpec.constraints?.maxLength != null) {
        schema = schema.max(fieldSpec.constraints.maxLength, {
          message: `${fieldSpec.label} must be at most ${fieldSpec.constraints.maxLength} characters.`,
        });
      }

      return schema;
    }
    case "number": {
      let schema = z.number({
        message: `${fieldSpec.label} must be a number.`,
      });

      if (fieldSpec.constraints?.integer) {
        schema = schema.int({
          message: `${fieldSpec.label} must be an integer.`,
        });
      }

      if (fieldSpec.constraints?.min != null) {
        schema = schema.min(fieldSpec.constraints.min, {
          message: `${fieldSpec.label} must be greater than or equal to ${fieldSpec.constraints.min}.`,
        });
      }

      if (fieldSpec.constraints?.max != null) {
        schema = schema.max(fieldSpec.constraints.max, {
          message: `${fieldSpec.label} must be less than or equal to ${fieldSpec.constraints.max}.`,
        });
      }

      if (fieldSpec.constraints?.step != null) {
        schema = schema.multipleOf(fieldSpec.constraints.step, {
          message: `${fieldSpec.label} must follow step ${fieldSpec.constraints.step}.`,
        });
      }

      return schema;
    }
    case "select":
      return z.custom<SettingsFieldPrimitive>(
        (value) =>
          fieldSpec.options?.some((option) => Object.is(option.value, value)) ??
          false,
        {
          message: `${fieldSpec.label} must match one of the allowed options.`,
        },
      );
    case "read-only":
      return z.never();
  }
}

function createValidationFailure<TId extends EditableSettingsSectionId>(
  sectionId: TId,
  issues: readonly z.ZodIssue[],
): SettingsRouteFailure<TId> {
  const fieldErrors: SettingsFieldError[] = [];
  let sectionError: SettingsRouteSectionError | undefined;

  for (const issue of issues) {
    if (issue.code === "unrecognized_keys") {
      sectionError = {
        message: `Unknown field(s): ${issue.keys.join(", ")}.`,
        code: "validation",
      };
      continue;
    }

    const path = issue.path.join(".");

    if (!path) {
      sectionError = {
        message: issue.message,
        code: "validation",
      };
      continue;
    }

    fieldErrors.push({
      fieldPath: `${sectionId}.${path}`,
      message: issue.message,
      code: "invalid-value",
    });
  }

  return {
    ok: false,
    sectionId,
    verified: false,
    code: "validation",
    message:
      fieldErrors.length > 0
        ? "One or more fields failed validation."
        : sectionError?.message ?? "Validation failed for this section.",
    fieldErrors,
    ...(sectionError ? { sectionError } : {}),
  };
}

function decorateFailure<TId extends SettingsSectionId>(
  failure: SettingsApplyFailure<TId>,
): SettingsRouteFailure<TId> {
  if (failure.fieldErrors.length > 0) {
    return failure;
  }

  return {
    ...failure,
    sectionError: {
      message: failure.message,
      code: failure.code,
      ...(failure.rspCode != null ? { rspCode: failure.rspCode } : {}),
      ...(failure.debugArtifactPath
        ? { debugArtifactPath: failure.debugArtifactPath }
        : {}),
    },
  };
}

function createUnsupportedFailure<TId extends SettingsSectionId>(
  sectionId: TId,
  message: string,
): SettingsRouteFailure<TId> {
  return {
    ok: false,
    sectionId,
    verified: false,
    code: "unsupported",
    message,
    fieldErrors: [],
    sectionError: {
      message,
      code: "unsupported",
    },
  };
}

function collectLeafValues(value: object): string[] {
  return Object.values(value).flatMap((entryValue) => {
    if (
      entryValue != null &&
      typeof entryValue === "object" &&
      !Array.isArray(entryValue)
    ) {
      return collectLeafValues(entryValue as object);
    }

    return [String(entryValue)];
  });
}

function isFieldSpec(value: DraftTree | SettingsFieldSpec): value is SettingsFieldSpec {
  return "fieldPath" in value;
}

function stripSectionPrefix(fieldPath: string): string {
  return fieldPath.split(".").slice(1).join(".");
}

function assertBrowserSafePayload(payload: unknown): void {
  const serialized = JSON.stringify(payload);

  for (const pattern of UNSAFE_SETTINGS_PATTERNS) {
    if (pattern.test(serialized)) {
      throw new Error("Settings payload contained camera credentials");
    }
  }
}
