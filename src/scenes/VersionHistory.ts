import type { Game } from "../game/Game";

interface Version {
  tag: string;
  name: string;
  date: string;
  emoji: string;
  color: string;
  additions: string[];
}

const VERSIONS: Version[] = [
  {
    tag: "v0.1",
    name: "The Very Beginning",
    date: "Day 1",
    emoji: "🌱",
    color: "#27ae60",
    additions: [
      "BabylonJS engine set up",
      "Orthographic 2D camera",
      "Basic scene framework",
      "Title screen",
    ],
  },
  {
    tag: "v0.2",
    name: "First Mini-Games",
    date: "Early Days",
    emoji: "🎮",
    color: "#2980b9",
    additions: [
      "Arcade screen added",
      "Coin Jump 🚗",
      "Fruit Slice 🍉",
      "Cookie Clicker 🍪",
      "Coin Rain 🪙",
      "Coin system (earn & save)",
    ],
  },
  {
    tag: "v0.3",
    name: "Art & Drawing",
    date: "Getting Creative",
    emoji: "🎨",
    color: "#8e44ad",
    additions: [
      "Just Draw 🎨",
      "Item Creator 🖌️",
      "Pixel art tools",
    ],
  },
  {
    tag: "v0.4",
    name: "The Roblox Era",
    date: "Building Things",
    emoji: "🔨",
    color: "#e67e22",
    additions: [
      "Roblox Studio 🔨",
      "Roblox Games 🎮",
      "Custom level builder",
      "Steal the Brainrot",
      "Floor is Lava",
    ],
  },
  {
    tag: "v0.5",
    name: "Big Adventures",
    date: "Going Bigger",
    emoji: "⛏️",
    color: "#16a085",
    additions: [
      "Minecraft ⛏️",
      "Geometry Dash 🟡",
      "Garten of Banban 🐦",
      "Mr. Tomato 🍅",
      "Boldy 👨‍🦲",
    ],
  },
  {
    tag: "v0.6",
    name: "Night & Fire",
    date: "Dark Times",
    emoji: "🌲",
    color: "#2c3e50",
    additions: [
      "99 Nights in the Forest 🌲",
      "Fire Fighter 🧑‍🚒",
      "Bedrock Edition 🟢",
    ],
  },
  {
    tag: "v0.7",
    name: "Online Play",
    date: "Playing Together",
    emoji: "♟️",
    color: "#7f8c8d",
    additions: [
      "Chess ♟️",
      "Online multiplayer (Supabase)",
      "Play vs bots",
      "Friend challenges",
      "Spectate mode",
      "Coin leaderboard",
    ],
  },
  {
    tag: "v0.8",
    name: "Duck Life",
    date: "Quack!",
    emoji: "🦆",
    color: "#3498db",
    additions: [
      "Duck Life 🦆",
      "Train Running, Flying & Swimming",
      "Race against opponents",
      "Duck hub with canvas animation",
      "Hats & color shop",
    ],
  },
  {
    tag: "v0.9",
    name: "Knight's Quest",
    date: "Coming Soon…",
    emoji: "⚔️",
    color: "#f39c12",
    additions: [
      "Knight's Quest ⚔️",
      "Full shop with 30+ items",
      "Tabs: Weapons, Powers, Pets…",
      "🚧 Game itself coming soon!",
    ],
  },
];

export class VersionHistory {
  constructor(game: Game) {
    const ui = game.ui;
    ui.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(160deg,#0a0020,#0a0a30,#000a20);" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;pointer-events:all;overflow:hidden;";

    // Header
    const header = document.createElement("div");
    header.style.cssText =
      "flex-shrink:0;padding:16px 20px 12px;display:flex;align-items:center;gap:12px;" +
      "border-bottom:1px solid rgba(255,255,255,0.08);";
    header.innerHTML =
      `<button id="vhBack" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);` +
      `color:rgba(255,255,255,0.8);font-size:14px;padding:7px 14px;border-radius:10px;cursor:pointer;">← Back</button>` +
      `<div style="flex:1;text-align:center;">` +
      `<div style="color:white;font-size:20px;font-weight:900;letter-spacing:2px;">⏳ VERSION HISTORY</div>` +
      `<div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:2px;">Going back in time…</div>` +
      `</div><div style="width:80px;"></div>`;
    wrap.appendChild(header);

    // Scrollable timeline
    const scroll = document.createElement("div");
    scroll.style.cssText = "flex:1;overflow-y:auto;padding:24px 20px 40px;";

    // Build timeline from newest to oldest
    const reversed = [...VERSIONS].reverse();
    for (let i = 0; i < reversed.length; i++) {
      const v = reversed[i];
      const isLatest = i === 0;

      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:14px;margin-bottom:8px;";

      // Left: line + dot
      const lineCol = document.createElement("div");
      lineCol.style.cssText = "display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:28px;";

      const dot = document.createElement("div");
      dot.style.cssText =
        `width:28px;height:28px;border-radius:50%;background:${v.color};flex-shrink:0;` +
        `display:flex;align-items:center;justify-content:center;font-size:14px;` +
        (isLatest ? `box-shadow:0 0 12px ${v.color};` : "");
      dot.textContent = v.emoji;
      lineCol.appendChild(dot);

      if (i < reversed.length - 1) {
        const line = document.createElement("div");
        line.style.cssText =
          "width:2px;flex:1;min-height:24px;background:rgba(255,255,255,0.08);margin-top:4px;";
        lineCol.appendChild(line);
      }

      // Right: card
      const card = document.createElement("div");
      card.style.cssText =
        `background:rgba(255,255,255,0.04);border:1.5px solid ${isLatest ? v.color : "rgba(255,255,255,0.08)"};` +
        `border-radius:14px;padding:14px 16px;flex:1;margin-bottom:16px;` +
        (isLatest ? `box-shadow:0 0 16px ${v.color}33;` : "");

      const tagLine = document.createElement("div");
      tagLine.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:6px;";
      tagLine.innerHTML =
        `<span style="background:${v.color};color:white;font-size:11px;font-weight:bold;` +
        `padding:2px 8px;border-radius:20px;">${v.tag}</span>` +
        `<span style="color:white;font-size:15px;font-weight:bold;">${v.name}</span>` +
        (isLatest ? `<span style="background:#e74c3c;color:white;font-size:10px;font-weight:bold;` +
          `padding:2px 8px;border-radius:20px;margin-left:auto;">LATEST</span>` : "") +
        `<span style="color:rgba(255,255,255,0.3);font-size:12px;${isLatest ? "" : "margin-left:auto;"}">${v.date}</span>`;
      card.appendChild(tagLine);

      const list = document.createElement("div");
      list.style.cssText = "display:flex;flex-direction:column;gap:3px;";
      for (const item of v.additions) {
        const li = document.createElement("div");
        li.style.cssText = "color:rgba(255,255,255,0.55);font-size:13px;display:flex;gap:6px;";
        li.innerHTML = `<span style="color:${v.color};opacity:0.8;">+</span> ${item}`;
        list.appendChild(li);
      }
      card.appendChild(list);

      row.appendChild(lineCol);
      row.appendChild(card);
      scroll.appendChild(row);
    }

    wrap.appendChild(scroll);
    ui.appendChild(wrap);

    document.getElementById("vhBack")!.onclick = () => {
      ui.innerHTML = "";
      import("./ArcadeScene").then(m => new m.ArcadeScene(game));
    };
  }
}
