#!/usr/bin/env bash
# Run WP-CLI against the NOA headless WordPress (Coolify service fv3fqo7fe0dryfdgho4xcceg).
# Usage: sudo noa-wp-cli.sh <wp-cli args...>   e.g. sudo noa-wp-cli.sh plugin list
set -euo pipefail
W=wordpress-fv3fqo7fe0dryfdgho4xcceg
CLI_IMAGE='wordpress:cli-2.12.0-php8.4@sha256:37b7e3ed9b537788756f9b5c6dd8ec7c3f3053ee707abc67c776e453ba8f9e55'
envf=$(mktemp); trap 'rm -f "$envf"' EXIT; chmod 600 "$envf"
docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$W" | grep -E '^(WORDPRESS_|NOA_)' | grep -v '^WORDPRESS_CONFIG_EXTRA=' > "$envf"
extra=$(docker inspect "$W" | jq -r '.[0].Config.Env[]|select(startswith("WORDPRESS_CONFIG_EXTRA="))|sub("^WORDPRESS_CONFIG_EXTRA=";"")')
exec docker run --rm -i --user 33:33 --volumes-from "$W" --network "container:$W" --env-file "$envf" -e WORDPRESS_CONFIG_EXTRA="$extra" -e HOME=/tmp -e HTTP_HOST=cms.newsonafrica.com "$CLI_IMAGE" wp --path=/var/www/html "$@"
