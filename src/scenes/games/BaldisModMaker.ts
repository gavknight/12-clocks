import type { Game } from "../../game/Game";

export const BALDIS_MOD_KEY = "baldis_mod_v1";

const ROWS = 15, COLS = 15, CP = 22;

const DEFAULT_MAZE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,1,0,1],
  [1,0,0,0,1,1,1,1,1,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,1,1,0,0,1],
  [1,1,1,0,1,0,1,0,1,0,1,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,0,0,1,1,1,1,0,0,1,0,1],
  [1,0,1,0,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,0,0,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const DEFAULT_NOTEBOOKS = [
  {row:1,col:1},{row:2,col:5},{row:5,col:2},{row:7,col:5},
  {row:9,col:3},{row:11,col:7},{row:13,col:11},
];
const DEFAULT_EXITS = [
  {row:1,col:13},{row:13,col:1},{row:7,col:1},{row:13,col:9},
];
const DEFAULT_QUESTIONS = [
  {q:"2 + 2 = ?", a:"4"},
  {q:"What is 1 + 1?", a:"258375235987349867529578358432954893756798573498673957123124"},
  {q:"5 × 5 = ?", a:"25"},
  {q:"10 - 3 = ?", a:"7"},
  {q:"12 ÷ 4 = ?", a:"3"},
  {q:"6 + 7 = ?", a:"13"},
  {q:"9 × 3 = ?", a:"27"},
];

export interface BaldisModConfig {
  maze: number[][];
  notebooks: Array<{row:number,col:number}>;
  exits: Array<{row:number,col:number}>;
  questions: Array<{q:string,a:string}>;
  baldSpeed: number;
  fogEnd: number;
}

export class BaldisModMaker {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _maze: number[][];
  private _notebooks: Array<{row:number,col:number}>;
  private _exits: Array<{row:number,col:number}>;
  private _questions: Array<{q:string,a:string}>;
  private _baldSpeed = 0.02;
  private _fogEnd = 32;
  private _tool = "wall";
  private _canvas!: HTMLCanvasElement;
  private _painting = false;

  constructor(g: Game) {
    this._g = g;
    const saved = localStorage.getItem(BALDIS_MOD_KEY);
    if (saved) {
      try {
        const c: BaldisModConfig = JSON.parse(saved);
        this._maze = c.maze.map(r => [...r]);
        this._notebooks = c.notebooks.map(n => ({...n}));
        this._exits = c.exits.map(e => ({...e}));
        this._questions = c.questions.map(q => ({...q}));
        this._baldSpeed = c.baldSpeed ?? 0.02;
        this._fogEnd = c.fogEnd ?? 32;
      } catch { this._resetDefaults(); }
    } else { this._resetDefaults(); }

    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;pointer-events:all;overflow-y:auto;" +
      "background:linear-gradient(160deg,#0a0a1a,#180a0a);font-family:Arial,sans-serif;" +
      "display:flex;flex-direction:column;align-items:center;padding:20px 16px 60px;";
    g.ui.appendChild(this._wrap);
    this._render();
  }

  private _resetDefaults(): void {
    this._maze = DEFAULT_MAZE.map(r => [...r]);
    this._notebooks = DEFAULT_NOTEBOOKS.map(n => ({...n}));
    this._exits = DEFAULT_EXITS.map(e => ({...e}));
    this._questions = DEFAULT_QUESTIONS.map(q => ({...q}));
    this._baldSpeed = 0.02;
    this._fogEnd = 32;
  }

  private _render(): void {
    this._wrap.innerHTML = "";

    // Header
    const hdr = document.createElement("div");
    hdr.style.cssText = "display:flex;align-items:center;gap:10px;width:100%;max-width:420px;margin-bottom:16px;";
    hdr.innerHTML = `
      <button id="mmBack" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
        font-size:13px;padding:7px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;">← Back</button>
      <div style="color:white;font-size:20px;font-weight:900;flex:1;text-align:center;">🎮 Baldi Mod Maker</div>
      <button id="mmReset" style="background:rgba(255,80,80,0.15);color:rgba(255,120,120,0.9);
        font-size:13px;padding:7px 12px;border-radius:10px;border:1px solid rgba(255,80,80,0.3);cursor:pointer;">🔄 Reset</button>
    `;
    this._wrap.appendChild(hdr);
    document.getElementById("mmBack")!.onclick = () => {
      this._g.ui.innerHTML = "";
      import("../ArcadeScene").then(m => new m.ArcadeScene(this._g));
    };
    document.getElementById("mmReset")!.onclick = () => {
      if (confirm("Reset everything to the default Baldi's Basics?")) {
        this._resetDefaults();
        localStorage.removeItem(BALDIS_MOD_KEY);
        this._render();
      }
    };

    // Tool selector
    const toolWrap = document.createElement("div");
    toolWrap.style.cssText = "width:100%;max-width:420px;margin-bottom:12px;";
    toolWrap.innerHTML = `<div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:1px;margin-bottom:6px;">TOOL — click or drag on maze</div>`;

    const toolsData: Array<{id:string,label:string}> = [
      {id:"wall",   label:"🧱 Wall"},
      {id:"floor",  label:"⬜ Floor"},
      ...Array.from({length:7}, (_,i) => ({id:`nb${i}`, label:`N${i+1}`})),
      {id:"exit",   label:"🚪 Exit"},
    ];
    const toolRow = document.createElement("div");
    toolRow.id = "toolRow";
    toolRow.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;";
    for (const t of toolsData) {
      const btn = document.createElement("button");
      btn.id = `toolBtn_${t.id}`;
      btn.textContent = t.label;
      btn.style.cssText =
        `background:${this._tool===t.id?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.06)"};` +
        `color:white;font-size:12px;padding:5px 10px;border-radius:8px;cursor:pointer;` +
        `border:2px solid ${this._tool===t.id?"rgba(255,255,255,0.55)":"rgba(255,255,255,0.12)"};font-weight:bold;`;
      btn.onclick = () => {
        this._tool = t.id;
        toolRow.querySelectorAll("button").forEach(b => {
          (b as HTMLElement).style.background = "rgba(255,255,255,0.06)";
          (b as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
        });
        btn.style.background = "rgba(255,255,255,0.22)";
        btn.style.borderColor = "rgba(255,255,255,0.55)";
      };
      toolRow.appendChild(btn);
    }
    toolWrap.appendChild(toolRow);
    this._wrap.appendChild(toolWrap);

    // Maze canvas
    const mazeSec = document.createElement("div");
    mazeSec.style.cssText = "width:100%;max-width:420px;margin-bottom:16px;";
    mazeSec.innerHTML = `<div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:1px;margin-bottom:6px;">MAZE EDITOR</div>`;

    this._canvas = document.createElement("canvas");
    this._canvas.width = COLS * CP;
    this._canvas.height = ROWS * CP;
    this._canvas.style.cssText = "cursor:crosshair;border:2px solid rgba(255,255,255,0.2);border-radius:8px;touch-action:none;display:block;max-width:100%;";
    this._drawCanvas();

    const applyAt = (e: PointerEvent) => {
      const rect = this._canvas.getBoundingClientRect();
      const sx = this._canvas.width / rect.width;
      const sy = this._canvas.height / rect.height;
      const col = Math.floor((e.clientX - rect.left) * sx / CP);
      const row = Math.floor((e.clientY - rect.top)  * sy / CP);
      this._applyTool(row, col);
    };
    this._canvas.addEventListener("pointerdown", e => { this._painting = true; this._canvas.setPointerCapture(e.pointerId); applyAt(e); });
    this._canvas.addEventListener("pointermove", e => { if (this._painting) applyAt(e); });
    this._canvas.addEventListener("pointerup",   () => { this._painting = false; });

    mazeSec.appendChild(this._canvas);

    const legend = document.createElement("div");
    legend.style.cssText = "display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;";
    legend.innerHTML = `
      <span style="color:rgba(255,255,255,0.4);font-size:11px;">🟫 Wall</span>
      <span style="color:rgba(255,255,255,0.4);font-size:11px;">🟨 Floor</span>
      <span style="color:rgba(255,255,255,0.4);font-size:11px;">🟡 Notebook (1-7)</span>
      <span style="color:rgba(255,255,255,0.4);font-size:11px;">🟢 Exit</span>
      <span style="color:rgba(255,255,255,0.4);font-size:11px;">🔵 You (locked)</span>
    `;
    mazeSec.appendChild(legend);
    this._wrap.appendChild(mazeSec);

    // Questions
    const qSec = document.createElement("div");
    qSec.style.cssText = "width:100%;max-width:420px;margin-bottom:16px;";
    qSec.innerHTML = `<div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:1px;margin-bottom:8px;">📓 NOTEBOOK QUESTIONS</div>`;
    for (let i = 0; i < 7; i++) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:7px;";
      const qs = (this._questions[i]?.q ?? "").replace(/"/g, "&quot;");
      const as = (this._questions[i]?.a ?? "").replace(/"/g, "&quot;");
      row.innerHTML = `
        <div style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:bold;min-width:22px;">N${i+1}</div>
        <input id="qq${i}" type="text" value="${qs}" placeholder="Question"
          style="flex:2;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);
          border-radius:8px;color:white;font-size:12px;padding:6px 8px;outline:none;font-family:Arial;min-width:0;"/>
        <div style="color:rgba(255,255,255,0.3);font-size:12px;">=</div>
        <input id="qa${i}" type="text" value="${as}" placeholder="Answer"
          style="flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);
          border-radius:8px;color:white;font-size:12px;padding:6px 8px;outline:none;font-family:Arial;min-width:0;"/>
      `;
      qSec.appendChild(row);
    }
    this._wrap.appendChild(qSec);

    // Settings
    const setsSec = document.createElement("div");
    setsSec.style.cssText = "width:100%;max-width:420px;margin-bottom:22px;";
    setsSec.innerHTML = `
      <div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:1px;margin-bottom:10px;">⚙️ SETTINGS</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="color:rgba(255,255,255,0.6);font-size:13px;min-width:130px;">Baldi Start Speed</div>
        <input id="baldSlider" type="range" min="0.005" max="0.08" step="0.005"
          value="${this._baldSpeed}" style="flex:1;accent-color:#ff4040;"/>
        <div id="baldVal" style="color:white;font-size:12px;min-width:40px;">${this._baldSpeed.toFixed(3)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="color:rgba(255,255,255,0.6);font-size:13px;min-width:130px;">Fog Distance</div>
        <input id="fogSlider" type="range" min="8" max="80" step="4"
          value="${this._fogEnd}" style="flex:1;accent-color:#4fc3f7;"/>
        <div id="fogVal" style="color:white;font-size:12px;min-width:40px;">${this._fogEnd}</div>
      </div>
    `;
    this._wrap.appendChild(setsSec);
    document.getElementById("baldSlider")!.addEventListener("input", e => {
      this._baldSpeed = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById("baldVal")!.textContent = this._baldSpeed.toFixed(3);
    });
    document.getElementById("fogSlider")!.addEventListener("input", e => {
      this._fogEnd = parseInt((e.target as HTMLInputElement).value);
      document.getElementById("fogVal")!.textContent = String(this._fogEnd);
    });

    // Save & Play
    const playBtn = document.createElement("button");
    playBtn.textContent = "▶ Save & Play Mod";
    playBtn.style.cssText =
      "background:linear-gradient(135deg,#1a6b00,#4caf50);color:white;font-size:18px;font-weight:900;" +
      "padding:16px 40px;border-radius:20px;border:2px solid rgba(100,255,100,0.4);cursor:pointer;" +
      "font-family:'Arial Black',Arial;width:100%;max-width:420px;";
    playBtn.onclick = () => this._saveAndPlay();
    this._wrap.appendChild(playBtn);
  }

  private _applyTool(row: number, col: number): void {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (row === 1 && col === 1) return; // player spawn — locked

    if (this._tool === "wall") {
      const ni = this._notebooks.findIndex(n => n.row === row && n.col === col);
      if (ni >= 0) this._notebooks[ni] = {row:-1, col:-1};
      const ei = this._exits.findIndex(e => e.row === row && e.col === col);
      if (ei >= 0) this._exits[ei] = {row:-1, col:-1};
      this._maze[row][col] = 1;
    } else if (this._tool === "floor") {
      this._maze[row][col] = 0;
    } else if (this._tool.startsWith("nb")) {
      if (this._maze[row][col] === 1) return;
      const idx = parseInt(this._tool.slice(2));
      this._notebooks[idx] = {row, col};
    } else if (this._tool === "exit") {
      if (this._maze[row][col] === 1) return;
      const ei = this._exits.findIndex(e => e.row === row && e.col === col);
      if (ei >= 0) {
        this._exits[ei] = {row:-1, col:-1};
      } else {
        const free = this._exits.findIndex(e => e.row < 0 || e.col < 0);
        if (free >= 0) {
          this._exits[free] = {row, col};
        } else {
          this._exits.shift();
          this._exits.push({row, col});
        }
      }
    }
    this._drawCanvas();
  }

  private _drawCanvas(): void {
    const ctx = this._canvas.getContext("2d")!;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CP, y = r * CP;
        if (this._maze[r][c] === 1) {
          ctx.fillStyle = "#2a1e0f"; ctx.fillRect(x, y, CP, CP);
          ctx.fillStyle = "#4a3820"; ctx.fillRect(x+1, y+1, CP-2, CP-2);
        } else {
          ctx.fillStyle = "#8a7a50"; ctx.fillRect(x, y, CP, CP);
          ctx.fillStyle = "#c8b870"; ctx.fillRect(x+1, y+1, CP-2, CP-2);
        }

        // Player start
        if (r === 1 && c === 1) {
          ctx.fillStyle = "rgba(40,80,255,0.75)";
          ctx.fillRect(x+2, y+2, CP-4, CP-4);
          ctx.fillStyle = "white"; ctx.font = `bold ${CP-7}px Arial`; ctx.textAlign = "center";
          ctx.fillText("P", x+CP/2, y+CP-4);
        }

        // Notebooks
        const ni = this._notebooks.findIndex(n => n.row === r && n.col === c);
        if (ni >= 0) {
          ctx.fillStyle = "#FFD700"; ctx.fillRect(x+2, y+2, CP-4, CP-4);
          ctx.fillStyle = "#1a1000"; ctx.font = `bold ${CP-7}px Arial`; ctx.textAlign = "center";
          ctx.fillText(String(ni+1), x+CP/2, y+CP-4);
        }

        // Exits
        const ei = this._exits.findIndex(e => e.row === r && e.col === c);
        if (ei >= 0) {
          ctx.fillStyle = "#00cc44"; ctx.fillRect(x+2, y+2, CP-4, CP-4);
          ctx.fillStyle = "#001a00"; ctx.font = `bold ${CP-8}px Arial`; ctx.textAlign = "center";
          ctx.fillText("E", x+CP/2, y+CP-4);
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i*CP,0); ctx.lineTo(i*CP,ROWS*CP); ctx.stroke(); }
    for (let i = 0; i <= ROWS; i++) { ctx.beginPath(); ctx.moveTo(0,i*CP); ctx.lineTo(COLS*CP,i*CP); ctx.stroke(); }
  }

  private _saveAndPlay(): void {
    for (let i = 0; i < 7; i++) {
      const qEl = document.getElementById(`qq${i}`) as HTMLInputElement | null;
      const aEl = document.getElementById(`qa${i}`) as HTMLInputElement | null;
      if (qEl && aEl) {
        const q = qEl.value.trim(), a = aEl.value.trim();
        if (q) this._questions[i] = { q, a: a || "?" };
      }
    }

    const validExits = this._exits.filter(e => e.row >= 0 && e.col >= 0 && this._maze[e.row]?.[e.col] === 0);
    if (validExits.length === 0) { alert("You need at least 1 exit door placed on a floor tile!"); return; }

    const validNbs = this._notebooks.filter(n => n.row >= 0 && n.col >= 0 && this._maze[n.row]?.[n.col] === 0);
    if (validNbs.length === 0) { alert("You need at least 1 notebook placed on a floor tile!"); return; }

    const config: BaldisModConfig = {
      maze: this._maze,
      notebooks: validNbs,
      exits: validExits,
      questions: this._questions,
      baldSpeed: this._baldSpeed,
      fogEnd: this._fogEnd,
    };
    localStorage.setItem(BALDIS_MOD_KEY, JSON.stringify(config));

    this._g.ui.innerHTML = "";
    import("./BaldisBasics").then(m => new m.BaldisBasics(this._g));
  }
}
