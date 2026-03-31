/**
 * Collect the Apples — WASD to move the cat, collect infinite apples!
 * Inspired by the creator's Scratch game. The bat teacher just watches. 🦇
 */
import type { Game } from "../../game/Game";

const CAT_SPEED   = 220;   // px/sec
const APPLE_COUNT = 1;     // apples on screen at once
const APPLE_R     = 22;
const CAT_R       = 26;

export class CollectTheApples {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _cv!: HTMLCanvasElement;
  private _raf  = 0;
  private _done = false;
  private _score = 0;
  private _keys  = new Set<string>();
  private _catX  = 0;
  private _catY  = 0;
  private _apples: Array<{ x: number; y: number; bob: number }> = [];
  private _t     = 0;
  private _last  = 0;
  private _scoreEl!: HTMLDivElement;
  private _onDown = (e: KeyboardEvent) => this._key(e, true);
  private _onUp   = (e: KeyboardEvent) => this._key(e, false);
  private _onResize = () => this._resize();

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";

    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;background:#f2c8b8;pointer-events:all;";
    g.ui.appendChild(this._wrap);

    this._cv = document.createElement("canvas");
    this._cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    this._wrap.appendChild(this._cv);
    this._resize();
    window.addEventListener("resize", this._onResize);

    // Score
    this._scoreEl = document.createElement("div");
    this._scoreEl.style.cssText =
      "position:absolute;top:12px;left:16px;color:white;font-size:22px;"
      + "font-weight:bold;text-shadow:2px 2px 4px #000;z-index:10;font-family:Arial,sans-serif;";
    this._scoreEl.textContent = "🍎 0";
    this._wrap.appendChild(this._scoreEl);

    // Quit button
    const quitBtn = document.createElement("button");
    quitBtn.textContent = "← Quit";
    quitBtn.style.cssText =
      "position:absolute;top:12px;right:16px;background:rgba(0,0,0,0.4);color:white;"
      + "border:1.5px solid rgba(255,255,255,0.3);border-radius:16px;padding:8px 18px;"
      + "font-size:14px;cursor:pointer;z-index:10;font-family:Arial,sans-serif;";
    quitBtn.onclick = () => this._finish();
    this._wrap.appendChild(quitBtn);

    // Cat starts bottom-left area
    this._catX = this._cv.width  * 0.18;
    this._catY = this._cv.height * 0.82;

    for (let i = 0; i < APPLE_COUNT; i++) this._spawnApple();

    window.addEventListener("keydown", this._onDown);
    window.addEventListener("keyup",   this._onUp);

    this._last = performance.now();
    this._raf  = requestAnimationFrame(t => this._loop(t));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _resize() {
    this._cv.width  = this._wrap.clientWidth  || window.innerWidth;
    this._cv.height = this._wrap.clientHeight || window.innerHeight;
  }

  private _floorY() { return this._cv.height * 0.64; }

