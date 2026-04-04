const BASE = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/members";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const H    = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" };

export function pingMember(accountId: string, username: string): void {
  if (!accountId || accountId === "bedrock_guest") return;
  fetch(BASE, { method: "POST", headers: H,
    body: JSON.stringify({ account_id: accountId, username, last_seen_at: new Date().toISOString() }) })
    .catch(() => {});
}

export function setBanStatus(accountId: string, banned: boolean): void {
  fetch(`${BASE}?account_id=eq.${encodeURIComponent(accountId)}`,
    { method: "PATCH", headers: H, body: JSON.stringify({ is_banned: banned }) })
    .catch(() => {});
}

export async function getMemberCount(): Promise<{ total: number; active: number }> {
  try {
    const r = await fetch(`${BASE}?select=is_banned`, { headers: H });
    const rows: Array<{ is_banned: boolean }> = await r.json();
    const total  = rows.length;
    const active = rows.filter(r => !r.is_banned).length;
    return { total, active };
  } catch { return { total: 0, active: 0 }; }
}
