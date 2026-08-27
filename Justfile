# localtrace development commands

default:
    @just --list

# Verify pnpm, bun, node, and that dependencies are installed.
check:
    #!/usr/bin/env bash
    set -euo pipefail
    fail=0

    require() {
      local name="$1" hint="$2"
      if command -v "$name" >/dev/null 2>&1; then
        printf '  ok   %-8s %s\n' "$name" "$(command -v "$name")"
      else
        printf '  miss %-8s %s\n' "$name" "$hint"
        fail=1
      fi
    }

    echo "checking toolchain…"
    require pnpm "install: https://pnpm.io/installation"
    require bun  "install: https://bun.sh"
    require node "install: https://nodejs.org"

    if [[ -d node_modules ]]; then
      printf '  ok   %-8s %s\n' "deps" "node_modules"
    else
      printf '  miss %-8s %s\n' "deps" "run: pnpm install"
      fail=1
    fi

    if [[ "$fail" -ne 0 ]]; then
      echo
      echo "environment is not ready. fix the items above, then re-run."
      exit 1
    fi

dev: check
    #!/usr/bin/env bash
    set -euo pipefail
    export LT_DATABASE_PATH="${LT_DATABASE_PATH:-{{justfile_directory()}}/data/localtrace.db}"
    mkdir -p "$(dirname "$LT_DATABASE_PATH")"
    trap 'kill 0' EXIT
    pnpm --filter @localtrace/api dev &
    pnpm --filter @localtrace/web dev &
    wait

# Wipe the local SQLite file and recreate schema from 001_*.sql.
migrate: check
    #!/usr/bin/env bash
    set -euo pipefail
    export LT_DATABASE_PATH="${LT_DATABASE_PATH:-{{justfile_directory()}}/data/localtrace.db}"
    mkdir -p "$(dirname "$LT_DATABASE_PATH")"
    rm -f "$LT_DATABASE_PATH" "$LT_DATABASE_PATH-wal" "$LT_DATABASE_PATH-shm"
    pnpm --filter @localtrace/api migrate

typecheck: check
    pnpm --filter @localtrace/web exec tsc --noEmit
    pnpm --filter @localtrace/api typecheck

test: check
    pnpm --filter @localtrace/api test

build: check
    pnpm build

docker-up:
    docker compose up --build

docker-down:
    docker compose down

# Build the production image (UI + API) for local smoke tests.
docker-build:
    docker build -t localtrace:dev .
