import type { Game } from "../game/Game";
import { LEVELS, defaultObjects, type LevelTheme, type RoomObj } from "../game/levelData";
import { newLevelId, publishLevel } from "../game/clockLevels";
import { bumpStat } from "../game/badges";

// The room is 3 screens wide in-game (0–300vw). The editor squeezes that into a
// horizontally-scrolling strip, so 1vw of room = PX_PER_VW editor pixels.
const ROOM_VW    = 300;
const PX_PER_VW  = 7;
const CANVAS_W   = ROOM_VW * PX_PER_VW; // 2100px of scrollable room
const CANVAS_H   = 340;

const SURFACES: Array<RoomObj["surface"]> = ["floor", "shelf1", "shelf2", "wall"];
const SURFACE_LABEL: Record<RoomObj["surface"], string> = {
  floor: "Floor", shelf1: "Top shelf", shelf2: "Low shelf", wall: "Wall",
};

const COLOR_FIELDS: Array<{ key: keyof LevelTheme; label: string }> = [
  { key: "bgTop",    label: "Wall top"    },
  { key: "bgMid",    label: "Wall mid"    },
  { key: "bgBot",    label: "Wall bottom" },
  { key: "ceiling",  label: "Ceiling"     },
  { key: "floorTop", label: "Floor top"   },
  { key: "floorBot", label: "Floor bottom"},
  { key: "rug1",     label: "Rug inner"   },
  { key: "rug2",     label: "Rug outer"   },
  { key: "shelf1",   label: "Shelf top"   },
  { key: "shelf2",   label: "Shelf bottom"},
  { key: "accent",   label: "Accent"      },
];

const EMOJI_PALETTE = [
  "🎮","📦","🧸","🎲","🔮","📗","🏆","🎯","🧩","🎸","🔑","🖼️",
  "🍳","🧺","🥄","🍎","🫖","📖","🏺","🍕","🧁","🫙","🗝️","🍽️",
  "🌸","🪣","🐛","🍄","🌻","🌿","🦋","🌺","🦜","🥚","🦎","🐍",
  "💡","🪟","🪃","🛋️","⏰","🐱","🍪","🪴","🌞","🐝","🍓","🌱",
  "⚽","🎺","🚀","🛸","👑","💎","🧪","🔭","🕹️","📀","🪐","🎃",
];

/** Vertical placement inside the editor canvas — mirrors ExploreScene._surfaceStyle. */
function topPxFor(surface: RoomObj["surface"], size: number): number {
  switch (surface) {
    case "floor":  return CANVAS_H - CANVAS_H * 0.24 - size;
    case "shelf1": return CANVAS_H * 0.28 - size;
    case "shelf2": return CANVAS_H * 0.43 - size;
    case "wall":   return CANVAS_H * 0.14;
  }
}

function toHex(v: string): string {
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  const m = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return "#888888";
  return "#" + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, "0")).join("");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function uid(): string {
  return "o" + Math.random().toString(36).slice(2, 8);
}

export class LevelBuilder {
  private _g: Game;
  private _t: LevelTheme;
  private _objs: RoomObj[];
  private _sel: string | null = null;
  private _name  = "My Room";
  private _emoji = "🏠";

  constructor(game: Game) {
    this._g = game;
    const base = LEVELS[0];
    this._t = { ...base, puzzleEmojis: [...base.puzzleEmojis], dummyEmojis: [...base.dummyEmojis] };
    for (const f of COLOR_FIELDS) (this._t[f.key] as string) = toHex(base[f.key] as string);
    // seed with the stock layout so builders start by moving real objects around
    this._objs = defaultObjects(this._t).map(o => ({ ...o, id: uid() }));

    game._disposeScene = () => { game.ui.innerHTML = ""; };
    this._render();
  }

