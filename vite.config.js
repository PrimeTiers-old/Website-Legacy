import { defineConfig } from "vite";

// The site is fully static. Live data is written to public/data/ by scripts/build-data.mjs.
export default defineConfig({
  build: { outDir: "dist", target: "es2020" },
});
