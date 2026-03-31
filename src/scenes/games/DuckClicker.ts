/**
 * Duck Clicker — Click ducks, collect gems, grow turnips, get rich!
 */
import type { Game } from "../../game/Game";

const SAVE_KEY = "duckclicker_save";

interface DCsave {
  ducks: number;
  gems: number;
  gemstones: number;
  totalDucks: number;
  rebirths: number;
  rank: number;
  turnipPlanted: number | null; // timestamp when planted
  turnipReady: boolean;
  egg: boolean;
  upgrades: number[]; // how many of each upgrade bought
}

const RANKS = [
  { name: "Duckling",    need: 0 },
  { name: "Duck",        need: 1_000 },
  { name: "Super Duck",  need: 100_000 },
  { name: "Mega Duck",   need: 10_000_000 },
  { name: "Ultra Duck",  need: 1_000_000_000 },
  { name: "Golden Duck", need: 100_000_000_000 },
];

const UPGRADES = [
  { name: "Rubber Duck",    emoji: "🐤", desc: "+1 duck per click",    base: 10,        duckMult: 1   },
  { name: "Duck Pond",      emoji: "🏞️", desc: "+5 ducks per click",   base: 100,       duckMult: 5   },
  { name: "Duck Farm",      emoji: "🏡", desc: "+20 ducks per click",  base: 1_000,     duckMult: 20  },
  { name: "Duck Factory",   emoji: "🏭", desc: "+100 ducks per click", base: 50_000,    duckMult: 100 },
  { name: "Duck Galaxy",    emoji: "🌌", desc: "+1k ducks per click",  base: 5_000_000, duckMult: 1000},
];

const TURNIP_COST  = 5_000;   // gems
const TURNIP_TIME  = 60_000;  // 60 seconds to grow
const TURNIP_REWARDS = [
  { label: "10 Gemstones", apply: (s: DCsave) => { s.gemstones += 10; } },
  { label: "100k Ducks",   apply: (s: DCsave) => { s.ducks += 100_000; s.totalDucks += 100_000; } },
  { label: "1k Gems",      apply: (s: DCsave) => { s.gems += 1_000; } },
  { label: "Mystery Egg",  apply: (s: DCsave) => { s.egg = true; } },
];

function fmt(n: number): string {
  if (n >= 1e12) return (n/1e12).toFixed(1) + "T";
  if (n >= 1e9)  return (n/1e9).toFixed(1)  + "B";
  if (n >= 1e6)  return (n/1e6).toFixed(1)  + "M";
  if (n >= 1e3)  return (n/1e3).toFixed(1)  + "K";
  return Math.floor(n).toString();
}

function loadSave(): DCsave {
  try {
    const r = localStorage.getItem(SAVE_KEY);
    if (r) return { ...defaultSave(), ...JSON.parse(r) };
  } catch {}
  return defaultSave();
}
function defaultSave(): DCsave {
  return { ducks:0, gems:0, gemstones:0, totalDucks:0, rebirths:0, rank:0,
           turnipPlanted:null, turnipReady:false, egg:false, upgrades:UPGRADES.map(()=>0) };
}
function writeSave(s: DCsave) { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }

type Tab = "main" | "shop" | "garden" | "ranks" | "rebirth";

export class DuckClicker {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _save: DCsave;
  private _tab: Tab = "main";
  private _goldenDuck: { x:number; y:number; timer:number } | null = null;
  private _goldenTimer = 0;
  private _floaties: Array<{x:number;y:number;vy:number;text:string;life:number}> = [];
  private _flappyActive = false;
  private _flappy!: { y:number; vy:number; pipes:Array<{x:number;gap:number}>; score:number; alive:boolean };
  private _raf = 0;
  private _last = 0;
  private _t = 0;
  private _duckBounce = 0;
  private _mainDuckEl!: HTMLDivElement;
  private _statsEl!: HTMLDivElement;
  private _contentEl!: HTMLDivElement;
  private _flappyEl!: HTMLCanvasElement | null;

