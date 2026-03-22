import type { Game } from "../../game/Game";

// ─── Data Types ───────────────────────────────────────────────────────────────

type ObjType = "box" | "text" | "button" | "image";

interface StudioObj {
  id: string;
  type: ObjType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  text: string;
  fontSize: number;
  imageUrl: string;
  isPlayer?: boolean;
}

interface WinCondition {
  type: "none" | "clicks" | "question" | "survive";
  clicks?: number;
  question?: string;
  answer?: string;
  seconds?: number;
}

interface CustomGame {
  id: string;
  name: string;
  bg: string;
  objects: StudioObj[];
  win: WinCondition;
  createdAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = "12clocks_custom_games";
const CANVAS_W = 600;
const CANVAS_H = 400;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadGames(): CustomGame[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as CustomGame[];
  } catch {
    return [];
  }
}

function saveGames(games: CustomGame[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(games));
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration> = {},
  attrs: Record<string, string> = {}
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e.style, style);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// ─── Studio Class ─────────────────────────────────────────────────────────────

export class Studio {
  private _g: Game;
  private _root: HTMLDivElement;
  private _objects: StudioObj[] = [];
  private _selected: string | null = null;
  private _gameName = "My Game";
  private _bgColor = "#ffffff";
  private _win: WinCondition = { type: "none" };

  // DOM refs
  private _canvas!: HTMLDivElement;
  private _propsPanel!: HTMLDivElement;
  private _nameInput!: HTMLInputElement;
  private _bgInput!: HTMLInputElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;

    this._root = el("div", {
      position: "fixed",
      inset: "0",
      background: "#0d0d0d",
      color: "#e0e0e0",
      fontFamily: "sans-serif",
      fontSize: "13px",
      display: "flex",
      flexDirection: "column",
      zIndex: "9999",
      overflow: "hidden",
      pointerEvents: "all",
    });
    g.ui.appendChild(this._root);

    this._buildUI();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  private _buildUI(): void {
    this._root.appendChild(this._buildToolbar());

    const body = el("div", {
      display: "flex",
      flex: "1",
      overflow: "hidden",
    });
    this._root.appendChild(body);

    body.appendChild(this._buildPalette());
    body.appendChild(this._buildCenter());
    this._propsPanel = this._buildProps();
    body.appendChild(this._propsPanel);

    this._root.appendChild(this._buildWinPanel());
  }

  private _buildToolbar(): HTMLDivElement {
    const bar = el("div", {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      background: "#111",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      flexShrink: "0",
    });

    const label = el("span", { fontWeight: "bold", marginRight: "4px", color: "#aaa" });
    label.textContent = "Studio";
    bar.appendChild(label);

    this._nameInput = el("input", {
      padding: "4px 8px",
      background: "#1a1a1a",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "4px",
      color: "#e0e0e0",
      fontSize: "13px",
      width: "160px",
    }, { type: "text", placeholder: "My Game" });
    this._nameInput.addEventListener("input", () => { this._gameName = this._nameInput.value || "My Game"; });
    bar.appendChild(this._nameInput);

    const bgLabel = el("span", { color: "#888", marginLeft: "8px" });
    bgLabel.textContent = "BG:";
    bar.appendChild(bgLabel);

    this._bgInput = el("input", {
      width: "36px",
      height: "26px",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "4px",
      cursor: "pointer",
      padding: "2px",
      background: "none",
    }, { type: "color", value: "#ffffff" });
    this._bgInput.addEventListener("input", () => {
      this._bgColor = this._bgInput.value;
      this._canvas.style.background = this._bgColor;
    });
    bar.appendChild(this._bgInput);

    const spacer = el("div", { flex: "1" });
    bar.appendChild(spacer);

    const btnTest = this._btn("▶ Test", "#1a472a", "#2d7a47");
    btnTest.addEventListener("click", () => this._runTest());
    bar.appendChild(btnTest);

    const btnPublish = this._btn("🚀 Publish", "#1a2747", "#2d4a8a");
    btnPublish.addEventListener("click", () => this._publish());
    bar.appendChild(btnPublish);

    const btnBack = this._btn("← Back", "#2a2a2a", "#3a3a3a");
    btnBack.addEventListener("click", () => this._cleanup());
    bar.appendChild(btnBack);

    return bar;
  }

