import type { Game } from "../../game/Game";

const SAVE_KEY  = "justdraw_v2";
const THRESHOLD = 250; // stroke-px inside the zone needed to pass (at scale=1)

interface Rect { x: number; y: number; w: number; h: number; }
interface Level {
  hint: string;
  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void;
  zone(cx: number, cy: number, s: number): Rect;
}

function ls(ctx: CanvasRenderingContext2D, s: number, w = 4): void {
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth   = w * s;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";
}

const LEVELS: Level[] = [
  // 1. Mug — handle
  {
    hint: "Draw the handle",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath();
      ctx.moveTo(cx - 65*s, cy - 70*s); ctx.lineTo(cx - 72*s, cy + 70*s);
      ctx.moveTo(cx + 65*s, cy - 70*s); ctx.lineTo(cx + 72*s, cy + 70*s);
      ctx.moveTo(cx - 72*s, cy + 70*s); ctx.lineTo(cx + 72*s, cy + 70*s);
      ctx.moveTo(cx - 65*s, cy - 70*s); ctx.lineTo(cx + 65*s, cy - 70*s);
      ctx.stroke();
      ls(ctx, s, 2.5);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i*22*s, cy - 82*s);
        ctx.quadraticCurveTo(cx + i*22*s + 10*s, cy - 100*s, cx + i*22*s, cy - 115*s);
        ctx.stroke();
      }
    },
    zone(cx, cy, s) { return { x: cx+65*s, y: cy-35*s, w: 78*s, h: 90*s }; },
  },

  // 2. House — door
  {
    hint: "Draw the door",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.strokeRect(cx-100*s, cy-50*s, 200*s, 115*s);
      ctx.beginPath();
      ctx.moveTo(cx-115*s, cy-50*s); ctx.lineTo(cx, cy-145*s); ctx.lineTo(cx+115*s, cy-50*s);
      ctx.stroke();
      ctx.strokeRect(cx-82*s, cy-30*s, 42*s, 38*s);
      ctx.strokeRect(cx+40*s, cy-30*s, 42*s, 38*s);
      ctx.beginPath();
      ctx.moveTo(cx-38*s, cy+65*s); ctx.lineTo(cx+38*s, cy+65*s);
      ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-32*s, y: cy+12*s, w: 64*s, h: 53*s }; },
  },

  // 3. Balloon — string
  {
    hint: "Draw the string",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath(); ctx.ellipse(cx, cy-25*s, 72*s, 92*s, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx-9*s, cy+65*s); ctx.lineTo(cx+9*s, cy+65*s); ctx.lineTo(cx, cy+76*s);
      ctx.closePath(); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-16*s, y: cy+76*s, w: 32*s, h: 90*s }; },
  },

  // 4. Tree — trunk
  {
    hint: "Draw the trunk",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath();
      ctx.moveTo(cx, cy-135*s); ctx.lineTo(cx-100*s, cy+5*s); ctx.lineTo(cx+100*s, cy+5*s);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy-95*s); ctx.lineTo(cx-80*s, cy+25*s); ctx.lineTo(cx+80*s, cy+25*s);
      ctx.closePath(); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-30*s, y: cy+25*s, w: 60*s, h: 90*s }; },
  },

  // 5. Snowman — head
  {
    hint: "Draw the head",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath(); ctx.arc(cx, cy+75*s, 72*s, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy-20*s, 50*s, 0, Math.PI*2); ctx.stroke();
      ls(ctx, s, 2);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.arc(cx, cy+75*s + i*25*s, 4*s, 0, Math.PI*2);
        ctx.fillStyle = "#1a1a1a"; ctx.fill();
      }
    },
    zone(cx, cy, s) { return { x: cx-38*s, y: cy-108*s, w: 76*s, h: 76*s }; },
  },

  // 6. Fish — tail
  {
    hint: "Draw the tail",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath(); ctx.ellipse(cx-20*s, cy, 82*s, 52*s, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx-72*s, cy-16*s, 9*s, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx-74*s, cy-18*s, 3*s, 0, Math.PI*2);
      ctx.fillStyle = "#1a1a1a"; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx-28*s, cy-52*s);
      ctx.quadraticCurveTo(cx-5*s, cy-95*s, cx+25*s, cy-52*s);
      ctx.stroke();
      ls(ctx, s, 2);
      ctx.beginPath(); ctx.arc(cx-88*s, cy, 10*s, -0.5, 0.5); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx+58*s, y: cy-60*s, w: 88*s, h: 120*s }; },
  },

  // 7. Umbrella — stick handle
  {
    hint: "Draw the handle",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath(); ctx.arc(cx, cy-10*s, 105*s, Math.PI, 0, false); ctx.stroke();
      for (let i = 0; i <= 4; i++) {
        const a = Math.PI + (i/4)*Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy-10*s);
        ctx.lineTo(cx + Math.cos(a)*105*s, cy-10*s + Math.sin(a)*105*s);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(cx, cy-10*s); ctx.lineTo(cx, cy+10*s); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-14*s, y: cy+10*s, w: 80*s, h: 90*s }; },
  },

  // 8. Kite — tail
  {
    hint: "Draw the tail",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath();
      ctx.moveTo(cx, cy-120*s); ctx.lineTo(cx+80*s, cy);
      ctx.lineTo(cx, cy+80*s); ctx.lineTo(cx-80*s, cy); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-80*s, cy); ctx.lineTo(cx+80*s, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy-120*s); ctx.lineTo(cx, cy+80*s); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx-80*s, cy);
      ctx.quadraticCurveTo(cx-130*s, cy-20*s, cx-155*s, cy-85*s);
      ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-35*s, y: cy+80*s, w: 70*s, h: 100*s }; },
  },

  // 9. Clock — hands
  {
    hint: "Draw the clock hands",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath(); ctx.arc(cx, cy, 105*s, 0, Math.PI*2); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i/12)*Math.PI*2 - Math.PI/2;
        const inner = (i%3===0 ? 82 : 92)*s;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a)*inner, cy + Math.sin(a)*inner);
        ctx.lineTo(cx + Math.cos(a)*100*s, cy + Math.sin(a)*100*s);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 5*s, 0, Math.PI*2);
      ctx.fillStyle = "#1a1a1a"; ctx.fill();
    },
    zone(cx, cy, s) { return { x: cx-78*s, y: cy-78*s, w: 156*s, h: 156*s }; },
  },

  // 10. Pencil — tip
  {
    hint: "Draw the tip",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath();
      ctx.moveTo(cx-140*s, cy-22*s); ctx.lineTo(cx+40*s, cy-22*s);
      ctx.lineTo(cx+40*s, cy+22*s); ctx.lineTo(cx-140*s, cy+22*s); ctx.closePath();
      ctx.stroke();
      ctx.strokeRect(cx-155*s, cy-22*s, 25*s, 44*s);
      ctx.beginPath(); ctx.moveTo(cx+20*s, cy-22*s); ctx.lineTo(cx+20*s, cy+22*s); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx+40*s, y: cy-40*s, w: 85*s, h: 80*s }; },
  },

  // 11. Bucket — handle arc
  {
    hint: "Draw the handle",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath();
      ctx.moveTo(cx-70*s, cy-60*s); ctx.lineTo(cx-80*s, cy+80*s);
      ctx.lineTo(cx+80*s, cy+80*s); ctx.lineTo(cx+70*s, cy-60*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-75*s, cy-60*s); ctx.lineTo(cx+75*s, cy-60*s); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx-60*s, cy-60*s, 6*s, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx+60*s, cy-60*s, 6*s, 0, Math.PI*2); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-60*s, y: cy-120*s, w: 120*s, h: 65*s }; },
  },

  // 12. Bicycle — wheels
  {
    hint: "Draw the wheels",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath();
      ctx.moveTo(cx-10*s, cy-60*s); ctx.lineTo(cx+45*s, cy+20*s);
      ctx.moveTo(cx-10*s, cy-60*s); ctx.lineTo(cx-50*s, cy+20*s);
      ctx.moveTo(cx-50*s, cy+20*s); ctx.lineTo(cx+45*s, cy+20*s);
      ctx.moveTo(cx-10*s, cy-60*s); ctx.lineTo(cx+10*s, cy-85*s);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy-85*s); ctx.lineTo(cx+20*s, cy-85*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-22*s, cy-68*s); ctx.lineTo(cx+2*s, cy-68*s); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-100*s, y: cy-20*s, w: 200*s, h: 90*s }; },
  },

  // 13. Sun — rays
  {
    hint: "Draw the rays",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      ctx.beginPath(); ctx.arc(cx, cy, 65*s, 0, Math.PI*2); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-160*s, y: cy-160*s, w: 320*s, h: 320*s }; },
  },

  // 14. Car — wheels
  {
    hint: "Draw the wheels",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Body
      ctx.beginPath();
      ctx.moveTo(cx-110*s, cy+10*s); ctx.lineTo(cx-110*s, cy-30*s);
      ctx.lineTo(cx-65*s, cy-30*s); ctx.lineTo(cx-40*s, cy-75*s);
      ctx.lineTo(cx+40*s, cy-75*s); ctx.lineTo(cx+65*s, cy-30*s);
      ctx.lineTo(cx+110*s, cy-30*s); ctx.lineTo(cx+110*s, cy+10*s);
      ctx.closePath(); ctx.stroke();
      // Windows
      ctx.strokeRect(cx-32*s, cy-68*s, 30*s, 32*s);
      ctx.strokeRect(cx+2*s,  cy-68*s, 30*s, 32*s);
    },
    zone(cx, cy, s) { return { x: cx-115*s, y: cy+10*s, w: 230*s, h: 55*s }; },
  },

  // 15. Flower — stem
  {
    hint: "Draw the stem",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Center
      ctx.beginPath(); ctx.arc(cx, cy-60*s, 22*s, 0, Math.PI*2); ctx.stroke();
      // Petals
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2;
        const px = cx + Math.cos(a)*52*s;
        const py = cy-60*s + Math.sin(a)*52*s;
        ctx.beginPath(); ctx.ellipse(px, py, 22*s, 14*s, a, 0, Math.PI*2); ctx.stroke();
      }
    },
    zone(cx, cy, s) { return { x: cx-16*s, y: cy-38*s, w: 32*s, h: 130*s }; },
  },

  // 16. Candle — flame
  {
    hint: "Draw the flame",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Body
      ctx.strokeRect(cx-30*s, cy-20*s, 60*s, 120*s);
      // Wax drips
      ls(ctx, s, 2.5);
      ctx.beginPath(); ctx.moveTo(cx-15*s, cy-20*s); ctx.lineTo(cx-20*s, cy-5*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+10*s, cy-20*s); ctx.lineTo(cx+14*s, cy-8*s); ctx.stroke();
      // Wick
      ls(ctx, s, 2);
      ctx.beginPath(); ctx.moveTo(cx, cy-20*s); ctx.lineTo(cx+2*s, cy-38*s); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-28*s, y: cy-110*s, w: 56*s, h: 72*s }; },
  },

  // 17. Mountain — snow cap
  {
    hint: "Draw the snow cap",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Big mountain
      ctx.beginPath();
      ctx.moveTo(cx-10*s, cy+70*s); ctx.lineTo(cx-150*s, cy+70*s);
      ctx.lineTo(cx, cy-100*s); ctx.lineTo(cx+150*s, cy+70*s);
      ctx.lineTo(cx+10*s, cy+70*s); ctx.stroke();
      // Smaller mountain left
      ctx.beginPath();
      ctx.moveTo(cx-150*s, cy+70*s); ctx.lineTo(cx-90*s, cy-20*s); ctx.lineTo(cx-30*s, cy+70*s);
      ctx.stroke();
      // Ground
      ctx.beginPath(); ctx.moveTo(cx-160*s, cy+70*s); ctx.lineTo(cx+160*s, cy+70*s); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-50*s, y: cy-100*s, w: 100*s, h: 55*s }; },
  },

  // 18. Boat — sail
  {
    hint: "Draw the sail",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Hull
      ctx.beginPath();
      ctx.moveTo(cx-110*s, cy+20*s);
      ctx.quadraticCurveTo(cx, cy+70*s, cx+110*s, cy+20*s);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-110*s, cy+20*s); ctx.lineTo(cx+110*s, cy+20*s); ctx.stroke();
      // Mast
      ctx.beginPath(); ctx.moveTo(cx-10*s, cy+20*s); ctx.lineTo(cx-10*s, cy-110*s); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-10*s, y: cy-110*s, w: 110*s, h: 130*s }; },
  },

  // 19. Rainbow — arcs
  {
    hint: "Draw the rainbow",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Ground
      ctx.beginPath(); ctx.moveTo(cx-160*s, cy+80*s); ctx.lineTo(cx+160*s, cy+80*s); ctx.stroke();
      // Left cloud
      ls(ctx, s, 3);
      for (const [ox, oy, r] of [[-120,-20,28],[-95,-35,35],[-65,-25,28]] as [number,number,number][]) {
        ctx.beginPath(); ctx.arc(cx+ox*s, cy+oy*s, r*s, 0, Math.PI*2); ctx.stroke();
      }
      // Right cloud
      for (const [ox, oy, r] of [[120,-20,28],[95,-35,35],[65,-25,28]] as [number,number,number][]) {
        ctx.beginPath(); ctx.arc(cx+ox*s, cy+oy*s, r*s, 0, Math.PI*2); ctx.stroke();
      }
    },
    zone(cx, cy, s) { return { x: cx-145*s, y: cy-130*s, w: 290*s, h: 160*s }; },
  },

  // 20. Chair — missing leg
  {
    hint: "Draw the missing leg",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Seat
      ctx.strokeRect(cx-70*s, cy-10*s, 140*s, 14*s);
      // Back uprights
      ctx.beginPath(); ctx.moveTo(cx-55*s, cy-10*s); ctx.lineTo(cx-55*s, cy-95*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-10*s, cy-10*s); ctx.lineTo(cx-10*s, cy-95*s); ctx.stroke();
      // Back rail
      ctx.beginPath(); ctx.moveTo(cx-55*s, cy-65*s); ctx.lineTo(cx-10*s, cy-65*s); ctx.stroke();
      // Three legs
      ctx.beginPath(); ctx.moveTo(cx-55*s, cy+4*s); ctx.lineTo(cx-55*s, cy+85*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-10*s, cy+4*s); ctx.lineTo(cx-10*s, cy+85*s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+65*s, cy+4*s); ctx.lineTo(cx+65*s, cy+85*s); ctx.stroke();
      // Foot rest
      ctx.beginPath(); ctx.moveTo(cx-55*s, cy+50*s); ctx.lineTo(cx+65*s, cy+50*s); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx+20*s, y: cy+4*s, w: 32*s, h: 81*s }; },
  },

  // 21. Ladder — rungs
  {
    hint: "Draw the rungs",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Left rail
      ctx.beginPath();
      ctx.moveTo(cx-55*s, cy-140*s); ctx.lineTo(cx-65*s, cy+140*s); ctx.stroke();
      // Right rail
      ctx.beginPath();
      ctx.moveTo(cx+55*s, cy-140*s); ctx.lineTo(cx+65*s, cy+140*s); ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx-55*s, y: cy-140*s, w: 110*s, h: 280*s }; },
  },

  // 22. Key — teeth
  {
    hint: "Draw the teeth",
    draw(ctx, cx, cy, s) {
      ls(ctx, s);
      // Bow (ring)
      ctx.beginPath(); ctx.arc(cx-70*s, cy, 45*s, 0, Math.PI*2); ctx.stroke();
      // Shaft
      ctx.beginPath();
      ctx.moveTo(cx-25*s, cy-10*s); ctx.lineTo(cx+120*s, cy-10*s);
      ctx.lineTo(cx+120*s, cy+10*s); ctx.lineTo(cx-25*s, cy+10*s);
      ctx.stroke();
    },
    zone(cx, cy, s) { return { x: cx+50*s, y: cy+10*s, w: 75*s, h: 50*s }; },
  },
];

