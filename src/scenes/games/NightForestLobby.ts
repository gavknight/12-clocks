import type { Game } from "../../game/Game";
import { NightForest, type NightForestClass } from "./NightForest";

// ── class definitions ──────────────────────────────────────────────────────────
export const CLASSES: {
  id:      NightForestClass;
  name:    string;
  icon:    string;
  color:   string;
  desc:    string;
  pros:    string[];
  cons:    string[];
}[] = [
  {
    id:    "survivor",
    name:  "Survivor",
    icon:  "🧍",
    color: "#88cc88",
    desc:  "The default — balanced and reliable.",
    pros:  ["Normal speed", "Normal fuel"],
    cons:  [],
  },
  {
    id:    "scout",
    name:  "Scout",
    icon:  "🏃",
    color: "#44ddff",
    desc:  "Fast explorer, but burns through fuel.",
    pros:  ["+30% move speed", "Starts with Speed Boots"],
    cons:  ["-25% fuel from items"],
  },
  {
    id:    "firekeeper",
    name:  "Fire Keeper",
    icon:  "🔥",
    color: "#ff8833",
    desc:  "Expert at keeping the flame alive.",
    pros:  ["+50% fuel from items", "Starts with Big Lantern"],
    cons:  ["-20% move speed"],
  },
  {
    id:    "warrior",
    name:  "Warrior",
    icon:  "⚔️",
    color: "#ff5555",
    desc:  "Tough fighter, but fire drains faster.",
    pros:  ["Starts with Wolf Shield (6 HP)", "Wolves are 20% slower"],
    cons:  ["-25% fuel from items"],
  },
];

// ── leaderboard stub (replace with real backend if needed) ────────────────────
const FAKE_LB = [
  { name: "NightOwl99",   nights: 99, coins: 420 },
  { name: "ForestKing",   nights: 87, coins: 310 },
  { name: "DeerSlayer",   nights: 72, coins: 260 },
  { name: "CampMaster",   nights: 54, coins: 190 },
  { name: "FireKeeper1",  nights: 39, coins: 140 },
];

const W_WORLD = 1200;   // lobby world width
const H_WORLD = 700;    // lobby world height
const LOBBY_SPEED = 180;

export class NightForestLobby {
  private _canvas: HTMLCanvasElement;
  private _ctx:    CanvasRenderingContext2D;
  private _g:      Game;
  private _keys  = new Set<string>();
  private _player = { x: W_WORLD / 2, y: H_WORLD / 2 };
  private _selectedClass: NightForestClass = "survivor";
  private _raf   = 0;
  private _lastTs = 0;
  private _tooltipTimer = 0;
  private _cleanupFns: (() => void)[] = [];

  // Click zones (populated each frame)
  private _classZones: { x: number; y: number; w: number; h: number; id: NightForestClass }[] = [];
  private _playZone   = { x: 0, y: 0, w: 0, h: 0 };
  private _backZone   = { x: 0, y: 0, w: 0, h: 0 };

  // Camera
  private _camX = W_WORLD / 2;
  private _camY = H_WORLD / 2;

  // Decorative trees (static)
  private _trees: { x: number; y: number; r: number }[] = [];

