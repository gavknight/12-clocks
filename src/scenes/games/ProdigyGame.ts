// ProdigyGame.ts — Prodigy-inspired: walkable world, roaming enemies, treasure chests

const TILE  = 48;   // pixels per tile
const COLS  = 30;   // map width in tiles
const ROWS  = 20;   // map height in tiles
const SPD   = 3;    // player speed (tiles/sec)

// Tile types
const T_GROUND = 0;
const T_WALL   = 1;
const T_LAVA   = 2;

interface Rect { x:number; y:number; w:number; h:number; }
interface Enemy { x:number; y:number; emoji:string; name:string; dx:number; dy:number; wanderTimer:number; color:string; }
interface Chest { x:number; y:number; opened:boolean; }
interface Pet   { x:number; y:number; }

function buildMap(): number[][] {
  const map: number[][] = [];
  for (let r=0; r<ROWS; r++) {
    map[r] = [];
    for (let c=0; c<COLS; c++) {
      // Border walls
      if (r===0||r===ROWS-1||c===0||c===COLS-1) { map[r][c]=T_WALL; continue; }
      // Lava rivers
      if ((r===6||r===7) && c>3 && c<12) { map[r][c]=T_LAVA; continue; }
      if ((r===13||r===14) && c>18 && c<27) { map[r][c]=T_LAVA; continue; }
      // Rock walls (obstacles)
      if (r===4 && c>8 && c<14)  { map[r][c]=T_WALL; continue; }
      if (r===10 && c>5 && c<10) { map[r][c]=T_WALL; continue; }
      if (r===15 && c>10 && c<16){ map[r][c]=T_WALL; continue; }
      if (c===15 && r>2 && r<8)  { map[r][c]=T_WALL; continue; }
      map[r][c] = T_GROUND;
    }
  }
  return map;
}

export class ProdigyGame {
  private _container: HTMLElement;
  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _onEnd: (won:boolean, msg:string)=>void;

  // Map
  private _map = buildMap();

  // Player
  private _px = 2.5; private _py = 2.5; // tile coords
  private _facing = 1; // 1=right -1=left

  // Pet follows player
  private _pet: Pet = { x:2, y:3 };

  // Entities
  private _enemies: Enemy[] = [
    { x:5,  y:10, emoji:"🔥", name:"Embershed",   dx:0, dy:0, wanderTimer:0, color:"#ff6b35" },
    { x:12, y:5,  emoji:"🧊", name:"Glacias",      dx:0, dy:0, wanderTimer:0, color:"#90e0ef" },
    { x:20, y:12, emoji:"💀", name:"Bone King",    dx:0, dy:0, wanderTimer:0, color:"#adb5bd" },
    { x:8,  y:16, emoji:"🐸", name:"Lava Toad",    dx:0, dy:0, wanderTimer:0, color:"#f4a261" },
    { x:25, y:5,  emoji:"🐲", name:"Storm Drake",  dx:0, dy:0, wanderTimer:0, color:"#4361ee" },
    { x:22, y:17, emoji:"🐺", name:"Shadow Wolf",  dx:0, dy:0, wanderTimer:0, color:"#6d6875" },
  ];
  // Enemy max HP varies per enemy
  private _enemyMaxHpMap: Record<string,number> = {
    "Embershed": 320,
    "Glacias":   480,
    "Bone King": 902,
    "Lava Toad": 210,
    "Storm Drake":650,
    "Shadow Wolf":390,
  };
  private _chests: Chest[] = [
    { x:16, y:10, opened:false },
    { x:6,  y:15, opened:false },
    { x:27, y:3,  opened:false },
    { x:14, y:17, opened:false },
  ];

  // Input
  private _keys = new Set<string>();
  private _hud!: HTMLDivElement;

  // Game state
  private _phase: "world"|"battle"|"menu" = "menu";
  private _level = 1;
  private _battlesWon = 0;

  // Battle state — up to 3 enemies
  private _battleEnemies: Enemy[] = [];
  private _battleEnemyHps: number[] = [];
  private _battleEnemyMaxHps: number[] = [];
  private _battleRound = 0;
  private _playerHp = 100;
  private _answer = 0;
  private _showingSpells = false;

  private _raf = 0;
  private _lastTs = 0;
  private _disposed = false;
  private _cleanup: (()=>void)[] = [];

