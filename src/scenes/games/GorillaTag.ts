import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";

// Stump: ~89 inches tall (2.26 m), 36 feet wide (radius 5.5 m)
const STUMP_H   = 2.26;
const STUMP_R   = 5.5;
const EYE_H     = 1.6;
const MAP_HALF  = 30;
const HALL_W    = 3.8;
const HALL_H    = 3.0;
const HALL_L    = 10;

const GORILLA_SPEED_INIT = 0.05;
const GORILLA_SPEED_MAX  = 0.11;
const GORILLA_CATCH_DIST = 1.5;

type Phase = "lobby" | "map";
type MapId = "forest" | "mountains" | "swamp" | "cave";

interface AIGorilla {
  mesh: Mesh;
  angle: number;
  orbitR: number;
  orbitSpeed: number;
  bobOffset: number;
}

const AI_DEFS = [
  { color: new Color3(0.20, 0.55, 1.00), name: "BlueBot"    },
  { color: new Color3(1.00, 0.82, 0.10), name: "YellowBot"  },
  { color: new Color3(0.20, 0.88, 0.30), name: "GreenBot"   },
  { color: new Color3(1.00, 0.50, 0.10), name: "OrangeBot"  },
];

const HALL_DEFS: { id: MapId; label: string; dx: number; dz: number; color: Color3 }[] = [
  { id: "forest",    label: "🌲 Forest",    dx:  0, dz:  1, color: new Color3(0.10, 0.75, 0.10) },
  { id: "mountains", label: "🏔 Mountains", dx:  0, dz: -1, color: new Color3(0.65, 0.65, 0.85) },
  { id: "swamp",     label: "🌿 Swamp",     dx:  1, dz:  0, color: new Color3(0.25, 0.62, 0.12) },
  { id: "cave",      label: "🕳 Cave",      dx: -1, dz:  0, color: new Color3(0.38, 0.22, 0.60) },
];

export class GorillaTag {
  private _g: Game;
  private _wrap: HTMLDivElement;
  private _scene!: Scene;
  private _camera!: FreeCamera;
  private _renderFn!: () => void;

  private _phase: Phase = "lobby";

  // Movement state
  private _keys: Record<string, boolean> = {};
  private _yaw   = 0;
  private _pitch = 0;
  private _pointerLocked = false;

  // Lobby
  private _aiGorillas: AIGorilla[] = [];
  private _lobbyTick = 0;
  private _leftHand!:  Mesh;
  private _rightHand!: Mesh;

  // ONE flag: did the player type daisy09 this lobby visit?
  private _daisyCodeEntered = false;

  // Map
  private _gorilla!:    Mesh;
  private _daisyMesh:   Mesh | null = null;
  private _gorillaSpeed = GORILLA_SPEED_INIT;
  private _gorillaTime  = 0;
  private _caught = false;
  private _currentMap: MapId = "forest";

  // UI
  private _hud!:          HTMLDivElement;
  private _vignette!:     HTMLDivElement;
  private _computerUI!:   HTMLDivElement;
  private _interactHint!: HTMLDivElement;
  private _lobbyListEl!:  HTMLDivElement;
  private _computerOpen = false;
  private _computerPos  = new Vector3(3.5, STUMP_H + 0.63, 0);

  // Event refs
  private _onKey!:        (e: KeyboardEvent) => void;
  private _onKeyUp!:      (e: KeyboardEvent) => void;
  private _onMouseMove!:  (e: MouseEvent) => void;
  private _onLockChange!: () => void;
  private _onClick!:      () => void;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;pointer-events:all;overflow:hidden;cursor:crosshair;";
    g.ui.appendChild(this._wrap);
    this._setupInput();
    this._startLobby();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ══════════════════════════════════════════════════════════════════════════════

  private _startLobby(): void {
    this._phase            = "lobby";
    this._caught           = false;
    this._daisyCodeEntered = false;   // reset every lobby visit
    this._daisyMesh        = null;
    this._aiGorillas       = [];

    this._scene = new Scene(this._g.engine);
    this._scene.clearColor = new Color4(0.44, 0.66, 0.30, 1);
    this._scene.fogMode  = 3;
    this._scene.fogColor = new Color3(0.50, 0.68, 0.38);
    this._scene.fogStart = 32;
    this._scene.fogEnd   = 58;

    // Camera spawns on top of the stump
    this._camera = new FreeCamera("cam", new Vector3(0, STUMP_H + EYE_H, 0), this._scene);
    this._camera.minZ  = 0.1;
    this._camera.speed = 0;
    this._yaw   = 0;
    this._pitch = 0;

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this._scene);
    hemi.intensity   = 0.85;
    hemi.diffuse     = new Color3(1, 0.97, 0.88);
    hemi.groundColor = new Color3(0.18, 0.32, 0.08);

    const sun = new DirectionalLight("sun", new Vector3(-0.6, -1, -0.4), this._scene);
    sun.intensity = 0.45;
    sun.diffuse   = new Color3(1, 0.92, 0.72);

    this._buildGround();
    this._buildStump();
    this._buildHallways();
    this._buildForestSurroundings();
    this._buildHands();
    this._buildLobbyHUD();

