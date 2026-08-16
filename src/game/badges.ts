// Player badges — milestone awards earned from things the player already does.
//
// Badges are derived, not stored: every check reads live game state, so they can
// never desync from the save. The only thing persisted is which ones have been
// *seen*, so a newly-earned badge can announce itself exactly once.

import type { Game } from "./Game";
import { PETS } from "./Game";
import { LEVEL_COUNT } from "./levelData";

export type BadgeTier = "bronze" | "silver" | "gold" | "legend";

export interface Badge {
  id:    string;
  emoji: string;
  name:  string;
  desc:  string;
  tier:  BadgeTier;
  /** Current progress toward `goal` — drives the progress bar on locked badges. */
  value: (g: Game) => number;
  goal:  number;
  /** Hidden in the badge list until earned — no hint, no progress bar. */
  secret?: boolean;
}

export const TIER_STYLE: Record<BadgeTier, { color: string; label: string }> = {
  bronze: { color: "#cd7f32", label: "Bronze" },
  silver: { color: "#c0c8d0", label: "Silver" },
  gold:   { color: "#FFD700", label: "Gold"   },
  legend: { color: "#c9a6ff", label: "Legend" },
};

/** Counters the game doesn't otherwise track, bumped by the code that causes them. */
const STAT_KEY = "12clocks_badge_stats";
export interface BadgeStats {
  levelsPublished: number;
  petsSold:        number;
  petsBought:      number;
  treeFound:       number;
}
const ZERO: BadgeStats = { levelsPublished: 0, petsSold: 0, petsBought: 0, treeFound: 0 };

export function getStats(): BadgeStats {
  try { return { ...ZERO, ...JSON.parse(localStorage.getItem(STAT_KEY) ?? "{}") }; }
  catch { return { ...ZERO }; }
}

export function bumpStat(key: keyof BadgeStats, by = 1): void {
  const s = getStats();
  s[key] += by;
  try { localStorage.setItem(STAT_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

export const BADGES: Badge[] = [
  // ── Puzzling ──────────────────────────────────────────────────────────────
  { id: "first_steps", emoji: "👣", name: "First Steps",  tier: "bronze",
    desc: "Finish your first level",
    value: g => g.completedLevelCount, goal: 1 },
  { id: "explorer",    emoji: "🧭", name: "Explorer",     tier: "bronze",
    desc: "Finish 5 levels",
    value: g => g.completedLevelCount, goal: 5 },
  { id: "clockmaster", emoji: "🕰️", name: "Clock Master", tier: "gold",
    desc: "Finish half the levels",
    value: g => g.completedLevelCount, goal: Math.ceil(LEVEL_COUNT / 2) },
  { id: "completionist", emoji: "🏅", name: "Completionist", tier: "legend",
    desc: `Finish all ${LEVEL_COUNT} levels`,
    value: g => g.completedLevelCount, goal: LEVEL_COUNT },

  // ── Winning ───────────────────────────────────────────────────────────────
  { id: "winner",   emoji: "🏆", name: "Winner",     tier: "bronze",
    desc: "Win a game", value: g => g.state.wins, goal: 1 },
  { id: "champion", emoji: "👑", name: "Champion",   tier: "silver",
    desc: "Win 25 games", value: g => g.state.wins, goal: 25 },
  { id: "unbeaten", emoji: "⚔️", name: "Unbeaten",   tier: "gold",
    desc: "Win 100 games", value: g => g.state.wins, goal: 100 },

  // ── Wealth ────────────────────────────────────────────────────────────────
  { id: "saver",    emoji: "🪙", name: "Saver",      tier: "bronze",
    desc: "Hold 10,000 coins", value: g => g.state.coins, goal: 10_000 },
  { id: "rich",     emoji: "💰", name: "Rich",       tier: "silver",
    desc: "Hold 1,000,000 coins", value: g => g.state.coins, goal: 1_000_000 },
  { id: "tycoon",   emoji: "🏦", name: "Tycoon",     tier: "gold",
    desc: "Hold 100,000,000 coins", value: g => g.state.coins, goal: 100_000_000 },
  { id: "sparkle",  emoji: "💎", name: "Sparkling",  tier: "silver",
    desc: "Hold 100 diamonds", value: g => g.state.diamonds, goal: 100 },

  // ── Pets ──────────────────────────────────────────────────────────────────
  { id: "pet_owner", emoji: "🐱", name: "Pet Owner",  tier: "bronze",
    desc: "Own your first pet", value: g => g.state.pets.length, goal: 1 },
  { id: "zookeeper", emoji: "🦄", name: "Zookeeper",  tier: "legend",
    desc: "Own every pet at once", value: g => g.state.pets.length, goal: PETS.length },

  // ── Creating ──────────────────────────────────────────────────────────────
  { id: "builder",   emoji: "🛠️", name: "Builder",    tier: "bronze",
    desc: "Publish a level", value: () => getStats().levelsPublished, goal: 1 },
  { id: "architect", emoji: "🏗️", name: "Architect",  tier: "gold",
    desc: "Publish 5 levels", value: () => getStats().levelsPublished, goal: 5 },

  // ── Trading ───────────────────────────────────────────────────────────────
  { id: "shopper",   emoji: "🛒", name: "Shopper",    tier: "bronze",
    desc: "Buy a pet in the Trading Plaza", value: () => getStats().petsBought, goal: 1 },
  { id: "merchant",  emoji: "🏪", name: "Merchant",   tier: "silver",
    desc: "Sell a pet in the Trading Plaza", value: () => getStats().petsSold, goal: 1 },
  { id: "mogul",     emoji: "📈", name: "Mogul",      tier: "gold",
    desc: "Sell 10 pets", value: () => getStats().petsSold, goal: 10 },

  // ── Secrets ───────────────────────────────────────────────────────────────
  { id: "old_tree", emoji: "🌳", name: "The Old Tree", tier: "legend", secret: true,
    desc: "Found the acorn on the top shelf",
    value: () => getStats().treeFound, goal: 1 },
];

export function isEarned(b: Badge, g: Game): boolean {
  return b.value(g) >= b.goal;
}

export function earnedBadges(g: Game): Badge[] {
  return BADGES.filter(b => isEarned(b, g));
}

// ── "New badge!" announcements ──────────────────────────────────────────────

const SEEN_KEY = "12clocks_badges_seen";

function getSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]); }
  catch { return new Set(); }
}

function setSeen(ids: Set<string>): void {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...ids])); } catch { /* quota */ }
}

/** Badges earned since the last check. Marks them seen, so each fires once. */
export function takeNewlyEarned(g: Game): Badge[] {
  const seen = getSeen();
  const fresh = earnedBadges(g).filter(b => !seen.has(b.id));
  if (fresh.length) {
    fresh.forEach(b => seen.add(b.id));
    setSeen(seen);
  }
  return fresh;
}

/** Called once on load so a returning player isn't spammed for old milestones. */
export function primeSeen(g: Game): void {
  if (localStorage.getItem(SEEN_KEY) !== null) return;
  setSeen(new Set(earnedBadges(g).map(b => b.id)));
}
