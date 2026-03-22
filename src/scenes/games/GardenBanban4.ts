/**
 * Garten of Banban 4 — The Castle
 * Phase 1: Clock intro  (click clock 3× to reach 3AM)
 * Phase 2: 3D first-person escape — grab the baby bird, run from Tamataki & Tromboley
 */
import { Engine }           from "@babylonjs/core/Engines/engine";
import { Scene }            from "@babylonjs/core/scene";
import { FreeCamera }       from "@babylonjs/core/Cameras/freeCamera";
import { Vector3, Color3, Color4 } from "@babylonjs/core/Maths/math";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight }       from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder }      from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh }             from "@babylonjs/core/Meshes/mesh";
import type { Game }        from "../../game/Game";

export const GOBB4_CHANGES = [
  "A candle lit up in the left tower window",
  "A shadowy figure appeared in the doorway",
  "Fog rolled in at the castle's base",
] as const;

const EYE_Y = 1.65;
const SPD   = 4.5;
const RH    = 3.5;
// Green door Z position
const DOOR_Z = 14;
// Enemy catch radius
const CATCH_R = 1.4;

function canMove4(x: number, z: number, doorOpen: boolean): boolean {
  const W = 0.18;
  // Elevator room: X[-5,5] Z[-5,5]
  if (x > -5+W && x < 5-W && z > -5+W && z < 5) return true;
  // Short corridor: X[-2,2] Z[5,20]
  if (x > -2+W && x < 2-W && z >= 5 && z < 20) {
    if (!doorOpen && z > DOOR_Z - 0.3) return false;
    return true;
  }
  // Escape room: X[-2,14] Z[18,28] — big open room past the door, exit on east wall
  if (x > -2+W && x < 14-W && z >= 18 && z < 28-W) return true;
  return false;
}

export class GardenBanban4 {
  private _g: Game;

  // ── Intro (Phase 1) ────────────────────────────────────────────────────────
  private _introWrap!:   HTMLDivElement;
  private _introCanvas!: HTMLCanvasElement;
  private _introCtx!:    CanvasRenderingContext2D;
  private _introAnimId   = 0;
  private _introT        = 0;
  private _clockTick     = 0;
  private _clockTimeEl!: HTMLDivElement;
  private _clockEl!:     HTMLDivElement;
  private _introResizeFn!: () => void;

  // ── Game (Phase 2) ────────────────────────────────────────────────────────
  private _wrap!:    HTMLDivElement;
  private _canvas!:  HTMLCanvasElement;
  private _engine!:  Engine;
  private _scene!:   Scene;
  private _camera!:  FreeCamera;

  private _yaw   = 0;
  private _pitch = 0;
  private _velY  = 0;
  private _keys  = new Set<string>();
  private _done  = false;

  private _hasBird    = false;
  private _doorOpen   = false;
  private _doorMesh!: Mesh;
  private _doorTimer  = 0;
  private _birdMesh!: Mesh;
  private _enemies: { mesh: Mesh; spd: number; active: boolean }[] = [];
  private _enemyReleased = false;

  private _isDead = false;
  private _hasWon = false;

  private _hudPrompt!: HTMLDivElement;
  private _hudBird!:   HTMLDivElement;
  private _hudMsg!:    HTMLDivElement;

  private _kd!: (e: KeyboardEvent) => void;
  private _ku!: (e: KeyboardEvent) => void;
  private _mm!: (e: MouseEvent)   => void;
  private _mc!: (e: PointerEvent) => void;
  private _rz!: () => void;

