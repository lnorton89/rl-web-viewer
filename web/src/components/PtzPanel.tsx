import { Box, IconButton, Paper, Slider, Tooltip, Typography } from "@mui/material";
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  ZoomIn,
  ZoomOut,
  Stop,
  Remove,
  Add,
  Videocam,
  Tune,
  Speed,
} from "@mui/icons-material";
import { PtzPresetGrid } from "./PtzPresetGrid.js";
import { AudioPanel } from "./AudioPanel.js";
import { usePtzControls } from "../hooks/use-ptz-controls.js";

export function PtzPanel() {
  const {
    activeDirection,
    busyAction,
    errorText,
    focusValue,
    getMotionButtonProps,
    hasVisibleStop,
    irisValue,
    presets,
    pulseZoom,
    recallPreset,
    setFocus,
    setIris,
    setSpeed,
    speedValue,
    statusText,
    stopMotion,
    supportsPtzControl,
    supportsPtzPreset,
  } = usePtzControls();

  const isBootstrapping = busyAction?.kind === "bootstrapping";
  const isBusy =
    busyAction?.kind !== null && busyAction?.kind !== "bootstrapping";
  const motionDisabled = !supportsPtzControl || isBusy;

  return (
    <Paper
      component="section"
      sx={{
        p: 1.5,
        bgcolor: "background.paper",
        height: "100%",
        overflow: "auto",
      }}
      aria-labelledby="ptz-panel-heading"
      data-testid="ptz-panel"
    >
      <Box sx={{ mb: 1.5 }}>
        <Typography
          variant="overline"
          sx={{ color: "text.secondary", display: "block" }}
        >
          Camera Control
        </Typography>
        <Typography variant="h6" id="ptz-panel-heading">
          PTZ Control
        </Typography>
      </Box>

      {isBootstrapping ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          Loading...
        </Typography>
      ) : !supportsPtzControl ? (
        <Typography color="text.secondary">
          PTZ is not available for this camera profile.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography
            variant="body2"
            color={errorText ? "error" : "text.secondary"}
            role="status"
            sx={{ minHeight: 20 }}
          >
            {errorText || statusText}
          </Typography>

          <Box>
            <Tooltip title="Movement speed (1-10)">
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Speed fontSize="small" sx={{ color: "text.secondary" }} />
                <Slider
                  value={speedValue}
                  min={1}
                  max={10}
                  step={1}
                  size="small"
                  onChange={(_, value) => void setSpeed(value as number)}
                  disabled={motionDisabled}
                  sx={{ flex: 1 }}
                />
                <Typography variant="caption" sx={{ minWidth: 20 }}>
                  {speedValue}
                </Typography>
              </Box>
            </Tooltip>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0.5,
              maxWidth: 180,
              mx: "auto",
            }}
          >
            <Box />
            <Tooltip title="Pan up">
              <span>
                <IconButton
                  {...getMotionButtonProps("up")}
                  sx={{
                    aspectRatio: "1",
                    bgcolor: "action.hover",
                    "&[data-active='true']": {
                      bgcolor: "primary.dark",
                      color: "primary.contrastText",
                    },
                  }}
                >
                  <KeyboardArrowUp />
                </IconButton>
              </span>
            </Tooltip>
            <Box />

            <Tooltip title="Pan left">
              <span>
                <IconButton
                  {...getMotionButtonProps("left")}
                  sx={{
                    aspectRatio: "1",
                    bgcolor: "action.hover",
                    "&[data-active='true']": {
                      bgcolor: "primary.dark",
                      color: "primary.contrastText",
                    },
                  }}
                >
                  <KeyboardArrowLeft />
                </IconButton>
              </span>
            </Tooltip>

            {hasVisibleStop ? (
              <Tooltip title="Stop camera">
                <span>
                  <IconButton
                    onClick={() => void stopMotion()}
                    disabled={busyAction?.kind === "stopping"}
                    sx={{
                      aspectRatio: "1",
                      bgcolor: "error.dark",
                      color: "error.contrastText",
                      "&:hover": { bgcolor: "error.main" },
                    }}
                  >
                    <Stop />
                  </IconButton>
                </span>
              </Tooltip>
            ) : (
              <Box />
            )}

            <Tooltip title="Pan right">
              <span>
                <IconButton
                  {...getMotionButtonProps("right")}
                  sx={{
                    aspectRatio: "1",
                    bgcolor: "action.hover",
                    "&[data-active='true']": {
                      bgcolor: "primary.dark",
                      color: "primary.contrastText",
                    },
                  }}
                >
                  <KeyboardArrowRight />
                </IconButton>
              </span>
            </Tooltip>

            <Box />
            <Tooltip title="Pan down">
              <span>
                <IconButton
                  {...getMotionButtonProps("down")}
                  sx={{
                    aspectRatio: "1",
                    bgcolor: "action.hover",
                    "&[data-active='true']": {
                      bgcolor: "primary.dark",
                      color: "primary.contrastText",
                    },
                  }}
                >
                  <KeyboardArrowDown />
                </IconButton>
              </span>
            </Tooltip>
            <Box />
          </Box>

          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Zoom in">
              <span>
                <IconButton
                  onClick={() => void pulseZoom("in")}
                  disabled={isBusy}
                  size="small"
                >
                  <ZoomIn />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Zoom out">
              <span>
                <IconButton
                  onClick={() => void pulseZoom("out")}
                  disabled={isBusy}
                  size="small"
                >
                  <ZoomOut />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <Tune fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                Focus
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title="Focus near">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void setFocus(Math.max(0, focusValue - 10))}
                    disabled={motionDisabled}
                  >
                    <Remove />
                  </IconButton>
                </span>
              </Tooltip>
              <Slider
                value={focusValue}
                min={0}
                max={100}
                size="small"
                onChange={(_, value) => void setFocus(value as number)}
                disabled={motionDisabled}
                sx={{ flex: 1 }}
              />
              <Tooltip title="Focus far">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void setFocus(Math.min(100, focusValue + 10))}
                    disabled={motionDisabled}
                  >
                    <Add />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <Videocam fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                Iris
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title="Close iris">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void setIris(Math.max(0, irisValue - 10))}
                    disabled={motionDisabled}
                  >
                    <Remove />
                  </IconButton>
                </span>
              </Tooltip>
              <Slider
                value={irisValue}
                min={0}
                max={100}
                size="small"
                onChange={(_, value) => void setIris(value as number)}
                disabled={motionDisabled}
                sx={{ flex: 1 }}
              />
              <Tooltip title="Open iris">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => void setIris(Math.min(100, irisValue + 10))}
                    disabled={motionDisabled}
                  >
                    <Add />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          {supportsPtzPreset ? (
            <PtzPresetGrid
              busyAction={busyAction}
              presets={presets}
              onRecallPreset={recallPreset}
            />
          ) : null}

          <AudioPanel />
        </Box>
      )}
    </Paper>
  );
}
