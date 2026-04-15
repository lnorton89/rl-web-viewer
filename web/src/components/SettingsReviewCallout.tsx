import type { SettingsDiffRow } from "../../../src/types/settings.js";

type SettingsReviewCalloutProps = {
  noCameraChangeDetected?: boolean;
  rows: SettingsDiffRow[];
  showStreamWarning?: boolean;
  variant: "review" | "verified";
};

export function SettingsReviewCallout({
  noCameraChangeDetected = false,
  rows,
  showStreamWarning = false,
  variant,
}: SettingsReviewCalloutProps) {
  return (
    <div
      className="settings-review-callout"
      data-variant={variant}
    >
      <div className="settings-review-callout-heading">
        <p className="support-label">
          {variant === "review" ? "Review Changes" : "Verified against camera"}
        </p>
        <h3>
          {variant === "review"
            ? "Review Changes"
            : noCameraChangeDetected
              ? "No camera change detected"
              : "Verified against camera"}
        </h3>
      </div>

      {showStreamWarning ? (
        <p className="settings-stream-warning">
          Applying stream changes may briefly reset live playback.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="settings-review-rows">
          {rows.map((row) => (
            <div className="settings-review-row" key={row.fieldPath}>
              <span className="settings-review-label">{row.label}</span>
              <span className="settings-review-values">
                {String(row.beforeValue)}
                {" -> "}
                {String(row.afterValue)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