  constructor(g: Game) {
    this._g = g;
    this._buildIntro();
    this._startIntroLoop();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — INTRO
  // ══════════════════════════════════════════════════════════════════════════

  private _buildIntro(): void {
    this._g.inMiniGame = true;
    this._g.ui.innerHTML = "";

    this._introWrap = document.createElement("div");
    this._introWrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;background:#000;pointer-events:all;";

    this._introCanvas = document.createElement("canvas");
    this._introCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    this._introWrap.appendChild(this._introCanvas);
    this._introCtx = this._introCanvas.getContext("2d")!;

    this._introResizeFn = () => {
      this._introCanvas.width  = this._introWrap.clientWidth  || window.innerWidth;
      this._introCanvas.height = this._introWrap.clientHeight || window.innerHeight;
    };
    this._introResizeFn();
    window.addEventListener("resize", this._introResizeFn);

    const txt = document.createElement("div");
    txt.style.cssText =
      "position:absolute;bottom:96px;left:50%;transform:translateX(-50%);" +
      "color:rgba(255,255,255,0.48);font-family:'Georgia',serif;" +
      "font-size:clamp(11px,1.4vw,15px);text-align:center;" +
      "white-space:nowrap;pointer-events:none;letter-spacing:1px;";
    txt.textContent = "For a parent looking for their missing child, time is a delicate matter";
    this._introWrap.appendChild(txt);

    this._clockEl = document.createElement("div");
    this._clockEl.style.cssText =
      "position:absolute;bottom:20px;right:20px;" +
      "width:68px;height:68px;border-radius:50%;" +
      "background:radial-gradient(circle at 40% 35%,#2e1e06,#0e0800);" +
      "border:3px solid rgba(170,120,40,0.7);cursor:pointer;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "box-shadow:0 0 14px rgba(160,90,0,0.4);transition:box-shadow 0.2s,border-color 0.2s;" +
      "user-select:none;";
    this._clockTimeEl = document.createElement("div");
    this._clockTimeEl.style.cssText =
      "color:#e8c060;font-family:'Georgia',serif;font-size:11px;font-weight:bold;line-height:1.2;";
    this._clockTimeEl.textContent = "12:00";
    const amLabel = document.createElement("div");
    amLabel.style.cssText = "color:rgba(200,160,80,0.6);font-size:9px;letter-spacing:1px;margin-top:1px;";
    amLabel.textContent = "AM";
    this._clockEl.appendChild(this._clockTimeEl);
    this._clockEl.appendChild(amLabel);
    this._clockEl.addEventListener("mouseenter", () => {
      if (this._clockTick < 3) this._clockEl.style.boxShadow = "0 0 26px rgba(220,130,0,0.75)";
    });
    this._clockEl.addEventListener("mouseleave", () => {
      if (this._clockTick < 3) this._clockEl.style.boxShadow = "0 0 14px rgba(160,90,0,0.4)";
    });
    this._clockEl.addEventListener("click", () => this._advanceClock());
    this._introWrap.appendChild(this._clockEl);

    const lbl = document.createElement("div");
    lbl.style.cssText =
      "position:absolute;top:56px;right:12px;" +
      "color:rgba(160,80,200,0.55);font-size:11px;" +
      "font-weight:bold;letter-spacing:2px;pointer-events:none;font-family:Arial;";
    lbl.textContent = "CHAPTER 4 — THE CASTLE";
    this._introWrap.appendChild(lbl);

    const back = document.createElement("button");
    back.textContent = "← Back";
    back.style.cssText =
      "position:absolute;top:16px;left:16px;" +
      "background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);" +
      "font-size:13px;padding:7px 18px;border-radius:20px;" +
      "border:1px solid rgba(255,255,255,0.14);cursor:pointer;font-family:Arial;";
    back.onclick = () => this._cleanupIntro(true);
    this._introWrap.appendChild(back);

    this._g.ui.appendChild(this._introWrap);
  }

  private _advanceClock(): void {
    if (this._clockTick >= 3) return;
    this._clockTick++;
    const labels = ["12:00", "1:00", "2:00", "3:00"];
    this._clockTimeEl.textContent = labels[this._clockTick];
    if (this._clockTick === 3) {
      this._clockEl.style.boxShadow   = "0 0 40px rgba(255,40,40,0.9)";
      this._clockEl.style.borderColor = "rgba(255,60,60,0.95)";
      this._clockTimeEl.style.color   = "#ff4444";
      setTimeout(() => this._cleanupIntro(false), 1700);
    }
  }

  private _cleanupIntro(goBack: boolean): void {
    cancelAnimationFrame(this._introAnimId);
    window.removeEventListener("resize", this._introResizeFn);
    this._introWrap.remove();
    if (goBack) { this._g.inMiniGame = false; this._g.goArcade(); }
    else this._startGame();
  }

  private _startIntroLoop(): void {
    const loop = () => {
      this._introAnimId = requestAnimationFrame(loop);
      this._introT += 0.016;
      this._renderIntro();
    };
    this._introAnimId = requestAnimationFrame(loop);
  }

  private _renderIntro(): void {
    const cv = this._introCanvas, ctx = this._introCtx;
    const W = cv.width, H = cv.height;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
    sky.addColorStop(0, "#000009"); sky.addColorStop(1, "#0b0b18");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    this._iStars(ctx, W, H);
    this._iMoon(ctx, W, H);
    this._iGround(ctx, W, H);
    if (this._clockTick >= 3) this._iFog(ctx, W, H);
    this._iCastle(ctx, W, H);
    if (this._clockTick >= 1) this._iCandle(ctx, W, H);
    if (this._clockTick >= 2) this._iFigure(ctx, W, H);
  }

  private _iStars(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    for (let i = 0; i < 90; i++) {
      const x = ((i * 137.508) % 1) * W, y = ((i * 93.71) % 1) * H * 0.55;
      const a = 0.45 + 0.45 * Math.sin(this._introT * 1.4 + i * 0.7);
      ctx.globalAlpha = a; ctx.fillStyle = i % 7 === 0 ? "#ffeedd" : "#ffffff";
      ctx.beginPath(); ctx.arc(x, y, 0.4 + (i % 3) * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  private _iMoon(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const mx = W * 0.79, my = H * 0.11;
    const glow = ctx.createRadialGradient(mx, my, 6, mx, my, 65);
    glow.addColorStop(0, "rgba(220,220,160,0.12)"); glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow; ctx.fillRect(mx - 65, my - 65, 130, 130);
    ctx.fillStyle = "#d4d098"; ctx.beginPath(); ctx.arc(mx, my, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath(); ctx.arc(mx - 7, my + 4, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 8, my - 5, 3, 0, Math.PI * 2); ctx.fill();
  }
  private _iGround(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const gy = H * 0.70;
    const gr = ctx.createLinearGradient(0, gy, 0, H);
    gr.addColorStop(0, "#0b1008"); gr.addColorStop(1, "#060906");
    ctx.fillStyle = gr; ctx.fillRect(0, gy, W, H - gy);
    ctx.fillStyle = "#0f1a0c"; ctx.beginPath(); ctx.moveTo(0, gy);
    for (let x = 0; x <= W; x += 6)
      ctx.lineTo(x, gy - Math.sin(x * 0.035) * 5 - Math.sin(x * 0.08 + 1.2) * 3);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  }
  private _iFog(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const gy = H * 0.70; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 10)
      ctx.lineTo(x, gy - 8 + Math.sin(x * 0.025 + this._introT * 0.7) * 16);
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = "rgba(170,190,200,0.11)"; ctx.fill();
  }
  private _cc(W: number, H: number) {
    return { cx: W * 0.5, baseY: H * 0.70, s: Math.min(W, H) / 600 };
  }
  private _iCastle(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const { cx, baseY, s } = this._cc(W, H);
    this._iTower(ctx, cx - 120 * s, baseY, 44 * s, 160 * s);
    this._iTower(ctx, cx + 120 * s, baseY, 40 * s, 140 * s);
    ctx.fillStyle = "#1a1520"; ctx.fillRect(cx - 106 * s, baseY - 118 * s, 212 * s, 118 * s);
    ctx.fillStyle = "#120f18"; ctx.fillRect(cx + 30 * s, baseY - 118 * s, 76 * s, 118 * s);
    this._iBattlements(ctx, cx - 106 * s, baseY - 118 * s, 212 * s, 20 * s, 16 * s);
    const dw = 40 * s, dh = 55 * s;
    ctx.fillStyle = "#060406"; ctx.beginPath();
    ctx.moveTo(cx - dw / 2, baseY); ctx.lineTo(cx - dw / 2, baseY - dh + dw / 2);
    ctx.arc(cx, baseY - dh + dw / 2, dw / 2, Math.PI, 0);
    ctx.lineTo(cx + dw / 2, baseY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(90,70,100,0.5)"; ctx.lineWidth = 2 * s; ctx.stroke();
    this._iWindow(ctx, cx - 52 * s, baseY - 82 * s, 18 * s, 26 * s);
    this._iWindow(ctx, cx + 34 * s, baseY - 82 * s, 18 * s, 26 * s);
    ctx.fillStyle = "#131012"; ctx.beginPath();
    ctx.moveTo(cx - 18 * s, baseY); ctx.lineTo(cx - 44 * s, H);
    ctx.lineTo(cx + 44 * s, H); ctx.lineTo(cx + 18 * s, baseY); ctx.closePath(); ctx.fill();
  }
  private _iTower(ctx: CanvasRenderingContext2D, tcx: number, baseY: number, hw: number, h: number): void {
    ctx.fillStyle = "#1a1520"; ctx.fillRect(tcx - hw, baseY - h, hw * 2, h);
    ctx.fillStyle = "#120f18"; ctx.fillRect(tcx + hw * 0.28, baseY - h, hw * 0.72, h);
    this._iBattlements(ctx, tcx - hw, baseY - h, hw * 2, hw * 0.35, hw * 0.36);
    this._iWindow(ctx, tcx - hw * 0.25, baseY - h * 0.56, hw * 0.5, h * 0.12);
  }
  private _iBattlements(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, mw: number, mh: number): void {
    ctx.fillStyle = "#1a1520";
    const count = Math.max(2, Math.floor(w / (mw * 1.65))), sp = w / count;
    for (let i = 0; i < count; i++) ctx.fillRect(x + i * sp, y - mh, mw, mh);
  }
  private _iWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = "#050306"; ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2);
    ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(90,70,100,0.4)"; ctx.lineWidth = 1.2; ctx.stroke();
  }
  private _iCandle(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const { cx, baseY, s } = this._cc(W, H);
    const tcx = cx - 120 * s, hw = 44 * s, h = 160 * s;
    const wx = tcx - hw * 0.25, ww = hw * 0.5, wy = baseY - h * 0.56, wh = h * 0.12;
    const wcx = wx + ww / 2, wcy = wy + wh / 2;
    const fl = 0.80 + 0.20 * Math.sin(this._introT * 6.5);
    const glow = ctx.createRadialGradient(wcx, wcy, 2, wcx, wcy, ww * 2.8);
    glow.addColorStop(0, `rgba(255,180,50,${0.32 * fl})`); glow.addColorStop(1, "rgba(255,100,0,0)");
    ctx.fillStyle = glow; ctx.fillRect(wcx - ww * 3, wcy - wh * 3, ww * 6, wh * 6);
    ctx.fillStyle = `rgba(255,200,80,${0.55 * fl})`; ctx.beginPath();
    ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2);
    ctx.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
    ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); ctx.fill();
  }
  private _iFigure(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const { cx, baseY, s } = this._cc(W, H);
    const dh = 55 * s, figH = dh * 0.72, figW = 14 * s, fx = cx - figW / 2, fy = baseY - figH;
    ctx.fillStyle = "rgba(28,12,28,0.88)";
    ctx.fillRect(fx, fy + figH * 0.22, figW, figH * 0.78);
    ctx.beginPath(); ctx.arc(cx, fy + figH * 0.13, figW * 0.6, 0, Math.PI * 2); ctx.fill();
    const ep = 0.35 + 0.30 * Math.sin(this._introT * 2.2);
    ctx.fillStyle = `rgba(190,50,50,${ep})`;
    ctx.beginPath(); ctx.arc(cx - 2.5 * s, fy + figH * 0.13, 1.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 2.5 * s, fy + figH * 0.13, 1.8 * s, 0, Math.PI * 2); ctx.fill();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — 3D GAME
  // ══════════════════════════════════════════════════════════════════════════

  private _started = false;

  private _startGame(): void {
    this._g.inMiniGame = true;
    this._g.autoClickCallback = null;
    this._g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText = "position:absolute;inset:0;overflow:hidden;background:#000;pointer-events:all;";
    this._g.ui.appendChild(this._wrap);

    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;";
    this._wrap.appendChild(this._canvas);

    this._engine = new Engine(this._canvas, true, { preserveDrawingBuffer: true });
    this._scene  = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.04, 0.02, 0.06, 1);

    this._camera = new FreeCamera("cam4", new Vector3(0, EYE_Y, 0), this._scene);
    this._camera.minZ = 0.05; this._camera.maxZ = 80;
    this._camera.rotation.y = this._yaw;

    const amb = new HemisphericLight("amb4", new Vector3(0, 1, 0), this._scene);
    amb.intensity = 1.1;
    amb.diffuse   = new Color3(0.8, 0.7, 1.0);
    amb.groundColor = new Color3(0.2, 0.12, 0.3);

    this._buildElevatorRoom();
    this._buildCorridor();
    this._buildEscapeRoom();
    this._buildBird();
    this._buildGreenDoor();
    this._buildEnemies();
    this._buildHUD();
    this._setupInput();
    this._buildStartOverlay();

    this._engine.runRenderLoop(() => {
      if (!this._done) this._tick(this._engine.getDeltaTime() / 1000);
      this._scene.render();
    });
  }

  private _buildStartOverlay(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;z-index:30;" +
      "background:linear-gradient(105deg,rgba(6,3,12,0.97) 60%,rgba(6,3,12,0) 100%);" +
      "display:flex;flex-direction:column;padding:clamp(20px,4vh,44px) clamp(18px,3vw,36px);" +
      "gap:0;pointer-events:all;width:min(320px,46%);";
    ov.innerHTML = `
      <div style="font-family:'Arial Black',Arial;line-height:1.05;margin-bottom:18px;">
        <div style="color:rgba(255,255,255,0.55);font-size:clamp(10px,1.3vw,14px);font-weight:900;letter-spacing:3px;">GARTEN OF</div>
        <div style="font-size:clamp(26px,4.5vw,50px);font-weight:900;letter-spacing:2px;">
          <span style="color:#22cc22;">B</span><span style="color:#ff4444;">AN</span><span style="color:#8833ff;">B</span><span style="color:#ff8800;">AN</span>
        </div>
        <div style="color:#c080ff;font-size:clamp(12px,1.8vw,20px);font-weight:900;letter-spacing:2px;margin-top:4px;">CHAPTER 4</div>
        <div style="height:2px;background:linear-gradient(90deg,rgba(160,80,255,0.5),transparent);margin-top:8px;"></div>
      </div>
      <div style="color:rgba(255,255,255,0.45);font-size:clamp(11px,1.3vw,14px);font-family:Arial;line-height:1.7;margin-bottom:20px;">
        You step off the elevator…<br>
        Find the baby bird. 🐣<br>
        Then run for your life.
      </div>
      <div id="g4Play" style="color:white;font-size:clamp(15px,2.2vw,24px);font-weight:bold;
        font-family:Arial;padding:10px 0 10px 4px;cursor:pointer;
        border-left:3px solid #c080ff;transition:color 0.12s,padding-left 0.12s;"
        onmouseover="this.style.color='#ddb8ff';this.style.paddingLeft='14px'"
        onmouseout="this.style.color='white';this.style.paddingLeft='4px'">▶ Play</div>
      <div style="margin-top:auto;padding-top:14px;">
        <button id="g4MenuBack" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);
          font-size:12px;padding:6px 14px;border-radius:16px;
          border:1px solid rgba(255,255,255,0.14);cursor:pointer;font-family:Arial;">← Back</button>
      </div>`;
    this._wrap.appendChild(ov);
    setTimeout(() => {
      ov.querySelector("#g4Play")?.addEventListener("pointerdown", () => {
        ov.remove();
        this._doStart();
      });
      ov.querySelector("#g4MenuBack")?.addEventListener("pointerdown", () => this._cleanup());
    }, 0);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private _mat(r: number, g: number, b: number, er = 0, eg = 0, eb = 0): StandardMaterial {
    const m = new StandardMaterial("", this._scene);
    m.diffuseColor = new Color3(r, g, b);
    m.maxSimultaneousLights = 8;
    if (er || eg || eb) m.emissiveColor = new Color3(er, eg, eb);
    return m;
  }
  private _box(w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial): Mesh {
    const m = MeshBuilder.CreateBox("", { width: w, height: h, depth: d }, this._scene);
    m.position.set(x, y, z); m.material = mat; m.isPickable = false;
    return m;
  }
  private _pl(x: number, y: number, z: number, r: number, g: number, b: number, i: number, range: number): void {
    const pl = new PointLight("", new Vector3(x, y, z), this._scene);
    pl.intensity = i; pl.range = range; pl.diffuse = new Color3(r, g, b);
  }

  // ── Level geometry ───────────────────────────────────────────────────────

  private _buildElevatorRoom(): void {
    const wallM  = this._mat(0.18, 0.10, 0.28, 0.04, 0.02, 0.08);
    const floorM = this._mat(0.22, 0.14, 0.30, 0.05, 0.03, 0.10);
    const ceilM  = this._mat(0.12, 0.07, 0.20, 0.03, 0.01, 0.07);
    // Floor & ceiling
    const gf = MeshBuilder.CreateGround("", { width: 10, height: 10 }, this._scene);
    gf.position.set(0, 0, 0); gf.material = floorM;
    const gc = MeshBuilder.CreateGround("", { width: 10, height: 10 }, this._scene);
    gc.rotation.x = Math.PI; gc.position.set(0, RH, 0); gc.material = ceilM;
    // North wall (Z=-5) — full
    this._box(10, RH, 0.15, 0, RH/2, -5, wallM);
    // West & east walls
    this._box(0.15, RH, 10, -5, RH/2, 0, wallM);
    this._box(0.15, RH, 10,  5, RH/2, 0, wallM);
    // South wall (Z=5) — two pieces leaving a 4-unit gap (corridor entrance)
    this._box(3, RH, 0.15, -3.5, RH/2, 5, wallM); // left of gap  (X -5 to -2)
    this._box(3, RH, 0.15,  3.5, RH/2, 5, wallM); // right of gap (X  2 to  5)
    // Elevator doors on north wall
    const elvM = this._mat(0.35, 0.30, 0.45, 0.08, 0.06, 0.12);
    this._box(3.5, RH - 0.2, 0.1, 0, RH/2, -4.9, elvM);
    this._box(0.08, RH*0.75, 0.12,  0.85, RH*0.4, -4.85, this._mat(0.5,0.45,0.6,0.15,0.12,0.2));
    this._box(0.08, RH*0.75, 0.12, -0.85, RH*0.4, -4.85, this._mat(0.5,0.45,0.6,0.15,0.12,0.2));
    // Lights
    this._pl(-3, 2.5, -3, 0.7, 0.5, 1.0, 1.5, 12);
    this._pl( 3, 2.5, -3, 0.7, 0.5, 1.0, 1.5, 12);
    const lm = this._mat(0.9, 0.8, 1.0, 0.9, 0.7, 1.0);
    this._box(0.3, 0.3, 0.3, -3, 2.6, -4.7, lm);
    this._box(0.3, 0.3, 0.3,  3, 2.6, -4.7, lm);
  }

  private _buildCorridor(): void {
    const wallM  = this._mat(0.16, 0.09, 0.24, 0.03, 0.01, 0.07);
    const floorM = this._mat(0.20, 0.12, 0.28, 0.04, 0.02, 0.08);
    const ceilM  = this._mat(0.10, 0.06, 0.18, 0.02, 0.01, 0.06);
    // Corridor X[-2,2], Z[5,20] — short, open at both ends
    const len = 15;
    const mid = 5 + len / 2; // = 12.5
    const gf = MeshBuilder.CreateGround("", { width: 4, height: len }, this._scene);
    gf.position.set(0, 0, mid); gf.material = floorM;
    const gc = MeshBuilder.CreateGround("", { width: 4, height: len }, this._scene);
    gc.rotation.x = Math.PI; gc.position.set(0, RH, mid); gc.material = ceilM;
    this._box(0.15, RH, len, -2, RH/2, mid, wallM);
    this._box(0.15, RH, len,  2, RH/2, mid, wallM);
    const lm = this._mat(0.8, 0.7, 1.0, 0.8, 0.6, 1.0);
    for (let z = 8; z < 20; z += 6) {
      this._box(0.2, 0.05, 0.9, 0, RH - 0.03, z, lm);
      this._pl(0, RH - 0.2, z, 0.7, 0.5, 1.0, 1.2, 10);
    }
  }

  private _buildGreenDoor(): void {
    const doorM = this._mat(0.05, 0.80, 0.10, 0.03, 0.55, 0.06);
    this._doorMesh = this._box(4, RH, 0.2, 0, RH/2, DOOR_Z, doorM);
    this._pl(0, RH/2, DOOR_Z, 0.1, 1.0, 0.2, 3.0, 10);
  }

  private _buildEscapeRoom(): void {
    const wallM  = this._mat(0.22, 0.12, 0.32, 0.05, 0.02, 0.10);
    const floorM = this._mat(0.28, 0.17, 0.38, 0.06, 0.03, 0.12);
    const ceilM  = this._mat(0.12, 0.07, 0.20, 0.03, 0.01, 0.07);
    // Big escape room: X[-2,14] Z[18,28]
    // South wall (Z=18): gap at X[-2,2] for corridor, wall at X[2,14]
    this._box(12, RH, 0.15, 8, RH/2, 18, wallM);
    // North wall (Z=28): full
    this._box(16, RH, 0.15, 6, RH/2, 28, wallM);
    // West wall (X=-2)
    this._box(0.15, RH, 10, -2, RH/2, 23, wallM);
    // Floor & ceiling
    const gf = MeshBuilder.CreateGround("", { width: 16, height: 10 }, this._scene);
    gf.position.set(6, 0, 23); gf.material = floorM;
    const gc = MeshBuilder.CreateGround("", { width: 16, height: 10 }, this._scene);
    gc.rotation.x = Math.PI; gc.position.set(6, RH, 23); gc.material = ceilM;
    // East wall (X=14) — exit elevator, bright blue glow
    const elvM = this._mat(0.35, 0.55, 0.9, 0.12, 0.28, 0.55);
    this._box(0.12, RH - 0.2, 10, 13.9, RH/2, 23, elvM);
    this._box(0.1, RH*0.7, 0.1, 13.85, RH*0.4, 20.5, this._mat(0.6,0.8,1.0,0.3,0.5,0.9));
    this._box(0.1, RH*0.7, 0.1, 13.85, RH*0.4, 25.5, this._mat(0.6,0.8,1.0,0.3,0.5,0.9));
    // Lights
    this._pl(6, 2.5, 21, 0.6, 0.4, 0.9, 1.4, 14);
    this._pl(6, 2.5, 25, 0.6, 0.4, 0.9, 1.4, 14);
    this._pl(13, 2, 23, 0.3, 0.6, 1.0, 2.5, 10);
    const lm = this._mat(0.5, 0.8, 1.0, 0.5, 0.8, 1.0);
    this._box(0.3, 0.3, 0.3, 13.6, 2.8, 23, lm);
  }

  private _buildBird(): void {
    const birdM = this._mat(1.0, 0.55, 0.75, 0.9, 0.3, 0.55);
    this._birdMesh = this._box(0.4, 0.4, 0.4, 1.0, 0.4, 3.0, birdM);
    this._pl(1.0, 0.7, 3.0, 1.0, 0.5, 0.75, 2.0, 6);
  }

  private _makeCreature(px: number, pz: number, scale: number): Mesh {
    const S     = scale;
    const navy  = this._mat(0.03, 0.04, 0.16, 0.02, 0.03, 0.12);
    const eyeM  = this._mat(1.0,  0.95, 0.10, 1.0,  0.85, 0.02);
    const pupM  = this._mat(0.02, 0.02, 0.05, 0.01, 0.01, 0.04);
    const toothM = this._mat(0.9, 0.9, 0.9, 0.6, 0.6, 0.6);

    // Invisible pivot at floor level — this is what we track for movement
    const root = MeshBuilder.CreateBox("", { size: 0.01 }, this._scene);
    root.position.set(px, 0, pz);
    root.isVisible = false;
    root.isPickable = false;

    const mk = (w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial) => {
      const b = MeshBuilder.CreateBox("", { width: w*S, height: h*S, depth: d*S }, this._scene);
      b.position.set(x*S, y*S, z*S);
      b.parent = root;
      b.material = m;
      b.isPickable = false;
    };

    mk(0.65, 0.70, 0.50,  0,     0.45,  0,    navy);   // body
    mk(1.05, 0.95, 0.80,  0,     1.30,  0.05, navy);   // large head
    mk(0.22, 0.22, 0.08, -0.20,  1.35,  0.42, eyeM);   // left eye
    mk(0.22, 0.22, 0.08,  0.20,  1.35,  0.42, eyeM);   // right eye
    mk(0.10, 0.13, 0.06, -0.20,  1.35,  0.46, pupM);   // left pupil
    mk(0.10, 0.13, 0.06,  0.20,  1.35,  0.46, pupM);   // right pupil
    mk(0.12, 0.12, 0.07, -0.18,  0.92,  0.25, toothM); // left tooth
    mk(0.12, 0.12, 0.07,  0,     0.92,  0.25, toothM); // mid tooth
    mk(0.12, 0.12, 0.07,  0.18,  0.92,  0.25, toothM); // right tooth
    mk(0.48, 0.18, 0.18, -0.62,  1.10,  0,    navy);   // left upper arm (raised)
    mk(0.48, 0.18, 0.18,  0.62,  1.10,  0,    navy);   // right upper arm (raised)
    mk(0.18, 0.38, 0.18, -0.90,  0.88,  0,    navy);   // left claw/forearm
    mk(0.18, 0.38, 0.18,  0.90,  0.88,  0,    navy);   // right claw/forearm
    mk(0.22, 0.28, 0.22, -0.18,  0.14,  0,    navy);   // left leg
    mk(0.22, 0.28, 0.22,  0.18,  0.14,  0,    navy);   // right leg

    return root;
  }

  private _buildEnemies(): void {
    // Tamataki — big, slow. Starts in back of escape room.
    const tam = this._makeCreature(4, 26, 1.05);
    this._enemies.push({ mesh: tam, spd: 1.9, active: false });

    // Tromboley — smaller, faster. Also in escape room, other side.
    const tro = this._makeCreature(9, 24, 0.82);
    this._enemies.push({ mesh: tro, spd: 2.7, active: false });
  }

  private _buildHUD(): void {
    this._hudPrompt = document.createElement("div");
    this._hudPrompt.style.cssText =
      "position:absolute;bottom:90px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.7);color:white;font-size:14px;padding:9px 20px;" +
      "border-radius:8px;border:1px solid rgba(255,255,255,0.18);" +
      "display:none;pointer-events:none;white-space:nowrap;z-index:10;font-family:Arial;";
    this._wrap.appendChild(this._hudPrompt);

    this._hudBird = document.createElement("div");
    this._hudBird.style.cssText =
      "position:absolute;top:16px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.65);color:#ff88bb;font-size:15px;padding:6px 18px;" +
      "border-radius:20px;border:1px solid rgba(255,120,180,0.4);" +
      "display:none;pointer-events:none;z-index:10;font-family:Arial;";
    this._hudBird.textContent = "🐣 Carrying baby bird";
    this._wrap.appendChild(this._hudBird);

    this._hudMsg = document.createElement("div");
    this._hudMsg.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "color:white;font-size:clamp(16px,3vw,28px);font-weight:bold;" +
      "text-align:center;pointer-events:none;z-index:10;font-family:Arial;display:none;";
    this._wrap.appendChild(this._hudMsg);

    // Crosshair
    const xh = document.createElement("div");
    xh.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "pointer-events:none;width:24px;height:24px;z-index:10;";
    xh.innerHTML =
      `<div style="position:absolute;inset:0;border-radius:50%;border:2px solid white;"></div>
       <div style="position:absolute;inset:9px;border-radius:50%;background:white;"></div>`;
    this._wrap.appendChild(xh);

    // Chapter label
    const lbl = document.createElement("div");
    lbl.style.cssText =
      "position:absolute;top:56px;right:12px;color:rgba(160,80,200,0.55);" +
      "font-size:11px;font-weight:bold;letter-spacing:2px;pointer-events:none;z-index:10;font-family:Arial;";
    lbl.textContent = "CHAPTER 4 — THE CASTLE";
    this._wrap.appendChild(lbl);

    // Back button
    const back = document.createElement("button");
    back.id = "g4Back";
    back.textContent = "✕";
    back.style.cssText =
      "position:absolute;top:14px;left:14px;background:rgba(0,0,0,0.5);color:rgba(255,255,255,0.5);" +
      "font-size:16px;width:34px;height:34px;border-radius:50%;" +
      "border:1px solid rgba(255,255,255,0.18);cursor:pointer;z-index:10;";
    back.addEventListener("click", () => this._cleanup());
    this._wrap.appendChild(back);
  }

  // ── Input ───────────────────────────────────────────────────────────────

  private _doStart(): void {
    if (this._started) return;
    this._started = true;
    this._canvas.requestPointerLock?.();
  }

  private _setupInput(): void {
    this._kd = (e: KeyboardEvent) => {
      if (!this._started) return;
      this._keys.add(e.code);
      if (e.code === "Escape") this._cleanup();
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
    };
    this._ku = (e: KeyboardEvent) => this._keys.delete(e.code);
    this._mm = (e: MouseEvent) => {
      if (document.pointerLockElement !== this._canvas) return;
      this._yaw   += e.movementX * 0.0022;
      this._pitch  = Math.max(-0.9, Math.min(0.9, this._pitch + e.movementY * 0.0022));
    };
    this._mc = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!this._started) return;
      if (document.pointerLockElement !== this._canvas) { this._canvas.requestPointerLock?.(); }
    };
    this._rz = () => this._engine.resize();
    document.addEventListener("keydown",   this._kd);
    document.addEventListener("keyup",     this._ku);
    document.addEventListener("mousemove", this._mm);
    this._canvas.addEventListener("pointerdown", this._mc);
    window.addEventListener("resize", this._rz);
  }

