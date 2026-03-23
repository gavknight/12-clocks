import type { Game } from "../../game/Game";

const TIME_LIMIT = 1.0; // seconds to get 12 clicks

export class ClickTest {
  private _game: Game;
  private _clicks = 0;
  private _started = false;
  private _won = false;
  private _failed = false;
  private _startTime = 0;
  private _raf = 0;
  private _bestTime: number | null = null;
  private _attempts = 0;

  constructor(game: Game) {
    this._game = game;
    const raw = localStorage.getItem("clicktest_best");
    if (raw) this._bestTime = parseFloat(raw);
    this._render();
  }

  private _render(): void {
    const ui = this._game.ui;
    ui.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(135deg,#0a0020,#1a0040);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:Arial,sans-serif;gap:16px;pointer-events:all;user-select:none;";

    // Back button
    const back = document.createElement("button");
    back.textContent = "← Back";
    back.style.cssText =
      "position:absolute;top:16px;left:16px;background:rgba(255,255,255,0.08);" +
      "border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.7);" +
      "font-size:14px;padding:7px 14px;border-radius:10px;cursor:pointer;";
    back.onclick = () => {
      cancelAnimationFrame(this._raf);
      ui.innerHTML = "";
      import("../ArcadeScene").then(m => new m.ArcadeScene(this._game));
    };
    wrap.appendChild(back);

    // Title
    const title = document.createElement("div");
    title.style.cssText = "color:#FFD700;font-size:28px;font-weight:900;letter-spacing:2px;text-shadow:0 0 20px #FFD700;";
    title.textContent = "⚡ CLICK TEST";
    wrap.appendChild(title);

    // Subtitle
    const sub = document.createElement("div");
    sub.style.cssText = "color:rgba(255,255,255,0.5);font-size:14px;text-align:center;";
    sub.textContent = `Click 12 times in ${TIME_LIMIT}s`;
    wrap.appendChild(sub);

    // Best time
    const bestEl = document.createElement("div");
    bestEl.style.cssText = "color:#00ff88;font-size:13px;";
    bestEl.textContent = this._bestTime !== null ? `🏆 Best: ${this._bestTime.toFixed(3)}s` : "No best yet";
    wrap.appendChild(bestEl);

    // Attempts
    const attEl = document.createElement("div");
    attEl.style.cssText = "color:rgba(255,255,255,0.3);font-size:12px;";
    attEl.textContent = this._attempts > 0 ? `Attempts: ${this._attempts}` : "";
    wrap.appendChild(attEl);

    // Click counter display
    const counter = document.createElement("div");
    counter.id = "ct-counter";
    counter.style.cssText =
      "font-size:72px;font-weight:900;color:white;line-height:1;" +
      "text-shadow:0 0 30px rgba(255,255,255,0.4);";
    counter.textContent = "0/12";
    wrap.appendChild(counter);

    // Timer bar
    const barWrap = document.createElement("div");
    barWrap.style.cssText =
      "width:280px;height:12px;background:rgba(255,255,255,0.1);border-radius:6px;overflow:hidden;";
    const bar = document.createElement("div");
    bar.id = "ct-bar";
    bar.style.cssText =
      "height:100%;width:100%;background:linear-gradient(90deg,#00ff88,#FFD700);border-radius:6px;transition:none;";
    barWrap.appendChild(bar);
    wrap.appendChild(barWrap);

    // Timer text
    const timerEl = document.createElement("div");
    timerEl.id = "ct-timer";
    timerEl.style.cssText = "color:rgba(255,255,255,0.6);font-size:18px;font-weight:bold;";
    timerEl.textContent = `${TIME_LIMIT.toFixed(2)}s`;
    wrap.appendChild(timerEl);

    // Big click button
    const btn = document.createElement("button");
    btn.id = "ct-btn";
    btn.style.cssText =
      "width:160px;height:160px;border-radius:50%;" +
      "background:linear-gradient(135deg,#6a11cb,#2575fc);" +
      "border:4px solid rgba(100,150,255,0.6);color:white;" +
      "font-size:40px;cursor:pointer;font-weight:bold;" +
      "box-shadow:0 0 30px rgba(100,150,255,0.4);" +
      "transition:transform 0.05s,box-shadow 0.05s;";
    btn.textContent = "👆";
    wrap.appendChild(btn);

    // Status message
    const status = document.createElement("div");
    status.id = "ct-status";
    status.style.cssText = "font-size:16px;font-weight:bold;height:24px;";
    status.textContent = "Tap the button to start!";
    status.style.color = "rgba(255,255,255,0.6)";
    wrap.appendChild(status);

    ui.appendChild(wrap);

    // Click handler
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this._onClick(btn, counter, bar, timerEl, status, attEl, bestEl);
    });
  }

  private _onClick(
    btn: HTMLButtonElement,
    counter: HTMLElement,
    bar: HTMLElement,
    timerEl: HTMLElement,
    status: HTMLElement,
    attEl: HTMLElement,
    bestEl: HTMLElement,
  ): void {
    if (this._won || this._failed) return;

    if (!this._started) {
      // First click — start timer
      this._started = true;
      this._startTime = performance.now();
      this._clicks = 1;
      counter.textContent = `1/12`;
      this._runTimer(bar, timerEl, status, counter, btn, attEl, bestEl);
    } else {
      this._clicks++;
      counter.textContent = `${this._clicks}/12`;

      // Visual feedback
      btn.style.transform = "scale(0.92)";
      btn.style.boxShadow = "0 0 50px rgba(100,150,255,0.9)";
      setTimeout(() => {
        btn.style.transform = "scale(1)";
        btn.style.boxShadow = "0 0 30px rgba(100,150,255,0.4)";
      }, 50);

      if (this._clicks >= 12) {
        // WIN!
        this._won = true;
        cancelAnimationFrame(this._raf);
        const elapsed = (performance.now() - this._startTime) / 1000;
        if (this._bestTime === null || elapsed < this._bestTime) {
          this._bestTime = elapsed;
          localStorage.setItem("clicktest_best", elapsed.toString());
          bestEl.textContent = `🏆 New Best: ${elapsed.toFixed(3)}s!`;
          bestEl.style.color = "#FFD700";
        } else {
          bestEl.textContent = `🏆 Best: ${this._bestTime.toFixed(3)}s`;
        }
        bar.style.background = "#00ff88";
        bar.style.width = "100%";
        timerEl.textContent = `${elapsed.toFixed(3)}s`;
        counter.style.color = "#00ff88";
        status.style.color = "#00ff88";
        status.textContent = `🎉 YOU WIN! ${elapsed.toFixed(3)}s`;
        btn.textContent = "🔄";
        btn.style.background = "linear-gradient(135deg,#00c853,#00ff88)";
        btn.style.boxShadow = "0 0 40px rgba(0,255,136,0.6)";
        btn.addEventListener("pointerdown", () => this._reset(attEl), { once: true });
      }
    }
  }

  private _runTimer(
    bar: HTMLElement,
    timerEl: HTMLElement,
    status: HTMLElement,
    counter: HTMLElement,
    btn: HTMLButtonElement,
    attEl: HTMLElement,
    bestEl: HTMLElement,
  ): void {
    const loop = () => {
      if (this._won || this._failed) return;
      const elapsed = (performance.now() - this._startTime) / 1000;
      const remaining = Math.max(0, TIME_LIMIT - elapsed);
      const pct = remaining / TIME_LIMIT;

      bar.style.width = `${pct * 100}%`;
      bar.style.background = pct > 0.4
        ? "linear-gradient(90deg,#00ff88,#FFD700)"
        : pct > 0.2
          ? "linear-gradient(90deg,#FFD700,#ff6600)"
          : "linear-gradient(90deg,#ff3300,#ff0000)";
      timerEl.textContent = `${remaining.toFixed(2)}s`;

      if (remaining <= 0) {
        // FAIL
        this._failed = true;
        this._attempts++;
        bar.style.width = "0%";
        counter.style.color = "#ff4444";
        status.style.color = "#ff4444";
        status.textContent = `❌ Too slow! Got ${this._clicks}/12`;
        attEl.textContent = `Attempts: ${this._attempts}`;
        btn.textContent = "🔄";
        btn.style.background = "linear-gradient(135deg,#c0392b,#e74c3c)";
        btn.style.boxShadow = "0 0 30px rgba(255,0,0,0.4)";
        btn.addEventListener("pointerdown", () => this._reset(attEl), { once: true });
        return;
      }

      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  private _reset(attEl: HTMLElement): void {
    cancelAnimationFrame(this._raf);
    this._clicks = 0;
    this._started = false;
    this._won = false;
    this._failed = false;
    this._render();
  }
}
