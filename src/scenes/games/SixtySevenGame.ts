// SixtySevenGame.ts — Bedrock Edition exclusive
import type { Game } from "../../game/Game";

interface Bubble {
  el:      HTMLDivElement;
  value:   67 | 69;
  rainbow: boolean;
  mega:    boolean; // ⭐ MEGA LUCK bubble
  rain:    boolean; // spawned during rain (no chain)
  x: number; y: number;
  born: number; life: number;
}

interface Achievement {
  id:    string;
  icon:  string;
  name:  string;
  desc:  string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: "first67",   icon: "🕐", name: "It's Like It Was My First Time Playing 12 Clocks", desc: "Click your first 67"   },
  { id: "rainbow67", icon: "🌈", name: "Super Luck",                                        desc: "Click a rainbow 67"   },
  { id: "clicked69", icon: "💀", name: "not that meme",                                     desc: "Click a 69"            },
  { id: "megaluck",  icon: "⭐", name: "3947329854732908579832475034875908347598347598479056748398567598675986798769834765985X LUCK", desc: "Click the MEGA LUCK bubble" },
  { id: "rain",      icon: "🌧️", name: "It's Raining 67s",                                  desc: "Trigger a rainbow rain" },
];

const ACH_KEY = "s67_ach";

function loadAch(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(ACH_KEY) ?? "[]")); }
  catch { return new Set(); }
}
function saveAch(set: Set<string>): void {
  localStorage.setItem(ACH_KEY, JSON.stringify([...set]));
}

const RAINBOW_CSS = `
  @keyframes rb {
    0%{border-color:#ff0000;box-shadow:0 0 18px #ff0000;}
    16%{border-color:#ff8800;box-shadow:0 0 18px #ff8800;}
    33%{border-color:#ffff00;box-shadow:0 0 18px #ffff00;}
    50%{border-color:#00ff44;box-shadow:0 0 18px #00ff44;}
    66%{border-color:#0088ff;box-shadow:0 0 18px #0088ff;}
    83%{border-color:#cc00ff;box-shadow:0 0 18px #cc00ff;}
    100%{border-color:#ff0000;box-shadow:0 0 18px #ff0000;}
  }
  @keyframes rbBg {
    0%{background:radial-gradient(circle,#ff4444,#880000);}
    33%{background:radial-gradient(circle,#ffff44,#886600);}
    66%{background:radial-gradient(circle,#44aaff,#003388);}
    100%{background:radial-gradient(circle,#ff4444,#880000);}
  }
  @keyframes megaPulse {
    0%{box-shadow:0 0 24px #fff700,0 0 48px #fff700;border-color:#fff700;}
    50%{box-shadow:0 0 40px #ffffff,0 0 80px #ffe000;border-color:#ffffff;}
    100%{box-shadow:0 0 24px #fff700,0 0 48px #fff700;border-color:#fff700;}
  }
  @keyframes rainBg {
    0%{background:linear-gradient(135deg,#0a0a1a,#1a003a,#0a1a0a);}
    50%{background:linear-gradient(135deg,#0a001a,#2a0055,#001a0a);}
    100%{background:linear-gradient(135deg,#0a0a1a,#1a003a,#0a1a0a);}
  }
`;

export class SixtySevenGame {
  private _container!:  HTMLDivElement;
  private _scoreEl!:    HTMLDivElement;
  private _multEl!:     HTMLDivElement;
  private _rainBanner!: HTMLDivElement;
  private _bubbles:     Bubble[] = [];
  private _score    = 0;
  private _mult     = 1;
  private _streak   = 0;
  private _raf      = 0;
  private _spawnT   = 0;
  private _rbT      = 0;
  private _megaT    = 0;
  private _rainT    = 0;      // countdown during rain mode
  private _rainSpawnT = 0;    // rapid spawn timer during rain
  private _lastTs   = 0;
  private _lucky    = false;
  private _ach:     Set<string>;
  private _achPanel!: HTMLDivElement;