  constructor(container: HTMLElement, onEnd: (won:boolean, msg:string)=>void) {
    this._container = container;
    this._onEnd = onEnd;
    this._showMenu();
  }

  // ── Menu ───────────────────────────────────────────────────────────────────
  private _showMenu() {
    this._phase = "menu";
    const div = document.createElement("div");
    Object.assign(div.style, {
      position:"absolute", inset:"0", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", gap:"20px",
      background:"linear-gradient(180deg,#3d1505 0%,#8b3a00 50%,#e07b00 100%)",
      fontFamily:"'Fredoka One',Arial,sans-serif", pointerEvents:"all", zIndex:"10"
    });
    div.innerHTML = `
      <div style="font-size:72px">🧙</div>
      <div style="color:#ffe066;font-size:40px;font-weight:bold;text-shadow:0 2px 12px rgba(0,0,0,0.5)">Prodigy</div>
      <div style="color:rgba(255,255,255,0.7);font-size:15px;text-align:center;max-width:280px;line-height:1.7">
        Walk around the world!<br>
        Touch an enemy to start a battle.<br>
        Answer math to cast spells!
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;width:230px">
        <button id="pPlayBtn" style="background:#ffe066;color:#3d1505;border:none;border-radius:14px;
          padding:16px;font-size:22px;font-weight:bold;cursor:pointer;font-family:inherit;">Play!</button>
        <button id="pBackBtn" style="background:rgba(255,255,255,0.1);color:white;
          border:2px solid rgba(255,255,255,0.2);border-radius:14px;
          padding:12px;font-size:17px;cursor:pointer;font-family:inherit;">Back to Arcade</button>
      </div>
      <div style="color:rgba(255,255,255,0.3);font-size:13px">Level ${this._level} • ${this._battlesWon} battles won</div>
    `;
    this._container.appendChild(div);
    div.querySelector("#pPlayBtn")!.addEventListener("click", () => { div.remove(); this._startWorld(); });
    div.querySelector("#pBackBtn")!.addEventListener("click", () => { div.remove(); this._onEnd(false,""); });
  }

  // ── World ──────────────────────────────────────────────────────────────────
  private _startWorld() {
    this._phase = "world";

    // Canvas
    this._canvas = document.createElement("canvas");
    this._canvas.width  = this._container.clientWidth  || 480;
    this._canvas.height = this._container.clientHeight || 640;
    Object.assign(this._canvas.style, { position:"absolute", inset:"0", width:"100%", height:"100%", display:"block" });
    this._container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d")!;

    // HUD overlay
    this._hud = document.createElement("div");
    Object.assign(this._hud.style, {
      position:"absolute", inset:"0", pointerEvents:"all", fontFamily:"'Fredoka One',Arial,sans-serif"
    });
    this._container.appendChild(this._hud);
    this._buildWorldHUD();

    // Input
    const kd=(e:KeyboardEvent)=>this._keys.add(e.code);
    const ku=(e:KeyboardEvent)=>this._keys.delete(e.code);
    window.addEventListener("keydown",kd);
    window.addEventListener("keyup",ku);

    const onResize=()=>{
      this._canvas.width=this._container.clientWidth||480;
      this._canvas.height=this._container.clientHeight||640;
    };
    window.addEventListener("resize",onResize);

    this._cleanup.push(()=>{
      window.removeEventListener("keydown",kd);
      window.removeEventListener("keyup",ku);
      window.removeEventListener("resize",onResize);
    });

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(this._worldLoop);
  }

