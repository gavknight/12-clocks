/**
 * ExtremeScene — find all 50 clocks to win!
 * Bigger room, new puzzles including Cat Cleaning.
 */
import type { Game } from "../game/Game";

// ── Save ──────────────────────────────────────────────────────────────────────
const EXTREME_KEY = "12clocks_extreme";
interface ExtremeSave { solved: number[] }

function loadExtreme(): ExtremeSave {
  try { return JSON.parse(localStorage.getItem(EXTREME_KEY) ?? "{}"); } catch { return { solved: [] }; }
}
function saveExtreme(s: ExtremeSave): void {
  localStorage.setItem(EXTREME_KEY, JSON.stringify(s));
}

// ── Objects (50 total) ────────────────────────────────────────────────────────
// type: 0=SpeedTap 1=Math 2=Whack 3=Memory 4=Rain 5=Grid 6=CatCleaning
interface EObj { id: number; emoji: string; vw: number; label: string; type: number }

const OBJS: EObj[] = [
  // Zone 1 — Living Room (0–99vw)
  { id: 0,  emoji:"🕰️", vw:6,   label:"Grandfather Clock",  type:0 },
  { id: 1,  emoji:"⏰",  vw:18,  label:"Alarm Clock",         type:1 },
  { id: 2,  emoji:"🎸",  vw:30,  label:"Guitar",              type:2 },
  { id: 3,  emoji:"📺",  vw:42,  label:"TV",                  type:3 },
  { id: 4,  emoji:"🎮",  vw:54,  label:"Controller",          type:4 },
  { id: 5,  emoji:"🔮",  vw:66,  label:"Crystal Ball",        type:5 },
  { id: 6,  emoji:"🐱",  vw:78,  label:"Sleeping Cat",        type:6 },
  { id: 7,  emoji:"🏆",  vw:88,  label:"Trophy",              type:0 },
  { id: 8,  emoji:"📚",  vw:95,  label:"Books",               type:1 },
  { id: 9,  emoji:"🎯",  vw:104, label:"Dartboard",           type:2 },
  // Zone 2 — Kitchen (100–199vw)
  { id:10,  emoji:"🍕",  vw:112, label:"Pizza Box",           type:3 },
  { id:11,  emoji:"🎲",  vw:122, label:"Dice",                type:4 },
  { id:12,  emoji:"🧁",  vw:132, label:"Cupcake",             type:5 },
  { id:13,  emoji:"🐱",  vw:142, label:"Fluffy Cat",          type:6 },
  { id:14,  emoji:"🍎",  vw:152, label:"Apple",               type:0 },
  { id:15,  emoji:"🎪",  vw:162, label:"Circus Tent",         type:1 },
  { id:16,  emoji:"🎭",  vw:172, label:"Theatre Mask",        type:2 },
  { id:17,  emoji:"🔑",  vw:182, label:"Key",                 type:3 },
  { id:18,  emoji:"💎",  vw:192, label:"Diamond",             type:4 },
  { id:19,  emoji:"🎁",  vw:200, label:"Present",             type:5 },
  // Zone 3 — Hallway (200–299vw)
  { id:20,  emoji:"🐱",  vw:208, label:"Stripy Cat",          type:6 },
  { id:21,  emoji:"🌟",  vw:218, label:"Star",                type:0 },
  { id:22,  emoji:"🔭",  vw:228, label:"Telescope",           type:1 },
  { id:23,  emoji:"🧩",  vw:238, label:"Puzzle Piece",        type:2 },
  { id:24,  emoji:"🎬",  vw:248, label:"Clapperboard",        type:3 },
  { id:25,  emoji:"🎵",  vw:258, label:"Music Note",          type:4 },
  { id:26,  emoji:"🎹",  vw:268, label:"Piano",               type:5 },
  { id:27,  emoji:"🐱",  vw:278, label:"Chubby Cat",          type:6 },
  { id:28,  emoji:"🎻",  vw:288, label:"Violin",              type:0 },
  { id:29,  emoji:"🥁",  vw:298, label:"Drum",                type:1 },
  // Zone 4 — Library (300–399vw)
  { id:30,  emoji:"📖",  vw:306, label:"Old Book",            type:2 },
  { id:31,  emoji:"🕯️",  vw:316, label:"Candle",             type:3 },
  { id:32,  emoji:"🔦",  vw:326, label:"Torch",               type:4 },
  { id:33,  emoji:"💡",  vw:336, label:"Light Bulb",          type:5 },
  { id:34,  emoji:"🐱",  vw:346, label:"Library Cat",         type:6 },
  { id:35,  emoji:"🗝️",  vw:356, label:"Old Key",            type:0 },
  { id:36,  emoji:"🔬",  vw:366, label:"Microscope",          type:1 },
  { id:37,  emoji:"⚗️",  vw:376, label:"Flask",              type:2 },
  { id:38,  emoji:"🧲",  vw:386, label:"Magnet",              type:3 },
  { id:39,  emoji:"🪄",  vw:394, label:"Magic Wand",          type:4 },
  // Zone 5 — Secret Room (400–449vw)
  { id:40,  emoji:"🌙",  vw:404, label:"Moon",                type:5 },
  { id:41,  emoji:"🐱",  vw:414, label:"Secret Cat",          type:6 },
  { id:42,  emoji:"⭐",  vw:424, label:"Gold Star",           type:0 },
  { id:43,  emoji:"🎆",  vw:432, label:"Fireworks",           type:1 },
  { id:44,  emoji:"🎇",  vw:438, label:"Sparkler",            type:2 },
  { id:45,  emoji:"🏅",  vw:444, label:"Medal",               type:3 },
  { id:46,  emoji:"👑",  vw:450, label:"Crown",               type:4 },
  { id:47,  emoji:"💫",  vw:456, label:"Comet",               type:5 },
  { id:48,  emoji:"🐱",  vw:462, label:"Final Cat",           type:6 },
  { id:49,  emoji:"🕛",  vw:472, label:"The Final Clock",     type:0 },
];

