import { useEffect, useState } from "react";

import type {
  EditableSettingsSectionId,
  SettingsApplyFailure,
  SettingsApplyResult,
  SettingsApplySuccess,
  SettingsBootstrap,
  SettingsDiffRow,
  SettingsFieldPrimitive,
  SettingsFieldSpec,
  SettingsSection,
  SettingsSectionDraftMap,
  SettingsSectionId,
  SettingsSectionValueMap,
} from "../../../src/types/settings.js";
import { applySettingsSection, fetchSettingsBootstrap } from "../lib/settings-api.js";

type SectionMode = "read" | "editing" | "review" | "applying" | "verified" | "error";

type VerifiedSummary = {
  rows: SettingsDiffRow[];
  noCameraChangeDetected: boolean;
};

type SectionLocalState = {
  draft: unknown;
  mode: SectionMode;
  fieldErrors: Record<string, string>;
  sectionError: string | null;
  verifiedSummary: VerifiedSummary | null;
};

type SectionLocalStateMap = Record<SettingsSectionId, SectionLocalState>;

export type SettingsFieldView = {
  currentValue: SettingsFieldPrimitive;
  error: string | null;
  fieldSpec: SettingsFieldSpec;
  value: SettingsFieldPrimitive;
};

export type UseSettingsSection = {
  badgeLabel: string;
  canReview: boolean;
  description: string;
  editable: boolean;
  fieldViews: SettingsFieldView[];
  id: SettingsSectionId;
  mode: SectionMode;
  reviewRows: SettingsDiffRow[];
  sectionError: string | null;
  startEditing(): Promise<void>;
  cancelEditing(): void;
  enterReview(): void;
  returnToEditing(): void;
  apply(): Promise<void>;
  statusProps: {
    role: "status";
    "aria-live": "polite";
  };
  title: string;
  updateDraft(fieldPath: string, value: SettingsFieldPrimitive): void;
  verifiedSummary: VerifiedSummary | null;
};