  private _buildWorldHUD() {
    this._hud.innerHTML = `
      <!-- Top bar -->
      <div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center">
        <div style="background:rgba(0,0,0,0.6);border-radius:10px;padding:6px 14px;color:#ffe066;font-size:15px;font-weight:bold">
          Lv.${this._level} Gavin Fireheart
        </div>
        <div style="background:rgba(0,0,0,0.6);border-radius:10px;padding:6px 14px;color:white;font-size:14px">
          ❤️ ${this._playerHp}/100
        </div>
      </div>
      <!-- Controls hint -->
      <div style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.5);border-radius:10px;padding:6px 16px;
        color:rgba(255,255,255,0.4);font-size:12px;text-align:center">
        WASD / Arrow keys to move • Touch enemies to battle
      </div>
      <!-- D-pad for mobile -->
      <div id="dpad" style="position:absolute;bottom:50px;right:20px;width:120px;height:120px;pointer-events:all">
        <button id="dUp"    style="${_dpadBtn()} top:0;left:35px;"    >▲</button>
        <button id="dDown"  style="${_dpadBtn()} bottom:0;left:35px;" >▼</button>
        <button id="dLeft"  style="${_dpadBtn()} top:35px;left:0;"    >◀</button>
        <button id="dRight" style="${_dpadBtn()} top:35px;right:0;"   >▶</button>
      </div>
    `;
    // D-pad
    const press=(code:string,down:boolean)=>{ if(down) this._keys.add(code); else this._keys.delete(code); };
    [["dUp","ArrowUp"],["dDown","ArrowDown"],["dLeft","ArrowLeft"],["dRight","ArrowRight"]].forEach(([id,code])=>{
      const btn=this._hud.querySelector(`#${id}`)!;
      btn.addEventListener("pointerdown",()=>press(code,true));
      btn.addEventListener("pointerup",()=>press(code,false));
      btn.addEventListener("pointerleave",()=>press(code,false));
    });
  }

  private _worldLoop = (ts:number) => {
    if (this._disposed||this._phase!=="world") return;
    const dt = Math.min((ts-this._lastTs)/1000, 0.05);
    this._lastTs = ts;
    this._updateWorld(dt);
    this._drawWorld();
    this._raf = requestAnimationFrame(this._worldLoop);
  };

  private _updateWorld(dt:number) {
    let dx=0, dy=0;
    if (this._keys.has("KeyW")||this._keys.has("ArrowUp"))    dy-=SPD*dt;
    if (this._keys.has("KeyS")||this._keys.has("ArrowDown"))  dy+=SPD*dt;
    if (this._keys.has("KeyA")||this._keys.has("ArrowLeft"))  { dx-=SPD*dt; this._facing=-1; }
    if (this._keys.has("KeyD")||this._keys.has("ArrowRight")) { dx+=SPD*dt; this._facing= 1; }

    // Move player with collision
    const nx=this._px+dx, ny=this._py+dy;
    if (this._canWalk(nx, this._py)) this._px=nx;
    if (this._canWalk(this._px, ny)) this._py=ny;
    this._px=Math.max(0.5,Math.min(COLS-1.5,this._px));
    this._py=Math.max(0.5,Math.min(ROWS-1.5,this._py));

    // Pet lags behind player
    const pdx=this._px-this._pet.x, pdy=this._py-this._pet.y;
    const plen=Math.sqrt(pdx*pdx+pdy*pdy);
    if (plen>1.2) { this._pet.x+=pdx/plen*SPD*0.8*dt; this._pet.y+=pdy/plen*SPD*0.8*dt; }

    // Enemies wander
    for (const e of this._enemies) {
      e.wanderTimer-=dt;
      if (e.wanderTimer<=0) {
        e.dx=(Math.random()-0.5)*1.5; e.dy=(Math.random()-0.5)*1.5;
        e.wanderTimer=1.5+Math.random()*2;
      }
      const ex=e.x+e.dx*dt, ey=e.y+e.dy*dt;
      if (this._canWalk(ex,e.y)) e.x=ex;
      if (this._canWalk(e.x,ey)) e.y=ey;
      e.x=Math.max(1,Math.min(COLS-2,e.x));
      e.y=Math.max(1,Math.min(ROWS-2,e.y));

      // Check if player touches enemy → battle
      const dist=Math.sqrt((this._px-e.x)**2+(this._py-e.y)**2);
      if (dist<0.9) { this._startBattle(e); return; }
    }
  }

  private _canWalk(x:number,y:number):boolean {
    const c=Math.floor(x), r=Math.floor(y);
    if (r<0||r>=ROWS||c<0||c>=COLS) return false;
    return this._map[r][c]===T_GROUND;
  }