  constructor(g: Game) {
    this._g = g;
    this._save = loadSave();
    g.inMiniGame = true;
    g.ui.innerHTML = "";

    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;background:#1a0d00;pointer-events:all;"
      + "font-family:Arial,sans-serif;display:flex;flex-direction:column;";
    g.ui.appendChild(this._wrap);

    this._buildUI();
    this._last = performance.now();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  private _buildUI() {
    this._wrap.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:10px 16px;"
      + "background:rgba(0,0,0,0.4);border-bottom:1px solid rgba(255,200,0,0.2);flex-shrink:0;";
    header.innerHTML = `
      <button id="dcBack" style="background:rgba(255,255,255,0.1);color:white;border:1.5px solid
        rgba(255,255,255,0.25);border-radius:10px;padding:6px 14px;font-size:13px;cursor:pointer;">← Arcade</button>
      <div style="color:#ffcc00;font-size:18px;font-weight:bold;">🦆 Duck Clicker</div>
      <div id="dcRank" style="color:#ffaa00;font-size:13px;font-weight:bold;"></div>
    `;
    this._wrap.appendChild(header);
    document.getElementById("dcBack")!.onclick = () => this._exit();

    // Stats bar
    this._statsEl = document.createElement("div");
    this._statsEl.style.cssText =
      "display:flex;gap:16px;padding:8px 16px;background:rgba(0,0,0,0.3);"
      + "border-bottom:1px solid rgba(255,200,0,0.1);flex-shrink:0;flex-wrap:wrap;";
    this._wrap.appendChild(this._statsEl);

    // Tabs
    const tabs = document.createElement("div");
    tabs.style.cssText =
      "display:flex;gap:4px;padding:8px 12px;background:rgba(0,0,0,0.2);flex-shrink:0;";
    const tabDefs: {id:Tab;label:string}[] = [
      {id:"main",label:"🦆 Click"},{id:"shop",label:"🛒 Shop"},
      {id:"garden",label:"🌱 Garden"},{id:"ranks",label:"🏆 Ranks"},{id:"rebirth",label:"♻️ Rebirth"},
    ];
    for (const td of tabDefs) {
      const btn = document.createElement("button");
      btn.textContent = td.label;
      btn.style.cssText =
        "background:rgba(255,200,0,0.15);color:white;border:1.5px solid rgba(255,200,0,0.3);"
        + "border-radius:10px;padding:7px 14px;font-size:13px;cursor:pointer;";
      btn.onclick = () => { this._tab = td.id; this._renderContent(); };
      tabs.appendChild(btn);
    }
    this._wrap.appendChild(tabs);

    // Content area
    this._contentEl = document.createElement("div");
    this._contentEl.style.cssText =
      "flex:1;overflow-y:auto;position:relative;";
    this._wrap.appendChild(this._contentEl);

    this._renderContent();
    this._updateStats();
  }

  private _renderContent() {
    this._contentEl.innerHTML = "";
    if (this._tab === "main")    this._renderMain();
    else if (this._tab === "shop")   this._renderShop();
    else if (this._tab === "garden") this._renderGarden();
    else if (this._tab === "ranks")  this._renderRanks();
    else if (this._tab === "rebirth")this._renderRebirth();
  }

  private _renderMain() {
    const s = this._save;
    const el = document.createElement("div");
    el.style.cssText =
      "display:flex;flex-direction:column;align-items:center;padding:20px;gap:16px;";

    // Big duck button
    const duckBtn = document.createElement("div");
    duckBtn.id = "mainDuck";
    duckBtn.style.cssText =
      "font-size:100px;cursor:pointer;user-select:none;transition:transform 0.05s;"
      + "filter:drop-shadow(0 0 20px rgba(255,200,0,0.6));";
    duckBtn.textContent = "🦆";
    duckBtn.onclick = () => this._clickDuck();
    el.appendChild(duckBtn);
    this._mainDuckEl = duckBtn;

    // Click power info
    const power = document.createElement("div");
    power.style.cssText = "color:rgba(255,255,255,0.6);font-size:14px;";
    power.textContent = `+${fmt(this._clickPower())} ducks per click`;
    el.appendChild(power);

    // Egg display
    if (s.egg) {
      const egg = document.createElement("div");
      egg.style.cssText =
        "font-size:48px;opacity:0.7;filter:grayscale(0.5);"
        + "title='This egg cannot be clicked... yet'";
      egg.textContent = "🥚";
      egg.title = "This egg cannot be clicked... yet";
      el.appendChild(egg);
    }

    // Golden duck area (rendered on canvas overlay)
    this._contentEl.appendChild(el);
  }

  private _renderShop() {
    const s = this._save;
    const el = document.createElement("div");
    el.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:10px;";

    el.innerHTML = `<div style="color:#ffcc00;font-size:18px;font-weight:bold;margin-bottom:4px;">🛒 Shop</div>`;

    for (let i = 0; i < UPGRADES.length; i++) {
      const u = UPGRADES[i];
      const owned = s.upgrades[i];
      const cost = Math.floor(u.base * Math.pow(1.5, owned));
      const canAfford = s.ducks >= cost;

      const btn = document.createElement("button");
      btn.style.cssText =
        `display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;cursor:pointer;`
        + `text-align:left;width:100%;border:1.5px solid ${canAfford?"rgba(255,200,0,0.5)":"rgba(255,255,255,0.1)"};`
        + `background:${canAfford?"rgba(255,200,0,0.1)":"rgba(255,255,255,0.04)"};`
        + `color:white;`;
      btn.innerHTML = `
        <div style="font-size:36px;flex-shrink:0;">${u.emoji}</div>
        <div style="flex:1;">
          <div style="font-weight:bold;font-size:15px;">${u.name} <span style="color:#aaa;font-size:12px;">(owned: ${owned})</span></div>
          <div style="color:rgba(255,255,255,0.55);font-size:13px;">${u.desc}</div>
          <div style="color:#ffcc00;font-size:13px;margin-top:2px;">🦆 ${fmt(cost)} ducks</div>
        </div>
      `;
      btn.onclick = () => {
        if (s.ducks >= cost) {
          s.ducks -= cost;
          s.upgrades[i]++;
          writeSave(s);
          this._renderContent();
          this._updateStats();
        }
      };
      el.appendChild(btn);
    }

    this._contentEl.appendChild(el);
  }

  private _renderGarden() {
    const s = this._save;
    const el = document.createElement("div");
    el.style.cssText = "padding:16px;display:flex;flex-direction:column;align-items:center;gap:16px;";

    el.innerHTML = `<div style="color:#44ff88;font-size:18px;font-weight:bold;">🌱 Garden</div>`;

    const now = Date.now();
    const planted = s.turnipPlanted;
    const ready = planted !== null && (now - planted) >= TURNIP_TIME;

    if (s.turnipReady || ready) {
      // Harvest!
      if (ready && !s.turnipReady) { s.turnipReady = true; writeSave(s); }
      const harvestDiv = document.createElement("div");
      harvestDiv.style.cssText = "text-align:center;";
      harvestDiv.innerHTML = `
        <div style="font-size:72px;margin-bottom:8px;">🌿</div>
        <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Turnip is ready!</div>
        <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:16px;">Click to harvest and get a reward!</div>
      `;
      const harvestBtn = document.createElement("button");
      harvestBtn.textContent = "🌿 Harvest!";
      harvestBtn.style.cssText =
        "background:linear-gradient(135deg,#22aa44,#44cc66);color:white;border:none;"
        + "border-radius:14px;padding:16px 36px;font-size:18px;cursor:pointer;font-weight:bold;";
      harvestBtn.onclick = () => {
        const reward = TURNIP_REWARDS[Math.floor(Math.random() * TURNIP_REWARDS.length)];
        reward.apply(s);
        s.turnipPlanted = null;
        s.turnipReady = false;
        writeSave(s);
        this._renderContent();
        this._updateStats();
        this._showRewardPopup(reward.label);
      };
      harvestDiv.appendChild(harvestBtn);
      el.appendChild(harvestDiv);

    } else if (planted !== null) {
      // Growing
      const elapsed = now - planted;
      const pct = Math.min(elapsed / TURNIP_TIME, 1);
      const secsLeft = Math.ceil((TURNIP_TIME - elapsed) / 1000);
      const growDiv = document.createElement("div");
      growDiv.style.cssText = "text-align:center;width:100%;max-width:300px;";
      growDiv.innerHTML = `
        <div style="font-size:64px;margin-bottom:8px;">${pct > 0.5 ? "🌿" : "🌱"}</div>
        <div style="color:white;font-size:16px;margin-bottom:8px;">Turnip is growing...</div>
        <div style="color:#44ff88;font-size:14px;margin-bottom:12px;">${secsLeft}s left</div>
        <div style="background:rgba(255,255,255,0.1);border-radius:20px;height:16px;overflow:hidden;">
          <div style="background:linear-gradient(90deg,#22aa44,#88ff88);height:100%;width:${pct*100}%;border-radius:20px;transition:width 1s;"></div>
        </div>
      `;
      el.appendChild(growDiv);

    } else {
      // Plant
      const plantDiv = document.createElement("div");
      plantDiv.style.cssText = "text-align:center;";
      plantDiv.innerHTML = `
        <div style="font-size:72px;margin-bottom:12px;">🌱</div>
        <div style="color:white;font-size:16px;font-weight:bold;margin-bottom:4px;">Silly Turnip Seed</div>
        <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:6px;">Takes 60 seconds to grow</div>
        <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:16px;">
          Possible rewards: 10 gemstones • 100k ducks • 1k gems • Mystery Egg 🥚
        </div>
      `;
      const canPlant = s.gems >= TURNIP_COST;
      const plantBtn = document.createElement("button");
      plantBtn.textContent = `💎 Plant for ${fmt(TURNIP_COST)} gems`;
      plantBtn.style.cssText =
        `background:${canPlant?"linear-gradient(135deg,#1166aa,#2288cc)":"rgba(255,255,255,0.08)"};`
        + `color:${canPlant?"white":"rgba(255,255,255,0.3)"};border:none;border-radius:14px;`
        + `padding:14px 28px;font-size:16px;cursor:${canPlant?"pointer":"default"};font-weight:bold;`;
      plantBtn.onclick = () => {
        if (s.gems >= TURNIP_COST) {
          s.gems -= TURNIP_COST;
          s.turnipPlanted = Date.now();
          s.turnipReady = false;
          writeSave(s);
          this._renderContent();
          this._updateStats();
        }
      };
      plantDiv.appendChild(plantBtn);
      if (!canPlant) {
        const need = document.createElement("div");
        need.style.cssText = "color:rgba(255,100,100,0.7);font-size:12px;margin-top:8px;";
        need.textContent = `Need ${fmt(TURNIP_COST - s.gems)} more gems`;
        plantDiv.appendChild(need);
      }
      el.appendChild(plantDiv);
    }

    this._contentEl.appendChild(el);
  }

  private _renderRanks() {
    const s = this._save;
    const el = document.createElement("div");
    el.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:10px;";
    el.innerHTML = `<div style="color:#ffcc00;font-size:18px;font-weight:bold;margin-bottom:4px;">🏆 Ranks</div>`;

    for (let i = 0; i < RANKS.length; i++) {
      const r = RANKS[i];
      const unlocked = s.totalDucks >= r.need;
      const isCurrent = i === this._currentRank();
      const div = document.createElement("div");
      div.style.cssText =
        `display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:12px;`
        + `background:${isCurrent?"rgba(255,200,0,0.15)":unlocked?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.2)"};`
        + `border:1.5px solid ${isCurrent?"rgba(255,200,0,0.6)":unlocked?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.05)"};`;
      div.innerHTML = `
        <div style="font-size:28px;">${unlocked?"🏅":"🔒"}</div>
        <div>
          <div style="color:${unlocked?"white":"rgba(255,255,255,0.3)"};font-weight:bold;">${r.name}${isCurrent?" ← YOU":""}
          </div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;">Need ${fmt(r.need)} total ducks</div>
        </div>
      `;
      el.appendChild(div);
    }

    this._contentEl.appendChild(el);
  }

  private _renderRebirth() {
    const s = this._save;
    const el = document.createElement("div");
    el.style.cssText = "padding:16px;display:flex;flex-direction:column;align-items:center;gap:16px;";

    const rebirthCost = 1_000_000 * Math.pow(10, s.rebirths);
    const canRebirth = s.totalDucks >= rebirthCost;

    el.innerHTML = `
      <div style="color:#ff88ff;font-size:18px;font-weight:bold;">♻️ Rebirth</div>
      <div style="text-align:center;color:rgba(255,255,255,0.6);font-size:14px;max-width:300px;">
        Reset your ducks and upgrades, but keep your gemstones and gain a permanent <b style="color:#ffcc00">+50% click bonus</b>!
      </div>
      <div style="font-size:48px;">🔄</div>
      <div style="color:white;font-size:15px;">Rebirths done: <b style="color:#ff88ff">${s.rebirths}</b></div>
      <div style="color:#ffcc00;font-size:14px;">Bonus: +${s.rebirths*50}% click power</div>
      <div style="color:rgba(255,255,255,0.5);font-size:13px;">Cost: ${fmt(rebirthCost)} total ducks</div>
    `;

    const rebirthBtn = document.createElement("button");
    rebirthBtn.textContent = "♻️ Rebirth!";
    rebirthBtn.style.cssText =
      `background:${canRebirth?"linear-gradient(135deg,#aa22cc,#cc44ff)":"rgba(255,255,255,0.08)"};`
      + `color:${canRebirth?"white":"rgba(255,255,255,0.3)"};border:none;border-radius:14px;`
      + `padding:16px 36px;font-size:18px;cursor:${canRebirth?"pointer":"default"};font-weight:bold;`;
    rebirthBtn.onclick = () => {
      if (!canRebirth) return;
      if (!confirm("Rebirth? You'll lose your ducks and upgrades but keep gemstones!")) return;
      s.ducks = 0;
      s.gems = 0;
      s.totalDucks = 0;
      s.upgrades = UPGRADES.map(() => 0);
      s.rebirths++;
      writeSave(s);
      this._renderContent();
      this._updateStats();
    };
    el.appendChild(rebirthBtn);
    this._contentEl.appendChild(el);
  }

  private _showRewardPopup(label: string) {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"
      + "background:rgba(0,0,0,0.75);z-index:50;";
    overlay.innerHTML = `
      <div style="background:#111;border-radius:20px;padding:36px 48px;text-align:center;
        color:white;border:2px solid rgba(255,200,0,0.5);">
        <div style="font-size:52px;margin-bottom:8px;">🎉</div>
        <div style="font-size:22px;font-weight:bold;margin-bottom:4px;">Reward!</div>
        <div style="font-size:18px;color:#ffcc00;margin-bottom:20px;">${label}</div>
        <button id="rwClose" style="background:rgba(255,200,0,0.2);color:white;border:1.5px solid
          rgba(255,200,0,0.4);border-radius:12px;padding:10px 24px;font-size:14px;cursor:pointer;">OK!</button>
      </div>
    `;
    this._contentEl.appendChild(overlay);
    document.getElementById("rwClose")!.onclick = () => overlay.remove();
  }

  private _updateStats() {
    const s = this._save;
    const rank = RANKS[this._currentRank()];
    const rankEl = document.getElementById("dcRank");
    if (rankEl) rankEl.textContent = rank.name;

    this._statsEl.innerHTML = `
      <div style="color:#ffcc00;font-size:13px;">🦆 <b>${fmt(s.ducks)}</b> ducks</div>
      <div style="color:#44aaff;font-size:13px;">💎 <b>${fmt(s.gems)}</b> gems</div>
      <div style="color:#ff88ff;font-size:13px;">💠 <b>${fmt(s.gemstones)}</b> gemstones</div>
      <div style="color:rgba(255,255,255,0.4);font-size:12px;">Total: ${fmt(s.totalDucks)}</div>
      ${s.egg ? '<div style="font-size:13px;">🥚 Egg</div>' : ""}
    `;
  }

  // ── Gameplay ───────────────────────────────────────────────────────────────

  private _clickPower(): number {
    const s = this._save;
    let power = 1;
    for (let i = 0; i < UPGRADES.length; i++) {
      power += UPGRADES[i].duckMult * s.upgrades[i];
    }
    // Rebirth bonus
    power = Math.floor(power * (1 + s.rebirths * 0.5));
    return power;
  }

  private _currentRank(): number {
    const s = this._save;
    let rank = 0;
    for (let i = 0; i < RANKS.length; i++) {
      if (s.totalDucks >= RANKS[i].need) rank = i;
    }
    return rank;
  }

  private _clickDuck() {
    const power = this._clickPower();
    this._save.ducks += power;
    this._save.totalDucks += power;
    // Gems: 1 gem per 100 ducks clicked
    if (Math.random() < 0.05) this._save.gems++;
    writeSave(this._save);
    this._updateStats();

    // Bounce animation
    this._duckBounce = 0.15;
    if (this._mainDuckEl) {
      this._mainDuckEl.style.transform = "scale(0.88)";
      setTimeout(() => { if (this._mainDuckEl) this._mainDuckEl.style.transform = "scale(1)"; }, 80);
    }

    // Floatie
    const rect = this._mainDuckEl?.getBoundingClientRect();
    if (rect) {
      this._floaties.push({
        x: rect.left + rect.width/2 + (Math.random()-0.5)*40 - this._wrap.getBoundingClientRect().left,
        y: rect.top - 10 - this._wrap.getBoundingClientRect().top,
        vy: -80,
        text: `+${fmt(power)} 🦆`,
        life: 1,
      });
    }

    // Golden duck chance
    if (!this._goldenDuck && Math.random() < 0.008) {
      this._spawnGoldenDuck();
    }

    // Update shop colors if on shop tab
    if (this._tab === "shop") this._renderContent();
  }

  private _spawnGoldenDuck() {
    const w = this._wrap.clientWidth;
    const h = this._wrap.clientHeight;
    this._goldenDuck = {
      x: 60 + Math.random() * (w - 120),
      y: 120 + Math.random() * (h - 200),
      timer: 8,
    };

    const gdEl = document.createElement("div");
    gdEl.id = "goldenDuck";
    gdEl.style.cssText =
      `position:absolute;font-size:52px;cursor:pointer;user-select:none;z-index:30;`
      + `filter:drop-shadow(0 0 16px gold);animation:wobble 0.5s infinite alternate;`
      + `left:${this._goldenDuck.x}px;top:${this._goldenDuck.y}px;transform:translate(-50%,-50%);`;
    gdEl.textContent = "✨🦆✨";
    gdEl.onclick = () => {
      this._goldenDuck = null;
      gdEl.remove();
      this._startFlappy();
    };
    this._wrap.appendChild(gdEl);
  }

  private _startFlappy() {
    this._flappyActive = true;
    const w = Math.min(this._wrap.clientWidth, 400);
    const h = 300;

    this._flappy = {
      y: h / 2, vy: 0,
      pipes: [{ x: w + 50, gap: 80 + Math.random() * 80 }],
      score: 0, alive: true,
    };

    const overlay = document.createElement("div");
    overlay.id = "flappyOverlay";
    overlay.style.cssText =
      "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;"
      + "justify-content:center;background:rgba(0,0,0,0.85);z-index:40;";

    const title = document.createElement("div");
    title.style.cssText = "color:#ffcc00;font-size:20px;font-weight:bold;margin-bottom:8px;";
    title.textContent = "✨ Golden Duck Mini-Game! ✨";
    overlay.appendChild(title);

    const hint = document.createElement("div");
    hint.style.cssText = "color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:8px;";
    hint.textContent = "Tap / Space / Click to flap!";
    overlay.appendChild(hint);

    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    cv.style.cssText = `border-radius:12px;border:2px solid rgba(255,200,0,0.4);cursor:pointer;`;
    overlay.appendChild(cv);
    this._flappyEl = cv;

    const scoreEl = document.createElement("div");
    scoreEl.id = "flappyScore";
    scoreEl.style.cssText = "color:white;font-size:16px;margin-top:8px;";
    overlay.appendChild(scoreEl);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close";
    closeBtn.style.cssText =
      "margin-top:12px;background:rgba(255,255,255,0.1);color:white;"
      + "border:1.5px solid rgba(255,255,255,0.2);border-radius:10px;"
      + "padding:8px 20px;font-size:13px;cursor:pointer;";
    closeBtn.onclick = () => { this._endFlappy(overlay); };
    overlay.appendChild(closeBtn);

    const flap = () => {
      if (this._flappy && this._flappy.alive) this._flappy.vy = -220;
    };
    cv.onclick = flap;
    overlay.addEventListener("keydown", (e) => { if (e.code==="Space") flap(); });

    window.addEventListener("keydown", (e) => {
      if (e.code==="Space"&&this._flappyActive) { flap(); e.preventDefault(); }
    }, { once: false });

    this._wrap.appendChild(overlay);
    this._flappyLoop(cv.getContext("2d")!, w, h, overlay, scoreEl);
  }

  private _flappyLoop(
    ctx: CanvasRenderingContext2D, w: number, h: number,
    overlay: HTMLElement, scoreEl: HTMLElement
  ) {
    if (!this._flappyActive || !this._flappy) return;
    const f = this._flappy;
    const dt = 0.016;
    const PIPE_SPEED = 120;
    const PIPE_W = 40;
    const PIPE_GAP = f.pipes[0]?.gap ?? 120;

    f.vy += 400 * dt;
    f.y  += f.vy * dt;

    // Pipes
    for (const p of f.pipes) p.x -= PIPE_SPEED * dt;
    if (f.pipes[f.pipes.length-1].x < w - 200) {
      f.pipes.push({ x: w + PIPE_W, gap: 80 + Math.random() * 100 });
    }
    f.pipes = f.pipes.filter(p => p.x > -PIPE_W - 10);

    // Score & collision
    for (const p of f.pipes) {
      if (Math.abs(p.x - 60) < 5) f.score++;
      const gapTop = h * 0.2 + p.gap;
      const gapBot = gapTop + 120;
      if (60 > p.x && 60 < p.x + PIPE_W) {
        if (f.y < gapTop + 10 || f.y > gapBot - 10) f.alive = false;
      }
    }
    if (f.y < 10 || f.y > h - 10) f.alive = false;

    // Draw
    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0,0,w,h);
    // Pipes
    ctx.fillStyle = "#228833";
    for (const p of f.pipes) {
      const gapTop = h * 0.2 + p.gap;
      const gapBot = gapTop + 120;
      ctx.fillRect(p.x, 0, PIPE_W, gapTop);
      ctx.fillRect(p.x, gapBot, PIPE_W, h - gapBot);
    }
    // Duck
    ctx.font = "28px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🦆", 60, f.y);
    scoreEl.textContent = `Score: ${f.score} 🦆`;