  private _buildPalette(): HTMLDivElement {
    const panel = el("div", {
      width: "120px",
      flexShrink: "0",
      background: "#111",
      borderRight: "1px solid rgba(255,255,255,0.1)",
      padding: "12px 8px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      overflowY: "auto",
    });

    const title = el("div", { color: "#888", fontSize: "11px", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" });
    title.textContent = "Objects";
    panel.appendChild(title);

    const items: [string, ObjType][] = [
      ["📦 Box", "box"],
      ["🔤 Text", "text"],
      ["🔘 Button", "button"],
      ["🖼️ Image", "image"],
    ];

    for (const [label, type] of items) {
      const btn = el("button", {
        padding: "8px 6px",
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "6px",
        color: "#e0e0e0",
        cursor: "pointer",
        fontSize: "12px",
        textAlign: "left",
        transition: "background 0.15s",
      });
      btn.textContent = label;
      btn.addEventListener("mouseenter", () => { btn.style.background = "#2a2a2a"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "#1a1a1a"; });
      btn.addEventListener("click", () => this._addObject(type));
      panel.appendChild(btn);
    }

    return panel;
  }

  private _buildCenter(): HTMLDivElement {
    const wrap = el("div", {
      flex: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "auto",
      padding: "16px",
      background: "#0d0d0d",
    });

    this._canvas = el("div", {
      position: "relative",
      width: `${CANVAS_W}px`,
      height: `${CANVAS_H}px`,
      background: this._bgColor,
      flexShrink: "0",
      boxShadow: "0 0 0 2px rgba(255,255,255,0.15), 0 8px 32px rgba(0,0,0,0.6)",
      borderRadius: "4px",
      overflow: "hidden",
      cursor: "default",
    });

    // deselect on canvas background click
    this._canvas.addEventListener("click", (e) => {
      if (e.target === this._canvas) this._selectObj(null);
    });

    wrap.appendChild(this._canvas);
    return wrap;
  }

  private _buildProps(): HTMLDivElement {
    const panel = el("div", {
      width: "180px",
      flexShrink: "0",
      background: "#111",
      borderLeft: "1px solid rgba(255,255,255,0.1)",
      padding: "12px 10px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    });

    const placeholder = el("div", { color: "#555", fontSize: "12px", marginTop: "12px", textAlign: "center" });
    placeholder.textContent = "Select an object to edit its properties.";
    placeholder.id = "_props_placeholder";
    panel.appendChild(placeholder);

    return panel;
  }

  private _buildWinPanel(): HTMLDivElement {
    const panel = el("div", {
      background: "#111",
      borderTop: "1px solid rgba(255,255,255,0.1)",
      padding: "8px 12px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexShrink: "0",
    });

    const label = el("span", { color: "#888", fontSize: "12px", whiteSpace: "nowrap" });
    label.textContent = "Win Condition:";
    panel.appendChild(label);

    const select = el("select", {
      background: "#1a1a1a",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "4px",
      color: "#e0e0e0",
      padding: "4px 6px",
      fontSize: "12px",
      cursor: "pointer",
    });
    [["none", "None"], ["clicks", "Click X times"], ["question", "Answer a question"], ["survive", "Survive X seconds"]].forEach(([v, t]) => {
      const o = el("option"); o.value = v; o.textContent = t; select.appendChild(o);
    });

    const extras = el("div", { display: "flex", alignItems: "center", gap: "6px" });

    const _numInput = (placeholder: string, w = "60px") => {
      const i = el("input", {
        width: w, padding: "4px 6px", background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px",
        color: "#e0e0e0", fontSize: "12px",
      }, { type: "number", placeholder, min: "1" });
      return i;
    };
    const _textInput = (placeholder: string, w = "120px") => {
      const i = el("input", {
        width: w, padding: "4px 6px", background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px",
        color: "#e0e0e0", fontSize: "12px",
      }, { type: "text", placeholder });
      return i;
    };

    const clicksIn = _numInput("Count", "60px");
    const questionIn = _textInput("Question", "130px");
    const answerIn = _textInput("Answer", "90px");
    const secondsIn = _numInput("Seconds", "60px");

    const rebuild = () => {
      extras.innerHTML = "";
      const v = select.value as WinCondition["type"];
      this._win = { type: v };
      if (v === "clicks") {
        extras.appendChild(clicksIn);
        this._win.clicks = parseInt(clicksIn.value) || 1;
        clicksIn.addEventListener("input", () => { this._win.clicks = parseInt(clicksIn.value) || 1; });
      } else if (v === "question") {
        extras.appendChild(questionIn);
        extras.appendChild(answerIn);
        this._win.question = questionIn.value;
        this._win.answer = answerIn.value;
        questionIn.addEventListener("input", () => { this._win.question = questionIn.value; });
        answerIn.addEventListener("input", () => { this._win.answer = answerIn.value; });
      } else if (v === "survive") {
        extras.appendChild(secondsIn);
        this._win.seconds = parseInt(secondsIn.value) || 10;
        secondsIn.addEventListener("input", () => { this._win.seconds = parseInt(secondsIn.value) || 10; });
      }
    };

    select.addEventListener("change", rebuild);
    panel.appendChild(select);
    panel.appendChild(extras);
    return panel;
  }

  // ── Object Management ─────────────────────────────────────────────────────

  private _addObject(type: ObjType): void {
    if (type === "image") {
      _showImagePicker((emoji) => {
        const obj: StudioObj = {
          id: uid(), type: "image",
          x: Math.round(CANVAS_W / 2 - 40), y: Math.round(CANVAS_H / 2 - 40),
          w: 80, h: 80, color: "transparent",
          text: emoji, fontSize: 64, imageUrl: "",
        };
        this._objects.push(obj);
        this._renderObj(obj);
        this._selectObj(obj.id);
      });
      return;
    }

    const defaults: Record<ObjType, Partial<StudioObj>> = {
      box:    { w: 100, h: 60, color: "#4a90e2", text: "" },
      text:   { w: 120, h: 40, color: "#222222", text: "Hello!" },
      button: { w: 100, h: 40, color: "#2ecc71", text: "Click me" },
      image:  { w: 120, h: 80, color: "transparent", text: "" },
    };

    const obj: StudioObj = {
      id: uid(),
      type,
      x: Math.round(CANVAS_W / 2 - 60),
      y: Math.round(CANVAS_H / 2 - 30),
      fontSize: 16,
      imageUrl: "",
      ...defaults[type],
    } as StudioObj;

    this._objects.push(obj);
    this._renderObj(obj);
    this._selectObj(obj.id);
  }

  private _renderObj(obj: StudioObj): void {
    const existing = this._canvas.querySelector(`[data-id="${obj.id}"]`) as HTMLElement | null;
    if (existing) existing.remove();

    let dom: HTMLElement;

    if (obj.type === "image") {
      dom = el("div", {
        position: "absolute",
        left: `${obj.x}px`, top: `${obj.y}px`,
        width: `${obj.w}px`, height: `${obj.h}px`,
        fontSize: `${Math.min(obj.w, obj.h) * 0.85}px`,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "move", userSelect: "none", lineHeight: "1",
      });
      dom.textContent = obj.text;
    } else if (obj.type === "text") {
      dom = el("div", {
        position: "absolute",
        left: `${obj.x}px`, top: `${obj.y}px`,
        width: `${obj.w}px`, height: `${obj.h}px`,
        fontSize: `${obj.fontSize}px`,
        color: obj.color,
        cursor: "move",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      });
      dom.textContent = obj.text;
    } else if (obj.type === "button") {
      dom = el("div", {
        position: "absolute",
        left: `${obj.x}px`, top: `${obj.y}px`,
        width: `${obj.w}px`, height: `${obj.h}px`,
        background: obj.color,
        borderRadius: "6px",
        cursor: "move",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${obj.fontSize}px`,
        color: "#fff",
        fontWeight: "bold",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        overflow: "hidden",
      });
      dom.textContent = obj.text;
    } else {
      dom = el("div", {
        position: "absolute",
        left: `${obj.x}px`, top: `${obj.y}px`,
        width: `${obj.w}px`, height: `${obj.h}px`,
        background: obj.color,
        borderRadius: "4px",
        cursor: "move",
        userSelect: "none",
        overflow: "hidden",
      });
    }

    dom.setAttribute("data-id", obj.id);
    this._makeDraggable(dom, obj);
    dom.addEventListener("click", (e) => { e.stopPropagation(); this._selectObj(obj.id); });
    this._canvas.appendChild(dom);

    // Player badge
    if (obj.isPlayer) {
      const badge = el("div", {
        position: "absolute", top: "-10px", right: "-10px",
        fontSize: "16px", lineHeight: "1", pointerEvents: "none",
        zIndex: "10",
      });
      badge.textContent = "🕹️";
      dom.style.position = "absolute"; // ensure relative positioning works
      dom.appendChild(badge);
    }

    // selection outline
    if (this._selected === obj.id) {
      dom.style.outline = "2px solid #4af";
      dom.style.outlineOffset = "1px";
    }
  }

  private _renderAllObjs(): void {
    for (const obj of this._objects) this._renderObj(obj);
  }

  private _makeDraggable(dom: HTMLElement, obj: StudioObj): void {
    let startX = 0, startY = 0, origX = 0, origY = 0;

    dom.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dom.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      origX = obj.x; origY = obj.y;

      const onMove = (ev: PointerEvent) => {
        obj.x = Math.max(0, Math.min(CANVAS_W - obj.w, origX + ev.clientX - startX));
        obj.y = Math.max(0, Math.min(CANVAS_H - obj.h, origY + ev.clientY - startY));
        dom.style.left = `${obj.x}px`;
        dom.style.top  = `${obj.y}px`;
        if (this._selected === obj.id) this._refreshProps();
      };
      const onUp = () => {
        dom.removeEventListener("pointermove", onMove);
        dom.removeEventListener("pointerup",   onUp);
      };
      dom.addEventListener("pointermove", onMove);
      dom.addEventListener("pointerup",   onUp);
    });
  }

  private _selectObj(id: string | null): void {
    this._selected = id;
    // update outlines
    this._canvas.querySelectorAll<HTMLElement>("[data-id]").forEach((el) => {
      el.style.outline = el.getAttribute("data-id") === id ? "2px solid #4af" : "";
      el.style.outlineOffset = el.getAttribute("data-id") === id ? "1px" : "";
    });
    this._refreshProps();
  }

  private _refreshProps(): void {
    this._propsPanel.innerHTML = "";

    const obj = this._objects.find((o) => o.id === this._selected);
    if (!obj) {
      const ph = el("div", { color: "#555", fontSize: "12px", marginTop: "12px", textAlign: "center" });
      ph.textContent = "Select an object to edit its properties.";
      this._propsPanel.appendChild(ph);
      return;
    }

    const title = el("div", { fontWeight: "bold", color: "#aaa", marginBottom: "6px", fontSize: "12px", textTransform: "uppercase" });
    title.textContent = obj.type;
    this._propsPanel.appendChild(title);

    // Player toggle
    const playerToggle = el("button", {
      padding: "7px 10px", borderRadius: "8px", cursor: "pointer",
      fontSize: "12px", fontWeight: "bold", width: "100%",
      marginBottom: "8px", fontFamily: "Arial",
      background: obj.isPlayer ? "rgba(80,200,80,0.2)" : "rgba(255,255,255,0.06)",
      border: obj.isPlayer ? "2px solid rgba(80,200,80,0.5)" : "2px solid rgba(255,255,255,0.12)",
      color: obj.isPlayer ? "#80ff80" : "rgba(255,255,255,0.5)",
    });
    playerToggle.textContent = obj.isPlayer ? "🕹️ Player" : "📦 Object";
    playerToggle.onclick = () => {
      obj.isPlayer = !obj.isPlayer;
      // only one player allowed — clear others
      if (obj.isPlayer) {
        for (const o of this._objects) { if (o.id !== obj.id) o.isPlayer = false; }
      }
      this._renderAllObjs();
      this._refreshProps();
    };
    this._propsPanel.appendChild(playerToggle);

    const row = (labelText: string, input: HTMLElement) => {
      const wrap = el("div", { display: "flex", flexDirection: "column", gap: "2px" });
      const lbl = el("label", { color: "#888", fontSize: "11px" });
      lbl.textContent = labelText;
      wrap.appendChild(lbl);
      wrap.appendChild(input);
      this._propsPanel.appendChild(wrap);
    };

    const numIn = (val: number, min: number, cb: (v: number) => void) => {
      const i = el("input", {
        padding: "4px 6px", background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px",
        color: "#e0e0e0", fontSize: "12px", width: "100%", boxSizing: "border-box",
      }, { type: "number", value: String(val), min: String(min) });
      i.addEventListener("input", () => { cb(parseInt(i.value) || min); this._renderObj(obj); });
      return i;
    };

    const textIn = (val: string, placeholder: string, cb: (v: string) => void) => {
      const i = el("input", {
        padding: "4px 6px", background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px",
        color: "#e0e0e0", fontSize: "12px", width: "100%", boxSizing: "border-box",
      }, { type: "text", value: val, placeholder });
      i.addEventListener("input", () => { cb(i.value); this._renderObj(obj); });
      return i;
    };

    row("X", numIn(obj.x, 0, (v) => { obj.x = v; }));
    row("Y", numIn(obj.y, 0, (v) => { obj.y = v; }));
    row("Width", numIn(obj.w, 10, (v) => { obj.w = v; }));
    row("Height", numIn(obj.h, 10, (v) => { obj.h = v; }));

    if (obj.type === "box" || obj.type === "button") {
      const ci = el("input", {
        width: "100%", height: "28px", cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px",
        padding: "2px", background: "none", boxSizing: "border-box",
      }, { type: "color", value: obj.color });
      ci.addEventListener("input", () => { obj.color = ci.value; this._renderObj(obj); });
      row("Color", ci);
    }

    if (obj.type === "text") {
      const ci = el("input", {
        width: "100%", height: "28px", cursor: "pointer",
        border: "1px solid rgba(255,255,255,0.15)", borderRadius: "4px",
        padding: "2px", background: "none", boxSizing: "border-box",
      }, { type: "color", value: obj.color });
      ci.addEventListener("input", () => { obj.color = ci.value; this._renderObj(obj); });
      row("Text Color", ci);
    }

    if (obj.type !== "box" && obj.type !== "image") {
      row("Text", textIn(obj.text, "Label", (v) => { obj.text = v; }));
      row("Font Size", numIn(obj.fontSize, 8, (v) => { obj.fontSize = v; }));
    }

    if (obj.type === "image") {
      const changeBtn = el("button", {
        padding: "6px", background: "#1a2a3a",
        border: "1px solid rgba(80,160,255,0.3)", borderRadius: "4px",
        color: "#80cfff", cursor: "pointer", fontSize: "12px", width: "100%",
      });
      changeBtn.textContent = `${obj.text}  Change`;
      changeBtn.addEventListener("click", () => {
        _showImagePicker((emoji) => { obj.text = emoji; this._renderObj(obj); this._refreshProps(); });
      });
      row("Emoji", changeBtn);
    }

    // delete
    const delBtn = el("button", {
      marginTop: "8px",
      padding: "6px",
      background: "#4a1a1a",
      border: "1px solid rgba(255,80,80,0.3)",
      borderRadius: "4px",
      color: "#ff6b6b",
      cursor: "pointer",
      fontSize: "12px",
      width: "100%",
    });
    delBtn.textContent = "Delete Object";
    delBtn.addEventListener("click", () => {
      this._objects = this._objects.filter((o) => o.id !== obj.id);
      this._canvas.querySelector(`[data-id="${obj.id}"]`)?.remove();
      this._selectObj(null);
    });
    this._propsPanel.appendChild(delBtn);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private _buildGameData(): CustomGame {
    return {
      id: uid(),
      name: this._gameName,
      bg: this._bgColor,
      objects: JSON.parse(JSON.stringify(this._objects)) as StudioObj[],
      win: { ...this._win },
      createdAt: Date.now(),
    };
  }

  private _runTest(): void {
    const data = this._buildGameData();
    const overlay = el("div", {
      position: "fixed", inset: "0",
      background: "#0d0d0d",
      zIndex: "10000",
      display: "flex",
      flexDirection: "column",
    });
    this._g.ui.appendChild(overlay);

    const closeBtn = el("button", {
      position: "absolute", top: "10px", right: "12px",
      padding: "6px 12px",
      background: "#2a2a2a",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: "6px",
      color: "#e0e0e0",
      cursor: "pointer",
      zIndex: "1",
      fontSize: "13px",
    });
    closeBtn.textContent = "✕ Close Preview";
    closeBtn.addEventListener("click", () => overlay.remove());
    overlay.appendChild(closeBtn);

    _renderCustomGame(data, overlay, () => overlay.remove());
  }

  private _publish(): void {
    const data = this._buildGameData();
    const games = loadGames();
    games.push(data);
    saveGames(games);
    alert(`"${data.name}" published!`);
    this._cleanup();
  }

  _cleanup(): void {
    this._root.remove();
    this._g.goArcade();
  }

  // ── Utility ───────────────────────────────────────────────────────────────

  private _btn(text: string, bg: string, hover: string): HTMLButtonElement {
    const b = el("button", {
      padding: "6px 12px",
      background: bg,
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "6px",
      color: "#e0e0e0",
      cursor: "pointer",
      fontSize: "13px",
      transition: "background 0.15s",
      whiteSpace: "nowrap",
    });
    b.textContent = text;
    b.addEventListener("mouseenter", () => { b.style.background = hover; });
    b.addEventListener("mouseleave", () => { b.style.background = bg; });
    return b;
  }
}

// ─── Internal Game Renderer ───────────────────────────────────────────────────

function _renderCustomGame(data: CustomGame, container: HTMLElement, onBack: () => void): void {
  container.style.background = "#0d0d0d";

  const header = el("div", {
    padding: "10px 14px",
    fontFamily: "sans-serif",
    fontSize: "16px",
    fontWeight: "bold",
    color: "#e0e0e0",
    background: "#111",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  });
  const titleEl = el("span");
  titleEl.textContent = data.name;
  header.appendChild(titleEl);

  const spacer = el("span", { flex: "1" });
  header.appendChild(spacer);

  const backBtn = el("button", {
    padding: "5px 10px",
    background: "#2a2a2a",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "6px",
    color: "#e0e0e0",
    cursor: "pointer",
    fontSize: "12px",
  });
  backBtn.textContent = "← Back";
  backBtn.addEventListener("click", onBack);
  header.appendChild(backBtn);
  container.appendChild(header);

  const area = el("div", {
    flex: "1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "auto",
    padding: "16px",
  });
  container.appendChild(area);

  const canvas = el("div", {
    position: "relative",
    width: `${CANVAS_W}px`,
    height: `${CANVAS_H}px`,
    background: data.bg,
    flexShrink: "0",
    overflow: "hidden",
    borderRadius: "4px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  });
  area.appendChild(canvas);

  // Win state
  let clickCount = 0;
  let surviveTimer: ReturnType<typeof setInterval> | null = null;
  let secondsLeft = data.win.seconds ?? 10;

  const win = data.win;

  const showWin = () => {
    if (surviveTimer) clearInterval(surviveTimer);
    canvas.innerHTML = "";
    canvas.style.display = "flex";
    canvas.style.flexDirection = "column";
    canvas.style.alignItems = "center";
    canvas.style.justifyContent = "center";
    const msg = el("div", { fontSize: "48px", marginBottom: "16px" });
    msg.textContent = "🎉";
    const txt = el("div", { fontSize: "28px", fontWeight: "bold", color: "#2ecc71", fontFamily: "sans-serif", marginBottom: "24px" });
    txt.textContent = "You Win!";
    const b = el("button", {
      padding: "10px 24px",
      background: "#2d7a47",
      border: "none",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "16px",
      cursor: "pointer",
    });
    b.textContent = "Back";
    b.addEventListener("click", onBack);
    canvas.appendChild(msg);
    canvas.appendChild(txt);
    canvas.appendChild(b);
  };

  // Survive timer display
  let timerEl: HTMLDivElement | null = null;
  if (win.type === "survive") {
    timerEl = el("div", {
      position: "absolute",
      top: "8px",
      right: "10px",
      fontFamily: "sans-serif",
      fontSize: "18px",
      fontWeight: "bold",
      color: "#e0e0e0",
      background: "rgba(0,0,0,0.5)",
      padding: "4px 10px",
      borderRadius: "6px",
      zIndex: "10",
    });
    timerEl.textContent = `${secondsLeft}s`;
    canvas.appendChild(timerEl);

    surviveTimer = setInterval(() => {
      secondsLeft--;
      if (timerEl) timerEl.textContent = `${secondsLeft}s`;
      if (secondsLeft <= 0) {
        if (surviveTimer) clearInterval(surviveTimer);
        showWin();
      }
    }, 1000);
  }

  // Render objects
  for (const obj of data.objects) {
    let dom: HTMLElement;

    if (obj.type === "image") {
      dom = el("div", {
        position: "absolute",
        left: `${obj.x}px`, top: `${obj.y}px`,
        width: `${obj.w}px`, height: `${obj.h}px`,
        fontSize: `${Math.min(obj.w, obj.h) * 0.85}px`,
        display: "flex", alignItems: "center", justifyContent: "center",
        userSelect: "none", lineHeight: "1",
      });
      dom.textContent = obj.text;
    } else if (obj.type === "text") {
      dom = el("div", {
        position: "absolute",
        left: `${obj.x}px`, top: `${obj.y}px`,
        width: `${obj.w}px`, height: `${obj.h}px`,
        fontSize: `${obj.fontSize}px`,
        color: obj.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        overflow: "hidden",
        userSelect: "none",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      });
      dom.textContent = obj.text;
    } else if (obj.type === "button") {
      dom = el("button", {
        position: "absolute",
        left: `${obj.x}px`, top: `${obj.y}px`,
        width: `${obj.w}px`, height: `${obj.h}px`,
        background: obj.color,
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: `${obj.fontSize}px`,
        color: "#fff",
        fontWeight: "bold",
        fontFamily: "sans-serif",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        transition: "filter 0.1s",
      });
      dom.textContent = obj.text;
      dom.addEventListener("mouseenter", () => { (dom as HTMLButtonElement).style.filter = "brightness(1.15)"; });
      dom.addEventListener("mouseleave", () => { (dom as HTMLButtonElement).style.filter = ""; });

      if (win.type === "clicks") {
        dom.addEventListener("click", () => {
          clickCount++;
          if (clickCount >= (win.clicks ?? 1)) showWin();
        });
      } else if (win.type === "question") {
        dom.addEventListener("click", () => {
          const ans = prompt(win.question ?? "Answer:");
          if (ans !== null && ans.trim().toLowerCase() === (win.answer ?? "").trim().toLowerCase()) {
            showWin();
          } else if (ans !== null) {
            alert("Wrong answer, try again!");
          }
        });
      }
    } else {
      // box
      dom = el("div", {
        position: "absolute",
        left: `${obj.x}px`, top: `${obj.y}px`,
        width: `${obj.w}px`, height: `${obj.h}px`,
        background: obj.color,
        borderRadius: "4px",
      });
    }

    if (obj.isPlayer) {
      dom.setAttribute("data-player", "1");
      dom.style.outline = "2px dashed rgba(80,200,80,0.6)";
      dom.style.outlineOffset = "2px";
    }

    canvas.appendChild(dom);
  }

  // Player movement — gravity + jump + collision
  const playerEl = canvas.querySelector<HTMLElement>("[data-player]");
  if (playerEl) {
    let px = parseInt(playerEl.style.left) || 0;
    let py = parseInt(playerEl.style.top)  || 0;
    const pw = parseInt(playerEl.style.width)  || 40;
    const ph = parseInt(playerEl.style.height) || 40;
    const SPEED = 4, GRAVITY = 0.5, JUMP = -11;
    let vy = 0, onGround = false;

    // Collect solid (non-player) box objects for collision
    const solids = data.objects.filter(o => !o.isPlayer && o.type === "box");

    const keys: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent) => {
      keys[e.key] = e.type === "keydown";
      if (e.key === " ") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup",   onKey);

    const collides = (x: number, y: number) =>
      solids.some(s => x < s.x + s.w && x + pw > s.x && y < s.y + s.h && y + ph > s.y);

    const loop = () => {
      if (!canvas.isConnected) {
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup",   onKey);
        return;
      }
      requestAnimationFrame(loop);

      // Horizontal
      let nx = px;
      if (keys["ArrowLeft"]  || keys["a"]) nx -= SPEED;
      if (keys["ArrowRight"] || keys["d"]) nx += SPEED;
      nx = Math.max(0, Math.min(CANVAS_W - pw, nx));
      if (!collides(nx, py)) px = nx;

      // Jump
      if ((keys[" "] || keys["ArrowUp"] || keys["w"]) && onGround) {
        vy = JUMP; onGround = false;
      }

      // Gravity
      vy += GRAVITY;
      let ny = py + vy;

      // Floor
      if (ny + ph >= CANVAS_H) { ny = CANVAS_H - ph; vy = 0; onGround = true; }
      // Ceiling
      if (ny < 0) { ny = 0; vy = 0; }

      // Vertical collision with solids
      if (collides(px, ny)) {
        if (vy > 0) { // falling — land on top of solid
          while (collides(px, ny)) ny--;
          onGround = true;
        } else { // rising — hit ceiling of solid
          while (collides(px, ny)) ny++;
        }
        vy = 0;
      } else {
        onGround = false;
        // check if standing on something
        if (collides(px, py + 1)) onGround = true;
        if (py + ph >= CANVAS_H) onGround = true;
      }

      py = ny;
      playerEl.style.left = `${Math.round(px)}px`;
      playerEl.style.top  = `${Math.round(py)}px`;
    };
    requestAnimationFrame(loop);
  }

  // "none" win — just display
}

// ─── Image / Emoji Picker ────────────────────────────────────────────────────

const EMOJI_CATEGORIES: Array<{ label: string; emoji: string; items: string[] }> = [
  { label: "Faces", emoji: "😀", items: ["😀","😂","😍","🥰","😎","🤩","😭","😡","🥺","😱","🤔","😴","🤯","🥳","😈","👻","💀","🤖","👽","🎃"] },
  { label: "Animals", emoji: "🐶", items: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐙","🦋","🐢","🦖","🦕","🐉"] },
  { label: "Food", emoji: "🍕", items: ["🍕","🍔","🌮","🌯","🍜","🍣","🍩","🍰","🎂","🍦","🍎","🍌","🍓","🍒","🍇","🥑","🥕","🌽","🍟","🧁"] },
  { label: "Nature", emoji: "🌲", items: ["🌲","🌸","🌺","🌻","🌈","⭐","🌙","☀️","❄️","🔥","💧","🌊","⚡","🌪️","🍀","🌵","🍄","🌴","🪨","🌍"] },
  { label: "Objects", emoji: "📦", items: ["📦","🎁","💎","🏆","🎮","🕹️","📱","💻","⌚","📸","🔑","🗝️","🔒","🔓","💰","💡","🔮","🧲","🪄","🛸"] },
  { label: "Games", emoji: "🎮", items: ["🎮","🕹️","🎲","🎯","🎳","🃏","🎭","🎨","🎬","🎤","🎸","🎺","🥁","🎻","🏅","🥇","🏆","🎖️","🎪","🎠"] },
  { label: "Sports", emoji: "⚽", items: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🥊","🤸","🏊","🚴","⛷️","🏂","🤺","🏇","🧗"] },
  { label: "Hearts", emoji: "❤️", items: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💗","💖","💘","💝","💞","💕","❣️","💔","✨","⚡","🌟"] },
  { label: "Vehicles", emoji: "🚗", items: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","✈️","🚀","🛸","🚁","⛵","🚢","🛳️","🚂","🚃","🚄","🚅"] },
  { label: "Symbols", emoji: "❓", items: ["❓","❗","⭐","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🔶","🔷","🔸","🔹","🔺","🔻","💠","🔘","🔳"] },
];

function _showImagePicker(onPick: (emoji: string) => void): void {
  const ov = el("div", {
    position: "fixed", inset: "0", zIndex: "20000",
    background: "rgba(0,0,0,0.8)",
    display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "all",
  });

  const box = el("div", {
    background: "#111", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "14px", width: "min(520px,95vw)", maxHeight: "80vh",
    display: "flex", flexDirection: "column", overflow: "hidden",
  });

  // Header
  const header = el("div", {
    padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  });
  const htitle = el("div", { color: "white", fontWeight: "bold", fontSize: "15px", fontFamily: "Arial" });
  htitle.textContent = "Pick an Image";
  const closeBtn = el("button", {
    background: "none", border: "none", color: "rgba(255,255,255,0.5)",
    fontSize: "20px", cursor: "pointer", lineHeight: "1", padding: "0 4px",
  });
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => ov.remove();
  header.appendChild(htitle);
  header.appendChild(closeBtn);
  box.appendChild(header);

  // Category tabs
  const tabs = el("div", {
    display: "flex", gap: "4px", padding: "8px 12px",
    overflowX: "auto", flexShrink: "0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  });

  // Grid
  const grid = el("div", {
    display: "grid", gridTemplateColumns: "repeat(8,1fr)",
    gap: "4px", padding: "12px", overflowY: "auto", flex: "1",
  });

  let activeTab = "";
  const showCategory = (label: string) => {
    activeTab = label;
    grid.innerHTML = "";
    const cat = EMOJI_CATEGORIES.find(c => c.label === label)!;
    for (const emoji of cat.items) {
      const btn = el("button", {
        fontSize: "24px", padding: "6px", background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
        cursor: "pointer", lineHeight: "1", transition: "background 0.1s",
      });
      btn.textContent = emoji;
      btn.onmouseenter = () => { btn.style.background = "rgba(255,255,255,0.15)"; };
      btn.onmouseleave = () => { btn.style.background = "rgba(255,255,255,0.04)"; };
      btn.onclick = () => { ov.remove(); onPick(emoji); };
      grid.appendChild(btn);
    }
    // update tab highlight
    tabs.querySelectorAll<HTMLButtonElement>("button").forEach(t => {
      t.style.background = t.dataset.label === label
        ? "rgba(100,150,255,0.25)" : "rgba(255,255,255,0.05)";
      t.style.borderColor = t.dataset.label === label
        ? "rgba(100,150,255,0.5)" : "rgba(255,255,255,0.1)";
    });
  };

  for (const cat of EMOJI_CATEGORIES) {
    const tab = el("button", {
      padding: "5px 10px", background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px",
      color: "white", cursor: "pointer", fontSize: "12px",
      whiteSpace: "nowrap", fontFamily: "Arial",
    });
    tab.textContent = `${cat.emoji} ${cat.label}`;
    tab.dataset.label = cat.label;
    tab.onclick = () => showCategory(cat.label);
    tabs.appendChild(tab);
  }

  box.appendChild(tabs);
  box.appendChild(grid);
  ov.appendChild(box);
  document.body.appendChild(ov);

  showCategory(EMOJI_CATEGORIES[0].label);
}

// ─── Public Runner ────────────────────────────────────────────────────────────

export function runCustomGame(g: Game, gameData: CustomGame): void {
  g.inMiniGame = true;

  const root = el("div", {
    position: "fixed",
    inset: "0",
    background: "#0d0d0d",
    zIndex: "9999",
    display: "flex",
    flexDirection: "column",
  });
  g.ui.appendChild(root);

  const cleanup = () => {
    root.remove();
    g.inMiniGame = false;
    g.goArcade();
  };

  _renderCustomGame(gameData, root, cleanup);
}
