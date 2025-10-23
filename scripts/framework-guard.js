#!/usr/bin/env node
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.bmp',
  '.mp4',
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  '.webm',
  '.pdf',
  '.zip',
  '.gz',
  '.ttf',
  '.woff',
  '.woff2',
  '.eot',
])

function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

const SCRIPT_RELATIVE_PATH = path.normalize('scripts/framework-guard.js')

function findSvelteReferences(files) {
  const matches = []
  const pattern = /svelte/gi

  for (const file of files) {
    if (!file || isBinaryFile(file)) {
      continue
    }

    if (path.normalize(file) === SCRIPT_RELATIVE_PATH) {
      continue
    }

    try {
      const contents = fs.readFileSync(file, 'utf8')
      pattern.lastIndex = 0
      if (pattern.test(contents)) {
        matches.push(file)
      }
    } catch (error) {
      // Skip files that cannot be read as UTF-8 (e.g., generated assets)
      continue
    }
  }

  return matches
}

function main() {
  const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const matches = findSvelteReferences(trackedFiles)

  if (matches.length > 0) {
    console.error('Found unexpected references to "svelte" in the following files:')
    for (const match of matches) {
      console.error(` - ${match}`)
    }
    console.error('\nPlease remove these references to keep the project Svelte-free.')
    process.exitCode = 1
    return
  }

  console.log('No references to "svelte" found in tracked project files.')
}

main()
