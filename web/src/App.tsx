import { LiveViewerFrame } from "./components/LiveViewerFrame.js";
import { useLiveView } from "./hooks/use-live-view.js";

export default function App() {
  const {
    activePlayback,
    bindImageElement,
    bindVideoElement,
    currentModeId,
    modes,
    nextFallbackModeId,
    renderKind,
    retry,
    state,
  } = useLiveView();

  const currentMode = modes.find((mode) => mode.id === currentModeId) ?? null;

  return (
    <div className="app-shell">
      <main className="viewer-dashboard">
        <header className="viewer-hero">
          <p className="viewer-kicker">Local Browser Live View</p>
          <h1>Reolink RLC-423S</h1>
          <p className="viewer-summary">
            The viewer starts on the strongest supported transport, keeps retry
            state in-frame, and leaves transport details secondary.
          </p>
        </header>

        <LiveViewerFrame
          activePlayback={activePlayback}
          bindImageElement={bindImageElement}
          bindVideoElement={bindVideoElement}
          currentModeLabel={currentMode?.label ?? "Awaiting Mode"}
          nextFallbackModeId={nextFallbackModeId}
          onRetry={retry}
          renderKind={renderKind}
          state={state}
        />

        <section className="viewer-support" aria-label="Live view status">
          <div>
            <p className="support-label">Current mode</p>
            <p className="support-value">{currentMode?.label ?? "None"}</p>
          </div>
          <div>
            <p className="support-label">Next fallback</p>
            <p className="support-value">
              {nextFallbackModeId ?? "No fallback queued"}
            </p>
          </div>
          <div>
            <p className="support-label">Surface</p>
            <p className="support-value">
              {renderKind === "video" ? "Video transport" : "Snapshot image"}
            </p>
          </div>
        </section>

        <section className="diagnostics-preview" aria-labelledby="diag-heading">
          <div>
            <p className="support-label">Diagnostics</p>
            <h2 id="diag-heading">Transport details stay secondary</h2>
          </div>
          <p className="diagnostics-copy">
            Current mode, short failure reasons, and the planned fallback stay
            available below the viewer without exposing camera credentials or
            raw source URLs.
          </p>
        </section>
      </main>
    </div>
  );
}
