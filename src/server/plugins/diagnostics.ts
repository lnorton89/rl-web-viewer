import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import type {
  DiagnosticsBindings,
  OperationDiagnosticsService,
} from "../../diagnostics/operation-diagnostics.js";
import {
  createDiagnosticsLoggerBindings,
  createOperationDiagnostics,
} from "../../diagnostics/operation-diagnostics.js";

function buildDiagnosticsService(_app: FastifyInstance): OperationDiagnosticsService {
  return {
    createForRequest: (request: { id: string | undefined }): DiagnosticsBindings => {
      return createOperationDiagnostics({
        requestId: request.id ?? null,
        adapterId: "unknown",
        scope: "probe",
        cameraHost: "unknown",
      });
    },
    createForScope: (options: {
      adapterId: string;
      scope: "probe" | "live-view" | "ptz" | "settings";
      cameraHost: string;
    }): DiagnosticsBindings => {
      return createDiagnosticsLoggerBindings({
        requestId: null,
        adapterId: options.adapterId,
        scope: options.scope,
        cameraHost: options.cameraHost,
      });
    },
  };
}

export const diagnosticsPlugin: FastifyPluginAsync = async (
  app: FastifyInstance,
): Promise<void> => {
  // Register the diagnostics service as a request-scoped decorator
  app.decorateRequest("diagnostics", null);
  app.addHook("onRequest", async (request) => {
    const requestId = request.id;
    (request as unknown as { diagnostics: DiagnosticsBindings }).diagnostics =
      createOperationDiagnostics({
        requestId: typeof requestId === "string" ? requestId : typeof requestId === "number" ? String(requestId) : null,
        adapterId: "unknown",
        scope: "probe",
        cameraHost: "unknown",
      });
  });
};

export function createDiagnosticsService(app: FastifyInstance): OperationDiagnosticsService {
  return buildDiagnosticsService(app);
}

export { type DiagnosticsBindings };