  // ── Tick ────────────────────────────────────────────────────────────────

  private _tick(dt: number): void {
    if (!this._started || this._isDead || this._hasWon) return;
    dt = Math.min(dt, 0.05);

    // Always sync camera rotation from yaw/pitch
    this._camera.rotation.set(this._pitch, this._yaw, 0);

    const pos = this._camera.position;

    // Movement
    const sin = Math.sin(this._yaw), cos = Math.cos(this._yaw);
    const fwd = new Vector3(sin, 0, cos);
    const rgt = new Vector3(cos, 0, -sin);
    const mv  = Vector3.Zero();
    if (this._keys.has("KeyW") || this._keys.has("ArrowUp"))    mv.addInPlace(fwd);
    if (this._keys.has("KeyS") || this._keys.has("ArrowDown"))  mv.subtractInPlace(fwd);
    if (this._keys.has("KeyA") || this._keys.has("ArrowLeft"))  mv.subtractInPlace(rgt);
    if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) mv.addInPlace(rgt);

    if (mv.lengthSquared() > 0) {
      mv.normalize().scaleInPlace(SPD * dt);
      const nx = pos.x + mv.x;
      const nz = pos.z + mv.z;
      if (canMove4(nx, pos.z, this._doorOpen)) pos.x = nx;
      if (canMove4(pos.x, nz, this._doorOpen)) pos.z = nz;
    }

