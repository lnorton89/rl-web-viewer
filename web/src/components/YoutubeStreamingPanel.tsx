import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ContentCopy, Launch, Link, PlayArrow, Stop } from "@mui/icons-material";

import type { YouTubeStreamingStatus } from "../../../src/types/youtube-streaming.js";
import { useYouTubeStreaming } from "../hooks/use-youtube-streaming.js";

const UNSAFE_TEXT_PATTERNS = [
  /access_token/i,
  /refresh_token/i,
  /client_secret/i,
  /rtsp:\/\//i,
  /rtmp:\/\//i,
  /rtmps:\/\//i,
  /streamName/,
  /password/i,
  /admin:/i,
] as const;

export function YoutubeStreamingPanel() {
  const {
    authUrl,
    beginAuth,
    error,
    isLoading,
    pendingAction,
    refresh,
    refreshAuth,
    revokeAuth,
    setup,
    start,
    status,
    stop,
  } = useYouTubeStreaming();
  const [publicConfirmed, setPublicConfirmed] = useState(false);
  const isPending = pendingAction !== null;
  const startDisabled = !canStart(status) || isPending;
  const stopDisabled = !status || status.process.state !== "running" || isPending;
  const safeWatchUrl = getSafeWatchUrl(status?.share.watchUrl ?? null);
  const requiresPublicConfirmation = status?.privacy === "public";

  async function handleStart() {
    if (requiresPublicConfirmation && !publicConfirmed) {
      return;
    }

    await start({
      confirmPublic: requiresPublicConfirmation ? publicConfirmed : false,
    });
  }

  async function copyWatchUrl() {
    if (!safeWatchUrl) {
      return;
    }

    await navigator.clipboard?.writeText(safeWatchUrl);
  }

  function openWatchUrl() {
    if (!safeWatchUrl) {
      return;
    }

    window.open(safeWatchUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Paper
      aria-labelledby="youtube-streaming-heading"
      component="section"
      sx={{ bgcolor: "background.paper", p: 2 }}
    >
      <Stack spacing={2}>
        <Box className="section-heading">
          <p className="support-label">YouTube Live</p>
          <Typography component="h2" id="youtube-streaming-heading" variant="h6">
            YouTube Streaming
          </Typography>
        </Box>

        {isLoading ? <LinearProgress aria-label="Loading YouTube streaming status" /> : null}
        {error ? <Alert severity="error">{safeText(error)}</Alert> : null}

        <StatusOverview status={status} />

        {authUrl ? (
          <Alert severity="info">
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <span>Authorization page ready</span>
              <Button
                href={authUrl}
                rel="noopener noreferrer"
                size="small"
                target="_blank"
                variant="outlined"
              >
                Open
              </Button>
            </Stack>
          </Alert>
        ) : null}

        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
          <Button
            disabled={isPending}
            onClick={() => void beginAuth()}
            type="button"
            variant="outlined"
          >
            Connect YouTube
          </Button>
          <Button
            disabled={!status?.auth.connected || isPending}
            onClick={() => void refreshAuth()}
            type="button"
            variant="outlined"
          >
            Refresh Auth
          </Button>
          <Button
            disabled={!status?.auth.connected || isPending}
            onClick={() => void revokeAuth()}
            type="button"
            variant="outlined"
          >
            Revoke Auth
          </Button>
          <Button
            disabled={!status?.auth.connected || isPending}
            onClick={() => void setup({ confirmPublic: status?.privacy === "public" })}
            type="button"
            variant="outlined"
          >
            Set Up Stream
          </Button>
          <Button
            disabled={isPending}
            onClick={() => void refresh()}
            type="button"
            variant="outlined"
          >
            Refresh Status
          </Button>
        </Stack>

        {requiresPublicConfirmation ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={publicConfirmed}
                onChange={(event) => setPublicConfirmed(event.target.checked)}
              />
            }
            label="Confirm public broadcast"
          />
        ) : null}

        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
          <Button
            disabled={startDisabled}
            onClick={() => void handleStart()}
            startIcon={<PlayArrow />}
            type="button"
            variant="contained"
          >
            Start Streaming
          </Button>
          <Button
            color="error"
            disabled={stopDisabled}
            onClick={() => void stop()}
            startIcon={<Stop />}
            type="button"
            variant="outlined"
          >
            Stop Streaming
          </Button>
        </Stack>

        <Divider />

        <ShareMetadata
          onCopy={copyWatchUrl}
          onOpen={openWatchUrl}
          status={status}
          watchUrl={safeWatchUrl}
        />
      </Stack>
    </Paper>
  );
}