    this._renderFn = () => {
      this._tickLobby();
      this._scene.render();
    };
    this._g.engine.runRenderLoop(this._renderFn);
  }

  private _buildGround(): void {
    const s = this._scene;
    const gMat = new StandardMaterial("gnd", s);
    gMat.diffuseColor = new Color3(0.22, 0.52, 0.12);
    const g = MeshBuilder.CreateGround("gnd", { width: 70, height: 70, subdivisions: 1 }, s);
    g.material = gMat;
  }

  private _buildStump(): void {
    const s = this._scene;

    const stMat = new StandardMaterial("stump", s);
    stMat.diffuseColor = new Color3(0.44, 0.26, 0.10);
    const stump = MeshBuilder.CreateCylinder("stump",
      { diameter: STUMP_R * 2, height: STUMP_H, tessellation: 16 }, s);
    stump.position.set(0, STUMP_H / 2, 0);
    stump.material = stMat;

    const topMat = new StandardMaterial("stTop", s);
    topMat.diffuseColor = new Color3(0.52, 0.32, 0.15);
    const top = MeshBuilder.CreateCylinder("stTop",
      { diameter: STUMP_R * 2 - 0.1, height: 0.07, tessellation: 16 }, s);
    top.position.set(0, STUMP_H + 0.02, 0);
    top.material = topMat;

    // Growth rings on top
    const ringMat = new StandardMaterial("ring", s);
    ringMat.diffuseColor = new Color3(0.38, 0.22, 0.08);
    for (let r = 1; r <= 4; r++) {
      const ring = MeshBuilder.CreateCylinder(`ring${r}`,
        { diameter: (STUMP_R * 2 - 0.2) * (r / 5), height: 0.08, tessellation: 14 }, s);
      ring.position.set(0, STUMP_H + 0.03, 0);
      ring.material = ringMat;
    }

    // Computer terminal
    const cMat = new StandardMaterial("cmpB", s);
    cMat.diffuseColor = new Color3(0.22, 0.22, 0.26);
    const comp = MeshBuilder.CreateBox("comp",
      { width: 0.85, height: 1.2, depth: 0.4 }, s);
    comp.position.set(3.5, STUMP_H + 0.6, 0);
    comp.material = cMat;

    const sMat = new StandardMaterial("scr", s);
    sMat.diffuseColor  = new Color3(0.05, 0.70, 0.35);
    sMat.emissiveColor = new Color3(0.02, 0.35, 0.18);
    const scr = MeshBuilder.CreatePlane("scr", { width: 0.65, height: 0.50 }, s);
    scr.position.set(3.5, STUMP_H + 0.82, -0.21);
    scr.material = sMat;
  }

  private _buildHallways(): void {
    const s = this._scene;

    for (const def of HALL_DEFS) {
      const { dx, dz, color } = def;
      const ex = dx * STUMP_R;
      const ez = dz * STUMP_R;

      // Colored arch posts
      const archMat = new StandardMaterial(`arch_${def.id}`, s);
      archMat.diffuseColor  = color;
      archMat.emissiveColor = color.scale(0.3);

      // Left & right post positions (perpendicular to hallway direction)
      const lx = ex + dz * (HALL_W / 2);
      const lz = ez + dx * (HALL_W / 2);
      const rx = ex - dz * (HALL_W / 2);
      const rz = ez - dx * (HALL_W / 2);

      const lp = MeshBuilder.CreateBox(`lp_${def.id}`,
        { width: 0.4, height: HALL_H, depth: 0.4 }, s);
      lp.position.set(lx, HALL_H / 2, lz);
      lp.material = archMat;

      const rp = MeshBuilder.CreateBox(`rp_${def.id}`,
        { width: 0.4, height: HALL_H, depth: 0.4 }, s);
      rp.position.set(rx, HALL_H / 2, rz);
      rp.material = archMat;

      const topBar = MeshBuilder.CreateBox(`tb_${def.id}`,
        { width: dz !== 0 ? HALL_W + 0.4 : 0.4, height: 0.4,
          depth: dx !== 0 ? HALL_W + 0.4 : 0.4 }, s);
      topBar.position.set(ex, HALL_H, ez);
      topBar.material = archMat;

      // Hallway floor panel
      const flMat = new StandardMaterial(`hfl_${def.id}`, s);
      flMat.diffuseColor = new Color3(0.34, 0.20, 0.08);
      const floor = MeshBuilder.CreateBox(`hfloor_${def.id}`, {
        width: dx !== 0 ? HALL_L : HALL_W,
        height: 0.2,
        depth: dz !== 0 ? HALL_L : HALL_W,
      }, s);
      floor.position.set(ex + dx * HALL_L / 2, 0.1, ez + dz * HALL_L / 2);
      floor.material = flMat;

      // Hallway walls
      const wallMat = new StandardMaterial(`hwl_${def.id}`, s);
      wallMat.diffuseColor = new Color3(0.30, 0.18, 0.07);
      const wallThick = 0.3;

      for (const side of [-1, 1]) {
        const wx = ex + dx * HALL_L / 2 + dz * side * (HALL_W / 2 + wallThick / 2);
        const wz = ez + dz * HALL_L / 2 + dx * side * (HALL_W / 2 + wallThick / 2);
        const wall = MeshBuilder.CreateBox(`hwll_${def.id}_${side}`, {
          width:  dx !== 0 ? HALL_L : wallThick,
          height: HALL_H,
          depth:  dz !== 0 ? HALL_L : wallThick,
        }, s);
        wall.position.set(wx, HALL_H / 2, wz);
        wall.material = wallMat;
      }

      // Ceiling
      const ceil = MeshBuilder.CreateBox(`hcl_${def.id}`, {
        width:  dx !== 0 ? HALL_L : HALL_W + wallThick * 2,
        height: wallThick,
        depth:  dz !== 0 ? HALL_L : HALL_W + wallThick * 2,
      }, s);
      ceil.position.set(ex + dx * HALL_L / 2, HALL_H + wallThick / 2, ez + dz * HALL_L / 2);
      ceil.material = wallMat;

      // Label sign
      const signMat = new StandardMaterial(`sign_${def.id}`, s);
      signMat.diffuseColor  = color;
      signMat.emissiveColor = color.scale(0.5);
      const sign = MeshBuilder.CreatePlane(`sign_${def.id}`,
        { width: HALL_W * 0.55, height: 0.5 }, s);
      sign.position.set(ex, HALL_H + 0.7, ez);
      if (dx !== 0) sign.rotation.y = Math.PI / 2;
      sign.material = signMat;
    }
  }

  private _buildForestSurroundings(): void {
    const s = this._scene;
    const trkMat = new StandardMaterial("trk", s);
    trkMat.diffuseColor = new Color3(0.36, 0.20, 0.07);
    const lvMat = new StandardMaterial("lv", s);
    lvMat.diffuseColor = new Color3(0.10, 0.48, 0.08);

    const trees: [number, number][] = [
      [10,10],[-10,10],[10,-10],[-10,-10],
      [18,3],[-18,5],[14,-14],[-14,14],
      [3,20],[-5,-20],[22,-8],[-22,8],
    ];

    for (const [x, z] of trees) {
      const h = 3.5 + Math.random() * 2;
      const t = MeshBuilder.CreateCylinder(`t${x}${z}`,
        { diameter: 0.4 + Math.random() * 0.2, height: h, tessellation: 7 }, s);
      t.position.set(x, h / 2, z);
      t.material = trkMat;
      const l = MeshBuilder.CreateSphere(`l${x}${z}`,
        { diameter: 2.5 + Math.random() * 0.8, segments: 5 }, s);
      l.position.set(x, h + 0.8, z);
      l.material = lvMat;
    }
  }

  // ── AI gorillas ─────────────────────────────────────────────────────────────

  private _buildAIGorillas(): void {
    for (let i = 0; i < AI_DEFS.length; i++) {
      const def = AI_DEFS[i];
      const mesh = this._makeGorillaBody(def.color, `ai_${i}`, this._scene);
      const startAngle = (i / AI_DEFS.length) * Math.PI * 2;
      const orbitR = 2.5 + i * 0.6;
      mesh.position.set(
        Math.cos(startAngle) * orbitR,
        STUMP_H + 0.58,
        Math.sin(startAngle) * orbitR,
      );
      this._aiGorillas.push({
        mesh,
        angle: startAngle,
        orbitR,
        orbitSpeed: 0.008 + i * 0.003,
        bobOffset: i * 0.8,
      });
    }
  }

  private _tickAIGorillas(): void {
    this._lobbyTick++;
    for (const ai of this._aiGorillas) {
      ai.angle += ai.orbitSpeed;
      const nx = Math.cos(ai.angle) * ai.orbitR;
      const nz = Math.sin(ai.angle) * ai.orbitR;
      // Keep away from computer (pos ~3.5, 0)
      const dComp = Math.sqrt((nx - 3.5) ** 2 + nz ** 2);
      if (dComp < 1.8) {
        ai.angle += 0.04; // nudge past it
      }
      ai.mesh.position.x = nx;
      ai.mesh.position.z = nz;
      ai.mesh.position.y = STUMP_H + 0.58 +
        Math.abs(Math.sin(this._lobbyTick * 0.12 + ai.bobOffset)) * 0.08;
      ai.mesh.rotation.y = ai.angle + Math.PI / 2;
    }

  }

  // ── First-person hands ───────────────────────────────────────────────────────

  private _buildHands(): void {
    const s = this._scene;
    const hMat = new StandardMaterial("hand", s);
    hMat.diffuseColor = new Color3(0.85, 0.65, 0.55);

    this._leftHand = MeshBuilder.CreateBox("lHand",
      { width: 0.18, height: 0.18, depth: 0.28 }, s);
    this._leftHand.material = hMat;

    this._rightHand = MeshBuilder.CreateBox("rHand",
      { width: 0.18, height: 0.18, depth: 0.28 }, s);
    this._rightHand.material = hMat;
  }

  private _tickHands(): void {
    const cam = this._camera;
    const cosY = Math.cos(this._yaw);
    const sinY = Math.sin(this._yaw);

    // Forward and right vectors
    const fwd   = new Vector3(sinY, 0, cosY);
    const right  = new Vector3(cosY, 0, -sinY);

    // Swing offsets from mouse
    const moving = this._keys["w"] || this._keys["s"] || this._keys["a"] || this._keys["d"];
    const bob    = moving ? 0.12 : 0.04;
    const swL = Math.sin(this._lobbyTick * 0.14) * bob;
    const swR = Math.sin(this._lobbyTick * 0.14 + Math.PI) * bob;

    const base = cam.position.clone()
      .add(fwd.scale(0.45))
      .add(new Vector3(0, -0.38, 0));

    this._leftHand.position = base
      .clone()
      .add(right.scale(-0.28))
      .add(new Vector3(0, swL, 0));
    this._rightHand.position = base
      .clone()
      .add(right.scale(0.28))
      .add(new Vector3(0, swR, 0));

    this._leftHand.rotation.y  = this._yaw;
    this._rightHand.rotation.y = this._yaw;
  }

  // ── Lobby HUD ────────────────────────────────────────────────────────────────

  private _buildLobbyHUD(): void {
    // Vignette
    this._vignette = document.createElement("div");
    this._vignette.style.cssText =
      "position:absolute;inset:0;pointer-events:none;" +
      "background:radial-gradient(ellipse at center,transparent 40%,rgba(255,0,0,0) 100%);";
    this._wrap.appendChild(this._vignette);

    // HUD text
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:18px;left:50%;transform:translateX(-50%);" +
      "color:white;font-family:'Arial Black',Arial,sans-serif;font-size:18px;font-weight:900;" +
      "text-shadow:0 2px 10px rgba(0,0,0,0.85);pointer-events:none;text-align:center;white-space:nowrap;";
    this._hud.textContent = "🦍 GORILLA TAG — Walk into a hallway to play!";
    this._wrap.appendChild(this._hud);

    // Bottom tip
    const tip = document.createElement("div");
    tip.style.cssText =
      "position:absolute;bottom:18px;left:50%;transform:translateX(-50%);" +
      "color:rgba(255,255,255,0.55);font-family:Arial,sans-serif;font-size:12px;" +
      "pointer-events:none;text-align:center;";
    tip.innerHTML =
      "WASD to move &nbsp;·&nbsp; Mouse to look &nbsp;·&nbsp; E near computer to use it";
    this._wrap.appendChild(tip);

    // Crosshair
    const cx = document.createElement("div");
    cx.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:18px;height:18px;pointer-events:none;";
    cx.innerHTML =
      `<div style="position:absolute;top:50%;left:0;right:0;height:2px;` +
      `background:rgba(255,255,255,0.8);transform:translateY(-50%)"></div>` +
      `<div style="position:absolute;left:50%;top:0;bottom:0;width:2px;` +
      `background:rgba(255,255,255,0.8);transform:translateX(-50%)"></div>`;
    this._wrap.appendChild(cx);

    // E-hint
    this._interactHint = document.createElement("div");
    this._interactHint.style.cssText =
      "display:none;position:absolute;top:58%;left:50%;transform:translateX(-50%);" +
      "color:#00ff88;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;" +
      "background:rgba(0,0,0,0.55);border:1px solid rgba(0,255,100,0.4);" +
      "border-radius:20px;padding:5px 16px;pointer-events:none;";
    this._interactHint.textContent = "[ E ] Use Computer";
    this._wrap.appendChild(this._interactHint);

    // Lobby member list (top-right)
    this._lobbyListEl = document.createElement("div");
    this._lobbyListEl.style.cssText =
      "position:absolute;top:14px;right:14px;" +
      "background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.15);" +
      "border-radius:12px;padding:10px 13px;min-width:140px;pointer-events:none;";
    this._updateLobbyList();
    this._wrap.appendChild(this._lobbyListEl);

    // Computer UI overlay
    this._computerUI = document.createElement("div");
    this._computerUI.style.cssText =
      "display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "background:rgba(8,18,12,0.97);border:2px solid rgba(0,255,120,0.45);" +
      "border-radius:18px;padding:24px 26px;min-width:300px;" +
      "font-family:Arial,sans-serif;pointer-events:all;z-index:20;" +
      "box-shadow:0 0 50px rgba(0,255,100,0.15);";
    this._computerUI.innerHTML = `
      <div style="color:#00ff88;font-size:20px;font-weight:bold;margin-bottom:4px;">🦍 GORILLA TAG</div>
      <div style="color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:2px;margin-bottom:20px;">LOBBY COMPUTER</div>

      <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:1.5px;margin-bottom:8px;">
        🔑 ENTER PIN CODE
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;">
        <input id="gtPinInput" placeholder="type code…" autocomplete="off" style="
          flex:1;background:rgba(0,0,0,0.55);border:1.5px solid rgba(0,255,100,0.3);
          border-radius:9px;padding:9px 12px;color:#00ff88;font-size:17px;
          font-family:monospace;font-weight:bold;letter-spacing:2px;
          text-transform:lowercase;outline:none;" />
        <button id="gtPinSubmit" style="
          background:rgba(0,220,90,0.18);border:1.5px solid rgba(0,220,90,0.5);
          color:#00ff88;border-radius:9px;padding:9px 14px;cursor:pointer;
          font-size:13px;font-weight:bold;font-family:Arial,sans-serif;">ENTER</button>
      </div>
      <div id="gtPinMsg" style="min-height:20px;font-size:13px;margin-bottom:18px;color:#00ff88;"></div>

      <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:1.5px;margin-bottom:8px;">
        🌐 IN THIS LOBBY
      </div>
      <div id="gtLobbyList" style="
        background:rgba(0,0,0,0.4);border-radius:10px;padding:10px 12px;margin-bottom:18px;
        min-height:40px;"></div>

      <button id="gtCloseComp" style="
        width:100%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);
        color:rgba(255,255,255,0.55);border-radius:10px;padding:9px;cursor:pointer;
        font-size:13px;font-family:Arial,sans-serif;">✕ Close</button>
    `;
    this._wrap.appendChild(this._computerUI);

    this._computerUI.querySelector("#gtCloseComp")!.addEventListener("click",
      () => this._closeComputer());

    const submitCode = () => {
      const inp = this._computerUI.querySelector("#gtPinInput") as HTMLInputElement;
      const msg = this._computerUI.querySelector("#gtPinMsg") as HTMLDivElement;
      const code = inp.value.trim().toLowerCase();
      if (code === "daisy09" && !this._daisyCodeEntered) {
        this._daisyCodeEntered = true;
        msg.style.color = "#ff69b4";
        msg.textContent = "💗 daisy09 will join your next game!";
        this._updateLobbyList();
        this._updateComputerLobbyList();
      } else if (code === "daisy09" && this._daisyCodeEntered) {
        msg.style.color = "#ffaa44";
        msg.textContent = "💗 daisy09 is already set to join!";
      } else if (code.length > 0) {
        msg.style.color = "#ff4444";
        msg.textContent = "❌ Unknown code.";
      }
      inp.value = "";
    };

    this._computerUI.querySelector("#gtPinSubmit")!.addEventListener("click", submitCode);
    this._computerUI.querySelector("#gtPinInput")!.addEventListener("keydown", (e: Event) => {
      if ((e as KeyboardEvent).key === "Enter") submitCode();
    });
  }

  private _updateLobbyList(): void {
    const players = [...AI_DEFS.map(d => d.name)];
    if (this._daisyCodeEntered) players.unshift("daisy09");
    const colors: Record<string, string> = { "daisy09": "#ff69b4" };

    this._lobbyListEl.innerHTML =
      `<div style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:1.5px;` +
      `font-family:Arial,sans-serif;margin-bottom:6px;">LOBBY (${players.length + 1})</div>` +
      `<div style="color:#ffffff;font-size:12px;font-family:Arial,sans-serif;padding:2px 0;` +
      `display:flex;align-items:center;gap:5px;">` +
      `<span style="width:6px;height:6px;border-radius:50%;background:#44ff88;display:inline-block;"></span>` +
      `You</div>` +
      players.map(p => `
        <div style="color:${colors[p] ?? "#88ffcc"};font-size:12px;font-family:Arial,sans-serif;
             padding:2px 0;display:flex;align-items:center;gap:5px;">
          <span style="width:6px;height:6px;border-radius:50%;
            background:${colors[p] ?? "#44ff88"};display:inline-block;"></span>
          ${p}${p==="daisy09"?" 💗":""}
        </div>`).join("");
  }

  private _updateComputerLobbyList(): void {
    const el = this._computerUI.querySelector("#gtLobbyList") as HTMLDivElement;
    if (!el) return;
    const players = [...AI_DEFS.map(d => d.name)];
    if (this._daisyCodeEntered) players.unshift("daisy09");
    el.innerHTML = ["You (host)", ...players].map((p, i) => `
      <div style="color:${p==="daisy09"?"#ff69b4":i===0?"#44ff88":"#88ffcc"};
           font-size:13px;padding:3px 0;display:flex;align-items:center;gap:7px;">
        <span style="width:7px;height:7px;border-radius:50%;flex-shrink:0;
          background:${p==="daisy09"?"#ff69b4":i===0?"#44ff88":"#44ff88"};display:inline-block;"></span>
        ${p}${p==="daisy09"?" 💗 <small style='opacity:.6'>(in world)</small>":""}
      </div>`).join("");
  }

  private _openComputer(): void {
    this._computerOpen = true;
    this._computerUI.style.display = "block";
    this._wrap.style.cursor = "default";
    this._updateComputerLobbyList();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private _closeComputer(): void {
    this._computerOpen = false;
    this._computerUI.style.display = "none";
    this._wrap.style.cursor = "crosshair";
  }


  // ── Lobby tick ───────────────────────────────────────────────────────────────

  private _tickLobby(): void {
    this._tickMovement();
    this._lobbyTick++;
    this._tickHands();

    const cam = this._camera;
    const cp  = cam.position;

    // Interact hint
    const toComp = Math.sqrt((cp.x - 3.5) ** 2 + cp.z ** 2);
    this._interactHint.style.display =
      (toComp < 3.5 && !this._computerOpen) ? "block" : "none";

    // Check hallway triggers (player walked to end of a hallway)
    for (const def of HALL_DEFS) {
      const trigX = def.dx * (STUMP_R + HALL_L - 1);
      const trigZ = def.dz * (STUMP_R + HALL_L - 1);
      const dist  = Math.sqrt((cp.x - trigX) ** 2 + (cp.z - trigZ) ** 2);
      if (dist < 2.5) {
        this._enterMap(def.id);
        return;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MAP (gorilla chase)
  // ══════════════════════════════════════════════════════════════════════════════

  private _enterMap(mapId: MapId): void {
    this._currentMap  = mapId;
    this._gorillaTime  = 0;
    this._gorillaSpeed = GORILLA_SPEED_INIT;
    this._caught       = false;

    // Fade out
    const fade = document.createElement("div");
    fade.style.cssText =
      "position:absolute;inset:0;background:black;opacity:0;pointer-events:none;z-index:50;" +
      "transition:opacity 0.4s;";
    this._wrap.appendChild(fade);
    requestAnimationFrame(() => { fade.style.opacity = "1"; });

    setTimeout(() => {
      this._disposeScene();
      this._wrap.innerHTML = "";
      this._buildMapScene(mapId);
      fade.remove();
    }, 450);
  }

  private _buildMapScene(mapId: MapId): void {
    this._phase = "map";

    const skies: Record<MapId, Color4> = {
      forest:    new Color4(0.44, 0.66, 0.30, 1),
      mountains: new Color4(0.55, 0.70, 0.90, 1),
      swamp:     new Color4(0.20, 0.28, 0.14, 1),
      cave:      new Color4(0.04, 0.03, 0.05, 1),
    };
    const fogs: Record<MapId, [Color3, number, number]> = {
      forest:    [new Color3(0.50, 0.68, 0.38), 30, 56],
      mountains: [new Color3(0.70, 0.78, 0.92), 28, 60],
      swamp:     [new Color3(0.22, 0.30, 0.14), 14, 36],
      cave:      [new Color3(0.04, 0.03, 0.05), 10, 26],
    };

    this._scene = new Scene(this._g.engine);
    this._scene.clearColor = skies[mapId];
    const [fc, fs, fe] = fogs[mapId];
    this._scene.fogMode  = 3;
    this._scene.fogColor = fc;
    this._scene.fogStart = fs;
    this._scene.fogEnd   = fe;

    // Player spawns away from gorilla
    this._camera = new FreeCamera("cam", new Vector3(0, EYE_H, 0), this._scene);
    this._camera.minZ  = 0.1;
    this._camera.speed = 0;

    this._buildMapLights(mapId);
    this._buildMapTerrain(mapId);
    if (this._daisyCodeEntered) this._buildGorilla();
    this._buildHands();
    this._buildMapHUD();

    this._renderFn = () => {
      this._tickMap();
      this._scene.render();
    };
    this._g.engine.runRenderLoop(this._renderFn);
  }

  private _buildMapLights(mapId: MapId): void {
    const s = this._scene;
    if (mapId === "cave") {
      const a = new HemisphericLight("a", new Vector3(0,1,0), s);
      a.intensity = 0.06;
      const pts: [number,number,number][] = [
        [0,3,0],[8,2,8],[-8,2,8],[8,2,-8],[-8,2,-8],[15,2,0],[-15,2,0],[0,2,15],[0,2,-15],
      ];
      for (const [x,y,z] of pts) {
        const pl = new PointLight(`pl${x}${z}`, new Vector3(x,y,z), s);
        pl.intensity = 1.1; pl.range = 11;
        pl.diffuse   = new Color3(1, 0.75, 0.4);
      }
    } else {
      const h = new HemisphericLight("h", new Vector3(0,1,0), s);
      h.intensity = 0.80;
      h.diffuse   = new Color3(1, 0.97, 0.88);
      h.groundColor = new Color3(0.15, 0.25, 0.08);
      const sun = new DirectionalLight("sun", new Vector3(-0.6,-1,-0.4), s);
      sun.intensity = 0.45;
      sun.diffuse   = new Color3(1, 0.92, 0.72);
    }
  }

  private _buildMapTerrain(mapId: MapId): void {
    const s = this._scene;
    const gColors: Record<MapId, Color3> = {
      forest:    new Color3(0.22, 0.52, 0.12),
      mountains: new Color3(0.48, 0.45, 0.42),
      swamp:     new Color3(0.18, 0.28, 0.10),
      cave:      new Color3(0.15, 0.13, 0.14),
    };
    const gMat = new StandardMaterial("gnd", s);
    gMat.diffuseColor = gColors[mapId];
    const gnd = MeshBuilder.CreateGround("gnd", { width: 70, height: 70 }, s);
    gnd.material = gMat;

    if (mapId === "forest")    this._terrainForest(s);
    if (mapId === "mountains") this._terrainMountains(s);
    if (mapId === "swamp")     this._terrainSwamp(s);
    if (mapId === "cave")      this._terrainCave(s);

    // Return arch in each map so player can go back to lobby
    const exitMat = new StandardMaterial("exit", s);
    exitMat.diffuseColor  = new Color3(1, 0.8, 0.2);
    exitMat.emissiveColor = new Color3(0.5, 0.4, 0.05);
    for (const [ex, ez, pw, pd] of [[-22, 0, 0.4, 2.5], [22, 0, 0.4, 2.5], [0, -22, 2.5, 0.4], [0, 22, 2.5, 0.4]] as [number,number,number,number][]) {
      const p = MeshBuilder.CreateBox(`exP${ex}${ez}`, { width: pw, height: 3.5, depth: pd }, s);
      p.position.set(ex, 1.75, ez); p.material = exitMat;
    }
  }

  private _terrainForest(s: Scene): void {
    const tMat = new StandardMaterial("t", s); tMat.diffuseColor = new Color3(0.36, 0.20, 0.07);
    const lMat = new StandardMaterial("l", s); lMat.diffuseColor = new Color3(0.10, 0.48, 0.08);
    const pts: [number,number][] = [
      [8,5],[12,2],[-8,7],[-12,3],[5,12],[-6,-10],[10,-8],[15,10],[-15,8],[-10,-12],
      [3,18],[-5,20],[20,3],[-20,5],[18,-5],[-18,-7],[8,-18],[0,-16],
    ];
    for (const [x,z] of pts) {
      const h = 3.2 + Math.random()*2.2;
      const t = MeshBuilder.CreateCylinder(`t${x}${z}`, { diameter:0.36+Math.random()*0.18, height:h, tessellation:7 }, s);
      t.position.set(x, h/2, z); t.material = tMat;
      const l = MeshBuilder.CreateSphere(`l${x}${z}`, { diameter:2.4+Math.random()*0.8, segments:5 }, s);
      l.position.set(x, h+0.7, z); l.material = lMat;
    }
  }

  private _terrainMountains(s: Scene): void {
    const rMat = new StandardMaterial("r", s); rMat.diffuseColor = new Color3(0.50, 0.48, 0.45);
    const sMat = new StandardMaterial("sn", s); sMat.diffuseColor = new Color3(0.95, 0.97, 1.0);
    const peaks: [number,number,number][] = [
      [24,8,14],[-24,-6,12],[10,24,10],[-12,-22,11],[22,-14,9],[-20,18,13],[0,26,15],
    ];
    for (const [x,z,h] of peaks) {
      const p = MeshBuilder.CreateCylinder(`pk${x}${z}`, { diameterTop:0, diameterBottom:h*0.65, height:h, tessellation:5 }, s);
      p.position.set(x, h/2, z); p.material = rMat;
      const c = MeshBuilder.CreateCylinder(`cp${x}${z}`, { diameterTop:0, diameterBottom:h*0.22, height:h*0.25, tessellation:5 }, s);
      c.position.set(x, h*0.88, z); c.material = sMat;
    }
    for (let i = 0; i < 16; i++) {
      const bx = (Math.random()-0.5)*42, bz = (Math.random()-0.5)*42;
      if (Math.sqrt(bx*bx+bz*bz) < 5) continue;
      const b = MeshBuilder.CreateSphere(`b${i}`, { diameter:1+Math.random()*1.5, segments:4 }, s);
      b.scaling.y = 0.55; b.position.set(bx, 0.35, bz); b.material = rMat;
    }
  }

  private _terrainSwamp(s: Scene): void {
    const tMat = new StandardMaterial("st", s); tMat.diffuseColor = new Color3(0.28, 0.20, 0.10);
    const lMat = new StandardMaterial("sl", s); lMat.diffuseColor = new Color3(0.20, 0.36, 0.08);
    const wMat = new StandardMaterial("sw", s); wMat.diffuseColor = new Color3(0.10, 0.22, 0.12); wMat.alpha = 0.75;
    for (const [x,z,r] of [[10,8,4],[-10,12,3],[5,-14,5],[-12,-8,3],[18,2,3]] as [number,number,number][]) {
      const wp = MeshBuilder.CreateGround(`wp${x}${z}`, { width:r*2, height:r*2 }, s);
      wp.position.set(x, 0.02, z); wp.material = wMat;
    }
    for (const [x,z] of [[8,5],[-8,7],[5,12],[-6,-10],[10,-8],[-15,8],[-10,-12],[3,18],[-5,20],[20,3]] as [number,number][]) {
      const h = 4+Math.random()*2;
      const t = MeshBuilder.CreateCylinder(`swt${x}${z}`, { diameter:0.3+Math.random()*0.15, height:h, tessellation:6 }, s);
      t.position.set(x, h/2, z); t.rotation.z=(Math.random()-0.5)*0.3; t.material=tMat;
      const l = MeshBuilder.CreateSphere(`swl${x}${z}`, { diameter:1.8+Math.random()*0.8, segments:4 }, s);
      l.position.set(x, h+0.5, z); l.material=lMat;
    }
  }

  private _terrainCave(s: Scene): void {
    const rMat = new StandardMaterial("cr", s); rMat.diffuseColor = new Color3(0.24, 0.22, 0.26);
    const cMat = new StandardMaterial("cc", s); cMat.diffuseColor = new Color3(0.12, 0.11, 0.13);
    const ceil = MeshBuilder.CreateGround("ceil", { width:70, height:70 }, s);
    ceil.position.y = 9; ceil.rotation.z = Math.PI; ceil.material = cMat;
    for (let i = 0; i < 20; i++) {
      const cx=(Math.random()-0.5)*44, cz=(Math.random()-0.5)*44;
      if (Math.sqrt(cx*cx+cz*cz)<5) continue;
      const h=1.5+Math.random()*3;
      const st=MeshBuilder.CreateCylinder(`st${i}`, { diameterTop:0, diameterBottom:0.4+Math.random()*0.4, height:h, tessellation:6 }, s);
      st.position.set(cx, 9-h/2, cz); st.rotation.z=Math.PI; st.material=rMat;
    }
    for (let i = 0; i < 15; i++) {
      const cx=(Math.random()-0.5)*44, cz=(Math.random()-0.5)*44;
      if (Math.sqrt(cx*cx+cz*cz)<6) continue;
      const h=0.5+Math.random()*1.5;
      const sg=MeshBuilder.CreateCylinder(`sg${i}`, { diameterTop:0, diameterBottom:0.3+Math.random()*0.3, height:h, tessellation:6 }, s);
      sg.position.set(cx, h/2, cz); sg.material=rMat;
    }
  }

  private _buildGorilla(): void {
    this._gorilla = this._makeGorillaBody(
      new Color3(1.0, 0.41, 0.71), "gorilla", this._scene);
    const angle = Math.random() * Math.PI * 2;
    this._gorilla.position.set(Math.cos(angle) * 18, 0.58, Math.sin(angle) * 18);
  }

  private _buildMapHUD(): void {
    this._vignette = document.createElement("div");
    this._vignette.style.cssText =
      "position:absolute;inset:0;pointer-events:none;" +
      "background:radial-gradient(ellipse at center,transparent 40%,rgba(255,0,0,0) 100%);";
    this._wrap.appendChild(this._vignette);

    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:18px;left:50%;transform:translateX(-50%);" +
      "color:white;font-family:'Arial Black',Arial,sans-serif;font-size:20px;font-weight:900;" +
      "text-shadow:0 2px 10px rgba(0,0,0,0.85);pointer-events:none;text-align:center;white-space:nowrap;";
    this._hud.textContent = "🦍 RUN!";
    this._wrap.appendChild(this._hud);

    const mapLabel: Record<MapId, string> = {
      forest: "🌲 Forest", mountains: "🏔 Mountains", swamp: "🌿 Swamp", cave: "🕳 Cave",
    };
    const ml = document.createElement("div");
    ml.style.cssText =
      "position:absolute;top:18px;left:18px;color:rgba(255,255,255,0.65);" +
      "font-family:Arial,sans-serif;font-size:13px;pointer-events:none;";
    ml.textContent = mapLabel[this._currentMap];
    this._wrap.appendChild(ml);

    const tip = document.createElement("div");
    tip.style.cssText =
      "position:absolute;bottom:18px;left:50%;transform:translateX(-50%);" +
      "color:rgba(255,255,255,0.45);font-family:Arial,sans-serif;font-size:12px;" +
      "pointer-events:none;";
    tip.innerHTML = "WASD to run &nbsp;·&nbsp; Mouse to look";
    this._wrap.appendChild(tip);

    const cx = document.createElement("div");
    cx.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:18px;height:18px;pointer-events:none;";
    cx.innerHTML =
      `<div style="position:absolute;top:50%;left:0;right:0;height:2px;background:rgba(255,255,255,0.8);transform:translateY(-50%)"></div>` +
      `<div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.8);transform:translateX(-50%)"></div>`;
    this._wrap.appendChild(cx);
  }

  private _tickMap(): void {
    if (this._caught) return;
    this._tickMovement();
    this._tickHands();
    this._gorillaTime++;

    // Only chase if daisy09 was spawned
    if (this._gorilla) {
      if (this._gorillaTime % 200 === 0)
        this._gorillaSpeed = Math.min(GORILLA_SPEED_MAX, this._gorillaSpeed + 0.004);

      const gp = this._gorilla.position;
      const pp = this._camera.position;
      const gdx = pp.x - gp.x, gdz = pp.z - gp.z;
      const dist = Math.sqrt(gdx * gdx + gdz * gdz);

      if (dist > 0.01) {
        gp.x += (gdx / dist) * this._gorillaSpeed;
        gp.z += (gdz / dist) * this._gorillaSpeed;
        gp.y  = 0.58 + Math.abs(Math.sin(this._gorillaTime * 0.14)) * 0.10;
        this._gorilla.rotation.y = Math.atan2(gdx, gdz);
      }

      const danger = Math.max(0, 1 - dist / 14);
      this._vignette.style.background =
        `radial-gradient(ellipse at center,transparent 38%,rgba(255,0,0,${(danger * 0.75).toFixed(2)}) 100%)`;

      if (dist < 5) {
          this._hud.style.color = "#ff4040";
          this._hud.textContent  = "🦍 IT'S RIGHT BEHIND YOU!!";
        } else if (dist < 11) {
          this._hud.style.color = "#ffaa00";
          this._hud.textContent  = "🦍 GETTING CLOSER — RUN!";
        } else {
          this._hud.style.color = "white";
          this._hud.textContent  = "🦍 RUN!";
        }

      if (dist < GORILLA_CATCH_DIST) this._onCaught();
    } else {
      // No code typed — peaceful explore
      this._hud.style.color = "white";
      this._hud.textContent  = `🌲 Exploring — ${this._currentMap}`;
    }
  }

  private _onCaught(): void {
    this._caught = true;
    const flash = document.createElement("div");
    flash.style.cssText =
      "position:absolute;inset:0;background:white;pointer-events:none;z-index:98;";
    this._wrap.appendChild(flash);
    const lbl = document.createElement("div");
    lbl.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "color:#ff1493;font-family:'Arial Black',Arial,sans-serif;font-size:52px;font-weight:900;" +
      "text-shadow:0 0 30px rgba(255,20,147,0.9);pointer-events:none;z-index:99;text-align:center;";
    lbl.innerHTML = "CAUGHT!<br><span style='font-size:18px;color:white;'>Returning to lobby…</span>";
    this._wrap.appendChild(lbl);
    setTimeout(() => {
      flash.style.transition = "background 0.5s";
      flash.style.background = "black";
      lbl.style.transition   = "opacity 0.4s";
      lbl.style.opacity      = "0";
      setTimeout(() => this._returnToLobby(), 600);
    }, 700);
  }

  private _returnToLobby(): void {
    this._disposeScene();
    this._wrap.innerHTML = "";
    this._startLobby();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SHARED MOVEMENT (arm locomotion)
  // ══════════════════════════════════════════════════════════════════════════════

  private _tickMovement(): void {
    const cam  = this._camera;
    const cosY = Math.cos(this._yaw);
    const sinY = Math.sin(this._yaw);
    const spd  = 0.10;
    let dx = 0, dz = 0;

    if (this._keys["w"] || this._keys["arrowup"])    { dx += sinY; dz += cosY; }
    if (this._keys["s"] || this._keys["arrowdown"])  { dx -= sinY; dz -= cosY; }
    if (this._keys["a"] || this._keys["arrowleft"])  { dx -= cosY; dz += sinY; }
    if (this._keys["d"] || this._keys["arrowright"]) { dx += cosY; dz -= sinY; }

    if (dx !== 0 || dz !== 0) {
      const len = Math.sqrt(dx * dx + dz * dz);
      cam.position.x += (dx / len) * spd;
      cam.position.z += (dz / len) * spd;
    }

    cam.position.x = Math.max(-MAP_HALF, Math.min(MAP_HALF, cam.position.x));
    cam.position.z = Math.max(-MAP_HALF, Math.min(MAP_HALF, cam.position.z));

    if (this._phase === "lobby") {
      const onStump = Math.sqrt(cam.position.x ** 2 + cam.position.z ** 2) < STUMP_R - 0.3;
      cam.position.y = (onStump ? STUMP_H : 0) + EYE_H;
    } else {
      cam.position.y = EYE_H;
    }

    cam.rotation.y = this._yaw;
    cam.rotation.x = this._pitch;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // INPUT
  // ══════════════════════════════════════════════════════════════════════════════

  private _setupInput(): void {
    this._onKey = (e: KeyboardEvent) => {
      this._keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === "e" && !this._computerOpen && this._phase === "lobby") {
        const cp = this._camera?.position;
        if (!cp) return;
        const toComp = Math.sqrt((cp.x - 3.5) ** 2 + cp.z ** 2);
        if (toComp < 3.5) this._openComputer();
      }
      if (e.key === "Escape" && this._computerOpen) this._closeComputer();
    };

    this._onKeyUp = (e: KeyboardEvent) => {
      this._keys[e.key.toLowerCase()] = false;
    };

    // Mouse = look (standard FPS, inverted Y so up = look up)
    this._onMouseMove = (e: MouseEvent) => {
      if (!this._pointerLocked || this._computerOpen) return;
      this._yaw  += e.movementX * 0.002;
      this._pitch = Math.max(-1.1, Math.min(1.1,
        this._pitch + e.movementY * 0.002));
    };

    this._onLockChange = () => {
      this._pointerLocked =
        document.pointerLockElement === this._g.engine.getRenderingCanvas();
    };

    this._onClick = () => {
      if (!this._computerOpen)
        this._g.engine.getRenderingCanvas()?.requestPointerLock();
    };

    window.addEventListener("keydown",   this._onKey);
    window.addEventListener("keyup",     this._onKeyUp);
    document.addEventListener("mousemove",         this._onMouseMove);
    document.addEventListener("pointerlockchange", this._onLockChange);
    this._wrap.addEventListener("click",           this._onClick);
    this._wrap.addEventListener("contextmenu", e   => e.preventDefault());
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // UTILITIES
  // ══════════════════════════════════════════════════════════════════════════════

  private _makeGorillaBody(color: Color3, name: string, s: Scene): Mesh {
    const mat = new StandardMaterial(`${name}Mat`, s);
    mat.diffuseColor  = color;
    mat.specularColor = new Color3(0.1, 0.05, 0.08);

    const body = MeshBuilder.CreateBox(`${name}Body`,
      { width: 0.92, height: 1.15, depth: 0.62 }, s);
    body.material = mat;

    const head = MeshBuilder.CreateSphere(`${name}Hd`, { diameter: 0.68, segments: 8 }, s);
    head.parent = body; head.position.set(0, 0.93, 0.05); head.material = mat;

    const eyeMat = new StandardMaterial(`${name}Eye`, s);
    eyeMat.diffuseColor = eyeMat.emissiveColor = new Color3(0.06, 0.03, 0.05);
    for (const ex of [-0.12, 0.12]) {
      const eye = MeshBuilder.CreateSphere(`${name}eye${ex}`, { diameter: 0.1, segments: 5 }, s);
      eye.parent = head; eye.position.set(ex, 0.05, 0.31); eye.material = eyeMat;
    }
    for (const side of [-1, 1]) {
      const arm = MeshBuilder.CreateCylinder(`${name}arm${side}`,
        { diameter: 0.22, height: 0.95, tessellation: 6 }, s);
      arm.parent = body; arm.position.set(side * 0.62, 0.05, 0);
      arm.rotation.z = (Math.PI / 4) * -side; arm.material = mat;
      const hand = MeshBuilder.CreateSphere(`${name}hnd${side}`,
        { diameter: 0.28, segments: 5 }, s);
      hand.parent = arm; hand.position.set(0, -0.55, 0); hand.material = mat;
    }
    for (const side of [-1, 1]) {
      const leg = MeshBuilder.CreateCylinder(`${name}leg${side}`,
        { diameter: 0.26, height: 0.72, tessellation: 6 }, s);
      leg.parent = body; leg.position.set(side * 0.25, -0.94, 0); leg.material = mat;
    }
    return body;
  }

  private _disposeScene(): void {
    if (this._renderFn) this._g.engine.stopRenderLoop(this._renderFn);
    this._scene?.dispose();
  }

  private _cleanup(): void {
    if (document.pointerLockElement) document.exitPointerLock();
    document.removeEventListener("pointerlockchange", this._onLockChange);
    document.removeEventListener("mousemove",  this._onMouseMove);
    window.removeEventListener("keydown", this._onKey);
    window.removeEventListener("keyup",   this._onKeyUp);
    this._disposeScene();
    this._wrap.remove();
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}
