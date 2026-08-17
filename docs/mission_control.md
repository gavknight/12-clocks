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
- [x] Admin Panel+ — live player spy, remote control, events, titles (v1.4)

### v1.4 — Admin Panel+ (2026-08-16)
- The feature set lives in `adminPlusSections.ts` as `mountAdminPlus()`, which
  renders into any container with all DOM lookups scoped to it. Two mount
  points: the standalone `AdminPlusPanel` overlay (Alt+L, or the top button in
  the Admin Panel) and a section at the bottom of `AdminAbusePanel` (Alt+P), so
  everything is in the abuse panel too and the two can't drift.
- **Live Player Spy** — `player_presence` gets an upsert heartbeat every 8s
  carrying username, current scene, coins/wins/diamonds, title and session
  start. The panel polls it every 5s; a player counts as online for 30s after
  their last beat. Scene names come from a new optional label on `Game._nav()`.
- **Kick / Freeze / Puppet** — admin writes to `player_commands`, the target
  client consumes it within 3s. `account_id = '*'` broadcasts to everyone.
  Commands are live orders, not a queue: anything issued before a client's
  session started is ignored, so an old "freeze all" can't ambush a player who
  opens the game a week later.
- **Server-wide events** — `2× Money`, `2× Gems`, `2× Stats`, `Birthday Boy`,
  stored in `global_settings.active_event`. Birthday Boy runs itself on the
  game's birthday and overrides the manual pick.
- **Titles — anyone** — the roster comes from the `members` table (everyone who
  has ever joined), unioned with presence and already-titled players, so
  offline and never-seen players are all grantable. Search box for long lists,
  plus a grant-by-account-ID box as the final fallback.
  Titles apply on `change` and the 5s poll deliberately does NOT re-render the
  roster — rebuilding it mid-interaction discarded the admin's dropdown choice,
  which read as the title "resetting itself". Insert / upsert-over-existing /
  delete all verified against the live REST endpoint.
- **Titles** — `player_titles`, one per player. Content Creator 10×,
  Admin 5000×, Admin Content Creator 50,000× (5000 × 10). Highest title only —
  titles don't stack with each other, but they do multiply with the live event.
- Multipliers fold into the existing `petCoinMultiplier` / `gemMultiplier`
  getters plus the level-completion reward, so every payout path picks them up.

### v1.5 — Friends (2026-08-16)
- `FriendsScene` (👥 Friends on the title screen) with three tabs: Friends,
  Requests, Add. Badge on the button counts unread DMs + pending requests.
- `friend_links` holds requests and friendships in one row; a pair is friends
  when `status = 'accepted'`, whichever direction the request went.
- Online status is read from `player_presence` — the same heartbeat the admin
  spy uses, so there is no second presence system to keep in sync. Friends show
  their current scene and whether they're in multiplayer.
- **Chat** — `friend_messages`, polled every 4s while a conversation is open,
  read receipts via `markRead`. Unread counts drive the badges.
- **Play** — dials the friend's PeerJS peer directly (`peerIdFor` matches
  `MultiplayerManager.goOnline`) and drops both into the room.
- **Challenge** — `friend_invites` carries a `duel` invite; `DuelScene` gained
  an optional `challenge` param so a friend duel skips the random queue. The
  challenger hosts and waits, the accepter dials in. The random-queue path is
  unchanged.
- Invites arrive as an accept/decline card anywhere in the game, and expire
  after 90s so a stale challenge can't drag someone into a dead duel.
- Live Player Spy now shows real multiplayer state (`mp_state` / `mp_peers` on
  the presence heartbeat), e.g. "🌐 Hosting 2 players", not just the scene name.
- PostgREST `or=(...)` and nested `and(...)` filters verified against the live
  API; test rows cleaned up.

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
- [ ] `GAME_BIRTHDAY` in `src/game/adminPlus.ts` is a placeholder (5 Dec) —
      needs the real date
- [ ] Admin Panel+ tested by build only, not yet with two live clients
- [ ] 7 tables still have RLS disabled (pre-existing, see Security below)

## Security
The anon key is shipped to the browser, so every table it can reach is
effectively public. These 7 have RLS off entirely — anyone with the key can
read or rewrite every row:

    ALTER TABLE public.admin_chat      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.player_gifts    ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.admin_coins     ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.polls           ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.poll_votes      ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.diamond_leaders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.update_ideas    ENABLE ROW LEVEL SECURITY;

Don't run that as-is — RLS with no policies blocks all access and breaks those
features. Each table needs a policy alongside it.

### Next
- [ ] Decide on trade moderation (fees, caps, admin takedown of listings)
- [ ] More secret badges
