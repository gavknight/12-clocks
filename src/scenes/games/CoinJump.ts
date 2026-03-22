import type { Game } from "../../game/Game";

const BASE_DURATION = () => parseInt(localStorage.getItem("mg_duration") ?? "60", 10);
const GROUND_Y   = 0.78;  // fraction of canvas height
const CAR_X      = 0.15;  // fraction of canvas width
const GRAVITY    = 0.0000032; // canvas-height / ms²
const JUMP_VEL   = -0.0012;  // canvas-height / ms   — peaks ~22% up, double jump ~44%
const COIN_SPEED = 0.00042; // fraction of canvas width per ms  (~2.5 s to cross screen)

// Coin height tiers (fraction of canvas height from top)
// GROUND_Y is car ground level — those coins are collected without jumping
const COIN_TIERS = [GROUND_Y, GROUND_Y, 0.48, 0.28]; // ground x2, mid, high

export class CoinJump {
  private _raf = 0;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _carY = GROUND_Y;
  private _velY = 0;
  private _jumpsLeft = 2;
  private _coins: { x: number; y: number; collected: boolean }[] = [];
  private _score = 0;
  private _timeLeft = 0;
  private _lastTs = 0;
  private _coinTimer = 0;
  private _done = false;
  private _boost = false;
  private _coinValue = 1;
  private _speedMult = 1;
  private _game: Game;