  constructor(game: Game) {
    this._g = game;

    game.ui.innerHTML = `
      <div id="nflRoot" style="
        position:relative;width:100%;height:100%;
        background:#000;pointer-events:all;touch-action:none;
      ">
        <canvas id="nflCanvas" style="display:block;width:100%;height:100%;"></canvas>
      </div>
    `;

    this._canvas = document.getElementById("nflCanvas") as HTMLCanvasElement;
    this._ctx    = this._canvas.getContext("2d")!;
    this._resize();
    const onResize = () => this._resize();
    window.addEventListener("resize", onResize);
    this._cleanupFns.push(() => window.removeEventListener("resize", onResize));

    // Scatter decorative trees
    const rng = (a: number, b: number) => a + Math.random() * (b - a);
    for (let i = 0; i < 40; i++) {
      this._trees.push({ x: rng(40, W_WORLD - 40), y: rng(40, H_WORLD - 40), r: rng(18, 32) });
    }

    // Input
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","KeyE"].includes(e.code))
        e.preventDefault();
      if (e.type === "keydown") {
        this._keys.add(e.code);
        if (e.code === "KeyE") this._onE();
      } else {
        this._keys.delete(e.code);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup",   onKey);
    this._cleanupFns.push(() => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup",   onKey);
    });

    const onClick = (e: MouseEvent) => this._onClick(e);
    this._canvas.addEventListener("click", onClick);
    this._cleanupFns.push(() => this._canvas.removeEventListener("click", onClick));

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _resize() {
    this._canvas.width  = this._canvas.clientWidth  || window.innerWidth;
    this._canvas.height = this._canvas.clientHeight || window.innerHeight;
  }

  private _onClick(e: MouseEvent) {
    const rect = this._canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (this._canvas.width  / rect.width);
    const sy = (e.clientY - rect.top)  * (this._canvas.height / rect.height);

    // Back button
    const b = this._backZone;
    if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
      this._destroy();
      this._g.goArcade();
      return;
    }

    // Class selection
    for (const z of this._classZones) {
      if (sx >= z.x && sx <= z.x + z.w && sy >= z.y && sy <= z.y + z.h) {
        this._selectedClass = z.id;
        return;
      }
    }

    // Play gate
    const p = this._playZone;
    if (sx >= p.x && sx <= p.x + p.w && sy >= p.y && sy <= p.y + p.h) {
      this._enterGame();
      return;
    }
  }

  private _onE() {
    // Check if player is near play gate (world center)
    const gateCX = W_WORLD / 2;
    const gateCY = H_WORLD / 2 + 60;
    const dist = Math.hypot(this._player.x - gateCX, this._player.y - gateCY);
    if (dist < 110) {
      this._enterGame();
      return;
    }

    // Check if player is near a class zone area (left side)
    for (const cls of CLASSES) {
      const idx = CLASSES.indexOf(cls);
      const bx = 90;
      const by = 160 + idx * 110;
      // world coords to screen for proximity check — just use world coords
      const dist2 = Math.hypot(this._player.x - (bx + 110), this._player.y - (by + 40));
      if (dist2 < 100) {
        this._selectedClass = cls.id;
        return;
      }
    }
  }

  private _enterGame() {
    this._destroy();
    this._g.ui.innerHTML = "";
    new NightForest(this._g, this._selectedClass);
  }

  private _destroy() {
    cancelAnimationFrame(this._raf);
    for (const fn of this._cleanupFns) fn();
  }

  private _loop(ts: number) {
    const dt = Math.min(ts - this._lastTs, 50);
    this._lastTs = ts;
    if (this._tooltipTimer > 0) this._tooltipTimer -= dt;

    this._update(dt);
    this._draw();
    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  private _update(dt: number) {
    const s = LOBBY_SPEED * (dt / 1000);
    let dx = 0, dy = 0;
    if (this._keys.has("KeyA") || this._keys.has("ArrowLeft"))  dx -= 1;
    if (this._keys.has("KeyD") || this._keys.has("ArrowRight")) dx += 1;
    if (this._keys.has("KeyW") || this._keys.has("ArrowUp"))    dy -= 1;
    if (this._keys.has("KeyS") || this._keys.has("ArrowDown"))  dy += 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    this._player.x = Math.max(20, Math.min(W_WORLD - 20, this._player.x + dx * s));
    this._player.y = Math.max(20, Math.min(H_WORLD - 20, this._player.y + dy * s));

    // Camera follow
    this._camX += (this._player.x - this._camX) * 0.1;
    this._camY += (this._player.y - this._camY) * 0.1;
  }

  private _draw() {
    const cw = this._canvas.width;
    const ch = this._canvas.height;
    const ctx = this._ctx;

    ctx.clearRect(0, 0, cw, ch);

    // ── World camera transform ──────────────────────────────────────────────
    const scaleX = cw / W_WORLD;
    const scaleY = ch / H_WORLD;
    const scale  = Math.min(scaleX, scaleY) * 0.9;
    const offX   = cw / 2 - this._camX * scale;
    const offY   = ch / 2 - this._camY * scale;

    const toScreen = (wx: number, wy: number) => ({
      sx: wx * scale + offX,
      sy: wy * scale + offY,
    });

    // Background
    const bg = ctx.createRadialGradient(cw/2, ch/2, 0, cw/2, ch/2, Math.max(cw, ch));
    bg.addColorStop(0, "#0a1a0a");
    bg.addColorStop(1, "#000800");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    // World border
    const tl = toScreen(0, 0);
    const br = toScreen(W_WORLD, H_WORLD);
    ctx.strokeStyle = "rgba(50,150,50,0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy);

    // Ground
    ctx.fillStyle = "rgba(10,40,10,0.6)";
    ctx.fillRect(tl.sx, tl.sy, br.sx - tl.sx, br.sy - tl.sy);

    // Stars in background sky (fixed screen coords)
    ctx.save();
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137.5) % cw);
      const sy = ((i * 97.3)  % (ch * 0.4));
      ctx.fillStyle = `rgba(255,255,255,${0.2 + (i % 5) * 0.08})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    // ── Decorative trees ────────────────────────────────────────────────────
    for (const t of this._trees) {
      this._drawTree(ctx, t.x, t.y, t.r);
    }

    // ── CLASS ZONE (left panel) ─────────────────────────────────────────────
    const panelX = 70;
    const panelY = 90;
    const panelW = 260;
    const panelH = 510;

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(100,255,100,0.4)";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    ctx.fillStyle = "#aaffaa";
    ctx.font = `bold ${18 / scale}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("⚔️  CLASSES", panelX + panelW / 2, panelY + 34);

