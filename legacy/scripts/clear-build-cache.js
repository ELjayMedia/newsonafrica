import { rmSync } from 'fs'
import { join } from 'path'

const paths = ['.next', 'dist', 'out', 'node_modules/.cache']

paths.forEach(path => {
  try {
    rmSync(join(process.cwd(), path), { recursive: true, force: true })
    console.log(`Cleared: ${path}`)
  } catch (err) {
    console.log(`Skipped: ${path}`)
  }
})

console.log('Build cache cleared successfully')