const ZONE_LABELS = [
  { vw: 0,   label: "🛋️ Living Room"  },
  { vw: 100, label: "🍽️ Kitchen"     },
  { vw: 200, label: "🚪 Hallway"      },
  { vw: 300, label: "📖 Library"      },
  { vw: 400, label: "🌙 Secret Room"  },
];

// ── ExtremeScene ───────────────────────────────────────────────────────────────
export class ExtremeScene {
  private _save: ExtremeSave;
  private _solvedSet: Set<number>;
  private _puzzleOpen = false;
  private _puzzleTimers: ReturnType<typeof setTimeout>[] = [];
  private _cleanup: (() => void)[] = [];
  private _disposed = false;

  constructor(game: Game) {
    this._save = loadExtreme();
    this._solvedSet = new Set(this._save.solved);
    this._build(game);

    game._disposeScene = () => {
      this._disposed = true;
      this._puzzleTimers.forEach(t => clearTimeout(t));
      this._cleanup.forEach(f => f());
      game.ui.innerHTML = "";
    };
  }

  private _onSolve(game: Game, id: number): void {
    if (this._solvedSet.has(id)) return;
    this._solvedSet.add(id);
    this._save.solved = [...this._solvedSet];
    saveExtreme(this._save);
    game.state.coins += 10;
    game.save();

    if (this._solvedSet.size >= 50) {
      this._showWin(game);
    } else {
      this._build(game);
    }
  }

