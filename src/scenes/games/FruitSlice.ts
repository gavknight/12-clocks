import type { Game } from "../../game/Game";

const BASE_DURATION  = () => parseInt(localStorage.getItem("mg_duration") ?? "60", 10);
const FRUITS         = ["🍉","🍊","🍋","🍇","🍓","🍑","🍍","🥭"];
const COINS_PER_FRUIT = 3;
const FRUIT_RADIUS   = 34; // px — hit-test radius for swipe collision

interface Fruit {
  el:   HTMLDivElement;
  cx:   number; // current centre X in px
  cy:   number; // current centre Y in px
  y:    number; // top-left Y for positioning
  vy:   number; // px/ms (negative = upward)
  dead: boolean;
}

export class FruitSlice {
  private _arena:    HTMLDivElement;
  private _scoreEl:  HTMLSpanElement;
  private _timerEl:  HTMLSpanElement;
  private _trailCvs: HTMLCanvasElement;
  private _trailCtx: CanvasRenderingContext2D;

  private _fruits:     Fruit[] = [];
  private _score      = 0;
  private _timeLeft   = 0;
  private _lastTs     = 0;
  private _spawnTimer = 0;
  private _raf        = 0;
  private _done       = false;
  private _boost      = false;
  private _coinMult   = 1;
  private _spawnMult  = 1;
  private _g:         Game;

  // Swipe state
  private _slicing      = false;
  private _prevX        = 0;
  private _prevY        = 0;
  private _cleanupInput = () => {};

