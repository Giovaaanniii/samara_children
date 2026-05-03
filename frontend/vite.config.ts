import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: "..",
  envPrefix: "VITE_",
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router')) return 'react-router'
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'react-core'
          }
          if (id.includes('antd') || id.includes('@ant-design')) return 'antd'
          if (id.includes('recharts')) return 'recharts'
          return 'vendor'
        },
      },
    },
  },
})
