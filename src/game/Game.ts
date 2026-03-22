import { Engine } from "@babylonjs/core/Engines/engine";
import type { MultiplayerManager } from "../multiplayer/MultiplayerManager";
import { upsertRecord, fetchRecords, upsertCoinRecord, fetchCoinLeaderboard, type CoinRecord } from "./cloudRecords";
import { unlockCost, LEVEL_COUNT } from "./levelData";
import { IS_BEDROCK } from "../bedrock";

export const MAX_COINS = Infinity;

export interface GameState {
  unlockedLocks: Set<number>;
  inventory: number[];
  username: string;
  difficulty: number; // target puzzles needed to win (4=easy, 8=normal, 12=hard)
  coins: number;
  currentLevel: number; // 1-28
  pets: string[]; // owned pet IDs
  autoClicker: boolean; // owned auto clicker
}

export interface PetDef {
  id:       string;
  emoji:    string;
  name:     string;
  cost:     number;
  interval: number; // ms between puzzle solves
  reward:   number; // coins per solve
}

export const PETS: PetDef[] = [
  { id: "cat",     emoji: "🐱", name: "Cat",     cost:        5_000, interval: 80_000, reward:    50 },
  { id: "dog",     emoji: "🐶", name: "Dog",     cost:       25_000, interval: 60_000, reward:   150 },
  { id: "fox",     emoji: "🦊", name: "Fox",     cost:      100_000, interval: 40_000, reward:   400 },
  { id: "dragon",  emoji: "🐉", name: "Dragon",  cost:      500_000, interval: 25_000, reward: 1_500 },
  { id: "unicorn", emoji: "🦄", name: "Unicorn", cost:    2_000_000, interval: 10_000, reward: 5_000 },
];

export interface StoredAccount {
  id: string;
  username: string;
  password: string;
  createdAt: number;
  isOwner?: boolean;
}

const _PFX         = IS_BEDROCK ? "12clocks_bedrock" : "12clocks";
const SAVE_KEY      = `${_PFX}_save`;
const ACCOUNTS_KEY  = `${_PFX}_accounts`;
const SESSION_KEY   = `${_PFX}_session`;
const BANS_KEY      = `${_PFX}_bans`;
const RECORDS_KEY   = `${_PFX}_records`;

export interface GameRecord {
  username:  string;
  accountId: string;
  timeMs:    number;
  date:      number;
}

// Shape stored in localStorage per account
interface SaveData {
  coins:          number;
  currentLevel:   number;
  difficulty:     number;
  unlockedLevels: number[];
  pets:           string[];
  autoClicker:    boolean;
  levels: Record<string, { locks: number[]; inv: number[]; completed: boolean }>;
}

export class Game {
  readonly engine: Engine;
  readonly state: GameState = {
    unlockedLocks: new Set(), inventory: [], username: "",
    difficulty: 12, coins: 0, currentLevel: 1, pets: [], autoClicker: false,
  };
  private _petTimers = new Map<string, number>(); // petId → intervalId
  inMiniGame = false; // true while CoinJump or FruitSlice is active
  private _acActive   = false;
  private _acInterval = 0;
  private _acMouseX   = 0;
  private _acMouseY   = 0;
  private _acSetup    = false;
  private _acIndicator: HTMLDivElement | null = null;
  private _acHidden   = false;
  readonly ui: HTMLElement;
  _disposeScene: (() => void) | null = null;
  mp: MultiplayerManager | null = null;
  private _runStart = 0;

