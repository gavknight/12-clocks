/**
 * GamepadManager — controller support that makes the left stick act as a mouse.
 *
 * - When you touch the controller: real cursor hides, fake cursor appears
 *   exactly where your mouse was and moves with the left stick.
 * - When you move the real mouse or press a key: real cursor comes back.
 * - When a mini-game is active (host.inMiniGame): cursor is hidden and
 *   the fake cursor does nothing — A fires autoClickCallback, B goes back.
 *
 * Left stick   → mouse movement (fires real mousemove so hover/drag works)
 * A (0) / X(2) → left click  (or autoClickCallback in mini-game mode)
 * B (1)        → back / menu
 * Y (3)        → View Clock (ExploreScene)
 * Start (9)    → Play / Continue button
 * D-pad ←/→   → scroll explore room
 * LB / RB      → fast scroll explore room
 * D-pad ↑/↓   → scroll menus
 * Right stick  → 3D games only (camera) — gpState.rx / gpState.ry
 */

export const gpState = {
  rx: 0, ry: 0,       // right stick (camera)
  lx: 0, ly: 0,       // left stick (movement in mini-games)
  btnA: false,         // Cross / A button (jump)
  btnSquare: false,    // Square / X button (interact / pick up)
  btnRT: false,        // Right Trigger (send drone)
  lb: false,           // left bumper (fly down in creative)
};

/** Minimal interface the GamepadManager needs from the Game object. */
export interface IGameHost {
  readonly inMiniGame: boolean;
  readonly autoClickCallback: (() => void) | null;
}

const DEAD = 0.12;
const dead = (v: number) => Math.abs(v) > DEAD ? v : 0;

export class GamepadManager {
  // Start fake cursor at current real mouse position (tracked below)
  private _x = window.innerWidth / 2;
  private _y = window.innerHeight / 2;

  private readonly _cursorEl: HTMLDivElement;
  private readonly _hideStyle: HTMLStyleElement;
  private readonly _indicatorEl: HTMLDivElement;
  private _prev: boolean[] = [];
  private _rafId = 0;
  private _active = false;
  private _synthetic = false;
  private _host: IGameHost | null;

  constructor(host?: IGameHost) {
    this._host = host ?? null;
    // Track real mouse position so fake cursor picks up from the same spot
    window.addEventListener("mousemove", e => {
      if (!this._synthetic) {
        this._x = e.clientX;
        this._y = e.clientY;
        if (this._active) this._exitControllerMode();
      }
    }, { passive: true });

    window.addEventListener("keydown", () => {
      if (this._active) this._exitControllerMode();
    }, { passive: true, capture: true });

    // ── Style that nukes the real cursor (always in DOM, toggled via textContent) ──
    this._hideStyle = document.createElement("style");
    document.head.appendChild(this._hideStyle); // stays in DOM permanently

    // ── Fake arrow cursor ─────────────────────────────────────────────────────
    // Tip of arrow is at top-left corner (0,0) of the element
    this._cursorEl = document.createElement("div");
    this._cursorEl.style.cssText =
      "position:fixed;top:0;left:0;pointer-events:none;z-index:2147483647;" +
      "display:none;will-change:transform;";
    // Classic Windows-style arrow cursor, scaled up slightly for visibility
    this._cursorEl.innerHTML = `<svg width="28" height="32" viewBox="0 0 14 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1 L1 13 L4 10 L7 15 L9 14 L6 9 L10 9 Z"
        fill="white" stroke="black" stroke-width="1" stroke-linejoin="round"/>
    </svg>`;
    document.body.appendChild(this._cursorEl);

    // ── "Controller active" toast ─────────────────────────────────────────────
    this._indicatorEl = document.createElement("div");
    this._indicatorEl.style.cssText =
      "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.85);color:white;font-size:14px;font-weight:bold;" +
      "font-family:Arial,sans-serif;padding:8px 20px;border-radius:20px;" +
      "border:2px solid rgba(255,255,255,0.3);z-index:2147483646;" +
      "display:none;pointer-events:none;opacity:0;transition:opacity 0.3s;" +
      "white-space:nowrap;";
    this._indicatorEl.textContent = "🎮 Controller active — left stick = mouse";
    document.body.appendChild(this._indicatorEl);

    this._rafId = requestAnimationFrame(() => this._poll());
  }

  // ── Mode switching ─────────────────────────────────────────────────────────

