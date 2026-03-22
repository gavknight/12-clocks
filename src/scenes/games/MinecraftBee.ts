import type { Game } from "../../game/Game";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAP_W   = 18;
const MAP_H   = 18;
const T_GRASS     = 0;
const T_FLOWER    = 2;
const T_BLOOM     = 3;
const T_HIVE      = 4;
const T_WASP_NEST = 5;
const SPEED      = 5.5;
const FLY_SPEED  = 3.0;
const BEE_SPEED  = 4.0;
const TURN_SPEED = 2.8;
const FOV        = Math.PI * 0.7; // ~126° FOV

// ── Interfaces ────────────────────────────────────────────────────────────────
type BeeState = "orbit" | "toFlower" | "collect" | "toHive";

interface WorkerBee {
  wx: number; wy: number; wz: number;
  vx: number; vy: number; vz: number;
  state: BeeState;
  targetTileX: number; targetTileY: number;
  collectTimer: number;
  pollen: boolean;
  orbitAngle: number;
  frame: number;
}

interface Wasp { wx: number; wy: number; wz: number; vwx: number; vwy: number; alive: boolean; }
interface FloatText { text: string; x: number; y: number; life: number; }

// ── Tile floor colors (what the GROUND looks like under each tile type) ────────
function tileRGB(t: number, dark: boolean): [number, number, number] {
  const d = dark ? 18 : 0;
  switch (t) {
    case T_HIVE:      return [160 - d, 120 - d, 18 - d]; // gold floor
    case T_WASP_NEST: return [50  - d, 42  - d, 25 - d]; // dark floor
    default:          return [52  - d, 108 - d, 24 - d]; // grass
  }
}

// ── Block face base color (for 3D boxes — no green on pickable items) ─────────
function blockRGB(t: number): [number, number, number] {
  switch (t) {
    case T_FLOWER:    return [120, 88, 50];  // oak wood brown
    case T_BLOOM:     return [105, 75, 42];  // darker brown
    case T_HIVE:      return [190, 148, 22]; // golden
    case T_WASP_NEST: return [68,  55, 32];  // dark brown
    default:          return [90,  70, 40];
  }
}

// ── Main class ────────────────────────────────────────────────────────────────
export class MinecraftBee {
  private _raf = 0;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _done = false;
  private _cleanup: (() => void)[] = [];
  private _g: Game;

  private _map: number[][] = [];
  private _bloomTimers: number[][] = [];

  // Player
  private _px = 4.0; private _py = 4.0; private _pz = 1.8;
  private _yaw = Math.PI / 4; // face toward center of map
  private _pitchOffset = 0;   // pixels horizon is shifted from center (+ = looking up)
  private _pvx = 0; private _pvy = 0; private _pvz = 0;
  private _pframe = 0;

  // Hive
  private _hivePlaced = false; private _hiveWx = 0; private _hiveWy = 0;
  private _hiveFlash = 0;

  // Economy
  private _honey = 0; private _honeyMax = 50; private _xp = 0; private _level = 1;

  // Bees / wasps
  private _bees: WorkerBee[] = [];
  private _maxBees = 2;
  private _wasps: Wasp[] = [];
  private _waspTimer = 20.0;
  private _warActive = false;
  private _pointerLocked = false;

  // FX
  private _floats: FloatText[] = [];
  private _levelUpFlash = 0;

  // Input
  private _keys: Record<string, boolean> = {};
  private _joyActive = false; private _joyStartX = 0; private _joyStartY = 0;
  private _joyDX = 0; private _joyDY = 0; private _joyPointerId = -1;
  private _flyUp = false; private _flyDown = false;

  private _lastTs = 0;
  private _sessionCoins = 0;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.autoClickCallback = null;

    // NOTE: use <div> not <button> — #ui button CSS in index.html overrides all button styles
    g.ui.innerHTML = `
      <div id="mbWrap" style="position:relative;width:100%;height:100%;background:#000;overflow:hidden;touch-action:none;">
        <canvas id="mbCanvas" style="display:block;width:100%;height:100%;touch-action:none;image-rendering:pixelated;"></canvas>

        <!-- Place Hive -->
        <div id="mbPlaceBtn" style="
          position:absolute;left:12px;bottom:90px;
          background:rgba(30,110,0,0.92);color:#fff;
          border:2px solid rgba(80,220,40,0.8);border-radius:14px;
          padding:12px 18px;font-size:14px;font-weight:bold;
          font-family:Arial,sans-serif;cursor:pointer;
          touch-action:manipulation;user-select:none;
          text-align:center;min-width:120px;line-height:1.4;
        ">🏠 Place Hive<br><span style='font-size:10px;opacity:0.65'>Stand still + tap</span></div>

        <!-- Call Bees -->
        <div id="mbCallBtn" style="
          position:absolute;right:12px;bottom:90px;
          background:rgba(90,20,170,0.92);color:#fff;
          border:2px solid rgba(160,80,255,0.8);border-radius:14px;
          padding:12px 18px;font-size:14px;font-weight:bold;
          font-family:Arial,sans-serif;cursor:pointer;
          touch-action:manipulation;user-select:none;
          text-align:center;min-width:120px;line-height:1.4;
        ">🐝 Call Bees<br><span style='font-size:10px;opacity:0.65'>Tap to call</span></div>

        <!-- Fly Up -->
        <div id="mbFlyUp" style="
          position:absolute;right:12px;top:62px;
          background:rgba(0,80,160,0.85);color:#fff;
          border:2px solid rgba(80,160,255,0.7);border-radius:10px;
          padding:10px 16px;font-size:20px;font-weight:bold;
          font-family:Arial,sans-serif;cursor:pointer;
          touch-action:manipulation;user-select:none;
        ">▲</div>

        <!-- Fly Down -->
        <div id="mbFlyDn" style="
          position:absolute;right:12px;top:116px;
          background:rgba(0,80,160,0.85);color:#fff;
          border:2px solid rgba(80,160,255,0.7);border-radius:10px;
          padding:10px 16px;font-size:20px;font-weight:bold;
          font-family:Arial,sans-serif;cursor:pointer;
          touch-action:manipulation;user-select:none;
        ">▼</div>
      </div>
    `;