  constructor(g: Game) {
    this._lucky = g.state.username === "wuqeuowuoiwqhdw";
    this._ach   = loadAch();
    g.ui.innerHTML = "";

    if (!document.getElementById("s67style")) {
      const s = document.createElement("style");
      s.id = "s67style"; s.textContent = RAINBOW_CSS;
      document.head.appendChild(s);
    }

    this._container = document.createElement("div");
    this._container.style.cssText =
      "position:absolute;inset:0;overflow:hidden;" +
      "background:linear-gradient(135deg,#0a0a1a,#1a0a2e,#0a1a0a);" +
      "touch-action:none;user-select:none;pointer-events:all;";
    g.ui.appendChild(this._container);

    // ── Rain banner ──
    this._rainBanner = document.createElement("div");
    this._rainBanner.style.cssText =
      "position:absolute;top:56px;left:50%;transform:translateX(-50%);" +
      "background:linear-gradient(135deg,#6600cc,#ff00ff);color:#fff;" +
      "font-size:15px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;" +
      "padding:8px 24px;border-radius:20px;z-index:12;pointer-events:none;" +
      "box-shadow:0 0 20px rgba(200,0,255,0.7);display:none;white-space:nowrap;";
    this._container.appendChild(this._rainBanner);

    // ── HUD ──
    const hud = document.createElement("div");
    hud.style.cssText =
      "position:absolute;top:0;left:0;right:0;padding:10px 14px;" +
      "display:flex;align-items:center;justify-content:space-between;" +
      "z-index:10;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);pointer-events:all;";
    hud.innerHTML = `
      <button id="s67back" style="background:rgba(255,255,255,0.1);color:#fff;
        border:1.5px solid rgba(255,255,255,0.25);border-radius:20px;
        padding:6px 16px;font-size:13px;font-weight:bold;cursor:pointer;font-family:Arial,sans-serif;">
        ← Back
      </button>
      <div id="s67score" style="color:#fff;font-size:22px;font-weight:900;
        font-family:'Arial Black',Arial,sans-serif;text-align:center;">🪙 0</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div id="s67mult" style="color:#7fff7f;font-size:14px;font-weight:bold;
          font-family:'Arial Black',Arial,sans-serif;min-width:60px;text-align:right;opacity:0;">x1</div>
        <button id="s67achBtn" style="background:rgba(255,255,255,0.1);color:#fff;
          border:1.5px solid rgba(255,255,255,0.25);border-radius:20px;
          padding:6px 14px;font-size:16px;cursor:pointer;">🏆</button>
      </div>`;
    this._container.appendChild(hud);
    this._scoreEl = hud.querySelector("#s67score") as HTMLDivElement;
    this._multEl  = hud.querySelector("#s67mult")  as HTMLDivElement;

    // ── Achievement panel ──
    this._achPanel = document.createElement("div");
    this._achPanel.style.cssText =
      "position:absolute;inset:0;z-index:30;display:none;align-items:center;justify-content:center;" +
      "background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);pointer-events:all;";
    this._achPanel.innerHTML = `
      <div style="background:#111827;border:2px solid rgba(255,255,255,0.15);border-radius:20px;
        padding:24px;min-width:300px;max-width:90vw;max-height:80vh;overflow-y:auto;">
        <div style="color:white;font-size:20px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;
          text-align:center;margin-bottom:18px;">🏆 Achievements</div>
        <div id="s67achList" style="display:flex;flex-direction:column;gap:12px;"></div>
        <button id="s67achClose" style="margin-top:20px;width:100%;background:rgba(255,255,255,0.1);
          color:white;border:1.5px solid rgba(255,255,255,0.25);border-radius:12px;
          padding:10px;font-size:15px;font-weight:bold;cursor:pointer;font-family:Arial,sans-serif;">
          Close
        </button>
      </div>`;
    this._container.appendChild(this._achPanel);
    this._achPanel.querySelector("#s67achClose")!.addEventListener("click", () => {
      this._achPanel.style.display = "none";
    });
    hud.querySelector("#s67achBtn")!.addEventListener("click", () => {
      this._renderAchPanel();
      this._achPanel.style.display = "flex";
    });

    // ── Bottom bar ──
    const bar = document.createElement("div");
    bar.style.cssText =
      "position:absolute;bottom:0;left:0;right:0;padding:10px 16px;" +
      "display:flex;gap:10px;justify-content:center;" +
      "z-index:10;background:rgba(0,0,0,0.5);backdrop-filter:blur(6px);pointer-events:all;";
    bar.innerHTML = `
      <button id="s67cashout" style="background:linear-gradient(135deg,#b8860b,#FFD700);color:#1a0060;
        border:2px solid #e6b800;border-radius:20px;padding:8px 22px;font-size:14px;font-weight:900;
        cursor:pointer;font-family:'Arial Black',Arial,sans-serif;">
        💰 Cash Out
      </button>
      <button id="s67reset" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);
        border:1.5px solid rgba(255,255,255,0.2);border-radius:20px;padding:8px 22px;
        font-size:14px;font-weight:bold;cursor:pointer;font-family:Arial,sans-serif;">
        🔄 Reset
      </button>`;
    this._container.appendChild(bar);

    const tip = document.createElement("div");
    tip.style.cssText =
      "position:absolute;bottom:58px;left:50%;transform:translateX(-50%);" +
      "color:rgba(255,255,255,0.28);font-size:11px;font-family:Arial,sans-serif;" +
      "text-align:center;pointer-events:none;white-space:nowrap;";
    tip.textContent = "Click 67 to earn 🪙  •  69 costs you 10  •  🌈 67 = jackpot!  •  ⭐ = MEGA LUCK";
    this._container.appendChild(tip);

    // ── Button handlers ──
    hud.querySelector("#s67back")!.addEventListener("click", () => {
      cancelAnimationFrame(this._raf);
      g.ui.innerHTML = "";
      g.inMiniGame = false;
      import("../ArcadeScene").then(m => new m.ArcadeScene(g));
    });
    bar.querySelector("#s67cashout")!.addEventListener("click", () => {
      if (this._score <= 0) return;
      g.state.coins += this._score;
      g.save();
      this._showPop(`+${this._score} saved! 💰`, window.innerWidth / 2, window.innerHeight / 2, "#FFD700");
      this._score = 0; this._streak = 0; this._mult = 1;
      this._scoreEl.textContent = "🪙 0";
      this._updateMult();
    });
    bar.querySelector("#s67reset")!.addEventListener("click", () => {
      this._score = 0; this._streak = 0; this._mult = 1;
      this._scoreEl.textContent = "🪙 0";
      this._updateMult();
    });

    g.inMiniGame = true;
    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  private _renderAchPanel(): void {
    const list = this._achPanel.querySelector("#s67achList")!;
    list.innerHTML = "";
    for (const a of ACHIEVEMENTS) {
      const unlocked = this._ach.has(a.id);
      const row = document.createElement("div");
      row.style.cssText =
        `display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:14px;` +
        (unlocked
          ? "background:rgba(255,215,0,0.12);border:2px solid #FFD700;box-shadow:0 0 14px rgba(255,215,0,0.3);"
          : "background:rgba(255,255,255,0.04);border:2px solid rgba(255,255,255,0.1);filter:grayscale(0.6);opacity:0.5;");
      row.innerHTML = `
        <div style="font-size:32px;flex-shrink:0;">${a.icon}</div>
        <div>
          <div style="color:${unlocked ? "#FFD700" : "rgba(255,255,255,0.5)"};font-size:12px;font-weight:900;
            font-family:'Arial Black',Arial,sans-serif;word-break:break-word;">${a.name}</div>
          <div style="color:rgba(255,255,255,0.4);font-size:11px;font-family:Arial,sans-serif;margin-top:2px;">${a.desc}</div>
        </div>`;
      list.appendChild(row);
    }
  }

  private _unlockAch(id: string): void {
    if (this._ach.has(id)) return;
    this._ach.add(id);
    saveAch(this._ach);
    const a = ACHIEVEMENTS.find(x => x.id === id)!;
    const toast = document.createElement("div");
    toast.style.cssText =
      "position:absolute;top:70px;left:50%;transform:translateX(-50%);" +
      "background:linear-gradient(135deg,#b8860b,#FFD700);color:#1a0060;" +
      "font-size:12px;font-weight:900;font-family:'Arial Black',Arial,sans-serif;" +
      "padding:10px 20px;border-radius:20px;z-index:25;pointer-events:none;" +
      "box-shadow:0 4px 20px rgba(255,215,0,0.5);max-width:90vw;text-align:center;" +
      "transition:opacity 0.5s;";
    toast.textContent = `🏆 Unlocked: ${a.name}`;
    this._container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, 2500);
    setTimeout(() => toast.remove(), 3100);
  }

