import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

// Polyfill __dirname for ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

// Custom plugin to handle service worker
const serviceWorkerPlugin = () => {
  return {
    name: "vite-plugin-service-worker",
    configureServer(server) {
      // Serve service-worker.js with the correct MIME type
      server.middlewares.use((req, res, next) => {
        if (req.url === "/service-worker.js") {
          const swPath = resolve(__dirname, "public", "service-worker.js");
          if (fs.existsSync(swPath)) {
            res.setHeader("Content-Type", "application/javascript");
            res.end(fs.readFileSync(swPath, "utf8"));
            return;
          }
        }
        next();
      });
    },
    generateBundle() {
      // This ensures service-worker.js is copied to the dist directory during build
      const swPath = resolve(__dirname, "public", "service-worker.js");
      if (fs.existsSync(swPath)) {
        this.emitFile({
          type: "asset",
          fileName: "service-worker.js",
          source: fs.readFileSync(swPath, "utf8"),
        });
      }
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    serviceWorkerPlugin(), // Add our custom plugin
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443,
      host: "localhost",
      protocol: "ws",
    },
    cors: true,
    fs: {
      strict: false,
    },
    watch: {
      usePolling: true,
    },
    open: false,
    https: false,
    allowedHosts: ["localhost", ".ngrok.io", ".ngrok-free.app"],
  },
  worker: {
    format: "es",
  },
  build: {
    target: "esnext",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
  },
  optimizeDeps: {
    include: ["@mlc-ai/web-llm"],
  },
});
