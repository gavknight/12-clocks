// PoppyPlaytime.ts — Find 5 batteries in the mansion (3D BabylonJS)
import { Engine }           from "@babylonjs/core/Engines/engine";
import { Scene }            from "@babylonjs/core/scene";
import { Vector3 }          from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 }   from "@babylonjs/core/Maths/math.color";
import { FreeCamera }       from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight }       from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder }      from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh }             from "@babylonjs/core/Meshes/mesh";

interface Surf { cx:number; cy:number; cz:number; hw:number; hh:number; hd:number; }
interface Battery { mesh: Mesh; light: PointLight; x:number; z:number; collected:boolean; }

const G        = -22;
const JUMP_SPD = 10;
const PLR_SPD  = 6;
const PLR_H    = 0.9;  // half height
const PLR_R    = 0.35; // radius

export class PoppyPlaytime {
  private _canvas!: HTMLCanvasElement;
  private _hud!: HTMLDivElement;
  private _engine!: Engine;
  private _scene!: Scene;
  private _cam!: FreeCamera;

  private _surfaces: Surf[] = [];
  private _batteries: Battery[] = [];
  private _collected = 0;

  // Player physics
  private _px = 0; private _py = 2; private _pz = 0;
  private _vx = 0; private _vy = 0; private _vz = 0;
  private _onGround = false;
  private _camYaw = 0;
  private _camPitch = 0;

  // Input
  private _keys = new Set<string>();
  private _rMouse = false;
  private _lastMX = 0; private _lastMY = 0;
  private _joyActive = false;
  private _joyOx = 0; _joyOy = 0; _joyDx = 0; _joyDy = 0;
  private _rTouchId: number | null = null;
  private _rTouchX = 0; _rTouchY = 0;

  private _cleanup: (()=>void)[] = [];
  private _lastTs = 0;
  private _raf = 0;
  private _disposed = false;
  private _phase: "playing"|"won"|"done" = "playing";

  private _onEnd: (won:boolean, msg:string)=>void;

  constructor(container: HTMLElement, onEnd: (won:boolean, msg:string)=>void) {
    this._onEnd = onEnd;

    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;touch-action:none;outline:none;pointer-events:all;";
    this._canvas.setAttribute("tabindex","0");
    container.appendChild(this._canvas);
    this._canvas.focus();

    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:11;font-family:Arial,sans-serif;";
    container.appendChild(this._hud);

    this._engine = new Engine(this._canvas, true, { antialias: true });
    this._scene  = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.04, 0.03, 0.06, 1); // near-black

    // Dim ambient — spooky but visible
    const amb = new HemisphericLight("amb", Vector3.Up(), this._scene);
    amb.intensity   = 0.35;
    amb.diffuse     = new Color3(0.5, 0.45, 0.7);
    amb.groundColor = new Color3(0.2, 0.2, 0.3);

    // Lantern above start
    const startLight = new PointLight("sl", new Vector3(0, 3, 0), this._scene);
    startLight.diffuse    = new Color3(1, 0.8, 0.4);
    startLight.intensity  = 1.2;
    startLight.range      = 18;

    this._scene.fogMode    = Scene.FOGMODE_EXP;
    this._scene.fogDensity = 0.022;
    this._scene.fogColor   = new Color3(0.04, 0.03, 0.06);

    this._cam = new FreeCamera("cam", new Vector3(0, PLR_H * 2, 0), this._scene);
    this._cam.minZ = 0.05;
    this._cam.fov  = 1.15;

    this._buildMansion();
    this._spawnBatteries();
    this._buildHUD();
    this._bindInput();

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Map ───────────────────────────────────────────────────────────────────

  private _mat(hex: string, emissive = "#000000"): StandardMaterial {
    const m = new StandardMaterial(hex, this._scene);
    m.diffuseColor  = Color3.FromHexString(hex);
    m.emissiveColor = Color3.FromHexString(emissive);
    m.specularColor = new Color3(0.1, 0.1, 0.1);
    return m;
  }

  private _box(cx:number,cy:number,cz:number, w:number,h:number,d:number, col:string, solid=true): Mesh {
    const m = MeshBuilder.CreateBox("b", { width:w, height:h, depth:d }, this._scene);
    m.position.set(cx, cy, cz);
    m.material = this._mat(col);
    m.receiveShadows = true;
    if (solid) this._surfaces.push({ cx, cy, cz, hw:w/2, hh:h/2, hd:d/2 });
    return m;
  }

