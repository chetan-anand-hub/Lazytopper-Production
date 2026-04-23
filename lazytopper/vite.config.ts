import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = parseInt(process.env.PORT || "25246", 10);
const apiServerPort = parseInt(process.env.API_SERVER_PORT || "8080", 10);
const isProduction = process.env.NODE_ENV === "production";

function rootRedirectPlugin(): Plugin {
  return {
    name: "root-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/" || req.url === "") {
          res.writeHead(302, { Location: "/app/" });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: "/app/",
  plugins: [react(), rootRedirectPlugin()],
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
