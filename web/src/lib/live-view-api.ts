import type { LiveViewBootstrap } from "../../../src/types/live-view.js";

const LIVE_VIEW_BOOTSTRAP_ENDPOINT = "/api/live-view";

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
