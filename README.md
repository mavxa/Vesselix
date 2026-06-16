# Vesselix

Lightweight local-first Docker dashboard: `docker ps` + `docker logs` + `docker stats` + command palette.

Vesselix is designed as a compact system tool, not a PaaS/admin suite. It runs locally, talks to the Docker socket, and serves the UI from a single binary.

## Install

Generic Linux install from GitHub Releases:

```bash
curl -fsSL https://raw.githubusercontent.com/mavxa/Vesselix/main/install.sh | sh
```

Install a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/mavxa/Vesselix/main/install.sh | VERSION=v0.1.0 sh
```

Install without sudo into a user directory:

```bash
curl -fsSL https://raw.githubusercontent.com/mavxa/Vesselix/main/install.sh | INSTALL_DIR="$HOME/.local/bin" sh
```

## Run

```bash
vesselix
```

Default address:

```text
http://127.0.0.1:4747
```

Custom port:

```bash
vesselix -p 33557
```

Listen on all interfaces:

```bash
vesselix --host 0.0.0.0 --port 4747
```

Environment overrides:

```bash
VESSELIX_HOST=127.0.0.1 VESSELIX_PORT=4747 vesselix
```

## Development

Run the Rust backend/API:

```bash
bun run dev:backend
```

Run the Vite frontend:

```bash
bun run dev
```

Checks:

```bash
bun run lint
bun run build
cargo check --manifest-path backend/Cargo.toml
```

## Packages

Release archives contain one executable with the frontend embedded.

Planned Arch packages:

```text
vesselix-bin
vesselix-git
```

The package installs a systemd unit but does not enable it automatically:

```bash
sudo systemctl enable --now vesselix.service
```
