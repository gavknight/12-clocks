# CLAUDE.md — New Game

## Project
2D game built with BabylonJS 8, Vite 7, TypeScript 5.

## Commands
- `npm run dev` — start dev server (localhost:5173)
- `npm run build` — type-check + production build
- `npm run preview` — preview production build

## Key Conventions
- **2D only** — always use orthographic camera, never perspective
- **Tree-shaking** — import BabylonJS modules from deep paths (e.g. `@babylonjs/core/scene`), not from the barrel `@babylonjs/core`
- **Scene classes** live in `src/scenes/`, game logic in `src/entities/`
- **InputManager** (`src/input/InputManager.ts`) is the single source of truth for keyboard state
- Inspector is dev-only — gated by `import.meta.env.DEV`

## Progress Tracking
Keep `docs/mission_control.md` up to date as phases are completed.
