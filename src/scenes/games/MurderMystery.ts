// MurderMystery.ts — MM2-style 3D minigame (BabylonJS)
import { Engine }           from "@babylonjs/core/Engines/engine";
import { Scene }            from "@babylonjs/core/scene";
import { Vector3 }          from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 }   from "@babylonjs/core/Maths/math.color";
import { FreeCamera }       from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder }      from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh }             from "@babylonjs/core/Meshes/mesh";
import { TransformNode }    from "@babylonjs/core/Meshes/transformNode";
import { DynamicTexture }   from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { ShadowGenerator }  from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

type Role = "murderer" | "sheriff" | "innocent";

interface CharParts {
  root: TransformNode;
  torso: Mesh; head: Mesh;
  lArm: Mesh; rArm: Mesh;
  lLeg: Mesh; rLeg: Mesh;
  walkT: number;
}

interface MMEnt {
  parts: CharParts;
  px: number; py: number; pz: number;
  vx: number; vy: number; vz: number;
  onGround: boolean; alive: boolean;
  name: string; isPlayer: boolean;
  role: Role;
  yaw: number;
  botTimer: number;
  hasGun: boolean;
}

interface Surf {
  cx: number; cy: number; cz: number;
  hw: number; hh: number; hd: number;
}

const G        = -28;
const JUMP_SPD = 11;
const PLR_SPD  =  7;
const BOT_SPD  =  5;
const SKIN     = "#FFCC99";

const BOT_NAMES      = ["CoolDude99", "XxProGamerxX", "NoodleArms"];
const INNOCENT_COLS  = ["#22cc66", "#cc6622"];

export class MurderMystery {
  private _canvas!: HTMLCanvasElement;
  private _hud!: HTMLDivElement;
  private _engine!: Engine;
  private _scene!: Scene;
  private _cam!: FreeCamera;
  private _shadow!: ShadowGenerator;
  private _mats: Map<string, StandardMaterial> = new Map();

  private _ents: MMEnt[] = [];
  private _surfaces: Surf[] = [];
  private _onEnd: (won: boolean, msg: string) => void;

  private _phase: "countdown" | "playing" | "done" = "countdown";
  private _countdown = 5;
  private _timer = 120;
  private _hudTs = 0;

  // Camera orbit
  private _camYaw  = 0;
  private _camPitch = 0.35;
  private _camDist  = 13;
  private _rMouse   = false;
  private _lastMX   = 0;
  private _lastMY   = 0;

  // Touch joystick
  private _joyActive = false;
  private _joyOx = 0; _joyOy = 0; _joyDx = 0; _joyDy = 0;
  private _rTouchId: number | null = null;
  private _rTouchX = 0; _rTouchY = 0;

  private _keys    = new Set<string>();
  private _cleanup : (() => void)[] = [];
  private _lastTs  = 0;
  private _raf     = 0;
  private _disposed = false;

  // Weapon cooldowns
  private _knifeT = 0;
  private _gunT   = 0;

  // Dropped sheriff gun
  private _dropX: number | null = null;
  private _dropZ: number | null = null;
  private _dropMesh: Mesh | null = null;

  constructor(container: HTMLElement, onEnd: (won: boolean, msg: string) => void) {
    this._onEnd = onEnd;

    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;touch-action:none;outline:none;pointer-events:all;";
    this._canvas.setAttribute("tabindex", "0");
    container.appendChild(this._canvas);
    this._canvas.focus();

    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:11;";
    container.appendChild(this._hud);

    this._engine = new Engine(this._canvas, true, { antialias: true });
    this._scene  = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.45, 0.55, 0.75, 1); // Dark evening sky

    const amb = new HemisphericLight("amb", Vector3.Up(), this._scene);
    amb.intensity   = 0.45;
    amb.diffuse     = new Color3(0.9, 0.85, 1.0);
    amb.groundColor = new Color3(0.3, 0.3, 0.4);

    const sun = new DirectionalLight("sun", new Vector3(-0.5, -1, -0.4).normalize(), this._scene);
    sun.intensity = 0.9;
    sun.position  = new Vector3(20, 40, 20);

    this._shadow = new ShadowGenerator(512, sun);
    this._shadow.usePoissonSampling = true;

    this._cam = new FreeCamera("cam", Vector3.Zero(), this._scene);
    this._cam.minZ = 0.1;
    this._cam.fov  = 1.0;

    this._scene.fogMode    = Scene.FOGMODE_EXP2;
    this._scene.fogDensity = 0.012;
    this._scene.fogColor   = new Color3(0.55, 0.6, 0.8);

