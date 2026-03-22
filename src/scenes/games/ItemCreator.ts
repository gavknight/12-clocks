import type { Game } from "../../game/Game";

export const ITEM_SAVE_KEY = "item_creator_v1";
const GRID = 16;

export interface CustomItem {
  name: string;
  pixels: string[];
  behavior: "solid" | "deadly" | "bounce" | "slip" | "pass";
}

const PALETTE = [
  "#ffffff","#cccccc","#888888","#000000",
  "#ff4444","#ff8800","#ffdd00","#88cc22",
  "#22ccaa","#4488ff","#8844ff","#ff44cc",
  "#884422","#44aa44","#224488","#ffaa44",
];
const BEHAVIORS: CustomItem["behavior"][] = ["solid","deadly","bounce","slip","pass"];
const BEHAV_LABELS: Record<CustomItem["behavior"],string> = {
  solid:"🧱 Solid Block", deadly:"💀 Deadly", bounce:"🟢 Bouncy", slip:"🧊 Slippery", pass:"👻 Pass-thru",
};
const BEHAV_COLORS: Record<CustomItem["behavior"],string> = {
  solid:"#0078d4", deadly:"#c42b1c", bounce:"#009900", slip:"#0099aa", pass:"#666",
};

export class ItemCreator {
  private _g: Game;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;

  private _pixels: string[] = Array(GRID*GRID).fill("");
  private _selColor = "#ff4444";
  private _erasing  = false;
  private _painting = false;
  private _name     = "My Block";
  private _behavior: CustomItem["behavior"] = "solid";

  private _cellSize = 20;
  private _gridX    = 0;
  private _gridY    = 0;

  private _saveFlash = 0;
  private _done      = false;
  private _raf       = 0;
  private _lastTs    = 0;
  private _cleanup: (() => void)[] = [];

