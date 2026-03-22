// GDLevelEditor.ts — canvas-based level editor for custom GD levels
import type { Game } from "../../game/Game";
import { gdUpsert, gdNewId, type GDLevel, type GDObj, type GDObjType } from "./GDStorage";

const W = 800, H = 450;
const FLOOR_Y = 390;
const CEIL_Y  = 30;
const B = 46;
const CORRIDOR = FLOOR_Y - CEIL_Y;

type Tool = GDObjType | 'erase';

const TOOLS: { t: Tool; icon: string; label: string }[] = [
  { t: 'block',   icon: '🟦', label: 'Block'      },
  { t: 'spike',   icon: '▲',  label: 'Flr Spike'  },
  { t: 'spike_d', icon: '▼',  label: 'Ceil Spike' },
  { t: 'p_cube',  icon: '🟩', label: 'Cube Portal'},
  { t: 'p_ship',  icon: '🟣', label: 'Ship Portal'},
  { t: 'coin',    icon: '🪙', label: 'Coin'       },
  { t: 'erase',   icon: '🗑️', label: 'Erase'      },
];

export class GDLevelEditor {
  private _g:      Game;
  private _wrap!:  HTMLDivElement;
  private _canvas!: HTMLCanvasElement;
  private _ctx!:   CanvasRenderingContext2D;
  private _raf    = 0;
  private _level:  GDLevel;
  private _tool:   Tool = 'block';
  private _camX   = 0;
  private _hover  = { col: -1, wy: FLOOR_Y - B };
  private _placing = false;

  constructor(g: Game, existing?: GDLevel) {
    this._g = g;
    this._level = existing
      ? { ...existing, objects: [...existing.objects] }
      : {
          id:         gdNewId(),
          name:       'My Level',
          authorId:   g.currentAccountId ?? 'guest',
          authorName: g.state.username   ?? 'Player',
          published:  false,
          objects:    [],
          createdAt:  Date.now(),
        };

    this._buildUI();
    this._raf = requestAnimationFrame(this._loop);
  }

