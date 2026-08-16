# Mission Control — 12 Clocks

## Project Overview
A 2D puzzle game built with BabylonJS + Vite + TypeScript. Find twelve missing
numbers hidden around a room and return them to the clock — plus a large arcade
of mini-games, online play, and player-created content.

**Live:** https://12-clocks.vercel.app · **Backend:** Supabase (project `xgzgqdhkjcsrgzhjyiss`)

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

### Shipped ✅
- [x] Core puzzle loop — 28 themed rooms, 12 numbers each
- [x] Accounts, saves, bans, admin panels
- [x] Arcade — 30+ mini-games
- [x] Online multiplayer, duels, clans
- [x] Leaderboards — time, coins, diamonds
- [x] Pets, auto-clicker, shop economy
- [x] Background music system + Music Creator
- [x] Update Alert — live countdown pill for all players
- [x] Trading Plaza — player-to-player pet market (v1.3)
- [x] Level Builder + Community Levels — player-made rooms, admin-rated (v1.3)
- [x] Badges — 19 milestone awards incl. a secret (v1.3)

### v1.3 — Trade & Create (2026-08-16)
- Trading Plaza: sell pets for coins, diamonds, or both. Listings escrow the
  pet so it can't be duped; buys are a conditional write (`status=eq.open`) so
  two players can never claim one listing; sellers are paid via `player_gifts`
  even while offline.
- Level Builder: object placement moved out of ExploreScene's hardcoded
  `getObjects()` into `levelData.defaultObjects()`, with an optional
  `objects[]` on LevelTheme. Players drag objects across the 3-screen room.
- Community Levels: browse/play published rooms; admin rates Easy → Extreme
  Demon, features, hides, deletes.
- Badges: derived from live state, so they can't desync from the save.

### Known gaps
- [ ] Trading has no listing fee or price cap — two accounts can shuttle a pet
      to move currency between them
- [ ] `paySeller` proven by direct DB test, not yet by a real in-game sale
- [ ] Vercel MCP is not authorised for this scope; deploys go via git push

### Next
- [ ] Decide on trade moderation (fees, caps, admin takedown of listings)
- [ ] More secret badges