  // ── Room render ─────────────────────────────────────────────────────────────
  private _build(game: Game): void {
    if (this._disposed) return;
    this._cleanup.forEach(f => f());
    this._cleanup = [];
    this._puzzleTimers = [];
    game.ui.innerHTML = "";

    const solved = this._solvedSet.size;
    const ROOM_VW = 490;

    game.ui.innerHTML = `
      <style>
        @keyframes exBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .ex-obj { animation:exBob 2s ease-in-out infinite; cursor:pointer; }
        .ex-obj:hover { filter:drop-shadow(0 0 10px gold); }
        .ex-obj.solved { filter:grayscale(0.3) brightness(0.7); cursor:default; animation:none; }
      </style>
      <div id="exWrap" style="
        position:absolute;inset:0;
        background:linear-gradient(160deg,#1a0a3e,#3a106f,#6a20a0);
        overflow:hidden;font-family:Arial,sans-serif;user-select:none;cursor:grab;">

        <!-- Top bar -->
        <div style="position:absolute;top:0;left:0;right:0;z-index:20;
          background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
          padding:10px 16px;display:flex;align-items:center;gap:12px;">
          <button id="exBack" style="background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.3);
            color:white;font-size:13px;padding:5px 14px;border-radius:12px;cursor:pointer;">← Back</button>
          <div style="flex:1;">
            <div style="color:#FFD700;font-size:13px;font-weight:bold;margin-bottom:3px;">
              ⚡ EXTREME MODE — ${solved}/50 clocks found
            </div>
            <div style="background:rgba(255,255,255,0.15);border-radius:6px;height:6px;overflow:hidden;">
              <div style="width:${(solved/50)*100}%;height:100%;
                background:linear-gradient(90deg,#FFD700,#ff9800);border-radius:6px;transition:width 0.4s;"></div>
            </div>
          </div>
          <div style="color:#FFD700;font-size:18px;font-weight:bold;">🪙 ${game.state.coins.toLocaleString()}</div>
        </div>

        <!-- Scrollable room wrapper -->
        <div id="exRoomWrap" style="position:absolute;top:58px;left:0;right:0;bottom:0;
          overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;">
        <div id="exRoom" style="position:relative;height:100%;width:${ROOM_VW}vw;flex-shrink:0;">

          <!-- Zone labels -->
          ${ZONE_LABELS.map(z =>
            `<div style="position:absolute;left:${z.vw}vw;top:8px;
              color:rgba(255,255,255,0.25);font-size:14px;font-weight:bold;white-space:nowrap;">
              ${z.label}
            </div>`
          ).join("")}

          <!-- Floor line -->
          <div style="position:absolute;bottom:80px;left:0;width:100%;height:3px;
            background:rgba(255,255,255,0.1);"></div>

          <!-- Objects -->
          ${OBJS.map(o => {
            const isSolved = this._solvedSet.has(o.id);
            return `<div
              id="exObj${o.id}"
              class="ex-obj${isSolved ? " solved" : ""}"
              data-id="${o.id}"
              style="position:absolute;left:${o.vw}vw;bottom:90px;
                font-size:clamp(36px,8vw,54px);text-align:center;line-height:1;
                animation-delay:${(o.id * 0.17) % 2}s;">
              ${o.emoji}
              ${isSolved
                ? `<div style="position:absolute;top:-8px;right:-8px;font-size:18px;">✅</div>`
                : ""}
              <div style="font-size:10px;color:rgba(255,255,255,0.5);text-align:center;white-space:nowrap;
                margin-top:2px;">${o.label}</div>
            </div>`;
          }).join("")}

          <!-- Stars bg -->
          ${Array.from({length:20},(_,i)=>`<div style="position:absolute;
            left:${(i*47+13)%490}vw;top:${(i*31+10)%60+5}%;
            width:2px;height:2px;border-radius:50%;background:white;
            opacity:${0.2+(i%5)*0.08};pointer-events:none;"></div>`).join("")}
        </div>

        </div><!-- end exRoom -->
        </div><!-- end exRoomWrap -->

        <!-- Scroll hint -->
        <div style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
          color:rgba(255,255,255,0.3);font-size:12px;pointer-events:none;white-space:nowrap;">
          ← scroll to explore → • tap a clock to solve it
        </div>
      </div>
    `;

    // Back button
    document.getElementById("exBack")!.onclick = () => {
      game.inMiniGame = false;
      game.goTitle();
    };

    // Click handler — browser's native scroll handles movement
    const room = document.getElementById("exRoom")!;
    const onClick = (e: MouseEvent) => {
      if (this._puzzleOpen) return;
      const objEl = (e.target as HTMLElement).closest("[data-id]") as HTMLElement | null;
      if (objEl) this._clickObj(game, parseInt(objEl.dataset.id!));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (this._puzzleOpen) return;
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const objEl = el?.closest("[data-id]") as HTMLElement | null;
      if (objEl) this._clickObj(game, parseInt(objEl.dataset.id!));
    };
    room.addEventListener("click",    onClick);
    room.addEventListener("touchend", onTouchEnd);
    this._cleanup.push(() => {
      room.removeEventListener("click",    onClick);
      room.removeEventListener("touchend", onTouchEnd);
    });
  }

  private _clickObj(game: Game, id: number): void {
    if (this._solvedSet.has(id) || this._puzzleOpen) return;
    const obj = OBJS.find(o => o.id === id);
    if (!obj) return;

    if (obj.type === 6) {
      // Cat cleaning — navigate away
      this._puzzleOpen = true;
      import("./games/CatCleaning").then(({ CatCleaning }) => {
        new CatCleaning(game, () => {
          this._onSolve(game, id);
        });
      });
      return;
    }

    this._showPuzzleOverlay(game, obj);
  }

  // ── Puzzle overlay ──────────────────────────────────────────────────────────
  private _showPuzzleOverlay(game: Game, obj: EObj): void {
    this._puzzleOpen = true;
    const ov = document.createElement("div");
    ov.id = "exPuzzleOv";
    ov.style.cssText =
      "position:absolute;inset:0;z-index:50;" +
      "background:rgba(0,0,0,0.85);backdrop-filter:blur(6px);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:Arial,sans-serif;";

    const card = document.createElement("div");
    card.style.cssText =
      "background:linear-gradient(135deg,#1a0a3e,#3a106f);" +
      "border:2px solid rgba(255,215,0,0.4);border-radius:20px;" +
      "padding:24px;width:min(360px,92vw);max-height:80vh;overflow-y:auto;" +
      "display:flex;flex-direction:column;align-items:center;gap:12px;";

    const hdr = document.createElement("div");
    hdr.style.cssText = "text-align:center;";
    hdr.innerHTML =
      `<div style="font-size:44px;margin-bottom:4px;">${obj.emoji}</div>` +
      `<div style="color:#FFD700;font-size:18px;font-weight:bold;">${obj.label}</div>` +
      `<div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:2px;">Clock #${obj.id + 1} of 50</div>`;
    card.appendChild(hdr);

    const content = document.createElement("div");
    content.style.cssText = "width:100%;";
    card.appendChild(content);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;margin-top:8px;";
    const backBtn = document.createElement("button");
    backBtn.textContent = "← Back to Room";
    backBtn.style.cssText =
      "background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.2);" +
      "color:rgba(255,255,255,0.7);padding:8px 18px;border-radius:12px;font-size:13px;cursor:pointer;";
    backBtn.onclick = () => this._closePuzzle(game);
    const homeBtn = document.createElement("button");
    homeBtn.textContent = "🏠 Home";
    homeBtn.style.cssText = backBtn.style.cssText;
    homeBtn.onclick = () => { game.inMiniGame = false; game.goTitle(); };
    btnRow.appendChild(backBtn);
    btnRow.appendChild(homeBtn);
    card.appendChild(btnRow);

    ov.appendChild(card);
    game.ui.appendChild(ov);

    const onSolve = () => {
      this._puzzleTimers.push(setTimeout(() => {
        this._closePuzzle(game);
        this._onSolve(game, obj.id);
      }, 1800));
    };

    switch (obj.type) {
      case 0: this._pSpeedTap(content, onSolve, obj.emoji); break;
      case 1: this._pMath(content, onSolve);     break;
      case 2: this._pWhack(content, onSolve, obj.emoji); break;
      case 3: this._pMemory(content, onSolve, obj.emoji); break;
      case 4: this._pRain(content, onSolve, obj.emoji);  break;
      case 5: this._pGrid(content, onSolve);     break;
    }
  }

