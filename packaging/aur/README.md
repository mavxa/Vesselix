# AUR Packaging

Packages:

- `vesselix-bin` installs prebuilt GitHub release artifacts.
- `vesselix-git` builds from the latest git source.

No `.install` script is used. The package installs `vesselix.service`, but users enable it explicitly:

```bash
sudo systemctl enable --now vesselix.service
```

Before publishing `vesselix-bin` locally, update `pkgver` and checksums from a GitHub release:

```bash
./scripts/update-aur-bin.sh v0.1.1
```

The AUR publish workflow runs this script automatically for `vesselix-bin` using the workflow `release` input, so manual checksum copying is not required in CI.

Publishing is manual through `.github/workflows/aur.yml` after the GitHub release exists.
