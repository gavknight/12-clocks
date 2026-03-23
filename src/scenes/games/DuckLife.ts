/**
 * Duck Life — train your duck and race to victory!
 */
import type { Game } from "../../game/Game";

const SAVE_KEY = "ducklife_save";

interface Save {
  name: string;
  color: string;
  hat: string;
  run: number;
  fly: number;
  swim: number;
  seeds: number;
  raceLevel: number;
  ownedColors: string[];
  ownedHats: string[];
}

function defaultSave(): Save {
  return {
    name: "Duck", color: "#f5c842", hat: "none",
    run: 0, fly: 0, swim: 0, seeds: 50,
    raceLevel: 0,
    ownedColors: ["#f5c842"], ownedHats: ["none"],
  };
}

export class DuckLife {
  private _wrap!: HTMLDivElement;
  private _g: Game;
  private _save: Save;
  private _kDown = new Set<string>();
  private _kHandler?: (e: KeyboardEvent) => void;
  private _kUpHandler?: (e: KeyboardEvent) => void;
  private _hubAnimId = 0;

  constructor(game: Game) {
    this._g = game;
    game.inMiniGame = true;
    game.ui.innerHTML = "";

    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow-y:auto;pointer-events:all;" +
      "background:linear-gradient(180deg,#87CEEB 0%,#98D8C8 100%);font-family:Arial,sans-serif;";
    game.ui.appendChild(this._wrap);

    try { this._save = JSON.parse(localStorage.getItem(SAVE_KEY) || "null") || defaultSave(); }
    catch { this._save = defaultSave(); }

    this._showHub();
  }

  private _persist() { localStorage.setItem(SAVE_KEY, JSON.stringify(this._save)); }

  private _exit() {
    this._removeKeys();
    this._wrap.remove();
    this._g.inMiniGame = false;
    import("../ArcadeScene").then(m => new m.ArcadeScene(this._g));
  }

  private _removeKeys() {
    if (this._kHandler) document.removeEventListener("keydown", this._kHandler);
    if (this._kUpHandler) document.removeEventListener("keyup", this._kUpHandler);
    this._kHandler = undefined; this._kUpHandler = undefined;
    this._kDown.clear();
  }

