/**
 * Boldy — Math class with a bald teacher. Answer 5 questions. Don't get caught.
 */
import type { Game } from "../../game/Game";

// ── Question generator ────────────────────────────────────────────────────────
function genQuestion(n: number): { text: string; answer: string; choices: string[] } {
  const r = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

  if (n === 5) {
    return { text: "djfjhndskjfndkhrfkjdjhfk", answer: "there is no answer", choices: [] };
  }

  let question = "", correct = "";
  if (n === 1) {
    const a = r(1, 10), b = r(1, 10);
    question = `${a} + ${b} = ?`; correct = String(a + b);
  } else if (n === 2) {
    const a = r(11, 20), b = r(1, 9);
    question = `${a} - ${b} = ?`; correct = String(a - b);
  } else if (n === 3) {
    const a = r(2, 6), b = r(2, 6);
    question = `${a} × ${b} = ?`; correct = String(a * b);
  } else {
    const a = r(15, 50), b = r(10, 40);
    question = `${a} + ${b} = ?`; correct = String(a + b);
  }

  const wrongs = new Set<string>();
  while (wrongs.size < 3) {
    const w = String(parseInt(correct) + r(-6, 6));
    if (w !== correct && parseInt(w) >= 0) wrongs.add(w);
  }
  const choices = [correct, ...wrongs].sort(() => Math.random() - 0.5);
  return { text: question, answer: correct, choices };
}

// ── Main class ────────────────────────────────────────────────────────────────
export class Boldy {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _qNum = 1;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;background:#d4c4a0;" +
      "pointer-events:all;font-family:Arial,sans-serif;";
    g.ui.appendChild(this._wrap);
    this._showQuestion();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLASSROOM / QUESTION
  // ══════════════════════════════════════════════════════════════════════════

  private _showQuestion(): void {
    this._wrap.innerHTML = "";
    const q = genQuestion(this._qNum);

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    this._wrap.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = this._wrap.clientWidth  || window.innerWidth;
      canvas.height = this._wrap.clientHeight || window.innerHeight;
      draw();
    };

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      _drawClassroom(ctx, W, H);
      _drawBoldy(ctx, W * 0.14, H * 0.52, Math.min(W, H) * 0.20, false);

      // Chalkboard
      const cbX = W * 0.26, cbY = H * 0.08, cbW = W * 0.52, cbH = H * 0.38;
      ctx.fillStyle = "#2d6a2d";
      ctx.beginPath(); ctx.roundRect(cbX, cbY, cbW, cbH, 6); ctx.fill();
      ctx.strokeStyle = "#8B6914"; ctx.lineWidth = 10; ctx.stroke();

      // Q number
      ctx.fillStyle = "rgba(255,255,200,0.45)";
      ctx.font = `bold ${Math.min(H * 0.038, 20)}px Arial`;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(`Question ${this._qNum} / 5`, cbX + 14, cbY + 12);

      // Question text
      if (this._qNum === 5) {
        ctx.fillStyle = "#e0e0e0";
        ctx.font = `bold ${Math.min(cbW * 0.055, 18)}px 'Courier New',monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(q.text, cbX + cbW / 2, cbY + cbH * 0.55);
        ctx.fillStyle = "rgba(255,255,200,0.5)";
        ctx.font = `italic ${Math.min(H * 0.032, 15)}px Arial`;
        ctx.fillText("Type your answer on the iPad below", cbX + cbW / 2, cbY + cbH * 0.82);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${Math.min(cbH * 0.38, 58)}px Arial`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(q.text, cbX + cbW / 2, cbY + cbH * 0.57);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    // Exit button
    const exitBtn = document.createElement("button");
    exitBtn.textContent = "✕";
    exitBtn.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.4);color:white;" +
      "width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.3);" +
      "cursor:pointer;font-size:16px;pointer-events:all;";
    exitBtn.onclick = () => this._cleanup();
    this._wrap.appendChild(exitBtn);

