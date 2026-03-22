/**
 * MiniPuzzle — 12 puzzles (one per clock slot), each awards exactly 1 clock number.
 * 6 different puzzle types across 12 slots (no back-to-back repeats).
 * All puzzles need 5 successful actions to complete.
 */
import { colorForNumber, positionToNumber } from "../game/clockData";
import type { Game } from "../game/Game";

// Better variety: 6 types × 2 each, no adjacent repeats
// 0=SpeedTap  1=Balloon  2=Whack  3=Memory  4=Rain  5=Grid
const TYPE_MAP = [0, 1, 2, 3, 4, 5, 3, 0, 4, 1, 5, 2];

// ── helpers ───────────────────────────────────────────────────────────────────
function hex2rgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const VLAD = `<div style="display:flex;align-items:center;gap:6px;">
  <div style="width:48px;height:48px;border-radius:50%;background:#FF4444;
    border:3px solid white;display:flex;align-items:center;justify-content:center;
    font-size:24px;">😁</div>
  <span style="color:#FF8888;font-weight:bold;font-size:12px;text-shadow:1px 1px 0 black;">Vlad</span>
</div>`;

const NIKI = `<div style="display:flex;align-items:center;gap:6px;flex-direction:row-reverse;">
  <div style="width:48px;height:48px;border-radius:50%;background:#4D96FF;
    border:3px solid white;display:flex;align-items:center;justify-content:center;
    font-size:24px;">😄</div>
  <span style="color:#4D96FF;font-weight:bold;font-size:12px;text-shadow:1px 1px 0 black;">Niki</span>
</div>`;

// ── Main class ─────────────────────────────────────────────────────────────────
export class MiniPuzzle {
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private done = false;

  constructor(game: Game, slotPosition: number) {
    const targetNum = positionToNumber(slotPosition);
    const type = TYPE_MAP[slotPosition] ?? (slotPosition % 6);

    switch (type) {
      case 0: this._buildSpeedTap(game, targetNum); break;
      case 1: this._buildBalloon(game, targetNum);  break;
      case 2: this._buildWhack(game, targetNum);    break;
      case 3: this._buildMemory(game, targetNum);   break;
      case 4: this._buildRain(game, targetNum);     break;
      case 5: this._buildGrid(game, targetNum);     break;
    }

    game._disposeScene = () => {
      this.done = true;
      this.timeouts.forEach(t => clearTimeout(t));
      game.ui.innerHTML = "";
    };
  }

  private _later(ms: number, fn: () => void): void {
    this.timeouts.push(setTimeout(fn, ms));
  }

  private _complete(game: Game, num: number, emoji: string, msg: string): void {
    // Auto-place the number on the clock
    game.placeNumber(num);

    const screen = game.ui.querySelector(".screen");
    const ov = document.createElement("div");
    ov.style.cssText = `position:absolute;top:0;left:0;right:0;bottom:0;
      background:rgba(0,0,0,0.75);display:flex;align-items:center;
      justify-content:center;flex-direction:column;pointer-events:none;z-index:99;`;
    ov.innerHTML = `
      <div style="font-size:72px;margin-bottom:8px;">${emoji}</div>
      <div style="color:#FFD700;font-size:28px;font-weight:bold;text-align:center;padding:0 20px;">${msg}</div>
      <div style="color:white;font-size:18px;margin-top:10px;">
        Number <span style="color:${colorForNumber(num)};font-weight:bold;font-size:26px;
          text-shadow:0 0 14px ${colorForNumber(num)};">${num}</span> placed on the clock!
      </div>
      <div style="color:rgba(255,255,255,0.6);font-size:14px;margin-top:8px;">
        ${game.state.unlockedLocks.size} / 12 found — back to exploring!
      </div>
    `;
    screen?.appendChild(ov);

    if (game.state.unlockedLocks.size >= 12) {
      this._later(2200, () => {
        game.goClock();
        setTimeout(() => game.goEnding(), 3000);
      });
    } else {
      this._later(2200, () => game.goExplore());
    }
  }

