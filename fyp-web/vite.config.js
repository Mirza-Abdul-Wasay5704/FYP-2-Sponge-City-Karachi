import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.shp', '**/*.dbf', '**/*.shx', '**/*.prj', '**/*.cpg', '**/*.tif'],
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  }
})
