import type { LiveViewPlayback, LiveModeId } from "../../../src/types/live-view.js";

import { Box } from "@mui/material";
import { ViewerStatusOverlay } from "./ViewerStatusOverlay.js";

type ViewerState = {
  kind: "connecting" | "live" | "reconnecting" | "failed";
  reason?: string;
};

type LiveViewerFrameProps = {
  activePlayback: LiveViewPlayback | null;
  bindImageElement(node: HTMLImageElement | null): void;
  bindVideoElement(node: HTMLVideoElement | null): void;
  currentModeLabel: string;
  nextFallbackModeId: LiveModeId | null;
  onRetry(): Promise<void>;
  renderKind: "video" | "image";
  state: ViewerState;
};

export function LiveViewerFrame({
  activePlayback,
  bindImageElement,
  bindVideoElement,
  currentModeLabel,
  nextFallbackModeId,
  onRetry,
  renderKind,
  state,
}: LiveViewerFrameProps) {
  return (
    <Box
      component="section"
      sx={{
        width: '100%',
        maxWidth: '100%',
        bgcolor: 'background.paper',
        borderRadius: 1,
        overflow: 'hidden',
        position: 'relative',
      }}
      aria-label="Live viewer"
    >
      <video
        ref={renderKind === "video" ? bindVideoElement : undefined}
        className="viewer-surface"
        autoPlay
        muted
        playsInline
        hidden={renderKind !== "video"}
      />

      <img
        ref={renderKind === "image" ? bindImageElement : undefined}
        className="viewer-surface"
        alt={
          activePlayback?.snapshotUrl === null
            ? "No live snapshot available"
            : "Live snapshot"
        }
        hidden={renderKind !== "image"}
      />

      <ViewerStatusOverlay
        currentModeLabel={currentModeLabel}
        nextFallbackModeId={nextFallbackModeId}
        onRetry={onRetry}
        reason={state.reason}
        stateKind={state.kind}
      />
    </Box>
  );
}
