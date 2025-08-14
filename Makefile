.PHONY: dev build test typecheck lint format

dev:
	pnpm dev

build:
	pnpm build

test:
        pnpm test

test\:e2e:
        pnpm test:e2e

typecheck:
        pnpm typecheck

lint:
	pnpm lint

format:
        pnpm format
