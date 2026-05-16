import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";

// Vents scene:
//  - Tight crawlspace, player is crouched (low camera)
//  - Huggy chases from behind — red glow gets closer if you're slow
//  - At the end is a hanging box — press E to pull it down
//  - Box breaks the floor panel — Huggy falls through

export class PoppyVents {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;
  private _camera!: FreeCamera;
  private _keys: Record<string, boolean> = {};
  private _yaw = 0;
  private _pointerLocked = false;
  private _renderFn!: () => void;
  private _paused = false;

  private _huggProgress = 0; // 0 = far, 1 = caught you
  private _huggLight!: PointLight;
  private _boxMesh!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _floorPanel!: ReturnType<typeof MeshBuilder.CreateBox>;
  private _boxPulled = false;

  private _hud!: HTMLDivElement;
  private _interactHint!: HTMLDivElement;
  private _huggBar!: HTMLDivElement;
  private _huggFill!: HTMLDivElement;

  // Vent is a long straight corridor — player moves along Z axis
  // Vent dimensions: 2 wide, 1.4 tall, 30 deep
  private static VENT_LEN = 30;

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
    this._scene.clearColor = new Color4(0.01, 0.01, 0.01, 1);
    this._scene.fogMode = 3;
    this._scene.fogColor = new Color3(0.01, 0.01, 0.01);
    this._scene.fogStart = 3;
    this._scene.fogEnd = 10;

    // Crouched camera — low Y
    this._camera = new FreeCamera("cam", new Vector3(0, 0.7, 0), this._scene);
    this._camera.minZ = 0.1;
    this._camera.speed = 0;

    // Dim flicker light ahead of player
    const headLight = new PointLight("head", new Vector3(0, 0.7, 2), this._scene);
    headLight.intensity = 0.8;
    headLight.diffuse = new Color3(0.9, 0.85, 0.7);
    headLight.range = 7;

    // Huggy's red glow from behind — gets brighter as he closes in
    this._huggLight = new PointLight("huggyGlow", new Vector3(0, 0.7, -5), this._scene);
    this._huggLight.intensity = 0.3;
    this._huggLight.diffuse = new Color3(1, 0.05, 0.0);
    this._huggLight.range = 8;

    const metalMat = new StandardMaterial("metal", this._scene);
    metalMat.diffuseColor = new Color3(0.28, 0.28, 0.32);
    metalMat.specularColor = new Color3(0.5, 0.5, 0.5);

    const darkMat = new StandardMaterial("dark", this._scene);
    darkMat.diffuseColor = new Color3(0.10, 0.10, 0.12);

    const L = PoppyVents.VENT_LEN;

    // Floor
    const floor = MeshBuilder.CreateBox("floor", { width: 2, height: 0.1, depth: L }, this._scene);
    floor.position.set(0, -0.05, L / 2);
    floor.material = metalMat;
    floor.isPickable = false;

    // Ceiling
    const ceil = MeshBuilder.CreateBox("ceil", { width: 2, height: 0.1, depth: L }, this._scene);
    ceil.position.set(0, 1.4, L / 2);
    ceil.material = metalMat;
    ceil.isPickable = false;

    // Left wall
    const lWall = MeshBuilder.CreateBox("lWall", { width: 0.1, height: 1.5, depth: L }, this._scene);
    lWall.position.set(-1, 0.7, L / 2);
    lWall.material = darkMat;
    lWall.isPickable = false;

    // Right wall
    const rWall = MeshBuilder.CreateBox("rWall", { width: 0.1, height: 1.5, depth: L }, this._scene);
    rWall.position.set(1, 0.7, L / 2);
    rWall.material = darkMat;
    rWall.isPickable = false;

    // End wall
    const endWall = MeshBuilder.CreateBox("endWall", { width: 2, height: 1.5, depth: 0.1 }, this._scene);
    endWall.position.set(0, 0.7, L);
    endWall.material = darkMat;
    endWall.isPickable = false;

    // Vent slats (decoration — horizontal bars on walls every few units)
    for (let z = 2; z < L; z += 4) {
      const slat = MeshBuilder.CreateBox(`slat${z}`, { width: 2.1, height: 0.08, depth: 0.08 }, this._scene);
      slat.position.set(0, 1.1, z);
      slat.material = metalMat;
      slat.isPickable = false;
    }