  private _startRain(): void {
    this._rainT = 10;
    this._rainSpawnT = 0;
    this._rainBanner.style.display = "block";
    this._rainBanner.textContent = "🌈 RAINBOW RAIN! 10s";
    this._container.style.animation = "rainBg 1s linear infinite";
    this._unlockAch("rain");
  }

  private _loop(ts: number): void {
    const dt = Math.min((ts - this._lastTs) / 1000, 0.1);
    this._lastTs = ts;

    // ── Rain mode ──
    if (this._rainT > 0) {
      this._rainT -= dt;
      this._rainSpawnT -= dt;
      if (this._rainSpawnT <= 0) {
        this._rainSpawnT = 0.18;
        this._spawnBubble("rainRainbow");
      }
      const sec = Math.ceil(this._rainT);
      this._rainBanner.textContent = `🌈 RAINBOW RAIN! ${sec}s`;
      if (this._rainT <= 0) {
        this._rainT = 0;
        this._rainBanner.style.display = "none";
        this._container.style.animation = "";
      }
    } else {
      // Regular spawn
      this._spawnT -= dt;
      if (this._spawnT <= 0) {
        this._spawnBubble("normal");
        this._spawnT = Math.max(0.3, 1.2 - this._score * 0.002);
      }

      // Rainbow 67 — 4% chance per second (30% for the lucky one)
      this._rbT -= dt;
      if (this._rbT <= 0) {
        this._rbT = 1;
        if (Math.random() < (this._lucky ? 0.30 : 0.04)) this._spawnBubble("rainbow");
      }

      // MEGA LUCK — 1% chance per second
      this._megaT -= dt;
      if (this._megaT <= 0) {
        this._megaT = 1;
        if (Math.random() < 0.01) this._spawnBubble("mega");
      }
    }

    // Age bubbles
    const now = performance.now();
    for (let i = this._bubbles.length - 1; i >= 0; i--) {
      const b = this._bubbles[i];
      const frac = (now - b.born) / b.life;
      if (frac >= 1) {
        b.el.remove(); this._bubbles.splice(i, 1);
        if (b.value === 67 && !b.rainbow && !b.mega) { this._streak = 0; this._mult = 1; this._updateMult(); }
      } else {
        b.el.style.transform = `translate(-50%,-50%) translateY(-${frac * 60}px)`;
        b.el.style.opacity   = frac > 0.7 ? String(1 - (frac - 0.7) / 0.3) : "1";
      }
    }

    this._raf = requestAnimationFrame(t => this._loop(t));
  }