  /* ── UI ─────────────────────────────────────────────────── */
  private _buildUI(): void {
    this._g.ui.innerHTML = '';
    this._wrap = document.createElement('div');
    this._wrap.style.cssText =
      'position:fixed;inset:0;z-index:9999;pointer-events:all;background:#0a0a1a;display:flex;' +
      'flex-direction:column;font-family:Arial,sans-serif;';
    this._g.ui.appendChild(this._wrap);

    /* Top bar */
    const top = document.createElement('div');
    top.style.cssText =
      'display:flex;align-items:center;gap:8px;padding:6px 10px;' +
      'background:#111;border-bottom:2px solid #333;flex-shrink:0;';
    top.innerHTML = `
      <button id="ed-back" style="background:#333;color:white;border:none;
        padding:5px 12px;border-radius:8px;cursor:pointer;">← Back</button>
      <input id="ed-name" type="text" maxlength="30"
        value="${this._level.name.replace(/"/g,'&quot;')}"
        style="flex:1;background:#222;color:white;border:1px solid #555;
          border-radius:8px;padding:5px 10px;font-size:14px;outline:none;" />
      <button id="ed-save" style="background:#0066cc;color:white;border:none;
        padding:5px 14px;border-radius:8px;cursor:pointer;font-weight:bold;">💾 Save</button>
      <button id="ed-publish" style="background:${this._level.published?'#226622':'#cc6600'};
        color:white;border:none;padding:5px 14px;border-radius:8px;cursor:pointer;font-weight:bold;">
        ${this._level.published ? '✅ Published' : '🌐 Publish'}</button>
      <button id="ed-test" style="background:#004400;color:#7fff7f;border:1px solid #228822;
        padding:5px 14px;border-radius:8px;cursor:pointer;font-weight:bold;">▶ Test Play</button>
    `;
    this._wrap.appendChild(top);

    /* Canvas area */
    const area = document.createElement('div');
    area.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;';
    this._canvas = document.createElement('canvas');
    this._canvas.width  = W;
    this._canvas.height = H;
    this._canvas.style.cssText = 'image-rendering:pixelated;cursor:crosshair;touch-action:none;';
    area.appendChild(this._canvas);
    this._wrap.appendChild(area);
    this._ctx = this._canvas.getContext('2d')!;
    this._fitCanvas();
    window.addEventListener('resize', this._fitCanvas);

    /* Palette */
    const pal = document.createElement('div');
    pal.style.cssText =
      'display:flex;align-items:center;justify-content:center;gap:6px;' +
      'padding:7px;background:#111;border-top:2px solid #333;flex-shrink:0;';
    for (const tool of TOOLS) {
      const btn = document.createElement('button');
      btn.id = `ed-t-${tool.t}`;
      btn.style.cssText =
        'display:flex;flex-direction:column;align-items:center;gap:2px;' +
        'padding:5px 10px;border-radius:8px;cursor:pointer;' +
        'background:#1a1a2a;color:white;border:2px solid #444;min-width:60px;font-size:12px;';
      btn.innerHTML = `<span style="font-size:18px;">${tool.icon}</span>${tool.label}`;
      btn.onclick = () => { this._tool = tool.t; this._syncPalette(); };
      pal.appendChild(btn);
    }
    this._wrap.appendChild(pal);

    /* Hint */
    const hint = document.createElement('div');
    hint.style.cssText =
      'text-align:center;color:rgba(255,255,255,0.25);font-size:10px;' +
      'padding:3px;background:#0a0a0a;flex-shrink:0;';
    hint.textContent = 'Click/drag to place • Right-click to erase • ← → Arrow keys to scroll';
    this._wrap.appendChild(hint);

    /* Events */
    this._canvas.addEventListener('pointermove', this._onMove);
    this._canvas.addEventListener('pointerdown', this._onPointerDown);
    this._canvas.addEventListener('pointerup',   () => { this._placing = false; });
    this._canvas.addEventListener('contextmenu', e => e.preventDefault());
    this._canvas.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('keydown', this._onKey);

    /* Buttons */
    document.getElementById('ed-back')!.onclick    = () => this._saveAndExit();
    document.getElementById('ed-save')!.onclick    = () => this._save(false);
    document.getElementById('ed-publish')!.onclick = () => this._save(true);
    document.getElementById('ed-test')!.onclick    = () => {
      this._save(false);
      this._cleanup();
      import('./GeometryDash').then(m =>
        new m.GeometryDash(this._g, this._level, true)
      );
    };
    document.getElementById('ed-name')!.oninput = e => {
      this._level.name = (e.target as HTMLInputElement).value.trim() || 'My Level';
    };

    this._syncPalette();
  }

  /* ── Fit canvas ─────────────────────────────────────────── */
  private _fitCanvas = (): void => {
    const s = Math.min(window.innerWidth / W, (window.innerHeight - 120) / H);
    this._canvas.style.width  = `${W * s}px`;
    this._canvas.style.height = `${H * s}px`;
  };

  /* ── Palette highlight ───────────────────────────────────── */
  private _syncPalette(): void {
    for (const tool of TOOLS) {
      const el = document.getElementById(`ed-t-${tool.t}`);
      if (el) el.style.borderColor = tool.t === this._tool ? '#fff' : '#444';
    }
  }

  /* ── Mouse helpers ───────────────────────────────────────── */
  private _toWorld(e: PointerEvent): { wx: number; wy: number } {
    const rect = this._canvas.getBoundingClientRect();
    return {
      wx: (e.clientX - rect.left) / rect.width  * W + this._camX,
      wy: (e.clientY - rect.top)  / rect.height * H,
    };
  }