    this._canvas = document.getElementById("mbCanvas") as HTMLCanvasElement;
    this._ctx    = this._canvas.getContext("2d")!;
    this._resize();

    const onResize = () => this._resize();
    window.addEventListener("resize", onResize);
    this._cleanup.push(() => window.removeEventListener("resize", onResize));

    // ── HTML button wiring ──
    const placeBtn = document.getElementById("mbPlaceBtn")!;
    const callBtn  = document.getElementById("mbCallBtn")!;
    const flyUp    = document.getElementById("mbFlyUp")!;
    const flyDn    = document.getElementById("mbFlyDn")!;

    const onPlace = () => this._placeHive();
    const onCall  = () => this._toggleSwarm();
    const onUpDn  = (e: Event) => { e.preventDefault(); this._flyUp   = true; };
    const onUpUp  = ()          => { this._flyUp   = false; };
    const onDnDn  = (e: Event) => { e.preventDefault(); this._flyDown = true; };
    const onDnUp  = ()          => { this._flyDown = false; };

    placeBtn.addEventListener("pointerdown", onPlace);
    callBtn.addEventListener("pointerdown",  onCall);
    flyUp.addEventListener("pointerdown",  onUpDn); flyUp.addEventListener("pointerup",  onUpUp); flyUp.addEventListener("pointerleave", onUpUp);
    flyDn.addEventListener("pointerdown",  onDnDn); flyDn.addEventListener("pointerup",  onDnUp); flyDn.addEventListener("pointerleave", onDnUp);
    this._cleanup.push(() => {
      placeBtn.removeEventListener("pointerdown", onPlace);
      callBtn.removeEventListener("pointerdown",  onCall);
      flyUp.removeEventListener("pointerdown",  onUpDn); flyUp.removeEventListener("pointerup",  onUpUp); flyUp.removeEventListener("pointerleave", onUpUp);
      flyDn.removeEventListener("pointerdown",  onDnDn); flyDn.removeEventListener("pointerup",  onDnUp); flyDn.removeEventListener("pointerleave", onDnUp);
    });

    // ── Mouse look — movementX/Y always works, pointer lock constrains cursor ──
    const wrap = document.getElementById("mbWrap") as HTMLDivElement;
    wrap.style.cursor = "none";
    this._pointerLocked = true;

    const onMouseMove = (e: MouseEvent) => {
      if (!this._pointerLocked) return;
      this._yaw         += e.movementX * 0.003;
      this._pitchOffset  = Math.max(-300, Math.min(300, this._pitchOffset + e.movementY * 0.9));
    };
    document.addEventListener("mousemove", onMouseMove);

    // Request pointer lock on canvas click (must be inside a user-gesture handler)
    const onCanvasClick = () => {
      if (!this._pointerLocked) return;
      this._canvas.requestPointerLock?.();
    };
    this._canvas.addEventListener("click", onCanvasClick);

    const onLockChange = () => {
      const locked = document.pointerLockElement === this._canvas;
      wrap.style.cursor = locked ? "none" : (this._pointerLocked ? "none" : "default");
    };
    document.addEventListener("pointerlockchange", onLockChange);

