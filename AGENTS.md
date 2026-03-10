# Repository Guidelines

## Project Structure & Module Organization
This repository is a desktop app built with Tauri 2, React 19, Vite 7, and TypeScript.
- `src/`: frontend code. Routes live in `src/routes/` (for example `index.tsx`, `collect.tsx`, `about.tsx`), shared styles in `src/index.css` and `src/App.css`.
- `src-tauri/`: Rust backend and native packaging config (`src-tauri/src/`, `Cargo.toml`, `tauri.conf.json`, icons in `src-tauri/icons/`).
- `public/`: static frontend assets served by Vite.
- `dist/`: generated frontend build output (do not edit manually).

## Build, Test, and Development Commands
Use Bun for JavaScript tasks and Cargo for Rust checks.
- `bun run dev`: start Vite dev server.
- `bun run build`: run `tsc` then build frontend assets into `dist/`.
- `bun run preview`: preview the built frontend locally.
- `bun run tauri dev`: run full desktop app in development mode.
- `bun run tauri build`: build native desktop bundles.
- `cd src-tauri && cargo check`: validate Rust backend code quickly.

## Coding Style & Naming Conventions
- TypeScript/React: 2-space indentation, semicolons, ES module syntax, and functional components.
- Route files use lowercase names matching paths (for example `about.tsx`, `collect.tsx`).
- Rust: follow `rustfmt` defaults; keep modules and functions in `snake_case`, types in `CamelCase`.
- Prefer small, focused route components and keep Tauri-specific logic close to integration points.

## Testing Guidelines
There is currently no dedicated frontend test framework configured. Until one is added:
- run `bun run build` before opening a PR to catch TypeScript and bundling regressions;
- run `cd src-tauri && cargo check` for Rust changes.
When adding tests, place frontend tests next to source as `*.test.ts(x)` and Rust tests in `src-tauri/src/` with `#[cfg(test)]`.

## Commit & Pull Request Guidelines
Current history is minimal (`web版获取视频页面`), so adopt a clear convention now:
- commit format: `<type>: <short summary>` (for example `feat: add collect route loading state`);
- use common types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.

PRs should include:
- a concise description of behavior changes;
- linked issue/task if available;
- screenshots or short recordings for UI updates;
- verification notes listing commands run (for example `bun run build`, `cargo check`).

## Security & Configuration Tips
- Keep app identifier and bundle metadata in `src-tauri/tauri.conf.json`.
- Do not commit secrets; use environment-based configuration when introducing external services.
