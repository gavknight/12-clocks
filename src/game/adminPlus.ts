/**
 * Admin Panel+ — shared definitions for live presence, remote commands,
 * server-wide events and stat-boosting titles.
 *
 * Game.ts owns the client half (heartbeat + pollers); AdminPlusPanel.ts owns
 * the operator half. Both import the tables below so they can never drift.
 */

const SB  = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";

export const AP_SB = SB;
export const AP_H = {
  "apikey": KEY,
  "Authorization": `Bearer ${KEY}`,
  "Content-Type": "application/json",
};
/** Upsert flavour — used when writing presence rows keyed by account_id. */
export const AP_H_UPSERT = { ...AP_H, "Prefer": "resolution=merge-duplicates,return=minimal" };
export const AP_H_QUIET  = { ...AP_H, "Prefer": "return=minimal" };

// ── Titles ────────────────────────────────────────────────────────────────
// A player holds at most one title. Only the held title applies (no stacking
// between titles), and it multiplies with whatever event is live.

export interface TitleDef {
  id:    string;
  emoji: string;
  name:  string;
  mult:  number;   // multiplier applied to coins, wins and diamonds
  color: string;
  desc:  string;
}

export const TITLES: TitleDef[] = [
  { id: "content_creator",       emoji: "🎬", name: "Content Creator",       mult: 10,
    color: "#ff4444", desc: "Given to YouTubers — 10× stats." },
  { id: "admin_content_creator", emoji: "🎥", name: "Admin Content Creator", mult: 50_000,
    color: "#ff9900", desc: "Admin who also makes content — 5000× × 10×." },
  { id: "admin",                 emoji: "🛡️", name: "Admin",                mult: 5_000,
    color: "#66ddff", desc: "Staff title — 5000× stats." },
];

export function titleDef(id: string | null | undefined): TitleDef | null {
  return id ? (TITLES.find(t => t.id === id) ?? null) : null;
}

// ── Server-wide events ────────────────────────────────────────────────────
// One event is live at a time, stored in global_settings under `active_event`.

export interface EventDef {
  id:       string;
  emoji:    string;
  name:     string;
  coins:    number;
  wins:     number;
  diamonds: number;
  color:    string;
  desc:     string;
}

export const EVENTS: EventDef[] = [
  { id: "x2_money",     emoji: "🪙", name: "2× Money",     coins: 2, wins: 1, diamonds: 1,
    color: "#FFD700", desc: "Every coin payout is doubled." },
  { id: "x2_gems",      emoji: "💎", name: "2× Gems",      coins: 1, wins: 1, diamonds: 2,
    color: "#66ddff", desc: "Every diamond payout is doubled." },
  { id: "x2_stats",     emoji: "📈", name: "2× Stats",     coins: 2, wins: 2, diamonds: 2,
    color: "#88ff88", desc: "Coins, wins AND diamonds all doubled." },
  { id: "birthday_boy", emoji: "🎂", name: "Birthday Boy", coins: 3, wins: 3, diamonds: 3,
    color: "#ff88dd", desc: "The game's birthday — 3× everything." },
];

export function eventDef(id: string | null | undefined): EventDef | null {
  return id ? (EVENTS.find(e => e.id === id) ?? null) : null;
}

/**
 * The game's birthday, as [month, day] with month 1-12.
 * Birthday Boy switches itself on for the whole of this day, every year.
 */
export const GAME_BIRTHDAY: [number, number] = [12, 5];

/** True when today is the game's birthday in the player's local timezone. */
export function isBirthdayToday(now: Date = new Date()): boolean {
  return now.getMonth() + 1 === GAME_BIRTHDAY[0] && now.getDate() === GAME_BIRTHDAY[1];
}

// ── Remote commands ───────────────────────────────────────────────────────

export type CommandName = "kick" | "freeze" | "unfreeze" | "goto";

/** account_id value that targets every player at once. */
export const ALL_PLAYERS = "*";

export interface PlayerCommand {
  id:         number;
  account_id: string;
  command:    CommandName;
  payload:    string | null;
  issued_by:  string;
  created_at: number;
  consumed:   boolean;
}

/** Destinations an admin can force a player into. Ids match Game methods. */
export const PUPPET_DESTINATIONS: { id: string; emoji: string; label: string }[] = [
  { id: "title",       emoji: "🏠", label: "Title Screen"   },
  { id: "arcade",      emoji: "🕹️", label: "Arcade"         },
  { id: "shop",        emoji: "🛒", label: "Shop"           },
  { id: "levelSelect", emoji: "🗺️", label: "Level Select"   },
  { id: "lobby",       emoji: "👥", label: "Lobby"          },
  { id: "tradingPlaza",emoji: "💱", label: "Trading Plaza"  },
  { id: "badges",      emoji: "🏅", label: "Badges"         },
  { id: "ohio",        emoji: "🌀", label: "Ohio Mode"      },
  { id: "clan",        emoji: "🏰", label: "Clan"           },
  { id: "ending",      emoji: "🏁", label: "The Ending"     },
  { id: "banned",      emoji: "🚫", label: "Banned Screen"  },
];

// ── Presence ──────────────────────────────────────────────────────────────

export interface PresenceRow {
  account_id:      string;
  username:        string;
  scene:           string;
  coins:           number;
  wins:            number;
  diamonds:        number;
  title:           string | null;
  session_started: number;
  last_seen:       number;
  mp_state:        "solo" | "hosting" | "joined";
  mp_peers:        number;
}

/** How a player's multiplayer state reads in the Live Player Spy. */
export function mpLabel(row: PresenceRow): string | null {
  if (!row.mp_state || row.mp_state === "solo") return null;
  const who = row.mp_peers === 1 ? "1 player" : `${row.mp_peers} players`;
  if (row.mp_peers === 0) {
    return row.mp_state === "hosting" ? "🌐 Hosting — nobody joined yet" : "🌐 Online — not connected";
  }
  return row.mp_state === "hosting" ? `🌐 Hosting ${who}` : `🌐 Playing with ${who}`;
}

/** A player is "online" if they've heartbeated inside this window. */
export const ONLINE_WINDOW_MS = 30_000;

export function isOnline(row: PresenceRow, now = Date.now()): boolean {
  return now - row.last_seen < ONLINE_WINDOW_MS;
}

/** "3m 12s" — how long this session has been running. */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
