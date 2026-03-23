import type { Game } from "../game/Game";

interface GameEntry {
  emoji: string;
  name: string;
  launch: (game: Game) => void;
}

interface Version {
  tag: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  games: GameEntry[];
}

const VERSIONS: Version[] = [
  {
    tag: "v0.1", name: "The Very Beginning", emoji: "🌱", color: "#27ae60",
    desc: "Just the engine — no games yet!",
    games: [],
  },
  {
    tag: "v0.2", name: "First Mini-Games", emoji: "🎮", color: "#2980b9",
    desc: "The very first games ever added.",
    games: [
      { emoji:"🚗", name:"Coin Jump",      launch: g => import("./games/CoinJump").then(m => { g.ui.innerHTML=""; new m.CoinJump(g); }) },
      { emoji:"🍉", name:"Fruit Slice",    launch: g => import("./games/FruitSlice").then(m => { g.ui.innerHTML=""; new m.FruitSlice(g); }) },
      { emoji:"🍪", name:"Cookie Clicker", launch: g => import("./games/CookieClicker").then(m => { g.ui.innerHTML=""; new m.CookieClicker(g); }) },
      { emoji:"🪙", name:"Coin Rain",      launch: g => import("./games/CoinRain").then(m => { g.ui.innerHTML=""; new m.CoinRain(g); }) },
    ],
  },
  {
    tag: "v0.3", name: "Art & Drawing", emoji: "🎨", color: "#8e44ad",
    desc: "Get creative!",
    games: [
      { emoji:"🎨", name:"Just Draw",     launch: g => import("./games/JustDraw").then(m => { g.ui.innerHTML=""; new m.JustDraw(g); }) },
      { emoji:"🖌️", name:"Item Creator",  launch: g => import("./games/ItemCreator").then(m => { g.ui.innerHTML=""; new m.ItemCreator(g); }) },
    ],
  },
  {
    tag: "v0.4", name: "The Roblox Era", emoji: "🔨", color: "#e67e22",
    desc: "Build levels and play them!",
    games: [
      { emoji:"🔨", name:"Roblox Studio", launch: g => import("./games/RobloxStudio").then(m => { g.ui.innerHTML=""; new m.RobloxStudio(g); }) },
      { emoji:"🎮", name:"Roblox Games",  launch: g => import("./games/RobloxGames").then(m => { g.ui.innerHTML=""; new m.RobloxGames(g); }) },
    ],
  },
  {
    tag: "v0.5", name: "Big Adventures", emoji: "⛏️", color: "#16a085",
    desc: "Huge new games arrived!",
    games: [
      { emoji:"⛏️", name:"Minecraft",       launch: g => import("./games/MinecraftGame").then(m => new m.MinecraftGame(g)) },
      { emoji:"🟡", name:"Geometry Dash",   launch: g => import("./games/GeometryDash").then(m => new m.GeometryDash(g)) },
      { emoji:"🐦", name:"Garten of Banban",launch: g => import("./games/GardenBanban").then(m => { g.ui.innerHTML=""; new m.GardenBanban(g); }) },
      { emoji:"🍅", name:"Mr. Tomato",      launch: g => import("./games/MrTomato").then(m => { g.ui.innerHTML=""; new m.MrTomato(g); }) },
      { emoji:"👨‍🦲", name:"Boldy",          launch: g => import("./games/Boldy").then(m => { g.ui.innerHTML=""; new m.Boldy(g); }) },
    ],
  },
  {
    tag: "v0.6", name: "Night & Fire", emoji: "🌲", color: "#2c3e50",
    desc: "Survival and action games.",
    games: [
      { emoji:"🌲", name:"99 Nights",    launch: g => import("./games/NightForestLobby").then(m => { g.ui.innerHTML=""; new m.NightForestLobby(g); }) },
      { emoji:"🧑‍🚒", name:"Fire Fighter", launch: g => import("./games/FireFighter").then(m => { g.ui.innerHTML=""; new m.FireFighter(g); }) },
    ],
  },
  {
    tag: "v0.7", name: "Online Play", emoji: "♟️", color: "#7f8c8d",
    desc: "Play against real people!",
    games: [
      { emoji:"♟️", name:"Chess", launch: g => import("./games/Chess").then(m => { g.ui.innerHTML=""; new m.Chess(g); }) },
    ],
  },
  {
    tag: "v0.8", name: "Duck Life", emoji: "🦆", color: "#3498db",
    desc: "Train your duck and race!",
    games: [
      { emoji:"🦆", name:"Duck Life", launch: g => import("./games/DuckLife").then(m => new m.DuckLife(g)) },
    ],
  },
  {
    tag: "v0.9", name: "Knight's Quest", emoji: "⚔️", color: "#f39c12",
    desc: "An epic adventure awaits…",
    games: [
      { emoji:"⚔️", name:"Knight's Quest", launch: g => import("./games/KnightsQuest").then(m => { g.ui.innerHTML=""; new m.KnightsQuest(g); }) },
    ],
  },
];

