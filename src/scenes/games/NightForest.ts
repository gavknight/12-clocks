import type { Game } from "../../game/Game";
import { gpState } from "../../input/GamepadManager";

export type NightForestClass = "survivor" | "scout" | "firekeeper" | "warrior";

const NIGHT_DURATION       = 120_000;
const DAY_DURATION         = 120_000;   // same as nights so players can explore

const HUNGRY_NIGHTS        = new Set([32, 67, 69, 98]); // deer replaced by hungry deer
const PLAYER_SPEED         = 150;
const TREE_RADIUS          = 24;
const MONSTER_RADIUS       = 16;
const PLAYER_RADIUS        = 14;
const TORCH_RADIUS         = 110;
const CAMPFIRE_RADIUS      = 75;
const CAMPFIRE_LIGHT       = 160;
const MAX_NIGHTS           = 99;
const CHOP_RADIUS          = 55;
const LOG_PICKUP_RADIUS    = 32;
const KID_PICKUP_RADIUS    = 36;
const FIRE_INTERACT_RADIUS = 70;
const INITIAL_FUEL         = 240_000;   // 4 min to start
const FIRE_FUEL_PER_LOG    = 80_000;    // 80s per log
const FIRE_FUEL_PER_COAL   = 120_000;   // 50% of 4min bar
const FIRE_FUEL_PER_CAN    = 216_000;   // 90% of 4min bar
const FIRE_FUEL_PER_KID    = 180_000;   // 3 min per rescued kid
const LOGS_FOR_UPGRADE     = 6;         // logs fed before light expands
const TREE_COUNT           = 28;
const TREE_CHOP_HITS       = 3;
const LOGS_PER_TREE        = 3;
const WORKBENCH_RADIUS     = 44;
const GRINDER_RADIUS       = 44;
const LOGS_PER_PLANK       = 2;    // logs needed to grind 1 plank
const ISO_Y                = 0.75; // vertical compression for Roblox-style angled camera

const BEDS = [
  { name: "Leaf Bed",  plankCost: 2, scrapCost: 0, dayBonus: 1, color: "#4a9a4a", icon: "🌿" },
  { name: "Wood Bed",  plankCost: 3, scrapCost: 0, dayBonus: 2, color: "#8B6343", icon: "🪵" },
  { name: "Cozy Bed",  plankCost: 5, scrapCost: 0, dayBonus: 3, color: "#c07c5c", icon: "🛏️" },
  { name: "Royal Bed", plankCost: 7, scrapCost: 0, dayBonus: 5, color: "#FFD700", icon: "👑" },
] as const;

// Extra scrap-only crafting recipes (upgrades, not beds)
const SCRAP_RECIPES = [
  { name: "Wolf Shield",  scrapCost: 3, plankCost: 0, desc: "Take 6 wolf hits",     icon: "🛡️", color: "#5599ff" },
  { name: "Big Lantern",  scrapCost: 2, plankCost: 1, desc: "Bigger torch range",   icon: "🔦", color: "#ffdd44" },
  { name: "Wolf Trap",    scrapCost: 4, plankCost: 0, desc: "Slows wolves at camp", icon: "🪤", color: "#ff7700" },
  { name: "Speed Boots",  scrapCost: 3, plankCost: 1, desc: "Run 30% faster",       icon: "👟", color: "#44ffaa" },
] as const;

interface Vec2    { x: number; y: number; }
interface Tree    { x: number; y: number; hp: number; }
interface LogItem { id: number; x: number; y: number; }
interface Monster {
  x: number; y: number; vx: number; vy: number;
  kind:   "deer" | "owl" | "ram" | "bat";
  charge: number;   // ram charge timer (ms)
  angle:  number;   // owl orbit angle (radians)
}
interface Wolf    { x: number; y: number; vx: number; vy: number; }

interface AdminBtn { label: string; cb: () => void; bx: number; by: number; bw: number; bh: number; }

interface KidDef {
  id:        number;
  name:      string;
  emoji:     string;
  tentColor: string;
}

interface KidOnMap extends KidDef {
  x:       number;
  y:       number;
  rescued: boolean;
}

const KID_DEFS: KidDef[] = [
  { id: 0, name: "Dino Kid",   emoji: "🦕", tentColor: "#ff4444" },
  { id: 1, name: "Kraken Kid", emoji: "🦑", tentColor: "#4488ff" },
  { id: 2, name: "Squid Kid",  emoji: "🐙", tentColor: "#ffdd00" },
  { id: 3, name: "Koala Kid",  emoji: "🐨", tentColor: "#cc44ff" },
];

// Tent positions around campfire (angles in radians)
const TENT_ANGLES = [
  Math.PI * 1.25,  // SW
  Math.PI * 1.75,  // SE  (actually NW/NE since Y is flipped)
  Math.PI * 0.25,  // NE
  Math.PI * 0.75,  // NW
];

export class NightForest {
  private _canvas: HTMLCanvasElement;
  private _ctx:    CanvasRenderingContext2D;
  private _g:      Game;

  private _player:   Vec2      = { x: 0, y: 0 };
  private _trees:    Tree[]    = [];
  private _logs:     LogItem[] = [];
  private _sack:     string[]  = [];
  private _monsters: Monster[] = [];
  private _wolves:   Wolf[]    = [];
  private _kids:     KidOnMap[] = [];
  private _cfX    = 0;
  private _cfY    = 0;
  private _worldW = 0;
  private _worldH = 0;
  private _zoom   = 1.0;  // current zoom (1 = normal, <1 = zoomed out)

  private _coals:    LogItem[] = [];
  private _fuelCans: LogItem[] = [];

  private _fireFuel      = INITIAL_FUEL;
  private _fireOut       = false;
  private _fireWasOut    = false;   // tracks transition so we only toast once
  private _logIdSeq      = 0;
  private _logsFed       = 0;   // total logs fed to fire
  private _coalFed       = 0;   // total coal fed — 2 = zoom unlock
  private _fuelCansFed   = 0;   // total fuel cans fed — 2 = zoom unlock
  private _chopFlash     = 0;
  private _dayCount      = 0;   // number of kids rescued (= day counter)

  // Wolf / player health
  private _health        = 4;   // player HP (wolves deal 1 per hit)
  private _invincible    = 0;   // ms remaining of invincibility after wolf hit
  private _wolvesSpawned = false; // wolves spawn ONCE at night 3
  private _killedBy      = "";  // "deer" or "wolf"

  // Board overlay shown at start of each day
  private _showBoard   = false;
  private _boardTimer  = 0;

  private _night      = 0;
  private _phase: "day" | "night" = "night";
  private _phaseTimer = 0;
  private _done       = false;
  private _raf        = 0;
  private _lastTs     = 0;
  private _ts         = 0;

  // Workbench / crafting
  private _wbX        = 0;
  private _wbY        = 0;
  private _bedsBuilt  = [false, false, false, false];
  private _showCraft  = false;

  // Grinder
  private _grX        = 0;
  private _grY        = 0;
  private _planks     = 0;
  private _grindFlash = 0;

  // Scrap
  private _scraps:        LogItem[] = [];
  private _scrapCount     = 0;

  // Upgrades from scrap recipes
  private _hasShield      = false;   // 6 wolf hits
  private _hasLantern     = false;   // bigger torch
  private _hasTrap        = false;   // slows wolves
  private _hasBoots       = false;   // +30% speed
  private _recipesBuilt   = [false, false, false, false];

  // Craft card click bounds (set each frame when panel open)
  private _craftCardBounds: { x: number; y: number; w: number; h: number; idx: number; isBed: boolean }[] = [];

  // Admin panel
  private _showAdmin       = false;
  private _godMode         = false;
  private _adminToggleBtn  = { x: 0, y: 0, w: 0, h: 0 };

  // Class modifiers
  private _fuelMult        = 1.0;   // multiplier for all fuel gains
  private _wolfSpeedMult   = 1.0;   // wolf speed multiplier (warrior reduces)

  // Run monster — one type chosen at night 3, replaces deer for the whole run
  private _runMonster: "owl" | "ram" | "bat" | null = null;

  // Cutscene shown when run monster first appears
  private _showCutscene  = false;
  private _cutsceneTimer = 0;
  private _skipZone      = { x: 0, y: 0, w: 0, h: 0 };

  // Jumpscare on death
  private _jumpscareActive = false;
  private _jumpscareTimer  = 0;   // counts down from 1500ms
  private _jumpscareKind: Monster["kind"] | "wolf" = "deer";

  private _keys = new Set<string>();
  private _cleanupKeys  = () => {};
  private _cleanupClick = () => {};
  private _cleanupWheel = () => {};
  private _cleanupTouch = () => {};
  private _userZoom     = 1.3;  // scroll-wheel zoom multiplier

  constructor(game: Game, cls: NightForestClass = "survivor") {
    this._g = game;

    // Apply class bonuses before init
    if (cls === "scout") {
      this._hasBoots  = true;
      this._fuelMult  = 0.75;
    } else if (cls === "firekeeper") {
      this._hasLantern = true;
      this._fuelMult   = 1.5;
    } else if (cls === "warrior") {
      this._hasShield     = true;
      this._health        = 6;
      this._fuelMult      = 0.75;
      this._wolfSpeedMult = 0.8;
    }

    game.ui.innerHTML = `
      <div id="nfRoot" style="
        position:relative;width:100%;height:100%;
        background:#000;pointer-events:all;touch-action:none;
      ">
        <canvas id="nfCanvas" style="display:block;width:100%;height:100%;"></canvas>
      </div>
    `;

    this._canvas = document.getElementById("nfCanvas") as HTMLCanvasElement;
    this._ctx    = this._canvas.getContext("2d")!;
    this._resize();
    window.addEventListener("resize", () => this._resize());

    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","KeyE","KeyR"].includes(e.code))
        e.preventDefault();
      if (e.type === "keydown") {
        this._keys.add(e.code);
        if (this._showCutscene) { this._showCutscene = false; return; }
        if (e.code === "KeyE") this._onE();
        if (e.code === "KeyR") this._onR();
        if (e.code === "Backquote") { this._showAdmin = !this._showAdmin; this._showCraft = false; }
        if (this._showCraft) {
          if (["Digit1","Digit2","Digit3","Digit4"].includes(e.code))
            this._tryCraft(parseInt(e.code[5]) - 1, true);
          if (["Digit5","Digit6","Digit7","Digit8"].includes(e.code))
            this._tryCraft(parseInt(e.code[5]) - 5, false);
        }
      } else {
        this._keys.delete(e.code);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup",   onKey);
    this._cleanupKeys = () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup",   onKey);
    };

    const onClick = (e: MouseEvent) => {
      const rect = this._canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (this._canvas.width  / rect.width);
      const sy = (e.clientY - rect.top)  * (this._canvas.height / rect.height);

      // Cutscene SKIP button
      if (this._showCutscene) {
        const sk = this._skipZone;
        if (sx >= sk.x && sx <= sk.x + sk.w && sy >= sk.y && sy <= sk.y + sk.h) {
          this._showCutscene = false;
        }
        return;
      }

      // Admin toggle button (always clickable)
      const tb = this._adminToggleBtn;
      if (sx >= tb.x && sx <= tb.x + tb.w && sy >= tb.y && sy <= tb.y + tb.h) {
        this._showAdmin = !this._showAdmin;
        this._showCraft = false;
        return;
      }

      // Craft card clicks
      if (this._showCraft) {
        for (const cb of this._craftCardBounds) {
          if (sx >= cb.x && sx <= cb.x + cb.w && sy >= cb.y && sy <= cb.y + cb.h) {
            this._tryCraft(cb.idx, cb.isBed);
            return;
          }
        }
      }

      // Admin panel button clicks (screen space)
      if (this._showAdmin) {
        for (const btn of this._adminBtns) {
          if (sx >= btn.bx && sx <= btn.bx + btn.bw && sy >= btn.by && sy <= btn.by + btn.bh) {
            btn.cb();
            return;
          }
        }
      }

      // Convert screen coords → world coords via camera
      const wx = (sx - this._canvas.width  / 2) / this._zoom + this._player.x;
      const wy = (sy - this._canvas.height / 2) / (ISO_Y * this._zoom) + this._player.y;
      this._onChop(wx, wy);
    };
    this._canvas.addEventListener("click", onClick);
    this._cleanupClick = () => this._canvas.removeEventListener("click", onClick);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12;
      this._userZoom = Math.max(0.4, Math.min(3.5, this._userZoom * factor));
    };
    this._canvas.addEventListener("wheel", onWheel, { passive: false });
    this._cleanupWheel = () => this._canvas.removeEventListener("wheel", onWheel);

    if (window.matchMedia("(pointer:coarse)").matches) this._setupTouchControls();

    this._g.inMiniGame        = true;
    this._g.autoClickCallback = () => {};

    this._spawnTrees();
    this._spawnKids();
    this._spawnPickups();
    this._startNight();

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _resize(): void {
    this._canvas.width  = this._canvas.clientWidth  || 360;
    this._canvas.height = this._canvas.clientHeight || 600;
    // World is 2x the screen — campfire at world center
    this._worldW = this._canvas.width  * 2;
    this._worldH = this._canvas.height * 2;
    this._cfX    = this._worldW / 2;
    this._cfY    = this._worldH / 2;
    // Workbench sits to the right of the campfire
    this._wbX    = this._cfX + 140;
    this._wbY    = this._cfY;
    // Grinder sits right next to the workbench
    this._grX    = this._cfX + 140 + 95;
    this._grY    = this._cfY;
  }

  // Hungry deer: specific nights OR fire is out
  private _isHungry(): boolean {
    return HUNGRY_NIGHTS.has(this._night) || this._fireOut;
  }

  private _spawnPickups(): void {
    // Level 1 start: 1 coal only. Trees are the main fuel.
    // More coal unlocks at level 2 (6 logs fed), fuel cans at level 3 (2 coal fed).
    this._coals    = [this._placeItem()];
    this._fuelCans = [];
    // Scrap scattered around map from the start
    this._scraps   = Array.from({ length: 6 }, () => this._placeItem());
  }

  private _placeItem(): LogItem {
    const W = this._worldW || 720;
    const H = this._worldH || 1200;
    let x = 0, y = 0, tries = 0;
    do {
      x = 40 + Math.random() * (W - 80);
      y = 40 + Math.random() * (H - 80);
      tries++;
    } while (tries < 100 && Math.hypot(x - W/2, y - H/2) < CAMPFIRE_RADIUS + 40);
    return { id: this._logIdSeq++, x, y };
  }

  private _spawnTrees(): void {
    const W = this._worldW || 720;
    const H = this._worldH || 1200;
    this._trees = [];
    let attempts = 0;
    while (this._trees.length < TREE_COUNT && attempts < 600) {
      attempts++;
      const x = 30 + Math.random() * (W - 60);
      const y = 30 + Math.random() * (H - 60);
      if (Math.hypot(x - W/2, y - H/2) < CAMPFIRE_RADIUS + TREE_RADIUS + 20) continue;
      if (this._trees.some(t => Math.hypot(t.x - x, t.y - y) < TREE_RADIUS * 2 + 8)) continue;
      this._trees.push({ x, y, hp: TREE_CHOP_HITS });
    }
  }

  private _spawnKids(): void {
    const W = this._worldW || 720;
    const H = this._worldH || 1200;
    this._kids = KID_DEFS.map(def => {
      let x = 0, y = 0, attempts = 0;
      do {
        x = 40 + Math.random() * (W - 80);
        y = 40 + Math.random() * (H - 80);
        attempts++;
      } while (
        attempts < 200 &&
        (Math.hypot(x - W/2, y - H/2) < CAMPFIRE_LIGHT + 40 ||
         this._trees.some(t => Math.hypot(t.x - x, t.y - y) < TREE_RADIUS + 20))
      );
      return { ...def, x, y, rescued: false };
    });
  }