    this._buildMap();
    this._assignRoles();
    this._bindInput();

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Map ───────────────────────────────────────────────────────────────────

  private _buildMap(): void {
    // Baseplate — dark cobblestone
    const bp = MeshBuilder.CreateBox("bp", { width: 64, height: 0.4, depth: 64 }, this._scene);
    bp.position.set(0, -0.2, 0);
    bp.material = this._mat("#445544");
    bp.receiveShadows = true;
    this._surfaces.push({ cx: 0, cy: -0.2, cz: 0, hw: 32, hh: 0.2, hd: 32 });

    // Perimeter walls
    const pw: [number,number,number,number,number,number][] = [
      [0, 2, 30.5, 30, 2, 0.5], [0, 2, -30.5, 30, 2, 0.5],
      [30.5, 2, 0, 0.5, 2, 30], [-30.5, 2, 0, 0.5, 2, 30],
    ];
    for (const [cx, cy, cz, hw, hh, hd] of pw) {
      const m = MeshBuilder.CreateBox("pw", { width: hw*2, height: hh*2, depth: hd*2 }, this._scene);
      m.position.set(cx, cy, cz); m.material = this._mat("#667755");
      m.receiveShadows = true; this._shadow.addShadowCaster(m);
      this._surfaces.push({ cx, cy, cz, hw, hh, hd });
    }

    // Cover objects: [cx, cz, w, h, d, color]
    const covers: [number,number,number,number,number,string][] = [
      [-10, -10, 6,  2, 1.5, "#886644"],
      [ 10,  10, 6,  2, 1.5, "#886644"],
      [-10,  10, 1.5, 2, 6,  "#776655"],
      [ 10, -10, 1.5, 2, 6,  "#776655"],
      [  0,   0, 3,  2.5, 3, "#aaaaaa"],  // center box
      [-18,   0, 1.5, 2, 9, "#887755"],
      [ 18,   0, 1.5, 2, 9, "#887755"],
      [  0, -18, 9,  2, 1.5, "#665544"],
      [  0,  18, 9,  2, 1.5, "#665544"],
      [ -6,  -6, 2,  3, 2, "#aa8866"],
      [  6,   6, 2,  3, 2, "#aa8866"],
    ];
    for (let i = 0; i < covers.length; i++) {
      const [cx, cz, w, h, d, col] = covers[i];
      const m = MeshBuilder.CreateBox(`cv${i}`, { width: w, height: h, depth: d }, this._scene);
      m.position.set(cx, h / 2, cz); m.material = this._mat(col);
      m.receiveShadows = true; this._shadow.addShadowCaster(m);
      this._surfaces.push({ cx, cy: h / 2, cz, hw: w/2, hh: h/2, hd: d/2 });
    }

    // Decorative lamp posts
    for (const [lx, lz] of [[-15,-15],[15,-15],[-15,15],[15,15]] as [number,number][]) {
      const post = MeshBuilder.CreateCylinder(`lp${lx}`, { diameter: 0.3, height: 4, tessellation: 8 }, this._scene);
      post.position.set(lx, 2, lz); post.material = this._mat("#444444");
      const lamp = MeshBuilder.CreateSphere(`ll${lx}`, { diameter: 0.7, segments: 6 }, this._scene);
      lamp.position.set(lx, 4.3, lz);
      const lm = this._mat("#ffeeaa"); lm.emissiveColor = new Color3(0.8, 0.7, 0.2);
      lamp.material = lm;
    }
  }

  // ── Characters ────────────────────────────────────────────────────────────

  private _assignRoles(): void {
    // Shuffle roles: 1 murderer, 1 sheriff, 2 innocents
    const roles: Role[] = ["murderer", "sheriff", "innocent", "innocent"];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const spawns: [number,number,number][] = [[-8, 0.5, -8], [8, 0.5, -8], [-8, 0.5, 8], [8, 0.5, 8]];

    for (let i = 0; i < 4; i++) {
      const isPlayer = i === 0;
      const role = roles[i];
      const nameTag = isPlayer ? "You" : BOT_NAMES[i - 1];
      // All characters look the same (mystery!) — distinguished by HUD only
      const color = isPlayer
        ? "#4499ff"
        : INNOCENT_COLS[(i - 1) % INNOCENT_COLS.length] ?? "#4488cc";
      const [sx, sy, sz] = spawns[i];
      const ent: MMEnt = {
        parts: this._makeChar(color, nameTag, i),
        px: sx, py: sy, pz: sz,
        vx: 0, vy: 0, vz: 0,
        onGround: false, alive: true,
        name: nameTag, isPlayer,
        role, yaw: 0, botTimer: 1 + Math.random(),
        hasGun: role === "sheriff",
      };
      ent.parts.root.position.set(sx, sy, sz);
      this._ents.push(ent);
    }
  }