  // ── Room canvas ───────────────────────────────────────────────────────────
  private _canvasHTML(): string {
    const t = this._t;
    return `
      <div id="lbRoom" style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;flex-shrink:0;
        background:linear-gradient(180deg,${t.bgTop},${t.bgMid},${t.bgBot});cursor:crosshair;">
        <div style="position:absolute;top:0;left:0;right:0;height:13%;background:${t.ceiling};"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:24%;
          background:linear-gradient(180deg,${t.floorTop},${t.floorBot});"></div>
        ${[0, 1, 2].map(i => `
          <div style="position:absolute;bottom:3%;left:${i * 700 + 180}px;width:340px;height:44px;
            border-radius:50%;background:radial-gradient(ellipse,${t.rug1},${t.rug2});"></div>`).join("")}
        <div style="position:absolute;top:28%;left:0;right:0;height:8px;
          background:linear-gradient(180deg,${t.shelf1},${t.shelf2});opacity:0.9;"></div>
        <div style="position:absolute;top:43%;left:0;right:0;height:8px;
          background:linear-gradient(180deg,${t.shelf1},${t.shelf2});opacity:0.9;"></div>
        ${[1, 2].map(i => `
          <div style="position:absolute;top:0;bottom:0;left:${i * 100 * PX_PER_VW}px;width:2px;
            background:rgba(255,255,255,0.14);"></div>
          <div style="position:absolute;top:4px;left:${i * 100 * PX_PER_VW + 6}px;
            color:rgba(255,255,255,0.3);font-size:10px;">screen ${i + 1}</div>`).join("")}
        ${this._objs.map(o => {
          const on = o.id === this._sel;
          return `
            <div class="lbObj" data-id="${o.id}" style="
              position:absolute;left:${o.vw * PX_PER_VW}px;top:${topPxFor(o.surface, o.size)}px;
              font-size:${o.size}px;line-height:1;cursor:grab;user-select:none;touch-action:none;
              ${on ? "outline:2px dashed #c9a6ff;outline-offset:3px;border-radius:6px;" : ""}
            ">${o.emoji}<div style="position:absolute;top:-13px;left:0;font-size:9px;
              color:${o.slot === null ? "rgba(255,255,255,0.35)" : "#c9a6ff"};
              white-space:nowrap;font-family:Arial;">
              ${o.slot === null ? "decoy" : o.slot === 0 ? "12" : String(o.slot)}</div></div>`;
        }).join("")}
      </div>`;
  }

  private _refreshCanvas(): void {
    const el = document.getElementById("lbCanvasWrap");
    if (!el) return;
    const scroll = el.scrollLeft;
    el.innerHTML = this._canvasHTML();
    el.scrollLeft = scroll;
    this._wireCanvas();
    this._refreshInspector();
  }

  // ── Inspector for the selected object ─────────────────────────────────────
  private _inspectorHTML(): string {
    const o = this._objs.find(x => x.id === this._sel);
    const inp = "background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);" +
                "border-radius:8px;color:white;font-size:14px;padding:7px 10px;outline:none;";
    if (!o) {
      return `<div style="color:rgba(255,255,255,0.35);font-size:12px;padding:6px 0;">
        Tap an object in the room to select it, then drag it anywhere.</div>`;
    }
    const used = new Set(this._objs.filter(x => x.id !== o.id && x.slot !== null).map(x => x.slot));
    return `
      <div style="display:flex;flex-direction:column;gap:9px;">
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="lbObjEmoji" type="text" value="${esc(o.emoji)}"
            style="${inp}width:58px;text-align:center;font-size:21px;" />
          <select id="lbObjSurface" style="${inp}flex:1;">
            ${SURFACES.map(s => `<option value="${s}" ${s === o.surface ? "selected" : ""}
              style="background:#1a0630;">${SURFACE_LABEL[s]}</option>`).join("")}
          </select>
          <button id="lbObjDel" style="background:rgba(255,80,80,0.18);color:#ff8888;font-size:12px;
            border:1px solid rgba(255,80,80,0.4);border-radius:8px;padding:8px 12px;cursor:pointer;">
            Delete</button>
        </div>
        <div style="display:flex;gap:9px;align-items:center;">
          <span style="color:rgba(255,255,255,0.5);font-size:11px;min-width:34px;">Size</span>
          <input id="lbObjSize" type="range" min="18" max="110" value="${o.size}" style="flex:1;" />
          <span id="lbObjSizeVal" style="color:rgba(255,255,255,0.6);font-size:11px;
            min-width:34px;">${o.size}px</span>
        </div>
        <div style="display:flex;gap:9px;align-items:center;">
          <span style="color:rgba(255,255,255,0.5);font-size:11px;min-width:34px;">Role</span>
          <select id="lbObjSlot" style="${inp}flex:1;">
            <option value="" ${o.slot === null ? "selected" : ""} style="background:#1a0630;">
              Decoy — no number</option>
            ${Array.from({ length: 12 }, (_, i) => `
              <option value="${i}" ${o.slot === i ? "selected" : ""} ${used.has(i) ? "disabled" : ""}
                style="background:#1a0630;">
                Hides number ${i === 0 ? 12 : i}${used.has(i) ? " (taken)" : ""}</option>`).join("")}
          </select>
        </div>
      </div>`;
  }

  private _refreshInspector(): void {
    const el = document.getElementById("lbInspector");
    if (!el) return;
    el.innerHTML = this._inspectorHTML();
    this._wireInspector();
    const st = document.getElementById("lbStatus");
    if (st) st.innerHTML = this._statusHTML();
  }

  private _statusHTML(): string {
    const filled = new Set(this._objs.filter(o => o.slot !== null).map(o => o.slot));
    const missing = Array.from({ length: 12 }, (_, i) => i).filter(i => !filled.has(i));
    const decoys = this._objs.filter(o => o.slot === null).length;
    return missing.length === 0
      ? `<span style="color:#80ff80;">✓ All 12 numbers hidden</span>
         <span style="color:rgba(255,255,255,0.4);"> · ${decoys} decoys · ${this._objs.length} objects</span>`
      : `<span style="color:#ffbb55;">${12 - missing.length}/12 numbers placed</span>
         <span style="color:rgba(255,255,255,0.4);"> — still need ${
           missing.map(i => (i === 0 ? 12 : i)).join(", ")}</span>`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  private _render(): void {
    const t = this._t;
    const card = "background:rgba(0,0,0,0.32);border:1px solid rgba(255,255,255,0.12);" +
                 "border-radius:14px;padding:13px;display:flex;flex-direction:column;gap:9px;";
    const lbl  = "color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.5px;text-transform:uppercase;";
    const inp  = "background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);" +
                 "border-radius:8px;color:white;font-size:14px;padding:8px 11px;outline:none;width:100%;";

    this._g.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#12002e,#241055,#0d0128);
        flex-direction:column;overflow-y:auto;justify-content:flex-start;padding:18px 12px 44px;">

        <h2 style="color:#c9a6ff;font-size:24px;margin:2px 0 2px;
          text-shadow:0 0 16px rgba(160,100,255,0.5);">🛠️ Level Builder</h2>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 14px;text-align:center;">
          Drag objects anywhere in the room. Scroll sideways — the room is 3 screens wide.
        </p>

        <div style="width:100%;max-width:900px;display:flex;flex-direction:column;gap:12px;">

          <div style="${card}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <div style="${lbl}">The room — drag to place</div>
              <div id="lbStatus" style="font-size:11px;text-align:right;">${this._statusHTML()}</div>
            </div>
            <div id="lbCanvasWrap" style="width:100%;overflow-x:auto;overflow-y:hidden;
              border-radius:11px;border:1px solid rgba(255,255,255,0.14);">
              ${this._canvasHTML()}
            </div>
            <div style="display:flex;gap:7px;flex-wrap:wrap;">
              <button id="lbAddPuzzle" style="background:rgba(160,100,255,0.22);color:#c9a6ff;
                font-size:12px;font-weight:bold;border:1px solid rgba(160,100,255,0.45);
                border-radius:8px;padding:8px 12px;cursor:pointer;">+ Number object</button>
              <button id="lbAddDecoy" style="background:rgba(255,255,255,0.08);
                color:rgba(255,255,255,0.7);font-size:12px;border:1px solid rgba(255,255,255,0.18);
                border-radius:8px;padding:8px 12px;cursor:pointer;">+ Decoy</button>
              <button id="lbReset" style="background:rgba(255,255,255,0.06);
                color:rgba(255,255,255,0.5);font-size:12px;border:1px solid rgba(255,255,255,0.14);
                border-radius:8px;padding:8px 12px;cursor:pointer;">↺ Reset layout</button>
            </div>
          </div>

          <div style="${card}">
            <div style="${lbl}">Selected object</div>
            <div id="lbInspector">${this._inspectorHTML()}</div>
            <div style="${lbl};margin-top:3px;">Emoji palette</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px;max-height:112px;overflow-y:auto;">
              ${EMOJI_PALETTE.map(e => `
                <button class="lbPick" data-e="${e}" style="background:rgba(255,255,255,0.07);
                  border:1px solid rgba(255,255,255,0.12);border-radius:8px;font-size:18px;
                  width:36px;height:36px;cursor:pointer;line-height:1;">${e}</button>`).join("")}
            </div>
          </div>

          <div style="${card}">
            <div style="${lbl}">Level name &amp; icon</div>
            <div style="display:flex;gap:9px;">
              <input id="lbEmoji" type="text" value="${esc(this._emoji)}"
                style="${inp}width:62px;text-align:center;font-size:21px;" />
              <input id="lbName" type="text" maxlength="28" value="${esc(this._name)}"
                placeholder="Room name" style="${inp}" />
            </div>
          </div>

          <div style="${card}">
            <div style="${lbl}">Room colours</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:8px;">
              ${COLOR_FIELDS.map(f => `
                <label style="display:flex;align-items:center;gap:8px;
                  background:rgba(255,255,255,0.05);border-radius:9px;padding:6px 9px;cursor:pointer;">
                  <input type="color" class="lbColor" data-key="${f.key}"
                    value="${toHex(t[f.key] as string)}"
                    style="width:25px;height:25px;border:none;background:none;padding:0;cursor:pointer;" />
                  <span style="color:rgba(255,255,255,0.7);font-size:11px;">${f.label}</span>
                </label>`).join("")}
            </div>
          </div>

          <div id="lbFb" style="color:#80ff80;font-size:13px;min-height:17px;text-align:center;"></div>

          <div style="display:flex;gap:9px;flex-wrap:wrap;">
            <button id="lbTest" style="flex:1;min-width:120px;background:rgba(255,255,255,0.1);
              color:rgba(255,255,255,0.8);font-size:14px;font-weight:bold;
              border:1px solid rgba(255,255,255,0.22);border-radius:11px;padding:12px;cursor:pointer;">
              ▶ Test Play</button>
            <button id="lbPublish" style="flex:2;min-width:150px;background:rgba(160,100,255,0.28);
              color:#c9a6ff;font-size:15px;font-weight:bold;border:2px solid rgba(160,100,255,0.55);
              border-radius:11px;padding:12px;cursor:pointer;">🌍 Publish Online</button>
          </div>

          <button id="lbBack" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.55);
            font-size:13px;padding:10px;border-radius:11px;border:1px solid rgba(255,255,255,0.16);
            cursor:pointer;">← Back</button>
        </div>
      </div>`;

    this._wireCanvas();
    this._wireInspector();
    this._wireGlobal();
  }

  // ── Wiring ────────────────────────────────────────────────────────────────
  private _wireCanvas(): void {
    const wrap = document.getElementById("lbCanvasWrap");
    if (!wrap) return;

    document.querySelectorAll<HTMLElement>(".lbObj").forEach(el => {
      el.onpointerdown = ev => {
        ev.preventDefault();
        const id = el.dataset.id!;
        const o = this._objs.find(x => x.id === id);
        if (!o) return;
        this._sel = id;
        this._refreshInspector();
        document.querySelectorAll<HTMLElement>(".lbObj").forEach(x => {
          x.style.outline = x.dataset.id === id ? "2px dashed #c9a6ff" : "";
          x.style.outlineOffset = x.dataset.id === id ? "3px" : "";
        });

        const startX = ev.clientX;
        const startVw = o.vw;
        el.setPointerCapture(ev.pointerId);
        el.style.cursor = "grabbing";

        const move = (e: PointerEvent) => {
          const dVw = (e.clientX - startX) / PX_PER_VW;
          o.vw = Math.max(0, Math.min(ROOM_VW - 2, startVw + dVw));
          el.style.left = `${o.vw * PX_PER_VW}px`;
        };
        const up = () => {
          el.style.cursor = "grab";
          el.onpointermove = null;
          el.onpointerup = null;
        };
        el.onpointermove = move;
        el.onpointerup = up;
      };
    });
  }

  private _wireInspector(): void {
    const o = this._objs.find(x => x.id === this._sel);
    if (!o) return;

    const emoji = document.getElementById("lbObjEmoji") as HTMLInputElement | null;
    if (emoji) emoji.oninput = () => { o.emoji = emoji.value; this._refreshCanvas(); };

    const surf = document.getElementById("lbObjSurface") as HTMLSelectElement | null;
    if (surf) surf.onchange = () => { o.surface = surf.value as RoomObj["surface"]; this._refreshCanvas(); };

    const size = document.getElementById("lbObjSize") as HTMLInputElement | null;
    if (size) size.oninput = () => {
      o.size = +size.value;
      const v = document.getElementById("lbObjSizeVal");
      if (v) v.textContent = `${o.size}px`;
      this._refreshCanvas();
    };

    const slot = document.getElementById("lbObjSlot") as HTMLSelectElement | null;
    if (slot) slot.onchange = () => {
      o.slot = slot.value === "" ? null : +slot.value;
      if (o.slot === null && !o.msg) o.msg = `${o.emoji} Nothing here...`;
      this._refreshCanvas();
    };

    const del = document.getElementById("lbObjDel");
    if (del) del.onclick = () => {
      this._objs = this._objs.filter(x => x.id !== o.id);
      this._sel = null;
      this._refreshCanvas();
    };
  }

  private _wireGlobal(): void {
    const g = this._g;
    const fb = (msg: string, ok = true) => {
      const el = document.getElementById("lbFb");
      if (!el) return;
      el.style.color = ok ? "#80ff80" : "#ff8888";
      el.textContent = msg;
    };

    document.querySelectorAll<HTMLInputElement>(".lbColor").forEach(el => {
      el.oninput = () => {
        (this._t[el.dataset.key as keyof LevelTheme] as string) = el.value;
        this._refreshCanvas();
      };
    });

    document.querySelectorAll<HTMLButtonElement>(".lbPick").forEach(btn => {
      btn.onclick = () => {
        const o = this._objs.find(x => x.id === this._sel);
        if (!o) { fb("Select an object in the room first.", false); return; }
        o.emoji = btn.dataset.e!;
        fb("");
        this._refreshCanvas();
      };
    });

    const firstFree = (): number | null => {
      const used = new Set(this._objs.filter(o => o.slot !== null).map(o => o.slot));
      for (let i = 0; i < 12; i++) if (!used.has(i)) return i;
      return null;
    };

    // drop new objects at the left edge of whatever part of the room is on screen
    const visibleVw = (): number => {
      const w = document.getElementById("lbCanvasWrap");
      return w ? Math.min(ROOM_VW - 4, w.scrollLeft / PX_PER_VW + 6) : 6;
    };

    document.getElementById("lbAddPuzzle")!.onclick = () => {
      const slot = firstFree();
      if (slot === null) { fb("All 12 numbers are already placed.", false); return; }
      const o: RoomObj = { id: uid(), emoji: "📦", vw: visibleVw(), surface: "floor", size: 48, slot };
      this._objs.push(o);
      this._sel = o.id;
      fb("");
      this._refreshCanvas();
    };

    document.getElementById("lbAddDecoy")!.onclick = () => {
      const o: RoomObj = {
        id: uid(), emoji: "🪴", vw: visibleVw(), surface: "floor", size: 44,
        slot: null, msg: "🪴 Nothing here...",
      };
      this._objs.push(o);
      this._sel = o.id;
      fb("");
      this._refreshCanvas();
    };

    document.getElementById("lbReset")!.onclick = () => {
      if (!confirm("Reset every object back to the default layout?")) return;
      this._objs = defaultObjects(this._t).map(x => ({ ...x, id: uid() }));
      this._sel = null;
      this._refreshCanvas();
    };

    (document.getElementById("lbName")  as HTMLInputElement).oninput = e =>
      { this._name = (e.target as HTMLInputElement).value; };
    (document.getElementById("lbEmoji") as HTMLInputElement).oninput = e =>
      { this._emoji = (e.target as HTMLInputElement).value; };

    document.getElementById("lbTest")!.onclick = () => {
      const err = this._validate();
      if (err) { fb(`❌ ${err}`, false); return; }
      g.playCommunityLevel(this._theme(), this._name.trim() || "Untitled");
    };

    document.getElementById("lbBack")!.onclick = () => g.goArcade();

    const pubBtn = document.getElementById("lbPublish") as HTMLButtonElement;
    pubBtn.onclick = () => {
      const err = this._validate();
      if (err) { fb(`❌ ${err}`, false); return; }
      pubBtn.disabled = true;
      pubBtn.textContent = "Publishing…";
      fb("");
      publishLevel(
        {
          id:         newLevelId(),
          authorId:   g.currentAccountId ?? "",
          authorName: g.state.username || "Anonymous",
          name:       this._name.trim(),
          emoji:      this._emoji.trim() || "🏠",
        },
        this._theme(),
      ).then(ok => {
        pubBtn.disabled = false;
        pubBtn.textContent = "🌍 Publish Online";
        if (ok) {
          bumpStat("levelsPublished");
          g.checkBadges();
          fb("✓ Published! Every player can find it under Community Levels.");
          setTimeout(() => g.goCommunityLevels(), 1200);
        } else {
          fb("❌ Couldn't reach the server — try again.", false);
        }
      });
    };
  }

  /** A level is only playable if every clock number is hidden behind something. */
  private _validate(): string | null {
    if (!this._name.trim()) return "Give your level a name first.";
    const filled = new Set(this._objs.filter(o => o.slot !== null).map(o => o.slot));
    const missing = Array.from({ length: 12 }, (_, i) => i).filter(i => !filled.has(i));
    if (missing.length) {
      return `Still need objects hiding number ${missing.map(i => (i === 0 ? 12 : i)).join(", ")}.`;
    }
    if (this._objs.some(o => !o.emoji.trim())) return "Every object needs an emoji.";
    return null;
  }

  private _theme(): LevelTheme {
    return {
      ...this._t,
      name:  this._name.trim() || "Untitled",
      emoji: this._emoji.trim() || "🏠",
      puzzleEmojis: [...this._t.puzzleEmojis],
      dummyEmojis:  [...this._t.dummyEmojis],
      objects: this._objs.map(o => ({ ...o })),
    };
  }
}
