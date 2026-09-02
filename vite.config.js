import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // honour PORT so tooling can assign a free port; falls back to Vite's default
    port: Number(process.env.PORT) || 5173,
  },
})
