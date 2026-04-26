import type {
  MotionStartResult,
  MotionStopResult,
  PresetRecallResult,
  PtzBootstrap,
  PtzDirection,
  PtzStopReason,
  PtzZoomDirection,
  ZoomPulseResult,
} from "../../../src/types/ptz.js";

const PTZ_ENDPOINT = "/api/ptz";

export async function fetchPtzBootstrap(
  signal?: AbortSignal,
): Promise<PtzBootstrap> {
  return requestJson<PtzBootstrap>(PTZ_ENDPOINT, {
    method: "GET",
    signal,
  });
}

export async function startPtzMotion(
  direction: PtzDirection,
): Promise<MotionStartResult> {
  return requestJson<MotionStartResult>(`${PTZ_ENDPOINT}/motion/start`, {
    method: "POST",
    body: {
      direction,
    },
  });
}

export async function stopPtzMotion(
  reason?: PtzStopReason,
): Promise<MotionStopResult> {
  return requestJson<MotionStopResult>(`${PTZ_ENDPOINT}/stop`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export async function pulsePtzZoom(
  direction: PtzZoomDirection,
): Promise<ZoomPulseResult> {
  return requestJson<ZoomPulseResult>(`${PTZ_ENDPOINT}/zoom`, {
    method: "POST",
    body: {
      direction,
    },
  });
}

export async function recallPtzPreset(
  presetId: number,
): Promise<PresetRecallResult> {
  return requestJson<PresetRecallResult>(
    `${PTZ_ENDPOINT}/presets/${presetId}/recall`,
    {
      method: "POST",
    },
  );
}

export async function fetchPtzAdvanced(
  signal?: AbortSignal,
): Promise<{ focus: number; iris: number; speed: number }> {
  return requestJson<{ focus: number; iris: number; speed: number }>(
    `${PTZ_ENDPOINT}/advanced`,
    {
      method: "GET",
      signal,
    },
  );
}

export async function setFocus(
  focus: number,
  signal?: AbortSignal,
): Promise<{ focusValue: number }> {
  return requestJson<{ focusValue: number }>(`${PTZ_ENDPOINT}/focus`, {
    method: "POST",
    body: { focus },
    signal,
  });
}

export async function setIris(
  iris: number,
  signal?: AbortSignal,
): Promise<{ irisValue: number }> {
  return requestJson<{ irisValue: number }>(`${PTZ_ENDPOINT}/iris`, {
    method: "POST",
    body: { iris },
    signal,
  });
}

export async function setSpeed(
  speed: number,
  signal?: AbortSignal,
): Promise<{ speedValue: number }> {
  return requestJson<{ speedValue: number }>(`${PTZ_ENDPOINT}/speed`, {
    method: "POST",
    body: { speed },
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

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, url));
  }

  return (await response.json()) as T;
}

async function getErrorMessage(
  response: Response,
  url: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown };

    if (typeof payload.error === "string" && payload.error.trim() !== "") {
      return payload.error;
    }
  } catch {
    // Fall through to the generic message.
  }

  return `PTZ request failed for ${url} with status ${response.status}`;
}