  private _closePuzzle(game: Game): void {
    document.getElementById("exPuzzleOv")?.remove();
    this._puzzleOpen = false;
  }

  // ── Puzzle type 0: Speed Tap ─────────────────────────────────────────────
  private _pSpeedTap(el: HTMLDivElement, onSolve: () => void, emoji: string): void {
    let hits = 0;
    const NEED = 5;
    el.innerHTML = `
      <div style="text-align:center;color:white;font-size:15px;margin-bottom:12px;">
        Tap the clock <b>${NEED}</b> times! ⚡
      </div>
      <div style="text-align:center;">
        <div id="stBtn" style="font-size:52px;cursor:pointer;display:inline-block;
          transition:transform 0.1s;">
          ${emoji}
        </div>
        <div id="stCount" style="color:#FFD700;font-size:22px;font-weight:bold;margin-top:8px;">
          0 / ${NEED}
        </div>
      </div>`;
    const btn = document.getElementById("stBtn")!;
    const cnt = document.getElementById("stCount")!;
    btn.onclick = () => {
      if (hits >= NEED) return;
      hits++;
      btn.style.transform = "scale(1.4)";
      setTimeout(() => btn.style.transform = "scale(1)", 120);
      cnt.textContent = `${hits} / ${NEED}`;
      if (hits >= NEED) {
        btn.style.filter = "drop-shadow(0 0 16px gold)";
        cnt.style.color = "#00ff88";
        cnt.textContent = "✅ Done!";
        onSolve();
      }
    };
  }