  private _worldToSnap(wx: number, wy: number): { col: number; snapWy: number } {
    const col = Math.floor(wx / B);
    let snapWy: number;
    switch (this._tool) {
      case 'spike':   snapWy = FLOOR_Y - B; break;
      case 'spike_d': snapWy = CEIL_Y;      break;
      case 'p_cube':
      case 'p_ship':  snapWy = CEIL_Y;      break;
      case 'erase':   // fall through
      default:        snapWy = Math.max(CEIL_Y, Math.min(FLOOR_Y - B, Math.floor(wy / B) * B)); break;
    }
    return { col, snapWy };
  }

  /* ── Placement ───────────────────────────────────────────── */
  private _placeAt(wx: number, wy: number, erasing: boolean): void {
    const { col, snapWy } = this._worldToSnap(wx, wy);
    if (col < 0) return;

    if (erasing || this._tool === 'erase') {
      // Remove any object overlapping this grid cell
      const cx = col * B;
      this._level.objects = this._level.objects.filter(o => !(
        o.wx < cx + B && o.wx + o.ww > cx &&
        o.wy < snapWy + B && o.wy + o.wh > snapWy
      ));
      return;
    }

    const wx0 = col * B;
    let newObj: GDObj | null = null;

    switch (this._tool) {
      case 'block':
        if (!this._level.objects.some(o => o.t === 'block' && o.wx === wx0 && o.wy === snapWy))
          newObj = { t: 'block', wx: wx0, wy: snapWy, ww: B, wh: B };
        break;
      case 'spike':
        if (!this._level.objects.some(o => o.t === 'spike' && o.wx === wx0))
          newObj = { t: 'spike', wx: wx0, wy: FLOOR_Y - B, ww: B, wh: B };
        break;
      case 'spike_d':
        if (!this._level.objects.some(o => o.t === 'spike_d' && o.wx === wx0))
          newObj = { t: 'spike_d', wx: wx0, wy: CEIL_Y, ww: B, wh: B };
        break;
      case 'p_cube':
        this._level.objects = this._level.objects.filter(o =>
          !(o.t === 'p_cube' || o.t === 'p_ship') || o.wx !== wx0
        );
        newObj = { t: 'p_cube', wx: wx0, wy: CEIL_Y, ww: B, wh: CORRIDOR };
        break;
      case 'p_ship':
        this._level.objects = this._level.objects.filter(o =>
          !(o.t === 'p_cube' || o.t === 'p_ship') || o.wx !== wx0
        );
        newObj = { t: 'p_ship', wx: wx0, wy: CEIL_Y, ww: B, wh: CORRIDOR };
        break;
      case 'coin':
        if (!this._level.objects.some(o => o.t === 'coin' && o.wx === wx0 && o.wy === snapWy))
          newObj = { t: 'coin', wx: wx0, wy: snapWy, ww: B, wh: B };
        break;
    }
    if (newObj) this._level.objects.push(newObj);
  }

  /* ── Input ───────────────────────────────────────────────── */
  private _onMove = (e: PointerEvent): void => {
    const { wx, wy } = this._toWorld(e);
    const { col, snapWy } = this._worldToSnap(wx, wy);
    this._hover = { col, wy: snapWy };
    if (this._placing) this._placeAt(wx, wy, e.buttons === 2);
  };

