import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      exclude: ["src/test"],
      tsconfigPath: "./tsconfig.build.json",
    }),
  ],

  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "ReveltRouter",
      fileName: "index",
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react/jsx-runtime": "ReactJSXRuntime",
        },
      },
    },
    sourcemap: true,
  },

  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
