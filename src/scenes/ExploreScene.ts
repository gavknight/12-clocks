/**
 * ExploreScene — A room 3 screens wide. Drag/swipe to explore.
 * Objects sit ON real surfaces. Vlad & Niki stand in the room.
 * Big clock IN the room — bring inventory numbers to it to place them.
 */
import type { Game } from "../game/Game";
import { colorForNumber, positionToNumber } from "../game/clockData";
import { LEVELS } from "../game/levelData";

interface RoomObj {
  id: string;
  emoji: string;
  vw: number;
  surface: "floor" | "shelf1" | "shelf2" | "wall";
  size: number;
  slot: number | null;
  msg?: string;
}

const OBJECTS: RoomObj[] = [
  // ── LEFT SECTION (0–100vw) ──────────────────────────────────────────────
  { id: "mystbox",   emoji: "📦", vw:  6,  surface: "floor",  size: 58, slot: 1  },
  { id: "gamectrl",  emoji: "🎮", vw: 22,  surface: "floor",  size: 52, slot: 0  },
  { id: "teddy",     emoji: "🧸", vw: 40,  surface: "floor",  size: 56, slot: 2  },
  { id: "guitar",    emoji: "🎸", vw: 65,  surface: "wall",   size: 54, slot: 9  },
  { id: "puzzlepc",  emoji: "🧩", vw: 88,  surface: "floor",  size: 28, slot: 8  },
  // Dummies
  { id: "lamp",      emoji: "💡", vw:  2,  surface: "shelf1", size: 38, slot: null, msg: "Just a lamp. 💡" },
  { id: "window",    emoji: "🪟", vw: 14,  surface: "wall",   size: 56, slot: null, msg: "Dark outside... very dark. 🌙" },
  { id: "boom",      emoji: "🪃", vw: 78,  surface: "wall",   size: 36, slot: null, msg: "A boomerang! No puzzle here." },

  // ── MIDDLE SECTION (100–200vw) ───────────────────────────────────────────
  { id: "dice",      emoji: "🎲", vw: 118, surface: "floor",  size: 46, slot: 3  },
  { id: "crystball", emoji: "🔮", vw: 142, surface: "floor",  size: 50, slot: 4  },
  { id: "painting",  emoji: "🖼️",  vw: 164, surface: "wall",   size: 50, slot: 11 },
  { id: "dartboard", emoji: "🎯", vw: 188, surface: "wall",   size: 52, slot: 7  },
  // Dummies
  { id: "sofa",      emoji: "🛋️",  vw: 108, surface: "floor",  size: 78, slot: null, msg: "A comfy sofa! 🛋️" },
  { id: "aclock",    emoji: "⏰",  vw: 153, surface: "shelf1", size: 38, slot: null, msg: "Not THIS clock... the big one! 😅" },
  { id: "cat",       emoji: "🐱",  vw: 175, surface: "floor",  size: 44, slot: null, msg: "Meow! 🐱 I'm not a puzzle!" },
  { id: "cookie",    emoji: "🍪",  vw: 196, surface: "floor",  size: 38, slot: null, msg: "Yummy cookie! No puzzle though. 🍪" },

  // ── RIGHT SECTION (200–300vw) ─────────────────────────────────────────────
  { id: "book",      emoji: "📗", vw: 212, surface: "shelf1", size: 40, slot: 5  },
  { id: "trophy",    emoji: "🏆", vw: 228, surface: "shelf1", size: 44, slot: 6  },
  { id: "key",       emoji: "🔑", vw: 286, surface: "floor",  size: 24, slot: 10 },
  // Dummies
  { id: "plant",     emoji: "🪴",  vw: 260, surface: "floor",  size: 48, slot: null, msg: "A nice plant. 🪴" },
];