export function useSettings(): {
  isLoading: boolean;
  loadError: string | null;
  reload(): Promise<void>;
  sections: UseSettingsSection[];
} {
  const [bootstrap, setBootstrap] = useState<SettingsBootstrap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sectionStates, setSectionStates] = useState<SectionLocalStateMap>(
    createEmptySectionStateMap(),
  );

  useEffect(() => {
    const abortController = new AbortController();

    void loadBootstrap(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, []);

  async function loadBootstrap(signal?: AbortSignal): Promise<void> {
    setIsLoading(true);
    setLoadError(null);

    try {
      const nextBootstrap = await fetchSettingsBootstrap(signal);

      setBootstrap(nextBootstrap);
      setSectionStates(createSectionStateMap(nextBootstrap));
    } catch (error: unknown) {
      if (signal?.aborted) {
        return;
      }

      setLoadError(getErrorMessage(error, "Settings could not load"));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }

  const sections = bootstrap?.sections.map((section) => {
    const sectionState = sectionStates[section.id];
    const draftValue = mergeSectionDraft(section.id, section.value, sectionState.draft);
    const fieldViews = section.fieldSpecs.map((fieldSpec) =>
      createFieldView(section, fieldSpec, draftValue, sectionState.fieldErrors),
    );
    const reviewRows = createReviewRows(section, draftValue);

    return {
      badgeLabel: getBadgeLabel(section, sectionState.mode, reviewRows.length > 0),
      canReview: reviewRows.length > 0 && isReviewableMode(sectionState.mode),
      description: section.description,
      editable: section.editable,
      fieldViews,
      id: section.id,
      mode: sectionState.mode,
      reviewRows,
      sectionError: sectionState.sectionError,
      startEditing: async () => {
        if (!section.editable) {
          return;
        }

        setSectionStates((currentState) => ({
          ...currentState,
          [section.id]: {
            ...currentState[section.id],
            mode: "editing",
            sectionError: null,
            verifiedSummary: null,
          },
        }));
      },
      cancelEditing: () => {
        setSectionStates((currentState) => ({
          ...currentState,
          [section.id]: createEmptySectionState(),
        }));
      },
      enterReview: () => {
        if (!section.editable || reviewRows.length === 0) {
          return;
        }

        setSectionStates((currentState) => ({
          ...currentState,
          [section.id]: {
            ...currentState[section.id],
            mode: "review",
            fieldErrors: {},
            sectionError: null,
            verifiedSummary: null,
          },
        }));
      },
      returnToEditing: () => {
        if (!section.editable) {
          return;
        }

        setSectionStates((currentState) => ({
          ...currentState,
          [section.id]: {
            ...currentState[section.id],
            mode: "editing",
          },
        }));
      },
      apply: async () => {
        if (!section.editable || sectionState.mode !== "review") {
          return;
        }

        setSectionStates((currentState) => ({
          ...currentState,
          [section.id]: {
            ...currentState[section.id],
            mode: "applying",
            fieldErrors: {},
            sectionError: null,
          },
        }));

        try {
          const result = await applySettingsSection(
            section.id,
            sectionState.draft as SettingsSectionDraftMap[EditableSettingsSectionId],
          );

          if (!result.ok) {
            setSectionStates((currentState) => ({
              ...currentState,
              [section.id]: {
                ...currentState[section.id],
                mode: "error",
                fieldErrors: indexFieldErrors(result),
                sectionError: getSectionError(result),
                verifiedSummary: null,
              },
            }));
            return;
          }

          setBootstrap((currentBootstrap) =>
            currentBootstrap === null
              ? currentBootstrap
              : applyVerifiedResultToBootstrap(currentBootstrap, result),
          );
          setSectionStates((currentState) => ({
            ...currentState,
            [section.id]: {
              draft: {},
              mode: "verified",
              fieldErrors: {},
              sectionError: null,
              verifiedSummary: {
                rows: result.changedFields,
                noCameraChangeDetected: result.changedFields.length === 0,
              },
            },
          }));
        } catch (error: unknown) {
          setSectionStates((currentState) => ({
            ...currentState,
            [section.id]: {
              ...currentState[section.id],
              mode: "error",
              sectionError: getErrorMessage(error, "Settings apply failed"),
            },
          }));
        }
      },
      statusProps: STATUS_REGION_PROPS,
      title: section.title,
      updateDraft: (fieldPath, value) => {
        if (!section.editable) {
          return;
        }

        setSectionStates((currentState) => {
          const nextState = currentState[section.id];
          const nextFieldErrors = { ...nextState.fieldErrors };
          delete nextFieldErrors[fieldPath];

          return {
            ...currentState,
            [section.id]: {
              ...nextState,
              draft: updateDraftValue(section.id, nextState.draft, fieldPath, value),
              mode: nextState.mode === "read" ? "editing" : nextState.mode,
              fieldErrors: nextFieldErrors,
            },
          };
        });
      },
      verifiedSummary: sectionState.verifiedSummary,
    } satisfies UseSettingsSection;
  }) ?? [];

  return {
    isLoading,
    loadError,
    reload: async () => {
      await loadBootstrap();
    },
    sections,
  };
}

const STATUS_REGION_PROPS = {
  role: "status" as const,
  "aria-live": "polite" as const,
};

function createFieldView(
  section: SettingsSection,
  fieldSpec: SettingsFieldSpec,
  draftValue: SettingsSectionValueMap[SettingsSectionId],
  fieldErrors: Record<string, string>,
): SettingsFieldView {
  const currentValue =
    getFieldValue(section.value, fieldSpec) ?? fieldSpec.currentValue ?? fieldSpec.defaultValue;
  const value =
    getFieldValue(draftValue, fieldSpec) ?? fieldSpec.currentValue ?? fieldSpec.defaultValue;

  return {
    currentValue,
    error: fieldErrors[fieldSpec.fieldPath] ?? null,
    fieldSpec: {
      ...fieldSpec,
      constraints: fieldSpec.constraints,
      options: fieldSpec.options,
    },
    value,
  };
}

function createReviewRows(
  section: SettingsSection,
  draftValue: SettingsSectionValueMap[SettingsSectionId],
): SettingsDiffRow[] {
  return section.fieldSpecs
    .filter((fieldSpec) => fieldSpec.editable)
    .flatMap((fieldSpec) => {
      const beforeValue =
        getFieldValue(section.value, fieldSpec) ?? fieldSpec.currentValue ?? fieldSpec.defaultValue;
      const afterValue =
        getFieldValue(draftValue, fieldSpec) ?? fieldSpec.currentValue ?? fieldSpec.defaultValue;

      if (Object.is(beforeValue, afterValue)) {
        return [];
      }

      return [
        {
          afterValue,
          beforeValue,
          fieldPath: fieldSpec.fieldPath,
          label: fieldSpec.label,
          verified: false,
        },
      ];
    });
}

function applyVerifiedResultToBootstrap<
  TId extends EditableSettingsSectionId,
>(
  bootstrap: SettingsBootstrap,
  result: SettingsApplySuccess<TId>,
): SettingsBootstrap {
  return {
    ...bootstrap,
    fieldSpecs: updateFieldSpecs(bootstrap.fieldSpecs, result.sectionId, result.after),
    sections: bootstrap.sections.map((section) =>
      section.id === result.sectionId
        ? {
            ...section,
            fieldSpecs: updateFieldSpecs(section.fieldSpecs, result.sectionId, result.after),
            value: result.after,
          }
        : section,
    ),
  };
}

function updateFieldSpecs(
  fieldSpecs: readonly SettingsFieldSpec[],
  sectionId: SettingsSectionId,
  value: SettingsSectionValueMap[SettingsSectionId],
): SettingsFieldSpec[] {
  return fieldSpecs.map((fieldSpec) => {
    if (fieldSpec.sectionId !== sectionId) {
      return fieldSpec;
    }

    return {
      ...fieldSpec,
      currentValue: getFieldValue(value, fieldSpec) ?? fieldSpec.currentValue,
    };
  });
}

function getFieldValue(
  value: unknown,
  fieldSpec: Pick<SettingsFieldSpec, "fieldPath" | "sectionId">,
): SettingsFieldPrimitive | undefined {
  return getValueAtPath(value, stripSectionPrefix(fieldSpec.sectionId, fieldSpec.fieldPath));
}

function getValueAtPath(value: unknown, path: string): SettingsFieldPrimitive | undefined {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((currentValue, segment) => {
    if (
      currentValue !== null &&
      typeof currentValue === "object" &&
      segment in currentValue
    ) {
      return (currentValue as Record<string, unknown>)[segment];
    }

    return undefined;
  }, value) as SettingsFieldPrimitive | undefined;
}

function mergeSectionDraft<TId extends SettingsSectionId>(
  sectionId: TId,
  value: SettingsSectionValueMap[TId],
  draft: unknown,
): SettingsSectionValueMap[TId] {
  return mergeObjects(value, draft) as SettingsSectionValueMap[TId];
}

function mergeObjects(base: unknown, patch: unknown): unknown {
  if (patch === undefined) {
    return cloneValue(base);
  }

  if (
    base === null ||
    patch === null ||
    typeof base !== "object" ||
    typeof patch !== "object" ||
    Array.isArray(base) ||
    Array.isArray(patch)
  ) {
    return patch;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };

  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    result[key] = mergeObjects(result[key], value);
  }

  return result;
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function updateDraftValue(
  sectionId: SettingsSectionId,
  draft: unknown,
  fieldPath: string,
  value: SettingsFieldPrimitive,
): unknown {
  const draftCopy = cloneValue((draft ?? {}) as Record<string, unknown>);
  const segments = stripSectionPrefix(sectionId, fieldPath).split(".");
  let branch = draftCopy;

  for (const segment of segments.slice(0, -1)) {
    const nextBranch = branch[segment];
    if (nextBranch === null || typeof nextBranch !== "object" || Array.isArray(nextBranch)) {
      branch[segment] = {};
    }

    branch = branch[segment] as Record<string, unknown>;
  }

  const leaf = segments.at(-1);

  if (leaf) {
    branch[leaf] = value;
  }

  return draftCopy;
}

function indexFieldErrors(
  result: SettingsApplyFailure<SettingsSectionId>,
): Record<string, string> {
  return Object.fromEntries(
    result.fieldErrors.map((fieldError) => [fieldError.fieldPath, fieldError.message]),
  );
}

function getSectionError(result: SettingsApplyResult<SettingsSectionId>): string {
  if ("sectionError" in result && result.sectionError?.message) {
    return result.sectionError.message;
  }

  return result.message;
}

function createSectionStateMap(bootstrap: SettingsBootstrap): SectionLocalStateMap {
  const sectionStateMap = createEmptySectionStateMap();

  for (const section of bootstrap.sections) {
    sectionStateMap[section.id] = createEmptySectionState();
  }

  return sectionStateMap;
}

function createEmptySectionStateMap(): SectionLocalStateMap {
  return {
    image: createEmptySectionState(),
    isp: createEmptySectionState(),
    osd: createEmptySectionState(),
    stream: createEmptySectionState(),
    time: createEmptySectionState(),
  };
}

function createEmptySectionState(): SectionLocalState {
  return {
    draft: {},
    fieldErrors: {},
    mode: "read",
    sectionError: null,
    verifiedSummary: null,
  };
}

function stripSectionPrefix(sectionId: SettingsSectionId, fieldPath: string): string {
  const prefix = `${sectionId}.`;

  return fieldPath.startsWith(prefix) ? fieldPath.slice(prefix.length) : fieldPath;
}

function getBadgeLabel(
  section: SettingsSection,
  mode: SectionMode,
  hasDraft: boolean,
): string {
  if (!section.editable) {
    return "Read only";
  }

  if (mode === "verified") {
    return "Verified";
  }

  if (mode === "review") {
    return "Review";
  }

  if (mode === "applying") {
    return "Applying";
  }

  if (mode === "error") {
    return "Error";
  }

  if (hasDraft) {
    return "Draft";
  }

  return "Read";
}

function isReviewableMode(mode: SectionMode): boolean {
  return mode === "editing" || mode === "error";
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim() !== ""
  ) {
    return error.message;
  }

  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }

  return fallbackMessage;
}
