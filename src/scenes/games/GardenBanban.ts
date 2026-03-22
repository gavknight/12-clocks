/**
 * Garten of Banban — 3D first-person puzzle
 * Find the keycard, use your drone to press buttons, reach the elevator!
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
import { GardenBanban2 }    from "./GardenBanban2";
import type { Game }        from "../../game/Game";

const DRONE_HATS = [
  { id: "none",      label: "No Hat",     emoji: "🚁" },
  { id: "party",     label: "Party Hat",  emoji: "🎉" },
  { id: "tophat",    label: "Top Hat",    emoji: "🎩" },
  { id: "crown",     label: "Crown",      emoji: "👑" },
  { id: "cowboy",    label: "Cowboy",     emoji: "🤠" },
  { id: "propeller", label: "Propeller",  emoji: "🌀" },
  { id: "santa",     label: "Santa Hat",  emoji: "🎅" },
  { id: "flower",    label: "Flower",     emoji: "🌸" },
];
const LOBBY_W = 24, LOBBY_D = 20, ROOM_H = 3.5;
const HALL_W = 4,   HALL_D  = 18;
const PLAY_W = 20,  PLAY_D  = 22;
const BP_W   = 22,  BP_D    = 20; // Ball Pit room
const EYE_Y = 1.65, SPD = 5, E_DIST = 2.8;

const MONSTER_PALETTE = ["#ff2222","#ff8800","#22bb22","#ff99cc","#4488ff","#ffffff"];
const MONSTER_CORRECT = [0, 5, 2, 3, 4, 1]; // Banban=Red, Banbaleena=White, Josh=Green, Opila=Pink, Fiddles=Blue, Flynn=Orange
const MONSTER_NAMES   = ["Banban","Banbaleena","Jumbo Josh","Opila Bird","Capt. Fiddles","Stinger Flynn"];

interface Interactable {
  mesh: Mesh;
  id: string;
  label: string;
  onInteract: () => void;
}

export class GardenBanban {
  private _g:      Game;
  private _wrap:   HTMLDivElement;
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _scene:  Scene;
  private _camera: FreeCamera;

  private _hasKeycard  = false;
  private _btnPressed  = false;
  private _lobbyDoor!: Mesh;
  private _hallDoor!:  Mesh;
  private _btnMesh!:   Mesh;
  private _droneMesh!: Mesh;
  private _droneTarget: Vector3 | null = null;
  private _droneParked = false;
  private _interactables: Interactable[] = [];
  private _score  = 0;
  private _done   = false;
  private _ending = false;

  private _xray        = false;
  private _eggBeacons: Mesh[] = [];
  private _adminPanel!: HTMLDivElement;
  private _aimedAt: Interactable | null = null;
  private _selectedHat = "none";
  private _hatSpinMesh: Mesh | null = null;
  private _hatMeshes:   Mesh[] = [];

  private _eggsCollected  = 0;
  private _eggsFed        = 0;
  private _opilaDone      = false;
  private _hasYellowKey   = false;
  private _yellowBtnActive = false;
  private _naughtyOpen    = false;
  private _hasHammer      = false;

  // ── Ball Pit room state ───────────────────────────────────────────────────
  private _ballPitOpen        = false;
  private _pitPlanks!:        Mesh;
  private _pitBarrier!:       Mesh;
  private _pitSafeWallE!:     Mesh;
  private _colorPuzzleSolved  = false;
  private _platformExtended   = false;
  private _opilaChasingPlayer = false;
  private _emergencyStopUsed  = false;
  private _hasOrangeKey       = false;
  private _orangeKeyMesh:     Mesh | null = null;
  private _gondolaMesh:       Mesh | null = null;
  private _pitOpilaMesh:      Mesh | null = null;
  private _monsterCurColors   = [3, 0, 4, 1, 2, 3]; // start all wrong
  private _hitCooldown        = 0; // seconds of invincibility after respawn

  private _yellowKeyMesh!: Mesh;
  private _hammerMesh!:    Mesh;
  private _naughtyDoor!:   Mesh;
  private _yellowBtnMesh!: Mesh;

  private _yaw = 0;
  private _pitch = 0;
  private _velY = 0;
  private _keys = new Set<string>();
  private _started = false;

  private _kd!: (e: KeyboardEvent) => void;
  private _ku!: (e: KeyboardEvent) => void;
  private _mm!: (e: MouseEvent)    => void;
  private _mc!: (e: PointerEvent)  => void;
  private _rz!: () => void;

  private _hudPrompt!:  HTMLDivElement;
  private _hudKeycard!: HTMLSpanElement;
  private _startOverlay!: HTMLDivElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;

    this._wrap = document.createElement("div");
    this._wrap.style.cssText = "position:absolute;inset:0;overflow:hidden;background:#000;";
    g.ui.innerHTML = "";
    g.ui.appendChild(this._wrap);

    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;";
    this._wrap.appendChild(this._canvas);

    this._engine = new Engine(this._canvas, true);
    this._scene  = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.07, 0.07, 0.09, 1);

    // Camera
    this._camera = new FreeCamera("cam", new Vector3(0, EYE_Y, 7), this._scene);
    this._camera.minZ = 0.05;
    this._camera.maxZ = 80;
    this._camera.checkCollisions = true;
    this._camera.ellipsoid = new Vector3(0.35, EYE_Y * 0.5, 0.35);
    this._camera.ellipsoidOffset = new Vector3(0, EYE_Y * 0.5, 0);
    this._scene.collisionsEnabled = true;
    this._selectedHat = localStorage.getItem("banban_drone_hat") ?? "none";

    // Ambient (bright fluorescent-ish)
    const amb = new HemisphericLight("amb", new Vector3(0, 1, 0), this._scene);
    amb.intensity    = 0.75;
    amb.diffuse      = new Color3(0.95, 0.95, 1.0);
    amb.groundColor  = new Color3(0.35, 0.32, 0.28);

    // Strip light point-lights in lobby
    for (const [lx, lz] of [[-8,0],[0,0],[8,0]]) {
      const pl = new PointLight("sl", new Vector3(lx, ROOM_H - 0.1, lz), this._scene);
      pl.diffuse    = new Color3(1, 1, 0.95);
      pl.intensity  = 0.5;
      pl.range      = 14;
    }
    // Hallway light
    const hpl = new PointLight("hsl", new Vector3(0, ROOM_H - 0.1, -LOBBY_D/2 - HALL_D/2), this._scene);
    hpl.diffuse   = new Color3(1, 1, 0.95);
    hpl.intensity = 0.6;
    hpl.range     = 20;

    this._buildLobby();
    this._buildHallway();
    this._buildHUD();
    this._setupInput();

    this._engine.runRenderLoop(() => {
      if (!this._done) this._tick(this._engine.getDeltaTime() / 1000);
      this._scene.render();
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private _mat(r: number, g: number, b: number, emR = 0, emG = 0, emB = 0): StandardMaterial {
    const m = new StandardMaterial("", this._scene);
    m.diffuseColor = new Color3(r, g, b);
    if (emR || emG || emB) m.emissiveColor = new Color3(emR, emG, emB);
    return m;
  }

  private _box(w: number, h: number, d: number, x: number, y: number, z: number,
               mat: StandardMaterial, pickable = false, collide = false): Mesh {
    const m = MeshBuilder.CreateBox("", { width: w, height: h, depth: d }, this._scene);
    m.position.set(x, y, z);
    m.material  = mat;
    m.isPickable = pickable;
    m.checkCollisions = collide;
    return m;
  }

  // ── Room building ──────────────────────────────────────────────────────────

  private _buildLobby(): void {
    const LW = LOBBY_W, LD = LOBBY_D, H = ROOM_H;

    // Floor — dark wood planks
    const floorMat = this._mat(0.26, 0.17, 0.09);
    const floor = MeshBuilder.CreateGround("floor", { width: LW, height: LD }, this._scene);
    floor.material = floorMat;

    // Plank lines
    const plankMat = this._mat(0.20, 0.13, 0.07);
    for (let z = -LD/2; z < LD/2; z += 1.2) {
      const g = MeshBuilder.CreateGround("pk", { width: LW, height: 0.04 }, this._scene);
      g.position.set(0, 0.002, z);
      g.material = plankMat;
      g.isPickable = false;
    }

    // Ceiling — white
    const ceilMat = this._mat(0.93, 0.93, 0.94);
    const ceil = MeshBuilder.CreateGround("ceil", { width: LW, height: LD }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.y = H; ceil.material = ceilMat;

    // Fluorescent strip lights (emissive white bars on ceiling)
    const stripMat = this._mat(1, 1, 0.95, 0.95, 0.95, 0.88);
    for (let lx = -8; lx <= 8; lx += 8) {
      const s = MeshBuilder.CreateBox("", { width: 0.16, height: 0.04, depth: 4.5 }, this._scene);
      s.position.set(lx, H - 0.02, 0);
      s.material = stripMat;
      s.isPickable = false;
    }

    // Walls — light gray/white
    const wallMat = this._mat(0.87, 0.87, 0.89);
    // South
    this._box(LW, H, 0.2,  0, H/2,  LD/2, wallMat, false, true);
    // East
    this._box(0.2, H, LD, LW/2, H/2, 0, wallMat, false, true);
    // West
    this._box(0.2, H, LD, -LW/2, H/2, 0, wallMat, false, true);
    // North — split for teal door (2 wide)
    const sideW = (LW - 2.2) / 2;
    this._box(sideW, H, 0.2, -(1.1 + sideW/2), H/2, -LD/2, wallMat, false, true);
    this._box(sideW, H, 0.2,  (1.1 + sideW/2), H/2, -LD/2, wallMat, false, true);
    this._box(2.2, H - 2.5, 0.2, 0, 2.5 + (H-2.5)/2, -LD/2, wallMat, false, true);

    // Mascot mural on north wall
    this._buildMural();

    // Teal door frame
    const tealMat = this._mat(0.13, 0.50, 0.46);
    this._box(2.4, 2.65, 0.22, 0, 1.325, -LD/2, tealMat, false, true);
    // Door itself (removed when keycard used)
    const doorMat = this._mat(0.15, 0.44, 0.40);
    this._lobbyDoor = this._box(2.0, 2.4, 0.08, 0, 1.2, -LD/2 + 0.12, doorMat, false, true);

    // Keycard reader next to door
    const readerBgMat = this._mat(0.10, 0.10, 0.14);
    const reader = this._box(0.18, 0.32, 0.07, 1.45, 1.25, -LD/2 + 0.16, readerBgMat, true);
    reader.name = "reader";
    const screenMat = this._mat(0.08, 0.55, 0.12, 0.0, 0.28, 0.05);
    this._box(0.1, 0.07, 0.04, 1.45, 1.33, -LD/2 + 0.21, screenMat);
    this._interactables.push({
      mesh: reader, id: "reader",
      label: "[ E ] Use Blue Keycard",
      onInteract: () => this._useKeycard(),
    });

    // Gray couches on west side
    const couchMat = this._mat(0.42, 0.42, 0.46);
    // Long sofa
    this._box(4.8, 0.48, 1.15, -9, 0.24, 1.5, couchMat, false, true);
    this._box(4.8, 0.8,  0.14, -9, 0.40, 2.0, couchMat, false, true);
    // Armchair
    this._box(1.4, 0.48, 1.15, -9, 0.24, 4.5, couchMat, false, true);
    this._box(1.4, 0.8,  0.14, -9, 0.40, 5.0, couchMat, false, true);
    // Small coffee table
    const tableMat = this._mat(0.35, 0.22, 0.10);
    this._box(1.2, 0.8, 0.7, -9, 0.4, 3.2, tableMat, false, true);

    // Front desk (right side)
    const deskMat = this._mat(0.20, 0.13, 0.07);
    this._box(3.2, 1.0, 0.85, 8.5, 0.5, 1.5, deskMat, false, true);
    this._box(3.2, 0.06, 0.85, 8.5, 1.03, 1.5, this._mat(0.28, 0.18, 0.10));

    // Blue keycard on desk — flat card with stripe and two circle holes
    const kcMat = this._mat(0.08, 0.42, 0.95, 0.03, 0.12, 0.38);
    const kc = this._box(0.7, 0.05, 0.44, 8.5, 1.075, 1.5, kcMat, true);
    kc.name = "keycard";
    // White stripe — parented to card
    const kcStripeMat = this._mat(0.9, 0.9, 0.92, 0.1, 0.1, 0.12);
    const kcStripe = this._box(0.7, 0.051, 0.10, 8.5, 1.076, 1.5, kcStripeMat);
    kcStripe.parent = kc;
    kcStripe.position.set(0, 0.001, 0);
    // Two white circle holes — parented to card
    for (const oz of [-0.1, 0.1]) {
      const hole = MeshBuilder.CreateCylinder("", { diameter: 0.07, height: 0.06, tessellation: 12 }, this._scene);
      hole.material = this._mat(0.95, 0.95, 0.97, 0.15, 0.15, 0.18);
      hole.isPickable = false;
      hole.parent = kc;
      hole.position.set(0, 0.005, oz);
    }
    this._interactables.push({
      mesh: kc, id: "keycard",
      label: "[ E ] Pick up Blue Keycard",
      onInteract: () => this._pickupKeycard(kc),
    });

    // Shoe rack near west wall
    const rackMat = this._mat(0.30, 0.20, 0.10);
    this._box(0.15, 1.0, 1.2, -LW/2 + 0.3, 0.5, -6, rackMat);

    // East wall — colorful drawings
    const balloonMat = this._mat(0.88, 0.18, 0.18, 0.08, 0.0, 0.0);
    this._box(0.07, 1.6, 1.0, LW/2 - 0.15, 2.1, -2,   balloonMat);
    const starMat = this._mat(0.18, 0.68, 0.22, 0.0, 0.08, 0.0);
    this._box(0.07, 1.1, 1.1, LW/2 - 0.15, 2.0,  1.5, starMat);
    const blueMat = this._mat(0.18, 0.32, 0.92, 0.0, 0.0, 0.12);
    this._box(0.07, 1.3, 0.9, LW/2 - 0.15, 2.1,  4.5, blueMat);

    // Drone — body + 4 arms + rotor discs
    const droneBodyMat = this._mat(0.82, 0.82, 0.85, 0.08, 0.08, 0.10);
    const droneArmMat  = this._mat(0.55, 0.55, 0.58);
    const rotorMat     = this._mat(0.20, 0.20, 0.22, 0.05, 0.05, 0.06);
    // Body (flattened sphere)
    this._droneMesh = MeshBuilder.CreateSphere("drone", { diameter: 0.18, segments: 7 }, this._scene);
    this._droneMesh.scaling.y = 0.55;
    this._droneMesh.material  = droneBodyMat;
    this._droneMesh.isPickable = false;
    this._droneMesh.position.set(0.8, EYE_Y - 0.3, 6.2);
    // 4 arms + rotors parented to body
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const ax = Math.cos(angle) * 0.16, az = Math.sin(angle) * 0.16;
      const arm = MeshBuilder.CreateBox("", { width: 0.04, height: 0.02, depth: 0.22 }, this._scene);
      arm.rotation.y = -angle;
      arm.material   = droneArmMat;
      arm.isPickable = false;
      arm.parent = this._droneMesh;
      arm.position.set(ax, 0, az);
      const rotor = MeshBuilder.CreateCylinder("", { diameter: 0.14, height: 0.015, tessellation: 8 }, this._scene);
      rotor.material   = rotorMat;
      rotor.isPickable = false;
      rotor.parent = this._droneMesh;
      rotor.position.set(ax * 1.9, 0.02, az * 1.9);
    }
    this._addDroneHat();
  }

  private _removeHat(): void {
    for (const m of this._hatMeshes) m.dispose();
    this._hatMeshes = [];
    this._hatSpinMesh = null;
  }

  private _addDroneHat(): void {
    const hat = this._selectedHat;
    if (hat === "none") return;
    const d = this._droneMesh;
    const h = (m: Mesh) => { this._hatMeshes.push(m); m.isPickable = false; m.parent = d; return m; };

    if (hat === "party") {
      h(MeshBuilder.CreateCylinder("", { diameterTop: 0, diameterBottom: 0.22, height: 0.28, tessellation: 8 }, this._scene) as Mesh)
        .material = this._mat(0.95, 0.25, 0.85, 0.08, 0.02, 0.07);
      this._hatMeshes[this._hatMeshes.length-1].position.set(0, 0.22, 0);
      h(MeshBuilder.CreateCylinder("", { diameterTop: 0.02, diameterBottom: 0.22, height: 0.025, tessellation: 8 }, this._scene) as Mesh)
        .material = this._mat(1, 1, 0.1, 0.12, 0.12, 0.01);
      this._hatMeshes[this._hatMeshes.length-1].position.set(0, 0.1, 0);
    } else if (hat === "tophat") {
      const brim = h(MeshBuilder.CreateCylinder("", { diameter: 0.32, height: 0.03, tessellation: 12 }, this._scene) as Mesh);
      brim.material = this._mat(0.06, 0.06, 0.06); brim.position.set(0, 0.12, 0);
      const top = h(MeshBuilder.CreateCylinder("", { diameter: 0.18, height: 0.24, tessellation: 12 }, this._scene) as Mesh);
      top.material = this._mat(0.06, 0.06, 0.06); top.position.set(0, 0.26, 0);
      const band = h(MeshBuilder.CreateCylinder("", { diameter: 0.185, height: 0.04, tessellation: 12 }, this._scene) as Mesh);
      band.material = this._mat(0.75, 0.62, 0.05, 0.08, 0.06, 0.0); band.position.set(0, 0.16, 0);
    } else if (hat === "crown") {
      const ring = h(MeshBuilder.CreateCylinder("", { diameter: 0.24, height: 0.09, tessellation: 12 }, this._scene) as Mesh);
      ring.material = this._mat(1, 0.80, 0.08, 0.18, 0.10, 0.01); ring.position.set(0, 0.14, 0);
      for (let ci = 0; ci < 5; ci++) {
        const a = (ci / 5) * Math.PI * 2;
        const pt = h(MeshBuilder.CreateCylinder("", { diameterTop: 0, diameterBottom: 0.06, height: 0.12, tessellation: 5 }, this._scene) as Mesh);
        pt.material = this._mat(1, 0.80, 0.08, 0.18, 0.10, 0.01);
        pt.position.set(Math.cos(a) * 0.09, 0.24, Math.sin(a) * 0.09);
      }
      const gem = h(MeshBuilder.CreateSphere("", { diameter: 0.05, segments: 4 }, this._scene) as Mesh);
      gem.material = this._mat(0.2, 0.8, 1, 0.1, 0.4, 0.5); gem.position.set(0, 0.18, 0.1);
    } else if (hat === "cowboy") {
      const brim = h(MeshBuilder.CreateCylinder("", { diameter: 0.44, height: 0.025, tessellation: 12 }, this._scene) as Mesh);
      brim.material = this._mat(0.45, 0.26, 0.09); brim.position.set(0, 0.12, 0);
      const crown = h(MeshBuilder.CreateSphere("", { diameter: 0.22, segments: 7 }, this._scene) as Mesh);
      crown.scaling.y = 1.1; crown.material = this._mat(0.45, 0.26, 0.09); crown.position.set(0, 0.21, 0);
    } else if (hat === "propeller") {
      const beanie = h(MeshBuilder.CreateSphere("", { diameter: 0.22, segments: 7 }, this._scene) as Mesh);
      beanie.scaling.y = 0.65; beanie.material = this._mat(0.88, 0.14, 0.14); beanie.position.set(0, 0.16, 0);
      const prop = h(MeshBuilder.CreateCylinder("", { diameter: 0.28, height: 0.015, tessellation: 3 }, this._scene) as Mesh);
      prop.material = this._mat(0.25, 0.55, 0.95, 0.05, 0.1, 0.18); prop.position.set(0, 0.26, 0);
      this._hatSpinMesh = prop;
    } else if (hat === "santa") {
      const base = h(MeshBuilder.CreateCylinder("", { diameterTop: 0.18, diameterBottom: 0.24, height: 0.05, tessellation: 12 }, this._scene) as Mesh);
      base.material = this._mat(0.95, 0.95, 0.95); base.position.set(0, 0.12, 0);
      const body = h(MeshBuilder.CreateCylinder("", { diameterTop: 0.04, diameterBottom: 0.18, height: 0.28, tessellation: 8 }, this._scene) as Mesh);
      body.material = this._mat(0.88, 0.08, 0.08); body.position.set(0, 0.26, 0);
      const pompom = h(MeshBuilder.CreateSphere("", { diameter: 0.07, segments: 5 }, this._scene) as Mesh);
      pompom.material = this._mat(0.96, 0.96, 0.96, 0.1, 0.1, 0.1); pompom.position.set(0, 0.38, 0);
    } else if (hat === "flower") {
      for (let pi = 0; pi < 6; pi++) {
        const a = (pi / 6) * Math.PI * 2;
        const petal = h(MeshBuilder.CreateSphere("", { diameter: 0.1, segments: 5 }, this._scene) as Mesh);
        petal.material = this._mat(0.95, 0.45, 0.75, 0.1, 0.04, 0.08);
        petal.position.set(Math.cos(a) * 0.1, 0.18, Math.sin(a) * 0.1);
      }
      const center = h(MeshBuilder.CreateSphere("", { diameter: 0.1, segments: 5 }, this._scene) as Mesh);
      center.material = this._mat(1, 0.88, 0.1, 0.15, 0.1, 0.01); center.position.set(0, 0.18, 0);
    }
  }

  private _buildMural(): void {
    const LD = LOBBY_D;
    // White backing panel
    const bgMat = this._mat(0.96, 0.96, 0.97);
    this._box(LOBBY_W - 3, 2.0, 0.06, 0, 1.8, -LD/2 + 0.16, bgMat);

    // Mascots: Jumbo Josh (green), Banban (red), Opila (pink), Slinger (orange), blue one
    const mascots: [number, number, number, number][] = [
      [-8, 0.22, 0.72, 0.22], // green
      [-4, 0.88, 0.14, 0.14], // red
      [ 0, 0.88, 0.20, 0.58], // pink
      [ 4, 0.88, 0.52, 0.10], // orange
      [ 8, 0.18, 0.38, 0.88], // blue
    ];
    for (const [mx, r, g, b] of mascots) {
      const mat = this._mat(r, g, b, r * 0.08, g * 0.08, b * 0.08);
      this._box(0.06, 1.6, 0.85, mx, 1.8, -LD/2 + 0.19, mat);
      // Boots speech bubble near Jumbo Josh
      if (mx === -8) {
        const bubMat = this._mat(0.98, 0.88, 0.20, 0.12, 0.08, 0.0);
        this._box(0.06, 0.3, 0.5, -5.5, 2.55, -LD/2 + 0.19, bubMat);
      }
    }
  }

  private _buildHallway(): void {
    const hallZ0 = -LOBBY_D / 2;
    const hallEnd = hallZ0 - HALL_D;
    const HW = HALL_W, H = ROOM_H;

    // Floor
    const floorMat = this._mat(0.26, 0.17, 0.09);
    const floor = MeshBuilder.CreateGround("hf", { width: HW, height: HALL_D }, this._scene);
    floor.position.set(0, 0, hallZ0 - HALL_D / 2);
    floor.material = floorMat;
    for (let z = hallZ0; z > hallEnd; z -= 1.2) {
      const g = MeshBuilder.CreateGround("hpk", { width: HW, height: 0.04 }, this._scene);
      g.position.set(0, 0.002, z); g.material = this._mat(0.20, 0.13, 0.07); g.isPickable = false;
    }

    // Ceiling
    const ceilMat = this._mat(0.88, 0.88, 0.90);
    const ceil = MeshBuilder.CreateGround("hc", { width: HW, height: HALL_D }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, hallZ0 - HALL_D / 2); ceil.material = ceilMat;
    // Strip light
    const stripMat = this._mat(1, 1, 0.95, 0.95, 0.95, 0.88);
    const hs = MeshBuilder.CreateBox("", { width: 0.16, height: 0.04, depth: HALL_D - 0.5 }, this._scene);
    hs.position.set(0, H - 0.02, hallZ0 - HALL_D / 2); hs.material = stripMat; hs.isPickable = false;

    // Walls
    const wallMat = this._mat(0.83, 0.83, 0.86);
    this._box(0.2, H, HALL_D, -HW/2, H/2, hallZ0 - HALL_D/2, wallMat, false, true);
    this._box(0.2, H, HALL_D,  HW/2, H/2, hallZ0 - HALL_D/2, wallMat, false, true);
    // End wall — split for door
    const sw = (HW - 2.2) / 2;
    this._box(sw, H, 0.2, -(1.1 + sw/2), H/2, hallEnd, wallMat, false, true);
    this._box(sw, H, 0.2,  (1.1 + sw/2), H/2, hallEnd, wallMat, false, true);
    this._box(2.2, H - 2.5, 0.2, 0, 2.5 + (H-2.5)/2, hallEnd, wallMat, false, true);

    // Teal door frame + door
    const tealMat = this._mat(0.13, 0.50, 0.46);
    this._box(2.4, 2.65, 0.22, 0, 1.325, hallEnd, tealMat, false, true);
    const doorMat = this._mat(0.15, 0.44, 0.40);
    this._hallDoor = this._box(2.0, 2.4, 0.08, 0, 1.2, hallEnd + 0.12, doorMat, false, true);

    // ── Button panel — truly flush on RIGHT wall ─────────────────────────
    const btnZ = hallZ0 - HALL_D * 0.55;
    const wallX = HW / 2 - 0.1; // inner face of right wall
    // Black square panel, nearly flush (sticks out only 0.06)
    const panelMat = this._mat(0.06, 0.06, 0.07);
    const panel = this._box(0.06, 0.55, 0.55, wallX - 0.03, 1.6, btnZ, panelMat, true);
    panel.name = "button";
    this._btnMesh = panel;
    // Gold border frame, same thickness, slightly bigger
    const frameMat = this._mat(0.38, 0.30, 0.10);
    this._box(0.055, 0.60, 0.60, wallX - 0.025, 1.6, btnZ, frameMat);
    // BIG red sphere sitting on the panel face
    const rbMat = this._mat(0.92, 0.08, 0.08, 0.42, 0.0, 0.0);
    const rb = MeshBuilder.CreateSphere("rb", { diameter: 0.28, segments: 10 }, this._scene);
    rb.position.set(wallX - 0.20, 1.6, btnZ);
    rb.material = rbMat; rb.isPickable = true; rb.name = "button";

    // Playground / Creativity Room
    this._buildPlayground(hallEnd);
  }

  private _buildPlayground(startZ: number): void {
    const PW = PLAY_W, PD = PLAY_D, H = ROOM_H;
    const cz = startZ - PD / 2;

    // Floor — green grass
    const grassMat = this._mat(0.22, 0.52, 0.18);
    const floor = MeshBuilder.CreateGround("pg_f", { width: PW, height: PD }, this._scene);
    floor.position.set(0, 0, cz); floor.material = grassMat;
    // Blue river strip down center
    const riverMat = this._mat(0.28, 0.52, 0.82);
    const river = MeshBuilder.CreateGround("river", { width: 2.5, height: PD }, this._scene);
    river.position.set(0, 0.002, cz); river.material = riverMat; river.isPickable = false;

    // Ceiling — sky blue
    const skyMat = this._mat(0.50, 0.78, 0.92);
    const ceil = MeshBuilder.CreateGround("pg_c", { width: PW, height: PD }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, cz); ceil.material = skyMat;

    // Walls — baby blue
    const wallMat = this._mat(0.62, 0.82, 0.94);
    // South wall — split for hallway opening
    const sw = (PW - HALL_W) / 2;
    this._box(sw, H, 0.2, -(HALL_W/2 + sw/2), H/2, startZ, wallMat, false, true);
    this._box(sw, H, 0.2,  (HALL_W/2 + sw/2), H/2, startZ, wallMat, false, true);
    this._box(PW, H - 2.5, 0.2, 0, 2.5 + (H-2.5)/2, startZ, wallMat, false, true);
    // North wall — gap at x=-9.5 to -5.5 for ball pit entry (matches planks position)
    this._box(1.5, H, 0.2, -10.25, H/2, startZ - PD, wallMat, false, true); // far-left sliver
    this._box(16.5, H, 0.2,  2.75, H/2, startZ - PD, wallMat, false, true); // right of gap
    // Invisible barrier blocking gap until hammer used
    this._pitBarrier = this._box(4, H, 0.18, -7.5, H/2, startZ - PD, wallMat, false, true);
    this._pitBarrier.isVisible = false;
    this._box(0.2, H, PD, -PW/2, H/2, cz, wallMat, false, true);
    this._box(0.2, H, PD,  PW/2, H/2, cz, wallMat, false, true);

    // Wall decorations — flowers and painted trees
    const flowerMat = this._mat(0.95, 0.35, 0.55);
    const leafMat   = this._mat(0.25, 0.65, 0.20);
    for (let fx = -8; fx <= 8; fx += 4) {
      this._box(0.05, 0.5, 0.5, fx, 1.2, startZ - PD + 0.15, flowerMat);
      this._box(0.05, 0.8, 0.6, fx + 1.5, 1.0, startZ - PD + 0.15, leafMat);
    }

    // Strip lights
    const stripMat = this._mat(1, 1, 0.95, 0.9, 0.9, 0.85);
    for (const lx of [-4, 4]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.16, height: 0.04, depth: PD * 0.55 }, this._scene);
      sl.position.set(lx, H - 0.02, cz); sl.material = stripMat; sl.isPickable = false;
    }
    for (const [lx, lz] of [[-4, cz+4],[4, cz-4]]) {
      const pl = new PointLight("pgl", new Vector3(lx, H-0.1, lz), this._scene);
      pl.intensity = 0.5; pl.range = 16;
    }

    // --- Playground equipment ---
    // Red boat (right side)
    const boatMat = this._mat(0.80, 0.12, 0.12);
    this._box(3.5, 0.4, 1.8, 7, 0.2, cz + 5, boatMat, false, true);
    this._box(3.7, 0.08, 2.0, 7, 0.42, cz + 5, this._mat(0.55, 0.08, 0.08));
    this._box(0.08, 1.8, 0.08, 7.5, 1.1, cz + 5, this._mat(0.45, 0.28, 0.10)); // mast

    // Jungle gym (left side)
    const gymMat = this._mat(0.55, 0.32, 0.10);
    for (const [gx, gz] of [[-7, cz+2], [-7, cz+5], [-4, cz+2], [-4, cz+5]])
      this._box(0.12, 2.0, 0.12, gx, 1.0, gz, gymMat, false, true);
    this._box(3.2, 0.1, 3.2, -5.5, 1.85, cz+3.5, gymMat, false, true); // platform
    this._box(0.5, 1.5, 3.5, -5.5, 1.0, cz+7, this._mat(0.22, 0.60, 0.88), false, true); // slide

    // Logs
    const logMat = this._mat(0.38, 0.22, 0.08);
    this._box(2.2, 0.35, 0.5, -7, 0.175, cz - 3, logMat, false, true);
    this._box(2.2, 0.35, 0.5, -7, 0.175, cz - 5, logMat, false, true);

    // Bench (right)
    const benchMat = this._mat(0.55, 0.38, 0.18);
    this._box(1.8, 0.08, 0.5, 7, 0.42, cz - 3, benchMat, false, true);
    this._box(0.08, 0.42, 0.5, 6.2, 0.21, cz - 3, benchMat, false, true);
    this._box(0.08, 0.42, 0.5, 7.8, 0.21, cz - 3, benchMat, false, true);

    // Ball pit (far left, blocked by planks)
    const pitZ = startZ - PD + 2.5;
    const plankMat = this._mat(0.40, 0.25, 0.08);
    this._pitPlanks = this._box(4, 1.5, 0.12, -7.5, 0.75, pitZ, plankMat, false, true); // planks blocking
    this._box(4, 0.10, 0.10, -7.5, 0.45, pitZ, this._mat(0.28,0.16,0.05));
    this._box(4, 0.10, 0.10, -7.5, 0.95, pitZ, this._mat(0.28,0.16,0.05));
    // "BALL PIT CLOSED" sign plate
    this._box(0.05, 0.35, 1.2, -5.4, 1.2, pitZ, this._mat(0.12, 0.12, 0.18));

    // --- Opila Bird (far north center) ---
    this._buildOpilaBird(0, 0, startZ - PD + 1.8);

    // --- 6 Eggs ---
    const eggColors: [number,number,number][] = [
      [0.90, 0.28, 0.28], [0.28, 0.85, 0.30], [0.28, 0.55, 0.95],
      [0.95, 0.90, 0.28], [0.88, 0.50, 0.20], [0.70, 0.28, 0.92],
    ];
    const eggPos: [number,number,number][] = [
      [-5.4, 0.22, pitZ + 0.5],     // near ball pit sign
      [-7.0, 0.22, cz - 3.5],       // behind logs
      [ 7.2, 0.22, cz + 5.5],       // in boat
      [ 7.2, 0.50, cz - 2.8],       // on bench
      [-5.5, 2.0,  cz + 2.5],       // on gym platform
      [-5.5, 0.22, cz + 8.2],       // near slide base
    ];
    for (let i = 0; i < 6; i++) {
      const [r, g, b] = eggColors[i];
      const [ex, ey, ez] = eggPos[i];
      const egg = MeshBuilder.CreateSphere(`egg_${i}`, { diameter: 0.22, segments: 7 }, this._scene);
      egg.scaling.y = 1.25;
      egg.position.set(ex, ey, ez);
      egg.material = this._mat(r, g, b, r*0.08, g*0.08, b*0.08);
      egg.isPickable = true;
      egg.name = `egg_${i}`;
      // X-ray beacon — tall glowing pillar above each egg, hidden by default
      const beacon = MeshBuilder.CreateCylinder(`beacon_${i}`, { diameter: 0.08, height: ROOM_H - 0.1, tessellation: 6 }, this._scene);
      beacon.position.set(ex, ROOM_H / 2, ez);
      beacon.material = this._mat(r, g, b, r, g, b);
      beacon.isPickable = false;
      beacon.setEnabled(false);
      this._eggBeacons.push(beacon);
      const idx = i;
      this._interactables.push({
        mesh: egg, id: `egg_${i}`,
        label: "[ E ] Pick up Egg",
        onInteract: () => {
          egg.setEnabled(false);
          beacon.setEnabled(false);
          this._eggsCollected++;
          this._hudKeycard.textContent = `🥚 Eggs: ${this._eggsCollected}/6`;
          this._hudKeycard.style.color = "#ffdd44";
          this._flashMsg(`Egg ${this._eggsCollected}/6 collected! Go feed Opila Bird!`);
          const ii = this._interactables.findIndex(it => it.id === `egg_${idx}`);
          if (ii >= 0) this._interactables.splice(ii, 1);
        },
      });
    }

    // --- Yellow keycard reader (east wall, mid-room) ---
    const yrBg = this._box(0.07, 0.32, 0.18, PW/2 - 0.08, 1.25, cz, this._mat(0.08, 0.08, 0.12), true);
    yrBg.name = "yellow_reader";
    this._box(0.06, 0.08, 0.10, PW/2 - 0.07, 1.32, cz, this._mat(0.55, 0.50, 0.08, 0.15, 0.12, 0.01));
    this._interactables.push({
      mesh: yrBg, id: "yellow_reader",
      label: "[ E ] Use Yellow Keycard",
      onInteract: () => this._useYellowKey(),
    });

    // --- Naughty Corner (NE corner) ---
    const ncMat = this._mat(0.85, 0.85, 0.18);
    this._box(5, H * 0.9, 0.1, PW/2 - 2.5, H*0.45, startZ - PD + 5.1, ncMat, false, true);
    this._box(0.1, H * 0.9, 5, PW/2 - 5.1, H*0.45, startZ - PD + 2.5, ncMat, false, true);
    // Red "!Naughty Corner!" text panel
    this._box(0.06, 0.40, 1.4, PW/2 - 0.12, 1.8, startZ - PD + 2.5, this._mat(0.88, 0.10, 0.10, 0.12, 0.01, 0.01));
    // Naughty Corner door (yellow, blocks entry)
    const ncDoorMat = this._mat(0.80, 0.78, 0.12);
    this._naughtyDoor = this._box(1.8, 2.2, 0.1, PW/2 - 2.5, 1.1, startZ - PD + 5.1, ncDoorMat, false, true);

    // Drone button inside naughty corner (east wall)
    const ybPanel = this._box(0.08, 0.4, 0.4, PW/2 - 0.08, 1.4, startZ - PD + 3, this._mat(0.06, 0.06, 0.07), true);
    ybPanel.name = "yellow_button";
    this._yellowBtnMesh = ybPanel;
    const ybSphere = MeshBuilder.CreateSphere("yellow_button", { diameter: 0.22 }, this._scene);
    ybSphere.material = this._mat(0.88, 0.10, 0.10, 0.35, 0.0, 0.0);
    ybSphere.isPickable = true;
    ybSphere.name = "yellow_button";
    ybSphere.position.set(PW/2 - 0.2, 1.4, startZ - PD + 3);

    // Hammer inside naughty corner
    const hammerHead = this._mat(0.55, 0.55, 0.60);
    const hammerHandle = this._mat(0.45, 0.26, 0.08);
    this._hammerMesh = this._box(0.12, 0.12, 0.5, PW/2 - 3.5, 0.7, startZ - PD + 2.2, hammerHandle, true);
    this._hammerMesh.name = "hammer";
    this._box(0.32, 0.22, 0.18, PW/2 - 3.5, 0.9, startZ - PD + 2.2, hammerHead);
    this._hammerMesh.setEnabled(false);
    this._interactables.push({
      mesh: this._hammerMesh, id: "hammer",
      label: "[ E ] Pick up Hammer",
      onInteract: () => this._pickupHammer(),
    });

    // Planks interactable — only active once hammer is picked up
    this._interactables.push({
      mesh: this._pitPlanks, id: "pit_planks",
      label: "[ E ] Smash Planks with Hammer",
      onInteract: () => this._openBallPit(),
    });
    // Disable until hammer retrieved — we'll enable it in _pickupHammer

    // Build ball pit room (geometry built now, entry blocked by barrier)
    this._buildBallPitRoom(startZ - PD);
  }

  private _buildOpilaBird(x: number, y: number, z: number): void {
    const pinkMat   = this._mat(0.92, 0.50, 0.70, 0.05, 0.02, 0.03);
    const wingMat   = this._mat(0.65, 0.35, 0.80, 0.02, 0.01, 0.04);
    const beakMat   = this._mat(0.90, 0.80, 0.10, 0.08, 0.06, 0.01);
    const feathMat  = this._mat(0.50, 0.15, 0.75, 0.05, 0.01, 0.08);
    const legMat    = this._mat(0.88, 0.78, 0.10);

    // Body
    const body = MeshBuilder.CreateSphere("opila_body", { diameter: 1.4, segments: 8 }, this._scene);
    body.scaling.set(0.85, 1.4, 0.85);
    body.position.set(x, y + 1.35, z);
    body.material = pinkMat;
    body.isPickable = true;
    body.name = "opila";

    // Colorful handprints on body
    const hpColors: [number,number,number][] = [
      [0.88,0.20,0.20],[0.20,0.75,0.25],[0.20,0.35,0.90],
      [0.90,0.85,0.15],[0.85,0.45,0.15],[0.55,0.20,0.85],
    ];
    for (let i = 0; i < hpColors.length; i++) {
      const a = (i / hpColors.length) * Math.PI * 2;
      const hp = MeshBuilder.CreateDisc("", { radius: 0.12, tessellation: 8 }, this._scene);
      hp.material = this._mat(...hpColors[i]);
      hp.isPickable = false;
      hp.position.set(x + Math.cos(a)*0.6, y + 1.35 + Math.sin(a)*0.4, z - 0.06);
      hp.rotation.y = Math.PI;
    }

    // Head
    const head = MeshBuilder.CreateSphere("", { diameter: 0.7, segments: 8 }, this._scene);
    head.position.set(x, y + 2.5, z);
    head.material = pinkMat;
    head.isPickable = false;

    // Purple head feathers
    for (let fi = -1; fi <= 1; fi++) {
      const f = MeshBuilder.CreateCylinder("", { diameterTop: 0.04, diameterBottom: 0.09, height: 0.48, tessellation: 6 }, this._scene);
      f.position.set(x + fi*0.14, y + 3.1, z);
      f.rotation.z = fi * 0.28;
      f.material = feathMat; f.isPickable = false;
    }

    // Upper beak (open)
    const ubeak = MeshBuilder.CreateBox("", { width: 0.26, height: 0.12, depth: 0.55 }, this._scene);
    ubeak.position.set(x, y + 2.38, z + 0.46);
    ubeak.rotation.x = -0.22;
    ubeak.material = beakMat; ubeak.isPickable = false;
    // Lower beak (open — dropped down)
    const lbeak = MeshBuilder.CreateBox("", { width: 0.23, height: 0.11, depth: 0.50 }, this._scene);
    lbeak.position.set(x, y + 2.18, z + 0.43);
    lbeak.rotation.x = 0.28;
    lbeak.material = beakMat; lbeak.isPickable = false;

    // Bloodshot eyes
    for (const ex of [-0.18, 0.18]) {
      const ew = MeshBuilder.CreateSphere("", { diameter: 0.18, segments: 6 }, this._scene);
      ew.material = this._mat(0.95, 0.88, 0.88); ew.isPickable = false;
      ew.position.set(x + ex, y + 2.52, z + 0.3);
      const ep = MeshBuilder.CreateSphere("", { diameter: 0.08, segments: 6 }, this._scene);
      ep.material = this._mat(0.55, 0.05, 0.05); ep.isPickable = false;
      ep.position.set(x + ex, y + 2.52, z + 0.38);
    }

    // Wings
    for (const [wx, rz] of [[-0.9, 0.3],[0.9, -0.3]] as [number,number][]) {
      const w = MeshBuilder.CreateBox("", { width: 0.12, height: 1.2, depth: 0.8 }, this._scene);
      w.position.set(x + wx, y + 1.35, z);
      w.rotation.z = rz;
      w.material = wingMat; w.isPickable = false;
    }

    // Legs
    for (const lx of [-0.25, 0.25]) {
      const leg = MeshBuilder.CreateCylinder("", { diameter: 0.10, height: 0.8, tessellation: 6 }, this._scene);
      leg.position.set(x + lx, y + 0.4, z);
      leg.material = legMat; leg.isPickable = false;
      const foot = MeshBuilder.CreateBox("", { width: 0.08, height: 0.06, depth: 0.28 }, this._scene);
      foot.position.set(x + lx, y + 0.03, z + 0.08);
      foot.material = legMat; foot.isPickable = false;
    }

    this._interactables.push({
      mesh: body, id: "opila",
      label: "[ E ] Feed Egg to Opila Bird",
      onInteract: () => this._feedOpila(),
    });
  }

  // ── Ball Pit Room ──────────────────────────────────────────────────────────

  private _buildBallPitRoom(bpS: number): void {
    // bpS = south wall z of ball pit (= playEnd = -50)
    // Room: x -11..11, z bpS..(bpS-BP_D)
    const bpN  = bpS - BP_D; // -70
    const BW   = BP_W, BD = BP_D, H = ROOM_H;
    const cz   = bpS - BD / 2;

    // Ceiling — dark spooky
    const darkMat = this._mat(0.05, 0.04, 0.06);
    const ceil = MeshBuilder.CreateGround("bp_ceil", { width: BW, height: BD }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, cz); ceil.material = darkMat;

    // Safe zone floor: SW quadrant  x=-11..-2, z=bpS..(bpS-10)
    const safeMat = this._mat(0.18, 0.17, 0.21);
    const safeFloor = MeshBuilder.CreateGround("bp_safe_f", { width: 9, height: 10 }, this._scene);
    safeFloor.position.set(-6.5, 0.001, bpS - 5); safeFloor.material = safeMat;

    // Far platform floor: x=2..11, z=(bpS-10)..(bpS-20)
    const farFloor = MeshBuilder.CreateGround("bp_far_f", { width: 9, height: 10 }, this._scene);
    farFloor.position.set(6.5, 0.001, bpS - 15); farFloor.material = safeMat;

    // Abyss visual — dark pit walls visible going down
    const abyssMat = this._mat(0.03, 0.03, 0.04);
    this._box(9, 8, 0.2, -6.5, -4, bpS - 10, abyssMat); // south face of abyss (NW cliff wall)
    this._box(0.2, 8, BD,  -2,  -4, cz,       abyssMat); // east face of safe zone cliff
    this._box(0.2, 8, 10,   2,  -4, bpS - 15, abyssMat); // west face of far platform cliff

    // Perimeter walls (dark)
    const wallMat = this._mat(0.08, 0.07, 0.10);
    // South wall (gap already in playground north wall, so just cap the sides)
    this._box(2,   H, 0.2, -10.0, H/2, bpS, wallMat, false, true); // far west sliver
    this._box(14,  H, 0.2,   4.5, H/2, bpS, wallMat, false, true); // right of gap
    // North wall
    this._box(BW,  H, 0.2,   0, H/2, bpN, wallMat, false, true);
    // East wall
    this._box(0.2, H, BD,  BW/2, H/2, cz, wallMat, false, true);
    // West wall
    this._box(0.2, H, BD, -BW/2, H/2, cz, wallMat, false, true);
    // Divider: safe zone east wall (x=-2, z=bpS..bpS-10) — removed when gondola extends
    this._pitSafeWallE = this._box(0.2, H, 10, -2, H/2, bpS - 5, wallMat, false, true);
    this._pitSafeWallE.isVisible = false;
    // Divider: safe zone north wall (z=bpS-10, x=-11..-2) — permanent
    this._box(9, H, 0.2, -6.5, H/2, bpS - 10, wallMat, false, true);

    // Gondola / sofa-lift bridge — revealed when platform extended
    // Spans x=-2..2, at z=bpS-5..bpS-8
    const gondolaMat = this._mat(0.52, 0.38, 0.18);
    const gFloor = MeshBuilder.CreateGround("gondola_f", { width: 4, height: 3 }, this._scene);
    gFloor.position.set(0, 0.04, bpS - 6.5); gFloor.material = gondolaMat; gFloor.isPickable = false;
    // Railing L/R
    const gRailL = this._box(0.12, 0.6, 3, -1.9, 0.3, bpS - 6.5, this._mat(0.35, 0.25, 0.10));
    const gRailR = this._box(0.12, 0.6, 3,  1.9, 0.3, bpS - 6.5, this._mat(0.35, 0.25, 0.10));
    gRailL.isPickable = false; gRailR.isPickable = false;
    // Group gondola pieces
    this._gondolaMesh = gFloor; // used as proxy for enable/disable
    gFloor.setEnabled(false); gRailL.setEnabled(false); gRailR.setEnabled(false);
    // Keep second railing ref for later enable
    const gondolaParts = [gFloor, gRailL, gRailR];
    // Store extra refs on gondola mesh for enable/disable via closure
    (this._gondolaMesh as any)._parts = gondolaParts;

    // Color puzzle chair + panel (in safe zone, north part)
    const chairMat = this._mat(0.52, 0.35, 0.18);
    this._box(0.9, 0.45, 0.85, -6, 0.225, bpS - 7.5, chairMat, false, true); // seat
    this._box(0.9, 0.85, 0.12, -6, 0.65,  bpS - 7.92, chairMat, false, true); // back

    // Puzzle panel on north wall of safe zone
    const puzzlePanelMat = this._mat(0.12, 0.10, 0.18, 0.05, 0.04, 0.10);
    const puzzlePanel = this._box(3.0, 1.8, 0.12, -6, 1.3, bpS - 9.85, puzzlePanelMat, true);
    puzzlePanel.name = "color_puzzle";
    // Colorful glow dots on panel (decorative)
    const dotColors: [number,number,number,number,number,number][] = [
      [1,.15,.15,.4,.05,.05],[1,.55,.1,.4,.2,.04],
      [.15,.72,.15,.04,.3,.04],[1,.6,.78,.4,.15,.3],
      [.25,.5,1,.08,.18,.4],[1,1,1,.2,.2,.2],
    ];
    for (let di = 0; di < 6; di++) {
      const dot = MeshBuilder.CreateSphere("", { diameter: 0.14, segments: 5 }, this._scene);
      dot.material = this._mat(...dotColors[di]); dot.isPickable = false;
      dot.position.set(-7.5 + di * 0.6, 1.0, bpS - 9.78);
    }
    this._interactables.push({
      mesh: puzzlePanel, id: "color_puzzle",
      label: "[ E ] \"What Was My Color?\" Puzzle",
      onInteract: () => this._openColorPuzzle(),
    });

    // Platform / gondola button (green sphere — near east edge of safe zone)
    const platBtnMesh = MeshBuilder.CreateSphere("plat_btn", { diameter: 0.28, segments: 8 }, this._scene) as Mesh;
    platBtnMesh.material = this._mat(0.12, 0.82, 0.12, 0.04, 0.35, 0.04);
    platBtnMesh.position.set(-2.8, 0.9, bpS - 5.5);
    platBtnMesh.isPickable = true; platBtnMesh.name = "plat_btn";
    // Panel behind it
    const platPanelMesh = this._box(0.12, 0.55, 0.55, -2.9, 0.9, bpS - 5.5, this._mat(0.06, 0.06, 0.07));
    platPanelMesh.isPickable = false;
    this._interactables.push({
      mesh: platBtnMesh, id: "plat_btn",
      label: "[ E ] Use Orange Keycard → Extend Platform",
      onInteract: () => this._extendPlatform(),
    });

    // Emergency STOP button (red, on west wall of safe zone)
    const emergMesh = this._box(0.12, 0.55, 0.55, -10.85, 1.0, bpS - 5.5, this._mat(0.85, 0.06, 0.06, 0.4, 0.02, 0.02), true);
    emergMesh.name = "emerg_btn";
    // Red sphere on it
    const emergSphere = MeshBuilder.CreateSphere("emerg_sph", { diameter: 0.28, segments: 8 }, this._scene) as Mesh;
    emergSphere.material = this._mat(0.95, 0.06, 0.06, 0.5, 0.01, 0.01);
    emergSphere.position.set(-10.7, 1.0, bpS - 5.5);
    emergSphere.isPickable = true; emergSphere.name = "emerg_btn";
    // Sign above
    const emergSignMat = this._mat(0.9, 0.06, 0.06, 0.4, 0.01, 0.01);
    this._box(0.07, 0.28, 0.9, -10.92, 1.65, bpS - 5.5, emergSignMat);
    this._interactables.push({
      mesh: emergSphere, id: "emerg_btn",
      label: "[ E ] ⚠️ EMERGENCY STOP",
      onInteract: () => this._useEmergencyStop(),
    });

    // Elevator door (on south wall of ball pit room, NW side — back from safe zone)
    const elevFrameMat = this._mat(0.13, 0.50, 0.46);
    this._box(2.4, 2.65, 0.22, -8.5, 1.325, bpS + 0.02, elevFrameMat);
    const elevDoor = this._box(2.0, 2.4, 0.08, -8.5, 1.2, bpS + 0.1, this._mat(0.15, 0.44, 0.40), true, true);
    elevDoor.name = "elevator"; elevDoor.setEnabled(false);
    this._interactables.push({
      mesh: elevDoor, id: "elevator",
      label: "[ E ] Take the Elevator",
      onInteract: () => this._triggerEnding(),
    });
    // Store so we can enable later
    (this as any)._elevDoor = elevDoor;

    // Opila Bird chasing mesh (simple body, appears when platform extended)
    const chasePinkMat = this._mat(0.92, 0.50, 0.70, 0.08, 0.03, 0.05);
    const chaseBody = MeshBuilder.CreateSphere("chase_opila", { diameter: 1.2, segments: 7 }, this._scene) as Mesh;
    chaseBody.scaling.y = 1.3;
    chaseBody.material = chasePinkMat;
    chaseBody.position.set(7, 1.0, bpS - 14);
    chaseBody.isPickable = false;
    chaseBody.setEnabled(false);
    this._pitOpilaMesh = chaseBody;
    // Eyes
    for (const ex of [-0.22, 0.22]) {
      const eye = MeshBuilder.CreateSphere("", { diameter: 0.2, segments: 5 }, this._scene);
      eye.material = this._mat(0.95, 0.88, 0.88); eye.isPickable = false;
      eye.parent = chaseBody; eye.position.set(ex, 0.2, 0.55);
      const pupil = MeshBuilder.CreateSphere("", { diameter: 0.1, segments: 5 }, this._scene);
      pupil.material = this._mat(0.5, 0.0, 0.0); pupil.isPickable = false;
      pupil.parent = chaseBody; pupil.position.set(ex, 0.2, 0.62);
    }

    // "BALL PIT" sign on wall
    const signMat = this._mat(0.88, 0.82, 0.12, 0.18, 0.14, 0.01);
    this._box(0.08, 0.45, 2.8, -10.92, 2.0, bpS - 5, signMat);

    // Lights
    const bpl1 = new PointLight("bpl1", new Vector3(-6, H - 0.3, bpS - 5), this._scene);
    bpl1.intensity = 0.5; bpl1.range = 14; bpl1.diffuse = new Color3(0.7, 0.6, 0.8);
    const bpl2 = new PointLight("bpl2", new Vector3(6, H - 0.3, bpS - 15), this._scene);
    bpl2.intensity = 0.5; bpl2.range = 14; bpl2.diffuse = new Color3(0.7, 0.6, 0.8);
  }

  private _openBallPit(): void {
    if (!this._hasHammer) {
      this._flashMsg("You need a Hammer to smash these planks!");
      return;
    }
    if (this._ballPitOpen) return;
    this._ballPitOpen = true;
    this._pitPlanks.setEnabled(false); this._pitPlanks.checkCollisions = false;
    this._pitBarrier.setEnabled(false); this._pitBarrier.checkCollisions = false;
    const ii = this._interactables.findIndex(it => it.id === "pit_planks");
    if (ii >= 0) this._interactables.splice(ii, 1);
    this._flashScreen("rgba(180,140,80,0.3)", 0.6);
    this._flashMsg("SMASH! Planks destroyed! The Ball Pit room is open...");
    this._hudKeycard.textContent = "🔨 Ball Pit open!";
    this._hudKeycard.style.color = "#c8a060";
    this._score += 20;
  }

  private _openColorPuzzle(): void {
    if (this._colorPuzzleSolved) { this._flashMsg("Puzzle already solved!"); return; }
    document.exitPointerLock?.();
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;inset:0;z-index:70;background:rgba(8,6,14,0.97);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:18px;padding:24px;pointer-events:all;font-family:Arial,sans-serif;";
    const redraw = () => {
      overlay.innerHTML = "";
      const title = document.createElement("div");
      title.style.cssText = "color:white;font-size:clamp(18px,3vw,32px);font-weight:900;text-align:center;";
      title.textContent = "🎨 What Was My Color?";
      overlay.appendChild(title);
      const sub = document.createElement("div");
      sub.style.cssText = "color:rgba(255,255,255,0.5);font-size:13px;text-align:center;";
      sub.textContent = "Click each monster to cycle their color. Match them to their true color!";
      overlay.appendChild(sub);
      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:540px;width:100%;";
      for (let i = 0; i < 6; i++) {
        const idx = i;
        const card = document.createElement("div");
        const col = MONSTER_PALETTE[this._monsterCurColors[i]];
        const correct = this._monsterCurColors[i] === MONSTER_CORRECT[i];
        card.style.cssText =
          `background:rgba(255,255,255,0.06);border:2px solid ${correct?"#22ee44":"rgba(255,255,255,0.15)"};` +
          `border-radius:12px;padding:14px 8px;cursor:pointer;display:flex;flex-direction:column;` +
          `align-items:center;gap:8px;`;
        card.innerHTML =
          `<div style="width:50px;height:50px;border-radius:50%;background:${col};` +
          `border:3px solid rgba(255,255,255,0.3);box-shadow:0 0 12px ${col}88;"></div>` +
          `<div style="color:white;font-size:11px;font-weight:bold;text-align:center;">${MONSTER_NAMES[i]}</div>` +
          `<div style="color:rgba(255,255,255,0.55);font-size:10px;">${col}</div>` +
          (correct ? `<div style="color:#22ee44;font-size:10px;">✓ Correct!</div>` : `<div style="color:rgba(255,255,255,0.3);font-size:10px;">Click to change</div>`);
        card.addEventListener("pointerdown", () => {
          this._monsterCurColors[idx] = (this._monsterCurColors[idx] + 1) % MONSTER_PALETTE.length;
          redraw();
          // Check all correct
          if (this._monsterCurColors.every((c, i2) => c === MONSTER_CORRECT[i2])) {
            setTimeout(() => {
              overlay.remove();
              this._canvas.requestPointerLock?.();
              this._colorPuzzleSolved = true;
              // Spawn orange keycard near chair
              const bpS = -LOBBY_D/2 - HALL_D - PLAY_D;
              const kcMat = this._mat(0.90, 0.52, 0.06, 0.25, 0.12, 0.01);
              this._orangeKeyMesh = this._box(0.7, 0.05, 0.44, -6, 0.7, bpS - 7, kcMat, true);
              this._orangeKeyMesh!.name = "orange_keycard";
              this._interactables.push({
                mesh: this._orangeKeyMesh!, id: "orange_keycard",
                label: "[ E ] Pick up Orange Keycard",
                onInteract: () => {
                  this._hasOrangeKey = true;
                  this._orangeKeyMesh!.setEnabled(false);
                  this._hudKeycard.textContent = "🟠 Orange Keycard";
                  this._hudKeycard.style.color = "#ff8800";
                  this._score += 30;
                  this._flashMsg("Got the Orange Keycard! Use it on the green platform button!");
                  const ii = this._interactables.findIndex(it => it.id === "orange_keycard");
                  if (ii >= 0) this._interactables.splice(ii, 1);
                },
              });
              this._flashScreen("rgba(255,140,0,0.3)", 0.6);
              this._flashMsg("🟠 ALL CORRECT! Orange Keycard dropped from the panel!");
              this._score += 30;
            }, 600);
          }
        });
        grid.appendChild(card);
      }
      overlay.appendChild(grid);
      const closeBtn = document.createElement("button");
      closeBtn.style.cssText =
        "background:rgba(255,255,255,0.1);color:white;font-size:14px;padding:9px 26px;" +
        "border-radius:20px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;";
      closeBtn.textContent = "← Close";
      closeBtn.addEventListener("pointerdown", () => { overlay.remove(); this._canvas.requestPointerLock?.(); });
      overlay.appendChild(closeBtn);
    };
    redraw();
    this._wrap.appendChild(overlay);
  }

  private _extendPlatform(): void {
    if (!this._hasOrangeKey) {
      this._flashMsg("You need the Orange Keycard first! Solve the color puzzle.");
      return;
    }
    if (this._platformExtended) { this._flashMsg("Platform already extended!"); return; }
    this._platformExtended = true;
    this._hasOrangeKey = false;
    this._hudKeycard.textContent = "⚠️ OPILA IS LOOSE!";
    this._hudKeycard.style.color = "#ff4444";
    // Enable gondola parts
    if (this._gondolaMesh) {
      const parts: Mesh[] = (this._gondolaMesh as any)._parts ?? [this._gondolaMesh];
      for (const p of parts) p.setEnabled(true);
    }
    // Remove safe zone east wall so player can cross
    this._pitSafeWallE.setEnabled(false); this._pitSafeWallE.checkCollisions = false;
    // Release Opila Bird
    if (this._pitOpilaMesh) this._pitOpilaMesh.setEnabled(true);
    this._opilaChasingPlayer = true;
    this._flashScreen("rgba(255,50,50,0.35)", 0.8);
    this._flashMsg("🚨 Platform extended! OPILA BIRD RELEASED — she's chasing you! Cross over then EMERGENCY STOP!");
    this._score += 20;
    const ii = this._interactables.findIndex(it => it.id === "plat_btn");
    if (ii >= 0) this._interactables.splice(ii, 1);
  }

  private _useEmergencyStop(): void {
    if (!this._platformExtended) { this._flashMsg("The platform isn't extended yet!"); return; }
    if (this._emergencyStopUsed) return;
    this._emergencyStopUsed = true;
    // Retract gondola
    if (this._gondolaMesh) {
      const parts: Mesh[] = (this._gondolaMesh as any)._parts ?? [this._gondolaMesh];
      for (const p of parts) p.setEnabled(false);
    }
    // Opila falls (animate her downward then disable)
    this._opilaChasingPlayer = false;
    if (this._pitOpilaMesh) {
      const fallInterval = setInterval(() => {
        if (!this._pitOpilaMesh) { clearInterval(fallInterval); return; }
        this._pitOpilaMesh.position.y -= 0.18;
        if (this._pitOpilaMesh.position.y < -8) {
          this._pitOpilaMesh.setEnabled(false);
          clearInterval(fallInterval);
        }
      }, 30);
    }
    // Show elevator door
    const elevDoor: Mesh | undefined = (this as any)._elevDoor;
    if (elevDoor) elevDoor.setEnabled(true);
    this._flashScreen("rgba(0,200,255,0.25)", 0.8);
    this._flashMsg("EMERGENCY STOP! Platform collapses — Opila falls into the pit! 🎉 Elevator is now open!");
    this._hudKeycard.textContent = "🛗 Go to the Elevator!";
    this._hudKeycard.style.color = "#44ffcc";
    this._score += 50;
    const ii = this._interactables.findIndex(it => it.id === "emerg_btn");
    if (ii >= 0) this._interactables.splice(ii, 1);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    const hud = document.createElement("div");
    hud.style.cssText = "position:absolute;inset:0;pointer-events:none;font-family:Arial,sans-serif;";
    hud.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;height:48px;
        background:rgba(0,0,0,0.65);display:flex;align-items:center;
        padding:0 16px;gap:16px;pointer-events:all;">
        <button id="bbBack" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.75);
          font-size:13px;padding:6px 14px;border-radius:8px;
          border:1px solid rgba(255,255,255,0.2);cursor:pointer;">← Back</button>
        <span id="bbKC" style="color:rgba(255,255,255,0.35);font-size:13px;">No keycard</span>
        <span style="color:rgba(255,255,255,0.3);font-size:11px;margin-left:auto;">
          WASD move &nbsp;|&nbsp; Click canvas to look &nbsp;|&nbsp; E interact &nbsp;|&nbsp; Left-click → drone
        </span>
      </div>

      <!-- Crosshair — bullseye scope -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;width:36px;height:36px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:3px solid white;"></div>
        <div style="position:absolute;inset:9px;border-radius:50%;border:2.5px solid black;"></div>
        <div style="position:absolute;inset:14px;border-radius:50%;background:white;"></div>
      </div>

      <!-- Interaction prompt -->
      <div id="bbPrompt" style="position:absolute;bottom:90px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.72);color:white;font-size:14px;padding:9px 20px;
        border-radius:8px;border:1px solid rgba(255,255,255,0.18);
        display:none;pointer-events:none;white-space:nowrap;"></div>

      <!-- Drone remote in hand (bottom-right) -->
      <div style="position:absolute;bottom:0;right:16px;width:140px;height:110px;
        display:flex;align-items:flex-end;justify-content:center;pointer-events:none;padding-bottom:10px;">
        <div style="background:#0e0e0f;border-radius:8px;padding:10px 14px 8px;
          border:1.5px solid #2a2a2e;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.6);">
          <div style="display:flex;justify-content:center;gap:8px;margin-bottom:6px;">
            <div style="width:6px;height:16px;background:#333;border-radius:2px;"></div>
            <div style="width:6px;height:16px;background:#333;border-radius:2px;"></div>
          </div>
          <div style="width:32px;height:32px;background:radial-gradient(circle,#dd1111,#880000);
            border-radius:50%;margin:0 auto;border:2px solid #ff4444;
            box-shadow:0 0 10px rgba(200,0,0,0.45);"></div>
          <div style="color:#444;font-size:8px;margin-top:5px;letter-spacing:1px;">DRONE REMOTE</div>
        </div>
      </div>
    `;
    this._wrap.appendChild(hud);
    this._hudPrompt  = hud.querySelector("#bbPrompt")!;
    this._hudKeycard = hud.querySelector("#bbKC")!;
    hud.querySelector("#bbBack")!.addEventListener("click", () => this._cleanup(true));

    // ── Admin panel (backtick ` to toggle) ────────────────────────────────
    this._adminPanel = document.createElement("div");
    this._adminPanel.style.cssText =
      "position:absolute;top:56px;right:8px;background:rgba(0,0,0,0.88);color:white;" +
      "font-family:monospace;font-size:12px;padding:12px 16px;border-radius:8px;" +
      "border:1px solid rgba(255,255,100,0.4);display:none;z-index:99;min-width:180px;pointer-events:all;";
    this._adminPanel.innerHTML = `
      <div style="color:#FFD700;font-weight:bold;margin-bottom:8px;">🔒 Admin Panel</div>
      <button id="adminXray" style="width:100%;background:#222;color:#0f0;border:1px solid #0f0;
        border-radius:4px;padding:6px;cursor:pointer;font-family:monospace;font-size:12px;">
        X-Ray: OFF
      </button>
      <div id="adminPos" style="margin-top:8px;color:#aaa;font-size:10px;">pos: —</div>
    `;
    this._wrap.appendChild(this._adminPanel);
    this._adminPanel.querySelector("#adminXray")!.addEventListener("click", () => this._toggleXray());

    // ── Start overlay ──────────────────────────────────────────────────────
    this._startOverlay = document.createElement("div");
    this._startOverlay.style.cssText =
      "position:absolute;inset:0;z-index:30;pointer-events:none;";
    this._startOverlay.innerHTML = `
      <style>
        @keyframes bbMenuHover { from{letter-spacing:1px} to{letter-spacing:3px} }
        .bb-menu-item {
          color: white;
          font-size: clamp(15px, 2.2vw, 26px);
          font-family: Arial, sans-serif;
          font-weight: bold;
          padding: 9px 0 9px 4px;
          cursor: pointer;
          transition: color 0.12s, padding-left 0.12s;
          border-left: 3px solid transparent;
          letter-spacing: 0.5px;
          user-select: none;
        }
        .bb-menu-item:hover {
          color: #FFD700;
          padding-left: 14px;
          border-left-color: #FFD700;
        }
        .bb-menu-item.disabled {
          color: rgba(255,255,255,0.28);
          cursor: default;
          border-left-color: transparent !important;
          padding-left: 4px !important;
        }
        .bb-menu-item.chapter2 { color: #ff8800; }
        .bb-menu-item.chapter2:hover { color: #FFD700; }
      </style>

      <!-- Dark left panel -->
      <div style="position:absolute;top:0;left:0;bottom:0;width:min(340px,44%);
        background:linear-gradient(105deg,rgba(6,5,10,0.97) 80%,rgba(6,5,10,0.0) 100%);
        display:flex;flex-direction:column;padding:clamp(20px,4vh,44px) clamp(18px,3vw,36px);gap:0;
        pointer-events:all;">

        <!-- Title -->
        <div style="font-family:'Arial Black',Arial,sans-serif;line-height:1.05;margin-bottom:clamp(10px,2.5vh,24px);">
          <div style="color:rgba(255,255,255,0.7);font-size:clamp(11px,1.6vw,18px);font-weight:900;
            letter-spacing:3px;margin-bottom:2px;">GARTEN OF</div>
          <div style="font-size:clamp(30px,5vw,58px);font-weight:900;letter-spacing:2px;line-height:1;">
            <span style="color:#22cc22;">B</span><span style="color:#ff4444;">A</span><span style="color:#ff4444;">N</span><span style="color:#8833ff;">B</span><span style="color:#ff8800;">A</span><span style="color:#2288ff;">N</span>
          </div>
          <div style="height:2px;background:linear-gradient(90deg,rgba(255,255,255,0.25),transparent);
            margin-top:8px;margin-bottom:4px;"></div>
        </div>

        <!-- Chapter label -->
        <div style="color:rgba(255,200,50,0.6);font-size:clamp(9px,1.1vw,12px);
          letter-spacing:2px;font-family:Arial;font-weight:bold;margin-bottom:6px;">CHAPTER SELECT</div>

        <!-- Menu items -->
        <div style="display:flex;flex-direction:column;gap:0;">
          <div id="bbPlay"  class="bb-menu-item">▶ New Game (Chapter 1)</div>
          <div id="bbCh2"   class="bb-menu-item chapter2">▶ Play Chapter 2</div>
          <div id="bbCh3"   class="bb-menu-item" style="color:#a8ffb8;">▶ Play Chapter 3</div>
          <div id="bbCh4"   class="bb-menu-item" style="color:#c080ff;">▶ Play Chapter 4</div>
          <div id="bbHats"  class="bb-menu-item">🎩 Drone Hats</div>
          <div class="bb-menu-item disabled">Load Game</div>
          <div class="bb-menu-item disabled">Settings</div>
          <div class="bb-menu-item disabled">Credits</div>
        </div>

        <!-- Bottom row -->
        <div style="margin-top:auto;padding-top:16px;display:flex;align-items:center;gap:10px;">
          <button id="bbMenuBack" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.45);
            font-size:12px;padding:6px 14px;border-radius:16px;
            border:1px solid rgba(255,255,255,0.14);cursor:pointer;font-family:Arial;
            transition:background 0.15s;">← Arcade</button>
          <div style="color:rgba(255,255,255,0.18);font-size:10px;font-family:Arial;">
            v0.2 — Chapter 1 Complete
          </div>
        </div>
      </div>
    `;
    this._wrap.appendChild(this._startOverlay);
    // Hat picker overlay
    const hatPicker = document.createElement("div");
    hatPicker.style.cssText =
      "position:absolute;inset:0;z-index:60;background:rgba(8,8,10,0.96);display:none;" +
      "flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:24px;" +
      "pointer-events:all;";
    hatPicker.innerHTML = `
      <div style="font-family:'Arial Black',Arial;font-size:clamp(22px,4vw,40px);font-weight:900;color:white;">🎩 Drone Hats</div>
      <div id="hatGrid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:520px;width:100%;"></div>
      <button id="hatClose" style="background:rgba(255,255,255,0.1);color:white;font-size:15px;
        padding:10px 28px;border-radius:24px;border:1px solid rgba(255,255,255,0.25);cursor:pointer;font-family:Arial;">
        ← Back
      </button>
    `;
    this._wrap.appendChild(hatPicker);

    // Wire up after appending so elements exist
    setTimeout(() => {
      const renderHatGrid = () => {
        const grid = hatPicker.querySelector("#hatGrid")!;
        grid.innerHTML = "";
        const saved = localStorage.getItem("banban_drone_hat") ?? "none";
        for (const h of DRONE_HATS) {
          const btn = document.createElement("button");
          const sel = h.id === saved;
          btn.style.cssText =
            `background:${sel ? "rgba(255,215,0,0.18)" : "rgba(255,255,255,0.07)"};` +
            `border:2px solid ${sel ? "#FFD700" : "rgba(255,255,255,0.15)"};` +
            `border-radius:12px;padding:14px 8px;cursor:pointer;display:flex;flex-direction:column;` +
            `align-items:center;gap:6px;color:white;font-family:Arial;transition:all 0.15s;`;
          btn.innerHTML = `<span style="font-size:28px">${h.emoji}</span><span style="font-size:11px;opacity:0.85">${h.label}</span>`;
          btn.addEventListener("pointerdown", () => {
            localStorage.setItem("banban_drone_hat", h.id);
            this._selectedHat = h.id;
            this._removeHat();
            this._addDroneHat();
            renderHatGrid();
          });
          grid.appendChild(btn);
        }
      };

      this._startOverlay.querySelector("#bbPlay")?.addEventListener("pointerdown", () => this._doStart());
      this._startOverlay.querySelector("#bbMenuBack")?.addEventListener("pointerdown", () => this._cleanup(true));
      this._startOverlay.querySelector("#bbHats")?.addEventListener("pointerdown", () => {
        hatPicker.style.display = "flex";
        renderHatGrid();
      });
      this._startOverlay.querySelector("#bbCh3")?.addEventListener("pointerdown", () => {
        this._cleanup();
        import("./GardenBanban3").then(m => new m.GardenBanban3(this._g));
      });
      this._startOverlay.querySelector("#bbCh4")?.addEventListener("pointerdown", () => {
        // Chapter 4 coming soon overlay
        const cs4 = document.createElement("div");
        cs4.style.cssText =
          "position:absolute;inset:0;z-index:80;background:rgba(0,0,0,0.92);" +
          "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
          "gap:16px;font-family:'Arial Black',Arial;pointer-events:all;";
        cs4.innerHTML = `
          <div style="font-size:clamp(28px,5vw,56px);font-weight:900;color:white;letter-spacing:2px;">
            <span style="color:#22cc22;">B</span><span style="color:#ff4444;">AN</span><span style="color:#8833ff;">B</span><span style="color:#ff8800;">AN</span>
          </div>
          <div style="color:#c080ff;font-size:clamp(18px,3vw,36px);font-weight:900;letter-spacing:3px;">CHAPTER 4</div>
          <div style="font-size:clamp(32px,6vw,64px);">🚧</div>
          <div style="color:rgba(255,255,255,0.5);font-size:clamp(13px,1.8vw,20px);text-align:center;max-width:380px;line-height:1.7;font-family:Arial;">
            The Castle awaits…<br>Coming soon!
          </div>
          <button id="cs4Back" style="background:rgba(255,255,255,0.1);color:white;
            font-size:15px;padding:10px 28px;border-radius:20px;margin-top:10px;
            border:1px solid rgba(255,255,255,0.25);cursor:pointer;font-family:Arial;">← Back</button>
        `;
        this._wrap.appendChild(cs4);
        cs4.querySelector("#cs4Back")?.addEventListener("pointerdown", () => cs4.remove());
      });
      this._startOverlay.querySelector("#bbCh2")?.addEventListener("pointerdown", () => {
        // Chapter 2 coming soon overlay
        const cs = document.createElement("div");
        cs.style.cssText =
          "position:absolute;inset:0;z-index:80;background:rgba(0,0,0,0.92);" +
          "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
          "gap:16px;font-family:'Arial Black',Arial;pointer-events:all;";
        cs.innerHTML = `
          <div style="font-size:clamp(28px,5vw,56px);font-weight:900;color:white;letter-spacing:2px;">
            <span style="color:#22cc22;">B</span><span style="color:#ff4444;">AN</span><span style="color:#8833ff;">B</span><span style="color:#ff8800;">AN</span>
          </div>
          <div style="color:#FFD700;font-size:clamp(18px,3vw,36px);font-weight:900;letter-spacing:3px;">CHAPTER 2</div>
          <div style="color:rgba(255,255,255,0.5);font-size:clamp(13px,1.8vw,20px);text-align:center;max-width:380px;line-height:1.7;font-family:Arial;">
            The elevator lands. Jumbo Josh lies crushed.<br>Find the Orange Keycard and reach The Hub.
          </div>
          <div style="display:flex;gap:12px;margin-top:10px;">
            <button id="csPlay2" style="background:#ff8800;color:white;font-size:15px;font-weight:bold;
              padding:10px 28px;border-radius:20px;border:none;cursor:pointer;font-family:Arial;">▶ Play Chapter 2</button>
            <button id="csBack" style="background:rgba(255,255,255,0.1);color:white;
              font-size:15px;padding:10px 28px;border-radius:20px;
              border:1px solid rgba(255,255,255,0.25);cursor:pointer;font-family:Arial;">← Back</button>
          </div>
        `;
        this._wrap.appendChild(cs);
        cs.querySelector("#csBack")?.addEventListener("pointerdown", () => cs.remove());
        cs.querySelector("#csPlay2")?.addEventListener("pointerdown", () => {
          this._cleanup();
          new GardenBanban2(this._g);
        });
      });
      hatPicker.querySelector("#hatClose")?.addEventListener("pointerdown", () => {
        hatPicker.style.display = "none";
      });
    }, 0);
  }

  private _doStart(): void {
    if (this._started) return;
    this._started = true;
    this._startOverlay.style.pointerEvents = "none";
    this._startOverlay.style.opacity = "0";
    this._startOverlay.style.transition = "opacity 0.4s";
    setTimeout(() => { this._startOverlay.style.display = "none"; }, 400);
    this._canvas.requestPointerLock?.();
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  private _setupInput(): void {
    this._kd = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (!this._started) this._doStart();
      if (e.code === "KeyE") this._tryInteract();
      if (e.code === "Backquote") {
        this._adminPanel.style.display = this._adminPanel.style.display === "none" ? "block" : "none";
      }
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))
        e.preventDefault();
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
      // Request pointer lock for mouse look (but always send drone too)
      if (document.pointerLockElement !== this._canvas) {
        this._canvas.requestPointerLock?.();
      }
      this._sendDrone();
    };
    this._canvas.addEventListener("pointerdown", this._mc);

    this._rz = () => this._engine.resize();
    window.addEventListener("resize", this._rz);
  }

  private _tryInteract(): void {
    this._aimedAt?.onInteract();
  }

  private _pickupKeycard(mesh: Mesh): void {
    this._hasKeycard = true;
    mesh.setEnabled(false);
    this._hudKeycard.textContent = "🔑 Blue Keycard";
    this._hudKeycard.style.color = "#4a8fff";
    this._score += 10;
    this._flashMsg("Picked up Blue Keycard! Use it on the door reader.");
  }

  private _useKeycard(): void {
    if (!this._hasKeycard) {
      this._flashMsg("You need the Blue Keycard first! (Check the front desk)");
      return;
    }
    this._hasKeycard = false;
    this._hudKeycard.textContent = "Keycard used ✓";
    this._hudKeycard.style.color = "rgba(255,255,255,0.3)";
    this._lobbyDoor.setEnabled(false);
    this._lobbyDoor.checkCollisions = false;
    this._score += 20;
    const idx = this._interactables.findIndex(i => i.id === "reader");
    if (idx >= 0) this._interactables.splice(idx, 1);
    this._flashScreen("rgba(0,140,255,0.25)", 0.6);
    this._flashMsg("Door unlocked! Head through and use the drone to press the button.");
  }

  private _sendDrone(): void {
    this._droneParked = false;
    const cam = this._camera.position;
    // Camera forward direction from our own yaw/pitch
    const fwd = new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      -Math.sin(this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch)
    );
    // If looking at the main hall button
    const toBtn  = this._btnMesh.position.subtract(cam);
    const btnDot = Vector3.Dot(toBtn.normalize(), fwd);
    if (!this._btnPressed && btnDot > 0.9 && toBtn.length() < 12) {
      this._droneTarget = this._btnMesh.position.clone();
      this._droneTarget.x -= 0.22;
      return;
    }
    // If looking at the yellow button (naughty corner)
    if (this._yellowBtnActive && !this._naughtyOpen) {
      const toYBtn = this._yellowBtnMesh.position.subtract(cam);
      const yDot   = Vector3.Dot(toYBtn.normalize(), fwd);
      if (yDot > 0.9 && toYBtn.length() < 12) {
        this._droneTarget = this._yellowBtnMesh.position.clone();
        this._droneTarget.x -= 0.18;
        return;
      }
    }
    // Default: fly 4 units in the direction we're looking
    const target = cam.add(fwd.scale(4));
    target.y = Math.max(1.2, Math.min(ROOM_H - 0.4, target.y));
    this._droneTarget = target;
  }

  // ── Tick ───────────────────────────────────────────────────────────────────

  private _tick(dt: number): void {
    if (!this._started || this._ending) return;
    dt = Math.min(dt, 0.05);

    // Camera look (gamepad right stick)
    this._yaw   += gpState.rx * dt * 2.2;
    this._pitch  = Math.max(-0.48, Math.min(0.48, this._pitch + gpState.ry * dt * 1.8));
    this._camera.rotation.set(this._pitch, this._yaw, 0);

    // Movement
    const sin = Math.sin(this._yaw), cos = Math.cos(this._yaw);
    const mvFwd = new Vector3(sin, 0, cos);
    const rgt   = new Vector3(cos, 0, -sin);
    let mv = Vector3.Zero();
    if (this._keys.has("KeyW") || this._keys.has("ArrowUp"))    mv.addInPlace(mvFwd);
    if (this._keys.has("KeyS") || this._keys.has("ArrowDown"))  mv.subtractInPlace(mvFwd);
    if (this._keys.has("KeyA") || this._keys.has("ArrowLeft"))  mv.subtractInPlace(rgt);
    if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) mv.addInPlace(rgt);
    if (Math.abs(gpState.lx) > 0.12) mv.addInPlace(rgt.scale(gpState.lx));
    if (Math.abs(gpState.ly) > 0.12) mv.subtractInPlace(mvFwd.scale(gpState.ly));

    // Jumping + gravity
    const onGround = this._camera.position.y <= EYE_Y + 0.05;
    if (this._keys.has("Space") && onGround) this._velY = 6;
    this._velY -= 20 * dt;
    this._camera.position.y += this._velY * dt;
    if (this._camera.position.y < EYE_Y) {
      this._camera.position.y = EYE_Y;
      this._velY = 0;
    }

    if (mv.lengthSquared() > 0) {
      mv.normalize().scaleInPlace(SPD * dt);
      const cur = this._camera.position;
      const np  = cur.add(new Vector3(mv.x, 0, mv.z));
      np.y = this._camera.position.y;
      const hallStart = -LOBBY_D / 2;
      const hallEnd   = hallStart - HALL_D;
      const playEnd   = hallEnd - PLAY_D;
      const bpEnd     = playEnd - BP_D; // north wall of ball pit room
      const inHall    = np.z < hallStart && np.z >= hallEnd && !this._lobbyDoor.isEnabled();
      const inPlay    = np.z < hallEnd   && np.z >= playEnd && !this._hallDoor.isEnabled();
      const inBP      = np.z < playEnd   && this._ballPitOpen;
      // X bounds vary by zone
      if (inBP)         { np.x = Math.max(-BP_W/2 + 0.4, Math.min(BP_W/2 - 0.4, np.x)); }
      else if (inPlay)  { np.x = Math.max(-PLAY_W/2 + 0.5, Math.min(PLAY_W/2 - 0.5, np.x)); }
      else if (inHall)  { np.x = Math.max(-HALL_W/2 + 0.3, Math.min(HALL_W/2 - 0.3, np.x)); }
      else              { np.x = Math.max(-LOBBY_W/2 + 0.5, Math.min(LOBBY_W/2 - 0.5, np.x)); }
      // Z bounds
      const zMin = this._ballPitOpen ? bpEnd + 0.4 : playEnd - 0.4;
      np.z = Math.max(zMin, Math.min(LOBBY_D/2 - 0.4, np.z));
      // Door blockers
      if (this._lobbyDoor.isEnabled() && np.z < hallStart + 1.0) np.z = hallStart + 1.0;
      if (this._hallDoor.isEnabled()  && np.z < hallEnd   + 1.0) np.z = hallEnd   + 1.0;
      // Hallway side-entry blocker
      if (np.z < hallStart && np.z > hallStart - 0.5 && (np.x < -1.1 || np.x > 1.1))
        np.z = hallStart + 0.1;
      // Playground entry blocker
      if (np.z < hallEnd && np.z > hallEnd - 0.5 && (np.x < -HALL_W/2 || np.x > HALL_W/2))
        np.z = hallEnd + 0.1;
      // Furniture blockers
      if (np.x > 6.8 && np.x < 10.5 && np.z > 0.6 && np.z < 2.4)
        { np.x = cur.x; np.z = cur.z; }
      if (np.x < -7.5 && np.z > 0.2 && np.z < 5.8)
        { np.x = cur.x; np.z = cur.z; }
      this._camera.position.copyFrom(np);
    }

    // ── Ball Pit death zones & Opila chase ────────────────────────────────────
    if (this._hitCooldown > 0) this._hitCooldown -= dt;
    if (this._ballPitOpen) {
      const bpSouth  = -LOBBY_D/2 - HALL_D - PLAY_D; // = -50
      const px       = this._camera.position.x;
      const pz       = this._camera.position.z;
      if (pz < bpSouth) {
        // Define safe regions
        const inSafeZone   = px < -2 && pz > bpSouth - 10;   // SW quadrant
        const onGondola    = this._platformExtended &&
                             px >= -2.5 && px <= 2.5 &&
                             pz < bpSouth - 4 && pz > bpSouth - 9;
        const onFarPlat    = px > 1.5 && px < 11.5 && pz < bpSouth - 10 && pz > bpSouth - BP_D + 0.4;
        if (!inSafeZone && !onGondola && !onFarPlat && this._hitCooldown <= 0) {
          this._hitCooldown = 3;
          this._flashScreen("rgba(220,0,0,0.4)", 0.5);
          this._flashMsg("You fell into the abyss! Respawning…");
          this._camera.position.set(-6, EYE_Y, bpSouth - 3);
          this._velY = 0;
        }
      }
      // Opila chase movement
      if (this._opilaChasingPlayer && this._pitOpilaMesh?.isEnabled()) {
        const oMesh = this._pitOpilaMesh;
        const toPlayer = this._camera.position.subtract(oMesh.position);
        toPlayer.y = 0;
        const dist = toPlayer.length();
        if (dist < 1.4 && this._hitCooldown <= 0) {
          // Opila caught the player
          this._hitCooldown = 3;
          this._flashScreen("rgba(255,80,180,0.35)", 0.5);
          this._flashMsg("🦩 Opila Bird caught you! Respawning…");
          this._camera.position.set(-6, EYE_Y, bpSouth - 3);
          this._velY = 0;
        } else {
          const oSpd = 2.8 * dt;
          oMesh.position.addInPlace(toPlayer.normalize().scaleInPlace(oSpd));
          oMesh.position.y = 1.0;
          // Face player
          oMesh.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        }
      }
    }

    // Spin drone rotors + hat propeller
    this._droneMesh.rotation.y += dt * 3.5;
    if (this._hatSpinMesh) this._hatSpinMesh.rotation.y += dt * 8;

    // Drone behaviour: follow player only when not parked/flying
    if (this._droneTarget) {
      // Flying to target
      const dir = this._droneTarget.subtract(this._droneMesh.position);
      const len = dir.length();
      if (len < 0.12) {
        this._droneMesh.position.copyFrom(this._droneTarget);
        this._droneTarget = null;
        this._droneParked = true; // stay here until next click
        // Check main hall button
        const bd = Vector3.Distance(this._droneMesh.position, this._btnMesh.position);
        if (bd < 0.55 && !this._btnPressed) {
          this._btnPressed = true;
          this._hallDoor.setEnabled(false);
          this._hallDoor.checkCollisions = false;
          this._score += 30;
          this._flashScreen("rgba(0,255,80,0.18)", 0.5);
          this._flashMsg("Button pressed! Door opened — head to the playground!");
        }
        // Check yellow naughty corner button
        if (this._yellowBtnActive && !this._naughtyOpen) {
          const ybd = Vector3.Distance(this._droneMesh.position, this._yellowBtnMesh.position);
          if (ybd < 0.55) {
            this._naughtyOpen = true;
            this._naughtyDoor.setEnabled(false);
            this._naughtyDoor.checkCollisions = false;
            this._hammerMesh.setEnabled(true);
            this._score += 20;
            this._flashScreen("rgba(255,220,0,0.2)", 0.5);
            this._flashMsg("Naughty Corner opened! Go get the Hammer!");
          }
        }
      } else {
        this._droneMesh.position.addInPlace(dir.normalize().scaleInPlace(Math.min(len, 9 * dt)));
      }
    } else if (!this._droneParked) {
      // Float near player
      const t = performance.now() / 1000;
      const ideal = this._camera.position.add(new Vector3(
        Math.sin(this._yaw) * 0.75 + Math.cos(t * 0.8) * 0.18,
        -0.25 + Math.sin(t * 1.4) * 0.06,
        Math.cos(this._yaw) * 0.75
      ));
      this._droneMesh.position.addInPlace(
        ideal.subtract(this._droneMesh.position).scaleInPlace(dt * 4)
      );
    }

    // ── Crosshair aimed-at detection ──────────────────────────────────────────
    const cam = this._camera.position;
    const fwd = new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      -Math.sin(this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch)
    );
    let newAimed: Interactable | null = null;
    for (const item of this._interactables) {
      if (!item.mesh.isEnabled()) continue;
      const toItem = item.mesh.position.subtract(cam);
      const dist = toItem.length();
      if (dist > E_DIST) continue;
      if (Vector3.Dot(toItem.normalize(), fwd) > 0.88) { newAimed = item; break; }
    }
    // Update outline highlight
    if (newAimed?.mesh !== this._aimedAt?.mesh) {
      if (this._aimedAt) this._aimedAt.mesh.renderOutline = false;
      if (newAimed) {
        newAimed.mesh.renderOutline  = true;
        newAimed.mesh.outlineColor   = new Color3(1, 1, 1);
        newAimed.mesh.outlineWidth   = 0.06;
      }
      this._aimedAt = newAimed;
    }

    // Interaction prompts
    let label = newAimed ? newAimed.label : "";
    if (!label) {
      const hallEnd  = -LOBBY_D/2 - HALL_D;
      const playEnd  = hallEnd - PLAY_D;
      const inHall   = cam.z < -LOBBY_D/2 && cam.z > hallEnd;
      const inPlay   = cam.z <= hallEnd && cam.z > playEnd;
      if (!this._btnPressed && inHall)
        label = "🎯 Left-click the RED BUTTON on the right wall to send drone!";
      else if (cam.z < -LOBBY_D/2 - HALL_D - PLAY_D && this._ballPitOpen) {
        // Ball pit room hints
        if (!this._colorPuzzleSolved)
          label = "🎨 Find the color puzzle panel — \"What Was My Color?\"";
        else if (!this._hasOrangeKey)
          label = "🟠 Pick up the Orange Keycard near the chair!";
        else if (!this._platformExtended)
          label = "🟢 Press the green button to extend the platform!";
        else if (this._opilaChasingPlayer && !this._emergencyStopUsed)
          label = "⚠️ Opila is chasing you! Cross over and back, then hit EMERGENCY STOP!";
        else if (!this._emergencyStopUsed)
          label = "Cross to the far side, come back, then hit the red EMERGENCY STOP!";
        else
          label = "🛗 Opila is gone! Take the Elevator!";
      } else if (inPlay) {
        if (!this._opilaDone && this._eggsCollected === 0)
          label = "🥚 Find all 6 eggs hidden around the playground!";
        else if (!this._opilaDone)
          label = `🦩 Feed egg to Opila Bird! (${this._eggsCollected} egg${this._eggsCollected!==1?"s":""} in hand)`;
        else if (!this._hasYellowKey)
          label = "✨ Pick up the Yellow Keycard dropped by Opila!";
        else if (!this._yellowBtnActive)
          label = "🔑 Use the Yellow Keycard on the reader (east wall)!";
        else if (!this._naughtyOpen)
          label = "🎯 Send drone to the wall button — open the Naughty Corner!";
        else if (!this._hasHammer)
          label = "🔨 Go get the Hammer from the Naughty Corner!";
        else if (!this._ballPitOpen)
          label = "🔨 Use Hammer on the planks near the Ball Pit sign!";
      }
    }
    this._hudPrompt.textContent = label;
    this._hudPrompt.style.display = label ? "block" : "none";

    // Admin panel position display
    if (this._adminPanel.style.display !== "none") {
      const p = this._camera.position;
      const el = this._adminPanel.querySelector("#adminPos") as HTMLDivElement;
      if (el) el.textContent = `pos: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
    }
  }

  // ── Admin ──────────────────────────────────────────────────────────────────

  private _toggleXray(): void {
    this._xray = !this._xray;
    for (const b of this._eggBeacons) {
      // Only show beacon if its egg is still in the scene
      const eggMesh = this._scene.getMeshByName(`egg_${this._eggBeacons.indexOf(b)}`);
      b.setEnabled(this._xray && (eggMesh?.isEnabled() ?? false));
    }
    const btn = this._adminPanel.querySelector("#adminXray") as HTMLButtonElement;
    if (btn) {
      btn.textContent = `X-Ray: ${this._xray ? "ON 👁" : "OFF"}`;
      btn.style.color  = this._xray ? "#ff0" : "#0f0";
      btn.style.borderColor = this._xray ? "#ff0" : "#0f0";
    }
  }

  // ── Playground handlers ────────────────────────────────────────────────────

  private _feedOpila(): void {
    if (this._opilaDone) { this._flashMsg("Opila Bird has been fed!"); return; }
    if (this._eggsCollected === 0) {
      this._flashMsg("Find the 6 eggs first! They're hidden all around the playground.");
      return;
    }
    this._eggsCollected--;
    this._eggsFed++;
    this._flashScreen("rgba(255,200,100,0.15)", 0.4);
    if (this._eggsFed < 6) {
      this._flashMsg(`Fed egg to Opila! (${this._eggsFed}/6) ${this._eggsCollected > 0 ? `${this._eggsCollected} in hand.` : "Find more eggs!"}`);
      this._hudKeycard.textContent = `🥚 Eggs: ${this._eggsCollected} held`;
    } else {
      this._opilaDone = true;
      // Spawn yellow keycard from Opila's beak
      const playEnd = -LOBBY_D/2 - HALL_D - PLAY_D;
      const kcMat = this._mat(0.90, 0.82, 0.08, 0.20, 0.16, 0.01);
      this._yellowKeyMesh = this._box(0.7, 0.05, 0.44, 0, 1.0, playEnd + 2.5, kcMat, true);
      this._yellowKeyMesh.name = "yellow_keycard";
      this._interactables.push({
        mesh: this._yellowKeyMesh, id: "yellow_keycard",
        label: "[ E ] Pick up Yellow Keycard",
        onInteract: () => {
          this._hasYellowKey = true;
          this._yellowKeyMesh.setEnabled(false);
          this._hudKeycard.textContent = "🔑 Yellow Keycard";
          this._hudKeycard.style.color = "#FFD700";
          this._flashMsg("Got the Yellow Keycard! Use it on the reader on the east wall.");
          const ii = this._interactables.findIndex(it => it.id === "yellow_keycard");
          if (ii >= 0) this._interactables.splice(ii, 1);
        },
      });
      const oi = this._interactables.findIndex(it => it.id === "opila");
      if (oi >= 0) this._interactables.splice(oi, 1);
      this._flashMsg("Opila Bird spat out the Yellow Keycard! Go pick it up!");
      this._hudKeycard.textContent = "✨ Yellow Key dropped!";
      this._hudKeycard.style.color = "#FFD700";
      this._score += 40;
    }
  }

  private _useYellowKey(): void {
    if (!this._hasYellowKey) {
      this._flashMsg("You need the Yellow Keycard first! Feed all 6 eggs to Opila Bird.");
      return;
    }
    this._hasYellowKey = false;
    this._yellowBtnActive = true;
    this._hudKeycard.textContent = "Yellow Key used ✓";
    this._hudKeycard.style.color = "rgba(255,255,255,0.3)";
    this._flashScreen("rgba(255,220,0,0.2)", 0.5);
    this._flashMsg("Yellow Keycard used! Send your drone to the wall button to open the Naughty Corner!");
  }

  private _pickupHammer(): void {
    this._hasHammer = true;
    this._hammerMesh.setEnabled(false);
    this._hudKeycard.textContent = "🔨 Hammer";
    this._hudKeycard.style.color = "#c8a060";
    this._score += 20;
    const ii = this._interactables.findIndex(it => it.id === "hammer");
    if (ii >= 0) this._interactables.splice(ii, 1);
    this._flashMsg("Got the Hammer! Smash those planks blocking the Ball Pit!");
  }

  // ── Ending / Jumbo Josh ────────────────────────────────────────────────────

  private _triggerEnding(): void {
    if (this._ending) return;
    this._ending = true;

    const seq = document.createElement("div");
    seq.style.cssText = "position:absolute;inset:0;z-index:50;overflow:hidden;background:#000;pointer-events:none;";
    seq.innerHTML = `
      <style>
        @keyframes descend { 0%{transform:translateY(0) rotate(0deg)} 60%{transform:translateY(18px) rotate(0deg)} 80%{transform:translateY(22px) rotate(-8deg)} 100%{transform:translateY(120vh) rotate(-25deg)} }
        @keyframes joshRise { 0%{transform:translateY(100%)} 100%{transform:translateY(0%)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes alarmFlash { 0%,100%{opacity:0} 50%{opacity:0.35} }
        @keyframes fadeOut { to{opacity:0} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      </style>

      <!-- Darkness with descending view -->
      <div id="liftView" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <!-- Shaft walls rushing past -->
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,#111 0%,#060606 100%);"></div>
        <!-- Alarm red flash -->
        <div id="alarmFlash" style="position:absolute;inset:0;background:#ff0000;opacity:0;animation:alarmFlash 0.4s infinite;"></div>

        <!-- Lift platform (player is standing on this) -->
        <div id="liftPlatform" style="position:absolute;bottom:0;left:0;right:0;height:28vh;
          display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
          animation:descend 3.2s 1.5s cubic-bezier(0.4,0,1,1) forwards;">
          <!-- Railings -->
          <div style="width:min(600px,90vw);height:10px;background:#6a7a82;border-radius:3px;margin-top:0;box-shadow:0 2px 8px rgba(0,0,0,0.8);"></div>
          <div style="width:min(600px,90vw);display:flex;justify-content:space-between;padding:0 10px;">
            ${[0,1,2,3,4,5].map(()=>`<div style="width:10px;height:14vh;background:#5a6a72;"></div>`).join("")}
          </div>
          <!-- Platform floor -->
          <div style="width:min(640px,95vw);height:3vh;background:#3a4248;border-top:3px solid #7a8a92;"></div>
        </div>

        <!-- Jumbo Josh rising from below -->
        <div id="joshRise" style="position:absolute;bottom:-5%;left:0;right:0;
          display:flex;justify-content:center;align-items:flex-end;
          animation:joshRise 1.2s 2.0s cubic-bezier(0.2,0,0.3,1) forwards;transform:translateY(100%);">
          <!-- Josh body (green, giant) -->
          <div style="position:relative;width:min(70vw,500px);">
            <!-- Head -->
            <div style="width:100%;aspect-ratio:1;
              background:radial-gradient(ellipse at 40% 38%, #44dd44, #0d7a0d);
              border-radius:50%;position:relative;overflow:hidden;
              box-shadow:0 0 60px rgba(0,180,0,0.5);">
              <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 62% 32%,rgba(0,0,0,0) 38%,rgba(0,0,0,0.22) 100%);"></div>
              <!-- Eyes -->
              <div style="position:absolute;top:26%;left:16%;width:22%;aspect-ratio:1;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 3px 8px rgba(0,0,0,0.4);">
                <div style="width:55%;aspect-ratio:1;background:#080808;border-radius:50%;"></div>
              </div>
              <div style="position:absolute;top:26%;right:16%;width:22%;aspect-ratio:1;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 3px 8px rgba(0,0,0,0.4);">
                <div style="width:55%;aspect-ratio:1;background:#080808;border-radius:50%;"></div>
              </div>
              <!-- Mouth open wide -->
              <div style="position:absolute;bottom:12%;left:10%;width:80%;height:28%;background:#060606;border-radius:0 0 50% 50%;overflow:hidden;">
                <div style="display:flex;justify-content:space-around;align-items:flex-start;padding:2px 6px 0;">
                  ${Array(8).fill(`<div style="background:white;width:9%;border-radius:2px 2px 6px 6px;aspect-ratio:0.5/1;"></div>`).join("")}
                </div>
              </div>
            </div>
            <!-- Giant hands gripping the platform edges -->
            <div style="position:absolute;top:-6%;left:-18%;width:30%;
              display:flex;flex-direction:column;gap:4px;">
              <div style="height:28px;background:#2a9a2a;border-radius:6px 6px 0 0;box-shadow:0 -4px 12px rgba(0,0,0,0.5);"></div>
              <div style="display:flex;gap:5px;">
                ${Array(4).fill(`<div style="flex:1;height:40px;background:#249024;border-radius:0 0 8px 8px;"></div>`).join("")}
              </div>
            </div>
            <div style="position:absolute;top:-6%;right:-18%;width:30%;
              display:flex;flex-direction:column;gap:4px;">
              <div style="height:28px;background:#2a9a2a;border-radius:6px 6px 0 0;box-shadow:0 -4px 12px rgba(0,0,0,0.5);"></div>
              <div style="display:flex;gap:5px;">
                ${Array(4).fill(`<div style="flex:1;height:40px;background:#249024;border-radius:0 0 8px 8px;"></div>`).join("")}
              </div>
            </div>
          </div>
        </div>

        <!-- Shaft wall lines rushing past (speed lines) -->
        ${Array(8).fill(0).map((_,i)=>`
          <div style="position:absolute;top:0;bottom:0;left:${8+i*12}%;width:2px;
            background:linear-gradient(180deg,transparent,rgba(80,80,80,0.3),transparent);
            animation:descend 0.6s ${i*0.07}s linear infinite;"></div>
        `).join("")}
      </div>

      <!-- Final black screen -->
      <div id="finalBlack" style="position:absolute;inset:0;background:#000;opacity:0;
        animation:fadeIn 0.6s 4.4s forwards;pointer-events:none;"></div>
    `;
    this._wrap.appendChild(seq);

    // Shake effect when Josh grabs
    setTimeout(() => {
      seq.style.animation = "shake 0.4s";
      setTimeout(() => { seq.style.animation = "shake 0.3s"; }, 400);
    }, 2800);

    // "PART 1 OF 10" reveal after black
    setTimeout(() => {
      seq.remove();
      const reveal = document.createElement("div");
      reveal.style.cssText =
        "position:absolute;inset:0;z-index:60;background:#000;display:flex;flex-direction:column;" +
        "align-items:center;justify-content:center;gap:18px;font-family:'Arial Black',Arial,sans-serif;";
      reveal.innerHTML = `
        <style>
          @keyframes fadeInUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
          @keyframes punchIn  { 0%{transform:scale(3);opacity:0} 60%{transform:scale(0.9)} 100%{transform:scale(1);opacity:1} }
        </style>
        <div style="color:rgba(255,255,255,0.4);font-size:clamp(13px,2vw,20px);letter-spacing:4px;
          animation:fadeInUp 0.7s 0.3s both;">THE END…</div>
        <div style="color:white;font-size:clamp(28px,5vw,64px);font-weight:900;letter-spacing:3px;
          animation:punchIn 0.5s 1.4s both;text-shadow:0 0 40px rgba(255,200,0,0.5);">
          GARTEN OF BANBAN
        </div>
        <div style="display:flex;align-items:center;gap:14px;animation:fadeInUp 0.6s 2.2s both;">
          <div style="height:2px;width:60px;background:rgba(255,255,255,0.3);"></div>
          <div style="color:#FFD700;font-size:clamp(20px,3.5vw,44px);font-weight:900;letter-spacing:2px;">
            PART 1 OF 10
          </div>
          <div style="height:2px;width:60px;background:rgba(255,255,255,0.3);"></div>
        </div>
        <div style="color:rgba(255,255,255,0.35);font-size:clamp(11px,1.5vw,16px);
          animation:fadeInUp 0.6s 3.0s both;text-align:center;max-width:400px;line-height:1.8;">
          The Kindergarten has many more secrets…<br>Can you survive all 10 chapters?
        </div>
      `;
      this._wrap.appendChild(reveal);
      setTimeout(() => { reveal.remove(); this._end(); }, 5500);
    }, 5200);
  }

  // ── Flash helpers ──────────────────────────────────────────────────────────

  private _flashScreen(color: string, dur: number): void {
    const div = document.createElement("div");
    div.style.cssText = `position:absolute;inset:0;background:${color};pointer-events:none;z-index:20;transition:opacity ${dur}s;`;
    this._wrap.appendChild(div);
    requestAnimationFrame(() => { div.style.opacity = "0"; });
    setTimeout(() => div.remove(), dur * 1000 + 100);
  }

  private _flashMsg(msg: string): void {
    this._hudPrompt.textContent = msg;
    this._hudPrompt.style.display = "block";
    setTimeout(() => {
      if (this._hudPrompt.textContent === msg) this._hudPrompt.style.display = "none";
    }, 3000);
  }

  // ── Cleanup / end ──────────────────────────────────────────────────────────

  private _cleanup(goBack = false): void {
    if (this._done) return;
    this._done = true;
    document.exitPointerLock?.();
    document.removeEventListener("keydown",   this._kd);
    document.removeEventListener("keyup",     this._ku);
    document.removeEventListener("mousemove", this._mm);
    this._canvas.removeEventListener("pointerdown", this._mc);
    window.removeEventListener("resize", this._rz);
    this._engine.stopRenderLoop();
    this._scene.dispose();
    this._engine.dispose();
    this._g.inMiniGame = false;
    if (goBack) this._g.goArcade();
  }

  private _end(): void {
    this._cleanup();
    this._g.state.coins += this._score;
    this._g.save();

    const wrap = document.createElement("div");
    wrap.className = "screen";
    wrap.style.cssText = "background:linear-gradient(160deg,#081a08,#0a0018);gap:14px;font-family:Arial,sans-serif;";
    wrap.innerHTML = `
      <div style="font-size:54px;">🟢</div>
      <div style="color:#FFD700;font-size:26px;font-weight:bold;">JUMBO JOSH SMASHED THE ELEVATOR!</div>
      <div style="color:rgba(255,255,255,0.65);font-size:14px;max-width:300px;text-align:center;line-height:1.7;">
        You made it through Banban's Kindergarten...<br>but the elevator had other plans.
      </div>
      <div style="color:white;font-size:18px;">Score: <strong style="color:#FFD700">${this._score} 🪙</strong></div>
    `;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:10px;";
    const again = document.createElement("button");
    again.id = "playBtn"; again.textContent = "▶ Play Again";
    again.style.cssText = "background:#FFD700;color:#1a0060;font-size:17px;font-weight:bold;padding:12px 30px;border-radius:40px;border:3px solid #e6b800;cursor:pointer;";
    again.onclick = () => new GardenBanban(this._g);
    const back = document.createElement("button");
    back.id = "backBtn"; back.textContent = "← Back to Arcade";
    back.style.cssText = "background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:15px;padding:9px 24px;border-radius:40px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;";
    back.onclick = () => this._g.goArcade();
    row.appendChild(again); row.appendChild(back);
    wrap.appendChild(row);
    this._g.ui.innerHTML = "";
    this._g.ui.appendChild(wrap);
  }
}