function makeCharacter(
  name: string, shirtColor: string, pantsColor: string,
  hairColor: string, face: string,
): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;user-select:none;">
      <div style="position:relative;width:54px;height:54px;">
        <div style="position:absolute;top:0;left:0;right:0;height:28px;
          background:${hairColor};border-radius:50% 50% 0 0;"></div>
        <div style="position:absolute;top:10px;left:0;right:0;height:44px;
          background:#FFCC80;border-radius:50%;border:2px solid ${shirtColor};"></div>
        <div style="position:absolute;top:22px;left:9px;width:11px;height:13px;
          background:white;border-radius:50%;overflow:hidden;">
          <div style="position:absolute;bottom:1px;left:1px;width:9px;height:9px;
            background:#1a0a00;border-radius:50%;"></div>
          <div style="position:absolute;top:2px;right:1px;width:3px;height:3px;
            background:white;border-radius:50%;"></div>
        </div>
        <div style="position:absolute;top:22px;right:9px;width:11px;height:13px;
          background:white;border-radius:50%;overflow:hidden;">
          <div style="position:absolute;bottom:1px;left:1px;width:9px;height:9px;
            background:#1a0a00;border-radius:50%;"></div>
          <div style="position:absolute;top:2px;right:1px;width:3px;height:3px;
            background:white;border-radius:50%;"></div>
        </div>
        <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);
          width:22px;height:9px;border-bottom:3px solid #c47a5a;border-radius:0 0 50% 50%;"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          font-size:32px;opacity:0;">${face}</div>
      </div>
      <div style="position:relative;width:46px;height:46px;
        background:${shirtColor};border-radius:8px 8px 4px 4px;margin-top:1px;">
        <div style="position:absolute;left:-13px;top:4px;width:15px;height:30px;
          background:${shirtColor};border-radius:5px;transform:rotate(10deg);transform-origin:top center;"></div>
        <div style="position:absolute;right:-13px;top:4px;width:15px;height:30px;
          background:${shirtColor};border-radius:5px;transform:rotate(-10deg);transform-origin:top center;"></div>
        <div style="position:absolute;left:-17px;top:30px;width:10px;height:9px;
          background:#FFCC80;border-radius:50%;"></div>
        <div style="position:absolute;right:-17px;top:30px;width:10px;height:9px;
          background:#FFCC80;border-radius:50%;"></div>
      </div>
      <div style="display:flex;gap:4px;margin-top:2px;">
        <div style="width:18px;height:28px;background:${pantsColor};border-radius:3px 3px 5px 5px;"></div>
        <div style="width:18px;height:28px;background:${pantsColor};border-radius:3px 3px 5px 5px;"></div>
      </div>
      <div style="display:flex;gap:2px;margin-top:1px;">
        <div style="width:23px;height:9px;background:#111;border-radius:3px 6px 6px 3px;transform:translateX(-2px);"></div>
        <div style="width:23px;height:9px;background:#111;border-radius:6px 3px 3px 6px;transform:translateX(2px);"></div>
      </div>
      <div style="margin-top:4px;color:white;font-size:12px;font-weight:bold;
        text-shadow:1px 1px 3px black;">${name}</div>
    </div>`;
}

/** Renders the big 12-slot clock that sits inside the room */
function makeRoomClock(placed: Set<number>, isSpooky: boolean, accent = "rgba(255,200,0,0.8)"): string {
  const size = 160;
  const r = 58;
  const cx = size / 2;
  const cy = size / 2;

  const slots = Array.from({ length: 12 }, (_, i) => {
    const angle = Math.PI / 2 - i * (Math.PI / 6);
    const x = cx + r * Math.cos(angle) - 14;
    const y = cy - r * Math.sin(angle) - 14;
    const num = positionToNumber(i);
    const isPlaced = placed.has(i);
    const color = isPlaced ? colorForNumber(num) : "rgba(255,255,255,0.18)";
    return `<div style="
      position:absolute;left:${x}px;top:${y}px;
      width:28px;height:28px;border-radius:50%;
      background:${color};
      border:2px solid ${isPlaced ? "white" : "rgba(255,255,255,0.3)"};
      display:flex;align-items:center;justify-content:center;
      font-size:${isPlaced ? 11 : 9}px;font-weight:bold;color:white;
      box-shadow:${isPlaced ? `0 0 8px ${color}` : "none"};
    ">${isPlaced ? num : "?"}</div>`;
  }).join("");

  const solved = placed.size;
  const totalMin = solved * 15;
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const hourDeg   = -90 + (totalMin / 60) * 30;
  const minuteDeg = -90 + mm * 6;

  return `
    <div style="position:relative;width:${size}px;height:${size}px;cursor:pointer;pointer-events:all;"
         id="roomClock">
      <!-- Clock face -->
      <div style="position:absolute;inset:0;border-radius:50%;
        background:${isSpooky ? "rgba(30,0,60,0.95)" : "rgba(20,5,60,0.95)"};
        border:5px solid ${isSpooky ? "#ff4444" : accent};
        box-shadow:0 0 30px ${isSpooky ? "rgba(255,0,0,0.4)" : "rgba(255,200,0,0.3)"};
      "></div>
      <!-- Number slots -->
      ${slots}
      <!-- SVG hands -->
      <svg style="position:absolute;inset:0;width:100%;height:100%;"
           xmlns="http://www.w3.org/2000/svg">
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r * 0.62}"
          stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"
          transform="rotate(${minuteDeg},${cx},${cy})" />
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - r * 0.42}"
          stroke="${isSpooky ? "#ff4444" : "white"}" stroke-width="4" stroke-linecap="round"
          transform="rotate(${hourDeg},${cx},${cy})" />
        <circle cx="${cx}" cy="${cy}" r="5"
          fill="${isSpooky ? "#ff4444" : "white"}" />
      </svg>
      <!-- Hover ring -->
      <div id="clockHoverRing" style="position:absolute;inset:-6px;border-radius:50%;
        border:3px solid ${isSpooky ? "#ff4444" : "#FFD700"};
        opacity:0;pointer-events:none;transition:opacity 0.2s;"></div>
    </div>
    <div style="text-align:center;color:${isSpooky ? "#ff8888" : "rgba(255,200,0,0.9)"};
      font-size:11px;font-weight:bold;margin-top:4px;pointer-events:none;
      text-shadow:0 0 6px ${isSpooky ? "red" : "rgba(255,200,0,0.5)"};">
      THE CLOCK<br>${hh === 0 ? 12 : hh}:${mm.toString().padStart(2,"0")} AM
    </div>`;
}

