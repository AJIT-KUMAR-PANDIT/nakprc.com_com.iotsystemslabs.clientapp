import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: {
      clientPort: 443, // Ensure this matches your server's protocol
      host: "localhost",
      protocol: "ws", // Change to "wss" if using HTTPS
    },
    proxy: {
      // Ensure proxy settings are correct if needed
    },
    cors: true,
    fs: {
      strict: false,
    },
    watch: {
      usePolling: true,
    },
    open: false,
    https: false, // Change to true if using HTTPS
    allowedHosts: ["localhost", ".ngrok.io", ".ngrok-free.app"], // Consider removing "all"
    middlewareMode: false,
  },
});
