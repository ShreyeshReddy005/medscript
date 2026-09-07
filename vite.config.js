
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import base44 from '@base44/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  define: {
    'process.env.VITE_BASE44_APP_ID': JSON.stringify(process.env.VITE_BASE44_APP_ID),
    'process.env.VITE_BASE44_BACKEND_URL': JSON.stringify(process.env.VITE_BASE44_BACKEND_URL),
    'process.env.VITE_BASE44_API_KEY': JSON.stringify(process.env.VITE_BASE44_API_KEY)
  },
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: true
    }),
    react(),
  ]
});