export class ExploreScene {
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  constructor(game: Game) {
    this._build(game);
    game._disposeScene = () => {
      this.timeouts.forEach(t => clearTimeout(t));
      // Clear mp callbacks so old events don't fire into a disposed scene
      if (game.mp) {
        game.mp.onCursor     = null;
        game.mp.onInv        = null;
        game.mp.onSync       = null;
        game.mp.onReqSync    = null;
        game.mp.onConnect    = null;
        game.mp.onDisconnect = null;
      }
      game.ui.innerHTML = "";
    };
  }

  private _later(ms: number, fn: () => void): void {
    this.timeouts.push(setTimeout(fn, ms));
  }

  private _surfaceStyle(surface: RoomObj["surface"], size: number): string {
    switch (surface) {
      case "floor":  return `bottom:calc(24% + 2px);`;
      case "shelf1": return `top:calc(28% - ${size}px);`;
      case "shelf2": return `top:calc(43% - ${size}px);`;
      case "wall":   return `top:14%;`;
    }
  }

  private _build(game: Game): void {
    const placed = game.state.unlockedLocks;
    const inv = game.state.inventory;
    const solved = placed.size;
    const target = game.state.difficulty;
    const isSpooky = solved >= Math.ceil(target * 0.66);
    const theme = LEVELS[(game.state.currentLevel || 1) - 1];

    const _hackBtnStyle = (color: string) =>
      `background:rgba(0,0,0,0.6);color:${color};font-size:13px;font-weight:bold;` +
      `padding:7px 12px;border-radius:9px;border:1px solid ${color};cursor:pointer;text-align:left;` +
      `font-family:Arial,sans-serif;`;

    const objectsHTML = OBJECTS.map(obj => {
      const isSolved = obj.slot !== null && placed.has(obj.slot);
      const surfStyle = this._surfaceStyle(obj.surface, obj.size);
      return `
        <div class="roomobj" data-id="${obj.id}" style="
          position:absolute;
          left:calc(${obj.vw}vw);
          ${surfStyle}
          font-size:${obj.size}px;
          line-height:1;
          cursor:pointer;
          pointer-events:all;
          user-select:none;
          filter:${isSolved
            ? "drop-shadow(0 0 10px #00ff88) brightness(1.15)"
            : "drop-shadow(1px 2px 4px rgba(0,0,0,0.6))"};
          transition:transform 0.15s,filter 0.2s;
        ">${obj.emoji}${isSolved
          ? `<span style="position:absolute;top:-12px;right:-8px;font-size:16px;">✅</span>`
          : ""
        }</div>`;
    }).join("");

    game.ui.innerHTML = `
      <style>
        @keyframes bump { 0%,100%{transform:scale(1)} 50%{transform:scale(1.32)} }
        @keyframes msgFade { 0%,100%{opacity:0;transform:translateX(-50%) translateY(6px)}
                             15%,85%{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes clockPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        #roomScroll::-webkit-scrollbar { display:none }
      </style>

      <div class="screen" style="background:#0a0020;position:relative;overflow:hidden;">

        <!-- ── SCROLLABLE ROOM ── -->
        <div id="roomScroll" style="width:100%;height:100%;
          overflow-x:scroll;overflow-y:hidden;
          scrollbar-width:none;-ms-overflow-style:none;cursor:grab;">

          <!-- 300vw room interior -->
          <div id="roomInner" style="
            width:300vw;height:100%;position:relative;overflow:hidden;
            background:linear-gradient(180deg,
              ${isSpooky
                ? `color-mix(in srgb,${theme.bgTop} 60%,#1a0008) 0%,color-mix(in srgb,${theme.bgMid} 55%,#2a0010) 60%,color-mix(in srgb,${theme.bgBot} 55%,#1a0006) 100%`
                : `${theme.bgTop} 0%,${theme.bgMid} 60%,${theme.bgBot} 100%`});">