    // Gravity
    this._velY -= 18 * dt;
    pos.y = Math.max(EYE_Y, pos.y + this._velY * dt);
    if (pos.y <= EYE_Y) { pos.y = EYE_Y; this._velY = 0; }

    // Bird pickup
    if (!this._hasBird && this._birdMesh) {
      const dx = pos.x - this._birdMesh.position.x;
      const dz = pos.z - this._birdMesh.position.z;
      if (Math.sqrt(dx*dx + dz*dz) < 1.2) {
        this._hasBird = true;
        this._birdMesh.dispose();
        this._hudBird.style.display = "block";
        this._showMsg("🐣 You picked up the baby bird! Keep going…", 3000);
        // Trigger door open shortly after
        setTimeout(() => this._openDoor(), 2000);
      }
    }

    // Bob bird mesh
    if (this._birdMesh && !this._hasBird) {
      this._birdMesh.position.y = 0.4 + Math.sin(Date.now() * 0.003) * 0.12;
    }

    // Door animation
    if (this._doorOpen && this._doorMesh && this._doorMesh.scaling.x > 0.01) {
      this._doorTimer += dt;
      this._doorMesh.scaling.x = Math.max(0, 1 - this._doorTimer * 2);
      if (this._doorMesh.scaling.x <= 0.01) this._doorMesh.isVisible = false;
    }

