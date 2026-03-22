import type { Game } from "../../game/Game";

export const STUDIO_SAVE_KEY = "roblox_studio_level";
const COLS = 40;
const ROWS = 14;

export interface ShopItem { id: string; name: string; emoji: string; desc: string; price: number; effect: "instawin"|"speedboost"|"shield"; }
export interface StudioLevel { name: string; tiles: number[][]; shopItems?: ShopItem[] }

const ROBUX_STUDIO_KEY = "roblox_robux_v1";
const DEFAULT_SHOP_ITEMS: ShopItem[] = [
  { id:"instawin",   name:"Insta Win",   emoji:"🏆", desc:"Teleports you to the End!",  price:500, effect:"instawin"   },
  { id:"speedboost", name:"Speed Boost", emoji:"⚡", desc:"2× speed for 20 seconds",    price:200, effect:"speedboost" },
  { id:"shield",     name:"Shield",      emoji:"🛡", desc:"Survive one death",           price:300, effect:"shield"     },
];

// Tile IDs
const T_EMPTY = 0, T_BLOCK = 1, T_COIN = 2, T_SPIKE = 3,
      T_START = 4, T_END   = 5, T_JUMP = 6, T_CHECK = 7;
const T_WOOD=8, T_ICE=9, T_LAVA=10, T_CUSTOM=11, T_SHOP=12;
const IC_KEY = "item_creator_v1"; // matches ItemCreator save key
const IC_GRID = 16;

let _customPixels: string[] = [];
let _customBehavior: "solid"|"deadly"|"bounce"|"slip"|"pass" = "solid";
function loadCustomItem(): void {
  try {
    const d = JSON.parse(localStorage.getItem(IC_KEY)??"");
    _customPixels = Array.isArray(d.pixels)&&d.pixels.length===IC_GRID*IC_GRID ? d.pixels : [];
    _customBehavior = ["solid","deadly","bounce","slip","pass"].includes(d.behavior) ? d.behavior : "solid";
  } catch { _customPixels=[]; _customBehavior="solid"; }
}

const TOOLS = [
  { tile: T_BLOCK,  label: "🟫", name: "Block"      },
  { tile: T_WOOD,   label: "🪵", name: "Wood"        },
  { tile: T_ICE,    label: "🧊", name: "Ice"         },
  { tile: T_LAVA,   label: "🌋", name: "Lava"        },
  { tile: T_COIN,   label: "🪙", name: "Coin"        },
  { tile: T_SPIKE,  label: "💀", name: "Spike"       },
  { tile: T_JUMP,   label: "🟢", name: "Jump Pad"    },
  { tile: T_CHECK,  label: "⭐", name: "Checkpoint"  },
  { tile: T_START,  label: "🚩", name: "Start"       },
  { tile: T_END,    label: "🏁", name: "End"         },
  { tile: T_CUSTOM, label: "🎨", name: "Custom"      },
  { tile: T_SHOP,   label: "🏪", name: "Shop"        },
  { tile: T_EMPTY,  label: "🪣", name: "Erase"       },
];

// Which tiles are solid (block player)
function isSolid(t: number) {
  if (t===T_BLOCK||t===T_JUMP||t===T_ICE||t===T_WOOD) return true;
  if (t===T_CUSTOM) return _customBehavior==="solid"||_customBehavior==="bounce"||_customBehavior==="slip";
  return false;
}

export class RobloxStudio {
  private _g:      Game;
  private _canvas: HTMLCanvasElement;
  private _ctx:    CanvasRenderingContext2D;

  private _mode: "edit" | "play" = "edit";
  // tiles[row][col], world-space so player/cam use tile*ts coords
  private _tiles: number[][] = [];
  private _gameName = "My Game";
  private _selectedTool = T_BLOCK;
  private _painting = false;
  private _publishFlash = 0;

  // Layout (screen)
  private _ts     = 36;
  private _gx     = 0;
  private _gy     = 132;
  private _tbW    = 115;
  private _rightW = 0;
  private _hoverCol = -1;
  private _hoverRow = -1;

  // Camera (world-space pixel offset, horizontal only)
  private _camX     = 0;   // current camera X (world px)
  private _camXTgt  = 0;   // target (smoothed toward in play)
  private _edCamX   = 0;   // editor camera X

  // Play state — positions are WORLD-SPACE pixels
  private _player = { x:0, y:0, vx:0, vy:0, onGround:false, dead:false, grace:0 };
  private _startCol = 1;
  private _startRow = ROWS - 2;
  private _checkpoint: { col:number; row:number } | null = null;
  private _playCoins: { col:number; row:number; taken:boolean }[] = [];
  private _playWon  = false;
  private _coinCount = 0;
  private _playOnly: boolean;
  private _deathFlash = 0;

  // In-game shop
  private _shopItems: ShopItem[] = DEFAULT_SHOP_ITEMS.map(i=>({...i}));
  private _shopOpen        = false;
  private _shopConfirmItem: ShopItem | null = null;
  private _shopConfirmT    = 0;
  private _studioBuyOpen   = false;
  private _studioAdTimer   = 0;
  private _studioAdReward  = 0;
  private _studioAdDone    = false;
  private _shopSpeedTimer  = 0;
  private _shopSpeedMult   = 1;
  private _shopShield      = false;
  private _studioRobux     = 0;
  private _shopSuccessItem: ShopItem | null = null;
  private _shopSuccessT    = 0;

  // Mode select + PvP
  private _modeSelect = false;
  private _pvp        = false;
  private _bots: { x:number; y:number; vx:number; vy:number; onGround:boolean; dead:boolean; grace:number; won:boolean; color:string; respawn:number; speed:number; stuckTimer:number; lastX:number; smartMode:boolean; smartTimer:number; smartInterval:number; mistakeRate:number }[] = [];

  // Input
  private _keys       = new Set<string>();
  private _joy        = { active:false, ox:0, oy:0, dx:0, dy:0 };
  private _jumpHeld   = false;
  private _jumpBuffer = 0;

  private _raf    = 0;
  private _lastTs = 0;
  private _done   = false;
  private _cleanup: (() => void)[] = [];

