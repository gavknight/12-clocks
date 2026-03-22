// GDStorage.ts — shared types + localStorage for custom GD levels

export type GDObjType = 'block' | 'spike' | 'spike_d' | 'p_cube' | 'p_ship' | 'coin';

export interface GDObj {
  t:  GDObjType;
  wx: number;
  wy: number;
  ww: number;
  wh: number;
}

export interface GDLevel {
  id:         string;
  name:       string;
  authorId:   string;
  authorName: string;
  published:  boolean;
  objects:    GDObj[];
  createdAt:  number;
}

const KEY = 'gd_levels_v1';

export function gdLoadAll(): GDLevel[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

export function gdUpsert(lvl: GDLevel): void {
  const all = gdLoadAll();
  const i = all.findIndex(l => l.id === lvl.id);
  if (i !== -1) all[i] = lvl; else all.push(lvl);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function gdDelete(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(gdLoadAll().filter(l => l.id !== id)));
}

export function gdMine(authorId: string): GDLevel[] {
  return gdLoadAll().filter(l => l.authorId === authorId);
}

export function gdSearch(q: string): GDLevel[] {
  const ql = q.trim().toLowerCase();
  if (!ql) return gdLoadAll().filter(l => l.published);
  return gdLoadAll().filter(l => l.published && l.name.toLowerCase().includes(ql));
}

export function gdNewId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const GD_DIFFICULTIES = [
  { name: 'Easy',          color: '#88dd44', emoji: '⭐' },
  { name: 'Medium',        color: '#ffcc00', emoji: '⭐⭐' },
  { name: 'Hard',          color: '#ff8800', emoji: '⭐⭐⭐' },
  { name: 'Harder',        color: '#ff4400', emoji: '💀' },
  { name: 'Insane',        color: '#cc00ff', emoji: '👾' },
  { name: 'Demon',         color: '#ff0000', emoji: '😈' },
  { name: 'Easy Demon',    color: '#ff4488', emoji: '😈⭐' },
  { name: 'Medium Demon',  color: '#ff0044', emoji: '😈💀' },
  { name: 'Insane Demon',  color: '#aa00ff', emoji: '😈👾' },
  { name: 'Extreme Demon', color: '#ff0000', emoji: '☠️' },
] as const;

const STAR_COINS_KEY = 'gd_star_coins';
export function gdGetStarCoins(): number { return +(localStorage.getItem(STAR_COINS_KEY) ?? 0); }
export function gdAddStarCoins(n: number): void { localStorage.setItem(STAR_COINS_KEY, String(gdGetStarCoins() + n)); }

const PROFILE_DESC_KEY = 'gd_profile_desc';
export function gdGetProfileDesc(): string { return localStorage.getItem(PROFILE_DESC_KEY) ?? ''; }
export function gdSetProfileDesc(d: string): void { localStorage.setItem(PROFILE_DESC_KEY, d); }

export function gdGetRating(levelId: string): number | null {
  const v = localStorage.getItem(`gd_rating_lvl_${levelId}`);
  return v === null ? null : +v;
}
export function gdSetRating(levelId: string, diffIdx: number): void {
  localStorage.setItem(`gd_rating_lvl_${levelId}`, String(diffIdx));
}
