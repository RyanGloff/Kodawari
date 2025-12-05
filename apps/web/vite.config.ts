import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // or '0.0.0.0'
    port: 5173, // Optional: specify the port, though 5173 is the default
  },
  plugins: [react()],
})
