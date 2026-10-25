import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/tokoshan/' : '/',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: '../Jellyfin.Plugin.WatchParty/dist',
    emptyOutDir: true,
  },
}))
