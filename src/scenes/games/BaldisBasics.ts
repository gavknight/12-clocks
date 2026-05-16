import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { BALDIS_MOD_KEY } from "./BaldisModMaker";
import type { BaldisModConfig } from "./BaldisModMaker";

const DEFAULT_MAZE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,1,0,1],
  [1,0,0,0,1,1,1,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,1,1,0,0,1],
  [1,1,1,0,1,0,1,0,1,0,1,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,0,0,1,1,1,1,0,0,1,0,1],
  [1,0,1,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,0,0,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const CELL = 4;

const NOTEBOOK_POSITIONS = [
  {row:1,col:1},{row:2,col:5},{row:5,col:2},{row:7,col:5},
  {row:9,col:3},{row:11,col:7},{row:13,col:11}
];

// Exits placed at open floor tiles near edges
const EXIT_POSITIONS = [
  {row:1,col:13},{row:13,col:1},{row:7,col:1},{row:13,col:9}
];

const MATH_QUESTIONS = [
  { q:"2 + 2 = ?", a:"4" },
  { q:"What is 1 + 1?", a:"258375235987349867529578358432954893756798573498673957123124" },
  { q:"5 × 5 = ?", a:"25" },
  { q:"10 - 3 = ?", a:"7" },
  { q:"12 ÷ 4 = ?", a:"3" },
  { q:"6 + 7 = ?", a:"13" },
  { q:"9 × 3 = ?", a:"27" },
];

export class BaldisBasics {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;
  private _camera!: FreeCamera;
  private _notebooksCollected = 0;
  private _keys: Record<string, boolean> = {};
  private _notebookMeshes: { mesh: ReturnType<typeof MeshBuilder.CreateBox>; idx: number }[] = [];
  private _exitMeshes: ReturnType<typeof MeshBuilder.CreateBox>[] = [];
  private _baldPos = new Vector3(13 * CELL, 1.25, 13 * CELL);
  private _baldSpeed = 0.02;
  private _baldMesh!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _hud!: HTMLDivElement;
  private _quizActive = false;
  private _gameOver = false;
  private _won = false;
  private _pointerLocked = false;
  private _yaw = 0;
  private _renderFn!: () => void;
  private _cfg!: BaldisModConfig;

  constructor(g: Game) {
    this._g = g;
    // Load mod config from localStorage if one exists
    const saved = localStorage.getItem(BALDIS_MOD_KEY);
    if (saved) {
      try { this._cfg = JSON.parse(saved); } catch { this._cfg = this._defaultCfg(); }
    } else {
      this._cfg = this._defaultCfg();
    }
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText = "position:absolute;inset:0;pointer-events:all;overflow:hidden;cursor:crosshair;";
    g.ui.appendChild(this._wrap);
    this._build();
  }

  private _defaultCfg(): BaldisModConfig {
    return {
      maze: DEFAULT_MAZE,
      notebooks: NOTEBOOK_POSITIONS,
      exits: EXIT_POSITIONS,
      questions: MATH_QUESTIONS,
      baldSpeed: 0.02,
      fogEnd: 32,
    };
  }

  private _build(): void {
    const cfg = this._cfg;
    this._baldSpeed = cfg.baldSpeed;
    this._scene = new Scene(this._g.engine);
    this._scene.clearColor = new Color4(0.52, 0.78, 0.52, 1);
    this._scene.fogMode = 3;
    this._scene.fogColor = new Color3(0.52, 0.78, 0.52);
    this._scene.fogStart = 8;
    this._scene.fogEnd = cfg.fogEnd;

    this._camera = new FreeCamera("cam", new Vector3(1 * CELL, 1.6, 1 * CELL), this._scene);
    this._camera.minZ = 0.1;
    this._camera.speed = 0;
    this._yaw = 0;

    new HemisphericLight("hemi", new Vector3(0, 1, 0), this._scene).intensity = 0.7;
    const dir = new DirectionalLight("dir", new Vector3(-1, -2, -1), this._scene);
    dir.intensity = 0.5;

    const wallMat = new StandardMaterial("wall", this._scene);
    wallMat.diffuseColor = new Color3(0.85, 0.85, 0.7);

    const floorMat = new StandardMaterial("floor", this._scene);
    floorMat.diffuseColor = new Color3(0.6, 0.55, 0.45);

    const ceilMat = new StandardMaterial("ceil", this._scene);
    ceilMat.diffuseColor = new Color3(0.95, 0.95, 0.9);

    const noteMat = new StandardMaterial("note", this._scene);
    noteMat.diffuseColor = new Color3(1, 1, 0.4);
    noteMat.emissiveColor = new Color3(0.5, 0.5, 0);

    const exitMat = new StandardMaterial("exit", this._scene);
    exitMat.diffuseColor = new Color3(0, 1, 0.3);
    exitMat.emissiveColor = new Color3(0, 0.5, 0.1);

    const baldMat = new StandardMaterial("bald", this._scene);
    baldMat.diffuseColor = new Color3(1, 0.8, 0.6);
    baldMat.emissiveColor = new Color3(0.4, 0.1, 0);

    // Build maze geometry
    for (let row = 0; row < cfg.maze.length; row++) {
      for (let col = 0; col < cfg.maze[row].length; col++) {
        const x = col * CELL;
        const z = row * CELL;
        if (cfg.maze[row][col] === 1) {
          const wall = MeshBuilder.CreateBox(`w${row}_${col}`, { width: CELL, height: 4, depth: CELL }, this._scene);
          wall.position.set(x, 2, z);
          wall.material = wallMat;
          wall.isPickable = false;
        } else {
          const floor = MeshBuilder.CreateBox(`f${row}_${col}`, { width: CELL, height: 0.1, depth: CELL }, this._scene);
          floor.position.set(x, -0.05, z);
          floor.material = floorMat;
          floor.isPickable = false;
          const ceil = MeshBuilder.CreateBox(`c${row}_${col}`, { width: CELL, height: 0.1, depth: CELL }, this._scene);
          ceil.position.set(x, 4.05, z);
          ceil.material = ceilMat;
          ceil.isPickable = false;
        }
      }
    }

    // Notebooks
    cfg.notebooks.forEach((pos, idx) => {
      const nb = MeshBuilder.CreateBox(`nb${idx}`, { width: 0.5, height: 0.7, depth: 0.05 }, this._scene);
      nb.position.set(pos.col * CELL, 1.2, pos.row * CELL);
      nb.material = noteMat;
      nb.isPickable = false;
      this._notebookMeshes.push({ mesh: nb, idx });
    });

    // Exits
    cfg.exits.forEach((pos, idx) => {
      const ex = MeshBuilder.CreateBox(`exit${idx}`, { width: 1.2, height: 3.5, depth: 0.2 }, this._scene);
      ex.position.set(pos.col * CELL, 1.75, pos.row * CELL);
      ex.material = exitMat;
      ex.isPickable = false;
      this._exitMeshes.push(ex);
    });

    // Baldi
    this._baldMesh = MeshBuilder.CreateBox("baldi", { width: 0.7, height: 2.2, depth: 0.7 }, this._scene);
    this._baldMesh.position = this._baldPos.clone();
    this._baldMesh.material = baldMat;
    this._baldMesh.isPickable = false;

    // HUD
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:12px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.65);color:white;font-family:'Arial Black',Arial;font-size:16px;font-weight:900;" +
      "padding:8px 24px;border-radius:20px;pointer-events:none;text-align:center;white-space:nowrap;";
    this._wrap.appendChild(this._hud);
    this._updateHUD();

    // Crosshair
    const cross = document.createElement("div");
    cross.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);" +
      "width:16px;height:16px;pointer-events:none;";
    cross.innerHTML =
      `<div style="position:absolute;top:7px;left:0;width:16px;height:2px;background:rgba(255,255,255,0.8);"></div>` +
      `<div style="position:absolute;left:7px;top:0;width:2px;height:16px;background:rgba(255,255,255,0.8);"></div>`;
    this._wrap.appendChild(cross);

    // Controls hint
    const hint = document.createElement("div");
    hint.style.cssText =
      "position:absolute;bottom:14px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.55);color:rgba(255,255,255,0.65);font-size:12px;" +
      "padding:6px 18px;border-radius:12px;pointer-events:none;font-family:Arial;white-space:nowrap;";
    hint.textContent = "Click to look around · WASD to move · Collect 7 notebooks · Find the exit!";
    this._wrap.appendChild(hint);

    // Exit button
    const exitBtn = document.createElement("button");
    exitBtn.textContent = "✕ Exit";
    exitBtn.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.55);color:white;" +
      "padding:7px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.3);" +
      "cursor:pointer;font-size:13px;font-family:Arial;";
    exitBtn.onclick = () => this._cleanup();
    this._wrap.appendChild(exitBtn);

    // Pointer lock for mouse look
    this._wrap.addEventListener("click", () => {
      if (!this._quizActive && !this._gameOver) {
        this._wrap.requestPointerLock();
      }
    });
    document.addEventListener("pointerlockchange", this._onLockChange);
    document.addEventListener("mousemove", this._onMouseMove);

    window.addEventListener("keydown", this._onKey);
    window.addEventListener("keyup", this._onKeyUp);

    this._renderFn = () => {
      if (!this._wrap.isConnected) return;
      if (!this._gameOver && !this._quizActive) this._tick();
      this._scene.render();
    };
    this._g.engine.runRenderLoop(this._renderFn);
  }

  private _onLockChange = () => {
    this._pointerLocked = document.pointerLockElement === this._wrap;
  };

  private _onMouseMove = (e: MouseEvent) => {
    if (!this._pointerLocked || this._quizActive || this._gameOver) return;
    this._yaw += e.movementX * 0.002;
    this._camera.rotation.y = this._yaw;
  };

  private _onKey = (e: KeyboardEvent) => { this._keys[e.key.toLowerCase()] = true; };
  private _onKeyUp = (e: KeyboardEvent) => { this._keys[e.key.toLowerCase()] = false; };

  private _isFree(wx: number, wz: number): boolean {
    const maze = this._cfg.maze;
    const col = Math.round(wx / CELL);
    const row = Math.round(wz / CELL);
    const cr = Math.max(0, Math.min(maze.length - 1, row));
    const cc = Math.max(0, Math.min(maze[0].length - 1, col));
    return maze[cr][cc] !== 1;
  }

  private _tick(): void {
    const speed = 0.1;
    const cam = this._camera;
    const cosY = Math.cos(this._yaw);
    const sinY = Math.sin(this._yaw);
    let dx = 0, dz = 0;

    if (this._keys["w"] || this._keys["arrowup"])    { dx +=  sinY; dz +=  cosY; }
    if (this._keys["s"] || this._keys["arrowdown"])  { dx += -sinY; dz += -cosY; }
    if (this._keys["a"] || this._keys["arrowleft"])  { dx += -cosY; dz +=  sinY; }
    if (this._keys["d"] || this._keys["arrowright"]) { dx +=  cosY; dz += -sinY; }

    const len = Math.sqrt(dx*dx + dz*dz);
    if (len > 0) { dx = dx/len * speed; dz = dz/len * speed; }

    // Slide collision — try X and Z independently
    const r = 0.5; // player radius
    if (dx !== 0) {
      const nx = cam.position.x + dx;
      if (this._isFree(nx + Math.sign(dx)*r, cam.position.z)) {
        cam.position.x = nx;
      }
    }
    if (dz !== 0) {
      const nz = cam.position.z + dz;
      if (this._isFree(cam.position.x, nz + Math.sign(dz)*r)) {
        cam.position.z = nz;
      }
    }
    cam.position.y = 1.6;

    // Notebook pickup
    for (const { mesh, idx } of this._notebookMeshes) {
      if (!mesh.isEnabled()) continue;
      if (Vector3.Distance(cam.position, mesh.position) < 1.8) {
        mesh.setEnabled(false);
        this._notebooksCollected++;
        this._updateHUD();
        this._showQuiz(idx);
        return;
      }
    }

    // Exit check
    const nbTotal = this._cfg.notebooks.length;
    if (this._notebooksCollected >= nbTotal) {
      for (const ex of this._exitMeshes) {
        if (Vector3.Distance(cam.position, ex.position) < 2.2) {
          this._triggerWin();
          return;
        }
      }
    }

    // Baldi chases player (through maze — he's supernatural)
    this._baldSpeed = this._cfg.baldSpeed + this._notebooksCollected * 0.014;
    const toPlayer = cam.position.subtract(this._baldPos);
    toPlayer.y = 0;
    const dist = toPlayer.length();
    if (dist > 0.1) {
      const step = toPlayer.normalize().scale(this._baldSpeed);
      this._baldPos.addInPlace(step);
    }
    this._baldMesh.position.x = this._baldPos.x;
    this._baldMesh.position.z = this._baldPos.z;
    this._baldMesh.position.y = 1.1;

    if (dist < 1.1) this._triggerGameOver();
  }

  private _showQuiz(notebookIdx: number): void {
    this._quizActive = true;
    if (document.pointerLockElement) document.exitPointerLock();

    const q = this._cfg.questions[notebookIdx] ?? this._cfg.questions[0];
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.88);" +
      "display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;" +
      "font-family:'Arial Black',Arial;";
    ov.innerHTML = `
      <div style="color:white;font-size:22px;font-weight:900;text-align:center;">
        📓 Notebook ${notebookIdx + 1} of ${this._cfg.notebooks.length}
      </div>
      <div style="color:#FFD700;font-size:24px;font-weight:bold;text-align:center;">
        ${q.q}
      </div>
      <input id="quizInput" type="text" placeholder="Your answer..."
        style="background:rgba(255,255,255,0.12);border:2px solid rgba(255,255,255,0.4);
        border-radius:10px;color:white;font-size:18px;padding:10px 18px;text-align:center;
        outline:none;width:280px;font-family:Arial;caret-color:white;box-sizing:border-box;"/>
      <button id="quizSubmit" style="background:#FFD700;color:#1a0060;font-size:16px;font-weight:900;
        padding:12px 36px;border-radius:12px;border:none;cursor:pointer;">
        Submit ✓
      </button>
      <div id="quizMsg" style="color:#ff6060;font-size:14px;min-height:18px;text-align:center;"></div>
    `;
    this._wrap.appendChild(ov);
    setTimeout(() => (document.getElementById("quizInput") as HTMLInputElement)?.focus(), 60);

    const closeQuiz = () => { ov.remove(); this._quizActive = false; };

    const submit = () => {
      const val = (document.getElementById("quizInput") as HTMLInputElement)?.value.trim() ?? "";
      if (val === q.a) {
        closeQuiz();
      } else {
        const msg = document.getElementById("quizMsg")!;
        msg.textContent = notebookIdx === 1
          ? "WRONG! Nobody gets this one 😈 Baldi is MAD!"
          : "WRONG! Baldi is getting faster...";
        this._baldSpeed += 0.015;
        // Change button to "Continue" so the player can always move on
        const btn = document.getElementById("quizSubmit") as HTMLButtonElement;
        btn.textContent = "Continue →";
        btn.style.background = "#ff4040";
        btn.style.color = "white";
        btn.onclick = closeQuiz;
        const inp = document.getElementById("quizInput") as HTMLInputElement;
        if (inp) inp.style.borderColor = "rgba(255,80,80,0.6)";
      }
    };

    document.getElementById("quizSubmit")!.onclick = submit;
    ov.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  }

  private _updateHUD(): void {
    const total = this._cfg.notebooks.length;
    const done = this._notebooksCollected >= total;
    this._hud.innerHTML = done
      ? `📓 ${total}/${total} ✅ &nbsp;🚪 Find the exit!`
      : `📓 ${this._notebooksCollected}/${total} notebooks`;
  }

  private _triggerWin(): void {
    if (this._won) return;
    this._won = true;
    this._gameOver = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this._wrap.innerHTML = "";
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(0,80,0,0.94);display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:18px;font-family:'Arial Black',Arial;";
    ov.innerHTML = `
      <div style="font-size:72px;">🎉</div>
      <div style="color:#FFD700;font-size:36px;font-weight:900;">YOU ESCAPED!</div>
      <div style="color:rgba(255,255,255,0.7);font-size:16px;">All 7 notebooks collected!</div>
      <button id="winBack" style="background:#FFD700;color:#1a0060;font-size:18px;font-weight:900;
        padding:14px 40px;border-radius:30px;border:none;cursor:pointer;margin-top:8px;">
        ← Back to Arcade
      </button>
    `;
    this._wrap.appendChild(ov);
    document.getElementById("winBack")!.onclick = () => this._cleanup();
  }

  private _triggerGameOver(): void {
    if (this._gameOver) return;
    this._gameOver = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this._wrap.innerHTML = "";
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(80,0,0,0.96);display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:18px;font-family:'Arial Black',Arial;";
    ov.innerHTML = `
      <div style="font-size:72px;">😱</div>
      <div style="color:#ff4040;font-size:36px;font-weight:900;">BALDI GOT YOU!</div>
      <div style="color:rgba(255,255,255,0.6);font-size:16px;">Notebooks: ${this._notebooksCollected}/7</div>
      <button id="retryBtn" style="background:#ff3333;color:white;font-size:18px;font-weight:900;
        padding:14px 40px;border-radius:30px;border:none;cursor:pointer;">
        🔄 Try Again
      </button>
      <button id="goBackBtn" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:14px;
        padding:10px 28px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;">
        ← Back to Arcade
      </button>
    `;
    this._wrap.appendChild(ov);
    document.getElementById("retryBtn")!.onclick = () => { this._cleanup(false); new BaldisBasics(this._g); };
    document.getElementById("goBackBtn")!.onclick = () => this._cleanup();
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
