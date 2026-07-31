# Local Tracer development commands

default:
    @just --list

# Dev-only tools (installed to .cargo/bin, not used in Docker/production)
install-dev:
    cargo install cargo-watch --version "=8.5.3" --root .cargo

dev:
    #!/usr/bin/env bash
    set -euo pipefail
    root="{{justfile_directory()}}"
    export PATH="$root/.cargo/bin:$PATH"

    db_path="${LT_DATABASE_PATH:-./data/local-tracer.db}"
    if [[ "$db_path" != /* ]]; then
        db_path="$root/$db_path"
    fi
    snapshot_path="${db_path%.db}-readonly.db"

    snapshot_once() {
        local src="$1" dst="$2"
        [[ -f "$src" ]] || return 0
        cp "$src" "${dst}.tmp" && mv "${dst}.tmp" "$dst"
        if [[ -f "${src}.wal" ]]; then
            cp "${src}.wal" "${dst}.wal.tmp" && mv "${dst}.wal.tmp" "${dst}.wal"
        else
            rm -f "${dst}.wal"
        fi
    }

    if [[ -f "$db_path" ]]; then
        pids=$(lsof -t "$db_path" 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            echo "Releasing database lock on $db_path"
            while IFS= read -r pid; do
                [[ -z "$pid" || "$pid" -eq $$ ]] && continue
                comm=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
                echo "  stopping $comm (PID $pid)"
                kill "$pid" 2>/dev/null || true
            done <<< "$pids"
            sleep 0.5
            pids=$(lsof -t "$db_path" 2>/dev/null || true)
            if [[ -n "$pids" ]]; then
                while IFS= read -r pid; do
                    [[ -z "$pid" || "$pid" -eq $$ ]] && continue
                    comm=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
                    echo "  force stopping $comm (PID $pid)"
                    kill -9 "$pid" 2>/dev/null || true
                done <<< "$pids"
            fi
        fi
    fi

    if ! command -v cargo-watch >/dev/null; then
        just install-dev
    fi
    trap 'kill 0' EXIT
    echo "Read-only snapshot → $snapshot_path (every 5s)"
    (
        while true; do
            snapshot_once "$db_path" "$snapshot_path" || true
            sleep 5
        done
    ) &
    cargo watch -x 'run -p api' -w apps -w packages &
    pnpm dev &
    wait

build:
    cargo build --workspace --release
    pnpm build

test:
    cargo test --workspace

docker-up:
    docker compose up --build

docker-down:
    docker compose down