  constructor(game: Game) {
    this._game    = game;
    this._timeLeft = BASE_DURATION();

    const hasHacks = game.hasHacks;

    game.ui.innerHTML = `
      <div style="position:relative;width:100%;height:100%;background:#000;touch-action:none;">
        <canvas id="cjCanvas" style="display:block;width:100%;height:100%;touch-action:none;"></canvas>
        ${hasHacks ? `
          <button id="cjBoost" style="
            position:absolute;top:60px;right:10px;z-index:20;
            background:rgba(255,140,0,0.25);color:#FFD700;font-size:13px;font-weight:bold;
            padding:6px 12px;border-radius:10px;border:2px solid rgba(255,140,0,0.6);
            cursor:pointer;font-family:Arial,sans-serif;">
            ⚡ BOOST
          </button>` : ""}
      </div>
    `;

    this._canvas = document.getElementById("cjCanvas") as HTMLCanvasElement;
    this._ctx    = this._canvas.getContext("2d")!;

    this._resize();
    window.addEventListener("resize", () => this._resize());

    const jump = () => { if (!this._done) this._doJump(); };
    // touchstart fires before pointerdown on iOS — eliminates the tap delay
    this._canvas.addEventListener("touchstart",  e => { e.preventDefault(); jump(); }, { passive: false });
    this._canvas.addEventListener("pointerdown", e => { e.preventDefault(); jump(); });
    document.addEventListener("keydown", e => { if (e.code === "Space" || e.code === "ArrowUp") jump(); });

    if (hasHacks) {
      document.getElementById("cjBoost")!.addEventListener("click", () => {
        this._boost = !this._boost;
        this._coinValue  = this._boost ? 3 : 1;
        this._speedMult  = this._boost ? 2 : 1;
        const btn = document.getElementById("cjBoost")!;
        btn.textContent  = this._boost ? "⚡ BOOSTED!" : "⚡ BOOST";
        btn.style.background = this._boost ? "rgba(255,140,0,0.7)" : "rgba(255,140,0,0.25)";
      });
    }

    this._game.inMiniGame = true;
    this._game.autoClickCallback = () => this._doJump();
    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _resize(): void {
    this._canvas.width  = this._canvas.clientWidth  || 400;
    this._canvas.height = this._canvas.clientHeight || 600;
  }

  private _doJump(): void {
    if (this._done) return;
    if (this._jumpsLeft > 0) {
      this._velY = JUMP_VEL;
      this._jumpsLeft--;
    }
  }

  private _spawnCoin(): void {
    const tier = Math.floor(Math.random() * 3);
    this._coins.push({ x: 1.05, y: COIN_TIERS[tier], collected: false });
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

      // Car physics — position FIRST so the jump is visible on the very next frame
      this._carY += this._velY * dt;
      this._velY += GRAVITY * dt;
      if (this._carY >= GROUND_Y) {
        this._carY = GROUND_Y;
        this._velY = 0;
        this._jumpsLeft = 2;
      }
      if (this._carY < 0.04) {
        this._carY = 0.04;
        this._velY = 0;
      }

      // Spawn coins
      this._coinTimer += dt;
      if (this._coinTimer > 1500) {
        this._coinTimer = 0;
        this._spawnCoin();
      }

      // Move + collide
      const W = this._canvas.width;
      const H = this._canvas.height;
      const carPx = CAR_X * W;
      const carPy = this._carY * H;
      for (const c of this._coins) {
        c.x -= COIN_SPEED * this._speedMult * dt;
        if (!c.collected) {
          const dx = c.x * W - carPx;
          const dy = c.y * H - carPy;
          if (Math.abs(dx) < 32 && Math.abs(dy) < 32) {
            c.collected = true;
            this._score += this._coinValue;
          }
        }
      }
      this._coins = this._coins.filter(c => c.x > -0.05);
    }

    this._draw();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _draw(): void {
    const W = this._canvas.width;
    const H = this._canvas.height;
    const ctx = this._ctx;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    sky.addColorStop(0, "#0a1e3a");
    sky.addColorStop(1, "#1a3a5a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Ground
    const groundY = GROUND_Y * H + 20;
    ctx.fillStyle = "#2a5c1a";
    ctx.fillRect(0, groundY, W, H - groundY);
    ctx.fillStyle = "#3a7c28";
    ctx.fillRect(0, groundY, W, 8);

    // Scrolling dashes
    const off = (performance.now() * 0.15) % 80;
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    for (let x = -off; x < W; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 4);
      ctx.lineTo(x + 40, groundY + 4);
      ctx.stroke();
    }

    // Coins
    const coinSize = Math.round(H * 0.06);
    ctx.font = `${coinSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const c of this._coins) {
      if (c.collected) continue;
      ctx.fillText("🪙", c.x * W, c.y * H);
    }

    // Car — flip horizontally so it faces right (forward)
    const carX = CAR_X * W;
    const carY = this._carY * H;
    const carSize = Math.round(H * 0.09);
    ctx.font = `${carSize}px serif`;
    ctx.save();
    ctx.translate(carX, carY);
    ctx.scale(-1, 1); // mirror so the car faces right
    ctx.fillText("🚗", 0, 0);
    ctx.restore();

    // HUD bar
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, W, 52);

    ctx.font = "bold 20px Arial, sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`🪙 ${this._score}`, 16, 26);

    ctx.textAlign = "right";
    ctx.fillStyle = this._timeLeft <= 10 ? "#ff5555" : "white";
    ctx.fillText(`⏱ ${Math.ceil(this._timeLeft)}s`, W - 16, 26);

    // Hint
    if (this._jumpsLeft === 1) {
      ctx.font = "13px Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.textAlign = "center";
      ctx.fillText("Tap again to double jump!", W / 2, H * 0.88);
    }
  }

  private _showResult(): void {
    this._game.inMiniGame = false;
    this._game.autoClickCallback = null;
    const earned = this._score;
    this._game.state.coins += earned;
    this._game.save();

    // Build result screen with direct element refs so buttons always work
    const wrap = document.createElement("div");
    wrap.className = "screen";
    wrap.style.cssText = `
      background:linear-gradient(160deg,#0a001e,#0a2010);
      gap:14px;font-family:Arial,sans-serif;
    `;
    wrap.innerHTML = `
      <div style="font-size:52px;">🎉</div>
      <div style="color:#FFD700;font-size:30px;font-weight:bold;">Time's up!</div>
      <div style="color:white;font-size:20px;">
        You earned <strong style="color:#FFD700;">${earned} 🪙</strong>
      </div>
      <div style="color:rgba(255,215,0,0.7);font-size:15px;">
        Total coins: ${this._game.state.coins} 🪙
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
    playAgain.addEventListener("click", () => new CoinJump(this._game));

    const back = document.createElement("button");
    back.textContent = "← Back to Arcade";
    back.style.cssText = `
      background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:16px;
      padding:10px 28px;border-radius:40px;border:1px solid rgba(255,255,255,0.3);
      cursor:pointer;font-family:Arial,sans-serif;
    `;
    back.addEventListener("click", () => this._game.goArcade());

    btnWrap.appendChild(playAgain);
    btnWrap.appendChild(back);
    wrap.appendChild(btnWrap);

    this._game.ui.innerHTML = "";
    this._game.ui.appendChild(wrap);
  }
}
