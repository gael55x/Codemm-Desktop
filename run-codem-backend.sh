#!/usr/bin/env bash

# Simple helper script to run the Codem backend together with
# the Java judge Docker image used for compiling and running tests.
#
# Usage:
#   chmod +x run-codem-backend.sh
#   ./run-codem-backend.sh
#   ./run-codem-backend.sh --agent-mode dynamic --trace
#
# Requirements:
#   - Docker installed and running
#   - Node.js + npm installed
#   - CODEX_API_KEY set in Codem-backend/.env (or in your shell env)
#   - Optional: CODEX_MODEL (default gpt-4.1), CODEX_BASE_URL for self-hosted Codex

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}"
cd "${BACKEND_DIR}"

usage() {
  cat <<'EOF'
Usage:
  ./run-codem-backend.sh [options]

Options:
  --agent-mode <mode>     Sets CODEMM_AGENT_MODE (e.g. dynamic)
  --dynamic               Shortcut for --agent-mode dynamic
  --trace                 Sets CODEMM_TRACE=1
  --no-trace              Sets CODEMM_TRACE=0
  --port <number>         Sets PORT (default: 4000)
  --rebuild-judge         Rebuild codem-java-judge image (same as REBUILD_JUDGE=1)
  --no-build              Skip TypeScript build step
  --dev                   Start via `npm run dev` (implies --no-build)
  -h, --help              Show this help

Examples:
  CODEMM_AGENT_MODE=dynamic CODEMM_TRACE=1 ./run-codem-backend.sh
  ./run-codem-backend.sh --dynamic --trace
  ./run-codem-backend.sh --dev --trace --port 4000
EOF
}

agent_mode="${CODEMM_AGENT_MODE:-}"
trace_flag="${CODEMM_TRACE:-}"
port_override="${PORT:-}"
rebuild_judge="${REBUILD_JUDGE:-0}"
do_build="1"
start_cmd=("npm" "start")

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent-mode)
      agent_mode="${2:-}"
      shift 2
      ;;
    --dynamic)
      agent_mode="dynamic"
      shift
      ;;
    --trace)
      trace_flag="1"
      shift
      ;;
    --no-trace)
      trace_flag="0"
      shift
      ;;
    --port)
      port_override="${2:-}"
      shift 2
      ;;
    --rebuild-judge)
      rebuild_judge="1"
      shift
      ;;
    --no-build)
      do_build="0"
      shift
      ;;
    --dev)
      do_build="0"
      start_cmd=("npm" "run" "dev")
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo >&2
      usage >&2
      exit 2
      ;;
  esac
done

echo "=== Codem backend ==="
echo "Repo: ${BACKEND_DIR}"

if [[ -n "${agent_mode}" ]]; then
  export CODEMM_AGENT_MODE="${agent_mode}"
fi
if [[ -n "${trace_flag}" ]]; then
  export CODEMM_TRACE="${trace_flag}"
fi
if [[ -n "${port_override}" ]]; then
  export PORT="${port_override}"
fi

# 1) Ensure npm dependencies are installed
if [[ ! -d node_modules ]]; then
  echo "[1/3] Installing npm dependencies..."
  npm install
else
  echo "[1/3] npm dependencies already installed."
fi

# 2) Ensure the codem-java-judge Docker image exists
echo "[2/3] Checking codem-java-judge Docker image..."
if [[ "${rebuild_judge}" == "1" ]]; then
  echo "REBUILD_JUDGE=1 set. Removing running containers and rebuilding codem-java-judge..."
  RUNNING_CONTAINERS=$(docker ps -aq --filter ancestor=codem-java-judge)
  if [[ -n "${RUNNING_CONTAINERS}" ]]; then
    docker rm -f ${RUNNING_CONTAINERS}
  fi
  docker image rm -f codem-java-judge:latest >/dev/null 2>&1 || true
  docker build -f Dockerfile.java-judge -t codem-java-judge .
elif ! docker image inspect codem-java-judge:latest >/dev/null 2>&1; then
  echo "codem-java-judge image not found. Building from Dockerfile.java-judge..."
  docker build -f Dockerfile.java-judge -t codem-java-judge .
else
  echo "codem-java-judge image found."
fi

# 3) Build and start the backend
if [[ "${do_build}" == "1" ]]; then
  echo "[3/3] Building backend (TypeScript -> dist)..."
  npm run build
else
  echo "[3/3] Skipping build."
fi

echo
echo "Starting Codem backend on port ${PORT:-4000}..."
if [[ -n "${CODEMM_AGENT_MODE:-}" ]]; then
  echo "CODEMM_AGENT_MODE=${CODEMM_AGENT_MODE}"
fi
if [[ -n "${CODEMM_TRACE:-}" ]]; then
  echo "CODEMM_TRACE=${CODEMM_TRACE}"
fi
echo "Press Ctrl+C to stop."
echo

"${start_cmd[@]}"
