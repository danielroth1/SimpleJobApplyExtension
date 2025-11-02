import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyFileSync } from 'node:fs'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-firefox-manifest',
      closeBundle() {
        // Always copy Firefox manifest for web-ext builds
        // MV3 side_panel is not well supported in Firefox yet
        try {
          copyFileSync(
            path.resolve(__dirname, 'public/manifest-firefox.json'),
            path.resolve(__dirname, 'dist/manifest.json')
          )
          // Copy custom icon from src into dist so manifests referencing "icon.ico" can find it
          try {
            copyFileSync(
              path.resolve(__dirname, 'src/icon.ico'),
              path.resolve(__dirname, 'dist/icon.ico')
            )
            console.log('✓ Copied icon.ico to dist')
          } catch (e) {
            console.warn('Could not copy icon.ico to dist:', e)
          }
          console.log('✓ Copied Firefox MV2 manifest')
        } catch (e) {
          console.warn('Could not copy Firefox manifest:', e)
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
  base: './',
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
