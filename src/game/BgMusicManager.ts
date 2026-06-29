const SB  = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const H: Record<string, string> = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

// iPads report "MacIntel" with touch points in newer iPadOS
const isIOS = () =>
  /ipad|iphone|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const SONGS = [
  { id: "zV0iYdW1H3I", title: "Title Wave",       emoji: "🌊" },
  { id: "F05aMR0F6YM", title: "Nuke Powder",       emoji: "💥" },
  { id: "64Qfx-PZ2Qk", title: "Phobos (GD)",       emoji: "🔴" },
  { id: "zjJCqqV2410", title: "Abyss of Darkness",  emoji: "🌑" },
  { id: "bQXnREyaO34", title: "Grief",              emoji: "💔" },
  { id: "UDVbmaJGlKQ", title: "Heartbeat",          emoji: "❤️"  },
  { id: "ryBbuH_SPbs", title: "Limbo",              emoji: "🕳️"  },
  { id: "Xzb7apPvDos", title: "Bloodbath",          emoji: "🩸"  },
];

export class BgMusicManager {
  private static _inst: BgMusicManager | null = null;

  static get(): BgMusicManager {
    if (!BgMusicManager._inst) BgMusicManager._inst = new BgMusicManager();
    return BgMusicManager._inst;
  }

  private _iframe: HTMLIFrameElement;
  private _panel: HTMLDivElement | null;
  private _pill: HTMLDivElement;
  private _playing: boolean;
  private _expanded: boolean;
  private _currentId: string;
  private _currentTitle: string;
  private _lastUpdatedAt: number;

  private constructor() {
    this._playing = false;
    this._expanded = false;
    this._panel = null;
    this._currentId = "";
    this._currentTitle = "";
    this._lastUpdatedAt = 0;

    // The iframe lives at a fixed position in the body the whole time.
    // We resize + reposition it via CSS — no DOM re-parenting, so audio
    // never reloads after the user hits play on iOS.
    this._iframe = document.createElement("iframe");
    this._iframe.setAttribute("allow", "autoplay");
    this._iframe.setAttribute("allowfullscreen", "");
    this._setIframeSmall();
    document.body.appendChild(this._iframe);

    // Floating pill — bottom-right corner
    this._pill = document.createElement("div");
    this._pill.style.cssText =
      "position:fixed;bottom:14px;right:14px;z-index:99992;" +
      "background:rgba(0,0,0,0.82);border:1px solid rgba(255,255,255,0.18);" +
      "border-radius:22px;padding:7px 15px;cursor:pointer;display:none;" +
      "align-items:center;gap:7px;" +
      "color:rgba(255,255,255,0.9);font-size:13px;font-family:Arial,sans-serif;" +
      "backdrop-filter:blur(6px);user-select:none;transition:border-color 0.2s;";
    this._pill.innerHTML = `<span id="__bmPillText">🎵</span>`;
    this._pill.addEventListener("click", () => this._pillClick());
    document.body.appendChild(this._pill);

    this._poll();
    setInterval(() => this._poll(), 15_000);
  }

  // ── size helpers ────────────────────────────────────────────────────────────

  private _setIframeSmall(): void {
    // Technically "visible" (not display:none) so audio keeps playing,
    // but effectively invisible at 2×2px with near-zero opacity.
    this._iframe.style.cssText =
      "position:fixed;bottom:0;right:0;width:2px;height:2px;" +
      "opacity:0.01;border:none;pointer-events:none;z-index:1;";
  }

  private _setIframeLarge(): void {
    // 240×135 sits visually inside the panel (panel header is 34px above it).
    this._iframe.style.cssText =
      "position:fixed;bottom:60px;right:14px;z-index:99990;" +
      "width:240px;height:135px;border:none;" +
      "border-radius:0 0 12px 12px;pointer-events:all;";
  }

  // ── mini-player panel ────────────────────────────────────────────────────────

