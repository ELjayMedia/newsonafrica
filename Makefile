.PHONY: dev build test typecheck lint format perf

dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test

typecheck:
	pnpm typecheck

lint:
	pnpm lint

format:
	pnpm format

perf:
	pnpm lhci
