import type { LiveModeId, ViewerStateKind } from "../../../src/types/live-view.js";
import { Tooltip } from "@mui/material";

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
          <Tooltip title={`Status: ${label}`} placement="left">
            <span className="status-dot" data-kind={stateKind} aria-hidden="true" />
          </Tooltip>
          <span className="status-label">{label}</span>
        </div>

        <Tooltip title="Current streaming mode" placement="left">
          <p className="overlay-mode">{currentModeLabel}</p>
        </Tooltip>

        {shortReason === null ? null : (
          <Tooltip title={reason || shortReason} placement="left">
            <p className="overlay-reason">{shortReason}</p>
          </Tooltip>
        )}

        {nextFallbackModeId === null ? null : (
          <Tooltip title="If current mode fails, will automatically switch to this mode" placement="left">
            <p className="overlay-fallback">Next fallback: {nextFallbackModeId}</p>
          </Tooltip>
        )}

        {stateKind === "failed" ? (
          <div className="overlay-actions">
            <Tooltip title="Attempt to reconnect using the same mode" placement="top">
              <button className="retry-button" type="button" onClick={() => void onRetry()}>
                Retry Live View
              </button>
            </Tooltip>
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
