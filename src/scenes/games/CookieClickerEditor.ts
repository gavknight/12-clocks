import type { Game } from "../../game/Game";

type Tool = "golden" | "click_boost" | "coins" | "frenzy" | "storm" | "cps";

const TOOLS: { id: Tool; emoji: string; label: string; desc: string }[] = [
  { id: "golden",      emoji: "🍪", label: "Golden Cookie", desc: "Click anywhere to place a golden cookie right there" },
  { id: "click_boost", emoji: "✨", label: "+$/click",       desc: "Buttons below to boost click value" },
  { id: "coins",       emoji: "💰", label: "Drop Cookies",   desc: "Buttons below to drop cookies" },
  { id: "frenzy",      emoji: "🔥", label: "Frenzy",         desc: "Click the button to trigger 7× CPS frenzy" },
  { id: "storm",       emoji: "🍪🍪", label: "Cookie Storm", desc: "Unleash a cookie storm" },
  { id: "cps",         emoji: "📈", label: "Instant CPS",    desc: "Instantly give N seconds worth of CPS" },
];

export class CookieClickerEditor {
  private _overlay: HTMLDivElement;
  private _active = true;
  private _tool: Tool = "golden";
  private _game: Game;

  constructor(_game: Game) {
    this._game = _game;
    this._overlay = document.createElement("div");
    this._overlay.style.cssText =
      "position:fixed;inset:0;z-index:99998;font-family:Arial,sans-serif;";

    // Transparent click-pass layer — only intercepts in golden mode
    const clickLayer = document.createElement("div");
    clickLayer.id = "cce_clickLayer";
    clickLayer.style.cssText = "position:absolute;inset:0;cursor:crosshair;pointer-events:none;";
    clickLayer.addEventListener("pointerdown", e => {
      if (this._tool !== "golden") return;
      e.stopPropagation();
      const cc = (window as any).__cookieClicker;
      if (cc) cc.editorSpawnGoldenAt(e.clientX, e.clientY);
      this._dropAnim(e.clientX, e.clientY, "🍪");
    });

    // Top bar
    const bar = document.createElement("div");
    bar.style.cssText = `
      position:absolute;top:0;left:0;right:0;z-index:2;
      background:rgba(10,0,0,0.93);border-bottom:2px solid rgba(255,160,0,0.5);
      display:flex;flex-direction:column;gap:0;pointer-events:all;
    `;

    // Row 1 — title + close
    const row1 = document.createElement("div");
    row1.style.cssText = "display:flex;align-items:center;gap:8px;padding:7px 12px;";
    row1.innerHTML = `
      <span style="color:#FFD700;font-size:14px;font-weight:900;">🍪 Cookie Clicker Editor</span>
      <span id="cce_desc" style="color:rgba(255,255,255,0.4);font-size:11px;flex:1;">
        ${TOOLS[0].desc}
      </span>
      <button id="cce_close" style="background:rgba(255,80,80,0.2);color:#ff8888;font-size:12px;
        font-weight:bold;padding:5px 14px;border-radius:8px;
        border:1px solid rgba(255,80,80,0.4);cursor:pointer;">✕ Close</button>
    `;

    // Row 2 — tool selector
    const row2 = document.createElement("div");
    row2.style.cssText = "display:flex;gap:5px;padding:5px 10px 8px;flex-wrap:wrap;";
    TOOLS.forEach(t => {
      const btn = document.createElement("button");
      btn.id = `cce_tool_${t.id}`;
      btn.innerHTML = `${t.emoji} ${t.label}`;
      btn.style.cssText = this._toolBtnStyle(t.id === this._tool);
      btn.addEventListener("pointerdown", e => {
        e.stopPropagation();
        this._selectTool(t.id);
      });
      row2.appendChild(btn);
    });

    // Row 3 — action area (changes per tool)
    const row3 = document.createElement("div");
    row3.id = "cce_actions";
    row3.style.cssText = "display:flex;gap:7px;padding:0 10px 9px;flex-wrap:wrap;align-items:center;";

    bar.appendChild(row1);
    bar.appendChild(row2);
    bar.appendChild(row3);

    this._overlay.appendChild(clickLayer);
    this._overlay.appendChild(bar);
    document.body.appendChild(this._overlay);

    document.getElementById("cce_close")!.onclick = () => this.destroy();
    window.addEventListener("keydown", this._onKey);

    this._selectTool("golden");
  }

  private _toolBtnStyle(active: boolean): string {
    return `font-size:12px;font-weight:bold;padding:5px 11px;border-radius:8px;cursor:pointer;
      background:${active ? "rgba(255,160,0,0.35)" : "rgba(255,255,255,0.07)"};
      color:${active ? "#FFD700" : "rgba(255,255,255,0.55)"};
      border:1px solid ${active ? "rgba(255,160,0,0.6)" : "rgba(255,255,255,0.15)"};`;
  }

