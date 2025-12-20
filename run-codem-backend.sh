#!/usr/bin/env bash

# Simple helper script to run the Codem backend together with
# the Java judge Docker image used for compiling and running tests.
#
# Usage:
#   chmod +x run-codem-backend.sh
#   ./run-codem-backend.sh
#   ./run-codem-backend.sh --trace
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
  --trace                 Sets CODEMM_TRACE=1
  --no-trace              Sets CODEMM_TRACE=0
  --workspace-gen         Sets CODEMM_WORKSPACE_GEN=1 (generate workspace-style problems for easy Java slots)
  --no-workspace-gen      Sets CODEMM_WORKSPACE_GEN=0
  --port <number>         Sets PORT (default: 4000)
  --rebuild-judge         Rebuild codem-java-judge image (same as REBUILD_JUDGE=1)
  --no-build              Skip TypeScript build step
  --dev                   Start via `npm run dev` (implies --no-build)
  -h, --help              Show this help

Examples:
  CODEMM_TRACE=1 ./run-codem-backend.sh
  ./run-codem-backend.sh --trace
  ./run-codem-backend.sh --dev --trace --port 4000
EOF
}

agent_mode="${CODEMM_AGENT_MODE:-dynamic}"
trace_flag="${CODEMM_TRACE:-}"
workspace_gen_flag="${CODEMM_WORKSPACE_GEN:-}"
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
    --workspace-gen)
      workspace_gen_flag="1"
      shift
      ;;
    --no-workspace-gen)
      workspace_gen_flag="0"
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

if [[ "${agent_mode}" != "dynamic" ]]; then
  echo "WARNING: CODEMM_AGENT_MODE=${agent_mode} requested, but legacy mode has been removed; using dynamic." >&2
  agent_mode="dynamic"
fi
export CODEMM_AGENT_MODE="${agent_mode}"

if [[ -n "${trace_flag}" ]]; then
  export CODEMM_TRACE="${trace_flag}"
fi
if [[ -n "${workspace_gen_flag}" ]]; then
  export CODEMM_WORKSPACE_GEN="${workspace_gen_flag}"
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

# 2) Ensure the judge Docker images exist
echo "[2/3] Checking judge Docker images..."
if [[ "${rebuild_judge}" == "1" ]]; then
  echo "REBUILD_JUDGE=1 set. Removing running containers and rebuilding judge images..."
  RUNNING_CONTAINERS=$(docker ps -aq --filter ancestor=codem-java-judge)
  if [[ -n "${RUNNING_CONTAINERS}" ]]; then
    docker rm -f ${RUNNING_CONTAINERS}
  fi
  docker image rm -f codem-java-judge:latest >/dev/null 2>&1 || true
  docker build -f Dockerfile.java-judge -t codem-java-judge .
  RUNNING_CONTAINERS_PY=$(docker ps -aq --filter ancestor=codem-python-judge)
  if [[ -n "${RUNNING_CONTAINERS_PY}" ]]; then
    docker rm -f ${RUNNING_CONTAINERS_PY}
  fi
  docker image rm -f codem-python-judge:latest >/dev/null 2>&1 || true
  docker build -f Dockerfile.python-judge -t codem-python-judge .
elif ! docker image inspect codem-java-judge:latest >/dev/null 2>&1; then
  echo "codem-java-judge image not found. Building from Dockerfile.java-judge..."
  docker build -f Dockerfile.java-judge -t codem-java-judge .
else
  echo "codem-java-judge image found."
fi

if ! docker image inspect codem-python-judge:latest >/dev/null 2>&1; then
  echo "codem-python-judge image not found. Building from Dockerfile.python-judge..."
  docker build -f Dockerfile.python-judge -t codem-python-judge .
else
  echo "codem-python-judge image found."
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
if [[ -n "${CODEMM_WORKSPACE_GEN:-}" ]]; then
  echo "CODEMM_WORKSPACE_GEN=${CODEMM_WORKSPACE_GEN}"
fi
echo "Press Ctrl+C to stop."
echo

"${start_cmd[@]}"
