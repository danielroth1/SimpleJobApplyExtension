#!/usr/bin/env node
// Generate PNG icons from src/icons/icon.ico into public/icons
// Sizes: 16, 32, 48, 128

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { parseICO } from 'icojs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ROOT = path.resolve(__dirname, '..')
const SRC_ICO = path.resolve(ROOT, 'src/icons/icon.ico')
const OUT_DIR = path.resolve(ROOT, 'public/icons')
const SIZES = [16, 32, 48, 128]

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function fileExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const exists = await fileExists(SRC_ICO)
  if (!exists) {
    console.error('[generate-icons] Missing source icon:', SRC_ICO)
    console.error('Place your base icon at src/icons/icon.ico')
    process.exitCode = 1
    return
  }

  const icoBuffer = await fs.readFile(SRC_ICO)

  // Parse ICO and pick the largest embedded image
  const images = await parseICO(icoBuffer, 'image/png')
  if (!images || images.length === 0) {
    console.error('[generate-icons] No images found in ICO file')
    process.exitCode = 1
    return
  }

  const largest = images.reduce((a, b) => (a.width >= b.width ? a : b))
  const largestPng = Buffer.from(largest.buffer)

  await ensureDir(OUT_DIR)

  // Write target sizes
  await Promise.all(
    SIZES.map(async (size) => {
      const outPath = path.join(OUT_DIR, `icon${size}.png`)
      const img = sharp(largestPng)
      await img.resize(size, size, { fit: 'cover' }).png().toFile(outPath)
      console.log(`[generate-icons] Wrote ${path.relative(ROOT, outPath)}`)
    })
  )

  console.log('[generate-icons] Done')
}

main().catch((err) => {
  console.error('[generate-icons] Error:', err)
  process.exitCode = 1
})
