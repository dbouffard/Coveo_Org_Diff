# Coveo Org Diff

A TypeScript + React web application that compares two Coveo organization JSON snapshots and displays differences **per resource type** (Source, Extension, Query Pipeline, Field, etc.).

## Features

- **File upload** — upload two Coveo snapshot JSON files (no size limit)
- **Per-type report** — results grouped by resource type (SOURCE, QUERY_PIPELINE, EXTENSION, FIELD, …)
- **ID-aware** — unique IDs (`id`, `orgId`, timestamps, …) are excluded from the diff so organization-specific identifiers never show as differences
- **Four states per resource**: ± Changed · + Added · − Removed · = Identical
- **Expandable diffs** — click any changed resource to see exactly which fields changed
- **Dark-mode** support
- **Sample data** button to try the tool immediately

## Snapshot format

The app expects Coveo CLI snapshots (generated with `coveo org:resources:snapshot`):

```json
{
  "id": "...",
  "orgId": "my-org-id",
  "resources": {
    "SOURCE":         { "MySource":   { … } },
    "QUERY_PIPELINE": { "Default":    { … } },
    "EXTENSION":      { "BoostExt":   { … } },
    "FIELD":          { "myfield":    { … } }
  }
}
```

Resources are matched by their **resource name** (the key inside each type object).

## Getting Started

```bash
npm install
npm run dev   # → http://localhost:5173
```

## Build

```bash
npm run build
```

The production bundle is written to the `dist/` directory.

## Tech Stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + TypeScript
- `src/snapshotUtils.ts` — Coveo snapshot parsing & per-type comparison (with ID exclusion)
- `src/diffUtils.ts` — recursive JSON diff engine with configurable key exclusion
- `src/OrgDiffReport.tsx` — per-type report UI
- `src/DiffTree.tsx` — field-level diff tree for individual resources