  private _drawWorld() {
    const cv=this._canvas, ctx=this._ctx;
    const W=cv.width, H=cv.height;

    // Camera follows player
    const camX=this._px*TILE - W/2;
    const camY=this._py*TILE - H/2;

    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.translate(-camX,-camY);

    // Draw tiles
    const startC=Math.max(0,Math.floor(camX/TILE)-1);
    const endC  =Math.min(COLS,Math.ceil((camX+W)/TILE)+1);
    const startR=Math.max(0,Math.floor(camY/TILE)-1);
    const endR  =Math.min(ROWS,Math.ceil((camY+H)/TILE)+1);

    for (let r=startR;r<endR;r++) {
      for (let c=startC;c<endC;c++) {
        const t=this._map[r][c];
        const tx=c*TILE, ty=r*TILE;
        if (t===T_GROUND) {
          ctx.fillStyle=(r+c)%2===0?"#c8860a":"#b87800";
          ctx.fillRect(tx,ty,TILE,TILE);
          // Ground detail
          ctx.fillStyle="rgba(0,0,0,0.05)";
          ctx.fillRect(tx+2,ty+2,TILE-4,TILE-4);
        } else if (t===T_WALL) {
          ctx.fillStyle="#5c3a1e";
          ctx.fillRect(tx,ty,TILE,TILE);
          ctx.fillStyle="#7a4f2e";
          ctx.fillRect(tx+2,ty+2,TILE-4,8);
          ctx.fillStyle="#4a2a10";
          ctx.fillRect(tx,ty+TILE-4,TILE,4);
        } else if (t===T_LAVA) {
          const flicker=Math.sin(Date.now()*0.004)*0.15;
          ctx.fillStyle=`rgba(${220+Math.floor(flicker*30)},60,0,1)`;
          ctx.fillRect(tx,ty,TILE,TILE);
          ctx.fillStyle="rgba(255,200,0,0.3)";
          ctx.fillRect(tx+4,ty+4,TILE-8,TILE-8);
        }
      }
    }

    // Draw chests
    for (const ch of this._chests) {
      const tx=ch.x*TILE+4, ty=ch.y*TILE+4;
      ctx.fillStyle=ch.opened?"#6d4c1f":"#a0522d";
      ctx.fillRect(tx,ty,TILE-8,TILE-8);
      ctx.fillStyle=ch.opened?"#4a3010":"#c8841a";
      ctx.fillRect(tx,ty,TILE-8,8);
      if (!ch.opened) { ctx.fillStyle="#f5c842"; ctx.fillRect(tx+(TILE-8)/2-4,ty+2,8,8); }
    }

    // Draw enemies
    for (const e of this._enemies) {
      ctx.font=`${TILE-6}px serif`;
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText(e.emoji, e.x*TILE+TILE/2, e.y*TILE+TILE/2);
      // Name tag
      ctx.fillStyle="rgba(0,0,0,0.6)";
      ctx.fillRect(e.x*TILE,e.y*TILE-14,TILE,14);
      ctx.fillStyle="white";
      ctx.font="bold 9px Arial";
      ctx.fillText(e.name,e.x*TILE+TILE/2,e.y*TILE-7);
    }

    // Draw pet (follows player)
    ctx.font=`${TILE-10}px serif`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("🦊", this._pet.x*TILE+TILE/2, this._pet.y*TILE+TILE/2);

    // Draw player wizard
    ctx.font=`${TILE-4}px serif`;
    ctx.save();
    if (this._facing===-1) { ctx.scale(-1,1); ctx.fillText("🧙",-(this._px*TILE+TILE/2),this._py*TILE+TILE/2); }
    else ctx.fillText("🧙", this._px*TILE+TILE/2, this._py*TILE+TILE/2);
    ctx.restore();

    // Player name
    ctx.fillStyle="rgba(0,0,0,0.6)";
    ctx.fillRect(this._px*TILE, this._py*TILE-16, TILE, 14);
    ctx.fillStyle="#ffe066";
    ctx.font="bold 9px Arial";
    ctx.textAlign="center";
    ctx.fillText("Gavin",this._px*TILE+TILE/2,this._py*TILE-9);

    ctx.restore();
  }

  // ── Battle ─────────────────────────────────────────────────────────────────
  private _startBattle(touched: Enemy) {
    this._phase = "battle";
    this._battleRound = 0;
    this._showingSpells = false;

    // Group: touched enemy + up to 2 nearest enemies
    const dist = (a: Enemy, b: Enemy) => Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);
    const others = this._enemies.filter(e => e !== touched)
      .sort((a,b) => dist(a,touched) - dist(b,touched));
    this._battleEnemies = [touched, ...others.slice(0,2)];
    this._battleEnemyMaxHps = this._battleEnemies.map(e => this._enemyMaxHpMap[e.name] ?? (60+this._level*8));
    this._battleEnemyHps = [...this._battleEnemyMaxHps];

