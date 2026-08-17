import type { DataConnection, Peer as PeerType } from "peerjs";

export type MPMsg =
  | { t: "cursor";        x: number; y: number; name: string; color: string }
  | { t: "inv";           items: number[] }
  | { t: "sync";          locks: number[]; inv: number[]; diff: number }
  | { t: "reqsync" }
  | { t: "gd_pos";        px: number; py: number; mode: string; name: string; color: string }
  | { t: "gd_level";      level: object | null }
  | { t: "duel_ready" }
  | { t: "duel_progress"; locksWon: number; total: number }
  | { t: "duel_win" };

const PLAYER_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F"];

/**
 * The PeerJS ID for a username. Every caller must use this one function:
 * host and joiner deriving the ID even slightly differently means they can
 * never find each other.
 *
 * PeerJS only accepts alphanumerics separated by single - _ or space, and
 * rejects a leading or trailing separator outright. The old inline version
 * replaced spaces but kept every other character, so a trailing space
 * ("WeeklyOwner ") produced "12clocks-weeklyowner-" and the broker refused it
 * with `invalid-id` — while joinPlayer trimmed first and looked for a
 * different ID again.
 */
export function peerIdForName(username: string): string {
  const slug = (username ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // punctuation, emoji, accents, spaces
    .replace(/^-+|-+$/g, "");      // no leading/trailing separator
  return slug ? `12clocks-${slug}` : "12clocks-player";
}

function colorFor(name: string): string {
  const h = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PLAYER_COLORS[h % PLAYER_COLORS.length];
}

export class MultiplayerManager {
  readonly name:  string;
  readonly color: string;

  private _peer: PeerType | null = null;
  private _conns = new Map<string, DataConnection>();
  private _cursorTimer = 0;
  isHost          = false; // true if we called goOnline() — only joiners request sync
  initialSyncDone = false; // prevents infinite reqsync loop
  /** Last PeerJS error type seen, so scenes can report why a connect failed. */
  lastError       = "";

  onCursor:     ((id: string, name: string, color: string, x: number, y: number) => void) | null = null;
  onInv:        ((items: number[]) => void) | null = null;
  onSync:       ((locks: number[], inv: number[], diff: number) => void) | null = null;
  onReqSync:    (() => void) | null = null;
  onConnect:    ((id: string) => void) | null = null;
  onDisconnect: ((id: string) => void) | null = null;
  onGdPos:       ((id: string, name: string, color: string, px: number, py: number, mode: string) => void) | null = null;
  onGdLevel:     ((level: object | null) => void) | null = null;
  onDuelReady:   (() => void) | null = null;
  onDuelProgress:((locksWon: number, total: number) => void) | null = null;
  onDuelWin:     (() => void) | null = null;
  private _gdPosTimer = 0;

  constructor(name: string) {
    this.name  = name;
    this.color = colorFor(name);
  }

  private async _makePeer(id?: string): Promise<PeerType> {
    const { Peer } = await import("peerjs");
    return id ? new Peer(id) : new Peer();
  }

  /** Go online using your username as the peer ID. Others can join you by typing your name. */
  async goOnline(): Promise<void> {
    const peerId = peerIdForName(this.name);
    this._peer = await this._makePeer(peerId);
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      const fail = (e: Error) => { if (!settled) { settled = true; reject(e); } };

      this._peer!.on("open", () => {
        this.isHost = true;
        this._peer!.on("connection", conn => this._setup(conn));
        done();
      });

      this._peer!.on("error", (err) => {
        const type = (err as unknown as { type?: string }).type ?? "";
        this.lastError = type || String(err);

        // Once we're connected, this handler must never tear the peer down.
        // "peer-unavailable" fires whenever *someone else* can't be reached,
        // and swapping our live peer out at that point would strand a friend
        // who was about to connect to us.
        if (settled) return;

        // Our own name is already claimed on the broker — nearly always our
        // stale peer from an earlier scene. Take a random ID so we can still
        // dial out; resolving on the dead peer would leave `id` null and every
        // later connect would hang until it timed out.
        if (type === "unavailable-id") {
          this._peer?.destroy();
          this._makePeer().then(p => {
            this._peer = p;
            p.on("open", () => {
              p.on("connection", conn => this._setup(conn));
              done(); // isHost stays false: nobody can find us by name
            });
            p.on("error", e => fail(new Error((e as unknown as { type?: string }).type ?? String(e))));
          }).catch(e => fail(e as Error));
          return;
        }
        fail(new Error(type || String(err)));
      });

      setTimeout(() => fail(new Error("timeout")), 10_000);
    });
  }

  /** True once we hold our username-based ID, so friends can dial us by name. */
  get isReachableByName(): boolean {
    return this.isHost && !!this._peer?.id;
  }

  /** Join another player by their username */
  async joinPlayer(username: string): Promise<void> {
    const targetId = peerIdForName(username);
    if (!this._peer) this._peer = await this._makePeer();
    return new Promise((resolve, reject) => {
      const connect = () => {
        const conn = this._peer!.connect(targetId, { reliable: true });
        this._setup(conn);
        conn.on("open", () => resolve());
        conn.on("error", reject);
        setTimeout(() => reject(new Error("timeout")), 10_000);
      };
      if (this._peer!.id) { connect(); }
      else { this._peer!.on("open", connect); }
    });
  }

  private _setup(conn: DataConnection): void {
    const activate = () => {
      this._conns.set(conn.peer, conn);
      this.onConnect?.(conn.peer);
    };
    if (conn.open) activate(); else conn.once("open", activate);

    conn.on("data", raw => {
      const m = raw as MPMsg;
      if      (m.t === "cursor")   this.onCursor?.(conn.peer, m.name, m.color, m.x, m.y);
      else if (m.t === "inv")      this.onInv?.(m.items);
      else if (m.t === "sync")     this.onSync?.(m.locks, m.inv, m.diff);
      else if (m.t === "reqsync")  this.onReqSync?.();
      else if (m.t === "gd_pos")       this.onGdPos?.(conn.peer, m.name, m.color, m.px, m.py, m.mode);
      else if (m.t === "gd_level")     this.onGdLevel?.(m.level);
      else if (m.t === "duel_ready")   this.onDuelReady?.();
      else if (m.t === "duel_progress") this.onDuelProgress?.(m.locksWon, m.total);
      else if (m.t === "duel_win")     this.onDuelWin?.();
    });
    conn.on("close", () => {
      this._conns.delete(conn.peer);
      this.onDisconnect?.(conn.peer);
    });
  }

  /** Throttled cursor send (~30fps) */
  sendCursor(worldX: number, worldY: number): void {
    const now = Date.now();
    if (now - this._cursorTimer < 33) return;
    this._cursorTimer = now;
    this._broadcast({ t: "cursor", x: worldX, y: worldY, name: this.name, color: this.color });
  }

  sendGdPos(px: number, py: number, mode: string): void {
    const now = Date.now();
    if (now - this._gdPosTimer < 50) return;
    this._gdPosTimer = now;
    this._broadcast({ t: "gd_pos", px, py, mode, name: this.name, color: this.color });
  }

  sendGdLevel(level: object | null): void {
    this._broadcast({ t: "gd_level", level });
  }

  sendInv(items: number[]): void {
    this._broadcast({ t: "inv", items });
  }

  sendSync(locks: number[], inv: number[], diff: number): void {
    this._broadcast({ t: "sync", locks, inv, diff });
  }

  sendDuelReady():                            void { this._broadcast({ t: "duel_ready" }); }
  sendDuelProgress(locksWon: number, total: number): void { this._broadcast({ t: "duel_progress", locksWon, total }); }
  sendDuelWin():                              void { this._broadcast({ t: "duel_win" }); }

  requestSync(): void {
    this._broadcast({ t: "reqsync" });
  }

  private _broadcast(msg: MPMsg): void {
    this._conns.forEach(c => { if (c.open) c.send(msg); });
  }

  get playerCount(): number { return this._conns.size + 1; }

  dispose(): void {
    this._conns.forEach(c => c.close());
    this._peer?.destroy();
    this._peer = null;
    this._conns.clear();
  }
}