            <!-- Ceiling trim -->
            <div style="position:absolute;top:0;left:0;right:0;height:8%;
              background:${isSpooky ? `color-mix(in srgb,${theme.ceiling} 50%,#080010)` : theme.ceiling};
              border-bottom:6px solid rgba(255,255,255,0.07);pointer-events:none;"></div>

            <!-- Wallpaper pattern -->
            <div style="position:absolute;top:0;left:0;right:0;bottom:24%;
              pointer-events:none;opacity:0.035;
              background-image:repeating-linear-gradient(
                45deg, white 0, white 1px, transparent 0, transparent 50%);
              background-size:20px 20px;"></div>

            <!-- UPPER SHELF (right section 150-300vw) -->
            <div style="position:absolute;top:28%;left:150vw;right:0;height:8px;
              background:linear-gradient(180deg,${theme.shelf1},${theme.shelf2});
              box-shadow:0 4px 12px rgba(0,0,0,0.5);border-radius:2px;
              pointer-events:none;z-index:5;"></div>
            <div style="position:absolute;top:28%;left:160vw;width:6px;height:30px;
              background:#6B3E1C;pointer-events:none;"></div>
            <div style="position:absolute;top:28%;left:210vw;width:6px;height:30px;
              background:#6B3E1C;pointer-events:none;"></div>
            <div style="position:absolute;top:28%;left:270vw;width:6px;height:30px;
              background:#6B3E1C;pointer-events:none;"></div>

            <!-- FLOOR -->
            <div style="position:absolute;bottom:0;left:0;right:0;height:24%;
              background:linear-gradient(180deg,
                ${isSpooky ? `color-mix(in srgb,${theme.floorTop} 50%,#1a0606)` : theme.floorTop} 0%,
                ${isSpooky ? `color-mix(in srgb,${theme.floorBot} 50%,#100404)` : theme.floorBot} 100%);
              border-top:6px solid rgba(255,255,255,0.06);
              pointer-events:none;z-index:1;"></div>

            <!-- Floor planks -->
            <div style="position:absolute;bottom:0;left:0;right:0;height:24%;
              pointer-events:none;opacity:0.12;z-index:2;
              background-image:repeating-linear-gradient(
                90deg, transparent 0, transparent 119px,
                rgba(0,0,0,0.6) 119px, rgba(0,0,0,0.6) 122px);
              background-size:120px 100%;"></div>

            <!-- Rug -->
            <div style="position:absolute;bottom:24%;left:80vw;width:70vw;height:6%;
              background:radial-gradient(ellipse,${theme.rug1},${theme.rug2});
              border:3px solid rgba(255,255,255,0.1);border-radius:40%;
              pointer-events:none;z-index:2;"></div>

