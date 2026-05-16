import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Final scene — long hallway, Poppy's cage at the end
// Walk up, press E to open cage
// Poppy's face fills the screen → black → chapter ends

export class PoppyHallway {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;
  private _camera!: FreeCamera;
  private _keys: Record<string, boolean> = {};
  private _yaw = 0;
  private _pointerLocked = false;
  private _renderFn!: () => void;
  private _paused = false;

  private _cageMesh!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _poppyMesh!: ReturnType<typeof MeshBuilder.CreateBox>;

  private _hud!: HTMLDivElement;
  private _interactHint!: HTMLDivElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText = "position:absolute;inset:0;pointer-events:all;overflow:hidden;cursor:crosshair;";
    g.ui.appendChild(this._wrap);
    this._build();
  }

  private _build(): void {
    this._scene = new Scene(this._g.engine);
    this._scene.clearColor = new Color4(0.01, 0.01, 0.02, 1);
    this._scene.fogMode = 3;
    this._scene.fogColor = new Color3(0.01, 0.01, 0.02);
    this._scene.fogStart = 6;
    this._scene.fogEnd = 20;

    // Player at hall entrance
    this._camera = new FreeCamera("cam", new Vector3(0, 1.6, 0), this._scene);
    this._camera.minZ = 0.1;
    this._camera.speed = 0;

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this._scene);
    hemi.intensity = 0.15;
    hemi.diffuse = new Color3(0.6, 0.6, 0.9);

    // Flickering lights down the hallway
    const addLight = (z: number, intensity: number) => {
      const l = new PointLight(`hl${z}`, new Vector3(0, 4, z), this._scene);
      l.intensity = intensity;
      l.diffuse = new Color3(1, 0.9, 0.7);
      l.range = 8;
    };
    addLight(5, 0.4); addLight(12, 0.3); addLight(20, 0.5); addLight(28, 0.6);

    // Soft pink glow at the end (Poppy's cage)
    const poppyLight = new PointLight("poppyLight", new Vector3(0, 2, 32), this._scene);
    poppyLight.intensity = 0.8;
    poppyLight.diffuse = new Color3(1, 0.5, 0.7);
    poppyLight.range = 10;

    const wallMat = new StandardMaterial("wall", this._scene);
    wallMat.diffuseColor = new Color3(0.12, 0.12, 0.18);
    const floorMat = new StandardMaterial("floor", this._scene);
    floorMat.diffuseColor = new Color3(0.14, 0.12, 0.10);
    const ceilMat = new StandardMaterial("ceil", this._scene);
    ceilMat.diffuseColor = new Color3(0.08, 0.08, 0.10);

    // Hallway — long and narrow
    const floor = MeshBuilder.CreateBox("floor", { width: 6, height: 0.1, depth: 38 }, this._scene);
    floor.position.set(0, -0.05, 18); floor.material = floorMat; floor.isPickable = false;

    const ceil = MeshBuilder.CreateBox("ceil", { width: 6, height: 0.1, depth: 38 }, this._scene);
    ceil.position.set(0, 5, 18); ceil.material = ceilMat; ceil.isPickable = false;

    const mkW = (n: string, w: number, h: number, d: number, x: number, y: number, z: number) => {
      const m = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, this._scene);
      m.position.set(x, y, z); m.material = wallMat; m.isPickable = false;
    };
    mkW("wL", 0.3, 5, 38, -3, 2.5, 18);
    mkW("wR", 0.3, 5, 38,  3, 2.5, 18);
    mkW("wF", 6, 5, 0.3, 0, 2.5, -1);
    mkW("wB", 6, 5, 0.3, 0, 2.5, 37);

    // Cage bars around Poppy (vertical bars)
    const barMat = new StandardMaterial("bar", this._scene);
    barMat.diffuseColor = new Color3(0.45, 0.42, 0.38);
    barMat.specularColor = new Color3(0.6, 0.6, 0.6);

    const cageZ = 33;
    const barPositions = [-1, -0.5, 0, 0.5, 1];
    for (const bx of barPositions) {
      const bar = MeshBuilder.CreateBox(`bar${bx}`, { width: 0.08, height: 3, depth: 0.08 }, this._scene);
      bar.position.set(bx, 1.5, cageZ); bar.material = barMat; bar.isPickable = false;
    }
    // Cage top/bottom bars
    const cageTop = MeshBuilder.CreateBox("cageTop", { width: 2.2, height: 0.08, depth: 0.08 }, this._scene);
    cageTop.position.set(0, 3, cageZ); cageTop.material = barMat; cageTop.isPickable = false;
    const cageBot = MeshBuilder.CreateBox("cageBot", { width: 2.2, height: 0.08, depth: 0.08 }, this._scene);
    cageBot.position.set(0, 0.1, cageZ); cageBot.material = barMat; cageBot.isPickable = false;

    this._cageMesh = MeshBuilder.CreateBox("cage", { width: 2.2, height: 0.08, depth: 0.08 }, this._scene);
    this._cageMesh.position.set(0, 1.5, cageZ - 0.5);
    this._cageMesh.material = barMat; this._cageMesh.isPickable = false;

    // Poppy — small doll body (blue dress)
    const bodyMat = new StandardMaterial("poppyBody", this._scene);
    bodyMat.diffuseColor = new Color3(0.25, 0.45, 0.85);
    bodyMat.emissiveColor = new Color3(0.04, 0.08, 0.18);
    this._poppyMesh = MeshBuilder.CreateBox("poppy", { width: 0.45, height: 0.55, depth: 0.3 }, this._scene);
    this._poppyMesh.position.set(0, 0.35, cageZ + 0.3);
    this._poppyMesh.material = bodyMat; this._poppyMesh.isPickable = false;

    // Head — pale
    const headMat = new StandardMaterial("poppyHead", this._scene);
    headMat.diffuseColor = new Color3(0.95, 0.90, 0.85);
    headMat.emissiveColor = new Color3(0.08, 0.06, 0.05);
    const head = MeshBuilder.CreateBox("poppyHead", { width: 0.38, height: 0.38, depth: 0.3 }, this._scene);
    head.position.set(0, 0.84, cageZ + 0.3);
    head.material = headMat; head.isPickable = false;

    // Left pigtail — red curly puff
    const hairMat = new StandardMaterial("poppyHair", this._scene);
    hairMat.diffuseColor = new Color3(0.75, 0.08, 0.05);
    hairMat.emissiveColor = new Color3(0.15, 0.01, 0.01);
    const hairL = MeshBuilder.CreateBox("hairL", { width: 0.28, height: 0.28, depth: 0.28 }, this._scene);
    hairL.position.set(-0.28, 0.96, cageZ + 0.3);
    hairL.material = hairMat; hairL.isPickable = false;

    // Right pigtail
    const hairR = MeshBuilder.CreateBox("hairR", { width: 0.28, height: 0.28, depth: 0.28 }, this._scene);
    hairR.position.set(0.28, 0.96, cageZ + 0.3);
    hairR.material = hairMat; hairR.isPickable = false;

    // HUD
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:12px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:white;font-family:'Arial Black',Arial;font-size:15px;font-weight:900;" +
      "padding:8px 24px;border-radius:20px;pointer-events:none;text-align:center;white-space:nowrap;";
    this._hud.textContent = "…Something is at the end of the hallway.";
    this._wrap.appendChild(this._hud);

    this._interactHint = document.createElement("div");
    this._interactHint.style.cssText =
      "position:absolute;bottom:72px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:#ffb0cc;font-family:Arial;font-size:14px;font-weight:bold;" +
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
    const cam = this._camera;
    const cosY = Math.cos(this._yaw), sinY = Math.sin(this._yaw);
    let dx = 0, dz = 0;

    if (this._keys["w"] || this._keys["arrowup"])    { dx +=  sinY; dz +=  cosY; }
    if (this._keys["s"] || this._keys["arrowdown"])  { dx += -sinY; dz += -cosY; }
    if (this._keys["a"] || this._keys["arrowleft"])  { dx += -cosY; dz +=  sinY; }
    if (this._keys["d"] || this._keys["arrowright"]) { dx +=  cosY; dz += -sinY; }

    const len = Math.sqrt(dx * dx + dz * dz);
    const speed = 0.09;
    if (len > 0) { dx = (dx / len) * speed; dz = (dz / len) * speed; }

    cam.position.x = Math.max(-2.5, Math.min(2.5, cam.position.x + dx));
    cam.position.z = Math.max(0.3, Math.min(31, cam.position.z + dz));
    cam.position.y = 1.6;

    // HUD changes as you get close
    if (cam.position.z > 20 && this._hud.textContent?.startsWith("…")) {
      this._hud.textContent = "It's… a cage. Someone is inside.";
    }
    if (cam.position.z > 26) {
      this._hud.style.color = "#ffb0cc";
      this._hud.textContent = "🌸 It's Poppy.";
    }

    this._updateInteractHint();
  }

  private _getNearby(): "cage" | null {
    if (Vector3.Distance(this._camera.position, this._poppyMesh.position) < 3.5)
      return "cage";
    return null;
  }

  private _updateInteractHint(): void {
    const n = this._getNearby();
    if (!n) { this._interactHint.style.display = "none"; return; }
    this._interactHint.style.display = "block";
    this._interactHint.textContent = "Press E — Open cage 🌸";
  }

  private _tryInteract(): void {
    if (this._paused) return;
    if (!this._getNearby()) return;
    this._openCage();
  }

  private _openCage(): void {
    this._paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this._cageMesh.setEnabled(false);

    // Fade to Poppy's face then black — chapter end
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:#000;display:flex;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;transition:background 1s;";
    this._wrap.appendChild(ov);

    // Step 1: cage opens
    ov.innerHTML = `<div style="color:rgba(255,255,255,0.6);font-size:16px;">The cage swings open…</div>`;

    setTimeout(() => {
      // Step 2: Poppy's face fills the screen
      ov.style.background = "#1a0010";
      ov.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:120px;line-height:1;">🌸</div>
          <div style="color:#ffb0cc;font-size:11px;letter-spacing:4px;margin-top:8px;opacity:0.7;">POPPY</div>
        </div>`;
    }, 1500);

    setTimeout(() => {
      // Step 3: black screen
      ov.style.background = "#000";
      ov.innerHTML = "";
    }, 3500);

    setTimeout(() => {
      // Chapter end card
      ov.innerHTML = `
        <div style="text-align:center;padding:20px;">
          <div style="color:rgba(255,255,255,0.3);font-size:12px;letter-spacing:4px;margin-bottom:24px;">CHAPTER 1</div>
          <div style="color:white;font-size:32px;font-weight:900;margin-bottom:8px;">THE END</div>
          <div style="color:rgba(255,255,255,0.4);font-size:14px;margin-bottom:48px;">
            You survived Playtime Co.<br>For now.
          </div>
          <button id="chapterDone" style="
            background:linear-gradient(135deg,#ff6ec7,#a855f7);
            color:white;font-size:16px;font-weight:bold;
            padding:14px 40px;border-radius:30px;border:none;cursor:pointer;
            box-shadow:0 0 30px rgba(168,85,247,0.4);">← Back to Arcade</button>
        </div>`;
      document.getElementById("chapterDone")!.onclick = () => {
        this._cleanup(false);
        import("./PoppyChapter2").then(m => new m.PoppyChapter2(this._g));
      };
    }, 5000);
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
