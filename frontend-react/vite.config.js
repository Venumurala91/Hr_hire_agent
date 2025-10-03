import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the Flask backend
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      // === THIS IS THE NEW RULE THAT FIXES THE PROBLEM ===
      // Proxy resume file requests to the Flask backend
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      // ===================================================
    },
  },
})