import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import viteConfig from "../../web/vite.config.ts";

describe("browser workspace", () => {
  it("runs in jsdom and exposes the app mount", async () => {
    expect(window.document).toBe(document);

    const html = await readFile(path.resolve(process.cwd(), "web/index.html"), "utf8");
    const parsed = new DOMParser().parseFromString(html, "text/html");

    expect(parsed.querySelector("#app")).not.toBeNull();
  });

  it("uses the planned vite server and build settings", () => {
    expect(viteConfig.root).toBe(".");
    expect(viteConfig.server).toMatchObject({
      host: "127.0.0.1",
      port: 5173,
    });
    expect(viteConfig.build).toMatchObject({
      outDir: "dist",
      manifest: true,
    });
  });
});
