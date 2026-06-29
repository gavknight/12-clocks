const SB  = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const H: Record<string, string> = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

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

export interface SequencerPattern {
  type: "sequencer";
  title: string;
  bpm: number;
  tracks: { id: string; steps: boolean[] }[];
}

// ─── Synth helpers ───────────────────────────────────────────────────────────

function synthKick(ctx: AudioContext, when: number) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.setValueAtTime(160, when);
  o.frequency.exponentialRampToValueAtTime(0.001, when + 0.4);
  g.gain.setValueAtTime(0.9, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.4);
  o.start(when); o.stop(when + 0.4);
}

function synthSnare(ctx: AudioContext, when: number) {
  const len = ctx.sampleRate * 0.18;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource(); n.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2200; f.Q.value = 0.7;
  const g = ctx.createGain();
  n.connect(f); f.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.7, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
  n.start(when); n.stop(when + 0.18);
  // body
  const o = ctx.createOscillator(), og = ctx.createGain();
  o.connect(og); og.connect(ctx.destination);
  o.frequency.value = 180;
  og.gain.setValueAtTime(0.25, when);
  og.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
  o.start(when); o.stop(when + 0.1);
}

function synthHat(ctx: AudioContext, when: number, open: boolean) {
  const dur = open ? 0.28 : 0.045;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const n = ctx.createBufferSource(); n.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 8000;
  const g = ctx.createGain();
  n.connect(f); f.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(open ? 0.35 : 0.5, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  n.start(when); n.stop(when + dur);
}

function synthBass(ctx: AudioContext, when: number) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sawtooth"; o.frequency.value = 80;
  o.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.65, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
  o.start(when); o.stop(when + 0.22);
}

function synthLead(ctx: AudioContext, when: number) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "square"; o.frequency.value = 440;
  o.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.25, when);
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
  o.start(when); o.stop(when + 0.18);
}

// ─── Manager ─────────────────────────────────────────────────────────────────

export class BgMusicManager {
  private static _inst: BgMusicManager | null = null;
  static get(): BgMusicManager {
    if (!BgMusicManager._inst) BgMusicManager._inst = new BgMusicManager();
    return BgMusicManager._inst;
  }

  // YouTube
  private _iframe: HTMLIFrameElement;
  private _panel: HTMLDivElement | null;
  private _ytId: string;
  private _ytTitle: string;
  private _expanded: boolean;

  // Sequencer
  private _seqPattern: SequencerPattern | null;
  private _audioCtx: AudioContext | null;
  private _seqTimer: number;
  private _seqStep: number;
  private _seqNextTime: number;

  // Shared
  private _pill: HTMLDivElement;
  private _playing: boolean;
  private _lastUpdatedAt: number;

