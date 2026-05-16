/**
 * CatCleaning — brush all the dirt off the cat to solve the puzzle!
 * Used inside Extreme Mode AND playable from the Arcade.
 */
import type { Game } from "../../game/Game";

export class CatCleaning {
  private _wrap!: HTMLDivElement;
  private _dirty: HTMLDivElement[] = [];
  private _cleaned = 0;
  private _brushing = false;
  private _done = false;
  private _cleanup: (() => void)[] = [];

  constructor(game: Game, onComplete?: () => void) {
    game.inMiniGame = true;
    game.ui.innerHTML = "";

    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(135deg,#fff9e6,#ffe082);" +
      "pointer-events:all;font-family:Arial,sans-serif;display:flex;" +
      "flex-direction:column;align-items:center;overflow:hidden;user-select:none;";
    game.ui.appendChild(this._wrap);

    // Header
    const hdr = document.createElement("div");
    hdr.style.cssText =
      "font-size:22px;font-weight:bold;color:#5a3a00;padding:14px 0 2px;text-align:center;";
    hdr.textContent = "🧹 Clean the Cat!";
    this._wrap.appendChild(hdr);

    const sub = document.createElement("div");
    sub.style.cssText = "font-size:13px;color:rgba(90,58,0,0.65);margin-bottom:10px;";
    sub.textContent = "Drag the brush over all the dirt spots!";
    this._wrap.appendChild(sub);

    // Progress bar
    const pWrap = document.createElement("div");
    pWrap.style.cssText =
      "width:80%;max-width:300px;background:rgba(0,0,0,0.15);" +
      "border-radius:8px;height:14px;margin-bottom:14px;overflow:hidden;";
    const pFill = document.createElement("div");
    pFill.id = "catPFill";
    pFill.style.cssText =
      "height:100%;width:0%;background:linear-gradient(90deg,#66bb6a,#a5d6a7);" +
      "border-radius:8px;transition:width 0.15s;";
    pWrap.appendChild(pFill);
    this._wrap.appendChild(pWrap);

    // Cat stage
    const stage = document.createElement("div");
    stage.style.cssText =
      "position:relative;width:min(280px,80vw);height:min(280px,80vw);flex-shrink:0;";
    this._wrap.appendChild(stage);

    // Cat body (CSS shapes)
    stage.innerHTML = `
      <!-- body -->
      <div style="position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);
        width:58%;height:52%;background:#f4a261;border-radius:50%;
        border:3px solid #e07a3a;"></div>
      <!-- head -->
      <div style="position:absolute;left:50%;top:24%;transform:translate(-50%,-50%);
        width:44%;height:44%;background:#f4a261;border-radius:50%;
        border:3px solid #e07a3a;"></div>
      <!-- left ear -->
      <div style="position:absolute;left:22%;top:4%;
        width:0;height:0;
        border-left:14px solid transparent;border-right:14px solid transparent;
        border-bottom:26px solid #f4a261;transform:rotate(-20deg);"></div>
      <!-- right ear -->
      <div style="position:absolute;right:22%;top:4%;
        width:0;height:0;
        border-left:14px solid transparent;border-right:14px solid transparent;
        border-bottom:26px solid #f4a261;transform:rotate(20deg);"></div>
      <!-- left eye -->
      <div style="position:absolute;left:32%;top:19%;
        width:8%;height:10%;background:#2d6a4f;border-radius:50%;"></div>
      <!-- right eye -->
      <div style="position:absolute;right:32%;top:19%;
        width:8%;height:10%;background:#2d6a4f;border-radius:50%;"></div>
      <!-- nose -->
      <div style="position:absolute;left:50%;top:28%;transform:translateX(-50%);
        width:5%;height:5%;background:#e07a8a;border-radius:50%;"></div>
      <!-- tail -->
      <div style="position:absolute;right:4%;top:62%;
        width:7%;height:32%;background:#f4a261;border-radius:40px;
        transform:rotate(20deg);border:2px solid #e07a3a;"></div>
      <!-- fur stripes -->
      <div style="position:absolute;left:36%;top:46%;
        width:3%;height:22%;background:rgba(200,100,40,0.25);border-radius:4px;transform:rotate(4deg);"></div>
      <div style="position:absolute;left:48%;top:44%;
        width:3%;height:24%;background:rgba(200,100,40,0.25);border-radius:4px;"></div>
      <div style="position:absolute;left:60%;top:46%;
        width:3%;height:22%;background:rgba(200,100,40,0.25);border-radius:4px;transform:rotate(-4deg);"></div>
    `;

    // Dirt spots
    const dirtPositions = [
      { l: "38%", t: "48%" }, { l: "54%", t: "44%" }, { l: "44%", t: "62%" },
      { l: "60%", t: "55%" }, { l: "34%", t: "58%" }, { l: "50%", t: "70%" },
      { l: "28%", t: "20%" }, { l: "58%", t: "22%" }, { l: "46%", t: "34%" },
      { l: "62%", t: "42%" },
    ];
    for (const pos of dirtPositions) {
      const d = document.createElement("div");
      d.style.cssText =
        `position:absolute;left:${pos.l};top:${pos.t};` +
        "transform:translate(-50%,-50%);" +
        "width:min(38px,11%);height:min(38px,11%);" +
        "background:radial-gradient(circle,#7a5c3a,#4a2c10);" +
        "border-radius:45% 55% 50% 50%;" +
        "opacity:1;transition:opacity 0.1s;pointer-events:none;";
      stage.appendChild(d);
      this._dirty.push(d);
    }

    // Brush cursor label
    const brushLabel = document.createElement("div");
    brushLabel.style.cssText =
      "font-size:28px;position:absolute;pointer-events:none;z-index:100;" +
      "transform:translate(-50%,-100%);display:none;";
    brushLabel.textContent = "🧹";
    brushLabel.id = "brushCursor";
    this._wrap.appendChild(brushLabel);

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:12px;padding:16px;margin-top:auto;";
    const backBtn = document.createElement("button");
    backBtn.textContent = "← Back to Room";
    backBtn.style.cssText =
      "background:rgba(0,0,0,0.15);border:2px solid rgba(0,0,0,0.2);color:#5a3a00;" +
      "padding:8px 18px;border-radius:12px;font-size:13px;cursor:pointer;font-family:Arial;";
    backBtn.onclick = () => {
      game.inMiniGame = false; game.goArcade();
    };
    const homeBtn = document.createElement("button");
    homeBtn.textContent = "🏠 Home";
    homeBtn.style.cssText =
      "background:rgba(0,0,0,0.15);border:2px solid rgba(0,0,0,0.2);color:#5a3a00;" +
      "padding:8px 18px;border-radius:12px;font-size:13px;cursor:pointer;font-family:Arial;";
    homeBtn.onclick = () => { game.inMiniGame = false; game.goTitle(); };
    btnRow.appendChild(backBtn);
    btnRow.appendChild(homeBtn);
    this._wrap.appendChild(btnRow);

    this._bindInput(game, stage, onComplete);

    game._disposeScene = () => {
      this._done = true;
      this._cleanup.forEach(f => f());
      game.ui.innerHTML = "";
    };
  }

  private _brush(clientX: number, clientY: number, game: Game, onComplete?: () => void): void {
    if (this._done) return;
    const cursor = document.getElementById("brushCursor");
    if (cursor) {
      cursor.style.display = "block";
      cursor.style.left = `${clientX}px`;
      cursor.style.top  = `${clientY}px`;
    }

    for (const d of this._dirty) {
      if (parseFloat(d.style.opacity) <= 0) continue;
      const rect = d.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      if (Math.hypot(clientX - cx, clientY - cy) < rect.width * 1.2) {
        const newOp = Math.max(0, parseFloat(d.style.opacity) - 0.12);
        d.style.opacity = String(newOp);
        if (newOp === 0) this._cleaned++;
      }
    }

    const pct = Math.round((this._cleaned / this._dirty.length) * 100);
    const fill = document.getElementById("catPFill");
    if (fill) fill.style.width = `${Math.min(100, pct)}%`;

    if (this._cleaned >= this._dirty.length && !this._done) {
      this._done = true;
      this._showSuccess(game, onComplete);
    }
  }

  private _showSuccess(game: Game, onComplete?: () => void): void {
    game.state.coins += 20;
    game.save();

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.7);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:14px;z-index:50;font-family:Arial,sans-serif;";
    ov.innerHTML = `
      <div style="font-size:80px;">😸</div>
      <div style="color:#FFD700;font-size:30px;font-weight:900;text-shadow:0 0 20px gold;">Purrfect!</div>
      <div style="color:white;font-size:16px;">The cat is squeaky clean! +🪙 20</div>
    `;
    this._wrap.appendChild(ov);

    setTimeout(() => {
      if (onComplete) onComplete();
      else { game.inMiniGame = false; game.goArcade(); }
    }, 2200);
  }

