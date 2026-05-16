import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Chapter 2 opening:
//  hallway1  → walk from chapter 1 exit to hub
//  hub       → red locked door + left hallway + right hallway
//  leftHall  → hole, swing with blue grabpack hand, grab key 1
//  rightHall → hole, swing with red grabpack hand, grab key 2
//  redDoor   → open with both keys → long hallway → short hallway → poppy flower key
//  (more to come)

type Area = "hallway1" | "hub" | "leftHall" | "rightHall" | "longHall" | "shortHall";

export class PoppyChapter2 {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;
  private _camera!: FreeCamera;
  private _keys: Record<string, boolean> = {};
  private _yaw = 0;
  private _pointerLocked = false;
  private _renderFn!: () => void;
  private _paused = false;

  private _area: Area = "hallway1";
  private _hasKey1 = false;
  private _hasKey2 = false;
  private _hasPoppyKey = false;

  // Grabpack swing state
  private _swinging = false;
  private _swingProgress = 0;
  private _swingStart = new Vector3();
  private _swingEnd = new Vector3();
  private _swingHand: "blue" | "red" = "blue";

  private _hud!: HTMLDivElement;
  private _interactHint!: HTMLDivElement;
  private _grabpackEl!: HTMLDivElement;

  // Meshes that vary per area
  private _interactables: Array<{
    mesh: ReturnType<typeof MeshBuilder.CreateBox>;
    type: "swing-left" | "swing-right" | "key1" | "key2" | "redDoor" | "poppyKey" | "poppyDoor";
    swingTo?: Vector3;
  }> = [];

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText = "position:absolute;inset:0;pointer-events:all;overflow:hidden;cursor:crosshair;";
    g.ui.appendChild(this._wrap);
    this._showIntro();
  }

  private _showIntro(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:#000;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;text-align:center;padding:20px;";
    ov.innerHTML = `
      <div style="color:rgba(255,255,255,0.3);font-size:11px;letter-spacing:4px;margin-bottom:20px;">CHAPTER 2</div>
      <div style="color:white;font-size:26px;font-weight:900;margin-bottom:12px;">FLY IN A WEB</div>
      <div style="color:rgba(255,255,255,0.45);font-size:14px;line-height:1.7;">
        Poppy is free.<br>But the factory is far from done with you.
      </div>`;
    this._wrap.appendChild(ov);
    setTimeout(() => { ov.remove(); this._buildArea("hallway1"); }, 3000);
  }

  private _buildArea(area: Area): void {
    // Clean up previous scene if any
    if (this._scene) {
      this._g.engine.stopRenderLoop(this._renderFn);
      this._scene.dispose();
    }
    this._interactables = [];
    this._area = area;

    this._scene = new Scene(this._g.engine);
    this._scene.clearColor = new Color4(0.01, 0.01, 0.02, 1);
    this._scene.fogMode = 3;
    this._scene.fogColor = new Color3(0.01, 0.01, 0.02);
    this._scene.fogStart = 8;
    this._scene.fogEnd = 22;

    this._camera = new FreeCamera("cam", new Vector3(0, 1.6, 0), this._scene);
    this._camera.minZ = 0.1;
    this._camera.speed = 0;
    this._yaw = 0;
    this._camera.rotation.y = 0;

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this._scene);
    hemi.intensity = 0.2;
    hemi.diffuse = new Color3(0.7, 0.7, 1.0);

    const wallMat = new StandardMaterial("wall", this._scene);
    wallMat.diffuseColor = new Color3(0.12, 0.12, 0.18);
    const floorMat = new StandardMaterial("floor", this._scene);
    floorMat.diffuseColor = new Color3(0.14, 0.12, 0.10);
    const ceilMat = new StandardMaterial("ceil", this._scene);
    ceilMat.diffuseColor = new Color3(0.08, 0.08, 0.10);

    const mkBox = (n: string, w: number, h: number, d: number, x: number, y: number, z: number, mat: StandardMaterial) => {
      const m = MeshBuilder.CreateBox(n, { width: w, height: h, depth: d }, this._scene);
      m.position.set(x, y, z); m.material = mat; m.isPickable = false; return m;
    };
    const addLight = (x: number, y: number, z: number, intensity: number, color = new Color3(1, 0.9, 0.7)) => {
      const l = new PointLight(`l${x}_${z}`, new Vector3(x, y, z), this._scene);
      l.intensity = intensity; l.diffuse = color; l.range = 10;
      return l;
    };

    if (area === "hallway1") {
      // Long hallway from chapter 1 exit to hub
      mkBox("floor", 6, 0.1, 30, 0, -0.05, 14, floorMat);
      mkBox("ceil",  6, 0.1, 30, 0,  5,    14, ceilMat);
      mkBox("wL", 0.3, 5, 30, -3, 2.5, 14, wallMat);
      mkBox("wR", 0.3, 5, 30,  3, 2.5, 14, wallMat);
      mkBox("wF", 6, 5, 0.3,  0, 2.5, -1, wallMat);
      addLight(0, 4, 8, 0.5); addLight(0, 4, 20, 0.4);

      // Exit trigger at end
      const exit = mkBox("exit", 4, 4, 0.3, 0, 2, 29, (() => {
        const m = new StandardMaterial("exitMat", this._scene);
        m.diffuseColor = new Color3(0.1, 0.1, 0.15); return m;
      })());
      this._interactables.push({ mesh: exit, type: "redDoor" }); // reuse type as "proceed"

      this._hud.textContent = "Follow the hallway…";

    } else if (area === "hub") {
      // Hub: center area, red door ahead, left/right hallway entrances
      mkBox("floor", 14, 0.1, 14, 0, -0.05, 6, floorMat);
      mkBox("ceil",  14, 0.1, 14, 0,  5,    6, ceilMat);
      mkBox("wF", 14, 5, 0.3, 0, 2.5, -1, wallMat);
      mkBox("wB", 14, 5, 0.3, 0, 2.5, 13, wallMat);
      // Left/right walls with openings for side hallways
      mkBox("wLL", 0.3, 5, 6, -7, 2.5, 2, wallMat);
      mkBox("wLR", 0.3, 5, 4, -7, 2.5, 10, wallMat);
      mkBox("wRL", 0.3, 5, 6,  7, 2.5, 2, wallMat);
      mkBox("wRR", 0.3, 5, 4,  7, 2.5, 10, wallMat);

      addLight(-3, 4, 4, 0.4); addLight(3, 4, 4, 0.4); addLight(0, 4, 10, 0.3);

      // Red door in back wall
      const redDoorMat = new StandardMaterial("redDoor", this._scene);
      redDoorMat.diffuseColor = new Color3(0.6, 0.05, 0.05);
      redDoorMat.emissiveColor = this._hasKey1 && this._hasKey2
        ? new Color3(0.3, 0.0, 0.0) : new Color3(0.12, 0.0, 0.0);
      const redDoor = mkBox("redDoor", 3, 4, 0.25, 0, 2, 12.85, redDoorMat);
      this._interactables.push({ mesh: redDoor, type: "redDoor" });

      // Left hallway entrance sign
      addLight(-7, 3, 6, 0.6, new Color3(0.4, 0.6, 1));
      // Right hallway entrance sign
      addLight(7, 3, 6, 0.6, new Color3(1, 0.4, 0.4));

      // Key indicators in HUD
      const k1 = this._hasKey1 ? "🗝️" : "○";
      const k2 = this._hasKey2 ? "🗝️" : "○";
      this._hud.style.color = "";
      this._hud.textContent = `Key 1: ${k1}  Key 2: ${k2}  — Find both keys!`;

    } else if (area === "leftHall" || area === "rightHall") {
      const isLeft = area === "leftHall";
      // Hallway with a hole in the middle
      mkBox("floor1", 4, 0.1, 8,  0, -0.05, 3, floorMat);
      mkBox("floor2", 4, 0.1, 8,  0, -0.05, 18, floorMat);
      mkBox("ceil",   4, 0.1, 26, 0,  5,    12, ceilMat);
      mkBox("wL", 0.3, 5, 26, -2, 2.5, 12, wallMat);
      mkBox("wR", 0.3, 5, 26,  2, 2.5, 12, wallMat);
      mkBox("wF", 4, 5, 0.3,  0, 2.5, -1, wallMat);
      mkBox("wB", 4, 5, 0.3,  0, 2.5, 25, wallMat);

      // The hole (dark pit)
      const pitMat = new StandardMaterial("pit", this._scene);
      pitMat.diffuseColor = new Color3(0, 0, 0);
      mkBox("pit", 4, 0.1, 6, 0, -2, 11, pitMat);

      addLight(0, 4, 4, 0.4);
      addLight(0, 4, 18, 0.4);

      // Hanging light above the hole to grab
      const lightFixtureMat = new StandardMaterial("fixture", this._scene);
      lightFixtureMat.diffuseColor = new Color3(0.6, 0.55, 0.4);
      lightFixtureMat.emissiveColor = new Color3(0.3, 0.25, 0.1);
      const fixture = mkBox("fixture", 0.3, 0.3, 0.3, 0, 4.2, 11, lightFixtureMat);
      addLight(0, 4, 11, 0.9, new Color3(1, 0.95, 0.6));
      this._interactables.push({
        mesh: fixture,
        type: isLeft ? "swing-left" : "swing-right",
        swingTo: new Vector3(0, 1.6, 17),
      });

      // Key on the other side
      const keyMat = new StandardMaterial("key", this._scene);
      keyMat.diffuseColor = new Color3(0.9, 0.75, 0.1);
      keyMat.emissiveColor = new Color3(0.4, 0.3, 0.0);
      const key = mkBox("key", 0.3, 0.4, 0.1, 0, 1.2, 21, keyMat);

      // Poppy flower on key (small pink dot)
      const flowerMat = new StandardMaterial("flower", this._scene);
      flowerMat.diffuseColor = new Color3(0.95, 0.4, 0.6);
      flowerMat.emissiveColor = new Color3(0.4, 0.1, 0.2);
      mkBox("flower", 0.15, 0.15, 0.12, 0, 1.4, 20.94, flowerMat);

      this._interactables.push({ mesh: key, type: isLeft ? "key1" : "key2" });

      this._hud.style.color = "#00b2ff";
      this._hud.textContent = isLeft
        ? "🔵 Grab the light with LEFT CLICK to swing!"
        : "🔴 Grab the light with RIGHT CLICK to swing!";

    } else if (area === "longHall") {
      mkBox("floor", 6, 0.1, 40, 0, -0.05, 19, floorMat);
      mkBox("ceil",  6, 0.1, 40, 0,  5,    19, ceilMat);
      mkBox("wL", 0.3, 5, 40, -3, 2.5, 19, wallMat);
      mkBox("wR", 0.3, 5, 40,  3, 2.5, 19, wallMat);
      mkBox("wF", 6, 5, 0.3, 0, 2.5, -1, wallMat);
      mkBox("wB", 6, 5, 0.3, 0, 2.5, 39, wallMat);
      addLight(0, 4, 10, 0.3); addLight(0, 4, 25, 0.3); addLight(0, 4, 37, 0.4);

      // Door at end
      const doorMat = new StandardMaterial("door", this._scene);
      doorMat.diffuseColor = new Color3(0.2, 0.18, 0.14);
      doorMat.emissiveColor = new Color3(0.04, 0.03, 0.02);
      const door = mkBox("door", 3, 4, 0.25, 0, 2, 38.85, doorMat);
      this._interactables.push({ mesh: door, type: "poppyDoor" });

      this._hud.style.color = "";
      this._hud.textContent = "Walk down the hallway…";

    } else if (area === "shortHall") {
      mkBox("floor", 6, 0.1, 12, 0, -0.05, 5, floorMat);
      mkBox("ceil",  6, 0.1, 12, 0,  5,    5, ceilMat);
      mkBox("wL", 0.3, 5, 12, -3, 2.5, 5, wallMat);
      mkBox("wR", 0.3, 5, 12,  3, 2.5, 5, wallMat);
      mkBox("wF", 6, 5, 0.3, 0, 2.5, -1, wallMat);
      mkBox("wB", 6, 5, 0.3, 0, 2.5, 11, wallMat);
      addLight(0, 4, 5, 0.5, new Color3(1, 0.5, 0.7));

      // Poppy flower key on the floor
      const keyMat = new StandardMaterial("poppyKeyMat", this._scene);
      keyMat.diffuseColor = new Color3(0.9, 0.75, 0.1);
      keyMat.emissiveColor = new Color3(0.4, 0.3, 0.0);
      const pKey = mkBox("poppyKey", 0.35, 0.45, 0.12, 0, 0.3, 7, keyMat);
      const flowerMat = new StandardMaterial("flower2", this._scene);
      flowerMat.diffuseColor = new Color3(0.95, 0.4, 0.6);
      flowerMat.emissiveColor = new Color3(0.5, 0.15, 0.25);
      mkBox("flower2", 0.18, 0.18, 0.14, 0, 0.55, 6.94, flowerMat);
      this._interactables.push({ mesh: pKey, type: "poppyKey" });

      this._hud.style.color = "#ffb0cc";
      this._hud.textContent = "🌸 There's a key with a poppy flower on it!";
    }

    this._setupUI();
    this._setupEvents();

    this._renderFn = () => {
      if (!this._wrap.isConnected) return;
      if (!this._paused) this._tick();
      this._scene.render();
    };
    this._g.engine.runRenderLoop(this._renderFn);
  }

  private _setupUI(): void {
    // Clear old UI elements except wrap
    const toRemove = this._wrap.querySelectorAll(".ppui");
    toRemove.forEach(el => el.remove());

    if (!this._hud) {
      this._hud = document.createElement("div");
      this._wrap.appendChild(this._hud);
    }
    this._hud.className = "ppui";
    this._hud.style.cssText =
      "position:absolute;top:12px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:white;font-family:'Arial Black',Arial;font-size:15px;font-weight:900;" +
      "padding:8px 24px;border-radius:20px;pointer-events:none;text-align:center;white-space:nowrap;";

    if (!this._interactHint) {
      this._interactHint = document.createElement("div");
      this._wrap.appendChild(this._interactHint);
    }
    this._interactHint.className = "ppui";
    this._interactHint.style.cssText =
      "position:absolute;bottom:72px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:#00ffb2;font-family:Arial;font-size:14px;font-weight:bold;" +
      "padding:8px 20px;border-radius:12px;pointer-events:none;display:none;";

    // Crosshair
    const cross = document.createElement("div");
    cross.className = "ppui";
    cross.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:16px;height:16px;pointer-events:none;";
    cross.innerHTML =
      `<div style="position:absolute;top:7px;left:0;width:16px;height:2px;background:rgba(255,255,255,0.85);"></div>` +
      `<div style="position:absolute;left:7px;top:0;width:2px;height:16px;background:rgba(255,255,255,0.85);"></div>`;
    this._wrap.appendChild(cross);

    // Grabpack hands (always visible)
    if (!this._grabpackEl) {
      this._grabpackEl = document.createElement("div");
      this._wrap.appendChild(this._grabpackEl);
    }
    this._grabpackEl.className = "ppui";
    this._grabpackEl.style.cssText =
      "position:absolute;bottom:0;left:0;right:0;height:180px;pointer-events:none;" +
      "display:flex;justify-content:space-between;align-items:flex-end;padding:0 40px 10px;";
    this._grabpackEl.innerHTML = `
      <div style="font-size:72px;transform:scaleX(-1) rotate(-20deg);filter:drop-shadow(0 0 8px #3b82f6);">🫲</div>
      <div style="font-size:72px;transform:rotate(20deg);filter:drop-shadow(0 0 8px #ef4444);">🫱</div>
    `;

    const ctrlHint = document.createElement("div");
    ctrlHint.className = "ppui";
    ctrlHint.style.cssText =
      "position:absolute;bottom:14px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.55);color:rgba(255,255,255,0.6);font-size:12px;" +
      "padding:6px 18px;border-radius:12px;pointer-events:none;font-family:Arial;white-space:nowrap;";
    ctrlHint.textContent = "Click to look · WASD to move · Left click = 🔵 grab · Right click = 🔴 grab · E to interact";
    this._wrap.appendChild(ctrlHint);

    const exitBtn = document.createElement("button");
    exitBtn.className = "ppui";
    exitBtn.textContent = "✕ Exit";
    exitBtn.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.55);color:white;" +
      "padding:7px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.3);" +
      "cursor:pointer;font-size:13px;font-family:Arial;";
    exitBtn.onclick = () => this._cleanup();
    this._wrap.appendChild(exitBtn);
  }

  private _setupEvents(): void {
    this._wrap.addEventListener("click", () => {
      if (!this._paused) this._wrap.requestPointerLock();
    });
    this._wrap.addEventListener("mousedown", this._onMouseDown);
    document.addEventListener("pointerlockchange", this._onLockChange);
    document.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("keydown", this._onKey);
    window.addEventListener("keyup", this._onKeyUp);
  }

  private _onLockChange = () => { this._pointerLocked = document.pointerLockElement === this._wrap; };
  private _onMouseMove = (e: MouseEvent) => {
    if (!this._pointerLocked || this._paused || this._swinging) return;
    this._yaw += e.movementX * 0.002;
    this._camera.rotation.y = this._yaw;
  };
  private _onKey = (e: KeyboardEvent) => {
    this._keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "e") this._tryInteract("e");
  };
  private _onKeyUp = (e: KeyboardEvent) => { this._keys[e.key.toLowerCase()] = false; };
  private _onMouseDown = (e: MouseEvent) => {
    if (this._paused || this._swinging) return;
    if (e.button === 0) this._tryInteract("left");
    if (e.button === 2) this._tryInteract("right");
  };

  private _tick(): void {
    if (this._swinging) {
      this._tickSwing();
      return;
    }

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

    cam.position.x = Math.max(-6, Math.min(6, cam.position.x + dx));
    cam.position.z = Math.max(0.3, cam.position.z + dz);
    cam.position.y = 1.6;

    // Area transitions
    if (this._area === "hallway1" && cam.position.z > 27) this._goTo("hub");
    if (this._area === "hub") {
      if (cam.position.x < -5 && cam.position.z > 5 && cam.position.z < 10) this._goTo("leftHall");
      if (cam.position.x >  5 && cam.position.z > 5 && cam.position.z < 10) this._goTo("rightHall");
    }
    if ((this._area === "leftHall" || this._area === "rightHall") && cam.position.z < 1) this._goTo("hub");

    this._updateInteractHint();
  }

  private _tickSwing(): void {
    this._swingProgress = Math.min(1, this._swingProgress + 0.03);
    const t = this._swingProgress;
    // Arc swing: lerp position but add arc height in Y
    const arcY = Math.sin(t * Math.PI) * 1.5;
    this._camera.position.x = this._swingStart.x + (this._swingEnd.x - this._swingStart.x) * t;
    this._camera.position.z = this._swingStart.z + (this._swingEnd.z - this._swingStart.z) * t;
    this._camera.position.y = 1.6 + arcY;

    // Animate hand
    if (this._grabpackEl) {
      const scale = 1 + Math.sin(t * Math.PI) * 0.3;
      if (this._swingHand === "blue") {
        this._grabpackEl.querySelector("div")!.style.transform = `scaleX(-1) rotate(-20deg) scale(${scale})`;
      } else {
        (this._grabpackEl.querySelectorAll("div")[1] as HTMLElement).style.transform = `rotate(20deg) scale(${scale})`;
      }
    }

    if (this._swingProgress >= 1) {
      this._swinging = false;
      this._camera.position.y = 1.6;
    }
  }

  private _getNearby(): typeof this._interactables[number] | null {
    const cam = this._camera.position;
    for (const obj of this._interactables) {
      if (!obj.mesh.isEnabled()) continue;
      if (Vector3.Distance(cam, obj.mesh.position) < 3.5) return obj;
    }
    return null;
  }

  private _updateInteractHint(): void {
    const n = this._getNearby();
    if (!n) { this._interactHint.style.display = "none"; return; }
    this._interactHint.style.display = "block";
    const labels: Record<string, string> = {
      "swing-left":  "Left Click — Grab light with 🔵 blue hand",
      "swing-right": "Right Click — Grab light with 🔴 red hand",
      "key1":        "Press E — Pick up Key 1 🗝️",
      "key2":        "Press E — Pick up Key 2 🗝️",
      "redDoor":     this._hasKey1 && this._hasKey2 ? "Press E — Open red door 🚪" : `Press E — Locked (need ${!this._hasKey1 ? "key 1" : "key 2"})`,
      "poppyKey":    "Press E — Pick up Poppy Flower Key 🌸",
      "poppyDoor":   "Press E — Open door",
    };
    this._interactHint.textContent = labels[n.type] ?? "Press E";
  }

  private _tryInteract(input: "e" | "left" | "right"): void {
    if (this._paused || this._swinging) return;
    const n = this._getNearby();
    if (!n) return;

    if (n.type === "swing-left" && input === "left") this._doSwing(n, "blue");
    else if (n.type === "swing-right" && input === "right") this._doSwing(n, "red");
    else if (n.type === "key1" && input === "e") this._collectKey(1, n.mesh);
    else if (n.type === "key2" && input === "e") this._collectKey(2, n.mesh);
    else if (n.type === "redDoor" && input === "e") this._tryRedDoor();
    else if (n.type === "poppyKey" && input === "e") this._collectPoppyKey(n.mesh);
    else if (n.type === "poppyDoor" && input === "e") this._goTo("hub"); // go back to use key
  }

  private _doSwing(obj: typeof this._interactables[number], hand: "blue" | "red"): void {
    if (!obj.swingTo) return;
    this._swinging = true;
    this._swingProgress = 0;
    this._swingHand = hand;
    this._swingStart.copyFrom(this._camera.position);
    this._swingEnd.copyFrom(obj.swingTo);
    this._hud.style.color = hand === "blue" ? "#3b82f6" : "#ef4444";
    this._hud.textContent = hand === "blue" ? "🔵 Swinging!" : "🔴 Swinging!";
  }

  private _collectKey(num: 1 | 2, mesh: ReturnType<typeof MeshBuilder.CreateBox>): void {
    mesh.setEnabled(false);
    if (num === 1) this._hasKey1 = true;
    else this._hasKey2 = true;
    this._hud.style.color = "#facc15";
    this._hud.textContent = `🗝️ Key ${num} collected! ${this._hasKey1 && this._hasKey2 ? "Go open the red door!" : "Find the other key!"}`;
    setTimeout(() => this._goTo("hub"), 1200);
  }

  private _collectPoppyKey(mesh: ReturnType<typeof MeshBuilder.CreateBox>): void {
    mesh.setEnabled(false);
    this._hasPoppyKey = true;
    this._hud.style.color = "#ffb0cc";
    this._hud.textContent = "🌸 Poppy flower key collected! Go back and use it!";
    // Go back to hub after a moment to use the key on the correct door
    setTimeout(() => this._goTo("hub"), 1500);
  }

  private _tryRedDoor(): void {
    if (!this._hasKey1 || !this._hasKey2) {
      this._hud.style.color = "#ef4444";
      this._hud.textContent = `🔒 Locked! Need ${!this._hasKey1 ? "key 1" : "key 2"} first!`;
      return;
    }
    this._goTo("longHall");
  }

  private _goTo(area: Area): void {
    this._paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this._g.engine.stopRenderLoop(this._renderFn);
    this._scene.dispose();
    this._paused = false;
    this._buildArea(area);
  }

  private _cleanup(goArcade = true): void {
    if (document.pointerLockElement) document.exitPointerLock();
    this._wrap.removeEventListener("mousedown", this._onMouseDown);
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