            <!-- ── ALL OBJECTS ── -->
            <div style="position:absolute;inset:0;z-index:10;">
              ${objectsHTML}
            </div>

            <!-- ── THE CLOCK (in the room, center, on floor) ── -->
            <div style="position:absolute;bottom:calc(24% + 2px);left:calc(148vw - 80px);
              z-index:20;display:flex;flex-direction:column;align-items:center;">
              ${makeRoomClock(placed, isSpooky, theme.accent)}
            </div>

            <!-- ── VLAD CHARACTER ── -->
            <div id="vladChar" style="position:absolute;bottom:24%;left:130vw;z-index:20;
              cursor:pointer;pointer-events:all;">
              ${makeCharacter("Vlad", "#FF4444", "#1e3a9e", "#3d1c00",
                isSpooky ? "😰" : "😁")}
            </div>

            <!-- ── NIKI CHARACTER ── -->
            <div id="nikiChar" style="position:absolute;bottom:24%;left:162vw;z-index:20;
              cursor:pointer;pointer-events:all;">
              ${makeCharacter("Niki", "#4D96FF", "#8B1A6B", "#7a4a10",
                isSpooky ? "😰" : "😄")}
            </div>

          </div><!-- /roomInner -->
        </div><!-- /roomScroll -->

        <!-- ── HUD ── -->

        <!-- Popup message -->
        <div id="floatMsg" style="
          position:absolute;top:11%;left:50%;transform:translateX(-50%);
          background:rgba(0,0,0,0.88);color:white;
          border:2px solid rgba(255,255,255,0.25);border-radius:14px;
          padding:9px 22px;font-size:15px;font-weight:bold;
          pointer-events:none;display:none;z-index:200;
          white-space:nowrap;text-align:center;"></div>

        <!-- Top-right: progress + clock button -->
        <div style="position:absolute;top:10px;right:10px;z-index:150;
          display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div style="background:rgba(0,0,0,0.7);border:2px solid rgba(255,255,255,0.18);
            border-radius:14px;padding:8px 14px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:20px;">${isSpooky ? "😱" : "🕐"}</span>
            <span style="color:${isSpooky?"#ff6666":"white"};font-weight:bold;font-size:15px;">
              ${solved}/${target}</span>
            <button id="clockViewBtn" style="
              background:rgba(255,255,255,0.14);color:white;font-size:12px;
              padding:4px 10px;border-radius:10px;
              border:1px solid rgba(255,255,255,0.28);cursor:pointer;">
              🕐 View Clock</button>
          </div>
        </div>

        <!-- Top-left: home button + username -->
        <div style="position:absolute;top:10px;left:10px;z-index:150;display:flex;align-items:center;gap:8px;">
          <button id="homeBtn" style="
            background:rgba(0,0,0,0.7);color:white;font-size:13px;
            padding:8px 14px;border-radius:14px;
            border:2px solid rgba(255,255,255,0.2);cursor:pointer;">
            🏠 Menu</button>
          ${game.state.username ? `<span style="
            background:rgba(0,0,0,0.5);color:rgba(255,255,255,0.6);
            font-size:12px;padding:6px 10px;border-radius:10px;
            border:1px solid rgba(255,255,255,0.15);">
            👤 ${game.state.username}</span>` : ""}
        </div>

        <!-- Hacks toggle button + panel (only for 00 users) -->
        ${game.hasHacks ? `
        <button id="hacksBtn" style="
          position:absolute;top:60px;left:10px;z-index:300;
          background:rgba(0,255,136,0.18);color:#00ff88;font-size:13px;font-weight:bold;
          padding:6px 12px;border-radius:10px;border:2px solid #00ff88;cursor:pointer;">
          ⚡ Hacks ▾</button>
        <div id="hacksPanel" style="
          display:none;position:absolute;top:94px;left:10px;z-index:300;
          background:rgba(0,0,0,0.92);border:2px solid #00ff88;border-radius:16px;
          padding:12px 16px;flex-direction:column;gap:8px;min-width:220px;
        ">
          <div style="color:#00ff88;font-size:13px;font-weight:bold;margin-bottom:2px;">⚡ Hacks</div>
          <button class="hackBtn" data-hack="giveAll"  style="${_hackBtnStyle("#00ff88")}">🎒 Give All Numbers</button>
          <button class="hackBtn" data-hack="complete" style="${_hackBtnStyle("#FFD700")}">✅ Complete Level</button>
          <button class="hackBtn" data-hack="ending"   style="${_hackBtnStyle("#ff66ff")}">🏁 Skip to Ending</button>
          <button class="hackBtn" data-hack="reset"    style="${_hackBtnStyle("#ff4444")}">🗑️ Reset Save</button>
        </div>` : ""}

