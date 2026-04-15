import type { LiveModeId, ViewerStateKind } from "../../../src/types/live-view.js";

const OVERLAY_LABELS: Record<ViewerStateKind, string> = {
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
  failed: "Live View Failed",
};

type ViewerStatusOverlayProps = {
  currentModeLabel: string;
  nextFallbackModeId: LiveModeId | null;
  onRetry(): Promise<void>;
  reason?: string;
  stateKind: ViewerStateKind;
};

export function ViewerStatusOverlay({
  currentModeLabel,
  nextFallbackModeId,
  onRetry,
  reason,
  stateKind,
}: ViewerStatusOverlayProps) {
  const label = OVERLAY_LABELS[stateKind];
  const shortReason = getShortReason(reason);
  const liveRegionMessage = [
    label,
    currentModeLabel,
    shortReason,
    nextFallbackModeId === null ? null : `Next fallback ${nextFallbackModeId}`,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div className="viewer-overlay" data-state={stateKind}>
      <div className="overlay-panel" data-live={stateKind === "live"}>
        <div className="overlay-badge-row">
          <span className="status-dot" data-kind={stateKind} aria-hidden="true" />
          <span className="status-label">{label}</span>
        </div>

        <p className="overlay-mode">{currentModeLabel}</p>

        {shortReason === null ? null : (
          <p className="overlay-reason">{shortReason}</p>
        )}

        {nextFallbackModeId === null ? null : (
          <p className="overlay-fallback">Next fallback: {nextFallbackModeId}</p>
        )}

        {stateKind === "failed" ? (
          <div className="overlay-actions">
            <button className="retry-button" type="button" onClick={() => void onRetry()}>
              Retry Live View
            </button>
          </div>
        ) : null}

        <div className="sr-only" role="status" aria-live="polite">
          {liveRegionMessage}
        </div>
      </div>
    </div>
  );
}

function getShortReason(reason?: string): string | null {
  if (typeof reason !== "string") {
    return null;
  }

  const trimmedReason = reason.trim();

  if (trimmedReason === "") {
    return null;
  }

  if (trimmedReason.length <= 90) {
    return trimmedReason;
  }

  return `${trimmedReason.slice(0, 87).trimEnd()}...`;
}
