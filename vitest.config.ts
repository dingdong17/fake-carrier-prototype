import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    server: {
      deps: {
        // Inline next-auth so our alias for `next/server` (see below) is
        // applied when next-auth's env.js imports it. Without inlining,
        // vitest uses Node's resolver, which can't find `next/server`
        // because the `next` package has no "exports" field.
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // next-auth's env.js imports `next/server` without `.js`, but the
      // `next` package lacks an "exports" field so vitest's ESM resolver
      // can't follow it. Redirect to the real file for tests.
      "next/server": path.resolve(__dirname, "./node_modules/next/server.js"),
    },
  },
});