  private _openPanel(): void {
    if (this._panel) { this._panel.style.display = "block"; return; }

    this._panel = document.createElement("div");
    this._panel.style.cssText =
      "position:fixed;bottom:94px;right:14px;z-index:99991;" +
      "width:240px;" +
      "background:rgba(0,0,0,0.9);border:1px solid rgba(255,255,255,0.18);" +
      "border-radius:12px 12px 0 0;font-family:Arial,sans-serif;";
    this._panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <span id="__bmPanelTitle"
          style="color:rgba(255,255,255,0.75);font-size:11px;max-width:160px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          🎵 ${this._currentTitle}
        </span>
        <div style="display:flex;gap:4px;">
          <button id="__bmMinBtn"
            style="background:none;border:none;color:rgba(255,255,255,0.45);
              font-size:13px;cursor:pointer;padding:0 5px;line-height:1;">▼</button>
          <button id="__bmStopBtn"
            style="background:none;border:none;color:rgba(255,80,80,0.6);
              font-size:13px;cursor:pointer;padding:0 5px;line-height:1;">✕</button>
        </div>
      </div>
    `;
    document.body.appendChild(this._panel);
    document.getElementById("__bmMinBtn")!.onclick  = () => this._minimize();
    document.getElementById("__bmStopBtn")!.onclick = () => this.stop();
  }

  private _closePanel(): void {
    if (this._panel) this._panel.style.display = "none";
  }

  private _updatePanelTitle(): void {
    const el = document.getElementById("__bmPanelTitle");
    if (el) el.textContent = `🎵 ${this._currentTitle}`;
  }

  // ── playback ─────────────────────────────────────────────────────────────────

  private _pillClick(): void {
    if (!this._playing) {
      // First click → open player and load src
      this._expand();
    } else if (this._expanded) {
      // Playing + visible → minimize
      this._minimize();
    } else {
      // Playing + minimized → re-open panel
      this._expand(false);
    }
  }

  /** Open the mini player. loadSrc=true on first play, false when re-expanding. */
  private _expand(loadSrc = true): void {
    this._openPanel();
    this._setIframeLarge();
    this._expanded = true;

    if (loadSrc) {
      const auto = isIOS() ? 0 : 1;
      this._iframe.src =
        `https://www.youtube-nocookie.com/embed/${this._currentId}` +
        `?autoplay=${auto}&loop=1&playlist=${this._currentId}&controls=1`;
      this._playing = true;
    }
    this._updatePill();
  }

  private _minimize(): void {
    this._closePanel();
    this._setIframeSmall();
    this._expanded = false;
    this._updatePill();
  }

  play(id?: string, title?: string): void {
    if (id) { this._currentId = id; this._currentTitle = title ?? "Song"; }
    if (!this._currentId) return;
    this._pill.style.display = "flex";
    this._updatePanelTitle();
    this._expand(true);
  }

  stop(): void {
    this._iframe.src = "about:blank";
    this._playing = false;
    this._expanded = false;
    this._closePanel();
    this._setIframeSmall();
    this._updatePill();
  }

  private _updatePill(): void {
    const text = document.getElementById("__bmPillText");
    if (!text) return;
    if (this._playing && !this._expanded) {
      text.textContent = `🎵 ${this._currentTitle} ■`;
      this._pill.style.borderColor = "rgba(100,255,160,0.5)";
    } else if (this._playing && this._expanded) {
      text.textContent = `🎵 ${this._currentTitle} ▼`;
      this._pill.style.borderColor = "rgba(100,255,160,0.5)";
    } else {
      text.textContent = `🎵 ${this._currentTitle} ▶`;
      this._pill.style.borderColor = "rgba(255,255,255,0.18)";
    }
  }

  // ── Supabase polling ─────────────────────────────────────────────────────────

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
      this._pill.style.display = "flex";
      this._updatePill();
      this._updatePanelTitle();
    } catch { /* network */ }
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