  private _makeChar(color: string, name: string, idx: number): CharParts {
    const s = this._scene;
    const root = new TransformNode(`root${idx}`, s);

    const torso = MeshBuilder.CreateBox(`torso${idx}`, { width: 1.2, height: 1.3, depth: 0.6 }, s);
    torso.material = this._mat(color); torso.parent = root; torso.position.set(0, 1.05, 0);

    const head = MeshBuilder.CreateBox(`head${idx}`, { width: 1.1, height: 1.1, depth: 1.0 }, s);
    head.material = this._mat(SKIN); head.parent = root; head.position.set(0, 2.2, 0);

    const face = MeshBuilder.CreatePlane(`face${idx}`, { width: 0.9, height: 0.9 }, s);
    face.parent = root; face.position.set(0, 2.2, 0.51);
    const fm = new StandardMaterial(`fm${idx}`, s);
    const ft = new DynamicTexture(`ft${idx}`, { width: 64, height: 64 }, s);
    const fc = ft.getContext();
    fc.fillStyle = "#FFCC99"; fc.fillRect(0, 0, 64, 64);
    fc.fillStyle = "#222"; fc.fillRect(10, 20, 10, 12); fc.fillRect(44, 20, 10, 12);
    fc.fillStyle = "#222"; fc.beginPath(); fc.arc(32, 46, 9, 0, Math.PI); fc.fill();
    ft.update();
    fm.diffuseTexture = ft; fm.specularColor = Color3.Black();
    fm.emissiveColor  = new Color3(0.6, 0.5, 0.4);
    fm.backFaceCulling = false; face.material = fm;

    const lArm = MeshBuilder.CreateBox(`la${idx}`, { width: 0.55, height: 1.2, depth: 0.55 }, s);
    lArm.material = this._mat(SKIN); lArm.parent = root; lArm.position.set(-0.9, 1.05, 0);

    const rArm = MeshBuilder.CreateBox(`ra${idx}`, { width: 0.55, height: 1.2, depth: 0.55 }, s);
    rArm.material = this._mat(SKIN); rArm.parent = root; rArm.position.set(0.9, 1.05, 0);

    const lLeg = MeshBuilder.CreateBox(`ll${idx}`, { width: 0.55, height: 1.1, depth: 0.55 }, s);
    lLeg.material = this._mat("#333355"); lLeg.parent = root; lLeg.position.set(-0.3, 0.35, 0);

    const rLeg = MeshBuilder.CreateBox(`rl${idx}`, { width: 0.55, height: 1.1, depth: 0.55 }, s);
    rLeg.material = this._mat("#333355"); rLeg.parent = root; rLeg.position.set(0.3, 0.35, 0);

    // Billboard name tag
    const tagP = MeshBuilder.CreatePlane(`tag${idx}`, { width: 3, height: 0.6 }, s);
    tagP.parent = root; tagP.position.set(0, 2.9, 0);
    tagP.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const tagM = new StandardMaterial(`tagm${idx}`, s);
    const tagT = new DynamicTexture(`tagtex${idx}`, { width: 256, height: 52 }, s);
    const tc = tagT.getContext() as unknown as CanvasRenderingContext2D;
    tc.fillStyle = "rgba(0,0,0,0.55)"; tc.roundRect(0, 0, 256, 52, 10); tc.fill();
    tc.fillStyle = "#fff"; tc.font = "bold 28px Arial";
    tc.textAlign = "center"; tc.textBaseline = "middle";
    tc.fillText(name, 128, 26); tagT.update();
    tagM.diffuseTexture = tagT; tagM.emissiveColor = Color3.White();
    tagM.backFaceCulling = false; tagM.specularColor = Color3.Black();
    tagP.material = tagM;

    [torso, head, lArm, rArm, lLeg, rLeg].forEach(m => {
      this._shadow.addShadowCaster(m); m.receiveShadows = true;
    });
    return { root, torso, head, lArm, rArm, lLeg, rLeg, walkT: 0 };
  }

