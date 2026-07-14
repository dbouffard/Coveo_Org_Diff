# Coveo Org Diff

A simple TypeScript + React web application that compares two Coveo organization JSON snapshots and displays the differences.

## Features

- Paste two Coveo organization JSON snapshots side-by-side
- Click **Compare** to compute the structural diff
- Colour-coded tree view: **added** (green), **removed** (red), **changed** (yellow)
- Collapsible tree nodes for nested objects
- Dark-mode support
- Sample data to try the tool instantly

## Getting Started

```bash
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

## Build

```bash
npm run build
```

The production bundle is written to the `dist/` directory.

## Tech Stack

- [Vite](https://vite.dev/) — build tool & dev server
- [React 19](https://react.dev/) + TypeScript — UI
- Custom recursive JSON diff engine (`src/diffUtils.ts`)
