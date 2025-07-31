#!/usr/bin/env node
const { spawnSync } = require('child_process')
const { readdirSync, existsSync } = require('fs')

const files = readdirSync('./tests').filter(f => /\.test\.(js|ts)$/.test(f))

for (const file of files) {
  const result = spawnSync('npx', ['tsx', `tests/${file}`], { stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status)
  }
}

if (existsSync('__tests__')) {
  const jest = spawnSync('npx', ['jest'], { stdio: 'inherit' })
  if (jest.status !== 0) {
    process.exit(jest.status)
  }
}