  constructor(game: Game) {
    this._g = game;
    this._timeLeft = BASE_DURATION();
    const hasHacks = game.hasHacks;
    game.ui.innerHTML = `
      <div id="fsRoot" style="
        position:relative;width:100%;height:100%;overflow:hidden;
        background:linear-gradient(160deg,#0a001e,#1a0840,#0a1808);
        user-select:none;
      ">
        <!-- Stars -->
        ${Array.from({length:12},(_,i)=>`<div style="position:absolute;
          left:${[6,14,28,44,58,72,84,92,20,38,66,80][i]}%;
          top:${[4,10,3,7,2,8,5,12,16,14,10,18][i]}%;
          width:2px;height:2px;border-radius:50%;background:white;
          opacity:${0.3+i*0.04};pointer-events:none;"></div>`).join("")}

        <!-- HUD -->
        <div style="
          position:absolute;top:0;left:0;right:0;z-index:20;
          display:flex;justify-content:space-between;align-items:center;
          padding:10px 16px;background:rgba(0,0,0,0.45);pointer-events:none;
        ">
          <span style="color:#FFD700;font-size:18px;font-weight:bold;">
            🪙 <span id="fsScore">0</span>
          </span>
          <span id="fsTimer" style="color:white;font-size:18px;font-weight:bold;">⏱ 60s</span>
        </div>

        <!-- Hint -->
        <div style="
          position:absolute;bottom:20px;left:0;right:0;text-align:center;
          color:rgba(255,255,255,0.35);font-size:13px;pointer-events:none;
          font-family:Arial,sans-serif;z-index:20;
        ">Swipe through fruits to slice them!</div>

        ${hasHacks ? `
          <button id=\"fsBoost\" style=\"
            position:absolute;top:60px;right:10px;z-index:20;
            background:rgba(255,140,0,0.25);color:#FFD700;font-size:13px;font-weight:bold;
            padding:6px 12px;border-radius:10px;border:2px solid rgba(255,140,0,0.6);
            cursor:pointer;font-family:Arial,sans-serif;\">
            ⚡ BOOST
          </button>` : ""}

        <!-- Fruit arena -->
        <div id="fsArena" style="position:absolute;inset:0;touch-action:none;"></div>

        <!-- Slash trail canvas (on top, pointer-events none) -->
        <canvas id="fsTrail" style="
          position:absolute;inset:0;pointer-events:none;z-index:10;
        "></canvas>
      </div>
    `;

    this._arena    = document.getElementById("fsArena")   as HTMLDivElement;
    this._scoreEl  = document.getElementById("fsScore")   as HTMLSpanElement;
    this._timerEl  = document.getElementById("fsTimer")   as HTMLSpanElement;
    this._trailCvs = document.getElementById("fsTrail")   as HTMLCanvasElement;
    this._trailCtx = this._trailCvs.getContext("2d")!;

    this._resizeTrail();
    window.addEventListener("resize", () => this._resizeTrail());

    if (hasHacks) {
      document.getElementById("fsBoost")!.addEventListener("click", () => {
        this._boost     = !this._boost;
        this._coinMult  = this._boost ? 3 : 1;
        this._spawnMult = this._boost ? 0.5 : 1;
        const btn = document.getElementById("fsBoost")!;
        btn.textContent  = this._boost ? "⚡ BOOSTED!" : "⚡ BOOST";
        btn.style.background = this._boost ? "rgba(255,140,0,0.7)" : "rgba(255,140,0,0.25)";
      });
    }

    // Swipe detection — listen on document so nothing blocks it
    const onDown = (e: PointerEvent) => {
      this._slicing = true;
      const r = this._arena.getBoundingClientRect();
      this._prevX = e.clientX - r.left;
      this._prevY = e.clientY - r.top;
    };
    const onMove = (e: PointerEvent) => {
      if (!this._slicing || this._done) return;
      const r  = this._arena.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      this._drawTrail(this._prevX, this._prevY, cx, cy);
      this._checkSlice(this._prevX, this._prevY, cx, cy);
      this._prevX = cx;
      this._prevY = cy;
    };
    const onUp = () => { this._slicing = false; };

    document.addEventListener("pointerdown",   onDown);
    document.addEventListener("pointermove",   onMove);
    document.addEventListener("pointerup",     onUp);
    document.addEventListener("pointercancel", onUp);

    // Clean up listeners when game ends (stored for _showResult)
    this._cleanupInput = () => {
      document.removeEventListener("pointerdown",   onDown);
      document.removeEventListener("pointermove",   onMove);
      document.removeEventListener("pointerup",     onUp);
      document.removeEventListener("pointercancel", onUp);
    };

    this._g.inMiniGame = true;
    this._g.autoClickCallback = () => {
      const W = this._arena.clientWidth  || 360;
      const H = this._arena.clientHeight || 600;
      // Sweep a random horizontal line across the arena to slice any fruits in its path
      const y  = H * (0.2 + Math.random() * 0.6);
      this._checkSlice(0, y, W, y);
    };
    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _resizeTrail(): void {
    const root = document.getElementById("fsRoot")!;
    this._trailCvs.width  = root.clientWidth  || 360;
    this._trailCvs.height = root.clientHeight || 600;
  }

  // Draw a glowing slash line from (ax,ay) to (bx,by)
  private _drawTrail(ax: number, ay: number, bx: number, by: number): void {
    const ctx = this._trailCtx;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 240, 120, 0.85)";
    ctx.lineWidth   = 4;
    ctx.lineCap     = "round";
    ctx.shadowColor = "rgba(255, 220, 0, 0.9)";
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.restore();
  }

  // Check if line segment (ax,ay)→(bx,by) slices any live fruit
  private _checkSlice(ax: number, ay: number, bx: number, by: number): void {
    for (const f of this._fruits) {
      if (f.dead) continue;
      if (this._segPointDist(ax, ay, bx, by, f.cx, f.cy) < FRUIT_RADIUS) {
        this._sliceFruit(f);
      }
    }
  }

  // Distance from point (px,py) to line segment (ax,ay)→(bx,by)
  private _segPointDist(
    ax: number, ay: number,
    bx: number, by: number,
    px: number, py: number
  ): number {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  private _spawnFruit(): void {
    const W     = this._arena.clientWidth  || 360;
    const H     = this._arena.clientHeight || 600;
    const emoji = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    const x     = 30 + Math.random() * (W - 80);
    const vy    = -(0.55 + Math.random() * 0.35); // px/ms upward

    const fruit: Fruit = {
      el:   document.createElement("div"),
      cx:   x + 28, // approximate center (half of ~56px emoji)
      cy:   H,
      y:    H,
      vy,
      dead: false,
    };

    fruit.el.textContent = emoji;
    fruit.el.style.cssText = `
      position:absolute;font-size:56px;line-height:1;
      user-select:none;pointer-events:none;
      left:${x}px;top:${H}px;
    `;

    this._arena.appendChild(fruit.el);
    this._fruits.push(fruit);
  }

  private _sliceFruit(fruit: Fruit): void {
    if (fruit.dead || this._done) return;
    fruit.dead = true;
    const earned = COINS_PER_FRUIT * this._coinMult;
    this._score += earned;
    this._scoreEl.textContent = String(this._score);

    // "+N" float
    const plus = document.createElement("div");
    plus.textContent = `✂️ +${earned}`;
    plus.style.cssText = `
      position:absolute;left:${fruit.cx - 20}px;top:${fruit.cy - 20}px;
      color:#FFD700;font-size:16px;font-weight:bold;font-family:Arial,sans-serif;
      pointer-events:none;transition:all 0.5s ease-out;z-index:15;
    `;
    this._arena.appendChild(plus);
    requestAnimationFrame(() => {
      plus.style.transform = "translateY(-50px)";
      plus.style.opacity   = "0";
    });
    setTimeout(() => plus.remove(), 520);

    // Slice pop
    fruit.el.style.transform  = "scale(1.5) rotate(20deg)";
    fruit.el.style.opacity    = "0";
    fruit.el.style.transition = "all 0.18s ease-out";
    setTimeout(() => fruit.el.remove(), 200);
  }

  private _loop(ts: number): void {
    const dt = Math.min(ts - this._lastTs, 50);
    this._lastTs = ts;

    if (!this._done) {
      this._timeLeft -= dt / 1000;
      if (this._timeLeft <= 0) {
        this._timeLeft = 0;
        this._done = true;
        cancelAnimationFrame(this._raf);
        this._showResult();
        return;
      }

      const secs = Math.ceil(this._timeLeft);
      this._timerEl.textContent = `⏱ ${secs}s`;
      this._timerEl.style.color = secs <= 10 ? "#ff5555" : "white";

      // Spawn
      this._spawnTimer += dt;
      if (this._spawnTimer > 1100 * this._spawnMult) {
        this._spawnTimer = 0;
        this._spawnFruit();
      }

      // Physics
      const H        = this._arena.clientHeight || 600;
      const GRAV     = 0.00055; // px/ms²
      for (const f of this._fruits) {
        if (f.dead) continue;
        f.vy  += GRAV * dt;
        f.y   += f.vy * dt;
        f.cy   = f.y + 28; // keep centre in sync
        f.el.style.top = `${f.y}px`;
        if (f.y > H + 60) { f.dead = true; f.el.remove(); }
      }
      this._fruits = this._fruits.filter(f => !f.dead);

      // Fade trail each frame
      this._trailCtx.globalAlpha = 0.55;
      this._trailCtx.globalCompositeOperation = "destination-out";
      this._trailCtx.fillRect(0, 0, this._trailCvs.width, this._trailCvs.height);
      this._trailCtx.globalAlpha = 1;
      this._trailCtx.globalCompositeOperation = "source-over";
    }

    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _showResult(): void {
    this._g.inMiniGame = false;
    this._g.autoClickCallback = null;
    this._cleanupInput();
    for (const f of this._fruits) f.el.remove();
    this._fruits = [];

    const earned = this._score;
    this._g.state.coins += earned;
    this._g.save();

    // Build result screen by creating elements directly so button refs are guaranteed
    const wrap = document.createElement("div");
    wrap.className = "screen";
    wrap.style.cssText = `
      background:linear-gradient(160deg,#0a001e,#1a0840,#0a1808);
      gap:14px;font-family:Arial,sans-serif;
    `;
    wrap.innerHTML = `
      <div style="font-size:52px;">🎉</div>
      <div style="color:#FFD700;font-size:30px;font-weight:bold;">Time's up!</div>
      <div style="color:white;font-size:20px;">
        You earned <strong style="color:#FFD700;">${earned} 🪙</strong>
      </div>
      <div style="color:rgba(255,215,0,0.7);font-size:15px;">
        Total coins: ${this._g.state.coins} 🪙
      </div>
    `;

    const btnWrap = document.createElement("div");
    btnWrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:8px;";

    const playAgain = document.createElement("button");
    playAgain.textContent = "▶ Play Again";
    playAgain.style.cssText = `
      background:#FFD700;color:#1a0060;font-size:18px;font-weight:bold;
      padding:13px 32px;border-radius:40px;border:3px solid #e6b800;cursor:pointer;
      font-family:Arial,sans-serif;
    `;
    playAgain.addEventListener("click", () => new FruitSlice(this._g));

    const back = document.createElement("button");
    back.textContent = "← Back to Arcade";
    back.style.cssText = `
      background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:16px;
      padding:10px 28px;border-radius:40px;border:1px solid rgba(255,255,255,0.3);
      cursor:pointer;font-family:Arial,sans-serif;
    `;
    back.addEventListener("click", () => this._g.goArcade());

    btnWrap.appendChild(playAgain);
    btnWrap.appendChild(back);
    wrap.appendChild(btnWrap);

    this._g.ui.innerHTML = "";
    this._g.ui.appendChild(wrap);
  }
}