  constructor(g: Game, playOnly = false, pvp = false) {
    this._g = g;
    this._playOnly = playOnly;
    this._pvp = pvp;

    g.ui.innerHTML = `
      <div style="position:relative;width:100%;height:100%;overflow:hidden;pointer-events:all;">
        <canvas id="rsCanvas" style="display:block;width:100%;height:100%;touch-action:none;"></canvas>
        ${!playOnly ? `<div id="rsPublishBtn" style="
          position:absolute;top:82px;right:4px;width:92px;height:44px;
          background:rgba(0,100,212,0.95);border-radius:6px;
          color:#fff;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;
          cursor:pointer;z-index:10;display:flex;flex-direction:column;
          align-items:center;justify-content:center;line-height:1.3;
          user-select:none;
        ">📤 Publish<span style="font-size:9px;opacity:0.75">to Roblox Games</span></div>` : ""}
      </div>`;

    this._canvas = document.getElementById("rsCanvas") as HTMLCanvasElement;
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._ctx = this._canvas.getContext("2d")!;

    g.inMiniGame        = false; // cursor stays visible so controller can navigate/click
    g.autoClickCallback = null;

    this._studioRobux = parseInt(localStorage.getItem(ROBUX_STUDIO_KEY) ?? "0") || 0;
    this._loadOrDefault();
    loadCustomItem();
    this._calcLayout();
    if (playOnly) this._startPlay();

    // HTML publish button (much more reliable than canvas hit-testing)
    const pubBtn = document.getElementById("rsPublishBtn") as HTMLDivElement | null;
    if (pubBtn) {
      pubBtn.onclick = () => this._publish();
      this._cleanup.push(() => { pubBtn.onclick = null; });
    }

    // Keyboard
    const onKD = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW") {
        this._jumpHeld = true; this._jumpBuffer = 0.2;
      }
    };
    const onKU = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
      if (e.code==="Space"||e.code==="ArrowUp"||e.code==="KeyW") this._jumpHeld = false;
    };
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup",   onKU);
    this._cleanup.push(() => { window.removeEventListener("keydown",onKD); window.removeEventListener("keyup",onKU); });

    // Mouse
    const onMD = (e: MouseEvent) => this._ptrDown(e.clientX, e.clientY);
    const onMM = (e: MouseEvent) => {
      const {x,y} = this._cxy(e.clientX, e.clientY);
      if (this._mode==="edit") { this._hoverCol=this._screenToCol(x); this._hoverRow=this._screenToRow(y); }
      if (this._painting) this._ptrMove(e.clientX, e.clientY);
    };
    const onML = () => { this._hoverCol=-1; this._hoverRow=-1; };
    const onMU = () => { this._painting = false; };
    this._canvas.addEventListener("mousedown", onMD);
    this._canvas.addEventListener("mousemove", onMM);
    this._canvas.addEventListener("mouseleave", onML);
    window.addEventListener("mouseup", onMU);
    this._cleanup.push(() => {
      this._canvas.removeEventListener("mousedown",onMD);
      this._canvas.removeEventListener("mousemove",onMM);
      this._canvas.removeEventListener("mouseleave",onML);
      window.removeEventListener("mouseup",onMU);
    });

    // Mouse wheel — scroll editor
    const onWheel = (e: WheelEvent) => {
      if (this._mode === "edit") {
        this._edCamX = Math.max(0, Math.min(this._maxEdCamX(), this._edCamX + e.deltaY * 0.8));
        e.preventDefault();
      }
    };
    this._canvas.addEventListener("wheel", onWheel, { passive:false });
    this._cleanup.push(() => this._canvas.removeEventListener("wheel", onWheel));

    // Touch
    const onTS = (e: TouchEvent) => { e.preventDefault(); this._touchStart(e); };
    const onTM = (e: TouchEvent) => { e.preventDefault(); this._touchMove(e); };
    const onTE = (e: TouchEvent) => { e.preventDefault(); this._touchEnd(); };
    this._canvas.addEventListener("touchstart", onTS, {passive:false});
    this._canvas.addEventListener("touchmove",  onTM, {passive:false});
    this._canvas.addEventListener("touchend",   onTE, {passive:false});
    this._cleanup.push(() => {
      this._canvas.removeEventListener("touchstart",onTS);
      this._canvas.removeEventListener("touchmove", onTM);
      this._canvas.removeEventListener("touchend",  onTE);
    });

    const onR = () => { this._canvas.width=window.innerWidth; this._canvas.height=window.innerHeight; this._calcLayout(); };
    window.addEventListener("resize", onR);
    this._cleanup.push(() => window.removeEventListener("resize",onR));

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Layout ────────────────────────────────────────────────────────────

  private _calcLayout(): void {
    const W = this._canvas.width, H = this._canvas.height;
    const narrow = W < 520;
    this._tbW    = narrow ? 62 : Math.min(118, Math.floor(W * 0.22));
    this._rightW = W < 600 ? 0 : Math.min(128, Math.floor(W * 0.23));
    if (this._playOnly) {
      // In play-only mode use full screen (just a small HUD at top)
      this._gx = 0;
      this._gy = 54;
    } else {
      this._gx = this._tbW;
      this._gy = 132; // 28 title + 22 menu + 26 tab + 56 ribbon
    }
    this._ts = Math.max(20, Math.min(48, Math.floor((H - this._gy) / ROWS)));
  }

  private _maxEdCamX(): number {
    const visW = this._canvas.width - this._tbW - this._rightW;
    return Math.max(0, COLS * this._ts - visW);
  }
  private _maxPlayCamX(): number {
    const visW = this._canvas.width - this._gx;
    return Math.max(0, COLS * this._ts - visW);
  }

  // ── Data ──────────────────────────────────────────────────────────────

  private _loadOrDefault(): void {
    const raw = localStorage.getItem(STUDIO_SAVE_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw) as StudioLevel;
        // Pad/trim to current COLS×ROWS
        this._tiles = Array.from({length:ROWS}, (_,r) =>
          Array.from({length:COLS}, (_,c) => d.tiles[r]?.[c] ?? 0)
        );
        this._gameName = d.name;
        if (Array.isArray(d.shopItems)) {
          this._shopItems = DEFAULT_SHOP_ITEMS.map(def => {
            const saved = d.shopItems!.find(s => s.id === def.id);
            return saved ? {...def, price: saved.price} : {...def};
          });
        }
        return;
      } catch {}
    }
    this._makeDefaultLevel();
  }

  private _makeDefaultLevel(): void {
    this._tiles = Array.from({length:ROWS}, (_,r) =>
      Array.from({length:COLS}, () => r===ROWS-1 ? T_BLOCK : 0)
    );
    // Start + end
    this._tiles[ROWS-2][1]      = T_START;
    this._tiles[ROWS-2][COLS-2] = T_END;
    // Some coins on the floor
    [4,8,12,16].forEach(c => { this._tiles[ROWS-2][c] = T_COIN; });
    // Low platform with coins
    for (let c=6;c<=12;c++) this._tiles[ROWS-4][c] = T_BLOCK;
    [8,10].forEach(c => this._tiles[ROWS-5][c] = T_COIN);
    // Jump pad before it
    this._tiles[ROWS-2][5] = T_JUMP;
    // Spike gap
    [19,20].forEach(c => this._tiles[ROWS-2][c] = T_SPIKE);
    // Second platform
    for (let c=21;c<=28;c++) this._tiles[ROWS-4][c] = T_BLOCK;
    // Gap then jump pad
    this._tiles[ROWS-2][29] = T_JUMP;
    // Checkpoint mid-way
    this._tiles[ROWS-2][22] = T_CHECK;
    // More coins leading to end
    [30,33,36].forEach(c => this._tiles[ROWS-2][c] = T_COIN);
  }

  private _save(): void {
    localStorage.setItem(STUDIO_SAVE_KEY, JSON.stringify({name:this._gameName, tiles:this._tiles, shopItems:this._shopItems}));
  }

  // ── Loop ──────────────────────────────────────────────────────────────

  private _loop(ts: number): void {
    const dt = Math.min((ts - this._lastTs)/1000, 0.05);
    this._lastTs = ts;
    if (this._mode==="play") this._updatePlay(dt);
    if (this._publishFlash > 0) this._publishFlash -= dt;
    if (this._shopConfirmItem && this._shopConfirmT < 1) this._shopConfirmT = Math.min(1, this._shopConfirmT + dt * 1.8);
    if (this._shopSuccessItem && this._shopSuccessT < 1) this._shopSuccessT = Math.min(1, this._shopSuccessT + dt * 1.8);
    this._draw();
    if (!this._done) this._raf = requestAnimationFrame(t => this._loop(t));
  }

  // ── Input ─────────────────────────────────────────────────────────────

  private _cxy(cx: number, cy: number) {
    const r = this._canvas.getBoundingClientRect();
    return { x:(cx-r.left)*(this._canvas.width/r.width), y:(cy-r.top)*(this._canvas.height/r.height) };
  }

  // Screen → world tile col (editor)
  private _screenToCol(sx: number): number {
    return Math.floor((sx - this._gx + this._edCamX) / this._ts);
  }
  private _screenToRow(sy: number): number {
    return Math.floor((sy - this._gy) / this._ts);
  }

  private _ptrDown(cx: number, cy: number): void {
    const {x,y} = this._cxy(cx,cy);
    const W=this._canvas.width, H=this._canvas.height;

    // Mode select overlay intercepts all clicks
    if (this._modeSelect) {
      const cw=Math.min(340,W-40), ch=280, bw2=cw-40, bh2=64;
      const cx2=(W-cw)/2, cy2=(H-ch)/2, bx2=cx2+20;
      const soloY=cy2+75, pvpY=cy2+158;
      if (x>=bx2&&x<=bx2+bw2&&y>=soloY&&y<=soloY+bh2) {
        this._modeSelect=false; this._pvp=false; this._startPlay();
      } else if (x>=bx2&&x<=bx2+bw2&&y>=pvpY&&y<=pvpY+bh2) {
        this._modeSelect=false; this._pvp=true; this._startPlay();
      } else if (y>=cy2+ch-44) { this._modeSelect=false; }
      return;
    }

    if (this._mode==="play") {
      if (x<120 && y<54) { this._handleBack(); return; }
      // Tap anywhere on result screen to exit
      const botWon = this._pvp && this._bots.some(b=>b.won) && !this._playWon;
      if (this._playWon || botWon) { this._handleBack(); return; }
      // Shop overlay intercepts all play clicks
      if (this._shopOpen) { this._handleShopClick(x, y, W, H); return; }
      if (x < W/2) this._joy = {active:true, ox:x, oy:y, dx:0, dy:0};
      else          { this._jumpHeld=true; this._jumpBuffer=0.2; }
      return;
    }

    // ── Edit mode ──
    // Title bar
    if (y < 28) {
      if (x > W-44)           { this._handleBack(); return; } // × close
      if (x>=108 && x<=174)   { this._handleBack(); return; } // ← Back
      return;
    }
    // Menu bar — no action
    if (y < 50) return;
    // Ribbon tabs — no action
    if (y < 76) return;
    // Ribbon content
    if (y < 132) {
      const pbtnX1=W-196, pbtnX2=W-100;
      if (x>=pbtnX1 && x<=pbtnX2-4)             { this._modeSelect=true; return; } // Play
      if (x>=pbtnX2 && x<=W-4)                  { this._publish(); return; }       // Publish
      // Ribbon tool buttons (wide screens)
      if (W >= 520) {
        const i = Math.floor((x - 8) / 48);
        if (i>=0 && i<TOOLS.length) { this._selectedTool=TOOLS[i].tile; return; }
      }
      return;
    }
    // Left toolbox panel
    if (x < this._tbW) {
      const toolStartY = this._gy + 52;
      const toolH = Math.min(40, (H - toolStartY) / TOOLS.length);
      const i = Math.floor((y - toolStartY) / toolH);
      if (i>=0 && i<TOOLS.length) this._selectedTool = TOOLS[i].tile;
      return;
    }
    // Right panel — no action
    if (x >= W - this._rightW && this._rightW > 0) return;
    // Viewport — paint
    this._painting = true;
    this._paint(x, y);
  }

  private _ptrMove(cx: number, cy: number): void {
    const {x,y} = this._cxy(cx,cy);
    if (this._mode==="edit"&&this._painting) this._paint(x,y);
  }

  private _touchStart(e: TouchEvent): void {
    Array.from(e.changedTouches).forEach(t => this._ptrDown(t.clientX, t.clientY));
  }
  private _touchMove(e: TouchEvent): void {
    const W = this._canvas.width;
    Array.from(e.touches).forEach(t => {
      const {x,y} = this._cxy(t.clientX, t.clientY);
      if (this._mode==="edit"&&this._painting) { this._paint(x,y); }
      else if (this._mode==="play"&&this._joy.active&&x<W/2) {
        const dx=x-this._joy.ox, cap=50;
        this._joy.dx=Math.max(-1,Math.min(1,dx/cap));
      }
    });
  }
  private _touchEnd(): void {
    this._painting=false;
    this._joy={active:false,ox:0,oy:0,dx:0,dy:0};
    this._jumpHeld=false;
  }

  private _handleBack(): void {
    if (this._mode==="play") {
      if (this._playOnly) { this._end(); return; }
      this._mode="edit"; this._camX=0;
      this._setPublishBtnVisible(true);
      return;
    }
    this._end();
  }

  private _paint(sx: number, sy: number): void {
    const col = this._screenToCol(sx);
    const row = this._screenToRow(sy);
    if (col<0||col>=COLS||row<0||row>=ROWS) return;
    // Clicking an existing shop tile with the shop tool = configure prices
    if (this._selectedTool === T_SHOP && this._tiles[row][col] === T_SHOP) {
      this._configureShop(); return;
    }
    if (this._selectedTool===T_START||this._selectedTool===T_END) {
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++)
        if (this._tiles[r][c]===this._selectedTool) this._tiles[r][c]=T_EMPTY;
    }
    this._tiles[row][col] = this._selectedTool;
  }

  private _configureShop(): void {
    const list = this._shopItems.map((it,i)=>`${i+1}. ${it.emoji} ${it.name} — ${it.price} R`).join("\n");
    const choice = prompt(`Shop items:\n${list}\n\nEnter number to edit price:`, "1");
    if (!choice) return;
    const idx = parseInt(choice) - 1;
    if (idx < 0 || idx >= this._shopItems.length) return;
    const it = this._shopItems[idx];
    const val = prompt(`Set Robux price for "${it.name}" (current: ${it.price} R):`, String(it.price));
    if (!val) return;
    const n = parseInt(val);
    if (!isNaN(n) && n >= 0) { this._shopItems[idx].price = n; this._save(); }
  }

  private _publish(): void {
    this._save();
    this._publishFlash = 2.5;
    // Flash the HTML button green briefly
    const btn = document.getElementById("rsPublishBtn") as HTMLDivElement | null;
    if (btn) { btn.style.background = "rgba(0,160,0,0.95)"; setTimeout(() => { btn.style.background = "rgba(0,100,212,0.95)"; }, 2000); }
  }

  // ── Play mode ─────────────────────────────────────────────────────────

  private _setPublishBtnVisible(v: boolean): void {
    const btn = document.getElementById("rsPublishBtn") as HTMLDivElement | null;
    if (btn) btn.style.display = v ? "block" : "none";
  }

  private _startPlay(): void {
    this._setPublishBtnVisible(false);
    loadCustomItem();
    let sc=1, sr=ROWS-2;
    outer: for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++)
      if (this._tiles[r][c]===T_START) { sc=c; sr=r; break outer; }
    this._startCol=sc; this._startRow=sr;
    this._checkpoint = null;
    this._spawnPlayer(sc, sr);
    this._playCoins = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++)
      if (this._tiles[r][c]===T_COIN) this._playCoins.push({col:c,row:r,taken:false});
    this._playWon=false; this._coinCount=0;
    this._camX=0; this._camXTgt=0;
    // Spawn bots behind start if PvP
    this._bots = [];
    if (this._pvp) {
      const ts=this._ts, pw=ts*0.72, ph=ts*0.88;
      const colors=["#ff4444","#ff8800"];
      const speeds=[7.8, 8.2];
      // Each bot has different mistake rate and smart flip interval
      const mistakeRates=[0.38, 0.28];
      const smartIntervals=[2.5, 3.5];
      // Find floor at start column for both bots
      let floorRow=ROWS;
      for (let r=sr;r<ROWS;r++) if (isSolid(this._tiles[r][sc])) { floorRow=r; break; }
      const by=floorRow<ROWS?floorRow*ts-ph:sr*ts-ph;
      for (let i=0;i<2;i++) {
        // Stagger bots left of player start by 2 and 4 tile-widths
        const bx=Math.max(0, sc*ts+(ts-pw)/2 - (i+2)*ts*2);
        this._bots.push({x:bx,y:by,vx:0,vy:0,onGround:false,dead:false,grace:1.0,won:false,color:colors[i],respawn:0,speed:speeds[i],stuckTimer:0,lastX:bx,smartMode:Math.random()>0.5,smartTimer:0,smartInterval:smartIntervals[i],mistakeRate:mistakeRates[i]});
      }
    }
    this._mode="play";
  }

  private _spawnPlayer(col: number, row: number): void {
    const ts=this._ts, pw=ts*0.72, ph=ts*0.88;
    // Scan downward for a solid floor
    let floorRow=ROWS;
    for (let r=row; r<ROWS; r++) if (isSolid(this._tiles[r][col])) { floorRow=r; break; }
    const wy = floorRow<ROWS ? floorRow*ts-ph : row*ts-ph;
    this._player = { x:col*ts+(ts-pw)/2, y:wy, vx:0, vy:0, onGround:false, dead:false, grace:1.0 };
    this._jumpBuffer=0;
  }

  private _updateBot(b: typeof this._bots[0], dt: number): void {
    if (b.won) return;
    if (b.dead) {
      b.respawn -= dt;
      if (b.respawn <= 0) {
        const ts=this._ts, pw=ts*0.72, ph=ts*0.88;
        const sc=this._startCol, sr=this._startRow;
        let floorRow=ROWS;
        for (let r=sr;r<ROWS;r++) if (isSolid(this._tiles[r][sc])) { floorRow=r; break; }
        b.x=sc*ts+(ts-pw)/2; b.y=floorRow<ROWS?floorRow*ts-ph:sr*ts-ph;
        b.vx=0; b.vy=0; b.dead=false; b.grace=1.0; b.stuckTimer=0; b.lastX=b.x;
        b.smartMode=Math.random()>0.5; b.smartTimer=0;
      }
      return;
    }
    const ts=this._ts, GRAVITY=22*ts, SPEED=b.speed*ts, JUMP=-11*ts;
    const pw=ts*0.72, ph=ts*0.88;
    if (b.grace>0) b.grace-=dt;

    // Stuck detection — sample every 0.35s, check total progress
    b.stuckTimer += dt;
    if (b.stuckTimer >= 0.35) {
      if (b.x - b.lastX < ts * 0.8 && b.onGround) { b.vy=JUMP; b.onGround=false; }
      b.stuckTimer=0; b.lastX=b.x;
    }

    // Flip smart/dumb mode on a timer
    b.smartTimer += dt;
    if (b.smartTimer >= b.smartInterval) {
      b.smartTimer = 0;
      b.smartMode = !b.smartMode;
      // Dumb mode lasts shorter so bots spend more time smart overall (≈60/40)
      b.smartInterval = b.smartMode
        ? 2.0 + Math.random() * 2.0   // smart for 2-4s
        : 1.0 + Math.random() * 1.5;  // dumb for 1-2.5s
    }

    // Dumb mode: slower, shorter look-ahead
    const effectiveSpeed = b.smartMode ? SPEED : SPEED * 0.78;
    const lookDist       = b.smartMode ? 5 : 2;

    b.vx = effectiveSpeed;
    b.vy = Math.min(b.vy + GRAVITY*dt, ts*9);

    // Grid positions based on feet
    const feetR   = Math.min(ROWS-1, Math.floor((b.y + ph) / ts));
    const bodyR   = Math.min(ROWS-1, Math.floor((b.y + ph*0.35) / ts));
    const centerC = Math.floor((b.x + pw/2) / ts);

    let shouldJump = false;
    for (let look=1; look<=lookDist; look++) {
      const ahead = Math.min(COLS-1, centerC + look);
      if (bodyR>=0 && isSolid(this._tiles[bodyR][ahead])) { shouldJump=true; break; }
      const floorAhead = Math.min(ROWS-1, feetR);
      if (floorAhead>=0 && !isSolid(this._tiles[floorAhead][ahead])) {
        if (look <= (b.smartMode ? 3 : 1)) { shouldJump=true; break; }
      }
      const spikeR = Math.min(ROWS-1, feetR-1);
      if (spikeR>=0 && this._tiles[spikeR][ahead]===T_SPIKE) { shouldJump=true; break; }
      if (feetR>=0  && this._tiles[feetR][ahead]===T_SPIKE)  { shouldJump=true; break; }
    }
    // In dumb mode, randomly ignore hazards (mistakes)
    if (!b.smartMode && Math.random() < b.mistakeRate) shouldJump = false;
    if (b.onGround && shouldJump) { b.vy=JUMP; b.onGround=false; }

    // Move X (sub-stepped)
    const dx=b.vx*dt;
    const xSteps=Math.max(1,Math.ceil(Math.abs(dx)/(ts*0.45)));
    for (let i=0;i<xSteps;i++) {
      b.x+=dx/xSteps;
      const c0=Math.floor(b.x/ts),c1=Math.floor((b.x+pw-1)/ts);
      const r0=Math.floor(b.y/ts+0.15),r1=Math.floor((b.y+ph-1)/ts-0.15);
      let hit=false;
      for (let r=Math.max(0,r0);r<=Math.min(ROWS-1,r1)&&!hit;r++)
        for (let c=Math.max(0,c0);c<=Math.min(COLS-1,c1)&&!hit;c++)
          if (isSolid(this._tiles[r][c])) {
            b.x=c*ts-pw; hit=true;
            if (b.onGround) { b.vy=JUMP; b.onGround=false; }
          }
      if (hit) break;
    }

    // Move Y (sub-stepped)
    b.onGround=false;
    const dy=b.vy*dt, yDir=dy>=0?1:-1;
    const ySteps=Math.max(1,Math.ceil(Math.abs(dy)/(ts*0.45)));
    let jp=false;
    for (let i=0;i<ySteps;i++) {
      b.y+=dy/ySteps;
      const c0=Math.floor(b.x/ts+0.1),c1=Math.floor((b.x+pw-1)/ts-0.1);
      const r0=Math.floor(b.y/ts),r1=Math.floor((b.y+ph-1)/ts);
      let hit=false;
      for (let r=Math.max(0,r0);r<=Math.min(ROWS-1,r1)&&!hit;r++)
        for (let c=Math.max(0,c0);c<=Math.min(COLS-1,c1)&&!hit;c++)
          if (isSolid(this._tiles[r][c])) {
            if (yDir>0){b.y=r*ts-ph;b.vy=0;b.onGround=true;if(this._tiles[r][c]===T_JUMP)jp=true;}
            else{b.y=(r+1)*ts;b.vy=0;} hit=true;
          }
      if (hit) break;
    }
    if (jp) { b.vy=JUMP*1.6; b.onGround=false; }

    b.x=Math.max(0,Math.min(COLS*ts-pw,b.x));
    if (b.y>ROWS*ts) { b.dead=true; b.respawn=1.0; return; }

    if (b.grace<=0) {
      const c0=Math.floor(b.x/ts),c1=Math.floor((b.x+pw-1)/ts);
      const r0=Math.floor(b.y/ts),r1=Math.floor((b.y+ph-1)/ts);
      for (let r=Math.max(0,r0);r<=Math.min(ROWS-1,r1);r++)
        for (let c=Math.max(0,c0);c<=Math.min(COLS-1,c1);c++)
          if (this._tiles[r][c]===T_SPIKE) { b.dead=true; b.respawn=1.0; return; }
    }

    if (b.grace<=0&&!b.dead) {
      const c0=Math.floor(b.x/ts),c1=Math.floor((b.x+pw-1)/ts);
      const r0=Math.floor(b.y/ts),r1=Math.floor((b.y+ph-1)/ts);
      for (let r=Math.max(0,r0);r<=Math.min(ROWS-1,r1)&&!b.dead;r++)
        for (let c=Math.max(0,c0);c<=Math.min(COLS-1,c1)&&!b.dead;c++)
          if (this._tiles[r][c]===T_LAVA) { b.dead=true; b.respawn=1.0; }
    }

    const bpx=b.x+pw/2, bpy=b.y+ph/2;
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++)
      if (this._tiles[r][c]===T_END&&Math.abs(bpx-(c*ts+ts/2))<ts*1.1&&Math.abs(bpy-(r*ts+ts/2))<ts*1.2)
        b.won=true;
  }

  private _updatePlay(dt: number): void {
    const ts=this._ts;
    // Speed boost timer
    if (this._shopSpeedTimer > 0) {
      this._shopSpeedTimer -= dt;
      if (this._shopSpeedTimer <= 0) this._shopSpeedMult = 1;
    }
    // Buy-Robux ad timer
    if (this._studioAdTimer > 0) {
      this._studioAdTimer -= dt;
      if (this._studioAdTimer <= 0) {
        this._studioAdDone  = true;
        this._studioRobux  += this._studioAdReward;
        localStorage.setItem(ROBUX_STUDIO_KEY, String(this._studioRobux));
      }
    }
    const GRAVITY=22*ts, JUMP=-10*ts, SUPER_JUMP=-16*ts, SPEED=7*ts*this._shopSpeedMult;
    const p=this._player;

    if (p.grace>0) p.grace-=dt;
    if (this._jumpBuffer>0) this._jumpBuffer-=dt;

    if (p.dead) {
      // Brief pause then respawn
      this._deathFlash += dt;
      if (this._deathFlash > 1.0) {
        this._deathFlash = 0;
        const spawn = this._checkpoint ?? {col:this._startCol, row:this._startRow};
        this._spawnPlayer(spawn.col, spawn.row);
      }
      return;
    }
    if (this._playWon) return;

    const pw=ts*0.72, ph=ts*0.88;

    // Horizontal input
    let mx=0;
    if (this._keys.has("ArrowLeft")||this._keys.has("KeyA")) mx-=1;
    if (this._keys.has("ArrowRight")||this._keys.has("KeyD")) mx+=1;
    if (this._joy.active) mx+=this._joy.dx;
    const targetVx = Math.max(-1,Math.min(1,mx))*SPEED;
    // Check if standing on ice or custom-slip
    let onIce = false;
    if (p.onGround) {
      const fR = Math.min(ROWS-1, Math.floor((p.y+ph)/ts));
      const fC = Math.min(COLS-1, Math.floor((p.x+pw/2)/ts));
      const ft = this._tiles[fR]?.[fC];
      if (ft===T_ICE || (ft===T_CUSTOM&&_customBehavior==="slip")) onIce=true;
    }
    p.vx = onIce ? p.vx + (targetVx-p.vx)*0.1 : targetVx;

    // Gravity + terminal velocity
    p.vy = Math.min(p.vy+GRAVITY*dt, ts*9);

    // ── Move X (sub-stepped) ──
    const dx=p.vx*dt, xDir=dx>0?1:dx<0?-1:0;
    if (xDir!==0) {
      const steps=Math.max(1,Math.ceil(Math.abs(dx)/(ts*0.45)));
      for (let i=0;i<steps;i++) {
        p.x+=dx/steps;
        const c0=Math.floor(p.x/ts), c1=Math.floor((p.x+pw-1)/ts);
        const r0=Math.floor(p.y/ts+0.15), r1=Math.floor((p.y+ph-1)/ts-0.15);
        let hit=false;
        for (let r=Math.max(0,r0);r<=Math.min(ROWS-1,r1)&&!hit;r++)
          for (let c=Math.max(0,c0);c<=Math.min(COLS-1,c1)&&!hit;c++)
            if (isSolid(this._tiles[r][c])) {
              p.x=xDir>0?c*ts-pw:(c+1)*ts; hit=true;
            }
        if (hit) break;
      }
    }

    // ── Move Y (sub-stepped) ──
    p.onGround=false;
    const dy=p.vy*dt, yDir=dy>=0?1:-1;
    const steps=Math.max(1,Math.ceil(Math.abs(dy)/(ts*0.45)));
    let jumpPad=false;
    for (let i=0;i<steps;i++) {
      p.y+=dy/steps;
      const c0=Math.floor(p.x/ts+0.1), c1=Math.floor((p.x+pw-1)/ts-0.1);
      const r0=Math.floor(p.y/ts), r1=Math.floor((p.y+ph-1)/ts);
      let hit=false;
      for (let r=Math.max(0,r0);r<=Math.min(ROWS-1,r1)&&!hit;r++)
        for (let c=Math.max(0,c0);c<=Math.min(COLS-1,c1)&&!hit;c++)
          if (isSolid(this._tiles[r][c])) {
            if (yDir>0) {
              p.y=r*ts-ph; p.vy=0; p.onGround=true;
              if(this._tiles[r][c]===T_JUMP||(this._tiles[r][c]===T_CUSTOM&&_customBehavior==="bounce")) jumpPad=true;
            } else { p.y=(r+1)*ts; p.vy=0; }
            hit=true;
          }
      if (hit) break;
    }

    // Jump pad launches player
    if (jumpPad) { p.vy=SUPER_JUMP; p.onGround=false; this._jumpBuffer=0; }

    // Normal jump from ground
    if (p.onGround && !jumpPad && this._jumpBuffer>0) {
      p.vy=JUMP; p.onGround=false; this._jumpBuffer=0;
    }

    // World bounds
    p.x=Math.max(0,Math.min(COLS*ts-pw,p.x));

    // Fell off bottom
    if (p.y>ROWS*ts) {
      if (this._shopShield) { this._shopShield=false; const sp=this._checkpoint??{col:this._startCol,row:this._startRow}; this._spawnPlayer(sp.col,sp.row); }
      else { p.dead=true; this._deathFlash=0; }
      return;
    }

    // Spikes
    if (p.grace<=0) {
      const c0=Math.floor(p.x/ts), c1=Math.floor((p.x+pw-1)/ts);
      const r0=Math.floor(p.y/ts), r1=Math.floor((p.y+ph-1)/ts);
      for (let r=Math.max(0,r0);r<=Math.min(ROWS-1,r1);r++)
        for (let c=Math.max(0,c0);c<=Math.min(COLS-1,c1);c++)
          if (this._tiles[r][c]===T_SPIKE) {
            if (this._shopShield) { this._shopShield=false; p.grace=1.0; }
            else { p.dead=true; this._deathFlash=0; return; }
          }
    }

    // Lava and deadly custom
    {
      const c0=Math.floor(p.x/ts),c1=Math.floor((p.x+pw-1)/ts);
      const r0=Math.floor(p.y/ts),r1=Math.floor((p.y+ph-1)/ts);
      if (p.grace<=0) {
        outer2: for (let r=Math.max(0,r0);r<=Math.min(ROWS-1,r1);r++)
          for (let c=Math.max(0,c0);c<=Math.min(COLS-1,c1);c++) {
            const t=this._tiles[r][c];
            if (t===T_LAVA||(t===T_CUSTOM&&_customBehavior==="deadly")) {
              if (this._shopShield) { this._shopShield=false; p.grace=1.0; break outer2; }
              else { p.dead=true; this._deathFlash=0; break outer2; }
            }
          }
      }
    }
    if (p.dead) return;

    // Coins, checkpoints, end — center-based detection (generous radius)
    const px=p.x+pw/2, py=p.y+ph/2;

    // Shop tile contact — open shop if player walks into one
    if (!this._shopOpen) {
      for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
        if (this._tiles[r][c]===T_SHOP) {
          if (Math.abs(px-(c*ts+ts/2))<ts*1.3&&Math.abs(py-(r*ts+ts/2))<ts*1.4) {
            this._shopOpen=true;
          }
        }
      }
    }
    for (const coin of this._playCoins) {
      if (coin.taken) continue;
      const cx2=coin.col*ts+ts/2, cy2=coin.row*ts+ts/2;
      if (Math.abs(px-cx2)<ts*0.75&&Math.abs(py-cy2)<ts*0.75) {
        coin.taken=true; this._coinCount++;
      }
    }
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      if (this._tiles[r][c]===T_CHECK) {
        if (Math.abs(px-(c*ts+ts/2))<ts&&Math.abs(py-(r*ts+ts/2))<ts*1.2) {
          if (!this._checkpoint||this._checkpoint.col!==c||this._checkpoint.row!==r) {
            this._checkpoint={col:c,row:r};
          }
        }
      }
      if (this._tiles[r][c]===T_END) {
        if (Math.abs(px-(c*ts+ts/2))<ts*1.1&&Math.abs(py-(r*ts+ts/2))<ts*1.2) {
          this._playWon=true;
          if (this._coinCount>0) { this._g.state.coins+=this._coinCount; this._g.save(); }
          return;
        }
      }
    }

    // Update bots (PvP)
    for (const b of this._bots) this._updateBot(b, dt);

    // Smooth camera follow
    const visW=this._canvas.width-this._gx;
    this._camXTgt=Math.max(0,Math.min(this._maxPlayCamX(), p.x+pw/2-visW/2));
    this._camX+=(this._camXTgt-this._camX)*Math.min(1,8*dt);
  }

  // ── Draw ──────────────────────────────────────────────────────────────

  private _draw(): void {
    const W=this._canvas.width, H=this._canvas.height;
    if (this._mode==="edit") this._drawEdit(W,H);
    else                      this._drawPlay(W,H);
    if (this._publishFlash>0) this._drawPublishFlash(W,H);
    if (this._modeSelect)     this._drawModeSelect(W,H);
  }

  // world col → screen x
  private _wx(col: number, cam=this._camX): number { return this._gx + col*this._ts - cam; }
  private _wy(row: number): number { return this._gy + row*this._ts; }

  private _drawTiles(cam: number): void {
    const ctx=this._ctx, ts=this._ts, W=this._canvas.width;
    for (let r=0;r<ROWS;r++) {
      for (let c=0;c<COLS;c++) {
        const tile=this._tiles[r][c];
        if (tile===T_EMPTY) continue;
        const sx=this._wx(c,cam), sy=this._wy(r);
        if (sx+ts<this._gx||sx>W) continue; // off-screen cull
        if (tile===T_BLOCK) {
          ctx.fillStyle="#7a5c2e"; ctx.fillRect(sx,sy,ts,ts);
          ctx.fillStyle="#9a7a4e"; ctx.fillRect(sx,sy,ts,ts*0.28);
          ctx.strokeStyle="#5a3c1e"; ctx.lineWidth=1; ctx.strokeRect(sx,sy,ts,ts);
        } else if (tile===T_JUMP) {
          ctx.fillStyle="#1e8c1e"; ctx.fillRect(sx,sy+ts*0.5,ts,ts*0.5);
          ctx.fillStyle="#2ecc2e"; ctx.fillRect(sx,sy+ts*0.5,ts,ts*0.15);
          // Spring coils
          ctx.strokeStyle="#00ff00"; ctx.lineWidth=2;
          for (let i=0;i<3;i++) {
            const fy=sy+ts*0.55+i*ts*0.12;
            ctx.beginPath(); ctx.moveTo(sx+ts*0.25,fy); ctx.lineTo(sx+ts*0.75,fy+ts*0.06); ctx.stroke();
          }
          if (ts>=22){ctx.font=`${ts*0.45}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🟢",sx+ts/2,sy+ts*0.25);}
        } else if (tile===T_WOOD) {
          ctx.fillStyle="#8b5e3c"; ctx.fillRect(sx,sy,ts,ts);
          ctx.fillStyle="#a0723f"; ctx.fillRect(sx,sy,ts,ts*0.22);
          ctx.strokeStyle="#7b4e2c"; ctx.lineWidth=0.8;
          [0.38,0.68].forEach(f=>{ctx.beginPath();ctx.moveTo(sx,sy+ts*f);ctx.lineTo(sx+ts,sy+ts*f);ctx.stroke();});
          ctx.strokeStyle="#6b3e1c"; ctx.lineWidth=1; ctx.strokeRect(sx,sy,ts,ts);
        } else if (tile===T_ICE) {
          ctx.fillStyle="#aaddff"; ctx.fillRect(sx,sy,ts,ts);
          ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.fillRect(sx,sy,ts,ts*0.18);
          ctx.fillStyle="rgba(255,255,255,0.7)";
          ctx.fillRect(sx+ts*0.2,sy+ts*0.35,ts*0.07,ts*0.07);
          ctx.fillRect(sx+ts*0.62,sy+ts*0.6,ts*0.07,ts*0.07);
          ctx.strokeStyle="#88ccee"; ctx.lineWidth=1; ctx.strokeRect(sx,sy,ts,ts);
        } else if (tile===T_LAVA) {
          const lp=(Math.sin(performance.now()/600+sx*0.04)+1)/2;
          ctx.fillStyle=`rgb(${Math.floor(200+55*lp)},${Math.floor(30+70*lp)},0)`;
          ctx.fillRect(sx,sy,ts,ts);
          ctx.fillStyle="rgba(255,200,0,0.28)"; ctx.fillRect(sx,sy,ts,ts*0.18);
          ctx.strokeStyle="#ff4400"; ctx.lineWidth=1; ctx.strokeRect(sx,sy,ts,ts);
        } else if (tile===T_CUSTOM) {
          if (_customPixels.length===IC_GRID*IC_GRID) {
            const ps=ts/IC_GRID;
            for (let pr=0;pr<IC_GRID;pr++) for (let pc2=0;pc2<IC_GRID;pc2++) {
              const px2=_customPixels[pr*IC_GRID+pc2];
              if(px2){ctx.fillStyle=px2;ctx.fillRect(sx+pc2*ps,sy+pr*ps,Math.ceil(ps)+1,Math.ceil(ps)+1);}
            }
          } else {
            ctx.fillStyle="#884488"; ctx.fillRect(sx,sy,ts,ts);
            if(ts>=18){ctx.font=`${ts*0.7}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🎨",sx+ts/2,sy+ts/2);}
          }
          ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1; ctx.strokeRect(sx,sy,ts,ts);
        } else if (tile===T_SHOP) {
          ctx.fillStyle="#4a0a8a"; ctx.fillRect(sx,sy,ts,ts);
          ctx.fillStyle="#7a2aee"; ctx.fillRect(sx,sy,ts,ts*0.28);
          if (ts>=18){ctx.font=`${ts*0.65}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🏪",sx+ts/2,sy+ts*0.62);}
          ctx.strokeStyle="#cc66ff"; ctx.lineWidth=1.5; ctx.strokeRect(sx,sy,ts,ts);
        } else {
          const emoji={[T_COIN]:"🪙",[T_SPIKE]:"💀",[T_START]:"🚩",[T_END]:"🏁",[T_CHECK]:"⭐"}[tile];
          const bg={[T_COIN]:"#FFD70033",[T_SPIKE]:"#ff333333",[T_START]:"#00ff8833",[T_END]:"#ff88ff33",[T_CHECK]:"#ffff0033"}[tile];
          if (bg){ctx.fillStyle=bg;ctx.fillRect(sx,sy,ts,ts);}
          if (emoji&&ts>=18){ctx.font=`${ts*0.7}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(emoji,sx+ts/2,sy+ts/2);}
        }
      }
    }
  }

  private _drawEdit(W: number, H: number): void {
    const ctx=this._ctx, ts=this._ts;
    const vpX=this._gx, vpY=this._gy, vpW=W-vpX-this._rightW, vpH=H-vpY;
    const narrow=W<520;
    // Colors (Roblox Studio dark theme)
    const BG="#1e1e1e", TITLE="#181818", MENU="#2d2d2d", TAB="#252525", TAB_ACT="#3c3c3c",
          RIB="#3c3c3c", PANEL="#252526", PAN_HD="#2d2d2d", VP="#3c3c3c",
          BORDER="#141414", TEXT="#cccccc", DIM="#777", BLUE="#0078d4", SEL="#094771";

    // ── Full background ──
    ctx.fillStyle=BG; ctx.fillRect(0,0,W,H);

    // ── Viewport ──
    ctx.fillStyle=VP; ctx.fillRect(vpX,vpY,vpW,vpH);
    // Subtle checker
    for (let vy=vpY;vy<vpY+vpH;vy+=48)
      for (let vx=vpX;vx<vpX+vpW;vx+=48) {
        ctx.fillStyle=((Math.floor((vx-vpX)/48)+Math.floor((vy-vpY)/48))%2===0)?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.015)";
        ctx.fillRect(vx,vy,Math.min(48,vpX+vpW-vx),Math.min(48,vpY+vpH-vy));
      }
    // Grid
    ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.lineWidth=1;
    const sc=Math.floor(this._edCamX/ts), ec=Math.min(COLS,sc+Math.ceil(vpW/ts)+1);
    for (let c=sc;c<=ec;c++){const x=this._wx(c,this._edCamX);if(x<vpX||x>vpX+vpW)continue;ctx.beginPath();ctx.moveTo(x,vpY);ctx.lineTo(x,Math.min(vpY+ROWS*ts,vpY+vpH));ctx.stroke();}
    for (let r=0;r<=ROWS;r++){const y=this._wy(r);if(y<vpY||y>vpY+vpH)continue;ctx.beginPath();ctx.moveTo(vpX,y);ctx.lineTo(Math.min(vpX+vpW,W-this._rightW),y);ctx.stroke();}
    this._drawTiles(this._edCamX);
    // Hover ghost tile
    if (this._hoverCol>=0&&this._hoverCol<COLS&&this._hoverRow>=0&&this._hoverRow<ROWS) {
      const hx=this._wx(this._hoverCol,this._edCamX), hy=this._wy(this._hoverRow);
      if (hx>=vpX&&hx<vpX+vpW) {
        ctx.fillStyle="rgba(0,120,212,0.25)"; ctx.fillRect(hx,hy,ts,ts);
        ctx.strokeStyle=BLUE; ctx.lineWidth=1.5; ctx.strokeRect(hx,hy,ts,ts);
        const ghost=TOOLS.find(t=>t.tile===this._selectedTool)?.label??"";
        if (ghost&&ts>=18){ctx.globalAlpha=0.55;ctx.font=`${ts*0.6}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(ghost,hx+ts/2,hy+ts/2);ctx.globalAlpha=1;}
      }
    }
    // Scrollbar
    const sbY=vpY+ROWS*ts+3;
    if (sbY+5<vpY+vpH) {
      ctx.fillStyle="rgba(255,255,255,0.08)";ctx.beginPath();ctx.roundRect(vpX+2,sbY,vpW-4,4,2);ctx.fill();
      const mc=this._maxEdCamX();
      if (mc>0){const pct=this._edCamX/mc,tw=Math.max(20,(vpW-4)*vpW/(COLS*ts));ctx.fillStyle="rgba(255,255,255,0.32)";ctx.beginPath();ctx.roundRect(vpX+2+pct*(vpW-4-tw),sbY,tw,4,2);ctx.fill();}
    }
    // Panel borders
    ctx.fillStyle=BORDER;
    ctx.fillRect(vpX-1,vpY,1,vpH);
    if (this._rightW>0) ctx.fillRect(W-this._rightW,vpY,1,vpH);

    // ── Title bar (0-28) ──
    ctx.fillStyle=TITLE; ctx.fillRect(0,0,W,28);
    // Roblox logo
    ctx.fillStyle="#e31c1c"; ctx.beginPath();ctx.arc(16,14,8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 9px Arial,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("R",16,14);
    ctx.fillStyle=TEXT;ctx.font="12px Arial,sans-serif";ctx.textAlign="left";
    ctx.fillText("Roblox Studio  —  "+this._gameName,30,14);
    // ← Back button
    ctx.fillStyle="rgba(255,255,255,0.08)";ctx.beginPath();ctx.roundRect(108,6,64,16,3);ctx.fill();
    ctx.fillStyle=DIM;ctx.font="10px Arial,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("← Arcade",140,14);
    // Window controls
    const wbtns:[string,string,number][]=[["_","rgba(255,255,255,0.06)",W-132],["□","rgba(255,255,255,0.06)",W-88],["×","rgba(196,43,28,0.85)",W-44]];
    for (const [lbl,bg,bx] of wbtns){ctx.fillStyle=bg;ctx.fillRect(bx,0,44,28);ctx.fillStyle="#ccc";ctx.font="14px Arial,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(lbl,bx+22,14);}

    // ── Menu bar (28-50) ──
    ctx.fillStyle=MENU;ctx.fillRect(0,28,W,22);
    ctx.fillStyle=BORDER;ctx.fillRect(0,49,W,1);
    const menus=["File","Edit","View","Insert","Tools","Test","Window","Help"];
    ctx.font="11px Arial,sans-serif";ctx.textBaseline="middle";let mx=8;
    for (const m of menus){ctx.fillStyle=TEXT;ctx.textAlign="left";ctx.fillText(m,mx,39);mx+=ctx.measureText(m).width+16;}

    // ── Ribbon tabs (50-76) ──
    ctx.fillStyle=TAB;ctx.fillRect(0,50,W,26);
    ctx.fillStyle=BORDER;ctx.fillRect(0,75,W,1);
    const tabs=["Home","Model","Avatar","Test","View","Plugins"];
    let tx=0;ctx.font="11px Arial,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    for (let i=0;i<tabs.length;i++){
      const tw=Math.max(54,ctx.measureText(tabs[i]).width+22);
      if(i===0){ctx.fillStyle=TAB_ACT;ctx.fillRect(tx,50,tw,26);ctx.fillStyle=BLUE;ctx.fillRect(tx,73,tw,2);ctx.fillStyle="#fff";}
      else ctx.fillStyle=DIM;
      ctx.fillText(tabs[i],tx+tw/2,63);tx+=tw;
    }

    // ── Ribbon content (76-132) ──
    ctx.fillStyle=RIB;ctx.fillRect(0,76,W,56);
    ctx.fillStyle=BORDER;ctx.fillRect(0,131,W,1);
    // Tool group label
    if (!narrow) {
      ctx.fillStyle=DIM;ctx.font="9px Arial,sans-serif";ctx.textAlign="center";ctx.textBaseline="bottom";
      ctx.fillText("BUILD",8+TOOLS.length*48/2,131);
      // Divider after tools
      ctx.fillStyle="rgba(255,255,255,0.1)";ctx.fillRect(8+TOOLS.length*48+6,84,1,38);
      // Tool buttons
      for (let i=0;i<TOOLS.length;i++){
        const t=TOOLS[i],bx=8+i*48,by=80,bw=44,bh=46,sel=t.tile===this._selectedTool;
        if(sel){ctx.fillStyle=SEL;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,5);ctx.fill();ctx.strokeStyle=BLUE;ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,5);ctx.stroke();}
        ctx.font=`${Math.min(bh*0.42,20)}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(t.label,bx+bw/2,by+bh*0.4);
        ctx.fillStyle=sel?"#fff":DIM;ctx.font="8px Arial,sans-serif";ctx.textBaseline="bottom";
        ctx.fillText(t.name,bx+bw/2,by+bh-1);
      }
    }
    // Play + Publish buttons
    const pbW=88,pbH=44,pbY=82,pbX1=W-196,pbX2=W-100;
    ctx.fillStyle="rgba(0,155,0,0.9)";ctx.beginPath();ctx.roundRect(pbX1,pbY,pbW,pbH,6);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 11px Arial Black,Arial,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("▶  Test Play",pbX1+pbW/2,pbY+pbH*0.38);
    ctx.fillStyle="rgba(255,255,255,0.65)";ctx.font="9px Arial,sans-serif";ctx.fillText("Solo / PvP",pbX1+pbW/2,pbY+pbH*0.72);
    ctx.fillStyle="rgba(0,100,212,0.9)";ctx.beginPath();ctx.roundRect(pbX2,pbY,pbW,pbH,6);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 11px Arial Black,Arial,sans-serif";
    ctx.fillText("📤 Publish",pbX2+pbW/2,pbY+pbH*0.38);
    ctx.fillStyle="rgba(255,255,255,0.65)";ctx.font="9px Arial,sans-serif";
    ctx.fillText("to Roblox Games",pbX2+pbW/2,pbY+pbH*0.72);

    // ── Left panel — Toolbox ──
    ctx.fillStyle=PANEL;ctx.fillRect(0,vpY,vpX,vpH);
    ctx.fillStyle=PAN_HD;ctx.fillRect(0,vpY,vpX,26);
    ctx.fillStyle=BORDER;ctx.fillRect(0,vpY+26,vpX,1);
    ctx.fillStyle=TEXT;ctx.font="bold 11px Arial,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";
    ctx.fillText("Toolbox",6,vpY+13);
    // Search bar
    ctx.fillStyle="#3c3c3c";ctx.beginPath();ctx.roundRect(4,vpY+29,vpX-8,20,3);ctx.fill();
    ctx.strokeStyle="#555";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(4,vpY+29,vpX-8,20,3);ctx.stroke();
    ctx.fillStyle=DIM;ctx.font="10px Arial,sans-serif";ctx.textAlign=narrow?"center":"left";ctx.textBaseline="middle";
    ctx.fillText("🔍"+(narrow?"":" Search..."),narrow?vpX/2:8,vpY+39);
    // Tool list
    const toolStartY=vpY+52, toolH=Math.min(40,(vpH-52)/TOOLS.length);
    for (let i=0;i<TOOLS.length;i++){
      const t=TOOLS[i],ty=toolStartY+i*toolH,sel=t.tile===this._selectedTool;
      if(sel){ctx.fillStyle=SEL;ctx.fillRect(0,ty,vpX,toolH);ctx.fillStyle=BLUE;ctx.fillRect(0,ty+2,2,toolH-4);}
      else if(i%2===0){ctx.fillStyle="rgba(255,255,255,0.02)";ctx.fillRect(0,ty,vpX,toolH);}
      const es=Math.min(toolH*0.5,20);
      ctx.font=`${es}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(t.label,narrow?vpX/2:vpX*0.28,ty+toolH/2);
      if(!narrow){ctx.fillStyle=sel?"#fff":TEXT;ctx.font="10px Arial,sans-serif";ctx.textAlign="left";ctx.fillText(t.name,vpX*0.5,ty+toolH/2);}
      // Row separator
      ctx.strokeStyle="rgba(255,255,255,0.04)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,ty+toolH);ctx.lineTo(vpX,ty+toolH);ctx.stroke();
    }

    // ── Right panel — Explorer + Properties ──
    if (this._rightW>0){
      const rpX=W-this._rightW;
      ctx.fillStyle=PANEL;ctx.fillRect(rpX,vpY,this._rightW,vpH);
      // Explorer
      ctx.fillStyle=PAN_HD;ctx.fillRect(rpX,vpY,this._rightW,26);
      ctx.fillStyle=BORDER;ctx.fillRect(rpX,vpY+26,this._rightW,1);
      ctx.fillStyle=TEXT;ctx.font="bold 11px Arial,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";
      ctx.fillText("Explorer",rpX+6,vpY+13);
      const counts=new Map<number,number>();
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const t=this._tiles[r][c];if(t!==T_EMPTY)counts.set(t,(counts.get(t)??0)+1);}
      const exItems:[string,number][]=[
        ["▾ Workspace",0],
        ["🚩  SpawnLocation",1],["🏁  EndGoal",1],
        ...(counts.get(T_BLOCK) ?[["🟫  Part ("+counts.get(T_BLOCK)+")",1] as [string,number]]:[]),
        ...(counts.get(T_COIN)  ?[["🪙  Coin ("+counts.get(T_COIN)+")",1] as [string,number]]:[]),
        ...(counts.get(T_SPIKE) ?[["💀  KillBrick ("+counts.get(T_SPIKE)+")",1] as [string,number]]:[]),
        ...(counts.get(T_JUMP)  ?[["🟢  JumpPad ("+counts.get(T_JUMP)+")",1] as [string,number]]:[]),
        ...(counts.get(T_CHECK) ?[["⭐  Checkpoint ("+counts.get(T_CHECK)+")",1] as [string,number]]:[]),
        ...(counts.get(T_WOOD)  ?[["🪵  Wood ("+counts.get(T_WOOD)+")",1] as [string,number]]:[]),
        ...(counts.get(T_ICE)   ?[["🧊  Ice ("+counts.get(T_ICE)+")",1] as [string,number]]:[]),
        ...(counts.get(T_LAVA)  ?[["🌋  Lava ("+counts.get(T_LAVA)+")",1] as [string,number]]:[]),
        ...(counts.get(T_CUSTOM)?[["🎨  Custom ("+counts.get(T_CUSTOM)+")",1] as [string,number]]:[]),
      ];
      ctx.font="10px Arial,sans-serif";let ey=vpY+30;
      for(const[lbl,indent]of exItems){
        const isWs=indent===0;
        if(isWs){ctx.fillStyle="rgba(255,255,255,0.05)";ctx.fillRect(rpX,ey,this._rightW,20);ctx.fillStyle=TEXT;ctx.font="bold 10px Arial,sans-serif";}
        else{ctx.fillStyle=DIM;ctx.font="10px Arial,sans-serif";}
        ctx.textAlign="left";ctx.textBaseline="middle";
        ctx.fillText("  ".repeat(indent*2)+lbl,rpX+4,ey+10);
        ey+=20;if(ey>vpY+vpH*0.55)break;
      }
      // Properties
      const propY=Math.max(ey+6,vpY+Math.floor(vpH*0.55));
      ctx.fillStyle=BORDER;ctx.fillRect(rpX,propY-1,this._rightW,1);
      ctx.fillStyle=PAN_HD;ctx.fillRect(rpX,propY,this._rightW,26);
      ctx.fillStyle=BORDER;ctx.fillRect(rpX,propY+26,this._rightW,1);
      ctx.fillStyle=TEXT;ctx.font="bold 11px Arial,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";
      ctx.fillText("Properties",rpX+6,propY+13);
      const sel=TOOLS.find(t=>t.tile===this._selectedTool);
      const props:[string,string][]=[["Name",sel?.name??""],["ClassName",sel?.name?.replace(" ","")??""],["Anchored","true"],["CanCollide","true"]];
      ctx.font="10px Arial,sans-serif";let py=propY+28;
      for(const[k,v]of props){
        if(py+18>vpY+vpH)break;
        ctx.fillStyle="rgba(255,255,255,0.03)";ctx.fillRect(rpX,py,this._rightW,18);
        ctx.fillStyle=DIM;ctx.textAlign="left";ctx.fillText(k,rpX+6,py+9);
        ctx.fillStyle=TEXT;ctx.fillText(v,rpX+this._rightW*0.52,py+9);
        py+=18;
      }
    }
  }

  private _drawPlay(W: number, H: number): void {
    const ctx=this._ctx, ts=this._ts;
    const p=this._player, pw=ts*0.72, ph=ts*0.88;
    const cam=this._camX;

    // Sky
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,"#1a3a6a"); sky.addColorStop(1,"#2a6a3a");
    ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);

    this._drawTiles(cam);

    // Coins (untaken)
    for (const coin of this._playCoins) {
      if (coin.taken) continue;
      ctx.font=`${ts*0.7}px serif`;ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText("🪙",this._wx(coin.col,cam)+ts/2,this._wy(coin.row)+ts/2);
    }

    // Bots (PvP)
    for (const b of this._bots) {
      if (b.dead) continue;
      const ts2=this._ts, pw2=ts2*0.72, ph2=ts2*0.88;
      const bsx=this._wx(0,cam)+b.x, bsy=this._gy+b.y;
      ctx.fillStyle=b.color; ctx.fillRect(bsx,bsy,pw2,ph2*0.62);
      ctx.fillStyle="#f5d5a0"; ctx.fillRect(bsx+pw2*0.05,bsy-ph2*0.35,pw2*0.9,ph2*0.38);
      ctx.fillStyle="#222";
      ctx.fillRect(bsx+pw2*0.18,bsy-ph2*0.28,pw2*0.2,ph2*0.14);
      ctx.fillRect(bsx+pw2*0.58,bsy-ph2*0.28,pw2*0.2,ph2*0.14);
      if (b.won) {
        ctx.fillStyle="#fff"; ctx.font="bold 11px Arial,sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="bottom";
        ctx.fillText("🏆",bsx+pw2/2,bsy);
      }
    }

    // Checkpoint glow if active
    if (this._checkpoint) {
      const cx=this._wx(this._checkpoint.col,cam)+ts/2, cy=this._wy(this._checkpoint.row)+ts/2;
      const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,ts);
      glow.addColorStop(0,"rgba(255,255,0,0.4)");glow.addColorStop(1,"rgba(255,255,0,0)");
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,ts,0,Math.PI*2);ctx.fill();
    }

    // Player (death flash)
    const psx=this._wx(0,cam)+p.x, psy=this._gy+p.y;
    if (!p.dead||(Math.floor(this._deathFlash*8)%2===0)) {
      ctx.fillStyle="#4499ff"; ctx.fillRect(psx,psy,pw,ph*0.62);
      ctx.fillStyle="#f5d5a0"; ctx.fillRect(psx+pw*0.05,psy-ph*0.35,pw*0.9,ph*0.38);
      ctx.fillStyle="#222";
      ctx.fillRect(psx+pw*0.18,psy-ph*0.28,pw*0.2,ph*0.14);
      ctx.fillRect(psx+pw*0.58,psy-ph*0.28,pw*0.2,ph*0.14);
    }

    // Death message
    if (p.dead) {
      ctx.fillStyle="rgba(180,0,0,0.55)"; ctx.fillRect(0,0,W,H);
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#fff";ctx.font=`bold ${Math.min(W,H)*0.07}px Arial Black,Arial,sans-serif`;
      ctx.fillText("💀 You Died!", W/2, H*0.4);
      ctx.fillStyle="rgba(255,255,255,0.6)";ctx.font=`${Math.min(W,H)*0.032}px Arial,sans-serif`;
      ctx.fillText(this._checkpoint?"Respawning at checkpoint...":"Respawning at start...",W/2,H*0.53);
    }

    // Win/lose overlay
    const botWon = this._pvp && this._bots.some(b=>b.won) && !this._playWon;
    if (this._playWon || botWon) {
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(0,0,W,H);
      ctx.textAlign="center";ctx.textBaseline="middle";
      if (botWon) {
        ctx.fillStyle="#ff4444";ctx.font=`bold ${Math.min(W,H)*0.08}px Arial Black,Arial,sans-serif`;
        ctx.fillText("😈 Bot Wins!",W/2,H*0.38);
        ctx.fillStyle="#fff";ctx.font=`${Math.min(W,H)*0.034}px Arial,sans-serif`;
        ctx.fillText("A bot reached the end first!",W/2,H*0.52);
      } else {
        ctx.fillStyle="#FFD700";ctx.font=`bold ${Math.min(W,H)*0.08}px Arial Black,Arial,sans-serif`;
        ctx.fillText(this._pvp?"🏆 You Win!":"🏁 Level Complete!",W/2,H*0.38);
        ctx.fillStyle="#fff";ctx.font=`${Math.min(W,H)*0.038}px Arial,sans-serif`;
        ctx.fillText(`Coins: ${this._coinCount} / ${this._playCoins.length}`,W/2,H*0.52);
        if (this._coinCount>0){
          ctx.fillStyle="#FFD700";ctx.font=`bold ${Math.min(W,H)*0.036}px Arial Black,Arial,sans-serif`;
          ctx.fillText(`+${this._coinCount} 🪙 banked!`,W/2,H*0.61);
        }
      }
      ctx.fillStyle="rgba(255,255,255,0.5)";ctx.font=`${Math.min(W,H)*0.028}px Arial,sans-serif`;
      ctx.fillText(this._playOnly?"← Back":"← Back to editor",W/2,H*0.72);
    }

    // HUD
    ctx.fillStyle="rgba(0,0,0,0.8)"; ctx.fillRect(0,0,W,54);
    ctx.fillStyle="rgba(255,255,255,0.12)";ctx.beginPath();ctx.roundRect(10,10,110,34,7);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="bold 13px Arial,sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";
    ctx.fillText(this._playOnly?"← Back":"← Editor",22,27);
    ctx.fillStyle="#FFD700";ctx.font="bold 14px Arial,sans-serif";ctx.textAlign="center";
    ctx.fillText(`🪙 ${this._coinCount}`,W/2,27);
    // Active buff badges
    let badgeX = W - 10;
    if (this._shopShield) {
      ctx.fillStyle="rgba(80,80,255,0.8)";ctx.textAlign="right";ctx.fillText("🛡 Shield",badgeX,27);
      badgeX -= 80;
    }
    if (this._shopSpeedTimer > 0) {
      ctx.fillStyle="rgba(255,200,0,0.9)";ctx.textAlign="right";ctx.fillText(`⚡ ${Math.ceil(this._shopSpeedTimer)}s`,badgeX,27);
      badgeX -= 60;
    }
    if (this._checkpoint && badgeX > W/2+60) {
      ctx.fillStyle="rgba(255,255,0,0.8)";ctx.font="bold 12px Arial,sans-serif";ctx.textAlign="right";
      ctx.fillText("⭐ Checkpoint",badgeX,27);
    }

    // Shop overlay
    if (this._shopOpen) this._drawShop(W, H);

    // Joystick
    const jx=78,jy=H-90,jr=42;
    ctx.fillStyle="rgba(255,255,255,0.08)";ctx.beginPath();ctx.arc(jx,jy,jr,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.22)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(jx,jy,jr,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,0.38)";ctx.beginPath();ctx.arc(jx+(this._joy.dx||0)*jr*0.65,jy,19,0,Math.PI*2);ctx.fill();
    const bx=W-78,by=H-90;
    ctx.fillStyle=this._jumpHeld?"rgba(255,200,0,0.55)":"rgba(255,200,0,0.22)";
    ctx.beginPath();ctx.arc(bx,by,38,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="rgba(255,200,0,0.5)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(bx,by,38,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="#fff";ctx.font="bold 13px Arial,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("JUMP",bx,by);
  }

  private _drawShop(W: number, H: number): void {
    const ctx = this._ctx;
    const panelW = Math.min(380, W - 32), panelH = Math.min(420, H - 60);
    const px = (W - panelW) / 2, py = (H - panelH) / 2;
    const testMode = !this._playOnly;

    ctx.fillStyle = "rgba(0,0,0,0.82)"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0f0f1a";
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 16); ctx.fill();
    ctx.strokeStyle = "#cc66ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 16); ctx.stroke();

    // ── Success screen ────────────────────────────────────────────────────
    if (this._shopSuccessItem) {
      const item = this._shopSuccessItem;
      const cH = 200;
      const t = this._shopSuccessT;
      let tc = t;
      let easedS: number;
      if (tc < 1/2.75)        easedS = 7.5625*tc*tc;
      else if (tc < 2/2.75)   { tc -= 1.5/2.75;  easedS = 7.5625*tc*tc+0.75; }
      else if (tc < 2.5/2.75) { tc -= 2.25/2.75; easedS = 7.5625*tc*tc+0.9375; }
      else                    { tc -= 2.625/2.75; easedS = 7.5625*tc*tc+0.984375; }
      const targetY = py + (panelH - cH) / 2;
      const cY = (py - cH - 30) + (targetY - (py - cH - 30)) * Math.min(easedS, 1);

      ctx.fillStyle = "#0a1f0a";
      ctx.beginPath(); ctx.roundRect(px + 20, cY, panelW - 40, cH, 14); ctx.fill();
      ctx.strokeStyle = "#00cc55"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(px + 20, cY, panelW - 40, cH, 14); ctx.stroke();

      ctx.font = "42px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(item.emoji, px + panelW / 2, cY + 46);
      ctx.fillStyle = "#00ff88"; ctx.font = "bold 17px Arial Black,Arial,sans-serif";
      ctx.fillText("You're good to go!", px + panelW / 2, cY + 96);
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "13px Arial,sans-serif";
      ctx.fillText("Have fun with it!", px + panelW / 2, cY + 120);
      ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "11px Arial,sans-serif";
      ctx.fillText("Tap anywhere to close", px + panelW / 2, cY + 168);
      return;
    }

    // ── Buy Robux screen ──────────────────────────────────────────────────
    if (this._studioBuyOpen) {
      // Back button
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath(); ctx.roundRect(px + 8, py + 8, 68, 28, 7); ctx.fill();
      ctx.fillStyle = "#aaa"; ctx.font = "bold 11px Arial,sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("← Back", px + 16, py + 22);

      ctx.fillStyle = "#cc66ff"; ctx.font = "bold 18px Arial Black,Arial,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("💎 Get Robux", px + panelW / 2, py + 28);
      ctx.fillStyle = "#00ff88"; ctx.font = "bold 14px Arial,sans-serif";
      ctx.fillText(`Balance: ${this._studioRobux.toLocaleString()} R`, px + panelW / 2, py + 52);

      // Ad watching overlay
      if (this._studioAdTimer > 0) {
        const prog = 1 - this._studioAdTimer / 6;
        ctx.fillStyle = "rgba(0,0,0,0.88)"; ctx.fillRect(px, py, panelW, panelH);
        ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial Black,Arial,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("📺 Watching Ad...", px + panelW / 2, py + panelH * 0.38);
        ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(px + 20, py + panelH * 0.52, panelW - 40, 14);
        ctx.fillStyle = "#00ff88"; ctx.fillRect(px + 20, py + panelH * 0.52, (panelW - 40) * prog, 14);
        ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "13px Arial,sans-serif";
        ctx.fillText(`${Math.ceil(this._studioAdTimer)}s remaining...`, px + panelW / 2, py + panelH * 0.62);
        return;
      }
      if (this._studioAdDone) {
        ctx.fillStyle = "rgba(0,0,0,0.88)"; ctx.fillRect(px, py, panelW, panelH);
        ctx.fillStyle = "#00ff88"; ctx.font = "bold 18px Arial Black,Arial,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(`✅ +${this._studioAdReward.toLocaleString()} Robux added!`, px + panelW / 2, py + panelH * 0.45);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "13px Arial,sans-serif";
        ctx.fillText("Tap anywhere to continue", px + panelW / 2, py + panelH * 0.58);
        return;
      }

      // Packs
      const packs = [{r:1_000,s:5},{r:5_000,s:8},{r:10_000,s:12}];
      const bRowH = 66, bStart = py + 70;
      packs.forEach((pack, i) => {
        const ry = bStart + i * bRowH;
        ctx.fillStyle = "rgba(0,50,100,0.7)";
        ctx.beginPath(); ctx.roundRect(px + 10, ry, panelW - 20, bRowH - 8, 10); ctx.fill();
        ctx.strokeStyle = "rgba(0,150,255,0.4)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(px + 10, ry, panelW - 20, bRowH - 8, 10); ctx.stroke();
        ctx.fillStyle = "#4499ff"; ctx.beginPath(); ctx.arc(px + 36, ry + (bRowH-8)/2, 14, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px Arial Black,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("R", px + 36, ry + (bRowH-8)/2);
        ctx.fillStyle = "#fff"; ctx.font = "bold 18px Arial Black,Arial,sans-serif";
        ctx.textAlign = "left"; ctx.fillText(`${pack.r.toLocaleString()} Robux`, px + 58, ry + (bRowH-8)/2 - 4);
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "11px Arial,sans-serif";
        ctx.fillText(`Watch a ${pack.s}s ad`, px + 58, ry + (bRowH-8)/2 + 14);
        const bW = 110, bH = 36, bX = px + panelW - bW - 14, bY = ry + (bRowH-8-bH)/2;
        ctx.fillStyle = "#e8e8e8"; ctx.beginPath(); ctx.roundRect(bX, bY, bW, bH, 7); ctx.fill();
        ctx.fillStyle = "#222"; ctx.font = "bold 11px Arial,sans-serif"; ctx.textAlign = "center";
        ctx.fillText("📺 Watch Ad", bX + bW / 2, bY + bH / 2);
      });
      // Set Robux row
      const setY = bStart + packs.length * bRowH + 4;
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.beginPath(); ctx.roundRect(px + 10, setY, panelW - 20, 46, 10); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "13px Arial,sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("✏️ Set Robux to custom amount", px + 22, setY + 23);
      return;
    }

    // ── Confirmation dialog ───────────────────────────────────────────────
    if (this._shopConfirmItem) {
      const item = this._shopConfirmItem;
      const canAfford = testMode || this._studioRobux >= item.price;
      const cH = 220;
      // Ease-out-back: falls from above and slightly overshoots
      const t = this._shopConfirmT;
      // Ease-out-bounce: falls fast, bounces at the bottom
      const n1 = 7.5625, d1 = 2.75;
      let tc = t, eased: number;
      if (tc < 1/d1)            eased = n1*tc*tc;
      else if (tc < 2/d1)       { tc -= 1.5/d1;  eased = n1*tc*tc+0.75; }
      else if (tc < 2.5/d1)     { tc -= 2.25/d1; eased = n1*tc*tc+0.9375; }
      else                      { tc -= 2.625/d1; eased = n1*tc*tc+0.984375; }
      const targetY = py + (panelH - cH) / 2;
      const cY = (py - cH - 30) + (targetY - (py - cH - 30)) * Math.min(eased, 1);

      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath(); ctx.roundRect(px + 20, cY, panelW - 40, cH, 14); ctx.fill();
      ctx.strokeStyle = "#4499ff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(px + 20, cY, panelW - 40, cH, 14); ctx.stroke();

      ctx.font = "36px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(item.emoji, px + panelW / 2, cY + 44);
      ctx.fillStyle = "#fff"; ctx.font = "bold 16px Arial Black,Arial,sans-serif";
      ctx.fillText(`Are you sure you want to buy`, px + panelW / 2, cY + 86);
      ctx.fillStyle = "#cc66ff"; ctx.font = "bold 18px Arial Black,Arial,sans-serif";
      ctx.fillText(item.name + "?", px + panelW / 2, cY + 110);
      if (!testMode) {
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "12px Arial,sans-serif";
        ctx.fillText(`Cost: 💎 ${item.price.toLocaleString()} R`, px + panelW / 2, cY + 132);
      }

      // Main action button (blue)
      const mainBtnW = panelW - 80, mainBtnH = 44, mainBtnX = px + 40, mainBtnY = cY + cH - 96;
      ctx.fillStyle = "#1d6ae8";
      ctx.beginPath(); ctx.roundRect(mainBtnX, mainBtnY, mainBtnW, mainBtnH, 10); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 15px Arial Black,Arial,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(canAfford ? "BUY IT" : "💎 Buy Robux", mainBtnX + mainBtnW / 2, mainBtnY + mainBtnH / 2);

      // Cancel button
      const canBtnW = panelW - 80, canBtnX = px + 40, canBtnY = cY + cH - 44;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.roundRect(canBtnX, canBtnY, canBtnW, 32, 8); ctx.fill();
      ctx.fillStyle = "#aaa"; ctx.font = "bold 12px Arial,sans-serif";
      ctx.fillText("Cancel", canBtnX + canBtnW / 2, canBtnY + 16);
      return;
    }

    // ── Main shop list ────────────────────────────────────────────────────
    ctx.fillStyle = "#cc66ff"; ctx.font = "bold 20px Arial Black,Arial,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🏪 Robux Shop", px + panelW / 2, py + 28);
    if (testMode) {
      ctx.fillStyle = "#ffcc00"; ctx.font = "bold 13px Arial,sans-serif";
      ctx.fillText("🧪 Test Mode — everything is FREE", px + panelW / 2, py + 52);
    } else {
      // Clicking balance opens "Set Robux" prompt
      ctx.fillStyle = "#00ff88"; ctx.font = "bold 15px Arial,sans-serif";
      ctx.fillText(`💎 ${this._studioRobux.toLocaleString()} Robux  ✏️`, px + panelW / 2, py + 52);
    }

    // Close button
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath(); ctx.roundRect(px + 8, py + 8, 60, 28, 7); ctx.fill();
    ctx.fillStyle = "#aaa"; ctx.font = "bold 11px Arial,sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("✕ Close", px + 16, py + 22);

    const rowH = 76, rowStart = py + 72;
    this._shopItems.forEach((item, i) => {
      const ry = rowStart + i * rowH;
      const canAfford = testMode || this._studioRobux >= item.price;
      ctx.fillStyle = canAfford ? "rgba(0,60,0,0.7)" : "rgba(50,50,50,0.7)";
      ctx.beginPath(); ctx.roundRect(px + 10, ry, panelW - 20, rowH - 8, 10); ctx.fill();
      ctx.strokeStyle = canAfford ? "rgba(0,200,80,0.5)" : "rgba(100,100,100,0.3)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(px + 10, ry, panelW - 20, rowH - 8, 10); ctx.stroke();

      ctx.font = "28px serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(item.emoji, px + 22, ry + (rowH - 8) / 2);
      ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial Black,Arial,sans-serif";
      ctx.fillText(item.name, px + 62, ry + 22);
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "11px Arial,sans-serif";
      ctx.fillText(item.desc, px + 62, ry + 40);

      const btnW = 112, btnH = 38, btnX = px + panelW - btnW - 18, btnY = ry + (rowH - 8 - btnH) / 2;
      ctx.fillStyle = canAfford ? "rgba(0,180,60,0.9)" : "rgba(70,70,70,0.8)";
      ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 12px Arial Black,Arial,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(testMode ? "FREE" : `💎 ${item.price.toLocaleString()} R`, btnX + btnW / 2, btnY + 13);
      ctx.fillStyle = canAfford ? "#ffe066" : "rgba(255,255,255,0.3)";
      ctx.font = "10px Arial,sans-serif";
      ctx.fillText(canAfford ? "TAP TO BUY" : "Need more R", btnX + btnW / 2, btnY + 28);
    });
  }

  private _handleShopClick(x: number, y: number, W: number, H: number): void {
    const panelW = Math.min(380, W - 32), panelH = Math.min(420, H - 60);
    const px = (W - panelW) / 2, py = (H - panelH) / 2;
    const testMode = !this._playOnly;

    // ── Success screen — tap anywhere to close ────────────────────────────
    if (this._shopSuccessItem) {
      this._shopSuccessItem = null;
      this._shopOpen = false;
      return;
    }

    // ── Buy Robux screen ──────────────────────────────────────────────────
    if (this._studioBuyOpen) {
      if (this._studioAdDone) { this._studioAdDone = false; return; }
      if (this._studioAdTimer > 0) return;
      // Back button
      if (x >= px + 8 && x <= px + 76 && y >= py + 8 && y <= py + 36) {
        this._studioBuyOpen = false; return;
      }
      // Pack buttons
      const packs = [{r:1_000,s:5},{r:5_000,s:8},{r:10_000,s:12}];
      const bRowH = 66, bStart = py + 70;
      packs.forEach((pack, i) => {
        const ry = bStart + i * bRowH;
        const bW = 110, bH = 36, bX = px + panelW - bW - 14, bY = ry + (bRowH-8-bH)/2;
        if (x >= bX && x <= bX + bW && y >= bY && y <= bY + bH) {
          this._studioAdReward = pack.r;
          this._studioAdTimer  = pack.s;
          this._studioAdDone   = false;
        }
      });
      // Set Robux row
      const setY = bStart + packs.length * bRowH + 4;
      if (y >= setY && y <= setY + 46) {
        const inp = prompt(`Set your Robux balance (0 – ${this._studioRobux.toLocaleString()}):`, String(this._studioRobux));
        if (inp !== null) {
          const n = Math.max(0, Math.min(this._studioRobux, Math.floor(Number(inp)) || 0));
          this._studioRobux = n;
          localStorage.setItem(ROBUX_STUDIO_KEY, String(n));
        }
      }
      return;
    }

    // ── Confirmation dialog ───────────────────────────────────────────────
    if (this._shopConfirmItem) {
      const item = this._shopConfirmItem;
      const canAfford = testMode || this._studioRobux >= item.price;
      const cH = 220;
      const t = this._shopConfirmT;
      // Ease-out-bounce: falls fast, bounces at the bottom
      const n1 = 7.5625, d1 = 2.75;
      let tc = t, eased: number;
      if (tc < 1/d1)            eased = n1*tc*tc;
      else if (tc < 2/d1)       { tc -= 1.5/d1;  eased = n1*tc*tc+0.75; }
      else if (tc < 2.5/d1)     { tc -= 2.25/d1; eased = n1*tc*tc+0.9375; }
      else                      { tc -= 2.625/d1; eased = n1*tc*tc+0.984375; }
      const targetY = py + (panelH - cH) / 2;
      const cY = (py - cH - 30) + (targetY - (py - cH - 30)) * Math.min(eased, 1);
      const mainBtnW = panelW - 80, mainBtnH = 44, mainBtnX = px + 40, mainBtnY = cY + cH - 96;
      const canBtnW = panelW - 80, canBtnX = px + 40, canBtnY = cY + cH - 44;

      // Main button
      if (x >= mainBtnX && x <= mainBtnX + mainBtnW && y >= mainBtnY && y <= mainBtnY + mainBtnH) {
        if (canAfford) {
          this._shopConfirmItem = null;
          this._buyShopItem(item);
        } else {
          // Not enough — open buy robux screen
          this._shopConfirmItem = null;
          this._studioBuyOpen = true;
        }
        return;
      }
      // Cancel
      if (x >= canBtnX && x <= canBtnX + canBtnW && y >= canBtnY && y <= canBtnY + 32) {
        this._shopConfirmItem = null; return;
      }
      return;
    }

    // ── Main shop list ────────────────────────────────────────────────────
    // Close button
    if (x >= px + 8 && x <= px + 68 && y >= py + 8 && y <= py + 36) {
      this._shopOpen = false; return;
    }
    // Click outside panel
    if (x < px || x > px + panelW || y < py || y > py + panelH) {
      this._shopOpen = false; return;
    }
    // Click Robux balance = set custom amount (not test mode)
    if (!testMode && y >= py + 40 && y <= py + 64) {
      const inp = prompt("Set your Robux balance to:", String(this._studioRobux));
      if (inp !== null) {
        const n = Math.max(0, parseInt(inp) || 0);
        this._studioRobux = n;
        localStorage.setItem(ROBUX_STUDIO_KEY, String(n));
      }
      return;
    }

    const rowH = 76, rowStart = py + 72;
    this._shopItems.forEach((item, i) => {
      const ry = rowStart + i * rowH;
      const btnW = 112, btnH = 38, btnX = px + panelW - btnW - 18, btnY = ry + (rowH - 8 - btnH) / 2;
      if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
        this._shopConfirmItem = item;
        this._shopConfirmT = 0;
      }
    });
  }

  private _buyShopItem(item: ShopItem): void {
    const testMode = !this._playOnly;
    if (!testMode) {
      if (this._studioRobux < item.price) return;
      this._studioRobux -= item.price;
      localStorage.setItem(ROBUX_STUDIO_KEY, String(this._studioRobux));
    }
    this._shopSuccessItem = item;
    this._shopSuccessT    = 0;

    if (item.effect === "instawin") {
      // Find End tile and teleport player there
      const ts = this._ts, pw = ts * 0.72, ph = ts * 0.88;
      outer: for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (this._tiles[r][c] === T_END) {
          this._player.x = c * ts + (ts - pw) / 2;
          this._player.y = r * ts - ph;
          this._player.vx = 0; this._player.vy = 0;
          this._playWon = true;
          if (this._coinCount > 0) { this._g.state.coins += this._coinCount; this._g.save(); }
          break outer;
        }
      }
    } else if (item.effect === "speedboost") {
      this._shopSpeedMult  = 2;
      this._shopSpeedTimer = 20;
    } else if (item.effect === "shield") {
      this._shopShield = true;
    }
  }

  private _drawModeSelect(W: number, H: number): void {
    const ctx=this._ctx;
    ctx.fillStyle="rgba(0,0,0,0.78)"; ctx.fillRect(0,0,W,H);
    const cw=Math.min(340,W-40), ch=280, bw2=cw-40, bh2=64;
    const cx2=(W-cw)/2, cy2=(H-ch)/2, bx2=cx2+20;
    // Card
    ctx.fillStyle="#1a1a2e"; ctx.beginPath(); ctx.roundRect(cx2,cy2,cw,ch,16); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(cx2,cy2,cw,ch,16); ctx.stroke();
    // Title
    ctx.fillStyle="#fff"; ctx.font="bold 20px Arial Black,Arial,sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("Choose Game Mode",W/2,cy2+36);
    // Solo
    const soloY=cy2+75;
    ctx.fillStyle="rgba(0,160,0,0.85)"; ctx.beginPath(); ctx.roundRect(bx2,soloY,bw2,bh2,10); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="bold 17px Arial Black,Arial,sans-serif";
    ctx.fillText("🧍 Solo",W/2,soloY+22);
    ctx.fillStyle="rgba(255,255,255,0.65)"; ctx.font="12px Arial,sans-serif";
    ctx.fillText("Just you — explore and collect coins",W/2,soloY+44);
    // PvP
    const pvpY=cy2+158;
    ctx.fillStyle="rgba(180,20,20,0.85)"; ctx.beginPath(); ctx.roundRect(bx2,pvpY,bw2,bh2,10); ctx.fill();
    ctx.fillStyle="#fff"; ctx.font="bold 17px Arial Black,Arial,sans-serif";
    ctx.fillText("⚔️ PvP — Race!",W/2,pvpY+22);
    ctx.fillStyle="rgba(255,255,255,0.65)"; ctx.font="12px Arial,sans-serif";
    ctx.fillText("Race 2 bots to the finish line!",W/2,pvpY+44);
    // Cancel
    ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.font="13px Arial,sans-serif";
    ctx.fillText("✕ Cancel",W/2,cy2+ch-18);
  }

  private _drawPublishFlash(W: number, H: number): void {
    const ctx=this._ctx, a=Math.min(1,this._publishFlash*1.2);
    ctx.fillStyle=`rgba(0,180,0,${a*0.7})`;ctx.fillRect(0,0,W,H);
    ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.font=`bold ${Math.min(W,H)*0.055}px Arial Black,Arial,sans-serif`;
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("✅ Published to Roblox Games!",W/2,H/2);
    ctx.fillStyle=`rgba(255,255,255,${a*0.6})`;ctx.font=`${Math.min(W,H)*0.028}px Arial,sans-serif`;
    ctx.fillText("Find it in Roblox Games → Your Game",W/2,H/2+Math.min(W,H)*0.07);
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