  private _mat(hex: string): StandardMaterial {
    if (this._mats.has(hex)) return this._mats.get(hex)!;
    const m = new StandardMaterial(`m_${hex}`, this._scene);
    m.diffuseColor  = Color3.FromHexString(hex.length === 7 ? hex : "#aaaaaa");
    m.specularColor = Color3.Black();
    this._mats.set(hex, m);
    return m;
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private _bindInput(): void {
    const kd = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (e.code === "KeyF") this._tryKnife();
    };
    const ku = (e: KeyboardEvent) => this._keys.delete(e.code);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup",   ku);
    this._cleanup.push(() => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); });

    const md = (e: MouseEvent) => {
      if (e.button === 0) this._tryShoot();
      if (e.button === 2) { this._rMouse = true; this._lastMX = e.clientX; this._lastMY = e.clientY; }
    };
    const mu = (e: MouseEvent) => { if (e.button === 2) this._rMouse = false; };
    const mm = (e: MouseEvent) => {
      if (!this._rMouse) return;
      this._camYaw  += (e.clientX - this._lastMX) * 0.005;
      this._camPitch = Math.max(-0.1, Math.min(1.1, this._camPitch - (e.clientY - this._lastMY) * 0.004));
      this._lastMX = e.clientX; this._lastMY = e.clientY;
    };
    const cxp = (e: Event) => e.preventDefault();
    const wh  = (e: WheelEvent) => { this._camDist = Math.max(4, Math.min(22, this._camDist + e.deltaY * 0.01)); };
    this._canvas.addEventListener("mousedown", md);
    this._canvas.addEventListener("mouseup",   mu);
    this._canvas.addEventListener("mousemove", mm);
    this._canvas.addEventListener("contextmenu", cxp);
    this._canvas.addEventListener("wheel", wh, { passive: true });
    this._cleanup.push(() => {
      this._canvas.removeEventListener("mousedown", md);
      this._canvas.removeEventListener("mouseup",   mu);
      this._canvas.removeEventListener("mousemove", mm);
      this._canvas.removeEventListener("contextmenu", cxp);
      this._canvas.removeEventListener("wheel", wh);
    });

    const ts2 = (e: TouchEvent) => { e.preventDefault(); this._onTS(e); };
    const tm2 = (e: TouchEvent) => { e.preventDefault(); this._onTM(e); };
    const te2 = (e: TouchEvent) => { e.preventDefault(); this._onTE(e); };
    this._canvas.addEventListener("touchstart", ts2, { passive: false });
    this._canvas.addEventListener("touchmove",  tm2, { passive: false });
    this._canvas.addEventListener("touchend",   te2, { passive: false });
    this._cleanup.push(() => {
      this._canvas.removeEventListener("touchstart", ts2);
      this._canvas.removeEventListener("touchmove",  tm2);
      this._canvas.removeEventListener("touchend",   te2);
    });

    const onR = () => this._engine.resize();
    window.addEventListener("resize", onR);
    this._cleanup.push(() => window.removeEventListener("resize", onR));

    if (window.matchMedia("(pointer:coarse)").matches) {
      const jumpBtn = document.createElement("div");
      jumpBtn.textContent = "⬆";
      jumpBtn.style.cssText =
        "position:absolute;bottom:90px;right:30px;width:70px;height:70px;" +
        "border-radius:50%;background:rgba(100,180,255,0.25);border:2px solid rgba(100,180,255,0.5);" +
        "display:flex;align-items:center;justify-content:center;font-size:28px;" +
        "pointer-events:all;touch-action:none;user-select:none;z-index:20;";
      this._hud.appendChild(jumpBtn);
      jumpBtn.addEventListener("touchstart", e => { e.preventDefault(); this._keys.add("Space"); }, { passive: false });
      jumpBtn.addEventListener("touchend", () => this._keys.delete("Space"));

      const actBtn = document.createElement("div");
      actBtn.style.cssText =
        "position:absolute;bottom:90px;right:120px;width:70px;height:70px;" +
        "border-radius:50%;background:rgba(255,80,80,0.3);border:2px solid rgba(255,80,80,0.6);" +
        "display:flex;align-items:center;justify-content:center;font-size:28px;" +
        "pointer-events:all;touch-action:none;user-select:none;z-index:20;";
      actBtn.textContent = "⚔";
      this._hud.appendChild(actBtn);
      actBtn.addEventListener("touchstart", e => {
        e.preventDefault();
        this._tryKnife();
        this._tryShoot();
      }, { passive: false });

      this._cleanup.push(() => { jumpBtn.remove(); actBtn.remove(); });
    }
  }

  private _onTS(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX / window.innerWidth < 0.5) {
        this._joyActive = true; this._joyOx = t.clientX; this._joyOy = t.clientY;
        this._joyDx = 0; this._joyDy = 0;
      } else {
        this._rTouchId = t.identifier; this._rTouchX = t.clientX; this._rTouchY = t.clientY;
      }
    }
  }
  private _onTM(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this._rTouchId) {
        this._camYaw  += (t.clientX - this._rTouchX) * 0.009;
        this._camPitch = Math.max(-0.1, Math.min(1.1, this._camPitch - (t.clientY - this._rTouchY) * 0.007));
        this._rTouchX = t.clientX; this._rTouchY = t.clientY;
      } else if (this._joyActive) {
        const cap = 55;
        this._joyDx = Math.max(-1, Math.min(1, (t.clientX - this._joyOx) / cap));
        this._joyDy = Math.max(-1, Math.min(1, (t.clientY - this._joyOy) / cap));
      }
    }
  }
  private _onTE(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this._rTouchId) this._rTouchId = null;
      else { this._joyActive = false; this._joyDx = 0; this._joyDy = 0; }
    }
  }

  // ── Attacks ───────────────────────────────────────────────────────────────

  private _tryKnife(): void {
    if (this._phase !== "playing") return;
    const p = this._ents[0];
    if (!p?.alive || p.role !== "murderer" || this._knifeT > 0) return;
    this._knifeT = 0.8;
    for (let i = 1; i < this._ents.length; i++) {
      const e = this._ents[i];
      if (!e.alive) continue;
      if (Math.hypot(e.px - p.px, e.pz - p.pz) < 2.5) {
        this._killEnt(e);
        this._checkWin();
      }
    }
  }

  private _tryShoot(): void {
    if (this._phase !== "playing") return;
    const p = this._ents[0];
    if (!p?.alive || (!p.hasGun && p.role !== "sheriff") || this._gunT > 0) return;
    this._gunT = 1.2;
    const dirX = Math.sin(this._camYaw);
    const dirZ = Math.cos(this._camYaw);
    let best: MMEnt | null = null;
    let bestDot = 0.65;
    for (let i = 1; i < this._ents.length; i++) {
      const e = this._ents[i];
      if (!e.alive || e.role !== "murderer") continue;
      const dx = e.px - p.px, dz = e.pz - p.pz;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.1 || dist > 35) continue;
      const dot = (dx / dist) * dirX + (dz / dist) * dirZ;
      if (dot > bestDot) { bestDot = dot; best = e; }
    }
    if (best) { this._killEnt(best); this._checkWin(); }
  }

  private _killEnt(e: MMEnt): void {
    e.alive = false;
    e.parts.root.setEnabled(false);
    if ((e.role === "sheriff" || e.hasGun) && e.hasGun) {
      this._dropX = e.px; this._dropZ = e.pz;
      this._dropMesh = MeshBuilder.CreateBox("gun", { width: 0.4, height: 0.2, depth: 1.0 }, this._scene);
      this._dropMesh.position.set(e.px, 0.5, e.pz);
      this._dropMesh.material = this._mat("#222222");
      e.hasGun = false;
    }
  }

  private _checkWin(): void {
    if (this._phase !== "playing") return;
    const murderer    = this._ents.find(e => e.role === "murderer");
    const nonMurderer = this._ents.filter(e => e.role !== "murderer");
    if (!murderer?.alive) { this._endGame(this._ents[0].role !== "murderer"); return; }
    if (nonMurderer.every(e => !e.alive)) { this._endGame(this._ents[0].role === "murderer"); return; }
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  private _loop(ts: number): void {
    if (this._disposed) return;
    this._raf = requestAnimationFrame(t => this._loop(t));
    const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
    this._lastTs = ts;
    try { this._tick(dt); this._scene.render(); }
    catch (e) { console.error("MurderMystery error:", e); }
  }

  private _tick(dt: number): void {
    if (this._phase === "countdown") {
      this._countdown -= dt;
      if (this._countdown <= 0) this._phase = "playing";
      this._hudTs += dt; if (this._hudTs >= 0.2) { this._hudTs = 0; this._updateHUD(); }
      this._syncMeshes(dt);
      this._updateCamera();
      return;
    }
    if (this._phase === "done") { this._updateCamera(); return; }

    this._timer   -= dt;
    this._knifeT   = Math.max(0, this._knifeT - dt);
    this._gunT     = Math.max(0, this._gunT   - dt);

    this._updatePlayer(dt);
    for (let i = 1; i < this._ents.length; i++) this._updateBot(i, dt);

    // Dropped gun pickup by player
    if (this._dropX !== null) {
      const p = this._ents[0];
      if (p.alive && !p.hasGun && p.role === "innocent") {
        if (Math.hypot(p.px - this._dropX, p.pz - this._dropZ!) < 1.5) {
          p.hasGun = true;
          this._dropMesh?.dispose(); this._dropMesh = null;
          this._dropX = null; this._dropZ = null;
        }
      }
      if (this._dropMesh) this._dropMesh.rotation.y += dt * 2;
    }

    this._syncMeshes(dt);
    this._updateCamera();
    this._hudTs += dt; if (this._hudTs >= 0.2) { this._hudTs = 0; this._updateHUD(); }

    if (this._timer <= 0) {
      // Time runs out: murderer loses
      const p = this._ents[0];
      this._endGame(p.role !== "murderer" && p.alive);
      return;
    }
    if (this._keys.has("Escape")) this._endGame(false);
  }

  // ── Player update ─────────────────────────────────────────────────────────

  private _updatePlayer(dt: number): void {
    const p = this._ents[0];
    if (!p.alive) return;

    const fw = Math.sin(this._camYaw), fz = Math.cos(this._camYaw);
    const rx = Math.cos(this._camYaw), rz = -Math.sin(this._camYaw);
    let dx = 0, dz = 0;
    if (this._keys.has("KeyW") || this._keys.has("ArrowUp"))    { dx += fw; dz += fz; }
    if (this._keys.has("KeyS") || this._keys.has("ArrowDown"))  { dx -= fw; dz -= fz; }
    if (this._keys.has("KeyA") || this._keys.has("ArrowLeft"))  { dx -= rx; dz -= rz; }
    if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) { dx += rx; dz += rz; }
    if (this._joyActive) { dx += fw * (-this._joyDy) + rx * this._joyDx; dz += fz * (-this._joyDy) + rz * this._joyDx; }
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) { dx /= len; dz /= len; }
    p.vx = dx * PLR_SPD; p.vz = dz * PLR_SPD;
    if (len > 0) p.yaw = Math.atan2(dx, dz);
    if (this._keys.has("Space") && p.onGround) p.vy = JUMP_SPD;
    this._moveEnt(p, dt);
  }

  // ── Bot AI ────────────────────────────────────────────────────────────────

  private _updateBot(i: number, dt: number): void {
    const e = this._ents[i];
    if (!e.alive) return;
    e.botTimer -= dt;

    const murderer = this._ents.find(en => en.role === "murderer" && en.alive);

    if (e.role === "murderer") {
      // Chase nearest alive target
      let target: MMEnt | null = null;
      let bd = Infinity;
      for (const en of this._ents) {
        if (en === e || !en.alive || en.role === "murderer") continue;
        const d = Math.hypot(e.px - en.px, e.pz - en.pz);
        if (d < bd) { bd = d; target = en; }
      }
      if (target && bd > 0.5) {
        const dx2 = target.px - e.px, dz2 = target.pz - e.pz;
        const l = Math.hypot(dx2, dz2);
        e.vx = (dx2 / l) * BOT_SPD; e.vz = (dz2 / l) * BOT_SPD;
        e.yaw = Math.atan2(dx2, dz2);
        if (bd < 2.2 && e.botTimer <= 0) {
          e.botTimer = 1.0;
          this._killEnt(target);
          this._checkWin();
        }
      } else if (e.botTimer <= 0) {
        const a = Math.random() * Math.PI * 2;
        e.vx = Math.sin(a) * BOT_SPD * 0.5; e.vz = Math.cos(a) * BOT_SPD * 0.5;
        e.botTimer = 1.5;
      }
    } else if (e.role === "sheriff") {
      if (murderer) {
        const dx2 = murderer.px - e.px, dz2 = murderer.pz - e.pz;
        const dist = Math.hypot(dx2, dz2);
        if (dist > 8) {
          e.vx = (dx2 / dist) * BOT_SPD * 0.8;
          e.vz = (dz2 / dist) * BOT_SPD * 0.8;
          e.yaw = Math.atan2(dx2, dz2);
        } else {
          e.vx = 0; e.vz = 0;
        }
        if (dist < 18 && e.botTimer <= 0) {
          e.botTimer = 2.2;
          this._killEnt(murderer);
          this._checkWin();
        }
      }
    } else {
      // Innocent: flee from murderer
      if (murderer) {
        const dx2 = e.px - murderer.px, dz2 = e.pz - murderer.pz;
        const dist = Math.hypot(dx2, dz2);
        if (dist < 14) {
          e.vx = (dx2 / Math.max(dist, 0.1)) * BOT_SPD;
          e.vz = (dz2 / Math.max(dist, 0.1)) * BOT_SPD;
          e.yaw = Math.atan2(dx2, dz2);
        } else if (e.botTimer <= 0) {
          const a = Math.random() * Math.PI * 2;
          e.vx = Math.sin(a) * BOT_SPD * 0.3;
          e.vz = Math.cos(a) * BOT_SPD * 0.3;
          e.botTimer = 2.5;
        }
      }
      // Pick up and use dropped gun
      if (this._dropX !== null && !e.hasGun) {
        const dist = Math.hypot(e.px - this._dropX, e.pz - this._dropZ!);
        if (dist < 1.5) {
          e.hasGun = true;
          this._dropMesh?.dispose(); this._dropMesh = null;
          this._dropX = null; this._dropZ = null;
        }
      }
      if (e.hasGun && murderer && e.botTimer <= 0) {
        e.botTimer = 2.5;
        if (Math.hypot(e.px - murderer.px, e.pz - murderer.pz) < 18) {
          this._killEnt(murderer);
          this._checkWin();
        }
      }
    }

    this._moveEnt(e, dt);
  }

  // ── Physics ───────────────────────────────────────────────────────────────

  private _moveEnt(e: MMEnt, dt: number): void {
    if (!e.alive) return;
    e.vy += G * dt;
    e.px += e.vx * dt; e.pz += e.vz * dt; e.py += e.vy * dt;
    e.onGround = false;
    for (const s of this._surfaces) {
      if (e.px > s.cx - s.hw - 0.4 && e.px < s.cx + s.hw + 0.4 &&
          e.pz > s.cz - s.hd - 0.4 && e.pz < s.cz + s.hd + 0.4) {
        const top = s.cy + s.hh;
        if (e.py <= top + 0.15 && e.py >= top - 2.0 && e.vy <= 0) {
          e.py = top; e.vy = 0; e.onGround = true;
        }
      }
    }
    e.px = Math.max(-29, Math.min(29, e.px));
    e.pz = Math.max(-29, Math.min(29, e.pz));
    if (e.py < -20) { e.px = 0; e.py = 0.5; e.pz = 0; e.vy = 0; }
  }

  // ── Mesh sync ─────────────────────────────────────────────────────────────

  private _syncMeshes(dt: number): void {
    for (const e of this._ents) {
      if (!e.alive) continue;
      const p = e.parts;
      p.root.position.set(e.px, e.py, e.pz);
      p.root.rotation.y = e.yaw;
      const spd = Math.hypot(e.vx, e.vz);
      if (spd > 0.3 && e.onGround) {
        p.walkT += dt * spd * 0.9;
        const sw = Math.sin(p.walkT * Math.PI * 2) * 0.45;
        p.lLeg.rotation.x =  sw; p.rLeg.rotation.x = -sw;
        p.lArm.rotation.x = -sw * 0.5; p.rArm.rotation.x = sw * 0.5;
      } else {
        p.lLeg.rotation.x *= 0.75; p.rLeg.rotation.x *= 0.75;
        p.lArm.rotation.x *= 0.75; p.rArm.rotation.x *= 0.75;
      }
    }
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  private _updateCamera(): void {
    const p = this._ents[0]; if (!p) return;
    const tx = p.px, ty = p.py + 1.2, tz = p.pz;
    const hDist = Math.cos(this._camPitch) * this._camDist;
    const cx2 = tx - Math.sin(this._camYaw) * hDist;
    const cy2 = ty + Math.sin(this._camPitch) * this._camDist;
    const cz2 = tz - Math.cos(this._camYaw) * hDist;
    const fcy = Math.max(ty + 0.5, cy2);
    this._cam.position.set(cx2, fcy, cz2);
    const dx = tx - cx2, dy = ty - fcy, dz = tz - cz2;
    this._cam.rotation.y = Math.atan2(dx, dz);
    this._cam.rotation.x = -Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private _updateHUD(): void {
    const p = this._ents[0];
    const alive = this._ents.filter(e => e.alive).length;
    const murdAlive = this._ents.some(e => e.role === "murderer" && e.alive);
    const t = Math.max(0, Math.ceil(this._timer));

    const roleColor = p?.role === "murderer" ? "#ff4444" : p?.role === "sheriff" ? "#FFD700" : "#88ccff";
    const roleEmoji = p?.role === "murderer" ? "🔪" : p?.role === "sheriff" ? "🔫" : (p?.hasGun ? "🔫" : "😐");
    const roleLabel = p?.role === "murderer" ? "MURDERER"
      : p?.role === "sheriff" ? "SHERIFF"
      : (p?.hasGun ? "ARMED" : "INNOCENT");

    const cdKnife = this._knifeT > 0 ? ` (${this._knifeT.toFixed(1)}s)` : " — ready!";
    const cdGun   = this._gunT   > 0 ? ` (${this._gunT.toFixed(1)}s)`   : " — ready!";

    let controls = "";
    if (p?.role === "murderer")
      controls = `🔪 F or ⚔ to stab${cdKnife}`;
    else if (p?.role === "sheriff" || p?.hasGun)
      controls = `🔫 Left-click / ⚔ to shoot${cdGun}`;
    else if (this._dropX !== null)
      controls = "💡 Sheriff's gun is somewhere — find it!";
    else
      controls = "Stay hidden from the murderer!";

    const countdown = this._phase === "countdown"
      ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
           font-size:72px;font-weight:900;color:white;
           text-shadow:0 0 20px rgba(255,255,255,0.8);
           font-family:'Arial Black',Arial,sans-serif;">${Math.ceil(this._countdown)}</div>` : "";

    this._hud.innerHTML = `
      <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.75);border:2px solid ${roleColor};
        color:${roleColor};padding:8px 22px;border-radius:16px;
        font-size:16px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;
        white-space:nowrap;letter-spacing:1px;backdrop-filter:blur(4px);">
        ${roleEmoji} ${roleLabel}
      </div>
      <div style="position:absolute;top:14px;right:16px;background:rgba(0,0,0,0.7);
        border:1.5px solid rgba(255,255,255,0.2);color:#fff;padding:8px 14px;
        border-radius:12px;font-size:13px;font-family:'Arial Black',Arial,sans-serif;
        backdrop-filter:blur(4px);">
        ⏱ ${t}s &nbsp;|&nbsp; 👥 ${alive}${murdAlive ? " 🔪" : " ✅"}
      </div>
      <div style="position:absolute;bottom:40px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.6);color:rgba(255,255,255,0.8);
        padding:6px 18px;border-radius:20px;font-size:13px;font-family:Arial,sans-serif;
        white-space:nowrap;">
        ${controls} &nbsp;·&nbsp; WASD move &nbsp;·&nbsp; SPACE jump &nbsp;·&nbsp; right-drag rotate
      </div>
      ${countdown}`;
  }

  // ── End ───────────────────────────────────────────────────────────────────

  private _endGame(won: boolean): void {
    if (this._phase === "done") return;
    this._phase = "done";
    const p    = this._ents[0];
    const murd = this._ents.find(e => e.role === "murderer");
    let msg = "";
    if (p.role === "murderer") {
      msg = won
        ? "🔪 You eliminated everyone. MURDERER WINS!"
        : "😢 Time ran out — the innocents survived.";
    } else if (p.role === "sheriff") {
      msg = won
        ? "🔫 You took down the murderer! SHERIFF WINS!"
        : `😢 The murderer got you. ${murd?.name ?? "Murderer"} won.`;
    } else {
      msg = won
        ? `😮‍💨 The murderer was stopped! You survived!`
        : `😢 ${murd?.name ?? "Murderer"} eliminated everyone.`;
    }
    this._hud.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;">
        <div style="background:#1a1a2e;border:2px solid rgba(255,255,255,0.25);border-radius:20px;
          padding:32px 44px;text-align:center;color:#fff;max-width:440px;
          font-family:'Arial Black',Arial,sans-serif;">
          <div style="font-size:30px;font-weight:900;margin-bottom:14px;">
            ${won ? "🏆 Victory!" : "💀 Game Over"}
          </div>
          <div style="font-size:15px;color:rgba(255,255,255,0.75);line-height:1.6;">${msg}</div>
          <div style="margin-top:18px;color:rgba(255,255,255,0.35);font-size:13px;">Returning to lobby…</div>
        </div>
      </div>`;
    setTimeout(() => this._onEnd(won, msg), 3500);
  }

  // ── Dispose ───────────────────────────────────────────────────────────────

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(fn => fn());
    this._scene.dispose();
    this._engine.dispose();
    this._canvas.remove();
    this._hud.remove();
  }
}
