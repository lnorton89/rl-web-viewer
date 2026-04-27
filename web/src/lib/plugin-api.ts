import type {
  PluginActionResult,
  PluginConfigPatch,
  PluginConfigResult,
  PluginId,
  PluginStatus,
  PluginSummary,
} from "../../../src/types/plugins.js";

const PLUGINS_ENDPOINT = "/api/plugins";

export async function fetchPlugins(
  signal?: AbortSignal,
): Promise<PluginSummary[]> {
  return requestJson<PluginSummary[]>(PLUGINS_ENDPOINT, {
    method: "GET",
    signal,
  });
}

export async function fetchPluginStatus(
  pluginId: PluginId,
  signal?: AbortSignal,
): Promise<PluginSummary> {
  return requestJson<PluginSummary>(pluginUrl(pluginId), {
    method: "GET",
    signal,
  });
}

export async function configurePlugin(
  pluginId: PluginId,
  patch: PluginConfigPatch,
): Promise<PluginConfigResult> {
  return requestJson<PluginConfigResult>(`${pluginUrl(pluginId)}/config`, {
    body: patch,
    method: "POST",
  });
}

export async function enablePlugin(
  pluginId: PluginId,
  patch: PluginConfigPatch = {},
): Promise<PluginConfigResult> {
  return requestJson<PluginConfigResult>(`${pluginUrl(pluginId)}/enable`, {
    body: patch,
    method: "POST",
  });
}

export async function disablePlugin(
  pluginId: PluginId,
  patch: PluginConfigPatch = {},
): Promise<PluginConfigResult> {
  return requestJson<PluginConfigResult>(`${pluginUrl(pluginId)}/disable`, {
    body: patch,
    method: "POST",
  });
}

export async function invokePluginAction<T extends PluginActionResult = PluginActionResult>(
  pluginId: PluginId,
  actionId: string,
  body: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  return requestJson<T>(`${pluginUrl(pluginId)}/actions/${encodeURIComponent(actionId)}`, {
    body,
    method: "POST",
    signal,
  });
}

async function requestJson<T>(
  url: string,
  input: {
    body?: unknown;
    method: "GET" | "POST";
    signal?: AbortSignal;
  },
): Promise<T> {
  const response = await fetch(url, {
    method: input.method,
    headers: {
      Accept: "application/json",
      ...(input.body === undefined
        ? {}
        : {
            "Content-Type": "application/json",
          }),
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
    signal: input.signal,
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new Error(getPayloadErrorMessage(payload, url, response.status));
  }

  return payload as T;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function getPayloadErrorMessage(
  payload: unknown,
  url: string,
  status: number,
): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string" &&
    payload.error.trim() !== ""
  ) {
    return payload.error;
  }

  return `Plugin request failed for ${url} with status ${status}`;
}

function pluginUrl(pluginId: PluginId): string {
  return `${PLUGINS_ENDPOINT}/${encodeURIComponent(pluginId)}`;
}

export type PluginActionWithStatus = PluginActionResult & {
  status: PluginStatus;
};
