import { Paper } from "@mui/material";
import { useSettings } from "../hooks/use-settings.js";
import { SettingsSectionCard } from "./SettingsSectionCard.js";

const SECTION_ORDER = ["time", "osd", "image", "stream", "isp", "network"] as const;

export function SettingsPanel() {
  const { isLoading, loadError, sections } = useSettings();
  const orderedSections = [...sections].sort(
    (left, right) =>
      SECTION_ORDER.indexOf(left.id) - SECTION_ORDER.indexOf(right.id),
  );

  return (
    <Paper
      component="section"
      sx={{ p: 2, bgcolor: 'background.paper' }}
      aria-labelledby="settings-panel-heading"
    >
      <div className="section-heading">
        <p className="support-label">Safe Configuration</p>
        <h2 id="settings-panel-heading">Inspect and apply trusted camera settings</h2>
      </div>

      <p className="diagnostics-copy">
        Each section stages its own draft, shows an inline review, and verifies
        the result against the camera before the dashboard treats the change as
        confirmed.
      </p>

      {isLoading ? (
        <div className="settings-panel-empty">
          <p>Loading settings...</p>
        </div>
      ) : loadError ? (
        <div className="settings-panel-empty">
          <h3>No settings available</h3>
          <p>
            This camera profile did not expose a safe settings section here.
            Refresh the dashboard after capability detection completes.
          </p>
          <p>{loadError}</p>
        </div>
      ) : orderedSections.length === 0 ? (
        <div className="settings-panel-empty">
          <h3>No settings available</h3>
          <p>
            This camera profile did not expose a safe settings section here.
            Refresh the dashboard after capability detection completes.
          </p>
        </div>
      ) : (
        <div className="settings-panel-sections">
          {orderedSections.map((section) => (
            <SettingsSectionCard key={section.id} section={section} />
          ))}
        </div>
      )}
    </Paper>
  );
}
