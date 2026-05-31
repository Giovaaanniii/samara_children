import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "VITE_");
  const hmrHost = env.VITE_HMR_HOST?.trim() || "";
  const hmrDisabled = env.VITE_HMR === "false";

  return {
    plugins: [react()],
    envDir: "..",
    envPrefix: "VITE_",
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      watch: {
        usePolling: true,
      },
      allowedHosts: [
        "samaradetyam.online",
        "www.samaradetyam.online",
        "2.26.22.99",
      ],
      hmr:
        hmrDisabled || env.VITE_HMR !== "true"
          ? false
          : hmrHost
            ? {
                host: hmrHost,
                protocol: "wss",
                clientPort: 443,
              }
            : true,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("react-router")) return "react-router";
            if (
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react/") ||
              id.includes("node_modules/scheduler/")
            ) {
              return "react-core";
            }
            if (id.includes("antd") || id.includes("@ant-design")) return "antd";
            if (id.includes("recharts")) return "recharts";
            return "vendor";
          },
        },
      },
    },
  };
});
