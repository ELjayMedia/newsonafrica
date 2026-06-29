#!/usr/bin/env node
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const DAL_DIR = path.resolve('lib/dal')

async function main() {
  let entries
  try {
    entries = await readdir(DAL_DIR, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }

    throw error
  }

  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.ts'))

  const postgrestAliases = files.filter((name) => name.endsWith('-postgrest.ts'))
  const duplicatePairs = postgrestAliases.filter((name) => files.includes(name.replace('-postgrest.ts', '.ts')))

  if (duplicatePairs.length > 0) {
    console.error('Parallel DAL alias files are not allowed in lib/dal:')
    for (const fileName of duplicatePairs) {
      const sibling = fileName.replace('-postgrest.ts', '.ts')
      console.error(`- ${fileName} duplicates ${sibling}`)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
