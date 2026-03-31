/**
 * Astro Bot — Galaxy Select + Island Select
 * Fly Astro Bot around with WASD, enter galaxies, rescue bots on islands, fight bosses!
 */
import type { Game } from "../../game/Game";

const SPEED = 280; // px/sec

const GALAXIES = [
  { name: "Gorilla Galaxy",     color: "#4488ff", glow: "#2244cc", boss: "🦍", angle: -120, totalBots: 40, islands: 4 },
  { name: "Octopus Galaxy",     color: "#ff4444", glow: "#cc1111", boss: "🐙", angle: -60,  totalBots: 35, islands: 3 },
  { name: "Bird Galaxy",        color: "#cc44ff", glow: "#8811cc", boss: "🐦", angle: -150, totalBots: 45, islands: 5 },
  { name: "Mecha Leon Galaxy",  color: "#ff9922", glow: "#cc6600", boss: "🦎", angle: -30,  totalBots: 38, islands: 4 },
  { name: "Alien Galaxy",       color: "#44ff88", glow: "#11aa44", boss: "👾", angle: 150,  totalBots: 42, islands: 4 },
];

const SAVE_KEY = "astrobot_v2";
interface ABSave { savedBots: number; galaxyBots: number[] }
function loadSave(): ABSave {
  try { const r = localStorage.getItem(SAVE_KEY); if (r) return JSON.parse(r); } catch {}
  return { savedBots: 0, galaxyBots: GALAXIES.map(() => 0) };
}
function writeSave(s: ABSave) { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); }

// ── Screens ────────────────────────────────────────────────────────────────
type Screen = "galaxy" | "island";

export class AstroBot {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _cv!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _raf = 0;
  private _done = false;
  private _t = 0;
  private _last = 0;
  private _save: ABSave;
  private _screen: Screen = "galaxy";

  // Bot position
  private _botX = 0;
  private _botY = 0;
  private _velX = 0;
  private _velY = 0;

  // Galaxy screen
  private _hoveredGalaxy = -1;
  private _popup = -1;          // which galaxy popup is showing
  private _keys = new Set<string>();

  // Island screen
  private _currentGalaxy = 0;
  private _hoveredIsland = -1;
  private _islandPopup = -1;

  private _onKeyDown = (e: KeyboardEvent) => this._keyDown(e);
  private _onKeyUp   = (e: KeyboardEvent) => this._keyUp(e);
  private _onResize  = () => this._resize();

  constructor(g: Game) {
    this._g = g;
    this._save = loadSave();
    g.inMiniGame = true;
    g.ui.innerHTML = "";

    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;background:#000;pointer-events:all;";
    g.ui.appendChild(this._wrap);

    this._cv = document.createElement("canvas");
    this._cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    this._wrap.appendChild(this._cv);
    this._resize();
    window.addEventListener("resize", this._onResize);

    const backBtn = document.createElement("button");
    backBtn.textContent = "← Arcade";
    backBtn.style.cssText =
      "position:absolute;top:12px;left:16px;background:rgba(0,0,0,0.5);color:white;"
      + "border:1.5px solid rgba(255,255,255,0.25);border-radius:14px;padding:8px 18px;"
      + "font-size:13px;cursor:pointer;z-index:10;font-family:Arial,sans-serif;";
    backBtn.onclick = () => this._exit();
    this._wrap.appendChild(backBtn);

    this._resetBotToStart();
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup",   this._onKeyUp);
    this._last = performance.now();
    this._raf  = requestAnimationFrame(t => this._loop(t));
  }

  private _resize() {
    this._cv.width  = this._wrap.clientWidth  || window.innerWidth;
    this._cv.height = this._wrap.clientHeight || window.innerHeight;
    this._ctx = this._cv.getContext("2d")!;
    this._resetBotToStart();
  }

  private _resetBotToStart() {
    this._botX = this._cv.width / 2;
    this._botY = this._cv.height * 0.82;
    this._velX = 0; this._velY = 0;
    this._hoveredGalaxy = -1;
    this._popup = -1;
    this._hoveredIsland = -1;
    this._islandPopup = -1;
  }

