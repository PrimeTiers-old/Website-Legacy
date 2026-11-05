import { defineConfig } from "vite";

// The site is fully static. Live data is written to public/data/ by scripts/build-data.mjs.
// network.html is a standalone page served at /network.
export default defineConfig({
  build: {
    outDir: "dist",
    target: "es2020",
    rollupOptions: { input: { main: "index.html", network: "network.html" } },
  },
});