export class VersionHistory {
  private _game: Game;

  constructor(game: Game) {
    this._game = game;
    this._showTimeline();
  }

  private _showTimeline(): void {
    const game = this._game;
    const ui = game.ui;
    ui.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(160deg,#0a0020,#0a0a30,#000a20);" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;pointer-events:all;overflow:hidden;";

    // Header
    wrap.innerHTML = `
      <div style="flex-shrink:0;padding:16px 20px 12px;display:flex;align-items:center;gap:12px;
        border-bottom:1px solid rgba(255,255,255,0.08);">
        <button id="vhBack" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);
          color:rgba(255,255,255,0.8);font-size:14px;padding:7px 14px;border-radius:10px;cursor:pointer;">← Back</button>
        <div style="flex:1;text-align:center;">
          <div style="color:white;font-size:20px;font-weight:900;letter-spacing:2px;">⏳ VERSION HISTORY</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:2px;">Tap a version to play its games</div>
        </div>
        <div style="width:80px;"></div>
      </div>
    `;

    const scroll = document.createElement("div");
    scroll.style.cssText = "flex:1;overflow-y:auto;padding:20px 16px 40px;";

    const reversed = [...VERSIONS].reverse();
    for (const v of reversed) {
      const isLatest = v === VERSIONS[VERSIONS.length - 1];

      const card = document.createElement("div");
      card.style.cssText =
        `background:rgba(255,255,255,0.04);border:1.5px solid ${isLatest ? v.color : "rgba(255,255,255,0.1)"};` +
        `border-radius:16px;padding:16px;margin-bottom:14px;cursor:${v.games.length ? "pointer" : "default"};` +
        (isLatest ? `box-shadow:0 0 14px ${v.color}44;` : "");

      // Title row
      const titleRow = document.createElement("div");
      titleRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";
      titleRow.innerHTML =
        `<span style="font-size:22px;">${v.emoji}</span>` +
        `<span style="background:${v.color};color:white;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:20px;">${v.tag}</span>` +
        `<span style="color:white;font-size:15px;font-weight:bold;">${v.name}</span>` +
        (isLatest ? `<span style="background:#e74c3c;color:white;font-size:10px;font-weight:bold;padding:2px 8px;border-radius:20px;margin-left:auto;">LATEST</span>` : "");
      card.appendChild(titleRow);

      // Desc
      const desc = document.createElement("div");
      desc.style.cssText = "color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:10px;";
      desc.textContent = v.desc;
      card.appendChild(desc);

      if (v.games.length === 0) {
        const none = document.createElement("div");
        none.style.cssText = "color:rgba(255,255,255,0.2);font-size:12px;font-style:italic;";
        none.textContent = "No games yet — just the engine!";
        card.appendChild(none);
      } else {
        // Game buttons
        const grid = document.createElement("div");
        grid.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";
        for (const g of v.games) {
          const btn = document.createElement("button");
          btn.style.cssText =
            `background:${v.color}22;border:1.5px solid ${v.color}88;color:white;` +
            `border-radius:10px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:bold;` +
            `display:flex;align-items:center;gap:6px;`;
          btn.innerHTML = `<span>${g.emoji}</span><span>${g.name}</span><span style="color:${v.color};font-size:11px;">▶ Play</span>`;
          btn.onclick = (e) => { e.stopPropagation(); g.launch(game); };
          grid.appendChild(btn);
        }
        card.appendChild(grid);
      }

      scroll.appendChild(card);
    }

    wrap.appendChild(scroll);
    ui.appendChild(wrap);

    document.getElementById("vhBack")!.onclick = () => {
      ui.innerHTML = "";
      game.goTitle();
    };
  }
}
