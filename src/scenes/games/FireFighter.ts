import type { Game } from "../../game/Game";
import { gpState } from "../../input/GamepadManager";

const TOTAL_LEVELS = 8000;
const SAVE_KEY     = "firefighter_v2";
const EXT_RANGE    = 55;   // horizontal px either side of hose to hit a fire

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
}

function fireCount(level: number): number {
  // Gentle ramp: level 1 = 2 fires, level 100 = 7, level 500 = 15, caps at 20
  return Math.min(2 + Math.floor(level / 18), 20);
}

interface Fire    { x: number; y: number; out: boolean; }
interface Spray   { x: number; t: number; hits: number; }
interface Splash  { x: number; y: number; t: number; }

export class FireFighter {
  private _g:      Game;
  private _canvas: HTMLCanvasElement;
  private _ctx:    CanvasRenderingContext2D;

  private _level      = 1;
  private _fires:     Fire[]   = [];
  private _sprays:    Spray[]  = [];
  private _splashes:  Splash[] = [];
  private _shots      = 0;     // total shots fired this level (just for display)

  private _playerX    = 0;
  private _mouseX     = 0;
  private _levelClear = false;
  private _clearTimer = 0;

  private _done   = false;
  private _raf    = 0;
  private _lastTs = 0;
  private _cleanup: (() => void)[] = [];

  constructor(g: Game) {
    this._g = g;

    g.ui.innerHTML = `
      <div style="position:relative;width:100%;height:100%;
                  background:#000;pointer-events:all;touch-action:none;overflow:hidden;">
        <canvas id="ffCanvas" style="display:block;width:100%;height:100%;"></canvas>
      </div>`;

    this._canvas = document.getElementById("ffCanvas") as HTMLCanvasElement;
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._ctx = this._canvas.getContext("2d")!;

    this._playerX = this._canvas.width / 2;
    this._mouseX  = this._playerX;

    this._level = this._load();
    this._spawnLevel();

    g.inMiniGame        = true;
    g.autoClickCallback = () => { if (!this._levelClear) this._fireHose(); };

    // Mouse steer
    const onMove = (e: MouseEvent) => {
      this._mouseX = e.clientX * (this._canvas.width / window.innerWidth);
    };
    window.addEventListener("mousemove", onMove);
    this._cleanup.push(() => window.removeEventListener("mousemove", onMove));

    // Touch steer
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      this._mouseX = e.touches[0].clientX * (this._canvas.width / window.innerWidth);
    };
    this._canvas.addEventListener("touchmove", onTouch, { passive: false });
    this._cleanup.push(() => this._canvas.removeEventListener("touchmove", onTouch));

    // Click — shoot hose or back button
    const onClick = (e: MouseEvent) => {
      const sx = e.clientX * (this._canvas.width / window.innerWidth);
      const sy = e.clientY * (this._canvas.height / window.innerHeight);
      if (sy < 58 && sx < 130) { this._end(); return; }
      if (!this._levelClear) this._fireHose();
    };
    this._canvas.addEventListener("click", onClick);
    this._cleanup.push(() => this._canvas.removeEventListener("click", onClick));

    // Resize
    const onResize = () => {
      this._canvas.width  = window.innerWidth;
      this._canvas.height = window.innerHeight;
      this._ctx = this._canvas.getContext("2d")!;
      this._spawnLevel();
    };
    window.addEventListener("resize", onResize);
    this._cleanup.push(() => window.removeEventListener("resize", onResize));

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Level ─────────────────────────────────────────────────────────────────

  private _spawnLevel(): void {
    const W      = this._canvas.width;
    const H      = this._canvas.height;
    const rng    = lcg(this._level * 999983 + 13);
    const n      = fireCount(this._level);
    const margin = 65;
    const maxY   = H * 0.68;

    this._fires      = [];
    this._sprays     = [];
    this._splashes   = [];
    this._shots      = 0;
    this._levelClear = false;
    this._clearTimer = 0;

    for (let i = 0; i < n; i++) {
      this._fires.push({
        x:   margin + rng() * (W - margin * 2),
        y:   margin + rng() * (maxY - margin),
        out: false,
      });
    }
  }

  // ── Shoot ─────────────────────────────────────────────────────────────────

