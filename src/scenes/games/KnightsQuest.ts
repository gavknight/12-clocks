// KnightsQuest.ts — First-person knight game with BabylonJS 8
import type { Game } from "../../game/Game";
import { Engine }           from "@babylonjs/core/Engines/engine";
import { Scene }            from "@babylonjs/core/scene";
import { Vector3 }          from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 }   from "@babylonjs/core/Maths/math.color";
import { UniversalCamera }  from "@babylonjs/core/Cameras/universalCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder }      from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh }             from "@babylonjs/core/Meshes/mesh";
import { Ray }              from "@babylonjs/core/Culling/ray";

// ── Save Data ──────────────────────────────────────────────────────────────────

const SAVE_KEY = "knightsquest_save";

interface KQSave {
  mapsCompleted: number;
  coins: number;
  achievements: string[];
  shopOwned: string[];
  rebirths: number;
  killCount: number;
  gunKills: number;
  chestsOpened: number;
  survivalSeconds: number;
}

function loadSave(): KQSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSave();
}

function defaultSave(): KQSave {
  return { mapsCompleted: 0, coins: 0, achievements: [], shopOwned: [], rebirths: 0,
    killCount: 0, gunKills: 0, chestsOpened: 0, survivalSeconds: 0 };
}

function writeSave(s: KQSave): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
}

// ── Map definitions ────────────────────────────────────────────────────────────

interface MapDef {
  enemies: number;
  obstacles: number;
  enemySpeed: number;
  chests: number;
  boss: boolean;
  reward: number;
}

const MAPS: MapDef[] = [
  { enemies:  3, obstacles:  0, enemySpeed: 2.5, chests: 0, boss: false, reward:  5 },
  { enemies:  5, obstacles:  4, enemySpeed: 2.5, chests: 0, boss: false, reward:  8 },
  { enemies:  7, obstacles:  8, enemySpeed: 2.8, chests: 0, boss: false, reward: 10 },
  { enemies: 10, obstacles: 10, enemySpeed: 2.8, chests: 1, boss: false, reward: 12 },
  { enemies: 12, obstacles: 10, enemySpeed: 3.2, chests: 1, boss: false, reward: 15 },
  { enemies: 15, obstacles: 12, enemySpeed: 3.2, chests: 1, boss: false, reward: 18 },
  { enemies: 18, obstacles: 14, enemySpeed: 3.5, chests: 2, boss: false, reward: 20 },
  { enemies: 20, obstacles: 14, enemySpeed: 3.5, chests: 2, boss: false, reward: 22 },
  { enemies: 25, obstacles: 16, enemySpeed: 4.0, chests: 2, boss: false, reward: 25 },
  { enemies: 30, obstacles: 16, enemySpeed: 4.0, chests: 3, boss: true,  reward: 50 },
];

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface EnemyKnight {
  root: Mesh;
  body: Mesh;
  head: Mesh;
  helmet: Mesh;
  healthBar: Mesh;
  hp: number;
  maxHp: number;
  speed: number;
  alive: boolean;
  attackTimer: number;
  isBoss: boolean;
}

interface Chest {
  mesh: Mesh;
  opened: boolean;
}

// ── Main Class ─────────────────────────────────────────────────────────────────

export class KnightsQuest {
  private _game: Game;
  private _save: KQSave;

  // BabylonJS
  private _canvas!: HTMLCanvasElement;
  private _engine!: Engine;
  private _scene!: Scene;
  private _cam!: UniversalCamera;

  // HUD
  private _hud!: HTMLDivElement;

  // Player state
  private _playerHp = 100;
  private _playerMaxHp = 100;
  private _playerAmmo = 30;
  private _startAmmo = 30;
  private _swordDmg = 35;
  private _moveSpeed = 8;
  private _mode: "sword" | "gun" = "sword";

  // Physics
  private _vy = 0;
  private _onGround = false;
  private _px = 0;
  private _py = 1.7;
  private _pz = 0;

  // Camera look
  private _yaw = 0;
  private _pitch = 0;
  private _isMobile = false;
  private _pointerLocked = false;

  // Input
  private _keys = new Set<string>();

  // Game state
  private _enemies: EnemyKnight[] = [];
  private _chests: Chest[] = [];
  private _currentMap = 0;
  private _gameMode: "campaign" | "survival" | "practice" = "campaign";
  private _survivalWave = 1;
  private _survivalTimer = 0;
  private _survivalNextSpawn = 10;
  private _phase: "playing" | "mapComplete" | "dead" | "win" = "playing";
  private _mapCompleteTimer = 0;

  // Flash effect
  private _swordFlashTimer = 0;
  private _bulletTrails: { mesh: Mesh; t: number }[] = [];

  // Coin visuals
  private _coinVisuals: { mesh: Mesh; t: number }[] = [];

  // Obstacles
  private _obstacleMeshes: Mesh[] = [];

  // Touch controls
  private _joyActive = false;
  private _joyOx = 0; private _joyOy = 0;
  private _joyDx = 0; private _joyDy = 0;
  private _rTouchId: number | null = null;
  private _rTouchX = 0; private _rTouchY = 0;

  // Cleanup
  private _cleanup: (() => void)[] = [];
  private _disposed = false;
  private _raf = 0;
  private _lastTs = 0;

  constructor(game: Game) {
    this._game = game;
    this._save = loadSave();
    game.inMiniGame = true;
    this._isMobile = window.matchMedia("(pointer:coarse)").matches;
    this._showComingSoon();
  }

  private _showComingSoon(): void {
    this._game.ui.innerHTML = `
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,#0d1117,#0d0d2e);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:Arial,sans-serif;pointer-events:all;gap:16px;">
        <div style="font-size:64px;">⚔️</div>
        <div style="color:#FFD700;font-size:36px;font-weight:900;letter-spacing:3px;
          text-shadow:0 0 20px #FFD700,0 0 40px #FFD70088;">KNIGHT'S QUEST</div>
        <div style="background:linear-gradient(135deg,#e65c00,#f9d423);
          color:#1a0a00;font-size:22px;font-weight:900;padding:10px 32px;border-radius:20px;
          letter-spacing:2px;">🚧 COMING SOON 🚧</div>
        <div style="color:rgba(255,255,255,0.5);font-size:15px;text-align:center;max-width:280px;">
          An epic first-person knight adventure is in the works. Stay tuned!
        </div>
        <button id="kqBack" style="margin-top:12px;background:rgba(255,255,255,0.08);
          border:1.5px solid rgba(255,255,255,0.2);color:white;font-size:15px;
          padding:12px 32px;border-radius:12px;cursor:pointer;">← Back</button>
      </div>
    `;
    document.getElementById("kqBack")!.onclick = () => {
      this._game.inMiniGame = false;
      this._game.ui.innerHTML = "";
      import("../ArcadeScene").then(m => new m.ArcadeScene(this._game));
    };
  }

  // ── Menu ────────────────────────────────────────────────────────────────────