  private _bindInput(game: Game, stage: HTMLDivElement, onComplete?: () => void): void {
    const onDown = () => { this._brushing = true; };
    const onUp   = () => { this._brushing = false; };
    const onMove = (e: MouseEvent) => {
      if (this._brushing) this._brush(e.clientX, e.clientY, game, onComplete);
    };
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches))
        this._brush(t.clientX, t.clientY, game, onComplete);
    };
    const onClick = (e: MouseEvent) => this._brush(e.clientX, e.clientY, game, onComplete);

    this._wrap.addEventListener("mousedown",  onDown);
    window.addEventListener("mouseup",    onUp);
    this._wrap.addEventListener("mousemove",  onMove);
    this._wrap.addEventListener("click",      onClick);
    stage.addEventListener("touchmove",   onTouch, { passive: false });
    stage.addEventListener("touchstart",  onTouch, { passive: false });

    this._cleanup.push(() => {
      this._wrap.removeEventListener("mousedown",  onDown);
      window.removeEventListener("mouseup",    onUp);
      this._wrap.removeEventListener("mousemove",  onMove);
      this._wrap.removeEventListener("click",      onClick);
      stage.removeEventListener("touchmove",   onTouch);
      stage.removeEventListener("touchstart",  onTouch);
    });
  }
}
