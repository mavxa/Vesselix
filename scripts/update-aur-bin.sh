#!/usr/bin/env bash
set -euo pipefail

version="${1:-}"
repo="${GITHUB_REPOSITORY:-mavxa/Vesselix}"

if [[ -z "$version" ]]; then
  printf 'usage: %s <version|tag>\n' "$0" >&2
  printf 'example: %s v0.1.1\n' "$0" >&2
  exit 2
fi

version="${version#v}"
tag="v${version}"
root="$(git rev-parse --show-toplevel)"
pkgbuild="${root}/packaging/aur/vesselix-bin/PKGBUILD"
service="${root}/packaging/aur/vesselix-bin/vesselix.service"
base_url="https://github.com/${repo}/releases/download/${tag}"

read -r service_hash _ < <(sha256sum "$service")

hash_for() {
  local arch="$1"
  local asset="vesselix-${tag}-linux-${arch}.tar.gz.sha256"
  local line hash _rest

  line="$(curl -fsSL "${base_url}/${asset}")"
  read -r hash _rest <<< "$line"

  if [[ ! "$hash" =~ ^[0-9a-fA-F]{64}$ ]]; then
    printf 'invalid sha256 for %s: %s\n' "$asset" "$hash" >&2
    exit 1
  fi

  printf '%s' "$hash"
}

x86_64_hash="$(hash_for x86_64)"
aarch64_hash="$(hash_for aarch64)"
armv7h_hash="$(hash_for armv7h)"

python3 - "$pkgbuild" "$version" "$service_hash" "$x86_64_hash" "$aarch64_hash" "$armv7h_hash" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
version, service_hash, x86_64_hash, aarch64_hash, armv7h_hash = sys.argv[2:]
text = path.read_text()

replacements = {
    r"^pkgver=.*$": f"pkgver={version}",
    r"^sha256sums=\('.*'\)$": f"sha256sums=('{service_hash}')",
    r"^sha256sums_x86_64=\('.*'\)$": f"sha256sums_x86_64=('{x86_64_hash}')",
    r"^sha256sums_aarch64=\('.*'\)$": f"sha256sums_aarch64=('{aarch64_hash}')",
    r"^sha256sums_armv7h=\('.*'\)$": f"sha256sums_armv7h=('{armv7h_hash}')",
}

for pattern, replacement in replacements.items():
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE)
    if count != 1:
        raise SystemExit(f"failed to update pattern: {pattern}")

path.write_text(text)
PY

printf 'updated %s for %s\n' "$pkgbuild" "$tag"
