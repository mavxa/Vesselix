#!/usr/bin/env sh
set -eu

REPO="${VESSELIX_REPO:-mavxa/Vesselix}"
VERSION="${VERSION:-latest}"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
BINARY="vesselix"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'error: required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

detect_arch() {
  machine="$(uname -m)"
  case "$machine" in
    x86_64 | amd64) printf 'x86_64' ;;
    aarch64 | arm64) printf 'aarch64' ;;
    armv7l | armv7 | armhf) printf 'armv7h' ;;
    *)
      printf 'error: unsupported architecture: %s\n' "$machine" >&2
      exit 1
      ;;
  esac
}

latest_tag() {
  curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' \
    | sed -n '1p'
}

install_file() {
  src="$1"
  dst="$2"

  if [ -w "$(dirname "$dst")" ]; then
    install -m 755 "$src" "$dst"
  elif command -v sudo >/dev/null 2>&1; then
    sudo install -m 755 "$src" "$dst"
  else
    printf 'error: %s is not writable and sudo is not available\n' "$(dirname "$dst")" >&2
    exit 1
  fi
}

need curl
need sed
need sha256sum
need tar
need install

os="$(uname -s)"
if [ "$os" != "Linux" ]; then
  printf 'error: install.sh supports Linux only; download Windows zip manually from GitHub Releases\n' >&2
  exit 1
fi

if [ "$VERSION" = "latest" ]; then
  VERSION="$(latest_tag)"
  if [ -z "$VERSION" ]; then
    printf 'error: failed to resolve latest Vesselix release\n' >&2
    exit 1
  fi
fi

version_no_v="${VERSION#v}"
tag="v${version_no_v}"
arch="$(detect_arch)"
asset="vesselix-${tag}-linux-${arch}.tar.gz"
base_url="https://github.com/${REPO}/releases/download/${tag}"
tmp="$(mktemp -d)"

cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT INT TERM

printf 'Installing Vesselix %s for linux-%s\n' "$tag" "$arch"

curl -fsSL "${base_url}/${asset}" -o "${tmp}/${asset}"
curl -fsSL "${base_url}/${asset}.sha256" -o "${tmp}/${asset}.sha256"

expected_hash="$(sed -n '1s/[[:space:]].*//p' "${tmp}/${asset}.sha256")"
actual_hash="$(sha256sum "${tmp}/${asset}" | sed -n '1s/[[:space:]].*//p')"
if [ "$expected_hash" != "$actual_hash" ]; then
  printf 'error: checksum mismatch for %s\n' "$asset" >&2
  printf 'expected: %s\n' "$expected_hash" >&2
  printf 'actual:   %s\n' "$actual_hash" >&2
  exit 1
fi

tar -xzf "${tmp}/${asset}" -C "$tmp"

if [ ! -f "${tmp}/${BINARY}" ]; then
  printf 'error: release archive does not contain %s\n' "$BINARY" >&2
  exit 1
fi

mkdir -p "$INSTALL_DIR" 2>/dev/null || true
install_file "${tmp}/${BINARY}" "${INSTALL_DIR}/${BINARY}"

printf 'Vesselix installed to %s\n' "${INSTALL_DIR}/${BINARY}"
printf 'Run: %s\n' "${INSTALL_DIR}/${BINARY}"