    if (!f.alive) {
      // Game over — award gems based on score
      const earned = Math.max(1, f.score * 5);
      this._save.gems += earned;
      writeSave(this._save);
      this._updateStats();
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle = "white"; ctx.font = "bold 24px Arial";
      ctx.fillText("Game Over!", w/2, h/2-20);
      ctx.font = "16px Arial";
      ctx.fillText(`+${earned} 💎 gems earned!`, w/2, h/2+16);
      setTimeout(() => this._endFlappy(overlay), 2000);
      return;
    }

    requestAnimationFrame(() => this._flappyLoop(ctx, w, h, overlay, scoreEl));
  }

  private _endFlappy(overlay: HTMLElement) {
    this._flappyActive = false;
    this._flappyEl = null;
    overlay.remove();
  }

  // ── Main loop ──────────────────────────────────────────────────────────────

  private _loop(now: number) {
    if (this._g.inMiniGame === false) return; // exited
    const dt = Math.min((now - this._last) / 1000, 0.1);
    this._last = now; this._t += dt;

    // Golden duck timer
    if (this._goldenDuck) {
      this._goldenDuck.timer -= dt;
      if (this._goldenDuck.timer <= 0) {
        this._goldenDuck = null;
        document.getElementById("goldenDuck")?.remove();
      }
    }

    // Floaties
    this._updateFloaties(dt);

    // Garden auto-check
    if (this._tab === "garden" && Math.floor(this._t * 2) % 2 === 0) {
      const s = this._save;
      if (s.turnipPlanted !== null && !s.turnipReady) {
        if (Date.now() - s.turnipPlanted >= TURNIP_TIME) {
          s.turnipReady = true;
          writeSave(s);
          this._renderContent();
        }
      }
    }

    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  private _updateFloaties(dt: number) {
    for (let i = this._floaties.length - 1; i >= 0; i--) {
      const f = this._floaties[i];
      f.y += f.vy * dt;
      f.life -= dt * 1.5;
      if (f.life <= 0) {
        this._floaties.splice(i, 1);
        const el = document.getElementById(`floatie-${i}`);
        el?.remove();
        continue;
      }
      // Update or create element
      let el = document.getElementById(`floatie-${i}`) as HTMLDivElement | null;
      if (!el) {
        el = document.createElement("div");
        el.id = `floatie-${i}`;
        el.style.cssText =
          "position:absolute;pointer-events:none;font-size:14px;font-weight:bold;"
          + "color:#ffcc00;text-shadow:0 1px 3px rgba(0,0,0,0.8);z-index:20;white-space:nowrap;";
        el.textContent = f.text;
        this._contentEl.appendChild(el);
      }
      el.style.left = f.x + "px";
      el.style.top  = f.y + "px";
      el.style.opacity = String(f.life);
    }
  }

  private _exit() {
    cancelAnimationFrame(this._raf);
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}
