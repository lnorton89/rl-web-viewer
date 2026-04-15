import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  EDITABLE_SETTINGS_SECTION_IDS,
  READ_ONLY_SETTINGS_SECTION_IDS,
  SETTINGS_FIELD_SPECS,
  SETTINGS_SECTION_IDS,
  SETTINGS_WRITE_STRATEGIES,
  createUnavailableSettingsBootstrap,
} from "../../src/types/settings.js";

describe("reolink settings bootstrap contract", () => {
  it("defines bootstrap section ids and editable coverage in one place", () => {
    expect(SETTINGS_SECTION_IDS).toEqual([
      "time",
      "osd",
      "image",
      "stream",
      "isp",
    ]);
    expect(EDITABLE_SETTINGS_SECTION_IDS).toEqual([
      "time",
      "osd",
      "image",
      "stream",
    ]);
    expect(READ_ONLY_SETTINGS_SECTION_IDS).toEqual(["isp"]);
  });

  it("keeps supportsConfigRead gating separate from shared bootstrap metadata", () => {
    const bootstrap = createUnavailableSettingsBootstrap();

    expect(bootstrap.supportsConfigRead).toBe(false);
    expect(bootstrap.sections).toEqual([]);
    expect(bootstrap.fieldSpecs).toHaveLength(
      Object.keys(SETTINGS_FIELD_SPECS).length,
    );
  });

  it("exposes one shared field spec source with constraints, defaults, and read-only rows", () => {
    expect(SETTINGS_FIELD_SPECS["image.bright"]).toMatchObject({
      sectionId: "image",
      kind: "number",
      label: "Brightness",
      defaultValue: 128,
      constraints: {
        min: 0,
        max: 255,
        step: 1,
      },
    });

    expect(SETTINGS_FIELD_SPECS["osd.osdChannel.pos"]).toMatchObject({
      sectionId: "osd",
      kind: "select",
      label: "Camera Name Position",
      options: expect.arrayContaining([
        { value: "Upper Left", label: "Upper Left" },
        { value: "Lower Right", label: "Lower Right" },
      ]),
    });

    expect(SETTINGS_FIELD_SPECS["stream.mainStreamSummary.size"]).toMatchObject({
      sectionId: "stream",
      kind: "read-only",
      editable: false,
      label: "Main Stream Resolution",
    });
  });
});

describe("reolink settings strategy contract", () => {
  it("marks SetImage and SetEnc as full-object setters while patch sections stay narrow", () => {
    expect(SETTINGS_WRITE_STRATEGIES).toMatchObject({
      time: "patch",
      osd: "patch",
      image: "full-object",
      stream: "full-object",
      isp: "read-only",
    });
  });
});

describe("reolink settings firmware fixtures", () => {
  it("loads sanitized Get* fixtures for the target firmware", async () => {
    const fixtureNames = [
      "get-time.json",
      "get-ntp.json",
      "get-image.json",
      "get-osd.json",
      "get-isp.json",
      "get-enc.json",
    ] as const;

    const fixtures = await Promise.all(
      fixtureNames.map(async (name) => {
        const fileUrl = new URL(`../fixtures/reolink/${name}`, import.meta.url);
        const raw = await readFile(fileUrl, "utf8");
        return JSON.parse(raw) as Array<{ cmd: string; code: number }>;
      }),
    );

    expect(fixtures.map((fixture) => fixture[0]?.cmd)).toEqual([
      "GetTime",
      "GetNtp",
      "GetImage",
      "GetOsd",
      "GetIsp",
      "GetEnc",
    ]);
    expect(fixtures.every((fixture) => fixture[0]?.code === 0)).toBe(true);
  });
});