  private _spawnBubble(type: "normal" | "rainbow" | "rainRainbow" | "mega"): void {
    const isRainbow   = type === "rainbow" || type === "rainRainbow";
    const isRain      = type === "rainRainbow";
    const isMega      = type === "mega";
    const is69        = type === "normal" && !this._lucky && Math.random() < 0.25;
    const value: 67 | 69 = is69 ? 69 : 67;

    const W = this._container.clientWidth  || window.innerWidth;
    const H = this._container.clientHeight || window.innerHeight;
    const x = 60 + Math.random() * (W - 120);
    const y = 90 + Math.random() * (H - 160);
    const size = isMega ? 80 : 52 + Math.random() * 28;

    const el = document.createElement("div");
    let style = `
      position:absolute;left:${x}px;top:${y}px;
      width:${size * 1.8}px;height:${size * 1.8}px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${size * 0.55}px;font-weight:900;
      font-family:'Arial Black',Arial,sans-serif;cursor:pointer;
      transform:translate(-50%,-50%);border:4px solid transparent;
      pointer-events:all;`;

    if (isMega) {
      style += "background:radial-gradient(circle,#ffffff,#ffe000,#ff8800);color:#1a0060;" +
               "animation:megaPulse 0.8s ease-in-out infinite;font-size:"+Math.round(size*0.45)+"px;";
    } else if (isRainbow) {
      style += "background:radial-gradient(circle,#ff4444,#880000);animation:rb 0.6s linear infinite,rbBg 0.6s linear infinite;color:#fff;";
    } else if (is69) {
      style += "background:radial-gradient(circle,#ff2222,#990000);color:#fff;border-color:#ff6666;box-shadow:0 4px 20px rgba(0,0,0,0.5);";
    } else {
      style += "background:radial-gradient(circle,#22dd44,#007722);color:#fff;border-color:#7fffaa;box-shadow:0 4px 20px rgba(0,0,0,0.5);";
    }

    el.style.cssText = style;
    el.textContent = isMega ? "⭐67" : isRainbow ? "🌈67" : String(value);

    const b: Bubble = {
      el, value, rainbow: isRainbow, mega: isMega, rain: isRain,
      x, y, born: performance.now(),
      life: isMega ? 4000 : isRain ? 1500 : 2000 + Math.random() * 2000,
    };
    el.addEventListener("pointerdown", (e) => { e.stopPropagation(); this._click(b); });
    this._bubbles.push(b);
    this._container.appendChild(el);
  }

