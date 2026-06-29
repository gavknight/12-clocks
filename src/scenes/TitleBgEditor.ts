const SB  = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const H   = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" };

export interface BgElement {
  id: string;
  type: "text" | "emoji" | "shape";
  content: string;   // text string, emoji char, or shape name
  x: number;         // 0–100 %
  y: number;         // 0–100 %
  size: number;      // px
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
  opacity: number;   // 0–1
  rotate: number;    // degrees
}

export interface BgConfig {
  bg: string;
  elements: BgElement[];
}

const DEFAULT_BG = "linear-gradient(160deg,#1a0a3e,#3a106f,#6a20a0)";

export class TitleBgEditor {
  private el: HTMLDivElement;
  private _styleEl!: HTMLStyleElement;
  private onClose: () => void;
  private config: BgConfig = { bg: DEFAULT_BG, elements: [] };
  private selectedId: string | null = null;
  private tab: "bg" | "add" | "edit" = "bg";
  private dragging: { id: string } | null = null;
  private dragOffset = { x: 0, y: 0 };

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.el = document.createElement("div");
    this.el.style.cssText =
      "position:fixed;inset:0;z-index:999999;background:#0d0d0d;display:flex;flex-direction:column;font-family:Arial,sans-serif;";
    // Inject helper CSS
    const style = document.createElement("style");
    style.textContent = `
      .tbe_btn{background:rgba(255,255,255,.08);color:rgba(255,255,255,.75);font-size:12px;font-weight:bold;
        padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.18);cursor:pointer;width:100%;}
      .tbe_btn:hover{background:rgba(255,255,255,.13);}
      .tbe_sec{color:rgba(255,255,255,.38);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;}
    `;
    document.head.appendChild(style);
    this._styleEl = style;
    document.body.appendChild(this.el);
    this._load();
  }

  private async _load() {
    try {
      const r = await fetch(`${SB}/global_settings?key=eq.title_bg&select=value`, { headers: H });
      const rows: { value: string }[] = await r.json();
      if (rows[0]?.value) {
        try { this.config = JSON.parse(rows[0].value); } catch { /* old plain-css string — ignore */ }
      }
    } catch { /* ignore */ }
    this._render();
  }

  private _uid(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  private _render() {
    const sel = this.config.elements.find(e => e.id === this.selectedId) ?? null;
    if (!sel) this.selectedId = null;

    this.el.innerHTML = `
      <!-- ── Top bar ─────────────────────────────────────────────────────── -->
      <div style="display:flex;align-items:center;gap:8px;padding:9px 14px;
        background:#111;border-bottom:2px solid rgba(255,255,255,0.09);flex-shrink:0;">
        <span style="color:white;font-size:15px;font-weight:900;letter-spacing:.5px;">🎨 Title Screen Editor</span>
        <div style="flex:1"></div>
        <button id="tbe_save" style="background:rgba(0,220,100,.25);color:#66ffaa;font-size:13px;font-weight:bold;
          padding:7px 18px;border-radius:9px;border:1px solid rgba(0,220,100,.5);cursor:pointer;">
          💾 Save & Apply to Everyone
        </button>
        <button id="tbe_reset" style="background:rgba(255,80,80,.14);color:#ff8888;font-size:12px;
          padding:7px 12px;border-radius:9px;border:1px solid rgba(255,80,80,.3);cursor:pointer;">
          ↺ Reset All
        </button>
        <button id="tbe_close" style="background:rgba(255,255,255,.07);color:rgba(255,255,255,.55);
          font-size:12px;padding:7px 12px;border-radius:9px;border:1px solid rgba(255,255,255,.18);cursor:pointer;">
          ✕ Close
        </button>
      </div>

      <!-- ── Body ───────────────────────────────────────────────────────── -->
      <div style="display:flex;flex:1;overflow:hidden;">

        <!-- Left panel -->
        <div style="width:230px;background:#111;border-right:2px solid rgba(255,255,255,.07);
          display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;">
          <div style="display:flex;border-bottom:1px solid rgba(255,255,255,.09);flex-shrink:0;">
            ${(["bg","add","edit"] as const).map(t => `
              <button class="tbe_tab" data-tab="${t}" style="flex:1;padding:9px 4px;font-size:11px;font-weight:bold;
                cursor:pointer;border:none;letter-spacing:.5px;
                background:${this.tab===t?"rgba(255,255,255,.11)":"transparent"};
                color:${this.tab===t?"white":"rgba(255,255,255,.38)"};
                border-bottom:2px solid ${this.tab===t?"#66eeff":"transparent"};">
                ${t==="bg"?"🎨 BG":t==="add"?"➕ Add":"✏️ Edit"}
              </button>`).join("")}
          </div>
          <div style="overflow-y:auto;flex:1;">
            ${this.tab==="bg"  ? this._bgPanel()       : ""}
            ${this.tab==="add" ? this._addPanel()      : ""}
            ${this.tab==="edit"? this._editPanel(sel)  : ""}
          </div>
        </div>

        <!-- Canvas area -->
        <div style="flex:1;display:flex;align-items:center;justify-content:center;
          background:#1a1a1a;overflow:hidden;position:relative;" id="tbe_canvasWrap">
          <div id="tbe_canvas" style="
            position:relative;
            width:min(88%,420px);
            aspect-ratio:9/16;
            overflow:hidden;
            border-radius:12px;
            box-shadow:0 0 0 2px rgba(255,255,255,.18),0 8px 40px rgba(0,0,0,.7);
            background:${this.config.bg};
            cursor:default;">
            ${this.config.elements.map(e => this._elHTML(e)).join("")}
          </div>
          <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
            color:rgba(255,255,255,.28);font-size:11px;pointer-events:none;white-space:nowrap;">
            Click to select · Drag to move
          </div>
        </div>

        <!-- Layers panel -->
        <div style="width:170px;background:#111;border-left:2px solid rgba(255,255,255,.07);
          display:flex;flex-direction:column;overflow:hidden;flex-shrink:0;">
          <div style="padding:9px 12px;color:rgba(255,255,255,.3);font-size:10px;
            letter-spacing:1.5px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;">
            Layers
          </div>
          <div style="overflow-y:auto;flex:1;">
            ${!this.config.elements.length
              ? `<div style="padding:16px;color:rgba(255,255,255,.22);font-size:11px;text-align:center;margin-top:12px;">
                  No elements.<br>Use ➕ Add.
                 </div>`
              : [...this.config.elements].reverse().map(e => `
                <div class="tbe_layer" data-id="${e.id}" style="
                  display:flex;align-items:center;gap:6px;padding:7px 10px;cursor:pointer;
                  background:${e.id===this.selectedId?"rgba(0,200,255,.1)":"transparent"};
                  border-left:3px solid ${e.id===this.selectedId?"#66eeff":"transparent"};
                  border-bottom:1px solid rgba(255,255,255,.05);">
                  <span style="font-size:15px;flex-shrink:0;">${e.type==="text"?"🔤":e.content}</span>
                  <span style="color:rgba(255,255,255,.55);font-size:11px;flex:1;
                    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    ${e.type==="text"?e.content.slice(0,14):e.type}
                  </span>
                  <button class="tbe_layerDel" data-id="${e.id}"
                    style="background:rgba(255,60,60,.15);color:#ff8888;border:none;
                    border-radius:5px;padding:1px 6px;cursor:pointer;font-size:11px;flex-shrink:0;">✕</button>
                </div>`).join("")}
          </div>
        </div>
      </div>
    `;

    this._wire();
  }

  // ── Panel builders ────────────────────────────────────────────────────────

  private _bgPanel(): string {
    return `<div style="padding:14px;display:flex;flex-direction:column;gap:11px;">

      <div class="tbe_sec">Solid Color</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="tbe_solid" type="color" value="#1a0a3e"
          style="width:46px;height:34px;border:none;border-radius:8px;cursor:pointer;flex-shrink:0;" />
        <button id="tbe_applySolid" class="tbe_btn">Use Solid</button>
      </div>

      <div class="tbe_sec" style="margin-top:4px;">Gradient</div>
      <div style="display:flex;gap:5px;">
        ${["tbe_gc1","tbe_gc2","tbe_gc3"].map((id,i)=>`
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;">
            <div style="color:rgba(255,255,255,.32);font-size:9px;">${["Top","Mid","Bot"][i]}</div>
            <input id="${id}" type="color" value="${["#1a0a3e","#3a106f","#6a20a0"][i]}"
              style="width:100%;height:30px;border:none;border-radius:6px;cursor:pointer;" />
          </div>`).join("")}
      </div>
      <select id="tbe_gradDir" style="background:#1e1e1e;color:rgba(255,255,255,.7);
        border:1px solid rgba(255,255,255,.14);border-radius:7px;padding:7px;font-size:12px;outline:none;cursor:pointer;">
        <option value="160deg">↗ Diagonal</option>
        <option value="180deg">↓ Vertical</option>
        <option value="90deg">→ Horizontal</option>
        <option value="135deg">↘ Diagonal 2</option>
        <option value="45deg">↗ Diagonal 3</option>
      </select>
      <button id="tbe_applyGrad" class="tbe_btn" style="background:rgba(100,120,255,.22);color:#aab0ff;
        border-color:rgba(100,120,255,.4);">Use Gradient</button>

      <div class="tbe_sec" style="margin-top:4px;">Quick Presets</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">
        ${[
          {e:"🌌",v:"linear-gradient(160deg,#1a0a3e,#3a106f,#6a20a0)"},
          {e:"🌅",v:"linear-gradient(160deg,#1a0020,#8b0000,#ff6600)"},
          {e:"🌊",v:"linear-gradient(160deg,#001a3e,#003a7f,#0066cc)"},
          {e:"🌲",v:"linear-gradient(160deg,#001a00,#003a10,#006620)"},
          {e:"🔥",v:"linear-gradient(160deg,#1a0000,#660000,#cc3300,#ff6600)"},
          {e:"🌸",v:"linear-gradient(160deg,#2a0a1a,#6a1040,#cc4488)"},
          {e:"🌙",v:"linear-gradient(160deg,#000010,#000025,#000040)"},
          {e:"🌈",v:"linear-gradient(160deg,#1a0040,#400080,#0040a0,#004000,#804000,#800000)"},
          {e:"☁️", v:"linear-gradient(180deg,#87CEEB,#b8e4f9,#dff0fb)"},
          {e:"🍊",v:"linear-gradient(160deg,#1a0f00,#603800,#cc8800,#ffcc00)"},
          {e:"❄️", v:"linear-gradient(160deg,#00101a,#002040,#0040a0,#c0e0ff)"},
          {e:"🍇",v:"linear-gradient(160deg,#0d0020,#220044,#440088,#8800cc)"},
          {e:"⬛",v:"#000000"},
          {e:"⬜",v:"#ffffff"},
          {e:"🩶",v:"linear-gradient(160deg,#111,#333,#555)"},
        ].map(p=>`<button class="tbe_preset" data-v="${p.v}"
          style="font-size:20px;padding:5px;border-radius:8px;cursor:pointer;
          background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);">${p.e}</button>`).join("")}
      </div>
    </div>`;
  }

  private _addPanel(): string {
    const emojis = [
      "🔥","💀","😂","🎉","❤️","👑","😱","🤯","💯","🥶","😤","🫡","💸","🎮","⚡","🏆",
      "👏","🤣","😈","💥","✨","🌟","⭐","🎊","🎈","🎁","🍕","🍔","🎵","🎶","🦋","🌸",
      "🌺","🌻","🦊","🐉","🦁","🐺","💎","🔮","🌙","☀️","🌈","❄️","🌊","🍀","🪐","🚀",
      "👾","🎯","🪄","🧨","💣","🎀","🧸","🪅","🎸","🥁","🎹","🎺","🦄","🐸","👻","💫",
    ];
    return `<div style="padding:14px;display:flex;flex-direction:column;gap:11px;">

      <div class="tbe_sec">Text</div>
      <input id="tbe_textVal" type="text" maxlength="80" placeholder="Type something…"
        style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);
        border-radius:8px;color:white;font-size:13px;padding:8px 10px;outline:none;" />
      <div style="display:flex;gap:6px;">
        <input id="tbe_textColor" type="color" value="#ffffff"
          style="width:40px;height:34px;border:none;border-radius:7px;cursor:pointer;flex-shrink:0;" />
        <input id="tbe_textSize" type="number" min="8" max="200" value="36"
          style="width:60px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);
          border-radius:7px;color:white;font-size:13px;padding:6px 8px;outline:none;" />
        <button id="tbe_addText" class="tbe_btn" style="flex:1;background:rgba(100,200,255,.18);
          color:#66ddff;border-color:rgba(100,200,255,.4);">T Add Text</button>
      </div>

      <div class="tbe_sec" style="margin-top:4px;">Emoji / Props</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;max-height:160px;overflow-y:auto;">
        ${emojis.map(e=>`<button class="tbe_addEmoji" data-e="${e}"
          style="font-size:22px;padding:3px 5px;border-radius:7px;cursor:pointer;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);">${e}</button>`).join("")}
      </div>

      <div class="tbe_sec" style="margin-top:4px;">Shapes</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">
        ${[
          {s:"circle",  label:"⬤ Circle"},
          {s:"square",  label:"■ Square"},
          {s:"triangle",label:"▲ Triangle"},
          {s:"diamond", label:"◆ Diamond"},
          {s:"star",    label:"★ Star"},
          {s:"bar",     label:"▬ Bar"},
        ].map(x=>`<button class="tbe_addShape" data-s="${x.s}"
          style="flex:1;min-width:70px;padding:7px 4px;border-radius:7px;cursor:pointer;
          font-size:11px;background:rgba(255,255,255,.06);color:white;border:1px solid rgba(255,255,255,.14);">
          ${x.label}
        </button>`).join("")}
      </div>
    </div>`;
  }

  private _editPanel(el: BgElement | null): string {
    if (!el) return `<div style="padding:18px;color:rgba(255,255,255,.22);font-size:12px;
      text-align:center;margin-top:16px;">Select an element<br>on the canvas.</div>`;

    return `<div style="padding:14px;display:flex;flex-direction:column;gap:10px;">

      ${el.type==="text"?`
        <div class="tbe_sec">Text Content</div>
        <input id="ep_content" type="text" value="${el.content.replace(/"/g,"&quot;")}" maxlength="80"
          style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);
          border-radius:8px;color:white;font-size:13px;padding:7px 10px;outline:none;" />
      `:el.type==="emoji"?`
        <div class="tbe_sec">Emoji</div>
        <input id="ep_content" type="text" value="${el.content}" maxlength="4"
          style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);
          border-radius:8px;color:white;font-size:26px;padding:6px 10px;outline:none;width:60px;" />
      `:""}

      <div class="tbe_sec">Color</div>
      <input id="ep_color" type="color" value="${el.color}"
        style="width:100%;height:34px;border:none;border-radius:8px;cursor:pointer;" />

      <div class="tbe_sec">Size — <span id="ep_sizeV">${el.size}</span>px</div>
      <input id="ep_size" type="range" min="6" max="300" value="${el.size}" style="width:100%;" />

      <div class="tbe_sec">Opacity — <span id="ep_opV">${Math.round(el.opacity*100)}</span>%</div>
      <input id="ep_opacity" type="range" min="0" max="100" value="${Math.round(el.opacity*100)}" style="width:100%;" />

      <div class="tbe_sec">Rotation — <span id="ep_rotV">${el.rotate}</span>°</div>
      <input id="ep_rotate" type="range" min="-180" max="180" value="${el.rotate}" style="width:100%;" />

      <div class="tbe_sec">Position X — <span id="ep_xV">${Math.round(el.x)}</span>%</div>
      <input id="ep_x" type="range" min="0" max="100" value="${Math.round(el.x)}" style="width:100%;" />

      <div class="tbe_sec">Position Y — <span id="ep_yV">${Math.round(el.y)}</span>%</div>
      <input id="ep_y" type="range" min="0" max="100" value="${Math.round(el.y)}" style="width:100%;" />

      ${el.type==="text"?`
        <div style="display:flex;gap:5px;margin-top:2px;">
          <button id="ep_bold" style="flex:1;padding:7px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:900;
            background:${el.bold?"rgba(255,255,255,.22)":"rgba(255,255,255,.06)"};
            color:${el.bold?"white":"rgba(255,255,255,.4)"};border:1px solid rgba(255,255,255,.15);">B</button>
          <button id="ep_italic" style="flex:1;padding:7px;border-radius:7px;cursor:pointer;font-size:13px;font-style:italic;
            background:${el.italic?"rgba(255,255,255,.22)":"rgba(255,255,255,.06)"};
            color:${el.italic?"white":"rgba(255,255,255,.4)"};border:1px solid rgba(255,255,255,.15);">I</button>
          <button id="ep_shadow" style="flex:1;padding:7px;border-radius:7px;cursor:pointer;font-size:11px;
            background:${el.shadow?"rgba(255,255,255,.22)":"rgba(255,255,255,.06)"};
            color:${el.shadow?"white":"rgba(255,255,255,.4)"};border:1px solid rgba(255,255,255,.15);">✦</button>
        </div>
      `:""}

      <button id="ep_dup" style="background:rgba(100,200,100,.15);color:#88ddaa;font-size:12px;
        padding:8px;border-radius:8px;border:1px solid rgba(100,200,100,.3);cursor:pointer;margin-top:2px;">
        ⧉ Duplicate
      </button>
      <button id="ep_del" style="background:rgba(255,50,50,.15);color:#ff8888;font-size:12px;font-weight:bold;
        padding:8px;border-radius:8px;border:1px solid rgba(255,50,50,.3);cursor:pointer;">
        🗑 Delete
      </button>
    </div>`;
  }

  // ── Element HTML renderer ─────────────────────────────────────────────────

  private _elHTML(e: BgElement): string {
    const sel = e.id === this.selectedId;
    const base = `position:absolute;left:${e.x}%;top:${e.y}%;
      transform:translate(-50%,-50%) rotate(${e.rotate}deg);
      opacity:${e.opacity};cursor:pointer;user-select:none;
      outline:${sel?"2px solid #66eeff":"2px solid transparent"};
      outline-offset:4px;border-radius:3px;`;

    if (e.type==="text") return `<div class="tbe_el" data-id="${e.id}" style="${base}
      font-size:${e.size}px;color:${e.color};font-weight:${e.bold?"900":"400"};
      font-style:${e.italic?"italic":"normal"};white-space:nowrap;
      text-shadow:${e.shadow?"0 2px 12px rgba(0,0,0,.9),0 0 30px rgba(0,0,0,.5)":"none"};
      pointer-events:all;">${e.content}</div>`;

    if (e.type==="emoji") return `<div class="tbe_el" data-id="${e.id}" style="${base}
      font-size:${e.size}px;line-height:1;pointer-events:all;">${e.content}</div>`;

    if (e.type==="shape") return `<div class="tbe_el" data-id="${e.id}" style="${base}pointer-events:all;">
      ${this._shapeDiv(e.content, e.size, e.color)}</div>`;

    return "";
  }

  private _shapeDiv(shape: string, size: number, color: string): string {
    if (shape==="circle")   return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};"></div>`;
    if (shape==="square")   return `<div style="width:${size}px;height:${size}px;background:${color};border-radius:4px;"></div>`;
    if (shape==="triangle") return `<div style="width:0;height:0;border-left:${size/2}px solid transparent;border-right:${size/2}px solid transparent;border-bottom:${size}px solid ${color};"></div>`;
    if (shape==="diamond")  return `<div style="width:${size*.7}px;height:${size*.7}px;background:${color};transform:rotate(45deg);border-radius:3px;"></div>`;
    if (shape==="star")     return `<div style="font-size:${size}px;line-height:1;color:${color};">★</div>`;
    if (shape==="bar")      return `<div style="width:${size*2}px;height:${size*.25}px;background:${color};border-radius:${size*.12}px;"></div>`;
    return `<div style="width:${size}px;height:${size}px;background:${color};"></div>`;
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  private _wire() {
    const $  = (id: string) => document.getElementById(id);
    const el = (sel: string) => this.el.querySelector<HTMLElement>(sel);

    // Top bar
    $("tbe_close")!.onclick  = () => { this._applyToLiveScreen(); this.el.remove(); this._styleEl.remove(); this.onClose(); };
    $("tbe_reset")!.onclick  = () => { if (!confirm("Reset everything?")) return; this.config={bg:DEFAULT_BG,elements:[]}; this.selectedId=null; this._render(); };
    $("tbe_save")!.onclick   = () => this._save();

    // Tabs
    this.el.querySelectorAll<HTMLButtonElement>(".tbe_tab").forEach(b => {
      b.onclick = () => { this.tab = b.dataset.tab as any; this._render(); };
    });

    // Layer rows
    this.el.querySelectorAll<HTMLElement>(".tbe_layer").forEach(row => {
      row.onclick = ev => {
        if ((ev.target as HTMLElement).classList.contains("tbe_layerDel")) return;
        this.selectedId = row.dataset.id!;
        this.tab = "edit";
        this._render();
      };
    });
    this.el.querySelectorAll<HTMLButtonElement>(".tbe_layerDel").forEach(b => {
      b.onclick = ev => { ev.stopPropagation(); this._deleteEl(b.dataset.id!); };
    });

    // Canvas element click + drag
    const canvas = $("tbe_canvas")!;
    this.el.querySelectorAll<HTMLElement>(".tbe_el").forEach(domEl => {
      domEl.addEventListener("mousedown", ev => {
        ev.stopPropagation();
        const id = domEl.dataset.id!;
        this.selectedId = id;
        this.tab = "edit";
        const rect = canvas.getBoundingClientRect();
        const cfg  = this.config.elements.find(x => x.id===id)!;
        this.dragging   = { id };
        this.dragOffset = {
          x: ev.clientX - rect.left - (cfg.x/100)*rect.width,
          y: ev.clientY - rect.top  - (cfg.y/100)*rect.height,
        };
        this._render();
      });
    });
    canvas.addEventListener("mousedown", () => {
      if (!this.dragging) { this.selectedId=null; this._render(); }
    });

    window.addEventListener("mousemove", ev => {
      if (!this.dragging) return;
      const rect  = canvas.getBoundingClientRect();
      const cfg   = this.config.elements.find(x=>x.id===this.dragging!.id);
      if (!cfg) return;
      cfg.x = Math.max(0, Math.min(100, ((ev.clientX - rect.left - this.dragOffset.x) / rect.width ) * 100));
      cfg.y = Math.max(0, Math.min(100, ((ev.clientY - rect.top  - this.dragOffset.y) / rect.height) * 100));
      const domEl = canvas.querySelector<HTMLElement>(`.tbe_el[data-id="${cfg.id}"]`);
      if (domEl) { domEl.style.left=`${cfg.x}%`; domEl.style.top=`${cfg.y}%`; }
      // sync sliders if edit panel open
      const xSlider = $("ep_x") as HTMLInputElement | null;
      const ySlider = $("ep_y") as HTMLInputElement | null;
      if (xSlider) { xSlider.value=String(Math.round(cfg.x)); const v=$("ep_xV"); if(v) v.textContent=String(Math.round(cfg.x)); }
      if (ySlider) { ySlider.value=String(Math.round(cfg.y)); const v=$("ep_yV"); if(v) v.textContent=String(Math.round(cfg.y)); }
    });
    window.addEventListener("mouseup", () => { this.dragging=null; });

    // ── BG panel ──────────────────────────────────────────────────────────
    $("tbe_applySolid")?.addEventListener("click", () => {
      this.config.bg = ($("tbe_solid") as HTMLInputElement).value;
      canvas.style.background = this.config.bg;
    });
    $("tbe_applyGrad")?.addEventListener("click", () => {
      const c1  = ($("tbe_gc1") as HTMLInputElement).value;
      const c2  = ($("tbe_gc2") as HTMLInputElement).value;
      const c3  = ($("tbe_gc3") as HTMLInputElement).value;
      const dir = ($("tbe_gradDir") as HTMLSelectElement).value;
      this.config.bg = `linear-gradient(${dir},${c1},${c2},${c3})`;
      canvas.style.background = this.config.bg;
    });
    this.el.querySelectorAll<HTMLButtonElement>(".tbe_preset").forEach(b => {
      b.onclick = () => { this.config.bg = b.dataset.v!; canvas.style.background=this.config.bg; };
    });

    // ── Add panel ─────────────────────────────────────────────────────────
    $("tbe_addText")?.addEventListener("click", () => {
      const content = ($("tbe_textVal") as HTMLInputElement).value.trim() || "Text";
      const size    = parseInt(($("tbe_textSize") as HTMLInputElement).value) || 36;
      const color   = ($("tbe_textColor") as HTMLInputElement).value;
      this._addEl({ type:"text", content, size, color, bold:false, italic:false, shadow:true, opacity:1, rotate:0 });
    });
    this.el.querySelectorAll<HTMLButtonElement>(".tbe_addEmoji").forEach(b => {
      b.onclick = () => this._addEl({ type:"emoji", content:b.dataset.e!, size:52, color:"#ffffff", bold:false, italic:false, shadow:false, opacity:1, rotate:0 });
    });
    this.el.querySelectorAll<HTMLButtonElement>(".tbe_addShape").forEach(b => {
      b.onclick = () => this._addEl({ type:"shape", content:b.dataset.s!, size:80, color:"#6a20a0", bold:false, italic:false, shadow:false, opacity:0.85, rotate:0 });
    });

    // ── Edit panel ────────────────────────────────────────────────────────
    const selEl = this.config.elements.find(e=>e.id===this.selectedId);
    if (selEl) {
      const live = () => this._liveUpdateEl(selEl);

      $("ep_content")?.addEventListener("input", () => {
        selEl.content = ($("ep_content") as HTMLInputElement).value;
        const d = canvas.querySelector<HTMLElement>(`.tbe_el[data-id="${selEl.id}"]`);
        if (d && selEl.type!=="shape") d.textContent=selEl.content;
      });
      const linkSlider = (inputId: string, labelId: string, key: keyof BgElement, scale=1) => {
        const inp = $(inputId) as HTMLInputElement | null;
        const lbl = $(labelId);
        if (!inp) return;
        inp.addEventListener("input", () => {
          const v = parseFloat(inp.value) * scale;
          (selEl as any)[key] = v;
          if (lbl) lbl.textContent = key==="opacity" ? `${Math.round(v*100)}` : String(Math.round(v));
          live();
        });
      };
      linkSlider("ep_size",    "ep_sizeV", "size");
      linkSlider("ep_opacity", "ep_opV",   "opacity", 0.01);
      linkSlider("ep_rotate",  "ep_rotV",  "rotate");
      linkSlider("ep_x",       "ep_xV",    "x");
      linkSlider("ep_y",       "ep_yV",    "y");
      $("ep_color")?.addEventListener("input", () => {
        selEl.color=($("ep_color") as HTMLInputElement).value; live();
      });
      $("ep_bold")?.addEventListener("click",   () => { selEl.bold=!selEl.bold;     this._render(); });
      $("ep_italic")?.addEventListener("click", () => { selEl.italic=!selEl.italic; this._render(); });
      $("ep_shadow")?.addEventListener("click", () => { selEl.shadow=!selEl.shadow; this._render(); });
      $("ep_del")?.addEventListener("click",    () => this._deleteEl(selEl.id));
      $("ep_dup")?.addEventListener("click",    () => {
        const copy: BgElement = { ...selEl, id:this._uid(), x:selEl.x+5, y:selEl.y+5 };
        this.config.elements.push(copy);
        this.selectedId=copy.id;
        this._render();
      });
    }
  }

  private _liveUpdateEl(cfg: BgElement) {
    const canvas = document.getElementById("tbe_canvas")!;
    const d = canvas.querySelector<HTMLElement>(`.tbe_el[data-id="${cfg.id}"]`);
    if (!d) return;
    d.style.left      = `${cfg.x}%`;
    d.style.top       = `${cfg.y}%`;
    d.style.fontSize  = `${cfg.size}px`;
    d.style.color     = cfg.color;
    d.style.opacity   = String(cfg.opacity);
    d.style.transform = `translate(-50%,-50%) rotate(${cfg.rotate}deg)`;
    if (cfg.type==="text") {
      d.style.fontWeight  = cfg.bold ? "900" : "400";
      d.style.fontStyle   = cfg.italic ? "italic" : "normal";
      d.style.textShadow  = cfg.shadow ? "0 2px 12px rgba(0,0,0,.9)" : "none";
    }
    if (cfg.type==="shape") {
      const inner = d.firstElementChild as HTMLElement | null;
      if (inner) inner.style.background = cfg.color;
    }
  }

  private _addEl(partial: Omit<BgElement,"id"|"x"|"y">) {
    const e: BgElement = { id:this._uid(), x:50, y:50, ...partial };
    this.config.elements.push(e);
    this.selectedId = e.id;
    this.tab = "edit";
    this._render();
  }

  private _deleteEl(id: string) {
    this.config.elements = this.config.elements.filter(e=>e.id!==id);
    if (this.selectedId===id) this.selectedId=null;
    this._render();
  }

  private _applyToLiveScreen() {
    const screen = document.querySelector<HTMLElement>(".screen");
    if (!screen) return;
    if (this.config.bg) screen.style.background = this.config.bg;
    // Remove old layer if present
    const old = screen.querySelector(".tbe_live_layer");
    if (old) old.remove();
    if (!this.config.elements.length) return;
    const layer = document.createElement("div");
    layer.className = "tbe_live_layer";
    layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;";
    for (const e of this.config.elements) {
      const d = document.createElement("div");
      d.style.cssText = `position:absolute;left:${e.x}%;top:${e.y}%;transform:translate(-50%,-50%) rotate(${e.rotate}deg);opacity:${e.opacity};pointer-events:none;font-family:Arial,sans-serif;`;
      if (e.type==="text") {
        d.textContent = e.content;
        d.style.fontSize = `${e.size}px`; d.style.color = e.color;
        d.style.fontWeight = e.bold?"900":"400"; d.style.fontStyle = e.italic?"italic":"normal";
        d.style.whiteSpace = "nowrap";
        d.style.textShadow = e.shadow?"0 2px 12px rgba(0,0,0,.9)":"none";
      } else if (e.type==="emoji") {
        d.textContent = e.content; d.style.fontSize=`${e.size}px`; d.style.lineHeight="1";
      } else if (e.type==="shape") {
        const inner = document.createElement("div");
        const shapeMap: Record<string,string> = {
          circle:   `border-radius:50%;background:${e.color};width:${e.size}px;height:${e.size}px;`,
          square:   `background:${e.color};width:${e.size}px;height:${e.size}px;border-radius:4px;`,
          triangle: `width:0;height:0;border-left:${e.size/2}px solid transparent;border-right:${e.size/2}px solid transparent;border-bottom:${e.size}px solid ${e.color};`,
          diamond:  `background:${e.color};width:${e.size*.7}px;height:${e.size*.7}px;transform:rotate(45deg);border-radius:3px;`,
          star:     `font-size:${e.size}px;line-height:1;color:${e.color};`,
          bar:      `background:${e.color};width:${e.size*2}px;height:${e.size*.25}px;border-radius:${e.size*.12}px;`,
        };
        inner.style.cssText = shapeMap[e.content] ?? "";
        if (e.content==="star") inner.textContent = "★";
        d.appendChild(inner);
      }
      layer.appendChild(d);
    }
    screen.insertBefore(layer, screen.firstChild);
  }

  private async _save() {
    const btn = document.getElementById("tbe_save") as HTMLButtonElement;
    btn.textContent = "⏳ Saving…"; btn.disabled=true;
    try {
      const r = await fetch(`${SB}/global_settings`, {
        method:"POST", headers:H,
        body:JSON.stringify({ key:"title_bg", value:JSON.stringify(this.config), updated_at:Date.now() }),
      });
      if (!r.ok) throw new Error();
      this._applyToLiveScreen();
      btn.textContent="✅ Saved!"; btn.style.background="rgba(0,220,100,.4)";
    } catch {
      btn.textContent="❌ Failed"; btn.style.background="rgba(255,50,50,.3)";
    }
    setTimeout(()=>{
      const b=document.getElementById("tbe_save") as HTMLButtonElement|null;
      if(b){b.textContent="💾 Save & Apply to Everyone";b.style.background="rgba(0,220,100,.25)";b.disabled=false;}
    },2200);
  }
}