  private _wrapper(bg: string, title: string, instr: string): string {
    return `
      <style>
        @keyframes mpPop   { 0%{transform:scale(1)} 60%{transform:scale(1.5)} 100%{transform:scale(0);opacity:0} }
        @keyframes mpShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
      </style>
      <div class="screen" style="background:${bg};position:relative;overflow:hidden;">
        <div style="position:absolute;top:10px;left:10px;">${VLAD}</div>
        <div style="position:absolute;top:10px;right:10px;">${NIKI}</div>
        <h2 style="position:absolute;top:12px;left:0;right:0;text-align:center;
          color:white;font-size:22px;font-weight:bold;pointer-events:none;
          text-shadow:2px 2px 4px rgba(0,0,0,0.6);">${title}</h2>
        <div id="mpInstr" style="position:absolute;top:52px;left:0;right:0;
          text-align:center;color:rgba(255,255,255,0.85);font-size:15px;pointer-events:none;">
          ${instr}</div>
        <div id="mpContent" style="position:absolute;top:0;left:0;right:0;bottom:0;
          pointer-events:all;"></div>
        <button id="backBtn" style="position:absolute;bottom:14px;left:14px;
          background:rgba(0,0,0,0.4);color:white;font-size:13px;padding:7px 14px;
          border-radius:20px;border:2px solid rgba(255,255,255,0.5);
          pointer-events:all;cursor:pointer;">← Back to Room</button>
        <button id="homeBtn" style="position:absolute;bottom:14px;right:14px;
          background:rgba(0,0,0,0.4);color:white;font-size:13px;padding:7px 14px;
          border-radius:20px;border:2px solid rgba(255,255,255,0.5);
          pointer-events:all;cursor:pointer;">🏠 Home</button>
      </div>`;
  }

  // ── PUZZLE TYPE 0: SPEED TAP ─────────────────────────────────────────────
  private _buildSpeedTap(game: Game, num: number): void {
    const color = colorForNumber(num);
    game.ui.innerHTML = this._wrapper(
      `linear-gradient(135deg,#1a0060,#4a00a0,#7a20d0)`,
      `⚡ Speed Tap! — Number ${num}`,
      `Tap the ${num} five times! It moves fast! ⚡`
    );
    document.getElementById("backBtn")!.onclick = () => game.goExplore();
    document.getElementById("homeBtn")!.onclick = () => game.goTitle();

    const content = document.getElementById("mpContent")!;
    let hits = 0;
    const NEED = 5;

    const numBtn = document.createElement("div");
    numBtn.style.cssText = `
      position:absolute;
      width:84px;height:84px;border-radius:50%;
      background:${color};border:5px solid white;
      display:flex;align-items:center;justify-content:center;
      font-size:34px;font-weight:bold;color:white;
      cursor:pointer;user-select:none;
      box-shadow:0 0 20px rgba(${hex2rgb(color)},0.8);
      transition:transform 0.1s;
    `;
    numBtn.textContent = String(num);
    content.appendChild(numBtn);

    const counter = document.createElement("div");
    counter.style.cssText = `position:absolute;bottom:60px;left:0;right:0;
      text-align:center;color:white;font-size:22px;font-weight:bold;pointer-events:none;`;
    counter.textContent = `0 / ${NEED}`;
    content.appendChild(counter);

    const move = () => {
      const maxX = window.innerWidth - 110;
      const maxY = window.innerHeight - 200;
      numBtn.style.left = `${80 + Math.random() * (maxX - 80)}px`;
      numBtn.style.top  = `${120 + Math.random() * (maxY - 120)}px`;
    };
    move();

    // Auto-move every 1.3s
    const autoMove = setInterval(() => {
      if (this.done) { clearInterval(autoMove); return; }
      numBtn.style.animation = "mpShake 0.18s ease";
      this._later(200, () => { numBtn.style.animation = ""; move(); });
    }, 1300);
    this.timeouts.push(autoMove as unknown as ReturnType<typeof setTimeout>);

    numBtn.onclick = () => {
      if (this.done) return;
      hits++;
      counter.textContent = `${hits} / ${NEED}`;
      numBtn.style.transform = "scale(0.75)";
      this._later(110, () => { numBtn.style.transform = "scale(1)"; });
      if (hits >= NEED) {
        this.done = true;
        clearInterval(autoMove);
        numBtn.style.animation = "mpPop 0.4s ease forwards";
        this._later(100, () => this._complete(game, num, "⚡✨", `Speedy tapper!`));
      } else {
        move();
      }
    };
  }

