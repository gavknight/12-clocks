// Player-built 12 Clocks levels, stored in Supabase so every player sees them.
// The theme column holds a JSON LevelTheme — the exact shape ExploreScene renders,
// so a community level drops straight into the normal game with no engine changes.

import type { LevelTheme } from "./levelData";

const URL = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/clock_levels";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";

const H = {
  "apikey":        KEY,
  "Authorization": `Bearer ${KEY}`,
  "Content-Type":  "application/json",
};

/** The demon ladder — index is what gets stored in clock_levels.difficulty. */
export const DIFFICULTIES = [
  { name: "Easy",          emoji: "⭐",     color: "#88dd44" },
  { name: "Normal",        emoji: "⭐⭐",   color: "#ffcc00" },
  { name: "Hard",          emoji: "⭐⭐⭐", color: "#ff8800" },
  { name: "Harder",        emoji: "💀",     color: "#ff4400" },
  { name: "Insane",        emoji: "👾",     color: "#cc00ff" },
  { name: "Demon",         emoji: "😈",     color: "#ff0000" },
  { name: "Easy Demon",    emoji: "😈⭐",   color: "#ff4488" },
  { name: "Medium Demon",  emoji: "😈💀",   color: "#ff0044" },
  { name: "Insane Demon",  emoji: "😈👾",   color: "#aa00ff" },
  { name: "Extreme Demon", emoji: "☠️",     color: "#ff2222" },
] as const;

export interface ClockLevel {
  id:          string;
  author_id:   string;
  author_name: string;
  name:        string;
  emoji:       string;
  theme:       string;          // JSON LevelTheme — use parseTheme()
  difficulty:  number | null;   // null = not rated yet
  featured:    boolean;
  hidden:      boolean;
  plays:       number;
  created_at:  number;
}

const COLS = "id,author_id,author_name,name,emoji,theme,difficulty,featured,hidden,plays,created_at";

export function newLevelId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Safely turn a stored row back into a renderable theme. */
export function parseTheme(lvl: ClockLevel): LevelTheme | null {
  try { return JSON.parse(lvl.theme) as LevelTheme; } catch { return null; }
}

export function difficultyOf(lvl: ClockLevel): typeof DIFFICULTIES[number] | null {
  return lvl.difficulty === null ? null : DIFFICULTIES[lvl.difficulty] ?? null;
}

/** Levels everyone can see — newest first, featured pinned to the top. */
export async function fetchLevels(limit = 100): Promise<ClockLevel[]> {
  try {
    const res = await fetch(
      `${URL}?select=${COLS}&hidden=eq.false&order=featured.desc,created_at.desc&limit=${limit}`,
      { headers: H },
    );
    if (!res.ok) return [];
    return (await res.json()) as ClockLevel[];
  } catch { return []; }
}

/** Every level including hidden ones — admin panel only. */
export async function fetchAllLevelsForAdmin(limit = 200): Promise<ClockLevel[]> {
  try {
    const res = await fetch(
      `${URL}?select=${COLS}&order=created_at.desc&limit=${limit}`,
      { headers: H },
    );
    if (!res.ok) return [];
    return (await res.json()) as ClockLevel[];
  } catch { return []; }
}

export async function fetchMyLevels(authorId: string): Promise<ClockLevel[]> {
  if (!authorId) return [];
  try {
    const res = await fetch(
      `${URL}?select=${COLS}&author_id=eq.${encodeURIComponent(authorId)}&order=created_at.desc`,
      { headers: H },
    );
    if (!res.ok) return [];
    return (await res.json()) as ClockLevel[];
  } catch { return []; }
}

/** Publish a new level. Returns false if it did not reach the server. */
export async function publishLevel(
  meta: { id: string; authorId: string; authorName: string; name: string; emoji: string },
  theme: LevelTheme,
): Promise<boolean> {
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { ...H, "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id:          meta.id,
        author_id:   meta.authorId,
        author_name: meta.authorName || "Anonymous",
        name:        meta.name,
        emoji:       meta.emoji,
        theme:       JSON.stringify(theme),
        created_at:  Date.now(),
      }),
    });
    return res.ok;
  } catch { return false; }
}

async function patch(id: string, body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`${URL}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...H, "Prefer": "return=minimal" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch { return false; }
}

/** Admin: assign a difficulty (index into DIFFICULTIES), or null to un-rate. */
export function rateLevel(id: string, difficulty: number | null): Promise<boolean> {
  return patch(id, { difficulty });
}

/** Admin: pin to the top of the browser. */
export function setFeatured(id: string, featured: boolean): Promise<boolean> {
  return patch(id, { featured });
}

/** Admin: hide from every player without deleting it. */
export function setHidden(id: string, hidden: boolean): Promise<boolean> {
  return patch(id, { hidden });
}

export function bumpPlays(id: string, current: number): Promise<boolean> {
  return patch(id, { plays: current + 1 });
}

export async function deleteLevel(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${URL}?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: H,
    });
    return res.ok;
  } catch { return false; }
}
