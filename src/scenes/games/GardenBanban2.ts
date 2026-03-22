/**
 * Garten of Banban 2 — Outer Sector & Hub
 * You wake up on the elevator that crushed Jumbo Josh…
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

const EYE_Y2  = 1.65;
const SPD2    = 5;
const E_DIST2 = 2.8;
const ROOM_H2 = 3.5;

interface Interactable2 {
  mesh: Mesh;
  id: string;
  label: string;
  onInteract: () => void;
}

export class GardenBanban2 {
  private _g:      Game;
  private _wrap:   HTMLDivElement;
  private _canvas: HTMLCanvasElement;
  private _engine: Engine;
  private _scene:  Scene;
  private _camera: FreeCamera;

  private _yaw   = 0;
  private _pitch = 0;
  private _velY  = 0;
  private _keys  = new Set<string>();
  private _started = false;
  private _done    = false;

  private _interactables: Interactable2[] = [];
  private _aimedAt: Interactable2 | null = null;

  private _hasOrangeKey  = false;
  private _door1Open     = false;
  private _door2Open     = false;
  private _door1!:       Mesh;
  private _door2!:       Mesh;
  private _score         = 0;

  // Drone state — starts broken, find a new one in the Hub
  private _hasBrokenDrone = false;
  private _hasWorkingDrone = false;
  private _droneMesh!:    Mesh;
  private _droneTarget:   Vector3 | null = null;
  private _droneParked    = false;
  private _hudDrone!:     HTMLDivElement;

  // Comms + maintenance state
  private _hasPinkKey        = false;
  private _commsDoor!:       Mesh;
  private _commsDoorOpen     = false;
  private _deskPressed       = Array(8).fill(false) as boolean[];
  private _deskPressOrder:   number[] = [];
  private _commsPuzzleSolved = false;
  private _limeKeyMesh!:     Mesh;
  private _hasLimeKey        = false;
  private _lbDoor!:          Mesh;
  private _lbDoorOpen        = false;
  private _hasLightBlueKey   = false;
  private _drBtnPressed      = [false, false, false] as boolean[];
  private _drBtnCount        = 0;
  private _nabnabMesh!:      Mesh;
  private _nabnabParts:      Mesh[] = [];  // all sub-meshes moved together
  private _nabnabX           = 0;
  private _nabnabZ           = -62.5;
  private _nabnabActive      = false;
  private _nabnabCrashed     = false;
  private _nabnabTimer       = 0;   // time since activation
  private _hitCooldown2      = 0;
  private _drBtnWorldPos:    [number,number,number][] = [];
  private _prevBtnSq         = false;
  private _prevBtnRT         = false;
  // Security Office
  private _secDoor!:         Mesh;
  private _secDoorOpen       = false;

  private _hudPrompt!:    HTMLDivElement;
  private _hudItem!:      HTMLSpanElement;
  private _startOverlay!: HTMLDivElement;

  private _kd!: (e: KeyboardEvent) => void;
  private _ku!: (e: KeyboardEvent) => void;
  private _mm!: (e: MouseEvent)    => void;
  private _mc!: (e: PointerEvent)  => void;
  private _rz!: () => void;
  private _touchHud?: HTMLDivElement;

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
    this._scene.clearColor = new Color4(0.04, 0.04, 0.06, 1);

    this._camera = new FreeCamera("cam2", new Vector3(0, EYE_Y2, 4), this._scene);
    this._camera.minZ = 0.05;
    this._camera.maxZ = 80;
    this._camera.checkCollisions = true;
    this._camera.ellipsoid = new Vector3(0.35, EYE_Y2 * 0.5, 0.35);
    this._camera.ellipsoidOffset = new Vector3(0, EYE_Y2 * 0.5, 0);
    this._scene.collisionsEnabled = true;

    // Lighting — dim industrial
    const amb = new HemisphericLight("amb2", new Vector3(0, 1, 0), this._scene);
    amb.intensity   = 0.45;
    amb.diffuse     = new Color3(0.75, 0.72, 0.80);
    amb.groundColor = new Color3(0.15, 0.14, 0.18);

    this._buildOuterSector();
    this._buildHallway();
    this._buildHub();
    this._buildCommsSector();
    this._buildMaintenanceRoom();
    this._buildSecurityOffice();
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
    m.diffuseColor  = new Color3(r, g, b);
    if (emR || emG || emB) m.emissiveColor = new Color3(emR, emG, emB);
    return m;
  }

  private _box(w: number, h: number, d: number, x: number, y: number, z: number,
               mat: StandardMaterial, pick = false, col = false): Mesh {
    const m = MeshBuilder.CreateBox("", { width: w, height: h, depth: d }, this._scene);
    m.position.set(x, y, z);
    m.material = mat;
    m.isPickable = pick;
    m.checkCollisions = col;
    return m;
  }

  // ── Outer Sector ───────────────────────────────────────────────────────────

  private _buildOuterSector(): void {
    const W = 14, D = 12, H = ROOM_H2;

    // Floor — dark concrete
    const floorMat = this._mat(0.20, 0.19, 0.22);
    const floor = MeshBuilder.CreateGround("os_f", { width: W, height: D }, this._scene);
    floor.position.set(0, 0, 0); floor.material = floorMat;

    // Ceiling
    const ceilMat = this._mat(0.12, 0.11, 0.14);
    const ceil = MeshBuilder.CreateGround("os_c", { width: W, height: D }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, 0); ceil.material = ceilMat;

    // Walls — dark gray
    const wallMat = this._mat(0.18, 0.17, 0.20);
    // South
    this._box(W, H, 0.2,  0, H/2,  D/2, wallMat, false, true);
    // East
    this._box(0.2, H, D, W/2, H/2,  0,   wallMat, false, true);
    // West
    this._box(0.2, H, D, -W/2, H/2, 0,   wallMat, false, true);
    // North — split for door (2.2 wide gap at center)
    const nwSide = (W - 2.4) / 2;
    this._box(nwSide, H, 0.2, -(1.2 + nwSide/2), H/2, -D/2, wallMat, false, true);
    this._box(nwSide, H, 0.2,  (1.2 + nwSide/2), H/2, -D/2, wallMat, false, true);
    this._box(2.4, H - 2.5, 0.2, 0, 2.5 + (H-2.5)/2, -D/2, wallMat, false, true);

    // Ceiling light strips
    const stripMat = this._mat(0.9, 0.85, 1, 0.55, 0.5, 0.65);
    for (const lx of [-3, 3]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.16, height: 0.04, depth: D * 0.7 }, this._scene);
      sl.position.set(lx, H - 0.02, 0); sl.material = stripMat; sl.isPickable = false;
    }
    const spl = new PointLight("spl", new Vector3(0, H - 0.3, 0), this._scene);
    spl.intensity = 0.6; spl.range = 18; spl.diffuse = new Color3(0.8, 0.75, 1);

    // Emergency lighting — red strip near floor
    const redStripMat = this._mat(0.7, 0.06, 0.06, 0.4, 0.02, 0.02);
    for (const x of [-W/2 + 0.12, W/2 - 0.12]) {
      const rs = MeshBuilder.CreateBox("", { width: 0.08, height: 0.12, depth: D * 0.9 }, this._scene);
      rs.position.set(x, 0.15, 0); rs.material = redStripMat; rs.isPickable = false;
    }

    // Pipe/infrastructure along ceiling
    const pipeMat = this._mat(0.30, 0.28, 0.32);
    for (const pz of [-3, 0, 3]) {
      const pipe = MeshBuilder.CreateCylinder("", { diameter: 0.18, height: W, tessellation: 8 }, this._scene);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, H - 0.3, pz);
      pipe.material = pipeMat; pipe.isPickable = false;
    }

    // ── ELEVATOR PLATFORM (landed, on top of Jumbo Josh) ──────────────────
    const elevMat = this._mat(0.35, 0.33, 0.38);
    const elevFloor = this._box(3.5, 0.22, 3.5, 0, 0.11, -1.5, elevMat); // elevator floor
    elevFloor.isPickable = false;
    // Elevator walls/cage
    for (const [ex, ez, ew, ed] of [
      [0, 1.57, 3.5, 0.1], [0, -3.43, 3.5, 0.1], // front/back
      [1.7, -1.0, 0.1, 3.5], [-1.7, -1.0, 0.1, 3.5]  // sides
    ] as [number,number,number,number][]) {
      const panel = this._box(ew, 2.2, ed, ex, 1.2, ez, this._mat(0.28, 0.27, 0.32));
      panel.isPickable = false;
    }
    // Shaft cables going up to ceiling
    const cableMat = this._mat(0.22, 0.22, 0.25);
    for (const [cx, cz] of [[-1.4, -0.8], [1.4, -0.8], [0, -2.5]]) {
      const cable = MeshBuilder.CreateCylinder("", { diameter: 0.06, height: H, tessellation: 6 }, this._scene);
      cable.position.set(cx, H/2, cz); cable.material = cableMat; cable.isPickable = false;
    }
    // Warning stripes on elevator floor edge
    const warnMat = this._mat(0.88, 0.65, 0.06, 0.12, 0.08, 0.01);
    for (let i = 0; i < 6; i++) {
      const stripe = this._box(0.28, 0.01, 3.5, -1.47 + i * 0.58, 0.225, -1.5, i % 2 === 0 ? warnMat : this._mat(0.15,0.15,0.15));
      stripe.isPickable = false;
    }

    // ── JUMBO JOSH (crushed under elevator) ───────────────────────────────
    this._buildCrushedJosh(0, 0, -1.5);

    // ── ORANGE KEYCARD on the ground near Josh ─────────────────────────────
    const kcMat = this._mat(0.90, 0.48, 0.06, 0.28, 0.12, 0.01);
    const kc = this._box(0.7, 0.04, 0.44, 3.0, 0.04, -1.0, kcMat, true);
    kc.name = "orange_kc";
    // Stripe detail
    const stripe = this._box(0.7, 0.041, 0.10, 3.0, 0.041, -1.0, this._mat(0.98, 0.78, 0.1, 0.12, 0.09, 0.01));
    stripe.isPickable = false;
    // Keycard glow point
    const kcPl = new PointLight("kcpl", new Vector3(3, 0.5, -1), this._scene);
    kcPl.intensity = 0.4; kcPl.range = 3; kcPl.diffuse = new Color3(1, 0.55, 0.1);
    this._interactables.push({
      mesh: kc, id: "orange_kc",
      label: "[ E ] Pick up Orange Keycard",
      onInteract: () => {
        this._hasOrangeKey = true;
        kc.setEnabled(false);
        kcPl.setEnabled(false);
        this._hudItem.textContent = "🟠 Orange Keycard";
        this._hudItem.style.color = "#ff8800";
        this._score += 10;
        this._flashMsg("Picked up Orange Keycard! Use it on the orange door readers.");
        const ii = this._interactables.findIndex(i => i.id === "orange_kc");
        if (ii >= 0) this._interactables.splice(ii, 1);
      },
    });

    // ── BROKEN DRONE REMOTE on the floor near Josh ────────────────────────
    // Body
    const drBrMat = this._mat(0.25, 0.24, 0.28);
    const drBr = this._box(0.22, 0.08, 0.38, -3.2, 0.06, -0.5, drBrMat, true);
    drBr.name = "broken_drone_remote";
    drBr.rotation.z = 0.35; drBr.rotation.y = 0.6;
    // Cracked screen (dark)
    this._box(0.16, 0.06, 0.22, -3.2, 0.10, -0.5, this._mat(0.06, 0.04, 0.08)).isPickable = false;
    // Snapped antenna
    const ant = this._box(0.03, 0.18, 0.03, -3.1, 0.22, -0.55, this._mat(0.18, 0.17, 0.20));
    ant.rotation.z = 1.2; ant.isPickable = false;
    this._interactables.push({
      mesh: drBr, id: "broken_drone_remote",
      label: "[ E ] Pick up Drone Remote (broken)",
      onInteract: () => {
        this._hasBrokenDrone = true;
        drBr.setEnabled(false);
        this._hudDrone.style.display = "flex";
        this._hudDrone.innerHTML = this._droneHudHTML(false);
        this._flashMsg("Picked up the Drone Remote — but it's broken! Maybe you can find a new one.");
        this._score += 5;
        const ii = this._interactables.findIndex(i => i.id === "broken_drone_remote");
        if (ii >= 0) this._interactables.splice(ii, 1);
      },
    });

    // ── NOTE on the floor near keycard ────────────────────────────────────
    const noteMat = this._mat(0.92, 0.88, 0.75, 0.08, 0.07, 0.05);
    const note = this._box(0.32, 0.01, 0.42, 2.4, 0.02, -0.3, noteMat, true);
    note.name = "note";
    note.rotation.y = 0.25;
    this._interactables.push({
      mesh: note, id: "note",
      label: "[ E ] Read Note",
      onInteract: () => this._showNote(
        "FACILITY LOCKDOWN — SECTOR B\n\n" +
        "All personnel evacuated. If you are reading this,\n" +
        "use the Orange Keycard to access the Hub.\n\n" +
        "Do NOT approach the mascots.\n— Administration"
      ),
    });

    // ── First orange door frame + reader ──────────────────────────────────
    const frameMat = this._mat(0.88, 0.45, 0.04, 0.18, 0.08, 0.01);
    this._box(2.6, 2.7, 0.25, 0, 1.35, -D/2, frameMat, false, true);
    this._door1 = this._box(2.0, 2.4, 0.10, 0, 1.2, -D/2 + 0.13, this._mat(0.78, 0.38, 0.03), false, true);
    this._door1.name = "door1";
    // Reader
    const rd1 = this._box(0.10, 0.32, 0.18, 1.6, 1.2, -D/2 + 0.2, this._mat(0.08, 0.07, 0.10), true);
    rd1.name = "door1_reader";
    this._box(0.08, 0.09, 0.10, 1.6, 1.28, -D/2 + 0.25, this._mat(0.85, 0.42, 0.05, 0.28, 0.12, 0.01));
    this._interactables.push({
      mesh: rd1, id: "door1_reader",
      label: "[ E ] Use Orange Keycard",
      onInteract: () => this._useOrangeKey(1),
    });
  }

  private _buildCrushedJosh(x: number, _y: number, z: number): void {
    // Josh is pinned flat — body squashed under the elevator
    const greenMat  = this._mat(0.22, 0.68, 0.22, 0.02, 0.08, 0.02);
    const darkGreen = this._mat(0.12, 0.44, 0.12);
    const whiteMat  = this._mat(0.90, 0.90, 0.90);
    const blackMat  = this._mat(0.06, 0.06, 0.07);
    const bloodMat  = this._mat(0.55, 0.08, 0.08, 0.12, 0.01, 0.01);

    // Flattened body torso (wide, squashed height)
    const body = this._box(2.4, 0.28, 1.8, x, 0.14, z, greenMat);
    body.isPickable = false;
    // Head — sticking out from under elevator, tilted
    const head = MeshBuilder.CreateSphere("jj_head", { diameter: 0.95, segments: 8 }, this._scene);
    head.scaling.y = 0.7;
    head.position.set(x, 0.33, z + 1.3);
    head.material = greenMat; head.isPickable = false;
    // Eyes (closed / X eyes — knocked out)
    for (const [ex, rotZ] of [[-0.2, 0.5], [0.2, -0.5]] as [number,number][]) {
      const eye = this._box(0.22, 0.04, 0.08, x + ex, 0.55, z + 1.65, whiteMat);
      eye.isPickable = false;
      const pupil = this._box(0.08, 0.05, 0.06, x + ex, 0.56, z + 1.68, blackMat);
      pupil.rotation.z = rotZ; pupil.isPickable = false;
    }
    // Open mouth (groaning)
    this._box(0.35, 0.06, 0.25, x, 0.28, z + 1.7, blackMat).isPickable = false;
    // Teeth
    for (let ti = 0; ti < 4; ti++) {
      const t = this._box(0.06, 0.05, 0.08, x - 0.14 + ti * 0.10, 0.30, z + 1.71, whiteMat);
      t.isPickable = false;
    }
    // Arms spread out
    this._box(1.2, 0.18, 0.45, x - 1.7, 0.09, z + 0.3, greenMat).isPickable = false;
    this._box(1.2, 0.18, 0.45, x + 1.7, 0.09, z + 0.3, greenMat).isPickable = false;
    // Legs (visible below elevator)
    this._box(0.45, 0.18, 1.4, x - 0.5, 0.09, z - 2.0, greenMat).isPickable = false;
    this._box(0.45, 0.18, 1.4, x + 0.5, 0.09, z - 2.0, greenMat).isPickable = false;
    // Feet
    this._box(0.48, 0.20, 0.60, x - 0.5, 0.10, z - 2.75, darkGreen).isPickable = false;
    this._box(0.48, 0.20, 0.60, x + 0.5, 0.10, z - 2.75, darkGreen).isPickable = false;
    // Injury marks / blood splatters
    for (const [bx, bz, bw, bd] of [
      [x - 0.6, z - 1.2, 0.8, 0.3], [x + 0.8, z - 0.5, 0.5, 0.4],
      [x - 1.2, z + 0.2, 0.6, 0.25], [x + 0.3, z + 1.0, 0.4, 0.3],
    ] as [number,number,number,number][]) {
      const blood = MeshBuilder.CreateGround("", { width: bw, height: bd }, this._scene);
      blood.position.set(bx, 0.005, bz);
      blood.material = bloodMat; blood.isPickable = false;
    }
    // Damage marks on elevator above Josh
    const dmagMat = this._mat(0.15, 0.13, 0.16);
    for (const [dmx, dmz] of [[-0.4, 0.3], [0.5, -0.2], [-0.8, -0.8], [0.2, 0.9]]) {
      const dmg = this._box(0.3 + Math.random() * 0.3, 0.01, 0.2 + Math.random() * 0.2,
        x + dmx, 0.23, z + dmz, dmagMat);
      dmg.isPickable = false;
    }
    // "DANGER — HEAVY LOAD" label on elevator side
    const labelMat = this._mat(0.88, 0.65, 0.06, 0.12, 0.08, 0.01);
    this._box(0.01, 0.22, 1.4, x - 1.72, 0.8, z, labelMat).isPickable = false;
  }

  // ── Hallway ────────────────────────────────────────────────────────────────

  private _buildHallway(): void {
    const W = 4, D = 10, H = ROOM_H2;
    const oz = -6 - D / 2; // center = -11

    const floorMat = this._mat(0.18, 0.17, 0.20);
    const floor = MeshBuilder.CreateGround("hl_f", { width: W, height: D }, this._scene);
    floor.position.set(0, 0, oz); floor.material = floorMat;

    const ceilMat = this._mat(0.12, 0.11, 0.14);
    const ceil = MeshBuilder.CreateGround("hl_c", { width: W, height: D }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, oz); ceil.material = ceilMat;

    const wallMat = this._mat(0.18, 0.17, 0.21);
    this._box(0.2, H, D, -W/2, H/2, oz, wallMat, false, true);
    this._box(0.2, H, D,  W/2, H/2, oz, wallMat, false, true);
    // North wall — door gap
    const hallN = oz - D/2;
    const hw2 = (W - 2.4) / 2;
    this._box(hw2, H, 0.2, -(1.2 + hw2/2), H/2, hallN, wallMat, false, true);
    this._box(hw2, H, 0.2,  (1.2 + hw2/2), H/2, hallN, wallMat, false, true);
    this._box(2.4, H - 2.5, 0.2, 0, 2.5 + (H-2.5)/2, hallN, wallMat, false, true);

    // Single ceiling light with flicker effect
    const flkMat = this._mat(0.9, 0.88, 1, 0.6, 0.58, 0.7);
    const fl = MeshBuilder.CreateBox("", { width: 0.14, height: 0.04, depth: D * 0.8 }, this._scene);
    fl.position.set(0, H - 0.02, oz); fl.material = flkMat; fl.isPickable = false;
    const hallPl = new PointLight("hpl2", new Vector3(0, H - 0.3, oz), this._scene);
    hallPl.intensity = 0.5; hallPl.range = 14; hallPl.diffuse = new Color3(0.75, 0.70, 0.90);

    // Flickering light animation
    let flickT = 0;
    this._scene.registerBeforeRender(() => {
      flickT += 0.016;
      if (Math.sin(flickT * 12) > 0.85 && Math.random() > 0.3) {
        hallPl.intensity = 0.1 + Math.random() * 0.2;
      } else {
        hallPl.intensity = 0.45 + Math.sin(flickT * 0.7) * 0.05;
      }
    });

    // Warning sign on hallway wall
    const signMat = this._mat(0.85, 0.62, 0.05, 0.18, 0.10, 0.01);
    this._box(0.06, 0.5, 0.8, W/2 - 0.08, 1.8, oz, signMat);

    // Second orange door frame + reader at hall end
    const frameMat = this._mat(0.88, 0.45, 0.04, 0.18, 0.08, 0.01);
    this._box(2.6, 2.7, 0.25, 0, 1.35, hallN, frameMat, false, true);
    this._door2 = this._box(2.0, 2.4, 0.10, 0, 1.2, hallN + 0.13, this._mat(0.78, 0.38, 0.03), false, true);
    this._door2.name = "door2";
    const rd2 = this._box(0.10, 0.32, 0.18, 1.6, 1.2, hallN + 0.2, this._mat(0.08, 0.07, 0.10), true);
    rd2.name = "door2_reader";
    this._box(0.08, 0.09, 0.10, 1.6, 1.28, hallN + 0.25, this._mat(0.85, 0.42, 0.05, 0.28, 0.12, 0.01));
    this._interactables.push({
      mesh: rd2, id: "door2_reader",
      label: "[ E ] Use Orange Keycard",
      onInteract: () => this._useOrangeKey(2),
    });
  }

  // ── Hub (placeholder) ──────────────────────────────────────────────────────

  private _buildHub(): void {
    const W = 18, D = 16, H = ROOM_H2;
    const cz = -6 - 10 - D / 2; // center = -24

    const floorMat = this._mat(0.22, 0.20, 0.26);
    const floor = MeshBuilder.CreateGround("hub_f", { width: W, height: D }, this._scene);
    floor.position.set(0, 0, cz); floor.material = floorMat;

    const ceilMat = this._mat(0.10, 0.09, 0.12);
    const ceil = MeshBuilder.CreateGround("hub_c", { width: W, height: D }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, cz); ceil.material = ceilMat;

    const wallMat = this._mat(0.16, 0.15, 0.19);
    this._box(W, H, 0.2,  0, H/2, cz + D/2, wallMat, false, true); // south
    this._box(0.2, H, D, -W/2, H/2, cz, wallMat, false, true);
    this._box(0.2, H, D,  W/2, H/2, cz, wallMat, false, true);
    // North wall — split for Comms Sector door
    const hubN = cz - D/2;
    const pinkFrameMat = this._mat(0.88, 0.30, 0.55, 0.18, 0.06, 0.10);
    const hubNSide = (W - 2.6) / 2;
    this._box(hubNSide, H, 0.2, -(1.3 + hubNSide/2), H/2, hubN, wallMat, false, true);
    this._box(hubNSide, H, 0.2,  (1.3 + hubNSide/2), H/2, hubN, wallMat, false, true);
    this._box(2.6, H - 2.5, 0.2, 0, 2.5 + (H-2.5)/2, hubN, wallMat, false, true);
    this._box(3.0, 2.8, 0.22, 0, 1.4, hubN, pinkFrameMat, false, true);
    this._commsDoor = this._box(2.4, 2.5, 0.12, 0, 1.25, hubN + 0.12, this._mat(0.72, 0.22, 0.45), false, true);
    this._commsDoor.name = "comms_door";
    const cdRd = this._box(0.10, 0.32, 0.18, 1.6, 1.2, hubN + 0.22, this._mat(0.08, 0.07, 0.10), true);
    cdRd.name = "comms_door_reader";
    this._box(0.08, 0.09, 0.10, 1.6, 1.28, hubN + 0.27, this._mat(0.85, 0.32, 0.55, 0.28, 0.10, 0.18));
    this._interactables.push({
      mesh: cdRd, id: "comms_door_reader",
      label: "[ E ] Use Pink Keycard",
      onInteract: () => this._usePinkKey(),
    });

    // Central hub lights
    for (const [lx, lz] of [[-5, cz-3], [5, cz+3], [0, cz]]) {
      const pl = new PointLight("hbpl", new Vector3(lx, H-0.3, lz), this._scene);
      pl.intensity = 0.55; pl.range = 12; pl.diffuse = new Color3(0.7, 0.65, 0.85);
    }

    // Floor markings — circle in center
    const circMat = this._mat(0.30, 0.28, 0.35);
    const circ = MeshBuilder.CreateGround("hub_circ", { width: 8, height: 8 }, this._scene);
    circ.position.set(0, 0.002, cz); circ.material = circMat; circ.isPickable = false;

    // "HUB" label panel on south wall
    const labelMat = this._mat(0.15, 0.55, 0.72, 0.04, 0.15, 0.22);
    this._box(0.06, 0.6, 2.5, 0, 2.0, cz + D/2 - 0.1, labelMat);

    // Corridor archway doors (future sectors — all locked for now)
    const doorColors: [number,number,number][] = [
      [0.20, 0.55, 0.85], // blue — Comms Sector
      [0.22, 0.68, 0.22], // green — TBD
    ];
    const doorPositions: [number, number, number, number][] = [
      [-W/2 + 0.1, H/2, cz, 0], // west wall
      [ W/2 - 0.1, H/2, cz, 0], // east wall
    ];
    for (let i = 0; i < doorColors.length; i++) {
      const [cr, cg, cb] = doorColors[i];
      const [dx, dy, dz] = doorPositions[i];
      const frMat = this._mat(cr * 0.85, cg * 0.85, cb * 0.85);
      this._box(0.22, 2.7, 2.6, dx, dy, dz, frMat, false, true);
      // "LOCKED" sign
      const lockedMat = this._mat(0.7, 0.06, 0.06, 0.2, 0.01, 0.01);
      this._box(0.05, 0.28, 0.9, dx, 1.8, dz, lockedMat);
    }

    // Large Banban/mascot logo on the floor
    const logoBg = this._mat(0.25, 0.23, 0.28);
    this._box(6, 0.01, 6, 0, 0.005, cz, logoBg).isPickable = false;
    // Colored mascot shape silhouettes on logo
    const logoColors: [number,number,number,number,number][] = [
      [0, 0, 0.88, 0.14, 0.14],  // red (Banban)
      [0, -1.5, 0.22, 0.68, 0.22], // green (Josh)
      [-1.5, 0, 0.88, 0.50, 0.70], // pink (Opila)
      [1.5, 0, 0.22, 0.50, 0.85],  // blue
    ];
    for (const [lx, lz2, lr, lg, lb] of logoColors) {
      const sil = MeshBuilder.CreateCylinder("", { diameter: 0.6, height: 0.02, tessellation: 8 }, this._scene);
      sil.position.set(lx, 0.008, cz + lz2);
      sil.material = this._mat(lr, lg, lb, lr*0.06, lg*0.06, lb*0.06);
      sil.isPickable = false;
    }

    // Intercom / terminal on east wall — end of chapter tease
    const termMat = this._mat(0.10, 0.09, 0.14);
    const term = this._box(0.12, 0.8, 0.6, W/2 - 0.2, 1.4, cz + 4, termMat, true);
    term.name = "terminal";
    const screenMat = this._mat(0.08, 0.45, 0.65, 0.02, 0.18, 0.28);
    this._box(0.10, 0.45, 0.35, W/2 - 0.15, 1.5, cz + 4, screenMat);
    this._interactables.push({
      mesh: term, id: "terminal",
      label: "[ E ] Access Terminal",
      onInteract: () => this._showNote(
        "BANBAN KINDERGARTEN — HUB TERMINAL\n\n" +
        "COMMS SECTOR: LOCKED (Pink Keycard required)\n" +
        "GREEN SECTOR: LOCKED\n\n" +
        "Remaining Personnel: 0\n" +
        "Mascot Status: ACTIVE\n\n" +
        "Good luck. You will need it."
      ),
    });

    // ── NEW DRONE REMOTE on a shelf ───────────────────────────────────────
    const shelfMat = this._mat(0.22, 0.20, 0.25);
    this._box(2.0, 0.85, 0.8,  5, 0.425, cz + 4, shelfMat, false, true); // shelf unit
    this._box(2.0, 0.05, 0.8,  5, 0.875, cz + 4, this._mat(0.28, 0.26, 0.30));
    // New drone remote (shiny, intact)
    const drNewMat = this._mat(0.12, 0.11, 0.15, 0.04, 0.04, 0.06);
    const drNew = this._box(0.22, 0.08, 0.38, 5, 0.92, cz + 3.8, drNewMat, true);
    drNew.name = "new_drone_remote";
    // Screen glow
    this._box(0.14, 0.06, 0.20, 5, 0.96, cz + 3.8, this._mat(0.1, 0.6, 0.9, 0.04, 0.22, 0.35)).isPickable = false;
    // Antenna (intact)
    this._box(0.03, 0.22, 0.03, 5.07, 1.08, cz + 3.75, this._mat(0.14, 0.13, 0.16)).isPickable = false;
    // Glow light
    const drPl = new PointLight("drpl", new Vector3(5, 1.2, cz + 3.8), this._scene);
    drPl.intensity = 0.3; drPl.range = 2.5; drPl.diffuse = new Color3(0.3, 0.7, 1);
    this._interactables.push({
      mesh: drNew, id: "new_drone_remote",
      label: "[ E ] Pick up New Drone Remote",
      onInteract: () => {
        this._hasWorkingDrone = true;
        drNew.setEnabled(false);
        drPl.setEnabled(false);
        this._hudDrone.style.display = "flex";
        this._hudDrone.innerHTML = this._droneHudHTML(true);
        this._flashMsg("New Drone Remote! Your drone is back — Left-click to send it!");
        this._score += 15;
        const ii = this._interactables.findIndex(i => i.id === "new_drone_remote");
        if (ii >= 0) this._interactables.splice(ii, 1);
      },
    });

    // Build drone mesh (floats near player)
    const drBodyMat = this._mat(0.82, 0.82, 0.86, 0.08, 0.08, 0.10);
    this._droneMesh = MeshBuilder.CreateSphere("drone2", { diameter: 0.18, segments: 7 }, this._scene) as Mesh;
    this._droneMesh.scaling.y = 0.55;
    this._droneMesh.material = drBodyMat;
    this._droneMesh.isPickable = false;
    this._droneMesh.position.set(0, EYE_Y2 - 0.3, -6); // starts at start room
    this._droneMesh.setEnabled(false); // hidden until working remote picked up
    // Arms + rotors
    const armMat   = this._mat(0.55, 0.55, 0.58);
    const rotorMat = this._mat(0.20, 0.20, 0.22, 0.05, 0.05, 0.06);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const ax = Math.cos(angle) * 0.16, az = Math.sin(angle) * 0.16;
      const arm = MeshBuilder.CreateBox("", { width: 0.04, height: 0.02, depth: 0.22 }, this._scene);
      arm.rotation.y = -angle; arm.material = armMat; arm.isPickable = false;
      arm.parent = this._droneMesh; arm.position.set(ax, 0, az);
      const rotor = MeshBuilder.CreateCylinder("", { diameter: 0.14, height: 0.015, tessellation: 8 }, this._scene);
      rotor.material = rotorMat; rotor.isPickable = false;
      rotor.parent = this._droneMesh; rotor.position.set(ax * 1.9, 0.02, az * 1.9);
    }

    // ── End-of-area sign & chapter complete trigger ────────────────────────
    // Pink keycard on a desk (preview of what's next)
    const deskMat = this._mat(0.22, 0.20, 0.25);
    this._box(2.0, 0.85, 0.8, -5, 0.425, cz - 4, deskMat, false, true);
    this._box(2.0, 0.05, 0.8, -5, 0.875, cz - 4, this._mat(0.28, 0.26, 0.30));
    // Pink keycard on desk
    const pkMat = this._mat(0.95, 0.42, 0.72, 0.28, 0.10, 0.18);
    const pkc = this._box(0.7, 0.04, 0.44, -5, 0.90, cz - 4.1, pkMat, true);
    pkc.name = "pink_kc";
    this._interactables.push({
      mesh: pkc, id: "pink_kc",
      label: "[ E ] Pick up Pink Keycard",
      onInteract: () => {
        pkc.setEnabled(false);
        this._hasPinkKey = true;
        this._hudItem.textContent = "🩷 Pink Keycard";
        this._hudItem.style.color = "#ff66bb";
        this._score += 20;
        this._flashMsg("Pink Keycard! Use it on the Communications Sector door — north wall of the Hub.");
        const ii = this._interactables.findIndex(i => i.id === "pink_kc");
        if (ii >= 0) this._interactables.splice(ii, 1);
      },
    });
  }

  // ── Communications Sector ──────────────────────────────────────────────────

  private _buildCommsSector(): void {
    const W = 16, D = 18, H = ROOM_H2;
    const startZ = -32;
    const cz = startZ - D / 2; // = -41

    const floorMat = this._mat(0.20, 0.18, 0.24);
    const floor = MeshBuilder.CreateGround("cs_f", { width: W, height: D }, this._scene);
    floor.position.set(0, 0, cz); floor.material = floorMat;

    const ceilMat = this._mat(0.10, 0.09, 0.13);
    const ceil = MeshBuilder.CreateGround("cs_c", { width: W, height: D }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, cz); ceil.material = ceilMat;

    const wallMat = this._mat(0.16, 0.14, 0.20);
    this._box(0.2, H, D, -W/2, H/2, cz, wallMat, false, true);
    this._box(0.2, H, D,  W/2, H/2, cz, wallMat, false, true);
    this._box(W, H, 0.2, 0, H/2, cz - D/2, wallMat, false, true); // north

    // Overhead light strips
    for (const [lx, lz2] of [[-5, cz+4], [0, cz+1], [5, cz+4], [-5, cz-4], [0, cz-3], [5, cz-4]]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.12, height: 0.03, depth: 2.0 }, this._scene);
      sl.position.set(lx, H-0.02, lz2); sl.material = this._mat(0.9,0.87,1.0,0.55,0.50,0.65); sl.isPickable = false;
      const pl = new PointLight("cspl", new Vector3(lx, H-0.3, lz2), this._scene);
      pl.intensity = 0.5; pl.range = 8; pl.diffuse = new Color3(0.75, 0.70, 0.90);
    }

    // ── Mascot mural on north wall ─────────────────────────────────────────
    this._box(13.0, 2.5, 0.07, 0, 1.5, cz-D/2+0.1, this._mat(0.14, 0.12, 0.18)).isPickable = false;
    const muralFigs: [number,number,number,number,number][] = [
      [-5,  1.0, 0.88, 0.14, 0.14], // Banban red
      [-3,  1.0, 0.88, 0.50, 0.70], // Opila pink
      [-1,  1.0, 0.22, 0.68, 0.22], // Josh green
      [ 1,  1.0, 0.22, 0.50, 0.85], // Capt. Fiddles blue
      [ 3,  1.0, 0.20, 0.80, 0.90], // Nabnab cyan
      [ 5,  1.0, 0.95, 0.42, 0.72], // Banbaleena pink
    ];
    for (const [mx, my, mr, mg, mb] of muralFigs) {
      const sil = MeshBuilder.CreateBox("", { width: 0.55, height: 1.3, depth: 0.06 }, this._scene);
      sil.position.set(mx, my, cz-D/2+0.16);
      sil.material = this._mat(mr, mg, mb, mr*0.06, mg*0.06, mb*0.06);
      sil.isPickable = false;
    }

    // ── 8 Desks: 4 red (left) + 4 blue (right) ───────────────────────────
    const deskZs = [-34.5, -37.5, -40.5, -43.5];
    const deskXRed = -5.0, deskXBlue = 5.0;
    const redShades:  [number,number,number][] = [[0.88,0.42,0.42],[0.72,0.20,0.20],[0.52,0.08,0.08],[0.30,0.03,0.03]];
    const blueShades: [number,number,number][] = [[0.42,0.62,0.96],[0.22,0.42,0.82],[0.10,0.24,0.65],[0.04,0.10,0.42]];
    const deskBase = this._mat(0.18, 0.16, 0.20);
    const deskTop  = this._mat(0.22, 0.20, 0.25);
    const chairMat = this._mat(0.20, 0.18, 0.22);

    for (let i = 0; i < 4; i++) {
      const dz = deskZs[i];
      const [rr, rg, rb] = redShades[i];
      const [br, bg, bb] = blueShades[i];

      // Red desk (left)
      this._box(2.0, 0.85, 0.8, deskXRed, 0.425, dz, deskBase, false, true);
      this._box(2.0, 0.05, 0.8, deskXRed, 0.875, dz, deskTop);
      this._box(2.0, 0.07, 0.04, deskXRed, 0.80, dz+0.39, this._mat(rr, rg, rb, rr*0.08, rg*0.08, rb*0.08));
      this._box(0.08, 0.52, 0.48, deskXRed-0.3, 1.18, dz, this._mat(0.10,0.09,0.12)).isPickable = false;
      this._box(0.06, 0.38, 0.34, deskXRed-0.28, 1.18, dz, this._mat(rr*0.14, rg*0.04, rb*0.04, rr*0.08, rg*0.02, rb*0.02)).isPickable = false;
      this._box(0.72, 0.06, 0.72, deskXRed+0.8, 0.46, dz, chairMat).isPickable = false;
      this._box(0.72, 0.60, 0.06, deskXRed+0.8, 0.76, dz-0.33, chairMat).isPickable = false;
      const rdIdx = i;
      const rdRd = this._box(0.14, 0.24, 0.14, deskXRed-0.6, 0.98, dz, this._mat(0.08,0.07,0.10), true);
      rdRd.name = `desk_red_${i}`;
      this._box(0.12, 0.12, 0.10, deskXRed-0.6, 0.98, dz, this._mat(rr*0.32, rg*0.08, rb*0.08, rr*0.12, rg*0.02, rb*0.02)).isPickable = false;
      this._interactables.push({
        mesh: rdRd, id: `desk_red_${rdIdx}`,
        label: `[ E ] Activate Red Terminal ${i+1}`,
        onInteract: () => this._pressDesk(rdIdx),
      });

      // Blue desk (right)
      this._box(2.0, 0.85, 0.8, deskXBlue, 0.425, dz, deskBase, false, true);
      this._box(2.0, 0.05, 0.8, deskXBlue, 0.875, dz, deskTop);
      this._box(2.0, 0.07, 0.04, deskXBlue, 0.80, dz+0.39, this._mat(br, bg, bb, br*0.08, bg*0.08, bb*0.08));
      this._box(0.08, 0.52, 0.48, deskXBlue+0.3, 1.18, dz, this._mat(0.10,0.09,0.12)).isPickable = false;
      this._box(0.06, 0.38, 0.34, deskXBlue+0.28, 1.18, dz, this._mat(br*0.04, bg*0.08, bb*0.14, br*0.02, bg*0.04, bb*0.08)).isPickable = false;
      this._box(0.72, 0.06, 0.72, deskXBlue-0.8, 0.46, dz, chairMat).isPickable = false;
      this._box(0.72, 0.60, 0.06, deskXBlue-0.8, 0.76, dz-0.33, chairMat).isPickable = false;
      const blIdx = 4 + i;
      const blRd = this._box(0.14, 0.24, 0.14, deskXBlue+0.6, 0.98, dz, this._mat(0.08,0.07,0.10), true);
      blRd.name = `desk_blue_${i}`;
      this._box(0.12, 0.12, 0.10, deskXBlue+0.6, 0.98, dz, this._mat(br*0.08, bg*0.16, bb*0.32, br*0.02, bg*0.06, bb*0.12)).isPickable = false;
      this._interactables.push({
        mesh: blRd, id: `desk_blue_${blIdx}`,
        label: `[ E ] Activate Blue Terminal ${i+1}`,
        onInteract: () => this._pressDesk(blIdx),
      });
    }

    // ── Puzzle hint sign ──────────────────────────────────────────────────
    const hintSign = this._box(0.06, 0.7, 0.9, -W/2+0.1, 1.8, startZ-2, this._mat(0.88,0.85,0.60,0.10,0.08,0.05), true);
    hintSign.name = "comms_hint";
    this._interactables.push({
      mesh: hintSign, id: "comms_hint",
      label: "[ E ] Read Instructions",
      onInteract: () => this._showNote(
        "COMMUNICATIONS SECTOR — KEYCARD SEQUENCE\n\n" +
        "To unlock the vault, activate the desk terminals\n" +
        "in order of their display colour:\n\n" +
        "  LIGHTEST RED  →  DARKEST RED\n" +
        "  LIGHTEST BLUE →  DARKEST BLUE\n\n" +
        "Left side = Red terminals  (1 → 4)\n" +
        "Right side = Blue terminals (1 → 4)\n\n" +
        "Activate all 8 in the correct order to receive\n" +
        "the LIME KEYCARD."
      ),
    });

    // ── Lime Keycard (hidden until puzzle solved) ──────────────────────────
    const lkMat = this._mat(0.40, 0.95, 0.25, 0.12, 0.28, 0.06);
    this._limeKeyMesh = this._box(0.7, 0.04, 0.44, 0, 1.5, cz-D/2+1.6, lkMat, true);
    this._limeKeyMesh.name = "lime_kc";
    this._limeKeyMesh.setEnabled(false);
    const lkPl = new PointLight("lkpl", new Vector3(0, 1.8, cz-D/2+1.6), this._scene);
    lkPl.intensity = 0.4; lkPl.range = 3; lkPl.diffuse = new Color3(0.5, 1, 0.25);
    lkPl.setEnabled(false);
    (this._limeKeyMesh as any)._lkLight = lkPl;
    this._interactables.push({
      mesh: this._limeKeyMesh, id: "lime_kc",
      label: "[ E ] Pick up Lime Keycard",
      onInteract: () => {
        this._hasLimeKey = true;
        this._limeKeyMesh.setEnabled(false);
        lkPl.setEnabled(false);
        this._hudItem.textContent = "🟢 Lime Keycard";
        this._hudItem.style.color = "#66ff44";
        this._score += 30;
        this._flashMsg("Lime Keycard! Head to the Maintenance Room — north side of the Comms Sector!");
        const ii = this._interactables.findIndex(it => it.id === "lime_kc");
        if (ii >= 0) this._interactables.splice(ii, 1);
      },
    });

    // ── Banbaleena stands by the mural ────────────────────────────────────
    this._buildBanbaleena(0, 0, cz-D/2+2.6);
  }

  private _buildBanbaleena(x: number, _y: number, z: number): void {
    const whiteMat  = this._mat(0.90, 0.88, 0.93);
    const pinkMat   = this._mat(0.95, 0.42, 0.72, 0.18, 0.06, 0.12);
    const darkPink  = this._mat(0.70, 0.18, 0.44);
    const blackMat  = this._mat(0.06, 0.05, 0.08);
    const eyeMat    = this._mat(0.98, 0.50, 0.82, 0.25, 0.08, 0.16);

    // Body
    this._box(1.05, 1.4, 0.65, x, 0.70, z, whiteMat).isPickable = false;
    // Skirt strip
    this._box(1.10, 0.22, 0.67, x, 0.11, z, pinkMat).isPickable = false;
    // Arms
    this._box(0.28, 0.85, 0.28, x-0.66, 0.70, z, whiteMat).isPickable = false;
    this._box(0.28, 0.85, 0.28, x+0.66, 0.70, z, whiteMat).isPickable = false;
    // Legs
    this._box(0.30, 0.52, 0.30, x-0.25, 0.00, z, whiteMat).isPickable = false;
    this._box(0.30, 0.52, 0.30, x+0.25, 0.00, z, whiteMat).isPickable = false;
    // Head
    const head = MeshBuilder.CreateSphere("bnb_head", { diameter: 0.88, segments: 8 }, this._scene);
    head.position.set(x, 1.75, z); head.material = whiteMat; head.isPickable = false;
    // Cat ears
    for (const ex of [-0.24, 0.24]) {
      const ear = MeshBuilder.CreateCylinder("", { diameterTop: 0, diameterBottom: 0.22, height: 0.38, tessellation: 6 }, this._scene);
      ear.position.set(x+ex, 2.16, z); ear.material = pinkMat; ear.isPickable = false;
      const earInner = MeshBuilder.CreateCylinder("", { diameterTop: 0, diameterBottom: 0.12, height: 0.22, tessellation: 6 }, this._scene);
      earInner.position.set(x+ex, 2.19, z); earInner.material = darkPink; earInner.isPickable = false;
    }
    // Eyes
    for (const ex of [-0.17, 0.17]) {
      const eye = MeshBuilder.CreateSphere("", { diameter: 0.18, segments: 6 }, this._scene);
      eye.position.set(x+ex, 1.80, z+0.38); eye.material = eyeMat; eye.isPickable = false;
      const pupil = MeshBuilder.CreateSphere("", { diameter: 0.09, segments: 6 }, this._scene);
      pupil.position.set(x+ex, 1.79, z+0.43); pupil.material = blackMat; pupil.isPickable = false;
    }
    // Bow (between ears)
    this._box(0.20, 0.13, 0.08, x-0.14, 2.15, z+0.12, pinkMat).isPickable = false;
    this._box(0.20, 0.13, 0.08, x+0.14, 2.15, z+0.12, pinkMat).isPickable = false;
    this._box(0.08, 0.08, 0.08, x,      2.15, z+0.12, darkPink).isPickable = false;
    // Smile dots
    for (let sm = 0; sm < 5; sm++) {
      const a = (sm/4)*Math.PI - Math.PI/2;
      this._box(0.04, 0.04, 0.04, x+Math.cos(a)*0.10, 1.60+Math.sin(a)*0.06, z+0.44, pinkMat).isPickable = false;
    }
  }

  private _pressDesk(idx: number): void {
    if (this._commsPuzzleSolved) return;
    if (this._deskPressed[idx]) { this._flashMsg("Already activated! Wrong order resets the sequence."); return; }
    const expected = this._deskPressOrder.length; // correct sequence is 0,1,2,3,4,5,6,7
    if (idx !== expected) {
      this._deskPressed = Array(8).fill(false) as boolean[];
      this._deskPressOrder = [];
      this._flashMsg("Wrong order! Start again — Lightest Red → Darkest Red → Lightest Blue → Darkest Blue.");
      this._flashScreen("rgba(255,60,60,0.22)", 0.4);
      return;
    }
    this._deskPressed[idx] = true;
    this._deskPressOrder.push(idx);
    this._flashScreen("rgba(80,255,80,0.10)", 0.3);
    const side = idx < 4 ? "Red" : "Blue";
    const num  = (idx % 4) + 1;
    this._flashMsg(`${side} Terminal ${num} activated! (${this._deskPressOrder.length}/8)`);
    if (this._deskPressOrder.length === 8) {
      this._commsPuzzleSolved = true;
      this._score += 50;
      this._flashScreen("rgba(80,255,60,0.35)", 0.9);
      setTimeout(() => {
        this._limeKeyMesh.setEnabled(true);
        (this._limeKeyMesh as any)._lkLight?.setEnabled(true);
        this._flashMsg("🟢 Puzzle solved! Lime Keycard appeared at the north wall!");
      }, 600);
    }
  }

  private _usePinkKey(): void {
    if (!this._hasPinkKey) { this._flashMsg("You need the Pink Keycard! Check the desk in the Hub."); return; }
    if (this._commsDoorOpen) return;
    this._commsDoorOpen = true;
    this._commsDoor.setEnabled(false);
    this._commsDoor.checkCollisions = false;
    this._score += 20;
    this._flashScreen("rgba(255,80,180,0.20)", 0.5);
    this._flashMsg("Communications Sector unlocked! Banbaleena is inside…");
    const ii = this._interactables.findIndex(i => i.id === "comms_door_reader");
    if (ii >= 0) this._interactables.splice(ii, 1);
  }

  // ── Maintenance Room ───────────────────────────────────────────────────────

  private _buildMaintenanceRoom(): void {
    const W = 14, D = 44, H = ROOM_H2;
    const startZ = -50;
    const endZ   = startZ - D;   // = -94
    const cz     = startZ - D / 2; // = -72

    // Bright materials — emissive so they're visible even without perfect lighting
    const floorMat = this._mat(0.50, 0.47, 0.58, 0.18, 0.16, 0.22);
    floorMat.maxSimultaneousLights = 16;
    const floor = MeshBuilder.CreateGround("mr_f", { width: W, height: D }, this._scene);
    floor.position.set(0, 0, cz); floor.material = floorMat;
    const ceilMat = this._mat(0.40, 0.38, 0.48, 0.12, 0.11, 0.15);
    ceilMat.maxSimultaneousLights = 16;
    const ceil = MeshBuilder.CreateGround("mr_c", { width: W, height: D }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, cz); ceil.material = ceilMat;

    const wallMat = this._mat(0.48, 0.45, 0.55, 0.16, 0.14, 0.20);
    wallMat.maxSimultaneousLights = 16;
    this._box(0.2, H, D, -W/2, H/2, cz, wallMat, false, true); // west
    this._box(0.2, H, D,  W/2, H/2, cz, wallMat, false, true); // east
    this._box(W, H, 0.2, 0, H/2, endZ, wallMat, false, true);  // north far end

    // South wall — lime door
    const mrSide = (W - 2.6) / 2;
    this._box(mrSide, H, 0.2, -(1.3+mrSide/2), H/2, startZ, wallMat, false, true);
    this._box(mrSide, H, 0.2,  (1.3+mrSide/2), H/2, startZ, wallMat, false, true);
    this._box(2.6, H-2.5, 0.2, 0, 2.5+(H-2.5)/2, startZ, wallMat, false, true);
    this._box(3.0, 2.8, 0.22, 0, 1.4, startZ, this._mat(0.30,0.72,0.15,0.06,0.16,0.03), false, true);
    this._lbDoor = this._box(2.4, 2.5, 0.12, 0, 1.25, startZ+0.12, this._mat(0.20,0.55,0.10), false, true);
    this._lbDoor.name = "lb_door";
    const lbRd = this._box(0.10, 0.32, 0.18, 1.6, 1.2, startZ+0.22, this._mat(0.08,0.07,0.10), true);
    lbRd.name = "lb_door_reader";
    this._box(0.08, 0.09, 0.10, 1.6, 1.28, startZ+0.27, this._mat(0.30,0.75,0.12,0.08,0.20,0.03));
    this._interactables.push({ mesh: lbRd, id: "lb_door_reader", label: "[ E ] Use Lime Keycard", onInteract: () => this._useLimeKey() });

    // ── Lighting ──────────────────────────────────────────────────────────────
    // One strong overhead light every 10 units + wall strips every 5 units so
    // the whole 44-unit corridor is fully lit. maxSimultaneousLights bumped to 16
    // on every material so the per-mesh 4-light cap doesn't kill the illumination.
    const stripMat2 = this._mat(1.0, 0.98, 1.0, 0.90, 0.88, 1.0);
    for (let lz2 = startZ - 5; lz2 > endZ + 1; lz2 -= 10) {
      // Bright ceiling tube
      const sl = MeshBuilder.CreateBox("", { width: 0.18, height: 0.04, depth: 3.0 }, this._scene);
      sl.position.set(0, H - 0.02, lz2); sl.material = stripMat2; sl.isPickable = false;
      const pl = new PointLight("mrpl", new Vector3(0, H - 0.2, lz2), this._scene);
      pl.intensity = 3.5; pl.range = 22; pl.diffuse = new Color3(0.92, 0.90, 1.0);
    }
    // Mid-height wall strips on both outer walls every 5 units — these can't be
    // blocked by shelves and guarantee the passage area is always lit
    const wallStripMat = this._mat(1.0, 0.95, 0.85, 0.80, 0.72, 0.55);
    for (let lz2 = startZ - 2.5; lz2 > endZ + 1; lz2 -= 5) {
      for (const wx of [-W/2 + 0.08, W/2 - 0.08]) {
        const wl = MeshBuilder.CreateBox("", { width: 0.05, height: 0.12, depth: 1.0 }, this._scene);
        wl.position.set(wx, 1.6, lz2); wl.material = wallStripMat; wl.isPickable = false;
        const wpl = new PointLight("mrwpl", new Vector3(wx < 0 ? wx + 0.6 : wx - 0.6, 1.6, lz2), this._scene);
        wpl.intensity = 1.8; wpl.range = 12; wpl.diffuse = new Color3(1.0, 0.88, 0.65);
      }
    }

    // ── MAZE SHELVES: 8 alternating rows, each 9 units wide leaving 5-unit passage ─
    // Row N = left shelf → passage on RIGHT (x > -2)
    // Row N = right shelf → passage on LEFT (x < +2)
    const shelfMat  = this._mat(0.55, 0.50, 0.62, 0.14, 0.12, 0.17);
    shelfMat.maxSimultaneousLights = 16;
    const shelfItem = this._mat(0.65, 0.58, 0.72, 0.10, 0.08, 0.12);
    shelfItem.maxSimultaneousLights = 16;
    const SW = 9.0; // shelf width
    // [z, leftSide]  — leftSide=true → shelf on left, passage on right
    const shelfRows: [number, boolean][] = [
      [startZ - 4,  true ],  // 1 → RIGHT passage
      [startZ - 9,  false],  // 2 → LEFT  passage
      [startZ - 14, true ],  // 3 → RIGHT passage
      [startZ - 19, false],  // 4 → LEFT  passage
      [startZ - 24, true ],  // 5 → RIGHT passage
      [startZ - 29, false],  // 6 → LEFT  passage
      [startZ - 34, true ],  // 7 → RIGHT passage
      [startZ - 39, false],  // 8 → LEFT  passage
    ];
    for (const [sz, leftSide] of shelfRows) {
      const sx = leftSide ? -(W/2 - SW/2) : (W/2 - SW/2);
      // Shelf body (solid wall that goes nearly to ceiling so it can't be jumped over)
      this._box(SW, H-0.1, 0.38, sx, (H-0.1)/2, sz, shelfMat, false, true);
      // Shelf face items
      const startX = leftSide ? -W/2+0.4 : 1.4;
      for (let si = 0; si < 6; si++) {
        this._box(0.26, 0.30, 0.22, startX + si*1.4, 1.9, sz, shelfItem).isPickable = false;
        this._box(0.20, 0.22, 0.18, startX + si*1.4 + 0.1, 1.1, sz, shelfItem).isPickable = false;
      }
    }

    // ── ARROWS — placed BETWEEN shelf rows ───────────────────────────────────
    // Blue arrows: on the CORRECT passage side → point north (further into maze toward keycard)
    // Pink arrows: on the WRONG side → point INTO what appears to be a passage but is a dead end
    // The "dead end" is the closed side where the NEXT shelf will block you
    const blueArMat = this._mat(0.12, 0.38, 0.95, 0.04, 0.14, 0.40);
    const pinkArMat = this._mat(0.95, 0.18, 0.52, 0.35, 0.04, 0.16);

    const placeArrow = (ax: number, az: number, isBlue: boolean, pointNorth: boolean) => {
      const mat = isBlue ? blueArMat : pinkArMat;
      const clr = isBlue ? new Color3(0.2, 0.5, 1.0) : new Color3(1.0, 0.2, 0.6);
      // Shaft
      const shaft = MeshBuilder.CreateGround("", { width: 0.6, height: 1.8 }, this._scene);
      shaft.position.set(ax, 0.006, az); shaft.material = mat; shaft.isPickable = false;
      // Head (triangle-ish, pointed north or south)
      const head = MeshBuilder.CreateGround("", { width: 1.0, height: 1.0 }, this._scene);
      head.position.set(ax, 0.007, pointNorth ? az - 0.9 : az + 0.9);
      head.rotation.y = Math.PI/4; head.material = mat; head.isPickable = false;
      const apl = new PointLight("arpl", new Vector3(ax, 0.4, az), this._scene);
      apl.intensity = 0.28; apl.range = 4; apl.diffuse = clr;
    };

    // Between rows 1→2 (z = startZ-4 to startZ-9), midpoint z ≈ startZ-6.5
    // Row1=left shelf, passage RIGHT → blue RIGHT, pink LEFT
    placeArrow( 3.5, startZ-6.5, true,  true);   // blue, right side, correct → deeper
    placeArrow(-3.5, startZ-6.5, false, true);    // pink, left side, dead end (row2 right shelf will block)

    // Between rows 2→3 (startZ-9 to -14), mid startZ-11.5
    // Row2=right shelf, passage LEFT → blue LEFT, pink RIGHT
    placeArrow(-3.5, startZ-11.5, true,  true);
    placeArrow( 3.5, startZ-11.5, false, true);

    // Between rows 3→4 (startZ-14 to -19), mid startZ-16.5
    placeArrow( 3.5, startZ-16.5, true,  true);
    placeArrow(-3.5, startZ-16.5, false, true);

    // Between rows 4→5 (startZ-19 to -24), mid startZ-21.5
    placeArrow(-3.5, startZ-21.5, true,  true);
    placeArrow( 3.5, startZ-21.5, false, true);

    // Between rows 5→6 (startZ-24 to -29), mid startZ-26.5
    placeArrow( 3.5, startZ-26.5, true,  true);
    placeArrow(-3.5, startZ-26.5, false, true);

    // Between rows 6→7 (startZ-29 to -34), mid startZ-31.5
    placeArrow(-3.5, startZ-31.5, true,  true);
    placeArrow( 3.5, startZ-31.5, false, true);

    // Between rows 7→8 (startZ-34 to -39), mid startZ-36.5
    placeArrow( 3.5, startZ-36.5, true,  true);
    placeArrow(-3.5, startZ-36.5, false, true);

    // After row 8 to keycard (startZ-39 to -44), mid startZ-41.5 — ESCAPE arrows when running back
    placeArrow(-3.5, startZ-41.5, true, false); // blue pointing SOUTH (toward exit) for the run back
    placeArrow( 3.5, startZ-41.5, true, false);

    // ── FORKLIFTS (2) in dead-end pockets ──────────────────────────────────
    const fkY = this._mat(0.75, 0.55, 0.08, 0.12, 0.08, 0.01);
    const fkD = this._mat(0.18, 0.16, 0.20);
    for (const [fx, fkz] of [[ 4.5, startZ-7], [-4.5, startZ-19]] as [number,number][]) {
      this._box(1.4, 1.2, 2.0, fx, 0.6, fkz, fkY, false, true);
      this._box(0.9, 0.8, 0.9, fx, 1.6, fkz+0.3, fkD, false, true);
      this._box(1.2, 0.08, 0.18, fx, 0.5, fkz-1.1, fkY);
      for (const [wx, wz] of [[-0.5,-0.8],[0.5,-0.8],[-0.5,0.8],[0.5,0.8]]) {
        const wheel = MeshBuilder.CreateCylinder("", { diameter: 0.40, height: 0.22, tessellation: 8 }, this._scene);
        wheel.rotation.z = Math.PI/2; wheel.position.set(fx+wx, 0.2, fkz+wz);
        wheel.material = fkD; wheel.isPickable = false;
      }
    }

    // ── 3 DRONE BUTTONS — on wall ends of correct passages ──────────────────
    // Button 1: right side wall (x=+7) at z≈startZ-6.5 (first correct passage)
    // Button 2: left side wall (x=-7) at z≈startZ-21.5 (mid maze)
    // Button 3: back wall at z=endZ (after last shelf)
    const btnPositions: [number,number,number][] = [
      [ W/2-0.12, 2.4, startZ-6.5 ],   // #1 right wall, first passage
      [-W/2+0.12, 2.4, startZ-21.5],   // #2 left wall, mid maze
      [0,         2.4, endZ+1.0   ],   // #3 back wall center
    ];
    this._drBtnWorldPos = btnPositions.slice();
    // Industrial push-button style: black box panel + big round red dome + hex bolts
    const btnBoxMat  = this._mat(0.08, 0.08, 0.10, 0.01, 0.01, 0.01); // black metal box
    btnBoxMat.maxSimultaneousLights = 8;
    const btnRedMat  = this._mat(0.88, 0.06, 0.06, 0.40, 0.01, 0.01); // bright red dome
    btnRedMat.maxSimultaneousLights = 8;
    const boltMat    = this._mat(0.55, 0.52, 0.48, 0.06, 0.05, 0.04); // metal bolt heads
    boltMat.maxSimultaneousLights = 8;
    const boltRingMat = this._mat(0.30, 0.28, 0.26, 0.02, 0.02, 0.02);
    boltRingMat.maxSimultaneousLights = 8;

    for (let bi = 0; bi < 3; bi++) {
      const [bx, by, bz] = btnPositions[bi];
      // Face direction: wall buttons face inward, back-wall button faces south
      const faceX = bx < 0 ? -1 : bx > 0 ? 1 : 0;
      const faceZ = bx === 0 ? 1 : 0;
      const depth = 0.08;

      // Black box body
      const boxW = 0.52, boxH = 0.70;
      this._box(depth, boxH, boxW, bx + faceX * depth/2, by, bz, btnBoxMat, false, true);

      // Mounting bolts — 4 corners
      for (const [dy, dz] of [[-0.28, -0.20], [-0.28, 0.20], [0.28, -0.20], [0.28, 0.20]]) {
        const bolt = MeshBuilder.CreateCylinder("", { diameter: 0.055, height: 0.035, tessellation: 6 }, this._scene) as Mesh;
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(bx + faceX * (depth + 0.018), by + dy, bz + dz);
        bolt.material = boltMat; bolt.isPickable = false;
        // Bolt ring
        const ring = MeshBuilder.CreateCylinder("", { diameter: 0.075, height: 0.012, tessellation: 6 }, this._scene) as Mesh;
        ring.rotation.z = Math.PI / 2;
        ring.position.set(bx + faceX * (depth + 0.008), by + dy, bz + dz);
        ring.material = boltRingMat; ring.isPickable = false;
      }

      // Big round red dome button (cylinder + sphere cap)
      const stemH = 0.06;
      const stem = MeshBuilder.CreateCylinder("", { diameter: 0.20, height: stemH, tessellation: 16 }, this._scene) as Mesh;
      stem.rotation.z = Math.PI / 2;
      stem.position.set(bx + faceX * (depth + stemH/2 + 0.005), by + 0.06, bz);
      stem.material = btnRedMat; stem.isPickable = false;

      const dome = MeshBuilder.CreateSphere("", { diameter: 0.22, segments: 10 }, this._scene) as Mesh;
      dome.scaling.set(faceX !== 0 ? 0.55 : 1, 1, faceZ !== 0 ? 0.55 : 1);
      dome.position.set(bx + faceX * (depth + stemH + 0.09), by + 0.06, bz);
      dome.material = btnRedMat;
      dome.name = `dr_btn_${bi}`;
      dome.isPickable = true;

      // Red glow from button
      const bPl = new PointLight(`btnpl_${bi}`, new Vector3(
        bx + faceX * 0.6, by, bz
      ), this._scene);
      bPl.intensity = 0.9; bPl.range = 8; bPl.diffuse = new Color3(1.0, 0.08, 0.08);
      (dome as any)._glow = bPl;

      // Floor halo so player can spot it from ground level
      const halo = MeshBuilder.CreateGround("", { width: 1.2, height: 1.2 }, this._scene);
      halo.position.set(
        bx < 0 ? bx + 1.8 : bx > 0 ? bx - 1.8 : bx,
        0.006, bz
      );
      halo.material = this._mat(0.55, 0.02, 0.02, 0.20, 0.00, 0.00);
      halo.isPickable = false;
    }

    // ── LIGHT-BLUE KEYCARD at far end (hidden until all 3 buttons pressed) ──
    const lbkcMat = this._mat(0.35, 0.80, 0.96, 0.08, 0.20, 0.28);
    const lbkc = this._box(0.7, 0.04, 0.44, 0, 0.5, endZ+1.6, lbkcMat, true);
    lbkc.name = "lb_kc";
    lbkc.setEnabled(false);
    const lbkcPl = new PointLight("lbkcpl", new Vector3(0, 0.9, endZ+1.6), this._scene);
    lbkcPl.intensity = 0.45; lbkcPl.range = 4; lbkcPl.diffuse = new Color3(0.35, 0.85, 1);
    lbkcPl.setEnabled(false);
    (this as any)._lbkcMesh  = lbkc;
    (this as any)._lbkcLight = lbkcPl;
    this._interactables.push({
      mesh: lbkc, id: "lb_kc",
      label: "[ E ] Pick up Light-Blue Keycard",
      onInteract: () => {
        this._hasLightBlueKey = true;
        lbkc.setEnabled(false); lbkcPl.setEnabled(false);
        this._hudItem.textContent = "🩵 Light-Blue Keycard";
        this._hudItem.style.color = "#55ccff";
        this._score += 40;
        const ii = this._interactables.findIndex(it => it.id === "lb_kc");
        if (ii >= 0) this._interactables.splice(ii, 1);
        // NABNAB drops from ceiling — follow the BLUE arrows back to the entrance!
        this._flashScreen("rgba(10,30,180,0.55)", 0.9);
        setTimeout(() => {
          this._nabnabActive = true;
          this._flashMsg("😱 NABNAB IS ON THE CEILING!  Follow the BLUE arrows to the exit!  GO GO GO!");
        }, 350);
      },
    });

    // ── NABNAB — starts at far northwest corner, hidden against wall ──────────
    this._nabnabX = -5.8;
    this._nabnabZ = endZ + 0.8; // pressed against the north wall
    this._buildNabnab(this._nabnabX, ROOM_H2 - 0.55, this._nabnabZ);
  }

  private _buildNabnab(x: number, _y: number, z: number): void {
    // No parenting — all parts tracked in _nabnabParts and moved together in tick
    const cy = ROOM_H2 - 0.55; // ceiling y
    this._nabnabParts = [];
    const push = (m: Mesh) => { m.isPickable = false; this._nabnabParts.push(m); return m; };

    const blueMat   = this._mat(0.15, 0.48, 0.82, 0.02, 0.08, 0.16);
    const dkBlue    = this._mat(0.08, 0.28, 0.58);
    const whiteMat  = this._mat(0.92, 0.92, 0.94);
    const blackMat  = this._mat(0.05, 0.05, 0.07);
    const hatMat    = this._mat(0.60, 0.22, 0.75, 0.08, 0.02, 0.12);
    const yellMat   = this._mat(0.98, 0.95, 0.22, 0.18, 0.15, 0.02);
    const tongueMat = this._mat(0.90, 0.20, 0.40, 0.18, 0.02, 0.06);

    // Main body — this is the "anchor" mesh we track for position
    this._nabnabMesh = push(MeshBuilder.CreateSphere("nabnab", { diameter: 0.85, segments: 8 }, this._scene) as Mesh);
    this._nabnabMesh.scaling.set(1.0, 0.88, 0.95);
    this._nabnabMesh.position.set(x, cy, z);
    this._nabnabMesh.material = blueMat;

    // Offsets from body center: [dx, dy, dz]
    type Part = [Mesh, number, number, number];
    const offsets: Part[] = [];

    const addBox = (w: number, h: number, d: number, ox: number, oy: number, oz: number, mat: StandardMaterial) => {
      const m = MeshBuilder.CreateBox("", { width: w, height: h, depth: d }, this._scene) as Mesh;
      m.material = mat; m.isPickable = false;
      m.position.set(x + ox, cy + oy, z + oz);
      this._nabnabParts.push(m);
      offsets.push([m, ox, oy, oz]);
    };
    const addSphere = (diam: number, ox: number, oy: number, oz: number, mat: StandardMaterial) => {
      const m = MeshBuilder.CreateSphere("", { diameter: diam, segments: 6 }, this._scene) as Mesh;
      m.material = mat; m.isPickable = false;
      m.position.set(x + ox, cy + oy, z + oz);
      this._nabnabParts.push(m);
      offsets.push([m, ox, oy, oz]);
    };

    // 6 legs
    for (let li = 0; li < 6; li++) {
      const ang = (li / 6) * Math.PI * 2;
      addBox(0.09, 0.52, 0.09, Math.cos(ang)*0.6, -0.3, Math.sin(ang)*0.6, dkBlue);
    }
    // 3 eyes
    for (let ei = 0; ei < 3; ei++) {
      const ey = 0.22 - ei * 0.19;
      addSphere(0.16, 0,  ey, 0.43, whiteMat);
      addSphere(0.09, 0,  ey, 0.50, blackMat);
    }
    // Party hat
    const hat = MeshBuilder.CreateCylinder("", { diameterTop: 0, diameterBottom: 0.38, height: 0.55, tessellation: 8 }, this._scene) as Mesh;
    hat.material = hatMat; hat.isPickable = false;
    hat.position.set(x, cy + 0.60, z);
    this._nabnabParts.push(hat); offsets.push([hat, 0, 0.60, 0]);
    // Hat pom-pom
    addSphere(0.14, 0, 0.90, 0, yellMat);
    // Tongue
    addBox(0.09, 0.38, 0.07, 0, -0.34, 0.42, tongueMat);

    // Store offsets on main mesh so tick can reposition all parts
    (this._nabnabMesh as any)._offsets = offsets;
  }

  private _pressDroneBtn(idx: number, btn: Mesh): void {
    if (this._drBtnPressed[idx]) return;
    this._drBtnPressed[idx] = true;
    this._drBtnCount++;
    btn.material = this._mat(0.30, 0.82, 1.0, 0.10, 0.30, 0.46);
    this._flashScreen("rgba(55,170,255,0.15)", 0.3);
    this._flashMsg(`Drone Button ${idx+1} activated! (${this._drBtnCount}/3)`);
    const ii = this._interactables.findIndex(i => i.id === `dr_btn_${idx}`);
    if (ii >= 0) this._interactables.splice(ii, 1);
    if (this._drBtnCount >= 3) {
      setTimeout(() => {
        (this as any)._lbkcMesh?.setEnabled(true);
        (this as any)._lbkcLight?.setEnabled(true);
        this._flashMsg("All drone buttons activated! Light-Blue Keycard spawned at the north wall!");
        this._flashScreen("rgba(55,200,255,0.28)", 0.6);
      }, 1400);
    }
  }

  private _useLimeKey(): void {
    if (!this._hasLimeKey) { this._flashMsg("You need the Lime Keycard! Solve the Comms Sector colour puzzle first."); return; }
    if (this._lbDoorOpen) return;
    this._lbDoorOpen = true;
    this._lbDoor.setEnabled(false);
    this._lbDoor.checkCollisions = false;
    this._score += 20;
    this._flashScreen("rgba(80,220,40,0.20)", 0.5);
    this._flashMsg("Maintenance Room unlocked! Watch out for Nabnab…");
    const ii = this._interactables.findIndex(i => i.id === "lb_door_reader");
    if (ii >= 0) this._interactables.splice(ii, 1);
  }

  // ── Security Office ────────────────────────────────────────────────────────

  private _buildSecurityOffice(): void {
    const W = 12, D = 12, H = ROOM_H2;
    const startZ = -94;
    const cz = startZ - D / 2; // = -100

    const floorMat = this._mat(0.20, 0.19, 0.24);
    const floor = MeshBuilder.CreateGround("so_f", { width: W, height: D }, this._scene);
    floor.position.set(0, 0, cz); floor.material = floorMat;
    const ceilMat = this._mat(0.10, 0.09, 0.12);
    const ceil = MeshBuilder.CreateGround("so_c", { width: W, height: D }, this._scene);
    ceil.rotation.x = Math.PI; ceil.position.set(0, H, cz); ceil.material = ceilMat;

    const wallMat = this._mat(0.17, 0.16, 0.22);
    this._box(0.2, H, D, -W/2, H/2, cz, wallMat, false, true);
    this._box(0.2, H, D,  W/2, H/2, cz, wallMat, false, true);
    this._box(W, H, 0.2, 0, H/2, cz-D/2, wallMat, false, true); // north
    // South wall — door gap (opened by Nabnab crash)
    const soSide = (W - 2.6) / 2;
    this._box(soSide, H, 0.2, -(1.3+soSide/2), H/2, startZ, wallMat, false, true);
    this._box(soSide, H, 0.2,  (1.3+soSide/2), H/2, startZ, wallMat, false, true);
    this._box(2.6, H-2.5, 0.2, 0, 2.5+(H-2.5)/2, startZ, wallMat, false, true);
    // Blue security door frame + door (closed until Nabnab crashes)
    this._box(3.0, 2.8, 0.22, 0, 1.4, startZ, this._mat(0.22,0.42,0.88,0.04,0.08,0.18), false, true);
    this._secDoor = this._box(2.4, 2.5, 0.12, 0, 1.25, startZ+0.12, this._mat(0.15,0.30,0.68), false, true);
    this._secDoor.name = "sec_door";
    this._secDoorOpen = false;

    // Lighting — blue-tinted security lights
    for (const [lx, lz2] of [[-3, cz+2], [3, cz-2], [0, cz]]) {
      const sl = MeshBuilder.CreateBox("", { width: 0.12, height: 0.03, depth: 1.8 }, this._scene);
      sl.position.set(lx, H-0.02, lz2); sl.material = this._mat(0.7,0.8,1.0,0.35,0.45,0.60); sl.isPickable = false;
      const pl = new PointLight("sopl", new Vector3(lx, H-0.3, lz2), this._scene);
      pl.intensity = 0.5; pl.range = 9; pl.diffuse = new Color3(0.55, 0.65, 0.95);
    }
    // Red emergency light on wall (flashing)
    const redPl = new PointLight("soredpl", new Vector3(W/2-0.5, 2.0, cz), this._scene);
    redPl.intensity = 0.3; redPl.range = 6; redPl.diffuse = new Color3(1, 0.1, 0.1);
    let redT = 0;
    this._scene.registerBeforeRender(() => { redT += 0.016; redPl.intensity = 0.2 + Math.abs(Math.sin(redT * 2.5)) * 0.35; });

    // Security monitors on east wall
    const monitorMat = this._mat(0.08, 0.08, 0.10);
    const screenMat  = this._mat(0.05, 0.35, 0.55, 0.01, 0.14, 0.22);
    for (let i = 0; i < 3; i++) {
      this._box(0.08, 0.55, 0.45, W/2-0.1, 1.6, cz+2-i*2.2, monitorMat).isPickable = false;
      this._box(0.06, 0.42, 0.34, W/2-0.08, 1.6, cz+2-i*2.2, screenMat).isPickable = false;
    }

    // Desk with security computer
    const deskMat2 = this._mat(0.18, 0.16, 0.20);
    this._box(3.0, 0.85, 0.8, -2.0, 0.425, cz+3, deskMat2, false, true);
    this._box(3.0, 0.05, 0.8, -2.0, 0.875, cz+3, this._mat(0.24,0.22,0.26));
    this._box(0.08, 0.55, 0.45, -2.0, 1.18, cz+3, monitorMat).isPickable = false;
    this._box(0.06, 0.42, 0.34, -2.0, 1.18, cz+3, screenMat).isPickable = false;

    // ── Slow Seline — yellow snail in the corner ────────────────────────
    this._buildSlowSeline(-4.5, 0, cz - D/2 + 2);

    // ── Security Keycard on the desk ────────────────────────────────────
    const skcMat = this._mat(0.10, 0.22, 0.82, 0.02, 0.06, 0.25);
    const skc = this._box(0.7, 0.04, 0.44, -2.0, 0.90, cz+2.8, skcMat, true);
    skc.name = "sec_kc";
    const skcPl = new PointLight("skcpl", new Vector3(-2, 1.2, cz+2.8), this._scene);
    skcPl.intensity = 0.35; skcPl.range = 3; skcPl.diffuse = new Color3(0.2, 0.4, 1);
    this._interactables.push({
      mesh: skc, id: "sec_kc",
      label: "[ E ] Pick up Security Keycard",
      onInteract: () => {
        skc.setEnabled(false); skcPl.setEnabled(false);
        this._hudItem.textContent = "🔑 Security Keycard";
        this._hudItem.style.color = "#4488ff";
        this._score += 60;
        this._flashMsg("🔑 Security Keycard obtained! Chapter 2 — Complete!");
        const ii = this._interactables.findIndex(it => it.id === "sec_kc");
        if (ii >= 0) this._interactables.splice(ii, 1);
        setTimeout(() => this._triggerEnd(), 3000);
      },
    });
  }

  private _buildSlowSeline(x: number, _y: number, z: number): void {
    const yellMat  = this._mat(0.92, 0.82, 0.10, 0.18, 0.14, 0.01);
    const dkYell   = this._mat(0.65, 0.55, 0.05);
    const whiteMat = this._mat(0.92, 0.92, 0.94);
    const blackMat = this._mat(0.05, 0.05, 0.07);
    const pinkMat  = this._mat(0.92, 0.50, 0.65, 0.12, 0.04, 0.06);

    // Shell (coiled spiral approximated with stacked boxes)
    const shell = MeshBuilder.CreateSphere("seline_shell", { diameter: 0.80, segments: 8 }, this._scene) as Mesh;
    shell.scaling.set(1.0, 0.72, 0.88); shell.position.set(x, 0.38, z);
    shell.material = dkYell; shell.isPickable = false;
    // Shell spiral stripe
    this._box(0.82, 0.08, 0.90, x, 0.38, z, yellMat).isPickable = false;
    // Body / foot (wide flat base)
    this._box(0.60, 0.22, 1.0, x, 0.11, z+0.2, yellMat).isPickable = false;
    // Head
    const head = MeshBuilder.CreateSphere("", { diameter: 0.42, segments: 6 }, this._scene) as Mesh;
    head.position.set(x, 0.32, z+0.65); head.material = yellMat; head.isPickable = false;
    // Huge grin
    for (let i = 0; i < 7; i++) {
      const a = (i/6)*Math.PI*0.7 - Math.PI*0.35;
      this._box(0.04, 0.04, 0.04, x+Math.cos(a)*0.14, 0.22+Math.sin(a)*0.06, z+0.86, pinkMat).isPickable = false;
    }
    // Eyestalks (elastic long stalks)
    for (const [ex] of [[-0.10], [0.10]] as [number][]) {
      this._box(0.05, 0.38, 0.05, x+ex, 0.50, z+0.62, yellMat).isPickable = false;
      const eyeball = MeshBuilder.CreateSphere("", { diameter: 0.16, segments: 6 }, this._scene) as Mesh;
      eyeball.position.set(x+ex, 0.72, z+0.62); eyeball.material = whiteMat; eyeball.isPickable = false;
      this._box(0.08, 0.08, 0.08, x+ex, 0.72, z+0.68, blackMat).isPickable = false;
    }
  }

  // ── Keycard use ────────────────────────────────────────────────────────────

  private _useOrangeKey(door: 1 | 2): void {
    if (!this._hasOrangeKey) {
      this._flashMsg("You need the Orange Keycard! Check near Jumbo Josh.");
      return;
    }
    if (door === 1 && this._door1Open) return;
    if (door === 2 && this._door2Open) return;
    if (door === 1) {
      this._door1Open = true;
      this._door1.setEnabled(false); this._door1.checkCollisions = false;
      this._score += 15;
      this._flashScreen("rgba(255,140,0,0.2)", 0.5);
      this._flashMsg("Orange Door 1 unlocked! Head through to the hallway.");
      const ii = this._interactables.findIndex(i => i.id === "door1_reader");
      if (ii >= 0) this._interactables.splice(ii, 1);
    } else {
      this._door2Open = true;
      this._door2.setEnabled(false); this._door2.checkCollisions = false;
      this._score += 15;
      this._flashScreen("rgba(255,140,0,0.2)", 0.5);
      this._flashMsg("Orange Door 2 unlocked! Welcome to The Hub.");
      const ii = this._interactables.findIndex(i => i.id === "door2_reader");
      if (ii >= 0) this._interactables.splice(ii, 1);
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    const hud = document.createElement("div");
    hud.style.cssText = "position:absolute;inset:0;pointer-events:none;font-family:Arial,sans-serif;";
    hud.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;height:48px;
        background:rgba(0,0,0,0.65);display:flex;align-items:center;
        padding:0 16px;gap:16px;pointer-events:all;">
        <button id="bb2Back" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.75);
          font-size:13px;padding:6px 14px;border-radius:8px;
          border:1px solid rgba(255,255,255,0.2);cursor:pointer;">← Back</button>
        <span id="bb2Item" style="color:rgba(255,255,255,0.35);font-size:13px;">No items</span>
        <span style="color:rgba(255,255,255,0.28);font-size:11px;margin-left:auto;">
          WASD · Click to look · E interact
        </span>
      </div>

      <!-- Crosshair -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;width:28px;height:28px;">
        <div style="position:absolute;inset:0;border-radius:50%;border:2.5px solid white;"></div>
        <div style="position:absolute;inset:7px;border-radius:50%;border:2px solid black;"></div>
        <div style="position:absolute;inset:11px;border-radius:50%;background:white;"></div>
      </div>

      <!-- Drone remote in hand (bottom-right) — hidden until picked up -->
      <div id="bb2Drone" style="position:absolute;bottom:0;right:16px;width:140px;height:110px;
        display:none;align-items:flex-end;justify-content:center;pointer-events:none;padding-bottom:10px;">
      </div>

      <!-- Chapter label top-right -->
      <div style="position:absolute;top:56px;right:12px;color:rgba(255,140,0,0.55);
        font-size:11px;font-weight:bold;letter-spacing:2px;pointer-events:none;">
        CHAPTER 2 — OUTER SECTOR
      </div>

      <!-- Interaction prompt -->
      <div id="bb2Prompt" style="position:absolute;bottom:90px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.72);color:white;font-size:14px;padding:9px 20px;
        border-radius:8px;border:1px solid rgba(255,255,255,0.18);
        display:none;pointer-events:none;white-space:nowrap;"></div>
    `;
    this._wrap.appendChild(hud);
    this._hudPrompt = hud.querySelector("#bb2Prompt")!;
    this._hudItem   = hud.querySelector("#bb2Item")!;
    this._hudDrone  = hud.querySelector("#bb2Drone")!;
    hud.querySelector("#bb2Back")!.addEventListener("click", () => this._cleanup(true));

    // Start overlay
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
          <div style="color:#ff8800;font-size:clamp(13px,2vw,22px);font-weight:900;
            letter-spacing:2px;margin-top:4px;">CHAPTER 2</div>
          <div style="height:2px;background:linear-gradient(90deg,rgba(255,140,0,0.5),transparent);margin-top:8px;"></div>
        </div>
        <div style="color:rgba(255,255,255,0.45);font-size:clamp(11px,1.4vw,14px);
          font-family:Arial;line-height:1.7;margin-bottom:20px;">
          You wake up on the elevator…<br>
          Jumbo Josh lies crushed below.<br>
          Find the keycard. Escape the facility.
        </div>
        <div id="bb2Play" style="color:white;font-size:clamp(16px,2.4vw,26px);font-weight:bold;
          font-family:Arial;padding:10px 0 10px 4px;cursor:pointer;
          border-left:3px solid #ff8800;transition:color 0.12s,padding-left 0.12s;"
          onmouseover="this.style.color='#FFD700';this.style.paddingLeft='16px'"
          onmouseout="this.style.color='white';this.style.paddingLeft='4px'">▶ Play</div>
        <div style="margin-top:auto;padding-top:16px;">
          <button id="bb2MenuBack" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.4);
            font-size:12px;padding:6px 14px;border-radius:16px;
            border:1px solid rgba(255,255,255,0.14);cursor:pointer;font-family:Arial;">
            ← Menu
          </button>
        </div>
      </div>
    `;
    this._wrap.appendChild(this._startOverlay);
    setTimeout(() => {
      this._startOverlay.querySelector("#bb2Play")?.addEventListener("pointerdown", () => this._doStart());
      this._startOverlay.querySelector("#bb2MenuBack")?.addEventListener("pointerdown", () => this._cleanup(true));
    }, 0);
  }

  // ── Drone ──────────────────────────────────────────────────────────────────

  private _droneHudHTML(working: boolean): string {
    if (working) return `
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
      </div>`;
    return `
      <div style="background:#0e0e0f;border-radius:8px;padding:10px 14px 8px;
        border:1.5px solid #3a2a2a;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.6);">
        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:6px;">
          <div style="width:6px;height:16px;background:#2a1a1a;border-radius:2px;"></div>
          <div style="width:4px;height:10px;background:#1a1010;border-radius:2px;transform:rotate(15deg);"></div>
        </div>
        <div style="width:32px;height:32px;background:radial-gradient(circle,#442222,#220000);
          border-radius:50%;margin:0 auto;border:2px solid #662222;opacity:0.5;"></div>
        <div style="color:#662222;font-size:8px;margin-top:5px;letter-spacing:1px;">BROKEN ⚠</div>
      </div>`;
  }

  private _sendDrone(): void {
    if (!this._hasWorkingDrone) {
      if (this._hasBrokenDrone)
        this._flashMsg("The remote is broken! Find a working one.");
      return;
    }
    this._droneParked = false;
    const cam = this._camera.position;
    const fwd = new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      -Math.sin(this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch)
    );
    const target = cam.add(fwd.scale(4));
    target.y = Math.max(1.0, Math.min(ROOM_H2 - 0.4, target.y));
    this._droneTarget = target;
  }

  // ── Note overlay ───────────────────────────────────────────────────────────

  private _showNote(text: string): void {
    document.exitPointerLock?.();
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;inset:0;z-index:70;background:rgba(0,0,0,0.88);" +
      "display:flex;align-items:center;justify-content:center;pointer-events:all;";
    const card = document.createElement("div");
    card.style.cssText =
      "background:#f5f0e0;color:#1a1510;font-family:'Courier New',monospace;font-size:14px;" +
      "padding:32px 36px;border-radius:4px;max-width:420px;width:90%;line-height:1.9;" +
      "box-shadow:0 8px 40px rgba(0,0,0,0.7);white-space:pre-wrap;position:relative;";
    card.textContent = text;
    const close = document.createElement("button");
    close.textContent = "✕";
    close.style.cssText =
      "position:absolute;top:10px;right:12px;background:none;border:none;font-size:18px;" +
      "cursor:pointer;color:#666;";
    close.addEventListener("pointerdown", () => {
      overlay.remove();
      this._canvas.requestPointerLock?.();
    });
    card.appendChild(close);
    overlay.appendChild(card);
    overlay.addEventListener("pointerdown", (e) => {
      if (e.target === overlay) { overlay.remove(); this._canvas.requestPointerLock?.(); }
    });
    this._wrap.appendChild(overlay);
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
      if (e.code === "KeyE") this._tryInteract();
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
      if (document.pointerLockElement !== this._canvas) {
        this._canvas.requestPointerLock?.();
      }
      this._sendDrone();
    };
    this._canvas.addEventListener("pointerdown", this._mc);

    this._rz = () => this._engine.resize();
    window.addEventListener("resize", this._rz);

    if (window.matchMedia("(pointer:coarse)").matches) this._setupTouchControls();
  }

  private _setupTouchControls(): void {
    const hud = document.createElement("div");
    hud.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:50;";
    this._wrap.appendChild(hud);
    this._touchHud = hud;

    const joyBase = document.createElement("div");
    joyBase.style.cssText =
      "position:absolute;bottom:90px;left:30px;width:110px;height:110px;" +
      "border-radius:50%;background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.25);" +
      "pointer-events:all;touch-action:none;";
    const joyDot = document.createElement("div");
    joyDot.style.cssText =
      "position:absolute;top:50%;left:50%;width:44px;height:44px;margin:-22px 0 0 -22px;" +
      "border-radius:50%;background:rgba(255,255,255,0.5);pointer-events:none;";
    joyBase.appendChild(joyDot);
    hud.appendChild(joyBase);

    const KEYS_MOVE = ["KeyW","KeyS","KeyA","KeyD"] as const;
    let joyId = -1, joyOriginX = 0, joyOriginY = 0;

    const joyMove = (cx: number, cy: number) => {
      const dx = cx - joyOriginX, dy = cy - joyOriginY;
      const dist = Math.min(Math.sqrt(dx*dx+dy*dy), 40);
      const ang  = Math.atan2(dy, dx);
      joyDot.style.transform = `translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist}px)`;
      const thr = 12;
      KEYS_MOVE.forEach(k => this._keys.delete(k));
      if (dy < -thr) this._keys.add("KeyW");
      if (dy >  thr) this._keys.add("KeyS");
      if (dx < -thr) this._keys.add("KeyA");
      if (dx >  thr) this._keys.add("KeyD");
    };

    joyBase.addEventListener("touchstart", e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyId = t.identifier;
      const r = joyBase.getBoundingClientRect();
      joyOriginX = r.left + r.width / 2;
      joyOriginY = r.top  + r.height / 2;
      if (!this._started) this._doStart();
      joyMove(t.clientX, t.clientY);
    }, { passive: false });
    joyBase.addEventListener("touchmove", e => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches))
        if (t.identifier === joyId) joyMove(t.clientX, t.clientY);
    }, { passive: false });
    joyBase.addEventListener("touchend", e => {
      for (const t of Array.from(e.changedTouches))
        if (t.identifier === joyId) { joyId = -1; joyDot.style.transform = ""; KEYS_MOVE.forEach(k => this._keys.delete(k)); }
    });

    const lookArea = document.createElement("div");
    lookArea.style.cssText =
      "position:absolute;top:0;right:0;width:55%;height:100%;pointer-events:all;touch-action:none;";
    hud.appendChild(lookArea);

    let lookId = -1, lookPrevX = 0, lookPrevY = 0;
    lookArea.addEventListener("touchstart", e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      lookId = t.identifier; lookPrevX = t.clientX; lookPrevY = t.clientY;
      if (!this._started) this._doStart();
    }, { passive: false });
    lookArea.addEventListener("touchmove", e => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === lookId) {
          this._yaw   += (t.clientX - lookPrevX) * 0.006;
          this._pitch  = Math.max(-0.48, Math.min(0.48, this._pitch + (t.clientY - lookPrevY) * 0.006));
          lookPrevX = t.clientX; lookPrevY = t.clientY;
        }
      }
    }, { passive: false });
    lookArea.addEventListener("touchend", e => {
      for (const t of Array.from(e.changedTouches))
        if (t.identifier === lookId) lookId = -1;
    });

    const jumpBtn = document.createElement("div");
    jumpBtn.textContent = "⬆";
    jumpBtn.style.cssText =
      "position:absolute;bottom:90px;right:30px;width:70px;height:70px;" +
      "border-radius:50%;background:rgba(100,180,255,0.25);border:2px solid rgba(100,180,255,0.5);" +
      "display:flex;align-items:center;justify-content:center;font-size:28px;" +
      "pointer-events:all;touch-action:none;user-select:none;";
    hud.appendChild(jumpBtn);
    jumpBtn.addEventListener("touchstart", e => {
      e.preventDefault();
      this._keys.add("Space");
      if (!this._started) this._doStart();
    }, { passive: false });
    jumpBtn.addEventListener("touchend", () => this._keys.delete("Space"));

    const interactBtn = document.createElement("div");
    interactBtn.textContent = "E";
    interactBtn.style.cssText =
      "position:absolute;bottom:90px;right:115px;width:60px;height:60px;" +
      "border-radius:50%;background:rgba(255,200,80,0.25);border:2px solid rgba(255,200,80,0.5);" +
      "display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#ffd060;" +
      "pointer-events:all;touch-action:none;user-select:none;";
    hud.appendChild(interactBtn);
    interactBtn.addEventListener("touchstart", e => {
      e.preventDefault();
      this._tryInteract();
      if (!this._started) this._doStart();
    }, { passive: false });
  }

  private _tryInteract(): void { this._aimedAt?.onInteract(); }

  // ── Tick ───────────────────────────────────────────────────────────────────

  private _tick(dt: number): void {
    if (!this._started) return;
    dt = Math.min(dt, 0.05);

    // Camera look (gamepad)
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

    // Controller interact (Square / X button — rising edge)
    if (gpState.btnSquare && !this._prevBtnSq) this._tryInteract();
    this._prevBtnSq = gpState.btnSquare;

    // Right Trigger — send drone (aim with right stick then pull RT)
    if (gpState.btnRT && !this._prevBtnRT) this._sendDrone();
    this._prevBtnRT = gpState.btnRT;

    // Jumping + gravity
    if ((this._keys.has("Space") || gpState.btnA) && this._camera.position.y <= EYE_Y2 + 0.05) this._velY = 6;
    this._velY -= 20 * dt;
    this._camera.position.y += this._velY * dt;
    if (this._camera.position.y < EYE_Y2) { this._camera.position.y = EYE_Y2; this._velY = 0; }

    if (mv.lengthSquared() > 0) {
      mv.normalize().scaleInPlace(SPD2 * dt);
      const np = this._camera.position.add(new Vector3(mv.x, 0, mv.z));
      np.y = this._camera.position.y;
      // Zone bounds
      const startRoomS =  6;
      const hallEnd    = -6 - 10;  // = -16
      const hubEnd     = hallEnd - 16; // = -32
      const commsEnd   = this._commsDoorOpen ? -50 : hubEnd;
      const maintEnd   = this._lbDoorOpen    ? -94 : commsEnd;
      const secEnd     = this._secDoorOpen   ? -106 : maintEnd;
      np.x = Math.max(-8.5, Math.min(8.5, np.x));
      np.z = Math.max(secEnd + 0.4, Math.min(startRoomS - 0.4, np.z));
      // Door blockers
      if (this._door1.isEnabled()  && np.z < -6 + 1.0)    np.z = -6 + 1.0;
      if (this._door2.isEnabled()  && np.z < hallEnd + 1.0) np.z = hallEnd + 1.0;
      if (this._commsDoor.isEnabled() && np.z < hubEnd + 0.2) np.z = hubEnd + 0.2;
      if (this._lbDoor.isEnabled() && np.z < -50 + 0.2)   np.z = -50 + 0.2;
      if (this._secDoor.isEnabled() && np.z < -94 + 0.2)  np.z = -94 + 0.2;
      // Width clamps
      if (np.z < -6 && np.z > hallEnd) np.x = Math.max(-1.8, Math.min(1.8, np.x));
      if (np.z < hubEnd && np.z > -50) np.x = Math.max(-7.8, Math.min(7.8, np.x));
      if (np.z < -50 && np.z > -94)   np.x = Math.max(-6.8, Math.min(6.8, np.x));
      if (np.z < -94)                  np.x = Math.max(-5.8, Math.min(5.8, np.x));
      this._camera.position.copyFrom(np);
    }

    // Drone movement
    if (this._hasWorkingDrone) {
      this._droneMesh.setEnabled(true);
      this._droneMesh.rotation.y += dt * 3.5;
      if (this._droneTarget) {
        const dir = this._droneTarget.subtract(this._droneMesh.position);
        const len = dir.length();
        if (len < 0.12) {
          this._droneMesh.position.copyFrom(this._droneTarget);
          this._droneTarget = null;
          this._droneParked = true;
        } else {
          this._droneMesh.position.addInPlace(dir.normalize().scaleInPlace(Math.min(len, 9 * dt)));
        }
      } else if (!this._droneParked) {
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
    }

    // Drone → button proximity (drone activates buttons when it flies into them)
    if (this._hasWorkingDrone && this._drBtnWorldPos.length > 0) {
      const dp = this._droneMesh.position;
      for (let bi = 0; bi < this._drBtnWorldPos.length; bi++) {
        if (this._drBtnPressed[bi]) continue;
        const [bx, by, bz] = this._drBtnWorldPos[bi];
        const ddx = dp.x - bx, ddy = dp.y - by, ddz = dp.z - bz;
        if (Math.sqrt(ddx*ddx + ddy*ddy + ddz*ddz) < 0.55) {
          // Find button mesh by name
          const btnMesh = this._scene.getMeshByName(`dr_btn_${bi}`) as Mesh | null;
          if (btnMesh) this._pressDroneBtn(bi, btnMesh);
        }
      }
    }

    // Nabnab — ceiling crawler (no parenting, all parts moved via offsets array)
    if (this._nabnabActive && !this._nabnabCrashed) {
      this._nabnabTimer += dt;
      const cp = this._camera.position;
      const ceilY = ROOM_H2 - 0.55 + Math.sin(performance.now() / 200) * 0.04;
      const dx = cp.x - this._nabnabX;
      const dz2 = cp.z - this._nabnabZ;
      const distXZ = Math.sqrt(dx * dx + dz2 * dz2);

      // Move toward player on ceiling (6 units/sec — faster than player)
      if (distXZ > 0.1) {
        this._nabnabX += (dx / distXZ) * 6.0 * dt;
        this._nabnabZ += (dz2 / distXZ) * 6.0 * dt;
      }
      // Face player
      this._nabnabMesh.rotation.y = Math.atan2(dx, dz2);

      // Reposition ALL parts using stored offsets
      const offsets = (this._nabnabMesh as any)._offsets as [Mesh,number,number,number][];
      this._nabnabMesh.position.set(this._nabnabX, ceilY, this._nabnabZ);
      if (offsets) {
        for (const [m, ox, oy, oz] of offsets) {
          m.position.set(this._nabnabX + ox, ceilY + oy, this._nabnabZ + oz);
          m.rotation.y = this._nabnabMesh.rotation.y;
        }
      }

      // Drop on player if directly overhead (give player 1.5s head start)
      if (distXZ < 0.85 && this._hitCooldown2 <= 0 && this._nabnabTimer > 1.5) {
        this._hitCooldown2 = 3.0;
        // Jumpscare overlay — Nabnab face dropping from top
        const js = document.createElement("div");
        js.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;";
        js.innerHTML = `<div style="font-size:140px;animation:nabDrop 0.35s ease-in forwards;">👾</div>
          <div style="color:#7af;font-size:22px;font-weight:bold;margin-top:12px;text-align:center;">NABNAB!</div>
          <style>@keyframes nabDrop{from{transform:translateY(-200px) scaleY(1.4)}to{transform:translateY(0) scaleY(1)}}</style>`;
        this._wrap.appendChild(js);
        document.exitPointerLock?.();
        setTimeout(() => {
          js.remove();
          this._canvas.requestPointerLock?.();
          // Respawn near the Light-Blue Keycard — just pick it up and run!
          this._camera.position.set(0, EYE_Y2, -91.5);
          this._flashMsg("💙 Nabnab dropped on you! Grab the keycard and RUN to the exit!");
        }, 850);
        // Snap Nabnab back to far corner
        this._nabnabX = -5.5;
        this._nabnabZ = -93.2;
        this._nabnabMesh.position.set(this._nabnabX, ceilY, this._nabnabZ);
      }

      // Player escaped to exit — Nabnab crashes into south wall (tunnel vision)
      if (cp.z > -49.0 && !this._nabnabCrashed) {
        this._nabnabCrashed = true;
        this._nabnabActive  = false;
        // Fast scripted crash into south wall
        const crashId = setInterval(() => {
          this._nabnabZ += 2.5;
          this._nabnabMesh.position.z = this._nabnabZ;
          if (offsets) for (const [m,,, oz] of offsets) m.position.z = this._nabnabZ + oz;
          if (this._nabnabZ >= -50.5) {
            clearInterval(crashId);
            this._flashScreen("rgba(90,110,255,0.45)", 0.5);
            this._flashMsg("💥 CRASH! Nabnab smashed into the wall! The north door is open — keep going!");
            // Open security office door
            if (this._secDoor) {
              this._secDoor.setEnabled(false);
              this._secDoor.checkCollisions = false;
              this._secDoorOpen = true;
            }
          }
        }, 16);
      }
      if (this._hitCooldown2 > 0) this._hitCooldown2 -= dt;
    }

    // Crosshair detection
    const cam = this._camera.position;
    const fwd = new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      -Math.sin(this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch)
    );
    let newAimed: Interactable2 | null = null;
    for (const item of this._interactables) {
      if (!item.mesh.isEnabled()) continue;
      const toItem = item.mesh.position.subtract(cam);
      if (toItem.length() > E_DIST2) continue;
      if (Vector3.Dot(toItem.normalize(), fwd) > 0.88) { newAimed = item; break; }
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

    // Prompts
    let label = newAimed ? newAimed.label : "";
    if (!label) {
      if (!this._hasBrokenDrone && !this._hasWorkingDrone)
        label = "🔧 Find the broken Drone Remote near Jumbo Josh!";
      else if (!this._hasOrangeKey)
        label = "🟠 Find the Orange Keycard near Jumbo Josh!";
      else if (!this._door1Open)
        label = "🚪 Use Orange Keycard on the door reader (north wall)";
      else if (!this._door2Open)
        label = "🚪 Use Orange Keycard on the second door reader";
      else if (!this._hasWorkingDrone)
        label = "🚁 Find the new Drone Remote in The Hub!";
      else if (!this._hasPinkKey)
        label = "🏢 Find the Pink Keycard on the desk in the Hub!";
      else if (!this._commsDoorOpen)
        label = "🩷 Use Pink Keycard on the Comms Sector door (north Hub wall)!";
      else if (!this._commsPuzzleSolved)
        label = "🎹 Comms Sector: activate terminals Lightest Red → Darkest Red → Lightest Blue → Darkest Blue!";
      else if (!this._hasLimeKey)
        label = "🟢 Puzzle solved! Grab the Lime Keycard at the north wall!";
      else if (!this._lbDoorOpen)
        label = "🟢 Use Lime Keycard on the Maintenance Room door!";
      else if (!this._hasLightBlueKey) {
        const n = this._drBtnCount;
        if (n === 0) label = "🚁 AIM at the CYAN button on the LEFT wall (high up) then LEFT-CLICK to send your drone!";
        else if (n === 1) label = `🚁 Button ${n+1}/3: AIM at cyan button on the RIGHT wall (high up) → LEFT-CLICK!`;
        else label = "🚁 Last button! AIM at cyan button on the BACK wall (center, high up) → LEFT-CLICK!";
      }
      else if (!this._secDoorOpen)
        label = "💥 Nabnab crashed! Head through the north door into the Security Office!";
      else
        label = "🔑 Find the Security Keycard in the Security Office!";
    }
    this._hudPrompt.textContent = label;
    this._hudPrompt.style.display = label ? "block" : "none";
  }

  // ── Ending ─────────────────────────────────────────────────────────────────

  private _triggerEnd(): void {
    const screen = document.createElement("div");
    screen.style.cssText =
      "position:absolute;inset:0;z-index:60;background:#000;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:16px;font-family:'Arial Black',Arial;";
    screen.innerHTML = `
      <style>@keyframes fadeInUp2{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}</style>
      <div style="color:rgba(255,255,255,0.35);font-size:14px;letter-spacing:4px;
        animation:fadeInUp2 0.6s 0.2s both;">CHAPTER 2</div>
      <div style="color:#55ccff;font-size:clamp(22px,4vw,48px);font-weight:900;
        animation:fadeInUp2 0.6s 0.7s both;">MAINTENANCE ROOM — CLEARED</div>
      <div style="color:rgba(255,255,255,0.45);font-size:14px;text-align:center;max-width:380px;
        font-family:Arial;line-height:1.8;animation:fadeInUp2 0.6s 1.2s both;">
        You outsmarted Nabnab and solved Banbaleena's puzzle.<br>
        What awaits beyond the light-blue door…?
      </div>
      <div style="color:#FFD700;font-size:clamp(16px,2.5vw,32px);font-weight:900;letter-spacing:2px;
        animation:fadeInUp2 0.6s 1.8s both;">MORE COMING SOON</div>
      <div style="color:white;font-size:16px;animation:fadeInUp2 0.6s 2.4s both;">
        Score: <strong style="color:#FFD700">${this._score} 🪙</strong>
      </div>
    `;
    this._wrap.appendChild(screen);
    setTimeout(() => { screen.remove(); this._end(); }, 6000);
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
    }, 3200);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  private _cleanup(goBack = false): void {
    if (this._done) return;
    this._done = true;
    document.exitPointerLock?.();
    document.removeEventListener("keydown",   this._kd);
    document.removeEventListener("keyup",     this._ku);
    document.removeEventListener("mousemove", this._mm);
    this._canvas.removeEventListener("pointerdown", this._mc);
    window.removeEventListener("resize", this._rz);
    this._touchHud?.remove();
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
    wrap.style.cssText = "background:linear-gradient(160deg,#080010,#100818);gap:14px;font-family:Arial,sans-serif;";
    wrap.innerHTML = `
      <div style="font-size:48px;">🟠</div>
      <div style="color:#FFD700;font-size:24px;font-weight:bold;">Chapter 2 — Complete!</div>
      <div style="color:rgba(255,255,255,0.55);font-size:14px;max-width:300px;text-align:center;line-height:1.7;">
        You cleared the Hub, solved Banbaleena's puzzle,<br>
        and outran Nabnab in the Maintenance Room!
      </div>
      <div style="color:white;font-size:17px;">Score: <strong style="color:#FFD700">${this._score} 🪙</strong></div>
    `;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:10px;";
    const again = document.createElement("button");
    again.id = "playBtn"; again.textContent = "▶ Play Again";
    again.style.cssText = "background:#ff8800;color:#fff;font-size:17px;font-weight:bold;padding:12px 30px;border-radius:40px;border:none;cursor:pointer;";
    again.onclick = () => new GardenBanban2(this._g);
    const ch3 = document.createElement("button");
    ch3.textContent = "▶ Chapter 3";
    ch3.style.cssText = "background:linear-gradient(135deg,#1a8c2e,#0d5c1e);color:#a8ffb8;font-size:17px;font-weight:bold;padding:12px 30px;border-radius:40px;border:2px solid #2ecc55;cursor:pointer;letter-spacing:1px;";
    ch3.onclick = () => { import("./GardenBanban3").then(m => new m.GardenBanban3(this._g)); };
    const back = document.createElement("button");
    back.id = "backBtn"; back.textContent = "← Back to Arcade";
    back.style.cssText = "background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:15px;padding:9px 24px;border-radius:40px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;";
    back.onclick = () => this._g.goArcade();
    row.appendChild(again); row.appendChild(ch3); row.appendChild(back);
    wrap.appendChild(row);
    this._g.ui.innerHTML = "";
    this._g.ui.appendChild(wrap);
  }
}