  // ── PUZZLE TYPE 1: BALLOON POP ───────────────────────────────────────────
  private _buildBalloon(game: Game, num: number): void {
    const color = colorForNumber(num);
    game.ui.innerHTML = this._wrapper(
      `linear-gradient(160deg,#87CEEB,#b0e0ff,#c8f0ff)`,
      `🎈 Pop the Balloon! — Number ${num}`,
      `Tap the ${num} balloon 5 times before it floats away!`
    );
    document.getElementById("backBtn")!.onclick = () => game.goExplore();
    document.getElementById("homeBtn")!.onclick = () => game.goTitle();

    const content = document.getElementById("mpContent")!;
    let pops = 0;
    const NEED = 5;

    const counter = document.createElement("div");
    counter.id = "mpCounter";
    counter.style.cssText = `position:absolute;bottom:60px;left:0;right:0;
      text-align:center;color:#1a0060;font-size:22px;font-weight:bold;pointer-events:none;`;
    counter.textContent = `0 / ${NEED}`;
    content.appendChild(counter);

    const makeBalloon = () => {
      if (this.done) return;
      const wrap = document.createElement("div");
      const startX = 30 + Math.random() * (window.innerWidth - 130);
      wrap.style.cssText = `position:absolute;left:${startX}px;bottom:-120px;
        display:flex;flex-direction:column;align-items:center;
        cursor:pointer;pointer-events:all;`;

      wrap.innerHTML = `
        <div style="width:90px;height:90px;border-radius:50%;
          background:${color};border:4px solid rgba(255,255,255,0.7);
          display:flex;align-items:center;justify-content:center;
          font-size:34px;font-weight:bold;color:white;
          box-shadow:0 6px 20px rgba(0,0,0,0.2);">${num}</div>
        <div style="width:3px;height:28px;background:rgba(0,0,0,0.25);"></div>`;

      content.appendChild(wrap);

      let bottom = -120;
      const rise = setInterval(() => {
        if (this.done) { clearInterval(rise); wrap.remove(); return; }
        bottom += 1.8;
        wrap.style.bottom = `${bottom}px`;
        if (bottom > window.innerHeight + 50) {
          clearInterval(rise);
          wrap.remove();
          if (!this.done) this._later(300, makeBalloon);
        }
      }, 16);
      this.timeouts.push(rise as unknown as ReturnType<typeof setTimeout>);

      wrap.onclick = () => {
        if (this.done) return;
        clearInterval(rise);
        pops++;
        counter.textContent = `${pops} / ${NEED}`;

        wrap.style.animation = "mpPop 0.3s ease forwards";
        this._later(300, () => wrap.remove());

        if (pops >= NEED) {
          this.done = true;
          this._later(200, () => this._complete(game, num, "🎈💥", `Pop pop pop!`));
        } else {
          this._later(500, makeBalloon);
        }
      };
    };

    this._later(400, makeBalloon);
  }

