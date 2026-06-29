const SB  = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const H: Record<string, string> = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

export const SONGS = [
  { id: "zV0iYdW1H3I", title: "Title Wave",      emoji: "🌊" },
  { id: "F05aMR0F6YM", title: "Nuke Powder",      emoji: "💥" },
  { id: "64Qfx-PZ2Qk", title: "Phobos (GD)",      emoji: "🔴" },
  { id: "zjJCqqV2410", title: "Abyss of Darkness", emoji: "🌑" },
  { id: "bQXnREyaO34", title: "Grief",             emoji: "💔" },
  { id: "UDVbmaJGlKQ", title: "Heartbeat",         emoji: "❤️"  },
  { id: "ryBbuH_SPbs", title: "Limbo",             emoji: "🕳️"  },
  { id: "Xzb7apPvDos", title: "Bloodbath",         emoji: "🩸"  },
];

export class BgMusicManager {
  private static _inst: BgMusicManager | null = null;

  static get(): BgMusicManager {
    if (!BgMusicManager._inst) BgMusicManager._inst = new BgMusicManager();
    return BgMusicManager._inst;
  }

  private _iframe: HTMLIFrameElement;
  private _pill: HTMLDivElement;
  private _playing: boolean;
  private _currentId: string;
  private _currentTitle: string;
  private _lastUpdatedAt: number;

  private constructor() {
    this._playing = false;
    this._currentId = "";
    this._currentTitle = "";
    this._lastUpdatedAt = 0;

    // YouTube needs the iframe to be in the DOM and not display:none.
    // 2×2px with near-zero opacity keeps it audible but invisible.
    this._iframe = document.createElement("iframe");
    this._iframe.style.cssText =
      "position:fixed;bottom:0;right:0;width:2px;height:2px;" +
      "opacity:0.01;border:none;pointer-events:none;z-index:1;";
    this._iframe.setAttribute("allow", "autoplay");
    this._iframe.setAttribute("allowfullscreen", "");
    document.body.appendChild(this._iframe);

    this._pill = document.createElement("div");
    this._pill.style.cssText =
      "position:fixed;bottom:14px;right:14px;z-index:99990;" +
      "background:rgba(0,0,0,0.78);border:1px solid rgba(255,255,255,0.18);" +
      "border-radius:22px;padding:7px 15px;cursor:pointer;display:none;" +
      "align-items:center;gap:7px;" +
      "color:rgba(255,255,255,0.88);font-size:13px;font-family:Arial,sans-serif;" +
      "backdrop-filter:blur(6px);user-select:none;" +
      "transition:border-color 0.2s;";
    this._pill.innerHTML = `<span id="__bmPillText">🎵</span>`;
    this._pill.addEventListener("click", () => this._toggle());
    document.body.appendChild(this._pill);

    this._poll();
    setInterval(() => this._poll(), 15_000);
  }

  private async _poll(): Promise<void> {
    try {
      const res = await fetch(
        `${SB}/global_settings?key=eq.bg_music&select=value,updated_at`,
        { headers: H },
      );
      if (!res.ok) return;
      const rows: { value: string; updated_at: number }[] = await res.json();
      if (!rows.length) return;
      const { value, updated_at } = rows[0];
      if (updated_at <= this._lastUpdatedAt) return;
      this._lastUpdatedAt = updated_at;
      const cfg: { id: string; title: string } = JSON.parse(value);
      if (!cfg.id) {
        this.stop();
        this._currentId = "";
        this._currentTitle = "";
        this._pill.style.display = "none";
        return;
      }
      this._currentId = cfg.id;
      this._currentTitle = cfg.title;
      this._updatePill();
      this._pill.style.display = "flex";
    } catch { /* network */ }
  }

  private _toggle(): void {
    if (this._playing) this.stop();
    else this.play();
  }

  play(id?: string, title?: string): void {
    if (id) { this._currentId = id; this._currentTitle = title ?? "Song"; }
    if (!this._currentId) return;
    this._iframe.src =
      `https://www.youtube-nocookie.com/embed/${this._currentId}` +
      `?autoplay=1&loop=1&playlist=${this._currentId}&controls=0`;
    this._playing = true;
    this._pill.style.display = "flex";
    this._updatePill();
  }

  stop(): void {
    this._iframe.src = "about:blank";
    this._playing = false;
    this._updatePill();
  }

  private _updatePill(): void {
    const text = document.getElementById("__bmPillText");
    if (!text) return;
    if (this._playing) {
      text.textContent = `🎵 ${this._currentTitle} ■`;
      this._pill.style.borderColor = "rgba(100,255,160,0.5)";
    } else {
      text.textContent = `🎵 ${this._currentTitle} ▶`;
      this._pill.style.borderColor = "rgba(255,255,255,0.18)";
    }
  }

  async setGlobal(id: string, title: string): Promise<void> {
    const now = Date.now();
    await fetch(`${SB}/global_settings`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ key: "bg_music", value: JSON.stringify({ id, title }), updated_at: now }),
    });
    this._lastUpdatedAt = now;
    this._currentId = id;
    this._currentTitle = title;
    this._pill.style.display = "flex";
    this._updatePill();
  }

  async clearGlobal(): Promise<void> {
    const now = Date.now();
    await fetch(`${SB}/global_settings`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ key: "bg_music", value: JSON.stringify({ id: "", title: "" }), updated_at: now }),
    });
    this._lastUpdatedAt = now;
    this.stop();
    this._currentId = "";
    this._currentTitle = "";
    this._pill.style.display = "none";
  }
}
