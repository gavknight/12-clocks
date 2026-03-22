# Mission Control — New Game

## Project Overview
A 2D game built with BabylonJS + Vite + TypeScript.

---

## Tech Stack
| Tool | Version | Purpose |
|------|---------|---------|
| BabylonJS Core | ^8.53.0 | Rendering engine |
| BabylonJS GUI | ^8.53.0 | In-game UI |
| BabylonJS Inspector | ^8.53.0 | Dev-time scene debugger |
| Vite | ^7.3.1 | Build tool & dev server |
| TypeScript | ~5.9.3 | Language |

---

## Folder Structure
```
src/
  main.ts          — Entry point
  game/
    Game.ts        — Engine init, render loop
  scenes/
    MainScene.ts   — Active scene (orthographic camera, inspector)
  entities/        — Game objects (player, enemies, etc.)
  input/
    InputManager.ts — Keyboard state tracker
  assets/          — Sprites, audio, etc.
docs/
  mission_control.md — This file
```

---

## Camera
- Mode: **Orthographic** (true 2D)
- Default half-height: `5` world units
- Auto-adjusts aspect ratio on window resize

---

## Dev Tools
- **BabylonJS Inspector** auto-opens in `dev` mode (press `Shift+Ctrl+I` to toggle)
- Dev server: `npm run dev`
- Build: `npm run build`

---

## Progress

### Phase 0 — Baseline Setup ✅
- [x] Vite + TypeScript project initialized
- [x] BabylonJS core, GUI, and Inspector installed
- [x] Orthographic 2D camera configured
- [x] InputManager skeleton created
- [x] Folder structure established
- [x] Inspector enabled in dev mode

### Phase 1 — Game Design (TODO)
- [ ] Define game concept and mechanics
- [ ] Design player character
- [ ] Define scene/level structure

### Phase 2 — Core Gameplay (TODO)
- [ ] Player entity with movement
- [ ] Scene management (menu, game, game over)
- [ ] Basic collision detection

### Phase 3 — Polish (TODO)
- [ ] Sprites and animations
- [ ] Audio
- [ ] UI (score, health, etc.)
- [ ] Build & packaging