export class JustDraw {
  private _g: Game;
  private _canvas: HTMLCanvasElement;
  private _ctx:    CanvasRenderingContext2D;

  private _levelIdx        = 0;
  private _eraser          = false;
  private _drawing         = false;
  private _lastX           = 0;
  private _lastY           = 0;
  private _zoneStrokes     = 0;
  private _outsideStrokes  = 0;
  private _lastFeedbackAt  = 0;
  private _hintSnapshot: ImageData | null = null;
  private _phase: "draw" | "complete" = "draw";

  private _cleanup: (() => void)[] = [];

  constructor(g: Game) {
    this._g = g;

    g.ui.innerHTML = `
      <div id="jdRoot" style="
        position:relative;width:100%;height:100%;background:#f7f7f7;
        pointer-events:all;display:flex;flex-direction:column;
        font-family:Arial,sans-serif;user-select:none;overflow:hidden;
      ">
        <div id="jdHeader" style="
          width:100%;display:flex;align-items:center;justify-content:space-between;
          padding:10px 14px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.08);
          box-sizing:border-box;flex-shrink:0;z-index:10;gap:8px;
        ">
          <button id="jdBack" style="
            background:#eee;border:none;border-radius:10px;padding:7px 14px;
            font-size:13px;font-weight:bold;cursor:pointer;white-space:nowrap;
          ">← Back</button>
          <div style="text-align:center;flex:1;min-width:0;">
            <div id="jdLevelTxt" style="font-size:12px;color:#aaa;margin-bottom:1px;"></div>
            <div id="jdHint"     style="font-size:17px;font-weight:900;color:#222;"></div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button id="jdSkip" style="
              background:#fff3cd;border:none;border-radius:10px;padding:7px 14px;
              font-size:13px;font-weight:bold;cursor:pointer;white-space:nowrap;
              border:1px solid #ffc107;
            ">📺 Skip</button>
            <button id="jdClear" style="
              background:#ffe5e5;border:1px solid #ffaaaa;border-radius:10px;padding:7px 14px;
              font-size:13px;font-weight:bold;cursor:pointer;white-space:nowrap;
            ">🗑 Clear</button>
            <button id="jdErase" style="
              background:#eee;border:none;border-radius:10px;padding:7px 14px;
              font-size:13px;font-weight:bold;cursor:pointer;white-space:nowrap;
            ">✏️ Pen</button>
          </div>
        </div>
        <canvas id="jdCanvas" style="
          flex:1;width:100%;background:#fff;cursor:crosshair;touch-action:none;
          border-top:1px solid #eee;
        "></canvas>
      </div>`;

    this._canvas = document.getElementById("jdCanvas") as HTMLCanvasElement;
    this._ctx    = this._canvas.getContext("2d")!;

    this._levelIdx = this._load();
    this._resize();
    this._setupLevel();
    this._updateHUD();

    document.getElementById("jdBack")!.onclick  = () => this._end();
    document.getElementById("jdErase")!.onclick = () => this._toggleEraser();
    document.getElementById("jdSkip")!.onclick  = () => this._watchAd();
    document.getElementById("jdClear")!.onclick = () => this._clearDrawing();

    // Mouse
    const onDown = (e: MouseEvent) => {
      if (this._phase !== "draw") return;
      this._drawing = true;
      const { sx, sy } = this._coords(e.clientX, e.clientY);
      this._lastX = sx; this._lastY = sy;
      this._dot(sx, sy);
    };
    const onMove = (e: MouseEvent) => {
      if (!this._drawing || this._phase !== "draw") return;
      const { sx, sy } = this._coords(e.clientX, e.clientY);
      this._stroke(sx, sy);
    };
    const onUp = () => { this._drawing = false; };

    this._canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    this._cleanup.push(() => {
      this._canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    });

    // Touch
    const onTDown = (e: TouchEvent) => {
      e.preventDefault();
      if (this._phase !== "draw") return;
      this._drawing = true;
      const t = e.touches[0];
      const { sx, sy } = this._coords(t.clientX, t.clientY);
      this._lastX = sx; this._lastY = sy;
      this._dot(sx, sy);
    };
    const onTMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!this._drawing || this._phase !== "draw") return;
      const t = e.touches[0];
      const { sx, sy } = this._coords(t.clientX, t.clientY);
      this._stroke(sx, sy);
    };
    this._canvas.addEventListener("touchstart", onTDown, { passive: false });
    this._canvas.addEventListener("touchmove",  onTMove, { passive: false });
    this._canvas.addEventListener("touchend",   onUp);
    this._cleanup.push(() => {
      this._canvas.removeEventListener("touchstart", onTDown);
      this._canvas.removeEventListener("touchmove",  onTMove);
      this._canvas.removeEventListener("touchend",   onUp);
    });

    const onResize = () => { this._resize(); this._setupLevel(); };
    window.addEventListener("resize", onResize);
    this._cleanup.push(() => window.removeEventListener("resize", onResize));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _coords(cx: number, cy: number): { sx: number; sy: number } {
    const r = this._canvas.getBoundingClientRect();
    return {
      sx: (cx - r.left) * (this._canvas.width  / r.width),
      sy: (cy - r.top)  * (this._canvas.height / r.height),
    };
  }

  private _resize(): void {
    const r = this._canvas.getBoundingClientRect();
    this._canvas.width  = r.width  || window.innerWidth;
    this._canvas.height = r.height || window.innerHeight - 56;
  }

  private _scale(): number {
    return Math.min(this._canvas.width, this._canvas.height) / 560;
  }

  // ── Level ─────────────────────────────────────────────────────────────────

  private _setupLevel(): void {
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const cx  = W / 2;
    const cy  = H / 2;
    const s   = this._scale();
    const ctx = this._ctx;
    const lvl = LEVELS[this._levelIdx];

    this._zoneStrokes    = 0;
    this._outsideStrokes = 0;
    this._phase          = "draw";
    this._drawing        = false;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    lvl.draw(ctx, cx, cy, s);

    // Snapshot the hint so the eraser can restore it instead of drawing white
    this._hintSnapshot = ctx.getImageData(0, 0, W, H);
  }

  private _updateHUD(): void {
    const lvlEl  = document.getElementById("jdLevelTxt");
    const hintEl = document.getElementById("jdHint");
    if (lvlEl)  lvlEl.textContent  = `Level ${this._levelIdx + 1} / ${LEVELS.length}`;
    if (hintEl) hintEl.textContent = LEVELS[this._levelIdx].hint;
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  private _eraseAt(x: number, y: number, r = 13): void {
    if (!this._hintSnapshot) return;
    const px = Math.max(0, Math.floor(x - r));
    const py = Math.max(0, Math.floor(y - r));
    const pw = Math.min(this._canvas.width  - px, Math.ceil(r * 2));
    const ph = Math.min(this._canvas.height - py, Math.ceil(r * 2));
    if (pw > 0 && ph > 0)
      this._ctx.putImageData(this._hintSnapshot, 0, 0, px, py, pw, ph);
  }

  private _dot(x: number, y: number): void {
    if (this._eraser) { this._eraseAt(x, y); return; }
    const ctx = this._ctx;
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
  }

  private _stroke(x: number, y: number): void {
    const ctx  = this._ctx;
    const dx   = x - this._lastX;
    const dy   = y - this._lastY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (this._eraser) {
      // Step along the stroke and erase each point
      const steps = Math.max(1, Math.ceil(dist / 6));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        this._eraseAt(this._lastX + dx * t, this._lastY + dy * t);
      }
      this._lastX = x; this._lastY = y;
      return;
    }

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth   = 8;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.beginPath(); ctx.moveTo(this._lastX, this._lastY); ctx.lineTo(x, y); ctx.stroke();

    if (!this._eraser) {
      const W   = this._canvas.width;
      const H   = this._canvas.height;
      const s   = this._scale();
      const z   = LEVELS[this._levelIdx].zone(W/2, H/2, s);
      const inZone = x >= z.x && x <= z.x+z.w && y >= z.y && y <= z.y+z.h;
      if (inZone) {
        this._zoneStrokes    += dist;
        this._outsideStrokes  = 0; // reset outside tally when they find the right area
      } else {
        this._outsideStrokes += dist;
        // Fire feedback after accumulating enough outside strokes, with a cooldown
        if (this._outsideStrokes > 60 * s && performance.now() - this._lastFeedbackAt > 2500) {
          // Distance to nearest point on the zone rectangle edge
          const nearX = Math.max(z.x, Math.min(x, z.x + z.w));
          const nearY = Math.max(z.y, Math.min(y, z.y + z.h));
          const dToEdge = Math.sqrt((x - nearX) ** 2 + (y - nearY) ** 2);
          // "close" = within 80px of zone edge; "far" = totally wrong area
          const msg = dToEdge < 80 * s
            ? "Maybe somewhere else? 🤔"
            : "That's not quite right! ❌";
          this._showFeedback(msg);
          this._outsideStrokes = 0;
          this._lastFeedbackAt = performance.now();
        }
      }
      if (this._zoneStrokes >= THRESHOLD * s) {
        this._completeLevel();
      }
    }

    this._lastX = x;
    this._lastY = y;
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  private _showFeedback(msg: string): void {
    document.getElementById("jdFeedback")?.remove();
    const el = document.createElement("div");
    el.id = "jdFeedback";
    el.style.cssText = [
      "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);",
      "background:rgba(20,20,20,0.86);color:#fff;",
      "font-size:20px;font-weight:bold;font-family:Arial,sans-serif;",
      "padding:14px 26px;border-radius:18px;pointer-events:none;",
      "z-index:20;text-align:center;",
      "box-shadow:0 4px 24px rgba(0,0,0,0.35);",
      "transition:opacity 0.3s;",
    ].join("");
    el.textContent = msg;
    document.getElementById("jdRoot")!.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 350); }, 1400);
  }

  // ── Clear ─────────────────────────────────────────────────────────────────

  private _clearDrawing(): void {
    if (this._phase !== "draw") return;
    this._zoneStrokes    = 0;
    this._outsideStrokes = 0;
    this._eraser         = false;
    const eraseBtn = document.getElementById("jdErase");
    if (eraseBtn) eraseBtn.textContent = "✏️ Pen";
    this._setupLevel();
  }

  // ── Complete ──────────────────────────────────────────────────────────────

  private _completeLevel(): void {
    this._phase   = "complete";
    this._drawing = false;

    const ctx = this._ctx;
    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const fs  = Math.min(W, H) * 0.13;

    ctx.fillStyle    = "rgba(0,200,80,0.22)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle    = "#00b84a";
    ctx.font         = `bold ${fs}px Arial Black, Arial, sans-serif`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✓  Nice!", W/2, H/2);

    const tid = setTimeout(() => {
      this._levelIdx = (this._levelIdx + 1) % LEVELS.length;
      this._save();
      this._setupLevel();
      this._updateHUD();
    }, 1600);
    this._cleanup.push(() => clearTimeout(tid));
  }

  // ── Skip (Ad) ─────────────────────────────────────────────────────────────

  private _watchAd(): void {
    if (this._phase !== "draw") return;
    this._phase   = "complete";
    this._drawing = false;

    const W   = this._canvas.width;
    const H   = this._canvas.height;
    const ctx = this._ctx;
    const sc  = Math.min(W, H) / 600;

    const SKIP_AFTER  = 5;
    const AD_DURATION = 15;
    let elapsed = 0, lastTs = performance.now(), rafId = 0, canSkip = false;

    const btnRect = () => ({ x: W - 165, y: H - 95, w: 148, h: 44 });

    const finish = () => {
      cancelAnimationFrame(rafId);
      this._canvas.removeEventListener("click",      onSkipClick);
      this._canvas.removeEventListener("touchstart", onSkipTouch);
      this._canvas.style.cursor = "crosshair";
      window.speechSynthesis?.cancel();
      this._levelIdx = (this._levelIdx + 1) % LEVELS.length;
      this._save(); this._setupLevel(); this._updateHUD();
    };
    const hitTest = (cx: number, cy: number) => {
      if (!canSkip) return;
      const r = this._canvas.getBoundingClientRect();
      const x = (cx - r.left) * (W / r.width), y = (cy - r.top) * (H / r.height);
      const b = btnRect();
      if (x >= b.x && x <= b.x+b.w && y >= b.y && y <= b.y+b.h) finish();
    };
    const onSkipClick = (e: MouseEvent) => hitTest(e.clientX, e.clientY);
    const onSkipTouch = (e: TouchEvent) => { e.preventDefault(); hitTest(e.touches[0].clientX, e.touches[0].clientY); };
    this._canvas.addEventListener("click",      onSkipClick);
    this._canvas.addEventListener("touchstart", onSkipTouch, { passive: false });
    this._cleanup.push(() => {
      cancelAnimationFrame(rafId);
      this._canvas.removeEventListener("click",      onSkipClick);
      this._canvas.removeEventListener("touchstart", onSkipTouch);
    });

    // ── Ad definitions with unique animations ───────────────────────────────
    type AnimFn = (t: number) => void;
    interface AdDef { advertiser: string; ctaColor: string; speech: string; anim: AnimFn; }

    const overlay = (headline: string, sub: string, cta: string, ctaCol: string) => {
      const fade = ctx.createLinearGradient(0, H*0.58, 0, H*0.82);
      fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,0.78)");
      ctx.fillStyle = fade; ctx.fillRect(0, H*0.58, W, H*0.24);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${sc*62}px Arial Black, Arial, sans-serif`;
      ctx.fillText(headline, W/2, H*0.69);
      ctx.font = `${sc*34}px Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(sub, W/2, H*0.77);
      ctx.font = `bold ${sc*30}px Arial, sans-serif`;
      ctx.fillStyle = ctaCol;
      ctx.fillText(cta, W/2, H*0.84);
    };

    const ADS: AdDef[] = [

      // 1. GameStudio — side-scrolling platformer
      { advertiser: "GameStudio Inc.", ctaColor: "#ffcc00", speech: "Play now! The number one mobile game of 2026. Download for free today!", anim(t) {
        // Sky
        const sky = ctx.createLinearGradient(0,0,0,H*0.62);
        sky.addColorStop(0,"#1464a8"); sky.addColorStop(1,"#6cb4e4");
        ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.62);
        // Clouds scrolling
        ctx.fillStyle="rgba(255,255,255,0.9)";
        for(let i=0;i<3;i++){const cx2=((i*W/3+W-t*55)%(W+120))-60,cy2=H*(0.1+i*0.09);
          for(const[dx,dy,r] of [[0,0,22],[24,-9,17],[44,0,20]] as [number,number,number][]){ctx.beginPath();ctx.arc(cx2+dx*sc,cy2+dy*sc,r*sc,0,Math.PI*2);ctx.fill();}}
        // Ground
        ctx.fillStyle="#3d8c40"; ctx.fillRect(0,H*0.62,W,20*sc);
        ctx.fillStyle="#7a4e2d"; ctx.fillRect(0,H*0.62+20*sc,W,H);
        const tw=70*sc, off=(t*130)%tw;
        ctx.strokeStyle="#5c3a1e"; ctx.lineWidth=1.5;
        for(let x=-off;x<W;x+=tw){ctx.beginPath();ctx.moveTo(x,H*0.62+20*sc);ctx.lineTo(x,H);ctx.stroke();}
        // Pipe obstacle
        const px=((W*0.75-t*110)%(W+90))-45;
        ctx.fillStyle="#1a9a1a"; ctx.fillRect(px,H*0.4,40*sc,H*0.22);
        ctx.fillRect(px-5*sc,H*0.4,50*sc,18*sc);
        // Character jumping
        const jump=Math.abs(Math.sin(t*3.8))*H*0.22;
        ctx.font=`${48*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="bottom";
        ctx.fillText("🏃",W*0.28,H*0.62-jump);
        // Coins
        for(let i=0;i<4;i++){const gone=Math.floor(t*1.8+i*0.6)%3===0;
          if(!gone){ctx.font=`${28*sc}px serif`; ctx.fillText("🪙",W*0.42+i*W*0.1,H*0.45-Math.sin(t*2+i)*8*sc);}}
        // Score
        ctx.fillStyle="#fff"; ctx.font=`bold ${22*sc}px Arial`; ctx.textAlign="left"; ctx.textBaseline="top";
        ctx.fillText(`★ ${Math.floor(t*61)}`,14,14);
        overlay("🎮  PLAY NOW!","The #1 mobile game of 2026","FREE DOWNLOAD","#ffcc00");
      }},

      // 2. Pizza Palace — spinning pizza
      { advertiser: "Pizza Palace", ctaColor: "#ff4444", speech: "Order now from Pizza Palace! Fifty percent off your first order. Get the deal today!", anim(t) {
        ctx.fillStyle="#1a0800"; ctx.fillRect(0,0,W,H);
        // Oven glow
        const glow=ctx.createRadialGradient(W/2,H*0.42,20*sc,W/2,H*0.42,200*sc);
        glow.addColorStop(0,"rgba(255,120,0,0.45)"); glow.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
        // Spinning pizza
        ctx.save(); ctx.translate(W/2,H*0.38); ctx.rotate(t*0.8);
        const r=120*sc;
        ctx.fillStyle="#f5c842"; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#cc3300";
        for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,i*Math.PI/4,(i+0.5)*Math.PI/4);ctx.closePath();ctx.fill();}
        ctx.fillStyle="#e8e8e8";
        for(let i=0;i<6;i++){const a=i*Math.PI/3,d=65*sc;ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d,12*sc,0,Math.PI*2);ctx.fill();}
        ctx.restore();
        // Flying toppings
        for(let i=0;i<6;i++){const a=t*1.2+i*1.05,d=(60+i*20)*sc+Math.sin(t*2+i)*15*sc;
          ctx.font=`${24*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(["🍄","🫑","🧅","🫒","🥓","🌶️"][i],W/2+Math.cos(a)*d,H*0.38+Math.sin(a)*d);}
        overlay("🍕  ORDER NOW!","50% off your first order","GET THE DEAL","#ff4444");
      }},

      // 3. FitLife Pro — workout barbell
      { advertiser: "FitLife Pro", ctaColor: "#88ff44", speech: "Get ripped with FitLife Pro! Transform your body in just 30 days. Try it free now!", anim(t) {
        const bg=ctx.createLinearGradient(0,0,0,H);
        bg.addColorStop(0,"#0a1a0a"); bg.addColorStop(1,"#0f2f0f");
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
        // Floor
        ctx.fillStyle="#1a3a1a"; ctx.fillRect(0,H*0.62,W,H);
        ctx.fillStyle="#22cc22"; ctx.fillRect(0,H*0.62,W,3);
        // Stick figure doing curls
        const armAngle=Math.sin(t*2.5)*0.9+0.1;
        const hy=H*0.33, hx=W/2;
        // Head
        ctx.strokeStyle="#88ff44"; ctx.lineWidth=3*sc; ctx.lineCap="round";
        ctx.beginPath(); ctx.arc(hx,hy-28*sc,18*sc,0,Math.PI*2); ctx.stroke();
        // Body
        ctx.beginPath(); ctx.moveTo(hx,hy-10*sc); ctx.lineTo(hx,hy+60*sc); ctx.stroke();
        // Legs
        ctx.beginPath(); ctx.moveTo(hx,hy+60*sc); ctx.lineTo(hx-25*sc,hy+110*sc); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(hx,hy+60*sc); ctx.lineTo(hx+25*sc,hy+110*sc); ctx.stroke();
        // Arm holding barbell
        const ex=hx-30*sc+Math.cos(armAngle)*55*sc, ey=hy+20*sc-Math.sin(armAngle)*55*sc;
        ctx.beginPath(); ctx.moveTo(hx-10*sc,hy+15*sc); ctx.lineTo(ex,ey); ctx.stroke();
        // Barbell
        ctx.lineWidth=5*sc; ctx.strokeStyle="#ccc";
        ctx.beginPath(); ctx.moveTo(ex-30*sc,ey); ctx.lineTo(ex+30*sc,ey); ctx.stroke();
        ctx.fillStyle="#aaa";
        for(const dx of [-28,28]){ctx.beginPath();ctx.arc(ex+dx*sc,ey,10*sc,0,Math.PI*2);ctx.fill();}
        // Progress bar
        const prog=Math.min(1,(Math.sin(t*0.5)*0.5+0.5));
        ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.fillRect(W*0.1,H*0.78,W*0.8,16*sc);
        ctx.fillStyle="#88ff44"; ctx.fillRect(W*0.1,H*0.78,W*0.8*prog,16*sc);
        ctx.fillStyle="#fff"; ctx.font=`bold ${18*sc}px Arial`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(`${Math.floor(prog*100)}% Complete`,W/2,H*0.78+8*sc);
        overlay("💪  GET RIPPED!","Transform your body in 30 days","TRY FREE","#88ff44");
      }},

      // 4. TechGear — phone with notifications
      { advertiser: "TechGear Store", ctaColor: "#4499ff", speech: "New phones at TechGear Store! Unbeatable prices on the latest models. Shop now!", anim(t) {
        ctx.fillStyle="#060a1a"; ctx.fillRect(0,0,W,H);
        // Grid background
        ctx.strokeStyle="rgba(68,153,255,0.1)"; ctx.lineWidth=1;
        for(let x=0;x<W;x+=40*sc){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
        for(let y=0;y<H;y+=40*sc){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
        // Phone outline
        const pw=120*sc,ph=200*sc,px2=W/2-pw/2,py2=H*0.14;
        ctx.fillStyle="#111"; ctx.strokeStyle="#4499ff"; ctx.lineWidth=3*sc;
        ctx.beginPath(); ctx.roundRect(px2,py2,pw,ph,14*sc); ctx.fill(); ctx.stroke();
        // Screen glow
        const pulse=0.6+Math.sin(t*2)*0.4;
        const sg=ctx.createLinearGradient(px2,py2,px2+pw,py2+ph);
        sg.addColorStop(0,`rgba(68,153,255,${pulse*0.7})`); sg.addColorStop(1,`rgba(0,80,200,${pulse*0.4})`);
        ctx.fillStyle=sg; ctx.beginPath(); ctx.roundRect(px2+6*sc,py2+12*sc,pw-12*sc,ph-22*sc,8*sc); ctx.fill();
        // App icons on screen
        const apps=["📱","🎮","📸","🎵","💬","🔴"];
        for(let i=0;i<6;i++){const ax=px2+14*sc+(i%3)*34*sc,ay=py2+24*sc+Math.floor(i/3)*40*sc;
          ctx.font=`${20*sc}px serif`; ctx.textAlign="left"; ctx.textBaseline="top"; ctx.fillText(apps[i],ax,ay);}
        // Notification badges popping
        for(let i=0;i<3;i++){const delay=i*1.2, phase=(t-delay)%4;
          if(phase>0&&phase<2){const nx=px2+pw*(0.2+i*0.3),ny=py2-12*sc-phase*8*sc;
            const alpha=1-phase/2;
            ctx.fillStyle=`rgba(255,60,60,${alpha})`; ctx.beginPath(); ctx.arc(nx,ny,10*sc,0,Math.PI*2); ctx.fill();
            ctx.fillStyle=`rgba(255,255,255,${alpha})`; ctx.font=`bold ${11*sc}px Arial`; ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.fillText(String(Math.floor(Math.random()*9)+1),nx,ny);}}
        // Floating specs
        const specs=["5G","256GB","48MP"];
        for(let i=0;i<3;i++){const sy2=(H*0.2+i*H*0.12+t*30*sc)%(H*0.55)+H*0.1;
          ctx.fillStyle="rgba(68,153,255,0.6)"; ctx.font=`bold ${14*sc}px Arial`; ctx.textAlign="right"; ctx.textBaseline="middle";
          ctx.fillText(specs[i],px2-12*sc,sy2);}
        overlay("📱  NEW PHONES!","Unbeatable prices on latest models","SHOP NOW","#4499ff");
      }},

      // 5. MusicStream — equalizer
      { advertiser: "MusicStream", ctaColor: "#cc66ff", speech: "One hundred million songs on MusicStream! Listen completely ad-free for three months free. Start your free trial today!", anim(t) {
        ctx.fillStyle="#0a0014"; ctx.fillRect(0,0,W,H);
        // Pulsing background circles
        for(let i=2;i>=0;i--){const r=(80+i*60)*sc+Math.sin(t*3+i)*10*sc;
          const g=ctx.createRadialGradient(W/2,H*0.35,0,W/2,H*0.35,r);
          g.addColorStop(0,`rgba(136,51,238,${0.25-i*0.07})`); g.addColorStop(1,"rgba(0,0,0,0)");
          ctx.fillStyle=g; ctx.fillRect(0,0,W,H);}
        // Album art circle
        ctx.fillStyle="#220044"; ctx.beginPath(); ctx.arc(W/2,H*0.35,65*sc,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="#8833ee"; ctx.lineWidth=3*sc;
        ctx.beginPath(); ctx.arc(W/2,H*0.35,65*sc,0,Math.PI*2); ctx.stroke();
        ctx.font=`${60*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("🎵",W/2,H*0.35);
        // Rotating vinyl
        ctx.strokeStyle="rgba(136,51,238,0.3)"; ctx.lineWidth=1;
        for(let r=20*sc;r<65*sc;r+=8*sc){ctx.beginPath();ctx.arc(W/2,H*0.35,r,0,Math.PI*2);ctx.stroke();}
        // EQ bars
        const barCount=18, barW=W*0.78/barCount, barX=W*0.11;
        for(let i=0;i<barCount;i++){const bh=(Math.sin(t*4+i*0.7)*0.5+0.5)*H*0.18+H*0.02;
          const hue=260+i*5;
          ctx.fillStyle=`hsl(${hue},80%,60%)`; ctx.fillRect(barX+i*barW+1,H*0.62-bh,barW-2,bh);}
        // Floating notes
        for(let i=0;i<5;i++){const nx=W*(0.15+i*0.18),ny=((H*0.55-t*45*sc*((i%2)*0.5+0.8))%(H*0.5)+H*0.05);
          ctx.font=`${22*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.globalAlpha=0.7; ctx.fillText(["🎵","🎶","🎵","🎵","🎶"][i],nx,ny); ctx.globalAlpha=1;}
        overlay("🎵  100M SONGS!","Listen ad-free for 3 months free","START FREE TRIAL","#cc66ff");
      }},

      // 6. BrewMaster Coffee — filling cup + steam
      { advertiser: "BrewMaster Coffee", ctaColor: "#ff9900", speech: "Fresh coffee from BrewMaster! Premium roasts delivered right to your door every month. Subscribe now!", anim(t) {
        ctx.fillStyle="#1a0800"; ctx.fillRect(0,0,W,H);
        const bg=ctx.createRadialGradient(W/2,H*0.5,0,W/2,H*0.5,W*0.6);
        bg.addColorStop(0,"rgba(80,30,0,0.5)"); bg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
        // Cup body
        const cx2=W/2,cy2=H*0.48,cw=130*sc,ch=110*sc;
        ctx.fillStyle="#f5e6d0"; ctx.strokeStyle="#c8a060"; ctx.lineWidth=3*sc;
        ctx.beginPath();
        ctx.moveTo(cx2-cw/2+10*sc,cy2-ch/2); ctx.lineTo(cx2-cw/2-5*sc,cy2+ch/2);
        ctx.lineTo(cx2+cw/2+5*sc,cy2+ch/2); ctx.lineTo(cx2+cw/2-10*sc,cy2-ch/2);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Coffee filling animation
        const fill=Math.min(1,(t%6)/4);
        const fy=cy2-ch/2+(1-fill)*ch;
        ctx.fillStyle="#4a2000";
        ctx.beginPath();
        ctx.moveTo(cx2-cw/2+10*sc+(fill*(cw-10*sc)*0.05),fy);
        ctx.lineTo(cx2-cw/2-5*sc+fill*5*sc,cy2+ch/2-2);
        ctx.lineTo(cx2+cw/2+5*sc-fill*5*sc,cy2+ch/2-2);
        ctx.lineTo(cx2+cw/2-10*sc-(fill*(cw-10*sc)*0.05),fy);
        ctx.closePath(); ctx.fill();
        // Coffee pour stream
        if(fill<0.95){ctx.strokeStyle="#6b3000"; ctx.lineWidth=8*sc;
          ctx.beginPath(); ctx.moveTo(cx2,cy2-ch/2-60*sc); ctx.lineTo(cx2,fy); ctx.stroke();}
        // Handle
        ctx.beginPath(); ctx.arc(cx2+cw/2+10*sc,cy2+10*sc,28*sc,Math.PI*0.3,Math.PI*1.7,false);
        ctx.stroke();
        // Steam wisps
        for(let i=-1;i<=1;i++){const sx=cx2+i*25*sc, st=t+i*0.6;
          ctx.strokeStyle=`rgba(255,255,255,${0.4+Math.sin(st*2)*0.2})`; ctx.lineWidth=2.5*sc;
          ctx.beginPath(); ctx.moveTo(sx,cy2-ch/2);
          ctx.bezierCurveTo(sx+15*sc,cy2-ch/2-25*sc,sx-15*sc,cy2-ch/2-50*sc,sx,cy2-ch/2-80*sc);
          ctx.stroke();}
        overlay("☕  FRESH COFFEE!","Premium roasts delivered monthly","SUBSCRIBE NOW","#ff9900");
      }},

      // 7. HomeChef — ingredients raining into bowl
      { advertiser: "HomeChef Meals", ctaColor: "#00ffaa", speech: "Eat healthy with HomeChef! Fresh ingredients delivered straight to your door. Your first box is completely free!", anim(t) {
        const bg=ctx.createLinearGradient(0,0,0,H);
        bg.addColorStop(0,"#0a1f0a"); bg.addColorStop(1,"#051005");
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
        // Bowl
        const bx=W/2,by=H*0.6,br=100*sc;
        ctx.fillStyle="#e8d5b0"; ctx.strokeStyle="#c4a56a"; ctx.lineWidth=4*sc;
        ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI,false); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx-br,by); ctx.lineTo(bx+br,by); ctx.stroke();
        // Contents in bowl (accumulating)
        const items=["🥕","🥦","🍅","🧅","🥬","🫑","🍋"];
        const count=Math.min(items.length,Math.floor(t*0.8)+1);
        for(let i=0;i<count;i++){ctx.font=`${26*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(items[i],bx+(i%3-1)*28*sc,by-12*sc+Math.floor(i/3)*-22*sc);}
        // Falling ingredients
        for(let i=0;i<6;i++){const phase=(t*0.9+i*0.7)%3;
          const fx=W*(0.15+i*0.13), fy=H*0.05+phase*H*0.55;
          if(fy<by-10*sc){ctx.font=`${28*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.fillText(items[(i+Math.floor(t*0.5))%items.length],fx,fy);}}
        overlay("🥗  EAT HEALTHY!","Fresh ingredients at your door","FIRST BOX FREE","#00ffaa");
      }},

      // 8. CarDeal — driving on road
      { advertiser: "CarDeal.com", ctaColor: "#ff6600", speech: "Best deals at CarDeal dot com! New and used cars with zero percent APR financing. Find your perfect car today!", anim(t) {
        // Sky sunset
        const sky=ctx.createLinearGradient(0,0,0,H*0.55);
        sky.addColorStop(0,"#1a0a00"); sky.addColorStop(0.5,"#cc4400"); sky.addColorStop(1,"#ff8800");
        ctx.fillStyle=sky; ctx.fillRect(0,0,W,H*0.55);
        // Sun
        ctx.fillStyle="#ffcc00"; ctx.beginPath(); ctx.arc(W*0.75,H*0.22,35*sc,0,Math.PI*2); ctx.fill();
        // Road
        ctx.fillStyle="#333"; ctx.fillRect(0,H*0.55,W,H*0.45);
        ctx.fillStyle="#555"; ctx.fillRect(0,H*0.55,W,8*sc);
        // Dashes scrolling
        ctx.fillStyle="#ffcc00"; ctx.setLineDash([]);
        const dw=60*sc, gap=50*sc, off2=(t*200)%(dw+gap);
        for(let x=-off2;x<W+dw;x+=dw+gap){ctx.fillRect(x,H*0.73,dw,5*sc);}
        // Speed lines
        ctx.strokeStyle="rgba(255,150,0,0.3)"; ctx.lineWidth=1.5;
        for(let i=0;i<8;i++){const lx=((W*i/8-t*300)%(W+100))-50;
          ctx.beginPath(); ctx.moveTo(lx,H*0.55); ctx.lineTo(lx+80*sc,H); ctx.stroke();}
        // Car (drawn shapes)
        const cx2=W*0.42,cy2=H*0.65;
        ctx.fillStyle="#cc2200";
        ctx.beginPath(); ctx.roundRect(cx2-90*sc,cy2-20*sc,180*sc,35*sc,5*sc); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx2-55*sc,cy2-45*sc,110*sc,28*sc,8*sc); ctx.fill();
        // Windows
        ctx.fillStyle="rgba(150,200,255,0.7)";
        ctx.beginPath(); ctx.roundRect(cx2-48*sc,cy2-42*sc,46*sc,22*sc,4*sc); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx2+2*sc,cy2-42*sc,46*sc,22*sc,4*sc); ctx.fill();
        // Wheels spinning
        for(const wx of [cx2-55*sc,cx2+55*sc]){
          ctx.fillStyle="#222"; ctx.beginPath(); ctx.arc(wx,cy2+16*sc,18*sc,0,Math.PI*2); ctx.fill();
          ctx.strokeStyle="#888"; ctx.lineWidth=2*sc;
          for(let i=0;i<4;i++){const a=t*8+i*Math.PI/2;
            ctx.beginPath(); ctx.moveTo(wx,cy2+16*sc); ctx.lineTo(wx+Math.cos(a)*14*sc,cy2+16*sc+Math.sin(a)*14*sc); ctx.stroke();}}
        overlay("🚗  BEST DEALS!","New & used cars — 0% APR financing","FIND YOUR CAR","#ff6600");
      }},

      // 9. SkyFly Airlines — plane with clouds
      { advertiser: "SkyFly Airlines", ctaColor: "#00aaff", speech: "Fly cheap with SkyFly Airlines! Flights from just twenty nine dollars. Search flights and book today!", anim(t) {
        const sky2=ctx.createLinearGradient(0,0,0,H);
        sky2.addColorStop(0,"#001844"); sky2.addColorStop(0.5,"#0055cc"); sky2.addColorStop(1,"#4499ff");
        ctx.fillStyle=sky2; ctx.fillRect(0,0,W,H);
        // Stars at top
        for(let i=0;i<20;i++){const sx=(i*W/20+t*5)%W,sy=H*0.05+i%4*H*0.05;
          ctx.fillStyle=`rgba(255,255,255,${0.4+Math.sin(t*2+i)*0.3})`; ctx.beginPath(); ctx.arc(sx,sy,1.5*sc,0,Math.PI*2); ctx.fill();}
        // Clouds layers (parallax)
        for(let layer=0;layer<2;layer++){
          ctx.fillStyle=layer===0?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.5)";
          const speed=layer===0?60:30, ypos=H*(0.3+layer*0.2);
          for(let i=0;i<3;i++){const cx2=((i*W/3+W-t*speed)%(W+200))-100;
            for(const[dx,dy,r] of [[0,0,30],[34,-12,24],[60,0,28],[88,-8,22],[115,0,26]] as [number,number,number][]){
              ctx.beginPath(); ctx.arc(cx2+dx*sc,ypos+dy*sc,r*sc,0,Math.PI*2); ctx.fill();}}}
        // Plane with contrail
        const planeX=W*0.35+Math.sin(t*0.5)*W*0.1, planeY=H*0.32+Math.sin(t*0.8)*H*0.06;
        // Contrail
        ctx.strokeStyle="rgba(255,255,255,0.5)"; ctx.lineWidth=6*sc;
        ctx.beginPath(); ctx.moveTo(planeX,planeY);
        for(let i=1;i<=10;i++){ctx.lineTo(planeX-i*20*sc,planeY+i*2*sc*Math.sin(i*0.3));}
        ctx.stroke();
        ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=3*sc;
        ctx.beginPath(); ctx.moveTo(planeX,planeY+8*sc);
        for(let i=1;i<=10;i++){ctx.lineTo(planeX-i*20*sc,planeY+8*sc+i*2*sc*Math.sin(i*0.3));}
        ctx.stroke();
        ctx.font=`${60*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("✈️",planeX,planeY);
        overlay("✈️  FLY CHEAP!","Flights from $29 — book today","SEARCH FLIGHTS","#00aaff");
      }},

      // 10. PetPal — bouncing dog with hearts
      { advertiser: "PetPal Shop", ctaColor: "#ff44ff", speech: "Your pet deserves the very best! PetPal Shop delivers premium food and toys right to your door. Shop pet deals today!", anim(t) {
        const bg=ctx.createLinearGradient(0,0,0,H);
        bg.addColorStop(0,"#1a0020"); bg.addColorStop(1,"#330044");
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
        // Floor
        ctx.fillStyle="#440066"; ctx.fillRect(0,H*0.65,W,H);
        ctx.fillStyle="#aa44ff"; ctx.fillRect(0,H*0.65,W,3*sc);
        // Shadow under dog
        const bounce=Math.abs(Math.sin(t*3))*H*0.18;
        ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(W/2,H*0.65,45*sc*(1-bounce/(H*0.18)*0.4),8*sc,0,0,Math.PI*2); ctx.fill();
        // Dog bouncing
        const dy=H*0.6-bounce;
        ctx.font=`${90*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="bottom";
        ctx.fillText("🐶",W/2,dy);
        // Squash/stretch effect
        ctx.save(); ctx.translate(W/2,dy);
        const squash=bounce<5*sc?1.3:1; ctx.scale(squash,1/squash);
        ctx.restore();
        // Floating hearts
        for(let i=0;i<6;i++){const hx=W*(0.2+i*0.12),phase=(t*0.7+i*0.5)%3,hy2=H*0.6-phase*H*0.4;
          const alpha=1-phase/3;
          ctx.globalAlpha=alpha; ctx.font=`${(18+i%3*8)*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(["❤️","💕","💖","💗","💓","💝"][i],hx,hy2); ctx.globalAlpha=1;}
        // Paw prints on floor
        for(let i=0;i<5;i++){const px2=W*(0.15+i*0.18),pphase=(t*0.4+i*0.7)%2;
          ctx.globalAlpha=pphase<0.2?pphase/0.2:pphase>1.8?(2-pphase)/0.2:1;
          ctx.font=`${16*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText("🐾",px2,H*0.68); ctx.globalAlpha=1;}
        overlay("🐶  PET PARADISE!","Premium food & toys delivered","SHOP PET DEALS","#ff44ff");
      }},

      // 11. CryptoMoon — chart going up
      { advertiser: "CryptoMoon", ctaColor: "#ffdd00", speech: "Want to get rich? Invest in the future with CryptoMoon! Join millions of investors today. Results may vary.", anim(t) {
        ctx.fillStyle="#05050f"; ctx.fillRect(0,0,W,H);
        ctx.strokeStyle="rgba(255,221,0,0.07)"; ctx.lineWidth=1;
        for(let x=0;x<W;x+=40*sc){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
        for(let y=0;y<H;y+=40*sc){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
        // Animated line chart going up with wiggles
        const pts:number[]=[];
        const chartW=W*0.8,chartX=W*0.1,chartY=H*0.62,chartH=H*0.38;
        for(let i=0;i<=30;i++){const x=chartX+i/30*chartW;
          const trend=(i/30)*chartH*0.8;
          const wiggle=Math.sin(i*1.2+t*3)*chartH*0.08+Math.cos(i*0.7-t*2)*chartH*0.04;
          pts.push(x,chartY-trend+wiggle);}
        // Area fill
        ctx.beginPath(); ctx.moveTo(pts[0],chartY);
        for(let i=0;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);
        ctx.lineTo(pts[pts.length-2],chartY); ctx.closePath();
        const areaGrad=ctx.createLinearGradient(0,chartY-chartH*0.8,0,chartY);
        areaGrad.addColorStop(0,"rgba(255,221,0,0.3)"); areaGrad.addColorStop(1,"rgba(255,221,0,0)");
        ctx.fillStyle=areaGrad; ctx.fill();
        // Line
        ctx.strokeStyle="#ffdd00"; ctx.lineWidth=3*sc; ctx.lineJoin="round";
        ctx.beginPath(); ctx.moveTo(pts[0],pts[1]);
        for(let i=2;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);
        ctx.stroke();
        // Price label
        ctx.fillStyle="#ffdd00"; ctx.font=`bold ${22*sc}px Arial`; ctx.textAlign="right"; ctx.textBaseline="middle";
        ctx.fillText(`$${(42000+Math.floor(t*850)).toLocaleString()}`,W*0.9,pts[pts.length-1]);
        // Floating coins
        for(let i=0;i<4;i++){const cx2=W*(0.15+i*0.22),phase=(t*0.6+i*1.1)%3,cy2=H*0.55-phase*H*0.35;
          ctx.globalAlpha=1-phase/3; ctx.font=`${28*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText("🪙",cx2,cy2); ctx.globalAlpha=1;}
        ctx.fillStyle="#ffdd00"; ctx.font=`bold ${32*sc}px Arial Black`; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(`📈 +${(120+Math.floor(t*8))}%`,W/2,H*0.18);
        overlay("💰  GET RICH?","Invest in the future today*","INVEST NOW","#ffdd00");
      }},

      // 12. NatureHike — walking through mountains
      { advertiser: "NatureHike Gear", ctaColor: "#00cc88", speech: "Go explore the great outdoors with NatureHike Gear! Camping and hiking equipment at forty percent off. Shop gear now!", anim(t) {
        // Sky gradient
        const sky3=ctx.createLinearGradient(0,0,0,H*0.5);
        sky3.addColorStop(0,"#001a33"); sky3.addColorStop(1,"#004466");
        ctx.fillStyle=sky3; ctx.fillRect(0,0,W,H*0.5);
        // Stars
        for(let i=0;i<15;i++){const sx=i*W/15+7,sy=H*0.04+i%3*H*0.08;
          ctx.fillStyle=`rgba(255,255,255,${0.5+Math.sin(t*1.5+i)*0.3})`; ctx.beginPath(); ctx.arc(sx,sy,1.5*sc,0,Math.PI*2); ctx.fill();}
        // Moon
        ctx.fillStyle="#ffeeaa"; ctx.beginPath(); ctx.arc(W*0.82,H*0.1,22*sc,0,Math.PI*2); ctx.fill();
        // Mountains back
        ctx.fillStyle="#0a2a1a";
        ctx.beginPath(); ctx.moveTo(0,H*0.5);
        for(let x=0;x<=W;x+=W/8){const h=H*(0.15+Math.sin(x/W*Math.PI*2+0.5)*0.12);ctx.lineTo(x,H*0.5-h);}
        ctx.lineTo(W,H*0.5); ctx.closePath(); ctx.fill();
        // Mountains front
        ctx.fillStyle="#0f3d20";
        ctx.beginPath(); ctx.moveTo(0,H*0.55);
        for(let x=0;x<=W;x+=W/6){const h=H*(0.1+Math.sin(x/W*Math.PI*3+1)*0.1);ctx.lineTo(x,H*0.55-h);}
        ctx.lineTo(W,H*0.55); ctx.closePath(); ctx.fill();
        // Ground / path
        ctx.fillStyle="#1a4a25"; ctx.fillRect(0,H*0.55,W,H*0.45);
        ctx.fillStyle="#2a6a35"; ctx.fillRect(0,H*0.55,W,6*sc);
        // Path dashes
        const poff=(t*80)%60;
        ctx.fillStyle="rgba(180,140,80,0.5)";
        for(let x=-poff;x<W;x+=60*sc){ctx.fillRect(x,H*0.66,35*sc,5*sc);}
        // Trees scrolling
        for(let i=0;i<4;i++){const tx=((i*W/4+W-t*60)%(W+80))-40;
          ctx.font=`${44*sc}px serif`; ctx.textAlign="center"; ctx.textBaseline="bottom";
          ctx.fillText("🌲",tx,H*0.56);}
        // Hiker walking
        const legSwing=Math.sin(t*4)*0.5, wx=W*0.38, wy=H*0.67;
        ctx.strokeStyle="#00cc88"; ctx.lineWidth=3*sc; ctx.lineCap="round";
        ctx.beginPath(); ctx.arc(wx,wy-50*sc,12*sc,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx,wy-38*sc); ctx.lineTo(wx,wy-10*sc); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx,wy-10*sc); ctx.lineTo(wx+Math.sin(legSwing)*20*sc,wy+10*sc); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx,wy-10*sc); ctx.lineTo(wx-Math.sin(legSwing)*20*sc,wy+10*sc); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx,wy-30*sc); ctx.lineTo(wx+Math.sin(legSwing+0.5)*18*sc,wy-18*sc); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx,wy-30*sc); ctx.lineTo(wx-Math.sin(legSwing+0.5)*18*sc,wy-18*sc); ctx.stroke();
        // Hiking pole
        ctx.strokeStyle="#888"; ctx.lineWidth=2*sc;
        ctx.beginPath(); ctx.moveTo(wx+15*sc,wy-25*sc); ctx.lineTo(wx+22*sc+Math.sin(legSwing)*5*sc,wy+10*sc); ctx.stroke();
        overlay("🏕️  GO EXPLORE!","Camping & hiking gear — 40% off","SHOP GEAR","#00cc88");
      }},
    ];

    const ad = ADS[Math.floor(Math.random() * ADS.length)];

    // Speak the ad voiceover
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(ad.speech);
      utter.rate  = 1.05;
      utter.pitch = 1.0;
      // Pick a slightly different voice each time if available
      const voices = window.speechSynthesis.getVoices();
      const enVoices = voices.filter(v => v.lang.startsWith("en"));
      if (enVoices.length) utter.voice = enVoices[Math.floor(Math.random() * enVoices.length)];
      window.speechSynthesis.speak(utter);
    }

    const loop = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts; elapsed += dt;
      canSkip = elapsed >= SKIP_AFTER;
      if (elapsed >= AD_DURATION) { finish(); return; }
      this._canvas.style.cursor = canSkip ? "pointer" : "default";

      // Draw animated ad scene
      ad.anim(elapsed);

      // ── YouTube chrome ──────────────────────────────────────────────
      const fade2 = ctx.createLinearGradient(0, H*0.82, 0, H);
      fade2.addColorStop(0, "rgba(0,0,0,0)"); fade2.addColorStop(1, "rgba(0,0,0,0.92)");
      ctx.fillStyle = fade2; ctx.fillRect(0, H*0.82, W, H*0.18);

      const pct = elapsed / AD_DURATION;
      ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(0, H-5, W, 5);
      ctx.fillStyle = "#ff0000";               ctx.fillRect(0, H-5, W*pct, 5);
      ctx.beginPath(); ctx.arc(W*pct, H-5, 7, 0, Math.PI*2); ctx.fillStyle="#ff0000"; ctx.fill();

      const bx = 14, by = H - 62;
      ctx.fillStyle = "#ffcc00"; ctx.beginPath(); ctx.roundRect(bx, by, 30, 20, 3); ctx.fill();
      ctx.fillStyle = "#000"; ctx.font = "bold 11px Arial, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("Ad", bx+8, by+10);
      ctx.fillStyle = "#fff"; ctx.font = "13px Arial, sans-serif";
      ctx.fillText(ad.advertiser, bx+38, by+10);
      ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = "11px Arial, sans-serif";
      ctx.textAlign = "right"; ctx.fillText("Why this ad?", W-14, by+10);

      const b = btnRect();
      if (canSkip) {
        ctx.fillStyle = "rgba(20,20,20,0.92)";
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("Skip Ad  ▶▶", b.x+b.w/2, b.y+b.h/2);
      } else {
        const rem = Math.ceil(SKIP_AFTER - elapsed);
        ctx.fillStyle = "rgba(20,20,20,0.7)";
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 4); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = "13px Arial, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`Skip in ${rem}...`, b.x+b.w/2, b.y+b.h/2);
      }

      rafId = requestAnimationFrame(loop);
    };

    lastTs = performance.now();
    rafId  = requestAnimationFrame(loop);
  }

  // ── Eraser ────────────────────────────────────────────────────────────────

  private _toggleEraser(): void {
    this._eraser = !this._eraser;
    const btn = document.getElementById("jdErase") as HTMLButtonElement | null;
    if (btn) {
      btn.textContent      = this._eraser ? "🧹 Erase" : "✏️ Pen";
      btn.style.background = this._eraser ? "#ffe0e0" : "#eee";
    }
    this._canvas.style.cursor = this._eraser ? "cell" : "crosshair";
  }

  // ── Persist ───────────────────────────────────────────────────────────────

  private _save(): void { localStorage.setItem(SAVE_KEY, String(this._levelIdx)); }
  private _load(): number {
    const n = parseInt(localStorage.getItem(SAVE_KEY) ?? "0", 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(LEVELS.length - 1, n));
  }

  // ── End ───────────────────────────────────────────────────────────────────

  private _end(): void {
    this._cleanup.forEach(fn => fn());
    this._g.goArcade();
  }
}
