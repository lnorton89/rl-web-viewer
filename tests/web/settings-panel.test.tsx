import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  EditableSettingsSectionId,
  SettingsApplyFailure,
  SettingsApplySuccess,
  SettingsBootstrap,
  SettingsFieldPrimitive,
  SettingsFieldSpec,
} from "../../src/types/settings.js";
import { useSettings } from "../../web/src/hooks/use-settings.js";
import { applySettingsSection, fetchSettingsBootstrap } from "../../web/src/lib/settings-api.js";

vi.mock("../../web/src/lib/settings-api.js", () => ({
  applySettingsSection: vi.fn(),
  fetchSettingsBootstrap: vi.fn(),
}));

const fetchSettingsBootstrapMock = vi.mocked(fetchSettingsBootstrap);
const applySettingsSectionMock = vi.mocked(applySettingsSection);

describe("settings panel flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSettingsBootstrapMock.mockResolvedValue(createBootstrap());
    applySettingsSectionMock.mockImplementation(async (sectionId) => {
      throw new Error(`Unexpected apply call for ${sectionId}`);
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps drafts, review state, and apply actions scoped to each section", async () => {
    const user = userEvent.setup();

    render(<SettingsHarness />);

    const timeCard = await screen.findByTestId("settings-section-time");
    const osdCard = screen.getByTestId("settings-section-osd");

    await user.click(within(timeCard).getByRole("button", { name: "Edit" }));
    await user.clear(within(timeCard).getByLabelText("NTP Server"));
    await user.type(within(timeCard).getByLabelText("NTP Server"), "time.nist.gov");

    expect(
      within(timeCard).getByRole("button", { name: "Review Changes" }),
    ).toBeEnabled();
    expect(
      within(osdCard).getByRole("button", { name: "Review Changes" }),
    ).toBeDisabled();
    expect(within(timeCard).getByText("Draft")).not.toBeNull();

    await user.click(within(timeCard).getByRole("button", { name: "Review Changes" }));

    expect(within(timeCard).getByText("Review Changes")).not.toBeNull();
    expect(within(timeCard).getByRole("button", { name: "Apply Settings" })).toBeEnabled();
    expect(within(osdCard).queryByText("Apply Settings")).toBeNull();
  });

  it("renders select and numeric controls from shared field metadata and disables review with no diff", async () => {
    const user = userEvent.setup();

    render(<SettingsHarness />);

    const imageCard = await screen.findByTestId("settings-section-image");
    await user.click(within(imageCard).getByRole("button", { name: "Edit" }));

    const brightnessInput = within(imageCard).getByLabelText("Brightness");
    expect(brightnessInput).toHaveAttribute("min", "0");
    expect(brightnessInput).toHaveAttribute("max", "255");
    expect(brightnessInput).toHaveAttribute("step", "1");

    const streamCard = screen.getByTestId("settings-section-stream");
    await user.click(within(streamCard).getByRole("button", { name: "Edit" }));

    const streamSelect = within(streamCard).getByLabelText("Sub-stream Resolution");
    expect(within(streamSelect).getByRole("option", { name: "640 x 360" })).not.toBeNull();
    expect(within(streamSelect).getByRole("option", { name: "1280 x 720" })).not.toBeNull();
    expect(
      within(streamCard).getByRole("button", { name: "Review Changes" }),
    ).toBeDisabled();
  });

  it("shows a verified summary from the server reread after a successful apply", async () => {
    const user = userEvent.setup();

    applySettingsSectionMock.mockResolvedValueOnce(
      createApplySuccess("stream", {
        before: {
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
        after: {
          subStream: {
            size: "896x512",
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
        changedFields: [
          {
            fieldPath: "stream.subStream.size",
            label: "Sub-stream Resolution",
            beforeValue: "640x360",
            afterValue: "896x512",
            verified: true,
          },
        ],
      }),
    );

    render(<SettingsHarness />);

    const streamCard = await screen.findByTestId("settings-section-stream");
    await user.click(within(streamCard).getByRole("button", { name: "Edit" }));
    await user.selectOptions(
      within(streamCard).getByLabelText("Sub-stream Resolution"),
      "896x512",
    );
    await user.click(within(streamCard).getByRole("button", { name: "Review Changes" }));

    expect(
      within(streamCard).getByText(
        "Applying stream changes may briefly reset live playback.",
      ),
    ).not.toBeNull();

    await user.click(within(streamCard).getByRole("button", { name: "Apply Settings" }));

    await waitFor(() => {
      expect(
        within(streamCard).getByText("Verified against camera"),
      ).not.toBeNull();
    });

    expect(
      within(streamCard).getByText("Sub-stream Resolution"),
    ).not.toBeNull();
    expect(within(streamCard).getByText("640x360 -> 896x512")).not.toBeNull();
  });

  it("preserves the draft and attaches field and section errors after a rejected apply", async () => {
    const user = userEvent.setup();

    applySettingsSectionMock.mockResolvedValueOnce(
      createApplyFailure("osd", {
        message: "The camera rejected one or more changes.",
        fieldErrors: [
          {
            fieldPath: "osd.osdChannel.name",
            message: "Camera Name must be at most 32 characters.",
            code: "invalid-value",
          },
        ],
        sectionError: "The camera rejected one or more changes.",
      }),
    );

    render(<SettingsHarness />);

    const osdCard = await screen.findByTestId("settings-section-osd");
    await user.click(within(osdCard).getByRole("button", { name: "Edit" }));
    const nameInput = within(osdCard).getByLabelText("Camera Name");
    await user.clear(nameInput);
    await user.type(nameInput, "A camera name that is far too long to survive");
    await user.click(within(osdCard).getByRole("button", { name: "Review Changes" }));
    await user.click(within(osdCard).getByRole("button", { name: "Apply Settings" }));

    await waitFor(() => {
      expect(
        within(osdCard).getByText("The camera rejected one or more changes."),
      ).not.toBeNull();
    });

    expect(within(osdCard).getByText("Camera Name must be at most 32 characters.")).not.toBeNull();
    expect(within(osdCard).getByDisplayValue("A camera name that is far too long to survive")).not.toBeNull();
    expect(
      within(osdCard).getByRole("button", { name: "Fix and Review Again" }),
    ).toBeEnabled();
  });
});

function SettingsHarness() {
  const { isLoading, loadError, sections } = useSettings();

  if (isLoading) {
    return <p>Loading settings…</p>;
  }

  if (loadError) {
    return <p>{loadError}</p>;
  }

  return (
    <div>
      {sections.map((section) => {
        const supportLabel = section.editable ? "Safe Settings" : "Inspect Only";
        const reviewButtonLabel =
          section.mode === "error" ? "Fix and Review Again" : "Review Changes";

        return (
          <section data-testid={`settings-section-${section.id}`} key={section.id}>
            <p>{supportLabel}</p>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <span>{section.badgeLabel}</span>
            <div {...section.statusProps}>
              {section.sectionError ? <p>{section.sectionError}</p> : null}
              {section.mode === "review" ? <p>Review Changes</p> : null}
              {section.mode === "verified" ? <p>Verified against camera</p> : null}
              {section.mode === "verified" && section.verifiedSummary?.noCameraChangeDetected ? (
                <p>No camera change detected</p>
              ) : null}
              {section.mode === "review" && section.id === "stream" ? (
                <p>Applying stream changes may briefly reset live playback.</p>
              ) : null}
              {section.verifiedSummary?.rows.map((row) => (
                <p key={`${section.id}-${row.fieldPath}`}>
                  {row.label}
                  {" "}
                  {formatValue(row.beforeValue)}
                  {" -> "}
                  {formatValue(row.afterValue)}
                </p>
              ))}
              {section.reviewRows.map((row) => (
                <p key={`${section.id}-${row.fieldPath}-review`}>
                  {row.label}
                  {" "}
                  {formatValue(row.beforeValue)}
                  {" -> "}
                  {formatValue(row.afterValue)}
                </p>
              ))}
            </div>

            {section.fieldViews.map((field) => (
              <label key={field.fieldSpec.fieldPath}>
                <span>{field.fieldSpec.label}</span>
                {renderField(section, field.fieldSpec, field.value)}
                {field.error ? <span>{field.error}</span> : null}
              </label>
            ))}

            <div>
              {section.editable ? (
                <>
                  {section.mode === "read" || section.mode === "verified" ? (
                    <button type="button" onClick={() => void section.startEditing()}>
                      {section.mode === "verified" ? "Edit Again" : "Edit"}
                    </button>
                  ) : null}
                  {section.mode === "editing" || section.mode === "error" ? (
                    <>
                      <button type="button" onClick={() => section.cancelEditing()}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!section.canReview}
                        onClick={() => section.enterReview()}
                      >
                        {reviewButtonLabel}
                      </button>
                    </>
                  ) : null}
                  {section.mode === "review" ? (
                    <>
                      <button type="button" onClick={() => section.returnToEditing()}>
                        Back to Editing
                      </button>
                      <button
                        type="button"
                        disabled={section.mode === "applying"}
                        onClick={() => void section.apply()}
                      >
                        Apply Settings
                      </button>
                    </>
                  ) : null}
                </>
              ) : (
                <p>Read only</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function renderField(
  section: ReturnType<typeof useSettings>["sections"][number],
  fieldSpec: SettingsFieldSpec,
  value: SettingsFieldPrimitive,
) {
  const disabled = !section.editable || section.mode === "read" || section.mode === "review" || section.mode === "verified";

  switch (fieldSpec.kind) {
    case "toggle":
      return (
        <input
          checked={Boolean(value)}
          disabled={disabled}
          type="checkbox"
          onChange={(event) => {
            section.updateDraft(fieldSpec.fieldPath, event.currentTarget.checked);
          }}
        />
      );
    case "number":
      return (
        <input
          aria-label={fieldSpec.label}
          disabled={disabled}
          max={fieldSpec.constraints?.max}
          min={fieldSpec.constraints?.min}
          step={fieldSpec.constraints?.step}
          type={fieldSpec.sectionId === "image" ? "range" : "number"}
          value={typeof value === "number" ? String(value) : ""}
          onChange={(event) => {
            section.updateDraft(fieldSpec.fieldPath, Number(event.currentTarget.value));
          }}
        />
      );
    case "select":
      return (
        <select
          aria-label={fieldSpec.label}
          disabled={disabled}
          value={String(value)}
          onChange={(event) => {
            const nextValue =
              fieldSpec.options?.find((option) => String(option.value) === event.currentTarget.value)?.value ??
              event.currentTarget.value;
            section.updateDraft(fieldSpec.fieldPath, nextValue);
          }}
        >
          {fieldSpec.options?.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "text":
      return (
        <input
          aria-label={fieldSpec.label}
          disabled={disabled}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => {
            section.updateDraft(fieldSpec.fieldPath, event.currentTarget.value);
          }}
        />
      );
    case "read-only":
      return <span>{formatValue(value)}</span>;
  }
}

function createBootstrap(): SettingsBootstrap {
  return {
    supportsConfigRead: true,
    sectionIds: ["time", "osd", "image", "stream", "isp"],
    editableSectionIds: ["time", "osd", "image", "stream"],
    readOnlySectionIds: ["isp"],
    fieldSpecs: [
      createFieldSpec("time", "time.ntp.server", "text", "NTP Server", "pool.ntp.org"),
      createFieldSpec("time", "time.ntp.enable", "toggle", "Automatic Time Sync", true),
      createFieldSpec("osd", "osd.osdChannel.name", "text", "Camera Name", "Front Door"),
      createFieldSpec("image", "image.bright", "number", "Brightness", 128, {
        constraints: { min: 0, max: 255, step: 1 },
      }),
      createFieldSpec("stream", "stream.subStream.size", "select", "Sub-stream Resolution", "640x360", {
        options: [
          { value: "640x360", label: "640 x 360" },
          { value: "896x512", label: "896 x 512" },
          { value: "1280x720", label: "1280 x 720" },
        ],
      }),
      createFieldSpec("stream", "stream.subStream.frameRate", "number", "Sub-stream Frame Rate", 10, {
        constraints: { min: 1, max: 25, step: 1 },
      }),
      createFieldSpec("isp", "isp.dayNight", "read-only", "Day/Night Mode", "Auto", {
        editable: false,
      }),
    ],
    sections: [
      {
        id: "time",
        title: "Time & Sync",
        description: "NTP, timezone, display format, and DST rules.",
        status: "editable",
        editable: true,
        strategy: "patch",
        fieldSpecs: [
          createFieldSpec("time", "time.ntp.server", "text", "NTP Server", "pool.ntp.org"),
          createFieldSpec("time", "time.ntp.enable", "toggle", "Automatic Time Sync", true),
        ],
        value: {
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
            hour: 20,
            min: 5,
            sec: 0,
          },
        },
      },
      {
        id: "osd",
        title: "Display Overlay",
        description: "Camera name and timestamp overlay placement.",
        status: "editable",
        editable: true,
        strategy: "patch",
        fieldSpecs: [createFieldSpec("osd", "osd.osdChannel.name", "text", "Camera Name", "Front Door")],
        value: {
          osdChannel: {
            enable: true,
            name: "Front Door",
            pos: "Upper Left",
          },
          osdTime: {
            enable: true,
            pos: "Lower Right",
          },
        },
      },
      {
        id: "image",
        title: "Basic Image Tuning",
        description: "Brightness, contrast, hue, saturation, and sharpening.",
        status: "editable",
        editable: true,
        strategy: "full-object",
        fieldSpecs: [
          createFieldSpec("image", "image.bright", "number", "Brightness", 128, {
            constraints: { min: 0, max: 255, step: 1 },
          }),
        ],
        value: {
          bright: 128,
          contrast: 128,
          hue: 128,
          saturation: 128,
          sharpen: 128,
        },
      },
      {
        id: "stream",
        title: "Stream Profile",
        description: "Sub-stream controls with main stream kept inspect-only.",
        status: "editable",
        editable: true,
        strategy: "full-object",
        fieldSpecs: [
          createFieldSpec("stream", "stream.subStream.size", "select", "Sub-stream Resolution", "640x360", {
            options: [
              { value: "640x360", label: "640 x 360" },
              { value: "896x512", label: "896 x 512" },
              { value: "1280x720", label: "1280 x 720" },
            ],
          }),
          createFieldSpec("stream", "stream.subStream.frameRate", "number", "Sub-stream Frame Rate", 10, {
            constraints: { min: 1, max: 25, step: 1 },
          }),
        ],
        value: {
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
      },
      {
        id: "isp",
        title: "Camera Tuning",
        description: "Firmware-specific ISP values exposed for inspection only.",
        status: "read-only",
        editable: false,
        strategy: "read-only",
        fieldSpecs: [
          createFieldSpec("isp", "isp.dayNight", "read-only", "Day/Night Mode", "Auto", {
            editable: false,
          }),
        ],
        value: {
          dayNight: "Auto",
          backLight: "DynamicRangeControl",
          antiFlicker: "60Hz",
          exposureMode: "Auto",
          nr3d: 0,
        },
      },
    ],
  };
}

function createFieldSpec(
  sectionId: SettingsFieldSpec["sectionId"],
  fieldPath: string,
  kind: SettingsFieldSpec["kind"],
  label: string,
  defaultValue: SettingsFieldPrimitive,
  extra: Partial<SettingsFieldSpec> = {},
): SettingsFieldSpec {
  return {
    sectionId,
    fieldPath,
    kind,
    label,
    editable: extra.editable ?? kind !== "read-only",
    defaultValue,
    currentValue: defaultValue,
    constraints: extra.constraints,
    options: extra.options,
    description: extra.description,
  };
}

function createApplySuccess<TId extends EditableSettingsSectionId>(
  sectionId: TId,
  input: Omit<SettingsApplySuccess<TId>, "ok" | "sectionId" | "verified">,
): SettingsApplySuccess<TId> {
  return {
    ok: true,
    sectionId,
    verified: true,
    ...input,
  };
}

function createApplyFailure<TId extends EditableSettingsSectionId>(
  sectionId: TId,
  input: {
    message: string;
    fieldErrors: SettingsApplyFailure<TId>["fieldErrors"];
    sectionError?: string;
  },
): SettingsApplyFailure<TId> & { sectionError?: { message: string; code: string } } {
  return {
    ok: false,
    sectionId,
    verified: false,
    code: "camera-reject",
    message: input.message,
    fieldErrors: input.fieldErrors,
    ...(input.sectionError
      ? {
          sectionError: {
            message: input.sectionError,
            code: "camera-reject",
          },
        }
      : {}),
  };
}

function formatValue(value: SettingsFieldPrimitive) {
  return value == null ? "Not available" : String(value);
}