  private _key(e: KeyboardEvent, down: boolean) {
    const k = e.key.toLowerCase();
    if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"].includes(k)) {
      down ? this._keys.add(k) : this._keys.delete(k);
      e.preventDefault();
    }
  }

  private _spawnApple() {
    const w = this._cv.width;
    const floor = this._floorY();
    const h = this._cv.height;
    this._apples.push({
      x:   APPLE_R + Math.random() * (w - APPLE_R * 2),
      y:   floor + APPLE_R + 10 + Math.random() * (h - floor - APPLE_R * 2 - 30),
      bob: Math.random() * Math.PI * 2,
    });
  }

  // ── Game loop ──────────────────────────────────────────────────────────────

  private _loop(now: number) {
    if (this._done) return;
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;
    this._t   += dt;
    this._update(dt);
    this._draw();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  private _update(dt: number) {
    const w = this._cv.width;
    const h = this._cv.height;
    const floor = this._floorY();

    let dx = 0, dy = 0;
    if (this._keys.has("a") || this._keys.has("arrowleft"))  dx -= 1;
    if (this._keys.has("d") || this._keys.has("arrowright")) dx += 1;
    if (this._keys.has("w") || this._keys.has("arrowup"))    dy -= 1;
    if (this._keys.has("s") || this._keys.has("arrowdown"))  dy += 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    this._catX = Math.max(CAT_R, Math.min(w - CAT_R, this._catX + dx * CAT_SPEED * dt));
    this._catY = Math.max(floor + 14, Math.min(h - CAT_R, this._catY + dy * CAT_SPEED * dt));

    // Collect apples
    for (let i = this._apples.length - 1; i >= 0; i--) {
      const a = this._apples[i];
      if (Math.hypot(a.x - this._catX, a.y - this._catY) < CAT_R + APPLE_R) {
        this._apples.splice(i, 1);
        this._score++;
        this._scoreEl.textContent = `🍎 ${this._score}`;
        this._spawnApple();
      }
    }
  }

  // ── Drawing ────────────────────────────────────────────────────────────────

  private _draw() {
    const cv  = this._cv;
    const ctx = cv.getContext("2d")!;
    const w = cv.width, h = cv.height;
    const floor = this._floorY();

    // Wall
    ctx.fillStyle = "#f2c8b8";
    ctx.fillRect(0, 0, w, h);

    // Floor
    ctx.fillStyle = "#c8914a";
    ctx.fillRect(0, floor, w, h - floor);
    ctx.strokeStyle = "#a87030";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, floor); ctx.lineTo(x, h); ctx.stroke();
    }
    // Floor highlight strip
    ctx.fillStyle = "rgba(255,200,120,0.18)";
    ctx.fillRect(0, floor, w, 8);

    // ── Chalkboard ─────────────────────────────────────────────────────────
    const cbW = Math.min(w * 0.68, 540);
    const cbH = cbW * 0.44;
    const cbX = (w - cbW) / 2;
    const cbY = 14;

    // Wooden frame
    ctx.fillStyle = "#7a3a12";
    ctx.fillRect(cbX - 20, cbY - 12, cbW + 40, cbH + 32);
    // Rail at bottom of board
    ctx.fillStyle = "#5a2a08";
    ctx.fillRect(cbX - 20, cbY + cbH + 10, cbW + 40, 10);

    // Board surface
    ctx.fillStyle = "#1c1c1c";
    ctx.fillRect(cbX, cbY, cbW, cbH);
    // Chalk dust texture (faint lines)
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let cy = cbY + 20; cy < cbY + cbH; cy += 18) {
      ctx.beginPath(); ctx.moveTo(cbX, cy); ctx.lineTo(cbX + cbW, cy); ctx.stroke();
    }

    // Left curtain
    ctx.fillStyle = "#bb1111";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cbX - 20, 0);
    ctx.lineTo(cbX - 20, cbY + cbH + 22);
    ctx.lineTo(0, cbY + cbH + 36);
    ctx.fill();
    // Left curtain fold lines
    ctx.strokeStyle = "#881100";
    ctx.lineWidth = 2;
    for (let fx = 16; fx < cbX - 20; fx += 18) {
      ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx - 4, cbY + cbH + 22); ctx.stroke();
    }

    // Right curtain
    ctx.fillStyle = "#bb1111";
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(cbX + cbW + 20, 0);
    ctx.lineTo(cbX + cbW + 20, cbY + cbH + 22);
    ctx.lineTo(w, cbY + cbH + 36);
    ctx.fill();
    ctx.strokeStyle = "#881100";
    for (let fx = w - 16; fx > cbX + cbW + 20; fx -= 18) {
      ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx + 4, cbY + cbH + 22); ctx.stroke();
    }

    // Star on frame (like in the screenshot!)
    const starX = cbX + cbW / 2, starY = cbY - 4;
    ctx.fillStyle = "#ddc030";
    this._drawStar(ctx, starX, starY, 5, 9, 4);

    // ── Bat teacher ─────────────────────────────────────────────────────────
    const batSc = Math.min(cbH / 110, 1.3);
    this._drawBat(ctx, cbX + cbW / 2, cbY + cbH / 2 + 8, batSc);

    // ── Apples ──────────────────────────────────────────────────────────────
    for (const ap of this._apples) {
      this._drawApple(ctx, ap.x, ap.y + Math.sin(this._t * 2 + ap.bob) * 3);
    }

    // ── Cat ─────────────────────────────────────────────────────────────────
    const facingLeft = this._keys.has("a") || this._keys.has("arrowleft");
    this._drawCat(ctx, this._catX, this._catY, facingLeft);
  }

  private _drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number,
                    points: number, outer: number, inner: number) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
              : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath(); ctx.fill();
  }

  private _drawBat(ctx: CanvasRenderingContext2D, x: number, y: number, sc: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);

    // Wings
    ctx.fillStyle = "#556";
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.bezierCurveTo(-28, -32, -58, -18, -62, 6);
    ctx.bezierCurveTo(-52, 12, -22, 16, 0, 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.bezierCurveTo(28, -32, 58, -18, 62, 6);
    ctx.bezierCurveTo(52, 12, 22, 16, 0, 10);
    ctx.fill();
    // Wing lines
    ctx.strokeStyle = "#889"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.bezierCurveTo(-22,-14,-42,-10,-50,5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, 6); ctx.bezierCurveTo(-26,-4,-46,-4,-54,8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.bezierCurveTo(22,-14,42,-10,50,5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, 6); ctx.bezierCurveTo(26,-4,46,-4,54,8); ctx.stroke();

    // Body
    ctx.fillStyle = "#667";
    ctx.beginPath(); ctx.ellipse(0, 6, 20, 26, 0, 0, Math.PI * 2); ctx.fill();

    // Ears
    ctx.fillStyle = "#556";
    ctx.beginPath(); ctx.moveTo(-12,-18); ctx.lineTo(-22,-42); ctx.lineTo(-4,-22); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12,-18);  ctx.lineTo(22,-42);  ctx.lineTo(4,-22);  ctx.fill();

    // Eyes
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(-7,-5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 7,-5, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(-6,-6, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 8,-6, 1.5, 0, Math.PI * 2); ctx.fill();

    // Pink pig nose (like in the screenshot!)
    ctx.fillStyle = "#ff6688";
    ctx.beginPath(); ctx.ellipse(0, 6, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#cc2255";
    ctx.beginPath(); ctx.arc(-3, 6, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 3, 6, 2.2, 0, Math.PI * 2); ctx.fill();

    // Teeth
    ctx.fillStyle = "white";
    ctx.fillRect(-9, 13, 5, 8);
    ctx.fillRect(-1, 13, 5, 8);
    ctx.fillRect( 7, 13, 5, 8);

    ctx.restore();
  }

  private _drawApple(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(0, APPLE_R - 1, 13, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Apple
    const g = ctx.createRadialGradient(-5,-8, 2, 0, 0, APPLE_R);
    g.addColorStop(0, "#ff6060");
    g.addColorStop(0.55, "#dd1111");
    g.addColorStop(1, "#881100");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, APPLE_R, 0, Math.PI * 2); ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.beginPath(); ctx.ellipse(-6,-8, 6, 4, -0.4, 0, Math.PI * 2); ctx.fill();

    // Stem
    ctx.strokeStyle = "#5a3010"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0,-APPLE_R); ctx.quadraticCurveTo(6,-APPLE_R-12, 4,-APPLE_R-16); ctx.stroke();

    // Leaf
    ctx.fillStyle = "#228833";
    ctx.beginPath(); ctx.ellipse(6,-APPLE_R-10, 8, 4, 0.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  private _drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, facingLeft: boolean) {
    ctx.save();
    ctx.translate(x, y);
    if (facingLeft) ctx.scale(-1, 1);

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(2, 30, 20, 6, 0, 0, Math.PI * 2); ctx.fill();

    // Tail — curls up behind
    ctx.strokeStyle = "#e8a020"; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-14, 14); ctx.bezierCurveTo(-38, 10, -42, -18, -24, -22); ctx.stroke();
    ctx.strokeStyle = "#ffd080"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-14, 14); ctx.bezierCurveTo(-34, 10, -38, -14, -24, -20); ctx.stroke();

    // Body — chunky oval like Scratch cat
    ctx.fillStyle = "#e8a020";
    ctx.beginPath(); ctx.ellipse(2, 14, 20, 22, 0, 0, Math.PI * 2); ctx.fill();

    // Belly
    ctx.fillStyle = "#ffeedd";
    ctx.beginPath(); ctx.ellipse(2, 16, 12, 15, 0, 0, Math.PI * 2); ctx.fill();

    // Back legs
    ctx.fillStyle = "#d09018";
    ctx.beginPath(); ctx.ellipse(-12, 30, 8, 10, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, 30, 8, 10, 0.2, 0, Math.PI * 2); ctx.fill();
    // Paws
    ctx.fillStyle = "#ffd080";
    ctx.beginPath(); ctx.ellipse(-12, 38, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, 38, 9, 5, 0, 0, Math.PI * 2); ctx.fill();

    // Front arm reaching forward (Scratch cat pose)
    ctx.fillStyle = "#e8a020";
    ctx.beginPath(); ctx.ellipse(22, 10, 7, 14, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffd080";
    ctx.beginPath(); ctx.ellipse(26, 20, 8, 5, 0.3, 0, Math.PI * 2); ctx.fill();

    // Head — big round like Scratch
    ctx.fillStyle = "#e8a020";
    ctx.beginPath(); ctx.arc(2, -16, 22, 0, Math.PI * 2); ctx.fill();

    // Ears — pointy triangles
    ctx.fillStyle = "#e8a020";
    ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(-30, -50); ctx.lineTo(-6, -34); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -30);  ctx.lineTo(30, -50);  ctx.lineTo(8, -34);  ctx.fill();
    // Inner ear pink
    ctx.fillStyle = "#ff9999";
    ctx.beginPath(); ctx.moveTo(-18,-31); ctx.lineTo(-26,-46); ctx.lineTo(-8,-34); ctx.fill();
    ctx.beginPath(); ctx.moveTo(18,-31);  ctx.lineTo(26,-46);  ctx.lineTo(8,-34);  ctx.fill();

    // Big white eyes — Scratch style
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(-8, -18, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -18, 9, 0, Math.PI * 2); ctx.fill();
    // Pupils
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(-8, -18, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -18, 5, 0, Math.PI * 2); ctx.fill();
    // Eye shine
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(-6, -20, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, -20, 2, 0, Math.PI * 2); ctx.fill();

    // Nose — small pink triangle
    ctx.fillStyle = "#ff8899";
    ctx.beginPath(); ctx.moveTo(2,-10); ctx.lineTo(-3,-6); ctx.lineTo(7,-6); ctx.fill();

    // Big Scratch smile
    ctx.strokeStyle = "#333"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(2,-6); ctx.lineTo(2,-2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.quadraticCurveTo(-6, 6, 2, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.quadraticCurveTo(10, 6, 2, 8);
    ctx.stroke();

    // Whiskers
    ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1.2;
    const wL: [number,number,number][] = [[-4,-8,-0.15],[-4,-10,0],[-4,-12,0.15]];
    const wR: [number,number,number][] = [[ 8,-8, 0.15],[ 8,-10,0],[ 8,-12,-0.15]];
    for (const [wx,wy,ang] of wL) {
      ctx.save(); ctx.translate(wx,wy); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-22,0); ctx.stroke();
      ctx.restore();
    }
    for (const [wx,wy,ang] of wR) {
      ctx.save(); ctx.translate(wx,wy); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(22,0); ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Finish ─────────────────────────────────────────────────────────────────

  private _finish() {
    if (this._done) return;
    this._done = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener("keydown", this._onDown);
    window.removeEventListener("keyup",   this._onUp);
    window.removeEventListener("resize",  this._onResize);
    this._g.inMiniGame = false;

    const coins = Math.floor(this._score / 3);
    this._g.state.coins += coins;
    this._g.save();

    this._wrap.innerHTML = "";
    this._wrap.style.cssText +=
      "display:flex;align-items:center;justify-content:center;background:#1a0a00;";
    this._wrap.innerHTML = `
      <div style="background:rgba(0,0,0,0.88);border-radius:24px;padding:44px 52px;
        text-align:center;color:white;font-family:Arial,sans-serif;box-shadow:0 0 40px rgba(0,0,0,0.6);">
        <div style="font-size:68px;margin-bottom:8px;">🍎</div>
        <div style="font-size:28px;font-weight:bold;margin-bottom:8px;">Great job!</div>
        <div style="font-size:18px;color:#ffcc44;margin-bottom:4px;">
          Apples collected: <b>${this._score}</b>
        </div>
        <div style="font-size:15px;color:#88ff88;margin-bottom:32px;">+${coins} 🪙 coins earned</div>
        <div style="display:flex;gap:14px;justify-content:center;">
          <button id="ctaAgain" style="background:#22aa44;color:white;border:none;
            border-radius:14px;padding:14px 30px;font-size:16px;cursor:pointer;font-weight:bold;">
            Play Again
          </button>
          <button id="ctaBack" style="background:rgba(255,255,255,0.12);color:white;
            border:1.5px solid rgba(255,255,255,0.28);border-radius:14px;
            padding:14px 30px;font-size:16px;cursor:pointer;">
            ← Arcade
          </button>
        </div>
      </div>
    `;
    document.getElementById("ctaAgain")!.onclick = () => {
      this._g.ui.innerHTML = "";
      new CollectTheApples(this._g);
    };
    document.getElementById("ctaBack")!.onclick = () => this._g.goArcade();
  }
}