  private _showMenu(): void {
    this._game.ui.innerHTML = `
      <div style="
        position:absolute;inset:0;
        background:#0d1117;
        display:flex;flex-direction:column;align-items:center;
        justify-content:flex-start;
        overflow-y:auto;
        padding:16px 16px 80px;
        font-family:Arial,sans-serif;
        box-sizing:border-box;
        pointer-events:all;
      ">
        <!-- Back -->
        <button id="kqBack" style="
          position:absolute;top:12px;left:12px;
          background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);
          color:rgba(255,255,255,0.7);font-size:13px;padding:7px 14px;
          border-radius:10px;cursor:pointer;">← Back</button>

        <!-- Title -->
        <div style="margin-top:44px;text-align:center;">
          <div style="font-size:52px;margin-bottom:4px;">⚔️</div>
          <div style="color:#FFD700;font-size:28px;font-weight:900;letter-spacing:2px;text-shadow:0 2px 12px rgba(255,200,0,0.5);">KNIGHT'S QUEST</div>
          <div style="color:rgba(255,255,255,0.4);font-size:13px;margin-top:4px;">Fight enemies • Open chests • Conquer 10 maps</div>
        </div>

        <!-- Progress bar -->
        <div style="margin-top:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);
          border-radius:12px;padding:8px 20px;display:flex;align-items:center;gap:12px;">
          <span style="color:#FFD700;font-size:14px;font-weight:bold;">🗺 ${this._save.mapsCompleted}/10</span>
          <span style="color:rgba(255,255,255,0.4);font-size:13px;">maps completed</span>
          <span style="color:#FFD700;font-size:14px;font-weight:bold;margin-left:8px;">🪙 ${this._save.coins}</span>
        </div>

        <!-- Row 1: Start Quest (big) -->
        <button id="kqStart" style="
          margin-top:20px;
          background:linear-gradient(135deg,#b8860b,#FFD700,#ffa500);
          border:none;border-radius:16px;
          padding:18px 48px;cursor:pointer;
          font-size:22px;font-weight:900;color:#1a0a00;
          letter-spacing:1px;width:100%;max-width:340px;
          box-shadow:0 4px 20px rgba(255,200,0,0.4);
          display:flex;align-items:center;justify-content:center;gap:10px;">
          ⚔ START QUEST
        </button>

        <!-- Row 2 -->
        <div style="display:flex;gap:10px;margin-top:10px;width:100%;max-width:340px;">
          <button id="kqSurvival" style="${_menuBtn("#c0392b","rgba(200,50,50,0.2)")}">💀 SURVIVAL</button>
          <button id="kqPractice" style="${_menuBtn("#27ae60","rgba(50,200,80,0.2)")}">🎯 PRACTICE</button>
          <button id="kqParty"    style="${_menuBtn("#e67e22","rgba(200,120,0,0.2)")}">🎉 PARTY</button>
        </div>

        <!-- Row 3 -->
        <div style="display:flex;gap:10px;margin-top:10px;width:100%;max-width:340px;">
          <button id="kqCoop" style="${_menuBtn2("#2980b9","rgba(40,120,200,0.2)")}">🌐 CO-OP</button>
          <button id="kqPvp"  style="${_menuBtn2("#2980b9","rgba(40,120,200,0.2)")}">⚔ 1v1 PVP</button>
        </div>

        <!-- Row 4 -->
        <div style="display:flex;gap:8px;margin-top:10px;width:100%;max-width:340px;flex-wrap:wrap;justify-content:center;">
          <button id="kqShop"   style="${_menuBtn3("#00bcd4","rgba(0,180,210,0.2)")}">💰 SHOP</button>
          <button id="kqAchiev" style="${_menuBtn3("#8e44ad","rgba(140,60,180,0.2)")}">🏆 ACHIEVEMENTS</button>
          <button id="kqTrophy" style="${_menuBtn3("#f39c12","rgba(240,160,0,0.2)")}">🏆 TROPHIES</button>
          <button id="kqTrailer" style="${_menuBtn3("#e74c3c","rgba(220,60,60,0.2)")}">🎬 TRAILER</button>
        </div>

        <!-- Rebirth -->
        <button id="kqRebirth" style="
          margin-top:18px;
          background:linear-gradient(135deg,#e65c00,#f9d423);
          border:none;border-radius:14px;
          padding:14px 32px;cursor:pointer;
          font-size:16px;font-weight:bold;color:#1a0a00;
          width:100%;max-width:340px;
          box-shadow:0 3px 14px rgba(255,140,0,0.35);
          display:flex;flex-direction:column;align-items:center;gap:4px;">
          <span style="font-size:18px;">⭐ REBIRTH</span>
          <span style="font-size:12px;">⭐⭐ Rebirth ${this._save.rebirths}/30 | Coins: ${(1.5 + this._save.rebirths * 0.1).toFixed(2)}x</span>
        </button>
      </div>
    `;

    document.getElementById("kqBack")!.onclick    = () => this._exitToArcade();
    document.getElementById("kqStart")!.onclick   = () => this._startGame("campaign");
    document.getElementById("kqSurvival")!.onclick = () => this._startGame("survival");
    document.getElementById("kqPractice")!.onclick = () => this._startGame("practice");
    document.getElementById("kqParty")!.onclick    = () => this._comingSoon();
    document.getElementById("kqCoop")!.onclick     = () => this._comingSoon();
    document.getElementById("kqPvp")!.onclick      = () => this._comingSoon();
    document.getElementById("kqShop")!.onclick     = () => this._showShop();
    document.getElementById("kqAchiev")!.onclick   = () => this._showAchievements();
    document.getElementById("kqTrophy")!.onclick   = () => this._comingSoon();
    document.getElementById("kqTrailer")!.onclick  = () => this._comingSoon();
    document.getElementById("kqRebirth")!.onclick  = () => this._comingSoon();
  }

  // ── Coming Soon overlay ─────────────────────────────────────────────────────

