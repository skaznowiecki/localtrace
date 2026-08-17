# Local Tracer development commands

default:
    @just --list

dev:
    #!/usr/bin/env bash
    set -euo pipefail
    export LT_DATABASE_PATH="${LT_DATABASE_PATH:-{{justfile_directory()}}/data/local-tracer.db}"
    trap 'kill 0' EXIT
    pnpm --filter @local-tracer/api dev &
    pnpm --filter @local-tracer/web dev &
    wait

migrate:
    #!/usr/bin/env bash
    set -euo pipefail
    export LT_DATABASE_PATH="${LT_DATABASE_PATH:-{{justfile_directory()}}/data/local-tracer.db}"
    pnpm --filter @local-tracer/api migrate

build:
    pnpm build

docker-up:
    docker compose up --build

docker-down:
    docker compose down
