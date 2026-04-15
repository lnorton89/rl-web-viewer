import { useEffect, useRef } from "react";

import type { SettingsFieldPrimitive, SettingsFieldSpec } from "../../../src/types/settings.js";
import type { SettingsFieldView, UseSettingsSection } from "../hooks/use-settings.js";
import { SettingsReviewCallout } from "./SettingsReviewCallout.js";

type SettingsSectionCardProps = {
  section: UseSettingsSection;
};

export function SettingsSectionCard({ section }: SettingsSectionCardProps) {
  const sectionHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const statusRegionRef = useRef<HTMLDivElement | null>(null);
  const previousModeRef = useRef(section.mode);
  const titleId = `settings-section-heading-${section.id}`;

  useEffect(() => {
    if (
      previousModeRef.current === "applying" &&
      (section.mode === "verified" || section.mode === "error")
    ) {
      // Focus the status region after apply so the result is announced immediately.
      const focusTarget = statusRegionRef.current ?? sectionHeadingRef.current;
      focusTarget?.focus();
    }

    previousModeRef.current = section.mode;
  }, [section.mode]);

  return (
    <section
      aria-labelledby={titleId}
      className="settings-section-card"
      data-mode={section.mode}
      data-testid={`settings-section-${section.id}`}
    >
      <div className="section-heading">
        <p className="support-label">
          {section.editable ? "Safe Settings" : "Inspect Only"}
        </p>
        <h2 id={titleId} ref={sectionHeadingRef} tabIndex={-1}>
          {section.title}
        </h2>
      </div>

      <div className="settings-section-meta">
        <p className="diagnostics-copy">{section.description}</p>
        <span className="settings-section-badge">{section.badgeLabel}</span>
      </div>

      <div
        className="settings-section-status-region"
        ref={statusRegionRef}
        tabIndex={-1}
        {...section.statusProps}
      >
        {section.mode === "review" ? (
          <SettingsReviewCallout
            rows={section.reviewRows}
            showStreamWarning={section.id === "stream"}
            variant="review"
          />
        ) : null}

        {section.mode === "verified" && section.verifiedSummary ? (
          <SettingsReviewCallout
            noCameraChangeDetected={section.verifiedSummary.noCameraChangeDetected}
            rows={section.verifiedSummary.rows}
            variant="verified"
          />
        ) : null}

        {section.mode === "error" && section.sectionError ? (
          <div className="settings-section-error-panel">
            <p>{section.sectionError}</p>
          </div>
        ) : null}
      </div>

      <div className="settings-fields">
        {section.fieldViews.map((field) =>
          shouldRenderEditableControl(section, field.fieldSpec) ? (
            <EditableField
              field={field}
              key={field.fieldSpec.fieldPath}
              onChange={(value) => {
                section.updateDraft(field.fieldSpec.fieldPath, value);
              }}
              readOnly={section.mode === "review" || section.mode === "applying"}
            />
          ) : (
            <ReadOnlyField field={field} key={field.fieldSpec.fieldPath} />
          ),
        )}
      </div>

      <div className="settings-section-actions">
        {section.editable ? (
          <>
            {section.mode === "read" || section.mode === "verified" ? (
              <button
                className="settings-action-button settings-action-button-accent"
                type="button"
                onClick={() => {
                  void section.startEditing();
                }}
              >
                {section.mode === "verified" ? "Edit Again" : "Edit"}
              </button>
            ) : null}

            {section.mode === "editing" || section.mode === "error" ? (
              <>
                <button
                  className="settings-action-button"
                  type="button"
                  onClick={() => {
                    section.cancelEditing();
                  }}
                >
                  Cancel
                </button>
                <button
                  className="settings-action-button settings-action-button-accent"
                  disabled={!section.canReview}
                  type="button"
                  onClick={() => {
                    section.enterReview();
                  }}
                >
                  {section.mode === "error" ? "Fix and Review Again" : "Review Changes"}
                </button>
              </>
            ) : null}

            {section.mode === "review" ? (
              <>
                <button
                  className="settings-action-button"
                  type="button"
                  onClick={() => {
                    section.returnToEditing();
                  }}
                >
                  Back to Editing
                </button>
                <button
                  className="settings-action-button settings-action-button-accent"
                  type="button"
                  onClick={() => {
                    void section.apply();
                  }}
                >
                  Apply Settings
                </button>
              </>
            ) : null}
          </>
        ) : (
          <span className="settings-read-only-copy">Read only</span>
        )}
      </div>
    </section>
  );
}