    if (this._qNum === 5) {
      // iPad input
      this._showIpad(q.answer);
    } else {
      // Multiple choice buttons
      const btnWrap = document.createElement("div");
      btnWrap.style.cssText =
        "position:absolute;bottom:12%;left:50%;transform:translateX(-50%);" +
        "display:flex;gap:clamp(10px,2vw,22px);pointer-events:all;flex-wrap:wrap;justify-content:center;";
      this._wrap.appendChild(btnWrap);

      for (const choice of q.choices) {
        const btn = document.createElement("button");
        btn.textContent = choice;
        btn.style.cssText =
          "background:rgba(255,255,255,0.92);color:#1a1a2e;font-size:clamp(18px,3.5vw,32px);" +
          "font-weight:900;padding:14px 32px;border-radius:14px;" +
          "border:3px solid rgba(0,0,0,0.15);cursor:pointer;min-width:90px;" +
          "transition:transform 0.1s,background 0.1s;";
        btn.onmouseenter = () => btn.style.background = "#ffe060";
        btn.onmouseleave = () => btn.style.background = "rgba(255,255,255,0.92)";
        btn.onclick = () => {
          btnWrap.querySelectorAll("button").forEach(b => (b as HTMLButtonElement).disabled = true);
          if (choice === q.answer) this._correct();
          else this._wrong();
        };
        btnWrap.appendChild(btn);
      }
    }
  }

  private _showIpad(correctAnswer: string): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;bottom:7%;left:50%;transform:translateX(-50%);" +
      "background:#1c1c1e;border-radius:22px;padding:22px 28px 20px;" +
      "border:4px solid #3a3a3c;box-shadow:0 10px 40px rgba(0,0,0,0.7);" +
      "pointer-events:all;min-width:300px;text-align:center;";

    const home = document.createElement("div");
    home.style.cssText =
      "width:40px;height:5px;background:#3a3a3c;border-radius:3px;margin:0 auto 14px;";

    const label = document.createElement("div");
    label.style.cssText = "color:rgba(255,255,255,0.5);font-size:13px;margin-bottom:10px;";
    label.textContent = "Type your answer:";

    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "answer here...";
    inp.style.cssText =
      "background:#2c2c2e;border:1px solid #48484a;border-radius:12px;color:white;" +
      "font-size:16px;padding:11px 16px;width:100%;box-sizing:border-box;" +
      "outline:none;margin-bottom:12px;text-align:center;";

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Submit ↵";
    submitBtn.style.cssText =
      "background:#0a84ff;color:white;font-size:15px;font-weight:bold;" +
      "padding:11px 24px;border-radius:12px;border:none;cursor:pointer;width:100%;";

    const check = () => {
      const val = inp.value.trim().toLowerCase();
      if (val === correctAnswer.toLowerCase()) {
        this._correct();
      } else {
        inp.style.background = "rgba(255,60,60,0.25)";
        inp.value = "";
        setTimeout(() => { inp.style.background = "#2c2c2e"; }, 500);
        this._wrong();
      }
    };

    submitBtn.onclick = check;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") check(); });

    ov.appendChild(home);
    ov.appendChild(label);
    ov.appendChild(inp);
    ov.appendChild(submitBtn);
    this._wrap.appendChild(ov);
    setTimeout(() => inp.focus(), 80);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CORRECT / WRONG
  // ══════════════════════════════════════════════════════════════════════════

  private _correct(): void {
    const flash = document.createElement("div");
    flash.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(0,220,80,0.35);" +
      "pointer-events:none;transition:opacity 0.5s;";
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = "0"; setTimeout(() => flash.remove(), 500); }, 250);

    if (this._qNum >= 5) {
      setTimeout(() => this._winScreen(), 700);
    } else {
      this._qNum++;
      setTimeout(() => this._showQuestion(), 750);
    }
  }

  private _wrong(): void {
    const flash = document.createElement("div");
    flash.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(255,30,30,0.45);" +
      "pointer-events:none;transition:opacity 0.5s;";
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = "0"; setTimeout(() => flash.remove(), 500); }, 350);
    setTimeout(() => this._runScene(), 900);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RUN FROM BOLDY
  // ══════════════════════════════════════════════════════════════════════════

  private _runScene(): void {
    this._wrap.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    this._wrap.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = this._wrap.clientWidth  || window.innerWidth;
      canvas.height = this._wrap.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // State
    let px = canvas.width * 0.75, py = canvas.height * 0.5;
    let bx = canvas.width * 0.5,  by = canvas.height * 0.5;
    let done = false;
    let t = 0;
    const PR = 16, BR = 30;
    const PS = 4.2, BS = 2.4;

    // Controls
    const keys: Record<string, boolean> = {};
    const onKey = (e: KeyboardEvent) => { keys[e.key] = e.type === "keydown"; e.preventDefault(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    // D-pad overlay
    const dpad = document.createElement("div");
    dpad.style.cssText =
      "position:absolute;bottom:20px;right:20px;display:grid;" +
      "grid-template-areas:'. u .' 'l . r' '. d .';grid-template-columns:repeat(3,52px);" +
      "grid-template-rows:repeat(3,52px);gap:4px;pointer-events:all;";
    const dBtns: Array<[string, string, string]> = [
      ["▲","ArrowUp","u"], ["◀","ArrowLeft","l"],
      ["▼","ArrowDown","d"], ["▶","ArrowRight","r"],
    ];
    for (const [label, key, area] of dBtns) {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText =
        `grid-area:${area};background:rgba(255,255,255,0.18);color:white;font-size:20px;` +
        "border:1px solid rgba(255,255,255,0.3);border-radius:10px;cursor:pointer;";
      b.addEventListener("pointerdown",  () => { keys[key] = true; });
      b.addEventListener("pointerup",    () => { keys[key] = false; });
      b.addEventListener("pointerleave", () => { keys[key] = false; });
      dpad.appendChild(b);
    }
    this._wrap.appendChild(dpad);

    // HUD
    const hud = document.createElement("div");
    hud.style.cssText =
      "position:absolute;top:14px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.65);color:white;font-size:16px;font-weight:bold;" +
      "padding:9px 22px;border-radius:22px;pointer-events:none;white-space:nowrap;";
    hud.innerHTML = "← Run to the <b style='color:#80ff80'>EXIT</b>!";
    this._wrap.appendChild(hud);

    const loop = () => {
      if (!this._wrap.isConnected || done) return;
      requestAnimationFrame(loop);
      t += 0.016;

      const W = canvas.width, H = canvas.height;

      // Move player
      if (keys["ArrowLeft"]  || keys["a"] || keys["A"]) px -= PS;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) px += PS;
      if (keys["ArrowUp"]    || keys["w"] || keys["W"]) py -= PS;
      if (keys["ArrowDown"]  || keys["s"] || keys["S"]) py += PS;
      px = Math.max(PR, Math.min(W - PR, px));
      py = Math.max(PR, Math.min(H - PR, py));

      // Boldy chases
      const dx = px - bx, dy = py - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) { bx += (dx / dist) * BS; by += (dy / dist) * BS; }

      // ── Draw hallway ──────────────────────────────────────────────────────
      // Wall
      ctx.fillStyle = "#d4c4a0";
      ctx.fillRect(0, 0, W, H);
      // Ceiling strip
      ctx.fillStyle = "#c8c8c8";
      ctx.fillRect(0, 0, W, H * 0.12);
      // Floor strip
      ctx.fillStyle = "#b8a070";
      ctx.fillRect(0, H * 0.88, W, H * 0.12);
      // Lockers
      const lkW = 58;
      for (let i = 0; i < Math.ceil(W / lkW); i++) {
        ctx.fillStyle = i % 2 === 0 ? "#6a8ab0" : "#5a7aa0";
        ctx.fillRect(i * lkW + 2, H * 0.12, lkW - 4, H * 0.76);
        ctx.strokeStyle = "#3a5a80"; ctx.lineWidth = 1.5;
        ctx.strokeRect(i * lkW + 2, H * 0.12, lkW - 4, H * 0.76);
        ctx.fillStyle = "#ffd700";
        ctx.beginPath(); ctx.arc(i * lkW + lkW * 0.5, H * 0.5, 5, 0, Math.PI * 2); ctx.fill();
      }
      // Ceiling lights
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(255,255,200,${0.6 + 0.2 * Math.sin(t * 2 + i)})`;
        ctx.fillRect(W * (i + 0.5) / 5 - 30, 0, 60, H * 0.12);
      }

      // Exit door (left wall)
      const exitW = W * 0.07, exitH = H * 0.5;
      const exitY = (H - exitH) / 2;
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(0, exitY, exitW, exitH);
      ctx.fillStyle = "#c8a870";
      ctx.fillRect(exitW, exitY, 8, exitH);
      ctx.fillStyle = "#ffd700";
      ctx.beginPath(); ctx.arc(exitW * 0.75, H * 0.5, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#00cc44";
      ctx.font = `bold ${Math.min(H * 0.045, 18)}px Arial`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("EXIT", exitW / 2, exitY - 16);

      // Player (running emoji)
      ctx.font = `${PR * 2.2}px Arial`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🏃", px, py);

      // Boldy chasing
      _drawBoldy(ctx, bx, by, BR * 2.2, false, t, true);

      // ── Check exit ────────────────────────────────────────────────────────
      if (px - PR <= exitW + 8) {
        done = true;
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        const flash = document.createElement("div");
        flash.style.cssText =
          "position:fixed;inset:0;z-index:9999;background:rgba(0,200,255,0.35);" +
          "pointer-events:none;transition:opacity 0.5s;";
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = "0"; setTimeout(() => flash.remove(), 500); }, 300);
        setTimeout(() => this._showQuestion(), 700);
        return;
      }

      // ── Check caught ──────────────────────────────────────────────────────
      if (dist < PR + BR) {
        done = true;
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("keyup", onKey);
        this._gameOver();
      }
    };
    requestAnimationFrame(loop);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════

  private _winScreen(): void {
    this._wrap.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    this._wrap.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    const resize = () => {
      canvas.width  = this._wrap.clientWidth  || window.innerWidth;
      canvas.height = this._wrap.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const loop = () => {
      if (!this._wrap.isConnected) return;
      requestAnimationFrame(loop);
      t += 0.016;
      const W = canvas.width, H = canvas.height;
      _drawClassroom(ctx, W, H);

      // Stars orbiting
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.8;
        const rx = Math.min(W, H) * 0.38, ry = Math.min(W, H) * 0.12;
        ctx.font = `${Math.min(H * 0.05, 28)}px Arial`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("⭐", W / 2 + Math.cos(a) * rx, H * 0.46 + Math.sin(a) * ry);
      }

      // Boldy clapping centre stage
      _drawBoldy(ctx, W * 0.5, H * 0.52, Math.min(W, H) * 0.24, true, t);

      // Title
      ctx.save();
      ctx.font = `900 ${Math.min(H * 0.11, 64)}px 'Arial Black',Arial`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#ff8800"; ctx.shadowBlur = 20;
      ctx.fillText("END OF DAY! 🎉", W / 2, H * 0.13);
      ctx.restore();

      // Sub
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = `bold ${Math.min(H * 0.038, 20)}px Arial`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Boldy is proud of you! 👏", W / 2, H * 0.87);
    };
    requestAnimationFrame(loop);

    const ui = document.createElement("div");
    ui.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:flex-end;" +
      "justify-content:center;padding-bottom:5%;pointer-events:none;";
    const btn = document.createElement("button");
    btn.textContent = "← Back to Arcade";
    btn.style.cssText =
      "background:rgba(255,255,255,0.15);color:white;font-size:16px;font-weight:bold;" +
      "padding:13px 36px;border-radius:24px;border:2px solid rgba(255,255,255,0.4);" +
      "cursor:pointer;pointer-events:all;";
    btn.onclick = () => this._cleanup();
    ui.appendChild(btn);
    this._wrap.appendChild(ui);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GAME OVER
  // ══════════════════════════════════════════════════════════════════════════

  private _gameOver(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:#0d0d0d;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:18px;font-family:'Arial Black',Arial;";

    const canvas = document.createElement("canvas");
    canvas.width = 160; canvas.height = 220;
    canvas.style.cssText = "margin-bottom:8px;";
    const ctx = canvas.getContext("2d")!;
    _drawBoldy(ctx, 80, 120, 100, false, 0, false);
    // Override mouth to angry frown
    ctx.strokeStyle = "#8B0000"; ctx.lineWidth = 5; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(80, 105, 24, Math.PI + 0.2, Math.PI * 2 - 0.2);
    ctx.stroke();

    ov.appendChild(canvas);
    const title = document.createElement("div");
    title.style.cssText =
      "color:#ff2020;font-size:clamp(22px,5vw,44px);font-weight:900;text-align:center;";
    title.textContent = "BOLDY GOT YOU.";
    const sub = document.createElement("div");
    sub.style.cssText =
      "color:rgba(255,150,150,0.55);font-size:15px;font-family:Arial;text-align:center;";
    sub.textContent = "He was not happy about that wrong answer.";

    const retry = document.createElement("button");
    retry.textContent = "🔄 Try Again";
    retry.style.cssText =
      "background:rgba(255,30,30,0.2);color:#ff8080;font-size:15px;font-weight:bold;" +
      "padding:11px 30px;border-radius:22px;border:1px solid rgba(255,60,60,0.3);cursor:pointer;margin-top:8px;";
    retry.onclick = () => { ov.remove(); this._qNum = 1; this._showQuestion(); };

    const menuB = document.createElement("button");
    menuB.textContent = "← Arcade";
    menuB.style.cssText =
      "background:none;color:rgba(255,255,255,0.35);font-size:13px;" +
      "padding:6px 16px;border-radius:16px;border:1px solid rgba(255,255,255,0.15);cursor:pointer;";
    menuB.onclick = () => { ov.remove(); this._cleanup(); };

    ov.appendChild(title);
    ov.appendChild(sub);
    ov.appendChild(retry);
    ov.appendChild(menuB);
    document.body.appendChild(ov);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ══════════════════════════════════════════════════════════════════════════

  private _cleanup(): void {
    this._wrap.remove();
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function _drawClassroom(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const floorY = H * 0.63;
  // Wall
  ctx.fillStyle = "#d4c4a0";
  ctx.fillRect(0, 0, W, floorY);
  // Floor
  const fg = ctx.createLinearGradient(0, floorY, 0, H);
  fg.addColorStop(0, "#c8a870"); fg.addColorStop(1, "#a08050");
  ctx.fillStyle = fg;
  ctx.fillRect(0, floorY, W, H - floorY);
  // Floor boards
  ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(0, floorY + (H - floorY) * i / 6);
    ctx.lineTo(W, floorY + (H - floorY) * i / 6);
    ctx.stroke();
  }
  // Windows (right side)
  const ww = W * 0.09, wh = H * 0.2;
  for (const wx of [W * 0.80, W * 0.92]) {
    ctx.fillStyle = "#a8d8f0";
    ctx.fillRect(wx - ww / 2, H * 0.07, ww, wh);
    ctx.strokeStyle = "#8B6914"; ctx.lineWidth = 5;
    ctx.strokeRect(wx - ww / 2, H * 0.07, ww, wh);
    ctx.strokeStyle = "#8B6914"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wx, H * 0.07); ctx.lineTo(wx, H * 0.07 + wh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx - ww / 2, H * 0.07 + wh / 2); ctx.lineTo(wx + ww / 2, H * 0.07 + wh / 2); ctx.stroke();
    // Sunshine
    ctx.fillStyle = "rgba(255,240,150,0.1)";
    ctx.beginPath();
    ctx.moveTo(wx - ww / 2, H * 0.07);
    ctx.lineTo(wx - ww, H * 0.07 + wh * 1.8);
    ctx.lineTo(wx + ww * 1.5, H * 0.07 + wh * 1.8);
    ctx.lineTo(wx + ww / 2, H * 0.07);
    ctx.fill();
  }
  // Teacher's desk
  ctx.fillStyle = "#8B6914";
  ctx.fillRect(W * 0.28, floorY - H * 0.08, W * 0.2, H * 0.08);
  ctx.fillStyle = "#6B4A10";
  ctx.fillRect(W * 0.3, floorY, W * 0.04, H * 0.06);
  ctx.fillRect(W * 0.43, floorY, W * 0.04, H * 0.06);
}

function _drawBoldy(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number,
  clapping: boolean, t: number = 0, angry: boolean = false
): void {
  const s = size * 0.5;

  // Legs
  ctx.fillStyle = "#1a252f";
  const ls = Math.sin(angry ? t * 10 : 0) * s * 0.12;
  ctx.fillRect(cx - s * 0.22, cy + s * 0.6, s * 0.18, s * 0.42 + ls);
  ctx.fillRect(cx + s * 0.04, cy + s * 0.6, s * 0.18, s * 0.42 - ls);
  // Shoes
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.ellipse(cx - s * 0.13, cy + s * 1.04 + ls, s * 0.16, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.13, cy + s * 1.04 - ls, s * 0.16, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();

  // Body (suit)
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath(); ctx.roundRect(cx - s * 0.3, cy - s * 0.08, s * 0.6, s * 0.7, s * 0.05); ctx.fill();
  // Shirt
  ctx.fillStyle = "#ecf0f1";
  ctx.fillRect(cx - s * 0.09, cy - s * 0.05, s * 0.18, s * 0.32);
  // Tie
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.04);
  ctx.lineTo(cx - s * 0.055, cy + s * 0.12);
  ctx.lineTo(cx, cy + s * 0.28);
  ctx.lineTo(cx + s * 0.055, cy + s * 0.12);
  ctx.closePath(); ctx.fill();

  // Arms
  if (clapping) {
    const clap = Math.abs(Math.sin(t * 9)) * s * 0.18;
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath(); ctx.roundRect(cx - s * 0.52 + clap, cy - s * 0.32, s * 0.24, s * 0.2, s * 0.04); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx + s * 0.28 - clap, cy - s * 0.32, s * 0.24, s * 0.2, s * 0.04); ctx.fill();
    ctx.font = `${s * 0.3}px Arial`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("👏", cx, cy - s * 0.26);
  } else {
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath(); ctx.roundRect(cx - s * 0.5, cy, s * 0.2, s * 0.48, s * 0.04); ctx.fill();
    ctx.beginPath(); ctx.roundRect(cx + s * 0.3, cy, s * 0.2, s * 0.48, s * 0.04); ctx.fill();
    ctx.fillStyle = "#f0c898";
    ctx.beginPath(); ctx.arc(cx - s * 0.4, cy + s * 0.5, s * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.4, cy + s * 0.5, s * 0.1, 0, Math.PI * 2); ctx.fill();
  }

  // Neck
  ctx.fillStyle = "#f0c898";
  ctx.fillRect(cx - s * 0.1, cy - s * 0.18, s * 0.2, s * 0.14);

  // Head (bald and proud)
  const hr = s * 0.34;
  const hy = cy - s * 0.48;
  const hg = ctx.createRadialGradient(cx - hr * 0.2, hy - hr * 0.2, hr * 0.05, cx, hy, hr);
  hg.addColorStop(0, "#f5d5a0"); hg.addColorStop(1, "#d4a870");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(cx, hy, hr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#c49060"; ctx.lineWidth = 2; ctx.stroke();
  // Shine
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath(); ctx.ellipse(cx - hr * 0.18, hy - hr * 0.28, hr * 0.22, hr * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();

  // Ears
  ctx.fillStyle = "#d4a870";
  ctx.beginPath(); ctx.ellipse(cx - hr, hy, hr * 0.18, hr * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + hr, hy, hr * 0.18, hr * 0.24, 0, 0, Math.PI * 2); ctx.fill();

  // Glasses
  for (const ex of [cx - hr * 0.36, cx + hr * 0.36]) {
    ctx.strokeStyle = "#2c3e50"; ctx.lineWidth = s * 0.028;
    ctx.beginPath(); ctx.arc(ex, hy + hr * 0.02, hr * 0.22, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = angry ? "#cc0000" : "#2c3e50";
    ctx.beginPath(); ctx.ellipse(ex, hy + hr * 0.02, hr * 0.1, hr * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath(); ctx.arc(ex - hr * 0.03, hy - hr * 0.04, hr * 0.034, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = "#2c3e50"; ctx.lineWidth = s * 0.028;
  ctx.beginPath(); ctx.moveTo(cx - hr * 0.14, hy + hr * 0.02); ctx.lineTo(cx + hr * 0.14, hy + hr * 0.02); ctx.stroke();

  // Eyebrows
  ctx.strokeStyle = angry ? "#8B0000" : "#8B6914";
  ctx.lineWidth = s * (angry ? 0.06 : 0.035); ctx.lineCap = "round";
  if (angry) {
    ctx.beginPath(); ctx.moveTo(cx - hr * 0.58, hy - hr * 0.3); ctx.lineTo(cx - hr * 0.16, hy - hr * 0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + hr * 0.58, hy - hr * 0.3); ctx.lineTo(cx + hr * 0.16, hy - hr * 0.18); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(cx - hr * 0.56, hy - hr * 0.28); ctx.lineTo(cx - hr * 0.14, hy - hr * 0.22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + hr * 0.56, hy - hr * 0.28); ctx.lineTo(cx + hr * 0.14, hy - hr * 0.22); ctx.stroke();
  }

  // Nose
  ctx.fillStyle = "#c49060";
  ctx.beginPath(); ctx.ellipse(cx, hy + hr * 0.22, hr * 0.1, hr * 0.08, 0, 0, Math.PI * 2); ctx.fill();

  // Mouth
  ctx.strokeStyle = "#8B5E3C"; ctx.lineWidth = s * 0.035; ctx.lineCap = "round";
  ctx.beginPath();
  if (clapping || (!angry)) {
    ctx.arc(cx, hy + hr * 0.32, hr * 0.22, 0.1, Math.PI - 0.1); // smile
  } else {
    ctx.arc(cx, hy + hr * 0.52, hr * 0.22, Math.PI + 0.15, Math.PI * 2 - 0.15); // frown
  }
  ctx.stroke();
}