  private constructor() {
    this._panel = null;
    this._ytId = ""; this._ytTitle = "";
    this._expanded = false;
    this._seqPattern = null; this._audioCtx = null;
    this._seqTimer = 0; this._seqStep = 0; this._seqNextTime = 0;
    this._playing = false;
    this._lastUpdatedAt = 0;

    this._iframe = document.createElement("iframe");
    this._iframe.setAttribute("allow", "autoplay");
    this._iframe.setAttribute("allowfullscreen", "");
    this._setIframeSmall();
    document.body.appendChild(this._iframe);

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

  // ── iframe sizing ────────────────────────────────────────────────────────────

  private _setIframeSmall(): void {
    this._iframe.style.cssText =
      "position:fixed;bottom:0;right:0;width:2px;height:2px;" +
      "opacity:0.01;border:none;pointer-events:none;z-index:1;";
  }
  private _setIframeLarge(): void {
    this._iframe.style.cssText =
      "position:fixed;bottom:60px;right:14px;z-index:99990;" +
      "width:240px;height:135px;border:none;" +
      "border-radius:0 0 12px 12px;pointer-events:all;";
  }

  // ── YouTube mini-player panel ─────────────────────────────────────────────────

  private _openPanel(): void {
    if (this._panel) { this._panel.style.display = "block"; return; }
    this._panel = document.createElement("div");
    this._panel.style.cssText =
      "position:fixed;bottom:94px;right:14px;z-index:99991;width:240px;" +
      "background:rgba(0,0,0,0.9);border:1px solid rgba(255,255,255,0.18);" +
      "border-radius:12px 12px 0 0;font-family:Arial,sans-serif;";
    this._panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:7px 10px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <span id="__bmPanelTitle" style="color:rgba(255,255,255,0.75);font-size:11px;
          max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          🎵 ${this._ytTitle}
        </span>
        <div style="display:flex;gap:4px;">
          <button id="__bmMinBtn" style="background:none;border:none;
            color:rgba(255,255,255,0.45);font-size:13px;cursor:pointer;padding:0 5px;">▼</button>
          <button id="__bmStopBtn" style="background:none;border:none;
            color:rgba(255,80,80,0.6);font-size:13px;cursor:pointer;padding:0 5px;">✕</button>
        </div>
      </div>`;
    document.body.appendChild(this._panel);
    document.getElementById("__bmMinBtn")!.onclick  = () => this._minimize();
    document.getElementById("__bmStopBtn")!.onclick = () => this.stop();
  }
  private _closePanel(): void { if (this._panel) this._panel.style.display = "none"; }
  private _updatePanelTitle(): void {
    const el = document.getElementById("__bmPanelTitle");
    if (el) el.textContent = `🎵 ${this._ytTitle}`;
  }

  // ── pill ──────────────────────────────────────────────────────────────────────

  private _pillClick(): void {
    if (this._seqPattern) {
      // Sequencer mode: toggle play/stop
      if (this._playing) this.stop();
      else this.playSequencer(this._seqPattern);
      return;
    }
    // YouTube mode
    if (!this._playing) {
      this._expand(true);
    } else if (this._expanded) {
      this._minimize();
    } else {
      this._expand(false);
    }
  }

  private _expand(loadSrc: boolean): void {
    this._openPanel();
    this._setIframeLarge();
    this._expanded = true;
    if (loadSrc) {
      const auto = isIOS() ? 0 : 1;
      this._iframe.src =
        `https://www.youtube-nocookie.com/embed/${this._ytId}` +
        `?autoplay=${auto}&loop=1&playlist=${this._ytId}&controls=1`;
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

  private _currentTitle(): string {
    return this._seqPattern ? this._seqPattern.title : this._ytTitle;
  }

  private _updatePill(): void {
    const text = document.getElementById("__bmPillText");
    if (!text) return;
    const t = this._currentTitle();
    if (this._playing && !this._expanded) {
      text.textContent = `🎵 ${t} ■`;
      this._pill.style.borderColor = "rgba(100,255,160,0.5)";
    } else if (this._playing && this._expanded) {
      text.textContent = `🎵 ${t} ▼`;
      this._pill.style.borderColor = "rgba(100,255,160,0.5)";
    } else {
      text.textContent = `🎵 ${t} ▶`;
      this._pill.style.borderColor = "rgba(255,255,255,0.18)";
    }
  }

  // ── YouTube public API ────────────────────────────────────────────────────────

  play(id?: string, title?: string): void {
    if (id) { this._ytId = id; this._ytTitle = title ?? "Song"; }
    this._seqPattern = null;
    if (!this._ytId) return;
    this._pill.style.display = "flex";
    this._updatePanelTitle();
    this._expand(true);
  }

  // ── Sequencer public API ──────────────────────────────────────────────────────

  playSequencer(pattern: SequencerPattern): void {
    // Stop any YouTube
    this._iframe.src = "about:blank";
    this._closePanel();
    this._setIframeSmall();
    this._expanded = false;

    this._seqPattern = pattern;
    if (!this._audioCtx) this._audioCtx = new AudioContext();
    if (this._audioCtx.state === "suspended") this._audioCtx.resume();

    clearInterval(this._seqTimer);
    this._seqStep = 0;
    this._seqNextTime = this._audioCtx.currentTime + 0.05;
    this._seqTimer = window.setInterval(() => this._scheduleSoon(), 25);
    this._playing = true;
    this._pill.style.display = "flex";
    this._updatePill();
  }

  private _scheduleSoon(): void {
    if (!this._audioCtx || !this._seqPattern) return;
    const spb = 60 / this._seqPattern.bpm;
    const sps = spb / 4; // 16th note = quarter of a beat
    while (this._seqNextTime < this._audioCtx.currentTime + 0.15) {
      this._fireStep(this._seqStep, this._seqNextTime);
      this._seqStep = (this._seqStep + 1) % 16;
      this._seqNextTime += sps;
    }
  }

  private _fireStep(step: number, when: number): void {
    if (!this._audioCtx || !this._seqPattern) return;
    const ctx = this._audioCtx;
    for (const track of this._seqPattern.tracks) {
      if (!track.steps[step]) continue;
      switch (track.id) {
        case "kick":    synthKick(ctx, when); break;
        case "snare":   synthSnare(ctx, when); break;
        case "hihat":   synthHat(ctx, when, false); break;
        case "openhat": synthHat(ctx, when, true); break;
        case "bass":    synthBass(ctx, when); break;
        case "lead":    synthLead(ctx, when); break;
      }
    }
  }

  // ── stop (both modes) ─────────────────────────────────────────────────────────

  stop(): void {
    // YouTube
    this._iframe.src = "about:blank";
    this._closePanel();
    this._setIframeSmall();
    this._expanded = false;
    // Sequencer
    clearInterval(this._seqTimer);
    this._seqTimer = 0;
    if (this._audioCtx) this._audioCtx.suspend();
    // Shared
    this._playing = false;
    this._updatePill();
  }

  // ── Supabase ──────────────────────────────────────────────────────────────────

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

      const cfg = JSON.parse(value) as { type?: string; id?: string; title?: string; bpm?: number; tracks?: unknown[] };

      if (!cfg || (!cfg.id && cfg.type !== "sequencer")) {
        this.stop();
        this._ytId = ""; this._ytTitle = "";
        this._seqPattern = null;
        this._pill.style.display = "none";
        return;
      }

      if (cfg.type === "sequencer") {
        this._seqPattern = cfg as SequencerPattern;
        this._ytId = ""; this._ytTitle = "";
        this._pill.style.display = "flex";
        this._updatePill();
      } else {
        this._seqPattern = null;
        this._ytId = cfg.id ?? "";
        this._ytTitle = cfg.title ?? "Song";
        this._pill.style.display = "flex";
        this._updatePill();
      }
    } catch { /* network */ }
  }

