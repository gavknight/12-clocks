// Global leaderboard stored in Supabase — visible to everyone on every device

const BASE_URL = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const URL  = `${BASE_URL}/clocks_records`;
const COIN_URL = `${BASE_URL}/coin_leaders`;
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";

const BASE_HEADERS = {
  "apikey":        KEY,
  "Authorization": `Bearer ${KEY}`,
  "Content-Type":  "application/json",
};

export interface CloudRecord {
  account_id: string;
  username:   string;
  time_ms:    number;
  date:       number;
}

/** Fetch all records sorted fastest first */
export async function fetchRecords(): Promise<CloudRecord[]> {
  try {
    const res = await fetch(
      `${URL}?select=account_id,username,time_ms,date&order=time_ms.asc&limit=50`,
      { headers: BASE_HEADERS },
    );
    if (!res.ok) return [];
    return (await res.json()) as CloudRecord[];
  } catch {
    return [];
  }
}

// ── Coin leaderboard ────────────────────────────────────────────────────────

export interface CoinRecord {
  account_id: string;
  username:   string;
  coins:      number;
  updated_at: number;
}

/** Fetch top 50 players sorted by most coins */
export async function fetchCoinLeaderboard(): Promise<CoinRecord[]> {
  try {
    const res = await fetch(
      `${COIN_URL}?select=account_id,username,coins,updated_at&order=coins.desc&limit=50`,
      { headers: BASE_HEADERS },
    );
    if (!res.ok) return [];
    return (await res.json()) as CoinRecord[];
  } catch {
    return [];
  }
}

/** Upsert this player's coin count (always overwrites — reflects current balance) */
export async function upsertCoinRecord(rec: CoinRecord): Promise<void> {
  try {
    await fetch(COIN_URL, {
      method:  "POST",
      headers: { ...BASE_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" },
      body:    JSON.stringify(rec),
    });
  } catch {
    // Silently fail
  }
}

// ── Speed records ────────────────────────────────────────────────────────────

/**
 * Save a record only if it's a personal best.
 * Uses upsert (insert or replace) keyed on account_id.
 */
export async function upsertRecord(rec: CloudRecord): Promise<void> {
  try {
    // Check existing personal best first
    const check = await fetch(
      `${URL}?account_id=eq.${encodeURIComponent(rec.account_id)}&select=time_ms`,
      { headers: BASE_HEADERS },
    );
    if (check.ok) {
      const rows = (await check.json()) as { time_ms: number }[];
      if (rows.length > 0 && rows[0].time_ms <= rec.time_ms) return; // not a PB
    }

    await fetch(URL, {
      method:  "POST",
      headers: { ...BASE_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal" },
      body:    JSON.stringify(rec),
    });
  } catch {
    // Silently fail — record will still be saved locally
  }
}
