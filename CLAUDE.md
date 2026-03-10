# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Full Tauri app (frontend + backend)
bun run tauri dev       # Development mode with hot reload
bun run tauri build     # Production build

# Frontend only
bun run dev             # Vite dev server at http://localhost:1420
bun run build           # TypeScript compile + Vite build
```

There are no test commands configured. Rust tests can be run with `cargo test` inside `src-tauri/`.

## Architecture

This is a **Tauri v2 desktop app** with a React frontend and Rust backend.

**Frontend** (`src/`): React 19 + TypeScript + TailwindCSS v4 + TanStack Router (file-based routing). Routes live in `src/routes/` — `__root.tsx` is the shared layout, `index.tsx` is the home page. The route tree (`src/routeTree.gen.ts`) is auto-generated; never edit it manually.

**Backend** (`src-tauri/src/`): Rust with Tauri v2. Commands exposed to the frontend are defined in `lib.rs` using the `#[tauri::command]` macro and registered in the `tauri::Builder`. Currently has a single `greet` command.

**IPC**: Frontend calls Rust commands via `invoke()` from `@tauri-apps/api/core`. Example:
```ts
import { invoke } from "@tauri-apps/api/core";
const result = await invoke("greet", { name: "World" });
```

**Security**: Capability-based model in `src-tauri/capabilities/default.json`. Any new Tauri plugin permissions must be added there.

**Package manager**: Uses `bun`. Use `bun add` / `bun remove` for frontend dependencies.

**Port**: Vite dev server runs on `1420` (configured in `vite.config.ts` and `tauri.conf.json`).
