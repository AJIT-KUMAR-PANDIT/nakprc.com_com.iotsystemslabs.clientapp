import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0", // Allow connections from any IP
    port: 5173,
    strictPort: true, // Don't try another port if 3000 is in use
    hmr: {
      // Allow HMR from any host including ngrok
      clientPort: 443, // Use 443 for ngrok HTTPS tunnels
      host: "localhost", // Keep host as localhost for HMR websocket
    },
    proxy: {
      // Add proxy configuration if needed
    },
    cors: true, // Enable CORS
    fs: {
      strict: false, // Allow serving files from outside of the project root
    },
    watch: {
      usePolling: true, // Use polling for file changes (helps with some network setups)
    },
    open: false, // Don't open browser automatically
    https: false, // Use HTTP by default
    allowedHosts: ["localhost", ".ngrok.io", ".ngrok-free.app", "all"], // Allow these hosts to connect
  },
});
