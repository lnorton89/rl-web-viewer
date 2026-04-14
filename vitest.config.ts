import { defineConfig, defineProject } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.test.ts"],
        },
      }),
      defineProject({
        test: {
          name: "web",
          environment: "jsdom",
          include: ["tests/web/**/*.test.tsx"],
        },
      }),
    ],
  },
});