  private _selectTool(tool: Tool): void {
    this._tool = tool;

    // Update button styles
    TOOLS.forEach(t => {
      const btn = document.getElementById(`cce_tool_${t.id}`);
      if (btn) btn.style.cssText = this._toolBtnStyle(t.id === tool);
    });

    // Update description
    const desc = document.getElementById("cce_desc");
    if (desc) desc.textContent = TOOLS.find(t => t.id === tool)?.desc ?? "";

    // Enable click layer only for golden tool
    const layer = document.getElementById("cce_clickLayer")!;
    layer.style.pointerEvents = tool === "golden" ? "all" : "none";

    // Render action row
    const actions = document.getElementById("cce_actions")!;
    actions.innerHTML = "";

    const btn = (emoji: string, label: string, color: string, fn: () => void) => {
      const b = document.createElement("button");
      b.innerHTML = `${emoji} ${label}`;
      b.style.cssText = `font-size:12px;font-weight:bold;padding:6px 13px;border-radius:8px;cursor:pointer;
        background:rgba(${color},0.22);color:rgb(${color});border:1px solid rgba(${color},0.5);`;
      b.addEventListener("pointerdown", e => { e.stopPropagation(); fn(); this._flash(b); });
      actions.appendChild(b);
    };

    const cc = () => (window as any).__cookieClicker;

    if (tool === "golden") {
      const hint = document.createElement("span");
      hint.style.cssText = "color:rgba(255,220,0,0.6);font-size:12px;";
      hint.textContent = "👆 Click anywhere on the game to place a golden cookie there";
      actions.appendChild(hint);
      btn("🍪", "Flood (×5 random)", "255,200,0", () => {
        const c = cc(); if (!c) return;
        const spots = [[0.2,0.4],[0.4,0.3],[0.6,0.5],[0.3,0.6],[0.5,0.35]];
        spots.forEach(([rx,ry], i) => setTimeout(() => {
          c.editorSpawnGoldenAt(window.innerWidth * rx, window.innerHeight * ry);
          this._dropAnim(window.innerWidth * rx, window.innerHeight * ry, "🍪");
        }, i * 250));
      });
    }

    if (tool === "click_boost") {
      [1, 5, 10, 25, 100, 500, 1000, 10_000].forEach(n => {
        btn("✨", `+${n.toLocaleString()}/click`, "200,180,255", () => {
          const c = cc(); if (c) c.editorBoostClick(n);
          this._dropAnim(window.innerWidth * 0.3, 80, "✨");
        });
      });
      btn("🔄", "Reset to 1", "255,100,100", () => {
        const c = cc(); if (!c) return;
        // Can't reset cleanly without knowing original; just warn
        alert("Boost is additive — there's no reset in-session. Restart Cookie Clicker to reset.");
      });
    }

    if (tool === "coins") {
      [1_000, 10_000, 1_000_000, 100_000_000, 1_000_000_000, 1_000_000_000_000].forEach(n => {
        btn("💰", this._fmt(n), "255,220,80", () => {
          const c = cc(); if (c) c.editorAddCoins(n);
          this._dropAnim(window.innerWidth * 0.3, 80, "💰");
        });
      });
      btn("♾️", "× your CPS × 3600 (1h)", "255,255,180", () => {
        const c = cc(); if (c) c.editorMultiplyCps(3600);
      });
    }

    if (tool === "frenzy") {
      btn("🔥", "Trigger Frenzy (7× CPS)", "255,100,0", () => {
        const c = cc(); if (c) c.editorFrenzy();
        this._dropAnim(window.innerWidth * 0.3, 80, "🔥");
      });
      btn("🔥🔥", "Frenzy ×3", "255,60,0", () => {
        const c = cc(); if (!c) return;
        c.editorFrenzy(); c.editorFrenzy(); c.editorFrenzy();
        this._dropAnim(window.innerWidth * 0.3, 80, "🔥");
      });
    }

    if (tool === "storm") {
      btn("🍪🍪", "Cookie Storm!", "255,140,0", () => {
        const c = cc(); if (c) c.editorStorm();
        this._dropAnim(window.innerWidth * 0.3, 80, "🍪");
      });
      btn("🌪️", "Storm × 3", "255,100,0", () => {
        const c = cc(); if (!c) return;
        [0, 3000, 6000].forEach(d => setTimeout(() => c.editorStorm(), d));
        this._dropAnim(window.innerWidth * 0.3, 80, "🌪️");
      });
    }

    if (tool === "cps") {
      [60, 300, 600, 3600, 36_000].forEach(secs => {
        const label = secs < 60 ? `${secs}s` : secs < 3600 ? `${secs/60}m` : `${secs/3600}h`;
        btn("📈", `+${label} CPS`, "100,255,160", () => {
          const c = cc(); if (c) c.editorMultiplyCps(secs);
          this._dropAnim(window.innerWidth * 0.3, 80, "📈");
        });
      });
    }
  }

  private _fmt(n: number): string {
    if (n >= 1e12) return (n/1e12).toFixed(0)+"T";
    if (n >= 1e9)  return (n/1e9).toFixed(0)+"B";
    if (n >= 1e6)  return (n/1e6).toFixed(0)+"M";
    if (n >= 1e3)  return (n/1e3).toFixed(0)+"K";
    return String(n);
  }

  private _flash(btn: HTMLElement): void {
    btn.style.opacity = "0.5";
    setTimeout(() => { btn.style.opacity = "1"; }, 150);
  }

  private _dropAnim(cx: number, cy: number, emoji: string): void {
    if (!document.getElementById("cceStyle")) {
      const s = document.createElement("style");
      s.id = "cceStyle";
      s.textContent = `@keyframes cceDrop{from{opacity:1;transform:translate(-50%,-80%) scale(1.4);}to{opacity:0;transform:translate(-50%,40%) scale(0.8);}}`;
      document.head.appendChild(s);
    }
    const el = document.createElement("div");
    el.textContent = emoji;
    el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:32px;
      pointer-events:none;z-index:99999;animation:cceDrop 0.55s ease-out forwards;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 560);
  }

  private _onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.destroy();
  };

  destroy(): void {
    if (!this._active) return;
    this._active = false;
    window.removeEventListener("keydown", this._onKey);
    this._overlay.remove();
  }
}
