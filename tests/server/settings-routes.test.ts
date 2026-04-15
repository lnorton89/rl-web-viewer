import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

import { settingsRoutes } from "../../src/server/routes/settings.js";
import {
  EDITABLE_SETTINGS_SECTION_IDS,
  SETTINGS_SECTION_IDS,
  SETTINGS_SECTION_META,
  SETTINGS_WRITE_STRATEGIES,
  getSectionFieldSpecs,
  type EditableSettingsSectionId,
  type SettingsApplyFailure,
  type SettingsApplySuccess,
  type SettingsBootstrap,
  type SettingsSection,
  type SettingsSectionId,
  type SettingsSectionValueMap,
  type SettingsService,
} from "../../src/types/settings.js";

const apps: Array<{ close: () => Promise<unknown> }> = [];

describe("settings routes", () => {
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("returns a browser-safe settings bootstrap with editable and read-only sections", async () => {
    const service = createSettingsService();
    const app = await createApp(service);

    const response = await app.inject({
      method: "GET",
      url: "/api/settings",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<SettingsBootstrap>()).toEqual(createBootstrap());
    expect(response.body).not.toContain("password");
    expect(response.body).not.toContain("token=");
    expect(response.body).not.toContain("cgi-bin/api.cgi");
    expect(response.body).not.toContain("rtsp://");
  });

  it("rejects unsafe browser-safe bootstrap payloads", async () => {
    const unsafeBootstrap = createBootstrap();
    unsafeBootstrap.sections[1]!.value.osdChannel.name = "rtsp://unsafe";
    const service = createSettingsService({
      bootstrap: unsafeBootstrap,
    });
    const app = await createApp(service);

    const response = await app.inject({
      method: "GET",
      url: "/api/settings",
    });

    expect(response.statusCode).toBe(500);
  });

  it("returns 400 for malformed params or body shape and 409 for read-only sections", async () => {
    const service = createSettingsService();
    const app = await createApp(service);

    const [invalidParam, malformedBody, readOnlySection] = await Promise.all([
      app.inject({
        method: "POST",
        url: "/api/settings/not-a-section/apply",
        payload: { contrast: 140 },
      }),
      app.inject({
        method: "POST",
        url: "/api/settings/image/apply",
        headers: {
          "content-type": "application/json",
        },
        payload: [],
      }),
      app.inject({
        method: "POST",
        url: "/api/settings/isp/apply",
        payload: {},
      }),
    ]);

    expect(invalidParam.statusCode).toBe(400);
    expect(invalidParam.json<{ error: string }>()).toEqual({
      error: "sectionId must be one of time, osd, image, stream, isp",
    });

    expect(malformedBody.statusCode).toBe(400);
    expect(malformedBody.json<{ error: string }>()).toEqual({
      error: "Request body must be a JSON object.",
    });

    expect(readOnlySection.statusCode).toBe(409);
    expect(readOnlySection.json()).toEqual({
      ok: false,
      sectionId: "isp",
      verified: false,
      code: "unsupported",
      message: "Settings section isp is read-only in Phase 4.",
      fieldErrors: [],
      sectionError: {
        message: "Settings section isp is read-only in Phase 4.",
        code: "unsupported",
      },
    });
  });

  it("returns 422 field errors when shared metadata validation rejects a draft", async () => {
    const service = createSettingsService();
    const app = await createApp(service);

    const response = await app.inject({
      method: "POST",
      url: "/api/settings/image/apply",
      payload: {
        contrast: 999,
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      ok: false,
      sectionId: "image",
      verified: false,
      code: "validation",
      message: "One or more fields failed validation.",
      fieldErrors: [
        {
          fieldPath: "image.contrast",
          message: "Contrast must be less than or equal to 255.",
          code: "invalid-value",
        },
      ],
    });
    expect(service.applySection).not.toHaveBeenCalled();
  });

  it("returns 422 section-level failures when the settings service rejects a write", async () => {
    const service = createSettingsService({
      applyResult: {
        ok: false,
        sectionId: "stream",
        verified: false,
        code: "camera-reject",
        message: "This camera firmware does not allow that setting write.",
        rspCode: -9,
        fieldErrors: [],
      },
    });
    const app = await createApp(service);

    const response = await app.inject({
      method: "POST",
      url: "/api/settings/stream/apply",
      payload: {
        subStream: {
          bitRate: 640,
        },
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      ok: false,
      sectionId: "stream",
      verified: false,
      code: "camera-reject",
      message: "This camera firmware does not allow that setting write.",
      rspCode: -9,
      fieldErrors: [],
      sectionError: {
        message: "This camera firmware does not allow that setting write.",
        code: "camera-reject",
        rspCode: -9,
      },
    });
  });

  it("returns verified before and after summaries for successful applies", async () => {
    const applyResult: SettingsApplySuccess<"image"> = {
      ok: true,
      sectionId: "image",
      verified: true,
      before: createSectionValues().image,
      after: {
        ...createSectionValues().image,
        contrast: 140,
      },
      changedFields: [
        {
          fieldPath: "image.contrast",
          label: "Contrast",
          beforeValue: 96,
          afterValue: 140,
          verified: true,
        },
      ],
    };
    const service = createSettingsService({
      applyResult,
    });
    const app = await createApp(service);

    const response = await app.inject({
      method: "POST",
      url: "/api/settings/image/apply",
      payload: {
        contrast: 140,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(applyResult);
    expect(service.applySection).toHaveBeenCalledWith("image", {
      contrast: 140,
    });
  });
});

async function createApp(service: SettingsService) {
  const app = Fastify();
  await app.register(settingsRoutes, {
    createSettingsService: () => service,
  });
  apps.push(app);
  return app;
}

function createSettingsService(input: {
  bootstrap?: SettingsBootstrap;
  applyResult?:
    | SettingsApplySuccess<EditableSettingsSectionId>
    | SettingsApplyFailure<SettingsSectionId>;
} = {}): SettingsService & {
  getBootstrap: ReturnType<typeof vi.fn<() => Promise<SettingsBootstrap>>>;
  applySection: ReturnType<typeof vi.fn<SettingsService["applySection"]>>;
} {
  const bootstrap = input.bootstrap ?? createBootstrap();

  return {
    getBootstrap: vi.fn(async () => structuredClone(bootstrap)),
    applySection: vi.fn(
      async (
        _sectionId: EditableSettingsSectionId,
        _draft: unknown,
      ): Promise<
        | SettingsApplySuccess<EditableSettingsSectionId>
        | SettingsApplyFailure<SettingsSectionId>
      > =>
        structuredClone(
          input.applyResult ??
            ({
              ok: true,
              sectionId: "image",
              verified: true,
              before: createSectionValues().image,
              after: createSectionValues().image,
              changedFields: [],
            } satisfies SettingsApplySuccess<"image">),
        ),
    ) as ReturnType<typeof vi.fn<SettingsService["applySection"]>>,
  };
}

function createBootstrap(): SettingsBootstrap {
  const values = createSectionValues();
  const sections = SETTINGS_SECTION_IDS.map((sectionId) =>
    createSection(sectionId, values[sectionId]),
  );

  return {
    supportsConfigRead: true,
    sectionIds: SETTINGS_SECTION_IDS,
    editableSectionIds: EDITABLE_SETTINGS_SECTION_IDS,
    readOnlySectionIds: ["isp"],
    fieldSpecs: sections.flatMap((section) => section.fieldSpecs),
    sections,
  };
}

function createSection<TId extends SettingsSectionId>(
  sectionId: TId,
  value: SettingsSectionValueMap[TId],
): SettingsSection<TId> {
  return {
    id: sectionId,
    title: SETTINGS_SECTION_META[sectionId].title,
    description: SETTINGS_SECTION_META[sectionId].description,
    status: sectionId === "isp" ? "read-only" : "editable",
    editable: sectionId !== "isp",
    strategy: SETTINGS_WRITE_STRATEGIES[sectionId],
    fieldSpecs: getSectionFieldSpecs(sectionId).map((fieldSpec) => ({
      ...fieldSpec,
      currentValue: getValueAtPath(
        value,
        fieldSpec.fieldPath.split(".").slice(1).join("."),
      ),
    })),
    value: structuredClone(value),
  };
}

function createSectionValues(): SettingsSectionValueMap {
  return {
    time: {
      ntp: {
        enable: true,
        server: "pool.ntp.org",
        port: 123,
        interval: 60,
      },
      time: {
        timeZone: -8,
        timeFmt: "MM/DD/YYYY",
        hourFmt: 1,
      },
      dst: {
        enable: true,
        offset: 1,
        startMon: 3,
        startWeek: 2,
        startWeekday: 0,
        startHour: 2,
        endMon: 11,
        endWeek: 1,
        endWeekday: 0,
        endHour: 2,
      },
      currentClock: {
        year: 2026,
        mon: 4,
        day: 15,
        hour: 12,
        min: 0,
        sec: 30,
      },
    },
    osd: {
      osdChannel: {
        enable: true,
        name: "Driveway",
        pos: "Upper Left",
      },
      osdTime: {
        enable: true,
        pos: "Lower Right",
      },
    },
    image: {
      bright: 128,
      contrast: 96,
      hue: 128,
      saturation: 110,
      sharpen: 128,
    },
    stream: {
      subStream: {
        size: "640x360",
        frameRate: 10,
        bitRate: 512,
        profile: "Main",
      },
      mainStreamSummary: {
        size: "3072x1728",
        frameRate: 25,
        bitRate: 6144,
        profile: "High",
      },
      audioEnabled: true,
    },
    isp: {
      dayNight: "Auto",
      backLight: "DynamicRangeControl",
      antiFlicker: "60Hz",
      exposureMode: "Auto",
      nr3d: 0,
    },
  };
}

function getValueAtPath(root: unknown, path: string): string | number | boolean | null {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return null;
    }

    return (current as Record<string, unknown>)[segment] ?? null;
  }, root) as string | number | boolean | null;
}
