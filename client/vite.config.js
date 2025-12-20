import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "../attached_assets"),
    },
  },
  // Root is current directory by default
  build: {
    outDir: path.resolve(import.meta.dirname, "../dist/public"), // Build outside
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    fs: {
      allow: [
        // search up for workspace root
        path.resolve(import.meta.dirname, ".."),
      ],
    },
  },
});
