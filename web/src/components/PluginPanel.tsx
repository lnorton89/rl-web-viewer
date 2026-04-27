import { Alert, Box, Chip, LinearProgress, Paper, Stack, Typography } from "@mui/material";

import { usePlugins } from "../hooks/use-plugins.js";
import { YoutubeStreamingPanel } from "./YoutubeStreamingPanel.js";

export function PluginPanel() {
  const { error, isLoading, plugins } = usePlugins();
  const safePlugins = Array.isArray(plugins) ? plugins : [];

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Typography component="h1" variant="h5">
        Plugins & Streaming
      </Typography>

      <Paper
        aria-labelledby="plugin-status-heading"
        component="section"
        sx={{ bgcolor: "background.paper", p: 2 }}
      >
        <Stack spacing={2}>
          <Box className="section-heading">
            <p className="support-label">Plugin Runtime</p>
            <Typography component="h2" id="plugin-status-heading" variant="h6">
              Plugin Status
            </Typography>
          </Box>
          {isLoading ? <LinearProgress aria-label="Loading plugin status" /> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
            {safePlugins.length === 0 ? (
              <Chip label="No plugins reported" variant="outlined" />
            ) : (
              safePlugins.map((plugin) => (
                <Chip
                  key={plugin.id}
                  label={`${plugin.label}: ${plugin.status.state}`}
                  variant={plugin.enabled ? "filled" : "outlined"}
                />
              ))
            )}
          </Stack>
        </Stack>
      </Paper>

      <YoutubeStreamingPanel />
    </Box>
  );
}
