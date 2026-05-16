import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Second electrical area — same idea, different layout
// Press button 1, navigate around poles, press button 2
// Then door opens to the final hallway

export class PoppyElectrical2 {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;
  private _camera!: FreeCamera;
  private _keys: Record<string, boolean> = {};
  private _yaw = 0;
  private _pointerLocked = false;
  private _renderFn!: () => void;
  private _paused = false;

  private _btn1Pressed = false;
  private _btn2Pressed = false;
  private _btn1Mesh!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _btn2Mesh!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _exitDoor!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _ambientLight!: HemisphericLight;
  private _powerLights: PointLight[] = [];

  private _hud!: HTMLDivElement;
  private _interactHint!: HTMLDivElement;

  // Different pole layout from electrical area 1
  private static POLES: [number, number][] = [
    [2, 3], [-3, 5],
    [4, 8], [-1, 10],
    [3, 13], [-4, 15],
    [1, 18],
  ];

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
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:#000;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;text-align:center;padding:20px;";
    ov.innerHTML = `
      <div style="font-size:52px;margin-bottom:12px;">⚡</div>
      <div style="color:#facc15;font-size:20px;font-weight:900;margin-bottom:8px;">Another electrical room…</div>
      <div style="color:rgba(255,255,255,0.45);font-size:14px;line-height:1.7;">
        The power is out again.<br>Find the two buttons.
      </div>`;
    this._wrap.appendChild(ov);
    setTimeout(() => { ov.remove(); this._build(); }, 2000);
  }

  private _build(): void {
    this._scene = new Scene(this._g.engine);
    this._scene.clearColor = new Color4(0.01, 0.01, 0.02, 1);
    this._scene.fogMode = 3;
    this._scene.fogColor = new Color3(0.01, 0.01, 0.02);
    this._scene.fogStart = 4;
    this._scene.fogEnd = 13;

    this._camera = new FreeCamera("cam", new Vector3(0, 1.6, -2), this._scene);
    this._camera.minZ = 0.1;
    this._camera.speed = 0;

    this._ambientLight = new HemisphericLight("hemi", new Vector3(0, 1, 0), this._scene);
    this._ambientLight.intensity = 0.07;
    this._ambientLight.diffuse = new Color3(0.4, 0.5, 1.0);

    // Red emergency light
    const red = new PointLight("red", new Vector3(0, 3.5, 0), this._scene);
    red.intensity = 0.5;
    red.diffuse = new Color3(1, 0.08, 0.05);
    red.range = 8;

    // Power lights (off at start)
    const addPower = (x: number, z: number) => {
      const l = new PointLight(`pw${x}_${z}`, new Vector3(x, 4, z), this._scene);
      l.intensity = 0;
      l.diffuse = new Color3(1, 0.95, 0.75);
      l.range = 12;
      this._powerLights.push(l);
    };
    addPower(-3, 5); addPower(3, 5);
    addPower(-3, 12); addPower(3, 12);
    addPower(0, 19);

    const floorMat = new StandardMaterial("floor", this._scene);
    floorMat.diffuseColor = new Color3(0.12, 0.12, 0.14);
    const wallMat = new StandardMaterial("wall", this._scene);
    wallMat.diffuseColor = new Color3(0.10, 0.10, 0.16);
    const ceilMat = new StandardMaterial("ceil", this._scene);
    ceilMat.diffuseColor = new Color3(0.08, 0.08, 0.10);
    const poleMat = new StandardMaterial("pole", this._scene);
    poleMat.diffuseColor = new Color3(0.28, 0.28, 0.33);
    poleMat.specularColor = new Color3(0.5, 0.5, 0.5);

    const floor = MeshBuilder.CreateBox("floor", { width: 14, height: 0.1, depth: 26 }, this._scene);
    floor.position.set(0, -0.05, 10); floor.material = floorMat; floor.isPickable = false;

    const ceil = MeshBuilder.CreateBox("ceil", { width: 14, height: 0.1, depth: 26 }, this._scene);
    ceil.position.set(0, 5, 10); ceil.material = ceilMat; ceil.isPickable = false;

    const mkW = (n: string, w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, this._scene);
      m.position.set(x, y, z); m.material = wallMat; m.isPickable = false;
    };
    mkW("wB", 14, 5, 0.3, 0, 2.5, 23);
    mkW("wF", 14, 5, 0.3, 0, 2.5, -4);
    mkW("wL", 0.3, 5, 30, -7, 2.5, 10);
    mkW("wR", 0.3, 5, 30,  7, 2.5, 10);

    // Poles with warning stripes
    for (const [px, pz] of PoppyElectrical2.POLES) {
      const pole = MeshBuilder.CreateBox(`pole${px}_${pz}`, { width: 0.5, height: 5, depth: 0.5 }, this._scene);
      pole.position.set(px, 2.5, pz); pole.material = poleMat; pole.isPickable = false;

      const stripe = MeshBuilder.CreateBox(`str${px}_${pz}`, { width: 0.52, height: 0.25, depth: 0.52 }, this._scene);
      stripe.position.set(px, 1.2, pz);
      const sm = new StandardMaterial(`strm${px}_${pz}`, this._scene);
      sm.diffuseColor = new Color3(0.9, 0.8, 0.0);
      sm.emissiveColor = new Color3(0.2, 0.15, 0.0);
      stripe.material = sm; stripe.isPickable = false;
    }

    // Button 1 — left wall near entrance
    const b1Mat = new StandardMaterial("b1", this._scene);
    b1Mat.diffuseColor = new Color3(0.9, 0.2, 0.1);
    b1Mat.emissiveColor = new Color3(0.6, 0.05, 0.0);
    this._btn1Mesh = MeshBuilder.CreateBox("btn1", { width: 0.4, height: 0.4, depth: 0.4 }, this._scene);
    this._btn1Mesh.position.set(-6.7, 1.5, 1); this._btn1Mesh.material = b1Mat; this._btn1Mesh.isPickable = false;

    // Button 2 — right wall far end
    const b2Mat = new StandardMaterial("b2", this._scene);
    b2Mat.diffuseColor = new Color3(0.2, 0.2, 0.9);
    b2Mat.emissiveColor = new Color3(0.0, 0.0, 0.4);
    this._btn2Mesh = MeshBuilder.CreateBox("btn2", { width: 0.4, height: 0.4, depth: 0.4 }, this._scene);
    this._btn2Mesh.position.set(6.7, 1.5, 21);
    this._btn2Mesh.material = b2Mat; this._btn2Mesh.isPickable = false;
    this._btn2Mesh.setEnabled(false);

    // Exit door (back wall)
    const doorMat = new StandardMaterial("door", this._scene);
    doorMat.diffuseColor = new Color3(0.2, 0.5, 0.2);
    doorMat.emissiveColor = new Color3(0.0, 0.15, 0.0);
    this._exitDoor = MeshBuilder.CreateBox("door", { width: 4, height: 3.5, depth: 0.3 }, this._scene);
    this._exitDoor.position.set(0, 1.75, 22.85);
    this._exitDoor.material = doorMat; this._exitDoor.isPickable = false;
    this._exitDoor.setEnabled(false);

    // HUD & UI
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:12px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:white;font-family:'Arial Black',Arial;font-size:15px;font-weight:900;" +
      "padding:8px 24px;border-radius:20px;pointer-events:none;text-align:center;white-space:nowrap;";
    this._hud.textContent = "⚡ Find the RED button!";
    this._wrap.appendChild(this._hud);

    this._interactHint = document.createElement("div");
    this._interactHint.style.cssText =
      "position:absolute;bottom:72px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:#00ffb2;font-family:Arial;font-size:14px;font-weight:bold;" +
      "padding:8px 20px;border-radius:12px;pointer-events:none;display:none;";
    this._wrap.appendChild(this._interactHint);

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

  private _onLockChange = () => { this._pointerLocked = document.pointerLockElement === this._wrap; };
  private _onMouseMove = (e: MouseEvent) => {
    if (!this._pointerLocked || this._paused) return;
    this._yaw += e.movementX * 0.002;
    this._camera.rotation.y = this._yaw;
  };
  private _onKey = (e: KeyboardEvent) => {
    this._keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "e") this._tryInteract();
  };
  private _onKeyUp = (e: KeyboardEvent) => { this._keys[e.key.toLowerCase()] = false; };

  private _tick(): void {
    const speed = 0.09;
    const cam = this._camera;
    const cosY = Math.cos(this._yaw), sinY = Math.sin(this._yaw);
    let dx = 0, dz = 0;

    if (this._keys["w"] || this._keys["arrowup"])    { dx +=  sinY; dz +=  cosY; }
    if (this._keys["s"] || this._keys["arrowdown"])  { dx += -sinY; dz += -cosY; }
    if (this._keys["a"] || this._keys["arrowleft"])  { dx += -cosY; dz +=  sinY; }
    if (this._keys["d"] || this._keys["arrowright"]) { dx +=  cosY; dz += -sinY; }

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) { dx = (dx / len) * speed; dz = (dz / len) * speed; }

    let nx = Math.max(-6.5, Math.min(6.5, cam.position.x + dx));
    let nz = Math.max(-3.5, Math.min(22.5, cam.position.z + dz));

    // Pole collision
    for (const [px, pz] of PoppyElectrical2.POLES) {
      const diffX = nx - px, diffZ = nz - pz;
      const dist = Math.sqrt(diffX * diffX + diffZ * diffZ);
      if (dist < 0.9) { nx = px + (diffX / dist) * 0.9; nz = pz + (diffZ / dist) * 0.9; }
    }

    cam.position.x = nx; cam.position.z = nz; cam.position.y = 1.6;
    this._updateInteractHint();
  }

  private _getNearby(): "btn1" | "btn2" | "exit" | null {
    const cam = this._camera.position;
    if (!this._btn1Pressed && Vector3.Distance(cam, this._btn1Mesh.position) < 2.2) return "btn1";
    if (this._btn1Pressed && !this._btn2Pressed && this._btn2Mesh.isEnabled() &&
        Vector3.Distance(cam, this._btn2Mesh.position) < 2.2) return "btn2";
    if (this._btn2Pressed && this._exitDoor.isEnabled() &&
        Vector3.Distance(cam, this._exitDoor.position) < 3.5) return "exit";
    return null;
  }

  private _updateInteractHint(): void {
    const n = this._getNearby();
    if (!n) { this._interactHint.style.display = "none"; return; }
    this._interactHint.style.display = "block";
    if (n === "btn1") this._interactHint.textContent = "Press E — Red Power Button";
    else if (n === "btn2") this._interactHint.textContent = "Press E — Blue Power Button";
    else this._interactHint.textContent = "Press E — Enter hallway";
  }

  private _tryInteract(): void {
    if (this._paused) return;
    const n = this._getNearby();
    if (n === "btn1") this._pressBtn1();
    else if (n === "btn2") this._pressBtn2();
    else if (n === "exit") this._enterHallway();
  }

  private _pressBtn1(): void {
    this._btn1Pressed = true;
    (this._btn1Mesh.material as StandardMaterial).emissiveColor = new Color3(0.1, 0, 0);
    this._flickerLights(0.4, () => {
      this._scene.fogEnd = 20;
      this._ambientLight.intensity = 0.22;
      this._hud.style.color = "#facc15";
      this._hud.textContent = "⚡ Half power! Find the BLUE button!";
      this._btn2Mesh.setEnabled(true);
    });
  }

  private _pressBtn2(): void {
    this._btn2Pressed = true;
    (this._btn2Mesh.material as StandardMaterial).emissiveColor = new Color3(0, 0, 0.1);
    this._flickerLights(1.2, () => {
      this._scene.fogEnd = 38; this._scene.fogStart = 20;
      this._ambientLight.intensity = 0.5;
      this._hud.style.color = "#22c55e";
      this._hud.textContent = "✓ Power on! The hallway door is open!";
      this._exitDoor.setEnabled(true);
      (this._exitDoor.material as StandardMaterial).emissiveColor = new Color3(0, 0.5, 0.1);
    });
  }

  private _flickerLights(target: number, onDone: () => void): void {
    let ticks = 0;
    const iv = setInterval(() => {
      const on = ticks % 2 === 0;
      for (const l of this._powerLights) l.intensity = on ? target * 0.6 : 0;
      ticks++;
      if (ticks >= 12) { clearInterval(iv); for (const l of this._powerLights) l.intensity = target; onDone(); }
    }, 80);
  }

  private _enterHallway(): void {
    this._paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:#000;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;text-align:center;";
    ov.innerHTML = `
      <div style="font-size:52px;margin-bottom:12px;">🚪</div>
      <div style="color:white;font-size:20px;font-weight:900;margin-bottom:8px;">You enter the hallway…</div>
      <div style="color:rgba(255,255,255,0.4);font-size:14px;">Something is waiting at the end.</div>`;
    this._wrap.appendChild(ov);
    setTimeout(() => {
      this._cleanup(false);
      import("./PoppyHallway").then(m => new m.PoppyHallway(this._g));
    }, 2000);
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
