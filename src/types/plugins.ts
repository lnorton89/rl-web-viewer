export type PluginId = "youtube-streaming" | (string & {});

export type PluginStatusState =
  | "disabled"
  | "enabled"
  | "needs-configuration"
  | "unavailable";

export type PluginCapability =
  | "configuration"
  | "actions"
  | "share-metadata";

export type PluginConfigFieldKind = "text" | "select" | "toggle";

export type PluginConfigOption = {
  label: string;
  value: string;
};

export type PluginConfigField = {
  id: string;
  label: string;
  kind: PluginConfigFieldKind;
  required: boolean;
  value: string | boolean | null;
  options?: readonly PluginConfigOption[];
};

export type PluginActionSummary = {
  id: string;
  label: string;
  enabled: boolean;
  disabledReason: string | null;
};

export type PluginShareMetadata = {
  available: boolean;
  url: string | null;
  label: string | null;
};

export type PluginStatus = {
  pluginId: PluginId;
  state: PluginStatusState;
  message: string;
  updatedAt: string;
};

export type PluginSummary = {
  id: PluginId;
  label: string;
  description: string;
  enabled: boolean;
  capabilities: readonly PluginCapability[];
  status: PluginStatus;
  actions: readonly PluginActionSummary[];
  config: readonly PluginConfigField[];
  share: PluginShareMetadata;
};

export type PluginConfigPatch = {
  values?: Record<string, unknown>;
};

export type PluginActionResult = {
  ok: boolean;
  pluginId: PluginId;
  actionId: string;
  accepted: boolean;
  status: PluginStatus;
  message?: string;
};

export type PluginConfigResult = {
  ok: boolean;
  pluginId: PluginId;
  verified: boolean;
  status: PluginStatus;
  message?: string;
};
