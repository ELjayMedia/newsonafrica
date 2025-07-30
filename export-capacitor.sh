#!/bin/bash
set -e
npm run build
npx next export -o out

