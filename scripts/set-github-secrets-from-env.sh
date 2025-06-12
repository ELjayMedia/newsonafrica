#!/usr/bin/env bash

# Usage: ./scripts/set-github-secrets-from-env.sh [env_file]
# Default env_file is .env.github if present, otherwise .env

set -euo pipefail

ENV_FILE="${1:-.env.github}"

if [ ! -f "$ENV_FILE" ]; then
  if [ -f .env ]; then
    ENV_FILE=".env"
  else
    echo "Environment file $ENV_FILE not found" >&2
    exit 1
  fi
fi

echo "Using environment file: $ENV_FILE"

# check for gh cli
if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI 'gh' not found. Install from https://cli.github.com/" >&2
  exit 1
fi

# ensure logged in
if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI not authenticated. Running 'gh auth login'..." >&2
  gh auth login
fi

# read env file line by line
while IFS='=' read -r key value; do
  # skip comments and empty lines
  [[ -z "$key" || "$key" == \#* ]] && continue
  echo "Setting secret $key"
  gh secret set "$key" --body "$value"

done < "$ENV_FILE"

echo "Secrets uploaded from $ENV_FILE"