  // ── Duck drawing ──────────────────────────────────────────────────────────
  private _drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, size = 36, color?: string) {
    const c = color ?? this._save.color;
    ctx.save();
    ctx.translate(x, y);

    const darken = (hex: string, f: number) => {
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return `rgb(${Math.floor(r*f)},${Math.floor(g*f)},${Math.floor(b*f)})`;
    };

    // Body
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(0, 0, size*.65, size*.42, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();

    // Wing
    ctx.fillStyle = darken(c, 0.8);
    ctx.beginPath(); ctx.ellipse(-size*.05, -size*.05, size*.38, size*.22, -.3, 0, Math.PI*2); ctx.fill();

    // Head
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(size*.55, -size*.35, size*.28, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.stroke();

    // Eye
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(size*.66, -size*.42, size*.055, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(size*.68, -size*.44, size*.025, 0, Math.PI*2); ctx.fill();

    // Bill
    ctx.fillStyle = "#ff9900";
    ctx.beginPath();
    ctx.moveTo(size*.80, -size*.32); ctx.lineTo(size*.98, -size*.27); ctx.lineTo(size*.80, -size*.21);
    ctx.closePath(); ctx.fill();

    // Feet
    ctx.fillStyle = "#ff9900";
    [[-size*.2, 0], [size*.15, 0]].forEach(([fx]) => {
      ctx.beginPath();
      ctx.moveTo(fx, size*.41); ctx.lineTo(fx-size*.12, size*.55); ctx.lineTo(fx+size*.12, size*.53);
      ctx.closePath(); ctx.fill();
    });

    // Hat
    if (this._save.hat === "cap") {
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(size*.3, -size*.68, size*.52, size*.11);
      ctx.fillRect(size*.36, -size*.95, size*.36, size*.29);
    } else if (this._save.hat === "crown") {
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(size*.3,-size*.64); ctx.lineTo(size*.3,-size*.94); ctx.lineTo(size*.44,-size*.80);
      ctx.lineTo(size*.57,-size*.94); ctx.lineTo(size*.70,-size*.80); ctx.lineTo(size*.84,-size*.94);
      ctx.lineTo(size*.84,-size*.64); ctx.closePath(); ctx.fill();
    } else if (this._save.hat === "bow") {
      ctx.fillStyle = "#ff69b4";
      ctx.beginPath(); ctx.ellipse(size*.44,-size*.70,size*.16,size*.09,-0.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(size*.64,-size*.70,size*.16,size*.09,0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#ff1493";
      ctx.beginPath(); ctx.arc(size*.54,-size*.70,size*.065,0,Math.PI*2); ctx.fill();
    }

    ctx.restore();
  }

  private _card(): HTMLDivElement {
    const d = document.createElement("div");
    d.style.cssText = "max-width:400px;margin:0 auto;padding:16px;";
    return d;
  }

  private _btn(text: string, bg: string): HTMLButtonElement {
    const b = document.createElement("button");
    b.textContent = text;
    b.style.cssText = `background:${bg};color:white;border:none;border-radius:10px;padding:10px 20px;cursor:pointer;font-size:14px;font-weight:bold;`;
    return b;
  }

  // ── Hub ───────────────────────────────────────────────────────────────────
  private _showHub() {
    this._removeKeys();
    cancelAnimationFrame(this._hubAnimId);
    this._wrap.innerHTML = "";
    this._wrap.style.overflow = "hidden";

    // Full-screen canvas background
    const canv = document.createElement("canvas");
    canv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
    canv.width = this._wrap.clientWidth || window.innerWidth;
    canv.height = this._wrap.clientHeight || window.innerHeight;
    this._wrap.appendChild(canv);
    const ctx = canv.getContext("2d")!;

    const segBar = (x:number,y:number,val:number,w:number,h:number) => {
      const segs=8, filled=Math.round(val/100*segs), sw=(w-(segs-1)*2)/segs;
      for(let i=0;i<segs;i++){
        ctx.fillStyle=i<filled?"#4fc3f7":"rgba(255,255,255,0.2)";
        ctx.fillRect(x+i*(sw+2),y,sw,h);
      }
    };

    let elapsed=0, lastT=performance.now();
    const loop=(t:number)=>{
      const dt=(t-lastT)/1000; lastT=t; elapsed+=dt;
      const cw=canv.width, ch=canv.height;

      // Sky
      const sky=ctx.createLinearGradient(0,0,0,ch);
      sky.addColorStop(0,"#5BA3DC"); sky.addColorStop(1,"#87CEEB");
      ctx.fillStyle=sky; ctx.fillRect(0,0,cw,ch);

      // Clouds
      ctx.fillStyle="rgba(255,255,255,0.88)";
      for(const [cx,cy,r] of [[0.1,0.1,44],[0.38,0.06,36],[0.62,0.12,40],[0.85,0.07,32]] as [number,number,number][]){
        const x=((cx*cw-elapsed*18)%(cw+120)+cw+120)%(cw+120);
        ctx.beginPath(); ctx.arc(x,cy*ch,r,0,Math.PI*2); ctx.arc(x+r*.7,cy*ch-r*.3,r*.7,0,Math.PI*2); ctx.fill();
      }

      // Back hills
      ctx.fillStyle="#5aad5a";
      ctx.beginPath(); ctx.moveTo(0,ch*0.72);
      for(let i=0;i<=cw;i+=18)
        ctx.lineTo(i, ch*0.72 - Math.sin(i/cw*Math.PI*2.6+0.4)*ch*0.09 - Math.sin(i/cw*Math.PI*1.1)*ch*0.05);
      ctx.lineTo(cw,ch); ctx.lineTo(0,ch); ctx.closePath(); ctx.fill();

      // Ground
      ctx.fillStyle="#43A047"; ctx.fillRect(0,ch*0.78,cw,ch);
      ctx.fillStyle="#66BB6A"; ctx.fillRect(0,ch*0.78,cw,7);

      // Duck (gentle bob)
      const ds=Math.min(cw*0.13,62);
      this._drawDuck(ctx, cw*0.52, ch*0.78-ds*0.38+Math.sin(elapsed*2.2)*2, ds);

      // Stats panel (top-left, Duck Life style)
      const pw=Math.min(cw*0.44,185), px=10, py=10, rowH=32, pad=8;
      const stats=[
        {label:`Running: Lvl ${Math.floor(this._save.run/10)}`,val:this._save.run},
        {label:`Flying:  Lvl ${Math.floor(this._save.fly/10)}`, val:this._save.fly},
        {label:`Swim:    Lvl ${Math.floor(this._save.swim/10)}`,val:this._save.swim},
      ];
      const ph=stats.length*rowH+pad*2;
      ctx.fillStyle="rgba(20,60,130,0.84)";
      ctx.beginPath(); ctx.roundRect(px,py,pw,ph,5); ctx.fill();
      ctx.strokeStyle="rgba(100,160,255,0.55)"; ctx.lineWidth=1.5; ctx.stroke();
      for(let i=0;i<stats.length;i++){
        const sy=py+pad+i*rowH;
        ctx.fillStyle="white"; ctx.font="bold 11px Arial";
        ctx.fillText(stats[i].label,px+pad,sy+12);
        segBar(px+pad,sy+16,stats[i].val,pw-pad*2,7);
      }
      // Seeds row
      const seedY=py+ph+4;
      ctx.fillStyle="rgba(20,60,130,0.84)";
      ctx.beginPath(); ctx.roundRect(px,seedY,pw,26,5); ctx.fill();
      ctx.strokeStyle="rgba(100,160,255,0.55)"; ctx.stroke();
      ctx.fillStyle="#FFD700"; ctx.font="bold 12px Arial";
      ctx.fillText(`Seeds: ${this._save.seeds}`,px+pad,seedY+18);

      this._hubAnimId=requestAnimationFrame(loop);
    };
    this._hubAnimId=requestAnimationFrame(loop);

    // HTML button overlay
    const ui=document.createElement("div");
    ui.style.cssText="position:absolute;inset:0;pointer-events:none;font-family:Arial,sans-serif;";
    this._wrap.appendChild(ui);

    const stop=()=>cancelAnimationFrame(this._hubAnimId);
    const mkBtn=(label:string,fn:()=>void)=>{
      const b=document.createElement("button");
      b.textContent=label;
      b.style.cssText="background:rgba(20,60,130,0.88);color:white;border:1.5px solid rgba(100,160,255,0.6);border-radius:6px;padding:9px 10px;cursor:pointer;font-size:12px;font-weight:bold;pointer-events:all;white-space:nowrap;";
      b.onmouseenter=()=>b.style.background="rgba(50,110,210,0.96)";
      b.onmouseleave=()=>b.style.background="rgba(20,60,130,0.88)";
      b.onclick=()=>{stop();fn();};
      return b;
    };

    // Buttons grid top-right
    const grid=document.createElement("div");
    grid.style.cssText="position:absolute;top:10px;right:10px;display:grid;grid-template-columns:repeat(2,1fr);gap:5px;pointer-events:none;";
    for(const [label,fn] of [
      ["Train Running",()=>this._startTraining("run")],
      ["Enter Race",   ()=>this._showRaceMenu()],
      ["Train Flying", ()=>this._startTraining("fly")],
      ["Train Swimming",()=>this._startTraining("swim")],
      ["Shop",         ()=>this._showShop()],
    ] as [string,()=>void][]){
      grid.appendChild(mkBtn(label,fn));
    }
    ui.appendChild(grid);

    // Duck name input bottom-center
    const nameInp=document.createElement("input");
    nameInp.value=this._save.name;
    nameInp.style.cssText="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(20,60,130,0.85);border:1.5px solid rgba(100,160,255,0.6);border-radius:6px;color:#FFD700;font-size:14px;font-weight:bold;padding:6px 12px;width:140px;text-align:center;outline:none;pointer-events:all;";
    nameInp.onchange=()=>{this._save.name=nameInp.value.trim()||"Duck";this._persist();};
    ui.appendChild(nameInp);

    // Back button bottom-left
    const backBtn=mkBtn("← Back",()=>this._exit());
    backBtn.style.position="absolute"; backBtn.style.bottom="14px"; backBtn.style.left="14px";
    ui.appendChild(backBtn);
  }

  // ── Training menu ─────────────────────────────────────────────────────────
  private _showTrainMenu() {
    this._wrap.innerHTML = "";
    const box = this._card();

    const hdr = document.createElement("div");
    hdr.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:20px;";
    const back = this._btn("← Back","rgba(0,0,0,0.25)"); back.onclick = () => this._showHub();
    const t = document.createElement("div"); t.style.cssText = "color:white;font-size:20px;font-weight:900;text-shadow:0 2px 4px rgba(0,0,0,0.3);"; t.textContent = "🎯 Training";
    hdr.appendChild(back); hdr.appendChild(t);
    box.appendChild(hdr);

    const items = [
      {id:"run", label:"🏃 Running", bg:"linear-gradient(135deg,#ff6b35,#f7931e)", val:this._save.run, tip:"Jump over obstacles!"},
      {id:"fly", label:"🪶 Flying",  bg:"linear-gradient(135deg,#4fc3f7,#0288d1)", val:this._save.fly, tip:"Flap through the pipes!"},
      {id:"swim",label:"🏊 Swimming",bg:"linear-gradient(135deg,#26c6da,#00838f)", val:this._save.swim,tip:"Collect fish, dodge rocks!"},
    ] as const;

    for (const item of items) {
      const btn = document.createElement("button");
      btn.style.cssText = `width:100%;background:${item.bg};color:white;border:none;border-radius:16px;padding:18px 20px;cursor:pointer;text-align:left;margin-bottom:12px;box-shadow:0 3px 10px rgba(0,0,0,0.2);`;
      btn.innerHTML = `<div style="font-size:18px;font-weight:900;margin-bottom:4px;">${item.label}</div>`+
        `<div style="font-size:12px;opacity:0.8;margin-bottom:6px;">${item.tip}</div>`+
        `<div style="background:rgba(0,0,0,0.2);border-radius:4px;height:8px;"><div style="width:${item.val}%;background:rgba(255,255,255,0.7);border-radius:4px;height:8px;"></div></div>`+
        `<div style="font-size:11px;opacity:0.7;margin-top:3px;">${item.val}/100</div>`;
      btn.onclick = () => this._startTraining(item.id);
      box.appendChild(btn);
    }
    this._wrap.appendChild(box);
  }

  // ── Training game ─────────────────────────────────────────────────────────
  private _startTraining(type: "run" | "fly" | "swim") {
    this._removeKeys();
    this._wrap.innerHTML = "";

    const DURATION = 30;
    let score = 0, timeLeft = DURATION, animId = 0, gameOver = false;

    const container = document.createElement("div");
    container.style.cssText = "max-width:400px;margin:0 auto;padding:16px;";

    const topBar = document.createElement("div");
    topBar.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;";
    const titleEl = document.createElement("div");
    titleEl.style.cssText = "color:white;font-size:15px;font-weight:bold;";
    titleEl.textContent = type==="run"?"🏃 Run Training":type==="fly"?"🪶 Fly Training":"🏊 Swim Training";
    const scoreEl = document.createElement("div");
    scoreEl.style.cssText = "color:#FFD700;font-size:14px;font-weight:bold;";
    scoreEl.textContent = "Score: 0";
    const timerEl = document.createElement("div");
    timerEl.style.cssText = "color:white;font-size:14px;font-weight:bold;";
    timerEl.textContent = `⏱ ${DURATION}s`;
    topBar.appendChild(titleEl); topBar.appendChild(scoreEl); topBar.appendChild(timerEl);
    container.appendChild(topBar);

    const canv = document.createElement("canvas");
    const W = Math.min(window.innerWidth - 32, 400);
    const H = Math.min(window.innerHeight - 130, 280);
    canv.width = W; canv.height = H;
    canv.style.cssText = "border-radius:16px;display:block;touch-action:none;";
    container.appendChild(canv);

    const hint = document.createElement("div");
    hint.style.cssText = "color:rgba(255,255,255,0.6);font-size:13px;text-align:center;margin-top:8px;";
    hint.textContent = type==="run"?"Tap / Space to jump!":type==="fly"?"Tap / Space to flap!":"Hold tap / Space to dive!";
    container.appendChild(hint);
    this._wrap.appendChild(container);

    const ctx = canv.getContext("2d")!;

    const showResult = () => {
      cancelAnimationFrame(animId);
      this._removeKeys();
      const xpGain = Math.min(Math.floor(score * 2.5 + 3), 15);
      const seedGain = Math.floor(score * 0.5 + 2);
      this._save[type] = Math.min(100, this._save[type] + xpGain);
      this._save.seeds += seedGain;
      this._persist();

      const ov = document.createElement("div");
      ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;z-index:9999;pointer-events:all;";
      ov.innerHTML =
        `<div style="color:white;font-size:24px;font-weight:900;">✅ Done!</div>`+
        `<div style="color:#FFD700;font-size:17px;">Score: ${score}</div>`+
        `<div style="color:#4fc3f7;font-size:15px;">+${xpGain} ${type==="run"?"🏃 Run":type==="fly"?"🪶 Fly":"🏊 Swim"} XP</div>`+
        `<div style="color:#FFD700;font-size:15px;">+${seedGain} 🌱 Seeds</div>`;
      const cont = document.createElement("button");
      cont.textContent = "Continue";
      cont.style.cssText = "background:#4caf50;color:white;border:none;border-radius:12px;padding:12px 36px;font-size:16px;cursor:pointer;font-weight:bold;margin-top:8px;";
      const go = () => { ov.remove(); this._showHub(); };
      cont.onclick = go;
      cont.addEventListener("touchend", e => { e.preventDefault(); go(); }, { passive: false });
      ov.appendChild(cont);
      document.body.appendChild(ov);
    };

    // ── Run training ──────────────────────────────────────────────────────
    if (type === "run") {
      const GROUND = H * 0.73;
      let duckY = GROUND, duckVy = 0, onGround = true;
      const obs: {x:number,w:number,h:number,scored?:boolean}[] = [];
      let elapsed = 0, lastT = performance.now(), obsTimer = 0, speed = 210;

      const jump = () => { if (onGround && !gameOver) { duckVy = -510; onGround = false; } };
      canv.addEventListener("touchstart", e => { e.preventDefault(); jump(); }, { passive: false });
      canv.addEventListener("mousedown", jump);
      this._kHandler = e => { if (e.code === "Space") { e.preventDefault(); jump(); } };
      document.addEventListener("keydown", this._kHandler);

      const loop = (t: number) => {
        const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
        if (!gameOver) {
          elapsed += dt; timeLeft = Math.max(0, DURATION - elapsed);
          timerEl.textContent = `⏱ ${Math.ceil(timeLeft)}s`;
          duckVy += 1350 * dt; duckY += duckVy * dt;
          if (duckY >= GROUND) { duckY = GROUND; duckVy = 0; onGround = true; }
          speed = 210 + elapsed * 7;
          obsTimer += dt;
          const spawnInt = Math.max(0.88 - elapsed * 0.01, 0.45);
          if (obsTimer > spawnInt) {
            obsTimer = 0;
            obs.push({ x: W + 20, w: 20, h: 28 + Math.random() * 38 });
          }
          for (const o of obs) o.x -= speed * dt;
          const duckX = W * 0.2, dh = 32;
          for (const o of obs) {
            if (duckX + dh*.6 > o.x && duckX - dh*.05 < o.x + o.w && duckY - dh*.55 > GROUND - o.h - 4) {
              gameOver = true; showResult(); return;
            }
            if (!o.scored && o.x + o.w < duckX) { o.scored = true; score++; scoreEl.textContent = `Score: ${score}`; }
          }
          while (obs.length && obs[0].x < -40) obs.shift();
          if (timeLeft <= 0) { gameOver = true; showResult(); return; }
        }
        // Draw
        ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        for (let i = 0; i < 3; i++) {
          const cx = (80 + i*140 - (elapsed*25) % (W+200) + W+200) % (W+200);
          ctx.beginPath(); ctx.arc(cx,30+i*12,20+i*5,0,Math.PI*2); ctx.arc(cx+25,26+i*12,15+i*3,0,Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = "#4a9e4a"; ctx.fillRect(0, GROUND + 14, W, H - GROUND);
        ctx.fillStyle = "#6cc46c"; ctx.fillRect(0, GROUND + 14, W, 6);
        for (const o of obs) {
          ctx.fillStyle = "#888";
          ctx.beginPath(); ctx.roundRect(o.x, GROUND - o.h + 14, o.w, o.h, 4); ctx.fill();
          ctx.fillStyle = "#bbb"; ctx.fillRect(o.x + 3, GROUND - o.h + 17, 6, 4);
        }
        this._drawDuck(ctx, W * 0.2, duckY - 6, 30);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }

    // ── Fly training ──────────────────────────────────────────────────────
    else if (type === "fly") {
      let duckY = H / 2, duckVy = 0;
      const pipes: {x:number,gap:number,scored?:boolean}[] = [];
      const GAP = 125;
      let elapsed = 0, lastT = performance.now(), pipeTimer = 0, pipeSpeed = 175;

      const flap = () => { if (!gameOver) duckVy = -310; };
      canv.addEventListener("touchstart", e => { e.preventDefault(); flap(); }, { passive: false });
      canv.addEventListener("mousedown", flap);
      this._kHandler = e => { if (e.code === "Space") { e.preventDefault(); flap(); } };
      document.addEventListener("keydown", this._kHandler);

      const loop = (t: number) => {
        const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
        if (!gameOver) {
          elapsed += dt; timeLeft = Math.max(0, DURATION - elapsed);
          timerEl.textContent = `⏱ ${Math.ceil(timeLeft)}s`;
          duckVy += 860 * dt; duckY += duckVy * dt;
          if (duckY < 0 || duckY > H - 24) { gameOver = true; showResult(); return; }
          pipeSpeed = 175 + elapsed * 3; pipeTimer += dt;
          if (pipeTimer > 1.7) { pipeTimer = 0; pipes.push({ x: W + 20, gap: H * 0.18 + Math.random() * H * 0.46 }); }
          for (const p of pipes) p.x -= pipeSpeed * dt;
          const px = W * 0.2, py = duckY;
          for (const p of pipes) {
            if (px + 16 > p.x && px - 16 < p.x + 38) {
              if (py - 14 < p.gap || py + 14 > p.gap + GAP) { gameOver = true; showResult(); return; }
            }
            if (!p.scored && p.x + 38 < px) { p.scored = true; score++; scoreEl.textContent = `Score: ${score}`; }
          }
          while (pipes.length && pipes[0].x < -50) pipes.shift();
          if (timeLeft <= 0) { gameOver = true; showResult(); return; }
        }
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#1976d2"); grad.addColorStop(1, "#87CEEB");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        for (let i = 0; i < 4; i++) {
          const cx = (i*130 + 60 - (elapsed*35) % (W+200) + W+200) % (W+200);
          ctx.beginPath(); ctx.arc(cx,40+i*18,18,0,Math.PI*2); ctx.arc(cx+22,36+i*18,13,0,Math.PI*2); ctx.fill();
        }
        for (const p of pipes) {
          ctx.fillStyle = "#2e7d32"; ctx.fillRect(p.x, 0, 38, p.gap - 4);
          ctx.fillStyle = "#388e3c"; ctx.fillRect(p.x - 4, p.gap - 18, 46, 18);
          ctx.fillStyle = "#2e7d32"; ctx.fillRect(p.x, p.gap + GAP + 4, 38, H - p.gap - GAP);
          ctx.fillStyle = "#388e3c"; ctx.fillRect(p.x - 4, p.gap + GAP + 4, 46, 18);
        }
        this._drawDuck(ctx, W * 0.2, duckY, 27);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }

    // ── Swim training ─────────────────────────────────────────────────────
    else {
      let duckY = H / 2, duckVy = 0;
      const rocks: {x:number,y:number,r:number}[] = [];
      const fish: {x:number,y:number,got?:boolean}[] = [];
      let elapsed = 0, lastT = performance.now(), rockTimer = 0, fishTimer = 0, swimSpeed = 145;
      let held = false;

      canv.addEventListener("touchstart", e => { e.preventDefault(); held = true; }, { passive: false });
      canv.addEventListener("touchend",   e => { e.preventDefault(); held = false; }, { passive: false });
      canv.addEventListener("mousedown", () => held = true);
      canv.addEventListener("mouseup",   () => held = false);
      this._kHandler   = e => { if (e.code === "Space") { e.preventDefault(); held = true; } };
      this._kUpHandler = e => { if (e.code === "Space") held = false; };
      document.addEventListener("keydown", this._kHandler);
      document.addEventListener("keyup",   this._kUpHandler);

      const loop = (t: number) => {
        const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
        if (!gameOver) {
          elapsed += dt; timeLeft = Math.max(0, DURATION - elapsed);
          timerEl.textContent = `⏱ ${Math.ceil(timeLeft)}s`;
          duckVy += (held ? -760 : 480) * dt; duckVy *= 0.91;
          duckY += duckVy * dt; duckY = Math.max(18, Math.min(H - 18, duckY));
          swimSpeed = 145 + elapsed * 5;
          rockTimer += dt; fishTimer += dt;
          if (rockTimer > 0.85) { rockTimer = 0; rocks.push({ x: W + 20, y: H * 0.12 + Math.random() * H * 0.76, r: 14 + Math.random() * 14 }); }
          if (fishTimer > 0.55) { fishTimer = 0; fish.push({ x: W + 20, y: H * 0.1 + Math.random() * H * 0.8 }); }
          for (const r of rocks) r.x -= swimSpeed * dt;
          for (const f of fish) f.x -= swimSpeed * dt;
          const px = W * 0.2, py = duckY;
          for (const r of rocks) { if (Math.hypot(px - r.x, py - r.y) < r.r + 17) { gameOver = true; showResult(); return; } }
          for (const f of fish) { if (!f.got && Math.hypot(px - f.x, py - f.y) < 22) { f.got = true; score++; scoreEl.textContent = `Score: ${score}`; } }
          while (rocks.length && rocks[0].x < -40) rocks.shift();
          while (fish.length && fish[0].x < -30) fish.shift();
          if (timeLeft <= 0) { gameOver = true; showResult(); return; }
        }
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#0277bd"); grad.addColorStop(1, "#01579b");
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (let i = 0; i < 7; i++) {
          const bx = (i * 68 + elapsed * 22) % W, by = (H - (elapsed * 28 + i * 44) % (H + 20));
          ctx.beginPath(); ctx.arc(bx, by, 2 + i % 3, 0, Math.PI * 2); ctx.fill();
        }
        for (const r of rocks) {
          ctx.fillStyle = "#546e7a"; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#78909c"; ctx.beginPath(); ctx.arc(r.x - r.r*.3, r.y - r.r*.3, r.r*.3, 0, Math.PI * 2); ctx.fill();
        }
        for (const f of fish) {
          if (f.got) continue;
          ctx.fillStyle = "#FFD700";
          ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(f.x-9,f.y); ctx.lineTo(f.x-16,f.y-5); ctx.lineTo(f.x-16,f.y+5); ctx.closePath();
          ctx.fillStyle = "#FFA500"; ctx.fill();
          ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(f.x+3,f.y-2,1.8,0,Math.PI*2); ctx.fill();
        }
        this._drawDuck(ctx, W * 0.2, duckY, 27);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }
  }

  // ── Race menu ─────────────────────────────────────────────────────────────
  private _showRaceMenu() {
    this._wrap.innerHTML = "";
    const box = this._card();

    const hdr = document.createElement("div");
    hdr.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:20px;";
    const back = this._btn("← Back","rgba(0,0,0,0.25)"); back.onclick = () => this._showHub();
    const t = document.createElement("div"); t.style.cssText = "color:white;font-size:20px;font-weight:900;text-shadow:0 2px 4px rgba(0,0,0,0.3);"; t.textContent = "🏁 Race";
    hdr.appendChild(back); hdr.appendChild(t);
    box.appendChild(hdr);

    const races = [
      {name:"Beginner Cup",  emoji:"🌱",color:"#4caf50",opps:[{name:"Daffy",  color:"#4169E1",spd:32},{name:"Donald", color:"#1E90FF",spd:36}]},
      {name:"Amateur Cup",   emoji:"⭐",color:"#2196f3",opps:[{name:"Quackers",color:"#9B59B6",spd:50},{name:"Puddles",color:"#E74C3C",spd:55}]},
      {name:"Pro Cup",       emoji:"🔥",color:"#ff9800",opps:[{name:"Splash", color:"#E67E22",spd:65},{name:"Wings",  color:"#1ABC9C",spd:70}]},
      {name:"Champion Cup",  emoji:"💎",color:"#9c27b0",opps:[{name:"Turbo",  color:"#C0392B",spd:80},{name:"Blaze",  color:"#8E44AD",spd:85}]},
      {name:"World Cup",     emoji:"🏆",color:"#f44336",opps:[{name:"Ace",    color:"#2C3E50",spd:92},{name:"Legend", color:"#E74C3C",spd:96}]},
    ];

    for (let i = 0; i < races.length; i++) {
      const r = races[i];
      const locked = i > this._save.raceLevel;
      const isNext = i === this._save.raceLevel;
      const btn = document.createElement("button");
      btn.style.cssText =
        `width:100%;background:${locked ? "rgba(60,60,60,0.5)" : `linear-gradient(135deg,${r.color}cc,${r.color}88)`};`+
        `color:white;border:${locked ? "1px solid rgba(255,255,255,0.08)" : `2px solid ${r.color}`};`+
        `border-radius:16px;padding:14px 18px;cursor:${locked?"not-allowed":"pointer"};text-align:left;`+
        `margin-bottom:10px;opacity:${locked?0.45:1};display:flex;align-items:center;gap:12px;`;
      btn.innerHTML =
        `<div style="font-size:28px;">${locked?"🔒":r.emoji}</div>`+
        `<div style="flex:1;"><div style="font-size:15px;font-weight:bold;">${r.name}</div>`+
        `<div style="font-size:12px;opacity:0.75;">vs ${r.opps.map(o=>o.name).join(" & ")}</div></div>`+
        (isNext ? `<div style="background:rgba(255,255,0,0.25);border-radius:8px;padding:2px 10px;font-size:12px;font-weight:bold;">► Next</div>` : "");
      if (!locked) btn.onclick = () => this._startRace(r.opps, r.name);
      box.appendChild(btn);
    }
    this._wrap.appendChild(box);
  }

  private _startRace(opponents:{name:string,color:string,spd:number}[], raceName:string) {
    this._removeKeys();
    this._wrap.innerHTML = "";

    const TRACK = 1200;
    const mySpd = (this._save.run*.4 + this._save.fly*.3 + this._save.swim*.3) / 100 * 240 + 65;
    const opps = opponents.map(o => ({ ...o, pos: 0, v: (o.spd/100)*240+65+(Math.random()-.5)*18 }));
    let myPos = 0, animId = 0, lastT = performance.now(), done = false, winner = "";

    const container = document.createElement("div");
    container.style.cssText = "max-width:400px;margin:0 auto;padding:16px;";
    const titleEl = document.createElement("div");
    titleEl.style.cssText = "color:white;font-size:17px;font-weight:900;text-align:center;margin-bottom:10px;";
    titleEl.textContent = `🏁 ${raceName}`;
    container.appendChild(titleEl);

    const canv = document.createElement("canvas");
    const W = Math.min(window.innerWidth - 32, 400);
    const H = Math.min(window.innerHeight - 120, 260);
    canv.width = W; canv.height = H;
    canv.style.cssText = "border-radius:16px;display:block;";
    container.appendChild(canv);
    this._wrap.appendChild(container);

    const ctx = canv.getContext("2d")!;
    const LANE_H = 60, LANE_GAP = 8;
    const allDucks = [
      { name: this._save.name, color: this._save.color, isPlayer: true,  getPos: () => myPos },
      ...opps.map(o => ({ name: o.name, color: o.color, isPlayer: false, getPos: () => o.pos })),
    ];

    const loop = (t: number) => {
      const dt = Math.min((t - lastT) / 1000, 0.05); lastT = t;
      if (!done) {
        myPos += mySpd * dt;
        for (const o of opps) o.pos += o.v * dt;
        if (myPos >= TRACK) { done = true; winner = "you"; }
        else {
          const first = opps.find(o => o.pos >= TRACK);
          if (first) { done = true; winner = first.name; }
        }
      }

      ctx.fillStyle = "#3a7d3a"; ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < allDucks.length; i++) {
        const ly = 10 + i * (LANE_H + LANE_GAP);
        const d = allDucks[i];
        const progress = Math.min(d.getPos() / TRACK, 1);

        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.beginPath(); ctx.roundRect(10, ly, W-20, LANE_H, 8); ctx.fill();

        // Progress fill
        ctx.fillStyle = d.color + "55";
        ctx.beginPath(); ctx.roundRect(10, ly, (W-20)*progress, LANE_H, 8); ctx.fill();

        // Finish line
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2; ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(W-18, ly); ctx.lineTo(W-18, ly+LANE_H); ctx.stroke();
        ctx.setLineDash([]);

        // Duck
        const duckX = 28 + (W-55)*progress;
        if (d.isPlayer) {
          this._drawDuck(ctx, duckX, ly + LANE_H/2 - 2, 22);
        } else {
          ctx.fillStyle = d.color;
          ctx.beginPath(); ctx.ellipse(duckX, ly+LANE_H/2+2, 15, 11, 0, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(duckX+13, ly+LANE_H/2-6, 8, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#ff9900";
          ctx.beginPath(); ctx.moveTo(duckX+19,ly+LANE_H/2-5); ctx.lineTo(duckX+25,ly+LANE_H/2-2); ctx.lineTo(duckX+19,ly+LANE_H/2+1); ctx.closePath(); ctx.fill();
          ctx.fillStyle="#000"; ctx.beginPath(); ctx.arc(duckX+15,ly+LANE_H/2-8,2,0,Math.PI*2); ctx.fill();
        }

        ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "bold 11px Arial";
        ctx.fillText(d.name + (d.isPlayer ? " (You)" : ""), 18, ly + 14);
      }

      if (done) {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0,0,W,H);
        ctx.textAlign = "center";
        ctx.fillStyle = winner === "you" ? "#FFD700" : "#ff6b6b";
        ctx.font = "bold 26px Arial";
        ctx.fillText(winner === "you" ? "🏆 YOU WIN!" : `${winner} wins!`, W/2, H/2-8);
        ctx.fillStyle = "white"; ctx.font = "15px Arial";
        ctx.fillText("Tap to continue", W/2, H/2+18);
        ctx.textAlign = "left";

        if (!canv.dataset.handled) {
          canv.dataset.handled = "1";
          const finish = () => {
            cancelAnimationFrame(animId);
            if (winner === "you") {
              this._save.seeds += 20;
              if (this._save.raceLevel < 5) this._save.raceLevel++;
              this._g.state.coins = (this._g.state.coins || 0) + 5;
              this._persist();
            }
            this._showRaceMenu();
          };
          canv.addEventListener("touchend", e => { e.preventDefault(); finish(); }, { passive:false, once:true });
          canv.addEventListener("mousedown", finish, { once: true });
        }
      }

      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
  }

  // ── Shop ──────────────────────────────────────────────────────────────────
  private _showShop() {
    this._wrap.innerHTML = "";
    const box = this._card();

    const hdr = document.createElement("div");
    hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;";
    const back = this._btn("← Back","rgba(0,0,0,0.25)"); back.onclick = () => this._showHub();
    const t = document.createElement("div"); t.style.cssText = "color:white;font-size:20px;font-weight:900;"; t.textContent = "🛒 Shop";
    const seeds = document.createElement("div");
    seeds.style.cssText = "background:rgba(255,200,0,0.25);border:1.5px solid rgba(255,200,0,0.6);border-radius:12px;padding:4px 12px;color:#FFD700;font-size:14px;font-weight:bold;";
    seeds.textContent = `🌱 ${this._save.seeds}`;
    hdr.appendChild(back); hdr.appendChild(t); hdr.appendChild(seeds);
    box.appendChild(hdr);

    const secTitle = (txt:string) => {
      const d = document.createElement("div");
      d.style.cssText = "color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:2px;margin:14px 0 8px;";
      d.textContent = txt; box.appendChild(d);
    };

    // Duck preview
    const prev = document.createElement("canvas");
    prev.width = 80; prev.height = 64;
    prev.style.cssText = "display:block;margin:0 auto 14px;border-radius:12px;background:rgba(255,255,255,0.1);";
    box.appendChild(prev);
    const redraw = () => {
      const c = prev.getContext("2d")!;
      c.clearRect(0,0,80,64);
      this._drawDuck(c, 32, 42, 28);
    };
    redraw();

    // Colors
    secTitle("DUCK COLOR");
    const colors = [
      {name:"Yellow",color:"#f5c842",cost:0},
      {name:"White", color:"#f0f0f0",cost:15},
      {name:"Orange",color:"#ff8c42",cost:15},
      {name:"Teal",  color:"#42c5c5",cost:20},
      {name:"Purple",color:"#9b59b6",cost:20},
      {name:"Pink",  color:"#ff69b4",cost:25},
    ];
    const colorGrid = document.createElement("div");
    colorGrid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px;";
    for (const c of colors) {
      const owned = this._save.ownedColors.includes(c.color);
      const sel = this._save.color === c.color;
      const btn = document.createElement("button");
      btn.style.cssText = `background:${c.color}22;border:2px solid ${sel ? c.color : "rgba(255,255,255,0.14)"};border-radius:12px;padding:10px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;opacity:${!owned && this._save.seeds < c.cost ? 0.45 : 1};`;
      btn.innerHTML =
        `<div style="width:26px;height:26px;border-radius:50%;background:${c.color};border:2px solid rgba(255,255,255,0.3);"></div>`+
        `<div style="color:white;font-size:11px;">${c.name}</div>`+
        `<div style="color:#FFD700;font-size:11px;">${owned||c.cost===0 ? (sel?"✔":"Owned") : `🌱${c.cost}`}</div>`;
      btn.onclick = () => {
        if (!owned && c.cost > 0) {
          if (this._save.seeds < c.cost) return;
          this._save.seeds -= c.cost;
          this._save.ownedColors.push(c.color);
        }
        this._save.color = c.color;
        this._persist();
        redraw();
        this._showShop();
      };
      colorGrid.appendChild(btn);
    }
    box.appendChild(colorGrid);

    // Hats
    secTitle("HATS");
    const hats = [
      {name:"None",  hat:"none",  cost:0,  emoji:"🚫"},
      {name:"Cap",   hat:"cap",   cost:20, emoji:"🧢"},
      {name:"Crown", hat:"crown", cost:40, emoji:"👑"},
      {name:"Bow",   hat:"bow",   cost:30, emoji:"🎀"},
    ];
    const hatGrid = document.createElement("div");
    hatGrid.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:8px;";
    for (const h of hats) {
      const owned = this._save.ownedHats.includes(h.hat);
      const sel = this._save.hat === h.hat;
      const btn = document.createElement("button");
      btn.style.cssText = `background:rgba(255,255,255,0.06);border:2px solid ${sel ? "#FFD700" : "rgba(255,255,255,0.14)"};border-radius:12px;padding:10px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;opacity:${!owned && this._save.seeds < h.cost ? 0.45 : 1};`;
      btn.innerHTML =
        `<div style="font-size:22px;">${h.emoji}</div>`+
        `<div style="color:white;font-size:11px;">${h.name}</div>`+
        `<div style="color:#FFD700;font-size:11px;">${owned||h.cost===0 ? (sel?"✔":"Owned") : `🌱${h.cost}`}</div>`;
      btn.onclick = () => {
        if (!owned && h.cost > 0) {
          if (this._save.seeds < h.cost) return;
          this._save.seeds -= h.cost;
          this._save.ownedHats.push(h.hat);
        }
        this._save.hat = h.hat;
        this._persist();
        redraw();
        this._showShop();
      };
      hatGrid.appendChild(btn);
    }
    box.appendChild(hatGrid);
    this._wrap.appendChild(box);
  }
}