  // Unlocked level numbers (always includes 1)
  private _unlockedLevels = new Set<number>([1]);
  // Per-level saved progress
  private _levelSaves: Record<string, { locks: number[]; inv: number[]; completed: boolean }> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true);
    this.ui = document.getElementById("ui")!;
    window.addEventListener("resize", () => this.engine.resize());
    this._initDevButton();
  }

  private _initDevButton(): void {
    const btn = document.createElement("button");
    btn.textContent = "⚙️";
    btn.style.cssText =
      "position:fixed;bottom:60px;right:14px;z-index:99999;" +
      "width:38px;height:38px;border-radius:50%;border:none;background:rgba(0,0,0,0.35);" +
      "font-size:18px;cursor:pointer;opacity:0.35;transition:opacity 0.2s;pointer-events:all;";
    btn.onmouseenter = () => { btn.style.opacity = "0.8"; };
    btn.onmouseleave = () => { btn.style.opacity = "0.35"; };
    btn.onclick = () => this._devPanelLogin();
    document.body.appendChild(btn);
  }

  private _devPanelLogin(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.75);" +
      "display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:12px;" +
      "padding:26px 28px;width:min(320px,88vw);display:flex;flex-direction:column;gap:12px;";

    const inp = document.createElement("input");
    inp.type = "password";
    inp.placeholder = "••••••";
    inp.autocomplete = "off";
    inp.style.cssText =
      "background:#1e1e1e;border:1px solid rgba(255,255,255,0.15);border-radius:8px;" +
      "color:white;font-size:16px;padding:10px 14px;outline:none;letter-spacing:4px;";

    const err = document.createElement("div");
    err.style.cssText = "color:#ff4040;font-size:12px;min-height:14px;";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "flex:1;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);font-size:13px;" +
      "padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;";
    cancelBtn.onclick = () => ov.remove();

    const enterBtn = document.createElement("button");
    enterBtn.textContent = "Enter";
    enterBtn.style.cssText =
      "flex:1;background:rgba(255,255,255,0.1);color:white;font-size:13px;font-weight:bold;" +
      "padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;";

    const tryLogin = () => {
      if (inp.value === "gavin") {
        ov.remove();
        this._devDashboard();
      } else {
        err.textContent = "Incorrect.";
        inp.value = "";
        inp.focus();
        setTimeout(() => { err.textContent = ""; }, 1600);
      }
    };

    enterBtn.onclick = tryLogin;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });

    row.appendChild(cancelBtn);
    row.appendChild(enterBtn);
    box.appendChild(inp);
    box.appendChild(err);
    box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
    setTimeout(() => inp.focus(), 50);
  }

  private _devDashboard(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:100000;background:#080808;overflow-y:auto;" +
      "font-family:'Courier New',monospace;display:flex;flex-direction:column;" +
      "align-items:center;padding:28px 16px 60px;";

    const header = document.createElement("div");
    header.style.cssText =
      "width:100%;max-width:500px;display:flex;justify-content:space-between;" +
      "align-items:center;margin-bottom:20px;";
    header.innerHTML =
      `<div style="color:white;font-size:18px;font-weight:900;letter-spacing:2px;">⚙️ DEV PANEL</div>` +
      `<div style="color:rgba(255,255,255,0.25);font-size:11px;">12 Clocks</div>`;
    ov.appendChild(header);

    const section = (label: string) => {
      const s = document.createElement("div");
      s.style.cssText =
        "width:100%;max-width:500px;background:#111;border:1px solid rgba(255,255,255,0.1);" +
        "border-radius:10px;padding:18px 20px;margin-bottom:12px;";
      s.innerHTML =
        `<div style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:2px;` +
        `text-transform:uppercase;margin-bottom:12px;">${label}</div>`;
      return s;
    };

    // ── Stats ────────────────────────────────────────────────────────────────
    const stats = section("Stats");
    const addStat = (label: string, val: string | number) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;justify-content:space-between;padding:5px 0;" +
        "border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:13px;";
      row.innerHTML =
        `<span>${label}</span><span style="color:white;font-weight:bold;">${val}</span>`;
      stats.appendChild(row);
    };
    addStat("Coins", this.state.coins.toLocaleString());
    addStat("Level", this.state.currentLevel);
    addStat("Username", this.state.username || "—");
    ov.appendChild(stats);

    // ── Coins editor ─────────────────────────────────────────────────────────
    const coinSec = section("Set Coins");
    const coinInp = document.createElement("input");
    coinInp.type = "number";
    coinInp.value = String(this.state.coins);
    coinInp.style.cssText =
      "background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:6px;" +
      "color:white;font-size:14px;padding:8px 12px;width:140px;margin-right:10px;";
    const setCoinBtn = document.createElement("button");
    setCoinBtn.textContent = "Set";
    setCoinBtn.style.cssText =
      "background:rgba(255,255,255,0.1);color:white;font-size:13px;" +
      "padding:8px 18px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;";
    const coinFb = document.createElement("span");
    coinFb.style.cssText = "color:#80ff80;font-size:12px;margin-left:8px;";
    setCoinBtn.onclick = () => {
      const v = parseInt(coinInp.value, 10);
      if (!isNaN(v) && v >= 0) {
        this.state.coins = v;
        this.save();
        coinFb.textContent = "✓ saved";
        setTimeout(() => { coinFb.textContent = ""; }, 1500);
      }
    };
    coinSec.appendChild(coinInp);
    coinSec.appendChild(setCoinBtn);
    coinSec.appendChild(coinFb);
    ov.appendChild(coinSec);

    // ── Create Minigame ───────────────────────────────────────────────────────
    const mgSec = section("Create Minigame");
    const mgBtn = document.createElement("button");
    mgBtn.textContent = "➕ Create Minigame";
    mgBtn.style.cssText =
      "background:rgba(255,255,255,0.08);color:white;font-size:14px;font-weight:bold;" +
      "padding:11px 22px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);cursor:pointer;font-family:Arial;";
    mgBtn.onclick = () => {
      ov.remove();
      import("../scenes/games/Studio").then(m => {
        this.ui.innerHTML = "";
        new m.Studio(this);
      });
    };
    mgSec.appendChild(mgBtn);
    ov.appendChild(mgSec);

    // ── Close ─────────────────────────────────────────────────────────────────
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close";
    closeBtn.style.cssText =
      "width:100%;max-width:500px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);" +
      "font-size:14px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);" +
      "cursor:pointer;margin-top:6px;font-family:Arial;";
    closeBtn.onclick = () => ov.remove();
    ov.appendChild(closeBtn);

    document.body.appendChild(ov);
  }

  private _minigameWizard(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:100000;background:#080808;overflow-y:auto;" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;" +
      "align-items:center;padding:40px 16px 60px;";

    const title = document.createElement("div");
    title.style.cssText =
      "color:white;font-size:22px;font-weight:900;margin-bottom:8px;letter-spacing:1px;";
    title.textContent = "🎮 Create Minigame";
    ov.appendChild(title);

    const sub = document.createElement("div");
    sub.style.cssText = "color:rgba(255,255,255,0.35);font-size:13px;margin-bottom:32px;";
    sub.textContent = "Answer a couple questions and get your starter code.";
    ov.appendChild(sub);

    const card = (content: HTMLElement) => {
      const c = document.createElement("div");
      c.style.cssText =
        "width:100%;max-width:500px;background:#111;border:1px solid rgba(255,255,255,0.1);" +
        "border-radius:12px;padding:22px 24px;margin-bottom:16px;";
      c.appendChild(content);
      return c;
    };

    // ── Step 1: Name ──────────────────────────────────────────────────────────
    const step1 = document.createElement("div");
    const q1 = document.createElement("div");
    q1.style.cssText = "color:white;font-size:16px;font-weight:bold;margin-bottom:12px;";
    q1.textContent = "1. What is your minigame named?";
    const nameInp = document.createElement("input");
    nameInp.type = "text";
    nameInp.placeholder = "e.g. Speed Clicker";
    nameInp.style.cssText =
      "background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;" +
      "color:white;font-size:15px;padding:10px 14px;width:100%;box-sizing:border-box;outline:none;";
    step1.appendChild(q1);
    step1.appendChild(nameInp);
    ov.appendChild(card(step1));

    // ── Step 2: 2D or 3D ─────────────────────────────────────────────────────
    const step2 = document.createElement("div");
    const q2 = document.createElement("div");
    q2.style.cssText = "color:white;font-size:16px;font-weight:bold;margin-bottom:12px;";
    q2.textContent = "2. Is it 2D or 3D?";
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:12px;";
    let selected = "";
    const makeChoice = (label: string, val: string, desc: string) => {
      const b = document.createElement("button");
      b.style.cssText =
        "flex:1;padding:14px;border-radius:10px;border:2px solid rgba(255,255,255,0.15);" +
        "background:rgba(255,255,255,0.05);color:white;cursor:pointer;font-size:15px;" +
        "font-weight:bold;font-family:Arial;transition:all 0.15s;text-align:center;";
      b.innerHTML = `<div style="font-size:22px;margin-bottom:6px;">${label}</div><div style="font-size:12px;color:rgba(255,255,255,0.45);font-weight:normal;">${desc}</div>`;
      b.onclick = () => {
        selected = val;
        is3D = val === "3d";
        btnRow.querySelectorAll("button").forEach(x => {
          (x as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          (x as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
        });
        b.style.background = "rgba(100,100,255,0.2)";
        b.style.borderColor = "rgba(120,120,255,0.6)";
      };
      return b;
    };
    btnRow.appendChild(makeChoice("🖼️ 2D", "2d", "Canvas drawing, sprites"));
    btnRow.appendChild(makeChoice("🧊 3D", "3d", "BabylonJS, depth, cameras"));
    step2.appendChild(q2);
    step2.appendChild(btnRow);
    ov.appendChild(card(step2));

    // ── Generate button ───────────────────────────────────────────────────────
    const err = document.createElement("div");
    err.style.cssText = "color:#ff4040;font-size:13px;margin-bottom:10px;min-height:16px;";
    ov.appendChild(err);

    const genBtn = document.createElement("button");
    genBtn.textContent = "✨ Generate Template";
    genBtn.style.cssText =
      "width:100%;max-width:500px;background:rgba(100,100,255,0.25);color:white;" +
      "font-size:16px;font-weight:bold;padding:14px;border-radius:12px;" +
      "border:2px solid rgba(120,120,255,0.4);cursor:pointer;margin-bottom:16px;";
    genBtn.onclick = () => {
      gameName = nameInp.value.trim();
      if (!gameName) { err.textContent = "Give your game a name first!"; return; }
      if (!selected)  { err.textContent = "Pick 2D or 3D!"; return; }
      err.textContent = "";
      this._showGeneratedTemplate(gameName, is3D);
      ov.remove();
    };
    ov.appendChild(genBtn);

    const backBtn = document.createElement("button");
    backBtn.textContent = "← Back";
    backBtn.style.cssText =
      "width:100%;max-width:500px;background:none;color:rgba(255,255,255,0.3);" +
      "font-size:13px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;";
    backBtn.onclick = () => { ov.remove(); this._devDashboard(); };
    ov.appendChild(backBtn);

    document.body.appendChild(ov);
    setTimeout(() => nameInp.focus(), 80);
  }

  private _showGeneratedTemplate(name: string, is3D: boolean): void {
    const className = name.replace(/[^a-zA-Z0-9]/g, "");
    const fileName  = `src/scenes/games/${className}.ts`;
    const btnId     = `${className.toLowerCase()}Btn`;

    const template2D = `/**
 * ${name} — minigame
 */
import type { Game } from "../../game/Game";

export class ${className} {
  private _g: Game;
  private _wrap!: HTMLDivElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;background:#1a1a2e;" +
      "pointer-events:all;font-family:Arial,sans-serif;";
    g.ui.appendChild(this._wrap);
    this._build();
  }

  private _build(): void {
    this._wrap.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    this._wrap.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = this._wrap.clientWidth  || window.innerWidth;
      canvas.height = this._wrap.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const loop = () => {
      if (!this._wrap.isConnected) return;
      requestAnimationFrame(loop);
      t += 0.016;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // TODO: draw your game here
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("${name}", W / 2, H / 2);
    };
    requestAnimationFrame(loop);

    // Exit button
    const exitBtn = document.createElement("button");
    exitBtn.textContent = "✕";
    exitBtn.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.5);color:white;" +
      "width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.3);" +
      "cursor:pointer;font-size:16px;";
    exitBtn.onclick = () => this._cleanup();
    this._wrap.appendChild(exitBtn);
  }

  private _cleanup(): void {
    this._wrap.remove();
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}`;

    const template3D = `/**
 * ${name} — 3D minigame
 */
import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class ${className} {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;pointer-events:all;";
    g.ui.appendChild(this._wrap);
    this._build();
  }

  private _build(): void {
    this._scene = new Scene(this._g.engine);
    const cam = new ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 10, Vector3.Zero(), this._scene);
    cam.attachControl(this._g.engine.getRenderingCanvas()!, true);
    new HemisphericLight("light", new Vector3(0, 1, 0), this._scene);

    // TODO: build your 3D scene here
    MeshBuilder.CreateBox("box", { size: 1 }, this._scene);

    this._g.engine.runRenderLoop(() => this._scene.render());

    // Exit button
    const exitBtn = document.createElement("button");
    exitBtn.textContent = "✕";
    exitBtn.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.5);color:white;" +
      "width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.3);" +
      "cursor:pointer;font-size:16px;";
    exitBtn.onclick = () => this._cleanup();
    this._wrap.appendChild(exitBtn);
  }

  private _cleanup(): void {
    this._scene.dispose();
    this._wrap.remove();
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}`;

    const code = is3D ? template3D : template2D;

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:100000;background:#080808;overflow-y:auto;" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;" +
      "align-items:center;padding:28px 16px 60px;";

    const title = document.createElement("div");
    title.style.cssText = "color:#80ff80;font-size:20px;font-weight:900;margin-bottom:6px;";
    title.textContent = `✅ "${name}" template ready!`;
    ov.appendChild(title);

    const steps = document.createElement("div");
    steps.style.cssText =
      "width:100%;max-width:600px;background:#111;border:1px solid rgba(255,255,255,0.1);" +
      "border-radius:10px;padding:18px 20px;margin:12px 0 16px;color:rgba(255,255,255,0.7);" +
      "font-size:13px;line-height:2;";
    steps.innerHTML =
      `<b style="color:white;">How to add it to the game:</b><br>` +
      `1. Copy the code below<br>` +
      `2. Create a new file: <code style="color:#80cfff;">${fileName}</code><br>` +
      `3. Paste the code in and save<br>` +
      `4. Add a button with id <code style="color:#80cfff;">${btnId}</code> in ArcadeScene.ts<br>` +
      `5. Add the onclick handler to load it<br>`;
    ov.appendChild(steps);

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "📋 Copy Code";
    copyBtn.style.cssText =
      "width:100%;max-width:600px;background:rgba(100,200,100,0.2);color:#80ff80;" +
      "font-size:15px;font-weight:bold;padding:12px;border-radius:10px;" +
      "border:1px solid rgba(100,200,100,0.3);cursor:pointer;margin-bottom:12px;";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = "✅ Copied!";
        setTimeout(() => { copyBtn.textContent = "📋 Copy Code"; }, 2000);
      });
    };
    ov.appendChild(copyBtn);

    const pre = document.createElement("pre");
    pre.style.cssText =
      "width:100%;max-width:600px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.08);" +
      "border-radius:10px;padding:18px;color:#c8c8c8;font-size:12px;line-height:1.7;" +
      "overflow-x:auto;white-space:pre;box-sizing:border-box;";
    pre.textContent = code;
    ov.appendChild(pre);

    const doneBtn = document.createElement("button");
    doneBtn.textContent = "← Back to Dev Panel";
    doneBtn.style.cssText =
      "width:100%;max-width:600px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);" +
      "font-size:13px;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);" +
      "cursor:pointer;margin-top:12px;";
    doneBtn.onclick = () => { ov.remove(); this._devDashboard(); };
    ov.appendChild(doneBtn);

    document.body.appendChild(ov);
  }

  /** Start a timer for a single pet (skips if already running). */
  startPetTimer(petId: string): void {
    if (this._petTimers.has(petId)) return;
    const def = PETS.find(p => p.id === petId);
    if (!def) return;
    const id = window.setInterval(() => {
      if (!this.inMiniGame) return;
      this.state.coins += def.reward;
      this.save();
      this._showPetToast(def);
    }, def.interval);
    this._petTimers.set(petId, id);
  }

  /** Start timers for all currently owned pets. */
  startAllPetTimers(): void {
    for (const petId of this.state.pets) this.startPetTimer(petId);
  }

  private _showPetToast(def: PetDef): void {
    const toast = document.createElement("div");
    toast.textContent = `${def.emoji} ${def.name} solved a puzzle! +🪙 ${def.reward.toLocaleString()}`;
    toast.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.85);color:#FFD700;font-size:15px;font-weight:bold;
      padding:10px 20px;border-radius:20px;border:2px solid rgba(255,215,0,0.4);
      font-family:Arial,sans-serif;z-index:9999;pointer-events:none;
      transition:opacity 0.5s;white-space:nowrap;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, 3000);
    setTimeout(() => toast.remove(), 3500);
  }

  // ── Auto clicker ───────────────────────────────────────────────────────────

  /** Callback registered by the active mini-game — called every auto-click tick */
  autoClickCallback: (() => void) | null = null;

  /** Set up right-click toggle. Guard against double-registration. */
  setupAutoClicker(): void {
    if (this._acSetup) return;
    this._acSetup = true;

    // Track cursor so we know where to click
    window.addEventListener("mousemove", e => { this._acMouseX = e.clientX; this._acMouseY = e.clientY; });

    // Right-click toggles on/off
    window.addEventListener("contextmenu", (e: MouseEvent) => {
      if (!this.state.autoClicker) return;
      e.preventDefault();
      if (this._acActive) this._stopAutoClicker(); else this._startAutoClicker();
    });
  }

  private _startAutoClicker(): void {
    this._acActive = true;
    this._updateACIndicator();
    this._acInterval = window.setInterval(() => {
      if (this.autoClickCallback) {
        // In a mini-game — use the game's own handler
        this.autoClickCallback();
      } else {
        // Anywhere else — fire a real left-click at the cursor position
        const el = document.elementFromPoint(this._acMouseX, this._acMouseY);
        if (el) {
          el.dispatchEvent(new MouseEvent("click", {
            bubbles: true, cancelable: true,
            clientX: this._acMouseX, clientY: this._acMouseY,
            view: window,
          }));
          el.dispatchEvent(new PointerEvent("pointerdown", {
            bubbles: true, cancelable: true,
            clientX: this._acMouseX, clientY: this._acMouseY,
            pointerId: 99, isPrimary: false,
          }));
        }
      }
    }, 1);
  }

  private _stopAutoClicker(): void {
    this._acActive = false;
    clearInterval(this._acInterval);
    this._updateACIndicator();
  }

  hideAutoClickerUI(): void { this._acHidden = true;  if (this._acIndicator) this._acIndicator.style.display = "none"; }
  showAutoClickerUI(): void { this._acHidden = false; if (this._acIndicator) this._acIndicator.style.display = ""; }

  private _updateACIndicator(): void {
    if (!this._acIndicator) {
      this._acIndicator = document.createElement("div");
      this._acIndicator.style.cssText = `
        position:fixed;top:8px;left:50%;transform:translateX(-50%);
        font-size:12px;font-weight:bold;font-family:Arial,sans-serif;
        padding:3px 12px;border-radius:20px;z-index:99999;pointer-events:none;
        transition:opacity 0.3s;
      `;
      document.body.appendChild(this._acIndicator);
    }
    if (this._acHidden) { this._acIndicator.style.display = "none"; return; }
    if (this._acActive) {
      this._acIndicator.textContent = "🖱️ AUTO ON";
      this._acIndicator.style.background = "rgba(0,200,0,0.85)";
      this._acIndicator.style.color = "white";
      this._acIndicator.style.border = "1px solid rgba(0,255,0,0.5)";
      this._acIndicator.style.opacity = "1";
    } else {
      this._acIndicator.style.opacity = "0";
    }
  }

  // ── Level helpers ──────────────────────────────────────────────────────────
  isLevelUnlocked(n: number): boolean {
    return n === 1 || this._unlockedLevels.has(n);
  }

  isLevelCompleted(n: number): boolean {
    return !!(this._levelSaves[n]?.completed);
  }

  /** Deduct coins and add level to unlocked set. Call after confirming player can afford it. */
  unlockLevel(n: number): void {
    const cost = unlockCost(n);
    if (this.state.coins < cost) return;
    this.state.coins -= cost;
    this._unlockedLevels.add(n);
    this.save();
  }

  /**
   * Save current unlockedLocks + inventory into the level's save slot.
   * If completed=true: award 100 coins and unlock the next level.
   */
  saveLevelProgress(completed: boolean): void {
    const n = this.state.currentLevel;
    this._levelSaves[n] = {
      locks: [...this.state.unlockedLocks],
      inv:   [...this.state.inventory],
      completed,
    };
    if (completed) {
      this.state.coins += 100;
      const next = n + 1;
      if (next <= LEVEL_COUNT) this._unlockedLevels.add(next);
    }
    this.save();
  }

  // ── Account helpers ────────────────────────────────────────────────────────
  private _getAccounts(): StoredAccount[] {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as StoredAccount[]; }
    catch { return []; }
  }
  private _saveAccounts(list: StoredAccount[]): void {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  }

  get currentAccountId(): string { return localStorage.getItem(SESSION_KEY) ?? ""; }
  get currentAccount(): StoredAccount | null {
    const id = this.currentAccountId;
    return id ? (this._getAccounts().find(a => a.id === id) ?? null) : null;
  }
  get isLoggedIn(): boolean { return !!this.currentAccount; }
  get hasHacks(): boolean {
    return (this.currentAccount?.isOwner ?? false) || this.state.username.includes("00");
  }

  getAllAccounts(): StoredAccount[] { return this._getAccounts(); }

  private _seedAdminAccount(): void {
    const list = this._getAccounts();
    let owner = list.find(a => a.isOwner);
    if (!owner) {
      const id = "owner-" + Date.now().toString(36);
      owner = { id, username: "WeeklyOwner", password: "gavlaw1517", createdAt: Date.now(), isOwner: true };
      list.push(owner);
      this._saveAccounts(list);
    } else if (owner.username === "00OW") {
      owner.username = "WeeklyOwner";
      this._saveAccounts(list);
    }
  }

  usernameExists(username: string): boolean {
    return this._getAccounts().some(a => a.username.toLowerCase() === username.trim().toLowerCase());
  }

  register(username: string, password: string): StoredAccount {
    const list = this._getAccounts();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const acc: StoredAccount = { id, username: username.trim(), password, createdAt: Date.now() };
    list.push(acc);
    this._saveAccounts(list);
    return acc;
  }

  findAccount(username: string, password: string): StoredAccount | null {
    return this._getAccounts().find(
      a => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password
    ) ?? null;
  }

  login(id: string): void {
    localStorage.setItem(SESSION_KEY, id);
    this._loadForAccount(id);
    const acc = this._getAccounts().find(a => a.id === id);
    if (acc) this.state.username = acc.username;
  }

  loginAsGuest(): void {
    const GUEST_ID = "bedrock_guest";
    const list = this._getAccounts();
    if (!list.find(a => a.id === GUEST_ID)) {
      list.push({ id: GUEST_ID, username: "Guest", password: "", createdAt: Date.now() });
      this._saveAccounts(list);
    }
    this.login(GUEST_ID);
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    this.state.username = "";
    this.state.difficulty = 12;
    this.state.coins = 0;
    this.state.currentLevel = 1;
    this._unlockedLevels = new Set([1]);
    this._levelSaves = {};
  }

  changeUsername(newName: string): void {
    const id = this.currentAccountId;
    if (!id) return;
    const list = this._getAccounts();
    const acc = list.find(a => a.id === id);
    if (acc) {
      acc.username = newName.trim();
      this._saveAccounts(list);
      this.state.username = newName.trim();
      this.save();
    }
  }

  // ── Save / Load ────────────────────────────────────────────────────────────
  private _saveKey(): string {
    const id = this.currentAccountId;
    return id ? `${SAVE_KEY}_${id}` : SAVE_KEY;
  }

  save(): void {
    // Also persist current unlockedLocks + inventory into the current level's slot
    const n = this.state.currentLevel;
    this._levelSaves[n] = {
      locks: [...this.state.unlockedLocks],
      inv:   [...this.state.inventory],
      completed: this._levelSaves[n]?.completed ?? false,
    };
    this.state.coins = Math.min(MAX_COINS, this.state.coins);
    const data: SaveData = {
      coins:          this.state.coins,
      currentLevel:   this.state.currentLevel,
      difficulty:     this.state.difficulty,
      unlockedLevels: [...this._unlockedLevels],
      pets:           [...this.state.pets],
      autoClicker:    this.state.autoClicker,
      levels:         this._levelSaves,
    };
    localStorage.setItem(this._saveKey(), JSON.stringify(data));
    this.syncCoins(); // fire-and-forget
  }

  /** Push current coin count to cloud leaderboard. Returns a promise so callers can await it. */
  syncCoins(): Promise<void> {
    const id = this.currentAccountId;
    if (!id || !this.state.username) return Promise.resolve();
    return upsertCoinRecord({
      account_id: id,
      username:   this.state.username,
      coins:      this.state.coins,
      updated_at: Date.now(),
    });
  }

  private _loadForAccount(id: string): void {
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    this.state.difficulty = 12;
    this.state.coins = 0;
    this.state.currentLevel = 1;
    this._unlockedLevels = new Set([1]);
    this._levelSaves = {};
    try {
      const raw = localStorage.getItem(`${SAVE_KEY}_${id}`);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<SaveData> & { locks?: number[]; inv?: number[]; diff?: number };

      // Support old save format (pre-levels)
      if (data.locks) {
        data.locks.forEach(n => this.state.unlockedLocks.add(n));
        this.state.inventory.push(...(data.inv ?? []));
        if (data.diff) this.state.difficulty = data.diff;
        return;
      }

      this.state.coins        = Math.min(MAX_COINS, data.coins ?? 0);
      this.state.currentLevel = data.currentLevel ?? 1;
      this.state.difficulty   = data.difficulty   ?? 12;
      this.state.pets         = data.pets         ?? [];
      this.state.autoClicker  = data.autoClicker  ?? false;
      if (data.unlockedLevels) {
        this._unlockedLevels = new Set([1, ...data.unlockedLevels]);
      }
      if (data.levels) this._levelSaves = data.levels;

      // Load current level's progress into active state
      const lvSave = this._levelSaves[this.state.currentLevel];
      if (lvSave) {
        lvSave.locks.forEach(n => this.state.unlockedLocks.add(n));
        this.state.inventory.push(...lvSave.inv);
      }
    } catch { /* ignore */ }
    this.startAllPetTimers();
    if (this.state.autoClicker) this.setupAutoClicker();
  }

  /** Resets only the current level's puzzle progress (keeps coins + unlocked levels) */
  resetSave(): void {
    const n = this.state.currentLevel;
    delete this._levelSaves[n];
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    this.save();
  }

  /** Full wipe — used by admin panel */
  resetAllSaves(): void {
    localStorage.removeItem(this._saveKey());
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    this.state.difficulty = 12;
    this.state.coins = 0;
    this.state.currentLevel = 1;
    this._unlockedLevels = new Set([1]);
    this._levelSaves = {};
  }

  // ── Ban system ────────────────────────────────────────────────────────────
  getBannedIds(): string[] {
    try { return JSON.parse(localStorage.getItem(BANS_KEY) ?? "[]") as string[]; }
    catch { return []; }
  }
  isBanned(accountId: string): boolean { return this.getBannedIds().includes(accountId); }
  banUser(accountId: string): void {
    const list = this.getBannedIds();
    if (!list.includes(accountId)) {
      list.push(accountId);
      localStorage.setItem(BANS_KEY, JSON.stringify(list));
    }
  }
  unbanUser(accountId: string): void {
    localStorage.setItem(BANS_KEY, JSON.stringify(this.getBannedIds().filter(id => id !== accountId)));
  }

  // ── World records ─────────────────────────────────────────────────────────
  startTimer(): void { this._runStart = Date.now(); }

  saveRecord(): void {
    if (this.state.difficulty < 12) return;
    const timeMs = this._runStart > 0 ? Date.now() - this._runStart : 0;
    this._runStart = 0;
    const rec: GameRecord = {
      username:  this.state.username,
      accountId: this.currentAccountId,
      timeMs,
      date: Date.now(),
    };
    const list = this.getLocalRecords();
    const existing = list.findIndex(r => r.accountId === rec.accountId);
    if (existing !== -1) {
      if (rec.timeMs >= list[existing].timeMs) {
        upsertRecord({ account_id: rec.accountId, username: rec.username, time_ms: rec.timeMs, date: rec.date });
        return;
      }
      list.splice(existing, 1);
    }
    list.push(rec);
    list.sort((a, b) => a.timeMs - b.timeMs);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(list.slice(0, 50)));
    upsertRecord({ account_id: rec.accountId, username: rec.username, time_ms: rec.timeMs, date: rec.date });
  }

  async getCoinLeaderboard(): Promise<CoinRecord[]> {
    return fetchCoinLeaderboard();
  }

  async getRecords(): Promise<GameRecord[]> {
    const cloud = await fetchRecords();
    if (cloud.length > 0) {
      return cloud.map(r => ({ username: r.username, accountId: r.account_id, timeMs: r.time_ms, date: r.date }));
    }
    return this.getLocalRecords();
  }

  getLocalRecords(): GameRecord[] {
    try {
      const raw = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? "[]") as GameRecord[];
      const best = new Map<string, GameRecord>();
      for (const r of raw) {
        const existing = best.get(r.accountId);
        if (!existing || r.timeMs < existing.timeMs) best.set(r.accountId, r);
      }
      return [...best.values()].sort((a, b) => a.timeMs - b.timeMs);
    }
    catch { return []; }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  start(): void {
    this.engine.runRenderLoop(() => {});
    this._seedAdminAccount();
    if (this.isLoggedIn) {
      const acc = this.currentAccount!;
      this._loadForAccount(acc.id);
      this.state.username = acc.username;
      if (this.isBanned(acc.id)) { this.goBanned(); return; }
      this.goTitle();
    } else {
      this.goAuth();
    }
  }

  private _nav(fn: () => void): void {
    this._disposeScene?.();
    this._disposeScene = null;
    this.ui.innerHTML = "";
    fn();
  }

  /** Enter a level: set currentLevel + difficulty, load saved progress, go to intro */
  goLevel(levelNum: number, difficulty: number): void {
    this.state.currentLevel = levelNum;
    this.state.difficulty   = difficulty;
    // Load this level's saved progress (or start fresh)
    const lvSave = this._levelSaves[levelNum];
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    if (lvSave && !lvSave.completed) {
      // Resume in-progress level
      lvSave.locks.forEach(n => this.state.unlockedLocks.add(n));
      this.state.inventory.push(...lvSave.inv);
    }
    this.save();
    this.goIntro();
  }

  goArcade():           void { this._nav(() => import("../scenes/ArcadeScene").then(m => new m.ArcadeScene(this))); }
  goAuth():             void { this._nav(() => import("../scenes/AuthScene").then(m => new m.AuthScene(this))); }
  goLobby():            void { this._nav(() => import("../scenes/LobbyScene").then(m => new m.LobbyScene(this))); }
  goTitle():            void { this._nav(() => import("../scenes/TitleScene").then(m => new m.TitleScene(this))); }
  goLevelSelect():      void { this._nav(() => import("../scenes/LevelSelect").then(m => new m.LevelSelect(this))); }
  goLeaderboard():      void { this._nav(() => import("../scenes/LeaderboardScene").then(m => new m.LeaderboardScene(this))); }
  goCoinLeaderboard():  void { this._nav(() => import("../scenes/CoinLeaderboardScene").then(m => new m.CoinLeaderboardScene(this))); }
  goShop():             void { this._nav(() => import("../scenes/ShopScene").then(m => new m.ShopScene(this))); }
  goIntro():       void {
    this.startTimer();
    this._nav(() => import("../scenes/IntroCutscene").then(m => new m.IntroCutscene(this)));
  }
  goExplore():     void {
    if (this._runStart === 0) this.startTimer();
    this._nav(() => import("../scenes/ExploreScene").then(m => new m.ExploreScene(this)));
  }
  goClock():       void { this._nav(() => import("../scenes/ClockScene").then(m => new m.ClockScene(this))); }
  goPuzzle(i: number): void { this._nav(() => import("../scenes/MiniPuzzle").then(m => new m.MiniPuzzle(this, i))); }
  goEnding():      void { this._nav(() => import("../scenes/EndingScene").then(m => new m.EndingScene(this))); }
  goAdmin():       void { this._nav(() => import("../scenes/AdminPanel").then(m => new m.AdminPanel(this))); }
  goBanned():      void { this._nav(() => import("../scenes/BannedScreen").then(m => new m.BannedScreen(this))); }

  addToInventory(num: number): void {
    if (!this.state.inventory.includes(num)) { this.state.inventory.push(num); this.save(); }
  }
  placeNumber(clockNumber: number): void {
    const idx = this.state.inventory.indexOf(clockNumber);
    if (idx !== -1) this.state.inventory.splice(idx, 1);
    this.state.unlockedLocks.add(clockNumber === 12 ? 0 : clockNumber);
    this.save();
  }
}