  private _onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this._canvas.setPointerCapture(e.pointerId);
    this._placing = true;
    const { wx, wy } = this._toWorld(e);
    this._placeAt(wx, wy, e.button === 2);
  };

  private _onKey = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowRight') this._camX += B * 3;
    if (e.key === 'ArrowLeft')  this._camX = Math.max(0, this._camX - B * 3);
    if (e.key === 'Escape') this._saveAndExit();
  };

  private _onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    this._camX = Math.max(0, this._camX + Math.sign(delta) * B * 3);
  };

  /* ── Save ───────────────────────────────────────────────── */
  private _save(publish: boolean): void {
    if (publish) this._level.published = true;
    gdUpsert(this._level);
    const saveBtn = document.getElementById('ed-save');
    if (saveBtn) { saveBtn.textContent = '✓ Saved!'; setTimeout(() => { if (saveBtn) saveBtn.textContent = '💾 Save'; }, 1200); }
    const pubBtn = document.getElementById('ed-publish');
    if (pubBtn) {
      pubBtn.style.background = this._level.published ? '#226622' : '#cc6600';
      pubBtn.textContent = this._level.published ? '✅ Published' : '🌐 Publish';
    }
  }

  private _saveAndExit(): void {
    this._save(false);
    this._cleanup();
    import('./GDLevelBrowser').then(m => new m.GDLevelBrowser(this._g));
  }

  private _cleanup(): void {
    cancelAnimationFrame(this._raf); this._raf = 0;
    window.removeEventListener('resize',  this._fitCanvas);
    window.removeEventListener('keydown', this._onKey);
    this._canvas.removeEventListener('pointermove', this._onMove);
    this._canvas.removeEventListener('pointerdown', this._onPointerDown);
    this._canvas.removeEventListener('wheel', this._onWheel);
    this._g.ui.innerHTML = '';
  }

  /* ── Render loop ─────────────────────────────────────────── */
  private _loop = (): void => {
    if (!this._raf) return;
    this._draw();
    this._raf = requestAnimationFrame(this._loop);
  };

  private _draw(): void {
    const c = this._ctx;
    const cam = this._camX;

    /* Sky */
    c.fillStyle = '#0a1a3a';
    c.fillRect(0, 0, W, H);

    /* Grid */
    c.strokeStyle = 'rgba(100,180,255,0.07)'; c.lineWidth = 1;
    const gx = cam % B;
    for (let x = -gx; x < W + B; x += B) {
      c.beginPath(); c.moveTo(x, CEIL_Y); c.lineTo(x, FLOOR_Y); c.stroke();
    }
    for (let y = CEIL_Y; y <= FLOOR_Y; y += B) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }

    /* Ceiling */
    c.fillStyle = '#081530';
    c.fillRect(0, 0, W, CEIL_Y);
    c.fillStyle = 'rgba(100,200,255,0.5)';
    c.fillRect(0, CEIL_Y - 2, W, 2);

    /* Floor */
    c.fillStyle = '#081530';
    c.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    c.fillStyle = 'rgba(100,200,255,0.5)';
    c.fillRect(0, FLOOR_Y, W, 2);

    /* Objects */
    for (const o of this._level.objects) {
      const sx = o.wx - cam;
      if (sx + o.ww < -B || sx > W + B) continue;
      this._drawObj(c, o, sx);
    }

    /* Column numbers */
    c.font = '9px Arial'; c.fillStyle = 'rgba(255,255,255,0.18)'; c.textAlign = 'center';
    for (let x = -gx; x < W + B; x += B) {
      const col = Math.floor((x + cam) / B);
      if (col >= 0) c.fillText(`${col}`, x + B / 2, CEIL_Y - 4);
    }

    /* Hover preview */
    const { col, wy: hwy } = this._hover;
    const hsx = col * B - cam;
    if (col >= 0 && hsx > -B && hsx < W + B) {
      c.globalAlpha = 0.4;
      this._drawObj(c, this._previewObj(col, hwy), hsx);
      c.globalAlpha = 1;
    }

    /* Scroll indicator */
    c.textAlign = 'left'; c.font = '11px Arial';
    c.fillStyle = 'rgba(255,255,255,0.2)';
    c.fillText(`col ${Math.floor(cam / B)} →  ← → to scroll`, 8, H - 8);
    c.textAlign = 'left';
  }

  private _previewObj(col: number, hwy: number): GDObj {
    const wx = col * B;
    switch (this._tool) {
      case 'spike':   return { t: 'spike',   wx, wy: FLOOR_Y - B, ww: B, wh: B };
      case 'spike_d': return { t: 'spike_d', wx, wy: CEIL_Y,      ww: B, wh: B };
      case 'p_cube':  return { t: 'p_cube',  wx, wy: CEIL_Y,      ww: B, wh: CORRIDOR };
      case 'p_ship':  return { t: 'p_ship',  wx, wy: CEIL_Y,      ww: B, wh: CORRIDOR };
      case 'erase':   return { t: 'block',   wx, wy: hwy,         ww: B, wh: B }; // red tinted via globalAlpha
      default:        return { t: 'block',   wx, wy: hwy,         ww: B, wh: B };
    }
  }

  private _drawObj(c: CanvasRenderingContext2D, o: GDObj, sx: number): void {
    const { wy: y, ww: w, wh: h } = o;
    switch (o.t) {
      case 'block':
        c.fillStyle = '#0a2050'; c.fillRect(sx, y, w, h);
        c.fillStyle = '#1a4080'; c.fillRect(sx, y, w, 3);
        c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
        c.strokeRect(sx, y, w, h);
        break;
      case 'spike': {
        c.fillStyle = '#00eecc';
        c.beginPath(); c.moveTo(sx+3,y+h); c.lineTo(sx+w/2,y+2); c.lineTo(sx+w-3,y+h); c.closePath(); c.fill();
        break;
      }
      case 'spike_d': {
        c.fillStyle = '#00eecc';
        c.beginPath(); c.moveTo(sx+3,y); c.lineTo(sx+w/2,y+h-2); c.lineTo(sx+w-3,y); c.closePath(); c.fill();
        break;
      }
      case 'p_cube':
        c.strokeStyle = '#00ff88'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(sx+3, y+4, w-6, h-8, 4); c.stroke();
        c.fillStyle = 'rgba(0,255,136,0.1)'; c.fill();
        c.font = 'bold 9px Arial'; c.fillStyle = '#00ff88'; c.textAlign = 'center';
        c.fillText('CUBE', sx+w/2, y+h/2); c.textAlign = 'left';
        break;
      case 'p_ship':
        c.strokeStyle = '#ff44ff'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(sx+3, y+4, w-6, h-8, 4); c.stroke();
        c.fillStyle = 'rgba(255,68,255,0.1)'; c.fill();
        c.font = 'bold 9px Arial'; c.fillStyle = '#ff44ff'; c.textAlign = 'center';
        c.fillText('SHIP', sx+w/2, y+h/2); c.textAlign = 'left';
        break;
      case 'coin': {
        const cx = sx + w/2, cy = y + h/2, r = 11;
        /* glow */
        const gl = c.createRadialGradient(cx, cy, 1, cx, cy, r+6);
        gl.addColorStop(0, 'rgba(255,220,0,0.4)'); gl.addColorStop(1, 'transparent');
        c.fillStyle = gl; c.beginPath(); c.arc(cx, cy, r+6, 0, Math.PI*2); c.fill();
        /* star coin */
        const grad = c.createRadialGradient(cx-r*0.3, cy-r*0.3, r*0.1, cx, cy, r);
        grad.addColorStop(0, '#ffe066'); grad.addColorStop(0.6, '#f0a800'); grad.addColorStop(1, '#c07000');
        c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2); c.fill();
        c.strokeStyle = '#8a5000'; c.lineWidth = 1.5; c.stroke();
        const spikes = 5, outerR = r*0.62, innerR = r*0.26;
        c.fillStyle = '#7a3a00'; c.beginPath();
        for (let i = 0; i < spikes*2; i++) {
          const rad = i%2===0 ? outerR : innerR;
          const ang = (i*Math.PI/spikes) - Math.PI/2;
          i===0 ? c.moveTo(cx+rad*Math.cos(ang), cy+rad*Math.sin(ang))
                : c.lineTo(cx+rad*Math.cos(ang), cy+rad*Math.sin(ang));
        }
        c.closePath(); c.fill();
        break;
      }
    }
  }
}