function EditableField({
  field,
  onChange,
  readOnly,
}: {
  field: SettingsFieldView;
  onChange(value: SettingsFieldPrimitive): void;
  readOnly: boolean;
}) {
  const helperText = getFieldHelperText(field.fieldSpec);
  const fieldId = `settings-field-${field.fieldSpec.fieldPath.replace(/\./g, "-")}`;
  const errorId = `${fieldId}-error`;

  return (
    <label className="settings-field-control" htmlFor={fieldId}>
      <span className="settings-field-label">{field.fieldSpec.label}</span>
      {field.fieldSpec.kind === "toggle" ? (
        <div className="settings-toggle-row">
          <input
            aria-label={field.fieldSpec.label}
            checked={Boolean(field.value)}
            disabled={readOnly}
            id={fieldId}
            type="checkbox"
            onChange={(event) => {
              onChange(event.currentTarget.checked);
            }}
          />
          <span>{Boolean(field.value) ? "Enabled" : "Disabled"}</span>
        </div>
      ) : field.fieldSpec.kind === "select" ? (
        <select
          aria-describedby={field.error ? errorId : undefined}
          aria-label={field.fieldSpec.label}
          className="settings-input"
          disabled={readOnly}
          id={fieldId}
          value={String(field.value)}
          onChange={(event) => {
            const nextValue =
              field.fieldSpec.options?.find(
                (option) => String(option.value) === event.currentTarget.value,
              )?.value ?? event.currentTarget.value;
            onChange(nextValue);
          }}
        >
          {field.fieldSpec.options?.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.fieldSpec.kind === "number" && field.fieldSpec.sectionId === "image" ? (
        <div className="settings-slider-row">
          <input
            aria-describedby={field.error ? errorId : undefined}
            aria-label={field.fieldSpec.label}
            className="settings-slider"
            disabled={readOnly}
            id={fieldId}
            max={field.fieldSpec.constraints?.max}
            min={field.fieldSpec.constraints?.min}
            step={field.fieldSpec.constraints?.step}
            type="range"
            value={String(field.value)}
            onChange={(event) => {
              onChange(Number(event.currentTarget.value));
            }}
          />
          <span className="settings-slider-value">{String(field.value)}</span>
        </div>
      ) : field.fieldSpec.kind === "number" ? (
        <input
          aria-describedby={field.error ? errorId : undefined}
          aria-label={field.fieldSpec.label}
          className="settings-input"
          disabled={readOnly}
          id={fieldId}
          max={field.fieldSpec.constraints?.max}
          min={field.fieldSpec.constraints?.min}
          step={field.fieldSpec.constraints?.step}
          type="number"
          value={String(field.value)}
          onChange={(event) => {
            onChange(Number(event.currentTarget.value));
          }}
        />
      ) : (
        <input
          aria-describedby={field.error ? errorId : undefined}
          aria-label={field.fieldSpec.label}
          className="settings-input"
          disabled={readOnly}
          id={fieldId}
          maxLength={field.fieldSpec.constraints?.maxLength}
          minLength={field.fieldSpec.constraints?.minLength}
          type="text"
          value={String(field.value)}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
        />
      )}

      {helperText ? <span className="settings-field-helper">{helperText}</span> : null}
      {field.error ? (
        <span className="settings-field-error" id={errorId}>
          {field.error}
        </span>
      ) : null}
    </label>
  );
}

function ReadOnlyField({ field }: { field: SettingsFieldView }) {
  return (
    <div className="settings-read-only-row">
      <dt>{field.fieldSpec.label}</dt>
      <dd>{formatValue(field.currentValue)}</dd>
    </div>
  );
}

function shouldRenderEditableControl(
  section: UseSettingsSection,
  fieldSpec: SettingsFieldSpec,
): boolean {
  return (
    section.editable &&
    fieldSpec.editable &&
    (section.mode === "editing" ||
      section.mode === "error" ||
      section.mode === "review" ||
      section.mode === "applying")
  );
}

function getFieldHelperText(fieldSpec: SettingsFieldSpec): string | null {
  if (fieldSpec.description) {
    return fieldSpec.description;
  }

  if (fieldSpec.kind === "number" && fieldSpec.constraints) {
    const parts = [
      fieldSpec.constraints.min != null ? `Min ${fieldSpec.constraints.min}` : null,
      fieldSpec.constraints.max != null ? `Max ${fieldSpec.constraints.max}` : null,
      fieldSpec.constraints.step != null ? `Step ${fieldSpec.constraints.step}` : null,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" · ") : null;
  }

  if (fieldSpec.kind === "select" && fieldSpec.options?.length) {
    return `Options: ${fieldSpec.options.map((option) => option.label).join(", ")}`;
  }

  return null;
}

function formatValue(value: SettingsFieldPrimitive): string {
  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  return value == null ? "Not available" : String(value);
}
