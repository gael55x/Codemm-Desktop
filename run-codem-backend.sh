#!/usr/bin/env bash

# One-command runner for Codemm backend + judge images.
# It installs npm deps (if needed), builds Docker judge images (if needed),
# then starts the backend (dev by default).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${SCRIPT_DIR}"
cd "${BACKEND_DIR}"

BACKEND_MODE="${BACKEND_MODE:-dev}" # dev | prod
REBUILD_JUDGE="${REBUILD_JUDGE:-0}"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

ensure_npm_deps() {
  if [[ -d node_modules ]]; then
    echo "[1/3] npm dependencies already installed."
    return
  fi
  echo "[1/3] Installing npm dependencies..."
  npm install
}

ensure_docker_running() {
  docker info >/dev/null 2>&1 || die "Docker is not running (start Docker Desktop / dockerd)."
}

stop_containers_by_image() {
  local image="$1"
  local ids
  ids="$(docker ps -aq --filter "ancestor=${image}")"
  if [[ -n "${ids}" ]]; then
    docker rm -f ${ids} >/dev/null
  fi
}

ensure_image() {
  local image="$1"
  local dockerfile="$2"

  if [[ "${REBUILD_JUDGE}" == "1" ]]; then
    stop_containers_by_image "${image}"
    docker image rm -f "${image}:latest" >/dev/null 2>&1 || true
  fi

  if docker image inspect "${image}:latest" >/dev/null 2>&1; then
    echo "${image} image found."
    return
  fi

  echo "${image} image not found. Building from ${dockerfile}..."
  docker build -f "${dockerfile}" -t "${image}" .
}

start_backend() {
  local port="${PORT:-4000}"
  echo
  echo "Starting Codem backend on port ${port} (mode=${BACKEND_MODE})..."
  [[ -n "${CODEMM_TRACE:-}" ]] && echo "CODEMM_TRACE=${CODEMM_TRACE}"
  [[ -n "${CODEMM_WORKSPACE_GEN:-}" ]] && echo "CODEMM_WORKSPACE_GEN=${CODEMM_WORKSPACE_GEN}"
  echo "Press Ctrl+C to stop."
  echo

  if [[ "${BACKEND_MODE}" == "prod" ]]; then
    npm run build
    npm start
    return
  fi

  if [[ "${BACKEND_MODE}" == "dev" ]]; then
    npm run dev
    return
  fi

  die "Unknown BACKEND_MODE=${BACKEND_MODE} (expected dev or prod)"
}

echo "=== Codem backend ==="
echo "Repo: ${BACKEND_DIR}"
need_cmd node
need_cmd npm
need_cmd docker

ensure_npm_deps

echo "[2/3] Ensuring judge Docker images..."
ensure_docker_running
ensure_image "codem-java-judge" "Dockerfile.java-judge"
ensure_image "codem-python-judge" "Dockerfile.python-judge"
ensure_image "codem-cpp-judge" "Dockerfile.cpp-judge"

echo "[3/3] Starting backend..."
start_backend
