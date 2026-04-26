import { readFile } from "node:fs/promises";

import { describe, expect, it, vi } from "vitest";

import { createReolinkSettingsService } from "../../src/camera/reolink-settings.js";
import type { CapabilitySnapshot } from "../../src/camera/capability-snapshot.js";
import type { CameraConfig } from "../../src/config/camera-config.js";
import {
  EDITABLE_SETTINGS_SECTION_IDS,
  READ_ONLY_SETTINGS_SECTION_IDS,
  SETTINGS_FIELD_SPECS,
  SETTINGS_SECTION_IDS,
  SETTINGS_WRITE_STRATEGIES,
  createUnavailableSettingsBootstrap,
} from "../../src/types/settings.js";
import type { ReolinkApiResponse, ReolinkRequest } from "../../src/types/reolink.js";

const config: CameraConfig = {
  baseUrl: "http://192.168.1.140",
  username: "admin",
  password: "",
  modelHint: "RLC-423S",
  notes: "",
  debugCapture: false,
  snapshot: {
    model: "RLC-423S",
    hardVer: "IPC_3816M",
    firmVer: "v2.0.0.1055_17110905_v1.0.0.30",
  },
};

const snapshot: CapabilitySnapshot = {
  identity: {
    model: "RLC-423S",
    hardVer: "IPC_3816M",
    firmVer: "v2.0.0.1055_17110905_v1.0.0.30",
  },
  ports: {
    http: 80,
    https: 443,
    media: 9000,
    onvif: 8000,
    rtsp: 554,
  },
  supportsLiveView: true,
  supportsPtzControl: true,
  supportsPtzPreset: true,
  supportsPtzPatrol: true,
  supportsSnapshot: true,
  supportsConfigRead: true,
  supportsAudio: true,
};