    // Enemies
    if (this._enemyReleased) {
      for (const en of this._enemies) {
        if (!en.active) continue;
        const ex = en.mesh.position.x, ez = en.mesh.position.z;
        const dx = pos.x - ex, dz = pos.z - ez;
        const dist = Math.sqrt(dx*dx + dz*dz);
        if (dist < CATCH_R) { this._die(); return; }
        // Move toward player
        const enx = ex + (dx / dist) * en.spd * dt;
        const enz = ez + (dz / dist) * en.spd * dt;
        if (canMove4(enx, en.mesh.position.z, true)) en.mesh.position.x = enx;
        if (canMove4(en.mesh.position.x, enz, true)) en.mesh.position.z = enz;
      }
    }

    // Prompt: near bird
    if (!this._hasBird && this._birdMesh) {
      const dx = pos.x - this._birdMesh.position.x, dz = pos.z - this._birdMesh.position.z;
      this._hudPrompt.style.display = Math.sqrt(dx*dx+dz*dz) < 2 ? "block" : "none";
      this._hudPrompt.textContent = "Walk into the baby bird to pick it up";
    } else {
      this._hudPrompt.style.display = "none";
    }

    // Win check: reach exit elevator on east wall of escape room
    if (pos.x > 12 && pos.z > 18 && pos.z < 28) {
      this._win();
    }
  }

  private _openDoor(): void {
    this._doorOpen = true;
    this._showMsg("⚠️ The green door opened!", 2500);
    setTimeout(() => {
      for (const en of this._enemies) en.active = true;
      this._enemyReleased = true;
      this._showMsg("🏃 RUN!", 2000);
    }, 1200);
  }

  private _showMsg(text: string, dur: number): void {
    this._hudMsg.textContent = text;
    this._hudMsg.style.display = "block";
    setTimeout(() => { this._hudMsg.style.display = "none"; }, dur);
  }

  private _die(): void {
    if (this._isDead) return;
    this._isDead = true;
    document.exitPointerLock?.();
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(120,0,0,0.88);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:18px;font-family:'Arial Black',Arial;";
    ov.innerHTML =
      `<div style="color:#ff3333;font-size:clamp(28px,5vw,56px);font-weight:900;">💀 CAUGHT!</div>` +
      `<div style="color:rgba(255,255,255,0.65);font-size:clamp(12px,1.6vw,16px);font-family:Arial;">Tamataki or Tromboley got you…</div>`;
    const retry = document.createElement("button");
    retry.textContent = "🔄 Try Again";
    retry.style.cssText = "background:rgba(255,255,255,0.12);color:#fff;font-size:16px;" +
      "padding:10px 28px;border-radius:22px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;margin-top:4px;";
    retry.onclick = () => { ov.remove(); this._cleanup(); import("./GardenBanban4").then(m => new m.GardenBanban4(this._g)); };
    const menu = document.createElement("button");
    menu.textContent = "← Back";
    menu.style.cssText = "background:none;color:rgba(255,255,255,0.4);font-size:13px;" +
      "padding:6px 16px;border-radius:16px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;";
    menu.onclick = () => { ov.remove(); this._cleanup(); };
    ov.appendChild(retry); ov.appendChild(menu);
    document.body.appendChild(ov);
  }

  private _win(): void {
    if (this._hasWon) return;
    this._hasWon = true;
    document.exitPointerLock?.();
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:#000;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:20px;font-family:'Arial Black',Arial;opacity:0;transition:opacity 0.7s;";
    ov.innerHTML =
      `<div style="color:#ffdd44;font-size:clamp(22px,4vw,44px);font-weight:900;text-shadow:0 0 30px gold;">🐣 Baby Bird Safe!</div>` +
      `<div style="color:rgba(255,255,255,0.6);font-size:clamp(12px,1.6vw,16px);text-align:center;line-height:1.9;font-family:Arial;">` +
      `You escaped Tamataki and Tromboley!<br>The adventure continues…</div>`;
    const btn = document.createElement("button");
    btn.textContent = "← Back to Menu";
    btn.style.cssText = "margin-top:8px;background:rgba(255,255,255,0.09);color:#fff;" +
      "font-size:15px;padding:10px 28px;border-radius:22px;" +
      "border:1px solid rgba(255,255,255,0.28);cursor:pointer;";
    btn.onclick = () => { ov.remove(); this._cleanup(); };
    ov.appendChild(btn);
    document.body.appendChild(ov);
    requestAnimationFrame(() => { ov.style.opacity = "1"; });
  }

  private _cleanup(): void {
    if (this._done) return;
    this._done = true;
    document.exitPointerLock?.();
    document.removeEventListener("keydown",   this._kd);
    document.removeEventListener("keyup",     this._ku);
    document.removeEventListener("mousemove", this._mm);
    this._canvas?.removeEventListener("pointerdown", this._mc);
    window.removeEventListener("resize", this._rz);
    this._engine?.stopRenderLoop();
    this._scene?.dispose();
    this._engine?.dispose();
    this._g.inMiniGame = false;
    this._wrap?.remove();
    this._g.goArcade();
  }
}