  constructor(g: Game) {
    this._g = g;
    g.ui.innerHTML = `<div style="position:relative;width:100%;height:100%;overflow:hidden;pointer-events:all;"><canvas id="icCanvas" style="display:block;width:100%;height:100%;touch-action:none;"></canvas></div>`;
    this._canvas = document.getElementById("icCanvas") as HTMLCanvasElement;
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._ctx = this._canvas.getContext("2d")!;
    g.inMiniGame = false; // cursor stays visible so controller can navigate/click
    g.autoClickCallback = null;

    this._load();
    this._calcLayout();

    const onMD = (e: MouseEvent) => this._ptrDown(e.clientX, e.clientY);
    const onMM = (e: MouseEvent) => { if (this._painting) this._ptrMove(e.clientX, e.clientY); };
    const onMU = () => { this._painting = false; };
    this._canvas.addEventListener("mousedown", onMD);
    this._canvas.addEventListener("mousemove", onMM);
    window.addEventListener("mouseup", onMU);
    this._cleanup.push(()=>{ this._canvas.removeEventListener("mousedown",onMD); this._canvas.removeEventListener("mousemove",onMM); window.removeEventListener("mouseup",onMU); });

    const onTS = (e: TouchEvent) => { e.preventDefault(); const t=e.touches[0]; this._ptrDown(t.clientX,t.clientY); };
    const onTM = (e: TouchEvent) => { e.preventDefault(); if(this._painting){const t=e.touches[0];this._ptrMove(t.clientX,t.clientY);} };
    const onTE = () => { this._painting=false; };
    this._canvas.addEventListener("touchstart",onTS,{passive:false});
    this._canvas.addEventListener("touchmove",onTM,{passive:false});
    this._canvas.addEventListener("touchend",onTE,{passive:false});
    this._cleanup.push(()=>{ this._canvas.removeEventListener("touchstart",onTS); this._canvas.removeEventListener("touchmove",onTM); this._canvas.removeEventListener("touchend",onTE); });

    const onR = () => { this._canvas.width=window.innerWidth; this._canvas.height=window.innerHeight; this._calcLayout(); };
    window.addEventListener("resize",onR);
    this._cleanup.push(()=>window.removeEventListener("resize",onR));

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _calcLayout(): void {
    const W=this._canvas.width, H=this._canvas.height;
    const avail = Math.min(W-80, H-116);
    this._cellSize = Math.max(10, Math.floor(avail/GRID));
    const gs = this._cellSize*GRID;
    this._gridX = Math.floor((W-64-gs)/2);
    this._gridY = 58+Math.floor((H-116-gs)/2);
    if (this._gridY < 58) this._gridY = 58;
  }

  private _load(): void {
    try {
      const d = JSON.parse(localStorage.getItem(ITEM_SAVE_KEY)??"") as CustomItem;
      this._pixels   = Array.isArray(d.pixels)&&d.pixels.length===GRID*GRID ? d.pixels.slice() : Array(GRID*GRID).fill("");
      this._name     = typeof d.name==="string" ? d.name.slice(0,20) : "My Block";
      this._behavior = BEHAVIORS.includes(d.behavior) ? d.behavior : "solid";
    } catch { /* use defaults */ }
  }

  private _save(): void {
    localStorage.setItem(ITEM_SAVE_KEY, JSON.stringify({name:this._name, pixels:this._pixels.slice(), behavior:this._behavior}));
    this._saveFlash = 2.5;
  }

  private _cxy(cx: number, cy: number) {
    const r=this._canvas.getBoundingClientRect();
    return {x:(cx-r.left)*(this._canvas.width/r.width), y:(cy-r.top)*(this._canvas.height/r.height)};
  }

  private _ptrDown(cx: number, cy: number): void {
    const {x,y}=this._cxy(cx,cy);
    const W=this._canvas.width, H=this._canvas.height;
    if (x<104&&y<54) { this._end(); return; }
    // Name box click
    if (y<54&&x>=108&&x<=280) {
      const n=prompt("Item name:", this._name);
      if (n) this._name=n.slice(0,20);
      return;
    }
    // Behavior button
    if (y<54&&x>284) {
      const i=BEHAVIORS.indexOf(this._behavior);
      this._behavior=BEHAVIORS[(i+1)%BEHAVIORS.length];
      return;
    }
    // Palette (right strip, x >= W-62)
    if (x>=W-62) {
      const palX=W-60, palY=68, sw=13,sh=13,gap=2;
      // Erase button
      const eraseY=palY+14+(PALETTE.length/4)*(sh+gap)+6;
      if (y>=eraseY&&y<eraseY+24) { this._erasing=!this._erasing; return; }
      // Color swatches
      const col=Math.floor((x-palX)/(sw+gap));
      const row=Math.floor((y-palY-14)/(sh+gap));
      const i=row*4+col;
      if (i>=0&&i<PALETTE.length) { this._selColor=PALETTE[i]; this._erasing=false; }
      return;
    }
    // Bottom bar
    if (y>H-46) {
      if (x<110) { this._pixels=Array(GRID*GRID).fill(""); return; }
      if (x>W-132) { this._save(); return; }
      return;
    }
    // Grid
    this._painting=true;
    this._paintAt(x,y);
  }

  private _ptrMove(cx: number, cy: number): void {
    const {x,y}=this._cxy(cx,cy);
    this._paintAt(x,y);
  }

  private _paintAt(x: number, y: number): void {
    const c=Math.floor((x-this._gridX)/this._cellSize);
    const r=Math.floor((y-this._gridY)/this._cellSize);
    if (c<0||c>=GRID||r<0||r>=GRID) return;
    this._pixels[r*GRID+c] = this._erasing ? "" : this._selColor;
  }

  private _loop(ts: number): void {
    const dt=Math.min((ts-this._lastTs)/1000,0.05);
    this._lastTs=ts;
    if (this._saveFlash>0) this._saveFlash-=dt;
    this._draw();
    if (!this._done) this._raf=requestAnimationFrame(t=>this._loop(t));
  }

  private _draw(): void {
    const ctx=this._ctx, W=this._canvas.width, H=this._canvas.height;
    const cs=this._cellSize, gx=this._gridX, gy=this._gridY, gs=cs*GRID;
    ctx.fillStyle="#1e1e1e"; ctx.fillRect(0,0,W,H);

    // ── Drawing grid ──
    for (let r=0;r<GRID;r++) for (let c=0;c<GRID;c++) {
      ctx.fillStyle=(r+c)%2===0?"#2f2f2f":"#272727";
      ctx.fillRect(gx+c*cs,gy+r*cs,cs,cs);
    }
    for (let r=0;r<GRID;r++) for (let c=0;c<GRID;c++) {
      const col=this._pixels[r*GRID+c];
      if (col) { ctx.fillStyle=col; ctx.fillRect(gx+c*cs,gy+r*cs,cs,cs); }
    }
    ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.lineWidth=0.5;
    for (let r=0;r<=GRID;r++) { ctx.beginPath();ctx.moveTo(gx,gy+r*cs);ctx.lineTo(gx+gs,gy+r*cs);ctx.stroke(); }
    for (let c=0;c<=GRID;c++) { ctx.beginPath();ctx.moveTo(gx+c*cs,gy);ctx.lineTo(gx+c*cs,gy+gs);ctx.stroke(); }
    ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=1.5; ctx.strokeRect(gx,gy,gs,gs);
    if (this._pixels.every(p=>!p)) {
      ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.font="13px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("Click / tap to draw!", gx+gs/2, gy+gs/2);
    }

    // ── Palette strip (right) ──
    const palX=W-60, palY=68, sw=13,sh=13,gap=2;
    ctx.fillStyle="#252526"; ctx.fillRect(W-64,54,64,H-54);
    ctx.fillStyle="#141414"; ctx.fillRect(W-64,54,1,H-54);
    ctx.fillStyle="#888"; ctx.font="9px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("Colors",W-32,palY);
    for (let i=0;i<PALETTE.length;i++) {
      const row=Math.floor(i/4), col=i%4;
      const px=palX+col*(sw+gap), py=palY+14+row*(sh+gap);
      ctx.fillStyle=PALETTE[i]; ctx.fillRect(px,py,sw,sh);
      if (PALETTE[i]===this._selColor&&!this._erasing) {
        ctx.strokeStyle="#fff"; ctx.lineWidth=1.5; ctx.strokeRect(px-1,py-1,sw+2,sh+2);
      }
    }
    const eraseY=palY+14+(PALETTE.length/4)*(sh+gap)+8;
    ctx.fillStyle=this._erasing?"#554444":"#333";
    ctx.beginPath(); ctx.roundRect(palX-2,eraseY,sw*4+gap*3+4,22,3); ctx.fill();
    if (this._erasing) { ctx.strokeStyle="#ff8888"; ctx.lineWidth=1.5; ctx.beginPath(); ctx.roundRect(palX-2,eraseY,sw*4+gap*3+4,22,3); ctx.stroke(); }
    ctx.fillStyle="#bbb"; ctx.font="10px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("🪣 Erase", palX+(sw*4+gap*3)/2-2, eraseY+11);

    // Preview
    const prevY=eraseY+32, prevSize=40;
    ctx.fillStyle="#666"; ctx.font="9px Arial,sans-serif"; ctx.textBaseline="top"; ctx.textAlign="center";
    ctx.fillText("Preview",W-32,prevY);
    const prevX=W-32-prevSize/2;
    for (let r=0;r<4;r++) for (let c=0;c<4;c++) {
      ctx.fillStyle=(r+c)%2===0?"#333":"#2a2a2a";
      ctx.fillRect(prevX+c*10,prevY+12+r*10,10,10);
    }
    const ps=prevSize/GRID;
    for (let r=0;r<GRID;r++) for (let c=0;c<GRID;c++) {
      const pc=this._pixels[r*GRID+c];
      if (pc) { ctx.fillStyle=pc; ctx.fillRect(prevX+c*ps,prevY+12+r*ps,Math.ceil(ps)+0.5,Math.ceil(ps)+0.5); }
    }
    ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=1; ctx.strokeRect(prevX,prevY+12,prevSize,prevSize);
    ctx.fillStyle="#555"; ctx.font="9px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("("+this._behavior+")",W-32,prevY+prevSize+16);

    // ── Top bar ──
    ctx.fillStyle="#1a1a1a"; ctx.fillRect(0,0,W,54);
    ctx.fillStyle="#141414"; ctx.fillRect(0,54,W,1);
    ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.beginPath(); ctx.roundRect(8,11,88,32,7); ctx.fill();
    ctx.fillStyle="#ccc"; ctx.font="bold 13px Arial,sans-serif"; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillText("← Back",22,27);
    ctx.fillStyle="#fff"; ctx.font="bold 16px Arial Black,Arial,sans-serif"; ctx.textAlign="center";
    ctx.fillText("🎨 Item Creator",W/2,27);
    // Name box
    ctx.fillStyle="#333"; ctx.beginPath(); ctx.roundRect(108,14,170,26,5); ctx.fill();
    ctx.strokeStyle="#555"; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(108,14,170,26,5); ctx.stroke();
    ctx.fillStyle="#fff"; ctx.font="12px Arial,sans-serif"; ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillText(this._name,116,27);
    ctx.fillStyle="#666"; ctx.font="9px Arial,sans-serif"; ctx.fillText("✎",284,27);
    // Behavior button
    const bvX=292, bvW=Math.max(80, W-64-bvX-8);
    ctx.fillStyle=BEHAV_COLORS[this._behavior]; ctx.beginPath(); ctx.roundRect(bvX,12,bvW,30,6); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="bold 11px Arial Black,Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(BEHAV_LABELS[this._behavior],bvX+bvW/2,27);

    // ── Bottom bar ──
    ctx.fillStyle="#1a1a1a"; ctx.fillRect(0,H-46,W-64,46);
    ctx.fillStyle="#141414"; ctx.fillRect(0,H-46,W-64,1);
    ctx.fillStyle="rgba(180,40,40,0.85)"; ctx.beginPath(); ctx.roundRect(12,H-36,96,26,7); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="bold 12px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("🗑 Clear All",60,H-23);
    const saved=this._saveFlash>0;
    ctx.fillStyle=saved?"rgba(0,180,0,0.9)":"rgba(0,110,200,0.9)";
    ctx.beginPath(); ctx.roundRect(W-64-160,H-36,152,26,7); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="bold 12px Arial Black,Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(saved?"✅ Saved to Studio!":"💾 Save to Roblox Studio", W-64-84, H-23);
  }

  private _end(): void {
    this._done=true;
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(fn=>fn());
    this._g.inMiniGame=false;
    this._g.autoClickCallback=null;
    this._g.goArcade();
  }
}