    // Weak floor panel near the end (where box will break it)
    const weakMat = new StandardMaterial("weak", this._scene);
    weakMat.diffuseColor = new Color3(0.35, 0.28, 0.18);
    weakMat.emissiveColor = new Color3(0.05, 0.03, 0.0);
    this._floorPanel = MeshBuilder.CreateBox("weakFloor", { width: 2, height: 0.12, depth: 3 }, this._scene);
    this._floorPanel.position.set(0, -0.04, L - 4);
    this._floorPanel.material = weakMat;
    this._floorPanel.isPickable = false;

    // Hanging box above the weak panel (pull it with blue hand)
    const boxMat = new StandardMaterial("box", this._scene);
    boxMat.diffuseColor = new Color3(0.6, 0.5, 0.3);
    boxMat.emissiveColor = new Color3(0.08, 0.06, 0.02);
    this._boxMesh = MeshBuilder.CreateBox("box", { width: 0.9, height: 0.9, depth: 0.9 }, this._scene);
    this._boxMesh.position.set(0, 1.0, L - 4);
    this._boxMesh.material = boxMat;
    this._boxMesh.isPickable = false;

    // ── HUD & UI ────────────────────────────────────────────────────────────
    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:12px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:white;font-family:'Arial Black',Arial;font-size:15px;font-weight:900;" +
      "padding:8px 24px;border-radius:20px;pointer-events:none;text-align:center;white-space:nowrap;";
    this._hud.textContent = "🕳️ CRAWL! Huggy is behind you!";
    this._wrap.appendChild(this._hud);

    this._interactHint = document.createElement("div");
    this._interactHint.style.cssText =
      "position:absolute;bottom:72px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.72);color:#00ffb2;font-family:Arial;font-size:14px;font-weight:bold;" +
      "padding:8px 20px;border-radius:12px;pointer-events:none;display:none;";
    this._wrap.appendChild(this._interactHint);

    // Huggy danger bar at top
    const huggLabel = document.createElement("div");
    huggLabel.style.cssText =
      "position:absolute;top:56px;left:50%;transform:translateX(-50%);" +
      "color:rgba(255,80,80,0.8);font-family:Arial;font-size:11px;font-weight:bold;" +
      "pointer-events:none;letter-spacing:1px;";
    huggLabel.textContent = "HUGGY";
    this._wrap.appendChild(huggLabel);

    this._huggBar = document.createElement("div");
    this._huggBar.style.cssText =
      "position:absolute;top:70px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.6);border:2px solid rgba(255,80,80,0.4);border-radius:10px;" +
      "width:200px;height:14px;overflow:hidden;pointer-events:none;";
    this._huggFill = document.createElement("div");
    this._huggFill.style.cssText =
      "height:100%;width:0%;background:linear-gradient(90deg,#ef4444,#dc2626);border-radius:10px;transition:width 0.1s;";
    this._huggBar.appendChild(this._huggFill);
    this._wrap.appendChild(this._huggBar);

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
    ctrlHint.textContent = "Click to look · W to crawl forward · Press E to interact";
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
    const cam = this._camera;
    const L = PoppyVents.VENT_LEN;

    // Only forward/back in the vent — left/right is tight
    let dz = 0;
    if (this._keys["w"] || this._keys["arrowup"])   dz += 0.09;
    if (this._keys["s"] || this._keys["arrowdown"]) dz -= 0.06;

    const nz = Math.max(0.3, Math.min(L - 0.5, cam.position.z + dz));
    cam.position.z = nz;
    cam.position.x = 0;
    cam.position.y = 0.7;

    // Huggy closes in when player is slow or moving backwards
    const speed = dz;
    if (speed <= 0) {
      this._huggProgress = Math.min(1, this._huggProgress + 0.003);
    } else {
      this._huggProgress = Math.max(0, this._huggProgress - 0.001);
    }

    // Huggy light tracks behind player
    const huggZ = cam.position.z - 3 - (1 - this._huggProgress) * 8;
    this._huggLight.position.z = huggZ;
    this._huggLight.intensity = 0.2 + this._huggProgress * 1.5;