    ctx.font = `${11 / scale}px Arial`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("Click or press E nearby to select", panelX + panelW / 2, panelY + 52);

    this._classZones = [];
    for (let i = 0; i < CLASSES.length; i++) {
      const cls = CLASSES[i];
      const bx  = panelX + 14;
      const by  = panelY + 70 + i * 104;
      const bw  = panelW - 28;
      const bh  = 94;

      const selected = this._selectedClass === cls.id;

      // Card bg
      ctx.fillStyle = selected
        ? `rgba(${hexToRgb(cls.color)},0.25)`
        : "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();

      ctx.strokeStyle = selected ? cls.color : "rgba(255,255,255,0.12)";
      ctx.lineWidth = (selected ? 2.5 : 1) / scale;
      ctx.stroke();

      // Icon + name
      ctx.font = `${22 / scale}px serif`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff";
      ctx.fillText(cls.icon, bx + 10, by + 32);

      ctx.font = `bold ${13 / scale}px Arial`;
      ctx.fillStyle = selected ? cls.color : "#ddd";
      ctx.fillText(cls.name, bx + 44, by + 25);

      ctx.font = `${10 / scale}px Arial`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(cls.desc, bx + 44, by + 40);

      // Pros / cons
      ctx.font = `${9.5 / scale}px Arial`;
      let lineY = by + 58;
      for (const pro of cls.pros) {
        ctx.fillStyle = "#88ff88";
        ctx.fillText("+ " + pro, bx + 10, lineY);
        lineY += 13;
      }
      for (const con of cls.cons) {
        ctx.fillStyle = "#ff8888";
        ctx.fillText("– " + con, bx + 10, lineY);
        lineY += 13;
      }

      // Store screen-space hit zone (need to map back)
      const sPos = toScreen(bx, by);
      this._classZones.push({
        x:  sPos.sx,
        y:  sPos.sy,
        w:  bw * scale,
        h:  bh * scale,
        id: cls.id,
      });
    }

    // ── PLAY GATE (center) ─────────────────────────────────────────────────
    const gateCX = W_WORLD / 2;
    const gateCY = H_WORLD / 2 + 60;
    const gateW  = 160;
    const gateH  = 220;

    // Gate posts
    for (const ox of [-gateW/2 + 10, gateW/2 - 10]) {
      const grd = ctx.createLinearGradient(gateCX + ox - 8, gateCY - gateH, gateCX + ox + 8, gateCY);
      grd.addColorStop(0, "#8B6343");
      grd.addColorStop(1, "#5a3d1a");
      ctx.fillStyle = grd;
      ctx.fillRect(gateCX + ox - 8, gateCY - gateH, 16, gateH);
    }

