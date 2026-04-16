export type DiagnosticsBindings = {
  requestId: string | null;
  adapterId: string;
  scope: "probe" | "live-view" | "ptz" | "settings";
  cameraHost: string;
  outcome?: string;
  artifactPath?: string;
};

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /^rtsp:/i,
  /@/,
];

function sanitizeHost(host: string): string {
  const atIndex = host.indexOf("@");
  if (atIndex > 0) {
    return host.substring(atIndex + 1);
  }
  return host;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

export type CreateDiagnosticsOptions = {
  requestId: string | null;
  adapterId: string;
  scope: "probe" | "live-view" | "ptz" | "settings";
  cameraHost: string;
  outcome?: string;
  artifactPath?: string;
};

export function createOperationDiagnostics(
  options: CreateDiagnosticsOptions,
): DiagnosticsBindings {
  return {
    requestId: options.requestId,
    adapterId: options.adapterId,
    scope: options.scope,
    cameraHost: sanitizeHost(options.cameraHost),
    ...(options.outcome !== undefined && { outcome: options.outcome }),
    ...(options.artifactPath !== undefined && { artifactPath: options.artifactPath }),
  };
}

export function createDiagnosticsLoggerBindings(
  options: CreateDiagnosticsOptions,
): DiagnosticsBindings {
  const bindings: DiagnosticsBindings = {
    requestId: options.requestId,
    adapterId: options.adapterId,
    scope: options.scope,
    cameraHost: sanitizeHost(options.cameraHost),
  };

  if (options.outcome !== undefined) {
    bindings.outcome = options.outcome;
  }

  if (options.artifactPath !== undefined) {
    bindings.artifactPath = options.artifactPath;
  }

  return bindings;
}

export type OperationDiagnosticsService = {
  createForRequest: (request: { id: string | undefined }) => DiagnosticsBindings;
  createForScope: (options: {
    adapterId: string;
    scope: "probe" | "live-view" | "ptz" | "settings";
    cameraHost: string;
  }) => DiagnosticsBindings;
};