  async setGlobal(id: string, title: string): Promise<void> {
    const now = Date.now();
    await fetch(`${SB}/global_settings`, {
      method: "POST", headers: H,
      body: JSON.stringify({ key: "bg_music", value: JSON.stringify({ id, title }), updated_at: now }),
    });
    this._lastUpdatedAt = now;
    this._seqPattern = null;
    this._ytId = id; this._ytTitle = title;
    this._pill.style.display = "flex";
    this._updatePill();
  }

  async setGlobalSequencer(pattern: SequencerPattern): Promise<void> {
    const now = Date.now();
    await fetch(`${SB}/global_settings`, {
      method: "POST", headers: H,
      body: JSON.stringify({ key: "bg_music", value: JSON.stringify(pattern), updated_at: now }),
    });
    this._lastUpdatedAt = now;
    this._seqPattern = pattern;
    this._ytId = ""; this._ytTitle = "";
    this._pill.style.display = "flex";
    this._updatePill();
  }

  async clearGlobal(): Promise<void> {
    const now = Date.now();
    await fetch(`${SB}/global_settings`, {
      method: "POST", headers: H,
      body: JSON.stringify({ key: "bg_music", value: JSON.stringify({ id: "", title: "" }), updated_at: now }),
    });
    this._lastUpdatedAt = now;
    this.stop();
    this._ytId = ""; this._ytTitle = "";
    this._seqPattern = null;
    this._pill.style.display = "none";
  }
}