  private _spawnEnemy(W: number, H: number, kind: Monster["kind"] = "deer"): Monster {
    let x = 0, y = 0;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0)      { x = Math.random() * W; y = -20; }
    else if (edge === 1) { x = W + 20; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = H + 20; }
    else                 { x = -20; y = Math.random() * H; }
    return { x, y, vx: 0, vy: 0, kind, charge: 0, angle: Math.random() * Math.PI * 2 };
  }

  private _startNight(): void {
    this._night++;
    this._phase      = "night";
    this._phaseTimer = NIGHT_DURATION;
    this._monsters   = [];
    this._wolves     = [];
    this._showBoard  = false;

    const W = this._worldW || 720;
    const H = this._worldH || 1200;

    // Night 3: roll for a run monster (each type has 20% chance, one per run)
    if (this._night === 3 && this._runMonster === null) {
      const roll = Math.random();
      if      (roll < 0.20) this._runMonster = "owl";
      else if (roll < 0.40) this._runMonster = "ram";
      else if (roll < 0.60) this._runMonster = "bat";
      // else null — deer all game

      if (this._runMonster !== null) {
        // Freeze timer and show cutscene before the night begins
        this._phaseTimer   = NIGHT_DURATION; // will be held while cutscene plays
        this._showCutscene = true;
        this._cutsceneTimer = 5000; // auto-skip after 5s
      }
    }

    // Spawn monsters — run monster replaces deer once chosen
    const monsterKind: Monster["kind"] = this._runMonster ?? "deer";
    const monsterCount = Math.min(1 + Math.floor(this._night / 20), 4);
    for (let i = 0; i < monsterCount; i++) {
      this._monsters.push(this._spawnEnemy(W, H, monsterKind));
    }

    if (monsterKind === "deer" && HUNGRY_NIGHTS.has(this._night)) {
      this._showToast(`🦌 NIGHT ${this._night} — HUNGRY DEER TONIGHT! They're faster!`, "#ff2200", 5000);
    }

    // Wolves — spawn ONCE at night 3, same pack persists forever
    if (this._night >= 3 && !this._wolvesSpawned) {
      this._wolvesSpawned = true;
      const wolfCount = 3;
      for (let i = 0; i < wolfCount; i++) {
        this._wolves.push(this._spawnEnemy(W, H));
      }
    }

    this._player = { x: this._cfX, y: this._cfY - CAMPFIRE_RADIUS * 0.5 };
  }

  private _startDay(): void {
    this._phase      = "day";
    this._phaseTimer = DAY_DURATION;
    this._showBoard  = true;
    this._boardTimer = 4000;
    this._player = { x: this._cfX, y: this._cfY - CAMPFIRE_RADIUS * 0.5 };

    if (this._night === 98) {
      // Day 98: hungry deer don't rest!
      this._monsters = [];
      const W = this._worldW, H = this._worldH;
      for (let i = 0; i < 4; i++) this._monsters.push(this._spawnEnemy(W, H));
      this._showToast("🦌 DAY 98 — The hungry deer don't rest! Run!", "#ff2200", 5000);
    } else {
      this._monsters = [];
    }
    // wolves persist — do NOT clear this._wolves
  }

  // ── Chop ───────────────────────────────────────────────────────────────────
  private _onChop(cx: number, cy: number): void {
    if (this._done) return;
    let best: Tree | null = null;
    let bestDist = CHOP_RADIUS + TREE_RADIUS;
    for (const t of this._trees) {
      const dc = Math.hypot(t.x - cx, t.y - cy);
      const dp = Math.hypot(t.x - this._player.x, t.y - this._player.y);
      if (dc < TREE_RADIUS + 20 && dp < CHOP_RADIUS + TREE_RADIUS && dc < bestDist) {
        best = t; bestDist = dc;
      }
    }
    if (!best) return;
    best.hp--;
    this._chopFlash = 200;
    if (best.hp <= 0) {
      this._trees = this._trees.filter(t => t !== best);
      for (let i = 0; i < LOGS_PER_TREE; i++) {
        const angle = (Math.PI * 2 * i) / LOGS_PER_TREE + Math.random() * 0.5;
        const dist  = 20 + Math.random() * 15;
        this._logs.push({
          id: this._logIdSeq++,
          x: best!.x + Math.cos(angle) * dist,
          y: best!.y + Math.sin(angle) * dist,
        });
      }
    }
  }

  // ── E key ──────────────────────────────────────────────────────────────────
  private _onE(): void {
    if (this._done) return;

    // 1. Workbench — highest priority so logs in sack don't get dropped instead
    const distToWB = Math.hypot(this._player.x - this._wbX, this._player.y - this._wbY);
    if (distToWB < WORKBENCH_RADIUS) {
      this._showCraft = !this._showCraft;
      return;
    }

    const distToCF = Math.hypot(this._player.x - this._cfX, this._player.y - this._cfY);

    // 2. Near campfire + has a kid in sack → rescue (big fuel!)
    const kidSackIdx = this._sack.findIndex(s => s.startsWith("kid_"));
    if (distToCF < FIRE_INTERACT_RADIUS && kidSackIdx !== -1) {
      const kidId = parseInt(this._sack[kidSackIdx].split("_")[1]);
      this._sack.splice(kidSackIdx, 1);
      const kid = this._kids.find(k => k.id === kidId);
      if (kid) {
        kid.rescued = true;
        this._dayCount++;
        this._fireFuel = Math.min(this._fireFuel + FIRE_FUEL_PER_KID, 600_000);
        this._fireOut  = false;
        // All 4 kids rescued → 4x day multiplier bonus
        if (this._kids.every(k => k.rescued)) {
          this._dayCount *= 4;
          this._showToast("🎉 ALL KIDS RESCUED! ×4 DAY BONUS!", "#FFD700", 4000);
        }
      }
      return;
    }

    // 2. Near campfire + has log/coal/fuelcan → feed fire
    const logIdx     = this._sack.indexOf("log");
    const coalIdx    = this._sack.indexOf("coal");
    const fuelCanIdx = this._sack.indexOf("fuelcan");
    if (distToCF < FIRE_INTERACT_RADIUS && (logIdx !== -1 || coalIdx !== -1 || fuelCanIdx !== -1)) {
      if (logIdx !== -1) {
        this._sack.splice(logIdx, 1);
        this._fireFuel = Math.min(this._fireFuel + FIRE_FUEL_PER_LOG * this._fuelMult, 600_000);
        this._logsFed++;
        const prevUpgrades = Math.floor((this._logsFed - 1) / LOGS_FOR_UPGRADE);
        const newUpgrades  = Math.floor(this._logsFed / LOGS_FOR_UPGRADE);
        if (newUpgrades > prevUpgrades) {
          this._showToast("🔥 FIRE REACHED 100%. The Map has grown bigger!", "#ff8800", 3500);
          // Level 2 fire: 3 more coal pieces appear
          for (let i = 0; i < 3; i++) this._coals.push(this._placeItem());
        }
      } else if (coalIdx !== -1) {
        this._sack.splice(coalIdx, 1);
        this._fireFuel = Math.min(this._fireFuel + FIRE_FUEL_PER_COAL * this._fuelMult, 600_000);
        this._coalFed++;
        const coalMsg = this._coalFed === 2 ? "⬛ Coal burned. The Map has grown bigger!" : "⬛ Coal added! +50% fuel";
        if (this._coalFed === 2) {
          // Level 3 fire: 2 fuel cans appear
          for (let i = 0; i < 2; i++) this._fuelCans.push(this._placeItem());
        }
        this._showToast(coalMsg, "#aaaaaa", 2000);
      } else {
        this._sack.splice(fuelCanIdx, 1);
        this._fireFuel = Math.min(this._fireFuel + FIRE_FUEL_PER_CAN * this._fuelMult, 600_000);
        this._fuelCansFed++;
        const canMsg = this._fuelCansFed === 2 ? "⛽ FUEL REACHED 100%. The Map has grown bigger!" : "⛽ Fuel can! +90% fuel";
        this._showToast(canMsg, "#ffaa00", 2000);
      }
      this._fireOut = false;
      return;
    }

    // 3. Near a kid on ground → pick up
    let closestKid: KidOnMap | null = null;
    let closestKidDist = KID_PICKUP_RADIUS;
    for (const k of this._kids) {
      if (k.rescued) continue;
      const d = Math.hypot(k.x - this._player.x, k.y - this._player.y);
      if (d < closestKidDist) { closestKid = k; closestKidDist = d; }
    }
    if (closestKid) {
      this._sack.push(`kid_${closestKid.id}`);
      // Remove from ground temporarily (put back if dropped)
      closestKid.x = -999; closestKid.y = -999;
      return;
    }

    // 4. Near a log / coal / fuel can → pick up (closest wins)
    type GroundItem = { item: LogItem; type: string; arr: LogItem[] };
    let bestGround: GroundItem | null = null;
    let bestDist = LOG_PICKUP_RADIUS;

    for (const l of this._logs) {
      const d = Math.hypot(l.x - this._player.x, l.y - this._player.y);
      if (d < bestDist) { bestDist = d; bestGround = { item: l, type: "log", arr: this._logs }; }
    }
    for (const c of this._coals) {
      const d = Math.hypot(c.x - this._player.x, c.y - this._player.y);
      if (d < bestDist) { bestDist = d; bestGround = { item: c, type: "coal", arr: this._coals }; }
    }
    for (const f of this._fuelCans) {
      const d = Math.hypot(f.x - this._player.x, f.y - this._player.y);
      if (d < bestDist) { bestDist = d; bestGround = { item: f, type: "fuelcan", arr: this._fuelCans }; }
    }
    for (const s of this._scraps) {
      const d = Math.hypot(s.x - this._player.x, s.y - this._player.y);
      if (d < bestDist) { bestDist = d; bestGround = { item: s, type: "scrap", arr: this._scraps }; }
    }

    if (bestGround) {
      const bg = bestGround;
      if (bg.type === "log")     this._logs     = this._logs.filter(i => i !== bg.item);
      if (bg.type === "coal")    this._coals    = this._coals.filter(i => i !== bg.item);
      if (bg.type === "fuelcan") this._fuelCans = this._fuelCans.filter(i => i !== bg.item);
      if (bg.type === "scrap") {
        this._scraps = this._scraps.filter(i => i !== bg.item);
        this._scrapCount++;
        this._showToast(`🔩 Scrap collected! (${this._scrapCount} total) — use at workbench`, "#ffcc88", 1500);
        return; // scrap goes directly to count, not sack
      }
      this._sack.push(bg.type);
      return;
    }

    // 5. Drop last item
    if (this._sack.length > 0) {
      const item = this._sack.pop()!;
      const dropX = this._player.x + (Math.random() - 0.5) * 20;
      const dropY = this._player.y + (Math.random() - 0.5) * 20;
      const dropItem = { id: this._logIdSeq++, x: dropX, y: dropY };
      if (item === "log")     this._logs.push(dropItem);
      if (item === "coal")    this._coals.push(dropItem);
      if (item === "fuelcan") this._fuelCans.push(dropItem);
      if (item.startsWith("kid_")) {
        const kidId = parseInt(item.split("_")[1]);
        const kid = this._kids.find(k => k.id === kidId);
        if (kid) { kid.x = dropX; kid.y = dropY; }
      }
    }
  }

  // ── Loop ───────────────────────────────────────────────────────────────────
  private _loop(ts: number): void {
    if (this._done) return;
    const dt = Math.min(ts - this._lastTs, 50);
    this._lastTs = ts;
    this._ts     = ts;
    this._phaseTimer -= dt;
    this._chopFlash  = Math.max(0, this._chopFlash  - dt);
    this._invincible = Math.max(0, this._invincible - dt);
    this._grindFlash = Math.max(0, this._grindFlash - dt);
    // Zoom unlocks by items fed (not fuel)
    let baseZoom = 1.0;
    if (this._fuelCansFed >= 2) baseZoom = 0.5;
    else if (this._coalFed  >= 2) baseZoom = 0.65;
    else if (this._logsFed  >= 6) baseZoom = 0.8;
    const targetZoom = Math.max(0.3, Math.min(3.5, baseZoom * this._userZoom));
    this._zoom += (targetZoom - this._zoom) * 0.04;
    if (this._showBoard) this._boardTimer -= dt;
    if (this._boardTimer <= 0) this._showBoard = false;
    // Close craft panel if player walks away from workbench
    if (this._showCraft &&
        Math.hypot(this._player.x - this._wbX, this._player.y - this._wbY) > WORKBENCH_RADIUS + 20) {
      this._showCraft = false;
    }

    if (!this._fireOut) {
      this._fireFuel -= dt;
      if (this._fireFuel <= 0) {
        this._fireFuel = 0;
        this._fireOut  = true;
        if (!this._fireWasOut) {
          this._fireWasOut = true;
          this._showToast("🦌 OOPSIE! Fire out — HUNGRY DEER are coming!", "#ff2200", 5000);
        }
      }
    } else {
      // Fire was refuelled — reset hungry warning
      this._fireWasOut = false;
    }

    // Jumpscare — freeze game, count down, then game over
    if (this._jumpscareActive) {
      this._jumpscareTimer -= dt;
      if (this._jumpscareTimer <= 0) {
        this._jumpscareActive = false;
        this._gameOver();
        return;
      }
      this._draw();
      this._raf = requestAnimationFrame(ts => this._loop(ts));
      return;
    }

    // Cutscene — freeze game, count down auto-skip
    if (this._showCutscene) {
      this._cutsceneTimer -= dt;
      if (this._cutsceneTimer <= 0) this._showCutscene = false;
      this._draw();
      this._raf = requestAnimationFrame(ts => this._loop(ts));
      return;
    }

    if (this._phase === "night") {
      this._updatePlayer(dt);
      this._updateMonsters(dt);
      this._updateWolves(dt);
      this._checkCapture();
      if (this._phaseTimer <= 0) {
        if (this._night >= MAX_NIGHTS) { this._win(); return; }
        this._startDay();
      }
    } else {
      this._updatePlayer(dt);
      // Day 98 or fire-out: monsters still active during day
      if (this._monsters.length > 0) {
        this._updateMonsters(dt);
        this._checkCapture();
      }
      if (this._phaseTimer <= 0) this._startNight();
    }

    this._draw();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _updatePlayer(dt: number): void {
    const W  = this._worldW;
    const H  = this._worldH;
    const sp = PLAYER_SPEED * (this._hasBoots ? 1.3 : 1.0) * dt / 1000;
    let dx = 0, dy = 0;

    if (this._keys.has("ArrowLeft")  || this._keys.has("KeyA")) dx -= 1;
    if (this._keys.has("ArrowRight") || this._keys.has("KeyD")) dx += 1;
    if (this._keys.has("ArrowUp")    || this._keys.has("KeyW")) dy -= 1;
    if (this._keys.has("ArrowDown")  || this._keys.has("KeyS")) dy += 1;
    // Controller left stick
    dx += gpState.lx;
    dy += gpState.ly;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    // Playable bounds = visible viewport around campfire at current zoom
    // At zoom=1: screen-sized area. At zoom=0.5: full 2× world.
    const canvasW   = this._canvas.width;
    const canvasH   = this._canvas.height;
    const halfViewW = canvasW  / (2 * this._zoom);
    const halfViewH = canvasH  / (2 * this._zoom);
    const pMinX = Math.max(PLAYER_RADIUS,      this._cfX - halfViewW + PLAYER_RADIUS);
    const pMaxX = Math.min(W - PLAYER_RADIUS,  this._cfX + halfViewW - PLAYER_RADIUS);
    const pMinY = Math.max(PLAYER_RADIUS,      this._cfY - halfViewH + PLAYER_RADIUS);
    const pMaxY = Math.min(H - PLAYER_RADIUS,  this._cfY + halfViewH - PLAYER_RADIUS);

    let fx = Math.max(pMinX, Math.min(pMaxX, this._player.x + dx * sp));
    let fy = Math.max(pMinY, Math.min(pMaxY, this._player.y + dy * sp));

    for (const t of this._trees) {
      const dist = Math.hypot(fx - t.x, fy - t.y);
      const minD = PLAYER_RADIUS + TREE_RADIUS;
      if (dist < minD && dist > 0) {
        const a = Math.atan2(fy - t.y, fx - t.x);
        fx = t.x + Math.cos(a) * minD;
        fy = t.y + Math.sin(a) * minD;
      }
    }

    this._player.x = Math.max(pMinX, Math.min(pMaxX, fx));
    this._player.y = Math.max(pMinY, Math.min(pMaxY, fy));
  }

  private _updateMonsters(dt: number): void {
    const W        = this._worldW;
    const H        = this._worldH;
    const baseSpd  = (80 + this._night * 2) * (this._isHungry() ? 1.7 : 1.0);

    for (const m of this._monsters) {
      const distToCF  = Math.hypot(m.x - this._cfX, m.y - this._cfY);
      const safeEdge  = CAMPFIRE_RADIUS + MONSTER_RADIUS + 10;
      const distToPlr = Math.hypot(m.x - this._player.x, m.y - this._player.y);

      // All monsters flee campfire light
      if (!this._fireOut && distToCF < safeEdge) {
        const a = Math.atan2(m.y - this._cfY, m.x - this._cfX);
        m.vx = Math.cos(a); m.vy = Math.sin(a);
      } else {

        if (m.kind === "deer") {
          // Deer — straight chase
          const dx = this._player.x - m.x, dy = this._player.y - m.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) { m.vx = dx / len; m.vy = dy / len; }

        } else if (m.kind === "owl") {
          // Owl — orbits at range then dives when close enough
          const orbitR = 180;
          if (distToPlr > orbitR) {
            // Spiral inward while circling
            m.angle += 0.025;
            const tx = this._player.x + Math.cos(m.angle) * orbitR;
            const ty = this._player.y + Math.sin(m.angle) * orbitR;
            const ddx = tx - m.x, ddy = ty - m.y;
            const dl = Math.hypot(ddx, ddy);
            if (dl > 0) { m.vx = ddx / dl; m.vy = ddy / dl; }
          } else {
            // Dive straight at player
            const dx = this._player.x - m.x, dy = this._player.y - m.y;
            const len = Math.hypot(dx, dy);
            if (len > 0) { m.vx = dx / len; m.vy = dy / len; }
          }

        } else if (m.kind === "ram") {
          // Ram — slow stalk then sudden charge
          m.charge -= dt;
          if (m.charge <= 0) {
            // Lock on and charge for 1.2s
            const dx = this._player.x - m.x, dy = this._player.y - m.y;
            const len = Math.hypot(dx, dy);
            if (len > 0) { m.vx = dx / len; m.vy = dy / len; }
            m.charge = 1200 + Math.random() * 800; // recharge 1.2–2s
          }
          // During recharge: slow creep (vx/vy already set from last charge)

        } else if (m.kind === "bat") {
          // Bat — fast erratic, slight random wobble each frame
          const dx = this._player.x - m.x, dy = this._player.y - m.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) { m.vx = dx / len; m.vy = dy / len; }
          // Add random wobble
          const wobble = (Math.random() - 0.5) * 1.4;
          m.vx += Math.cos(m.angle) * wobble;
          m.vy += Math.sin(m.angle) * wobble;
          m.angle += 0.18;
        }

        // Tree avoidance for all
        for (const t of this._trees) {
          const td = Math.hypot(m.x - t.x, m.y - t.y);
          if (td < MONSTER_RADIUS + TREE_RADIUS + 8) {
            const a = Math.atan2(m.y - t.y, m.x - t.x);
            m.vx += Math.cos(a) * 0.9; m.vy += Math.sin(a) * 0.9;
          }
        }
      }

      const vl = Math.hypot(m.vx, m.vy);
      if (vl > 0) { m.vx /= vl; m.vy /= vl; }

      // Kind-specific speed multipliers
      let spdMult = 1.0;
      if (m.kind === "owl") spdMult = 1.1;
      if (m.kind === "ram") spdMult = m.charge > 1000 ? 2.4 : 0.35; // charging vs stalking
      if (m.kind === "bat") spdMult = 1.5;

      const spd = baseSpd * spdMult * dt / 1000;
      m.x = Math.max(0, Math.min(W, m.x + m.vx * spd));
      m.y = Math.max(0, Math.min(H, m.y + m.vy * spd));
    }
  }

  private _updateWolves(dt: number): void {
    const W   = this._worldW;
    const H   = this._worldH;
    const spd = (130 + this._night * 3) * this._wolfSpeedMult * dt / 1000;

    for (const w of this._wolves) {
      const distToCF = Math.hypot(w.x - this._cfX, w.y - this._cfY);
      const safeEdge = CAMPFIRE_RADIUS + MONSTER_RADIUS + 10;

      if (!this._fireOut && distToCF < safeEdge) {
        const a = Math.atan2(w.y - this._cfY, w.x - this._cfX);
        w.vx = Math.cos(a); w.vy = Math.sin(a);
      } else {
        const dx = this._player.x - w.x;
        const dy = this._player.y - w.y;
        const len = Math.hypot(dx, dy);
        if (len > 0) { w.vx = dx / len; w.vy = dy / len; }
        for (const t of this._trees) {
          const td = Math.hypot(w.x - t.x, w.y - t.y);
          if (td < MONSTER_RADIUS + TREE_RADIUS + 8) {
            const a = Math.atan2(w.y - t.y, w.x - t.x);
            w.vx += Math.cos(a) * 0.9; w.vy += Math.sin(a) * 0.9;
          }
        }
      }
      const vl = Math.hypot(w.vx, w.vy);
      if (vl > 0) { w.vx /= vl; w.vy /= vl; }
      // Wolf trap: wolves near campfire are slowed
      const trapMult = (this._hasTrap &&
        Math.hypot(w.x - this._cfX, w.y - this._cfY) < CAMPFIRE_RADIUS * 2.5) ? 0.3 : 1.0;
      w.x = Math.max(0, Math.min(W, w.x + w.vx * spd * trapMult));
      w.y = Math.max(0, Math.min(H, w.y + w.vy * spd * trapMult));
    }
  }

  private _checkCapture(): void {
    if (this._godMode) return;
    const inSafeZone = !this._fireOut &&
      Math.hypot(this._player.x - this._cfX, this._player.y - this._cfY) < CAMPFIRE_RADIUS;
    if (inSafeZone) return;

    // Monsters = instant death → jumpscare first
    for (const m of this._monsters) {
      if (Math.hypot(m.x - this._player.x, m.y - this._player.y) < PLAYER_RADIUS + MONSTER_RADIUS) {
        this._killedBy = m.kind;
        this._triggerJumpscare(m.kind);
        return;
      }
    }

    // Wolves = 4 hits to die, 3s invincibility between hits
    if (this._invincible > 0) return;
    for (const w of this._wolves) {
      if (Math.hypot(w.x - this._player.x, w.y - this._player.y) < PLAYER_RADIUS + MONSTER_RADIUS) {
        this._health--;
        this._invincible = 3000;
        if (this._health <= 0) {
          this._killedBy = "wolf";
          this._triggerJumpscare("wolf");
          return;
        }
        this._showToast(`🐺 Wolf hit! ${this._health} ❤️ left`, "#ff4444", 1500);
        return;
      }
    }
  }

  private _triggerJumpscare(kind: Monster["kind"] | "wolf"): void {
    this._jumpscareActive = true;
    this._jumpscareTimer  = 1500;
    this._jumpscareKind   = kind;
    this._playJumpscareSound(kind);
  }

  private _playJumpscareSound(kind: Monster["kind"] | "wolf"): void {
    try {
      const ac  = new AudioContext();
      const now = ac.currentTime;
      const sr  = ac.sampleRate;

      // ── Shared helpers ────────────────────────────────────────────────────
      const makePink = (dur: number) => {
        const len = Math.ceil(sr * dur);
        const buf = ac.createBuffer(1, len, sr);
        const d   = buf.getChannelData(0);
        let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
          b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
          b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
          d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
          b6 = w*0.115926;
        }
        const s = ac.createBufferSource(); s.buffer = buf; return s;
      };
      const makeDistort = (amt: number) => {
        const ws = ac.createWaveShaper();
        const n = 1024; const c = new Float32Array(n);
        for (let i = 0; i < n; i++) {
          const x = (i*2)/n - 1;
          c[i] = x >= 0 ? ((Math.PI+amt)*x)/(Math.PI+amt*x) : ((Math.PI+amt)*x)/(Math.PI-amt*x*0.6);
        }
        ws.curve = c; ws.oversample = "4x"; return ws;
      };
      // Short echo for space
      const echo = ac.createDelay(0.5); echo.delayTime.value = 0.09;
      const echoFb = ac.createGain(); echoFb.gain.value = 0.35;
      const echoWet = ac.createGain(); echoWet.gain.value = 0.22;
      echo.connect(echoFb); echoFb.connect(echo); echo.connect(echoWet);

      const master = ac.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(1.2, now + 0.007);
      master.gain.setValueAtTime(1.1, now + 0.3);
      master.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
      master.connect(ac.destination);
      echoWet.connect(master);

      // Sub-bass thud (all monsters)
      const thud = ac.createOscillator(); thud.type = "sine";
      thud.frequency.setValueAtTime(90, now);
      thud.frequency.exponentialRampToValueAtTime(22, now + 0.2);
      const thudG = ac.createGain();
      thudG.gain.setValueAtTime(1.5, now);
      thudG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      thud.connect(thudG); thudG.connect(master);
      thud.start(now); thud.stop(now + 0.22);

      switch (kind) {

        case "deer": {
          // 🦌 Pure animal shriek — clean triangle wave (no heavy distortion),
          // human-frequency range. Terrifying because it sounds like a person.
          // Rises suddenly then sustains at an agonising pitch.
          const noise = makePink(2.0);
          const nf = ac.createBiquadFilter(); nf.type="bandpass"; nf.Q.value=1.5;
          nf.frequency.setValueAtTime(800, now);
          nf.frequency.linearRampToValueAtTime(2500, now+0.5);
          const ng = ac.createGain(); ng.gain.value = 0.45;
          noise.connect(nf); nf.connect(ng); ng.connect(master); ng.connect(echo);

          // Three triangle-wave voices slightly detuned — sounds like a real throat
          for (const [dt, delay] of [[0,0],[4,0.02],[-3,0.035]] as [number,number][]) {
            const o = ac.createOscillator(); o.type = "triangle";
            o.frequency.setValueAtTime(220+dt, now+delay);
            o.frequency.linearRampToValueAtTime(1400+dt, now+delay+0.06); // slam up fast
            o.frequency.linearRampToValueAtTime(2800+dt, now+delay+0.35);
            o.frequency.setValueAtTime(2600+dt,          now+delay+0.35); // crack
            o.frequency.linearRampToValueAtTime(3200+dt, now+delay+0.9);
            o.frequency.linearRampToValueAtTime(2000+dt, now+delay+1.8);
            // Resonant throat formant
            const f = ac.createBiquadFilter(); f.type="peaking"; f.frequency.value=1200; f.gain.value=14; f.Q.value=4;
            const g = ac.createGain(); g.gain.value = 0.42;
            o.connect(f); f.connect(g); g.connect(master); g.connect(echo);
            o.start(now+delay); o.stop(now+2.0);
          }
          noise.start(now); noise.stop(now+2.0);
          break;
        }

        case "owl": {
          // 🦉 Barn owl — TWO-NOTE piercing screech that alternates up-down-up.
          // Completely different rhythm to deer. Very narrow resonant filter
          // creates the classic "KREE-KREE" quality. No distortion — just pure piercing.
          const noise = makePink(2.0);
          const nf = ac.createBiquadFilter(); nf.type="highpass"; nf.frequency.value=2000;
          const ng = ac.createGain(); ng.gain.value=0.3;
          noise.connect(nf); nf.connect(ng); ng.connect(master);

          // Pulse the gain to create staccato "KREE KREE KREE" bursts
          const pulseG = ac.createGain(); pulseG.gain.value = 0;
          for (let i = 0; i < 5; i++) {
            const t = now + i * 0.28;
            pulseG.gain.setValueAtTime(0, t);
            pulseG.gain.linearRampToValueAtTime(0.7, t + 0.015);
            pulseG.gain.setValueAtTime(0.65, t + 0.18);
            pulseG.gain.linearRampToValueAtTime(0, t + 0.24);
          }

          // Main pitch alternates up-down between two notes (characteristic owl screech)
          const o1 = ac.createOscillator(); o1.type = "sawtooth";
          for (let i = 0; i < 5; i++) {
            const t = now + i * 0.28;
            o1.frequency.setValueAtTime(i%2===0 ? 1800 : 1200, t);
            o1.frequency.linearRampToValueAtTime(i%2===0 ? 2400 : 1600, t+0.18);
          }
          // Very narrow resonant filter — the "piercing" quality
          const reson = ac.createBiquadFilter(); reson.type="bandpass"; reson.Q.value=18;
          reson.frequency.setValueAtTime(2200, now);
          reson.frequency.linearRampToValueAtTime(3000, now+1.4);

          o1.connect(reson); reson.connect(pulseG); pulseG.connect(master); pulseG.connect(echo);
          o1.start(now); o1.stop(now+2.0);
          noise.start(now); noise.stop(now+2.0);
          break;
        }

        case "ram": {
          // 🐏 Ram/demon — starts COMPLETELY SILENT then erupts with a deep
          // sub-bass growl that rips upward. Square wave = buzzy and monstrous.
          // The sudden silence-to-roar is more shocking than an instant hit.
          const dist = makeDistort(1400);
          const noise = makePink(2.0);
          const nf = ac.createBiquadFilter(); nf.type="lowpass"; nf.frequency.value=1200;
          const ng = ac.createGain();
          ng.gain.setValueAtTime(0, now); ng.gain.setValueAtTime(0, now+0.12);
          ng.gain.linearRampToValueAtTime(1.1, now+0.16);
          ng.gain.exponentialRampToValueAtTime(0.001, now+2.0);
          noise.connect(nf); nf.connect(ng); ng.connect(dist); dist.connect(master);

          // Delayed growl: 120ms silence → BOOM
          const growl = ac.createOscillator(); growl.type = "square";
          growl.frequency.setValueAtTime(55, now+0.12);
          growl.frequency.linearRampToValueAtTime(110, now+0.3);
          growl.frequency.linearRampToValueAtTime(220, now+0.55);
          growl.frequency.linearRampToValueAtTime(600, now+0.85);  // voice cracks
          growl.frequency.linearRampToValueAtTime(2200, now+1.1);  // tears into screech
          growl.frequency.linearRampToValueAtTime(3800, now+1.7);
          const gG = ac.createGain();
          gG.gain.setValueAtTime(0, now); gG.gain.setValueAtTime(0, now+0.11);
          gG.gain.linearRampToValueAtTime(0.9, now+0.15);
          gG.gain.setValueAtTime(0.85, now+0.85);
          gG.gain.exponentialRampToValueAtTime(0.001, now+2.0);
          // Guttural throat formants
          const fL = ac.createBiquadFilter(); fL.type="bandpass"; fL.Q.value=6;
          fL.frequency.setValueAtTime(200, now); fL.frequency.linearRampToValueAtTime(3000, now+1.5);
          growl.connect(fL); fL.connect(gG); gG.connect(dist); gG.connect(echo);
          growl.start(now+0.12); growl.stop(now+2.0);
          noise.start(now); noise.stop(now+2.0);
          break;
        }

        case "bat": {
          // 🦇 Bat swarm — NOT a single scream. Rapid machine-gun clicking that
          // builds into a screech. setValueAtTime (no ramp) = sudden jumps.
          // Totally different texture from the other monsters.
          const noise = makePink(2.0);
          const nf = ac.createBiquadFilter(); nf.type="highpass"; nf.frequency.value=4000;
          const ng = ac.createGain(); ng.gain.value = 0.55;
          noise.connect(nf); nf.connect(ng); ng.connect(master);

          // 8 rapid clicks at different high frequencies (no smooth ramps — sudden jumps)
          const clickFreqs = [4200,7800,3600,8400,5100,6600,4800,9000,5500,7200];
          const clickTimes = [0,0.08,0.15,0.21,0.27,0.32,0.36,0.4,0.44,0.48];
          const clickO = ac.createOscillator(); clickO.type = "sine";
          const clickG = ac.createGain(); clickG.gain.value = 0;
          clickFreqs.forEach((f, i) => {
            const t = now + clickTimes[i];
            clickO.frequency.setValueAtTime(f, t);
            clickG.gain.setValueAtTime(0.8, t);
            clickG.gain.setValueAtTime(0, t + 0.045);
          });
          // After clicks: build into sustained high screech
          clickO.frequency.setValueAtTime(3000, now+0.55);
          clickO.frequency.linearRampToValueAtTime(7000, now+1.2);
          clickG.gain.linearRampToValueAtTime(0.6, now+0.6);
          clickG.gain.linearRampToValueAtTime(0.65, now+1.0);
          clickG.gain.exponentialRampToValueAtTime(0.001, now+2.0);
          const highF = ac.createBiquadFilter(); highF.type="bandpass"; highF.Q.value=10;
          highF.frequency.setValueAtTime(5000, now); highF.frequency.linearRampToValueAtTime(8000, now+1.2);
          clickO.connect(highF); highF.connect(clickG); clickG.connect(master); clickG.connect(echo);
          clickO.start(now); clickO.stop(now+2.0);
          noise.start(now); noise.stop(now+2.0);
          break;
        }

        case "wolf": {
          // 🐺 Wolf howl — recognisable melodic sine-wave howl that slowly
          // corrupts. Distortion fades IN during the howl so it starts clean
          // and beautiful then tears apart. LFO speeds up out of control.
          const noise = makePink(2.0);
          const nf = ac.createBiquadFilter(); nf.type="bandpass"; nf.Q.value=1.8;
          nf.frequency.setValueAtTime(300, now); nf.frequency.linearRampToValueAtTime(2000, now+1.5);
          const ng = ac.createGain(); ng.gain.value = 0.4;
          noise.connect(nf); nf.connect(ng); ng.connect(master);

          // Clean howl — pure sine, recognisable wolf pitch shape
          const howl = ac.createOscillator(); howl.type = "sine";
          howl.frequency.setValueAtTime(220, now);
          howl.frequency.linearRampToValueAtTime(750, now + 0.4);  // classic howl rise
          howl.frequency.linearRampToValueAtTime(900, now + 0.9);  // plateau
          howl.frequency.linearRampToValueAtTime(1800, now + 1.3); // starts tearing
          howl.frequency.linearRampToValueAtTime(3200, now + 1.9); // full scream

          // Vibrato LFO that starts gentle (3Hz) and speeds up to 25Hz (panic)
          const lfo = ac.createOscillator(); lfo.type = "sine";
          lfo.frequency.setValueAtTime(3, now);
          lfo.frequency.linearRampToValueAtTime(25, now + 2.0);
          const lfoG = ac.createGain();
          lfoG.gain.setValueAtTime(8, now);
          lfoG.gain.linearRampToValueAtTime(200, now + 2.0); // wilder and wilder
          lfo.connect(lfoG); lfoG.connect(howl.frequency);

          // Distortion that fades IN — starts clean, ends corrupted
          const dist = makeDistort(800);
          const preDistG = ac.createGain();
          preDistG.gain.setValueAtTime(0.001, now);     // almost silent through distort
          preDistG.gain.linearRampToValueAtTime(0.8, now + 1.0); // fades in
          const cleanG = ac.createGain();
          cleanG.gain.setValueAtTime(0.7, now);         // clean path fades out
          cleanG.gain.linearRampToValueAtTime(0.001, now + 1.2);

          howl.connect(cleanG); cleanG.connect(master); cleanG.connect(echo);
          howl.connect(preDistG); preDistG.connect(dist); dist.connect(master); dist.connect(echo);

          lfo.start(now); lfo.stop(now+2.0);
          howl.start(now); howl.stop(now+2.0);
          noise.start(now); noise.stop(now+2.0);
          break;
        }
      }

      setTimeout(() => ac.close().catch(() => {}), 2500);
    } catch (_) { /* audio not supported */ }
  }

  // ── Grinder ────────────────────────────────────────────────────────────────
  private _onR(): void {
    if (this._done) return;
    const dist = Math.hypot(this._player.x - this._grX, this._player.y - this._grY);
    if (dist > GRINDER_RADIUS) return;

    const logCount = this._sack.filter(s => s === "log").length;
    if (logCount < LOGS_PER_PLANK) {
      this._showToast(`Need ${LOGS_PER_PLANK} logs to grind! (have ${logCount})`, "#ff6666", 1500);
      return;
    }
    // Remove 2 logs from sack
    let removed = 0;
    this._sack = this._sack.filter(s => {
      if (s === "log" && removed < LOGS_PER_PLANK) { removed++; return false; }
      return true;
    });
    this._planks++;
    this._grindFlash = 500;
    this._showToast(`⚙️ You got a Plank! (${this._planks} total) — Check the workbench!`, "#aaddff", 3000);
  }

  private _drawGrinder(): void {
    const ctx  = this._ctx;
    const x    = this._grX;
    const y    = this._grY;
    const glow = this._grindFlash > 0;
    ctx.save();
    if (glow) { ctx.shadowColor = "rgba(100,200,255,0.9)"; ctx.shadowBlur = 24; }

    // Base / legs
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(x - 26, y + 12, 10, 16);
    ctx.fillRect(x + 16, y + 12, 10, 16);

    // Machine body
    ctx.fillStyle = glow ? "#556677" : "#444455";
    ctx.beginPath(); ctx.roundRect(x - 30, y - 18, 60, 32, 6); ctx.fill();
    ctx.strokeStyle = glow ? "#88ccff" : "#333344"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - 30, y - 18, 60, 32, 6); ctx.stroke();

    // Grinding wheel (spinning look)
    const spokes = 6;
    ctx.strokeStyle = glow ? "#aaddff" : "#666677"; ctx.lineWidth = 2.5;
    for (let i = 0; i < spokes; i++) {
      const a = (Math.PI * 2 * i) / spokes + (this._ts * 0.003);
      ctx.beginPath();
      ctx.moveTo(x, y - 2);
      ctx.lineTo(x + Math.cos(a) * 13, y - 2 + Math.sin(a) * 13);
      ctx.stroke();
    }
    ctx.fillStyle = glow ? "#aaddff" : "#777788";
    ctx.beginPath(); ctx.arc(x, y - 2, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = glow ? "#ffffff" : "#555566"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y - 2, 13, 0, Math.PI * 2); ctx.stroke();
    // Center bolt
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(x, y - 2, 3.5, 0, Math.PI * 2); ctx.fill();

    // Sparks when grinding
    if (glow) {
      ctx.fillStyle = "#ffdd44";
      for (let s = 0; s < 5; s++) {
        const sa = (this._ts * 0.01 + s * 1.3) % (Math.PI * 2);
        const sr = 14 + Math.random() * 8;
        ctx.beginPath();
        ctx.arc(x + Math.cos(sa) * sr, y - 2 + Math.sin(sa) * sr, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Label
    ctx.font = "bold 10px Arial, sans-serif";
    ctx.fillStyle = glow ? "#aaddff" : "rgba(255,255,255,0.7)";
    ctx.textAlign = "center"; ctx.shadowBlur = 0;
    ctx.fillText("GRINDER", x, y + 34);

    // Plank count badge
    if (this._planks > 0) {
      ctx.fillStyle = "#aaddff";
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText(`📋 ×${this._planks}`, x, y + 46);
    }

    // [R] prompt when player nearby
    const playerDist = Math.hypot(this._player.x - x, this._player.y - y);
    if (playerDist < GRINDER_RADIUS) {
      this._drawPrompt("[R] Grind 2 logs → 1 Plank", x, y - 30);
    }

    ctx.restore();
  }

  // ── Crafting ───────────────────────────────────────────────────────────────
  private _tryCraft(idx: number, isBed = true): void {
    if (isBed) {
      if (idx < 0 || idx > 3) return;
      const bed = BEDS[idx];
      if (this._bedsBuilt[idx]) {
        this._showToast(`${bed.icon} ${bed.name} already built!`, "#888888", 1500); return;
      }
      if (this._planks < bed.plankCost) {
        this._showToast(`Need ${bed.plankCost} 📋 planks! (have ${this._planks}) — grind logs first`, "#ff4444", 2500); return;
      }
      this._planks       -= bed.plankCost;
      this._bedsBuilt[idx] = true;
      this._dayCount      += bed.dayBonus;
      this._fireFuel       = Math.min(this._fireFuel + FIRE_FUEL_PER_KID * bed.dayBonus, 600_000);
      this._fireOut        = false;
      this._showCraft      = false;
      this._showToast(`${bed.icon} ${bed.name} built! +${bed.dayBonus} days!`, bed.color, 3000);
    } else {
      if (idx < 0 || idx > 3) return;
      const rec = SCRAP_RECIPES[idx];
      if (this._recipesBuilt[idx]) {
        this._showToast(`${rec.icon} ${rec.name} already crafted!`, "#888888", 1500); return;
      }
      if (this._scrapCount < rec.scrapCost || this._planks < rec.plankCost) {
        this._showToast(
          `Need ${rec.scrapCost} 🔩 scrap + ${rec.plankCost} 📋 planks (have ${this._scrapCount} scrap, ${this._planks} planks)`,
          "#ff4444", 2500
        ); return;
      }
      this._scrapCount      -= rec.scrapCost;
      this._planks          -= rec.plankCost;
      this._recipesBuilt[idx] = true;
      this._showCraft         = false;
      if (idx === 0) { this._hasShield = true;  this._health = 6; }
      if (idx === 1)   this._hasLantern = true;
      if (idx === 2)   this._hasTrap    = true;
      if (idx === 3)   this._hasBoots   = true;
      this._showToast(`${rec.icon} ${rec.name} crafted! ${rec.desc}`, rec.color, 3000);
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────
  private _draw(): void {
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const ctx = this._ctx;
    const t   = this._ts;

    const flicker   = this._fireOut ? 0 : Math.sin(t * 0.005) * 8 + Math.sin(t * 0.013) * 5;
    const upgrades  = Math.floor(this._logsFed / LOGS_FOR_UPGRADE);
    const cfLight   = this._fireOut ? 0 : CAMPFIRE_LIGHT + upgrades * 55 + flicker;
    const torchR    = TORCH_RADIUS + upgrades * 35 + (this._hasLantern ? 60 : 0);

    // Background
    ctx.fillStyle = "#071208";
    ctx.fillRect(0, 0, W, H);

    // ── Camera transform — everything below is in world space ──────────────
    // Clamp camera so we never show black outside the world
    const visHalfW = W / (2 * this._zoom);
    const visHalfH = H / (2 * this._zoom * ISO_Y);  // ISO_Y expands the visible world height
    const camX = Math.max(visHalfW, Math.min(this._worldW - visHalfW, this._player.x));
    const camY = Math.max(visHalfH, Math.min(this._worldH - visHalfH, this._player.y));

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.transform(1, 0, 0, ISO_Y, 0, 0);  // Roblox-style angled top-down camera
    ctx.scale(this._zoom, this._zoom);
    ctx.translate(-camX, -camY);

    // Ground texture (draw across visible world area)
    const wW = this._worldW;
    const wH = this._worldH;
    ctx.strokeStyle = "rgba(15,40,10,0.35)";
    ctx.lineWidth = 1;
    for (let gy = 0; gy < wH; gy += 18) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(wW, gy); ctx.stroke();
    }

    // ── Fog border at current play boundary ────────────────────────────────
    // The playable area is cfX ± halfViewW, cfY ± halfViewH
    // Draw fog OUTSIDE those bounds to show the boundary wall
    {
      const canvasW   = this._canvas.width;
      const canvasH   = this._canvas.height;
      const halfViewW = canvasW  / (2 * this._zoom);
      const halfViewH = canvasH  / (2 * this._zoom * ISO_Y);
      const bndL = this._cfX - halfViewW;
      const bndR = this._cfX + halfViewW;
      const bndT = this._cfY - halfViewH;
      const bndB = this._cfY + halfViewH;
      const fogDepth = 80; // how thick the fog band is

      // Left fog
      const gL = ctx.createLinearGradient(bndL, 0, bndL - fogDepth, 0);
      gL.addColorStop(0, "rgba(20,30,15,0)"); gL.addColorStop(1, "rgba(10,20,8,0.96)");
      ctx.fillStyle = gL; ctx.fillRect(0, 0, bndL, wH);
      ctx.fillStyle = "rgba(10,20,8,0.96)"; ctx.fillRect(0, 0, Math.max(0, bndL - fogDepth), wH);

      // Right fog
      const gR = ctx.createLinearGradient(bndR, 0, bndR + fogDepth, 0);
      gR.addColorStop(0, "rgba(20,30,15,0)"); gR.addColorStop(1, "rgba(10,20,8,0.96)");
      ctx.fillStyle = gR; ctx.fillRect(bndR, 0, wW - bndR, wH);
      ctx.fillStyle = "rgba(10,20,8,0.96)"; ctx.fillRect(bndR + fogDepth, 0, wW, wH);

      // Top fog
      const gT = ctx.createLinearGradient(0, bndT, 0, bndT - fogDepth);
      gT.addColorStop(0, "rgba(20,30,15,0)"); gT.addColorStop(1, "rgba(10,20,8,0.96)");
      ctx.fillStyle = gT; ctx.fillRect(0, 0, wW, bndT);
      ctx.fillStyle = "rgba(10,20,8,0.96)"; ctx.fillRect(0, 0, wW, Math.max(0, bndT - fogDepth));

      // Bottom fog
      const gB = ctx.createLinearGradient(0, bndB, 0, bndB + fogDepth);
      gB.addColorStop(0, "rgba(20,30,15,0)"); gB.addColorStop(1, "rgba(10,20,8,0.96)");
      ctx.fillStyle = gB; ctx.fillRect(0, bndB, wW, wH - bndB);
      ctx.fillStyle = "rgba(10,20,8,0.96)"; ctx.fillRect(0, bndB + fogDepth, wW, wH);
    }

    // Tents (rescued kids — always visible)
    this._drawTents();

    // Workbench + Grinder
    this._drawWorkbench();
    this._drawGrinder();

    // Trees
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const tr of this._trees) {
      ctx.font = "38px serif";
      if (this._chopFlash > 0 &&
          Math.hypot(tr.x - this._player.x, tr.y - this._player.y) < CHOP_RADIUS + TREE_RADIUS) {
        ctx.save();
        ctx.shadowColor = "rgba(255,200,0,1)"; ctx.shadowBlur = 20;
        ctx.fillText("🌲", tr.x, tr.y);
        ctx.restore();
      } else {
        ctx.fillText("🌲", tr.x, tr.y);
      }
      if (tr.hp < TREE_CHOP_HITS) {
        for (let h = 0; h < TREE_CHOP_HITS; h++) {
          ctx.fillStyle = h < tr.hp ? "#5dfc5d" : "rgba(255,255,255,0.15)";
          ctx.fillRect(tr.x - 12 + h * 10, tr.y - TREE_RADIUS - 12, 8, 4);
        }
      }
    }

    // Logs on ground
    ctx.font = "18px serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const l of this._logs) {
      const d = Math.hypot(l.x - this._player.x, l.y - this._player.y);
      if (d < LOG_PICKUP_RADIUS) {
        ctx.save(); ctx.shadowColor = "rgba(255,220,100,0.9)"; ctx.shadowBlur = 14;
        ctx.fillText("🪵", l.x, l.y); ctx.restore();
      } else {
        ctx.fillText("🪵", l.x, l.y);
      }
    }

    // Campfire glow
    if (!this._fireOut) {
      const warmGlow = ctx.createRadialGradient(this._cfX, this._cfY, 0, this._cfX, this._cfY, cfLight * 0.9);
      warmGlow.addColorStop(0,   "rgba(255,140,20,0.25)");
      warmGlow.addColorStop(0.5, "rgba(255,80,0,0.1)");
      warmGlow.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = warmGlow;
      ctx.beginPath(); ctx.arc(this._cfX, this._cfY, cfLight * 0.9, 0, Math.PI * 2); ctx.fill();
    }

    // Campfire / embers
    ctx.font = "28px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (!this._fireOut) {
      ctx.save(); ctx.shadowColor = "rgba(255,140,0,0.9)"; ctx.shadowBlur = 20 + flicker;
      ctx.fillText("🔥", this._cfX, this._cfY + 4); ctx.restore();
    } else {
      ctx.save(); ctx.globalAlpha = 0.5;
      ctx.fillText("🪨", this._cfX, this._cfY + 4); ctx.restore();
      ctx.strokeStyle = "rgba(255,60,0,0.6)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this._cfX, this._cfY, 42, 0, Math.PI * 2); ctx.stroke();
    }

    // Logs / coal / fuel cans — always visible
    ctx.font = "18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const l of this._logs) {
      const d = Math.hypot(l.x - this._player.x, l.y - this._player.y);
      if (d < LOG_PICKUP_RADIUS) { ctx.save(); ctx.shadowColor = "rgba(255,220,100,0.9)"; ctx.shadowBlur = 14; ctx.fillText("🪵", l.x, l.y); ctx.restore(); }
      else { ctx.fillText("🪵", l.x, l.y); }
    }
    for (const c of this._coals) {
      const d = Math.hypot(c.x - this._player.x, c.y - this._player.y);
      if (d < LOG_PICKUP_RADIUS) { ctx.save(); ctx.shadowColor = "rgba(180,180,180,0.9)"; ctx.shadowBlur = 14; ctx.fillText("⬛", c.x, c.y); ctx.restore(); }
      else { ctx.fillText("⬛", c.x, c.y); }
    }
    for (const f of this._fuelCans) {
      const d = Math.hypot(f.x - this._player.x, f.y - this._player.y);
      if (d < LOG_PICKUP_RADIUS) { ctx.save(); ctx.shadowColor = "rgba(255,150,0,0.9)"; ctx.shadowBlur = 16; ctx.fillText("⛽", f.x, f.y); ctx.restore(); }
      else { ctx.fillText("⛽", f.x, f.y); }
    }
    for (const s of this._scraps) {
      const d = Math.hypot(s.x - this._player.x, s.y - this._player.y);
      if (d < LOG_PICKUP_RADIUS) { ctx.save(); ctx.shadowColor = "rgba(200,200,255,0.9)"; ctx.shadowBlur = 16; ctx.fillText("🔩", s.x, s.y); ctx.restore(); }
      else { ctx.fillText("🔩", s.x, s.y); }
    }

    // Monsters — always visible (and during day if fire out / day 98)
    if (this._phase === "night" || this._monsters.length > 0) {
      for (const m of this._monsters) {
        if (m.kind === "owl") this._drawOwl(m.x, m.y);
        else if (m.kind === "ram") this._drawRam(m.x, m.y, m.charge > 1000);
        else if (m.kind === "bat") this._drawBat(m.x, m.y);
        else this._drawDeer(m.x, m.y, false, this._isHungry());
      }
      if (this._phase === "night")
        for (const w of this._wolves) this._drawWolf(w.x, w.y, false);
    }

    // Kids — only visible when close (still hidden in darkness)
    for (const k of this._kids) {
      if (k.rescued || k.x < 0) continue;
      const d = Math.hypot(k.x - this._player.x, k.y - this._player.y);
      if (d < torchR) {
        ctx.save();
        ctx.font = "22px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.shadowColor = k.tentColor; ctx.shadowBlur = 22;
        ctx.fillText(k.emoji, k.x, k.y);
        ctx.restore();
        if (d < KID_PICKUP_RADIUS) this._drawPrompt(`[E] Rescue ${k.name}`, k.x, k.y - 26);
      }
    }

    // Player
    this._drawPlayerAvatar(this._player.x, this._player.y);

    // Safe zone label
    if (this._phase === "night") {
      const nearFire = Math.hypot(this._player.x - this._cfX, this._player.y - this._cfY) < CAMPFIRE_RADIUS;
      if (nearFire && !this._fireOut) {
        ctx.font = "bold 12px Arial, sans-serif";
        ctx.fillStyle = "rgba(255,200,80,0.7)";
        ctx.textAlign = "center";
        ctx.fillText("🔥 Safe zone", this._cfX, this._cfY - CAMPFIRE_RADIUS - 8);
      }
      this._drawEPrompt();
    }

    // Day tint
    if (this._phase === "day") {
      ctx.fillStyle = "rgba(255,210,80,0.06)";
      ctx.fillRect(0, 0, this._worldW, this._worldH);
      this._drawEPrompt();
    }

    // ── End camera transform ───────────────────────────────────────────────
    ctx.restore();

    // HUD and overlays drawn in screen space (no camera transform)
    this._drawHUD();
    if (this._showBoard)      this._drawBoard();
    if (this._showCraft)      this._drawCraftPanel();
    if (this._showAdmin)      this._drawAdminPanel();
    if (this._showCutscene)   this._drawCutscene();
    if (this._jumpscareActive) this._drawJumpscare();
    if (this._godMode) {
      const ctx = this._ctx;
      ctx.font = "bold 11px Arial, sans-serif";
      ctx.fillStyle = "#ff4400";
      ctx.textAlign = "left";
      ctx.fillText("👑 GOD MODE ON", 10, this._canvas.height - 36);
    }
  }

  private _drawTents(): void {
    const ctx = this._ctx;
    const rescued = this._kids.filter(k => k.rescued);
    rescued.forEach((k, i) => {
      const angle = TENT_ANGLES[i % TENT_ANGLES.length];
      const tx = this._cfX + Math.cos(angle) * (CAMPFIRE_LIGHT * 0.75);
      const ty = this._cfY + Math.sin(angle) * (CAMPFIRE_LIGHT * 0.75);

      // Tent triangle
      ctx.save();
      ctx.fillStyle = k.tentColor;
      ctx.globalAlpha = 0.9;
      ctx.shadowColor = k.tentColor;
      ctx.shadowBlur  = 10;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 18);
      ctx.lineTo(tx - 14, ty + 10);
      ctx.lineTo(tx + 14, ty + 10);
      ctx.closePath();
      ctx.fill();

      // Door
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.arc(tx, ty + 6, 5, Math.PI, 0);
      ctx.fill();

      // Kid emoji above tent
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 1;
      ctx.fillText(k.emoji, tx, ty - 28);
      ctx.restore();
    });
  }

  private _drawWorkbench(): void {
    const ctx = this._ctx;
    const x   = this._wbX;
    const y   = this._wbY;
    ctx.save();

    // Table legs
    ctx.fillStyle = "#5C3A1E";
    ctx.fillRect(x - 30, y + 8,  8, 22);
    ctx.fillRect(x + 22, y + 8,  8, 22);

    // Table top (wood plank)
    ctx.fillStyle = "#8B6343";
    ctx.beginPath(); ctx.roundRect(x - 38, y - 14, 76, 22, 4); ctx.fill();
    ctx.strokeStyle = "#5C3A1E"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - 38, y - 14, 76, 22, 4); ctx.stroke();

    // Wood grain lines
    ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 1;
    for (let gx = x - 28; gx < x + 38; gx += 12) {
      ctx.beginPath(); ctx.moveTo(gx, y - 14); ctx.lineTo(gx, y + 8); ctx.stroke();
    }

    // Tools on table (hammer + saw icons drawn simply)
    ctx.font = "14px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🔨", x - 12, y - 3);
    ctx.fillText("🪚", x + 12, y - 3);

    // Built bed count badge
    const built = this._bedsBuilt.filter(Boolean).length;
    if (built > 0) {
      ctx.fillStyle = "#FFD700";
      ctx.font      = "bold 11px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${built}/4 beds`, x, y + 34);
    }

    ctx.restore();
  }

  private _drawCraftPanel(): void {
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const ctx = this._ctx;

    // Dim background
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, W, H);

    // Panel — tall enough for beds + upgrades sections
    const pw = Math.min(W - 24, 380);
    const ph = 460;
    const px = (W - pw) / 2;
    const py = Math.max(10, (H - ph) / 2);

    // Wood board background
    ctx.fillStyle = "#5C3A1E";
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();
    ctx.strokeStyle = "#3a2010"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.stroke();

    // Title
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 18px 'Arial Black', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔨  WORKBENCH", W / 2, py + 28);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px Arial, sans-serif";
    ctx.fillText("Press [1–4] to craft a bed  •  [E] to close", W / 2, py + 46);

    // Resources line
    ctx.font = "bold 12px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#aaddff";
    ctx.fillText(`📋 Planks: ${this._planks}`, W / 2 - 60, py + 62);
    ctx.fillStyle = "#ffcc88";
    ctx.fillText(`🔩 Scrap: ${this._scrapCount}`, W / 2 + 60, py + 62);

    this._craftCardBounds = [];
    const cardW  = (pw - 24) / 4 - 5;
    const cardH  = 130;

    // ── Beds section ──
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.fillText("— BEDS [1–4] needs planks —", W / 2, py + 78);
    const bedY   = py + 86;
    const startX = px + 12;

    BEDS.forEach((bed, i) => {
      const cx = startX + i * (cardW + 6);
      const built    = this._bedsBuilt[i];
      const canBuild = !built && this._planks >= bed.plankCost;
      this._craftCardBounds.push({ x: cx, y: bedY, w: cardW, h: cardH, idx: i, isBed: true });

      ctx.fillStyle = built ? "rgba(0,100,0,0.6)" : canBuild ? "rgba(100,180,80,0.15)" : "rgba(255,255,255,0.05)";
      ctx.beginPath(); ctx.roundRect(cx, bedY, cardW, cardH, 7); ctx.fill();
      ctx.strokeStyle = built ? "#00cc00" : canBuild ? bed.color : "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx, bedY, cardW, cardH, 7); ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = canBuild ? "#FFD700" : "rgba(255,255,255,0.3)";
      ctx.font = "bold 11px Arial, sans-serif";
      ctx.fillText(`[${i + 1}]`, cx + cardW / 2, bedY + 14);
      ctx.font = "22px serif";
      ctx.fillText(bed.icon, cx + cardW / 2, bedY + 40);
      ctx.font = "bold 9px Arial, sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText(bed.name, cx + cardW / 2, bedY + 62);
      ctx.font = "10px Arial, sans-serif";
      ctx.fillStyle = canBuild ? "#aaddff" : "#ff8888";
      ctx.fillText(`${bed.plankCost} 📋`, cx + cardW / 2, bedY + 76);
      ctx.fillStyle = "#FFD700"; ctx.font = "bold 10px Arial, sans-serif";
      ctx.fillText(`+${bed.dayBonus} days`, cx + cardW / 2, bedY + 90);
      if (built) { ctx.fillStyle = "#00ff88"; ctx.font = "bold 10px Arial, sans-serif"; ctx.fillText("✓ BUILT", cx + cardW / 2, bedY + 108); }
    });

    // ── Scrap recipes section ──
    const scrapY = bedY + cardH + 10;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("— UPGRADES [5–8] needs scrap —", W / 2, scrapY);
    const upY = scrapY + 8;

    SCRAP_RECIPES.forEach((rec, i) => {
      const cx = startX + i * (cardW + 6);
      const built    = this._recipesBuilt[i];
      const canBuild = !built && this._scrapCount >= rec.scrapCost && this._planks >= rec.plankCost;
      this._craftCardBounds.push({ x: cx, y: upY, w: cardW, h: cardH, idx: i, isBed: false });

      ctx.fillStyle = built ? "rgba(0,80,120,0.6)" : canBuild ? "rgba(80,120,180,0.18)" : "rgba(255,255,255,0.05)";
      ctx.beginPath(); ctx.roundRect(cx, upY, cardW, cardH, 7); ctx.fill();
      ctx.strokeStyle = built ? "#44aaff" : canBuild ? rec.color : "rgba(255,255,255,0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx, upY, cardW, cardH, 7); ctx.stroke();

      ctx.textAlign = "center";
      ctx.fillStyle = canBuild ? "#FFD700" : "rgba(255,255,255,0.3)";
      ctx.font = "bold 11px Arial, sans-serif";
      ctx.fillText(`[${i + 5}]`, cx + cardW / 2, upY + 14);
      ctx.font = "22px serif";
      ctx.fillText(rec.icon, cx + cardW / 2, upY + 40);
      ctx.font = "bold 9px Arial, sans-serif"; ctx.fillStyle = "#fff";
      ctx.fillText(rec.name, cx + cardW / 2, upY + 62);
      ctx.font = "9px Arial, sans-serif";
      ctx.fillStyle = canBuild ? "#ffcc88" : "#ff8888";
      const costStr = rec.plankCost > 0 ? `${rec.scrapCost}🔩+${rec.plankCost}📋` : `${rec.scrapCost} 🔩`;
      ctx.fillText(costStr, cx + cardW / 2, upY + 76);
      ctx.fillStyle = rec.color; ctx.font = "bold 9px Arial, sans-serif";
      ctx.fillText(rec.desc, cx + cardW / 2, upY + 90);
      if (built) { ctx.fillStyle = "#44aaff"; ctx.font = "bold 10px Arial, sans-serif"; ctx.fillText("✓ DONE", cx + cardW / 2, upY + 108); }
    });

    ctx.restore();
  }

  private _setRunMonster(kind: "owl" | "ram" | "bat" | null): void {
    this._runMonster = kind;
    // Respawn existing monsters as new type, keeping their positions
    const W = this._worldW, H = this._worldH;
    this._monsters = this._monsters.map(m => ({
      ...this._spawnEnemy(W, H, kind ?? "deer"),
      x: m.x, y: m.y,
    }));
    this._wolvesSpawned = true; // don't re-trigger wolf spawn from the night check
    const name = kind === "owl" ? "🦉 Owl" : kind === "ram" ? "🐏 Ram" : kind === "bat" ? "🦇 Bat" : "🦌 Deer";
    this._showToast(`Monsters set to ${name}`, "#dd99ff", 2000);
  }

  private _drawAdminPanel(): void {
    const W   = this._canvas.width;
    const ctx = this._ctx;

    const pw = 220;
    const px = W - pw - 8;
    const py = 60;

    // Panel background
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.beginPath(); ctx.roundRect(px, py, pw, 630, 10); ctx.fill();
    ctx.strokeStyle = "#ff4400"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, pw, 630, 10); ctx.stroke();

    // Title
    ctx.fillStyle = "#ff4400";
    ctx.font = "bold 14px 'Arial Black', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🛠️ ADMIN PANEL  [`] close", px + pw / 2, py + 20);
    ctx.strokeStyle = "rgba(255,68,0,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 10, py + 28); ctx.lineTo(px + pw - 10, py + 28); ctx.stroke();

    // Button definitions
    const btns = [
      { label: "🔥 Fill Fire",          cb: () => { this._fireFuel = 600_000; this._fireOut = false; } },
      { label: "🪵 +10 Logs to sack",   cb: () => { for (let i=0;i<10;i++) this._sack.push("log"); } },
      { label: "⬛ +3 Coal to sack",    cb: () => { for (let i=0;i<3;i++) this._sack.push("coal"); } },
      { label: "⛽ +2 Fuel Cans",       cb: () => { for (let i=0;i<2;i++) this._sack.push("fuelcan"); } },
      { label: "🔩 +20 Scrap",          cb: () => { this._scrapCount += 20; } },
      { label: "📋 +20 Planks",         cb: () => { this._planks += 20; } },
      { label: "🧒 Rescue All Kids",    cb: () => {
          this._kids.forEach(k => {
            if (!k.rescued) { k.rescued = true; this._dayCount++; this._fireFuel = Math.min(this._fireFuel + FIRE_FUEL_PER_KID, 600_000); }
          });
          this._fireOut = false;
        }
      },
      { label: "🛏️ Build All Beds",     cb: () => {
          BEDS.forEach((bed, i) => {
            if (!this._bedsBuilt[i]) { this._bedsBuilt[i] = true; this._dayCount += bed.dayBonus; }
          });
        }
      },
      { label: "⏭️ Skip Night",         cb: () => { this._phaseTimer = 0; } },
      { label: "❤️ Full Health",        cb: () => { this._health = 4; this._invincible = 0; } },
      { label: `👑 God Mode: ${this._godMode?"ON ✓":"OFF"}`, cb: () => { this._godMode = !this._godMode; } },
      { label: "🌙 Night +10",          cb: () => { this._night = Math.min(this._night + 10, MAX_NIGHTS - 1); } },
      // Monster swap buttons
      { label: `🦌 Deer${!this._runMonster?" ✓":""}`,             cb: () => this._setRunMonster(null) },
      { label: `🦉 Owl${this._runMonster==="owl"?" ✓":""}`,       cb: () => this._setRunMonster("owl") },
      { label: `🐏 Ram${this._runMonster==="ram"?" ✓":""}`,       cb: () => this._setRunMonster("ram") },
      { label: `🦇 Bat${this._runMonster==="bat"?" ✓":""}`,       cb: () => this._setRunMonster("bat") },
      // Wolf spawn buttons
      { label: "🐺 +3 Wolves",  cb: () => {
          const W = this._worldW, H = this._worldH;
          for (let i = 0; i < 3; i++) this._wolves.push(this._spawnEnemy(W, H));
          this._wolvesSpawned = true;
          this._showToast("3 wolves spawned! 🐺", "#ff8800", 2000);
        }
      },
      { label: "🐺 Clear Wolves", cb: () => {
          this._wolves = [];
          this._showToast("Wolves cleared", "#aaa", 2000);
        }
      },
    ];

    const bh = 26;
    const bw = pw - 20;
    const bx = px + 10;

    // Section headers
    const MONSTER_BTN_START = 12;
    const WOLF_BTN_START    = 16;

    const monsterSepY = py + 38 + MONSTER_BTN_START * (bh + 4) - 4;
    ctx.strokeStyle = "rgba(150,80,220,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 10, monsterSepY); ctx.lineTo(px + pw - 10, monsterSepY); ctx.stroke();
    ctx.fillStyle = "rgba(180,100,255,0.7)";
    ctx.font = "bold 10px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("— SPAWN MONSTER (replaces deer) —", px + pw / 2, monsterSepY + 11);

    const wolfSepY = py + 38 + WOLF_BTN_START * (bh + 4) + 18 - 4;
    ctx.strokeStyle = "rgba(255,140,0,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px + 10, wolfSepY); ctx.lineTo(px + pw - 10, wolfSepY); ctx.stroke();
    ctx.fillStyle = "rgba(255,160,60,0.8)";
    ctx.font = "bold 10px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("— WOLVES —", px + pw / 2, wolfSepY + 11);

    btns.forEach((btn, i) => {
      // Shift monster/wolf buttons down to clear section labels
      const extraY = i >= WOLF_BTN_START ? 36 : i >= MONSTER_BTN_START ? 18 : 0;
      const by = py + 38 + i * (bh + 4) + extraY;
      const isGod     = btn.label.startsWith("👑");
      const isMonster = i >= MONSTER_BTN_START && i < WOLF_BTN_START;
      const isWolf    = i >= WOLF_BTN_START;
      const isActive  = btn.label.endsWith("✓");
      ctx.fillStyle = isActive        ? "rgba(150,50,220,0.4)"
        : isGod && this._godMode      ? "rgba(255,68,0,0.3)"
        : isWolf                      ? "rgba(255,120,0,0.12)"
        : "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill();
      ctx.strokeStyle = isActive          ? "#bb66ff"
        : isGod && this._godMode          ? "#ff4400"
        : isWolf                          ? "rgba(255,160,60,0.5)"
        : isMonster                       ? "rgba(180,100,255,0.4)"
        : "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.stroke();
      ctx.fillStyle = isActive ? "#dd99ff" : isWolf ? "#ffcc88" : "#ffffff";
      ctx.font = "12px Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(btn.label, bx + 8, by + bh / 2 + 4);

      // Store button bounds for click detection
      (btn as { label: string; cb: () => void; bx?: number; by?: number; bw?: number; bh?: number }).bx = bx;
      (btn as { label: string; cb: () => void; bx?: number; by?: number; bw?: number; bh?: number }).by = by;
      (btn as { label: string; cb: () => void; bx?: number; by?: number; bw?: number; bh?: number }).bw = bw;
      (btn as { label: string; cb: () => void; bx?: number; by?: number; bw?: number; bh?: number }).bh = bh;
    });

    // Store for click handler
    this._adminBtns = btns as AdminBtn[];
    ctx.restore();
  }

  private _adminBtns: AdminBtn[] = [];

  private _drawBoard(): void {
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const ctx = this._ctx;

    // Board background
    ctx.save();
    ctx.globalAlpha = Math.min(1, this._boardTimer / 500); // fade in/out
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, W, H);

    const bw = Math.min(W - 40, 360);
    const bh = 220;
    const bx = (W - bw) / 2;
    const by = (H - bh) / 2;

    // Wood board
    ctx.fillStyle = "#5C3A1E";
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
    ctx.strokeStyle = "#3a2010"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.stroke();

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MISSING CHILDREN", W / 2, by + 26);
    ctx.font = "13px Arial, sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`Day ${this._dayCount}`, W / 2, by + 46);

    // Kid cards
    const cardW = 68;
    const totalW = KID_DEFS.length * cardW + (KID_DEFS.length - 1) * 10;
    const startX = W / 2 - totalW / 2;

    KID_DEFS.forEach((def, i) => {
      const kid = this._kids.find(k => k.id === def.id)!;
      const cx = startX + i * (cardW + 10) + cardW / 2;
      const cy = by + 130;

      // Card
      ctx.fillStyle = kid.rescued ? "rgba(0,80,0,0.6)" : "rgba(255,255,255,0.9)";
      ctx.beginPath(); ctx.roundRect(cx - cardW/2, cy - 50, cardW, 80, 6); ctx.fill();

      // Kid emoji
      ctx.font = "28px serif";
      ctx.textAlign = "center";
      ctx.fillText(def.emoji, cx, cy - 20);

      // Name
      ctx.font = "9px Arial, sans-serif";
      ctx.fillStyle = kid.rescued ? "#88ff88" : "#333";
      ctx.fillText(def.name, cx, cy + 10);

      // MISSING / FOUND banner
      ctx.font = "bold 8px Arial, sans-serif";
      if (kid.rescued) {
        ctx.fillStyle = "#00cc00";
        ctx.fillText("✓ FOUND", cx, cy + 22);
      } else {
        ctx.fillStyle = "#cc0000";
        ctx.fillText("MISSING", cx, cy + 22);
      }

      // Colored tent indicator
      ctx.fillStyle = def.tentColor;
      ctx.beginPath();
      ctx.arc(cx, cy - 50 + 4, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  private _drawEPrompt(): void {
    const distToCF = Math.hypot(this._player.x - this._cfX, this._player.y - this._cfY);
    const hasKid   = this._sack.some(s => s.startsWith("kid_"));
    const hasLog   = this._sack.includes("log");

    const distToWB = Math.hypot(this._player.x - this._wbX, this._player.y - this._wbY);
    if (distToWB < WORKBENCH_RADIUS) {
      this._drawPrompt("[E] Open Workbench", this._wbX, this._wbY - 50);
      return;
    }

    if (distToCF < FIRE_INTERACT_RADIUS && hasKid) {
      this._drawPrompt("[E] Rescue to campfire! 🔥+3min", this._cfX, this._cfY - 58);
      return;
    }
    if (distToCF < FIRE_INTERACT_RADIUS && hasLog) {
      this._drawPrompt("[E] Add log to fire", this._cfX, this._cfY - 58);
      return;
    }
    for (const k of this._kids) {
      if (k.rescued || k.x < 0) continue;
      if (Math.hypot(k.x - this._player.x, k.y - this._player.y) < KID_PICKUP_RADIUS) {
        this._drawPrompt(`[E] Pick up ${k.name}`, k.x, k.y - 28);
        return;
      }
    }
    for (const l of this._logs) {
      if (Math.hypot(l.x - this._player.x, l.y - this._player.y) < LOG_PICKUP_RADIUS) {
        this._drawPrompt("[E] Pick up log", l.x, l.y - 22);
        return;
      }
    }
    if (this._sack.length > 0) {
      this._drawPrompt(`[E] Drop item`, this._player.x, this._player.y - 32);
    }
  }

  private _showToast(text: string, color: string, duration: number): void {
    const toast = document.createElement("div");
    toast.textContent = text;
    toast.style.cssText = `
      position:fixed;top:80px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.9);color:${color};font-size:17px;font-weight:bold;
      padding:12px 24px;border-radius:24px;border:2px solid ${color};
      font-family:'Arial Black',Arial,sans-serif;z-index:9999;pointer-events:none;
      transition:opacity 0.5s;white-space:nowrap;text-align:center;
      box-shadow:0 0 20px ${color};
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, duration - 500);
    setTimeout(() => toast.remove(), duration);
  }

  private _drawPrompt(text: string, x: number, y: number): void {
    const ctx = this._ctx;
    ctx.font = "bold 12px Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width + 16;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - 10, w, 20, 6); ctx.fill();
    ctx.fillStyle = "#FFD700";
    ctx.fillText(text, x, y);
  }

  private _drawHUD(): void {
    const W   = this._canvas.width;
    const ctx = this._ctx;

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, W, 54);

    ctx.font = "bold 15px Arial, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";

    if (this._phase === "night") {
      const secs = Math.ceil(this._phaseTimer / 1000);
      ctx.fillStyle = secs <= 5 ? "#ff5555" : "#aaddff";
      ctx.fillText(`🌙 Night ${this._night} / ${MAX_NIGHTS}`, 14, 20);
      ctx.fillStyle = "#ffffff"; ctx.textAlign = "right";
      ctx.fillText(`⏱ ${secs}s`, W - 14, 20);
    } else {
      const secs = Math.ceil(this._phaseTimer / 1000);
      ctx.fillStyle = "#FFD700";
      ctx.fillText(`☀️ Day ${this._dayCount} — chop trees!`, 14, 20);
      ctx.fillStyle = "#aaaaaa"; ctx.textAlign = "right";
      ctx.fillText(`Night ${this._night + 1} in ${secs}s`, W - 14, 20);
    }

    // Fire fuel bar
    const fuelFrac = Math.max(0, this._fireFuel / INITIAL_FUEL);
    const barW     = Math.min(W - 28, 220);
    const barX     = (W - barW) / 2;
    const barY     = 36;

    if (this._fireOut) {
      ctx.fillStyle = "#ff4444"; ctx.textAlign = "center";
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText("🔥 FIRE OUT — you're vulnerable!", W / 2, barY + 4);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath(); ctx.roundRect(barX, barY, barW, 9, 4); ctx.fill();
      const col = fuelFrac > 0.4 ? "#ff8800" : fuelFrac > 0.15 ? "#ffaa00" : "#ff3300";
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(barX, barY, barW * fuelFrac, 9, 4); ctx.fill();
      const fuelSecs = Math.ceil(this._fireFuel / 1000);
      const mm = Math.floor(fuelSecs / 60);
      const ss = fuelSecs % 60;
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "10px Arial, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(`🔥 ${mm}:${ss.toString().padStart(2, "0")}`, barX + barW / 2, barY + 4);
    }

    // Sack
    const logCount = this._sack.filter(s => s === "log").length;
    const kidInSack = this._kids.find(k => this._sack.includes(`kid_${k.id}`));
    ctx.textAlign = "right"; ctx.font = "bold 13px Arial, sans-serif";
    ctx.fillStyle = logCount > 0 || kidInSack ? "#FFD700" : "rgba(255,255,255,0.4)";
    const sackLabel = kidInSack
      ? `🎒 ${kidInSack.emoji} ${kidInSack.name}`
      : `🎒 🪵 ×${logCount}`;
    ctx.fillText(sackLabel, W - 14, this._canvas.height - 20);

    // Scrap + planks (above sack)
    ctx.textAlign = "right"; ctx.font = "11px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,204,136,0.8)";
    ctx.fillText(`🔩 ×${this._scrapCount}  📋 ×${this._planks}`, W - 14, this._canvas.height - 36);

    // Kid tracker (bottom left)
    ctx.textAlign = "left"; ctx.font = "14px serif";
    KID_DEFS.forEach((def, i) => {
      const rescued = this._kids.find(k => k.id === def.id)?.rescued ?? false;
      ctx.save();
      ctx.globalAlpha = rescued ? 1 : 0.3;
      ctx.fillText(def.emoji, 14 + i * 26, this._canvas.height - 20);
      ctx.restore();
    });

    // Wolf health hearts (top right area, below HUD bar)
    if (this._wolvesSpawned) {
      ctx.font = "18px serif";
      ctx.textAlign = "right";
      const maxHp = this._hasShield ? 6 : 4;
      let heartsStr = "";
      for (let h = 0; h < maxHp; h++) heartsStr += h < this._health ? "❤️" : "🖤";
      ctx.fillText(heartsStr, W - 10, 72);
      if (this._invincible > 0) {
        ctx.font = "bold 10px Arial, sans-serif";
        ctx.fillStyle = "rgba(255,180,0,0.8)";
        ctx.fillText("⚡ INVINCIBLE", W - 10, 88);
      }
    }

    // Admin toggle button (always visible, bottom-right)
    const abw = 72, abh = 26;
    const abx = W - abw - 8;
    const aby = this._canvas.height - abh - 50;
    ctx.fillStyle = this._showAdmin ? "rgba(255,68,0,0.85)" : "rgba(60,0,0,0.75)";
    ctx.beginPath(); ctx.roundRect(abx, aby, abw, abh, 6); ctx.fill();
    ctx.strokeStyle = "#ff4400"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(abx, aby, abw, abh, 6); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🛠️ ADMIN", abx + abw / 2, aby + abh / 2 + 4);
    // Store for click
    this._adminToggleBtn = { x: abx, y: aby, w: abw, h: abh };

    if (this._night === 1 && this._phase === "night") {
      ctx.font = "11px Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.textAlign = "center";
      ctx.fillText("WASD to move  •  Click trees  •  E near kids/logs/fire", W / 2, this._canvas.height - 36);
    }
    if (this._isHungry() && !this._fireOut) {
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.fillStyle = `rgba(255,${Math.floor(Math.sin(this._ts * 0.006) * 80 + 80)},0,0.95)`;
      ctx.textAlign = "center";
      ctx.fillText("🦌 HUNGRY DEER NIGHT — They're faster!", W / 2, this._canvas.height - 36);
    }
    if (this._night === 3 && this._phase === "night" && this._wolvesSpawned) {
      ctx.font = "bold 12px Arial, sans-serif";
      ctx.fillStyle = "rgba(255,80,0,0.9)";
      ctx.textAlign = "center";
      ctx.fillText("🐺 A wolf pack has arrived! (4 hits to die)", W / 2, this._canvas.height - 36);
    }
  }

  private _drawJumpscare(): void {
    const ctx      = this._ctx;
    const cw       = this._canvas.width;
    const ch       = this._canvas.height;
    const elapsed  = 1500 - this._jumpscareTimer;          // 0 → 1500
    const t        = elapsed / 1500;                        // 0 → 1

    // ── Phase 1 (0–0.12): sudden white flash ──────────────────────────────
    const flashAlpha = t < 0.12 ? (1 - t / 0.12) : 0;

    // ── Phase 2 (0.08–0.65): monster slams in ─────────────────────────────
    const zoomT   = t < 0.08 ? 0 : t < 0.65 ? (t - 0.08) / 0.57 : 1;
    // Eased zoom: starts tiny and slams to huge
    const easedZoom = zoomT < 0.5
      ? 4 * zoomT * zoomT * zoomT                          // ease-in cubic
      : 1 - Math.pow(-2 * zoomT + 2, 3) / 2;             // ease-out
    const monsterScale = 2 + easedZoom * 11;              // 2× → 13×

    // ── Phase 3 (0.7–1.0): fade to black ─────────────────────────────────
    const fadeAlpha = t > 0.7 ? (t - 0.7) / 0.3 : 0;

    // Screen shake (strong in phase 1–2)
    const shakeAmt  = t < 0.65 ? (1 - t / 0.65) * 22 : 0;
    const shakeX    = (Math.random() - 0.5) * shakeAmt;
    const shakeY    = (Math.random() - 0.5) * shakeAmt;

    // Red tint overlay (whole screen)
    const redAlpha  = t < 0.65 ? 0.55 * (1 - t / 0.65) : 0;
    ctx.fillStyle   = `rgba(180,0,0,${redAlpha})`;
    ctx.fillRect(0, 0, cw, ch);

    // Monster face — drawn centered, massively scaled
    if (zoomT > 0) {
      ctx.save();
      ctx.translate(cw / 2 + shakeX, ch / 2 + shakeY);
      ctx.scale(monsterScale, monsterScale);

      // Translate to center on face (face is ~y-16 for most monsters)
      const faceOffsets: Record<string, { x: number; y: number }> = {
        deer:  { x:  0, y: 16 },
        owl:   { x:  0, y: 16 },
        ram:   { x:  0, y: 16 },
        bat:   { x:  0, y:  8 },
        wolf:  { x: -18, y:  7 },
      };
      const off = faceOffsets[this._jumpscareKind] ?? { x: 0, y: 16 };
      ctx.translate(off.x, off.y);

      switch (this._jumpscareKind) {
        case "deer":  this._drawDeer(0, 0, true, this._isHungry()); break;
        case "owl":   this._drawOwl(0, 0);                          break;
        case "ram":   this._drawRam(0, 0, true);                    break;
        case "bat":   this._drawBat(0, 0);                          break;
        case "wolf":  this._drawWolf(0, 0, true);                   break;
      }
      ctx.restore();
    }

    // White flash overlay
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Fade to black
    if (fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, cw, ch);
    }
  }

  private _drawCutscene(): void {
    if (!this._runMonster) return;
    const ctx = this._ctx;
    const cw  = this._canvas.width;
    const ch  = this._canvas.height;

    // Full-screen black — hide the game completely
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);

    // Dramatic red vignette at edges
    const vgn = ctx.createRadialGradient(cw/2, ch/2, ch*0.1, cw/2, ch/2, ch*0.85);
    vgn.addColorStop(0, "rgba(0,0,0,0)");
    vgn.addColorStop(1, "rgba(60,0,0,0.7)");
    ctx.fillStyle = vgn;
    ctx.fillRect(0, 0, cw, ch);

    // Monster drawn LARGE and off-center (right side, close-up)
    const scale = Math.min(cw, ch) / 100; // dynamic scale
    ctx.save();
    ctx.translate(cw * 0.62, ch * 0.54);
    ctx.scale(scale, scale);

    if (this._runMonster === "ram")      this._drawRam(0, 0, true);
    else if (this._runMonster === "owl") this._drawOwl(0, 0);
    else if (this._runMonster === "bat") this._drawBat(0, 0);

    ctx.restore();

    // Top banner text
    const monsterNames: Record<string, string> = {
      ram: "THE RAM HAS WOKEN UP",
      owl: "THE OWL HAS WOKEN UP",
      bat: "THE BAT HAS WOKEN UP",
    };
    const monsterIcons: Record<string, string> = { ram: "🐏", owl: "🦉", bat: "🦇" };
    const bannerText = monsterNames[this._runMonster] ?? "IT HAS WOKEN UP";
    const bannerIcon = monsterIcons[this._runMonster] ?? "👀";

    // Pulsing red top bar
    const pulse = 0.7 + 0.3 * Math.sin(this._ts * 0.004);
    ctx.fillStyle = `rgba(80,0,0,${0.9 * pulse})`;
    ctx.fillRect(0, 0, cw, 72);
    ctx.strokeStyle = `rgba(220,30,30,${0.8 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 72); ctx.lineTo(cw, 72); ctx.stroke();

    ctx.save();
    ctx.shadowColor = "#ff2200";
    ctx.shadowBlur  = 24 * pulse;
    ctx.fillStyle   = "#ff4444";
    ctx.font        = `bold ${Math.round(cw / 18)}px Arial Black, Arial`;
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${bannerIcon}  ${bannerText}  ${bannerIcon}`, cw / 2, 36);
    ctx.restore();

    // Night number sub-label
    ctx.fillStyle = "rgba(255,180,180,0.7)";
    ctx.font      = `${Math.round(cw / 36)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(`Night ${this._night}`, cw / 2, 62);

    // Flavour text (lower left)
    const flavour: Record<string, string> = {
      ram: "It was sleeping deep in the forest. Now it's free.",
      owl: "Something watches from the treetops. It never blinks.",
      bat: "They came from the darkness. Fast. Hungry.",
    };
    ctx.fillStyle = "rgba(255,200,200,0.55)";
    ctx.font      = `italic ${Math.round(cw / 40)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(flavour[this._runMonster] ?? "", cw / 2, ch * 0.82);

    // SKIP button
    const bw = 160, bh = 50;
    const bx = cw / 2 - bw / 2;
    const by = ch - 90;
    ctx.fillStyle = "rgba(20,60,20,0.9)";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(80,200,80,0.7)";
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.fillStyle   = "#aaffaa";
    ctx.font        = `bold ${Math.round(cw / 32)}px Arial`;
    ctx.textAlign   = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SKIP", cw / 2, by + bh / 2);
    this._skipZone = { x: bx, y: by, w: bw, h: bh };

    // Auto-skip progress bar at bottom
    const progress = 1 - this._cutsceneTimer / 5000;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, ch - 5, cw, 5);
    ctx.fillStyle = "rgba(200,50,50,0.7)";
    ctx.fillRect(0, ch - 5, cw * progress, 5);
  }

  private _drawPlayerAvatar(x: number, y: number): void {
    const ctx = this._ctx;
    ctx.save();
    ctx.translate(x, y);

    // All coords relative to center. Layout (top→bottom):
    //  hair:   y -42 → -27
    //  head:   y -27 → -12
    //  neck:   y -12 → -9
    //  torso:  y  -9 → +5
    //  legs:   y  +5 → +17
    //  feet:   y +17 → +22

    const S = 1.0; // scale — tweak here if needed

    function r(lx: number, ly: number, lw: number, lh: number) {
      ctx.fillRect(lx * S, ly * S, lw * S, lh * S);
    }
    function sr(lx: number, ly: number, lw: number, lh: number) {
      ctx.strokeRect(lx * S, ly * S, lw * S, lh * S);
    }

    // ── SHADOW (soft ground shadow so char stands out in dark) ──
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 23 * S, 11 * S, 3 * S, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ── HAIR — Bacon Hair + green bandana wrap + hat ──

    // Bacon hair strips hanging down behind/sides of head (drawn first, behind head)
    // Classic bacon hair = pink/salmon strips with dark reddish streaks
    const baconColors = ["#e8605a", "#d44040", "#f07060", "#c83030"];
    // Left side strips
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = baconColors[i % baconColors.length];
      ctx.beginPath();
      ctx.ellipse((-11 + i * 3) * S, (-20 + i * 2) * S, 2.5 * S, 10 * S, 0.25 - i * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // Right side strips
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = baconColors[(i + 1) % baconColors.length];
      ctx.beginPath();
      ctx.ellipse((11 - i * 3) * S, (-20 + i * 2) * S, 2.5 * S, 10 * S, -0.25 + i * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    // Bacon strips peeking from under the bandana at top
    ctx.fillStyle = "#e8605a";
    ctx.beginPath(); ctx.ellipse(-4 * S, -30 * S, 3 * S, 5 * S, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d44040";
    ctx.beginPath(); ctx.ellipse(0,        -32 * S, 2.5 * S, 5 * S, 0,    0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f07060";
    ctx.beginPath(); ctx.ellipse(4 * S,  -30 * S, 3 * S, 5 * S,  0.2, 0, Math.PI * 2); ctx.fill();

    // ── HEAD (Roblox white block) ──
    ctx.fillStyle = "#f2e8d8";
    r(-9, -27, 18, 15);
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 0.7;
    sr(-9, -27, 18, 15);

    // Eyes — classic Roblox: two dark ovals
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.ellipse(-3.5 * S, -21 * S, 2.2 * S, 2.5 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5 * S, -21 * S, 2.2 * S, 2.5 * S, 0, 0, Math.PI * 2);  ctx.fill();

    // Eye shine
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.ellipse(-2.8 * S, -22 * S, 0.8 * S, 0.8 * S, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(4.2 * S,  -22 * S, 0.8 * S, 0.8 * S, 0, 0, Math.PI * 2);  ctx.fill();

    // Smile
    ctx.strokeStyle = "#555"; ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(0, -17.5 * S, 3.5 * S, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // ── GREEN BANDANA wrapped around head ──
    // Main bandana band across forehead area
    ctx.fillStyle = "#2a9e2a";
    r(-9, -27, 18, 5);
    // Bandana highlight
    ctx.fillStyle = "#38c038";
    r(-8, -27, 16, 2);
    // Bandana knot on right side (two little loops)
    ctx.fillStyle = "#228822";
    r(8, -28, 5, 4);   // knot base
    ctx.fillStyle = "#2db82d";
    ctx.beginPath(); ctx.ellipse(11 * S, -29 * S, 3 * S, 2 * S, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11 * S, -26 * S, 2.5 * S, 2 * S, 0.3, 0, Math.PI * 2); ctx.fill();

    // ── HAT on top — small flat-top cap ──
    // Tiny brim (just slightly wider than crown)
    ctx.fillStyle = "#2a1a0a";
    r(-9, -33, 18, 2);
    // Short crown (flat top, sits tight on head)
    ctx.fillStyle = "#3d1f08";
    r(-7, -40, 14, 8);
    // Top surface slightly lighter
    ctx.fillStyle = "#5a2e0e";
    r(-7, -40, 14, 2);
    // Side shadow
    ctx.fillStyle = "#2a1208";
    r(5, -38, 2, 6);

    // ── NECK ──
    ctx.fillStyle = "#f2e8d8";
    r(-3, -12, 6, 3);

    // ── TORSO — gold jacket ──
    ctx.fillStyle = "#c8a20e";
    r(-9, -9, 18, 14);

    // Jacket highlight (lighter stripe across top)
    ctx.fillStyle = "#e0bb22";
    r(-8, -9, 16, 3);

    // Jacket shadow (darker bottom)
    ctx.fillStyle = "#a88808";
    r(-8, 2, 16, 2);

    // White shirt / collar visible in center
    ctx.fillStyle = "#f0ede6";
    ctx.beginPath();
    ctx.moveTo(-2 * S, -9 * S);
    ctx.lineTo(-6 * S,  2 * S);
    ctx.lineTo( 6 * S,  2 * S);
    ctx.lineTo( 2 * S, -9 * S);
    ctx.closePath();
    ctx.fill();

    // Re-draw jacket sides over the white (lapel effect)
    ctx.fillStyle = "#c8a20e";
    ctx.beginPath();
    ctx.moveTo(-9 * S, -9 * S); ctx.lineTo(-2 * S, -9 * S);
    ctx.lineTo(-5 * S,  5 * S); ctx.lineTo(-9 * S,  5 * S);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(9 * S, -9 * S);  ctx.lineTo(2 * S, -9 * S);
    ctx.lineTo(5 * S,  5 * S);  ctx.lineTo(9 * S,  5 * S);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 0.6;
    sr(-9, -9, 18, 14);

    // ── ARMS ──
    ctx.fillStyle = "#c8a20e";
    r(-14, -8, 5, 12);  // left arm
    r(9,   -8, 5, 12);  // right arm
    ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 0.5;
    sr(-14, -8, 5, 12);
    sr(9,   -8, 5, 12);

    // Hands (skin colour)
    ctx.fillStyle = "#f2e8d8";
    r(-14, 4, 5, 4);
    r(9,   4, 5, 4);

    // ── LEGS — gray pants ──
    ctx.fillStyle = "#888";
    r(-9,  5, 8, 12);  // left leg
    r(1,   5, 8, 12);  // right leg
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 0.5;
    sr(-9,  5, 8, 12);
    sr(1,   5, 8, 12);

    // ── FEET — white/cream ──
    ctx.fillStyle = "#e4e2d8";
    r(-10, 17, 10, 5);  // left foot (protrudes slightly left)
    r(0,   17, 10, 5);  // right foot (protrudes slightly right)

    ctx.restore();
  }

  private _drawOwl(x: number, y: number): void {
    const ctx = this._ctx;
    ctx.save();
    ctx.translate(x, y);

    // Pale glow
    ctx.shadowColor = "rgba(200,220,255,0.7)";
    ctx.shadowBlur  = 20;

    // Long thin legs
    ctx.strokeStyle = "#c8c8c8"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(-7, 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 5, 12); ctx.lineTo( 7, 34); ctx.stroke();
    // Feet
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-7, 34); ctx.lineTo(-13, 38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 34); ctx.lineTo(-4,  38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 7, 34); ctx.lineTo( 13, 38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 7, 34); ctx.lineTo(  4, 38); ctx.stroke();

    // Fluffy body (wide oval)
    ctx.fillStyle = "#e8e8e0";
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(0, 4, 14, 18, 0, 0, Math.PI * 2); ctx.fill();

    // Wing hints on sides
    ctx.fillStyle = "#d0d0c8";
    ctx.beginPath(); ctx.ellipse(-16, 6, 7, 12, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 16, 6, 7, 12, -0.5, 0, Math.PI * 2); ctx.fill();

    // Head — round
    ctx.fillStyle = "#deded6";
    ctx.shadowColor = "rgba(200,220,255,0.5)"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(0, -16, 13, 0, Math.PI * 2); ctx.fill();

    // Ear tufts
    ctx.fillStyle = "#b8b8b0";
    ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(-10, -36); ctx.lineTo(-3, -27); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( 7, -26); ctx.lineTo( 10, -36); ctx.lineTo(  3, -27); ctx.closePath(); ctx.fill();

    // Huge black eyes
    ctx.shadowColor = "rgba(100,120,255,0.9)"; ctx.shadowBlur = 12;
    ctx.fillStyle = "#111118";
    ctx.beginPath(); ctx.arc(-5, -16, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 5, -16, 6, 0, Math.PI * 2); ctx.fill();
    // Eye shine
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(-4, -18, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 6, -18, 2, 0, Math.PI * 2); ctx.fill();

    // Beak
    ctx.fillStyle = "#c8a840";
    ctx.beginPath(); ctx.moveTo(-2, -11); ctx.lineTo(2, -11); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();

    ctx.restore();
  }

  private _drawRam(x: number, y: number, charging: boolean): void {
    const ctx = this._ctx;
    ctx.save();
    ctx.translate(x, y);

    const pulse = charging ? (0.6 + 0.4 * Math.sin(this._ts * 0.02)) : 1.0;
    if (charging) {
      ctx.shadowColor = `rgba(255,60,0,${0.8 * pulse})`;
      ctx.shadowBlur  = 28 * pulse;
    } else {
      ctx.shadowColor = "rgba(80,40,80,0.5)";
      ctx.shadowBlur  = 10;
    }

    // Legs — thick hooved
    ctx.strokeStyle = "#3a3a4a"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(-8, 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 6, 10); ctx.lineTo( 8, 26); ctx.stroke();
    // Hooves
    ctx.strokeStyle = "#1a1a2a"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-8, 24); ctx.lineTo(-8, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 8, 24); ctx.lineTo( 8, 30); ctx.stroke();

    // Arms
    ctx.strokeStyle = "#4a4a5a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(-18, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 7, -2); ctx.lineTo( 18, 8); ctx.stroke();

    // Body — dark stocky
    ctx.fillStyle = charging ? "#5a2a2a" : "#3a3a4a";
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(0, 4, 12, 16, 0, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.fillStyle = "#2a2a3a";
    ctx.beginPath(); ctx.ellipse(0, -16, 10, 11, 0, 0, Math.PI * 2); ctx.fill();

    // Big curled horns
    ctx.strokeStyle = charging ? "#ff6600" : "#5a3a1a";
    ctx.lineWidth   = 5;
    ctx.lineCap     = "round";
    // Left horn — curls out and back
    ctx.beginPath();
    ctx.moveTo(-6, -24);
    ctx.bezierCurveTo(-22, -32, -28, -14, -16, -10);
    ctx.stroke();
    // Right horn
    ctx.beginPath();
    ctx.moveTo( 6, -24);
    ctx.bezierCurveTo( 22, -32,  28, -14,  16, -10);
    ctx.stroke();

    // Eyes — red glow
    ctx.shadowColor = charging ? "rgba(255,0,0,1)" : "rgba(180,0,0,0.7)";
    ctx.shadowBlur  = charging ? 18 : 8;
    ctx.fillStyle   = charging ? "#ff2200" : "#cc0000";
    ctx.beginPath(); ctx.arc(-4, -17, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 4, -17, 3, 0, Math.PI * 2); ctx.fill();

    // Snout
    ctx.fillStyle = "#1a1a2a";
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(0, -10, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Nostrils
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(-2, -10, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 2, -10, 1.2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  private _drawBat(x: number, y: number): void {
    const ctx = this._ctx;
    ctx.save();
    ctx.translate(x, y);

    const flap = Math.sin(this._ts * 0.018) * 0.4; // wing flap

    // Purple glow
    ctx.shadowColor = "rgba(160,60,220,0.8)";
    ctx.shadowBlur  = 18;

    // Wings — spread out
    ctx.fillStyle = "#7a2aaa";
    // Left wing
    ctx.save();
    ctx.rotate(-flap);
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.bezierCurveTo(-10, -8, -28, -6, -30, 4);
    ctx.bezierCurveTo(-26, 10, -12, 8, -2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Right wing
    ctx.save();
    ctx.rotate(flap);
    ctx.beginPath();
    ctx.moveTo( 2, 0);
    ctx.bezierCurveTo( 10, -8,  28, -6,  30, 4);
    ctx.bezierCurveTo( 26, 10,  12, 8,   2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Wing fingers (dark lines on wings)
    ctx.strokeStyle = "#4a1066"; ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      for (let i = 1; i <= 3; i++) {
        ctx.save();
        ctx.rotate(side * (-flap + i * 0.05));
        ctx.beginPath();
        ctx.moveTo(side * 2, 0);
        ctx.lineTo(side * (10 + i * 6), -4 + i);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Body — small round
    ctx.fillStyle = "#5a1a88";
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.ellipse(0, 2, 7, 9, 0, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.fillStyle = "#6a2299";
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();

    // Ears
    ctx.fillStyle = "#4a1066";
    ctx.beginPath(); ctx.moveTo(-5, -13); ctx.lineTo(-8, -22); ctx.lineTo(-1, -14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( 5, -13); ctx.lineTo( 8, -22); ctx.lineTo( 1, -14); ctx.closePath(); ctx.fill();

    // Eyes — glowing
    ctx.shadowColor = "rgba(255,100,255,1)"; ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff66ff";
    ctx.beginPath(); ctx.arc(-3, -9, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 3, -9, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(-3, -9, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 3, -9, 1.2, 0, Math.PI * 2); ctx.fill();

    // Fangs
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-1, 2);  ctx.lineTo(0,  -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( 0, -3); ctx.lineTo( 1, 2);  ctx.lineTo(2,  -3); ctx.closePath(); ctx.fill();

    ctx.restore();
  }

  private _drawWolf(x: number, y: number, glow: boolean): void {
    const ctx = this._ctx;
    ctx.save();

    // Flash white during invincibility window (player's invincibility frames)
    const flash = this._invincible > 0 && Math.floor(this._invincible / 150) % 2 === 0;
    if (flash) { ctx.globalAlpha = 0.4; }

    if (glow) { ctx.shadowColor = "rgba(255,100,0,0.9)"; ctx.shadowBlur = 22; }

    // Scale up — wolf should be ~2× the old size
    ctx.translate(x, y);
    const s = 1.7; // scale factor
    ctx.scale(s, s);

    // Body — wide, muscular
    ctx.fillStyle = "#6a6a7a";
    ctx.beginPath(); ctx.ellipse(0, 2, 16, 9, 0, 0, Math.PI * 2); ctx.fill();

    // Neck
    ctx.fillStyle = "#7a7a8a";
    ctx.beginPath(); ctx.ellipse(12, -4, 7, 6, -0.4, 0, Math.PI * 2); ctx.fill();

    // Head — large, blocky wolf head
    ctx.fillStyle = "#7a7a8a";
    ctx.beginPath(); ctx.ellipse(18, -7, 10, 8, -0.15, 0, Math.PI * 2); ctx.fill();

    // Snout — wide, blunt (not pointy rat snout)
    ctx.fillStyle = "#5a5a6a";
    ctx.beginPath(); ctx.ellipse(27, -4, 7, 5, 0.1, 0, Math.PI * 2); ctx.fill();

    // Nose
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.ellipse(33, -4, 2.5, 2, 0, 0, Math.PI * 2); ctx.fill();

    // Pointed wolf ears (big and tall)
    ctx.fillStyle = "#6a6a7a";
    ctx.beginPath(); ctx.moveTo(12, -13); ctx.lineTo(8, -25); ctx.lineTo(18, -14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -13); ctx.lineTo(18, -25); ctx.lineTo(26, -13); ctx.closePath(); ctx.fill();
    // Inner ear
    ctx.fillStyle = "#aa6060";
    ctx.beginPath(); ctx.moveTo(13, -14); ctx.lineTo(10, -22); ctx.lineTo(17, -14); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(21, -14); ctx.lineTo(20, -22); ctx.lineTo(25, -14); ctx.closePath(); ctx.fill();

    // Legs — thick, 4 legs
    ctx.strokeStyle = "#555566"; ctx.lineWidth = 4.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-10, 9);  ctx.lineTo(-12, 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3,  10); ctx.lineTo(-3,  23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6,   10); ctx.lineTo(7,   23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13,  9);  ctx.lineTo(14,  22); ctx.stroke();

    // Bushy tail curving up
    ctx.strokeStyle = "#6a6a7a"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-28, -8, -22, -20); ctx.stroke();
    ctx.strokeStyle = "#8a8a9a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-28, -8, -22, -20); ctx.stroke();

    // Glowing amber eyes
    ctx.shadowColor = "rgba(255,180,0,1)"; ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffbb00";
    ctx.beginPath(); ctx.ellipse(20, -9, 2.5, 2, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath(); ctx.ellipse(20, -9, 1.2, 1.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  private _drawDeer(x: number, y: number, glow: boolean, hungry = false): void {
    const ctx = this._ctx;
    ctx.save();

    // Hungry deer: red pulsing aura
    if (hungry) {
      const pulse = Math.sin(this._ts * 0.006) * 0.4 + 0.6;
      ctx.shadowColor = `rgba(255,0,0,${pulse})`;
      ctx.shadowBlur  = 28;
    } else if (glow) {
      ctx.shadowColor = "rgba(255,0,0,0.9)"; ctx.shadowBlur = 22;
    }

    const bodyCol = hungry ? "#8B2A0A" : "#6B4A2A";
    const headCol = hungry ? "#9B3010" : "#7A5533";
    const neckCol = hungry ? "#7A2008" : "#5C3D1E";
    const legCol  = hungry ? "#7A2008" : "#8B6343";

    // Legs
    ctx.strokeStyle = legCol; ctx.lineWidth = hungry ? 4 : 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - 5, y + 6); ctx.lineTo(x - 7, y + 20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5, y + 6); ctx.lineTo(x + 7, y + 20); ctx.stroke();

    // Arms
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x - 5, y - 4); ctx.lineTo(x - 16, y + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5, y - 4); ctx.lineTo(x + 16, y + 4); ctx.stroke();

    // Body
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.ellipse(x, y, hungry ? 9 : 7, hungry ? 14 : 12, 0, 0, Math.PI * 2); ctx.fill();

    // Head
    ctx.fillStyle = headCol;
    ctx.beginPath(); ctx.ellipse(x, y - 16, hungry ? 7 : 6, hungry ? 8 : 7, 0, 0, Math.PI * 2); ctx.fill();

    // Neck
    ctx.fillStyle = neckCol;
    ctx.beginPath(); ctx.ellipse(x, y - 11, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Antlers — hungry deer have cracked/jagged antlers
    ctx.strokeStyle = hungry ? "#cc2200" : "#5C3D1E"; ctx.lineWidth = hungry ? 3 : 2;
    if (hungry) {
      // Jagged broken antlers
      ctx.beginPath(); ctx.moveTo(x - 4, y - 22); ctx.lineTo(x - 12, y - 34); ctx.lineTo(x - 8, y - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 9, y - 30); ctx.lineTo(x - 18, y - 28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 12, y - 34); ctx.lineTo(x - 6, y - 38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, y - 22); ctx.lineTo(x + 12, y - 34); ctx.lineTo(x + 8, y - 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 9, y - 30); ctx.lineTo(x + 18, y - 28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 12, y - 34); ctx.lineTo(x + 6, y - 38); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x - 4, y - 22); ctx.lineTo(x - 10, y - 32); ctx.lineTo(x - 6, y - 36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 8, y - 28); ctx.lineTo(x - 14, y - 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, y - 22); ctx.lineTo(x + 10, y - 32); ctx.lineTo(x + 6, y - 36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 8, y - 28); ctx.lineTo(x + 14, y - 30); ctx.stroke();
    }

    // Eyes — hungry deer have huge glowing red eyes
    ctx.shadowColor = "rgba(255,0,0,1)";
    ctx.shadowBlur  = hungry ? 18 : 10;
    ctx.fillStyle   = hungry ? "#ff0000" : (glow ? "#ff2200" : "#cc1100");
    const eyeR = hungry ? 3.5 : 2;
    ctx.beginPath(); ctx.arc(x - 3, y - 17, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3, y - 17, eyeR, 0, Math.PI * 2); ctx.fill();

    // Hungry deer: drool / foam
    if (hungry) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(x - 2, y - 10, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 2, y - 9,  1.5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }

  private _setupTouchControls(): void {
    const root = this._canvas.parentElement!;
    const hud = document.createElement("div");
    hud.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:50;";
    root.appendChild(hud);

    // Joystick
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
      const t = e.changedTouches[0]; joyId = t.identifier;
      const r = joyBase.getBoundingClientRect();
      joyOriginX = r.left + r.width/2; joyOriginY = r.top + r.height/2;
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

    // Tap right side = chop/interact (simulates click)
    const tapArea = document.createElement("div");
    tapArea.style.cssText =
      "position:absolute;top:0;right:0;width:55%;height:70%;pointer-events:all;touch-action:none;";
    hud.appendChild(tapArea);
    tapArea.addEventListener("touchend", e => {
      const t = e.changedTouches[0];
      this._canvas.dispatchEvent(new MouseEvent("click", { clientX: t.clientX, clientY: t.clientY, bubbles: true }));
    });

    // E button
    const eBtn = document.createElement("div");
    eBtn.textContent = "E";
    eBtn.style.cssText =
      "position:absolute;bottom:90px;right:115px;width:60px;height:60px;" +
      "border-radius:50%;background:rgba(255,200,80,0.25);border:2px solid rgba(255,200,80,0.5);" +
      "display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#ffd060;" +
      "pointer-events:all;touch-action:none;user-select:none;";
    hud.appendChild(eBtn);
    eBtn.addEventListener("touchstart", e => { e.preventDefault(); this._keys.add("KeyE"); this._onE(); }, { passive: false });
    eBtn.addEventListener("touchend", () => this._keys.delete("KeyE"));

    // R button
    const rBtn = document.createElement("div");
    rBtn.textContent = "R";
    rBtn.style.cssText =
      "position:absolute;bottom:90px;right:30px;width:60px;height:60px;" +
      "border-radius:50%;background:rgba(100,255,150,0.25);border:2px solid rgba(100,255,150,0.5);" +
      "display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:bold;color:#80ffaa;" +
      "pointer-events:all;touch-action:none;user-select:none;";
    hud.appendChild(rBtn);
    rBtn.addEventListener("touchstart", e => { e.preventDefault(); this._keys.add("KeyR"); this._onR(); }, { passive: false });
    rBtn.addEventListener("touchend", () => this._keys.delete("KeyR"));

    this._cleanupTouch = () => hud.remove();
  }

  // ── End states ─────────────────────────────────────────────────────────────
  private _end(): void {
    this._done = true;
    cancelAnimationFrame(this._raf);
    this._cleanupKeys();
    this._cleanupClick();
    this._cleanupWheel();
    this._cleanupTouch();
    this._g.inMiniGame        = false;
    this._g.autoClickCallback = null;
  }

  private _gameOver(): void {
    this._end();
    const nightsSurvived = this._night - 1;
    const earned = nightsSurvived + this._dayCount * 10;
    this._g.state.coins += earned;
    this._g.save();
    this._showResult(false, nightsSurvived, earned);
  }

  private _win(): void {
    this._end();
    const earned = MAX_NIGHTS + 200 + this._dayCount * 10;
    this._g.state.coins += earned;
    this._g.save();
    this._showResult(true, MAX_NIGHTS, earned);
  }

  private _showResult(won: boolean, nights: number, earned: number): void {
    if (!won) {
      this._showDeathScreen(nights, earned);
    } else {
      this._showWinScreen(earned);
    }
  }

  private _showDeathScreen(nights: number, earned: number): void {
    let countdown = 10;
    const wrap = document.createElement("div");
    wrap.className = "screen";
    wrap.style.cssText = `
      background:rgba(0,0,0,0.88);
      gap:0;font-family:'Arial Black',Arial,sans-serif;
      justify-content:center;align-items:center;
    `;

    const kidIcons = KID_DEFS.map(d => {
      const rescued = this._kids.find(k => k.id === d.id)?.rescued;
      return `<span style="font-size:22px;opacity:${rescued ? 1 : 0.25}">${d.emoji}</span>`;
    }).join(" ");

    wrap.innerHTML = `
      <div style="color:#cc0000;font-size:54px;font-weight:900;
        text-shadow:0 0 30px rgba(255,0,0,0.8),3px 3px 0 #000;
        letter-spacing:2px;margin-bottom:6px;">YOU LOST</div>

      <div style="color:#ff3333;font-size:16px;font-weight:bold;
        letter-spacing:3px;margin-bottom:24px;text-shadow:1px 1px 0 #000;">
        ${{
          wolf: "A WOLF GOT YOU 🐺",
          deer: "THE DEER GOT YOU 🦌",
          owl:  "THE OWL GOT YOU 🦉",
          ram:  "THE RAM CHARGED YOU 🐏",
          bat:  "THE BAT GOT YOU 🦇",
        }[this._killedBy] ?? "SOMETHING GOT YOU 👀"}
      </div>

      <div style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:6px;">
        Night ${nights} &nbsp;•&nbsp; Kids rescued: ${this._dayCount}/${KID_DEFS.length}
      </div>
      <div style="margin-bottom:20px;">${kidIcons}</div>

      <div style="color:#FFD700;font-size:15px;margin-bottom:24px;">
        You earned <strong>${earned} 🪙</strong>
      </div>

      <div id="countdownText" style="color:white;font-size:18px;font-weight:bold;
        margin-bottom:20px;">RETURNING IN ${countdown} SECONDS</div>

      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;max-width:300px;">
        <button id="playAgainBtn" style="
          background:#22bb22;color:white;font-size:16px;font-weight:900;
          padding:16px 0;width:100%;border-radius:14px;border:none;cursor:pointer;
          letter-spacing:1px;font-family:'Arial Black',Arial,sans-serif;
          box-shadow:0 4px 0 #116611;text-transform:uppercase;">
          PLAY AGAIN
        </button>
        <button id="backBtn" style="
          background:#22bb22;color:white;font-size:16px;font-weight:900;
          padding:16px 0;width:100%;border-radius:14px;border:none;cursor:pointer;
          letter-spacing:1px;font-family:'Arial Black',Arial,sans-serif;
          box-shadow:0 4px 0 #116611;text-transform:uppercase;">
          ← BACK TO ARCADE
        </button>
      </div>
    `;

    this._g.ui.innerHTML = "";
    this._g.ui.appendChild(wrap);

    document.getElementById("playAgainBtn")!.addEventListener("click", () => {
      clearInterval(timer);
      new NightForest(this._g);
    });
    document.getElementById("backBtn")!.addEventListener("click", () => {
      clearInterval(timer);
      this._g.goArcade();
    });

    const countdownEl = document.getElementById("countdownText")!;
    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        new NightForest(this._g);
      } else {
        countdownEl.textContent = `RETURNING IN ${countdown} SECONDS`;
      }
    }, 1000);
  }

  private _showWinScreen(earned: number): void {
    const wrap = document.createElement("div");
    wrap.className = "screen";
    wrap.style.cssText = "background:linear-gradient(160deg,#020a02,#0a1a0a);gap:14px;font-family:Arial,sans-serif;";
    const kidIcons = KID_DEFS.map(d => {
      const rescued = this._kids.find(k => k.id === d.id)?.rescued;
      return `<span style="font-size:28px;opacity:${rescued ? 1 : 0.25}">${d.emoji}</span>`;
    }).join(" ");
    wrap.innerHTML = `
      <div style="font-size:56px;">🏆</div>
      <div style="color:#FFD700;font-size:28px;font-weight:bold;">YOU SURVIVED 99 NIGHTS!</div>
      <div style="margin:4px 0;">${kidIcons}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:14px;">Kids rescued: ${this._dayCount} / ${KID_DEFS.length}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:13px;">+200 bonus coins for winning!</div>
      <div style="color:white;font-size:20px;">You earned <strong style="color:#FFD700;">${earned} 🪙</strong></div>
    `;

    const btnWrap = document.createElement("div");
    btnWrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:8px;";
    const playAgain = document.createElement("button");
    playAgain.textContent = "▶ Play Again";
    playAgain.style.cssText = `background:#FFD700;color:#0a1a0a;font-size:18px;font-weight:bold;
      padding:13px 32px;border-radius:40px;border:3px solid #e6b800;cursor:pointer;font-family:Arial,sans-serif;`;
    playAgain.addEventListener("click", () => new NightForest(this._g));
    const back = document.createElement("button");
    back.textContent = "← Back to Arcade";
    back.style.cssText = `background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:16px;
      padding:10px 28px;border-radius:40px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;font-family:Arial,sans-serif;`;
    back.addEventListener("click", () => this._g.goArcade());
    btnWrap.appendChild(playAgain);
    btnWrap.appendChild(back);
    wrap.appendChild(btnWrap);

    this._g.ui.innerHTML = "";
    this._g.ui.appendChild(wrap);
  }
}
