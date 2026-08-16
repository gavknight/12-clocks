import type { Game } from "../game/Game";
import { bumpStat } from "../game/badges";

const LINES = [
  "…oh. Oh! A visitor.",
  "Nobody's found the acorn in a very long time.",
  "I was planted here before the first clock was wound.",
  "Twelve numbers. Twelve hours. I've watched every one of them go missing, and come back.",
  "You went looking on a shelf nobody looks at. That's the whole trick, you know.",
  "Take this. You've earned it.",
];

export class TreeScene {
  private _timers: number[] = [];
  private _i = 0;
  private _done = false;

  constructor(game: Game) {
    game._disposeScene = () => {
      this._timers.forEach(clearTimeout);
      game.ui.innerHTML = "";
    };
    this._build(game);
  }

  private _later(ms: number, fn: () => void): void {
    this._timers.push(window.setTimeout(fn, ms));
  }

  private _build(game: Game): void {
    game.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(180deg,#04140a 0%,#0a2412 45%,#123a1c 100%);
        flex-direction:column;justify-content:center;align-items:center;gap:0;
        font-family:Arial,sans-serif;overflow:hidden;position:relative;">

        <!-- fireflies -->
        ${Array.from({ length: 14 }, (_, i) => `
          <div style="position:absolute;left:${[6,18,29,41,52,63,74,85,93,12,36,58,70,88][i]}%;
            top:${[18,42,26,58,34,64,22,48,36,70,14,76,52,28][i]}%;
            width:4px;height:4px;border-radius:50%;background:#d8ff9a;
            box-shadow:0 0 9px 3px rgba(190,255,120,0.55);
            opacity:${0.25 + (i % 5) * 0.14};pointer-events:none;
            animation:treeFloat ${4 + (i % 5)}s ease-in-out ${i * 0.35}s infinite alternate;"></div>`).join("")}

        <style>
          @keyframes treeFloat { from { transform:translateY(0) } to { transform:translateY(-16px) } }
          @keyframes treeSway  { from { transform:rotate(-1.6deg) } to { transform:rotate(1.6deg) } }
          @keyframes treeIn    { from { opacity:0; transform:scale(0.86) } to { opacity:1; transform:scale(1) } }
        </style>

        <div style="font-size:104px;line-height:1;animation:treeSway 4.5s ease-in-out infinite alternate,
          treeIn 1.1s ease both;filter:drop-shadow(0 0 26px rgba(120,255,140,0.35));">🌳</div>

        <div style="width:100%;max-width:440px;min-height:118px;margin-top:20px;padding:0 18px;">
          <div style="background:rgba(0,0,0,0.62);border:2px solid rgba(120,220,140,0.45);
            border-radius:16px;padding:16px 18px;backdrop-filter:blur(4px);">
            <div style="color:#9fe8a8;font-size:12px;font-weight:bold;letter-spacing:2px;
              text-transform:uppercase;margin-bottom:7px;">The Old Tree</div>
            <div id="treeText" style="color:white;font-size:16px;line-height:1.55;min-height:52px;"></div>
          </div>
          <div id="treeHint" style="color:rgba(255,255,255,0.34);font-size:12px;
            text-align:center;margin-top:9px;">tap to continue</div>
        </div>

        <div id="treeReward" style="opacity:0;transition:opacity 0.8s;margin-top:16px;text-align:center;">
          <div style="font-size:44px;">🌳</div>
          <div style="color:#7dff9a;font-size:19px;font-weight:900;
            font-family:'Arial Black',Arial;text-shadow:0 0 18px rgba(120,255,140,0.6);">
            The Old Tree</div>
          <div style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:3px;">Secret badge unlocked</div>
          <button id="treeBack" style="margin-top:16px;background:rgba(120,220,140,0.22);
            color:#9fe8a8;font-size:14px;font-weight:bold;padding:10px 26px;border-radius:12px;
            border:2px solid rgba(120,220,140,0.5);cursor:pointer;">← Back to the room</button>
        </div>
      </div>`;

    this._say(game);
    game.ui.querySelector<HTMLElement>(".screen")!.onclick = () => this._next(game);
  }

  /** Typewriter one line at a time. */
  private _say(game: Game): void {
    const el = document.getElementById("treeText");
    if (!el) return;
    const line = LINES[this._i];
    el.textContent = "";
    let c = 0;
    const step = () => {
      if (c >= line.length) return;
      el.textContent = line.slice(0, ++c);
      this._later(26, step);
    };
    step();
  }

  private _next(game: Game): void {
    if (this._done) return;
    const el = document.getElementById("treeText");
    // first tap finishes the line instantly, second advances
    if (el && el.textContent !== LINES[this._i]) {
      this._timers.forEach(clearTimeout);
      this._timers = [];
      el.textContent = LINES[this._i];
      return;
    }
    this._i++;
    if (this._i < LINES.length) { this._say(game); return; }
    this._reward(game);
  }

  private _reward(game: Game): void {
    this._done = true;
    bumpStat("treeFound");
    game.checkBadges();
    const hint = document.getElementById("treeHint");
    if (hint) hint.style.display = "none";
    const rw = document.getElementById("treeReward");
    if (rw) rw.style.opacity = "1";
    const back = document.getElementById("treeBack");
    if (back) back.onclick = (e) => { e.stopPropagation(); game.goExplore(); };
  }
}