function StatusOverview({ status }: { status: YouTubeStreamingStatus | null }) {
  const summary = getSummary(status);

  return (
    <Stack spacing={1}>
      <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
        <Chip label={summary} />
        {status ? <Chip label={safeText(status.privacy)} variant="outlined" /> : null}
        {status ? (
          <Chip label={safeText(status.broadcastLifecycle)} variant="outlined" />
        ) : null}
        {status ? <Chip label={safeText(status.streamHealth)} variant="outlined" /> : null}
      </Stack>

      {status ? (
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <Metric label="Auth" value={getAuthLabel(status)} />
          <Metric label="Runtime" value={getRuntimeLabel(status)} />
          <Metric label="Lifecycle" value={status.broadcastLifecycle} />
          <Metric label="Health" value={status.streamHealth} />
        </Box>
      ) : (
        <Typography color="text.secondary" variant="body2">
          YouTube streaming status is unavailable.
        </Typography>
      )}
    </Stack>
  );
}

function ShareMetadata({
  onCopy,
  onOpen,
  status,
  watchUrl,
}: {
  onCopy(): Promise<void>;
  onOpen(): void;
  status: YouTubeStreamingStatus | null;
  watchUrl: string | null;
}) {
  const title = safeText(status?.title ?? status?.share.label ?? "Untitled stream");

  return (
    <Box aria-label="Share metadata" component="section">
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Link fontSize="small" />
          <Typography component="h3" variant="subtitle1">
            Share
          </Typography>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <Metric label="Title" value={title} />
          <Metric label="Privacy" value={status?.privacy ?? "unavailable" } />
          <Metric label="Lifecycle" value={status?.broadcastLifecycle ?? "unavailable"} />
          <Metric label="Health" value={status?.streamHealth ?? "unavailable"} />
        </Box>

        {watchUrl ? (
          <Stack spacing={1}>
            <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">
              {watchUrl}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
              <Button
                onClick={() => void onCopy()}
                startIcon={<ContentCopy />}
                type="button"
                variant="outlined"
              >
                Copy Watch URL
              </Button>
              <Button
                onClick={onOpen}
                startIcon={<Launch />}
                type="button"
                variant="outlined"
              >
                Open Watch Page
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Typography color="text.secondary" variant="body2">
            Watch URL unavailable
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        bgcolor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography sx={{ overflowWrap: "anywhere" }} variant="body2">
        {safeText(value)}
      </Typography>
    </Box>
  );
}

function canStart(status: YouTubeStreamingStatus | null): boolean {
  if (!status) {
    return false;
  }

  return (
    status.auth.configured &&
    status.auth.connected &&
    status.broadcastLifecycle !== "not-created" &&
    status.process.state !== "failed" &&
    status.process.state !== "running"
  );
}

function getSummary(status: YouTubeStreamingStatus | null): string {
  if (!status) {
    return "Status unavailable";
  }

  if (!status.auth.configured) {
    return "OAuth client missing";
  }

  if (!status.auth.connected) {
    return "Disconnected";
  }

  if (status.process.state === "running") {
    return "Running";
  }

  if (status.process.state === "failed" && status.process.reason) {
    return safeText(status.process.reason);
  }

  if (status.broadcastLifecycle === "ready") {
    return "Ready";
  }

  if (status.broadcastLifecycle === "error") {
    return "Failed";
  }

  return safeText(status.auth.message);
}

function getAuthLabel(status: YouTubeStreamingStatus): string {
  if (!status.auth.configured) {
    return "OAuth client missing";
  }

  if (!status.auth.connected) {
    return "Disconnected";
  }

  return "Connected";
}

function getRuntimeLabel(status: YouTubeStreamingStatus): string {
  return status.process.reason ?? status.process.state;
}

function safeText(value: string): string {
  return UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(value))
    ? "[redacted]"
    : value;
}

function getSafeWatchUrl(value: string | null): string | null {
  if (!value || UNSAFE_TEXT_PATTERNS.some((pattern) => pattern.test(value))) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol === "https:" &&
      (url.hostname === "www.youtube.com" || url.hostname === "youtube.com")
    ) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}
