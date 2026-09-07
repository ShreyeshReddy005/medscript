
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import base44 from '@base44/vite-plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'process.env.VITE_BASE44_APP_ID': JSON.stringify(process.env.VITE_BASE44_APP_ID),
    'process.env.VITE_BASE44_BACKEND_URL': JSON.stringify(process.env.VITE_BASE44_BACKEND_URL),
    'process.env.VITE_BASE44_API_KEY': JSON.stringify(process.env.VITE_BASE44_API_KEY)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      legacySDKImports: false
    }),
    react(),
  ]
});