  private _buildMansion(): void {
    // ── Floor ──
    this._box(0, 0, 0, 80, 0.4, 80, "#2a1f1a");

    // ── Ceiling ──
    this._box(0, 5, 0, 80, 0.4, 80, "#1a1410", false);

    // ── Outer walls ──
    this._wall(0,    2.5, -40,  80, 5, 1,  "#1e1410"); // N
    this._wall(0,    2.5,  40,  80, 5, 1,  "#1e1410"); // S
    this._wall(-40,  2.5,   0,  1,  5, 80, "#1e1410"); // W
    this._wall( 40,  2.5,   0,  1,  5, 80, "#1e1410"); // E

    // ── Room dividers — create a maze-like mansion ──
    // Hallway down center (N-S)
    this._wall(-10, 2.5,  5,   1, 5, 30, "#251810");
    this._wall( 10, 2.5,  5,   1, 5, 30, "#251810");
    this._wall(-10, 2.5, -15,  1, 5, 10, "#251810");
    this._wall( 10, 2.5, -15,  1, 5, 10, "#251810");

    // East wing divider
    this._wall(25, 2.5, 10,  1, 5, 20, "#251810");
    this._wall(25, 2.5,-20,  1, 5, 12, "#251810");

    // West wing divider
    this._wall(-25, 2.5,  10, 1, 5, 20, "#251810");
    this._wall(-25, 2.5, -20, 1, 5, 12, "#251810");

    // Cross hall
    this._wall(0, 2.5, 20, 20, 5, 1, "#251810");
    this._wall(0, 2.5, -20, 20, 5, 1, "#251810");

    // ── Furniture / props ──
    this._box(-5,  0.6,  10, 3,  1.2, 1.5, "#3a2010"); // table
    this._box( 5,  0.6,  10, 3,  1.2, 1.5, "#3a2010");
    this._box( 0,  0.6, -10, 4,  1.2, 2,   "#2a1a10"); // desk
    this._box(-20, 0.6, -30, 2,  1.5, 2,   "#3a2515"); // cabinet
    this._box( 20, 0.6, -30, 2,  1.5, 2,   "#3a2515");
    this._box(-30, 0.6,  30, 5,  1,   2,   "#1f1510"); // bench
    this._box( 30, 0.6,  30, 5,  1,   2,   "#1f1510");
    this._box( 0,  0.6,  35, 3,  2,   3,   "#2a1a0a"); // big crate
    this._box(-35, 0.6,   0, 2,  2,   5,   "#2a1a0a");
    this._box( 35, 0.6,   0, 2,  2,   5,   "#2a1a0a");

    // Dim wall lanterns (point lights)
    const lanternPos: [number,number,number][] = [
      [-9, 3.5, -5], [9, 3.5, -5], [0, 3.5, 28],
      [-30, 3.5, 15], [30, 3.5, 15], [0, 3.5, -35],
    ];
    lanternPos.forEach(([x,y,z]) => {
      const pl = new PointLight("pl", new Vector3(x,y,z), this._scene);
      pl.diffuse    = new Color3(1, 0.7, 0.3);
      pl.intensity  = 0.5;
      pl.range      = 12;
      // lantern box
      const lb = MeshBuilder.CreateBox("lb", { size: 0.3 }, this._scene);
      lb.position.set(x, y, z);
      lb.material = this._mat("#ffcc44","#ffaa00");
    });
  }

  private _wall(cx:number,cy:number,cz:number,w:number,h:number,d:number,col:string): void {
    this._box(cx, cy, cz, w, h, d, col, true);
  }

  // ── Batteries ─────────────────────────────────────────────────────────────