    // Crossbar
    ctx.fillStyle = "#7a5530";
    ctx.fillRect(gateCX - gateW/2 + 10, gateCY - gateH + 10, gateW - 20, 18);

    // Gate glow
    const now = performance.now();
    const pulse = 0.6 + 0.4 * Math.sin(now / 600);
    const gGrd = ctx.createRadialGradient(gateCX, gateCY - gateH / 2, 10, gateCX, gateCY - gateH / 2, gateW * 0.6);
    gGrd.addColorStop(0, `rgba(100,255,100,${0.18 * pulse})`);
    gGrd.addColorStop(1, "rgba(0,255,0,0)");
    ctx.fillStyle = gGrd;
    ctx.fillRect(gateCX - gateW, gateCY - gateH - 40, gateW * 2, gateH + 80);

    // PLAY label on gate
    ctx.save();
    ctx.shadowBlur = 18 * pulse;
    ctx.shadowColor = "#00ff88";
    ctx.fillStyle   = "#aaffaa";
    ctx.font        = `bold ${24 / scale}px Arial Black, Arial`;
    ctx.textAlign   = "center";
    ctx.fillText("▶ PLAY", gateCX, gateCY - gateH + 48);
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = `${10 / scale}px Arial`;
    ctx.fillText("Walk up and press E", gateCX, gateCY - gateH + 66);

    // Player-proximity indicator
    const distToGate = Math.hypot(this._player.x - gateCX, this._player.y - gateCY);
    if (distToGate < 110) {
      ctx.save();
      ctx.strokeStyle = `rgba(100,255,100,${0.4 + 0.4 * pulse})`;
      ctx.lineWidth = 3 / scale;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.beginPath();
      ctx.arc(gateCX, gateCY - gateH / 2, gateW * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.fillStyle = "#aaffaa";
      ctx.font = `bold ${12 / scale}px Arial`;
      ctx.fillText("[E] Enter", gateCX, gateCY + 30);
    }

    // Store play zone in screen coords
    {
      const ps = toScreen(gateCX - gateW / 2, gateCY - gateH);
      this._playZone = { x: ps.sx, y: ps.sy, w: gateW * scale, h: (gateH + 50) * scale };
    }

    // ── REWARDS ZONE (right side) ─────────────────────────────────────────
    const rwX = W_WORLD - 340;
    const rwY = 90;
    const rwW = 250;
    const rwH = 220;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(rwX, rwY, rwW, rwH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,200,0,0.5)";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    ctx.font = `bold ${17 / scale}px Arial`;
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.fillText("🏆  REWARDS", rwX + rwW / 2, rwY + 35);

    ctx.font = `${11 / scale}px Arial`;
    ctx.fillStyle = "rgba(255,255,200,0.7)";
    ctx.fillText(`Your coins: ${this._g.state.coins} 🪙`, rwX + rwW / 2, rwY + 58);

    const rewards = [
      { nights: 10,  reward: "🌟 10-Night Badge" },
      { nights: 25,  reward: "🦌 Deer Hunter Title" },
      { nights: 50,  reward: "🌲 Forest Legend" },
      { nights: 99,  reward: "👑 99-Night Crown" },
    ];
    ctx.textAlign = "left";
    let ry = rwY + 82;
    for (const r of rewards) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.roundRect(rwX + 12, ry - 14, rwW - 24, 24, 6);
      ctx.fill();

      ctx.font = `bold ${9 / scale}px Arial`;
      ctx.fillStyle = "#FFD700";
      ctx.fillText(`Night ${r.nights}`, rwX + 20, ry);
      ctx.font = `${9 / scale}px Arial`;
      ctx.fillStyle = "#fff";
      ctx.fillText(r.reward, rwX + 80, ry);
      ry += 30;
    }