    cancelAnimationFrame(this._raf);
    this._canvas.style.display = "none";
    this._hud.style.pointerEvents = "all";
    this._showVsScreen();
  }

  // ── VS intro screen ────────────────────────────────────────────────────────
  private _showVsScreen() {
    const enemies = this._battleEnemies;
    const pPct = this._playerHp;
    this._hud.innerHTML = `
      <div id="vsScreen" style="position:absolute;inset:0;
        background:linear-gradient(180deg,#8b3a00 0%,#c8680a 40%,#e07b00 70%,#4a1500 100%);
        display:flex;align-items:center;justify-content:space-between;padding:0 24px;
        font-family:'Fredoka One',Arial,sans-serif;overflow:hidden;">

        <div style="position:absolute;bottom:0;left:0;right:0;height:80px;
          background:linear-gradient(180deg,transparent,#3d1000);pointer-events:none"></div>
        <div style="position:absolute;top:0;left:0;right:0;height:60px;
          background:linear-gradient(180deg,#3d1000,transparent);pointer-events:none"></div>

        <!-- Player side: wizard + ice pet -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;animation:slideInLeft 0.5s ease-out">
          <div style="font-size:80px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5))">🧙</div>
          <div style="font-size:52px;margin-top:-16px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5))">🐲</div>
          <div style="background:rgba(0,0,0,0.5);border-radius:10px;padding:4px 12px;
            color:#ffe066;font-size:13px;font-weight:bold">Gavin Fireheart</div>
          <div style="width:120px;height:8px;background:rgba(0,0,0,0.4);border-radius:4px">
            <div style="width:${pPct}%;height:100%;background:#4caf50;border-radius:4px"></div>
          </div>
        </div>

        <!-- VS -->
        <div style="font-size:80px;font-weight:900;color:#e63946;
          text-shadow:-4px -4px 0 #7a0000,4px -4px 0 #7a0000,-4px 4px 0 #7a0000,4px 4px 0 #7a0000,
          0 0 30px rgba(230,57,70,0.8);animation:vsPulse 0.6s ease-out;">VS</div>

        <!-- Enemy side: up to 3 enemies stacked -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;animation:slideInRight 0.5s ease-out">
          ${enemies.map((e,i) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px;
              ${i>0 ? 'opacity:0.85;' : ''}">
              <div style="font-size:${i===0?'64':'44'}px">${e.emoji}</div>
              <div style="background:rgba(0,0,0,0.5);border-radius:8px;padding:2px 10px;
                color:white;font-size:11px;font-weight:bold">${e.name}</div>
              <div style="width:${i===0?'120':'90'}px;height:6px;background:rgba(0,0,0,0.4);border-radius:3px">
                <div style="width:100%;height:100%;background:#4caf50;border-radius:3px"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
      <style>
        @keyframes slideInLeft{from{transform:translateX(-80px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes slideInRight{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes vsPulse{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
      </style>
    `;
    setTimeout(() => this._showMathScreen(), 1800);
  }

  // ── Math screen ────────────────────────────────────────────────────────────
  private _typedAnswer = "";

  private _showMathScreen(msg = "", isCorrect = false) {
    this._hud.style.pointerEvents = "all";
    this._showingSpells = false;

    const {q, op, a1, a2, answer} = this._makeQuestion();
    this._answer = answer;
    this._typedAnswer = "";

    const pPct = Math.max(0, this._playerHp);
    const pCol = pPct > 50 ? "#4caf50" : pPct > 25 ? "#ff9800" : "#f44336";

    // Build enemy HP bar row
    const enemyBars = this._battleEnemies.map((e,i) => {
      const hp = this._battleEnemyHps[i];
      const maxHp = this._battleEnemyMaxHps[i];
      const dead = hp <= 0;
      const pct = Math.max(0,(hp/maxHp)*100);
      const col = pct>50?"#4caf50":pct>25?"#ff9800":"#f44336";
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;${dead?"opacity:0.3":""}">
        <div style="font-size:${i===0?'44':'30'}px">${e.emoji}</div>
        <div style="color:#555;font-size:9px;text-align:center">${e.name}</div>
        <div style="width:${i===0?'80':'60'}px;height:6px;background:#ddd;border-radius:3px">
          <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;transition:width 0.4s"></div>
        </div>
      </div>`;
    }).join("");

    this._hud.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;
        background:#f5f0e8;font-family:'Fredoka One',Arial,sans-serif;">

        <!-- Battle scene -->
        <div style="flex:1;position:relative;min-height:0;background:linear-gradient(180deg,#e8c49a,#f5ddb0);
          display:flex;align-items:flex-end;justify-content:space-between;padding:8px 16px 0;">

          <!-- Player HP top-left -->
          <div style="position:absolute;top:8px;left:10px">
            <div style="color:#555;font-size:11px;margin-bottom:2px">Gavin Fireheart</div>
            <div style="width:110px;height:7px;background:#ddd;border-radius:4px">
              <div style="width:${pPct}%;height:100%;background:${pCol};border-radius:4px;transition:width 0.4s"></div>
            </div>
          </div>

          <!-- Enemy HP bars top-right -->
          <div style="position:absolute;top:6px;right:8px;display:flex;gap:8px;align-items:flex-start">
            ${enemyBars}
          </div>

          <!-- Player + ice pet -->
          <div style="display:flex;flex-direction:column;align-items:center;padding-bottom:4px">
            <div style="font-size:52px">🧙</div>
            <div style="font-size:36px;margin-top:-10px">🐲</div>
          </div>

          ${msg ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
            background:rgba(0,0,0,0.75);color:${isCorrect?"#ffe066":"#ff6b6b"};font-size:16px;font-weight:bold;
            border-radius:12px;padding:8px 18px;text-align:center;white-space:nowrap">${msg}</div>` : ""}

          <!-- Enemies row -->
          <div style="display:flex;gap:8px;align-items:flex-end;padding-bottom:4px">
            ${this._battleEnemies.map((e,i)=>`<div style="font-size:${i===0?'52':'36'}px;${this._battleEnemyHps[i]<=0?"filter:grayscale(1);opacity:0.3":""}">${e.emoji}</div>`).join("")}
          </div>
        </div>

        <!-- Math area -->
        <div style="background:white;padding:12px 20px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;
          border-top:2px solid #e0d8cc;">
          <div style="color:#888;font-size:13px;align-self:flex-start">${q}:</div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:28px;color:#333;font-weight:bold">
            <div>${a1}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:22px;color:#555">${op}</span>
              <span>${a2}</span>
            </div>
            <div style="width:100%;height:3px;background:#333;border-radius:2px"></div>
            <div id="answerBox" style="min-width:80px;height:40px;border:2px solid #4a90d9;border-radius:8px;
              background:white;display:flex;align-items:center;justify-content:center;font-size:26px;color:#333;position:relative;">
              <span id="typedVal"></span>
              <div style="position:absolute;top:3px;right:3px;width:18px;height:18px;
                background:#00c853;border-radius:50%;display:flex;align-items:center;justify-content:center;">
                <span style="color:white;font-size:10px">💡</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Number keyboard -->
        <div style="background:#e8e8e8;padding:6px;display:grid;grid-template-columns:repeat(12,1fr);gap:3px;">
          ${["1","2","3","4","5","6","7","8","9","0","⌫"].map(k=>`
            <button class="kbBtn" data-k="${k}" style="
              background:white;border:1px solid #ccc;border-radius:7px;
              padding:10px 2px;font-size:17px;font-weight:bold;cursor:pointer;
              font-family:inherit;color:#333;
            ">${k}</button>
          `).join("")}
          <button id="getMagicBtn" style="
            background:linear-gradient(135deg,#1565c0,#1976d2);color:white;
            border:none;border-radius:8px;padding:10px 2px;font-size:12px;
            font-weight:bold;cursor:pointer;font-family:inherit;
            display:flex;flex-direction:column;align-items:center;gap:1px;
          "><span style="font-size:18px">✨</span><span style="font-size:9px">Get Magic</span></button>
        </div>

        <!-- Bottom row: run away + spell slots (right) -->
        <div style="background:#e8e8e8;padding:4px 8px 6px;display:flex;justify-content:space-between;align-items:center">
          <button id="runBtn" style="background:none;border:none;color:#888;font-size:12px;
            cursor:pointer;font-family:inherit;text-decoration:underline;">Run away</button>
          <!-- Spell slots placeholder (bottom right) — lights up after correct answer -->
          <div id="spellSlots" style="display:flex;gap:6px;opacity:0.3">
            ${["💥","⭐","🔥","🪵"].map(e=>`
              <div style="width:36px;height:36px;background:rgba(0,0,0,0.1);border-radius:8px;
                display:flex;align-items:center;justify-content:center;font-size:20px">${e}</div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    const typedEl = this._hud.querySelector("#typedVal")!;
    this._typedAnswer = "";

    this._hud.querySelectorAll(".kbBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const k = (btn as HTMLElement).dataset.k!;
        if (k === "⌫") this._typedAnswer = this._typedAnswer.slice(0,-1);
        else if (this._typedAnswer.length < 6) this._typedAnswer += k;
        typedEl.textContent = this._typedAnswer;
      });
    });

    this._hud.querySelector("#getMagicBtn")!.addEventListener("click", () => {
      const val = parseInt(this._typedAnswer);
      if (isNaN(val)) return;
      this._checkAnswer(val);
    });

    this._hud.querySelector("#runBtn")!.addEventListener("click", () => this._runAway());
  }

  private _checkAnswer(val: number) {
    if (val === this._answer) {
      this._showSpellPicker();
    } else {
      const dmg = 20;
      this._playerHp = Math.max(0, this._playerHp - dmg);
      if (this._playerHp <= 0) { this._loseBattle(); return; }
      this._showMathScreen(`${this._battleEnemies[0].emoji} Wrong! -${dmg} HP!`, false);
    }
  }

  // ── Spell picker (bottom right overlay) ───────────────────────────────────
  private _showSpellPicker() {
    this._showingSpells = true;
    this._battleRound++;
    const allOutAvail = this._battleRound % 5 === 0;

    const spells = [
      { name:"All Out Attack", emoji:"💥", dmg:666666, color:"#ff0000", special:"allout", locked:!allOutAvail, desc: allOutAvail?"ALL enemies!":"Every 5 rounds" },
      { name:"Starbit",        emoji:"⭐", dmg:42,     color:"#ffe066", special:"",       locked:false, desc:"-42 HP" },
      { name:"Flame",          emoji:"🔥", dmg:10,     color:"#ff6b35", special:"",       locked:false, desc:"-10 HP" },
      { name:"Stump Stomp",    emoji:"🪵", dmg:786,    color:"#8b4513", special:"",       locked:false, desc:"-786 HP" },
    ];

    // Activate the spell slots area — replace bottom row
    const bottomRow = this._hud.querySelector("#spellSlots")?.parentElement;
    if (!bottomRow) return;

    bottomRow.innerHTML = `
      <button id="runBtn2" style="background:none;border:none;color:#888;font-size:12px;
        cursor:pointer;font-family:inherit;text-decoration:underline;">Run away</button>
      <div style="display:flex;gap:6px;">
        ${spells.map(s=>`
          <button class="spellBtn" data-dmg="${s.dmg}" data-special="${s.special}" style="
            width:${s.special==='allout'?'54':'40'}px;height:54px;
            background:${s.locked?'rgba(0,0,0,0.1)':`rgba(0,0,0,0.75)`};
            border:2px solid ${s.locked?'#999':s.color};border-radius:10px;
            display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
            cursor:${s.locked?'default':'pointer'};font-family:inherit;
            opacity:${s.locked?0.35:1};pointer-events:${s.locked?'none':'all'};
          ">
            <div style="font-size:${s.special==='allout'?'22':'18'}px">${s.emoji}</div>
            <div style="color:${s.locked?'#aaa':s.color};font-size:8px;font-weight:bold;text-align:center;line-height:1.1">${s.desc}</div>
          </button>
        `).join("")}
      </div>
    `;

    bottomRow.querySelector("#runBtn2")?.addEventListener("click", () => this._runAway());
    bottomRow.querySelectorAll(".spellBtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const dmg     = parseInt((btn as HTMLElement).dataset.dmg!);
        const special = (btn as HTMLElement).dataset.special!;
        this._castSpell(dmg, special);
      });
    });
  }

  private _castSpell(dmg: number, special: string) {
    if (special === "allout") {
      // Hit ALL living enemies
      for (let i = 0; i < this._battleEnemyHps.length; i++) {
        if (this._battleEnemyHps[i] > 0) this._battleEnemyHps[i] = 0;
      }
    } else {
      // Hit first living enemy
      const idx = this._battleEnemyHps.findIndex(hp => hp > 0);
      if (idx >= 0) this._battleEnemyHps[idx] = Math.max(0, this._battleEnemyHps[idx] - dmg);
    }

    const allDead = this._battleEnemyHps.every(hp => hp <= 0);
    if (allDead) { this._winBattle(); return; }

    this._showMathScreen(`✨ Hit! -${dmg} HP!`, true);
  }

  private _winBattle() {
    this._battlesWon++;
    if (this._battlesWon % 3 === 0) this._level++;
    this._playerHp=Math.min(100,this._playerHp+20);
    // Remove all battle enemies from world
    for (const be of this._battleEnemies) {
      const idx = this._enemies.indexOf(be);
      if (idx >= 0) this._enemies.splice(idx, 1);
    }
    this._battleEnemies = [];

    this._hud.innerHTML=`
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,#1a0a00,#3d1505);
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
        font-family:'Fredoka One',Arial,sans-serif">
        <div style="font-size:64px">🎉</div>
        <div style="color:#ffe066;font-size:32px;font-weight:bold">Victory!</div>
        <div style="color:rgba(255,255,255,0.6);font-size:15px;text-align:center">
          +20 HP restored • Level ${this._level}
        </div>
        <button id="continueBtn" style="background:#ffe066;color:#1a0a00;border:none;border-radius:12px;
          padding:14px 32px;font-size:20px;font-weight:bold;cursor:pointer;font-family:inherit;">
          Continue Exploring
        </button>
      </div>
    `;
    this._hud.querySelector("#continueBtn")!.addEventListener("click",()=>this._returnToWorld());
  }

  private _loseBattle() {
    this._playerHp=100;
    this._hud.innerHTML=`
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,#1a0a00,#3d0000);
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
        font-family:'Fredoka One',Arial,sans-serif">
        <div style="font-size:64px">💀</div>
        <div style="color:#ff6b6b;font-size:32px;font-weight:bold">Defeated!</div>
        <div style="color:rgba(255,255,255,0.6);font-size:15px;text-align:center">
          Keep practicing your math!
        </div>
        <button id="retryBtn" style="background:#ffe066;color:#1a0a00;border:none;border-radius:12px;
          padding:14px 32px;font-size:20px;font-weight:bold;cursor:pointer;font-family:inherit;">
          Try Again
        </button>
      </div>
    `;
    this._hud.querySelector("#retryBtn")!.addEventListener("click",()=>this._returnToWorld());
  }

  private _runAway() {
    this._returnToWorld();
  }

  private _returnToWorld() {
    this._phase="world";
    this._canvas.style.display="block";
    this._hud.style.pointerEvents="none";
    this._buildWorldHUD();
    // Return player to safe spawn area
    this._px = 2.5; this._py = 2.5;
    this._battleEnemies = [];
    cancelAnimationFrame(this._raf);
    this._lastTs=performance.now();
    this._raf=requestAnimationFrame(this._worldLoop);
  }

  private _makeQuestion():{q:string;op:string;a1:number;a2:number;answer:number} {
    const r=(min:number,max:number)=>Math.floor(Math.random()*(max-min+1))+min;
    if (this._level<=5)  { const a1=r(1,20),a2=r(1,20); return {q:"Add",      op:"+",a1,a2,answer:a1+a2}; }
    if (this._level<=12) { const a1=r(10,40),a2=r(1,a1); return {q:"Subtract", op:"-",a1,a2,answer:a1-a2}; }
    if (this._level<=25) { const a1=r(2,10),a2=r(2,10);  return {q:"Multiply", op:"×",a1,a2,answer:a1*a2}; }
    const a2=r(2,10),a1=a2*r(2,10);   return {q:"Divide",   op:"÷",a1,a2,answer:a1/a2};
  }

  private _dispose() {
    if (this._disposed) return;
    this._disposed=true;
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(fn=>fn());
    this._canvas?.remove();
    this._hud?.remove();
  }
}

function _dpadBtn():string {
  return "position:absolute;width:40px;height:40px;background:rgba(255,255,255,0.2);"+
    "border:2px solid rgba(255,255,255,0.3);border-radius:8px;color:white;font-size:16px;"+
    "cursor:pointer;display:flex;align-items:center;justify-content:center;pointer-events:all;";
}