  private _spawnBatteries(): void {
    const spots: [number,number][] = [
      [-20, -30], [20, -30], [-30, 25], [30, 25],
    ];
    spots.forEach(([x,z],i) => {
      const mesh = MeshBuilder.CreateBox(`bat${i}`, { width:0.3, height:0.6, depth:0.2 }, this._scene);
      mesh.position.set(x, 0.9, z);
      const mat = this._mat("#88ddff", "#44aaff");
      mesh.material = mat;

      // Glow
      const light = new PointLight(`bl${i}`, new Vector3(x, 1.2, z), this._scene);
      light.diffuse   = new Color3(0.4, 0.8, 1);
      light.intensity = 0.8;
      light.range     = 5;

      // Battery stripes
      const stripe = MeshBuilder.CreateBox(`bs${i}`, { width:0.32, height:0.08, depth:0.22 }, this._scene);
      stripe.position.set(x, 1.05, z);
      stripe.material = this._mat("#000000");

      this._batteries.push({ mesh, light, x, z, collected:false });
    });
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    // Battery counter top-left
    const counter = document.createElement("div");
    counter.id = "pp-counter";
    counter.style.cssText =
      "position:absolute;top:16px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.7);border:2px solid #44aaff;border-radius:14px;" +
      "padding:8px 20px;color:white;font-size:16px;font-weight:bold;letter-spacing:1px;";
    counter.innerHTML = `🔋 0 / 4 Batteries`;
    this._hud.appendChild(counter);

    // Crosshair
    const ch = document.createElement("div");
    ch.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:12px;height:12px;";
    ch.innerHTML =
      `<div style="position:absolute;top:50%;left:0;right:0;height:2px;background:rgba(255,255,255,0.7);transform:translateY(-50%);"></div>` +
      `<div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.7);transform:translateX(-50%);"></div>`;
    this._hud.appendChild(ch);

    // Back button
    const back = document.createElement("button");
    back.textContent = "← Back";
    back.style.cssText =
      "position:absolute;top:16px;left:16px;background:rgba(0,0,0,0.6);" +
      "color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.2);" +
      "font-size:14px;padding:7px 14px;border-radius:10px;cursor:pointer;pointer-events:all;";
    back.onclick = () => this._finish(false, "");
    this._hud.appendChild(back);

    // Touch joystick container
    const joyZone = document.createElement("div");
    joyZone.id = "pp-joy";
    joyZone.style.cssText =
      "position:absolute;bottom:30px;left:30px;width:110px;height:110px;" +
      "border-radius:50%;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);" +
      "pointer-events:all;touch-action:none;";
    const joyKnob = document.createElement("div");
    joyKnob.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);";
    joyZone.appendChild(joyKnob);
    this._hud.appendChild(joyZone);

    // Touch look zone (right side)
    const lookZone = document.createElement("div");
    lookZone.id = "pp-look";
    lookZone.style.cssText =
      "position:absolute;bottom:0;right:0;width:55%;height:100%;pointer-events:all;touch-action:none;";
    this._hud.appendChild(lookZone);

    // Jump button
    const jumpBtn = document.createElement("button");
    jumpBtn.textContent = "↑";
    jumpBtn.style.cssText =
      "position:absolute;bottom:40px;right:30px;width:60px;height:60px;" +
      "border-radius:50%;background:rgba(68,170,255,0.3);border:2px solid #44aaff;" +
      "color:white;font-size:22px;cursor:pointer;pointer-events:all;touch-action:none;";
    jumpBtn.addEventListener("touchstart", e => { e.preventDefault(); if (this._onGround) this._vy = JUMP_SPD; });
    this._hud.appendChild(jumpBtn);

    // Joystick touch
    const onJoyStart = (ex:number, ey:number) => {
      this._joyActive = true;
      const r = joyZone.getBoundingClientRect();
      this._joyOx = r.left + r.width/2;
      this._joyOy = r.top  + r.height/2;
      this._joyDx = ex - this._joyOx;
      this._joyDy = ey - this._joyOy;
    };
    const onJoyMove = (ex:number, ey:number) => {
      if (!this._joyActive) return;
      this._joyDx = ex - this._joyOx;
      this._joyDy = ey - this._joyOy;
      const mag = Math.sqrt(this._joyDx**2 + this._joyDy**2);
      const maxR = 33;
      if (mag > maxR) { this._joyDx = this._joyDx/mag*maxR; this._joyDy = this._joyDy/mag*maxR; }
      joyKnob.style.transform = `translate(calc(-50% + ${this._joyDx}px), calc(-50% + ${this._joyDy}px))`;
    };
    const onJoyEnd = () => {
      this._joyActive = false; this._joyDx = 0; this._joyDy = 0;
      joyKnob.style.transform = "translate(-50%,-50%)";
    };
    joyZone.addEventListener("touchstart",  e => { e.preventDefault(); onJoyStart(e.touches[0].clientX, e.touches[0].clientY); });
    joyZone.addEventListener("touchmove",   e => { e.preventDefault(); onJoyMove(e.touches[0].clientX, e.touches[0].clientY); });
    joyZone.addEventListener("touchend",    e => { e.preventDefault(); onJoyEnd(); });