  private _comingSoon(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.8);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:Arial,sans-serif;";
    ov.innerHTML = `
      <div style="background:#1a1f2e;border:2px solid rgba(255,200,0,0.4);border-radius:20px;padding:40px 48px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">🚧</div>
        <div style="color:#FFD700;font-size:24px;font-weight:bold;margin-bottom:8px;">Coming Soon!</div>
        <div style="color:rgba(255,255,255,0.5);font-size:15px;margin-bottom:24px;">This feature is under construction.</div>
        <button id="csBk" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
          color:white;padding:10px 28px;border-radius:10px;font-size:15px;cursor:pointer;">OK</button>
      </div>
    `;
    document.body.appendChild(ov);
    document.getElementById("csBk")!.onclick = () => ov.remove();
  }

  // ── Shop ───────────────────────────────────────────────────────────────────

  private _shopTab = "Weapons";
  private _showShop(): void {
    const username = localStorage.getItem("chess_username") || localStorage.getItem("kq_username") || "Knight";
    const tabs = ["Weapons","Powers","Pets","Upgrades","Potions","Emotes","Skins"];

    const allItems: Record<string, {id:string,icon:string,name:string,desc:string,cost:number}[]> = {
      Weapons: [
        {id:"shotgun",     icon:"🔫", name:"Shotgun",          desc:"5 pellets per shot! Great close range.",        cost:150},
        {id:"rocket",      icon:"🚀", name:"Rocket Launcher",  desc:"Huge explosion damage! Uses 5 ammo.",           cost:300},
        {id:"minigun",     icon:"⚙️", name:"Minigun",          desc:"Rapid fire! 5 shots per second.",               cost:400},
        {id:"laser",       icon:"💠", name:"Laser Beam",       desc:"Instant hit laser! Best for accuracy.",         cost:500},
        {id:"crossbow",    icon:"🏹", name:"Crossbow",         desc:"Slow but devastating! 3x damage.",              cost:250},
        {id:"flame",       icon:"🔥", name:"Flamethrower",     desc:"Spray fire in a cone! Burns enemies.",          cost:350},
        {id:"sword2",      icon:"⚔️", name:"Holy Sword",       desc:"Blessed blade! Double sword damage.",           cost:200},
        {id:"grenade",     icon:"💣", name:"Grenade",          desc:"Throw and explode! Area damage.",               cost:180},
        {id:"sniper",      icon:"🎯", name:"Sniper Rifle",     desc:"One-shot, long range. Uses 1 ammo.",            cost:450},
      ],
      Powers: [
        {id:"shield_pw",   icon:"🛡️", name:"Force Shield",    desc:"Block 50% of damage for 3 seconds.",            cost:300},
        {id:"speed_pw",    icon:"⚡", name:"Speed Surge",      desc:"Double move speed for 5 seconds.",              cost:200},
        {id:"heal_pw",     icon:"💊", name:"Healing Aura",     desc:"Heal 20 HP per second for 5 seconds.",          cost:250},
        {id:"rage_pw",     icon:"💢", name:"Berserker Rage",   desc:"Triple attack damage for 4 seconds.",           cost:400},
      ],
      Pets: [
        {id:"pet_dog",     icon:"🐕", name:"War Hound",        desc:"Attacks enemies for 10 dmg/sec.",               cost:500},
        {id:"pet_eagle",   icon:"🦅", name:"Battle Eagle",     desc:"Scouts ahead, warns of enemies.",               cost:400},
        {id:"pet_dragon",  icon:"🐉", name:"Mini Dragon",      desc:"Breathes fire! 20 dmg/sec to nearby enemies.",  cost:800},
      ],
      Upgrades: [
        {id:"mag",         icon:"🔋", name:"Extended Mag",     desc:"Start ammo 30→60 bullets.",                     cost:150},
        {id:"boots",       icon:"👟", name:"Speed Boots",      desc:"Move 25% faster permanently.",                  cost:100},
        {id:"armor",       icon:"🪖", name:"Heavy Armor",      desc:"HP 100→150.",                                   cost:250},
        {id:"luck",        icon:"🍀", name:"Lucky Charm",      desc:"Chests give 2x ammo.",                          cost:120},
      ],
      Potions: [
        {id:"pot_hp",      icon:"❤️", name:"Health Potion",    desc:"Restore 50 HP instantly. Single use.",          cost:50},
        {id:"pot_ammo",    icon:"💛", name:"Ammo Potion",      desc:"Restore 30 ammo instantly. Single use.",        cost:40},
        {id:"pot_big",     icon:"💜", name:"Mega Potion",      desc:"Full HP + full ammo. Single use.",              cost:120},
      ],
      Emotes: [
        {id:"em_wave",     icon:"👋", name:"Wave",             desc:"Wave at your enemies before defeating them.",   cost:80},
        {id:"em_dance",    icon:"🕺", name:"Victory Dance",    desc:"Dance after winning a map.",                    cost:150},
        {id:"em_bow",      icon:"🙇", name:"Noble Bow",        desc:"A respectful bow to fallen enemies.",           cost:100},
      ],
      Skins: [
        {id:"skin_gold",   icon:"👑", name:"Gold Knight",      desc:"Shiny golden armor skin.",                      cost:500},
        {id:"skin_dark",   icon:"🖤", name:"Dark Knight",      desc:"Shadow armor. Very menacing.",                  cost:600},
        {id:"skin_ice",    icon:"❄️", name:"Ice Knight",       desc:"Frozen blue armor skin.",                       cost:550},
        {id:"skin_fire",   icon:"🔥", name:"Fire Knight",      desc:"Blazing red and orange armor.",                 cost:600},
      ],
    };

    const ui = this._game.ui;
    ui.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0;background:linear-gradient(135deg,#0d1117,#0d0d2e,#0d1a0d);font-family:Arial,sans-serif;display:flex;flex-direction:column;pointer-events:all;";

    // Top bar
    const topBar = document.createElement("div");
    topBar.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;";
    topBar.innerHTML =
      `<div></div>`+
      `<div style="text-align:center;"><div style="color:#FFD700;font-size:32px;font-weight:900;text-shadow:0 0 20px #FFD700,0 0 40px #FFD70088;letter-spacing:3px;">SHOP</div>`+
      `<div style="color:#FFD700;font-size:15px;margin-top:2px;">Coins: ${this._save.coins.toLocaleString()}</div></div>`+
      `<div style="background:rgba(0,0,0,0.4);border:1.5px solid rgba(255,255,255,0.2);border-radius:10px;padding:6px 12px;text-align:right;">`+
      `<span style="color:#00ff88;font-size:12px;">Signed in as </span><span style="color:white;font-size:12px;font-weight:bold;">${username.toUpperCase()}</span></div>`;
    wrap.appendChild(topBar);

    // Tab bar
    const tabBar = document.createElement("div");
    tabBar.style.cssText = "display:flex;gap:6px;padding:12px 16px;flex-shrink:0;overflow-x:auto;";
    for (const tab of tabs) {
      const tb = document.createElement("button");
      const active = tab === this._shopTab;
      tb.textContent = tab;
      tb.style.cssText = `background:${active ? "transparent" : "rgba(255,255,255,0.04)"};color:${active ? "#FFD700" : "rgba(255,255,255,0.7)"};border:${active ? "2px solid #FFD700" : "1.5px solid rgba(255,255,255,0.15)"};border-radius:10px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:bold;white-space:nowrap;`;
      tb.onclick = () => { this._shopTab = tab; this._showShop(); };
      tabBar.appendChild(tb);
    }
    wrap.appendChild(tabBar);

    // Grid
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;padding:0 16px 16px;overflow-y:auto;flex:1;";
    const items = allItems[this._shopTab] || [];
    for (const item of items) {
      const owned = this._save.shopOwned.includes(item.id);
      const card = document.createElement("div");
      card.style.cssText = "background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);border-radius:14px;padding:18px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;";
      card.innerHTML =
        `<div style="font-size:36px;">${item.icon}</div>`+
        `<div style="color:#FFD700;font-size:15px;font-weight:bold;text-align:center;">${item.name}</div>`+
        `<div style="color:rgba(255,255,255,0.5);font-size:12px;text-align:center;flex:1;">${item.desc}</div>`;
      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;gap:6px;width:100%;";
      const buyBtn = document.createElement("button");
      buyBtn.style.cssText = `flex:1;border:none;border-radius:8px;padding:8px;cursor:${owned?"default":"pointer"};font-size:13px;font-weight:bold;background:${owned?"rgba(80,80,80,0.6)":"#27ae60"};color:white;`;
      buyBtn.textContent = owned ? "OWNED" : `${item.cost} coins`;
      if (!owned) {
        buyBtn.onclick = () => {
          if (this._save.coins < item.cost) { buyBtn.textContent = "Need more coins!"; setTimeout(()=>buyBtn.textContent=`${item.cost} coins`,1200); return; }
          this._save.coins -= item.cost;
          this._save.shopOwned.push(item.id);
          writeSave(this._save);
          this._showShop();
        };
      }
      const giftBtn = document.createElement("button");
      giftBtn.style.cssText = "background:linear-gradient(135deg,#e91e8c,#c2185b);border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:12px;font-weight:bold;color:white;white-space:nowrap;";
      giftBtn.textContent = `🎁 GIFT`;
      giftBtn.onclick = () => { giftBtn.textContent = "Coming Soon!"; setTimeout(()=>giftBtn.textContent="🎁 GIFT",1500); };
      btnRow.appendChild(buyBtn); btnRow.appendChild(giftBtn);
      card.appendChild(btnRow);
      grid.appendChild(card);
    }
    wrap.appendChild(grid);

    // Back button
    const backBtn = document.createElement("button");
    backBtn.textContent = "← BACK";
    backBtn.style.cssText = "margin:0 auto 16px;background:linear-gradient(135deg,#e53935,#b71c1c);color:white;border:none;border-radius:14px;padding:14px 60px;font-size:16px;font-weight:bold;cursor:pointer;flex-shrink:0;";
    backBtn.onclick = () => this._showMenu();
    wrap.appendChild(backBtn);

    ui.appendChild(wrap);
  }

  // ── Achievements ───────────────────────────────────────────────────────────

  private _showAchievements(): void {
    const achList = [
      { id: "firstblood",    icon: "🩸", name: "First Blood",      desc: "Kill your first enemy",           check: () => this._save.killCount >= 1 },
      { id: "sharpshooter",  icon: "🎯", name: "Sharpshooter",     desc: "Kill 10 enemies with the gun",    check: () => this._save.gunKills >= 10 },
      { id: "knightsquest",  icon: "⚔️", name: "Knight's Quest",    desc: "Complete all 10 maps",            check: () => this._save.mapsCompleted >= 10 },
      { id: "survivor",      icon: "💀", name: "Survivor",          desc: "Survive 5 minutes in Survival",  check: () => this._save.survivalSeconds >= 300 },
      { id: "treasurehunt",  icon: "💰", name: "Treasure Hunter",   desc: "Open 10 chests",                  check: () => this._save.chestsOpened >= 10 },
    ];

    // Auto-unlock
    let changed = false;
    for (const a of achList) {
      if (!this._save.achievements.includes(a.id) && a.check()) {
        this._save.achievements.push(a.id);
        changed = true;
      }
    }
    if (changed) writeSave(this._save);

    const rows = achList.map(a => {
      const unlocked = this._save.achievements.includes(a.id);
      return `<div style="background:rgba(255,255,255,0.04);border:2px solid ${unlocked ? "rgba(255,200,0,0.5)" : "rgba(255,255,255,0.08)"};
        border-radius:12px;padding:14px 16px;width:100%;max-width:320px;margin-bottom:10px;
        display:flex;align-items:center;gap:12px;${unlocked ? "" : "opacity:0.5;"}">
        <div style="font-size:32px;">${a.icon}</div>
        <div>
          <div style="color:${unlocked ? "#FFD700" : "white"};font-size:15px;font-weight:bold;">${a.name}</div>
          <div style="color:rgba(255,255,255,0.45);font-size:12px;">${a.desc}</div>
        </div>
        <div style="margin-left:auto;font-size:20px;">${unlocked ? "✅" : "🔒"}</div>
      </div>`;
    }).join("");

    this._game.ui.innerHTML = `
      <div style="position:absolute;inset:0;background:#0d1117;display:flex;flex-direction:column;
        align-items:center;padding:60px 16px 40px;font-family:Arial,sans-serif;overflow-y:auto;box-sizing:border-box;pointer-events:all;">
        <button id="achBack" style="position:absolute;top:12px;left:12px;background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.7);font-size:13px;
          padding:7px 14px;border-radius:10px;cursor:pointer;">← Back</button>
        <div style="color:#8e44ad;font-size:24px;font-weight:bold;margin-bottom:20px;">🏆 ACHIEVEMENTS</div>
        ${rows}
      </div>
    `;
    document.getElementById("achBack")!.onclick = () => this._showMenu();
  }

  // ── Start 3D Game ──────────────────────────────────────────────────────────

  private _startGame(mode: "campaign" | "survival" | "practice"): void {
    this._gameMode = mode;
    this._currentMap = 0;
    this._playerHp = this._playerMaxHp;
    this._playerAmmo = this._startAmmo;
    this._phase = "playing";

    this._game.ui.innerHTML = "";
    this._initBabylon();
    this._loadMap(0);
    this._buildHUD();
    this._bindInput();
    this._startRenderLoop();
  }

  // ── BabylonJS init ─────────────────────────────────────────────────────────

  private _initBabylon(): void {
    this._canvas = document.createElement("canvas");
    this._canvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;touch-action:none;outline:none;pointer-events:all;";
    this._canvas.setAttribute("tabindex", "0");
    this._game.ui.appendChild(this._canvas);

    this._hud = document.createElement("div");
    this._hud.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:11;font-family:Arial,sans-serif;";
    this._game.ui.appendChild(this._hud);

    this._engine = new Engine(this._canvas, true, { antialias: true });
    this._scene = new Scene(this._engine);
    this._scene.clearColor = new Color4(0.5, 0.75, 1.0, 1.0); // blue sky

    // Lighting
    const amb = new HemisphericLight("amb", Vector3.Up(), this._scene);
    amb.intensity = 0.6;
    amb.groundColor = new Color3(0.4, 0.5, 0.3);

    const sun = new DirectionalLight("sun", new Vector3(-0.6, -1, -0.4).normalize(), this._scene);
    sun.intensity = 1.0;
    sun.position.set(20, 40, 20);

    // Camera (first-person)
    this._cam = new UniversalCamera("cam", new Vector3(0, 1.7, 0), this._scene);
    this._cam.minZ = 0.05;
    this._cam.fov = 1.1;
    // No BabylonJS input — we handle it manually
    this._cam.inputs.clear();

    const resizeCb = () => this._engine.resize();
    window.addEventListener("resize", resizeCb);
    this._cleanup.push(() => window.removeEventListener("resize", resizeCb));
  }

  // ── Map loading ────────────────────────────────────────────────────────────

  private _loadMap(mapIndex: number): void {
    // Clear old entities
    for (const e of this._enemies) this._disposeEnemy(e);
    for (const c of this._chests) c.mesh.dispose();
    for (const m of this._obstacleMeshes) m.dispose();
    for (const t of this._bulletTrails) t.mesh.dispose();
    for (const cv of this._coinVisuals) cv.mesh.dispose();
    this._enemies = [];
    this._chests = [];
    this._obstacleMeshes = [];
    this._bulletTrails = [];
    this._coinVisuals = [];

    const def = this._gameMode === "survival"
      ? { enemies: 5 + this._survivalWave * 3, obstacles: 8, enemySpeed: 2.5 + this._survivalWave * 0.2, chests: 1, boss: false, reward: 0 } as MapDef
      : MAPS[mapIndex] ?? MAPS[9];

    // Ground
    const ground = MeshBuilder.CreateGround("ground", { width: 200, height: 200, subdivisions: 1 }, this._scene);
    const gMat = new StandardMaterial("gmat", this._scene);
    gMat.diffuseColor = new Color3(0.25, 0.55, 0.15);
    ground.material = gMat;
    this._obstacleMeshes.push(ground);

    // Obstacles (rocks/walls)
    for (let i = 0; i < def.obstacles; i++) {
      const angle = (i / def.obstacles) * Math.PI * 2 + (i * 0.4);
      const r = 6 + (i % 5) * 4;
      const ox = Math.cos(angle) * r;
      const oz = Math.sin(angle) * r;
      const w = 1 + Math.random() * 2;
      const h = 1.5 + Math.random() * 2;
      const d = 1 + Math.random() * 2;
      const box = MeshBuilder.CreateBox(`obs${i}`, { width: w, height: h, depth: d }, this._scene);
      box.position.set(ox, h / 2, oz);
      const mat = new StandardMaterial(`omat${i}`, this._scene);
      mat.diffuseColor = new Color3(0.45, 0.4, 0.35);
      box.material = mat;
      this._obstacleMeshes.push(box);
    }

    // Spawn enemies
    const count = def.enemies;
    for (let i = 0; i < count; i++) {
      const isBoss = def.boss && i === count - 1;
      const angle = (i / count) * Math.PI * 2;
      const r = 12 + (i % 4) * 4;
      this._spawnEnemy(Math.cos(angle) * r, Math.sin(angle) * r, def.enemySpeed, isBoss);
    }

    // Spawn chests
    for (let i = 0; i < def.chests; i++) {
      const angle = (i / (def.chests || 1)) * Math.PI * 2 + 1.0;
      const r = 8 + i * 3;
      this._spawnChest(Math.cos(angle) * r, Math.sin(angle) * r);
    }

    // Reset player position
    this._px = 0; this._py = 1.7; this._pz = 0;
    this._vy = 0;
    this._cam.position.set(0, 1.7, 0);
  }

  // ── Enemy spawning ─────────────────────────────────────────────────────────

  private _spawnEnemy(x: number, z: number, speed: number, isBoss: boolean): void {
    const hp = isBoss ? 100 : 50;
    const scale = isBoss ? 1.6 : 1.0;

    // Body (torso)
    const body = MeshBuilder.CreateBox("body", { width: 0.6 * scale, height: 0.8 * scale, depth: 0.4 * scale }, this._scene);
    const bMat = new StandardMaterial("bmat", this._scene);
    bMat.diffuseColor = isBoss ? new Color3(0.5, 0.0, 0.0) : new Color3(0.3, 0.35, 0.4);
    body.material = bMat;

    // Head
    const head = MeshBuilder.CreateBox("head", { width: 0.45 * scale, height: 0.45 * scale, depth: 0.45 * scale }, this._scene);
    const hMat = new StandardMaterial("hmat", this._scene);
    hMat.diffuseColor = new Color3(0.85, 0.75, 0.65);
    head.material = hMat;

    // Helmet
    const helmet = MeshBuilder.CreateBox("helmet", { width: 0.5 * scale, height: 0.2 * scale, depth: 0.5 * scale }, this._scene);
    const helmMat = new StandardMaterial("helmmat", this._scene);
    helmMat.diffuseColor = isBoss ? new Color3(0.6, 0.1, 0.0) : new Color3(0.5, 0.5, 0.55);
    helmet.material = helmMat;

    // Health bar (red plane above head)
    const healthBar = MeshBuilder.CreatePlane("hb", { width: 1.0 * scale, height: 0.12 * scale }, this._scene);
    const hbMat = new StandardMaterial("hbmat", this._scene);
    hbMat.diffuseColor = new Color3(1, 0.1, 0.1);
    hbMat.emissiveColor = new Color3(1, 0.1, 0.1);
    hbMat.backFaceCulling = false;
    healthBar.material = hbMat;
    healthBar.billboardMode = Mesh.BILLBOARDMODE_Y;

    // Root (use body as root position driver)
    const ey = 0.9 * scale;
    body.position.set(x, ey, z);
    head.position.set(x, ey + 0.62 * scale, z);
    helmet.position.set(x, ey + 0.85 * scale, z);
    healthBar.position.set(x, ey + 1.1 * scale, z);

    const enemy: EnemyKnight = {
      root: body,
      body, head, helmet, healthBar,
      hp, maxHp: hp,
      speed: speed * (isBoss ? 0.7 : 1),
      alive: true,
      attackTimer: 0,
      isBoss,
    };
    this._enemies.push(enemy);
  }

  private _disposeEnemy(e: EnemyKnight): void {
    e.body.dispose();
    e.head.dispose();
    e.helmet.dispose();
    e.healthBar.dispose();
    e.alive = false;
  }

  // ── Chest spawning ─────────────────────────────────────────────────────────

  private _spawnChest(x: number, z: number): void {
    const mesh = MeshBuilder.CreateBox("chest", { width: 0.8, height: 0.6, depth: 0.6 }, this._scene);
    mesh.position.set(x, 0.3, z);
    const mat = new StandardMaterial("chestmat", this._scene);
    mat.diffuseColor = new Color3(1, 0.85, 0.0);
    mat.emissiveColor = new Color3(0.2, 0.17, 0);
    mesh.material = mat;
    this._chests.push({ mesh, opened: false });
  }

  // ── HUD ─────────────────────────────────────────────────────────────────────

  private _buildHUD(): void {
    this._hud.innerHTML = `
      <!-- HP bar -->
      <div id="kqHpBar" style="position:absolute;top:16px;left:16px;
        background:rgba(0,0,0,0.55);border-radius:10px;padding:6px 12px;min-width:160px;">
        <div style="color:#ff4444;font-size:13px;font-weight:bold;margin-bottom:4px;">❤️ HP</div>
        <div style="background:rgba(255,255,255,0.15);border-radius:6px;height:10px;width:140px;">
          <div id="kqHpFill" style="background:linear-gradient(90deg,#ff0000,#ff6666);
            border-radius:6px;height:100%;width:100%;transition:width 0.1s;"></div>
        </div>
        <div id="kqHpText" style="color:white;font-size:12px;margin-top:2px;">${this._playerHp}/${this._playerMaxHp}</div>
      </div>

      <!-- Ammo -->
      <div id="kqAmmo" style="position:absolute;top:16px;right:16px;
        background:rgba(0,0,0,0.55);border-radius:10px;padding:6px 12px;text-align:right;">
        <div style="color:#aaddff;font-size:14px;font-weight:bold;">🔫 ${this._playerAmmo}</div>
      </div>

      <!-- Mode indicator -->
      <div id="kqMode" style="position:absolute;top:72px;right:16px;
        background:rgba(0,0,0,0.55);border-radius:8px;padding:4px 10px;
        color:white;font-size:13px;font-weight:bold;">
        ⚔ SWORD
      </div>

      <!-- Crosshair -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        color:white;font-size:20px;text-shadow:0 0 4px black;pointer-events:none;
        line-height:1;">+</div>

      <!-- Bottom info -->
      <div id="kqMapInfo" style="position:absolute;bottom:${this._isMobile ? "120px" : "20px"};left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.6);border-radius:10px;padding:6px 16px;color:white;font-size:13px;
        text-align:center;pointer-events:none;"></div>

      <!-- Sword flash overlay -->
      <div id="kqFlash" style="position:absolute;inset:0;background:rgba(255,0,0,0);
        pointer-events:none;transition:background 0.1s;"></div>

      <!-- Map complete overlay -->
      <div id="kqMapComplete" style="display:none;position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);border:2px solid #FFD700;
        border-radius:20px;padding:30px 48px;text-align:center;color:white;font-family:Arial,sans-serif;">
        <div id="kqMapCompleteText" style="font-size:22px;font-weight:bold;color:#FFD700;"></div>
        <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:8px;">Next map loading…</div>
      </div>

      <!-- Dead overlay -->
      <div id="kqDeadOverlay" style="display:none;position:absolute;inset:0;background:rgba(100,0,0,0.7);
        display:none;flex-direction:column;align-items:center;justify-content:center;
        font-family:Arial,sans-serif;">
        <div style="font-size:48px;">💀</div>
        <div style="color:white;font-size:28px;font-weight:bold;margin:12px 0;">YOU DIED</div>
        <button id="kqRetry" style="background:#c0392b;border:none;border-radius:12px;
          color:white;font-size:16px;font-weight:bold;padding:12px 32px;cursor:pointer;margin:6px;
          pointer-events:all;">Try Again</button>
        <button id="kqMenuFromDead" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);
          border-radius:12px;color:white;font-size:14px;padding:10px 24px;cursor:pointer;margin:6px;
          pointer-events:all;">Menu</button>
      </div>

      ${this._isMobile ? this._mobileControlsHTML() : ""}
    `;

    this._updateHUD();

    document.getElementById("kqRetry")?.addEventListener("click", () => {
      this._playerHp = this._playerMaxHp;
      this._playerAmmo = this._startAmmo;
      this._phase = "playing";
      this._loadMap(this._currentMap);
      const dead = document.getElementById("kqDeadOverlay");
      if (dead) dead.style.display = "none";
    });
    document.getElementById("kqMenuFromDead")?.addEventListener("click", () => this._exit());
  }

  private _mobileControlsHTML(): string {
    return `
      <!-- Mobile joystick left -->
      <div id="kqJoy" style="position:absolute;bottom:30px;left:30px;pointer-events:all;
        width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.1);
        border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;">
        <div id="kqJoyThumb" style="width:40px;height:40px;border-radius:50%;
          background:rgba(255,255,255,0.4);position:absolute;top:30px;left:30px;"></div>
      </div>
      <!-- Mobile action buttons -->
      <div style="position:absolute;bottom:30px;right:30px;display:flex;flex-direction:column;gap:10px;pointer-events:all;">
        <button id="kqMobileGun" style="background:rgba(40,100,200,0.8);border:none;border-radius:50%;
          width:56px;height:56px;font-size:24px;cursor:pointer;pointer-events:all;">🔫</button>
        <button id="kqMobileSword" style="background:rgba(200,40,40,0.8);border:none;border-radius:50%;
          width:56px;height:56px;font-size:24px;cursor:pointer;pointer-events:all;">⚔</button>
        <button id="kqMobileJump" style="background:rgba(40,180,80,0.8);border:none;border-radius:50%;
          width:56px;height:56px;font-size:22px;cursor:pointer;pointer-events:all;">⬆</button>
      </div>
    `;
  }

  private _updateHUD(): void {
    const hpFill = document.getElementById("kqHpFill") as HTMLElement;
    const hpText = document.getElementById("kqHpText") as HTMLElement;
    const ammoEl = document.getElementById("kqAmmo") as HTMLElement;
    const modeEl = document.getElementById("kqMode") as HTMLElement;
    const mapInfo = document.getElementById("kqMapInfo") as HTMLElement;

    if (hpFill) hpFill.style.width = `${Math.max(0, (this._playerHp / this._playerMaxHp) * 100)}%`;
    if (hpText) hpText.textContent = `${Math.max(0, this._playerHp)}/${this._playerMaxHp}`;
    if (ammoEl) ammoEl.innerHTML = `<div style="color:#aaddff;font-size:14px;font-weight:bold;">🔫 ${this._playerAmmo}</div>`;
    if (modeEl) modeEl.textContent = this._mode === "sword" ? "⚔ SWORD" : "🔫 GUN";

    if (mapInfo) {
      const alive = this._enemies.filter(e => e.alive).length;
      if (this._gameMode === "campaign") {
        mapInfo.textContent = `Map ${this._currentMap + 1}/10 — Enemies: ${alive}`;
      } else if (this._gameMode === "survival") {
        mapInfo.textContent = `Wave ${this._survivalWave} — Enemies: ${alive}`;
      } else {
        mapInfo.textContent = `PRACTICE — Explore freely`;
      }
    }
  }

  // ── Input binding ─────────────────────────────────────────────────────────

  private _bindInput(): void {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      this._keys[down ? "add" : "delete"](e.code);
      if (down && e.code === "KeyR") this._mode = this._mode === "sword" ? "gun" : "sword";
      if (down && e.code === "KeyE") this._tryOpenChest();
    };
    const onKeyDown = (e: KeyboardEvent) => onKey(e, true);
    const onKeyUp   = (e: KeyboardEvent) => onKey(e, false);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup",   onKeyUp);
    this._cleanup.push(() => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup",   onKeyUp);
    });

    // Pointer lock (desktop)
    if (!this._isMobile) {
      const onClick = () => {
        if (!this._pointerLocked) {
          this._canvas.requestPointerLock();
        }
      };
      this._canvas.addEventListener("click", onClick);
      this._cleanup.push(() => this._canvas.removeEventListener("click", onClick));

      const onPLChange = () => {
        this._pointerLocked = document.pointerLockElement === this._canvas;
      };
      document.addEventListener("pointerlockchange", onPLChange);
      this._cleanup.push(() => document.removeEventListener("pointerlockchange", onPLChange));

      const onMouseMove = (e: MouseEvent) => {
        if (!this._pointerLocked || this._phase !== "playing") return;
        this._yaw   += e.movementX * 0.002;
        this._pitch += e.movementY * 0.002;
        this._pitch = Math.max(-1.4, Math.min(1.4, this._pitch));
      };
      document.addEventListener("mousemove", onMouseMove);
      this._cleanup.push(() => document.removeEventListener("mousemove", onMouseMove));

      const onMouseDown = (e: MouseEvent) => {
        if (this._phase !== "playing") return;
        if (e.button === 0) this._swordSlash();
        if (e.button === 2) { e.preventDefault(); this._gunShoot(); }
      };
      this._canvas.addEventListener("mousedown", onMouseDown);
      this._canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      this._cleanup.push(() => {
        this._canvas.removeEventListener("mousedown", onMouseDown);
      });
    }

    // Mobile controls
    if (this._isMobile) {
      this._bindMobileControls();
    }

    // Exit key
    const onEsc = (e: KeyboardEvent) => {
      if (e.code === "Escape") this._exit();
    };
    document.addEventListener("keydown", onEsc);
    this._cleanup.push(() => document.removeEventListener("keydown", onEsc));
  }

  private _bindMobileControls(): void {
    // Joystick
    const joy = document.getElementById("kqJoy");
    const joyThumb = document.getElementById("kqJoyThumb");
    if (joy && joyThumb) {
      const rect = () => joy.getBoundingClientRect();
      const onTouchStart = (e: TouchEvent) => {
        for (const t of Array.from(e.changedTouches)) {
          const r = rect();
          if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) {
            this._joyActive = true;
            this._joyOx = t.clientX - (r.left + r.width / 2);
            this._joyOy = t.clientY - (r.top + r.height / 2);
          }
        }
      };
      const onTouchMove = (e: TouchEvent) => {
        if (!this._joyActive) return;
        for (const t of Array.from(e.changedTouches)) {
          const r = rect();
          this._joyDx = (t.clientX - (r.left + r.width / 2)) / 50;
          this._joyDy = (t.clientY - (r.top + r.height / 2)) / 50;
          const clamp = Math.min(1, Math.hypot(this._joyDx, this._joyDy));
          if (clamp > 0) { this._joyDx /= clamp; this._joyDy /= clamp; }
          const dx = this._joyDx * 30, dy = this._joyDy * 30;
          joyThumb.style.left = `${30 + dx}px`;
          joyThumb.style.top  = `${30 + dy}px`;
        }
      };
      const onTouchEnd = () => {
        this._joyActive = false; this._joyDx = 0; this._joyDy = 0;
        joyThumb.style.left = "30px"; joyThumb.style.top = "30px";
      };
      joy.addEventListener("touchstart", onTouchStart, { passive: true });
      document.addEventListener("touchmove", onTouchMove, { passive: true });
      document.addEventListener("touchend", onTouchEnd);
      this._cleanup.push(() => {
        joy.removeEventListener("touchstart", onTouchStart);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
      });
    }

    // Right side drag to look
    const onRTouchStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX > window.innerWidth / 2 && this._rTouchId === null) {
          this._rTouchId = t.identifier;
          this._rTouchX = t.clientX;
          this._rTouchY = t.clientY;
        }
      }
    };
    const onRTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this._rTouchId) {
          const dx = t.clientX - this._rTouchX;
          const dy = t.clientY - this._rTouchY;
          this._rTouchX = t.clientX;
          this._rTouchY = t.clientY;
          this._yaw   += dx * 0.005;
          this._pitch -= dy * 0.005;
          this._pitch = Math.max(-1.4, Math.min(1.4, this._pitch));
        }
      }
    };
    const onRTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this._rTouchId) this._rTouchId = null;
      }
    };
    document.addEventListener("touchstart", onRTouchStart, { passive: true });
    document.addEventListener("touchmove", onRTouchMove, { passive: true });
    document.addEventListener("touchend", onRTouchEnd);
    this._cleanup.push(() => {
      document.removeEventListener("touchstart", onRTouchStart);
      document.removeEventListener("touchmove", onRTouchMove);
      document.removeEventListener("touchend", onRTouchEnd);
    });

    // Buttons
    document.getElementById("kqMobileSword")?.addEventListener("click", () => {
      this._mode = "sword"; this._swordSlash();
    });
    document.getElementById("kqMobileGun")?.addEventListener("click", () => {
      this._mode = "gun"; this._gunShoot();
    });
    document.getElementById("kqMobileJump")?.addEventListener("click", () => {
      if (this._onGround) this._vy = 10;
    });
  }

  // ── Render loop ────────────────────────────────────────────────────────────

  private _startRenderLoop(): void {
    this._lastTs = performance.now();
    const loop = (ts: number) => {
      if (this._disposed) return;
      const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
      this._lastTs = ts;
      this._tick(dt);
      this._scene.render();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  // ── Game tick ─────────────────────────────────────────────────────────────

  private _tick(dt: number): void {
    if (this._phase === "playing") {
      this._tickPlayer(dt);
      this._tickEnemies(dt);
      this._tickSurvival(dt);
      this._tickChests();
      this._tickMapComplete();
    } else if (this._phase === "mapComplete") {
      this._mapCompleteTimer -= dt;
      if (this._mapCompleteTimer <= 0) {
        this._phase = "playing";
        const mc = document.getElementById("kqMapComplete");
        if (mc) mc.style.display = "none";
        this._currentMap++;
        if (this._currentMap >= 10) {
          this._save.mapsCompleted = 10;
          writeSave(this._save);
          this._showWin();
          return;
        }
        this._save.mapsCompleted = Math.max(this._save.mapsCompleted, this._currentMap);
        writeSave(this._save);
        this._loadMap(this._currentMap);
      }
    }

    // Bullet trails
    for (let i = this._bulletTrails.length - 1; i >= 0; i--) {
      const bt = this._bulletTrails[i];
      bt.t -= dt;
      if (bt.t <= 0) { bt.mesh.dispose(); this._bulletTrails.splice(i, 1); }
      else { const a = bt.t / 0.2; (bt.mesh.material as StandardMaterial).alpha = a; }
    }

    // Coin visuals
    for (let i = this._coinVisuals.length - 1; i >= 0; i--) {
      const cv = this._coinVisuals[i];
      cv.t -= dt;
      cv.mesh.position.y += dt * 2;
      if (cv.t <= 0) { cv.mesh.dispose(); this._coinVisuals.splice(i, 1); }
    }

    // Sword flash
    if (this._swordFlashTimer > 0) {
      this._swordFlashTimer -= dt;
      const flash = document.getElementById("kqFlash");
      if (flash) {
        const a = Math.min(0.5, this._swordFlashTimer * 3);
        flash.style.background = `rgba(255,0,0,${a})`;
      }
    }

    this._updateHUD();
    this._updateHealthBars();
  }

  private _tickPlayer(dt: number): void {
    if (!this._scene) return;

    // Movement direction from camera yaw
    const cy = Math.cos(this._yaw), sy = Math.sin(this._yaw);
    let mx = 0, mz = 0;

    if (this._isMobile && this._joyActive) {
      mx = this._joyDx * cy + this._joyDy * sy;
      mz = -this._joyDx * sy + this._joyDy * cy;
    } else {
      if (this._keys.has("KeyW") || this._keys.has("ArrowUp"))    { mx += sy; mz += cy; }
      if (this._keys.has("KeyS") || this._keys.has("ArrowDown"))  { mx -= sy; mz -= cy; }
      if (this._keys.has("KeyA") || this._keys.has("ArrowLeft"))  { mx -= cy; mz += sy; }
      if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) { mx += cy; mz -= sy; }
    }

    const len = Math.hypot(mx, mz);
    if (len > 0) { mx /= len; mz /= len; }
    this._px += mx * this._moveSpeed * dt;
    this._pz += mz * this._moveSpeed * dt;

    // Keep on ground
    const groundY = 1.7;
    this._vy += -25 * dt;
    this._py += this._vy * dt;
    if (this._py <= groundY) { this._py = groundY; this._vy = 0; this._onGround = true; }
    else { this._onGround = false; }

    // Jump
    if ((this._keys.has("Space")) && this._onGround) {
      this._vy = 10;
      this._onGround = false;
    }

    // Clamp to play area
    this._px = Math.max(-95, Math.min(95, this._px));
    this._pz = Math.max(-95, Math.min(95, this._pz));

    // Update camera
    this._cam.position.set(this._px, this._py, this._pz);
    this._cam.rotation.set(this._pitch, this._yaw, 0);
  }

  private _tickEnemies(dt: number): void {
    for (const e of this._enemies) {
      if (!e.alive) continue;

      const ex = e.body.position.x;
      const ez = e.body.position.z;
      const dx = this._px - ex;
      const dz = this._pz - ez;
      const dist = Math.hypot(dx, dz);

      // Move toward player
      if (dist > 1.5) {
        const nx = dx / dist, nz = dz / dist;
        const nx2 = ex + nx * e.speed * dt;
        const nz2 = ez + nz * e.speed * dt;
        e.body.position.set(nx2, e.body.position.y, nz2);
        e.head.position.set(nx2, e.head.position.y, nz2);
        e.helmet.position.set(nx2, e.helmet.position.y, nz2);
        e.healthBar.position.set(nx2, e.healthBar.position.y, nz2);
      }

      // Attack player
      if (dist < 2.0) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = 1.5;
          this._playerHp -= 10;
          this._swordFlashTimer = 0.3;
          if (this._playerHp <= 0) this._die();
        }
      }
    }
  }

  private _tickSurvival(dt: number): void {
    if (this._gameMode !== "survival") return;
    this._survivalTimer += dt;
    this._save.survivalSeconds = Math.max(this._save.survivalSeconds, Math.floor(this._survivalTimer));

    // Spawn next wave when all dead
    const alive = this._enemies.filter(e => e.alive).length;
    if (alive === 0) {
      this._survivalWave++;
      this._loadMap(0); // reloads with survival def
    }
  }

  private _tickChests(): void {
    for (const c of this._chests) {
      if (c.opened) continue;
      // Visual: gently pulse (just handled by E key)
    }
  }

  private _tryOpenChest(): void {
    for (const c of this._chests) {
      if (c.opened) continue;
      const cx = c.mesh.position.x - this._px;
      const cz = c.mesh.position.z - this._pz;
      if (Math.hypot(cx, cz) < 2.5) {
        c.opened = true;
        c.mesh.dispose();
        this._playerAmmo += 10;
        this._save.chestsOpened++;
        this._checkAchievements();
        writeSave(this._save);
        this._showHint("+10 Ammo!");
      }
    }
  }

  private _tickMapComplete(): void {
    if (this._gameMode === "practice") return;
    const alive = this._enemies.filter(e => e.alive).length;
    if (alive === 0 && this._enemies.length > 0 && this._phase === "playing") {
      // Map complete!
      const def = MAPS[this._currentMap] ?? MAPS[9];
      const reward = def.reward;
      this._save.coins += reward;
      writeSave(this._save);

      this._phase = "mapComplete";
      this._mapCompleteTimer = 3;

      const mc = document.getElementById("kqMapComplete");
      const mcText = document.getElementById("kqMapCompleteText");
      if (mc) mc.style.display = "block";
      if (mcText) mcText.textContent = `Map ${this._currentMap + 1} Complete! +${reward} coins`;
    }
  }

  // ── Combat ─────────────────────────────────────────────────────────────────

  private _swordSlash(): void {
    if (this._phase !== "playing") return;
    this._swordFlashTimer = 0.15;

    const fwd = new Vector3(Math.sin(this._yaw), 0, Math.cos(this._yaw));
    let killed = false;
    for (const e of this._enemies) {
      if (!e.alive) continue;
      const ex = e.body.position.x - this._px;
      const ez = e.body.position.z - this._pz;
      const dist = Math.hypot(ex, ez);
      if (dist > 3.5) continue;
      const dot = (ex / dist) * fwd.x + (ez / dist) * fwd.z;
      if (dot < 0.3) continue; // must be roughly in front

      e.hp -= this._swordDmg;
      if (e.hp <= 0) {
        this._killEnemy(e);
        killed = true;
      }
    }
    if (killed) this._checkAchievements();
  }

  private _gunShoot(): void {
    if (this._phase !== "playing") return;
    if (this._playerAmmo <= 0) { this._showHint("No ammo!"); return; }
    this._playerAmmo--;

    // Raycast forward
    const origin = new Vector3(this._px, this._py - 0.1, this._pz);
    const dir = new Vector3(
      Math.sin(this._yaw) * Math.cos(this._pitch),
      Math.sin(-this._pitch),
      Math.cos(this._yaw) * Math.cos(this._pitch),
    ).normalize();

    // Find closest enemy in ray path
    let closest: EnemyKnight | null = null;
    let closestDist = Infinity;
    for (const e of this._enemies) {
      if (!e.alive) continue;
      const ex = e.body.position.x - this._px;
      const ey = (e.body.position.y + 0.4) - this._py;
      const ez = e.body.position.z - this._pz;
      const dist = Math.hypot(ex, ey, ez);
      const dot = (ex * dir.x + ey * dir.y + ez * dir.z) / dist;
      if (dot > 0.96 && dist < 60 && dist < closestDist) {
        closest = e;
        closestDist = dist;
      }
    }

    // Bullet trail
    const trailEnd = closest
      ? new Vector3(closest.body.position.x, closest.body.position.y + 0.4, closest.body.position.z)
      : origin.add(dir.scale(30));
    const mid = Vector3.Lerp(origin, trailEnd, 0.5);
    const trail = MeshBuilder.CreateCylinder("trail", {
      diameter: 0.04,
      height: Vector3.Distance(origin, trailEnd),
    }, this._scene);
    trail.position.copyFrom(mid);
    trail.lookAt(trailEnd);
    trail.rotate(new Vector3(1, 0, 0), Math.PI / 2);
    const tmat = new StandardMaterial("tmat", this._scene);
    tmat.diffuseColor = new Color3(1, 1, 0.6);
    tmat.emissiveColor = new Color3(1, 1, 0.6);
    trail.material = tmat;
    this._bulletTrails.push({ mesh: trail, t: 0.2 });

    if (closest) {
      closest.hp -= 50;
      this._save.gunKills++;
      if (closest.hp <= 0) {
        this._killEnemy(closest);
        this._checkAchievements();
      }
    }
  }

  private _killEnemy(e: EnemyKnight): void {
    this._save.killCount++;

    // Coin visual
    const coin = MeshBuilder.CreateSphere("coin", { diameter: 0.3 }, this._scene);
    coin.position.copyFrom(e.body.position);
    const cmat = new StandardMaterial("cmat", this._scene);
    cmat.diffuseColor = new Color3(1, 0.85, 0);
    cmat.emissiveColor = new Color3(0.3, 0.25, 0);
    coin.material = cmat;
    this._coinVisuals.push({ mesh: coin, t: 1.0 });

    this._disposeEnemy(e);
  }

  // ── Achievements ──────────────────────────────────────────────────────────

  private _checkAchievements(): void {
    const before = this._save.achievements.length;
    const checks: [string, () => boolean][] = [
      ["firstblood",   () => this._save.killCount >= 1],
      ["sharpshooter", () => this._save.gunKills >= 10],
      ["knightsquest", () => this._save.mapsCompleted >= 10],
      ["survivor",     () => this._save.survivalSeconds >= 300],
      ["treasurehunt", () => this._save.chestsOpened >= 10],
    ];
    for (const [id, fn] of checks) {
      if (!this._save.achievements.includes(id) && fn()) {
        this._save.achievements.push(id);
      }
    }
    if (this._save.achievements.length !== before) {
      writeSave(this._save);
      this._showHint("Achievement unlocked!");
    }
  }

  // ── Health bars update ─────────────────────────────────────────────────────

  private _updateHealthBars(): void {
    for (const e of this._enemies) {
      if (!e.alive) continue;
      const pct = Math.max(0, e.hp / e.maxHp);
      const mat = e.healthBar.material as StandardMaterial;
      const g = pct;
      const r = 1 - pct * 0.5;
      mat.diffuseColor.set(r, g * 0.1, 0.1);
      mat.emissiveColor.set(r, g * 0.1, 0.1);
      e.healthBar.scaling.x = pct;
    }
  }

  // ── Death / Win ────────────────────────────────────────────────────────────

  private _die(): void {
    this._phase = "dead";
    this._playerHp = 0;
    const dead = document.getElementById("kqDeadOverlay");
    if (dead) dead.style.display = "flex";
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private _showWin(): void {
    this._phase = "win";
    if (document.pointerLockElement) document.exitPointerLock();
    this._game.ui.innerHTML = `
      <div style="position:absolute;inset:0;background:linear-gradient(135deg,#0d1117,#1a1a00);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:Arial,sans-serif;pointer-events:all;">
        <div style="font-size:64px;margin-bottom:16px;">🏆</div>
        <div style="color:#FFD700;font-size:32px;font-weight:900;margin-bottom:8px;">QUEST COMPLETE!</div>
        <div style="color:rgba(255,255,255,0.6);font-size:16px;margin-bottom:24px;">All 10 maps conquered!</div>
        <button id="winMenu" style="background:linear-gradient(135deg,#b8860b,#FFD700);border:none;
          border-radius:14px;color:#1a0a00;font-size:18px;font-weight:bold;padding:14px 36px;cursor:pointer;">
          Back to Menu
        </button>
      </div>
    `;
    document.getElementById("winMenu")!.onclick = () => this._showMenu();
    this._dispose3D();
  }

  // ── Hint toast ─────────────────────────────────────────────────────────────

  private _showHint(msg: string): void {
    const hint = document.createElement("div");
    hint.style.cssText =
      "position:absolute;top:50%;left:50%;transform:translate(-50%,-100px);" +
      "background:rgba(0,0,0,0.75);color:white;font-size:16px;font-weight:bold;" +
      "padding:8px 20px;border-radius:10px;pointer-events:none;z-index:100;" +
      "font-family:Arial,sans-serif;animation:fadeUp 1.5s forwards;";
    hint.textContent = msg;
    this._hud.appendChild(hint);
    setTimeout(() => hint.remove(), 1500);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  private _dispose3D(): void {
    if (this._disposed) return;
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    for (const fn of this._cleanup) fn();
    this._cleanup = [];
    if (document.pointerLockElement) document.exitPointerLock();
    try { this._scene?.dispose(); } catch { /* ignore */ }
    try { this._engine?.dispose(); } catch { /* ignore */ }
  }

  private _exit(): void {
    this._dispose3D();
    this._showMenu();
  }

  private _exitToArcade(): void {
    this._dispose3D();
    this._game.inMiniGame = false;
    this._game.ui.innerHTML = "";
    import("../ArcadeScene").then(m => new m.ArcadeScene(this._game));
  }
}

// ── Button style helpers ───────────────────────────────────────────────────────

function _menuBtn(border: string, bg: string): string {
  return `flex:1;background:${bg};border:2px solid ${border};border-radius:12px;
    padding:12px 4px;cursor:pointer;color:white;font-size:13px;font-weight:bold;
    font-family:Arial,sans-serif;`;
}

function _menuBtn2(border: string, bg: string): string {
  return `flex:1;background:${bg};border:2px solid ${border};border-radius:12px;
    padding:12px 8px;cursor:pointer;color:white;font-size:14px;font-weight:bold;
    font-family:Arial,sans-serif;`;
}

function _menuBtn3(border: string, bg: string): string {
  return `background:${bg};border:2px solid ${border};border-radius:12px;
    padding:10px 10px;cursor:pointer;color:white;font-size:12px;font-weight:bold;
    font-family:Arial,sans-serif;`;
}
