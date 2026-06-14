# AUR Packaging

Packages:

- `vesselix-bin` installs prebuilt GitHub release artifacts.
- `vesselix-git` builds from the latest git source.

No `.install` script is used. The package installs `vesselix.service`, but users enable it explicitly:

```bash
sudo systemctl enable --now vesselix.service
```

Before publishing `vesselix-bin`, replace the `SKIP` values in architecture-specific `sha256sums_*` with checksums from the matching GitHub release assets.

Publishing is manual through `.github/workflows/aur.yml` after the GitHub release exists.