  // ── Puzzle type 1: Math Quiz ─────────────────────────────────────────────
  private _pMath(el: HTMLDivElement, onSolve: () => void): void {
    const r = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
    const qs = Array.from({length: 3}, () => {
      const a = r(2, 12), b = r(2, 12), op = ["+","−","×"][r(0,2)];
      const ans = op === "+" ? a + b : op === "−" ? a - b : a * b;
      return { q: `${a} ${op} ${b}`, ans };
    });
    let qi = 0;

    const render = () => {
      const q = qs[qi];
      el.innerHTML = `
        <div style="text-align:center;color:white;font-size:15px;margin-bottom:10px;">
          Question ${qi + 1} of ${qs.length} 🧮
        </div>
        <div style="text-align:center;color:#FFD700;font-size:32px;font-weight:bold;margin-bottom:16px;">
          ${q.q} = ?
        </div>
        <div id="mathOpts" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;"></div>
        <div id="mathFb" style="text-align:center;font-size:15px;margin-top:10px;height:20px;"></div>`;

      const opts = new Set([q.ans]);
      while (opts.size < 4) opts.add(q.ans + r(-6, 6));
      const shuffled = [...opts].sort(() => Math.random() - 0.5);

      const optDiv = document.getElementById("mathOpts")!;
      for (const opt of shuffled) {
        const b = document.createElement("button");
        b.textContent = String(opt);
        b.style.cssText =
          "background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.3);" +
          "color:white;font-size:20px;font-weight:bold;width:64px;height:48px;" +
          "border-radius:10px;cursor:pointer;";
        b.onclick = () => {
          const fb = document.getElementById("mathFb")!;
          if (opt === q.ans) {
            b.style.background = "rgba(0,200,0,0.4)";
            fb.style.color = "#00ff88";
            fb.textContent = "✅ Correct!";
            qi++;
            if (qi >= qs.length) { onSolve(); }
            else { this._puzzleTimers.push(setTimeout(render, 800)); }
          } else {
            b.style.background = "rgba(200,0,0,0.4)";
            fb.style.color = "#ff6666";
            fb.textContent = "❌ Try again!";
            this._puzzleTimers.push(setTimeout(() => { b.style.background = ""; fb.textContent = ""; }, 700));
          }
        };
        optDiv.appendChild(b);
      }
    };
    render();
  }

