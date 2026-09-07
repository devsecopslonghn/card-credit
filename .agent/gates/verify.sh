#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
level="${1:-default}"

if [[ "$level" != "default" && "$level" != "full" ]]; then
  echo "usage: $0 [default|full]" >&2
  exit 2
fi

run() {
  echo "+ $*"
  "$@"
}

cd "$repo_root"

run npm --prefix shared run validate
run npm --prefix frontend run typecheck
run npm --prefix frontend run lint
run npm --prefix frontend run test:critical
run npm --prefix frontend run build
run npm --prefix backend run validate

if [[ "$level" == "full" ]]; then
  run npm --prefix shared run test:all
  run npm --prefix frontend run test:all
  run npm --prefix backend run test:all
fi

echo "Verification passed: $level"