  private _fireHose(): void {
    this._shots++;
    const sx   = this._playerX;
    let   hits = 0;

    for (const f of this._fires) {
      if (f.out) continue;
      if (Math.abs(f.x - sx) < EXT_RANGE) {
        f.out = true;
        hits++;
        this._splashes.push({ x: f.x, y: f.y, t: 800 });
      }
    }

    this._sprays.push({ x: sx, t: 450, hits });

    if (this._fires.every(f => f.out)) {
      this._levelClear = true;
      this._clearTimer = 1200;
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  private _loop(ts: number): void {
    const dt = Math.min(ts - this._lastTs, 50);
    this._lastTs = ts;
    this._update(dt);
    this._draw();
    if (!this._done) this._raf = requestAnimationFrame(t => this._loop(t));
  }

  private _update(dt: number): void {
    const W = this._canvas.width;
    // Controller left stick moves aim
    if (Math.abs(gpState.lx) > 0.12) {
      this._mouseX = Math.max(0, Math.min(W, this._mouseX + gpState.lx * 18));
    }
    this._playerX += (this._mouseX - this._playerX) * Math.min(1, 14 * dt / 1000);
    this._playerX  = Math.max(24, Math.min(W - 24, this._playerX));

    if (this._levelClear) {
      this._clearTimer -= dt;
      if (this._clearTimer <= 0) {
        this._level = Math.min(this._level + 1, TOTAL_LEVELS);
        this._save();
        this._spawnLevel();
      }
    }

    for (const s of this._sprays)   s.t -= dt;
    for (const s of this._splashes) s.t -= dt;
    this._sprays   = this._sprays.filter(s => s.t > 0);
    this._splashes = this._splashes.filter(s => s.t > 0);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  private _draw(): void {
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const ctx = this._ctx;
    const py  = H - 60;

    ctx.fillStyle = "#0e0604";
    ctx.fillRect(0, 0, W, H);

    const haze = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    haze.addColorStop(0, "rgba(60,20,0,0.4)");
    haze.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H * 0.4);

    ctx.fillStyle = "#1e0d04"; ctx.fillRect(0, py + 24, W, H - py - 24);
    ctx.fillStyle = "#3a1a08"; ctx.fillRect(0, py + 22, W, 4);

    // Fires
    ctx.font = "30px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of this._fires) {
      if (f.out) continue;
      const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 42);
      glow.addColorStop(0, "rgba(255,150,0,0.55)");
      glow.addColorStop(1, "rgba(255,50,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(f.x, f.y, 42, 0, Math.PI * 2); ctx.fill();
      ctx.fillText("🔥", f.x, f.y);
    }

    // Spray beams
    for (const sp of this._sprays) {
      const p     = sp.t / 450;
      const alpha = p * 0.85;
      const sg = ctx.createLinearGradient(sp.x, py - 10, sp.x, 0);
      sg.addColorStop(0, `rgba(80,170,255,${alpha})`);
      sg.addColorStop(1, `rgba(160,230,255,${alpha * 0.15})`);
      ctx.strokeStyle = sg; ctx.lineWidth = 6 + (1 - p) * 4;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -(performance.now() / 25) % 20;
      ctx.beginPath(); ctx.moveTo(sp.x, py - 10); ctx.lineTo(sp.x, 20); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;

      if (sp.hits === 0 && p > 0.3) {
        ctx.fillStyle = `rgba(255,90,90,${(p - 0.3) * 1.4})`;
        ctx.font = "bold 18px Arial, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("MISS!", sp.x, py - 65);
      }
    }

    // Splashes
    ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const s of this._splashes) {
      const p = s.t / 800;
      ctx.globalAlpha = p;
      ctx.fillText("💧", s.x - 14, s.y - (1 - p) * 28);
      ctx.fillText("💧", s.x + 12, s.y - (1 - p) * 20);
      ctx.strokeStyle = `rgba(100,190,255,${p * 0.7})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(s.x, s.y, (1 - p) * 32 + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Aim line
    if (!this._levelClear) {
      ctx.strokeStyle = "rgba(100,200,255,0.2)"; ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(this._playerX + 8, py - 12); ctx.lineTo(this._playerX + 8, 30); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Player
    ctx.font = "36px serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText("🧑‍🚒", this._playerX, py + 26);

    // Level clear
    if (this._levelClear) {
      const prog = 1 - this._clearTimer / 1200;
      ctx.fillStyle = `rgba(30,180,60,${prog * 0.18})`; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(80,255,120,${Math.min(1, prog * 2.5)})`;
      ctx.font = "bold 42px 'Arial Black', Arial, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("✅ Level Clear!", W / 2, H / 2);
    }

    this._drawHUD();
  }

  private _drawHUD(): void {
    const W   = this._canvas.width;
    const ctx = this._ctx;
    const rem = this._fires.filter(f => !f.out).length;

    ctx.fillStyle = "rgba(0,0,0,0.80)";
    ctx.fillRect(0, 0, W, 54);

    // Back button
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.roundRect(12, 10, 90, 32, 8); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(12, 10, 90, 32, 8); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 13px Arial, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("← Back", 22, 26);

    // Level
    ctx.fillStyle = "#ff8c00";
    ctx.font = "bold 18px 'Arial Black', Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`🔥 Level ${this._level.toLocaleString()} / 8,000`, W / 2, 26);

    // Fires left + shots
    ctx.fillStyle = rem === 0 ? "#44ff88" : "#fff";
    ctx.font = "bold 13px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${rem} fire${rem !== 1 ? "s" : ""} left  •  ${this._shots} shot${this._shots !== 1 ? "s" : ""} fired`, W - 14, 26);

    // Progress bar
    const pct = (this._level - 1) / TOTAL_LEVELS;
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath(); ctx.roundRect(12, 49, W - 24, 5, 3); ctx.fill();
    ctx.fillStyle = pct > 0.9 ? "#44ff88" : pct > 0.5 ? "#ffcc00" : "#ff6600";
    ctx.beginPath(); ctx.roundRect(12, 49, (W - 24) * pct, 5, 3); ctx.fill();

    if (this._level <= 2) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "13px Arial, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("Move mouse to aim · Click to spray!", W / 2, 58);
    }
  }

  // ── Save / Load / End ─────────────────────────────────────────────────────

  private _save(): void { localStorage.setItem(SAVE_KEY, String(this._level)); }
  private _load(): number {
    const n = parseInt(localStorage.getItem(SAVE_KEY) ?? "1", 10);
    return isNaN(n) ? 1 : Math.max(1, Math.min(TOTAL_LEVELS, n));
  }

  private _end(): void {
    this._done = true;
    this._save();
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(fn => fn());
    this._g.inMiniGame        = false;
    this._g.autoClickCallback = null;
    this._g.goArcade();
  }
}
