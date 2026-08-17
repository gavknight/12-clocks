/**
 * Friends — requests, direct messages, and play/duel invites.
 *
 * Online status is read from `player_presence`, the same heartbeat the Live
 * Player Spy uses, so there's no second presence system to keep in sync.
 */

import { peerIdForName } from "../multiplayer/MultiplayerManager";

const SB  = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";

const H       = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };
const H_QUIET = { ...H, "Prefer": "return=minimal" };
const H_READ  = { "apikey": KEY, "Authorization": `Bearer ${KEY}` };

export const FR_SB = SB;
export const FR_H_READ = H_READ;

// ── Types ─────────────────────────────────────────────────────────────────

export interface FriendLink {
  id: number;
  from_id: string; from_name: string;
  to_id: string;   to_name: string;
  status: "pending" | "accepted" | "rejected";
  created_at: number;
}

export interface FriendMessage {
  id: number;
  from_id: string; from_name: string;
  to_id: string;
  message: string;
  sent_at: number;
  read: boolean;
}

export interface FriendInvite {
  id: number;
  from_id: string; from_name: string;
  to_id: string;
  kind: "play" | "duel";
  peer_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: number;
}

/** A friend as the UI wants them: identity + live presence. */
export interface Friend {
  accountId: string;
  username:  string;
  linkId:    number;
  online:    boolean;
  scene:     string;
  mpState:   string;
  unread:    number;
}

/** PeerJS id for a username — the single shared implementation. */
export const peerIdFor = peerIdForName;

/** Invites older than this are stale and ignored. */
export const INVITE_TTL_MS = 90_000;

// ── Requests ──────────────────────────────────────────────────────────────

/** Look a player up by username via the global roster. */
export async function findPlayerByName(
  username: string,
): Promise<{ account_id: string; username: string } | null> {
  const q = encodeURIComponent(username.trim());
  const r = await fetch(`${SB}/members?username=ilike.${q}&select=account_id,username&limit=1`, { headers: H_READ });
  const rows = await r.json() as { account_id: string; username: string }[];
  return rows[0] ?? null;
}

export async function sendFriendRequest(
  me: { id: string; name: string },
  them: { id: string; name: string },
): Promise<void> {
  const r = await fetch(`${SB}/friend_links`, {
    method: "POST",
    headers: { ...H_QUIET, "Prefer": "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      from_id: me.id, from_name: me.name,
      to_id: them.id, to_name: them.name,
      status: "pending", created_at: Date.now(),
    }),
  });
  if (!r.ok) throw new Error("request failed");
}

