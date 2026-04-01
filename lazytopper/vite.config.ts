import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// LazyTopper – Vite config
// Adds a dev-time proxy so that frontend calls to /api/* are forwarded to
// the local AI gateway (server/index.cjs) running on port 3001.
const port = parseInt(process.env.PORT || "5173", 10);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
