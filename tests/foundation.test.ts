import { describe, expect, it } from "vitest";

import { defaultConfigPath } from "../src/config/camera-config.js";

describe("foundation scaffold", () => {
  it("uses a project-local config path", () => {
    expect(defaultConfigPath()).toContain(".local");
    expect(defaultConfigPath()).toContain("camera.config.json");
  });
});
