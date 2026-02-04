# Security Notes (Codemm-IDE)

## Threat Model (Practical)

- Renderer is untrusted content relative to the OS.
- Codemm runs/grades untrusted user code; **Docker is the sandbox boundary**.
- The Electron app must not become a path to local code execution outside Docker.

## Electron Hardening Checklist

- BrowserWindow:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - no `remote` module
- Navigation control:
  - only load the local frontend URL
  - block unexpected navigations/new windows
- IPC:
  - use `preload` with minimal surface area
  - validate all inputs
  - do not expose filesystem/network primitives directly to the renderer

## Secrets

- Avoid storing provider API keys in the renderer.
- Prefer backend-owned storage (already the model in Codemm).
- Packaging follow-up: consider OS keychain integration (macOS Keychain) or backend encryption-only.

## Docker Boundary

- All compilation/execution/judging remains in Docker.
- The IDE should never run submitted code directly via `child_process` outside Docker.

