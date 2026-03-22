/**
 * Garten of Banban 3 — The Green Room + Corridor + Cafeteria
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
import { gpState }          from "../../input/GamepadManager";
import type { Game }        from "../../game/Game";

const EYE_Y = 1.65;
const SPD   = 4.5;
const RH    = 3.5;   // room height
const E_DIST   = 4.2;
const ELEV_X   = -5.0;
const ELEV_Z   = -44.5;
const ELEV_TOP = 6;
const UG_FLOOR = -6;

interface Interactable3 { mesh: Mesh; id: string; label: string; onInteract: () => void; }
interface SavedState3 {
  camPos: [number,number,number]; yaw: number; pitch: number;
  hasOrangeKey: boolean; orangeDoorOpen: boolean;
  elevatorY: number; elevatorState: 'down'|'up'|'top'|'return';
  stingerFlynWoken: boolean; inNursery: boolean;
  xBtnPressed: [boolean,boolean,boolean]; xPressSeq: number[];
  jjDoorOpen: boolean; checkpoint: [number,number,number] | null;
}

export class GardenBanban3 {
  private _g: Game;
  private _wrap!:   HTMLDivElement;
  private _canvas!: HTMLCanvasElement;
  private _engine!: Engine;
  private _scene!:  Scene;
  private _camera!: FreeCamera;

  private _yaw   = Math.PI;
  private _pitch = 0;
  private _velY  = 0;
  private _keys  = new Set<string>();
  private _started = false;
  private _done    = false;

  private _interactables: Interactable3[] = [];
  private _aimedAt: Interactable3 | null = null;

  // Drone
  private _droneMesh!:    Mesh;
  private _droneTarget:   Vector3 | null = null;
  private _droneParked    = false;
  private _hasDroneRemote = false;
  private _hasBat1        = false;
  private _hasBat2        = false;

  // Drone buttons
  private _drBtnWorldPos: [number,number,number][] = [];
  private _drBtnPressed:  boolean[]  = [false, false, false];
  private _drBtnMats:     StandardMaterial[] = [];
  private _drBtnCount     = 0;

  // Puzzle
  private _hasDvd      = false;
  private _tvUsed      = false;
  private _screenMat!:  StandardMaterial;
  private _screenMesh!: Mesh;

  private _prevBtnSq = false;
  private _prevBtnRT = false;

  // Stinger Flyn area
  private _elevatorPlatform!:  Mesh;
  private _elevatorY           = 0;
  private _elevatorState: 'down' | 'up' | 'top' | 'return' = 'down';
  private _elevatorTimer       = 0;
  private _hasOrangeKey        = false;
  private _orangeDoorMesh!:    Mesh;
  private _orangeDoorOpen      = false;
  private _stingerFlynMesh!:   Mesh;
  private _stingerFlynBaseY    = 0;
  private _stingerFlynWoken    = false;
  private _dreamActive         = false;

  // Nurse's office puzzle
  private _inNursery           = false;
  private _xBtnMeshes:         Mesh[]             = [];
  private _xBtnMats:           StandardMaterial[] = [];
  private _xBtnPressed         = [false, false, false];
  private _xPressSeq:          number[]           = [];
  private _xCorrectOrder       = [2, 0, 1];
  private _hintDroneMesh!:     Mesh;
  private _hintPhase           = 0;
  private _hintTimer           = 0;
  private _hintLabel!:         HTMLDivElement;
  private _jumboJoshMesh!:     Mesh;
  private _jumboJoshActive     = false;
  private _jjDoor!:            Mesh;
  private _jjDoorOpen          = false;
  private _checkpoint:         Vector3 | null     = null;
  private _isDead              = false;

  // Replay buffer (rolling 5-second window of camera frames)
  private _replayBuf: Array<{x:number;y:number;z:number;yaw:number;pitch:number;t:number}> = [];
  private _isReplaying = false;
  private _replayHead  = 0; // seconds into the replay playhead

  // Castle / Joker scene
  private _inCastle        = false;
  private _throneDialogDone = false;
  private _naughtyActive   = false;
  private _naughtyMeshes:  Mesh[] = [];
  private _inMaze          = false;

  // Admin / debug
  private _flyMode    = false;
  private _noclip     = false;
  private _adminPanel!: HTMLDivElement;

  // Baby bird area
  private _inBabyBirdArea     = false;
  private _hasMedal2          = false;
  private _medalThrown2       = false;
  private _opiillaDistracted    = false;
  private _opiillaDistractTimer = 0;
  private _hasBabyBird          = false;
  private _opiillaAngle         = 0;
  private _opiillaMesh!:         Mesh;
  private _babyBirdPickupMesh!: Mesh;
  private _medalMesh2!:        Mesh;
  private _babyBirdAreaBuilt  = false;

  // Resume state (persists across menu visits)
  private static _save: SavedState3 | null = null;
  private _resuming = false;

  private _hudPrompt!:    HTMLDivElement;
  private _hudDrone!:     HTMLDivElement;
  private _startOverlay!: HTMLDivElement;

  private _kd!: (e: KeyboardEvent) => void;
  private _ku!: (e: KeyboardEvent) => void;
  private _mm!: (e: MouseEvent)    => void;
  private _mc!: (e: PointerEvent)  => void;
  private _rz!: () => void;

  constructor(g: Game) { this._g = g; this._showMenu(); }

  // ── Menu ───────────────────────────────────────────────────────────────────

  private _showMenu(): void {
    this._g.inMiniGame = false;
    this._g.ui.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(135deg,#060308 60%,#0a0514 100%);" +
      "overflow:hidden;font-family:Arial,sans-serif;pointer-events:all;";
    const panel = document.createElement("div");
    panel.style.cssText =
      "position:absolute;top:0;left:0;bottom:0;width:min(340px,44%);" +
      "background:linear-gradient(105deg,rgba(6,5,10,0.97) 80%,rgba(6,5,10,0) 100%);" +
      "display:flex;flex-direction:column;" +
      "padding:clamp(20px,4vh,44px) clamp(18px,3vw,36px);box-sizing:border-box;";
    panel.innerHTML = `
      <div style="font-family:'Arial Black',Arial;line-height:1.05;margin-bottom:clamp(10px,2.5vh,24px);">
        <div style="color:rgba(255,255,255,0.7);font-size:clamp(11px,1.6vw,18px);font-weight:900;letter-spacing:3px;margin-bottom:2px;">GARTEN OF</div>
        <div style="font-size:clamp(30px,5vw,58px);font-weight:900;letter-spacing:2px;line-height:1;">
          <span style="color:#22cc22;">B</span><span style="color:#ff4444;">A</span><span style="color:#ff4444;">N</span><span style="color:#8833ff;">B</span><span style="color:#ff8800;">A</span><span style="color:#2288ff;">N</span>
        </div>
        <div style="height:2px;background:linear-gradient(90deg,rgba(255,255,255,0.25),transparent);margin-top:8px;margin-bottom:16px;"></div>
      </div>`;
    const btnBase = "display:block;width:100%;text-align:left;background:none;border:none;" +
      "border-left:3px solid transparent;color:white;font-size:clamp(15px,2.2vw,26px);" +
      "font-family:Arial,sans-serif;font-weight:bold;padding:9px 0 9px 4px;cursor:pointer;margin-bottom:2px;";
    const playBtn = document.createElement("button");
    playBtn.textContent = "▶ New Game"; playBtn.style.cssText = btnBase;
    playBtn.onmouseover = () => { playBtn.style.color="#FFD700"; playBtn.style.paddingLeft="14px"; playBtn.style.borderLeftColor="#FFD700"; };
    playBtn.onmouseout  = () => { playBtn.style.color="white";   playBtn.style.paddingLeft="4px";  playBtn.style.borderLeftColor="transparent"; };
    playBtn.onclick = () => { wrap.remove(); this._startGame(); };
    panel.appendChild(playBtn);
    if (GardenBanban3._save) {
      const resumeBtn = document.createElement("button");
      resumeBtn.textContent = "⟳ Resume"; resumeBtn.style.cssText = btnBase + "color:#88ffbb;";
      resumeBtn.onmouseover = () => { resumeBtn.style.color="#55ffaa"; resumeBtn.style.paddingLeft="14px"; resumeBtn.style.borderLeftColor="#55ffaa"; };
      resumeBtn.onmouseout  = () => { resumeBtn.style.color="#88ffbb"; resumeBtn.style.paddingLeft="4px";  resumeBtn.style.borderLeftColor="transparent"; };
      resumeBtn.onclick = () => { wrap.remove(); this._resuming = true; this._startGame(); };
      panel.appendChild(resumeBtn);
    }
    ["Load Game","Settings","Credits"].forEach(t => {
      const b = document.createElement("button"); b.textContent = t; b.disabled = true;
      b.style.cssText = btnBase + "color:rgba(255,255,255,0.28);cursor:default;"; panel.appendChild(b);
    });
    const backBtn = document.createElement("button"); backBtn.textContent = "← Back";
    backBtn.style.cssText = "margin-top:auto;background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.45);" +
      "font-size:12px;padding:6px 14px;border-radius:16px;border:1px solid rgba(255,255,255,0.14);cursor:pointer;";
    backBtn.onclick = () => this._g.goArcade();
    panel.appendChild(backBtn);
    wrap.appendChild(panel);
    this._g.ui.appendChild(wrap);
  }

  // ── Start ──────────────────────────────────────────────────────────────────

  private _startGame(): void {
    this._g.inMiniGame = true; this._g.autoClickCallback = null; this._g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText = "position:absolute;inset:0;overflow:hidden;background:#000;pointer-events:all;";
    this._g.ui.appendChild(this._wrap);
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;";
    this._wrap.appendChild(this._canvas);
    this._engine = new Engine(this._canvas, true, { preserveDrawingBuffer: true });
    this._scene  = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.05, 0.14, 0.06, 1);
    this._camera = new FreeCamera("cam3", new Vector3(0, EYE_Y, -1.0), this._scene);
    this._camera.minZ = 0.05; this._camera.maxZ = 60;
    this._camera.rotation.y = this._yaw;
    const amb = new HemisphericLight("amb3", new Vector3(0, 1, 0), this._scene);
    amb.intensity = 1.1; amb.diffuse = new Color3(0.75, 1.0, 0.75); amb.groundColor = new Color3(0.30, 0.60, 0.30);
    this._buildGreenRoom();
    this._buildCorridor();
    this._buildCafeteria();
    this._buildDrone();
    this._buildHUD();
    this._buildLobby();
    this._buildElevatorShaft();
    this._buildStaircase();
    this._buildUnderground();
    this._buildNurseryOffice();
    this._buildCastle();
    this._buildBabyBirdArea();
    if (this._resuming && GardenBanban3._save) { this._restoreState(GardenBanban3._save); this._resuming = false; }
    this._setupInput();
    this._engine.runRenderLoop(() => { if (!this._done) this._tick(this._engine.getDeltaTime() / 1000); this._scene.render(); });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _mat(r: number, g: number, b: number, emR = 0, emG = 0, emB = 0): StandardMaterial {
    const m = new StandardMaterial("", this._scene);
    m.diffuseColor = new Color3(r, g, b); m.maxSimultaneousLights = 8;
    if (emR || emG || emB) m.emissiveColor = new Color3(emR, emG, emB);
    return m;
  }
  private _box(w: number, h: number, d: number, x: number, y: number, z: number,
               mat: StandardMaterial, pick = false, col = false): Mesh {
    const m = MeshBuilder.CreateBox("", { width: w, height: h, depth: d }, this._scene);
    m.position.set(x, y, z); m.material = mat; m.isPickable = pick; m.checkCollisions = col;
    return m;
  }
  private _light(x: number, y: number, z: number, r: number, g: number, b: number, intensity: number, range: number): void {
    const pl = new PointLight("", new Vector3(x, y, z), this._scene);
    pl.intensity = intensity; pl.range = range; pl.diffuse = new Color3(r, g, b);
  }

  // ── Green Room (z: 0 → -10, x: -5 → 5) ───────────────────────────────────

  private _buildGreenRoom(): void {
    const wallM  = this._mat(0.20, 0.65, 0.22, 0.06, 0.20, 0.07);
    const floorM = this._mat(0.28, 0.72, 0.28, 0.08, 0.22, 0.08);
    const ceilM  = this._mat(0.42, 0.82, 0.42, 0.12, 0.28, 0.12);

    // Floor & ceiling
    const gf = MeshBuilder.CreateGround("", { width: 10, height: 10 }, this._scene);
    gf.position.set(0, 0, -5); gf.material = floorM;
    const gc = MeshBuilder.CreateGround("", { width: 10, height: 10 }, this._scene);
    gc.rotation.x = Math.PI; gc.position.set(0, RH, -5); gc.material = ceilM;

    // Walls: west, east (full)
    this._box(0.2, RH, 10, -5, RH/2, -5, wallM, false, true);
    this._box(0.2, RH, 10,  5, RH/2, -5, wallM, false, true);

    // South wall with entrance gap (2.4 wide)
    const sw = (10 - 2.4) / 2;
    this._box(sw, RH, 0.2, -(1.2+sw/2), RH/2, 0, wallM, false, true);
    this._box(sw, RH, 0.2,  (1.2+sw/2), RH/2, 0, wallM, false, true);
    this._box(2.4, RH-2.4, 0.2, 0, 2.4+(RH-2.4)/2, 0, wallM, false, true);

    // North wall with corridor door gap (3 wide centered)
    this._box(3.5, RH, 0.2, -3.25, RH/2, -10, wallM, false, true);
    this._box(3.5, RH, 0.2,  3.25, RH/2, -10, wallM, false, true);

    // Ceiling light strips
    const sunM = this._mat(1.0, 1.0, 0.85, 0.95, 0.95, 0.70);
    for (const [lx, lz] of [[-2,-3],[2,-3],[0,-7]] as [number,number][]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.18, height: 0.04, depth: 2.5 }, this._scene);
      sl.position.set(lx, RH-0.02, lz); sl.material = sunM; sl.isPickable = false;
      this._light(lx, RH-0.2, lz, 1.0, 1.0, 0.80, 2.5, 14);
    }

    // Grass tufts
    const gm = this._mat(0.15, 0.58, 0.15, 0.05, 0.20, 0.05);
    for (const [gx, gz] of [[-3.5,-1.5],[3.2,-2],[-3,-7],[3.5,-8],[-3.8,-4.5],[3.8,-5.5]] as [number,number][]) {
      for (let i = 0; i < 3; i++) {
        const bl = MeshBuilder.CreateBox("", { width: 0.06, height: 0.28+i*0.06, depth: 0.06 }, this._scene);
        bl.position.set(gx+i*0.12, 0.14, gz); bl.material = gm; bl.rotation.z = (i-1)*0.22; bl.isPickable = false;
      }
    }

    // Thick tree trunk — floor to ceiling, no leaves
    this._buildTree(0, -5);

    // TV on east wall (screen faces west into room)
    this._buildTV();

    // Battery 1 — small shelf near south entrance
    this._buildBattery(1, 2.5, 1.1, -2.0);

    // Drone button 1 — flat red switch on east wall, near tree
    this._buildFlatSwitch(4.95, 2.2, -8.0, -1, 0, 0);
  }

  private _buildTree(x: number, z: number): void {
    const bk  = this._mat(0.38, 0.22, 0.08, 0.05, 0.02, 0.01);
    const bkD = this._mat(0.28, 0.15, 0.05, 0.02, 0.01, 0.00);
    const trunk = MeshBuilder.CreateCylinder("g3_trunk",
      { height: RH, diameter: 1.1, tessellation: 12 }, this._scene) as Mesh;
    trunk.position.set(x, RH/2, z); trunk.material = bk; trunk.checkCollisions = true;
    for (let i = 0; i < 8; i++) {
      const a = (i/8)*Math.PI*2;
      const g = MeshBuilder.CreateBox("", { width: 0.06, height: RH*0.85, depth: 0.06 }, this._scene);
      g.position.set(x+Math.cos(a)*0.52, RH/2, z+Math.sin(a)*0.52); g.material = bkD; g.isPickable = false;
    }
    const rm = this._mat(0.32, 0.18, 0.06);
    for (let r = 0; r < 5; r++) {
      const a = (r/5)*Math.PI*2;
      const rt = MeshBuilder.CreateBox("", { width: 0.22, height: 0.18, depth: 0.70 }, this._scene);
      rt.position.set(x+Math.cos(a)*0.62, 0.09, z+Math.sin(a)*0.62);
      rt.rotation.y = a; rt.material = rm; rt.isPickable = false;
    }
    const tr = MeshBuilder.CreateCylinder("",
      { height: 0.18, diameterTop: 1.3, diameterBottom: 1.1, tessellation: 12 }, this._scene) as Mesh;
    tr.position.set(x, RH-0.09, z); tr.material = this._mat(0.30, 0.18, 0.06); tr.isPickable = false;
  }

  private _buildTV(): void {
    // East wall, screen faces west (-x)
    const tvZ = -6.0, tvX = 4.94;
    const standM  = this._mat(0.18, 0.18, 0.20);
    const bodyM   = this._mat(0.12, 0.12, 0.14);
    this._box(0.12, 0.55, 0.12, tvX, 0.275, tvZ+0.2, standM);
    this._box(0.35, 0.05, 0.55, tvX, 0.05,  tvZ+0.2, standM);
    const tvMesh = this._box(0.12, 0.85, 1.35, tvX, 1.25, tvZ, bodyM, true);
    tvMesh.name = "tv";
    this._screenMat  = this._mat(0.04, 0.06, 0.10, 0.01, 0.02, 0.04);
    this._screenMesh = this._box(0.06, 0.66, 1.12, tvX-0.09, 1.28, tvZ, this._screenMat);
    this._screenMesh.name = "tv_screen";
    this._box(0.04, 0.04, 0.04, tvX-0.09, 0.86, tvZ+0.55, this._mat(0.1, 0.6, 0.1, 0.05, 0.30, 0.05));
    this._interactables.push({
      mesh: tvMesh, id: "tv", label: "[ E ] Insert DVD",
      onInteract: () => {
        if (!this._hasDvd) { this._flashMsg("📼 You need the DVD player first!"); return; }
        if (this._tvUsed) return;
        this._tvUsed = true;
        const ii = this._interactables.findIndex(i => i.id === "tv");
        if (ii >= 0) this._interactables.splice(ii, 1);
        this._playSecretVideo();
      },
    });
  }

  private _buildBattery(num: 1|2, x: number, y: number, z: number): void {
    const shelfM = this._mat(0.40, 0.28, 0.14, 0.04, 0.03, 0.01);
    this._box(0.5, 0.04, 0.22, x, y, z, shelfM);
    const batM  = this._mat(0.18, 0.60, 0.18, 0.04, 0.18, 0.04);
    const batM2 = this._mat(0.55, 0.55, 0.22, 0.10, 0.10, 0.02);
    const bat = MeshBuilder.CreateCylinder("", { diameter: 0.09, height: 0.20, tessellation: 10 }, this._scene) as Mesh;
    bat.position.set(x, y+0.12, z); bat.material = batM; bat.isPickable = true; bat.name = `bat${num}`;
    const cap = MeshBuilder.CreateCylinder("", { diameter: 0.055, height: 0.04, tessellation: 10 }, this._scene) as Mesh;
    cap.position.set(x, y+0.23, z); cap.material = batM2; cap.isPickable = false;
    const pl = new PointLight("", new Vector3(x, y+0.4, z), this._scene);
    pl.intensity = 0.5; pl.range = 3; pl.diffuse = new Color3(0.3, 1.0, 0.3);
    const id = `bat${num}`;
    this._interactables.push({
      mesh: bat, id,
      label: `[ E ] Pick up Battery (${num}/2)`,
      onInteract: () => {
        if (num === 1) { if (this._hasBat1) return; this._hasBat1 = true; }
        else           { if (this._hasBat2) return; this._hasBat2 = true; }
        bat.setEnabled(false); cap.setEnabled(false); pl.setEnabled(false);
        const ii = this._interactables.findIndex(i => i.id === id);
        if (ii >= 0) this._interactables.splice(ii, 1);
        const both = this._hasBat1 && this._hasBat2;
        if (both && this._hasDroneRemote) {
          this._activateDrone();
        } else if (both) {
          this._flashMsg(`⚡ Battery 2/2! Now find the Drone Remote in the cafeteria.`);
        } else {
          const where = num === 1 ? "the kiosk in the corridor" : "the green room entrance";
          this._flashMsg(`⚡ Battery ${num}/2! Find the other one near ${where}.`);
        }
      },
    });
  }

  // ── Flat wall switch (drone button) ────────────────────────────────────────

  private _buildFlatSwitch(bx: number, by: number, bz: number, dx: number, dz: number, idx: number): void {
    const pd = 0.05; // panel depth (protrusion)
    const panelM = this._mat(0.85, 0.04, 0.04, 0.45, 0.01, 0.01);
    this._drBtnMats[idx] = panelM;
    const pw = dx !== 0 ? pd : 0.45;
    const pDz = dz !== 0 ? pd : 0.45;
    this._box(pw, 0.30, pDz, bx + dx*pd/2, by, bz + dz*pd/2, panelM);
    // Nub
    const nd = 0.06;
    const nw = dx !== 0 ? nd : 0.22;
    const nDz = dz !== 0 ? nd : 0.22;
    const nubM = this._mat(0.95, 0.06, 0.06, 0.55, 0.01, 0.01);
    this._box(nw, 0.14, nDz, bx + dx*(pd+nd/2), by, bz + dz*(pd+nd/2), nubM);
    // Glow
    const pl = new PointLight("", new Vector3(bx + dx*0.5, by, bz + dz*0.5), this._scene);
    pl.intensity = 0.6; pl.range = 5; pl.diffuse = new Color3(1.0, 0.05, 0.05);
    // Floor halo
    const halo = MeshBuilder.CreateGround("", { width: 0.9, height: 0.9 }, this._scene);
    halo.position.set(bx + dx*1.2, 0.006, bz + dz*1.2);
    halo.material = this._mat(0.55, 0.02, 0.02, 0.18, 0.00, 0.00); halo.isPickable = false;
    this._drBtnWorldPos[idx] = [bx + dx*(pd+nd), by, bz + dz*(pd+nd)];
  }

  // ── Corridor (z: -10 → -22, x: -2 → 2) ───────────────────────────────────

  private _buildCorridor(): void {
    const floorM = this._mat(0.75, 0.52, 0.18, 0.14, 0.09, 0.02); // orange floor
    const wallM  = this._mat(0.22, 0.35, 0.65, 0.04, 0.07, 0.18); // blue walls
    const ceilM  = this._mat(0.88, 0.88, 0.92, 0.15, 0.15, 0.16);

    const cf = MeshBuilder.CreateGround("", { width: 4, height: 12 }, this._scene);
    cf.position.set(0, 0, -16); cf.material = floorM;
    const cc = MeshBuilder.CreateGround("", { width: 4, height: 12 }, this._scene);
    cc.rotation.x = Math.PI; cc.position.set(0, RH, -16); cc.material = ceilM;

    // Side walls (full length)
    this._box(0.15, RH, 12, -2, RH/2, -16, wallM, false, true);
    this._box(0.15, RH, 12,  2, RH/2, -16, wallM, false, true);

    // South wall caps (aligns with green room north door gap: |x| < 1.5)
    this._box(0.5, RH, 0.15, -1.75, RH/2, -10, wallM, false, true);
    this._box(0.5, RH, 0.15,  1.75, RH/2, -10, wallM, false, true);

    // North wall caps (cafeteria door gap: |x| < 1.5)
    this._box(0.5, RH, 0.15, -1.75, RH/2, -22, wallM, false, true);
    this._box(0.5, RH, 0.15,  1.75, RH/2, -22, wallM, false, true);

    // Orange ceiling strips
    const stripM = this._mat(1.0, 0.75, 0.25, 0.90, 0.60, 0.10);
    for (const lz of [-13, -17, -21] as number[]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.14, height: 0.04, depth: 2.0 }, this._scene);
      sl.position.set(0, RH-0.02, lz); sl.material = stripM; sl.isPickable = false;
      this._light(0, RH-0.2, lz, 1.0, 0.78, 0.40, 2.0, 10);
    }

    // Floor stripe (orange line down center)
    const lineM = this._mat(0.9, 0.45, 0.05, 0.20, 0.08, 0.00);
    this._box(0.25, 0.005, 12, 0, 0.003, -16, lineM);

    // Information Kiosk at z=-15
    this._buildKiosk(0, -15);

    // DVD Player — east wall shelf in corridor
    this._buildDvdPlayer(1.85, -18.5);

    // Drone button 2 — west wall at z=-14, facing east
    this._buildFlatSwitch(-1.95, 2.2, -14.0, 1, 0, 1);
  }

  private _buildKiosk(x: number, z: number): void {
    const deskM = this._mat(0.55, 0.48, 0.40, 0.06, 0.05, 0.04);
    const panM  = this._mat(0.12, 0.25, 0.50, 0.02, 0.05, 0.14);
    this._box(1.4, 0.92, 0.65, x, 0.46, z, deskM);          // desk body
    this._box(1.4, 0.06, 0.65, x, 0.92, z, this._mat(0.65, 0.58, 0.48)); // top surface
    this._box(1.0, 0.55, 0.07, x, 1.2, z-0.29, panM);        // info panel
    this._box(1.0, 0.55, 0.04, x, 1.2, z-0.26, this._mat(0.05, 0.12, 0.28, 0.01, 0.04, 0.12)); // screen
    this._light(x, 1.5, z, 0.5, 0.8, 1.0, 0.8, 4);

    // Battery 2 on kiosk desk
    this._buildBattery(2, x + 0.35, 0.96, z - 0.05);
  }

  private _buildDvdPlayer(x: number, z: number): void {
    this._box(0.04, 0.05, 0.65, x, 1.55, z, this._mat(0.45, 0.32, 0.18, 0.06, 0.04, 0.02));
    const dvdM = this._mat(0.14, 0.14, 0.18, 0.02, 0.02, 0.04);
    const dvdMesh = this._box(0.22, 0.12, 0.50, x-0.11, 1.68, z, dvdM, true);
    dvdMesh.name = "dvd";
    this._box(0.02, 0.02, 0.38, x-0.11, 1.68, z-0.24, this._mat(0.05, 0.05, 0.07));
    this._box(0.04, 0.04, 0.04, x-0.11, 1.68, z-0.26, this._mat(0.1, 0.3, 1.0, 0.04, 0.12, 0.50));
    const pl = new PointLight("", new Vector3(x, 1.8, z), this._scene);
    pl.intensity = 0.6; pl.range = 3; pl.diffuse = new Color3(0.5, 0.7, 1.0);
    this._interactables.push({
      mesh: dvdMesh, id: "dvd", label: "[ E ] Pick up DVD Player",
      onInteract: () => {
        if (this._hasDvd) return;
        this._hasDvd = true;
        dvdMesh.setEnabled(false); pl.setEnabled(false);
        const ii = this._interactables.findIndex(i => i.id === "dvd");
        if (ii >= 0) this._interactables.splice(ii, 1);
        this._flashMsg("📼 DVD Player picked up! Take it to the TV in the Green Room.");
      },
    });
  }

  // ── Cafeteria (z: -22 → -34, x: -7 → 7) ──────────────────────────────────

  private _buildCafeteria(): void {
    const wallM  = this._mat(0.25, 0.72, 0.30, 0.06, 0.18, 0.07);
    const floorM = this._mat(0.88, 0.90, 0.84, 0.12, 0.14, 0.10);
    const ceilM  = this._mat(0.90, 0.92, 0.88, 0.14, 0.15, 0.12);

    const cff = MeshBuilder.CreateGround("", { width: 14, height: 12 }, this._scene);
    cff.position.set(0, 0, -28); cff.material = floorM;
    const cfc = MeshBuilder.CreateGround("", { width: 14, height: 12 }, this._scene);
    cfc.rotation.x = Math.PI; cfc.position.set(0, RH, -28); cfc.material = ceilM;

    // Side walls
    this._box(0.15, RH, 12, -7, RH/2, -28, wallM, false, true);
    this._box(0.15, RH, 12,  7, RH/2, -28, wallM, false, true);
    // North wall with lobby doorway (3 wide at centre)
    this._box(5.65, RH, 0.15, -4.33, RH/2, -34, wallM, false, true);
    this._box(5.65, RH, 0.15,  4.33, RH/2, -34, wallM, false, true);
    // South wall with corridor door gap (|x|<2)
    this._box(5.0, RH, 0.15, -4.5, RH/2, -22, wallM, false, true);
    this._box(5.0, RH, 0.15,  4.5, RH/2, -22, wallM, false, true);

    // Ceiling lights
    const sunM = this._mat(1.0, 1.0, 0.85, 0.95, 0.95, 0.70);
    for (const [lx, lz] of [[-3,-25],[3,-25],[-3,-31],[3,-31]] as [number,number][]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.18, height: 0.04, depth: 2.5 }, this._scene);
      sl.position.set(lx, RH-0.02, lz); sl.material = sunM; sl.isPickable = false;
      this._light(lx, RH-0.2, lz, 1.0, 1.0, 0.85, 2.2, 12);
    }

    // Tables x4
    for (const [tx, tz] of [[-3,-25.5],[3,-25.5],[-3,-30.5],[3,-30.5]] as [number,number][]) {
      this._buildCafeTable(tx, tz);
    }

    // Counter along north wall
    const counterM = this._mat(0.60, 0.65, 0.58, 0.08, 0.09, 0.07);
    this._box(12, 0.92, 0.65, 0, 0.46, -33.6, counterM);
    this._box(12, 0.06, 0.65, 0, 0.92, -33.6, this._mat(0.72, 0.78, 0.70));

    // Drone remote on counter
    this._buildDroneRemote(-2, 0.98, -33.3);

    // Drone button 3 — east wall, facing west
    this._buildFlatSwitch(6.92, 2.2, -28.0, -1, 0, 2);

    // Cable car door (east wall) — decorative
    const doorM = this._mat(0.55, 0.55, 0.60, 0.06, 0.06, 0.07);
    this._box(0.15, 2.6, 2.0, 7, 1.3, -28, doorM);
    const signM = this._mat(0.9, 0.75, 0.1, 0.40, 0.30, 0.02);
    this._box(0.08, 0.35, 1.6, 6.96, 2.8, -28, signM);

    // Wall stripe decoration (green stripes)
    const stripeM = this._mat(0.15, 0.55, 0.18, 0.04, 0.15, 0.05);
    for (const sz of [-23.5, -26.5, -29.5, -32.5] as number[]) {
      this._box(14.3, 0.12, 0.06, 0, sz < -28 ? RH-0.4 : 0.35, sz, stripeM);
    }
  }

  private _buildCafeTable(tx: number, tz: number): void {
    const topM  = this._mat(0.78, 0.92, 0.75, 0.10, 0.15, 0.08);
    const legM  = this._mat(0.50, 0.60, 0.50);
    const seatM = this._mat(0.25, 0.80, 0.12, 0.05, 0.18, 0.02);
    this._box(1.4, 0.06, 0.85, tx, 0.76, tz, topM);
    this._box(1.4, 0.76, 0.07, tx, 0.38, tz-0.39, legM);
    this._box(1.4, 0.76, 0.07, tx, 0.38, tz+0.39, legM);
    // Chairs
    for (const [cz, bz] of [[-0.75,-0.96],[0.75,0.96]] as [number,number][]) {
      this._box(0.55, 0.04, 0.45, tx, 0.45, tz+cz, seatM);
      this._box(0.55, 0.36, 0.05, tx, 0.63, tz+bz, seatM);
    }
  }

  private _buildDroneRemote(x: number, y: number, z: number): void {
    const remM  = this._mat(0.10, 0.10, 0.12, 0.01, 0.01, 0.02);
    const antM  = this._mat(0.18, 0.18, 0.20);
    const domeM = this._mat(0.85, 0.05, 0.05, 0.38, 0.01, 0.01);
    const remMesh = this._box(0.20, 0.08, 0.12, x, y, z, remM, true);
    remMesh.name = "drone_remote";
    // Two antennas (like the real game remote)
    this._box(0.025, 0.18, 0.025, x-0.05, y+0.13, z, antM);
    this._box(0.025, 0.18, 0.025, x+0.05, y+0.13, z, antM);
    // Red dome on top
    const dome = MeshBuilder.CreateSphere("", { diameter: 0.06, segments: 6 }, this._scene) as Mesh;
    dome.scaling.y = 0.6; dome.position.set(x, y+0.07, z); dome.material = domeM; dome.isPickable = false;
    const pl = new PointLight("", new Vector3(x, y+0.3, z), this._scene);
    pl.intensity = 0.7; pl.range = 3; pl.diffuse = new Color3(1.0, 0.1, 0.1);

    this._interactables.push({
      mesh: remMesh, id: "drone_remote", label: "[ E ] Pick up Drone Remote",
      onInteract: () => {
        if (this._hasDroneRemote) return;
        this._hasDroneRemote = true;
        remMesh.setEnabled(false); dome.setEnabled(false); pl.setEnabled(false);
        const ii = this._interactables.findIndex(i => i.id === "drone_remote");
        if (ii >= 0) this._interactables.splice(ii, 1);
        // Always show remote in HUD immediately (dead state until batteries in)
        this._hudDrone.style.display = "flex";
        this._hudDrone.innerHTML = this._droneHudHTML(false);
        if (this._hasBat1 && this._hasBat2) {
          this._activateDrone();
        } else {
          const needed = (!this._hasBat1 && !this._hasBat2) ? "2 batteries" : "1 more battery";
          this._flashMsg(`🎮 Remote picked up! Need ${needed} to power it.`);
        }
      },
    });
  }

  private _activateDrone(): void {
    this._droneMesh.setEnabled(true);
    this._hudDrone.style.display = "flex";
    this._hudDrone.innerHTML = this._droneHudHTML();
    this._flashMsg("🚁 Drone ready! Left-click to send drone to the 3 red switches.");
  }

  // ── Drone ──────────────────────────────────────────────────────────────────

  private _buildDrone(): void {
    this._droneMesh = MeshBuilder.CreateSphere("drone3",
      { diameter: 0.18, segments: 7 }, this._scene) as Mesh;
    this._droneMesh.scaling.y = 0.55;
    this._droneMesh.material  = this._mat(0.82, 0.82, 0.86, 0.08, 0.08, 0.10);
    this._droneMesh.isPickable = false;
    this._droneMesh.position.set(0, EYE_Y - 0.3, -1.0);
    this._droneMesh.setEnabled(false);
    const armM   = this._mat(0.55, 0.55, 0.58);
    const rotorM = this._mat(0.20, 0.20, 0.22, 0.05, 0.05, 0.06);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const ax = Math.cos(angle) * 0.16, az = Math.sin(angle) * 0.16;
      const arm = MeshBuilder.CreateBox("", { width: 0.04, height: 0.02, depth: 0.22 }, this._scene);
      arm.rotation.y = -angle; arm.material = armM; arm.isPickable = false;
      arm.parent = this._droneMesh; arm.position.set(ax, 0, az);
      const rotor = MeshBuilder.CreateCylinder("",
        { diameter: 0.14, height: 0.015, tessellation: 8 }, this._scene) as Mesh;
      rotor.material = rotorM; rotor.isPickable = false;
      rotor.parent = this._droneMesh; rotor.position.set(ax * 1.9, 0.02, az * 1.9);
    }
  }

  private _droneHudHTML(working = true): string {
    if (working) return `
      <div style="background:#111214;border-radius:8px;padding:10px 14px 8px;
        border:1.5px solid #3a3a3e;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.7);">
        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:6px;">
          <div style="width:5px;height:15px;background:#555;border-radius:2px;"></div>
          <div style="width:5px;height:15px;background:#555;border-radius:2px;"></div>
        </div>
        <div style="width:32px;height:32px;background:radial-gradient(circle,#ff2222,#990000);
          border-radius:50%;margin:0 auto;border:2px solid #ff5555;
          box-shadow:0 0 12px rgba(255,60,60,0.55);"></div>
        <div style="color:#aaa;font-size:8px;margin-top:5px;letter-spacing:1px;">DRONE REMOTE</div>
      </div>`;
    return `
      <div style="background:#1e1e1e;border-radius:8px;padding:10px 14px 8px;
        border:1.5px solid #555;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.5);">
        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:6px;">
          <div style="width:5px;height:15px;background:#666;border-radius:2px;"></div>
          <div style="width:5px;height:15px;background:#666;border-radius:2px;"></div>
        </div>
        <div style="width:32px;height:32px;background:#333;
          border-radius:50%;margin:0 auto;border:2px solid #777;"></div>
        <div style="color:#aaa;font-size:8px;margin-top:5px;letter-spacing:1px;">NO BATTERIES ⚡</div>
      </div>`;
  }

  private _sendDrone(): void {
    if (!this._hasDroneRemote || !this._hasBat1 || !this._hasBat2) {
      if (this._hasDroneRemote) this._flashMsg("⚡ No batteries! Find 2 AA batteries.");
      return;
    }
    const fwd = new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      -Math.sin(this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch));
    this._droneTarget = this._camera.position.add(fwd.scale(4.5));
    this._droneTarget.y = Math.max(0.3, Math.min(RH - 0.3, this._droneTarget.y));
    this._droneParked = false;
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    const topBar = document.createElement("div");
    topBar.style.cssText =
      "position:absolute;top:0;left:0;right:0;height:48px;background:rgba(0,0,0,0.65);" +
      "display:flex;align-items:center;padding:0 16px;gap:16px;pointer-events:all;z-index:10;";
    topBar.innerHTML = `
      <button id="g3Back" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.75);
        font-size:13px;padding:6px 14px;border-radius:8px;
        border:1px solid rgba(255,255,255,0.2);cursor:pointer;">← Back</button>
      <span style="color:rgba(255,255,255,0.28);font-size:11px;margin-left:auto;">
        WASD · Click to look · E interact · Left-click send drone
      </span>`;
    this._wrap.appendChild(topBar);
    topBar.querySelector("#g3Back")!.addEventListener("click", () => this._cleanup());

    // Crosshair — 3 nested circles (same as Ch2)
    const xh = document.createElement("div");
    xh.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "pointer-events:none;width:28px;height:28px;z-index:10;";
    xh.innerHTML =
      `<div style="position:absolute;inset:0;border-radius:50%;border:2.5px solid white;"></div>
       <div style="position:absolute;inset:7px;border-radius:50%;border:2px solid black;"></div>
       <div style="position:absolute;inset:11px;border-radius:50%;background:white;"></div>`;
    this._wrap.appendChild(xh);

    // Chapter label
    const lbl = document.createElement("div");
    lbl.style.cssText =
      "position:absolute;top:56px;right:12px;color:rgba(100,220,100,0.55);" +
      "font-size:11px;font-weight:bold;letter-spacing:2px;pointer-events:none;z-index:10;";
    lbl.textContent = "CHAPTER 3 — THE GREEN ROOM";
    this._wrap.appendChild(lbl);

    // Drone remote HUD bottom-right (hidden until activated)
    this._hudDrone = document.createElement("div");
    this._hudDrone.style.cssText =
      "position:absolute;bottom:0;right:16px;width:140px;height:110px;" +
      "display:none;align-items:flex-end;justify-content:center;" +
      "pointer-events:none;padding-bottom:10px;z-index:10;";
    this._wrap.appendChild(this._hudDrone);

    // Interaction prompt
    this._hudPrompt = document.createElement("div");
    this._hudPrompt.style.cssText =
      "position:absolute;bottom:90px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:white;font-size:14px;padding:9px 20px;" +
      "border-radius:8px;border:1px solid rgba(255,255,255,0.18);" +
      "display:none;pointer-events:none;white-space:nowrap;z-index:10;";
    this._wrap.appendChild(this._hudPrompt);

    // Start overlay — side panel style matching Ch2
    this._startOverlay = document.createElement("div");
    this._startOverlay.style.cssText = "position:absolute;inset:0;z-index:30;pointer-events:none;";
    this._startOverlay.innerHTML = `
      <div style="position:absolute;inset:0;left:0;width:min(320px,46%);
        background:linear-gradient(105deg,rgba(6,4,10,0.97) 80%,transparent 100%);
        display:flex;flex-direction:column;padding:36px 28px 28px;gap:0;pointer-events:all;">
        <div style="font-family:'Arial Black',Arial;line-height:1.05;margin-bottom:20px;">
          <div style="color:rgba(255,255,255,0.55);font-size:clamp(10px,1.4vw,15px);
            font-weight:900;letter-spacing:3px;">GARTEN OF</div>
          <div style="font-size:clamp(28px,4.5vw,52px);font-weight:900;letter-spacing:2px;">
            <span style="color:#22cc22;">B</span><span style="color:#ff4444;">AN</span><span style="color:#8833ff;">B</span><span style="color:#ff8800;">AN</span>
          </div>
          <div style="color:#22cc22;font-size:clamp(13px,2vw,22px);font-weight:900;
            letter-spacing:2px;margin-top:4px;">CHAPTER 3</div>
          <div style="height:2px;background:linear-gradient(90deg,rgba(34,204,34,0.5),transparent);margin-top:8px;"></div>
        </div>
        <div style="color:rgba(255,255,255,0.45);font-size:clamp(11px,1.4vw,14px);
          font-family:Arial;line-height:1.7;margin-bottom:20px;">
          You enter the Green Room…<br>
          Find 2 batteries + the drone remote.<br>
          Activate 3 red switches. Watch the tape.
        </div>
        <div id="g3Play" style="color:white;font-size:clamp(16px,2.4vw,26px);font-weight:bold;
          font-family:Arial;padding:10px 0 10px 4px;cursor:pointer;
          border-left:3px solid #22cc22;transition:color 0.12s,padding-left 0.12s;"
          onmouseover="this.style.color='#a8ffb8';this.style.paddingLeft='16px'"
          onmouseout="this.style.color='white';this.style.paddingLeft='4px'">▶ Play</div>
        <div style="margin-top:auto;padding-top:16px;">
          <button id="g3MenuBack" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);
            font-size:12px;padding:6px 14px;border-radius:16px;
            border:1px solid rgba(255,255,255,0.14);cursor:pointer;font-family:Arial;">← Menu</button>
        </div>
      </div>`;
    this._wrap.appendChild(this._startOverlay);
    setTimeout(() => {
      this._startOverlay.querySelector("#g3Play")?.addEventListener("pointerdown", () => this._doStart());
      this._startOverlay.querySelector("#g3MenuBack")?.addEventListener("pointerdown", () => this._cleanup());
    }, 0);
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private _doStart(): void {
    if (this._started) return;
    this._started = true;
    this._startOverlay.style.opacity = "0";
    this._startOverlay.style.transition = "opacity 0.4s";
    setTimeout(() => { this._startOverlay.style.display = "none"; }, 400);
    this._canvas.requestPointerLock?.();
  }

  private _setupInput(): void {
    this._kd = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (!this._started) this._doStart();
      if (e.code === "F2") { e.preventDefault(); this._toggleAdmin(); }
      if (e.code === "KeyE") this._tryInteract();
      if (e.code === "KeyF" && this._inBabyBirdArea && this._hasMedal2 && !this._isDead && !this._opiillaDistracted) {
        this._opiillaDistracted = true;
        this._opiillaDistractTimer = 8.0;
        this._hasMedal2 = false;
        // Instantly land Opiilla on the medal — area is safe immediately
        this._opiillaMesh.position.set(4, 0.8, 28);
        this._flashMsg("🏅 Medal thrown! Blue Opiilla landed on it — grab the baby bird FAST!");
      }
      if (e.code === "Escape") this._cleanup();
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
    };
    this._ku = (e: KeyboardEvent) => this._keys.delete(e.code);
    document.addEventListener("keydown", this._kd);
    document.addEventListener("keyup",   this._ku);

    this._mm = (e: MouseEvent) => {
      if (document.pointerLockElement !== this._canvas) return;
      this._yaw   += e.movementX * 0.0022;
      this._pitch  = Math.max(-0.48, Math.min(0.48, this._pitch + e.movementY * 0.0022));
    };
    document.addEventListener("mousemove", this._mm);

    this._mc = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!this._started) { this._doStart(); return; }
      if (document.pointerLockElement !== this._canvas) { this._canvas.requestPointerLock?.(); return; }
      this._sendDrone();
    };
    this._canvas.addEventListener("pointerdown", this._mc);

    this._rz = () => this._engine.resize();
    window.addEventListener("resize", this._rz);
  }

  private _tryInteract(): void { this._aimedAt?.onInteract(); }

  // ── Tick ───────────────────────────────────────────────────────────────────

  private _tick(dt: number): void {
    if (!this._started) return;
    dt = Math.min(dt, 0.05);

    // ── Replay playback (runs instead of normal tick after death) ──────────
    if (this._isReplaying) {
      this._replayHead += dt * 0.5; // 0.5× speed
      const buf = this._replayBuf;
      if (buf.length > 1) {
        const targetT = buf[0].t + this._replayHead;
        let fi = buf.length - 1;
        for (let i = 0; i < buf.length - 1; i++) { if (buf[i + 1].t >= targetT) { fi = i; break; } }
        const f = buf[fi];
        this._camera.position.set(f.x, f.y, f.z);
        this._yaw = f.yaw; this._pitch = f.pitch;
        this._camera.rotation.set(f.pitch, f.yaw, 0);
      }
      return;
    }

    this._yaw   += gpState.rx * dt * 2.2;
    this._pitch  = Math.max(-0.48, Math.min(0.48, this._pitch + gpState.ry * dt * 1.8));
    this._camera.rotation.set(this._pitch, this._yaw, 0);

    if (gpState.btnSquare && !this._prevBtnSq) this._tryInteract();
    this._prevBtnSq = gpState.btnSquare;
    if (gpState.btnRT && !this._prevBtnRT) this._sendDrone();
    this._prevBtnRT = gpState.btnRT;

    // Movement
    const sin = Math.sin(this._yaw), cos = Math.cos(this._yaw);
    const fwd = new Vector3(sin, 0, cos);
    const rgt = new Vector3(cos, 0, -sin);
    let mv = Vector3.Zero();
    if (this._keys.has("KeyW")||this._keys.has("ArrowUp"))    mv.addInPlace(fwd);
    if (this._keys.has("KeyS")||this._keys.has("ArrowDown"))  mv.subtractInPlace(fwd);
    if (this._keys.has("KeyA")||this._keys.has("ArrowLeft"))  mv.subtractInPlace(rgt);
    if (this._keys.has("KeyD")||this._keys.has("ArrowRight")) mv.addInPlace(rgt);
    if (Math.abs(gpState.lx) > 0.12) mv.addInPlace(rgt.scale(gpState.lx));
    if (Math.abs(gpState.ly) > 0.12) mv.subtractInPlace(fwd.scale(gpState.ly));

    const floorEye = this._getFloorEyeY(this._camera.position.z);
    if ((this._keys.has("Space") || gpState.btnA) && this._camera.position.y <= floorEye + 0.05) this._velY = 6;
    this._velY -= 20 * dt;
    this._camera.position.y += this._velY * dt;
    if (this._camera.position.y < floorEye) { this._camera.position.y = floorEye; this._velY = 0; }

    if (mv.lengthSquared() > 0) {
      mv.normalize().scaleInPlace(SPD * dt);
      const np = this._camera.position.add(new Vector3(mv.x, 0, mv.z));
      np.y = this._camera.position.y;

      // Zone-based bounds + doorway gates
      const prevZ = this._camera.position.z;

      if (this._inMaze) {
        // ── Maze zone bounds ──────────────────────────────────────────────
        const mz = np.z;
        if (mz > -353)      np.x = Math.max(-1.5, Math.min(1.5, np.x));  // entry
        else if (mz > -356) np.x = Math.max(-4.5, Math.min(4.5, np.x)); // T-junction 1
        else if (mz > -364) np.x = Math.max(-4.5, Math.min(4.5, np.x)); // allow dead-end (kill handles it)
        else if (mz > -367) np.x = Math.max(-1.5, Math.min(4.5, np.x)); // corner
        else if (mz > -375) np.x = Math.max(-1.5, Math.min(1.5, np.x)); // middle corridor
        else if (mz > -378) np.x = Math.max(-4.5, Math.min(4.5, np.x)); // T-junction 2
        else if (mz > -386) np.x = Math.max(-4.5, Math.min(4.5, np.x)); // allow dead-end (kill handles it)
        else if (mz > -389) np.x = Math.max(-4.5, Math.min(1.5, np.x)); // corner
        else                np.x = Math.max(-1.5, Math.min(1.5, np.x)); // exit
        np.z = Math.max(-397, Math.min(-345, np.z));
      } else if (this._inCastle) {
        np.x = Math.max(-7.0, Math.min(7.0, np.x));
        np.z = Math.max(-345, Math.min(-283, np.z));
      } else if (this._inNursery) {
        np.x = Math.max(-6.5, Math.min(6.5, np.x));
        np.z = Math.max(-220, Math.min(-200, np.z));
      } else if (this._inBabyBirdArea) {
        np.x = Math.max(-7.8, Math.min(7.8, np.x));
        np.z = Math.max(14, Math.min(65, np.z));
      } else {
        np.z = Math.max(-75, Math.min(-0.4, np.z));

        // Green room → corridor gate at z=-10 (door: |x|<1.45)
        if (np.z <= -10.0 && prevZ > -10.0 && Math.abs(np.x) > 1.45) np.z = prevZ;
        // Cafeteria → corridor gate at z=-22 (door: |x|<1.45)
        if (np.z > -22.0 && prevZ <= -22.0 && Math.abs(np.x) > 1.45) np.z = prevZ;
        // Underground door gate at z=-56 (blocks unless door open)
        if (!this._orangeDoorOpen && np.z <= -56.0 && prevZ > -56.0) np.z = prevZ;

        if (np.z > -10.0) {
          // Green room
          np.x = Math.max(-4.6, Math.min(4.6, np.x));
          // Tree trunk collision
          const tx = np.x, tz = np.z + 5;
          if (Math.sqrt(tx*tx + tz*tz) < 0.72) {
            const ang = Math.atan2(tx, tz);
            np.x = Math.sin(ang) * 0.72; np.z = Math.cos(ang) * 0.72 - 5;
          }
        } else if (np.z > -22.0) {
          np.x = Math.max(-1.75, Math.min(1.75, np.x)); // corridor
        } else if (np.z > -34.0) {
          np.x = Math.max(-6.6, Math.min(6.6, np.x));   // cafeteria
        } else if (np.z > -48.0) {
          np.x = Math.max(-7.6, Math.min(7.6, np.x));   // lobby
        } else if (np.z > -58.0) {
          np.x = Math.max(-2.8, Math.min(2.8, np.x));   // staircase
        } else {
          np.x = Math.max(-11.5, Math.min(11.5, np.x)); // underground
        }
      }

      this._camera.position.copyFrom(np);
    }

    // ── Elevator Y snap ────────────────────────────────────────────────────
    if (this._elevatorState !== 'down') {
      const p = this._camera.position;
      if (Math.abs(p.x - ELEV_X) < 0.95 && Math.abs(p.z - ELEV_Z) < 1.25) {
        p.y = this._elevatorY + EYE_Y;
        this._velY = 0;
      }
    }

    // ── Elevator animation ──────────────────────────────────────────────────
    const ESPD = 2.5;
    if (this._elevatorState === 'up') {
      this._elevatorY = Math.min(ELEV_TOP, this._elevatorY + ESPD * dt);
      this._elevatorPlatform.position.y = this._elevatorY + 0.075;
      if (this._elevatorY >= ELEV_TOP) { this._elevatorState = 'top'; this._elevatorTimer = 0; }
    } else if (this._elevatorState === 'top') {
      this._elevatorTimer += dt;
      if (this._elevatorTimer > 8 && !this._hasOrangeKey) this._elevatorState = 'return';
    } else if (this._elevatorState === 'return') {
      this._elevatorY = Math.max(0, this._elevatorY - ESPD * dt);
      this._elevatorPlatform.position.y = this._elevatorY + 0.075;
      if (this._elevatorY <= 0) this._elevatorState = 'down';
    }

    // ── Stinger Flyn bob ───────────────────────────────────────────────────
    if (this._stingerFlynMesh && !this._dreamActive) {
      const tSec = performance.now() / 1000;
      this._stingerFlynMesh.position.y = this._stingerFlynBaseY + Math.sin(tSec * 0.5) * 0.3;
    }

    // ── Maze death zones ──────────────────────────────────────────────────────
    if (this._inMaze && !this._isDead && !this._isReplaying) {
      const px = this._camera.position.x;
      const pz = this._camera.position.z;
      // Wrong left at first T-junction
      if (px < -1.5 && pz < -355 && pz > -365) { this._killPlayer(); return; }
      // Wrong right at second T-junction
      if (px >  1.5 && pz < -377 && pz > -387) { this._killPlayer(); return; }
      // Escape!
      if (pz <= -394) { this._mazeEscape(); return; }
    }

    // ── Baby bird area: Stinger Flynn patrol + proximity death ───────────────
    if (this._inBabyBirdArea && !this._isDead && !this._isReplaying) {
      // Show persistent throw hint when holding medal
      if (this._hasMedal2 && !this._opiillaDistracted && !this._hudPrompt.textContent?.includes("Opiilla")) {
        this._hudPrompt.textContent = "🏅 Press [F] to throw the medal at Blue Opiilla!";
        this._hudPrompt.style.display = "block";
      }
      if (!this._opiillaDistracted) {
        // Blue Opiilla patrols a circle around the baby bird — at head height so very visible
        this._opiillaAngle += dt * 0.9;
        this._opiillaMesh.position.set(
          Math.cos(this._opiillaAngle) * 5.0,
          EYE_Y + 2.5 + Math.sin(this._opiillaAngle * 1.3) * 0.4,
          45 + Math.sin(this._opiillaAngle) * 5.0,
        );
        // Kill if Blue Opiilla herself flies into the player
        const pc = this._camera.position;
        const op = this._opiillaMesh.position;
        const opDist = Math.sqrt((pc.x - op.x) ** 2 + (pc.z - op.z) ** 2);
        if (opDist < 1.8) { this._killPlayer(); return; }
      } else {
        // Blue Opiilla swoops down toward the thrown medal
        this._opiillaDistractTimer -= dt;
        const mpos = new Vector3(4, 0.8, 28);
        const fpos = this._opiillaMesh.position;
        const fd = mpos.subtract(fpos);
        if (fd.length() > 0.15) this._opiillaMesh.position.addInPlace(fd.normalize().scaleInPlace(Math.min(fd.length(), 7.0 * dt)));
        if (this._opiillaDistractTimer <= 0) {
          this._opiillaDistracted = false;
          if (this._babyBirdPickupMesh.isEnabled()) this._flashMsg("⚠️ Blue Opiilla is free again!");
        }
      }
    }

    // ── Naughty ones chase (castle throne room) ───────────────────────────────
    if (this._inCastle && !this._inMaze && this._naughtyActive && !this._isDead) {
      for (const nm of this._naughtyMeshes) {
        const d = this._camera.position.subtract(nm.position); d.y = 0;
        const dist = d.length();
        if (dist < 0.1) continue;
        nm.position.addInPlace(d.normalize().scaleInPlace(Math.min(dist, 1.6 * dt)));
        if (dist < 1.4) { this._killPlayer(); return; }
      }
      // If player reaches maze entrance they're safe from naughty ones
      if (this._camera.position.z <= -343) {
        this._naughtyActive = false;
        this._inMaze = true;
        this._flashMsg("🏃 You enter the castle maze — find the way out!");
      }
    }

    // ── Joker dialogue trigger (enter throne room) ────────────────────────────
    if (this._inCastle && !this._throneDialogDone && !this._inMaze) {
      if (this._camera.position.z <= -305) {
        this._showJokerDialogue();
      }
    }

    // ── Hint drone (nursery) ──────────────────────────────────────────────────
    if (this._inNursery && this._hintDroneMesh) {
      this._hintTimer += dt;
      if (this._hintTimer > 2.5) { this._hintTimer = 0; this._hintPhase = (this._hintPhase + 1) % 3; }
      const targetBtnIdx = this._xCorrectOrder[this._hintPhase];
      const targetBtn    = this._xBtnMeshes[targetBtnIdx];
      if (targetBtn) {
        const hover = new Vector3(targetBtn.position.x, targetBtn.position.y + 1.3, targetBtn.position.z);
        const hdir  = hover.subtract(this._hintDroneMesh.position);
        const hlen  = hdir.length();
        if (hlen > 0.05) this._hintDroneMesh.position.addInPlace(hdir.normalize().scaleInPlace(Math.min(hlen, 5 * dt)));
      }
      this._hintDroneMesh.rotation.y += dt * 5;
      const phaseLabels = ["1ST", "2ND", "3RD"];
      if (this._hintLabel) this._hintLabel.textContent = `🤖 ${phaseLabels[this._hintPhase]}`;
    }

    // ── Jumbo Josh (nursery) ──────────────────────────────────────────────────
    if (this._inNursery && this._jumboJoshActive && !this._isDead) {
      const jj  = this._jumboJoshMesh.position;
      const cam = this._camera.position;
      const jdir = new Vector3(cam.x - jj.x, 0, cam.z - jj.z);
      const jdist = jdir.length();
      if (jdist > 0.1) this._jumboJoshMesh.position.addInPlace(jdir.normalize().scaleInPlace(Math.min(jdist, 2.8 * dt)));
      if (jdist < 1.4) this._killPlayer();
    }

    // Drone movement
    const droneReady = this._hasDroneRemote && this._hasBat1 && this._hasBat2;
    if (droneReady) {
      this._droneMesh.rotation.y += dt * 3.5;
      if (this._droneTarget) {
        const dir = this._droneTarget.subtract(this._droneMesh.position);
        const len = dir.length();
        if (len < 0.12) {
          this._droneMesh.position.copyFrom(this._droneTarget);
          this._droneTarget = null; this._droneParked = true;
        } else {
          this._droneMesh.position.addInPlace(dir.normalize().scaleInPlace(Math.min(len, 9 * dt)));
        }
      } else if (!this._droneParked) {
        const t = performance.now() / 1000;
        const ideal = this._camera.position.add(new Vector3(
          Math.sin(this._yaw) * 0.75 + Math.cos(t*0.8) * 0.18,
          -0.25 + Math.sin(t*1.4) * 0.06,
          Math.cos(this._yaw) * 0.75));
        this._droneMesh.position.addInPlace(
          ideal.subtract(this._droneMesh.position).scaleInPlace(dt * 4));
      }

      // Drone → button proximity
      const dp = this._droneMesh.position;
      for (let bi = 0; bi < 3; bi++) {
        if (this._drBtnPressed[bi]) continue;
        const [bx, by, bz] = this._drBtnWorldPos[bi];
        const dx = dp.x-bx, dy = dp.y-by, dz = dp.z-bz;
        if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 0.40) this._pressDroneBtn(bi);
      }
    }

    // Crosshair detection
    const cam = this._camera.position;
    const cfwd = new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      -Math.sin(this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch));
    let newAimed: Interactable3 | null = null;
    for (const item of this._interactables) {
      if (!item.mesh.isEnabled()) continue;
      const toItem = item.mesh.position.subtract(cam);
      if (toItem.length() > E_DIST) continue;
      if (Vector3.Dot(toItem.normalize(), cfwd) > 0.78) { newAimed = item; break; }
    }
    if (newAimed?.mesh !== this._aimedAt?.mesh) {
      if (this._aimedAt) this._aimedAt.mesh.renderOutline = false;
      if (newAimed) {
        newAimed.mesh.renderOutline = true;
        newAimed.mesh.outlineColor  = new Color3(1, 1, 1);
        newAimed.mesh.outlineWidth  = 0.06;
      }
      this._aimedAt = newAimed;
    }
    const label = newAimed?.label ?? "";
    this._hudPrompt.textContent = label;
    this._hudPrompt.style.display = label ? "block" : "none";

    // ── Record frame for replay buffer (rolling 5-second window) ──────────
    const now = performance.now() / 1000;
    this._replayBuf.push({ x: this._camera.position.x, y: this._camera.position.y, z: this._camera.position.z, yaw: this._yaw, pitch: this._pitch, t: now });
    while (this._replayBuf.length > 1 && now - this._replayBuf[0].t > 5.2) this._replayBuf.shift();
  }

  private _pressDroneBtn(bi: number): void {
    this._drBtnPressed[bi] = true; this._drBtnCount++;
    this._flashScreen("rgba(55,170,255,0.15)");
    this._flashMsg(`🔴 Switch ${bi+1} activated! (${this._drBtnCount}/3)`);
    if (this._drBtnMats[bi]) {
      this._drBtnMats[bi].diffuseColor  = new Color3(0.05, 0.80, 0.05);
      this._drBtnMats[bi].emissiveColor = new Color3(0.02, 0.40, 0.02);
    }
    if (this._drBtnCount >= 3) {
      setTimeout(() => {
        this._flashMsg("✅ All switches activated! The TV is powered on!");
        this._screenMat.emissiveColor = new Color3(0.02, 0.04, 0.08);
        this._screenMat.diffuseColor  = new Color3(0.06, 0.10, 0.18);
      }, 800);
    }
  }

  // ── Secret video ───────────────────────────────────────────────────────────

  private _playSecretVideo(): void {
    this._screenMat.emissiveColor = new Color3(0.05, 0.35, 0.55);
    this._screenMat.diffuseColor  = new Color3(0.15, 0.55, 0.80);
    const glow = new PointLight("tvglow", this._screenMesh.position.clone(), this._scene);
    glow.intensity = 1.2; glow.range = 6; glow.diffuse = new Color3(0.3, 0.7, 1.0);
    let f = 0;
    const flicker = setInterval(() => {
      f++;
      this._screenMat.emissiveColor = f % 2 === 0
        ? new Color3(0.05, 0.35, 0.55) : new Color3(0.8, 0.8, 0.9);
      if (f >= 8) {
        clearInterval(flicker);
        this._screenMat.emissiveColor = new Color3(0.06, 0.55, 0.70);
        this._showVideoOverlay();
      }
    }, 80);
  }

  private _showVideoOverlay(): void {
    document.exitPointerLock?.();
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:18px;font-family:'Arial Black',Arial;pointer-events:all;";
    ov.innerHTML = `
      <style>
        @keyframes scanline{0%{top:0%}100%{top:100%}}
        @keyframes tvIn{from{opacity:0;transform:scaleY(0.02)}to{opacity:1;transform:scaleY(1)}}
        @keyframes blink3{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes flicker{0%,100%{opacity:1}47%{opacity:0.95}50%{opacity:0.4}53%{opacity:0.96}}
        @keyframes clockpulse{0%,100%{text-shadow:0 0 18px #ff2222,0 0 36px #880000}50%{text-shadow:0 0 6px #ff2222}}
      </style>
      <div style="border:6px solid #1a0000;border-radius:12px;background:#0a0000;overflow:hidden;
        position:relative;animation:tvIn 0.4s ease-out both,flicker 5s infinite;
        box-shadow:0 0 60px rgba(180,0,0,0.25);width:min(680px,92vw);padding:28px 36px;text-align:center;">
        <div style="position:absolute;left:0;right:0;height:3px;background:rgba(255,255,255,0.05);
          animation:scanline 2.2s linear infinite;pointer-events:none;"></div>
        <div style="color:rgba(255,30,30,0.55);font-size:11px;letter-spacing:5px;margin-bottom:18px;opacity:0.8;">
          📼 SECURITY TAPE — RESTRICTED
        </div>
        <div style="font-size:clamp(38px,7vw,68px);color:#ff2222;font-family:monospace;font-weight:900;
          letter-spacing:8px;animation:clockpulse 1s infinite;margin-bottom:20px;">
          03:00 AM
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:18px;gap:0;">
          <div style="width:54px;height:54px;background:#000;border-radius:50%;
            border:2px solid #1c1c1c;display:flex;align-items:center;justify-content:center;
            box-shadow:0 0 20px rgba(0,0,0,1);">
            <span style="color:rgba(210,210,255,0.75);font-size:26px;font-weight:900;
              font-family:'Arial Black',Arial;text-shadow:0 0 10px rgba(200,200,255,0.7);">?</span>
          </div>
          <div style="width:14px;height:8px;background:#000;"></div>
          <div style="width:44px;height:88px;background:#000;border:1px solid #111;"></div>
          <div style="display:flex;gap:6px;">
            <div style="width:18px;height:42px;background:#000;border:1px solid #111;"></div>
            <div style="width:18px;height:42px;background:#000;border:1px solid #111;"></div>
          </div>
        </div>
        <div style="color:rgba(255,70,70,0.8);font-size:clamp(12px,1.8vw,15px);line-height:2;
          max-width:460px;margin:0 auto 20px;font-family:Arial;">
          It appears on the camera every night at exactly 3:00 AM.<br>
          <b>No eyes. No mouth.</b> Only the question mark.<br><br>
          <span style="color:#ff3333;animation:blink3 0.9s infinite;display:inline-block;">
            IT HAS BEEN THERE EVERY NIGHT FOR SIX MONTHS.
          </span>
        </div>
        <div style="color:rgba(255,0,0,0.4);font-size:11px;letter-spacing:3px;animation:blink3 1.5s infinite;">
          ◼ BANBAN CORP. SECURITY — DO NOT DISTRIBUTE ◼
        </div>
      </div>`;
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Stop Tape";
    closeBtn.style.cssText = "background:rgba(255,255,255,0.1);color:#fff;font-size:15px;" +
      "padding:10px 28px;border-radius:30px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;";
    closeBtn.onclick = () => { ov.remove(); this._canvas.requestPointerLock?.(); };
    ov.appendChild(closeBtn);
    document.body.appendChild(ov);
  }

  // ── Floor Y ────────────────────────────────────────────────────────────────

  private _getFloorEyeY(z: number): number {
    if (z >= 15) {
      // Stair ramp z=52–62 rises 3 units
      if (z >= 52 && z <= 62) return EYE_Y + ((z - 52) / 10) * 3.0;
      if (z > 62) return EYE_Y + 3.0;
      return EYE_Y;
    }
    if (z <= -280) return EYE_Y;    // castle / maze — normal floor
    if (z <= -200) return EYE_Y;    // nursery — normal floor
    if (z >= -48) return EYE_Y;
    if (z >= -56) return EYE_Y - ((-z - 48) / 8) * 6;
    return EYE_Y - 6;
  }

  // ── Lobby (z: -34 → -48, x: -8 → 8) ─────────────────────────────────────

  private _buildLobby(): void {
    const wallM  = this._mat(0.52, 0.30, 0.10, 0.10, 0.05, 0.01);
    const floorM = this._mat(0.52, 0.52, 0.55, 0.05, 0.05, 0.06);
    const ceilM  = this._mat(0.45, 0.45, 0.48, 0.04, 0.04, 0.05);

    const lf = MeshBuilder.CreateGround("", { width: 16, height: 14 }, this._scene);
    lf.position.set(0, 0, -41); lf.material = floorM;
    const lc = MeshBuilder.CreateGround("", { width: 16, height: 14 }, this._scene);
    lc.rotation.x = Math.PI; lc.position.set(0, RH, -41); lc.material = ceilM;

    this._box(0.15, RH, 14, -8, RH/2, -41, wallM, false, true); // west
    this._box(0.15, RH, 14,  8, RH/2, -41, wallM, false, true); // east
    // North wall with staircase gap (3 wide)
    this._box(6.5, RH, 0.15, -4.75, RH/2, -48, wallM, false, true);
    this._box(6.5, RH, 0.15,  4.75, RH/2, -48, wallM, false, true);

    // Ceiling lights
    for (const [lx, lz] of [[-3,-37],[3,-37],[-3,-44],[3,-44]] as [number,number][]) {
      const sunM = this._mat(1.0, 0.85, 0.60, 0.85, 0.65, 0.30);
      const sl = MeshBuilder.CreateBox("", { width: 0.18, height: 0.04, depth: 2.0 }, this._scene);
      sl.position.set(lx, RH-0.02, lz); sl.material = sunM; sl.isPickable = false;
      this._light(lx, RH-0.2, lz, 1.0, 0.80, 0.45, 2.0, 11);
    }

    // Table with orange keycard on it
    const tableM = this._mat(0.50, 0.38, 0.22, 0.05, 0.04, 0.02);
    const legM   = this._mat(0.40, 0.28, 0.14);
    this._box(1.2, 0.06, 0.70, -5.0, 0.88, -40.0, tableM); // tabletop
    for (const [lx, lz] of [[-5.52,-39.68],[-4.48,-39.68],[-5.52,-40.32],[-4.48,-40.32]] as [number,number][]) {
      this._box(0.07, 0.88, 0.07, lx, 0.44, lz, legM);
    }
    // Orange keycard flat on table surface
    const km  = this._mat(1.0, 0.55, 0.04, 0.65, 0.28, 0.01);
    const kc  = this._box(0.32, 0.04, 0.20, -5.0, 0.95, -40.0, km, true);
    kc.name   = "orange_key";
    const kpl = new PointLight("", new Vector3(-5.0, 1.4, -40.0), this._scene);
    kpl.intensity = 1.8; kpl.range = 5; kpl.diffuse = new Color3(1.0, 0.55, 0.05);
    this._interactables.push({
      mesh: kc, id: "orange_key", label: "[ E ] Pick up Orange Keycard",
      onInteract: () => {
        if (this._hasOrangeKey) return;
        this._hasOrangeKey = true;
        kc.setEnabled(false); kpl.setEnabled(false);
        const ii = this._interactables.findIndex(i => i.id === "orange_key");
        if (ii >= 0) this._interactables.splice(ii, 1);
        this._flashMsg("🔑 Orange Keycard! Use it on the door at the bottom of the stairs.");
      },
    });
  }

  // ── Elevator shaft (north-west corner of lobby) ───────────────────────────

  private _buildElevatorShaft(): void {
    const shaftM = this._mat(0.22, 0.22, 0.25, 0.01, 0.01, 0.02);
    const shaftH = ELEV_TOP + 2;

    // Three walls of shaft (east side open to lobby)
    this._box(0.15, shaftH, 4, -7.92, shaftH/2, ELEV_Z, shaftM);        // west wall
    this._box(3.0,  shaftH, 0.15, ELEV_X, shaftH/2, -43,   shaftM);     // south wall
    this._box(3.0,  shaftH, 0.15, ELEV_X, shaftH/2, -46,   shaftM);     // north wall
    this._box(3.0,  0.15,   3.0,  ELEV_X, shaftH,   ELEV_Z, shaftM);    // top

    // Elevator platform
    const platM = this._mat(0.50, 0.50, 0.55, 0.05, 0.05, 0.06);
    this._elevatorPlatform = this._box(2.6, 0.15, 2.6, ELEV_X, 0.075, ELEV_Z, platM);
    this._elevatorPlatform.isPickable = false;

    // Call button (east face of shaft, lobby side)
    const btnM   = this._mat(0.80, 0.80, 0.15, 0.35, 0.35, 0.04);
    const callBtn = this._box(0.20, 0.20, 0.14, -3.6, 1.3, -44.5, btnM, true);
    callBtn.name  = "elev_btn";
    this._box(0.06, 0.45, 0.36, -3.53, 1.3, -44.5, this._mat(0.18, 0.18, 0.20)); // panel backing
    this._interactables.push({
      mesh: callBtn, id: "elev_btn", label: "[ E ] Call Elevator",
      onInteract: () => {
        if (this._elevatorState === 'down') {
          this._elevatorState = 'up';
          this._flashMsg("⬆ Elevator ascending…");
        } else if (this._elevatorState === 'top') {
          this._elevatorState = 'return';
          this._flashMsg("⬇ Elevator descending…");
        } else {
          this._flashMsg("Elevator is moving…");
        }
      },
    });

    // Glowing orb at shaft top — just atmosphere
    const orbM = this._mat(0.8, 0.7, 0.3, 0.6, 0.5, 0.1);
    const orb  = MeshBuilder.CreateSphere("", { diameter: 0.22, segments: 6 }, this._scene) as Mesh;
    orb.position.set(ELEV_X, ELEV_TOP + 0.3, ELEV_Z); orb.material = orbM; orb.isPickable = false;

    this._light(ELEV_X, shaftH / 2, ELEV_Z, 1.0, 0.8, 0.4, 1.5, shaftH + 2);
  }

  // ── Staircase (z: -48 → -56, descends 6 units) ────────────────────────────

  private _buildStaircase(): void {
    const stepM = this._mat(0.42, 0.40, 0.38, 0.03, 0.03, 0.03);
    const wallM = this._mat(0.28, 0.25, 0.30, 0.02, 0.02, 0.02);
    const STEPS = 8, SD = 1.0, SH = 0.75;
    for (let i = 0; i < STEPS; i++) {
      const sz = -48 - i * SD - SD / 2;
      const sy = -i * SH;
      this._box(3, 0.15, SD,   0, sy,          sz,         stepM); // tread
      this._box(3, SH,   0.15, 0, sy - SH / 2, sz - SD/2,  stepM); // riser
    }
    this._box(0.15, 7, 8, -1.5, -3.0, -52, wallM, false, true); // left wall
    this._box(0.15, 7, 8,  1.5, -3.0, -52, wallM, false, true); // right wall
    this._light(0, 0, -52, 0.6, 0.4, 0.9, 0.5, 14);
  }

  // ── Underground (z: -56 → -76, floor at y=-6) ─────────────────────────────

  private _buildUnderground(): void {
    const wallM  = this._mat(0.14, 0.11, 0.18, 0.02, 0.01, 0.03);
    const floorM = this._mat(0.18, 0.16, 0.20, 0.02, 0.01, 0.02);
    const ceilM  = this._mat(0.10, 0.08, 0.14, 0.01, 0.01, 0.02);
    const FL = UG_FLOOR, RH2 = 10;

    const uf = MeshBuilder.CreateGround("", { width: 24, height: 20 }, this._scene);
    uf.position.set(0, FL, -66); uf.material = floorM;
    const uc = MeshBuilder.CreateGround("", { width: 24, height: 20 }, this._scene);
    uc.rotation.x = Math.PI; uc.position.set(0, FL + RH2, -66); uc.material = ceilM;

    this._box(0.2, RH2, 20, -12, FL + RH2/2, -66, wallM, false, true); // west
    this._box(0.2, RH2, 20,  12, FL + RH2/2, -66, wallM, false, true); // east
    this._box(24.4, RH2, 0.2, 0, FL + RH2/2, -76, wallM, false, true); // north
    // South wall with staircase gap (3 wide)
    this._box(10.5, RH2, 0.2, -6.75, FL + RH2/2, -56, wallM, false, true);
    this._box(10.5, RH2, 0.2,  6.75, FL + RH2/2, -56, wallM, false, true);

    // Ambient + glowing mushrooms
    const uamb = new HemisphericLight("ugAmb", new Vector3(0, 1, 0), this._scene);
    uamb.intensity = 0.35; uamb.diffuse = new Color3(0.25, 0.15, 0.55);
    uamb.groundColor = new Color3(0.10, 0.08, 0.20);

    const musM = this._mat(0.45, 0.08, 0.75, 0.22, 0.03, 0.38);
    for (const [mx, mz] of [[-9,-60],[-9,-73],[9,-60],[9,-73],[-5,-67],[5,-67],[-3,-71],[3,-61]] as [number,number][]) {
      const cap = MeshBuilder.CreateSphere("", { diameter: 0.55, segments: 6 }, this._scene) as Mesh;
      cap.position.set(mx, FL + 0.28, mz); cap.material = musM; cap.isPickable = false;
      this._box(0.12, 0.35, 0.12, mx, FL + 0.175, mz, this._mat(0.65, 0.60, 0.55));
      this._light(mx, FL + 1, mz, 0.45, 0.08, 0.80, 0.4, 5);
    }

    this._buildUndergroundDoor();

    this._stingerFlynBaseY = FL + 5;
    this._buildStingerFlyn(0, this._stingerFlynBaseY, -68);
  }

  private _buildUndergroundDoor(): void {
    const FL  = UG_FLOOR, RH2 = 10;
    // Player camera Y at staircase bottom = EYE_Y - 6 ≈ -4.35
    const PLAYER_EYE_Y = EYE_Y + UG_FLOOR; // ≈ -4.35

    // Door mesh fills the 3-wide gap in the south wall at z=-56
    const odM = this._mat(0.90, 0.42, 0.02, 0.50, 0.18, 0.01);
    this._orangeDoorMesh = this._box(3.0, RH2, 0.22, 0, FL + RH2/2, -56, odM, false, true);
    this._orangeDoorMesh.name = "underground_door";
    // Frame pillars
    const frmM = this._mat(0.60, 0.30, 0.06, 0.15, 0.06, 0.01);
    this._box(0.22, RH2 + 0.2, 0.26, -1.5, FL + RH2/2, -56, frmM);
    this._box(0.22, RH2 + 0.2, 0.26,  1.5, FL + RH2/2, -56, frmM);
    // Decorative reader panel on the wall (visual only)
    const readerM = this._mat(0.30, 0.28, 0.32, 0.04, 0.04, 0.05);
    this._box(0.35, 0.55, 0.12, 0.9, PLAYER_EYE_Y, -55.88, readerM);
    this._box(0.18, 0.18, 0.08, 0.9, PLAYER_EYE_Y, -55.82, this._mat(0.9, 0.6, 0.1, 0.50, 0.28, 0.02));
    const rdPl = new PointLight("", new Vector3(0, PLAYER_EYE_Y + 0.4, -55.7), this._scene);
    rdPl.intensity = 0.7; rdPl.range = 4; rdPl.diffuse = new Color3(1.0, 0.6, 0.1);
    // Keycard slot — small pickable box at player eye level, centred on door face
    // Player walks straight at it (x=0, z≈-55.5→-55.9), dot product stays high
    const slotM = this._mat(0.6, 0.4, 0.1, 0.3, 0.18, 0.02);
    const slot  = this._box(0.28, 0.20, 0.14, 0, PLAYER_EYE_Y, -55.9, slotM, true);
    slot.name   = "door_slot";
    this._interactables.push({
      mesh: slot, id: "underground_door",
      label: "[ E ] Use Orange Keycard",
      onInteract: () => {
        if (!this._hasOrangeKey) { this._flashMsg("🔑 You need the Orange Keycard!"); return; }
        if (this._orangeDoorOpen) return;
        this._orangeDoorOpen = true;
        rdPl.setEnabled(false);
        slot.setEnabled(false);
        this._playDoorSound();
        this._flashMsg("🔓 The door groans open…");
        // Slide door to the left
        let progress = 0;
        const slide = setInterval(() => {
          progress = Math.min(1, progress + 0.04);
          this._orangeDoorMesh.position.x = -3.5 * progress;
          if (progress >= 1) {
            clearInterval(slide);
            this._orangeDoorMesh.checkCollisions = false;
            const ii = this._interactables.findIndex(i => i.id === "underground_door");
            if (ii >= 0) this._interactables.splice(ii, 1);
          }
        }, 16);
        // Sound wakes Stinger Flyn
        if (!this._stingerFlynWoken) {
          this._stingerFlynWoken = true;
          setTimeout(() => this._showStingerFlynDialogue(), 1600);
        }
      },
    });
  }

  private _playDoorSound(): void {
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(170, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(52, ctx.currentTime + 1.8);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);
      osc.start(); osc.stop(ctx.currentTime + 2.2);
      // Second creak layer
      const osc2  = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(230, ctx.currentTime + 0.3);
      osc2.frequency.exponentialRampToValueAtTime(85, ctx.currentTime + 1.4);
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.3);
      gain2.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.38);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
      osc2.start(ctx.currentTime + 0.3); osc2.stop(ctx.currentTime + 1.8);
    } catch { /* audio not available */ }
  }

  private _buildStingerFlyn(x: number, y: number, z: number): void {
    const bodyM  = this._mat(1.0, 0.52, 0.04, 0.50, 0.20, 0.01);
    const tentM  = this._mat(0.95, 0.48, 0.08, 0.42, 0.16, 0.01);
    const tentM2 = this._mat(1.0,  0.30, 0.28, 0.48, 0.10, 0.08);

    this._stingerFlynMesh = MeshBuilder.CreateSphere("stingerflyn",
      { diameter: 4.5, segments: 10 }, this._scene) as Mesh;
    this._stingerFlynMesh.scaling.y = 0.65;
    this._stingerFlynMesh.position.set(x, y, z);
    this._stingerFlynMesh.material = bodyM;
    this._stingerFlynMesh.isPickable = false;

    this._light(x, y + 0.5, z, 1.0, 0.60, 0.10, 2.5, 22);
    this._light(x, y - 1.5, z, 0.9, 0.40, 0.05, 1.0, 12);

    // Tentacles parented to body (local Y accounts for scaling.y)
    const tentCount = 10;
    for (let i = 0; i < tentCount; i++) {
      const ang  = (i / tentCount) * Math.PI * 2;
      const tloc = { x: Math.cos(ang) * 1.8, z: Math.sin(ang) * 1.8 };
      const tl   = 3.0 + (i % 3) * 0.8;
      const tm   = i % 2 === 0 ? tentM : tentM2;
      const tent = MeshBuilder.CreateBox("", { width: 0.18, height: tl, depth: 0.18 }, this._scene) as Mesh;
      tent.parent = this._stingerFlynMesh;
      tent.position.set(tloc.x, (-tl / 2 - 1.4) / 0.65, tloc.z);
      tent.material = tm; tent.isPickable = false;
    }

    // Eyes (squished = sleeping)
    const eyeM   = this._mat(0.95, 0.95, 0.95, 0.35, 0.35, 0.35);
    for (const ex of [-0.8, 0.8]) {
      const eye = MeshBuilder.CreateSphere("", { diameter: 0.55, segments: 6 }, this._scene) as Mesh;
      eye.parent = this._stingerFlynMesh;
      eye.position.set(ex, 0.25 / 0.65, -2.0);
      eye.scaling.y = 0.12; eye.material = eyeM; eye.isPickable = false;
    }

    // Sleeping Zzz meshes
    const zM = this._mat(0.9, 0.9, 1.0, 0.45, 0.45, 0.55);
    for (const [zx, zy, zz, sz] of [
      [2.0, 0.8, -1.8, 0.30], [2.6, 1.5, -1.8, 0.42], [3.2, 2.2, -1.8, 0.55],
    ] as [number,number,number,number][]) {
      const zm = this._box(sz, sz * 0.7, 0.05, x + zx, y + zy, z + zz, zM);
      zm.isPickable = false;
    }
  }

  // ── Stinger Flyn dialogue ─────────────────────────────────────────────────

  private _showStingerFlynDialogue(): void {
    document.exitPointerLock?.();
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.88);display:flex;" +
      "flex-direction:column;align-items:center;justify-content:flex-end;" +
      "pointer-events:all;padding-bottom:8vh;gap:12px;";
    document.body.appendChild(ov);

    const lines: [string, string][] = [
      ["STINGER FLYN", "…Hm? Oh! A child. You must be looking for somewhere to hide."],
      ["STINGER FLYN", "I can help you. But there is one small problem."],
      ["STINGER FLYN", "I can only help those who are… asleep."],
      ["YOU",          "Asleep? What does that—"],
      ["STINGER FLYN", "Don't worry. I'll take care of it. Sweet dreams… 💤"],
    ];
    let idx = 0;
    const clr: Record<string,string> = { "STINGER FLYN": "#ff8833", "YOU": "#a8ffb8" };

    const box = document.createElement("div");
    box.style.cssText =
      "width:min(680px,88vw);background:rgba(10,8,18,0.97);border-radius:12px;" +
      "border:2px solid rgba(255,140,60,0.4);padding:22px 28px;";
    ov.appendChild(box);

    const hint = document.createElement("div");
    hint.style.cssText = "color:rgba(255,255,255,0.38);font-size:12px;font-family:Arial;text-align:center;";
    hint.textContent = "[ E / Click to continue ]";
    ov.appendChild(hint);

    const render = () => {
      const [speaker, text] = lines[idx];
      box.innerHTML = `
        <div style="color:${clr[speaker]??'#fff'};font-size:13px;font-family:'Arial Black',Arial;
          font-weight:900;letter-spacing:2px;margin-bottom:8px;">${speaker}</div>
        <div style="color:rgba(255,255,255,0.9);font-size:clamp(14px,2.2vw,20px);
          font-family:Arial;line-height:1.6;">${text}</div>`;
    };
    render();

    const advance = () => {
      idx++;
      if (idx >= lines.length) {
        ov.remove(); document.removeEventListener("keydown", keyFn);
        setTimeout(() => this._showDream(), 500);
        return;
      }
      render();
    };
    ov.addEventListener("pointerdown", advance);
    const keyFn = (e: KeyboardEvent) => {
      if (["KeyE","Space","Enter"].includes(e.code)) advance();
    };
    document.addEventListener("keydown", keyFn);
  }

  // ── Dream sequence ────────────────────────────────────────────────────────

  private _showDream(): void {
    this._dreamActive = true;
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:#000;opacity:0;transition:opacity 1s;" +
      "pointer-events:all;overflow:hidden;font-family:'Arial Black',Arial;";
    document.body.appendChild(ov);
    requestAnimationFrame(() => { ov.style.opacity = "1"; });

    const scene = (html: string, bg = "#000") => {
      ov.style.background = bg;
      ov.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:16px;padding:32px;">${html}</div>`;
    };
    const cap = (txt: string, col = "white", sz = "clamp(18px,3vw,28px)") =>
      `<div style="color:${col};font-size:${sz};text-align:center;line-height:1.5;
        text-shadow:0 2px 12px rgba(0,0,0,0.8);">${txt}</div>`;
    const bubble = (who: string, txt: string, col = "#ffd080") =>
      `<div style="background:rgba(0,0,0,0.75);border:2px solid ${col};border-radius:12px;
        padding:14px 22px;max-width:480px;text-align:center;">
        <div style="color:${col};font-size:12px;letter-spacing:2px;margin-bottom:6px;">${who}</div>
        <div style="color:white;font-size:clamp(14px,2vw,18px);line-height:1.5;">${txt}</div>
      </div>`;

    scene(cap("💤 You feel your eyelids grow heavy…", "rgba(255,255,255,0.8)", "clamp(20px,3vw,32px)"));

    setTimeout(() => scene(cap("✨ A dream…", "rgba(200,180,255,0.9)", "clamp(24px,4vw,40px)"), "#080412"), 3000);

    setTimeout(() => scene(`
      ${cap("🚗 You are in a car. Stinger Flyn is driving — but a little smaller.", "#ffd080")}
      <div style="font-size:80px;margin:8px 0;">🪼🚗</div>
      ${cap("The road stretches into a sunny desert.", "rgba(255,255,200,0.75)", "clamp(12px,1.8vw,16px)")}
    `, "#1a0e00"), 5500);

    setTimeout(() => scene(`
      ${bubble("STINGER FLYN", "You know what your problem is, Banban?")}
      <div style="font-size:60px;">🪼😠</div>
    `, "#1a0e00"), 9000);

    setTimeout(() => scene(`
      ${bubble("BANBAN", "…I am not driving, Stinger Flyn. You are.", "#a8ffb8")}
      <div style="font-size:60px;">🐦‍⬛😐</div>
    `, "#1a0e00"), 12000);

    setTimeout(() => scene(`
      ${bubble("STINGER FLYN", "I said turn LEFT back there! LEFT!")}
      <div style="font-size:60px;">🪼😤</div>
    `, "#1a0e00"), 15000);

    setTimeout(() => scene(`
      ${bubble("BANBAN", "There is a CACTUS on the left!", "#a8ffb8")}
      <div style="font-size:60px;">🐦‍⬛😱</div>
    `, "#1a0e00"), 18000);

    // CRASH
    setTimeout(() => {
      ov.style.background = "#fff";
      ov.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;
        justify-content:center;font-size:clamp(60px,12vw,100px);font-weight:900;color:#000;">
        💥 CRASH! 🌵</div>`;
      setTimeout(() => { ov.style.background = "#000"; }, 200);
      setTimeout(() => { ov.style.background = "#fff"; }, 400);
      setTimeout(() => { ov.style.background = "#000"; }, 600);
    }, 21000);

    setTimeout(() => scene(`
      <div style="font-size:50px;">🪼🐦‍⬛🌵</div>
      ${cap("…", "#aaa")}
      ${cap("Both are fine.", "rgba(200,255,200,0.7)", "clamp(12px,1.8vw,16px)")}
    `, "#0a0206"), 23000);

    setTimeout(() => scene(cap("…", "rgba(255,255,255,0.45)", "clamp(20px,3vw,32px)")), 26000);
    setTimeout(() => scene(cap("You wake up.", "rgba(255,255,255,0.85)", "clamp(22px,3.5vw,36px)")), 28000);

    setTimeout(() => {
      ov.style.transition = "opacity 2s";
      ov.style.opacity = "0";
      setTimeout(() => {
        ov.remove();
        this._dreamActive = false;
        this._transitionToNursery();
      }, 2000);
    }, 30000);
  }

  // ── Nurse's Office ────────────────────────────────────────────────────────

  private _buildNurseryOffice(): void {
    const wallM  = this._mat(0.85, 0.95, 0.88, 0.10, 0.16, 0.12);
    const floorM = this._mat(0.80, 0.90, 0.84, 0.06, 0.10, 0.08);
    const ceilM  = this._mat(0.90, 0.97, 0.92, 0.14, 0.20, 0.15);
    const RH3 = 3.5;

    // Floor & ceiling
    const nf = MeshBuilder.CreateGround("", { width: 14, height: 22 }, this._scene);
    nf.position.set(0, 0, -210); nf.material = floorM;
    const nc = MeshBuilder.CreateGround("", { width: 14, height: 22 }, this._scene);
    nc.rotation.x = Math.PI; nc.position.set(0, RH3, -210); nc.material = ceilM;

    // Walls
    this._box(0.15, RH3, 22,  7, RH3/2, -210, wallM, false, true); // east
    this._box(0.15, RH3, 22, -7, RH3/2, -210, wallM, false, true); // west
    this._box(14.3, RH3, 0.15, 0, RH3/2, -199, wallM, false, true); // south
    // North wall with exit gap (2.4 wide)
    this._box(5.8, RH3, 0.15, -4.1, RH3/2, -221, wallM, false, true);
    this._box(5.8, RH3, 0.15,  4.1, RH3/2, -221, wallM, false, true);

    // Fluorescent ceiling lights
    const sunM = this._mat(1.0, 1.0, 0.95, 0.88, 0.95, 0.82);
    for (const [lx, lz] of [[-2,-204],[2,-204],[-2,-212],[2,-212],[-2,-218],[2,-218]] as [number,number][]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.16, height: 0.04, depth: 2.5 }, this._scene);
      sl.position.set(lx, RH3 - 0.02, lz); sl.material = sunM; sl.isPickable = false;
      this._light(lx, RH3 - 0.2, lz, 0.92, 1.0, 0.88, 2.5, 13);
    }

    // Green medical cross on south wall
    const crossM = this._mat(0.08, 0.82, 0.28, 0.04, 0.48, 0.10);
    this._box(0.08, 0.55, 0.22, -6.5, 2.0, -199.9, crossM);
    this._box(0.08, 0.22, 0.55, -6.5, 2.0, -199.9, crossM);

    // Nurse beds (atmosphere — flanking east/west)
    const bedM  = this._mat(0.94, 0.94, 0.98, 0.04, 0.04, 0.05);
    const bedFrM = this._mat(0.78, 0.78, 0.83, 0.02, 0.02, 0.03);
    for (const [bx, bz] of [[-5.5,-205],[5.5,-205],[-5.5,-210],[5.5,-210],[-5.5,-215],[5.5,-215]] as [number,number][]) {
      this._box(1.2, 0.12, 2.0, bx, 0.72, bz, bedM);
      this._box(1.3, 0.72, 2.1, bx, 0.36, bz, bedFrM);
    }

    // ── X Buttons on pedestals ──────────────────────────────────────────────
    const pedM = this._mat(0.55, 0.58, 0.56, 0.04, 0.04, 0.04);
    const xBarM = this._mat(0.98, 0.98, 0.98, 0.60, 0.60, 0.60);
    const BTN_Y = 1.15;
    const btnPositions: [number,number,number][] = [
      [-3, 0, -208],  // btn 0: left
      [ 3, 0, -208],  // btn 1: right
      [ 0, 0, -215],  // btn 2: back (far)
    ];
    for (let i = 0; i < 3; i++) {
      const [bx,,bz] = btnPositions[i];
      this._box(0.55, 1.1, 0.55, bx, 0.55, bz, pedM); // pedestal
      const mat = this._mat(0.80, 0.12, 0.12, 0.35, 0.04, 0.04);
      const btn = this._box(0.45, 0.14, 0.45, bx, BTN_Y, bz, mat, true);
      btn.name = `xbtn_${i}`;
      this._xBtnMeshes.push(btn);
      this._xBtnMats.push(mat);
      // "+" / X marking on top
      this._box(0.08, 0.02, 0.36, bx, BTN_Y + 0.08, bz, xBarM);
      this._box(0.36, 0.02, 0.08, bx, BTN_Y + 0.08, bz, xBarM);
      const ii = i;
      this._interactables.push({
        mesh: btn, id: `xbtn_${i}`, label: "[ E ] Press Button",
        onInteract: () => this._pressXButton(ii),
      });
    }

    // ── Hint Drone ──────────────────────────────────────────────────────────
    const hBodyM  = this._mat(0.25, 0.65, 0.95, 0.10, 0.38, 0.70);
    const hPropM  = this._mat(0.80, 0.80, 0.85, 0.28, 0.28, 0.32);
    this._hintDroneMesh = MeshBuilder.CreateBox("hintDrone",
      { width: 0.30, height: 0.12, depth: 0.30 }, this._scene) as Mesh;
    this._hintDroneMesh.position.set(0, BTN_Y + 1.4, -215);
    this._hintDroneMesh.material = hBodyM; this._hintDroneMesh.isPickable = false;
    for (const [px, pz] of [[-0.24,-0.24],[-0.24,0.24],[0.24,-0.24],[0.24,0.24]] as [number,number][]) {
      const prop = MeshBuilder.CreateBox("", { width: 0.22, height: 0.02, depth: 0.06 }, this._scene) as Mesh;
      prop.parent = this._hintDroneMesh;
      prop.position.set(px, 0.08, pz); prop.material = hPropM; prop.isPickable = false;
    }
    this._light(0, BTN_Y + 1.5, -215, 0.25, 0.65, 1.0, 0.7, 5);

    // Hint label HUD
    this._hintLabel = document.createElement("div");
    this._hintLabel.style.cssText =
      "position:absolute;bottom:80px;right:24px;background:rgba(0,0,0,0.80);" +
      "color:#55ddff;font-size:22px;font-weight:900;font-family:'Arial Black',Arial;" +
      "padding:8px 18px;border-radius:12px;border:2px solid #33aacc;" +
      "display:none;pointer-events:none;z-index:100;";
    this._hintLabel.textContent = "🤖 1ST";
    this._wrap.appendChild(this._hintLabel);

    // ── Jumbo Josh closet (east wall, z=-208) ──────────────────────────────
    const jjDoorM = this._mat(0.35, 0.30, 0.28, 0.03, 0.02, 0.02);
    this._jjDoor  = this._box(1.6, RH3, 0.2, 6.85, RH3/2, -208, jjDoorM, false, true);
    this._jjDoor.name = "jj_door";
    // Warning diamond on door
    const warnM = this._mat(0.92, 0.75, 0.04, 0.58, 0.44, 0.01);
    this._box(0.06, 0.32, 0.32, 6.77, RH3/2 + 0.1, -208, warnM);
    // Jumbo Josh (starts off-scene east of wall)
    const jjBodyM = this._mat(0.15, 0.68, 0.22, 0.06, 0.34, 0.08);
    const jjEyeM  = this._mat(0.95, 0.95, 0.10, 0.58, 0.58, 0.04);
    this._jumboJoshMesh = MeshBuilder.CreateBox("jumboJosh",
      { width: 1.8, height: 3.0, depth: 1.2 }, this._scene) as Mesh;
    this._jumboJoshMesh.position.set(10, 1.5, -208);
    this._jumboJoshMesh.material = jjBodyM; this._jumboJoshMesh.isPickable = false;
    this._jumboJoshMesh.setEnabled(false);
    for (const ex of [-0.38, 0.38]) {
      const eye = MeshBuilder.CreateSphere("", { diameter: 0.35, segments: 6 }, this._scene) as Mesh;
      eye.parent = this._jumboJoshMesh;
      eye.position.set(ex, 0.55, -0.65); eye.material = jjEyeM; eye.isPickable = false;
    }

    // ── Exit door (north wall gap, blocked until puzzle solved) ────────────
    const exitDoorM = this._mat(0.38, 0.78, 0.48, 0.08, 0.42, 0.12);
    const exitDoor  = this._box(2.4, RH3, 0.16, 0, RH3/2, -221, exitDoorM, false, true);
    exitDoor.name   = "nurse_exit";
    const exitSignM = this._mat(0.08, 0.82, 0.20, 0.04, 0.52, 0.08);
    this._box(1.5, 0.26, 0.08, 0, RH3 - 0.14, -220.95, exitSignM);
  }

  private _transitionToNursery(): void {
    this._inNursery = true;
    const dest = new Vector3(0, EYE_Y, -201.5);
    this._camera.position.copyFrom(dest);
    this._yaw   = Math.PI; this._pitch = 0;
    this._camera.rotation.set(0, Math.PI, 0);
    this._velY  = 0;
    this._checkpoint = dest.clone();
    this._scene.clearColor = new Color4(0.72, 0.90, 0.78, 1);
    this._hintLabel.style.display = "block";
    this._hintTimer = 0; this._hintPhase = 0;
    this._canvas.requestPointerLock?.();
    this._flashMsg("You wake up in a nurse's office…  👀  Someone left a hint drone.");
  }

  private _pressXButton(idx: number): void {
    if (!this._inNursery || this._xBtnPressed[idx] || this._isDead) return;
    const expected = this._xCorrectOrder[this._xPressSeq.length];
    if (idx === expected) {
      // Correct press
      this._xBtnPressed[idx] = true;
      this._xPressSeq.push(idx);
      this._xBtnMats[idx].diffuseColor  = new Color3(0.10, 0.85, 0.15);
      this._xBtnMats[idx].emissiveColor = new Color3(0.04, 0.50, 0.06);
      this._flashScreen("rgba(40,210,80,0.18)");
      if (this._xPressSeq.length >= 3) {
        this._flashMsg("✅ Correct order! The exit opens…  follow the light.");
        let prog = 0;
        const slide = setInterval(() => {
          prog = Math.min(1, prog + 0.04);
          const ed = this._scene.getMeshByName("nurse_exit");
          if (ed) { ed.position.x = -3.2 * prog; if (prog >= 1) { clearInterval(slide); ed.checkCollisions = false; } }
        }, 16);
        setTimeout(() => this._transitionToCastle(), 2500);
      }
    } else {
      // Wrong order → JJ
      this._flashScreen("rgba(255,20,20,0.38)");
      this._flashMsg("❌ Wrong order! The closet door creaks open…");
      this._openJJDoor();
    }
  }

  private _openJJDoor(): void {
    if (this._jjDoorOpen) return;
    this._jjDoorOpen = true;
    const startX = this._jjDoor.position.x;
    let prog = 0;
    const slide = setInterval(() => {
      prog = Math.min(1, prog + 0.05);
      this._jjDoor.position.x = startX + 2.2 * prog;
      if (prog >= 1) {
        clearInterval(slide);
        this._jjDoor.checkCollisions = false;
        this._jumboJoshMesh.position.set(7.5, 1.5, -208);
        this._jumboJoshMesh.setEnabled(true);
        this._jumboJoshActive = true;
        this._flashMsg("🟩 JUMBO JOSH is coming!!");
      }
    }, 16);
  }

  private _killPlayer(): void {
    if (this._isDead) return;
    this._isDead = true;
    this._jumboJoshActive = false;

    // ── Start 3D replay: camera retraces the last 5s at 0.5× speed ────────
    this._isReplaying = true;
    this._replayHead  = 0;

    const buf     = this._replayBuf;
    const bufDur  = buf.length > 1 ? buf[buf.length - 1].t - buf[0].t : 0;
    const playDur = bufDur / 0.5; // 0.5× speed = 2× wall-clock time

    // Overlay: red vignette + banner (drawn ON TOP of the live 3D scene)
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:9998;pointer-events:none;";
    ov.innerHTML =
      `<div style="position:absolute;inset:0;box-shadow:inset 0 0 120px rgba(200,0,0,0.55);pointer-events:none;"></div>` +
      `<div style="position:absolute;top:18px;left:50%;transform:translateX(-50%);` +
      `color:rgba(255,80,80,0.95);font-size:15px;font-family:'Arial Black',Arial;letter-spacing:4px;` +
      `background:rgba(0,0,0,0.60);padding:5px 18px;border-radius:20px;white-space:nowrap;">` +
      `⏪  REPLAY  0.5×  &nbsp;<span style="font-size:11px;opacity:0.55;">[ any key to skip ]</span></div>`;
    document.body.appendChild(ov);

    const finish = () => {
      this._isReplaying = false;
      ov.remove();
      const deathOv = document.createElement("div");
      deathOv.style.cssText =
        "position:fixed;inset:0;z-index:99999;background:#000;display:flex;" +
        "align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity 0.35s;";
      deathOv.innerHTML =
        `<div style="color:#cc1111;font-size:clamp(42px,9vw,78px);font-family:'Arial Black',Arial;` +
        `font-weight:900;letter-spacing:4px;text-shadow:0 0 30px #ff0000;">YOU DIED</div>`;
      document.body.appendChild(deathOv);
      requestAnimationFrame(() => { deathOv.style.opacity = "1"; });
      setTimeout(() => { deathOv.remove(); this._respawn(); }, 1400);
    };

    // Skip with ANY key press — delayed 1s so the key that killed you doesn't instantly skip it
    const skipFn = (e: KeyboardEvent) => {
      if (this._isReplaying) { document.removeEventListener("keydown", skipFn); finish(); }
    };
    setTimeout(() => { if (this._isReplaying) document.addEventListener("keydown", skipFn); }, 1000);

    // Auto-finish: cap at 3.5 seconds max regardless of buffer length
    setTimeout(() => {
      if (this._isReplaying) { document.removeEventListener("keydown", skipFn); finish(); }
    }, Math.min(3500, Math.max(1500, playDur * 1000)));
  }

  private _respawn(): void {
    if (this._checkpoint) this._camera.position.copyFrom(this._checkpoint);
    this._yaw   = Math.PI; this._pitch = 0; this._velY = 0;
    this._isDead = false;
    this._keys.clear(); // drop any held keys so movement doesn't fire immediately
    // Reset puzzle
    this._xBtnPressed = [false, false, false];
    this._xPressSeq   = [];
    for (let i = 0; i < 3; i++) {
      if (this._xBtnMats[i]) {
        this._xBtnMats[i].diffuseColor  = new Color3(0.80, 0.12, 0.12);
        this._xBtnMats[i].emissiveColor = new Color3(0.35, 0.04, 0.04);
      }
      if (this._xBtnMeshes[i]) this._xBtnMeshes[i].setEnabled(true);
    }
    // Reset Jumbo Josh
    this._jumboJoshActive = false;
    this._jumboJoshMesh.setEnabled(false);
    this._jumboJoshMesh.position.set(10, 1.5, -208);
    this._jjDoorOpen = false;
    this._jjDoor.position.x = 6.85;
    this._jjDoor.checkCollisions = true;
    // Reset baby bird area if that's where we died
    if (this._inBabyBirdArea) {
      this._hasMedal2 = false;
      this._medalThrown2 = false;
      this._opiillaDistracted = false;
      this._opiillaDistractTimer = 0;
      this._opiillaAngle = 0;
      this._hasBabyBird = false;
      this._medalMesh2?.setEnabled(true);
      this._babyBirdPickupMesh?.setEnabled(true);
      this._scene.getMeshByName("medalBase2")?.setEnabled(true);
      this._flashMsg("😵 Try again — pick up the medal and press [F] to throw it at Blue Opiilla!");
    } else {
      this._flashMsg("😵 You wake up again… press the buttons in order.");
    }
    this._canvas.requestPointerLock?.();
  }

  // ── Utils ──────────────────────────────────────────────────────────────────

  private _flashMsg(msg: string): void {
    this._hudPrompt.textContent = msg;
    this._hudPrompt.style.display = "block";
    setTimeout(() => { if (this._hudPrompt.textContent === msg) this._hudPrompt.style.display = "none"; }, 3200);
  }

  private _flashScreen(color: string): void {
    const fl = document.createElement("div");
    fl.style.cssText = `position:absolute;inset:0;background:${color};pointer-events:none;z-index:20;opacity:1;transition:opacity 0.3s;`;
    this._wrap.appendChild(fl);
    requestAnimationFrame(() => { fl.style.opacity = "0"; });
    setTimeout(() => fl.remove(), 400);
  }

  // ── Baby Bird Area (positive Z, z=10–68) ──────────────────────────────────

  private _buildBabyBirdArea(): void {
    if (this._babyBirdAreaBuilt) return;
    this._babyBirdAreaBuilt = true;

    // Grass floor (z=10 to 68, x=-8 to 8)
    const grassM  = this._mat(0.18, 0.52, 0.14, 0.04, 0.20, 0.05);
    const dirtM   = this._mat(0.38, 0.26, 0.14, 0.02, 0.01, 0.01);
    const wallM   = this._mat(0.24, 0.62, 0.20, 0.03, 0.14, 0.03);
    const goldM   = this._mat(0.75, 0.60, 0.10, 0.02, 0.40, 0.25);
    const blueM   = this._mat(0.08, 0.30, 0.82, 0.02, 0.05, 0.40);
    const stoneM  = this._mat(0.40, 0.38, 0.35, 0.02, 0.02, 0.02);
    const stoneDM = this._mat(0.30, 0.28, 0.25, 0.01, 0.01, 0.01);

    // Floor
    this._box(16, 0.2, 55, 0, -0.1, 39, grassM);
    // Walls (garden hedges)
    this._box(0.5, 4.0, 55,  8.25, 2.0, 39, wallM);
    this._box(0.5, 4.0, 55, -8.25, 2.0, 39, wallM);
    this._box(16, 4.0, 0.5,  0, 2.0, 12, wallM);   // back wall
    this._box(16, 4.0, 0.5,  0, 2.0, 66, wallM);   // front wall

    // Medal (gold coin on pedestal)
    const medalBase = this._box(0.6, EYE_Y, 0.6, 4, EYE_Y / 2, 28, dirtM);
    medalBase.name = "medalBase2";
    this._medalMesh2 = this._box(0.5, 0.5, 0.12, 4, EYE_Y + 0.1, 28, goldM) as Mesh;
    this._interactables.push({
      mesh: this._medalMesh2,
      id: "medal2",
      label: "🏅 Pick up Medal [E]",
      onInteract: () => {
        if (this._hasMedal2) return;
        this._hasMedal2 = true;
        this._medalMesh2.setEnabled(false);
        medalBase.setEnabled(false);
        this._flashMsg("🏅 Medal picked up! Now press [F] to throw it at Blue Opiilla!");
      },
    });

    // Glowing throw spot — a small golden marker on the ground (z=38) as a visual cue
    const throwSpotM = this._mat(0.80, 0.65, 0.05, 0.10, 0.55, 0.30);
    this._box(0.8, 0.05, 0.8, 0, 0.025, 38, throwSpotM);

    // Baby bird — raised to eye level so the interactable detection easily hits it
    this._babyBirdPickupMesh = MeshBuilder.CreateSphere("babyBird2", { diameter: 1.0 }, this._scene);
    this._babyBirdPickupMesh.position.set(0, EYE_Y, 45);
    const bbMat = new StandardMaterial("bbMat", this._scene);
    bbMat.diffuseColor = new Color3(0.95, 0.85, 0.15);
    bbMat.emissiveColor = new Color3(0.30, 0.25, 0.02);
    this._babyBirdPickupMesh.material = bbMat;
    // Eyes on baby bird
    const eyeL = MeshBuilder.CreateSphere("bbEyeL", { diameter: 0.18 }, this._scene);
    eyeL.position.set(-0.22, EYE_Y + 0.18, 44.52);
    const eyeR = MeshBuilder.CreateSphere("bbEyeR", { diameter: 0.18 }, this._scene);
    eyeR.position.set( 0.22, EYE_Y + 0.18, 44.52);
    const eyeMat = new StandardMaterial("bbEyeMat", this._scene);
    eyeMat.diffuseColor = new Color3(0.05, 0.05, 0.05);
    eyeL.material = eyeR.material = eyeMat;

    // Interactable for baby bird (only available when Flynn distracted)
    this._interactables.push({
      mesh: this._babyBirdPickupMesh,
      id: "babybird2",
      label: "🐣 Pick up Baby Bird [E]",
      onInteract: () => {
        if (this._hasBabyBird) return;
        if (!this._opiillaDistracted) {
          this._flashMsg("⚠️ Blue Opiilla is guarding it! Pick up the medal and press [F] to distract her!");
          return;
        }
        this._hasBabyBird = true;
        this._babyBirdPickupMesh.setEnabled(false);
        eyeL.setEnabled(false); eyeR.setEnabled(false);
        this._flashMsg("🐣 You have the baby bird! Now climb the stairs and jump on Blue Opiilla!");
      },
    });

    // Blue Opiilla — root body (all parts parented so they all move together)
    this._opiillaMesh = MeshBuilder.CreateSphere("opiillaBody", { diameterX: 1.1, diameterY: 1.3, diameterZ: 0.95 }, this._scene);
    this._opiillaMesh.position.set(0, EYE_Y + 2.5, 45);
    this._opiillaMesh.material = blueM;
    // Wings (parented — move with body)
    const opiWL = MeshBuilder.CreateBox("opiWL", { width: 2.0, height: 0.22, depth: 0.55 }, this._scene);
    opiWL.parent = this._opiillaMesh; opiWL.position.set(-1.3, 0.15, 0); opiWL.material = blueM;
    const opiWR = MeshBuilder.CreateBox("opiWR", { width: 2.0, height: 0.22, depth: 0.55 }, this._scene);
    opiWR.parent = this._opiillaMesh; opiWR.position.set( 1.3, 0.15, 0); opiWR.material = blueM;
    // Eyes (parented)
    const whiteMat = this._mat(0.9, 0.9, 0.9, 0.5, 0.5, 0.5);
    const opiEL = MeshBuilder.CreateSphere("opiEL", { diameter: 0.22 }, this._scene);
    opiEL.parent = this._opiillaMesh; opiEL.position.set(-0.26, 0.28, -0.44); opiEL.material = whiteMat;
    const opiER = MeshBuilder.CreateSphere("opiER", { diameter: 0.22 }, this._scene);
    opiER.parent = this._opiillaMesh; opiER.position.set( 0.26, 0.28, -0.44); opiER.material = whiteMat;
    // Beak (parented)
    const beakMat = this._mat(0.90, 0.68, 0.08, 0.10, 0.40, 0.00);
    const opiBeak = MeshBuilder.CreateBox("opiBeak", { width: 0.22, height: 0.18, depth: 0.40 }, this._scene);
    opiBeak.parent = this._opiillaMesh; opiBeak.position.set(0, -0.05, -0.60); opiBeak.material = beakMat;

    // Stairs (5 steps, z=52 to 62, x=-3 to 3, ascending)
    for (let s = 0; s < 5; s++) {
      const sz = 52 + s * 2;
      const sy = s * 0.6 + 0.3;
      this._box(6, 0.6, 2, 0, sy, sz + 1, stoneM);
      this._box(6, sy * 2 + 0.3, 0.5, 0, 0, sz, stoneDM); // riser
    }
    // Landing platform at top
    this._box(6, 0.15, 4, 0, 3.075, 63, stoneM);

    // "Mount Flynn" trigger (invisible, at top of stairs)
    const mountMesh = this._box(1.0, 1.8, 1.0, 0, EYE_Y + 3.0, 64, blueM) as Mesh;
    mountMesh.visibility = 0.35;
    this._interactables.push({
      mesh: mountMesh,
      id: "mountOpiilla",
      label: "🦅 Jump on Blue Opiilla! [E]",
      onInteract: () => {
        if (!this._hasBabyBird) { this._flashMsg("🐣 You need the baby bird first!"); return; }
        this._showBirdRidingGame();
      },
    });
  }

  // ── Castle / Joker / Maze ─────────────────────────────────────────────────

  private _buildCastle(): void {
    const stoneM  = this._mat(0.38, 0.34, 0.30, 0.03, 0.02, 0.02);
    const stoneD  = this._mat(0.28, 0.25, 0.22, 0.02, 0.01, 0.01);
    const floorM  = this._mat(0.30, 0.28, 0.25, 0.02, 0.02, 0.02);
    const ceilM   = this._mat(0.22, 0.20, 0.18, 0.01, 0.01, 0.01);
    const carpetM = this._mat(0.55, 0.08, 0.08, 0.15, 0.02, 0.02);
    const RHC = 5.0;

    // ── Elevator room (entrance) z=-283 to -298 ─────────────────────────────
    const ef = MeshBuilder.CreateGround("", { width: 14, height: 16 }, this._scene);
    ef.position.set(0, 0, -290); ef.material = floorM;
    const ec = MeshBuilder.CreateGround("", { width: 14, height: 16 }, this._scene);
    ec.rotation.x = Math.PI; ec.position.set(0, RHC, -290); ec.material = ceilM;
    this._box(0.2, RHC, 16, -7, RHC/2, -290, stoneM, false, true);
    this._box(0.2, RHC, 16,  7, RHC/2, -290, stoneM, false, true);
    this._box(14.4, RHC, 0.2, 0, RHC/2, -283, stoneM, false, true);
    // North archway into throne room (5 wide)
    this._box(4.5, RHC, 0.2, -5.75, RHC/2, -298, stoneM, false, true);
    this._box(4.5, RHC, 0.2,  5.75, RHC/2, -298, stoneM, false, true);
    this._box(5.0, RHC-3.2, 0.2, 0, 3.2+(RHC-3.2)/2, -298, stoneM, false, true);
    // Elevator shaft decoration (just visual)
    const platM = this._mat(0.50, 0.48, 0.44, 0.04, 0.04, 0.04);
    this._box(3.0, 0.15, 3.0, 0, 0.075, -290, platM);
    this._light(0, RHC-0.5, -290, 0.9, 0.75, 0.45, 1.5, 14);
    for (const [lx, lz] of [[-2.5,-286],[2.5,-286],[-2.5,-294],[2.5,-294]] as [number,number][]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.14, height: 0.04, depth: 1.8 }, this._scene);
      sl.position.set(lx, RHC-0.02, lz); sl.material = this._mat(1,0.9,0.6,0.85,0.7,0.3); sl.isPickable = false;
      this._light(lx, RHC-0.3, lz, 1.0, 0.8, 0.4, 1.5, 10);
    }

    // ── Throne room z=-298 to -345 ──────────────────────────────────────────
    const tf = MeshBuilder.CreateGround("", { width: 14, height: 48 }, this._scene);
    tf.position.set(0, 0, -321); tf.material = floorM;
    const tc = MeshBuilder.CreateGround("", { width: 14, height: 48 }, this._scene);
    tc.rotation.x = Math.PI; tc.position.set(0, RHC, -321); tc.material = ceilM;
    this._box(0.2, RHC, 48, -7, RHC/2, -321, stoneM, false, true);
    this._box(0.2, RHC, 48,  7, RHC/2, -321, stoneM, false, true);
    // South wall of throne room = archway (already built above)
    // North wall with maze entrance gap (3 wide)
    this._box(5.5, RHC, 0.2, -4.25, RHC/2, -345, stoneM, false, true);
    this._box(5.5, RHC, 0.2,  4.25, RHC/2, -345, stoneM, false, true);
    // Red carpet down centre
    const carp = MeshBuilder.CreateGround("", { width: 2.4, height: 42 }, this._scene);
    carp.position.set(0, 0.01, -319); carp.material = carpetM;
    // Throne
    const throneBodyM = this._mat(0.72, 0.58, 0.10, 0.28, 0.20, 0.02);
    this._box(3.2, 3.8, 0.4, 0, 1.9, -343, throneBodyM);   // back
    this._box(3.2, 0.6, 2.2, 0, 0.3, -342, throneBodyM);   // seat
    this._box(3.2, 2.4, 0.3, 0, 1.2, -341, throneBodyM);   // front
    // Crown finials
    for (const tx of [-1.4, 0, 1.4]) {
      const fin = MeshBuilder.CreateCylinder("", { height: 0.55, diameterBottom: 0.22, diameterTop: 0.05, tessellation: 6 }, this._scene) as Mesh;
      fin.position.set(tx, 4.08, -343.1); fin.material = throneBodyM; fin.isPickable = false;
    }
    // Torches
    const torchM = this._mat(1.0, 0.55, 0.05, 0.80, 0.35, 0.01);
    for (const [tx, tz] of [[-6.7,-302],[-6.7,-315],[-6.7,-328],[-6.7,-340],[6.7,-302],[6.7,-315],[6.7,-328],[6.7,-340]] as [number,number][]) {
      this._box(0.12, 0.35, 0.12, tx, 2.5, tz, torchM);
      this._light(tx, 2.8, tz, 1.0, 0.55, 0.10, 1.8, 8);
    }
    // Pillars
    for (const [px, pz] of [[-5,-305],[-5,-318],[-5,-330],[5,-305],[5,-318],[5,-330]] as [number,number][]) {
      const pil = MeshBuilder.CreateCylinder("", { height: RHC, diameter: 0.85, tessellation: 10 }, this._scene) as Mesh;
      pil.position.set(px, RHC/2, pz); pil.material = stoneD; pil.isPickable = false;
    }

    // ── Jester (tall split navy-blue / green character) ──────────────────────
    const jkBlueM  = this._mat(0.10, 0.08, 0.42, 0.04, 0.03, 0.18);
    const jkGreenM = this._mat(0.14, 0.60, 0.18, 0.05, 0.26, 0.06);
    const jkWhiteM = this._mat(0.96, 0.96, 0.96, 0.22, 0.22, 0.22);
    const jkPupilM = this._mat(0.04, 0.04, 0.06, 0.01, 0.01, 0.02);
    const JX = -2.8, JZ = -341.0;
    // Legs (lanky)
    this._box(0.20, 1.2, 0.24, JX - 0.22, 0.6, JZ, jkBlueM);
    this._box(0.20, 1.2, 0.24, JX + 0.22, 0.6, JZ, jkGreenM);
    // Torso: left half = blue, right half = green
    this._box(0.44, 2.2, 0.60, JX - 0.22, 2.3, JZ, jkBlueM);
    this._box(0.44, 2.2, 0.60, JX + 0.22, 2.3, JZ, jkGreenM);
    // Jagged seam teeth alternating across the join
    for (let ji = 0; ji < 6; ji++) {
      const jy = 1.4 + ji * 0.36;
      const side = ji % 2 === 0 ? -1 : 1;
      this._box(0.14, 0.18, 0.52, JX + side * 0.06, jy, JZ, side < 0 ? jkBlueM : jkGreenM);
    }
    // Long thin arms
    this._box(0.16, 1.8, 0.18, JX - 0.74, 2.4, JZ, jkBlueM);
    this._box(0.16, 1.8, 0.18, JX + 0.74, 2.4, JZ, jkGreenM);
    // Head: split boxes (approximates the round split head)
    this._box(0.46, 0.88, 0.78, JX - 0.23, 3.82, JZ, jkBlueM);
    this._box(0.46, 0.88, 0.78, JX + 0.23, 3.82, JZ, jkGreenM);
    // Big round eyes (GotB style) with white sclera + dark pupil
    for (const [ex, em] of [[JX - 0.22, jkWhiteM],[JX + 0.22, jkWhiteM]] as [number, StandardMaterial][]) {
      const eye = MeshBuilder.CreateSphere("", { diameter: 0.34, segments: 8 }, this._scene) as Mesh;
      eye.position.set(ex, 3.90, JZ - 0.42); eye.material = em; eye.isPickable = false;
    }
    for (const ex of [JX - 0.22, JX + 0.22]) {
      const p = MeshBuilder.CreateSphere("", { diameter: 0.17, segments: 6 }, this._scene) as Mesh;
      p.position.set(ex, 3.88, JZ - 0.56); p.material = jkPupilM; p.isPickable = false;
    }
    // Mouth (wide grin)
    for (const [mx] of [[-3.08],[-2.8],[-2.52]] as [number][]) {
      const mt = this._box(0.10, 0.06, 0.04, mx, 3.55, JZ - 0.42, jkPupilM);
      mt.isPickable = false;
    }

    // ── Queen Bouceilia on throne ────────────────────────────────────────────
    const qBodyM  = this._mat(0.65, 0.12, 0.55, 0.30, 0.05, 0.25);
    const qGoldM  = this._mat(1.0, 0.78, 0.10, 0.60, 0.44, 0.04);
    const qFaceM  = this._mat(0.90, 0.78, 0.68, 0.10, 0.08, 0.06);
    // Body seated
    this._box(1.1, 1.8, 0.8, 0, 1.2, -342.5, qBodyM);
    // Head
    const qHead = MeshBuilder.CreateSphere("", { diameter: 0.85, segments: 8 }, this._scene) as Mesh;
    qHead.position.set(0, 2.7, -342.5); qHead.material = qFaceM; qHead.isPickable = false;
    // Crown
    this._box(1.0, 0.18, 0.28, 0, 3.20, -342.5, qGoldM);
    for (const cx of [-0.38, 0, 0.38]) {
      const cp = MeshBuilder.CreateCylinder("", { height: 0.38, diameterBottom: 0.18, diameterTop: 0.06, tessellation: 6 }, this._scene) as Mesh;
      cp.position.set(cx, 3.47, -342.5); cp.material = qGoldM; cp.isPickable = false;
    }
    // Queen eyes
    for (const qx of [-0.2, 0.2]) {
      const qe = MeshBuilder.CreateSphere("", { diameter: 0.09, segments: 4 }, this._scene) as Mesh;
      qe.position.set(qx, 2.74, -342.95); qe.material = jkPupilM; qe.isPickable = false;
    }

    // ── Naughty Ones (hidden behind throne, revealed by dialogue) ────────────
    const nBodyM = this._mat(0.08, 0.06, 0.06, 0.03, 0.02, 0.02);
    const nEyeM  = this._mat(0.85, 0.05, 0.05, 0.55, 0.02, 0.02);
    for (let i = 0; i < 3; i++) {
      const nm = MeshBuilder.CreateBox("", { width: 1.2, height: 2.8, depth: 0.9 }, this._scene) as Mesh;
      nm.position.set(-2.5 + i * 2.5, 1.4, -345.5); nm.material = nBodyM; nm.isPickable = false;
      nm.setEnabled(false);
      for (const ex of [-0.28, 0.28]) {
        const ne = MeshBuilder.CreateSphere("", { diameter: 0.28, segments: 6 }, this._scene) as Mesh;
        ne.parent = nm; ne.position.set(ex, 0.55, -0.5); ne.material = nEyeM; ne.isPickable = false;
      }
      this._naughtyMeshes.push(nm);
    }

    // ── Maze (z=-345 to -400) ────────────────────────────────────────────────
    const mazeM = this._mat(0.30, 0.27, 0.24, 0.02, 0.01, 0.01);
    const mf = MeshBuilder.CreateGround("", { width: 14, height: 56 }, this._scene);
    mf.position.set(0, 0, -373); mf.material = floorM;
    const mc = MeshBuilder.CreateGround("", { width: 14, height: 56 }, this._scene);
    mc.rotation.x = Math.PI; mc.position.set(0, RHC, -373); mc.material = ceilM;

    // Outer walls
    this._box(0.2, RHC, 56, -7, RHC/2, -373, mazeM, false, true);
    this._box(0.2, RHC, 56,  7, RHC/2, -373, mazeM, false, true);
    this._box(14.4, RHC, 0.2, 0, RHC/2, -401, mazeM, false, true);

    // Internal maze walls — matching the corridor layout:
    // Entry (z=-345 to -353): corridor x=-1.5 to 1.5
    this._box(5.3, RHC, 0.2, -4.35, RHC/2, -345, mazeM); // left of entry
    this._box(5.3, RHC, 0.2,  4.35, RHC/2, -345, mazeM); // right of entry

    // T-junction 1 walls (z=-353 to -356): opens -4.5 to 4.5
    this._box(0.2, RHC, 3.2, -1.5, RHC/2, -354.6, mazeM); // left wall of entry going south
    this._box(0.2, RHC, 3.2,  1.5, RHC/2, -354.6, mazeM); // right wall of entry going south
    // Close off the left dead-end corridor end
    this._box(3.0, RHC, 0.2, -3.0, RHC/2, -364.2, mazeM);
    // Close off the straight ahead (blocks going straight at T1 from south)
    this._box(0.2, RHC, 8.2, -1.5, RHC/2, -360, mazeM); // inner left wall of right corridor
    // Right corridor walls (z=-356 to -364): x=1.5 to 4.5
    this._box(0.2, RHC, 8.2, 4.5, RHC/2, -360, mazeM); // outer right of right corridor

    // Corner (z=-364 to -367): x=-1.5 to 4.5
    this._box(0.2, RHC, 3.2, -1.5, RHC/2, -365.6, mazeM); // west wall of corner

    // Middle corridor (z=-367 to -375): x=-1.5 to 1.5
    this._box(5.3, RHC, 8.2, -4.35, RHC/2, -371, mazeM); // left bulk
    this._box(5.3, RHC, 8.2,  4.35, RHC/2, -371, mazeM); // right bulk

    // T-junction 2 walls (z=-375 to -378): opens -4.5 to 4.5
    this._box(0.2, RHC, 3.2, -1.5, RHC/2, -376.6, mazeM);
    this._box(0.2, RHC, 3.2,  1.5, RHC/2, -376.6, mazeM);
    // Close off the right dead-end corridor end
    this._box(3.0, RHC, 0.2,  3.0, RHC/2, -386.2, mazeM);
    // Left corridor walls (z=-378 to -386): x=-4.5 to -1.5
    this._box(0.2, RHC, 8.2, -4.5, RHC/2, -382, mazeM); // outer left
    this._box(0.2, RHC, 8.2, -1.5, RHC/2, -382, mazeM); // inner right
    // Close right side
    this._box(5.3, RHC, 8.2, 3.5, RHC/2, -382, mazeM);

    // Corner 2 (z=-386 to -389): x=-4.5 to 1.5
    this._box(0.2, RHC, 3.2, 1.5, RHC/2, -387.6, mazeM);

    // Exit corridor (z=-389 to -397): x=-1.5 to 1.5
    this._box(5.3, RHC, 8.2, -4.35, RHC/2, -393, mazeM);
    this._box(5.3, RHC, 8.2,  4.35, RHC/2, -393, mazeM);

    // Maze torch lights
    for (const [lx, lz] of [[0,-350],[3.0,-360],[-1.0,-370],[0,-381],[-3.0,-382],[-1.0,-393]] as [number,number][]) {
      this._light(lx, RHC-0.5, lz, 0.9, 0.55, 0.15, 1.2, 9);
    }

    // Atmosphere light for castle overall
    const castleAmb = new HemisphericLight("castleAmb", new Vector3(0,1,0), this._scene);
    castleAmb.intensity = 0.28; castleAmb.diffuse = new Color3(0.55, 0.45, 0.35); castleAmb.groundColor = new Color3(0.15, 0.12, 0.10);
  }

  private _transitionToCastle(): void {
    this._inNursery = false;
    this._inCastle  = true;
    this._hintLabel.style.display = "none";

    // Elevator cutscene overlay
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:#000;display:flex;" +
      "flex-direction:column;align-items:center;justify-content:center;gap:20px;" +
      "font-family:'Arial Black',Arial;pointer-events:none;";
    ov.innerHTML = `
      <style>@keyframes elevRise{0%{transform:translateY(0)}100%{transform:translateY(-110px)}}</style>
      <div style="color:rgba(255,210,80,0.95);font-size:clamp(18px,3.5vw,32px);font-weight:900;letter-spacing:3px;">
        🏰 CASTLE ELEVATOR</div>
      <div style="width:72px;height:130px;position:relative;overflow:hidden;
        border:3px solid rgba(255,200,60,0.45);border-radius:6px;background:#100c04;">
        <div style="position:absolute;left:10px;right:10px;height:42px;background:rgba(255,200,60,0.28);
          border-radius:4px;bottom:4px;animation:elevRise 2.6s ease-in forwards;display:flex;
          align-items:center;justify-content:center;font-size:22px;">🧍</div>
      </div>
      <div style="color:rgba(255,255,255,0.55);font-size:14px;letter-spacing:2px;">Going up…</div>`;
    document.body.appendChild(ov);

    setTimeout(() => {
      ov.remove();
      this._scene.clearColor = new Color4(0.04, 0.03, 0.06, 1);
      this._camera.position.set(0, EYE_Y, -287);
      this._yaw = Math.PI; this._pitch = 0;
      this._camera.rotation.set(0, Math.PI, 0);
      this._velY = 0;
      this._canvas.requestPointerLock?.();
      this._flashMsg("The elevator opens into the castle… you hear laughter ahead.");
    }, 3000);
  }

  private _showJokerDialogue(): void {
    if (this._throneDialogDone) return;
    this._throneDialogDone = true;
    document.exitPointerLock?.();

    const lines: [string, string, string][] = [
      ["JOKER", "#cc55ff", "Oh! A visitor! How delightful. Your timing is PERFECT."],
      ["JOKER", "#cc55ff", "My Queen — why did the skeleton not cross the road?"],
      ["QUEEN BOUCEILIA", "#ff88cc", "…I dare not guess, fool."],
      ["JOKER", "#cc55ff", "Because it had no GUTS! Ha ha ha ha HA!"],
      ["QUEEN BOUCEILIA", "#ff88cc", "Pfff— hehehe… AHAHAHAHA!!"],
      ["JOKER", "#cc55ff", "She laughs! She LAUGHS! The joke was worth it after all—"],
      ["???", "#ff2222", "…"],
      ["???", "#ff2222", "The laughter… woke us."],
      ["QUEEN BOUCEILIA", "#ff88cc", "Oh no. Oh no no no— RUN, child! THE NAUGHTY ONES ARE HERE!"],
    ];
    let idx = 0;

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.88);display:flex;" +
      "flex-direction:column;align-items:center;justify-content:flex-end;" +
      "pointer-events:all;padding-bottom:8vh;gap:12px;";
    document.body.appendChild(ov);

    const box = document.createElement("div");
    box.style.cssText =
      "width:min(700px,90vw);background:rgba(10,7,20,0.97);border-radius:12px;" +
      "border:2px solid rgba(200,100,255,0.35);padding:22px 28px;";
    const hint = document.createElement("div");
    hint.style.cssText = "color:rgba(255,255,255,0.35);font-size:12px;font-family:Arial;text-align:center;";
    hint.textContent = "[ E / Click to continue ]";
    ov.appendChild(box); ov.appendChild(hint);

    const render = () => {
      const [speaker, col, text] = lines[idx];
      box.style.borderColor = col + "55";
      box.innerHTML = `
        <div style="color:${col};font-size:13px;font-family:'Arial Black',Arial;font-weight:900;letter-spacing:2px;margin-bottom:8px;">${speaker}</div>
        <div style="color:rgba(255,255,255,0.92);font-size:clamp(14px,2.2vw,20px);font-family:Arial;line-height:1.6;">${text}</div>`;
    };
    render();

    const advance = () => {
      idx++;
      if (idx >= lines.length) {
        ov.remove(); document.removeEventListener("keydown", keyFn);
        this._canvas.requestPointerLock?.();
        // Spawn naughty ones
        for (const nm of this._naughtyMeshes) nm.setEnabled(true);
        this._naughtyActive = true;
        this._flashMsg("🚨 RUN!!! Get to the maze exit!!!");
        this._flashScreen("rgba(255,0,0,0.45)");
        return;
      }
      render();
    };
    ov.addEventListener("pointerdown", advance);
    const keyFn = (e: KeyboardEvent) => { if (["KeyE","Space","Enter"].includes(e.code)) advance(); };
    document.addEventListener("keydown", keyFn);
  }

  private _mazeEscape(): void {
    this._inMaze   = false;
    this._inCastle = false;
    document.exitPointerLock?.();
    // Brief "you burst out of the castle" flash, then airplane
    const flash = document.createElement("div");
    flash.style.cssText = "position:fixed;inset:0;z-index:9999;background:#fff;pointer-events:none;opacity:1;transition:opacity 0.6s;";
    document.body.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = "0"; });
    setTimeout(() => { flash.remove(); this._showAirplaneMiniGame(); }, 800);
  }

  private _enterBabyBirdArea(): void {
    document.exitPointerLock?.();
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity 1s;";
    ov.innerHTML = `<div style="color:#aaffaa;font-size:clamp(18px,3vw,32px);font-family:'Arial Black',Arial;text-align:center;line-height:1.6;">
    ✈️ You make it back...<br><span style="font-size:0.65em;opacity:0.7;">The garden feels different now.</span></div>`;
    document.body.appendChild(ov);
    requestAnimationFrame(() => { ov.style.opacity = "1"; });
    setTimeout(() => {
      // Teleport to baby bird area
      this._camera.position.set(0, EYE_Y, 20);
      this._yaw   = 0;   // face positive Z (into the garden)
      this._pitch = 0;
      this._velY  = 0;
      this._inBabyBirdArea = true;
      this._inMaze = false; this._inCastle = false;
      this._checkpoint = new Vector3(0, EYE_Y, 20);
      this._buildBabyBirdArea();
      ov.style.transition = "opacity 0.8s";
      ov.style.opacity = "0";
      setTimeout(() => {
        ov.remove();
        this._canvas.requestPointerLock?.();
        this._flashMsg("🌿 Find the medal, distract the bird, rescue the baby bird!");
      }, 900);
    }, 2200);
  }

  // ── Bird Riding mini-game ─────────────────────────────────────────────────

  private _showBirdRidingGame(): void {
    document.exitPointerLock?.();
    this._g.autoClickCallback = null;

    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:9999;overflow:hidden;background:#4a8fc5;";
    document.body.appendChild(ov);

    const cv = document.createElement("canvas");
    cv.width  = window.innerWidth;
    cv.height = window.innerHeight;
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
    ov.appendChild(cv);
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;

    // ── State ──────────────────────────────────────────────────────────────
    const BANB_SPD = 280;     // Banbaleena's constant speed — background scrolls at this
    let opiSpdMod = 0;        // player's speed offset relative to Banbaleena
    const MAX_MOD = 250, MIN_MOD = -200;
    let relX = 0;             // relative X offset: positive = Opiilla ahead (right), negative = Banbaleena ahead
    const MAX_REL = W * 0.28;
    let bgX = 0;
    let done = false;
    let phase: "fly" | "door" | "nightmare" | "win" = "fly";

    // Generate 4 random doors
    const doorColors: Array<"pink"|"blue"> = Array.from({length: 4}, () => Math.random() < 0.5 ? "pink" : "blue");
    let doorIdx = 0;
    let doorX = W + 200;
    let doorPhaseTimer = 0;
    let doorInputDone = false;
    let doorCorrect = false;
    let distProgress = 0;

    // Nightmare Banban chase
    let nightmareX = W + 300;
    let nightmareTimer = 0;
    const NIGHTMARE_DURATION = 5.0;

    // Bird Y positions (bob slightly)
    let opiillaY = H * 0.45;
    let banbY   = H * 0.45;

    // Baby bird bob on banb
    let bbBobT = 0;

    const keys = new Set<string>();
    let doorPressKey: "W" | "S" | null = null;   // only set on fresh keydown during door phase
    const kd = (e: KeyboardEvent) => {
      keys.add(e.code);
      // Only count a fresh press (not held) for door decisions
      if (phase === "door" && !doorInputDone) {
        if (e.code === "KeyW" || e.code === "ArrowUp")   doorPressKey = "W";
        if (e.code === "KeyS" || e.code === "ArrowDown") doorPressKey = "S";
      }
      e.preventDefault();
    };
    const ku = (e: KeyboardEvent) => keys.delete(e.code);
    document.addEventListener("keydown", kd);
    document.addEventListener("keyup",   ku);

    // Clouds
    const clouds = Array.from({length: 8}, () => ({
      x: Math.random() * W * 2, y: H * 0.05 + Math.random() * H * 0.4,
      w: 60 + Math.random() * 100, h: 22 + Math.random() * 30, spd: 0.3 + Math.random() * 0.5,
    }));

    const end = (won: boolean) => {
      if (done) return; done = true;
      document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku);
      ov.remove();
      if (won) {
        // Victory overlay
        const wOv = document.createElement("div");
        wOv.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;" +
          "align-items:center;justify-content:center;gap:20px;font-family:'Arial Black',Arial;opacity:0;transition:opacity 0.6s;";
        wOv.innerHTML =
          `<div style="color:#ffdd44;font-size:clamp(24px,5vw,48px);font-weight:900;letter-spacing:2px;text-shadow:0 0 30px gold;">🐣 Baby Bird Rescued!</div>` +
          `<div style="color:rgba(255,255,255,0.65);font-size:clamp(12px,1.8vw,16px);text-align:center;line-height:2;">` +
          `The baby bird is safe with the flock.<br>Your adventure in the garden continues…</div>`;
        const btn2 = document.createElement("button");
        btn2.textContent = "Continue →";
        btn2.style.cssText = "margin-top:10px;background:rgba(255,255,255,0.1);color:#fff;font-size:16px;" +
          "padding:10px 32px;border-radius:24px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;";
        btn2.textContent = "Chapter 4 — Coming Soon";
        btn2.onclick = () => { /* coming soon */ };
        wOv.appendChild(btn2);
        document.body.appendChild(wOv);
        requestAnimationFrame(() => { wOv.style.opacity = "1"; });
      } else {
        // Retry
        ov.remove();
        this._showBirdRidingGame();
      }
    };

    // ── Draw helpers ───────────────────────────────────────────────────────

    const drawBird = (x: number, y: number, color: string, wingColor: string, size: number, wingFlap: number) => {
      ctx.save(); ctx.translate(x, y);
      // Body
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(0, 0, size * 0.7, size * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      // Wings (flapping)
      const wAngle = Math.sin(wingFlap * 8) * 0.5;
      ctx.fillStyle = wingColor;
      ctx.save(); ctx.rotate(-wAngle);
      ctx.beginPath(); ctx.ellipse(-size * 0.55, -size * 0.15, size * 0.6, size * 0.18, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.rotate(wAngle);
      ctx.beginPath(); ctx.ellipse( size * 0.55, -size * 0.15, size * 0.6, size * 0.18, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Head
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(size * 0.55, -size * 0.15, size * 0.32, 0, Math.PI * 2); ctx.fill();
      // Eye
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(size * 0.68, -size * 0.22, size * 0.10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(size * 0.71, -size * 0.22, size * 0.06, 0, Math.PI * 2); ctx.fill();
      // Beak
      ctx.fillStyle = "#f5c842";
      ctx.beginPath();
      ctx.moveTo(size * 0.82, -size * 0.17);
      ctx.lineTo(size * 0.99, -size * 0.12);
      ctx.lineTo(size * 0.82, -size * 0.07);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    };

    const drawBabyBird = (x: number, y: number) => {
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = "#f0d020";
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(-5, -3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 5, -3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#f5c842";
      ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(4, 4); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    };

    const drawNightmareBanban = (x: number, y: number, t: number) => {
      ctx.save(); ctx.translate(x, y);
      const pulse = 1 + Math.sin(t * 5) * 0.06;
      ctx.scale(pulse, pulse);
      // Dark body
      ctx.fillStyle = "#1a0a1a";
      ctx.beginPath(); ctx.ellipse(0, 0, 55, 72, 0, 0, Math.PI * 2); ctx.fill();
      // Red glow eyes
      ctx.fillStyle = "#ff0000";
      ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(-18, -18, 14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 18, -18, 14, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.arc(-18, -18, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 18, -18, 7, 0, Math.PI * 2); ctx.fill();
      // Mouth / teeth
      ctx.strokeStyle = "#ff0000"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 8, 28, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = "white";
      for (let i = -3; i <= 3; i++) {
        const tx = i * 9;
        ctx.beginPath(); ctx.moveTo(tx, 8); ctx.lineTo(tx - 4, 24); ctx.lineTo(tx + 4, 24); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    };

    // ── Game loop ──────────────────────────────────────────────────────────
    let lastT = performance.now();
    const loop = () => {
      if (done) return;
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
      const elapsed = performance.now() / 1000;

      // Player speed — W/S shifts Opiilla faster/slower than Banbaleena
      if (phase !== "nightmare") {
        if (keys.has("KeyW") || keys.has("ArrowUp"))   opiSpdMod = Math.min(MAX_MOD, opiSpdMod + 220 * dt);
        if (keys.has("KeyS") || keys.has("ArrowDown")) opiSpdMod = Math.max(MIN_MOD, opiSpdMod - 220 * dt);
        opiSpdMod *= (1 - dt * 1.2); // gradually drift back to same speed as Banbaleena
      } else {
        // Nightmare: hold W to go fast
        if (keys.has("KeyW") || keys.has("ArrowUp")) opiSpdMod = Math.min(MAX_MOD, opiSpdMod + 280 * dt);
        else opiSpdMod = Math.max(MIN_MOD, opiSpdMod - 160 * dt);
      }

      // Background always scrolls at Banbaleena's constant speed
      bgX -= BANB_SPD * dt;
      bbBobT += dt;

      // Relative position: Opiilla drifts ahead/behind Banbaleena based on speed difference
      relX += opiSpdMod * dt * 0.55;
      relX = Math.max(-MAX_REL, Math.min(MAX_REL, relX));

      // Clouds scroll at Banbaleena's speed
      for (const cl of clouds) { cl.x -= cl.spd; if (cl.x + cl.w * 2 < 0) cl.x = W + cl.w; }

      // Bird Y bob
      opiillaY = H * 0.45 + Math.sin(elapsed * 1.8) * 18;
      banbY  = H * 0.45 + Math.sin(elapsed * 1.8 + 0.9) * 18;

      // Door approach
      if (phase === "fly") {
        distProgress += dt * (BANB_SPD / 1200);
        if (distProgress > 1 && doorIdx < 4) {
          distProgress = 0;
          phase = "door";
          doorX = W + 160;
          doorPhaseTimer = 0;
          doorInputDone = false;
          doorCorrect   = false;
          doorPressKey  = null;
        }
        if (doorIdx >= 4) { phase = "win"; }
      } else if (phase === "door") {
        doorPhaseTimer += dt;
        doorX -= BANB_SPD * dt * 0.6;

        // Check input — only a FRESH key press counts, not held keys
        if (!doorInputDone && doorPressKey !== null) {
          const curDoor = doorColors[doorIdx];
          const correct = (curDoor === "blue" && doorPressKey === "W") ||
                          (curDoor === "pink" && doorPressKey === "S");
          doorInputDone = true;
          doorCorrect   = correct;
          doorPressKey  = null;
        }
        // Clear stale press if door hasn't arrived yet
        if (doorX > W * 0.65) doorPressKey = null;

        // Door passes player
        if (doorX < -200) {
          if (doorCorrect || !doorInputDone) {
            // Passed (if no input, be lenient — give them a miss first time)
            doorIdx++;
            phase = doorIdx >= 4 ? "win" : "fly";
            distProgress = 0;
          } else {
            // Wrong! Nightmare Banban
            phase = "nightmare";
            nightmareX = W + 300;
            nightmareTimer = 0;
            opiSpdMod = 0;
          }
        }

        // Timeout if no input
        if (doorPhaseTimer > 3.0 && !doorInputDone) {
          doorInputDone = false;
          doorIdx++;
          phase = doorIdx >= 4 ? "win" : "fly";
          distProgress = 0;
        }
      } else if (phase === "nightmare") {
        nightmareTimer += dt;
        // Nightmare Banban approaches from right if you're slow
        const catchSpeed = Math.max(0, (120 - opiSpdMod) * 1.2);
        nightmareX -= catchSpeed * dt;
        if (nightmareX < W * 0.3) {
          // Caught! Restart
          end(false); return;
        }
        if (nightmareTimer > NIGHTMARE_DURATION) {
          // Survived! Resume
          phase = "fly"; distProgress = 0;
          nightmareX = W + 300;
        }
      } else if (phase === "win") {
        end(true); return;
      }

      // ── Draw ──────────────────────────────────────────────────────────────

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#2e6da3"); sky.addColorStop(1, "#a8d4ee");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // Scrolling hills
      ctx.fillStyle = "#3a7a28";
      for (let hx = (bgX % 380) - 380; hx < W + 400; hx += 380) {
        ctx.beginPath(); ctx.ellipse(hx + 190, H * 0.82, 260, 80, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#48962f";
      for (let hx = ((bgX * 0.6) % 250) - 250; hx < W + 300; hx += 250) {
        ctx.beginPath(); ctx.ellipse(hx + 125, H * 0.87, 170, 55, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Ground strip
      ctx.fillStyle = "#2d5e1a";
      ctx.fillRect(0, H * 0.88, W, H * 0.12);

      // Clouds
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (const cl of clouds) { ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.w, cl.h, 0, 0, Math.PI * 2); ctx.fill(); }

      // ── Draw door ──────────────────────────────────────────────────────
      if (phase === "door" && doorIdx < 4) {
        const curDoor = doorColors[doorIdx];
        const doorColor = curDoor === "pink" ? "#ff6ec7" : "#4488ff";
        const doorGlow  = curDoor === "pink" ? "#ffaadd" : "#88bbff";
        const doorW = 120, doorH = H * 0.75;
        const dx = doorX - doorW / 2;

        // Door frame
        ctx.shadowColor = doorGlow; ctx.shadowBlur = 30;
        ctx.fillStyle = doorColor;
        ctx.fillRect(dx - 18, H * 0.1, 18, doorH);           // left post
        ctx.fillRect(dx + doorW, H * 0.1, 18, doorH);         // right post
        ctx.fillRect(dx - 18, H * 0.1, doorW + 36, 22);       // top beam
        ctx.shadowBlur = 0;

        // Door fill (semi-transparent)
        ctx.fillStyle = curDoor === "pink" ? "rgba(255,110,199,0.22)" : "rgba(68,136,255,0.22)";
        ctx.fillRect(dx, H * 0.1 + 22, doorW, doorH - 22);

        // Hint label near door
        if (!doorInputDone) {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.75)";
          ctx.fillRect(W / 2 - 160, H * 0.05, 320, 44);
          ctx.fillStyle = "#fff"; ctx.font = "bold 15px Arial"; ctx.textAlign = "center";
          const hint = curDoor === "pink"
            ? "🩷 PINK DOOR — Pink bird first → SLOW DOWN [S]"
            : "💙 BLUE DOOR — You go first → SPEED UP [W]";
          ctx.fillText(hint, W / 2, H * 0.05 + 28);
          ctx.restore();
        }

        if (doorCorrect && doorInputDone) {
          ctx.fillStyle = "rgba(100,255,100,0.55)";
          ctx.fillRect(dx, H * 0.1 + 22, doorW, doorH - 22);
          ctx.fillStyle = "#6f6"; ctx.font = "bold 28px 'Arial Black'"; ctx.textAlign = "center";
          ctx.fillText("✓ CORRECT!", W / 2, H / 2);
        }
      }

      // ── Nightmare Banban ────────────────────────────────────────────────
      if (phase === "nightmare") {
        // Red vignette
        const vigAlpha = Math.max(0, (W * 0.7 - nightmareX) / (W * 0.4));
        ctx.fillStyle = `rgba(180,0,0,${vigAlpha * 0.35})`;
        ctx.fillRect(0, 0, W, H);

        drawNightmareBanban(nightmareX, H * 0.48, elapsed);

        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(W / 2 - 170, 16, 340, 42);
        ctx.fillStyle = `rgba(255,80,80,${0.7 + Math.sin(elapsed * 6) * 0.3})`;
        ctx.font = "bold 15px 'Arial Black'"; ctx.textAlign = "center";
        ctx.fillText("😱 NIGHTMARE BANBAN! HOLD [W] TO ESCAPE!", W / 2, 43);

        // Speed bar
        const pct = (opiSpdMod - MIN_MOD) / (MAX_MOD - MIN_MOD);
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(W / 2 - 130, H - 38, 260, 18);
        ctx.fillStyle = pct > 0.5 ? "#44ff66" : pct > 0.25 ? "#ffdd00" : "#ff4444";
        ctx.fillRect(W / 2 - 130, H - 38, 260 * pct, 18);
        ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2;
        ctx.strokeRect(W / 2 - 130, H - 38, 260, 18);
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px Arial"; ctx.textAlign = "center";
        ctx.fillText("SPEED — KEEP IT HIGH!", W / 2, H - 24);

        // Escape timer bar
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(W / 2 - 80, H - 64, 160, 12);
        ctx.fillStyle = "#ff8800";
        ctx.fillRect(W / 2 - 80, H - 64, 160 * (nightmareTimer / NIGHTMARE_DURATION), 12);
        ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1.5;
        ctx.strokeRect(W / 2 - 80, H - 64, 160, 12);
      }

      // ── Birds ──────────────────────────────────────────────────────────
      const wFlap = elapsed;
      // Banbaleena (pink bird, right side)
      // Banbaleena — fixed reference point on screen
      const banbScreenX = W * 0.6;
      drawBird(banbScreenX, banbY, "#ff88cc", "#ff55aa", 48, wFlap + 1.2);
      drawBabyBird(banbScreenX - 8, banbY - 52 + Math.sin(bbBobT * 3.5) * 4);
      // Blue Opiilla — shifts left (ahead) when faster, right (behind) when slower
      const opiScreenX = W * 0.4 + relX;
      drawBird(opiScreenX, opiillaY, "#3366ee", "#2244cc", 58, wFlap);

      // ── Speed indicator ────────────────────────────────────────────────
      if (phase !== "nightmare") {
        // Show relative speed: centre = same as Banbaleena, right = faster, left = slower
        const spd2 = (opiSpdMod - MIN_MOD) / (MAX_MOD - MIN_MOD);
        ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(20, H - 38, 150, 16);
        ctx.fillStyle = spd2 > 0.5 ? "#44ff66" : "#ffdd33";
        ctx.fillRect(20, H - 38, 150 * spd2, 16);
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.5;
        ctx.strokeRect(20, H - 38, 150, 16);
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px Arial"; ctx.textAlign = "left";
        ctx.fillText("SPEED", 22, H - 26);
      }

      // Door counter
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "bold 13px Arial"; ctx.textAlign = "right";
      ctx.fillText(`Gates: ${Math.min(doorIdx, 4)}/4`, W - 16, 26);

      // Controls reminder (first 5s)
      if (elapsed < 5) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(W / 2 - 145, H - 72, 290, 28);
        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "13px Arial"; ctx.textAlign = "center";
        ctx.fillText("[W] Speed up  •  [S] Slow down  •  Match the door!", W / 2, H - 52);
      }
    };

    requestAnimationFrame(loop);
  }

  // ── Airplane mini-game ────────────────────────────────────────────────────

  private _showAirplaneMiniGame(): void {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:9999;overflow:hidden;background:#5ba3d9;";
    document.body.appendChild(ov);

    const cv = document.createElement("canvas");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    cv.width  = ov.clientWidth  || window.innerWidth;
    cv.height = ov.clientHeight || window.innerHeight;
    ov.appendChild(cv);
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;

    // ── State ──────────────────────────────────────────────────────────────
    const plane = { x: W * 0.25, y: H * 0.5, vx: 0, vy: 0 };
    const jester = {
      x: W + 200, y: H * 0.5,   // start off-screen (hidden during initial wait)
      phase: "wait" as "sweep"|"wait",
      timer: 0,
    };
    let progress   = 0;
    let done       = false;
    let attempts   = 0;

    const clouds = Array.from({ length: 10 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.75 + H * 0.05,
      w: 55 + Math.random() * 90, h: 22 + Math.random() * 28, spd: 0.4 + Math.random() * 0.6,
    }));

    const keys = new Set<string>();
    const kd = (e: KeyboardEvent) => keys.add(e.code);
    const ku = (e: KeyboardEvent) => keys.delete(e.code);
    document.addEventListener("keydown", kd);
    document.addEventListener("keyup",   ku);

    // ── Draw helpers ───────────────────────────────────────────────────────
    const drawPlane = (x: number, y: number, alpha = 1) => {
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y);
      // Fuselage
      ctx.fillStyle = "#e8e8ee";
      ctx.beginPath(); ctx.ellipse(0, 0, 44, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#aaa"; ctx.lineWidth = 1.5; ctx.stroke();
      // Main wing
      ctx.fillStyle = "#c8c8d8";
      ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-26, 28); ctx.lineTo(14, 2); ctx.closePath(); ctx.fill();
      // Tail fin
      ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-48, -14); ctx.lineTo(-28, 0); ctx.closePath(); ctx.fill();
      // Nose cone
      ctx.fillStyle = "#ff4444";
      ctx.beginPath(); ctx.ellipse(44, 0, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
      // Propeller
      ctx.fillStyle = "#333";
      ctx.fillRect(50, -14, 7, 28);
      ctx.restore();
    };

    const drawJester = (x: number, y: number, phase: string, chargeRatio: number) => {
      ctx.save(); ctx.translate(x, y);
      const pulse = phase === "sweep" ? 1.25 : 1;
      ctx.scale(pulse, pulse);

      // Legs
      ctx.fillStyle = "#0f0a3a"; ctx.fillRect(-20, 30, 16, 32);
      ctx.fillStyle = "#137018"; ctx.fillRect(4, 30, 16, 32);

      // Torso left (blue)
      ctx.fillStyle = "#0f0a3a";
      ctx.fillRect(-22, -28, 22, 60);
      // Torso right (green)
      ctx.fillStyle = "#137018";
      ctx.fillRect(0, -28, 22, 60);

      // Jagged seam
      ctx.fillStyle = "#000";
      for (let i = 0; i < 6; i++) {
        const ty = -22 + i * 10;
        ctx.beginPath();
        ctx.moveTo(i % 2 === 0 ? -5 : 0, ty);
        ctx.lineTo(i % 2 === 0 ? 5 : -5, ty + 5);
        ctx.lineTo(i % 2 === 0 ? -5 : 0, ty + 10);
        ctx.closePath(); ctx.fill();
      }

      // Arms
      ctx.fillStyle = "#0f0a3a"; ctx.fillRect(-38, -22, 16, 44);
      ctx.fillStyle = "#137018"; ctx.fillRect(22, -22, 16, 44);

      // Head — left blue, right green
      ctx.fillStyle = "#0f0a3a";
      ctx.beginPath(); ctx.arc(-6, -46, 20, Math.PI * 0.5, Math.PI * 1.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#137018";
      ctx.beginPath(); ctx.arc(6, -46, 20, -Math.PI * 0.5, Math.PI * 0.5); ctx.closePath(); ctx.fill();

      // Big round eyes (GotB style)
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(-10, -50, 11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 10, -50, 11, 0, Math.PI * 2); ctx.fill();
      // Pupils
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(-10, -50, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 10, -50, 6, 0, Math.PI * 2); ctx.fill();
      // Tiny shine
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(-7, -53, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(13, -53, 2.5, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    };

    // ── Game loop ──────────────────────────────────────────────────────────
    let lastT = performance.now();
    const loop = () => {
      if (done) return;
      requestAnimationFrame(loop);
      const now = performance.now();
      const dt  = Math.min((now - lastT) / 1000, 0.05); lastT = now;

      // Move clouds
      for (const cl of clouds) { cl.x -= cl.spd; if (cl.x + cl.w * 2 < 0) cl.x = W + cl.w; }

      // Move plane
      const SPDX = 210, SPDY = 2100;
      if (keys.has("ArrowLeft")  || keys.has("KeyA")) plane.vx -= SPDX * dt;
      if (keys.has("ArrowRight") || keys.has("KeyD")) plane.vx += SPDX * dt;
      if (keys.has("ArrowUp")    || keys.has("KeyW")) plane.vy -= SPDY * dt;
      if (keys.has("ArrowDown")  || keys.has("KeyS")) plane.vy += SPDY * dt;
      plane.vx *= 0.86; plane.vy *= 0.72;
      plane.x = Math.max(50, Math.min(W - 50, plane.x + plane.vx * dt));
      plane.y = Math.max(35, Math.min(H - 50, plane.y + plane.vy * dt));

      // Progress (auto-advances)
      progress = Math.min(1, progress + dt * 0.055);

      // Update Jester — sweeps left→right across screen, then waits before next sweep
      jester.timer += dt;
      if (jester.phase === "sweep") {
        jester.x += 700 * dt;
        // Kill on contact at any time during sweep
        const dx = jester.x - plane.x, dy = jester.y - plane.y;
        if (Math.sqrt(dx * dx + dy * dy) < 58) { crash(); return; }
        // Off the right edge → wait before next sweep
        if (jester.x > W + 120) { jester.phase = "wait"; jester.timer = 0; }
      } else {
        // Wait ~2.2s then reset to left edge at a new random height
        if (jester.timer > 3.5) {
          jester.x = -120;
          jester.y = H * 0.1 + Math.random() * H * 0.80;
          jester.phase = "sweep"; jester.timer = 0;
        }
      }

      // Win
      if (progress >= 1) { end(true); return; }

      // ── Draw ────────────────────────────────────────────────────────────
      // Sky gradient
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#4a8fc5"); g.addColorStop(1, "#b8dcf0");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // Clouds
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      for (const cl of clouds) { ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.w, cl.h, 0, 0, Math.PI * 2); ctx.fill(); }

      // Flash warning when Jester is about to reappear (last 0.5s of wait)
      if (jester.phase === "wait" && jester.timer > 2.5) {
        ctx.save();
        const f = Math.min(1, (jester.timer - 2.5) / 1.0);
        ctx.fillStyle = `rgba(255,30,30,${f * 0.25})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(255,80,60,${0.5 + Math.sin(Date.now() * 0.02) * 0.4})`;
        ctx.font = "bold 18px 'Arial Black'";
        ctx.textAlign = "center";
        ctx.fillText("⚡ JESTER INCOMING ⚡", W / 2, 52);
        ctx.restore();
      }

      drawJester(jester.x, jester.y, jester.phase, 0);
      drawPlane(plane.x, plane.y);

      // Progress bar
      ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fillRect(W / 2 - 155, 14, 310, 20);
      ctx.fillStyle = progress > 0.65 ? "#44ff66" : "#ffdd33";
      ctx.fillRect(W / 2 - 155, 14, 310 * progress, 20);
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - 155, 14, 310, 20);
      ctx.fillStyle = "#fff"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center";
      ctx.fillText("ESCAPE DISTANCE", W / 2, 29);

      // Controls hint first few seconds
      if (progress < 0.12) {
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.font = "14px Arial"; ctx.textAlign = "center";
        ctx.fillText("WASD / Arrow Keys — dodge the Jester's dash!", W / 2, H - 22);
      }
    };

    // ── Crash ──────────────────────────────────────────────────────────────
    const crash = () => {
      if (done) return; done = true;
      document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku);
      attempts++;
      let fy = plane.y, fvy = -5, angle = 0;
      const fx = plane.x;
      const crashLoop = setInterval(() => {
        fvy += 0.6; fy += fvy; angle += 0.07;
        ctx.clearRect(0, 0, W, H);
        const g2 = ctx.createLinearGradient(0, 0, 0, H);
        g2.addColorStop(0, "#4a8fc5"); g2.addColorStop(1, "#b8dcf0");
        ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.78)";
        for (const cl of clouds) { ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.w, cl.h, 0, 0, Math.PI * 2); ctx.fill(); }
        // Falling spinning plane
        ctx.save(); ctx.translate(fx, fy); ctx.rotate(angle); ctx.globalAlpha = 0.9;
        drawPlane(0, 0); ctx.restore();
        // Fire balls
        ctx.globalAlpha = 0.9;
        for (let p = 0; p < 6; p++) {
          ctx.fillStyle = `hsl(${20 + Math.random() * 30},100%,${50 + Math.random() * 20}%)`;
          ctx.beginPath(); ctx.arc(fx + (Math.random()-0.5)*70, fy + (Math.random()-0.5)*50, 4+Math.random()*16, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (fy > H + 80) {
          clearInterval(crashLoop);
          ov.remove();
          const dOv = document.createElement("div");
          dOv.style.cssText = "position:fixed;inset:0;z-index:99999;background:#000;display:flex;" +
            "flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:none;" +
            "opacity:0;transition:opacity 0.4s;";
          dOv.innerHTML =
            `<div style="color:#ff4422;font-size:clamp(38px,8vw,72px);font-family:'Arial Black',Arial;` +
            `font-weight:900;letter-spacing:4px;text-shadow:0 0 30px #ff2200;">YOU CRASHED</div>` +
            (attempts < 3
              ? `<div style="color:rgba(255,255,255,0.55);font-size:16px;font-family:Arial;">Watch the red ring — dodge when it charges!</div>`
              : ``);
          document.body.appendChild(dOv);
          requestAnimationFrame(() => { dOv.style.opacity = "1"; });
          setTimeout(() => { dOv.remove(); this._showAirplaneMiniGame(); }, 1800);
        }
      }, 16);
    };

    // ── Win / end ──────────────────────────────────────────────────────────
    const end = (won: boolean) => {
      if (done) return; done = true;
      document.removeEventListener("keydown", kd); document.removeEventListener("keyup", ku);
      ov.remove();
      if (won) {
        const wOv = document.createElement("div");
        wOv.style.cssText = "position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;" +
          "align-items:center;justify-content:center;gap:22px;font-family:'Arial Black',Arial;pointer-events:all;opacity:0;transition:opacity 0.5s;";
        wOv.innerHTML =
          `<div style="color:#ffdd44;font-size:clamp(26px,5vw,50px);font-weight:900;letter-spacing:3px;` +
          `text-shadow:0 0 30px rgba(255,210,0,0.7);">✈️  YOU ESCAPED!</div>` +
          `<div style="color:rgba(255,255,255,0.62);font-size:clamp(12px,1.9vw,17px);text-align:center;line-height:1.9;">` +
          `The Jester fades into the clouds behind you.<br>You fly on… to wherever the wind takes you.</div>`;
        const btn = document.createElement("button");
        btn.textContent = "Continue →";
        btn.style.cssText = "margin-top:10px;background:rgba(255,255,255,0.1);color:#fff;font-size:17px;" +
          "padding:11px 34px;border-radius:28px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;";
        btn.onclick = () => { wOv.remove(); this._enterBabyBirdArea(); };
        wOv.appendChild(btn);
        document.body.appendChild(wOv);
        requestAnimationFrame(() => { wOv.style.opacity = "1"; });
      }
    };

    requestAnimationFrame(loop);
  }

  // ── Restore saved state ───────────────────────────────────────────────────

  private _restoreState(s: SavedState3): void {
    this._camera.position.set(s.camPos[0], s.camPos[1], s.camPos[2]);
    this._yaw = s.yaw; this._pitch = s.pitch;
    this._camera.rotation.set(s.pitch, s.yaw, 0);

    if (s.hasOrangeKey) {
      this._hasOrangeKey = true;
      this._scene.getMeshByName("orange_key")?.setEnabled(false);
    }
    if (s.orangeDoorOpen) {
      this._orangeDoorOpen = true;
      this._orangeDoorMesh.position.x = -3.5;
      this._orangeDoorMesh.checkCollisions = false;
      const ii = this._interactables.findIndex(i => i.id === "underground_door");
      if (ii >= 0) this._interactables.splice(ii, 1);
    }
    this._stingerFlynWoken = s.stingerFlynWoken;
    this._elevatorY = s.elevatorY; this._elevatorState = s.elevatorState;
    this._elevatorPlatform.position.y = s.elevatorY + 0.075;

    if (s.inNursery) {
      this._inNursery = true;
      this._scene.clearColor = new Color4(0.72, 0.90, 0.78, 1);
      this._hintLabel.style.display = "block";
    }
    if (s.checkpoint) this._checkpoint = new Vector3(s.checkpoint[0], s.checkpoint[1], s.checkpoint[2]);

    for (let i = 0; i < 3; i++) {
      if (s.xBtnPressed[i] && this._xBtnMats[i]) {
        this._xBtnMats[i].diffuseColor  = new Color3(0.10, 0.85, 0.15);
        this._xBtnMats[i].emissiveColor = new Color3(0.04, 0.50, 0.06);
      }
    }
    this._xBtnPressed = [...s.xBtnPressed] as [boolean,boolean,boolean];
    this._xPressSeq   = [...s.xPressSeq];

    if (s.jjDoorOpen) {
      this._jjDoorOpen = true;
      this._jjDoor.position.x = 6.85 + 2.2;
      this._jjDoor.checkCollisions = false;
    }
  }

  _cleanup(): void {
    if (this._done) return; this._done = true;
    // Save state so Resume works
    if (this._started && this._camera) {
      GardenBanban3._save = {
        camPos:           [this._camera.position.x, this._camera.position.y, this._camera.position.z],
        yaw:              this._yaw, pitch: this._pitch,
        hasOrangeKey:     this._hasOrangeKey,
        orangeDoorOpen:   this._orangeDoorOpen,
        elevatorY:        this._elevatorY,
        elevatorState:    this._elevatorState,
        stingerFlynWoken: this._stingerFlynWoken,
        inNursery:        this._inNursery,
        xBtnPressed:      [...this._xBtnPressed] as [boolean,boolean,boolean],
        xPressSeq:        [...this._xPressSeq],
        jjDoorOpen:       this._jjDoorOpen,
        checkpoint:       this._checkpoint ? [this._checkpoint.x, this._checkpoint.y, this._checkpoint.z] : null,
      };
    }
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
    this._g.goArcade();
  }
}
