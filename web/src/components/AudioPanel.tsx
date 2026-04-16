import { Box, Divider, IconButton, Slider, Tooltip, Typography } from "@mui/material";
import { VolumeUp, VolumeOff } from "@mui/icons-material";
import { useAudioControls } from "../hooks/use-audio-controls.js";

export function AudioPanel() {
  const { hasAudio, isMuted, setMuted, setVolume, volume } = useAudioControls();

  if (!hasAudio) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="h6" color="secondary.main" sx={{ mb: 1 }}>
        Audio
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Tooltip title={isMuted ? "Unmute audio" : "Mute audio"}>
          <IconButton
            onClick={() => void setMuted(!isMuted)}
            color={isMuted ? "default" : "primary"}
            size="small"
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
        </Tooltip>
        <Slider
          value={volume}
          min={0}
          max={100}
          step={5}
          size="small"
          onChange={(_, value) => void setVolume(value as number)}
          disabled={isMuted}
          aria-label="Audio volume"
          sx={{ flex: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
          {volume}%
        </Typography>
      </Box>
    </Box>
  );
}
