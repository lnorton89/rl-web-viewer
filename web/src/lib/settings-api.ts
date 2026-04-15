import type {
  EditableSettingsSectionId,
  SettingsApplyFailure,
  SettingsApplyResult,
  SettingsBootstrap,
  SettingsSectionDraftMap,
} from "../../../src/types/settings.js";

const SETTINGS_ENDPOINT = "/api/settings";

export async function fetchSettingsBootstrap(
  signal?: AbortSignal,
): Promise<SettingsBootstrap> {
  const response = await fetch(SETTINGS_ENDPOINT, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, SETTINGS_ENDPOINT));
  }

  return (await response.json()) as SettingsBootstrap;
}

export async function applySettingsSection<TId extends EditableSettingsSectionId>(
  sectionId: TId,
  draft: SettingsSectionDraftMap[TId],
): Promise<SettingsApplyResult<TId>> {
  const url = `${SETTINGS_ENDPOINT}/${sectionId}/apply`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(draft),
  });

  const payload = (await readJson(response)) as SettingsApplyResult<TId> | {
    error?: unknown;
  };

  if (isSettingsApplyFailure(payload)) {
    return payload;
  }

  if (!response.ok) {
    throw new Error(getPayloadErrorMessage(payload, url, response.status));
  }

  return payload as SettingsApplyResult<TId>;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isSettingsApplyFailure(
  value: unknown,
): value is SettingsApplyFailure<EditableSettingsSectionId> {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === false &&
    "sectionId" in value
  );
}

async function getErrorMessage(
  response: Response,
  url: string,
): Promise<string> {
  return getPayloadErrorMessage(await readJson(response), url, response.status);
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

  return `Settings request failed for ${url} with status ${status}`;
}
