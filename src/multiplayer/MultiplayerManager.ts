import type { DataConnection, Peer as PeerType } from "peerjs";

export type MPMsg =
  | { t: "cursor";   x: number; y: number; name: string; color: string }
  | { t: "inv";      items: number[] }
  | { t: "sync";     locks: number[]; inv: number[]; diff: number }
  | { t: "reqsync" }  // joiner asks host for current state
  | { t: "gd_pos";   px: number; py: number; mode: string; name: string; color: string }
  | { t: "gd_level"; level: object | null };

const PLAYER_COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#FFEAA7","#DDA0DD","#98D8C8","#F7DC6F"];

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

  onCursor:     ((id: string, name: string, color: string, x: number, y: number) => void) | null = null;
  onInv:        ((items: number[]) => void) | null = null;
  onSync:       ((locks: number[], inv: number[], diff: number) => void) | null = null;
  onReqSync:    (() => void) | null = null;
  onConnect:    ((id: string) => void) | null = null;
  onDisconnect: ((id: string) => void) | null = null;
  onGdPos:      ((id: string, name: string, color: string, px: number, py: number, mode: string) => void) | null = null;
  onGdLevel:    ((level: object | null) => void) | null = null;
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
    const peerId = `12clocks-${this.name.toLowerCase().replace(/\s+/g, "-")}`;
    this._peer = await this._makePeer(peerId);
    return new Promise((resolve, reject) => {
      this._peer!.on("open", () => {
        this.isHost = true;
        this._peer!.on("connection", conn => this._setup(conn));
        resolve();
      });
      this._peer!.on("error", (err) => {
        // ID taken — fall back to a random peer (can still join others)
        if (String(err).includes("unavailable")) { resolve(); return; }
        reject(err);
      });
      setTimeout(() => reject(new Error("timeout")), 10_000);
    });
  }

  /** Join another player by their username */
  async joinPlayer(username: string): Promise<void> {
    const targetId = `12clocks-${username.trim().toLowerCase().replace(/\s+/g, "-")}`;
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
      else if (m.t === "gd_pos")   this.onGdPos?.(conn.peer, m.name, m.color, m.px, m.py, m.mode);
      else if (m.t === "gd_level") this.onGdLevel?.(m.level);
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
