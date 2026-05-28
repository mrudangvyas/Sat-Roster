import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/Sat-Roster/",
});
const BACKEND_PORT =
  process.env.SATROSTER_BACKEND_PORT ||
  process.env.VITE_BACKEND_PORT ||
  6175;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "root-index-rewrite",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === "/") {
            req.url = "/index.html";
          }
          next();
        });
      },
    },
  ],
  base: "/Sat-Roster/",
  server: {
    // This is where you set the frontend port
    port: 6176,
    // This ensures your frontend can talk to your backend server during development
    proxy: {
      "/api": {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
