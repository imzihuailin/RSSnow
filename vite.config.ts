import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署在 /RSSnow/ 子路径，本地开发为 /
  base: process.env.VITE_BASE_PATH || '/',
})