    this._cleanup.push(() => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      this._canvas.removeEventListener("click", onCanvasClick);
      if (document.pointerLockElement === this._canvas) document.exitPointerLock?.();
      wrap.style.cursor = "";
    });

    // ── Keyboard ──
    const onKD = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        this._pointerLocked = !this._pointerLocked;
        if (this._pointerLocked) {
          wrap.style.cursor = "none";
          this._canvas.requestPointerLock?.();
        } else {
          wrap.style.cursor = "default";
          document.exitPointerLock?.();
        }
        return;
      }
      this._keys[e.code] = true;
      if (e.code === "KeyH") this._placeHive();
      if (e.code === "KeyC") this._cashHoney();
      if (["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE","Space","ShiftLeft"].includes(e.code)) e.preventDefault();
    };
    const onKU = (e: KeyboardEvent) => { this._keys[e.code] = false; };
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup",   onKU);
    this._cleanup.push(() => { window.removeEventListener("keydown", onKD); window.removeEventListener("keyup", onKU); });

    // ── Touch joystick (left half of canvas) ──
    const onPD = (e: PointerEvent) => {
      // Only canvas events (not buttons)
      if (e.target !== this._canvas) return;
      const rect = this._canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (this._canvas.width  / rect.width);
      const sy = (e.clientY - rect.top)  * (this._canvas.height / rect.height);
      if (sx < 80 && sy < 54) { this._end(); return; }
      const W = this._canvas.width, H = this._canvas.height;
      if (sx < W * 0.55 && sy > 60 && sy < H - 70) {
        this._joyActive = true; this._joyStartX = sx; this._joyStartY = sy;
        this._joyDX = 0; this._joyDY = 0; this._joyPointerId = e.pointerId;
      }
    };
    const onPM = (e: PointerEvent) => {
      if (this._joyPointerId !== e.pointerId) return;
      const rect = this._canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (this._canvas.width  / rect.width);
      const sy = (e.clientY - rect.top)  * (this._canvas.height / rect.height);
      this._joyDX = sx - this._joyStartX;
      this._joyDY = sy - this._joyStartY;
    };
    const onPU = (e: PointerEvent) => {
      if (this._joyPointerId === e.pointerId) {
        this._joyActive = false; this._joyDX = 0; this._joyDY = 0; this._joyPointerId = -1;
      }
    };
    this._canvas.addEventListener("pointerdown",   onPD);
    this._canvas.addEventListener("pointermove",   onPM);
    this._canvas.addEventListener("pointerup",     onPU);
    this._canvas.addEventListener("pointercancel", onPU);
    this._cleanup.push(() => {
      this._canvas.removeEventListener("pointerdown",   onPD);
      this._canvas.removeEventListener("pointermove",   onPM);
      this._canvas.removeEventListener("pointerup",     onPU);
      this._canvas.removeEventListener("pointercancel", onPU);
    });

    this._initMap();
    this._initBees();
    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  private _resize(): void {
    this._canvas.width  = this._canvas.clientWidth  || 400;
    this._canvas.height = this._canvas.clientHeight || 700;
  }

  private _initMap(): void {
    this._map = []; this._bloomTimers = [];
    for (let y = 0; y < MAP_H; y++) {
      this._map.push(new Array(MAP_W).fill(T_GRASS));
      this._bloomTimers.push(new Array(MAP_W).fill(0));
    }
    let placed = 0, attempts = 0;
    while (placed < 22 && attempts < 300) {
      attempts++;
      const fx = 1 + Math.floor(Math.random() * (MAP_W - 2));
      const fy = 1 + Math.floor(Math.random() * (MAP_H - 2));
      if (fx >= 14 && fy >= 14) continue;
      if (this._map[fy][fx] === T_GRASS) { this._map[fy][fx] = T_FLOWER; placed++; }
    }
    for (let ny = 14; ny <= 15; ny++)
      for (let nx = 14; nx <= 15; nx++)
        this._map[ny][nx] = T_WASP_NEST;
  }

  private _initBees(): void {
    this._bees = [];
    for (let i = 0; i < this._maxBees; i++) {
      const angle = (i / this._maxBees) * Math.PI * 2;
      this._bees.push({
        wx: this._px + Math.cos(angle) * 1.5, wy: this._py + Math.sin(angle) * 1.5, wz: 2.0,
        vx: 0, vy: 0, vz: 0, state: "orbit",
        targetTileX: -1, targetTileY: -1, collectTimer: 0,
        pollen: false, orbitAngle: angle, frame: Math.floor(Math.random() * 60),
      });
    }
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  private _loop(ts: number): void {
    const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
    this._lastTs = ts;
    this._update(dt);
    this._draw();
    if (!this._done) this._raf = requestAnimationFrame(t => this._loop(t));
  }

  // ── Update ────────────────────────────────────────────────────────────────

  private _update(dt: number): void {
    const W = this._canvas.width, H = this._canvas.height;

    let fwd = 0, turn = 0, mz = 0;
    if (this._keys["KeyW"]) fwd  += 1;
    if (this._keys["KeyS"]) fwd  -= 1;
    if (this._keys["KeyA"]) turn -= 1;
    if (this._keys["KeyD"]) turn += 1;
    if (this._keys["KeyQ"] || this._keys["Space"] || this._flyUp)   mz += 1;
    if (this._keys["KeyE"] || this._keys["ShiftLeft"] || this._flyDown) mz -= 1;

    if (this._joyActive) {
      const jLen = Math.sqrt(this._joyDX ** 2 + this._joyDY ** 2);
      if (jLen > 10) {
        const amt = Math.min(jLen / 55, 1);
        fwd  += (-this._joyDY / jLen) * amt;
        turn += ( this._joyDX / jLen) * amt;
      }
    }

    this._yaw += turn * TURN_SPEED * dt;
    const mx = Math.cos(this._yaw) * fwd;
    const my = Math.sin(this._yaw) * fwd;
    const smooth = Math.min(1, 10 * dt);
    this._pvx += (mx * SPEED    - this._pvx) * smooth;
    this._pvy += (my * SPEED    - this._pvy) * smooth;
    this._pvz += (mz * FLY_SPEED - this._pvz) * smooth;
    this._px += this._pvx * dt;
    this._py += this._pvy * dt;
    this._pz += this._pvz * dt;
    this._px = Math.max(0.5, Math.min(MAP_W - 0.5, this._px));
    this._py = Math.max(0.5, Math.min(MAP_H - 0.5, this._py));
    this._pz = Math.max(1.0, Math.min(6.0, this._pz));
    this._pframe++;

    // Bloom timers
    for (let by = 0; by < MAP_H; by++)
      for (let bx = 0; bx < MAP_W; bx++)
        if (this._map[by][bx] === T_BLOOM && (this._bloomTimers[by][bx] -= dt) <= 0)
          this._map[by][bx] = T_FLOWER;

    // Auto-pollination (fly low near flowers)
    const qx = Math.floor(this._px), qy = Math.floor(this._py);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const tx = qx + dx, ty = qy + dy;
      if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) continue;
      if (this._map[ty][tx] === T_FLOWER && this._pz < 1.6) {
        const d = Math.sqrt((this._px - (tx + 0.5)) ** 2 + (this._py - (ty + 0.5)) ** 2);
        if (d < 0.9) {
          this._map[ty][tx] = T_BLOOM;
          this._bloomTimers[ty][tx] = 45;
          this._floats.push({ text: "✨ Pollinated!", x: W / 2, y: H * 0.4, life: 1.5 });
        }
      }
    }

    // Worker bees
    for (const bee of this._bees) this._updateBee(bee, dt);

    // Wasps
    if (!this._warActive) {
      this._waspTimer -= dt;
      if (this._waspTimer <= 0) {
        this._waspTimer = Math.max(8, 20 - this._level * 1.5);
        for (let i = 0; i < 1 + this._level; i++)
          this._wasps.push({ wx: 14.5 + Math.random()*2, wy: 14.5 + Math.random()*2, wz: 1.5, vwx: 0, vwy: 0, alive: true });
      }
      for (const w of this._wasps) {
        if (!w.alive) continue;
        const tx = this._hivePlaced ? this._hiveWx + 0.5 : this._px;
        const ty = this._hivePlaced ? this._hiveWy + 0.5 : this._py;
        const dx = tx - w.wx, dy = ty - w.wy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 0.05) { const s = 2.5; w.vwx += (dx/dist*s - w.vwx)*Math.min(1,4*dt); w.vwy += (dy/dist*s - w.vwy)*Math.min(1,4*dt); }
        w.wx += w.vwx * dt; w.wy += w.vwy * dt;
        if (this._hivePlaced && dist < 0.7) {
          this._honey = Math.max(0, this._honey - 10);
          this._hiveFlash = 0.6; w.alive = false;
          this._floats.push({ text: "⚠️ -10 Honey!", x: W/2, y: H*0.4, life: 1.5 });
        }
        for (const bee of this._bees)
          if (bee.state === "orbit" && Math.sqrt((w.wx-bee.wx)**2+(w.wy-bee.wy)**2) < 1.5) { w.alive = false; break; }
        if (w.wx < -1 || w.wx > MAP_W+1 || w.wy < -1 || w.wy > MAP_H+1) w.alive = false;
      }
      this._wasps = this._wasps.filter(w => w.alive);
    }

    if (this._hiveFlash    > 0) this._hiveFlash    -= dt;
    if (this._levelUpFlash > 0) this._levelUpFlash -= dt;

    // Level up
    const xpThresh = Math.floor(50 * Math.pow(this._level, 1.5));
    if (this._xp >= xpThresh && this._level < 10) {
      this._level++;
      this._maxBees  = Math.min(10, this._level * 2);
      this._honeyMax = 50 + this._level * 20;
      this._levelUpFlash = 2.0;
      while (this._bees.length < this._maxBees) {
        const angle = Math.random() * Math.PI * 2;
        this._bees.push({ wx: this._px+Math.cos(angle)*1.5, wy: this._py+Math.sin(angle)*1.5, wz: 2.0, vx:0,vy:0,vz:0, state:"orbit", targetTileX:-1, targetTileY:-1, collectTimer:0, pollen:false, orbitAngle:angle, frame:0 });
      }
      this._floats.push({ text:`🎉 LEVEL UP! Lv.${this._level}`, x:W/2, y:H*0.35, life:2.5 });
    }

    for (const ft of this._floats) { ft.life -= dt; ft.y -= 20 * dt; }
    this._floats = this._floats.filter(ft => ft.life > 0);

    // Update Place Hive button
    const pb = document.getElementById("mbPlaceBtn");
    if (pb) {
      pb.innerHTML = this._hivePlaced
        ? `📦 Pick Up<br><span style='font-size:10px;opacity:0.65'>Tap to pick up</span>`
        : `🏠 Place Hive<br><span style='font-size:10px;opacity:0.65'>Stand still + tap</span>`;
      (pb as HTMLDivElement).style.background = this._hivePlaced ? "rgba(160,50,0,0.92)" : "rgba(30,110,0,0.92)";
    }
  }

  // ── Bee AI ────────────────────────────────────────────────────────────────

  private _updateBee(bee: WorkerBee, dt: number): void {
    bee.frame++;
    switch (bee.state) {
      case "orbit": {
        bee.orbitAngle += dt * 2.2;
        const cx = this._hivePlaced ? this._hiveWx+0.5 : this._px;
        const cy = this._hivePlaced ? this._hiveWy+0.5 : this._py;
        bee.vx += (cx + Math.cos(bee.orbitAngle)*1.5 - bee.wx) * 6*dt;
        bee.vy += (cy + Math.sin(bee.orbitAngle)*1.5 - bee.wy) * 6*dt;
        bee.vz += (2.0 - bee.wz) * 4*dt;
        bee.wx += bee.vx*dt; bee.wy += bee.vy*dt; bee.wz += bee.vz*dt;
        if (this._hivePlaced) {
          const t = this._nearestBloom(bee);
          if (t) { bee.state = "toFlower"; bee.targetTileX = t.x; bee.targetTileY = t.y; }
        }
        break;
      }
      case "toFlower": {
        if (!this._hivePlaced) { bee.state="orbit"; break; }
        const tx = bee.targetTileX, ty = bee.targetTileY;
        if (tx<0||ty<0||this._map[ty][tx]!==T_BLOOM) { bee.state="orbit"; break; }
        const dx = tx+0.5-bee.wx, dy = ty+0.5-bee.wy;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 0.3) { bee.state="collect"; bee.collectTimer=2.0; }
        else { bee.vx+=(dx/dist*BEE_SPEED-bee.vx)*Math.min(1,6*dt); bee.vy+=(dy/dist*BEE_SPEED-bee.vy)*Math.min(1,6*dt); bee.vz+=(1.5-bee.wz)*4*dt; bee.wx+=bee.vx*dt; bee.wy+=bee.vy*dt; bee.wz+=bee.vz*dt; }
        break;
      }
      case "collect": {
        if (!this._hivePlaced) { bee.state="orbit"; break; }
        bee.vx*=0.8; bee.vy*=0.8; bee.collectTimer-=dt;
        if (bee.collectTimer<=0) { if (this._map[bee.targetTileY]?.[bee.targetTileX]===T_BLOOM) bee.pollen=true; bee.state="toHive"; }
        bee.wx+=bee.vx*dt; bee.wy+=bee.vy*dt;
        break;
      }
      case "toHive": {
        if (!this._hivePlaced) { bee.state="orbit"; break; }
        const hx = this._hiveWx+0.5, hy = this._hiveWy+0.5;
        const dx=hx-bee.wx, dy=hy-bee.wy, dz=2.0-bee.wz;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 0.3) {
          if (bee.pollen) {
            bee.pollen=false;
            const gain = 5+this._level;
            this._honey = Math.min(this._honeyMax, this._honey+gain);
            this._xp += gain;
            this._floats.push({ text:`+${gain} 🍯`, x:this._canvas.width/2, y:this._canvas.height*0.5, life:1.0 });
          }
          bee.state="orbit";
        } else { bee.vx+=(dx/dist*BEE_SPEED-bee.vx)*Math.min(1,6*dt); bee.vy+=(dy/dist*BEE_SPEED-bee.vy)*Math.min(1,6*dt); bee.vz+=(dz*4-bee.vz)*Math.min(1,4*dt); bee.wx+=bee.vx*dt; bee.wy+=bee.vy*dt; bee.wz+=bee.vz*dt; }
        break;
      }
    }
  }

  private _nearestBloom(bee: WorkerBee): {x:number,y:number}|null {
    let best: {x:number,y:number}|null = null; let bd = Infinity;
    for (let ty=0;ty<MAP_H;ty++) for (let tx=0;tx<MAP_W;tx++) {
      if (this._map[ty][tx]!==T_BLOOM) continue;
      const d = (bee.wx-(tx+0.5))**2+(bee.wy-(ty+0.5))**2;
      if (d<bd) { bd=d; best={x:tx,y:ty}; }
    }
    return best;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private _placeHive(): void {
    if (this._hivePlaced) {
      this._map[this._hiveWy][this._hiveWx] = T_GRASS;
      this._hivePlaced = false;
      for (const b of this._bees) b.state = "orbit";
    } else {
      const tx=Math.floor(this._px), ty=Math.floor(this._py);
      if (tx<0||tx>=MAP_W||ty<0||ty>=MAP_H||this._map[ty][tx]===T_WASP_NEST) return;
      this._map[ty][tx]=T_HIVE; this._hiveWx=tx; this._hiveWy=ty; this._hivePlaced=true;
      for (const b of this._bees) b.state="orbit";
    }
  }

  private _toggleSwarm(): void { if (!this._hivePlaced) for (const b of this._bees) b.state="orbit"; }

  private _cashHoney(): void {
    const e = Math.floor(this._honey/10); if (e<=0) return;
    this._honey -= e*10; this._g.state.coins += e; this._sessionCoins += e; this._g.save();
    this._floats.push({ text:`+${e} 🪙`, x:this._canvas.width/2, y:this._canvas.height*0.45, life:1.5 });
  }

  // ── Renderer ──────────────────────────────────────────────────────────────

  private _draw(): void {
    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const horizonY = Math.max(10, Math.min(H - 10, Math.floor(H * 0.5 + this._pitchOffset)));
    const eyeZ     = this._pz; // eye altitude above world z=0

    // Half FOV tangent → focal length so that tan(FOV/2) = (W/2)/focalLen
    const focalLen = (W / 2) / Math.tan(FOV / 2);
    const cosY = Math.cos(this._yaw);
    const sinY = Math.sin(this._yaw);

    // ── Sky ──
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0, "#0d2a6a");
    sky.addColorStop(0.6, "#1a6acd");
    sky.addColorStop(1,   "#87ceeb");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizonY);

    // ── Floor casting (per-pixel, uses ImageData) ──
    // Only render floor pixels; ceiling uses sky gradient
    const imgData = ctx.createImageData(W, H - horizonY);
    const buf = imgData.data;

    // Left/right ray directions at horizon
    const leftRX  = Math.cos(this._yaw - FOV / 2);
    const leftRY  = Math.sin(this._yaw - FOV / 2);
    const rightRX = Math.cos(this._yaw + FOV / 2);
    const rightRY = Math.sin(this._yaw + FOV / 2);

    // eyeZ - 1.0 = height above the ground plane (ground is at z=1)
    const hAboveGround = Math.max(0.01, eyeZ - 1.0);

    for (let row = 0; row < H - horizonY; row++) {
      const screenRow = horizonY + row;
      const rowDist = (hAboveGround * focalLen) / (screenRow - horizonY + 0.5);
      const stepX   = rowDist * (rightRX - leftRX) / W;
      const stepY   = rowDist * (rightRY - leftRY) / W;
      let floorX    = this._px + rowDist * leftRX;
      let floorY    = this._py + rowDist * leftRY;

      // Fog factor (dim at distance)
      const fog = Math.max(0, Math.min(1, 1 - rowDist / 18));

      for (let col = 0; col < W; col++) {
        const tx = Math.floor(floorX);
        const ty = Math.floor(floorY);
        const dark = ((tx ^ ty) & 1) === 1;
        const tile = (tx >= 0 && tx < MAP_W && ty >= 0 && ty < MAP_H) ? this._map[ty][tx] : T_GRASS;
        const [r0,g0,b0] = tileRGB(tile, dark);

        // Apply fog (blend toward sky-blue at distance)
        const fogR = 135, fogG = 206, fogB = 235;
        const r = Math.round(r0 * fog + fogR * (1-fog));
        const g = Math.round(g0 * fog + fogG * (1-fog));
        const b = Math.round(b0 * fog + fogB * (1-fog));

        const idx = (row * W + col) * 4;
        buf[idx]   = r;
        buf[idx+1] = g;
        buf[idx+2] = b;
        buf[idx+3] = 255;

        floorX += stepX;
        floorY += stepY;
      }
    }
    ctx.putImageData(imgData, 0, horizonY);

    // ── Project helper ──
    const project = (wx: number, wy: number, wz: number) => {
      const dx  =  wx - this._px;
      const dy  =  wy - this._py;
      const cz  =  dx * cosY + dy * sinY;
      const cx2 = -dx * sinY + dy * cosY;
      if (cz < 0.15) return null;
      return {
        sx: W/2 + (cx2 / cz) * focalLen,
        sy: horizonY - ((wz - eyeZ) / cz) * focalLen,
        scale: focalLen / cz,
        cz,
        cx2,
      };
    };

    // ── Collect all sprites (blocks + bees + wasps) ──
    type Sprite = { cz: number; draw: () => void };
    const sprites: Sprite[] = [];

    // Blocks (non-grass tiles rendered as 3D boxes)
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const t = this._map[ty][tx];
        if (t === T_GRASS) continue;

        // Project the face corners of the block
        const c0 = project(tx,    ty,    2); // top-near-left
        const c1 = project(tx+1, ty,    2); // top-near-right
        const c2 = project(tx+1, ty+1,  2); // top-far-right
        const c3 = project(tx,    ty+1,  2); // top-far-left
        const b0 = project(tx,    ty,    1); // bot-near-left
        const b3 = project(tx,    ty+1,  1);
        const b1 = project(tx+1, ty,    1); // bot-near-right
        const b2 = project(tx+1, ty+1,  1);

        // Skip if all corners behind camera
        const allNull = [c0,c1,c2,c3,b0,b1,b2,b3].every(c => !c);
        if (allNull) continue;

        // Use block center for depth sorting and culling
        const ctr = project(tx+0.5, ty+0.5, 1.5);
        if (!ctr) continue;
        if (Math.abs(ctr.cx2 / ctr.cz) > 1.5) continue; // rough frustum cull

        const [fr,fg,fb] = blockRGB(t);
        // Face tints
        const frontColor  = `rgb(${fr},${fg},${fb})`;
        const rightColor  = `rgb(${Math.round(fr*0.72)},${Math.round(fg*0.72)},${Math.round(fb*0.72)})`;
        const leftColor   = `rgb(${Math.round(fr*0.58)},${Math.round(fg*0.58)},${Math.round(fb*0.58)})`;
        const topColor    = `rgb(${Math.min(255,Math.round(fr*1.22))},${Math.min(255,Math.round(fg*1.22))},${Math.min(255,Math.round(fb*1.22))})`;

        // Emoji label
        let emoji = "";
        switch (t) {
          case T_FLOWER: emoji = "🌼"; break;
          case T_BLOOM:  emoji = "🌺"; break;
          case T_HIVE:   emoji = this._hiveFlash > 0 ? "💥" : "🍯"; break;
          case T_WASP_NEST: emoji = "🪺"; break;
        }

        const _cz = ctr.cz;
        sprites.push({ cz: _cz, draw: () => {
          if (!c0||!c1||!c2||!c3||!b0||!b1||!b2||!b3) return;
          ctx.save();

          // Determine which faces are visible
          // Front face (near-Y): ty side
          ctx.fillStyle = frontColor;
          ctx.beginPath();
          ctx.moveTo(b0.sx, b0.sy); ctx.lineTo(b1.sx, b1.sy);
          ctx.lineTo(c1.sx, c1.sy); ctx.lineTo(c0.sx, c0.sy);
          ctx.closePath(); ctx.fill();

          // Right face (near-X+1): tx+1 side
          ctx.fillStyle = rightColor;
          ctx.beginPath();
          ctx.moveTo(b1.sx, b1.sy); ctx.lineTo(b2.sx, b2.sy);
          ctx.lineTo(c2.sx, c2.sy); ctx.lineTo(c1.sx, c1.sy);
          ctx.closePath(); ctx.fill();

          // Left face (tx side)
          ctx.fillStyle = leftColor;
          ctx.beginPath();
          ctx.moveTo(b3.sx, b3.sy); ctx.lineTo(b0.sx, b0.sy);
          ctx.lineTo(c0.sx, c0.sy); ctx.lineTo(c3.sx, c3.sy);
          ctx.closePath(); ctx.fill();

          // Top face
          ctx.fillStyle = topColor;
          ctx.beginPath();
          ctx.moveTo(c0.sx, c0.sy); ctx.lineTo(c1.sx, c1.sy);
          ctx.lineTo(c2.sx, c2.sy); ctx.lineTo(c3.sx, c3.sy);
          ctx.closePath(); ctx.fill();

          // Block edge outlines
          ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 0.8;
          // Vertical edges
          for (const [bt, tp] of [[b0,c0],[b1,c1],[b2,c2],[b3,c3]] as const) {
            ctx.beginPath(); ctx.moveTo(bt.sx,bt.sy); ctx.lineTo(tp.sx,tp.sy); ctx.stroke();
          }

          // Emoji on top face center
          if (emoji) {
            const topCx = (c0.sx+c1.sx+c2.sx+c3.sx)/4;
            const topCy = (c0.sy+c1.sy+c2.sy+c3.sy)/4;
            const sz = Math.min(48, ctr.scale * 0.9);
            ctx.font = `${sz}px serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(emoji, topCx, topCy);
          }

          ctx.restore();
        }});
      }
    }

    // Worker bees
    for (const bee of this._bees) {
      const p = project(bee.wx, bee.wy, bee.wz);
      if (!p) continue;
      const sz = Math.min(42, p.scale * 0.75);
      const { sx, sy, cz } = p;
      sprites.push({ cz, draw: () => {
        ctx.font = `${sz}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(bee.pollen ? "🐝💛" : "🐝", sx, sy);
      }});
    }

    // Wasps
    for (const w of this._wasps) {
      const p = project(w.wx, w.wy, w.wz);
      if (!p) continue;
      const sz = Math.min(36, p.scale * 0.65);
      const { sx, sy, cz } = p;
      sprites.push({ cz, draw: () => {
        ctx.font = `${sz}px serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🦟", sx, sy);
      }});
    }

    // Sort back → front
    sprites.sort((a, b) => b.cz - a.cz);
    sprites.forEach(s => s.draw());

    // ── Crosshair ──
    ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W/2-9, horizonY); ctx.lineTo(W/2+9, horizonY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W/2, horizonY-9); ctx.lineTo(W/2, horizonY+9); ctx.stroke();

    // ── Bee wings (viewmodel) ──
    const wt = performance.now() * 0.015;
    const flap = Math.sin(wt) * 18 * (Math.PI/180);
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "rgba(210,235,255,1)";
    ctx.strokeStyle = "rgba(120,180,255,1)";
    ctx.lineWidth = 1.5;
    ctx.save(); ctx.translate(W*0.2, H*0.78); ctx.rotate(-Math.PI/5 + flap);
    ctx.beginPath(); ctx.ellipse(0,0, W*0.19, H*0.095, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(W*0.8, H*0.78); ctx.rotate(Math.PI/5 - flap);
    ctx.beginPath(); ctx.ellipse(0,0, W*0.19, H*0.095, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.globalAlpha = 1;

    // ── HUD ──
    this._drawHUD(W, H);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private _drawHUD(W: number, H: number): void {
    const ctx = this._ctx;

    // Top bar
    ctx.fillStyle = "rgba(0,0,0,0.68)"; ctx.fillRect(0,0,W,54);
    // Back button
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    ctx.beginPath(); ctx.roundRect(8,8,72,36,10); ctx.fill();
    ctx.font = "bold 13px Arial,sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.fillText("← Back", 16, 26);
    // Stats
    ctx.textAlign = "center"; ctx.font = "bold 14px Arial,sans-serif"; ctx.fillStyle = "#FFD700";
    ctx.fillText(`🍯 ${Math.floor(this._honey)}/${this._honeyMax}  |  ✨ Lv.${this._level}  |  🪙 ${this._g.state.coins}`, W/2, 20);
    // Hint
    ctx.font = "11px Arial,sans-serif"; ctx.fillStyle = "rgba(255,255,255,0.45)";
    if (!this._pointerLocked) {
      ctx.fillStyle = "rgba(255,220,60,0.95)";
      ctx.fillText("ESC pressed — press ESC again to resume mouse look", W/2, 40);
    } else if (this._pz < 1.6) {
      ctx.fillStyle = "rgba(140,255,80,0.85)";
      ctx.fillText("🌸 Fly low near flowers to pollinate!", W/2, 40);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.fillText("WASD = move  |  Mouse = look  |  ▲▼ = fly  |  ESC = release", W/2, 40);
    }
    // XP bar
    const xpN = Math.floor(50*Math.pow(this._level,1.5));
    const xpP = this._level>1 ? Math.floor(50*Math.pow(this._level-1,1.5)) : 0;
    const xpF = Math.max(0, Math.min(1, (this._xp-xpP)/(xpN-xpP||1)));
    ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0,54,W,5);
    ctx.fillStyle = "#44cc44";          ctx.fillRect(0,54,W*xpF,5);

    // Coming Soon badges (top corners)
    ctx.fillStyle = "rgba(40,40,40,0.8)";
    ctx.beginPath(); ctx.roundRect(8,62,80,22,6); ctx.fill();
    ctx.beginPath(); ctx.roundRect(W-88,62,80,22,6); ctx.fill();
    ctx.font = "bold 9px Arial,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("🚧 Coming Soon", 48, 73);
    ctx.fillText("🚧 Coming Soon", W-48, 73);

    // Hotbar (all Coming Soon)
    const SLOTS = 9;
    const slotSz = Math.min(50, Math.floor((W-16)/SLOTS));
    const barW   = SLOTS*slotSz + (SLOTS-1)*3 + 8;
    const barX   = Math.floor((W-barW)/2);
    const barY   = H - slotSz - 12;
    ctx.fillStyle   = "rgba(18,10,6,0.88)";
    ctx.strokeStyle = "rgba(130,90,50,0.65)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, slotSz+8, 6); ctx.fill();
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, slotSz+8, 6); ctx.stroke();
    for (let i=0;i<SLOTS;i++) {
      const sx = barX+4+i*(slotSz+3), sy = barY+4;
      ctx.fillStyle   = "rgba(35,35,35,0.8)";
      ctx.strokeStyle = "rgba(70,70,70,0.6)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(sx,sy,slotSz,slotSz,3); ctx.fill();
      ctx.beginPath(); ctx.roundRect(sx,sy,slotSz,slotSz,3); ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.font = `${Math.round(slotSz*0.38)}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillStyle="#fff"; ctx.fillText("🚧", sx+slotSz/2, sy+slotSz/2-4);
      ctx.font = `bold ${Math.round(slotSz*0.17)}px Arial,sans-serif`;
      ctx.fillText("Soon", sx+slotSz/2, sy+slotSz-8);
      ctx.globalAlpha = 1;
    }

    // Mini-map (small, positioned left of fly buttons)
    this._drawMiniMap(W, H);

    // Joystick visual
    if (this._joyActive) {
      const jLen = Math.sqrt(this._joyDX**2+this._joyDY**2);
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(this._joyStartX, this._joyStartY, 42, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.45;
      const kx = jLen > 42 ? this._joyStartX + this._joyDX/jLen*42 : this._joyStartX+this._joyDX;
      const ky = jLen > 42 ? this._joyStartY + this._joyDY/jLen*42 : this._joyStartY+this._joyDY;
      ctx.beginPath(); ctx.arc(kx, ky, 20, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Float texts
    ctx.font = "bold 15px Arial,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const ft of this._floats) {
      const a = Math.min(1, ft.life);
      ctx.globalAlpha = a;
      ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = "#FFD700"; ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;

    // Level-up flash
    if (this._levelUpFlash > 0) {
      ctx.globalAlpha = Math.min(1, this._levelUpFlash) * 0.55;
      ctx.fillStyle = "rgba(255,220,50,0.2)"; ctx.fillRect(0,0,W,H);
      ctx.globalAlpha = 1;
    }
  }

  private _drawMiniMap(W: number, _H: number): void {
    const ctx  = this._ctx;
    const mmSz = 72;
    const mmX  = W - mmSz - 60; // leave space for fly buttons on right
    const mmY  = 62;
    const tw   = mmSz / MAP_W, th = mmSz / MAP_H;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(mmX-2, mmY-2, mmSz+4, mmSz+4);

    for (let my=0;my<MAP_H;my++) for (let mx=0;mx<MAP_W;mx++) {
      const t = this._map[my][mx];
      switch(t) {
        case T_FLOWER: ctx.fillStyle="#FF90C0"; break;
        case T_BLOOM:  ctx.fillStyle="#FF3377"; break;
        case T_HIVE:   ctx.fillStyle="#d4a017"; break;
        case T_WASP_NEST: ctx.fillStyle="#555530"; break;
        default:       ctx.fillStyle="#2d6010"; break;
      }
      ctx.fillRect(mmX+mx*tw, mmY+my*th, tw+0.5, th+0.5);
    }

    // Player + direction
    const px = mmX + this._px * tw, py = mmY + this._py * th;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle="#fff"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+Math.cos(this._yaw)*7, py+Math.sin(this._yaw)*7); ctx.stroke();
  }

  // ── End ───────────────────────────────────────────────────────────────────

  private _end(): void {
    this._done = true;
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(fn => fn());
    this._g.inMiniGame = false;
    this._g.autoClickCallback = null;
    this._g.goArcade();
  }
}