  // ── Puzzle type 2: Whack ─────────────────────────────────────────────────
  private _pWhack(el: HTMLDivElement, onSolve: () => void, emoji: string): void {
    let hits = 0;
    const NEED = 5;
    let active = true;
    el.innerHTML = `
      <div style="text-align:center;color:white;font-size:15px;margin-bottom:6px;">
        Tap <b>${NEED}</b> clocks before they escape! ⚡
      </div>
      <div id="whackCount" style="text-align:center;color:#FFD700;font-size:20px;font-weight:bold;margin-bottom:8px;">
        0 / ${NEED}
      </div>
      <div id="whackArea" style="position:relative;width:100%;height:160px;
        background:rgba(255,255,255,0.05);border-radius:12px;overflow:hidden;"></div>`;

    const area = document.getElementById("whackArea")!;
    const cnt  = document.getElementById("whackCount")!;

    const spawnMole = () => {
      if (!active) return;
      const m = document.createElement("div");
      m.textContent = emoji;
      m.style.cssText =
        `position:absolute;font-size:36px;cursor:pointer;` +
        `left:${Math.random() * 75}%;top:${Math.random() * 65}%;` +
        "transition:opacity 0.2s;";
      area.appendChild(m);

      const hide = () => { m.style.opacity = "0"; setTimeout(() => m.remove(), 200); };
      const t = this._puzzleTimers[this._puzzleTimers.push(setTimeout(hide, 1200)) - 1];

      m.onclick = () => {
        clearTimeout(t);
        hide();
        hits++;
        cnt.textContent = `${hits} / ${NEED}`;
        if (hits >= NEED) {
          active = false;
          cnt.style.color = "#00ff88";
          cnt.textContent = "✅ Got them all!";
          onSolve();
        }
      };
      if (active) this._puzzleTimers.push(setTimeout(spawnMole, 700 + Math.random() * 400));
    };
    spawnMole();
  }