  private _click(b: Bubble): void {
    b.el.style.transform = "translate(-50%,-50%) scale(1.4)";
    b.el.style.opacity   = "0";
    setTimeout(() => b.el.remove(), 150);
    const idx = this._bubbles.indexOf(b);
    if (idx >= 0) this._bubbles.splice(idx, 1);

    if (b.mega) {
      // unused
    } else if (b.rainbow) {
      // Base payout
      const baseEarned = this._lucky
        ? 100000000845734985634985794856349857394856934865092436759086750983659875346587346578346573659873645783465873645876385643856348
        : 50 * this._mult;
      this._score += baseEarned;
      this._showPop(`🌈 +${baseEarned}!!`, b.x, b.y, "#ff88ff");
      this._scoreEl.textContent = `🪙 ${this._score}`;
      this._unlockAch("rainbow67");

      // 50% chance: MEGA LUCK bonus payout
      if (Math.random() < 0.5) {
        const megaEarned = 3947329854732908579832475034875908347598347598479056748398567598675986798769834765985;
        this._score += megaEarned;
        this._showPop(`⭐ MEGA LUCK!!`, b.x, b.y, "#fff700");
        this._scoreEl.textContent = `🪙 ${this._score}`;
        this._unlockAch("megaluck");
        const flash = document.createElement("div");
        flash.style.cssText = "position:absolute;inset:0;background:rgba(255,215,0,0.35);pointer-events:none;z-index:20;transition:opacity 0.6s;";
        this._container.appendChild(flash);
        setTimeout(() => { flash.style.opacity = "0"; }, 50);
        setTimeout(() => flash.remove(), 700);
      }

      // 50% chance: Rainbow rain (only if not already raining, not a rain bubble)
      if (!b.rain && this._rainT <= 0 && Math.random() < 0.5) this._startRain();
    } else if (b.value === 67) {
      this._streak++;
      if (this._streak >= 5)  this._mult = 2;
      if (this._streak >= 10) this._mult = 3;
      if (this._streak >= 20) this._mult = 5;
      const earned = this._mult;
      this._score += earned;
      this._showPop(`+${earned}🪙`, b.x, b.y, "#7fff7f");
      this._scoreEl.textContent = `🪙 ${this._score}`;
      this._updateMult();
      this._unlockAch("first67");
    } else {
      const lost = Math.min(10, this._score);
      this._score  = Math.max(0, this._score - 10);
      this._streak = 0; this._mult = 1;
      this._showPop(`-${lost}💀`, b.x, b.y, "#ff4444");
      this._scoreEl.textContent = `🪙 ${this._score}`;
      this._updateMult();
      this._unlockAch("clicked69");
      const flash = document.createElement("div");
      flash.style.cssText = "position:absolute;inset:0;background:rgba(255,0,0,0.35);pointer-events:none;z-index:20;transition:opacity 0.5s;";
      this._container.appendChild(flash);
      setTimeout(() => { flash.style.opacity = "0"; }, 50);
      setTimeout(() => { flash.remove(); }, 600);
    }
  }

  private _showPop(text: string, x: number, y: number, color: string): void {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;left:${x}px;top:${y - 20}px;
      transform:translate(-50%,-50%);color:${color};font-size:22px;font-weight:900;
      font-family:'Arial Black',Arial,sans-serif;pointer-events:none;z-index:15;
      text-shadow:0 2px 8px rgba(0,0,0,0.8);transition:transform 0.6s,opacity 0.6s;`;
    el.textContent = text;
    this._container.appendChild(el);
    requestAnimationFrame(() => { el.style.transform = "translate(-50%,-50%) translateY(-50px)"; el.style.opacity = "0"; });
    setTimeout(() => el.remove(), 650);
  }

  private _updateMult(): void {
    this._multEl.textContent = this._mult > 1 ? `x${this._mult} 🔥` : "";
    this._multEl.style.opacity = this._mult > 1 ? "1" : "0";
  }
}
