# smart-artifacts

Reusable GitHub Actions for uploading and downloading artifacts—adaptively using GitHub's native service or falling back to a local ACT simulation.

## Actions

- `upload/` — Adaptive upload action
- `download/` — Adaptive download action
- `act-upload/` — ACT-only local upload fallback
- `act-download/` — ACT-only local download fallback

## Features

- ✅ GitHub-native upload/download when available
- ✅ Simulates upload/download under ACT when offline
- ✅ Supports folders, files, glob patterns, symlinks
- ✅ Full overwrite protection
- ✅ Retention and size limit validation
- ✅ Cross-platform compatible (Linux, macOS, Windows)
- ✅ Type-safe with TypeScript fallback logic
- ✅ Marketplace-ready publishing

## Usage examples, inputs, and fallback detection will follow in dedicated READMEs and the main documentation.
