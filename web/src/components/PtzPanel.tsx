import { PtzPresetGrid } from "./PtzPresetGrid.js";
import { usePtzControls } from "../hooks/use-ptz-controls.js";

export function PtzPanel() {
  const {
    activeDirection,
    busyAction,
    errorText,
    getMotionButtonProps,
    hasVisibleStop,
    presets,
    pulseZoom,
    recallPreset,
    statusText,
    stopMotion,
    supportsPtzControl,
    supportsPtzPreset,
  } = usePtzControls();

  const isBootstrapping = busyAction?.kind === "bootstrapping";
  const zoomDisabled =
    !supportsPtzControl ||
    activeDirection !== null ||
    busyAction?.kind === "zoom" ||
    busyAction?.kind === "preset" ||
    busyAction?.kind === "stopping";

  return (
    <section className="ptz-panel" aria-labelledby="ptz-panel-heading">
      <div className="section-heading">
        <p className="support-label">Camera Control</p>
        <h2 id="ptz-panel-heading">PTZ Control</h2>
      </div>

      {isBootstrapping ? (
        <p className="ptz-panel-unsupported">Loading PTZ controls...</p>
      ) : !supportsPtzControl ? (
        <p className="ptz-panel-unsupported">
          PTZ is not available for this camera profile.
        </p>
      ) : (
        <div className="ptz-control-groups">
          <p
            className="ptz-status-copy"
            data-error={errorText ? "true" : "false"}
            role="status"
            aria-live="polite"
          >
            {statusText}
          </p>

          {errorText && errorText !== statusText ? (
            <p className="ptz-status-meta">{errorText}</p>
          ) : null}

          <section className="ptz-motion-group" aria-labelledby="ptz-motion-heading">
            <div className="section-heading">
              <p className="support-label">Pan / Tilt</p>
              <h3 id="ptz-motion-heading">Hold to move. Release to stop.</h3>
            </div>

            <div className="ptz-motion-layout">
              <div className="ptz-direction-pad" role="group" aria-label="Pan and tilt">
                <span className="ptz-control-spacer" aria-hidden="true" />
                <button
                  className="ptz-control-button"
                  data-active={activeDirection === "up"}
                  type="button"
                  {...getMotionButtonProps("up")}
                >
                  Up
                </button>
                <span className="ptz-control-spacer" aria-hidden="true" />

                <button
                  className="ptz-control-button"
                  data-active={activeDirection === "left"}
                  type="button"
                  {...getMotionButtonProps("left")}
                >
                  Left
                </button>

                {hasVisibleStop ? (
                  <button
                    className="ptz-control-button ptz-stop-button"
                    disabled={busyAction?.kind === "stopping"}
                    type="button"
                    onClick={() => {
                      void stopMotion();
                    }}
                  >
                    Stop Camera
                  </button>
                ) : (
                  <span className="ptz-control-spacer" aria-hidden="true" />
                )}

                <button
                  className="ptz-control-button"
                  data-active={activeDirection === "right"}
                  type="button"
                  {...getMotionButtonProps("right")}
                >
                  Right
                </button>

                <span className="ptz-control-spacer" aria-hidden="true" />
                <button
                  className="ptz-control-button"
                  data-active={activeDirection === "down"}
                  type="button"
                  {...getMotionButtonProps("down")}
                >
                  Down
                </button>
                <span className="ptz-control-spacer" aria-hidden="true" />
              </div>

              <div className="ptz-zoom-group">
                <div className="section-heading">
                  <p className="support-label">Zoom</p>
                  <h3>Tap for a short zoom step.</h3>
                </div>

                <button
                  className="ptz-control-button ptz-zoom-button"
                  disabled={zoomDisabled}
                  type="button"
                  onClick={() => {
                    void pulseZoom("in");
                  }}
                >
                  Zoom In
                </button>
                <button
                  className="ptz-control-button ptz-zoom-button"
                  disabled={zoomDisabled}
                  type="button"
                  onClick={() => {
                    void pulseZoom("out");
                  }}
                >
                  Zoom Out
                </button>
              </div>
            </div>
          </section>

          {supportsPtzPreset ? (
            <PtzPresetGrid
              busyAction={busyAction}
              presets={presets}
              onRecallPreset={recallPreset}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