    // ── LEADERBOARD (below rewards) ───────────────────────────────────────
    const lbX = W_WORLD - 340;
    const lbY = rwY + rwH + 20;
    const lbW = 250;
    const lbH = 210;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.roundRect(lbX, lbY, lbW, lbH, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(100,200,255,0.4)";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();

    ctx.font = `bold ${17 / scale}px Arial`;
    ctx.fillStyle = "#88ddff";
    ctx.textAlign = "center";
    ctx.fillText("📊  LEADERBOARD", lbX + lbW / 2, lbY + 33);

    ctx.textAlign = "left";
    const medals = ["🥇", "🥈", "🥉", "4.", "5."];
    for (let i = 0; i < FAKE_LB.length; i++) {
      const entry = FAKE_LB[i];
      const ey = lbY + 56 + i * 30;

      ctx.fillStyle = i < 3 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.roundRect(lbX + 10, ey - 14, lbW - 20, 24, 6);
      ctx.fill();

      ctx.font = `bold ${10 / scale}px Arial`;
      ctx.fillStyle = i === 0 ? "#FFD700" : i === 1 ? "#aaaaaa" : i === 2 ? "#cc8855" : "#666";
      ctx.fillText(medals[i], lbX + 18, ey);

      ctx.fillStyle = "#ddd";
      ctx.fillText(entry.name, lbX + 42, ey);

      ctx.fillStyle = "#aaffaa";
      ctx.textAlign = "right";
      ctx.fillText(`🌙 ${entry.nights}`, lbX + lbW - 14, ey);
      ctx.textAlign = "left";
    }

    // ── Player ─────────────────────────────────────────────────────────────
    const px = this._player.x;
    const py = this._player.y;
    const isMoving = this._keys.has("KeyW") || this._keys.has("KeyA") ||
                     this._keys.has("KeyS") || this._keys.has("KeyD") ||
                     this._keys.has("ArrowUp") || this._keys.has("ArrowLeft") ||
                     this._keys.has("ArrowDown") || this._keys.has("ArrowRight");

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(px, py + 18, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glow (selected class color)
    const cls = CLASSES.find(c => c.id === this._selectedClass)!;
    const playerGrd = ctx.createRadialGradient(px, py, 2, px, py, 28);
    playerGrd.addColorStop(0, cls.color + "55");
    playerGrd.addColorStop(1, "transparent");
    ctx.fillStyle = playerGrd;
    ctx.beginPath();
    ctx.arc(px, py, 28, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = "#c89060";
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();

    // Bounce bob
    const bob = isMoving ? Math.sin(now / 100) * 2 : 0;

    // Head
    ctx.fillStyle = "#f0c090";
    ctx.beginPath();
    ctx.arc(px, py - 18 + bob, 9, 0, Math.PI * 2);
    ctx.fill();

    // Class icon above player
    ctx.font = `${14 / scale}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(cls.icon, px, py - 34 + bob);

    ctx.restore(); // end world transform

    // ── HUD (screen space) ─────────────────────────────────────────────────

    // Back button
    {
      const bx = 18, by = 18, bw = 90, bh = 34;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.fillText("← Back", bx + bw / 2, by + 22);
      this._backZone = { x: bx, y: by, w: bw, h: bh };
    }

    // Title
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#00ff88";
    ctx.fillStyle   = "#ccffcc";
    ctx.font        = "bold 22px Arial Black, Arial";
    ctx.textAlign   = "center";
    ctx.fillText("🌲 99 Nights in the Forest", cw / 2, 36);
    ctx.restore();

    // Controls hint
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("WASD to walk · Click or E to interact", cw / 2, ch - 12);
  }

  private _drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    // Simple pine tree silhouette
    ctx.fillStyle = `rgba(20,60,20,0.7)`;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2.2);
    ctx.lineTo(x + r * 1.1, y + r * 0.4);
    ctx.lineTo(x - r * 1.1, y + r * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(15,45,15,0.7)`;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.5);
    ctx.lineTo(x + r * 1.3, y + r * 1.1);
    ctx.lineTo(x - r * 1.3, y + r * 1.1);
    ctx.closePath();
    ctx.fill();

    // Trunk
    ctx.fillStyle = "#5a3d1a";
    ctx.fillRect(x - r * 0.18, y + r * 1.0, r * 0.36, r * 0.8);
  }
}

// ── helpers ────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
