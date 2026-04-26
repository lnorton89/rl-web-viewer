import { useLayoutEffect, useState } from "react";
import { LayoutShell } from "./components/LayoutShell.js";
import { LiveViewerFrame } from "./components/LiveViewerFrame.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { ModeSwitcher } from "./components/ModeSwitcher.js";
import { DiagnosticsDisclosure } from "./components/DiagnosticsDisclosure.js";
import { PtzPanel } from "./components/PtzPanel.js";
import { useLiveView } from "./hooks/use-live-view.js";
import { useAudioControls } from "./hooks/use-audio-controls.js";
import { Box, Typography } from "@mui/material";

const PTZ_SIDEBAR_WIDTH = 280;

export default function App() {
  const [activeSection, setActiveSection] = useState<string>("live");

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
    videoElement,
  } = useLiveView();

  const audio = useAudioControls();

  useLayoutEffect(() => {
    if (videoElement) {
      audio.applyToVideo(videoElement);
    }
  }, [videoElement, audio.applyToVideo]);

  const currentMode = modes.find((mode) => mode.id === currentModeId) ?? null;

  const renderSectionContent = () => {
    switch (activeSection) {
      case "live":
        return (
          <Box sx={{ display: "flex", gap: 2, height: "100%", flex: 1 }}>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h5" component="h1">
                Live View
              </Typography>
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
            </Box>
            <Box
              sx={{
                width: PTZ_SIDEBAR_WIDTH,
                flexShrink: 0,
                overflow: "auto",
              }}
            >
              <PtzPanel audioControls={audio} />
            </Box>
          </Box>
        );
      case "settings":
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Settings
            </Typography>
            <SettingsPanel />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <LayoutShell activeSection={activeSection} onSectionChange={setActiveSection}>
      {renderSectionContent()}
    </LayoutShell>
  );
}
