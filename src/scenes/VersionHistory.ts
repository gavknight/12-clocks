import type { Game } from "../game/Game";

export const VERSION_GAMES: Record<string, string[]> = {
  "v0.1": [],
  "v0.2": ["coinJump","fruitSlice","cookie","coinRain"],
  "v0.3": ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator"],
  "v0.4": ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames"],
  "v0.5": ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy"],
  "v0.6": ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy","nightForest","fireFighter"],
  "v0.7": ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy","nightForest","fireFighter","chess"],
  "v0.8": ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy","nightForest","fireFighter","chess","duckLife"],
  "v0.9": ["coinJump","fruitSlice","cookie","coinRain","justDraw","itemCreator","robloxStudio","robloxGames","minecraft","geomDash","banban","mrTomato","boldy","nightForest","fireFighter","chess","duckLife","knightsQuest"],
};

export const VERSION_NAMES: Record<string, string> = {
  "v0.1": "The Very Beginning",
  "v0.2": "First Mini-Games",
  "v0.3": "Art & Drawing",
  "v0.4": "The Roblox Era",
  "v0.5": "Big Adventures",
  "v0.6": "Night & Fire",
  "v0.7": "Online Play",
  "v0.8": "Duck Life",
  "v0.9": "Knight's Quest",
};

const VERSION_EMOJIS: Record<string, string> = {
  "v0.1":"🌱","v0.2":"🎮","v0.3":"🎨","v0.4":"🔨",
  "v0.5":"⛏️","v0.6":"🌲","v0.7":"♟️","v0.8":"🦆","v0.9":"⚔️",
};

const VERSION_COLORS: Record<string, string> = {
  "v0.1":"#27ae60","v0.2":"#2980b9","v0.3":"#8e44ad","v0.4":"#e67e22",
  "v0.5":"#16a085","v0.6":"#2c3e50","v0.7":"#7f8c8d","v0.8":"#3498db","v0.9":"#f39c12",
};

export const TIME_MACHINE_KEY = "12clocks_timemachine";

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
          <div style="color:white;font-size:20px;font-weight:900;letter-spacing:2px;">⏳ TIME MACHINE</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:2px;">Pick a version — play the WHOLE game from that era</div>
        </div>
        <div style="width:80px;"></div>
      </div>
    `;

    const scroll = document.createElement("div");
    scroll.style.cssText = "flex:1;overflow-y:auto;padding:20px 16px 40px;display:flex;flex-direction:column;gap:10px;";

    const versions = Object.keys(VERSION_NAMES).reverse();
    for (const tag of versions) {
      const name   = VERSION_NAMES[tag];
      const emoji  = VERSION_EMOJIS[tag];
      const color  = VERSION_COLORS[tag];
      const games  = VERSION_GAMES[tag];
      const isLatest = tag === "v0.9";
      const noGames  = games.length === 0;

      const btn = document.createElement("button");
      btn.style.cssText =
        `width:100%;background:rgba(255,255,255,0.04);border:1.5px solid ${isLatest ? color : "rgba(255,255,255,0.1)"};` +
        `border-radius:16px;padding:16px;text-align:left;` +
        `display:flex;align-items:center;gap:14px;` +
        `cursor:${noGames ? "default" : "pointer"};opacity:${noGames ? "0.45" : "1"};` +
        (isLatest ? `box-shadow:0 0 14px ${color}44;` : "");

      btn.innerHTML =
        `<div style="width:48px;height:48px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${emoji}</div>` +
        `<div style="flex:1;">` +
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">` +
            `<span style="background:${color};color:white;font-size:11px;font-weight:bold;padding:2px 8px;border-radius:20px;">${tag}</span>` +
            `<span style="color:white;font-size:15px;font-weight:bold;">${name}</span>` +
            (isLatest ? `<span style="background:#e74c3c;color:white;font-size:10px;font-weight:bold;padding:2px 8px;border-radius:20px;">LATEST</span>` : "") +
          `</div>` +
          `<div style="color:${color};font-size:12px;">${noGames ? "No games yet" : `${games.length} game${games.length===1?"":"s"} • Tap to enter this version`}</div>` +
        `</div>` +
        `${noGames ? "" : `<div style="color:rgba(255,255,255,0.4);font-size:22px;">▶</div>`}`;

      if (!noGames) {
        btn.onclick = () => {
          sessionStorage.setItem(TIME_MACHINE_KEY, tag);
          ui.innerHTML = "";
          import("./TitleScene").then(m => new m.TitleScene(game));
        };
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
}
