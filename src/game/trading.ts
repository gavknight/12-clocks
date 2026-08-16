// Player-to-player market. Listings live in Supabase so every player sees the
// same shelf. Sellers are paid through player_gifts, which the gift poller in
// Game.ts already claims — so a seller gets their money even while offline.

const BASE = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const URL  = `${BASE}/trade_listings`;
const GIFTS = `${BASE}/player_gifts`;
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";

const H = {
  "apikey":        KEY,
  "Authorization": `Bearer ${KEY}`,
  "Content-Type":  "application/json",
};

export interface Listing {
  id:             string;
  seller_id:      string;
  seller_name:    string;
  pet_id:         string;
  price_coins:    number;
  price_diamonds: number;
  status:         "open" | "sold" | "cancelled";
  buyer_id:       string | null;
  buyer_name:     string | null;
  created_at:     number;
  sold_at:        number | null;
}

const COLS = "id,seller_id,seller_name,pet_id,price_coins,price_diamonds,status,buyer_id,buyer_name,created_at,sold_at";

export function newListingId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Everything currently for sale, newest first. */
export async function fetchOpenListings(): Promise<Listing[]> {
  try {
    const res = await fetch(`${URL}?select=${COLS}&status=eq.open&order=created_at.desc&limit=100`, { headers: H });
    if (!res.ok) return [];
    return (await res.json()) as Listing[];
  } catch { return []; }
}

/** This player's own listings, including sold ones so they can see their history. */
export async function fetchMyListings(sellerId: string): Promise<Listing[]> {
  if (!sellerId) return [];
  try {
    const res = await fetch(
      `${URL}?select=${COLS}&seller_id=eq.${encodeURIComponent(sellerId)}&order=created_at.desc&limit=50`,
      { headers: H },
    );
    if (!res.ok) return [];
    return (await res.json()) as Listing[];
  } catch { return []; }
}

export async function createListing(l: {
  sellerId: string; sellerName: string; petId: string;
  priceCoins: number; priceDiamonds: number;
}): Promise<string | null> {
  const id = newListingId();
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { ...H, "Prefer": "return=minimal" },
      body: JSON.stringify({
        id,
        seller_id:      l.sellerId,
        seller_name:    l.sellerName || "Anonymous",
        pet_id:         l.petId,
        price_coins:    Math.max(0, Math.floor(l.priceCoins)),
        price_diamonds: Math.max(0, Math.floor(l.priceDiamonds)),
        created_at:     Date.now(),
      }),
    });
    return res.ok ? id : null;
  } catch { return null; }
}

/**
 * Claim a listing for a buyer.
 *
 * The status=eq.open filter is the whole safety mechanism: two buyers hitting
 * the same listing both send this PATCH, but only the first matches a row that
 * is still open. The loser gets an empty array back and is told it already sold,
 * so one pet can never be sold twice.
 */
export async function claimListing(id: string, buyerId: string, buyerName: string): Promise<boolean> {
  try {
    const res = await fetch(`${URL}?id=eq.${encodeURIComponent(id)}&status=eq.open`, {
      method: "PATCH",
      headers: { ...H, "Prefer": "return=representation" },
      body: JSON.stringify({
        status:     "sold",
        buyer_id:   buyerId,
        buyer_name: buyerName || "Anonymous",
        sold_at:    Date.now(),
      }),
    });
    if (!res.ok) return false;
    const rows = (await res.json()) as unknown[];
    return rows.length > 0;
  } catch { return false; }
}

/** Seller pulls their own listing. Same open-filter guard so you can't cancel a sale. */
export async function cancelListing(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${URL}?id=eq.${encodeURIComponent(id)}&status=eq.open`, {
      method: "PATCH",
      headers: { ...H, "Prefer": "return=representation" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch { return false; }
}

/** Pay the seller. Lands in their game via the existing gift poller. */
export async function paySeller(sellerId: string, coins: number, diamonds: number): Promise<boolean> {
  if (!sellerId || (coins <= 0 && diamonds <= 0)) return true;
  try {
    const res = await fetch(GIFTS, {
      method: "POST",
      headers: { ...H, "Prefer": "return=minimal" },
      body: JSON.stringify({
        account_id: sellerId,
        coins:      Math.max(0, Math.floor(coins)),
        wins:       0,
        diamonds:   Math.max(0, Math.floor(diamonds)),
        claimed:    false,
        sent_at:    Date.now(),
      }),
    });
    return res.ok;
  } catch { return false; }
}

/** Admin: remove a listing outright. */
export async function deleteListing(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${URL}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: H });
    return res.ok;
  } catch { return false; }
}
