import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = parseInt(process.env.PORT || "25246", 10);
const apiServerPort = parseInt(process.env.API_SERVER_PORT || "8080", 10);
const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  base: isProduction ? "/app/" : "/",
  plugins: [react()],
  build: {
    outDir: isProduction
      ? path.resolve(__dirname, "../artifacts/lazytopper-app/dist/public/app")
      : "dist",
    emptyOutDir: true,
  },
  server: {
    host: true,
    port,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${apiServerPort}`,
        changeOrigin: true,
      },
      "/shared-api": {
        target: `http://localhost:${apiServerPort}`,
        changeOrigin: true,
      },
    },
  },
});
