import type {
  LiveViewBootstrap,
  LiveViewHealth,
} from "../../../src/types/live-view.js";

const LIVE_VIEW_BOOTSTRAP_ENDPOINT = "/api/live-view";
const LIVE_VIEW_HEALTH_ENDPOINT = "/api/live-view/health";

export async function fetchLiveViewBootstrap(
  signal?: AbortSignal,
): Promise<LiveViewBootstrap> {
  const response = await fetch(LIVE_VIEW_BOOTSTRAP_ENDPOINT, {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Live view bootstrap request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as LiveViewBootstrap;
}

export async function fetchLiveViewHealth(
  signal?: AbortSignal,
): Promise<LiveViewHealth> {
  const response = await fetch(LIVE_VIEW_HEALTH_ENDPOINT, {
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Live view health request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as LiveViewHealth;
}
