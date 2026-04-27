import { useCallback, useEffect, useState } from "react";

import type { PluginId, PluginSummary } from "../../../src/types/plugins.js";
import {
  disablePlugin,
  enablePlugin,
  fetchPlugins,
  invokePluginAction,
} from "../lib/plugin-api.js";

export function usePlugins(): {
  error: string | null;
  isLoading: boolean;
  pendingAction: string | null;
  plugins: PluginSummary[];
  disable(pluginId: PluginId): Promise<void>;
  enable(pluginId: PluginId): Promise<void>;
  invoke(pluginId: PluginId, actionId: string, body?: Record<string, unknown>): Promise<void>;
  refresh(): Promise<void>;
} {
  const [plugins, setPlugins] = useState<PluginSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const nextPlugins = await fetchPlugins(signal);

      if (signal?.aborted) {
        return;
      }

      setPlugins(nextPlugins);
    } catch (nextError) {
      if (signal?.aborted) {
        return;
      }

      setError(getErrorMessage(nextError, "Plugin status could not be loaded."));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    void refresh(abortController.signal);
    return () => abortController.abort();
  }, [refresh]);

  const runAction = useCallback(
    async (actionKey: string, action: () => Promise<unknown>) => {
      setPendingAction(actionKey);
      setError(null);

      try {
        await action();
        await refresh();
      } catch (nextError) {
        setError(getErrorMessage(nextError, "Plugin action failed."));
      } finally {
        setPendingAction(null);
      }
    },
    [refresh],
  );

  const enable = useCallback(
    (pluginId: PluginId) =>
      runAction(`${pluginId}:enable`, () => enablePlugin(pluginId)),
    [runAction],
  );

  const disable = useCallback(
    (pluginId: PluginId) =>
      runAction(`${pluginId}:disable`, () => disablePlugin(pluginId)),
    [runAction],
  );

  const invoke = useCallback(
    (
      pluginId: PluginId,
      actionId: string,
      body: Record<string, unknown> = {},
    ) =>
      runAction(`${pluginId}:${actionId}`, () =>
        invokePluginAction(pluginId, actionId, body),
      ),
    [runAction],
  );

  return {
    error,
    isLoading,
    pendingAction,
    plugins,
    disable,
    enable,
    invoke,
    refresh: () => refresh(),
  };
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