        <!-- Inventory bar (only when items present) -->
        ${inv.length > 0 ? `
        <div id="invBar" style="
          position:absolute;bottom:36px;left:50%;transform:translateX(-50%);
          z-index:160;display:flex;align-items:center;gap:6px;
          background:rgba(0,0,0,0.8);border:2px solid rgba(255,200,0,0.5);
          border-radius:16px;padding:6px 14px;
        ">
          <span style="color:rgba(255,200,0,0.9);font-size:12px;font-weight:bold;margin-right:4px;">🎒</span>
          ${inv.map(n => `<div style="
            width:28px;height:28px;border-radius:50%;
            background:rgba(255,200,0,0.25);border:2px solid rgba(255,200,0,0.7);
            display:flex;align-items:center;justify-content:center;
            color:white;font-size:12px;font-weight:bold;
          ">${n}</div>`).join("")}
          <span style="color:rgba(255,255,255,0.5);font-size:11px;margin-left:4px;">→ click the clock!</span>
        </div>` : ""}

        <!-- Remote player cursors layer -->
        <div id="cursorLayer" style="position:absolute;inset:0;pointer-events:none;z-index:400;overflow:hidden;"></div>

        <!-- Bottom hint -->
        <div style="position:absolute;bottom:10px;left:0;right:0;
          text-align:center;color:rgba(255,255,255,0.35);font-size:11px;
          pointer-events:none;z-index:150;">
          ← Drag to explore · ${target-solved} puzzle${target-solved===1?"":"s"} left →
        </div>

        <!-- Scroll arrows -->
        <button id="arrowL" style="position:absolute;left:6px;top:50%;
          transform:translateY(-50%);z-index:150;
          background:rgba(0,0,0,0.55);color:white;font-size:26px;
          border:2px solid rgba(255,255,255,0.25);border-radius:50%;
          width:44px;height:44px;cursor:pointer;pointer-events:all;
          display:flex;align-items:center;justify-content:center;">‹</button>
        <button id="arrowR" style="position:absolute;right:6px;top:50%;
          transform:translateY(-50%);z-index:150;
          background:rgba(0,0,0,0.55);color:white;font-size:26px;
          border:2px solid rgba(255,255,255,0.25);border-radius:50%;
          width:44px;height:44px;cursor:pointer;pointer-events:all;
          display:flex;align-items:center;justify-content:center;">›</button>
      </div>
    `;

    const scroller = document.getElementById("roomScroll")!;

    // Arrow buttons
    document.getElementById("arrowL")!.onclick = () =>
      scroller.scrollBy({ left: -window.innerWidth * 0.7, behavior: "smooth" });
    document.getElementById("arrowR")!.onclick = () =>
      scroller.scrollBy({ left: window.innerWidth * 0.7, behavior: "smooth" });

    // Home button
    document.getElementById("homeBtn")!.onclick = () => game.goTitle();

    // View clock button
    document.getElementById("clockViewBtn")!.onclick = () => game.goClock();

    // Mouse drag to scroll
    let dragging = false;
    let dragStartX = 0;
    let scrollStart = 0;
    let dragDist = 0;
    scroller.addEventListener("mousedown", e => {
      dragging = true; dragStartX = e.clientX; scrollStart = scroller.scrollLeft; dragDist = 0;
      scroller.style.cursor = "grabbing";
    });
    scroller.addEventListener("mousemove", e => {
      if (!dragging) return;
      dragDist = Math.abs(e.clientX - dragStartX);
      scroller.scrollLeft = scrollStart - (e.clientX - dragStartX);
    });
    const stopDrag = () => { dragging = false; scroller.style.cursor = "grab"; };
    scroller.addEventListener("mouseup", stopDrag);
    scroller.addEventListener("mouseleave", stopDrag);

    // In-room clock click
    const roomClock = document.getElementById("roomClock");
    if (roomClock) {
      const ring = document.getElementById("clockHoverRing");
      roomClock.onmouseenter = () => { if (ring) ring.style.opacity = "1"; };
      roomClock.onmouseleave = () => { if (ring) ring.style.opacity = "0"; };
      roomClock.onclick = (e) => {
        e.stopPropagation();
        if (inv.length > 0) {
          // Place all inventory numbers onto the clock
          [...inv].forEach(n => game.placeNumber(n));
          game.mp?.sendSync([...game.state.unlockedLocks], game.state.inventory, game.state.difficulty);
          const newSolved = game.state.unlockedLocks.size;
          if (newSolved >= target) {
            this._showMsg(`✨ All ${target} numbers placed!`);
            game.saveLevelProgress(true); // awards 100 coins + unlocks next level
            game.saveRecord();            // saves time if Hard mode
            this._later(800, () => game.goEnding());
          } else {
            this._showMsg(`✅ Placed ${inv.length} number${inv.length === 1 ? "" : "s"}! ${newSolved}/${target} done.`);
            this._later(600, () => game.goExplore());
          }
        } else {
          const remaining = target - game.state.unlockedLocks.size;
          if (remaining === 0) {
            this._showMsg(`✨ All ${target} numbers found!`);
          } else {
            this._showMsg(`${solved}/${target} numbers on the clock — find ${remaining} more!`);
          }
        }
      };
    }

    // Vlad click — 50/50 quote + kid voice
    const vladEl = document.getElementById("vladChar");
    if (vladEl) {
      vladEl.onclick = (e) => {
        e.stopPropagation();
        const q = Math.random() < 0.5
          ? "Do you know what time it is?"
          : "Hehe!";
        this._showMsg(`Vlad: "${q}"`);
        this._speak(q, 1.6, 1.2);
      };
    }

    // Niki click — 50/50 quote + kid voice (slightly higher)
    const nikiEl = document.getElementById("nikiChar");
    if (nikiEl) {
      nikiEl.onclick = (e) => {
        e.stopPropagation();
        const q = Math.random() < 0.5
          ? "Do you know what time it is?"
          : "Hehe!";
        this._showMsg(`Niki: "${q}"`);
        this._speak(q, 2.0, 1.2);
      };
    }

    // Hacks button (00 users only)
    if (game.hasHacks) {
      const hacksBtn   = document.getElementById("hacksBtn")!;
      const hacksPanel = document.getElementById("hacksPanel")!;
      let panelOpen = false;
      hacksBtn.onclick = (e) => {
        e.stopPropagation();
        panelOpen = !panelOpen;
        hacksPanel.style.display = panelOpen ? "flex" : "none";
        hacksBtn.textContent = panelOpen ? "⚡ Hacks ▴" : "⚡ Hacks ▾";
      };
      game.ui.querySelectorAll<HTMLElement>(".hackBtn").forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const hack = btn.dataset["hack"];
          if (hack === "giveAll") {
            for (let n = 1; n <= 12; n++) game.addToInventory(n);
            game.goExplore();
          } else if (hack === "complete") {
            for (let i = 0; i < target; i++) game.state.unlockedLocks.add(i);
            game.save();
            game.goExplore();
          } else if (hack === "ending") {
            for (let i = 0; i < 12; i++) game.state.unlockedLocks.add(i);
            game.save();
            game.goEnding();
          } else if (hack === "reset") {
            game.resetSave();
            game.goTitle();
          }
        };
      });
    }

    // Object clicks
    game.ui.querySelectorAll<HTMLElement>(".roomobj").forEach(el => {
      el.onmouseenter = () => { el.style.transform = "scale(1.18) translateY(-6px)"; };
      el.onmouseleave = () => { el.style.transform = ""; };
      el.onclick = (e) => {
        e.stopPropagation();
        if (dragDist > 6) return; // was a drag, not a click
        const obj = OBJECTS.find(o => o.id === el.dataset["id"])!;
        if (obj.slot !== null) {
          if (placed.has(obj.slot)) {
            const n = positionToNumber(obj.slot);
            this._showMsg(`✅ Number ${n} already on the clock!`);
          } else {
            el.style.animation = "bump 0.28s ease";
            this._later(280, () => game.goPuzzle(obj.slot!));
          }
        } else {
          this._showMsg(obj.msg ?? "Nothing here...");
          el.style.animation = "bump 0.22s ease";
          this._later(300, () => { el.style.animation = ""; });
        }
      };
    });

    // ── MULTIPLAYER ──────────────────────────────────────────────────────────
    const mp = game.mp;
    if (mp) {
      const cursorLayer = document.getElementById("cursorLayer")!;
      const cursors = new Map<string, HTMLElement>();

      const getCursor = (id: string, name: string, color: string): HTMLElement => {
        if (!cursors.has(id)) {
          const el = document.createElement("div");
          el.style.cssText = `
            position:absolute;pointer-events:none;
            display:flex;flex-direction:column;align-items:center;gap:2px;
            transform:translate(-50%,-50%);transition:left 0.05s,top 0.05s;
          `;
          el.innerHTML = `
            <div style="font-size:20px;">🖱️</div>
            <div style="background:${color};color:white;font-size:10px;font-weight:bold;
              padding:2px 6px;border-radius:8px;white-space:nowrap;">${name}</div>
          `;
          cursorLayer.appendChild(el);
          cursors.set(id, el);
        }
        return cursors.get(id)!;
      };

      // ── Cursors ──────────────────────────────────────────────────────────
      mp.onCursor = (id, name, color, worldX, worldY) => {
        const el = getCursor(id, name, color);
        el.style.left = `${worldX - scroller.scrollLeft}px`;
        el.style.top  = `${worldY}px`;
      };
      scroller.addEventListener("mousemove", e => {
        mp.sendCursor(e.clientX + scroller.scrollLeft, e.clientY);
      });

      // ── Full state sync ───────────────────────────────────────────────────
      const applySync = (locks: number[], items: number[], diff: number) => {
        // Mark sync as received BEFORE goExplore so the new scene won't
        // request sync again → prevents the infinite reqsync ↔ sync loop
        mp.initialSyncDone = true;
        game.state.unlockedLocks.clear();
        locks.forEach(n => game.state.unlockedLocks.add(n));
        game.state.inventory.length = 0;
        game.state.inventory.push(...items);
        game.state.difficulty = diff;
        game.save();
        game.goExplore(); // re-render with shared state
      };

      // When we receive a full sync, apply it immediately
      mp.onSync = applySync;

      // When host receives a reqsync from a joiner, send our state
      mp.onReqSync = () => {
        mp.sendSync([...game.state.unlockedLocks], game.state.inventory, game.state.difficulty);
      };

      // When a new player connects while we're in the room, send them state
      mp.onConnect = () => {
        mp.initialSyncDone = false; // reset so the new joiner can still receive sync
        mp.sendSync([...game.state.unlockedLocks], game.state.inventory, game.state.difficulty);
      };

      // Joiners request the host's state on arrival.
      // Hosts never request sync — they ARE the source of truth.
      // Only do this once (initialSyncDone prevents the re-render loop).
      if (!mp.isHost) {
        this._later(300, () => { if (!mp.initialSyncDone) mp.requestSync(); });
      }

      // Remove cursor div when player leaves
      mp.onDisconnect = (id) => {
        cursors.get(id)?.remove();
        cursors.delete(id);
        this._showMsg("A player left the game.");
      };
    }
  }

  private _speak(text: string, pitch = 1.6, rate = 1.2): void {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[^\w\s,.!?'"-]/g, "");
    const utt = new SpeechSynthesisUtterance(clean);
    utt.pitch = pitch;
    utt.rate  = rate;
    setTimeout(() => window.speechSynthesis.speak(utt), 50);
  }

  private _showMsg(text: string): void {
    const msg = document.getElementById("floatMsg");
    if (!msg) return;
    msg.textContent = text;
    msg.style.display = "block";
    msg.style.animation = "none";
    void msg.offsetWidth;
    msg.style.animation = "msgFade 2.2s ease forwards";
    this._later(2300, () => { if (msg) msg.style.display = "none"; });
  }
}
