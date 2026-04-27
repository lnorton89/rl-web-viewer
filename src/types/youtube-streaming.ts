export type YouTubeAuthState =
  | "missing-client"
  | "disconnected"
  | "pending"
  | "connected";

export type YouTubePrivacyStatus = "private" | "unlisted" | "public";

export type YouTubeBroadcastLifecycle =
  | "not-created"
  | "created"
  | "ready"
  | "testing"
  | "live"
  | "complete"
  | "error";

export type YouTubeStreamHealth =
  | "unknown"
  | "inactive"
  | "ready"
  | "active"
  | "error";

export type YouTubeAuthStatus = {
  configured: boolean;
  connected: boolean;
  state: YouTubeAuthState;
  message: string;
  hasRefreshToken: boolean;
  authorizedScopes: readonly string[];
  expiresAt: string | null;
  updatedAt: string;
  pendingState?: string;
};

export type YouTubeShareMetadata = {
  available: boolean;
  watchUrl: string | null;
  label: string | null;
};

export type YouTubeStreamingStatus = {
  auth: YouTubeAuthStatus;
  privacy: YouTubePrivacyStatus;
  broadcastLifecycle: YouTubeBroadcastLifecycle;
  streamHealth: YouTubeStreamHealth;
  share: YouTubeShareMetadata;
  updatedAt: string;
};