    // Update danger bar
    this._huggFill.style.width = `${this._huggProgress * 100}%`;

    // Caught!
    if (this._huggProgress >= 1) {
      this._triggerCaught();
      return;
    }

    // Update head light to follow player
    const headLight = this._scene.getLightByName("head") as PointLight;
    if (headLight) headLight.position.z = cam.position.z + 2;

    this._updateInteractHint();
  }

  private _getNearby(): "box" | null {
    if (!this._boxPulled &&
        Vector3.Distance(this._camera.position, this._boxMesh.position) < 2.5)
      return "box";
    return null;
  }

  private _updateInteractHint(): void {
    const n = this._getNearby();
    if (!n) { this._interactHint.style.display = "none"; return; }
    this._interactHint.style.display = "block";
    this._interactHint.textContent = "Press E — Pull box down! 🔵";
  }

  private _tryInteract(): void {
    if (this._paused || this._boxPulled) return;
    if (!this._getNearby()) return;
    this._pullBox();
  }

  private _pullBox(): void {
    this._boxPulled = true;
    this._paused = true;
    if (document.pointerLockElement) document.exitPointerLock();

    // Box drops animation via cutscene slides
    const slides = [
      { icon: "🔵", text: "You fire the BLUE hand at the box…" },
      { icon: "📦", text: "The box tears free from the ceiling!" },
      { icon: "💥", text: "CRASH! It smashes through the weak floor panel!" },
      { icon: "😱", text: "Huggy can't stop — he falls right through the hole!" },
      { icon: "👇", text: "You hear a distant thud far below.\n\nHuggy Wuggy is gone." },
    ];
    let slide = 0;

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.95);" +
      "display:flex;align-items:center;justify-content:center;font-family:'Arial Black',Arial;";
    this._wrap.appendChild(ov);

    // Hide floor panel to show it broke
    this._floorPanel.setEnabled(false);
    this._boxMesh.setEnabled(false);

    const render = () => {
      const s = slides[slide];
      const isLast = slide === slides.length - 1;
      ov.innerHTML = `
        <div style="text-align:center;max-width:400px;padding:20px;">
          <div style="font-size:72px;margin-bottom:16px;">${s.icon}</div>
          <div style="color:white;font-size:18px;line-height:1.7;white-space:pre-line;margin-bottom:32px;">${s.text}</div>
          <button id="ventNext" style="
            background:${isLast ? "#22c55e" : "rgba(255,255,255,0.12)"};
            color:white;font-size:15px;font-weight:bold;
            padding:12px 32px;border-radius:24px;
            border:${isLast ? "none" : "1.5px solid rgba(255,255,255,0.25)"};
            cursor:pointer;">
            ${isLast ? "Continue →" : "..."}
          </button>
        </div>`;
      document.getElementById("ventNext")!.onclick = () => {
        slide++;
        if (slide >= slides.length) {
          ov.remove();
          this._cleanup(false);
          import("./PoppyElectrical2").then(m => new m.PoppyElectrical2(this._g));
        } else render();
      };
    };
    render();
  }

  private _triggerCaught(): void {
    if (this._paused) return;
    this._paused = true;
    if (document.pointerLockElement) document.exitPointerLock();

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(120,0,0,0.97);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:'Arial Black',Arial;";
    ov.innerHTML = `
      <div style="font-size:72px;margin-bottom:12px;">😱</div>
      <div style="color:#ef4444;font-size:30px;font-weight:900;margin-bottom:8px;">HUGGY GOT YOU!</div>
      <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-bottom:32px;">You were too slow…</div>
      <button id="retryVent" style="background:#ef4444;color:white;font-size:16px;font-weight:bold;
        padding:12px 36px;border-radius:24px;border:none;cursor:pointer;margin-bottom:12px;">
        🔄 Try Again
      </button>
      <button id="exitVent" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);
        font-size:13px;padding:10px 24px;border-radius:20px;
        border:1px solid rgba(255,255,255,0.2);cursor:pointer;">
        ← Back to Arcade
      </button>`;
    this._wrap.appendChild(ov);
    document.getElementById("retryVent")!.onclick = () => {
      this._cleanup(false);
      new PoppyVents(this._g);
    };
    document.getElementById("exitVent")!.onclick = () => this._cleanup();
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
