# smart-artifacts

Adaptive artifact actions that prefer GitHub’s artifact service and transparently fall back to a local ACT-like store. Cross‑platform with Node (no Bash).

## Actions

- `upload/` — Adaptive upload (service first, fallback to ACT simulation)
- `download/` — Adaptive download (service first, fallback to ACT simulation)
- `act-upload/` — ACT-only upload simulation (Node)
- `act-download/` — ACT-only download simulation (Node)

## Usage

Upload (adaptive):
```yaml
- uses: banee-io/smart-artifacts/upload@v1
  with:
    name: api-dist
    path: api/dist
    overwrite: true
```

Download (adaptive):
```yaml
- uses: banee-io/smart-artifacts/download@v1
  with:
    name: api-dist
    path: api/dist
```

ACT-only:
```yaml
- uses: banee-io/smart-artifacts/act-upload@v1
  with:
    name: api-dist
    path: api/dist/*.zip
```

## Fallback Detection

Uses GitHub's artifact service when `ACTIONS_RUNTIME_TOKEN` and `ACTIONS_RUNTIME_URL` are set and `ACT != 'true'`. Otherwise falls back to Node-based ACT simulation.

## Notes

- Fallback supports directory, single file, and `**/*`, `*`, `?` globs
- Globs preserve paths relative to the workspace
- `overwrite` is honored in both service and fallback
- `if-no-files-found` applies in both paths (`error` | `warn` | `ignore`)
- Symlinks are copied as file contents for portability (Windows-safe)
