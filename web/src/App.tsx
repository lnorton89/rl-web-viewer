import { useState } from "react";
import { LayoutShell } from "./components/LayoutShell.js";
import { LiveViewerFrame } from "./components/LiveViewerFrame.js";
import { PtzPanel } from "./components/PtzPanel.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { ModeSwitcher } from "./components/ModeSwitcher.js";
import { DiagnosticsDisclosure } from "./components/DiagnosticsDisclosure.js";
import { useLiveView } from "./hooks/use-live-view.js";
import { Box, Typography } from "@mui/material";

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
  } = useLiveView();

  const currentMode = modes.find((mode) => mode.id === currentModeId) ?? null;

  const renderSectionContent = () => {
    switch (activeSection) {
      case "live":
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
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
          </Box>
        );
      case "ptz":
        return (
          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              PTZ Control
            </Typography>
            <PtzPanel />
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
      <DiagnosticsDisclosure
        currentModeId={currentModeId}
        currentModeLabel={currentMode?.label ?? "None"}
        nextFallbackModeId={nextFallbackModeId}
        reason={state.reason}
        renderKind={renderKind}
      />
    </LayoutShell>
  );
}