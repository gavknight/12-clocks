import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Chapter 1 flow:
//  puzzle  → press green→pink→yellow→red on control panel
//  tv      → watch grabpack tutorial on TV
//  door    → walk to locked door at back, press E → it's locked!
//  huggy   → Huggy Wuggy appears and gives you a key (cutscene)
//  elec    → enter the electrical area (more to come)

const CORRECT_ORDER = ["green", "pink", "yellow", "red"] as const;
type PuzzleColor = (typeof CORRECT_ORDER)[number];

const COLOR3: Record<PuzzleColor, Color3> = {
  green:  new Color3(0.13, 0.77, 0.37),
  pink:   new Color3(0.93, 0.28, 0.60),
  yellow: new Color3(0.92, 0.71, 0.03),
  red:    new Color3(0.94, 0.27, 0.27),
};

const TILE_COLORS = [
  new Color3(0.80, 0.10, 0.10),
  new Color3(0.10, 0.45, 0.90),
  new Color3(0.90, 0.80, 0.00),
  new Color3(0.10, 0.70, 0.30),
  new Color3(0.90, 0.30, 0.70),
  new Color3(0.30, 0.80, 0.80),
  new Color3(0.80, 0.50, 0.10),
  new Color3(0.50, 0.10, 0.80),
];

type Phase = "puzzle" | "tv" | "door" | "huggy" | "elec";

export class PoppyPlaytime {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;
  private _camera!: FreeCamera;
  private _keys: Record<string, boolean> = {};
  private _yaw = 0;
  private _pointerLocked = false;
  private _renderFn!: () => void;
  private _paused = false;
  private _hasKey = false;

  private _phase: Phase = "puzzle";
  private _sequence: PuzzleColor[] = [];
  private _buttonMeshes = new Map<PuzzleColor, ReturnType<typeof MeshBuilder.CreateBox>>();
  private _tvMesh!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _doorMesh!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _huggMesh!: ReturnType<typeof MeshBuilder.CreateBox>;

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
    this._scene.clearColor = new Color4(0.04, 0.02, 0.06, 1);
    this._scene.fogMode = 3;
    this._scene.fogColor = new Color3(0.04, 0.02, 0.06);
    this._scene.fogStart = 18;
    this._scene.fogEnd = 38;