  private _enterControllerMode(): void {
    this._active = true;
    // Hide the real cursor immediately (textContent toggle — no DOM insertion flicker)
    this._hideStyle.textContent = "* { cursor: none !important; }";
    // Place fake cursor exactly where the real one was
    this._cursorEl.style.transform = `translate(${this._x}px,${this._y}px)`;
    // In mini-game mode the fake cursor stays hidden
    if (this._host?.inMiniGame) {
      this._cursorEl.style.display = "none";
    } else {
      this._cursorEl.style.display = "block";
    }
    this._indicatorEl.style.display = "block";
    requestAnimationFrame(() => { this._indicatorEl.style.opacity = "1"; });
    setTimeout(() => {
      if (this._active) this._indicatorEl.style.opacity = "0";
    }, 2500);
    setTimeout(() => {
      if (this._active) this._indicatorEl.style.display = "none";
    }, 3000);
  }

  private _exitControllerMode(): void {
    this._active = false;
    gpState.rx = 0; gpState.ry = 0;
    gpState.lx = 0; gpState.ly = 0;
    gpState.btnA = false; gpState.btnSquare = false; gpState.btnRT = false; gpState.lb = false;
    this._hideStyle.textContent = ""; // re-show real cursor (style stays in DOM)
    this._cursorEl.style.display = "none";
    this._indicatorEl.style.opacity = "0";
    setTimeout(() => {
      if (!this._active) this._indicatorEl.style.display = "none";
    }, 350);
  }

  // ── Poll ───────────────────────────────────────────────────────────────────

