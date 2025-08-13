# Dependency Update Policy

This project uses [Renovate](https://github.com/renovatebot/renovate) to keep dependencies up to date.

- Renovate opens pull requests with dependency upgrades.
- Pull requests are limited to 2 per hour and 5 open at a time.
- Updates to Next.js, React, and React DOM are grouped together.
- **No automerging**: every update requires a maintainer review.
- All CI checks, including tests and linting, must pass before merging.

These rules help us keep dependencies fresh while ensuring stability.

