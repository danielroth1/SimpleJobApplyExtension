import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-firefox-manifest',
      closeBundle() {
        // Read version from package.json to sync across manifests
        const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))
        const version = packageJson.version
        
        // Always copy Firefox manifest for web-ext builds
        // MV3 side_panel is not well supported in Firefox yet
        try {
          const manifestPath = path.resolve(__dirname, 'public/manifest-firefox.json')
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
          
          // Update version from package.json
          manifest.version = version
          
          // Write to dist
          writeFileSync(
            path.resolve(__dirname, 'dist/manifest.json'),
            JSON.stringify(manifest, null, 2)
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
          console.log(`✓ Copied Firefox MV2 manifest with version ${version}`)
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