  private _poll(): void {
    this._rafId = requestAnimationFrame(() => this._poll());

    const gp = Array.from(navigator.getGamepads()).find(g => g?.connected) ?? null;
    if (!gp) return;

    const lx = dead(gp.axes[0] ?? 0);
    const ly = dead(gp.axes[1] ?? 0);
    const rx = dead(gp.axes[2] ?? 0);
    const ry = dead(gp.axes[3] ?? 0);
    const anyActivity = lx || ly || rx || ry || gp.buttons.some(b => b.pressed);

    if (anyActivity && !this._active) this._enterControllerMode();
    if (!this._active) return;

    // ── Mini-game mode: invisible cursor, expose raw axes/buttons ────────
    if (this._host?.inMiniGame) {
      this._cursorEl.style.display = "none";
      // Expose left stick so games like Minecraft can drive movement
      gpState.lx = lx;
      gpState.ly = ly;
      gpState.rx = rx;
      gpState.ry = ry;
      const btns = gp.buttons.map(b => b.pressed);
      gpState.btnA      = btns[0] ?? false;
      gpState.btnSquare = btns[2] ?? false;
      gpState.btnRT     = (gp.axes[5] ?? 0) > 0.1 || (btns[7] ?? false);
      gpState.lb        = btns[4] ?? false;
      // Cross/A → call the game's own action handler (jump, click, etc.)
      if (btns[0] && !this._prev[0]) {
        const cb = this._host.autoClickCallback;
        if (cb) {
          cb();
        } else {
          // Fallback: fire pointerdown on window so games listening on window respond
          window.dispatchEvent(new PointerEvent("pointerdown", {
            bubbles: true, cancelable: true, pointerId: 1, isPrimary: true,
          }));
        }
      }
      // Cross/A released → fire pointerup
      if (!btns[0] && this._prev[0]) {
        const cb = this._host.autoClickCallback;
        if (!cb) {
          window.dispatchEvent(new PointerEvent("pointerup", {
            bubbles: true, cancelable: true, pointerId: 1, isPrimary: true,
          }));
        }
      }
      if (btns[1] && !this._prev[1]) this._back();
      if (btns[9] && !this._prev[9]) {
        (document.getElementById("contBtn") ?? document.getElementById("playBtn"))?.click();
      }
      this._prev = btns;
      return;
    }
    // Clear mini-game axes when not in a mini-game
    gpState.lx = 0; gpState.ly = 0; gpState.btnA = false; gpState.btnSquare = false; gpState.btnRT = false; gpState.lb = false;

    // ── Normal mode: show fake cursor ─────────────────────────────────────
    this._cursorEl.style.display = "block";

    // ── Left stick → move cursor ───────────────────────────────────────────
    const SPEED = 14;
    const nx = Math.max(0, Math.min(window.innerWidth,  this._x + lx * SPEED * Math.abs(lx)));
    const ny = Math.max(0, Math.min(window.innerHeight, this._y + ly * SPEED * Math.abs(ly)));

    if (nx !== this._x || ny !== this._y) {
      this._x = nx;
      this._y = ny;
      this._cursorEl.style.transform = `translate(${this._x}px,${this._y}px)`;

      // Fire mousemove so CSS :hover, drag-scroll, BabylonJS etc all respond
      const target = document.elementFromPoint(this._x, this._y);
      if (target) {
        this._synthetic = true;
        target.dispatchEvent(new MouseEvent("mousemove", {
          bubbles: true, cancelable: true,
          clientX: this._x, clientY: this._y, view: window,
        }));
        this._synthetic = false;
      }
    }

    // ── Right stick → scroll whatever element the cursor is over ──────────
    gpState.rx = rx;
    gpState.ry = ry;
    if (ry) {
      // Walk up the DOM from the cursor position to find the first scrollable element
      let el = document.elementFromPoint(this._x, this._y) as Element | null;
      let scrolled = false;
      while (el && el !== document.documentElement) {
        if (el.scrollHeight > el.clientHeight + 2) {
          el.scrollTop += ry * 18;
          scrolled = true;
          break;
        }
        el = el.parentElement;
      }
      if (!scrolled) window.scrollBy(0, ry * 18);
    }

    // ── D-pad + bumpers → scroll explore room ─────────────────────────────
    const dL = gp.buttons[14]?.pressed ?? false;
    const dR = gp.buttons[15]?.pressed ?? false;
    const lb = gp.buttons[4]?.pressed  ?? false;
    const rb = gp.buttons[5]?.pressed  ?? false;
    const room = document.getElementById("roomScroll");
    if (room) {
      let dx = 0;
      if (dL || lb) dx -= 22;
      if (dR || rb) dx += 22;
      if (dx) room.scrollLeft += dx;
    }

    // ── D-pad ↑/↓ → scroll menus ──────────────────────────────────────────
    const dU = gp.buttons[12]?.pressed ?? false;
    const dD = gp.buttons[13]?.pressed ?? false;
    if (dU || dD) {
      const screen = document.querySelector<HTMLElement>(".screen");
      if (screen) screen.scrollTop += dU ? -20 : 20;
    }

    // ── Buttons (edge-triggered) ───────────────────────────────────────────
    const btns = gp.buttons.map(b => b.pressed);

    if ((btns[0] && !this._prev[0]) || (btns[2] && !this._prev[2])) this._click();
    if  (btns[1] && !this._prev[1]) this._back();
    if  (btns[3] && !this._prev[3]) document.getElementById("clockViewBtn")?.click();
    if  (btns[9] && !this._prev[9]) {
      (document.getElementById("contBtn") ?? document.getElementById("playBtn"))?.click()
        ?? this._click();
    }

    this._prev = btns;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  private _click(): void {
    const el = document.elementFromPoint(this._x, this._y) as HTMLElement | null;
    if (!el) return;
    this._synthetic = true;
    el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, clientX: this._x, clientY: this._y, pointerId: 1, isPrimary: true }));
    el.dispatchEvent(new PointerEvent("pointerup",   { bubbles: true, cancelable: true, clientX: this._x, clientY: this._y, pointerId: 1, isPrimary: true }));
    el.dispatchEvent(new MouseEvent("click",         { bubbles: true, cancelable: true, clientX: this._x, clientY: this._y, view: window }));
    this._synthetic = false;
    this._cursorEl.style.opacity = "0.5";
    setTimeout(() => { this._cursorEl.style.opacity = "1"; }, 80);
  }

  private _back(): void {
    const byId = ["homeBtn","backBtn","menuBtn","cancelBtn","closeBtn"]
      .map(id => document.getElementById(id)).find((el): el is HTMLElement => !!el);
    if (byId) { byId.click(); return; }
    Array.from(document.querySelectorAll<HTMLElement>("button")).find(b =>
      /back|menu|close|cancel|return/i.test(b.textContent ?? "") ||
      /back|menu|close|cancel|return/i.test(b.id)
    )?.click();
  }

  dispose(): void {
    cancelAnimationFrame(this._rafId);
    this._cursorEl.remove();
    this._indicatorEl.remove();
    this._hideStyle.textContent = "";
    this._hideStyle.remove();
  }
}