  private _keyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    this._keys.add(k);
    if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," ","enter"].includes(k))
      e.preventDefault();

    // Enter to confirm popup
    if ((k === "enter" || k === " ") && this._popup >= 0) {
      this._enterGalaxy(this._popup);
    }
    if ((k === "enter" || k === " ") && this._islandPopup >= 0) {
      this._showComingSoon(this._islandPopup);
    }
    if (k === "escape" || k === "backspace") {
      if (this._screen === "island") {
        this._screen = "galaxy";
        this._resetBotToStart();
      } else {
        this._exit();
      }
    }
  }

  private _keyUp(e: KeyboardEvent) { this._keys.delete(e.key.toLowerCase()); }

  // ── Loop ─────────────────────────────────────────────────────────────────

  private _loop(now: number) {
    if (this._done) return;
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now; this._t += dt;
    this._update(dt);
    this._draw();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  private _update(dt: number) {
    // WASD movement
    let dx = 0, dy = 0;
    if (this._keys.has("a") || this._keys.has("arrowleft"))  dx -= 1;
    if (this._keys.has("d") || this._keys.has("arrowright")) dx += 1;
    if (this._keys.has("w") || this._keys.has("arrowup"))    dy -= 1;
    if (this._keys.has("s") || this._keys.has("arrowdown"))  dy += 1;
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }

    this._velX = dx * SPEED;
    this._velY = dy * SPEED;
    this._botX = Math.max(20, Math.min(this._cv.width  - 20, this._botX + this._velX * dt));
    this._botY = Math.max(20, Math.min(this._cv.height - 20, this._botY + this._velY * dt));

    if (this._screen === "galaxy") this._updateGalaxyCollision();
    else                           this._updateIslandCollision();
  }

  private _updateGalaxyCollision() {
    const botR = Math.min(this._cv.width, this._cv.height) * 0.04;
    this._hoveredGalaxy = -1;

    for (let i = 0; i < GALAXIES.length; i++) {
      const pos = this._galaxyPos(i);
      const galR = Math.min(this._cv.width, this._cv.height) * 0.1;
      if (Math.hypot(this._botX - pos.x, this._botY - pos.y) < galR + botR) {
        this._hoveredGalaxy = i;
        if (this._popup !== i) this._popup = i;
        return;
      }
    }

    // Check Mars
    const cx = this._cv.width / 2, cy = this._cv.height * 0.42;
    const marsR = Math.min(this._cv.width, this._cv.height) * 0.085;
    if (Math.hypot(this._botX - cx, this._botY - cy) < marsR + botR) {
      this._hoveredGalaxy = -2; // special: mars
      this._popup = -2;
      return;
    }

    if (this._popup >= 0) this._popup = -1;
  }

  private _updateIslandCollision() {
    const botR = Math.min(this._cv.width, this._cv.height) * 0.04;
    this._hoveredIsland = -1;

    const gal = GALAXIES[this._currentGalaxy];
    for (let i = 0; i < gal.islands; i++) {
      const pos = this._islandPos(i, gal.islands);
      const islandR = Math.min(this._cv.width, this._cv.height) * 0.09;
      if (Math.hypot(this._botX - pos.x, this._botY - pos.y) < islandR + botR) {
        this._hoveredIsland = i;
        this._islandPopup = i;
        return;
      }
    }

    // Check boss planet
    const bossPos = this._bossPos();
    const bossR = Math.min(this._cv.width, this._cv.height) * 0.09;
    if (Math.hypot(this._botX - bossPos.x, this._botY - bossPos.y) < bossR + botR) {
      this._hoveredIsland = -2;
      this._islandPopup = -2;
      return;
    }

    if (this._islandPopup >= 0) this._islandPopup = -1;
  }

  private _enterGalaxy(i: number) {
    if (i === -2) {
      // Mars — just show a message for now
      return;
    }
    this._currentGalaxy = i;
    this._screen = "island";
    this._popup = -1;
    this._botX = this._cv.width / 2;
    this._botY = this._cv.height * 0.85;
    this._velX = 0; this._velY = 0;
    this._hoveredIsland = -1;
    this._islandPopup = -1;
  }

  private _showComingSoon(island: number) {
    const gal = GALAXIES[this._currentGalaxy];
    const isBoss = island === -2;
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"
      + "background:rgba(0,0,0,0.75);z-index:20;font-family:Arial,sans-serif;";
    const label = isBoss ? `Boss: ${gal.boss}` : `Island ${island + 1}`;
    const emoji = isBoss ? gal.boss : "🏝️";
    overlay.innerHTML = `
      <div style="text-align:center;color:white;padding:40px 52px;background:rgba(0,0,0,0.9);
        border-radius:24px;border:2px solid ${gal.color}66;">
        <div style="font-size:60px;margin-bottom:12px;">${emoji}</div>
        <div style="font-size:24px;font-weight:bold;margin-bottom:6px;">${label}</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.45);margin-bottom:28px;">Coming soon!</div>
        <button id="csClose" style="background:rgba(255,255,255,0.1);color:white;
          border:1.5px solid rgba(255,255,255,0.25);border-radius:12px;
          padding:12px 28px;font-size:14px;cursor:pointer;">← Back</button>
      </div>
    `;
    this._wrap.appendChild(overlay);
    document.getElementById("csClose")!.onclick = () => {
      overlay.remove();
      this._islandPopup = -1;
    };
  }

  // ── Positions ─────────────────────────────────────────────────────────────

  private _galaxyPos(i: number) {
    const w = this._cv.width, h = this._cv.height;
    const cx = w / 2, cy = h * 0.42;
    const rx = Math.min(w, h) * 0.34, ry = Math.min(w, h) * 0.28;
    const rad = (GALAXIES[i].angle * Math.PI) / 180;
    return { x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) };
  }

  private _islandPos(i: number, total: number) {
    const w = this._cv.width, h = this._cv.height;
    const cx = w / 2, cy = h * 0.42;
    const rx = Math.min(w, h) * 0.32, ry = Math.min(w, h) * 0.24;
    const angle = ((i / total) * Math.PI * 2) - Math.PI / 2;
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  }

  private _bossPos() {
    return { x: this._cv.width / 2, y: this._cv.height * 0.18 };
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  private _draw() {
    const ctx = this._ctx;
    const w = this._cv.width, h = this._cv.height;
    ctx.clearRect(0, 0, w, h);

    // Space BG
    const bg = ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*0.8);
    bg.addColorStop(0,"#0a0025"); bg.addColorStop(1,"#000008");
    ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);

    // Stars
    for (let i = 0; i < 200; i++) {
      const sx = (i*137+50)%w, sy = (i*97+30)%h;
      const sr = i%4===0?1.5:0.7;
      ctx.globalAlpha = 0.4+0.4*Math.sin(this._t*1.5+i);
      ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this._screen === "galaxy") this._drawGalaxyScreen();
    else                           this._drawIslandScreen();
  }

  private _drawGalaxyScreen() {
    const ctx = this._ctx;
    const w = this._cv.width, h = this._cv.height;
    const cx = w/2, cy = h*0.42;

    // Mars
    const marsR = Math.min(w,h)*0.085;
    const mg = ctx.createRadialGradient(cx-marsR*0.3,cy-marsR*0.3,marsR*0.1,cx,cy,marsR);
    mg.addColorStop(0,"#ff8855"); mg.addColorStop(0.6,"#cc4422"); mg.addColorStop(1,"#882200");
    ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(cx,cy,marsR,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.arc(cx-marsR*0.3,cy+marsR*0.2,marsR*0.18,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+marsR*0.3,cy-marsR*0.1,marsR*0.12,0,Math.PI*2); ctx.fill();
    // Mars glow
    const marsGlow=ctx.createRadialGradient(cx,cy,marsR,cx,cy,marsR*1.5);
    marsGlow.addColorStop(0,"rgba(255,100,50,0.2)"); marsGlow.addColorStop(1,"transparent");
    ctx.fillStyle=marsGlow; ctx.beginPath(); ctx.arc(cx,cy,marsR*1.5,0,Math.PI*2); ctx.fill();
    this._drawPS5(ctx,cx,cy-marsR*0.1,marsR*0.7);

    // Total bots saved counter
    const total = GALAXIES.reduce((s,g)=>s+g.totalBots,0);
    ctx.fillStyle="white"; ctx.font=`bold ${Math.min(w,h)*0.03}px Arial`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(`🤖 ${this._save.savedBots} / ${total} Astro Bots saved`, w/2, 14);

    // Galaxies
    for (let i=0; i<GALAXIES.length; i++) {
      const pos = this._galaxyPos(i);
      const gal = GALAXIES[i];
      const isHov = i===this._hoveredGalaxy;
      const pulse = 1+(isHov?0.1*Math.sin(this._t*4):0);
      const r = Math.min(w,h)*0.1*pulse;

      // glow
      const gg=ctx.createRadialGradient(pos.x,pos.y,r*0.3,pos.x,pos.y,r*1.8);
      gg.addColorStop(0,gal.color+"88"); gg.addColorStop(0.5,gal.glow+"33"); gg.addColorStop(1,"transparent");
      ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(pos.x,pos.y,r*1.8,0,Math.PI*2); ctx.fill();

      // orb
      const og=ctx.createRadialGradient(pos.x-r*0.3,pos.y-r*0.3,r*0.1,pos.x,pos.y,r);
      og.addColorStop(0,gal.color+"ff"); og.addColorStop(0.6,gal.glow+"cc"); og.addColorStop(1,"#000033cc");
      ctx.fillStyle=og; ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2); ctx.fill();

      // swirl
      ctx.save(); ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2); ctx.clip();
      for (let j=0;j<3;j++) {
        const sa=this._t*(j%2===0?0.5:-0.3)+j*2.1;
        const sg=ctx.createRadialGradient(pos.x+r*0.3*Math.cos(sa),pos.y+r*0.3*Math.sin(sa),0,pos.x,pos.y,r*0.9);
        sg.addColorStop(0,"rgba(255,255,255,0.15)"); sg.addColorStop(1,"transparent");
        ctx.fillStyle=sg; ctx.fillRect(pos.x-r,pos.y-r,r*2,r*2);
      }
      ctx.restore();

      ctx.font=`${r*0.9}px Arial`; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(gal.boss,pos.x,pos.y);

      if (isHov) {
        ctx.strokeStyle="white"; ctx.lineWidth=3; ctx.setLineDash([8,4]);
        ctx.beginPath(); ctx.arc(pos.x,pos.y,r+8,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle="white"; ctx.font=`bold ${Math.min(w,h)*0.026}px Arial`;
        ctx.textAlign="center"; ctx.textBaseline="top";
        ctx.fillText(gal.name,pos.x,pos.y+r+10);
      }
    }

    // Controller
    this._drawController(ctx,cx,h*0.88,Math.min(w,h)*0.18);

    // Bot
    this._drawAstroBot(ctx,this._botX,this._botY,Math.min(w,h)*0.055);

    // Popup
    if (this._popup>=0) this._drawGalaxyPopup(this._popup);

    // Instructions
    if (this._popup<0) {
      ctx.fillStyle="rgba(255,255,255,0.45)";
      ctx.font=`${Math.min(w,h)*0.022}px Arial`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText("WASD to fly   •   Fly into a galaxy to enter it",w/2,h-12);
    }
  }

  private _drawGalaxyPopup(i: number) {
    const ctx = this._ctx;
    const w = this._cv.width, h = this._cv.height;
    const gal = GALAXIES[i];
    const saved = this._save.galaxyBots[i];
    const px = w/2, py = h*0.72;
    const pw = Math.min(w*0.55, 340), ph = 110;

    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath(); ctx.roundRect(px-pw/2, py-ph/2, pw, ph, 16); ctx.fill();
    ctx.strokeStyle = gal.color+"99"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(px-pw/2, py-ph/2, pw, ph, 16); ctx.stroke();

    ctx.fillStyle="white"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.font=`bold ${Math.min(w,h)*0.032}px Arial`;
    ctx.fillText(`${gal.boss} ${gal.name}`, px, py-30);
    ctx.font=`${Math.min(w,h)*0.026}px Arial`;
    ctx.fillStyle="#ffcc44";
    ctx.fillText(`🤖 ${saved} / ${gal.totalBots} bots saved`, px, py+4);
    ctx.fillStyle="rgba(255,255,255,0.55)";
    ctx.font=`${Math.min(w,h)*0.02}px Arial`;
    ctx.fillText("Press Enter to enter this galaxy!", px, py+36);
  }

  private _drawIslandScreen() {
    const ctx = this._ctx;
    const w = this._cv.width, h = this._cv.height;
    const gal = GALAXIES[this._currentGalaxy];
    const saved = this._save.galaxyBots[this._currentGalaxy];

    // Tinted background for this galaxy
    ctx.fillStyle = gal.color + "11";
    ctx.fillRect(0,0,w,h);

    // Header
    ctx.fillStyle="white"; ctx.font=`bold ${Math.min(w,h)*0.034}px Arial`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(`${gal.boss} ${gal.name}`,w/2,14);
    ctx.fillStyle="#ffcc44"; ctx.font=`${Math.min(w,h)*0.026}px Arial`;
    ctx.fillText(`🤖 ${saved} / ${gal.totalBots} bots saved`,w/2,50);

    // Back hint
    ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.font=`${Math.min(w,h)*0.02}px Arial`;
    ctx.textAlign="left"; ctx.textBaseline="top";
    ctx.fillText("Esc = Galaxy Map",70,14);

    // Boss planet at top
    const bp = this._bossPos();
    const bossR = Math.min(w,h)*0.09;
    const isHovBoss = this._hoveredIsland===-2;
    const bg2=ctx.createRadialGradient(bp.x-bossR*0.3,bp.y-bossR*0.3,bossR*0.1,bp.x,bp.y,bossR);
    bg2.addColorStop(0,gal.color+"ff"); bg2.addColorStop(1,gal.glow+"aa");
    ctx.fillStyle=bg2; ctx.beginPath(); ctx.arc(bp.x,bp.y,bossR,0,Math.PI*2); ctx.fill();
    if(isHovBoss){ctx.strokeStyle="white";ctx.lineWidth=3;ctx.setLineDash([6,3]);ctx.beginPath();ctx.arc(bp.x,bp.y,bossR+8,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    ctx.font=`${bossR*1.1}px Arial`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(gal.boss,bp.x,bp.y);
    ctx.fillStyle="rgba(255,50,50,0.85)"; ctx.font=`bold ${Math.min(w,h)*0.022}px Arial`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText("⚡ BOSS",bp.x,bp.y+bossR+6);

    // Islands
    for (let i=0; i<gal.islands; i++) {
      const pos=this._islandPos(i,gal.islands);
      const islandR=Math.min(w,h)*0.09;
      const isHov=i===this._hoveredIsland;
      const pulse=1+(isHov?0.08*Math.sin(this._t*4):0);
      const r=islandR*pulse;

      // Planet glow
      const ig=ctx.createRadialGradient(pos.x,pos.y,r*0.5,pos.x,pos.y,r*1.6);
      ig.addColorStop(0,gal.color+"44"); ig.addColorStop(1,"transparent");
      ctx.fillStyle=ig; ctx.beginPath(); ctx.arc(pos.x,pos.y,r*1.6,0,Math.PI*2); ctx.fill();

      // Planet
      const colors=["#4488cc","#cc8844","#44aa66","#aa4488","#ccaa22"];
      const pg=ctx.createRadialGradient(pos.x-r*0.3,pos.y-r*0.3,r*0.1,pos.x,pos.y,r);
      pg.addColorStop(0,colors[i%colors.length]+"ff"); pg.addColorStop(1,colors[i%colors.length]+"44");
      ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2); ctx.fill();

      // Island number
      ctx.fillStyle="white"; ctx.font=`bold ${r*0.7}px Arial`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`${i+1}`,pos.x,pos.y);

      if(isHov){
        ctx.strokeStyle="white"; ctx.lineWidth=3; ctx.setLineDash([6,3]);
        ctx.beginPath(); ctx.arc(pos.x,pos.y,r+8,0,Math.PI*2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle="rgba(255,255,255,0.7)"; ctx.font=`${Math.min(w,h)*0.02}px Arial`;
        ctx.textAlign="center"; ctx.textBaseline="top";
        ctx.fillText(`Island ${i+1}`,pos.x,pos.y+r+8);
      }
    }

    // Connecting lines from islands to boss
    ctx.strokeStyle="rgba(255,255,255,0.1)"; ctx.lineWidth=1; ctx.setLineDash([4,6]);
    for(let i=0;i<gal.islands;i++){
      const pos=this._islandPos(i,gal.islands);
      const bp2=this._bossPos();
      ctx.beginPath(); ctx.moveTo(pos.x,pos.y); ctx.lineTo(bp2.x,bp2.y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Bot
    this._drawAstroBot(ctx,this._botX,this._botY,Math.min(w,h)*0.055);

    // Island popup
    if(this._islandPopup>=0){
      const ip=this._islandPopup;
      const isBoss=ip===-2;
      const pos2=isBoss?this._bossPos():this._islandPos(ip,gal.islands);
      const label=isBoss?`Boss: ${gal.boss}`:`Island ${ip+1}`;
      const ph2=100, pw2=Math.min(w*0.5,300);
      const ppx=Math.min(Math.max(pos2.x,pw2/2+10),w-pw2/2-10);
      const ppy=Math.min(pos2.y+Math.min(w,h)*0.12,h-ph2/2-10);
      ctx.fillStyle="rgba(0,0,0,0.88)";
      ctx.beginPath(); ctx.roundRect(ppx-pw2/2,ppy-ph2/2,pw2,ph2,14); ctx.fill();
      ctx.strokeStyle=gal.color+"88"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(ppx-pw2/2,ppy-ph2/2,pw2,ph2,14); ctx.stroke();
      ctx.fillStyle="white"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.font=`bold ${Math.min(w,h)*0.028}px Arial`;
      ctx.fillText(label,ppx,ppy-22);
      ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font=`${Math.min(w,h)*0.019}px Arial`;
      ctx.fillText("Press Enter to go here!",ppx,ppy+16);
    }

    // Instructions
    ctx.fillStyle="rgba(255,255,255,0.4)";
    ctx.font=`${Math.min(w,h)*0.021}px Arial`;
    ctx.textAlign="center"; ctx.textBaseline="bottom";
    ctx.fillText("WASD to fly   •   Fly into an island or the boss!",w/2,h-12);
  }

  // ── Shared drawing helpers ────────────────────────────────────────────────

  private _drawPS5(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save(); ctx.translate(x,y);
    const s=size*0.5;
    ctx.fillStyle="#e8e8f0";
    ctx.beginPath();
    ctx.moveTo(-s*0.4,-s*1.0); ctx.quadraticCurveTo(-s*0.6,-s*0.8,-s*0.5,s*0.2);
    ctx.lineTo(s*0.5,s*0.2); ctx.quadraticCurveTo(s*0.6,-s*0.8,s*0.4,-s*1.0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle="#0088ff"; ctx.fillRect(-s*0.08,-s*0.9,s*0.16,s*1.1);
    ctx.fillStyle="#0055cc"; ctx.font=`bold ${s*0.3}px Arial`;
    ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("PS5",0,-s*0.4);
    ctx.strokeStyle="#cc4400"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(-s*0.2,s*0.2); ctx.lineTo(-s*0.5,s*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s*0.1,s*0.2);  ctx.lineTo(s*0.4,s*0.6);  ctx.stroke();
    ctx.fillStyle=`rgba(180,180,180,${0.3+0.2*Math.sin(this._t*2)})`;
    ctx.beginPath(); ctx.arc(-s*0.1,-s*1.1-s*0.1*Math.sin(this._t),s*0.12,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  private _drawController(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save(); ctx.translate(x,y);
    const s=size;
    const cg=ctx.createLinearGradient(-s*0.6,-s*0.2,s*0.6,s*0.2);
    cg.addColorStop(0,"#223366"); cg.addColorStop(1,"#112244");
    ctx.fillStyle=cg;
    ctx.beginPath();
    ctx.moveTo(-s*0.6,0); ctx.quadraticCurveTo(-s*0.7,-s*0.25,-s*0.45,-s*0.25);
    ctx.lineTo(s*0.45,-s*0.25); ctx.quadraticCurveTo(s*0.7,-s*0.25,s*0.6,0);
    ctx.quadraticCurveTo(s*0.65,s*0.3,s*0.4,s*0.35); ctx.lineTo(-s*0.4,s*0.35);
    ctx.quadraticCurveTo(-s*0.65,s*0.3,-s*0.6,0); ctx.fill();
    ctx.fillStyle="#334488";
    ctx.beginPath(); ctx.roundRect(-s*0.15,-s*0.18,s*0.3,s*0.18,4); ctx.fill();
    for(const b of [{x:s*0.38,y:-s*0.08,c:"#ff4488"},{x:s*0.28,y:-s*0.16,c:"#4488ff"},{x:s*0.48,y:-s*0.16,c:"#44cc44"},{x:s*0.38,y:-s*0.24,c:"#ffcc00"}]){
      ctx.fillStyle=b.c; ctx.beginPath(); ctx.arc(b.x,b.y,s*0.06,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle="#44aaff"; ctx.fillRect(-s*0.08,-s*0.27,s*0.16,s*0.05);
    ctx.restore();
  }

  private _drawAstroBot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    ctx.save(); ctx.translate(x,y);
    const s=size;
    const bob=Math.sin(this._t*3)*s*0.08;
    const moving=(this._velX!==0||this._velY!==0);
    if(moving){
      ctx.fillStyle=`rgba(255,${150+Math.floor(80*Math.sin(this._t*10))},0,0.8)`;
      ctx.beginPath(); ctx.ellipse(0,s*0.6+bob,s*0.2,s*0.4,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(255,255,100,0.6)";
      ctx.beginPath(); ctx.ellipse(0,s*0.5+bob,s*0.1,s*0.2,0,0,Math.PI*2); ctx.fill();
    }
    ctx.translate(0,bob);
    const bg2=ctx.createRadialGradient(-s*0.1,-s*0.1,s*0.05,0,0,s*0.5);
    bg2.addColorStop(0,"#e8eef5"); bg2.addColorStop(1,"#8899aa");
    ctx.fillStyle=bg2; ctx.beginPath(); ctx.roundRect(-s*0.4,-s*0.3,s*0.8,s*0.7,s*0.15); ctx.fill();
    ctx.fillStyle="#1a6fff"; ctx.beginPath(); ctx.roundRect(-s*0.22,-s*0.1,s*0.44,s*0.35,s*0.08); ctx.fill();
    ctx.fillStyle="#1a4aff"; ctx.beginPath(); ctx.arc(0,-s*0.55,s*0.45,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#e8eef5"; ctx.beginPath(); ctx.arc(0,-s*0.55,s*0.38,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#0a1a3a"; ctx.beginPath(); ctx.roundRect(-s*0.28,-s*0.72,s*0.56,s*0.36,s*0.1); ctx.fill();
    const eg1=ctx.createRadialGradient(-s*0.1,-s*0.58,0,-s*0.1,-s*0.58,s*0.14);
    eg1.addColorStop(0,"#88ccff"); eg1.addColorStop(1,"#0066ff");
    ctx.fillStyle=eg1; ctx.beginPath(); ctx.arc(-s*0.1,-s*0.58,s*0.12,0,Math.PI*2); ctx.fill();
    const eg2=ctx.createRadialGradient(s*0.1,-s*0.58,0,s*0.1,-s*0.58,s*0.14);
    eg2.addColorStop(0,"#88ccff"); eg2.addColorStop(1,"#0066ff");
    ctx.fillStyle=eg2; ctx.beginPath(); ctx.arc(s*0.1,-s*0.58,s*0.12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="white";
    ctx.beginPath(); ctx.arc(-s*0.07,-s*0.6,s*0.04,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(s*0.13,-s*0.6,s*0.04,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#aabbcc"; ctx.lineWidth=s*0.06; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(0,-s*0.92); ctx.lineTo(0,-s*1.1); ctx.stroke();
    ctx.fillStyle="#ffdd00"; ctx.beginPath(); ctx.arc(0,-s*1.15,s*0.1,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  private _exit() {
    this._done=true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener("keydown",this._onKeyDown);
    window.removeEventListener("keyup",  this._onKeyUp);
    window.removeEventListener("resize", this._onResize);
    this._g.inMiniGame=false;
    this._g.goArcade();
  }
}
