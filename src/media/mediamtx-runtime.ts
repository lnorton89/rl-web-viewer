import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export const MEDIAMTX_VERSION = "v1.17.1";
export const MEDIAMTX_DIRECTORY = `mediamtx-${MEDIAMTX_VERSION}`;
export const MEDIAMTX_RELEASE_ZIP = "mediamtx_v1.17.1_windows_amd64.zip";

export function defaultMediaMtxRuntimeDirectory(): string {
  return path.resolve(process.cwd(), ".local", "tools", MEDIAMTX_DIRECTORY);
}

export function defaultMediaMtxExecutablePath(): string {
  return path.resolve(defaultMediaMtxRuntimeDirectory(), "mediamtx.exe");
}

export function buildMediaMtxDownloadUrl(): string {
  return `https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/${MEDIAMTX_RELEASE_ZIP}`;
}

export async function ensureMediaMtxRuntime(options?: {
  fetchImpl?: typeof fetch;
  unzipArchive?: (zipPath: string, destinationDir: string) => Promise<void>;
}): Promise<string> {
  const executablePath = defaultMediaMtxExecutablePath();

  if (await fileExists(executablePath)) {
    return executablePath;
  }

  if (process.platform !== "win32") {
    throw new Error("Pinned MediaMTX bootstrap currently supports Windows only");
  }

  const runtimeDirectory = defaultMediaMtxRuntimeDirectory();
  const zipPath = path.resolve(runtimeDirectory, MEDIAMTX_RELEASE_ZIP);
  const fetchImpl = options?.fetchImpl ?? fetch;

  await mkdir(runtimeDirectory, { recursive: true });

  const response = await fetchImpl(buildMediaMtxDownloadUrl());

  if (!response.ok) {
    throw new Error(`MediaMTX download failed with HTTP ${response.status}`);
  }

  await writeFile(zipPath, Buffer.from(await response.arrayBuffer()));
  await (options?.unzipArchive ?? expandMediaMtxArchive)(zipPath, runtimeDirectory);

  if (!(await fileExists(executablePath))) {
    throw new Error("Pinned MediaMTX runtime did not contain mediamtx.exe");
  }

  return executablePath;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function expandMediaMtxArchive(
  zipPath: string,
  destinationDir: string,
): Promise<void> {
  const command = `Expand-Archive -LiteralPath '${escapePowerShell(zipPath)}' -DestinationPath '${escapePowerShell(destinationDir)}' -Force`;

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-Command", command],
      {
        stdio: "ignore",
        windowsHide: true,
      },
    );

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Expand-Archive failed with exit code ${code ?? -1}`));
    });
  });
}

function escapePowerShell(value: string): string {
  return value.replace(/'/g, "''");
}