/** Every link touching me, in either direction. */
export async function fetchLinks(myId: string): Promise<FriendLink[]> {
  const r = await fetch(
    `${SB}/friend_links?or=(from_id.eq.${encodeURIComponent(myId)},to_id.eq.${encodeURIComponent(myId)})&order=created_at.desc`,
    { headers: H_READ },
  );
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

export async function respondToRequest(linkId: number, accept: boolean): Promise<void> {
  const r = await fetch(`${SB}/friend_links?id=eq.${linkId}`, {
    method: "PATCH", headers: H_QUIET,
    body: JSON.stringify({ status: accept ? "accepted" : "rejected" }),
  });
  if (!r.ok) throw new Error("respond failed");
}

export async function removeFriend(linkId: number): Promise<void> {
  await fetch(`${SB}/friend_links?id=eq.${linkId}`, { method: "DELETE", headers: H_QUIET });
}

/**
 * Accepted links turned into a friend list, with live presence merged in.
 * Pending requests aimed at me are returned separately so the UI can badge them.
 */
export async function fetchFriends(myId: string): Promise<{
  friends: Friend[];
  incoming: FriendLink[];
  outgoing: FriendLink[];
}> {
  const links = await fetchLinks(myId);
  const accepted = links.filter(l => l.status === "accepted");
  const incoming = links.filter(l => l.status === "pending" && l.to_id === myId);
  const outgoing = links.filter(l => l.status === "pending" && l.from_id === myId);

  const others = accepted.map(l => l.from_id === myId
    ? { accountId: l.to_id,   username: l.to_name,   linkId: l.id }
    : { accountId: l.from_id, username: l.from_name, linkId: l.id });

  const [presence, unread] = await Promise.all([
    fetchPresence(others.map(o => o.accountId)),
    fetchUnreadCounts(myId),
  ]);

  const friends: Friend[] = others.map(o => {
    const p = presence[o.accountId];
    return {
      ...o,
      online:  !!p && Date.now() - p.last_seen < 30_000,
      scene:   p?.scene ?? "",
      mpState: p?.mp_state ?? "solo",
      unread:  unread[o.accountId] ?? 0,
    };
  });

  // Online first, then unread, then alphabetical.
  friends.sort((a, b) =>
    Number(b.online) - Number(a.online) ||
    b.unread - a.unread ||
    a.username.localeCompare(b.username));

  return { friends, incoming, outgoing };
}

interface PresenceLite { last_seen: number; scene: string; mp_state: string }

async function fetchPresence(ids: string[]): Promise<Record<string, PresenceLite>> {
  if (!ids.length) return {};
  const list = ids.map(i => `"${i}"`).join(",");
  const r = await fetch(
    `${SB}/player_presence?account_id=in.(${list})&select=account_id,last_seen,scene,mp_state`,
    { headers: H_READ },
  );
  const rows = await r.json() as ({ account_id: string } & PresenceLite)[];
  const out: Record<string, PresenceLite> = {};
  if (Array.isArray(rows)) {
    for (const p of rows) out[p.account_id] = { last_seen: p.last_seen, scene: p.scene, mp_state: p.mp_state };
  }
  return out;
}

// ── Messages ──────────────────────────────────────────────────────────────

async function fetchUnreadCounts(myId: string): Promise<Record<string, number>> {
  const r = await fetch(
    `${SB}/friend_messages?to_id=eq.${encodeURIComponent(myId)}&read=eq.false&select=from_id`,
    { headers: H_READ },
  );
  const rows = await r.json() as { from_id: string }[];
  const out: Record<string, number> = {};
  if (Array.isArray(rows)) for (const m of rows) out[m.from_id] = (out[m.from_id] ?? 0) + 1;
  return out;
}

/** The conversation between me and one friend, oldest first. */
export async function fetchConversation(myId: string, friendId: string): Promise<FriendMessage[]> {
  const a = encodeURIComponent(myId), b = encodeURIComponent(friendId);
  const r = await fetch(
    `${SB}/friend_messages?or=(and(from_id.eq.${a},to_id.eq.${b}),and(from_id.eq.${b},to_id.eq.${a}))` +
    `&order=sent_at.asc&limit=200`,
    { headers: H_READ },
  );
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

export async function sendMessage(
  me: { id: string; name: string }, toId: string, message: string,
): Promise<void> {
  const r = await fetch(`${SB}/friend_messages`, {
    method: "POST", headers: H_QUIET,
    body: JSON.stringify({
      from_id: me.id, from_name: me.name, to_id: toId,
      message, sent_at: Date.now(), read: false,
    }),
  });
  if (!r.ok) throw new Error("send failed");
}

export async function markRead(myId: string, friendId: string): Promise<void> {
  await fetch(
    `${SB}/friend_messages?to_id=eq.${encodeURIComponent(myId)}&from_id=eq.${encodeURIComponent(friendId)}&read=eq.false`,
    { method: "PATCH", headers: H_QUIET, body: JSON.stringify({ read: true }) },
  );
}

/** Total unread across all friends — for the title-screen badge. */
export async function unreadTotal(myId: string): Promise<number> {
  const counts = await fetchUnreadCounts(myId);
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

// ── Invites ───────────────────────────────────────────────────────────────

export async function sendInvite(
  me: { id: string; name: string }, toId: string, kind: "play" | "duel",
): Promise<void> {
  const r = await fetch(`${SB}/friend_invites`, {
    method: "POST", headers: H_QUIET,
    body: JSON.stringify({
      from_id: me.id, from_name: me.name, to_id: toId, kind,
      peer_id: peerIdFor(me.name), status: "pending", created_at: Date.now(),
    }),
  });
  if (!r.ok) throw new Error("invite failed");
}

/** Pending, non-stale invites aimed at me. */
export async function fetchInvites(myId: string): Promise<FriendInvite[]> {
  const since = Date.now() - INVITE_TTL_MS;
  const r = await fetch(
    `${SB}/friend_invites?to_id=eq.${encodeURIComponent(myId)}&status=eq.pending` +
    `&created_at=gt.${since}&order=created_at.desc&limit=10`,
    { headers: H_READ },
  );
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

export async function respondToInvite(inviteId: number, accept: boolean): Promise<void> {
  await fetch(`${SB}/friend_invites?id=eq.${inviteId}`, {
    method: "PATCH", headers: H_QUIET,
    body: JSON.stringify({ status: accept ? "accepted" : "declined" }),
  });
}

/** Did the friend I invited accept yet? Used by the challenger's wait screen. */
export async function inviteStatus(inviteId: number): Promise<string> {
  const r = await fetch(`${SB}/friend_invites?id=eq.${inviteId}&select=status`, { headers: H_READ });
  const rows = await r.json() as { status: string }[];
  return rows[0]?.status ?? "pending";
}
