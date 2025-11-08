#!/usr/bin/env node
/*
 Pack the built extension in `dist/` into a .crx file using the `crx` package.
 Requires a PEM key at project root (dist.pem). Produces chrome-artifacts/simple_job_apply-<version>.crx
*/

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const KEY = path.join(ROOT, 'dist.pem')
const OUT_DIR = path.join(ROOT, 'chrome-artifacts')

async function fileExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await fileExists(DIST))) {
    console.error('[pack-chrome] dist folder not found. Run build first.')
    process.exitCode = 1
    return
  }

  if (!(await fileExists(KEY))) {
    console.error('[pack-chrome] PEM key not found at', KEY)
    console.error('You need a private key (PEM) to sign a CRX. You can reuse your existing dist.pem or generate one with the Chrome tools.')
    process.exitCode = 1
    return
  }

  const pkgJson = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'))
  const version = pkgJson.version || '0.0.0'
  const outName = `simple_job_apply-${version}.crx`
  await fs.mkdir(OUT_DIR, { recursive: true })
  const outPath = path.join(OUT_DIR, outName)
  const outZip = path.join(OUT_DIR, `simple_job_apply-${version}.zip`)

  try {
    // Try to find a local Chrome/Chromium executable
    const candidates = []
    if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH)
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    candidates.push('/Applications/Chromium.app/Contents/MacOS/Chromium')
    candidates.push('google-chrome')
    candidates.push('chromium')

    let chromePath = null
    for (const c of candidates) {
      try {
        // Try access as path or rely on spawn detection
        await fs.access(c)
        chromePath = c
        break
      } catch {
        // ignore
      }
    }

    if (!chromePath) {
      console.error('[pack-chrome] No local Chrome/Chromium executable found. Set CHROME_PATH env var to the binary.')
      process.exitCode = 1
      return
    }

    console.log('[pack-chrome] Using Chrome binary at', chromePath)

    // Prefer using crx3 CLI if available (npx will install/run it). Fall back to Chrome CLI.
    try {
      console.log('[pack-chrome] Attempting to pack with crx3 CLI via npx')
      const npxRes = spawnSync('npx', ['crx3', 'pack', '--private-key', KEY, '--output', outPath, DIST], { stdio: 'inherit' })
      if (npxRes.status === 0) {
        console.log('[pack-chrome] Packed with crx3 ->', outPath)
        // continue to also create a zip artifact below
      }
      console.warn('[pack-chrome] crx3 CLI failed or is not available, falling back to Chrome pack CLI')
    } catch (err) {
      console.warn('[pack-chrome] crx3 attempt failed:', err)
    }

    // Run Chrome pack command as fallback
    const args = [`--pack-extension=${DIST}`, `--pack-extension-key=${KEY}`]
    const res = spawnSync(chromePath, args, { stdio: 'inherit' })
    if (res.error) {
      console.error('[pack-chrome] Failed to execute Chrome:', res.error)
      process.exitCode = 1
      return
    }

    // Chrome will produce a file named `${DIST}.crx` next to the dist folder
    const tempCrx = path.resolve(`${DIST}.crx`)
    if (!(await fileExists(tempCrx))) {
      console.error('[pack-chrome] Expected CRX at', tempCrx, 'but it was not produced')
      process.exitCode = 1
      return
    }

    // Move to chrome-artifacts with versioned name
    await fs.rename(tempCrx, outPath)
    console.log('[pack-chrome] Wrote', outPath)
  } catch (err) {
    console.error('[pack-chrome] Error creating CRX:', err)
    process.exitCode = 1
  }

    // Also create a zip of the dist/ contents for convenience
    try {
      console.log('[pack-chrome] Creating zip artifact at', outZip)
      // Use system zip: zip -r <outZip> .  (run inside dist folder)
      const zipRes = spawnSync('zip', ['-r', outZip, '.'], { cwd: DIST, stdio: 'inherit' })
      if (zipRes.error) {
        console.warn('[pack-chrome] Failed to create zip using system zip:', zipRes.error)
      } else if (zipRes.status !== 0) {
        console.warn('[pack-chrome] zip exited with non-zero status:', zipRes.status)
      } else {
        console.log('[pack-chrome] Wrote zip artifact ->', outZip)
      }
    } catch (err) {
      console.warn('[pack-chrome] Error while creating zip artifact:', err)
    }
}

main()
