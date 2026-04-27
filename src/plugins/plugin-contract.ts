import type { PluginConfig } from "../config/plugin-config.js";
import type {
  PluginActionResult,
  PluginConfigPatch,
  PluginConfigResult,
  PluginId,
  PluginStatus,
  PluginSummary,
} from "../types/plugins.js";

export type PluginActionContext = {
  config: PluginConfig;
  saveConfig(config: PluginConfig): Promise<PluginConfig>;
  now(): string;
};

export interface PluginModule {
  id: PluginId;
  getSummary(context: PluginActionContext): Promise<PluginSummary> | PluginSummary;
  getStatus(context: PluginActionContext): Promise<PluginStatus> | PluginStatus;
  enable(
    patch: PluginConfigPatch,
    context: PluginActionContext,
  ): Promise<PluginConfigResult> | PluginConfigResult;
  disable(
    patch: PluginConfigPatch,
    context: PluginActionContext,
  ): Promise<PluginConfigResult> | PluginConfigResult;
  configure(
    patch: PluginConfigPatch,
    context: PluginActionContext,
  ): Promise<PluginConfigResult> | PluginConfigResult;
  invokeAction(
    actionId: string,
    body: unknown,
    context: PluginActionContext,
  ): Promise<PluginActionResult> | PluginActionResult;
}

export interface PluginRuntime {
  listPlugins(): Promise<PluginSummary[]>;
  getPluginStatus(pluginId: string): Promise<PluginStatus>;
  enablePlugin(pluginId: string, patch: PluginConfigPatch): Promise<PluginConfigResult>;
  disablePlugin(pluginId: string, patch: PluginConfigPatch): Promise<PluginConfigResult>;
  configurePlugin(
    pluginId: string,
    patch: PluginConfigPatch,
  ): Promise<PluginConfigResult>;
  invokeAction(
    pluginId: string,
    actionId: string,
    body: unknown,
  ): Promise<PluginActionResult>;
}

export type PluginRuntimeErrorCode =
  | "not-found"
  | "unsupported"
  | "disabled"
  | "validation";

export class PluginRuntimeError extends Error {
  readonly code: PluginRuntimeErrorCode;
  readonly statusCode: 404 | 409 | 422;

  constructor(
    code: PluginRuntimeErrorCode,
    message: string,
    statusCode: 404 | 409 | 422,
  ) {
    super(message);
    this.name = "PluginRuntimeError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
