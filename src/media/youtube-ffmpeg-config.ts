export type YouTubeFfmpegArgsInput = {
  inputRtspUrl: string;
  ingestionUrl: string;
  streamName: string;
};

const SECRET_ARG_MARKER = "[REDACTED_SECRET_ARG]";

export function buildYouTubeFfmpegArgs(input: YouTubeFfmpegArgsInput): string[] {
  const outputUrl = joinIngestionUrl(input.ingestionUrl, input.streamName);

  return [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-rtsp_transport",
    "tcp",
    "-i",
    input.inputRtspUrl,
    "-c:v",
    "copy",
    "-an",
    "-f",
    "flv",
    outputUrl,
  ];
}

export function redactYouTubeEgressArgs(args: readonly string[]): string[] {
  return args.map((arg) => redactSecretBearingString(arg));
}

export function redactSecretBearingString(value: string): string {
  if (/^rtsp:\/\//i.test(value)) {
    return "[REDACTED_RTSP_URL]";
  }

  if (/^rtmps?:\/\//i.test(value)) {
    return "[REDACTED_RTMP_URL]";
  }

  return value
    .replace(/rtsp:\/\/\S+/gi, "[REDACTED_RTSP_URL]")
    .replace(/rtmps?:\/\/\S+/gi, "[REDACTED_RTMP_URL]")
    .replace(/streamName=[^&\s]+/gi, "streamName=[REDACTED]")
    .replace(/(access_token|refresh_token|client_secret|password)=([^&\s]+)/gi, "$1=[REDACTED]")
    .replace(/\b[A-Za-z0-9_-]{18,}\b/g, SECRET_ARG_MARKER);
}

function joinIngestionUrl(ingestionUrl: string, streamName: string): string {
  return `${ingestionUrl.replace(/\/+$/, "")}/${streamName}`;
}
