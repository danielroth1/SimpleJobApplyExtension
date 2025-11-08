import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Reliable browser target detection for manifest copying.
  // Preferred: pass `--mode firefox` for Firefox builds.
  // Fallbacks: set EXT_BROWSER=firefox or BROWSER/TARGET=firefox or FIREFOX=1.
  const browserEnv = (process.env.EXT_BROWSER || process.env.BROWSER || process.env.TARGET || '').toLowerCase()
  const isFirefox = (
    mode === 'firefox' || // explicit --mode firefox
    process.env.FIREFOX === '1' || // explicit env flag FIREFOX=1
    browserEnv === 'firefox'
  )
  console.log(`Building for ${isFirefox ? 'Firefox' : 'Chrome'} target...`)
  console.log('EXT_BROWSER/BROWSER/TARGET:', browserEnv || '(not set)')
  console.log('browserEnv value:', process.env.FIREFOX)

  return {
    plugins: [
      react(),
      {
        name: 'copy-extension-manifest',
        closeBundle() {
          // Read version from package.json to sync across manifests
          const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'))
          const version = packageJson.version

          try {
            const manifestFile = isFirefox ? 'public/manifest-firefox.json' : 'public/manifest.json'
            const manifestPath = path.resolve(__dirname, manifestFile)
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
                path.resolve(__dirname, 'src/icons/icon.ico'),
                path.resolve(__dirname, 'dist/icon.ico')
              )
              console.log('✓ Copied icon.ico to dist')
            } catch (e) {
              console.warn('Could not copy icon.ico to dist:', e)
            }

            // Helpful diagnostics when building under watch or CI
            console.log('[build] mode:', mode)
            console.log('[build] ENV EXT_BROWSER/BROWSER/TARGET:', browserEnv || '(not set)')
            console.log('[build] Resolved target:', isFirefox ? 'firefox' : 'chrome')
            if (isFirefox) {
              console.log(`✓ Copied Firefox MV2 manifest with version ${version}`)
            } else {
              console.log(`✓ Copied Chrome MV3 manifest with version ${version}`)
            }
          } catch (e) {
            console.warn('Could not copy manifest:', e)
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
  }
})
