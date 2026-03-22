import type { Game } from "../../game/Game";

const COIN_SIZE   = 48;  // px
const SPAWN_RATE  = 800; // ms between spawns (gets faster with combo)
const FALL_SPEED  = () => 0.25 + Math.random() * 0.2; // fraction of screen per 3s

interface FallingCoin {
  el:    HTMLDivElement;
  x:     number; // left px
  y:     number; // top px
  speed: number; // px/ms
  value: number; // coins it's worth
  dead:  boolean;
}

export class CoinRain {
  private _arena:    HTMLDivElement;
  private _scoreEl:  HTMLSpanElement;
  private _comboEl:  HTMLSpanElement;

  private _coins:     FallingCoin[] = [];
  private _score      = 0;
  private _combo      = 0;
  private _comboTimer = 0;
  private _spawnTimer = 0;
  private _lastTs     = 0;
  private _raf        = 0;
  private _done       = false;
  private _g:         Game;

  constructor(game: Game) {
    this._g = game;

    game.ui.innerHTML = `
      <div id="crRoot" style="
        position:relative;width:100%;height:100%;overflow:hidden;
        background:linear-gradient(160deg,#000820,#001040,#000820);
        user-select:none;font-family:Arial,sans-serif;pointer-events:all;
      ">
        <!-- Stars -->
        ${Array.from({length:20},(_,i)=>{
          const seed = i * 1664525 + 1013904223;
          const lx = ((seed >>> 8) & 0xff) / 255 * 100;
          const ly = ((seed >>> 16) & 0xff) / 255 * 40;
          return `<div style="position:absolute;left:${lx.toFixed(1)}%;top:${ly.toFixed(1)}%;
            width:2px;height:2px;border-radius:50%;background:white;
            opacity:${(0.2+i*0.03).toFixed(2)};pointer-events:none;"></div>`;
        }).join("")}

        <!-- HUD -->
        <div style="
          position:absolute;top:0;left:0;right:0;z-index:20;
          display:flex;justify-content:space-between;align-items:center;
          padding:10px 16px;background:rgba(0,0,0,0.5);pointer-events:none;
        ">
          <span style="color:#FFD700;font-size:20px;font-weight:bold;">
            🪙 <span id="crScore">0</span>
          </span>
          <span id="crCombo" style="color:#fff;font-size:16px;font-weight:bold;opacity:0;transition:opacity 0.3s;"></span>
        </div>

        <!-- Arena -->
        <div id="crArena" style="position:absolute;inset:0;pointer-events:none;"></div>

        <!-- Cash Out button -->
        <button id="crCashOut" style="
          position:absolute;bottom:24px;left:50%;transform:translateX(-50%);
          background:#FFD700;color:#1a0060;font-size:17px;font-weight:bold;
          padding:12px 36px;border-radius:40px;border:3px solid #e6b800;
          cursor:pointer;z-index:30;font-family:Arial,sans-serif;
          box-shadow:0 0 20px rgba(255,215,0,0.4);
        ">💰 Cash Out</button>

        <!-- Hint -->
        <div style="
          position:absolute;bottom:80px;left:0;right:0;text-align:center;
          color:rgba(255,255,255,0.3);font-size:12px;pointer-events:none;z-index:20;
        ">Click the coins before they fall!</div>
      </div>
    `;

    this._arena   = document.getElementById("crArena")   as HTMLDivElement;
    this._scoreEl = document.getElementById("crScore")   as HTMLSpanElement;
    this._comboEl = document.getElementById("crCombo")   as HTMLSpanElement;

    const basketSvg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">`,
      `<path d="M10 15 Q10 5 16 5 Q22 5 22 15" fill="none" stroke="#8B5E3C" stroke-width="2.5" stroke-linecap="round"/>`,
      `<path d="M4 15 L28 15 L24 29 L8 29 Z" fill="#D4A574" stroke="#8B5E3C" stroke-width="1.5"/>`,
      `<line x1="5" y1="20" x2="27" y2="20" stroke="#8B5E3C" stroke-width="1" opacity="0.6"/>`,
      `<line x1="6" y1="25" x2="26" y2="25" stroke="#8B5E3C" stroke-width="1" opacity="0.6"/>`,
      `<line x1="10" y1="15" x2="8" y2="29" stroke="#8B5E3C" stroke-width="0.8" opacity="0.5"/>`,
      `<line x1="16" y1="15" x2="16" y2="29" stroke="#8B5E3C" stroke-width="0.8" opacity="0.5"/>`,
      `<line x1="22" y1="15" x2="24" y2="29" stroke="#8B5E3C" stroke-width="0.8" opacity="0.5"/>`,
      `</svg>`
    ].join("");
    const basketCursorVal = `url("data:image/svg+xml;base64,${btoa(basketSvg)}") 16 5, pointer`;
    document.body.style.cursor = basketCursorVal;


    document.getElementById("crCashOut")!.addEventListener("pointerdown", e => { e.stopPropagation(); this._cashOut(); });

    this._g.inMiniGame = true;
    this._g.autoClickCallback = () => {
      // Auto-click: collect the lowest (most urgent) coin
      const alive = this._coins.filter(c => !c.dead);
      if (!alive.length) return;
      const lowest = alive.reduce((a, b) => a.y > b.y ? a : b);
      this._collectCoin(lowest);
    };

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _spawnCoin(): void {
    const W     = this._arena.clientWidth  || 360;
    const H     = this._arena.clientHeight || 600;
    const x     = 10 + Math.random() * (W - COIN_SIZE - 20);
    const speed = FALL_SPEED() * H / 3000; // px/ms

    // Higher combo → occasional big-value coins
    const value = this._combo >= 10 ? (Math.random() < 0.3 ? 5 : 1)
                : this._combo >= 5  ? (Math.random() < 0.2 ? 3 : 1)
                : 1;

    const el = document.createElement("div");
    el.textContent = value >= 5 ? "💰" : value >= 3 ? "🏅" : "🪙";
    el.style.cssText = `
      position:absolute;font-size:${COIN_SIZE}px;line-height:1;
      left:${x}px;top:-${COIN_SIZE}px;
      pointer-events:all;
      transition:transform 0.1s;
      filter:drop-shadow(0 0 6px rgba(255,215,0,0.6));
    `;

    const coin: FallingCoin = { el, x, y: -COIN_SIZE, speed, value, dead: false };

    el.addEventListener("pointerdown", e => {
      e.stopPropagation();
      this._collectCoin(coin);
    });

    this._arena.appendChild(el);
    this._coins.push(coin);
  }

  private _collectCoin(coin: FallingCoin): void {
    if (coin.dead || this._done) return;
    coin.dead = true;
    this._combo++;
    this._comboTimer = 2000; // 2s to keep combo alive

    const earned = coin.value * (this._combo >= 15 ? 3 : this._combo >= 8 ? 2 : 1);
    this._score += earned;
    this._scoreEl.textContent = String(this._score);

    // Combo display
    this._comboEl.textContent = this._combo >= 5 ? `🔥 x${this._combo} COMBO!` : `x${this._combo}`;
    this._comboEl.style.opacity = "1";
    this._comboEl.style.color   = this._combo >= 15 ? "#ff4400"
                                : this._combo >= 8  ? "#ff9900"
                                : "#ffffff";

    // +N float
    const plus = document.createElement("div");
    plus.textContent = `+${earned}`;
    plus.style.cssText = `
      position:absolute;left:${coin.x + 10}px;top:${coin.y}px;
      color:#FFD700;font-size:18px;font-weight:bold;
      pointer-events:none;z-index:15;
      transition:all 0.5s ease-out;
    `;
    this._arena.appendChild(plus);
    requestAnimationFrame(() => {
      plus.style.transform = "translateY(-60px)";
      plus.style.opacity   = "0";
    });
    setTimeout(() => plus.remove(), 520);

    // Pop animation then remove
    coin.el.style.transform = "scale(1.6)";
    coin.el.style.opacity   = "0";
    setTimeout(() => coin.el.remove(), 150);
  }

  private _loop(ts: number): void {
    const dt = Math.min(ts - this._lastTs, 50);
    this._lastTs = ts;

    if (!this._done) {
      const H = this._arena.clientHeight || 600;

      // Combo timeout
      if (this._combo > 0) {
        this._comboTimer -= dt;
        if (this._comboTimer <= 0) {
          this._combo = 0;
          this._comboEl.style.opacity = "0";
        }
      }

      // Spawn — faster with higher combos
      const spawnInterval = Math.max(300, SPAWN_RATE - this._combo * 30);
      this._spawnTimer += dt;
      if (this._spawnTimer >= spawnInterval) {
        this._spawnTimer = 0;
        this._spawnCoin();
        // Extra coin at high combos
        if (this._combo >= 10 && Math.random() < 0.4) this._spawnCoin();
      }

      // Move coins
      for (const c of this._coins) {
        if (c.dead) continue;
        c.y += c.speed * dt;
        c.el.style.top = `${c.y}px`;
        // Missed — reset combo
        if (c.y > H + 10) {
          c.dead = true;
          c.el.remove();
          this._combo = 0;
          this._comboTimer = 0;
          this._comboEl.style.opacity = "0";
        }
      }
      this._coins = this._coins.filter(c => !c.dead);
      this._raf = requestAnimationFrame(ts => this._loop(ts));
    }
  }

  private _cashOut(): void {
    if (this._done) return;
    this._done = true;
    cancelAnimationFrame(this._raf);
    document.body.style.cursor = "";
    this._g.inMiniGame = false;
    this._g.autoClickCallback = null;

    for (const c of this._coins) c.el.remove();
    this._coins = [];

    const earned = this._score;
    this._g.state.coins += earned;
    this._g.save();

    const wrap = document.createElement("div");
    wrap.className = "screen";
    wrap.style.cssText = `
      background:linear-gradient(160deg,#000820,#001040);
      gap:14px;font-family:Arial,sans-serif;
    `;
    wrap.innerHTML = `
      <div style="font-size:52px;">💰</div>
      <div style="color:#FFD700;font-size:30px;font-weight:bold;">Cashed Out!</div>
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
    playAgain.addEventListener("click", () => new CoinRain(this._g));

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