    this._camera = new FreeCamera("cam", new Vector3(0, 1.6, -8), this._scene);
    this._camera.minZ = 0.1;
    this._camera.speed = 0;

    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this._scene);
    hemi.intensity = 0.35;
    hemi.diffuse = new Color3(0.75, 0.75, 1.0);

    const addPtLight = (x: number, z: number) => {
      const l = new PointLight(`pl${x}_${z}`, new Vector3(x, 4.2, z), this._scene);
      l.intensity = 1.1;
      l.diffuse = new Color3(1, 0.96, 0.85);
      l.range = 14;
    };
    addPtLight(-4, -4); addPtLight(4, -4);
    addPtLight(-4,  3); addPtLight(4,  3);
    addPtLight(-4, 10); addPtLight(4, 10);

    // Colorful VHS floor tiles
    for (let tx = -7; tx <= 7; tx++) {
      for (let tz = -10; tz <= 13; tz++) {
        const tile = MeshBuilder.CreateBox(`t${tx}_${tz}`, { width: 1, height: 0.05, depth: 1 }, this._scene);
        tile.position.set(tx + 0.5, -0.025, tz + 0.5);
        const m = new StandardMaterial(`tm${tx}_${tz}`, this._scene);
        m.diffuseColor = TILE_COLORS[Math.abs(tx * 3 + tz * 7 + tx * tz) % TILE_COLORS.length];
        m.specularColor = new Color3(0.2, 0.2, 0.2);
        tile.material = m;
        tile.isPickable = false;
      }
    }

    const wallMat = new StandardMaterial("wall", this._scene);
    wallMat.diffuseColor = new Color3(0.16, 0.20, 0.45);
    const ceilMat = new StandardMaterial("ceil", this._scene);
    ceilMat.diffuseColor = new Color3(0.13, 0.13, 0.20);

    const mkWall = (name: string, w: number, h: number, d: number, x: number, y: number, z: number) => {
      const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this._scene);
      mesh.position.set(x, y, z);
      mesh.material = wallMat;
      mesh.isPickable = false;
    };

    const H = 5;
    // Back wall left/right panels (door gap in middle)
    mkWall("backL", 5.5, H, 0.3, -5.25, H / 2, 13);
    mkWall("backR", 5.5, H, 0.3,  5.25, H / 2, 13);
    mkWall("backTop", 5, 1.5, 0.3, 0, H - 0.75, 13);
    mkWall("frontWall", 16, H, 0.3, 0, H / 2, -10);
    mkWall("leftWall",  0.3, H, 24, -8, H / 2, 1.5);
    mkWall("rightWall", 0.3, H, 24,  8, H / 2, 1.5);
    const ceil = MeshBuilder.CreateBox("ceil", { width: 16, height: 0.2, depth: 24 }, this._scene);
    ceil.position.set(0, H, 1.5);
    ceil.material = ceilMat;
    ceil.isPickable = false;

    // Reception desk
    const deskMat = new StandardMaterial("desk", this._scene);
    deskMat.diffuseColor = new Color3(0.82, 0.62, 0.02);
    const desk = MeshBuilder.CreateBox("desk", { width: 3.5, height: 1.1, depth: 1.6 }, this._scene);
    desk.position.set(0, 0.55, 5);
    desk.material = deskMat;
    desk.isPickable = false;

    // PLAYTIME CO. sign
    const signMat = new StandardMaterial("sign", this._scene);
    signMat.diffuseColor = new Color3(1, 0.85, 0.0);
    signMat.emissiveColor = new Color3(0.5, 0.35, 0.0);
    const sign = MeshBuilder.CreateBox("sign", { width: 5, height: 0.8, depth: 0.12 }, this._scene);
    sign.position.set(0, 3.8, 12.85);
    sign.material = signMat;
    sign.isPickable = false;

    // Control panel + buttons on right wall
    const panelMat = new StandardMaterial("panel", this._scene);
    panelMat.diffuseColor = new Color3(0.10, 0.10, 0.18);
    panelMat.emissiveColor = new Color3(0.02, 0.02, 0.04);
    const panel = MeshBuilder.CreateBox("panel", { width: 0.2, height: 2.2, depth: 3.8 }, this._scene);
    panel.position.set(7.85, 1.9, 0);
    panel.material = panelMat;
    panel.isPickable = false;

    const btnZ: Record<PuzzleColor, number> = { green: -1.5, pink: -0.5, yellow: 0.5, red: 1.5 };
    for (const color of CORRECT_ORDER) {
      const btn = MeshBuilder.CreateBox(`btn_${color}`, { width: 0.35, height: 0.35, depth: 0.35 }, this._scene);
      btn.position.set(7.75, 1.9, btnZ[color]);
      const mat = new StandardMaterial(`bm_${color}`, this._scene);
      mat.diffuseColor = COLOR3[color];
      mat.emissiveColor = COLOR3[color].scale(0.45);
      btn.material = mat;
      btn.isPickable = false;
      this._buttonMeshes.set(color, btn);
    }

    // TV on left wall (hidden until puzzle solved)
    const tvMat = new StandardMaterial("tv", this._scene);
    tvMat.diffuseColor = new Color3(0.08, 0.08, 0.12);
    tvMat.emissiveColor = new Color3(0.03, 0.08, 0.18);
    this._tvMesh = MeshBuilder.CreateBox("tv", { width: 0.15, height: 1.9, depth: 2.8 }, this._scene);
    this._tvMesh.position.set(-7.85, 2.3, 8);
    this._tvMesh.material = tvMat;
    this._tvMesh.isPickable = false;
    this._tvMesh.setEnabled(false);

    // Door in the back wall gap (shown after grabpack, locked until key)
    const doorMat = new StandardMaterial("door", this._scene);
    doorMat.diffuseColor = new Color3(0.25, 0.18, 0.10);
    doorMat.emissiveColor = new Color3(0.05, 0.03, 0.01);
    this._doorMesh = MeshBuilder.CreateBox("door", { width: 5, height: 3.5, depth: 0.25 }, this._scene);
    this._doorMesh.position.set(0, 1.75, 12.9);
    this._doorMesh.material = doorMat;
    this._doorMesh.isPickable = false;
    this._doorMesh.setEnabled(false);

    // Huggy Wuggy (tall blue box, hidden until huggy phase)
    const huggMat = new StandardMaterial("huggy", this._scene);
    huggMat.diffuseColor = new Color3(0.10, 0.25, 0.90);
    huggMat.emissiveColor = new Color3(0.02, 0.05, 0.20);
    this._huggMesh = MeshBuilder.CreateBox("huggy", { width: 1.2, height: 3.5, depth: 0.8 }, this._scene);
    this._huggMesh.position.set(0, 1.75, 10);
    this._huggMesh.material = huggMat;
    this._huggMesh.isPickable = false;
    this._huggMesh.setEnabled(false);

    // HUD
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:12px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.70);color:white;font-family:'Arial Black',Arial;font-size:15px;font-weight:900;" +
      "padding:8px 24px;border-radius:20px;pointer-events:none;text-align:center;white-space:nowrap;";
    this._hud.textContent = "Press buttons in order: 🟢 → 🩷 → 🟡 → 🔴";
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
    const nx = cam.position.x + dx;
    const nz = cam.position.z + dz;

    // Block player from walking through the locked door
    const doorBlocked = this._phase === "door" && !this._hasKey && nz > 11.8;

    if (nx > -7.5 + r && nx < 7.5 - r) cam.position.x = nx;
    if (!doorBlocked && nz > -9.5 + r && nz < 12.5 - r) cam.position.z = nz;
    if (doorBlocked && nz < 11.8) cam.position.z = nz;
    cam.position.y = 1.6;

    this._updateInteractHint();
  }

  private _getNearby(): "button-green" | "button-pink" | "button-yellow" | "button-red" | "tv" | "door" | null {
    const cam = this._camera.position;

    if (this._phase === "puzzle") {
      for (const color of CORRECT_ORDER) {
        const mesh = this._buttonMeshes.get(color)!;
        if (Vector3.Distance(cam, mesh.position) < 2.4)
          return `button-${color}` as `button-${PuzzleColor}`;
      }
    }
    if (this._phase === "tv") {
      if (this._tvMesh.isEnabled() && Vector3.Distance(cam, this._tvMesh.position) < 4.0)
        return "tv";
    }
    if (this._phase === "door") {
      if (this._doorMesh.isEnabled() && Vector3.Distance(cam, this._doorMesh.position) < 3.5)
        return "door";
    }
    return null;
  }

  private _updateInteractHint(): void {
    const n = this._getNearby();
    if (!n) { this._interactHint.style.display = "none"; return; }
    this._interactHint.style.display = "block";
    if (n.startsWith("button-")) {
      this._interactHint.textContent = `Press E — ${n.replace("button-", "")} button`;
    } else if (n === "tv") {
      this._interactHint.textContent = "Press E — Watch TV";
    } else {
      this._interactHint.textContent = this._hasKey ? "Press E — Unlock door" : "Press E — Try door";
    }
  }

  private _tryInteract(): void {
    if (this._paused) return;
    const n = this._getNearby();
    if (!n) return;
    if (n.startsWith("button-")) this._pressButton(n.replace("button-", "") as PuzzleColor);
    else if (n === "tv") this._showTV();
    else if (n === "door") this._tryDoor();
  }

  private _pressButton(color: PuzzleColor): void {
    const expected = CORRECT_ORDER[this._sequence.length];
    if (color !== expected) {
      this._sequence = [];
      this._hud.style.color = "#ef4444";
      this._hud.textContent = "✗ Wrong order! Try again: 🟢 → 🩷 → 🟡 → 🔴";
      for (const [c, mesh] of this._buttonMeshes)
        (mesh.material as StandardMaterial).emissiveColor = new Color3(0.25, 0, 0);
      setTimeout(() => {
        for (const [c, mesh] of this._buttonMeshes)
          (mesh.material as StandardMaterial).emissiveColor = COLOR3[c].scale(0.45);
        this._hud.style.color = "";
        this._hud.textContent = "Press buttons in order: 🟢 → 🩷 → 🟡 → 🔴";
      }, 800);
      return;
    }

    this._sequence.push(color);
    (this._buttonMeshes.get(color)!.material as StandardMaterial).emissiveColor = COLOR3[color].scale(1.0);

    if (this._sequence.length < CORRECT_ORDER.length) {
      this._hud.textContent = `✓ ${color}! Next: ${CORRECT_ORDER[this._sequence.length]}`;
    } else {
      this._phase = "tv";
      this._hud.style.color = "#22c55e";
      this._hud.textContent = "✓ Puzzle solved! Find the TV on the left wall →";
      this._tvMesh.setEnabled(true);
      (this._tvMesh.material as StandardMaterial).emissiveColor = new Color3(0.05, 0.35, 0.9);
    }
  }

  private _showTV(): void {
    this._paused = true;
    if (document.pointerLockElement) document.exitPointerLock();

    const lines = [
      "Welcome to Playtime Co.!",
      "This is the GrabPack — your most important tool.",
      "The BLUE hand fires LEFT. The RED hand fires RIGHT.",
      "Aim at conductors to grab and pull yourself forward.",
      "You'll need it to navigate the factory. Good luck.",
    ];
    const icons = ["📺", "🤚", "🔵", "🔴", "🏃"];
    let line = 0;

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.92);" +
      "display:flex;align-items:center;justify-content:center;font-family:'Arial Black',Arial;";
    this._wrap.appendChild(ov);

    const render = () => {
      ov.innerHTML = `
        <div style="background:#111;border:8px solid #2a2a2a;border-radius:12px;
          width:min(500px,88vw);overflow:hidden;box-shadow:0 0 60px rgba(0,180,255,0.25);">
          <div style="background:linear-gradient(135deg,#001820,#002535);padding:40px 32px;min-height:200px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <div style="color:#00b2ff;font-size:11px;letter-spacing:3px;margin-bottom:20px;opacity:0.7;">PLAYTIME CO. ORIENTATION</div>
            <div style="font-size:60px;margin-bottom:16px;">${icons[line]}</div>
            <div style="color:white;font-size:17px;text-align:center;line-height:1.7;max-width:360px;">${lines[line]}</div>
          </div>
          <div style="background:#1a1a1a;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;">
            <div style="color:rgba(255,255,255,0.35);font-size:12px;">${line + 1} / ${lines.length}</div>
            <button id="tvNext" style="background:#00b2ff;color:#000;font-weight:bold;
              font-size:14px;padding:8px 24px;border-radius:20px;border:none;cursor:pointer;">
              ${line === lines.length - 1 ? "Get GrabPack! 🎒" : "Next ▶"}
            </button>
          </div>
        </div>`;
      document.getElementById("tvNext")!.onclick = () => {
        line++;
        if (line >= lines.length) { ov.remove(); this._onGrabpackGet(); }
        else render();
      };
    };
    render();
  }

  private _onGrabpackGet(): void {
    // Brief "GrabPack GET" flash then resume 3D with door available
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.88);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;";
    ov.innerHTML = `
      <div style="font-size:72px;margin-bottom:12px;">🎒</div>
      <div style="color:#00ffb2;font-size:28px;font-weight:900;text-shadow:0 0 24px #00ffb2;margin-bottom:8px;">GRABPACK GET!</div>
      <div style="color:rgba(255,255,255,0.55);font-size:14px;margin-bottom:32px;">🔵 LEFT &nbsp;|&nbsp; 🔴 RIGHT</div>
      <div style="color:rgba(255,255,255,0.35);font-size:13px;">Now find the exit door at the back of the lobby…</div>
    `;
    this._wrap.appendChild(ov);

    setTimeout(() => {
      ov.remove();
      // Resume 3D — show door, update HUD
      this._phase = "door";
      this._paused = false;
      this._doorMesh.setEnabled(true);
      this._hud.style.color = "";
      this._hud.textContent = "🎒 GrabPack equipped! Find the door at the back.";
    }, 2200);
  }

  private _tryDoor(): void {
    if (this._hasKey) {
      // Unlock and enter!
      this._paused = true;
      if (document.pointerLockElement) document.exitPointerLock();
      this._showElecEntrance();
      return;
    }

    // Door is locked — show locked message, then trigger Huggy cutscene
    this._paused = true;
    if (document.pointerLockElement) document.exitPointerLock();

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.88);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;";
    ov.innerHTML = `
      <div style="font-size:60px;margin-bottom:12px;">🔒</div>
      <div style="color:#ef4444;font-size:24px;font-weight:900;margin-bottom:8px;">Door Locked!</div>
      <div style="color:rgba(255,255,255,0.55);font-size:15px;text-align:center;max-width:320px;line-height:1.6;">
        The door to the electrical area won't budge.<br>You need a key…
      </div>
    `;
    this._wrap.appendChild(ov);

    setTimeout(() => {
      ov.remove();
      this._showHuggyCutscene();
    }, 2000);
  }

  private _showHuggyCutscene(): void {
    this._phase = "huggy";
    this._huggMesh.setEnabled(true);

    const slides = [
      { icon: "🔵", text: "A giant figure steps out from the shadows…" },
      { icon: "🤝", text: "It's Huggy Wuggy. He slowly extends his long arm toward you." },
      { icon: "🗝️", text: "He drops a key at your feet.\n\n\"...The electrical area. Go.\"" },
      { icon: "🚪", text: "Huggy steps back into the dark.\nYou pick up the key." },
    ];
    let slide = 0;

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.93);" +
      "display:flex;align-items:center;justify-content:center;font-family:'Arial Black',Arial;";
    this._wrap.appendChild(ov);

    const render = () => {
      const s = slides[slide];
      const isLast = slide === slides.length - 1;
      ov.innerHTML = `
        <div style="text-align:center;max-width:420px;padding:20px;">
          <div style="font-size:72px;margin-bottom:16px;">${s.icon}</div>
          <div style="color:white;font-size:17px;line-height:1.7;white-space:pre-line;margin-bottom:32px;">${s.text}</div>
          <button id="huggNext" style="
            background:${isLast ? "#22c55e" : "rgba(255,255,255,0.12)"};
            color:white;font-size:15px;font-weight:bold;
            padding:12px 32px;border-radius:24px;
            border:${isLast ? "none" : "1.5px solid rgba(255,255,255,0.25)"};
            cursor:pointer;">
            ${isLast ? "Use Key 🗝️" : "..."}
          </button>
        </div>`;
      document.getElementById("huggNext")!.onclick = () => {
        slide++;
        if (slide >= slides.length) {
          ov.remove();
          this._hasKey = true;
          this._phase = "door";
          this._paused = false;
          this._hud.style.color = "#eab308";
          this._hud.textContent = "🗝️ You have the key! Go to the door.";
          // Update door to glow green (unlocked)
          (this._doorMesh.material as StandardMaterial).emissiveColor = new Color3(0, 0.4, 0.1);
        } else {
          render();
        }
      };
    };
    render();
  }

  private _showElecEntrance(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:#000;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;";
    ov.innerHTML = `
      <div style="font-size:72px;margin-bottom:12px;">⚡</div>
      <div style="color:#facc15;font-size:24px;font-weight:900;margin-bottom:8px;
        text-shadow:0 0 20px #facc15;">ELECTRICAL AREA</div>
      <div style="color:rgba(255,255,255,0.4);font-size:13px;">You step through the door…</div>`;
    this._wrap.appendChild(ov);

    setTimeout(() => {
      this._cleanup(false);
      import("./PoppyElectrical").then(m => new m.PoppyElectrical(this._g));
    }, 1500);
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