describe("reolink settings bootstrap contract", () => {
  it("defines bootstrap section ids and editable coverage in one place", () => {
    expect(SETTINGS_SECTION_IDS).toEqual([
      "time",
      "osd",
      "image",
      "stream",
      "isp",
      "network",
    ]);
    expect(EDITABLE_SETTINGS_SECTION_IDS).toEqual([
      "time",
      "osd",
      "image",
      "stream",
      "network",
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
  it("marks SetOsd, SetImage, and SetEnc as full-object setters while patch sections stay narrow", () => {
    expect(SETTINGS_WRITE_STRATEGIES).toMatchObject({
      time: "patch",
      osd: "full-object",
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

describe("reolink settings service bootstrap", () => {
  it("builds bootstrap sections and shared field metadata when supportsConfigRead is true", async () => {
    const requestJson = createSessionRequestMock().mockResolvedValue(
      await loadReadFixtures(),
    );
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const bootstrap = await service.getBootstrap();

    expect(bootstrap.supportsConfigRead).toBe(true);
    expect(bootstrap.sections.map((section) => section.id)).toEqual([
      "time",
      "osd",
      "image",
      "stream",
      "isp",
      "network",
    ]);
    expect(bootstrap.sections.map((section) => section.status)).toEqual([
      "editable",
      "editable",
      "editable",
      "editable",
      "read-only",
      "editable",
    ]);
    expect(
      bootstrap.sections.find((section) => section.id === "image")?.fieldSpecs[0]
        ?.currentValue,
    ).toBeDefined();
    expect(requestJson).toHaveBeenCalledTimes(1);
  });

  it("hides the settings surface when supportsConfigRead is false", async () => {
    const requestJson = createSessionRequestMock();
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => ({
        ...snapshot,
        supportsConfigRead: false,
      }),
    });

    const bootstrap = await service.getBootstrap();

    expect(bootstrap.supportsConfigRead).toBe(false);
    expect(bootstrap.sections).toEqual([]);
    expect(requestJson).not.toHaveBeenCalled();
  });
});

describe("reolink settings service apply", () => {
  it("uses the patch strategy for time updates and returns a verified reread", async () => {
    const beforeTime = await loadFixture<readonly ReolinkApiResponse[]>("get-time.json");
    const beforeNtp = await loadFixture<readonly ReolinkApiResponse[]>("get-ntp.json");
    const afterTime = structuredClone(beforeTime);
    const afterNtp = structuredClone(beforeNtp);

    (afterTime[0]!.value as { Time: { timeFmt: string } }).Time.timeFmt =
      "YYYY/MM/DD";
    (afterTime[0]!.value as { Time: { Dst: { enable: number } } }).Time.Dst.enable = 0;
    (afterNtp[0]!.value as { Ntp: { server: string } }).Ntp.server = "time.nist.gov";

    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce([...beforeTime, ...beforeNtp])
      .mockResolvedValueOnce([
        {
          cmd: "SetNtp",
          code: 0,
          value: { rspCode: 200 },
        },
        {
          cmd: "SetTime",
          code: 0,
          value: { rspCode: 200 },
        },
      ])
      .mockResolvedValueOnce([...afterTime, ...afterNtp]);
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.applySection("time", {
      ntp: {
        server: "time.nist.gov",
      },
      time: {
        timeFmt: "YYYY/MM/DD",
      },
      dst: {
        enable: false,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verified).toBe(true);
      expect(result.changedFields.map((entry) => entry.fieldPath)).toEqual([
        "time.ntp.server",
        "time.time.timeFmt",
        "time.dst.enable",
      ]);
    }
    expect(requestJson.mock.calls[1]?.[0]).toEqual([
      {
        cmd: "SetNtp",
        action: 0,
        param: {
          Ntp: {
            server: "time.nist.gov",
          },
        },
      },
      {
        cmd: "SetTime",
        action: 0,
        param: {
          Time: {
            timeFmt: "YYYY/MM/DD",
            Dst: {
              enable: 0,
            },
          },
        },
      },
    ]);
  });

  it("uses the full-object strategy for image updates and returns verified changedFields", async () => {
    const beforeImage = await loadFixture<readonly ReolinkApiResponse[]>("get-image.json");
    const afterImage = structuredClone(beforeImage);

    (afterImage[0]!.value as { Image: { contrast: number } }).Image.contrast = 140;

    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce(beforeImage)
      .mockResolvedValueOnce([
        {
          cmd: "SetImage",
          code: 0,
          value: { rspCode: 200 },
        },
      ])
      .mockResolvedValueOnce(afterImage);
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.applySection("image", {
      contrast: 140,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.changedFields).toEqual([
        {
          fieldPath: "image.contrast",
          label: "Contrast",
          beforeValue: 96,
          afterValue: 140,
          verified: true,
        },
      ]);
    }
    expect(requestJson.mock.calls[1]?.[0]).toEqual([
      {
        cmd: "SetImage",
        action: 0,
        param: {
          Image: {
            channel: 0,
            bright: 128,
            contrast: 140,
            hue: 128,
            saturation: 110,
            sharpen: 128,
          },
        },
      },
    ]);
  });

  it("uses the full-object strategy for osd updates instead of a narrow SetOsd patch", async () => {
    const beforeOsd = await loadFixture<readonly ReolinkApiResponse[]>("get-osd.json");
    const afterOsd = structuredClone(beforeOsd);

    (
      afterOsd[0]!.value as {
        Osd: {
          osdChannel: {
            enable: number;
            name: string;
            pos: string;
          };
        };
      }
    ).Osd.osdChannel.enable = 0;

    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce(beforeOsd)
      .mockResolvedValueOnce([
        {
          cmd: "SetOsd",
          code: 0,
          value: { rspCode: 200 },
        },
      ])
      .mockResolvedValueOnce(afterOsd);
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.applySection("osd", {
      osdChannel: {
        enable: false,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.changedFields).toEqual([
        {
          fieldPath: "osd.osdChannel.enable",
          label: "Show Camera Name",
          beforeValue: true,
          afterValue: false,
          verified: true,
        },
      ]);
    }
    expect(requestJson.mock.calls[1]?.[0]).toEqual([
      {
        cmd: "SetOsd",
        action: 0,
        param: {
          Osd: {
            channel: 0,
            osdChannel: {
              enable: 0,
              name: "Front Gate",
              pos: "Upper Left",
            },
            osdTime: {
              enable: 1,
              pos: "Lower Right",
            },
          },
        },
      },
    ]);
  });

  it("uses the full-object strategy for stream updates instead of partial SetEnc payloads", async () => {
    const beforeEnc = await loadFixture<readonly ReolinkApiResponse[]>("get-enc.json");
    const afterEnc = structuredClone(beforeEnc);

    (
      afterEnc[0]!.value as {
        Enc: {
          subStream: {
            bitRate: number;
            frameRate: number;
          };
        };
      }
    ).Enc.subStream.bitRate = 640;
    (
      afterEnc[0]!.value as {
        Enc: {
          subStream: {
            bitRate: number;
            frameRate: number;
          };
        };
      }
    ).Enc.subStream.frameRate = 12;

    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce(beforeEnc)
      .mockResolvedValueOnce([
        {
          cmd: "SetEnc",
          code: 0,
          value: { rspCode: 200 },
        },
      ])
      .mockResolvedValueOnce(afterEnc);
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.applySection("stream", {
      subStream: {
        bitRate: 640,
        frameRate: 12,
      },
    });

    expect(result.ok).toBe(true);
    expect(requestJson.mock.calls[1]?.[0]).toEqual([
      {
        cmd: "SetEnc",
        action: 0,
        param: {
          Enc: {
            channel: 0,
            audio: 1,
            mainStream: {
              size: "3072x1728",
              frameRate: 25,
              bitRate: 6144,
              profile: "High",
            },
            subStream: {
              size: "640x360",
              frameRate: 12,
              bitRate: 640,
              profile: "Main",
            },
          },
        },
      },
    ]);
  });

  it("returns a no camera change detected failure when the verified reread matches the previous value", async () => {
    const beforeImage = await loadFixture<readonly ReolinkApiResponse[]>("get-image.json");
    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce(beforeImage)
      .mockResolvedValueOnce([
        {
          cmd: "SetImage",
          code: 0,
          value: { rspCode: 200 },
        },
      ])
      .mockResolvedValueOnce(beforeImage);
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.applySection("image", {
      contrast: 140,
    });

    expect(result).toEqual({
      ok: false,
      sectionId: "image",
      verified: false,
      code: "no-camera-change-detected",
      message: "No camera change detected after verification reread.",
      fieldErrors: [],
    });
  });

  it("maps rspCode -4 to a field error for a deterministic invalid input", async () => {
    const beforeImage = await loadFixture<readonly ReolinkApiResponse[]>("get-image.json");
    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce(beforeImage)
      .mockResolvedValueOnce([
        {
          cmd: "SetImage",
          code: 1,
          error: {
            detail: "invalid parameter",
            rspCode: -4,
          },
        },
      ]);
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.applySection("image", {
      contrast: 999,
    });

    expect(result).toEqual({
      ok: false,
      sectionId: "image",
      verified: false,
      code: "camera-reject",
      message: "The camera rejected one or more values for this section.",
      rspCode: -4,
      fieldErrors: [
        {
          fieldPath: "image.contrast",
          message: "The camera rejected the requested value.",
          code: "invalid-value",
        },
      ],
    });
  });

  it.each([
    [-6, "The camera rejected authentication for this write."],
    [-9, "This camera firmware does not allow that setting write."],
  ])("maps rspCode %s to a section-level failure", async (rspCode, message) => {
    const beforeEnc = await loadFixture<readonly ReolinkApiResponse[]>("get-enc.json");
    const requestJson = createSessionRequestMock()
      .mockResolvedValueOnce(beforeEnc)
      .mockResolvedValueOnce([
        {
          cmd: "SetEnc",
          code: 1,
          error: {
            detail: "camera reject",
            rspCode,
          },
        },
      ]);
    const service = createReolinkSettingsService({
      config,
      session: { requestJson },
      loadSnapshot: async () => snapshot,
    });

    const result = await service.applySection("stream", {
      subStream: {
        bitRate: 640,
      },
    });

    expect(result).toEqual({
      ok: false,
      sectionId: "stream",
      verified: false,
      code: "camera-reject",
      message,
      rspCode,
      fieldErrors: [],
    });
  });
});

type SessionRequest = <TResponse extends readonly ReolinkApiResponse[]>(
  commands: readonly ReolinkRequest[],
) => Promise<TResponse>;

type SessionRequestMock = ReturnType<
  typeof vi.fn<
    (commands: readonly ReolinkRequest[]) => Promise<readonly ReolinkApiResponse[]>
  >
> &
  SessionRequest;

function createSessionRequestMock(): SessionRequestMock {
  return vi.fn<
    (commands: readonly ReolinkRequest[]) => Promise<readonly ReolinkApiResponse[]>
  >() as SessionRequestMock;
}

async function loadReadFixtures(): Promise<readonly ReolinkApiResponse[]> {
  const names = [
    "get-time.json",
    "get-ntp.json",
    "get-image.json",
    "get-osd.json",
    "get-isp.json",
    "get-enc.json",
  ] as const;

  const entries = await Promise.all(
    names.map((name) => loadFixture<readonly ReolinkApiResponse[]>(name)),
  );

  return entries.flat();
}

async function loadFixture<T>(name: string): Promise<T> {
  const fileUrl = new URL(`../fixtures/reolink/${name}`, import.meta.url);
  const raw = await readFile(fileUrl, "utf8");
  return JSON.parse(raw) as T;
}
