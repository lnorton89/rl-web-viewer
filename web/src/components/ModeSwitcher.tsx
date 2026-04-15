import type { LiveMode, LiveModeId } from "../../../src/types/live-view.js";

type ModeSwitcherProps = {
  currentModeId: LiveModeId | null;
  modes: LiveMode[];
  onSelectMode(modeId: LiveModeId): Promise<void>;
};

export function ModeSwitcher({
  currentModeId,
  modes,
  onSelectMode,
}: ModeSwitcherProps) {
  return (
    <section className="mode-switcher" aria-labelledby="mode-switcher-heading">
      <div className="section-heading">
        <p className="support-label">Mode Selection</p>
        <h2 id="mode-switcher-heading">Switch transport and quality directly</h2>
      </div>

      <div className="mode-switcher-row" role="group" aria-label="Live view modes">
        {modes.map((mode) => {
          const isActive = mode.id === currentModeId;

          return (
            <button
              key={mode.id}
              aria-pressed={isActive}
              className="mode-button"
              data-active={isActive}
              disabled={!mode.enabled}
              title={mode.disabledReason}
              type="button"
              onClick={() => void onSelectMode(mode.id)}
            >
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
