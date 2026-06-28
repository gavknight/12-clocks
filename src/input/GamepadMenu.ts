// Gamepad-driven menu navigation.
// D-pad or left stick moves focus, A button clicks the focused element, B calls onBack.
// Auto-stops when the first element leaves the DOM (scene change).
export class GamepadMenu {
  private raf      = 0;
  private index    = 0;
  private items:   HTMLElement[] = [];
  private prevBtn: boolean[]     = Array(20).fill(false);
  private axisUp   = false;
  private axisDown = false;
  private onBack?: () => void;
  private indicator: HTMLElement | null = null;
  private dead = false;

  constructor(items: HTMLElement[], opts: { onBack?: () => void; showIndicator?: boolean } = {}) {
    this.items  = items.filter(Boolean);
    this.onBack = opts.onBack;

    if (opts.showIndicator !== false) this.createIndicator();
    this.highlightCurrent();
    this.tick = this.tick.bind(this);
    this.raf  = requestAnimationFrame(this.tick);
  }

  private createIndicator() {
    // Remove any stale indicator from a previous scene
    document.getElementById("gpadIndicator")?.remove();
    const el = document.createElement("div");
    el.id = "gpadIndicator";
    el.style.cssText =
      "position:fixed;bottom:10px;right:10px;z-index:9999;" +
      "background:rgba(0,0,0,0.65);color:rgba(255,255,255,0.75);" +
      "font-size:11px;font-family:Arial,sans-serif;padding:5px 10px;" +
      "border-radius:10px;border:1px solid rgba(255,255,255,0.2);" +
      "pointer-events:none;";
    el.textContent = "🎮  ↕ Navigate   Ⓐ Select   Ⓑ Back";
    document.body.appendChild(el);
    this.indicator = el;
  }

  private highlightCurrent() {
    this.items.forEach((el, i) => {
      if (i === this.index) {
        el.style.outline       = "3px solid rgba(255,255,255,0.9)";
        el.style.outlineOffset = "3px";
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        el.style.outline       = "";
        el.style.outlineOffset = "";
      }
    });
  }

  private move(dir: 1 | -1) {
    if (!this.items.length) return;
    this.index = (this.index + dir + this.items.length) % this.items.length;
    this.highlightCurrent();
  }

  private tick() {
    // Auto-stop when the scene changes (first element leaves DOM)
    if (this.items.length > 0 && !document.body.contains(this.items[0])) {
      this.destroy();
      return;
    }

    const gps = navigator.getGamepads();
    for (const gp of gps) {
      if (!gp) continue;

      const btn  = (i: number) => gp.buttons[i]?.pressed ?? false;
      const just = (i: number) => btn(i) && !this.prevBtn[i];

      // D-pad
      if (just(12) || just(14)) this.move(-1);
      if (just(13) || just(15)) this.move(1);

      // Left stick Y with deadzone + hold-guard
      const sy = gp.axes[1] ?? 0;
      if (sy < -0.5 && !this.axisUp)   { this.axisUp   = true;  this.move(-1); }
      if (sy > -0.25)                    this.axisUp   = false;
      if (sy >  0.5 && !this.axisDown) { this.axisDown = true;  this.move(1);  }
      if (sy <  0.25)                    this.axisDown = false;

      // A = confirm
      if (just(0)) this.items[this.index]?.click();

      // B = back
      if (just(1) && this.onBack) this.onBack();

      for (let i = 0; i < Math.min(gp.buttons.length, 20); i++) {
        this.prevBtn[i] = btn(i);
      }
    }

    if (!this.dead) this.raf = requestAnimationFrame(this.tick);
  }

  /** Swap in a new list (e.g. after a shop reopens). */
  update(items: HTMLElement[]) {
    this.items.forEach(el => { el.style.outline = ""; el.style.outlineOffset = ""; });
    this.items = items.filter(Boolean);
    this.index = 0;
    this.highlightCurrent();
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.items.forEach(el => { el.style.outline = ""; el.style.outlineOffset = ""; });
    this.indicator?.remove();
  }
}
