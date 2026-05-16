import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Game room — after electrical area
// Everyone is dead (Hour of Joy). Huggy is gone.
// There's a bee-building machine — press the button, wait for it to build, collect the bee.
// "Nobody leaves without a toy."

export class PoppyGameRoom {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;
  private _camera!: FreeCamera;
  private _keys: Record<string, boolean> = {};
  private _yaw = 0;
  private _pointerLocked = false;
  private _renderFn!: () => void;
  private _paused = false;

  private _machineBtn!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _beeMesh!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _building = false;
  private _beeReady = false;
  private _ventDoor!: ReturnType<typeof MeshBuilder.CreateBox>;

  private _hud!: HTMLDivElement;
  private _interactHint!: HTMLDivElement;
  private _progressBar!: HTMLDivElement;
  private _progressFill!: HTMLDivElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText = "position:absolute;inset:0;pointer-events:all;overflow:hidden;cursor:crosshair;";
    g.ui.appendChild(this._wrap);
    this._showEntrance();
  }

  private _showEntrance(): void {
    // Brief "you exit the electrical area" cutscene
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:#000;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;text-align:center;padding:20px;";
    ov.innerHTML = `
      <div style="font-size:52px;margin-bottom:16px;">🏭</div>
      <div style="color:rgba(255,255,255,0.9);font-size:18px;font-weight:900;margin-bottom:12px;">
        The factory is silent.
      </div>
      <div style="color:rgba(255,255,255,0.45);font-size:14px;line-height:1.7;max-width:340px;">
        Huggy is gone.<br>
        Everyone is dead.<br>
        The Hour of Joy has passed.<br><br>
        <span style="color:#facc15;">…but nobody leaves without a toy.</span>
      </div>
    `;
    this._wrap.appendChild(ov);
    setTimeout(() => { ov.remove(); this._build(); }, 3000);
  }

  private _build(): void {
    this._scene = new Scene(this._g.engine);
    this._scene.clearColor = new Color4(0.02, 0.02, 0.03, 1);
    this._scene.fogMode = 3;
    this._scene.fogColor = new Color3(0.02, 0.02, 0.03);
    this._scene.fogStart = 14;
    this._scene.fogEnd = 30;

    // Player spawns at entrance (south)
    this._camera = new FreeCamera("cam", new Vector3(0, 1.6, -6), this._scene);
    this._camera.minZ = 0.1;
    this._camera.speed = 0;

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this._scene);
    hemi.intensity = 0.3;
    hemi.diffuse = new Color3(0.7, 0.7, 1.0);

    // Dim overhead lights — spooky atmosphere
    const addLight = (x: number, z: number, intensity: number) => {
      const l = new PointLight(`l${x}_${z}`, new Vector3(x, 4.5, z), this._scene);
      l.intensity = intensity;
      l.diffuse = new Color3(1, 0.9, 0.75);
      l.range = 12;
    };
    addLight(-4, 0, 0.5); addLight(4, 0, 0.5);
    addLight(-4, 8, 0.6); addLight(4, 8, 0.6);
    addLight(0, 14, 0.4);

    // Materials
    const wallMat = new StandardMaterial("wall", this._scene);
    wallMat.diffuseColor = new Color3(0.15, 0.18, 0.40);

    const floorMat = new StandardMaterial("floor", this._scene);
    floorMat.diffuseColor = new Color3(0.18, 0.18, 0.22);

    const ceilMat = new StandardMaterial("ceil", this._scene);
    ceilMat.diffuseColor = new Color3(0.10, 0.10, 0.14);

    // Floor
    const floor = MeshBuilder.CreateBox("floor", { width: 18, height: 0.1, depth: 26 }, this._scene);
    floor.position.set(0, -0.05, 7);
    floor.material = floorMat;
    floor.isPickable = false;

    // Ceiling
    const ceil = MeshBuilder.CreateBox("ceil", { width: 18, height: 0.1, depth: 26 }, this._scene);
    ceil.position.set(0, 5, 7);
    ceil.material = ceilMat;
    ceil.isPickable = false;

    // Walls
    const mkW = (name: string, w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this._scene);
      m.position.set(x, y, z); m.material = wallMat; m.isPickable = false;
    };
    mkW("wBack",  18, 5, 0.3, 0, 2.5, 20);
    mkW("wFront", 18, 5, 0.3, 0, 2.5, -7);
    mkW("wLeft",  0.3, 5, 28, -9, 2.5, 7);
    mkW("wRight", 0.3, 5, 28,  9, 2.5, 7);

    // Playtime sign on back wall
    const signMat = new StandardMaterial("sign", this._scene);
    signMat.diffuseColor = new Color3(1, 0.85, 0.0);
    signMat.emissiveColor = new Color3(0.4, 0.28, 0.0);
    const sign = MeshBuilder.CreateBox("sign", { width: 5, height: 0.8, depth: 0.12 }, this._scene);
    sign.position.set(0, 4.0, 19.85);
    sign.material = signMat;
    sign.isPickable = false;

    // Scattered toy blocks on the floor (decoration)
    const blockColors = [
      new Color3(0.9, 0.2, 0.2), new Color3(0.2, 0.5, 0.9),
      new Color3(0.9, 0.8, 0.1), new Color3(0.2, 0.8, 0.3),
    ];
    const blockPos = [
      [-3, 3], [2, 5], [-5, 7], [4, 9], [-2, 11], [5, 4],
    ] as [number, number][];
    blockPos.forEach(([bx, bz], i) => {
      const block = MeshBuilder.CreateBox(`block${i}`, { width: 0.8, height: 0.8, depth: 0.8 }, this._scene);
      block.position.set(bx, 0.4, bz);
      const bm = new StandardMaterial(`blockMat${i}`, this._scene);
      bm.diffuseColor = blockColors[i % blockColors.length];
      block.material = bm;
      block.isPickable = false;
    });

    // Round platform/tables in the middle (like the screenshot)
    const tableMat = new StandardMaterial("table", this._scene);
    tableMat.diffuseColor = new Color3(0.25, 0.20, 0.15);
    [[0, 6], [-3, 10], [3, 10]] .forEach(([tx, tz], i) => {
      const table = MeshBuilder.CreateBox(`table${i}`, { width: 1.5, height: 0.8, depth: 1.5 }, this._scene);
      table.position.set(tx, 0.4, tz);
      table.material = tableMat;
      table.isPickable = false;
    });

    // ── Bee Building Machine ────────────────────────────────────────────────
    const machineMat = new StandardMaterial("machine", this._scene);
    machineMat.diffuseColor = new Color3(0.3, 0.3, 0.4);
    machineMat.emissiveColor = new Color3(0.05, 0.05, 0.08);
    const machine = MeshBuilder.CreateBox("machine", { width: 2.5, height: 2.0, depth: 1.5 }, this._scene);
    machine.position.set(-6, 1.0, 15);
    machine.material = machineMat;
    machine.isPickable = false;

    // Machine button (green, on the front face)
    const btnMat = new StandardMaterial("machBtn", this._scene);
    btnMat.diffuseColor = new Color3(0.1, 0.9, 0.2);
    btnMat.emissiveColor = new Color3(0.0, 0.4, 0.05);
    this._machineBtn = MeshBuilder.CreateBox("machBtn", { width: 0.4, height: 0.4, depth: 0.3 }, this._scene);
    this._machineBtn.position.set(-6, 0.8, 14.2);
    this._machineBtn.material = btnMat;
    this._machineBtn.isPickable = false;

    // Machine label light
    const labelLight = new PointLight("machLight", new Vector3(-6, 2.5, 15), this._scene);
    labelLight.intensity = 0.5;
    labelLight.diffuse = new Color3(0.5, 1, 0.5);
    labelLight.range = 5;

    // Bee mesh (hidden until built)
    const beeMat = new StandardMaterial("bee", this._scene);
    beeMat.diffuseColor = new Color3(0.95, 0.80, 0.0);
    beeMat.emissiveColor = new Color3(0.3, 0.2, 0.0);
    this._beeMesh = MeshBuilder.CreateBox("bee", { width: 0.5, height: 0.4, depth: 0.3 }, this._scene);
    this._beeMesh.position.set(-6, 2.2, 14.8);
    this._beeMesh.material = beeMat;
    this._beeMesh.isPickable = false;
    this._beeMesh.setEnabled(false);

    // Vent door on back wall (locked until bee collected)
    const ventMat = new StandardMaterial("vent", this._scene);
    ventMat.diffuseColor = new Color3(0.22, 0.22, 0.28);
    ventMat.emissiveColor = new Color3(0.02, 0.02, 0.04);
    this._ventDoor = MeshBuilder.CreateBox("vent", { width: 1.2, height: 1.2, depth: 0.2 }, this._scene);
    this._ventDoor.position.set(7, 0.7, 19.85);
    this._ventDoor.material = ventMat;
    this._ventDoor.isPickable = false;

    // ── HUD & UI ────────────────────────────────────────────────────────────
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:12px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:white;font-family:'Arial Black',Arial;font-size:15px;font-weight:900;" +
      "padding:8px 24px;border-radius:20px;pointer-events:none;text-align:center;white-space:nowrap;";
    this._hud.textContent = "🐝 Find the bee machine and press the button!";
    this._wrap.appendChild(this._hud);

    this._interactHint = document.createElement("div");
    this._interactHint.style.cssText =
      "position:absolute;bottom:72px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:#00ffb2;font-family:Arial;font-size:14px;font-weight:bold;" +
      "padding:8px 20px;border-radius:12px;pointer-events:none;display:none;";
    this._wrap.appendChild(this._interactHint);

    // Progress bar (hidden until building)
    this._progressBar = document.createElement("div");
    this._progressBar.style.cssText =
      "position:absolute;bottom:110px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.7);border:2px solid rgba(255,255,255,0.2);border-radius:20px;" +
      "width:260px;height:22px;display:none;overflow:hidden;";
    this._progressFill = document.createElement("div");
    this._progressFill.style.cssText =
      "height:100%;width:0%;background:linear-gradient(90deg,#22c55e,#86efac);border-radius:20px;" +
      "transition:width 0.1s linear;";
    this._progressBar.appendChild(this._progressFill);
    this._wrap.appendChild(this._progressBar);

    const cross = document.createElement("div");
    cross.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:16px;height:16px;pointer-events:none;";
    cross.innerHTML =
      `<div style="position:absolute;top:7px;left:0;width:16px;height:2px;background:rgba(255,255,255,0.85);"></div>` +
      `<div style="position:absolute;left:7px;top:0;width:2px;height:16px;background:rgba(255,255,255,0.85);"></div>`;
    this._wrap.appendChild(cross);

    const ctrlHint = document.createElement("div");
    ctrlHint.style.cssText =
      "position:absolute;bottom:14px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.55);color:rgba(255,255,255,0.6);font-size:12px;" +
      "padding:6px 18px;border-radius:12px;pointer-events:none;font-family:Arial;white-space:nowrap;";
    ctrlHint.textContent = "Click to look · WASD to move · Press E to interact";
    this._wrap.appendChild(ctrlHint);

    const exitBtn = document.createElement("button");
    exitBtn.textContent = "✕ Exit";
    exitBtn.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.55);color:white;" +
      "padding:7px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.3);" +
      "cursor:pointer;font-size:13px;font-family:Arial;";
    exitBtn.onclick = () => this._cleanup();
    this._wrap.appendChild(exitBtn);

    this._wrap.addEventListener("click", () => {
      if (!this._paused) this._wrap.requestPointerLock();
    });
    document.addEventListener("pointerlockchange", this._onLockChange);
    document.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("keydown", this._onKey);
    window.addEventListener("keyup", this._onKeyUp);

    this._renderFn = () => {
      if (!this._wrap.isConnected) return;
      if (!this._paused) this._tick();
      this._scene.render();
    };
    this._g.engine.runRenderLoop(this._renderFn);
  }

  private _onLockChange = () => {
    this._pointerLocked = document.pointerLockElement === this._wrap;
  };

  private _onMouseMove = (e: MouseEvent) => {
    if (!this._pointerLocked || this._paused) return;
    this._yaw += e.movementX * 0.002;
    this._camera.rotation.y = this._yaw;
  };

  private _onKey = (e: KeyboardEvent) => {
    this._keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "e") this._tryInteract();
  };

  private _onKeyUp = (e: KeyboardEvent) => {
    this._keys[e.key.toLowerCase()] = false;
  };

  private _tick(): void {
    const speed = 0.09;
    const cam = this._camera;
    const cosY = Math.cos(this._yaw);
    const sinY = Math.sin(this._yaw);
    let dx = 0, dz = 0;

    if (this._keys["w"] || this._keys["arrowup"])    { dx +=  sinY; dz +=  cosY; }
    if (this._keys["s"] || this._keys["arrowdown"])  { dx += -sinY; dz += -cosY; }
    if (this._keys["a"] || this._keys["arrowleft"])  { dx += -cosY; dz +=  sinY; }
    if (this._keys["d"] || this._keys["arrowright"]) { dx +=  cosY; dz += -sinY; }

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) { dx = (dx / len) * speed; dz = (dz / len) * speed; }

    const r = 0.45;
    const nx = Math.max(-8.5 + r, Math.min(8.5 - r, cam.position.x + dx));
    const nz = Math.max(-6.5 + r, Math.min(19.5 - r, cam.position.z + dz));
    cam.position.x = nx;
    cam.position.z = nz;
    cam.position.y = 1.6;

    this._updateInteractHint();
  }

  private _getNearby(): "machine" | "bee" | "vent" | null {
    const cam = this._camera.position;
    if (!this._building && !this._beeReady &&
        Vector3.Distance(cam, this._machineBtn.position) < 2.5) return "machine";
    if (this._beeReady && this._beeMesh.isEnabled() &&
        Vector3.Distance(cam, this._beeMesh.position) < 2.5) return "bee";
    if (this._beeReady && !this._beeMesh.isEnabled() &&
        Vector3.Distance(cam, this._ventDoor.position) < 2.5) return "vent";
    return null;
  }

  private _updateInteractHint(): void {
    const n = this._getNearby();
    if (!n) { this._interactHint.style.display = "none"; return; }
    this._interactHint.style.display = "block";
    if (n === "machine") this._interactHint.textContent = "Press E — Build Bee Toy";
    else if (n === "bee") this._interactHint.textContent = "Press E — Collect Bee 🐝";
    else this._interactHint.textContent = "Press E — Enter vent";
  }

  private _tryInteract(): void {
    if (this._paused) return;
    const n = this._getNearby();
    if (n === "machine") this._startBuilding();
    else if (n === "bee") this._collectBee();
    else if (n === "vent") this._enterVent();
  }

  private _startBuilding(): void {
    this._building = true;
    this._hud.textContent = "🐝 Building bee toy… don't move!";
    this._progressBar.style.display = "block";

    // Dim the button
    (this._machineBtn.material as StandardMaterial).emissiveColor = new Color3(0, 0.1, 0);

    let pct = 0;
    const interval = setInterval(() => {
      pct += 2;
      this._progressFill.style.width = `${pct}%`;
      if (pct >= 100) {
        clearInterval(interval);
        this._progressBar.style.display = "none";
        this._building = false;
        this._beeReady = true;
        this._beeMesh.setEnabled(true);
        this._hud.style.color = "#facc15";
        this._hud.textContent = "🐝 Bee toy ready! Go collect it.";
        // Bee glows
        (this._beeMesh.material as StandardMaterial).emissiveColor = new Color3(0.6, 0.4, 0.0);
      }
    }, 60); // ~3 seconds total
  }

  private _collectBee(): void {
    this._beeMesh.setEnabled(false);
    this._hud.style.color = "#22c55e";
    this._hud.textContent = "🐝 Bee collected! Now find the vent and crawl through!";
    // Vent glows to guide player
    (this._ventDoor.material as StandardMaterial).emissiveColor = new Color3(0.1, 0.3, 0.1);
  }

  private _enterVent(): void {
    this._paused = true;
    if (document.pointerLockElement) document.exitPointerLock();

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:#000;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;text-align:center;padding:20px;";
    ov.innerHTML = `
      <div style="font-size:52px;margin-bottom:12px;">🕳️</div>
      <div style="color:white;font-size:20px;font-weight:900;margin-bottom:8px;">You crawl into the vent…</div>
      <div style="color:rgba(255,255,255,0.45);font-size:14px;line-height:1.7;">
        It's dark.<br>Something is behind you.<br>
        <span style="color:#ef4444;">…Huggy is back.</span>
      </div>`;
    this._wrap.appendChild(ov);

    setTimeout(() => {
      this._cleanup(false);
      import("./PoppyVents").then(m => new m.PoppyVents(this._g));
    }, 2500);
  }

  private _cleanup(goArcade = true): void {
    if (document.pointerLockElement) document.exitPointerLock();
    document.removeEventListener("pointerlockchange", this._onLockChange);
    document.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("keydown", this._onKey);
    window.removeEventListener("keyup", this._onKeyUp);
    this._g.engine.stopRenderLoop(this._renderFn);
    this._scene.dispose();
    this._wrap.remove();
    this._g.inMiniGame = false;
    if (goArcade) this._g.goArcade();
  }
}