  // ── Puzzle type 3: Memory ────────────────────────────────────────────────
  private _pMemory(el: HTMLDivElement, onSolve: () => void, emoji: string): void {
    const PAIRS = ["🕐","🕑","🕒",emoji].slice(0,3);
    const cards = [...PAIRS, ...PAIRS].sort(() => Math.random() - 0.5)
      .map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }));
    let first: typeof cards[0] | null = null;
    let locked = false;
    let matches = 0;

    const render = () => {
      el.innerHTML = `
        <div style="text-align:center;color:white;font-size:14px;margin-bottom:10px;">
          Match the pairs! 🃏
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${cards.map(c => `
            <div data-cid="${c.id}" style="
              height:60px;border-radius:10px;cursor:pointer;
              background:${c.flipped || c.matched
                ? "rgba(255,255,255,0.15)"
                : "rgba(255,255,255,0.06)"};
              border:2px solid ${c.matched
                ? "rgba(0,255,0,0.5)"
                : c.flipped
                  ? "rgba(255,215,0,0.6)"
                  : "rgba(255,255,255,0.1)"};
              display:flex;align-items:center;justify-content:center;
              font-size:${c.flipped || c.matched ? "30px" : "20px"};
              transition:all 0.2s;">
              ${c.flipped || c.matched ? c.emoji : "❓"}
            </div>`
          ).join("")}
        </div>`;

      el.querySelectorAll("[data-cid]").forEach(div => {
        (div as HTMLDivElement).onclick = () => {
          if (locked) return;
          const cid = parseInt((div as HTMLDivElement).dataset.cid!);
          const card = cards.find(c => c.id === cid)!;
          if (card.flipped || card.matched) return;
          card.flipped = true;
          render();
          if (!first) { first = card; return; }
          locked = true;
          if (first.emoji === card.emoji) {
            first.matched = card.matched = true;
            first = null; locked = false;
            matches++;
            render();
            if (matches >= PAIRS.length) {
              el.querySelector<HTMLDivElement>("[data-cid]")!.style.pointerEvents = "none";
              onSolve();
            }
          } else {
            this._puzzleTimers.push(setTimeout(() => {
              first!.flipped = card.flipped = false;
              first = null; locked = false;
              render();
            }, 900));
          }
        };
      });
    };
    render();
  }

  // ── Puzzle type 4: Rain Catch ─────────────────────────────────────────────
  private _pRain(el: HTMLDivElement, onSolve: () => void, emoji: string): void {
    let caught = 0;
    const NEED = 5;
    let active = true;
    el.innerHTML = `
      <div style="text-align:center;color:white;font-size:14px;margin-bottom:6px;">
        Catch <b>${NEED}</b> falling clocks! 🌧️
      </div>
      <div id="rainCaught" style="text-align:center;color:#FFD700;font-size:20px;font-weight:bold;margin-bottom:6px;">
        0 / ${NEED}
      </div>
      <div id="rainArea" style="position:relative;width:100%;height:160px;
        background:rgba(255,255,255,0.05);border-radius:12px;overflow:hidden;"></div>`;

    const area  = document.getElementById("rainArea")!;
    const cntEl = document.getElementById("rainCaught")!;

    const spawnDrop = () => {
      if (!active) return;
      const d = document.createElement("div");
      d.textContent = emoji;
      d.style.cssText =
        `position:absolute;font-size:28px;cursor:pointer;` +
        `left:${5 + Math.random() * 80}%;top:-10%;` +
        "transition:top 1.6s linear;";
      area.appendChild(d);

      this._puzzleTimers.push(setTimeout(() => { d.style.top = "90%"; }, 50));
      const clean = this._puzzleTimers.push(setTimeout(() => d.remove(), 1700));

      d.onclick = () => {
        d.remove();
        caught++;
        cntEl.textContent = `${caught} / ${NEED}`;
        if (caught >= NEED) {
          active = false;
          cntEl.style.color = "#00ff88";
          cntEl.textContent = "✅ All caught!";
          onSolve();
        }
      };
      if (active) this._puzzleTimers.push(setTimeout(spawnDrop, 600 + Math.random() * 500));
    };
    spawnDrop();
  }

  // ── Puzzle type 5: Color Grid ─────────────────────────────────────────────
  private _pGrid(el: HTMLDivElement, onSolve: () => void): void {
    const COLS = ["#e74c3c","#3498db","#2ecc71","#f39c12","#9b59b6"];
    const target = Array.from({length: 9}, () => COLS[Math.floor(Math.random() * COLS.length)]);
    const player = Array(9).fill(COLS[0]);
    let matches = 0;

    const render = () => {
      matches = player.filter((c, i) => c === target[i]).length;
      el.innerHTML = `
        <div style="text-align:center;color:white;font-size:13px;margin-bottom:8px;">
          Match all 9 colors! Click to cycle. 🎨 (${matches}/9 matched)
        </div>
        <div style="display:flex;gap:16px;justify-content:center;align-items:start;">
          <div>
            <div style="color:rgba(255,255,255,0.5);font-size:11px;text-align:center;margin-bottom:4px;">TARGET</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
              ${target.map(c => `<div style="width:36px;height:36px;border-radius:6px;background:${c};"></div>`).join("")}
            </div>
          </div>
          <div>
            <div style="color:rgba(255,255,255,0.5);font-size:11px;text-align:center;margin-bottom:4px;">YOURS</div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
              ${player.map((c, i) => `
                <div data-gi="${i}" style="width:36px;height:36px;border-radius:6px;background:${c};cursor:pointer;
                  border:2px solid ${c === target[i] ? "#00ff88" : "rgba(255,255,255,0.2)"};"></div>`
              ).join("")}
            </div>
          </div>
        </div>`;

      el.querySelectorAll("[data-gi]").forEach(d => {
        (d as HTMLDivElement).onclick = () => {
          const i = parseInt((d as HTMLDivElement).dataset.gi!);
          player[i] = COLS[(COLS.indexOf(player[i]) + 1) % COLS.length];
          render();
          if (player.every((c, j) => c === target[j])) {
            onSolve();
          }
        };
      });
    };
    render();
  }

  // ── Win screen ──────────────────────────────────────────────────────────────
  private _showWin(game: Game): void {
    game.state.coins += 500;
    game.save();
    game.ui.innerHTML = `
      <div style="position:absolute;inset:0;
        background:linear-gradient(135deg,#0d1117,#1a1a00);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:Arial,sans-serif;pointer-events:all;gap:16px;text-align:center;padding:24px;">
        <div style="font-size:72px;">👑</div>
        <div style="color:#FFD700;font-size:36px;font-weight:900;
          text-shadow:0 0 30px gold;">EXTREME COMPLETE!</div>
        <div style="color:white;font-size:18px;">You found all 50 clocks!</div>
        <div style="color:#FFD700;font-size:16px;">+🪙 500 bonus coins!</div>
        <button id="winBack" style="margin-top:16px;background:linear-gradient(135deg,#b8860b,#FFD700);
          border:none;border-radius:16px;color:#1a0a00;font-size:18px;font-weight:bold;
          padding:14px 40px;cursor:pointer;">🏠 Back to Menu</button>
      </div>`;
    document.getElementById("winBack")!.onclick = () => {
      game.inMiniGame = false;
      game.goTitle();
    };
  }
}
