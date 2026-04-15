import { DiagnosticsDisclosure } from "./components/DiagnosticsDisclosure.js";
import { LiveViewerFrame } from "./components/LiveViewerFrame.js";
import { ModeSwitcher } from "./components/ModeSwitcher.js";
import { PtzPanel } from "./components/PtzPanel.js";
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
    selectMode,
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

        <div className="viewer-ptz-cluster">
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
          <PtzPanel />
        </div>

        <ModeSwitcher
          currentModeId={currentModeId}
          modes={modes}
          onSelectMode={selectMode}
        />

        <DiagnosticsDisclosure
          currentModeId={currentModeId}
          currentModeLabel={currentMode?.label ?? "None"}
          nextFallbackModeId={nextFallbackModeId}
          reason={state.reason}
          renderKind={renderKind}
        />
      </main>
    </div>
  );
}