    // Look zone touch
    lookZone.addEventListener("touchstart", e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this._rTouchId = t.identifier; this._rTouchX = t.clientX; this._rTouchY = t.clientY;
    });
    lookZone.addEventListener("touchmove", e => {
      e.preventDefault();
      for (let i=0;i<e.changedTouches.length;i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this._rTouchId) {
          this._camYaw   += (t.clientX - this._rTouchX) * 0.005;
          this._camPitch += (t.clientY - this._rTouchY) * 0.005;
          this._camPitch  = Math.max(-1.2, Math.min(1.2, this._camPitch));
          this._rTouchX = t.clientX; this._rTouchY = t.clientY;
        }
      }
    });
    lookZone.addEventListener("touchend", e => {
      for (let i=0;i<e.changedTouches.length;i++) {
        if (e.changedTouches[i].identifier === this._rTouchId) this._rTouchId = null;
      }
    });
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private _bindInput(): void {
    const onKD = (e: KeyboardEvent) => { this._keys.add(e.code); if (e.code==="Space") e.preventDefault(); };
    const onKU = (e: KeyboardEvent) => { this._keys.delete(e.code); };
    const onMD = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 0) {
        this._rMouse = true; this._lastMX = e.clientX; this._lastMY = e.clientY;
        this._canvas.requestPointerLock?.();
      }
    };
    const onMU = () => { this._rMouse = true; }; // keep locked
    const onMM = (e: MouseEvent) => {
      if (!this._rMouse) return;
      const dx = e.movementX ?? (e.clientX - this._lastMX);
      const dy = e.movementY ?? (e.clientY - this._lastMY);
      this._camYaw   += dx * 0.003;
      this._camPitch += dy * 0.003;
      this._camPitch  = Math.max(-1.2, Math.min(1.2, this._camPitch));
      this._lastMX = e.clientX; this._lastMY = e.clientY;
    };
    const onJump = (e: KeyboardEvent) => {
      if (e.code === "Space" && this._onGround) this._vy = JUMP_SPD;
    };
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup",   onKU);
    window.addEventListener("keydown", onJump);
    this._canvas.addEventListener("mousedown", onMD);
    window.addEventListener("mouseup",   onMU);
    window.addEventListener("mousemove", onMM);
    this._cleanup.push(
      () => { window.removeEventListener("keydown", onKD); window.removeEventListener("keyup", onKU); },
      () => { window.removeEventListener("keydown", onJump); },
      () => { this._canvas.removeEventListener("mousedown", onMD); window.removeEventListener("mouseup", onMU); window.removeEventListener("mousemove", onMM); },
    );
  }

  // ── Loop ──────────────────────────────────────────────────────────────────

  private _loop(ts: number): void {
    if (this._disposed) return;
    const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
    this._lastTs = ts;

    if (this._phase === "playing") {
      this._updatePlayer(dt);
      this._checkBatteries();
      this._animateBatteries(ts);
    }

    // Position camera at player eye level
    this._cam.position.set(this._px, this._py + PLR_H * 2 * 0.85, this._pz);
    this._cam.rotation.set(this._camPitch, this._camYaw, 0);

    this._scene.render();
    this._raf = requestAnimationFrame(ts2 => this._loop(ts2));
  }

  private _updatePlayer(dt: number): void {
    // WASD movement relative to camera yaw
    const fwd  = this._keys.has("KeyW") || this._keys.has("ArrowUp");
    const back = this._keys.has("KeyS") || this._keys.has("ArrowDown");
    const left = this._keys.has("KeyA") || this._keys.has("ArrowLeft");
    const rght = this._keys.has("KeyD") || this._keys.has("ArrowRight");

    // Joystick
    const jFwd  = this._joyDy < -8;
    const jBack = this._joyDy >  8;
    const jLeft = this._joyDx < -8;
    const jRght = this._joyDx >  8;

    const sin = Math.sin(this._camYaw);
    const cos = Math.cos(this._camYaw);
    let mx = 0, mz = 0;
    if (fwd  || jFwd)  { mx += sin; mz += cos; }
    if (back || jBack) { mx -= sin; mz -= cos; }
    if (left || jLeft) { mx -= cos; mz += sin; }
    if (rght || jRght) { mx += cos; mz -= sin; }
    const mag = Math.sqrt(mx*mx + mz*mz);
    if (mag > 0.01) { mx /= mag; mz /= mag; }

    this._vx = mx * PLR_SPD;
    this._vz = mz * PLR_SPD;
    this._vy += G * dt;

    this._px += this._vx * dt;
    this._py += this._vy * dt;
    this._pz += this._vz * dt;

    // Collision
    this._onGround = false;
    for (const s of this._surfaces) {
      this._resolveCollision(s);
    }

    // Bounds
    this._px = Math.max(-39, Math.min(39, this._px));
    this._pz = Math.max(-39, Math.min(39, this._pz));
  }

  private _resolveCollision(s: Surf): void {
    const ox = this._px - s.cx;
    const oy = (this._py + PLR_H) - s.cy;
    const oz = this._pz - s.cz;
    const ex = s.hw + PLR_R; const ey = s.hh + PLR_H; const ez = s.hd + PLR_R;
    if (Math.abs(ox) >= ex || Math.abs(oy) >= ey || Math.abs(oz) >= ez) return;
    const dx = ex - Math.abs(ox); const dy = ey - Math.abs(oy); const dz = ez - Math.abs(oz);
    if (dy < dx && dy < dz) {
      if (oy > 0) { this._py = s.cy + s.hh - PLR_H; this._vy = 0; this._onGround = true; }
      else         { this._py = s.cy - s.hh - PLR_H; this._vy = 0; }
    } else if (dx < dz) {
      this._px += ox > 0 ? dx : -dx; this._vx = 0;
    } else {
      this._pz += oz > 0 ? dz : -dz; this._vz = 0;
    }
  }

  private _checkBatteries(): void {
    for (const b of this._batteries) {
      if (b.collected) continue;
      const dx = this._px - b.x;
      const dz = this._pz - b.z;
      if (Math.sqrt(dx*dx + dz*dz) < 1.5) {
        b.collected = true;
        b.mesh.isVisible = false;
        b.light.intensity = 0;
        this._collected++;
        this._updateHUD();
        this._showPickup();
        if (this._collected >= 4) {
          this._phase = "won";
          setTimeout(() => this._finish(true, "You found all 4 batteries! 🔋"), 1500);
        }
      }
    }
  }

  private _animateBatteries(ts: number): void {
    const t = ts / 1000;
    this._batteries.forEach((b, i) => {
      if (b.collected) return;
      b.mesh.position.y = 0.9 + Math.sin(t * 2 + i * 1.2) * 0.12;
      b.mesh.rotation.y = t * 1.5 + i;
    });
  }

  private _updateHUD(): void {
    const el = document.getElementById("pp-counter");
    if (el) el.innerHTML = `🔋 ${this._collected} / 4 Batteries`;
  }

  private _showPickup(): void {
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;top:40%;left:50%;transform:translateX(-50%) scale(0.7);" +
      "background:linear-gradient(135deg,#001a33,#003366);color:#44aaff;" +
      "border:2px solid #44aaff;border-radius:16px;padding:12px 28px;" +
      "font-size:18px;font-weight:bold;font-family:Arial,sans-serif;" +
      "box-shadow:0 0 30px rgba(68,170,255,0.6);z-index:9999;pointer-events:none;" +
      "transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1),opacity 0.2s;opacity:0;";
    el.textContent = `🔋 Battery collected! (${this._collected}/4)`;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = "translateX(-50%) scale(1)";
      el.style.opacity = "1";
    }));
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) scale(0.8)";
      setTimeout(() => el.remove(), 300);
    }, 1800);
  }

  private _finish(won: boolean, msg: string): void {
    if (this._disposed) return;
    this._disposed = true;
    this._phase = "done";
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(f => f());
    document.exitPointerLock?.();
    this._engine.dispose();
    this._onEnd(won, msg);
  }
}
