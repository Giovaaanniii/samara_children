import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const hmrHost = env.VITE_HMR_HOST || "localhost";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      hmr: {
        host: hmrHost,
        protocol: hmrHost === "localhost" ? "ws" : "wss",
        clientPort: hmrHost === "localhost" ? 3000 : 443,
      },
    },
  };
});
