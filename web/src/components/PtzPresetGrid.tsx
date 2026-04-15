import type { PtzPreset } from "../../../src/types/ptz.js";
import type { PtzBusyAction } from "../hooks/use-ptz-controls.js";

type PtzPresetGridProps = {
  busyAction: PtzBusyAction;
  presets: PtzPreset[];
  onRecallPreset(presetId: number): Promise<void>;
};

export function PtzPresetGrid({
  busyAction,
  presets,
  onRecallPreset,
}: PtzPresetGridProps) {
  if (presets.length === 0) {
    return (
      <section className="ptz-presets" aria-labelledby="ptz-presets-heading">
        <div className="section-heading">
          <p className="support-label">Presets</p>
          <h3 id="ptz-presets-heading">No saved presets</h3>
        </div>
        <p className="ptz-group-copy">
          Save a preset in the camera first, then refresh this panel to recall
          it here.
        </p>
      </section>
    );
  }

  const controlsDisabled =
    busyAction?.kind === "moving" ||
    busyAction?.kind === "stopping" ||
    busyAction?.kind === "zoom" ||
    busyAction?.kind === "preset";

  return (
    <section className="ptz-presets" aria-labelledby="ptz-presets-heading">
      <div className="section-heading">
        <p className="support-label">Presets</p>
        <h3 id="ptz-presets-heading">Presets</h3>
      </div>
      <p className="ptz-group-copy">Recall saved camera positions.</p>
      <div className="ptz-preset-grid" role="group" aria-label="Saved PTZ presets">
        {presets.map((preset) => {
          const isActive =
            busyAction?.kind === "preset" && busyAction.presetId === preset.id;

          return (
            <button
              key={preset.id}
              className="ptz-preset-button"
              data-active={isActive}
              disabled={controlsDisabled}
              type="button"
              onClick={() => {
                void onRecallPreset(preset.id);
              }}
            >
              {preset.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