  // ── PUZZLE TYPE 2: WHACK-A-MOLE ──────────────────────────────────────────
  private _buildWhack(game: Game, num: number): void {
    const color = colorForNumber(num);
    game.ui.innerHTML = this._wrapper(
      `linear-gradient(135deg,#4a7c20,#7ab648,#a0d060)`,
      `🔨 Whack-a-Mole! — Number ${num}`,
      `Whack the ${num} mole 5 times! Fast!`
    );
    document.getElementById("backBtn")!.onclick = () => game.goExplore();
    document.getElementById("homeBtn")!.onclick = () => game.goTitle();

    const content = document.getElementById("mpContent")!;
    let whacks = 0;
    const NEED = 5;

    // 6 holes 3x2
    const COLS = 3, ROWS = 2;
    const HW = 90, GAP = 20;
    const gridW = COLS * HW + (COLS - 1) * GAP;
    const gridH = ROWS * HW + (ROWS - 1) * GAP;
    const offX = (window.innerWidth - gridW) / 2;
    const offY = (window.innerHeight - gridH) / 2 + 10;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const holeIdx = r * COLS + c;
        const hole = document.createElement("div");
        hole.dataset["hole"] = String(holeIdx);
        hole.style.cssText = `position:absolute;
          left:${offX + c * (HW + GAP)}px;top:${offY + r * (HW + GAP)}px;
          width:${HW}px;height:${HW}px;border-radius:50%;
          background:rgba(80,40,0,0.45);border:4px solid rgba(60,30,0,0.4);
          overflow:hidden;display:flex;align-items:flex-end;justify-content:center;`;

        const mole = document.createElement("div");
        mole.id = `mole${holeIdx}`;
        mole.style.cssText = `width:80px;height:80px;border-radius:50%;
          background:transparent;border:none;
          display:flex;align-items:center;justify-content:center;
          font-size:28px;font-weight:bold;color:white;
          transform:translateY(90px);transition:transform 0.18s ease;
          cursor:pointer;pointer-events:all;`;
        hole.appendChild(mole);
        content.appendChild(hole);
      }
    }

    const counter = document.createElement("div");
    counter.style.cssText = `position:absolute;bottom:60px;left:0;right:0;
      text-align:center;color:white;font-size:22px;font-weight:bold;pointer-events:none;
      text-shadow:1px 1px 3px black;`;
    counter.textContent = `0 / ${NEED}`;
    content.appendChild(counter);

    let activeHole = -1;

    const spawnMole = () => {
      if (this.done) return;
      const holeIdx = Math.floor(Math.random() * (COLS * ROWS));
      const mole = document.getElementById(`mole${holeIdx}`)!;
      activeHole = holeIdx;
      mole.style.background = color;
      mole.style.boxShadow = `0 0 14px rgba(${hex2rgb(color)},0.7)`;
      mole.textContent = String(num);
      mole.style.transform = "translateY(0)";

      const hideTimer = setTimeout(() => {
        if (this.done) return;
        if (activeHole === holeIdx) {
          mole.style.transform = "translateY(90px)";
          this._later(200, () => {
            mole.style.background = "transparent";
            mole.textContent = "";
            activeHole = -1;
          });
        }
        this._later(600, spawnMole);
      }, 1400);
      this.timeouts.push(hideTimer);

      mole.onclick = () => {
        if (this.done || activeHole !== holeIdx) return;
        clearTimeout(hideTimer);
        activeHole = -1;
        whacks++;
        counter.textContent = `${whacks} / ${NEED}`;

        mole.style.animation = "mpPop 0.25s ease forwards";
        this._later(250, () => {
          mole.style.animation = "";
          mole.style.transform = "translateY(90px)";
          mole.style.background = "transparent";
          mole.textContent = "";
        });

        if (whacks >= NEED) {
          this.done = true;
          this._later(100, () => this._complete(game, num, "🔨💥", `Mole demolished!`));
        } else {
          this._later(600, spawnMole);
        }
      };
    };

    this._later(800, spawnMole);
  }

  // ── PUZZLE TYPE 3: MEMORY MATCH ──────────────────────────────────────────
  private _buildMemory(game: Game, num: number): void {
    const otherNums = [1,2,3,4,5,6,7,8,9,10,11,12].filter(n => n !== num);
    const dA = otherNums[Math.floor(Math.random() * otherNums.length)];
    let dB = dA;
    while (dB === dA) dB = otherNums[Math.floor(Math.random() * otherNums.length)];

    const deck = [num, num, dA, dA, dB, dB];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    game.ui.innerHTML = this._wrapper(
      `linear-gradient(135deg,#1a0060,#3a006f,#7700cc)`,
      `🃏 Memory Match! — Find the ${num}`,
      `Find BOTH cards with number ${num}!`
    );
    document.getElementById("backBtn")!.onclick = () => game.goExplore();
    document.getElementById("homeBtn")!.onclick = () => game.goTitle();

    const content = document.getElementById("mpContent")!;
    const CW = 90, CH = 110, GAP = 16;
    const COLS = 3, ROWS = 2;
    const gridW = COLS * CW + (COLS - 1) * GAP;
    const gridH = ROWS * CH + (ROWS - 1) * GAP;
    const offX = (window.innerWidth - gridW) / 2;
    const offY = (window.innerHeight - gridH) / 2 + 10;

    let flipped: number[] = [];
    let busy = false;

    deck.forEach((cardNum, i) => {
      const c = i % COLS, r = Math.floor(i / COLS);
      const card = document.createElement("div");
      card.dataset["idx"] = String(i);
      card.dataset["num"] = String(cardNum);
      card.dataset["state"] = "hidden";
      card.style.cssText = `position:absolute;
        left:${offX + c * (CW + GAP)}px;top:${offY + r * (CH + GAP)}px;
        width:${CW}px;height:${CH}px;border-radius:14px;
        background:#3a006f;border:3px solid rgba(255,255,255,0.35);
        display:flex;align-items:center;justify-content:center;
        font-size:30px;cursor:pointer;pointer-events:all;
        transition:transform 0.15s;user-select:none;`;
      card.textContent = "🕐";
      content.appendChild(card);

      card.onclick = () => {
        if (this.done || busy) return;
        if (card.dataset["state"] !== "hidden") return;
        if (flipped.length >= 2) return;

        card.dataset["state"] = "shown";
        card.style.background = colorForNumber(cardNum);
        card.style.color = "white";
        card.style.fontWeight = "bold";
        card.style.fontSize = "34px";
        card.textContent = String(cardNum);
        flipped.push(i);

        if (flipped.length === 2) {
          busy = true;
          const [i1, i2] = flipped;
          const c1 = content.querySelector<HTMLElement>(`[data-idx="${i1}"]`)!;
          const c2 = content.querySelector<HTMLElement>(`[data-idx="${i2}"]`)!;

          if (c1.dataset["num"] === c2.dataset["num"]) {
            c1.dataset["state"] = "matched";
            c2.dataset["state"] = "matched";
            c1.style.boxShadow = `0 0 20px white`;
            c2.style.boxShadow = `0 0 20px white`;
            flipped = [];
            busy = false;

            if (c1.dataset["num"] === String(num)) {
              this.done = true;
              this._later(300, () => this._complete(game, num, "🃏✨", `Found the match!`));
            }
          } else {
            this._later(900, () => {
              [c1, c2].forEach(el => {
                el.dataset["state"] = "hidden";
                el.style.background = "#3a006f";
                el.style.color = "";
                el.style.fontSize = "30px";
                el.style.fontWeight = "";
                el.textContent = "🕐";
              });
              flipped = [];
              busy = false;
            });
          }
        }
      };
    });
  }

  // ── PUZZLE TYPE 4: NUMBER RAIN ───────────────────────────────────────────
  private _buildRain(game: Game, num: number): void {
    const color = colorForNumber(num);
    game.ui.innerHTML = this._wrapper(
      `linear-gradient(180deg,#001a4a,#003090,#0050cc)`,
      `🌧️ Number Rain! — ${num}`,
      `Catch only the ${num}s! Hit 5! Don't catch the wrong ones!`
    );
    document.getElementById("backBtn")!.onclick = () => game.goExplore();
    document.getElementById("homeBtn")!.onclick = () => game.goTitle();

    const content = document.getElementById("mpContent")!;
    let hits = 0;
    const NEED = 5;

    const counter = document.createElement("div");
    counter.style.cssText = `position:absolute;bottom:60px;left:0;right:0;
      text-align:center;color:white;font-size:22px;font-weight:bold;pointer-events:none;`;
    counter.textContent = `0 / ${NEED}`;
    content.appendChild(counter);

    const otherNums = [1,2,3,4,5,6,7,8,9,10,11,12].filter(n => n !== num);

    const spawnNumber = (isTarget: boolean) => {
      if (this.done) return;
      const n = isTarget ? num : otherNums[Math.floor(Math.random() * otherNums.length)];
      const c = isTarget ? color : "#6a6aaa";
      const x = 30 + Math.random() * (window.innerWidth - 100);

      const el = document.createElement("div");
      el.style.cssText = `
        position:absolute;left:${x}px;top:-70px;
        width:64px;height:64px;border-radius:50%;
        background:${c};border:4px solid rgba(255,255,255,${isTarget ? 0.85 : 0.25});
        display:flex;align-items:center;justify-content:center;
        font-size:26px;font-weight:bold;color:white;
        cursor:pointer;pointer-events:all;user-select:none;
        box-shadow:0 4px 14px rgba(0,0,0,0.5);
      `;
      el.textContent = String(n);
      content.appendChild(el);

      let y = -70;
      const speed = isTarget ? (2.2 + Math.random() * 0.8) : (1.8 + Math.random() * 2);
      const fall = setInterval(() => {
        if (this.done) { clearInterval(fall); el.remove(); return; }
        y += speed;
        el.style.top = `${y}px`;
        if (y > window.innerHeight + 10) {
          clearInterval(fall);
          el.remove();
          if (!this.done) this._later(200 + Math.random() * 400, () => spawnNumber(isTarget));
        }
      }, 16);
      this.timeouts.push(fall as unknown as ReturnType<typeof setTimeout>);

      el.onclick = () => {
        if (this.done) return;
        clearInterval(fall);
        if (isTarget) {
          hits++;
          counter.textContent = `${hits} / ${NEED}`;
          el.style.animation = "mpPop 0.3s ease forwards";
          this._later(300, () => el.remove());
          if (hits >= NEED) {
            this.done = true;
            this._later(100, () => this._complete(game, num, "🌧️✨", "Rain catcher!"));
          } else {
            this._later(300, () => spawnNumber(true));
          }
        } else {
          // Wrong — flash red
          el.style.border = "4px solid #ff4444";
          el.style.background = "#882222";
          el.style.animation = "mpShake 0.3s ease";
          this._later(350, () => { el.remove(); spawnNumber(false); });
        }
      };
    };

    // Spawn initial numbers
    this._later(400, () => spawnNumber(true));
    this._later(900, () => spawnNumber(false));
    this._later(1500, () => spawnNumber(false));
  }

  // ── PUZZLE TYPE 5: GRID FIND ─────────────────────────────────────────────
  private _buildGrid(game: Game, num: number): void {
    game.ui.innerHTML = this._wrapper(
      `linear-gradient(135deg,#1a3a00,#2a5a10,#3a7a20)`,
      `🔍 Find the ${num}!`,
      `Tap ALL tiles showing ${num}! (3 rounds)`
    );
    document.getElementById("backBtn")!.onclick = () => game.goExplore();
    document.getElementById("homeBtn")!.onclick = () => game.goTitle();

    const content = document.getElementById("mpContent")!;
    let round = 0;
    const ROUNDS = 3;

    const roundLabel = document.createElement("div");
    roundLabel.style.cssText = `position:absolute;bottom:60px;left:0;right:0;
      text-align:center;color:white;font-size:18px;font-weight:bold;pointer-events:none;`;
    roundLabel.textContent = `Round 1 / ${ROUNDS}`;
    content.appendChild(roundLabel);

    const otherNums = [1,2,3,4,5,6,7,8,9,10,11,12].filter(n => n !== num);

    const buildRound = () => {
      if (this.done) return;
      round++;
      roundLabel.textContent = `Round ${round} / ${ROUNDS}`;
      content.querySelectorAll(".grid-tile").forEach(el => el.remove());

      const COLS = 3, ROWS = 3;
      const TW = 80, TH = 80, GAP = 14;
      const gridW = COLS * TW + (COLS - 1) * GAP;
      const gridH = ROWS * TH + (ROWS - 1) * GAP;
      const offX = (window.innerWidth - gridW) / 2;
      const offY = (window.innerHeight - gridH) / 2 + 10;

      // Choose 3 random positions for target
      const positions = Array.from({ length: 9 }, (_, i) => i);
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      const targetPositions = new Set(positions.slice(0, 3));
      let remaining = 3;

      for (let i = 0; i < 9; i++) {
        const c = i % COLS, r = Math.floor(i / COLS);
        const isTarget = targetPositions.has(i);
        const tileNum = isTarget ? num : otherNums[Math.floor(Math.random() * otherNums.length)];

        const tile = document.createElement("div");
        tile.className = "grid-tile";
        tile.dataset["target"] = String(isTarget);
        tile.style.cssText = `
          position:absolute;
          left:${offX + c * (TW + GAP)}px;
          top:${offY + r * (TH + GAP)}px;
          width:${TW}px;height:${TH}px;border-radius:14px;
          background:#2a4a10;
          border:3px solid rgba(255,255,255,0.35);
          display:flex;align-items:center;justify-content:center;
          font-size:28px;font-weight:bold;color:white;
          cursor:pointer;pointer-events:all;user-select:none;
          transition:transform 0.1s;
        `;
        tile.textContent = String(tileNum);
        content.appendChild(tile);

        tile.onclick = () => {
          if (this.done) return;
          if (tile.dataset["target"] === "true") {
            tile.style.background = colorForNumber(num);
            tile.style.animation = "mpPop 0.3s ease forwards";
            tile.style.pointerEvents = "none";
            remaining--;
            this._later(300, () => tile.remove());
            if (remaining === 0) {
              if (round >= ROUNDS) {
                this.done = true;
                this._later(200, () => this._complete(game, num, "🔍✨", "Found them all!"));
              } else {
                this._later(500, buildRound);
              }
            }
          } else {
            tile.style.animation = "mpShake 0.3s ease";
            tile.style.background = "#882222";
            this._later(350, () => {
              tile.style.animation = "";
              tile.style.background = "#2a4a10";
            });
          }
        };
      }
    };

    this._later(500, buildRound);
  }
}
