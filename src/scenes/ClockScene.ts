import { positionToNumber, CLOCK_COLORS } from "../game/clockData";
import type { Game } from "../game/Game";

export class ClockScene {
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
    this.render();
  }

  private render(): void {
    const { game } = this;
    const placed = game.state.unlockedLocks;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2 + 10;
    const r  = Math.min(w, h) * 0.30;

    // Clock time: starts 12:00, advances 15 min per puzzle solved
    const solved = placed.size;                     // 0–11 (12 triggers ending)
    const totalMin = solved * 15;                   // 0 – 165 minutes past midnight
    const hh = Math.floor(totalMin / 60);           // 0, 1, 2
    const mm = totalMin % 60;                       // 0, 15, 30, 45
    const timeStr = `${hh === 0 ? 12 : hh}:${mm.toString().padStart(2, "0")} AM`;
    const isSpooky = hh >= 2; // starts looking scary after 2 AM

    // Angles for clock hands (SVG: 0° = 3 o'clock; -90° = 12 o'clock)
    const hourDeg   = -90 + (totalMin / 60) * 30;    // 30° per hour
    const minuteDeg = -90 + mm * 6;                  // 6° per minute

    // Clock slots
    const slotsHTML = Array.from({ length: 12 }, (_, i) => {
      const angle = Math.PI / 2 - i * (Math.PI / 6);
      const x = cx + r * Math.cos(angle) - 36;
      const y = cy - r * Math.sin(angle) - 36;
      const num = positionToNumber(i);
      const isPlaced = placed.has(i);

      const bg     = isPlaced ? CLOCK_COLORS[i] : "rgba(255,255,255,0.10)";
      const border = isPlaced ? "4px solid white" : "3px solid rgba(255,255,255,0.35)";
      const color  = isPlaced ? "white" : "rgba(255,255,255,0.6)";
      const cursor = isPlaced ? "default" : "pointer";
      const glow   = isPlaced ? `box-shadow:0 0 14px ${CLOCK_COLORS[i]};` : "";
      const inner  = isPlaced
        ? `<span style="font-size:22px;font-weight:bold;">${num}</span>`
        : `<span style="font-size:16px;">${num}</span><br><span style="font-size:9px;opacity:0.7;">▶</span>`;

      return `<button class="slot" data-slot="${i}" style="
        position:absolute;left:${x}px;top:${y}px;
        width:72px;height:72px;border-radius:50%;
        background:${bg};border:${border};color:${color};
        cursor:${cursor};pointer-events:all;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        line-height:1.1;${glow}
        transition:transform 0.12s,box-shadow 0.12s;
      ">${inner}</button>`;
    }).join("");

    // Progress dots
    const progressBar = Array.from({ length: 12 }, (_, i) =>
      `<div style="width:16px;height:16px;border-radius:50%;
        background:${placed.has(i) ? CLOCK_COLORS[i] : "rgba(255,255,255,0.12)"};
        border:2px solid rgba(255,255,255,0.3);"></div>`
    ).join("");

    // Vlad & Niki faces react to how close we are to 3 AM
    const vladFace = isSpooky ? "😰" : "😁";
    const nikiFace = isSpooky ? "😰" : "😄";

    game.ui.innerHTML = `
      <div class="screen" style="background:${isSpooky ? "#0a0020" : "#1a0a3e"};
        position:relative;overflow:hidden;transition:background 1s;">

        <!-- Title -->
        <h1 style="position:absolute;top:8px;left:0;right:0;text-align:center;
                   color:white;font-size:26px;font-weight:bold;pointer-events:none;
                   text-shadow:0 0 12px rgba(255,255,255,0.3);">
          🕐 12 Clocks
        </h1>

        <!-- Vlad (left) -->
        <div style="position:absolute;top:6px;left:10px;display:flex;align-items:center;gap:5px;pointer-events:none;">
          <div style="width:44px;height:44px;border-radius:50%;background:#FF4444;
            border:3px solid white;display:flex;align-items:center;justify-content:center;
            font-size:20px;">${vladFace}</div>
          <span style="color:#FF8888;font-weight:bold;font-size:11px;text-shadow:1px 1px 0 black;">Vlad</span>
        </div>

        <!-- Niki (right) -->
        <div style="position:absolute;top:6px;right:10px;display:flex;align-items:center;gap:5px;flex-direction:row-reverse;pointer-events:none;">
          <div style="width:44px;height:44px;border-radius:50%;background:#4D96FF;
            border:3px solid white;display:flex;align-items:center;justify-content:center;
            font-size:20px;">${nikiFace}</div>
          <span style="color:#88CCFF;font-weight:bold;font-size:11px;text-shadow:1px 1px 0 black;">Niki</span>
        </div>

        <!-- Instruction -->
        <div style="position:absolute;top:56px;left:0;right:0;text-align:center;
                    color:#FFD700;font-size:13px;font-weight:bold;pointer-events:none;">
          Click a clock slot to play its puzzle!
        </div>

        <!-- Clock face ring -->
        <div style="position:absolute;
          left:${cx - r - 14}px;top:${cy - r - 14 + 10}px;
          width:${(r + 14) * 2}px;height:${(r + 14) * 2}px;
          border-radius:50%;border:5px solid rgba(255,255,255,0.25);
          background:rgba(255,255,255,0.03);pointer-events:none;"></div>

        <!-- Clock slots (numbers) -->
        ${slotsHTML}

        <!-- SVG clock hands -->
        <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"
             xmlns="http://www.w3.org/2000/svg">

          <!-- Minute hand (long thin) -->
          <line
            x1="${cx}" y1="${cy + 10}"
            x2="${cx}" y2="${cy + 10 - r * 0.68}"
            stroke="rgba(255,255,255,0.75)" stroke-width="3" stroke-linecap="round"
            transform="rotate(${minuteDeg}, ${cx}, ${cy + 10})"
          />

          <!-- Hour hand (short thick) -->
          <line
            x1="${cx}" y1="${cy + 10}"
            x2="${cx}" y2="${cy + 10 - r * 0.48}"
            stroke="${isSpooky ? "#ff4444" : "white"}" stroke-width="6" stroke-linecap="round"
            transform="rotate(${hourDeg}, ${cx}, ${cy + 10})"
          />

          <!-- Center hub -->
          <circle cx="${cx}" cy="${cy + 10}" r="7"
            fill="${isSpooky ? "#ff4444" : "white"}" />
        </svg>

        <!-- Time display (below clock) -->
        <div style="position:absolute;
          left:${cx - 60}px;top:${cy + r + 20}px;
          width:120px;text-align:center;
          color:${isSpooky ? "#ff6666" : "rgba(255,255,255,0.65)"};
          font-size:16px;font-weight:bold;pointer-events:none;
          text-shadow:${isSpooky ? "0 0 10px red" : "none"};">
          ${timeStr}
        </div>

        <!-- Progress dots -->
        <div style="position:absolute;bottom:46px;left:0;right:0;
          display:flex;justify-content:center;gap:5px;pointer-events:none;">
          ${progressBar}
        </div>

        <!-- Progress count -->
        <div style="position:absolute;bottom:20px;left:0;right:0;text-align:center;
                    color:rgba(255,255,255,0.5);font-size:12px;pointer-events:none;">
          ${solved} / 12 puzzles solved
        </div>

        <!-- Back to explore room -->
        <button id="backToRoom" style="position:absolute;bottom:14px;left:14px;
          background:rgba(255,255,255,0.12);color:white;font-size:13px;
          padding:7px 14px;border-radius:20px;border:2px solid rgba(255,255,255,0.3);
          pointer-events:all;cursor:pointer;">
          ← Back to Room
        </button>
      </div>
    `;

    document.getElementById("backToRoom")!.onclick = () => game.goExplore();

    // Slot click → launch puzzle (if not placed yet)
    game.ui.querySelectorAll<HTMLElement>(".slot").forEach(el => {
      el.onmouseenter = () => {
        if (!placed.has(parseInt(el.dataset["slot"]!))) el.style.transform = "scale(1.15)";
      };
      el.onmouseleave = () => { el.style.transform = "scale(1)"; };
      el.onclick = () => {
        const slotPos = parseInt(el.dataset["slot"]!);
        if (placed.has(slotPos)) return;
        game.goPuzzle(slotPos);
      };
    });
  }
}
