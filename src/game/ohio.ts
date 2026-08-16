/**
 * OHIO MODE — pure chaos.
 *
 * Every run rolls a difficulty from Easy to NEARLY IMPOSSIBLE, then rolls that
 * many modifiers to stack on the room. The puzzle itself can't get harder than
 * 12 numbers, so the difficulty comes from what the room does to you instead.
 */

export interface OhioModifier {
  id:    string;
  emoji: string;
  name:  string;
  desc:  string;
}

export const OHIO_MODIFIERS: OhioModifier[] = [
  { id: "mirror",  emoji: "🪞", name: "Mirrored",   desc: "The room is flipped" },
  { id: "dark",    emoji: "🌑", name: "Blackout",   desc: "Only a torch to see by" },
  { id: "spin",    emoji: "🌀", name: "Spinning",   desc: "The room won't sit still" },
  { id: "tiny",    emoji: "🔬", name: "Tiny",       desc: "Everything shrinks" },
  { id: "fog",     emoji: "🌫️", name: "Fog",        desc: "Blurred to the point of guessing" },
  { id: "upside",  emoji: "🙃", name: "Upside Down",desc: "The whole room is inverted" },
  { id: "fade",    emoji: "👻", name: "Fading",     desc: "Objects blink in and out" },
  { id: "jitter",  emoji: "🫨", name: "Jitter",     desc: "Nothing stays where you left it" },
  { id: "rush",    emoji: "⏱️", name: "Rush",       desc: "90 seconds. That's it." },
  { id: "slippy",  emoji: "🧊", name: "Slippery",   desc: "Objects slide away from the cursor" },
];

export interface OhioTier {
  id:    string;
  name:  string;
  emoji: string;
  color: string;
  mods:  number;  // how many modifiers roll
  bonus: number;  // coin multiplier for finishing
}

export const OHIO_TIERS: OhioTier[] = [
  { id: "easy",   name: "Easy",              emoji: "😴", color: "#88dd44", mods: 0, bonus: 1 },
  { id: "normal", name: "Normal",            emoji: "🙂", color: "#ffcc00", mods: 1, bonus: 2 },
  { id: "hard",   name: "Hard",              emoji: "😬", color: "#ff8800", mods: 2, bonus: 4 },
  { id: "brutal", name: "Brutal",            emoji: "💀", color: "#ff4400", mods: 3, bonus: 8 },
  { id: "insane", name: "Insane",            emoji: "👾", color: "#cc00ff", mods: 4, bonus: 16 },
  { id: "nearly", name: "NEARLY IMPOSSIBLE", emoji: "☠️", color: "#ff0000", mods: 6, bonus: 50 },
];

// Weighted so the top tier stays rare enough to feel like an event when it lands
const TIER_WEIGHTS = [26, 26, 20, 14, 9, 5];

export interface OhioRoll {
  tier: OhioTier;
  mods: OhioModifier[];
}

export function rollOhio(): OhioRoll {
  const total = TIER_WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let idx = 0;
  for (let i = 0; i < TIER_WEIGHTS.length; i++) {
    r -= TIER_WEIGHTS[i];
    if (r <= 0) { idx = i; break; }
  }
  const tier = OHIO_TIERS[idx];

  const pool = [...OHIO_MODIFIERS];
  const mods: OhioModifier[] = [];
  for (let i = 0; i < tier.mods && pool.length; i++) {
    mods.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  }
  return { tier, mods };
}

export function hasMod(roll: OhioRoll | null, id: string): boolean {
  return !!roll?.mods.some(m => m.id === id);
}
