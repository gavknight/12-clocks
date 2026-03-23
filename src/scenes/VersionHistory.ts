import type { Game } from "../game/Game";

interface GameEntry {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  color: string;
  border: string;
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

const ALL_GAMES: GameEntry[] = [
  { id:"coinJump",    emoji:"🚗", name:"Coin Jump",        desc:"Tap to jump and grab coins!",                  color:"rgba(30,60,10,0.8)",   border:"rgba(100,220,50,0.5)",   launch: g => import("./games/CoinJump").then(m=>{g.ui.innerHTML="";new m.CoinJump(g);}) },
  { id:"fruitSlice",  emoji:"🍉", name:"Fruit Slice",       desc:"Slice fruits before they fall!",               color:"rgba(60,10,30,0.8)",   border:"rgba(255,100,180,0.5)",  launch: g => import("./games/FruitSlice").then(m=>{g.ui.innerHTML="";new m.FruitSlice(g);}) },
  { id:"cookie",      emoji:"🍪", name:"Cookie Clicker",    desc:"Click cookies, buy buildings!",                color:"rgba(80,30,0,0.8)",    border:"rgba(255,160,0,0.5)",    launch: g => import("./games/CookieClicker").then(m=>{g.ui.innerHTML="";new m.CookieClicker(g);}) },
  { id:"coinRain",    emoji:"🪙", name:"Coin Rain",          desc:"Click falling coins!",                         color:"rgba(0,10,50,0.8)",    border:"rgba(100,180,255,0.5)",  launch: g => import("./games/CoinRain").then(m=>{g.ui.innerHTML="";new m.CoinRain(g);}) },
  { id:"justDraw",    emoji:"🎨", name:"Just Draw",          desc:"Draw the word in time!",                       color:"rgba(10,30,60,0.9)",   border:"rgba(100,160,255,0.5)",  launch: g => import("./games/JustDraw").then(m=>{g.ui.innerHTML="";new m.JustDraw(g);}) },
  { id:"itemCreator", emoji:"🖌️", name:"Item Creator",       desc:"Draw your own block!",                         color:"rgba(0,30,60,0.9)",    border:"rgba(100,180,255,0.5)",  launch: g => import("./games/ItemCreator").then(m=>{g.ui.innerHTML="";new m.ItemCreator(g);}) },
  { id:"robloxStudio",emoji:"🔨", name:"Roblox Studio",      desc:"Build your own level!",                        color:"rgba(20,0,40,0.9)",    border:"rgba(180,100,255,0.6)",  launch: g => import("./games/RobloxStudio").then(m=>{g.ui.innerHTML="";new m.RobloxStudio(g);}) },
  { id:"robloxGames", emoji:"🎮", name:"Roblox Games",       desc:"Play community levels!",                       color:"rgba(10,50,10,0.9)",   border:"rgba(0,200,0,0.5)",      launch: g => import("./games/RobloxGames").then(m=>{g.ui.innerHTML="";new m.RobloxGames(g);}) },
  { id:"minecraft",   emoji:"⛏️", name:"Minecraft",          desc:"Mine blocks, build stuff!",                    color:"rgba(10,60,10,0.9)",   border:"rgba(80,200,80,0.6)",    launch: g => import("./games/MinecraftGame").then(m=>new m.MinecraftGame(g)) },
  { id:"geomDash",    emoji:"🟡", name:"Geometry Dash",      desc:"Jump, fly and flip!",                          color:"rgba(60,20,0,0.9)",    border:"rgba(255,140,0,0.6)",    launch: g => import("./games/GeometryDash").then(m=>new m.GeometryDash(g)) },
  { id:"banban",      emoji:"🐦", name:"Garten of Banban",   desc:"Survive the kindergarten!",                    color:"rgba(80,0,100,0.9)",   border:"rgba(255,100,220,0.6)",  launch: g => import("./games/GardenBanban").then(m=>{g.ui.innerHTML="";new m.GardenBanban(g);}) },
  { id:"mrTomato",    emoji:"🍅", name:"Mr. Tomato",          desc:"Feed him or else...",                          color:"rgba(80,0,0,0.9)",     border:"rgba(255,60,60,0.6)",    launch: g => import("./games/MrTomato").then(m=>{g.ui.innerHTML="";new m.MrTomato(g);}) },
  { id:"boldy",       emoji:"👨‍🦲", name:"Boldy",              desc:"Answer 5 questions!",                          color:"rgba(20,60,100,0.9)",  border:"rgba(80,160,255,0.6)",   launch: g => import("./games/Boldy").then(m=>{g.ui.innerHTML="";new m.Boldy(g);}) },
  { id:"nightForest", emoji:"🌲", name:"99 Nights",           desc:"Survive the dark!",                            color:"rgba(0,10,0,0.9)",     border:"rgba(50,180,50,0.4)",    launch: g => import("./games/NightForestLobby").then(m=>{g.ui.innerHTML="";new m.NightForestLobby(g);}) },
  { id:"fireFighter", emoji:"🧑‍🚒", name:"Fire Fighter",        desc:"Put out 8,000 fires!",                         color:"rgba(60,10,0,0.9)",    border:"rgba(255,100,0,0.6)",    launch: g => import("./games/FireFighter").then(m=>{g.ui.innerHTML="";new m.FireFighter(g);}) },
  { id:"chess",       emoji:"♟️", name:"Chess",               desc:"Play online or vs bots!",                      color:"rgba(10,10,10,0.9)",   border:"rgba(200,200,200,0.6)",  launch: g => import("./games/Chess").then(m=>{g.ui.innerHTML="";new m.Chess(g);}) },
  { id:"duckLife",    emoji:"🦆", name:"Duck Life",           desc:"Train and race your duck!",                    color:"rgba(10,60,80,0.9)",   border:"rgba(100,200,255,0.6)",  launch: g => import("./games/DuckLife").then(m=>new m.DuckLife(g)) },
  { id:"knightsQuest",emoji:"⚔️", name:"Knight's Quest",      desc:"Fight enemies, conquer maps!",                 color:"rgba(80,40,0,0.9)",    border:"rgba(255,180,0,0.6)",    launch: g => import("./games/KnightsQuest").then(m=>{g.ui.innerHTML="";new m.KnightsQuest(g);}) },
];

const VERSIONS: Version[] = [
  { tag:"v0.1", name:"The Very Beginning",  emoji:"🌱", color:"#27ae60", desc:"Just the engine — no games yet!", games: [] },
  { tag:"v0.2", name:"First Mini-Games",    emoji:"🎮", color:"#2980b9", desc:"The very first games ever added.", games: ["coinJump","fruitSlice","cookie","coinRain"].map(id=>ALL_GAMES.find(g=>g.id===id)!) },
  { tag:"v0.3", name:"Art & Drawing",       emoji:"🎨", color:"#8e44ad", desc:"Get creative!", games: ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator"].map(id=>ALL_GAMES.find(g=>g.id===id)!) },
  { tag:"v0.4", name:"The Roblox Era",      emoji:"🔨", color:"#e67e22", desc:"Build and play levels!", games: ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames"].map(id=>ALL_GAMES.find(g=>g.id===id)!) },
  { tag:"v0.5", name:"Big Adventures",      emoji:"⛏️", color:"#16a085", desc:"Huge new games arrived!", games: ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy"].map(id=>ALL_GAMES.find(g=>g.id===id)!) },
  { tag:"v0.6", name:"Night & Fire",        emoji:"🌲", color:"#2c3e50", desc:"Survival and action!", games: ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy","nightForest","fireFighter"].map(id=>ALL_GAMES.find(g=>g.id===id)!) },
  { tag:"v0.7", name:"Online Play",         emoji:"♟️", color:"#7f8c8d", desc:"Play against real people!", games: ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy","nightForest","fireFighter","chess"].map(id=>ALL_GAMES.find(g=>g.id===id)!) },
  { tag:"v0.8", name:"Duck Life",           emoji:"🦆", color:"#3498db", desc:"Train your duck and race!", games: ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy","nightForest","fireFighter","chess","duckLife"].map(id=>ALL_GAMES.find(g=>g.id===id)!) },
  { tag:"v0.9", name:"Knight's Quest",      emoji:"⚔️", color:"#f39c12", desc:"An epic adventure joins!", games: ALL_GAMES },
];

export class VersionHistory {
  constructor(game: Game) {
    this._showPicker(game);
  }

  private _showPicker(game: Game): void {
    const ui = game.ui;
    ui.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(160deg,#0a0020,#0a0a30,#000a20);" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;pointer-events:all;overflow:hidden;";

    wrap.innerHTML = `
      <div style="flex-shrink:0;padding:16px 20px 12px;display:flex;align-items:center;gap:12px;
        border-bottom:1px solid rgba(255,255,255,0.08);">
        <button id="vhBack" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);
          color:rgba(255,255,255,0.8);font-size:14px;padding:7px 14px;border-radius:10px;cursor:pointer;">← Back</button>
        <div style="flex:1;text-align:center;">
          <div style="color:white;font-size:20px;font-weight:900;letter-spacing:2px;">⏳ VERSION HISTORY</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:2px;">Pick a version to go back in time</div>
        </div>
        <div style="width:80px;"></div>
      </div>
    `;

    const scroll = document.createElement("div");
    scroll.style.cssText = "flex:1;overflow-y:auto;padding:20px 16px 40px;display:flex;flex-direction:column;gap:10px;";

    const reversed = [...VERSIONS].reverse();
    for (const v of reversed) {
      const isLatest = v.tag === "v0.9";
      const btn = document.createElement("button");
      btn.style.cssText =
        `width:100%;background:rgba(255,255,255,0.04);border:1.5px solid ${isLatest ? v.color : "rgba(255,255,255,0.1)"};` +
        `border-radius:16px;padding:16px;cursor:pointer;text-align:left;` +
        `display:flex;align-items:center;gap:14px;` +
        (isLatest ? `box-shadow:0 0 14px ${v.color}44;` : "");

      btn.innerHTML =
        `<div style="width:48px;height:48px;border-radius:50%;background:${v.color};display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${v.emoji}</div>` +
        `<div style="flex:1;">` +
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">` +
            `<span style="background:${v.color};color:white;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:20px;">${v.tag}</span>` +
            `<span style="color:white;font-size:15px;font-weight:bold;">${v.name}</span>` +
            (isLatest ? `<span style="background:#e74c3c;color:white;font-size:10px;font-weight:bold;padding:2px 8px;border-radius:20px;">LATEST</span>` : "") +
          `</div>` +
          `<div style="color:rgba(255,255,255,0.4);font-size:12px;">${v.desc}</div>` +
          `<div style="color:${v.color};font-size:12px;margin-top:4px;">${v.games.length === 0 ? "No games yet" : `${v.games.length} game${v.games.length===1?"":"s"} available`}</div>` +
        `</div>` +
        `<div style="color:rgba(255,255,255,0.3);font-size:20px;">▶</div>`;

      if (v.games.length > 0) {
        btn.onclick = () => this._showVersionArcade(game, v);
      } else {
        btn.style.opacity = "0.5";
        btn.style.cursor = "default";
      }

      scroll.appendChild(btn);
    }

    wrap.appendChild(scroll);
    ui.appendChild(wrap);

    document.getElementById("vhBack")!.onclick = () => {
      ui.innerHTML = "";
      game.goTitle();
    };
  }

  private _showVersionArcade(game: Game, v: Version): void {
    const ui = game.ui;
    ui.innerHTML = "";

    const cards = v.games.map(g => `
      <button data-gameid="${g.id}" style="
        background:${g.color};border:2px solid ${g.border};border-radius:20px;
        padding:20px 24px;cursor:pointer;text-align:left;
        display:flex;align-items:center;gap:16px;width:100%;max-width:360px;">
        <div style="font-size:40px;flex-shrink:0;">${g.emoji}</div>
        <div>
          <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">${g.name}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:13px;">${g.desc}</div>
        </div>
      </button>
    `).join("");

    ui.innerHTML = `
      <div class="screen" style="
        background:linear-gradient(160deg,#0a0020,#0a2010,#101808);
        flex-direction:column;gap:0;justify-content:flex-start;overflow-y:auto;padding:80px 20px 48px;">

        <button id="vaBack" style="position:absolute;top:16px;left:16px;
          background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
          font-size:14px;padding:7px 14px;border-radius:12px;
          border:1px solid rgba(255,255,255,0.2);cursor:pointer;
          font-family:Arial,sans-serif;">← Back</button>

        <div style="position:absolute;top:14px;left:50%;transform:translateX(-50%);
          background:${v.color};color:white;font-size:12px;font-weight:bold;
          padding:4px 14px;border-radius:20px;white-space:nowrap;">
          ${v.emoji} ${v.tag} — ${v.name}
        </div>

        <div style="font-size:44px;margin-bottom:6px;">🕹️</div>
        <h1 style="color:white;font-size:32px;margin-bottom:6px;">Mini-Games</h1>
        <p style="color:rgba(255,255,255,0.55);font-size:14px;margin-bottom:28px;">
          ${v.tag} — ${v.games.length} games
        </p>

        <div style="display:flex;flex-direction:column;gap:16px;width:100%;max-width:360px;">
          ${cards}
        </div>
      </div>
    `;

    document.getElementById("vaBack")!.onclick = () => this._showPicker(game);

    for (const g of v.games) {
      const btn = ui.querySelector(`[data-gameid="${g.id}"]`) as HTMLElement;
      if (btn) btn.onclick = () => g.launch(game);
    }
  }
}
