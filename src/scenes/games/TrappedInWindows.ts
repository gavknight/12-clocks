/**
 * TrappedInWindows — "Trapped In Your Computer"
 *
 * A fake corrupted desktop. Beat four horror programs to escape, earning 💎 for
 * how long you last. The catch: the microphone is listening. Scream and you're
 * ejected — but you keep what you earned.
 *
 * The mic is analysed ENTIRELY on-device: we read volume off an AnalyserNode and
 * never record, store or transmit any audio. Killing the mic mid-run ejects you
 * with zero reward, so muting isn't a way to cheat the scare check.
 */
import type { Game } from "../../game/Game";

// ── Tuning ──────────────────────────────────────────────────────────────────
const CALIBRATE_MS   = 1800;  // sample the room before we judge anything
const SCREAM_FACTOR  = 3.2;   // how far above your own room noise counts
const SCREAM_FLOOR   = 0.055; // absolute floor, so a silent room can't false-fire
const SCREAM_HOLD_MS = 110;   // must stay loud this long — a cough won't do it
const GEMS_PER_5S    = 1;
const STAGE_BONUS    = [25, 50, 75, 150];

const STAGES = [
  { exe: "CookieClicker.exe", icon: "🍪", title: "Cursed Clicker",  hint: "Click 30 times. Something watches." },
  { exe: "KillSpree.exe",     icon: "🔪", title: "Kill Spree",      hint: "Survive 30 seconds. Don't let it touch you." },
  { exe: "Beach.exe",         icon: "🏖️", title: "The Empty Beach", hint: "Everyone is missing. Find 5 signs." },
  { exe: "???.exe",           icon: "👹", title: "IT",              hint: "It knows your name now." },
];

const SCARE_FACES = ["👹", "💀", "👁️", "🩸", "😈", "🫥", "🧟"];

const BEACH_SIGNS = [
  "HELP", "THEY TOOK MOM", "DON'T SWIM", "IT'S IN THE WATER", "RUN",
  "WE HID HERE", "NOBODY CAME", "IT WEARS FACES",
];

type Phase = "intro" | "mic" | "desktop" | "playing" | "over";

export class TrappedInWindows {
  private _g: Game;
  private _root!: HTMLDivElement;

  // mic
  private _stream: MediaStream | null = null;
  private _ctx:    AudioContext | null = null;
  private _an:     AnalyserNode | null = null;
  // explicit ArrayBuffer — getByteTimeDomainData rejects a SharedArrayBuffer view
  private _buf:    Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  private _ambient = 0;
  private _loudSince = 0;
  private _micWatch = 0;

  // run state
  private _phase: Phase = "intro";
  private _startTs = 0;
  private _stage = 0;
  private _cleared = 0;
  private _gems = 0;
  private _dead = false;

  // per-stage
  private _timers: number[] = [];
  private _raf = 0;
  private _clicks = 0;
  private _signsFound = 0;
  private _bossHp = 20;

  constructor(game: Game) {
    this._g = game;
    game.inMiniGame = true;

    this._root = document.createElement("div");
    this._root.style.cssText =
      "position:absolute;inset:0;overflow:hidden;pointer-events:all;user-select:none;" +
      "font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#0a0a12;";
    game.ui.innerHTML = "";
    game.ui.appendChild(this._root);

    game._disposeScene = () => this._teardown();
    this._intro();
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  private _later(ms: number, fn: () => void): number {
    const id = window.setTimeout(fn, ms);
    this._timers.push(id);
    return id;
  }

  private _clearTimers(): void {
    this._timers.forEach(clearTimeout);
    this._timers = [];
    cancelAnimationFrame(this._raf);
  }

  private _teardown(): void {
    this._clearTimers();
    clearInterval(this._micWatch);
    this._stream?.getTracks().forEach(t => t.stop());
    this._stream = null;
    this._ctx?.close().catch(() => {});
    this._ctx = null;
    this._g.inMiniGame = false;
    this._g.ui.innerHTML = "";
  }

  private _exit(): void {
    this._teardown();
    this._g.goArcade();
  }

  // ── 1. intro ──────────────────────────────────────────────────────────────
  private _intro(): void {
    this._phase = "intro";
    this._root.innerHTML = `
      <style>
        @keyframes twFlicker { 0%,100%{opacity:1} 92%{opacity:1} 94%{opacity:0.35} 96%{opacity:1} }
        @keyframes twShake  { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-6px,4px)}
                              40%{transform:translate(5px,-5px)} 60%{transform:translate(-4px,-3px)}
                              80%{transform:translate(4px,4px)} }
        @keyframes twScare  { from{transform:scale(0.4);opacity:0} 30%{transform:scale(1.15);opacity:1}
                              to{transform:scale(1);opacity:1} }
        @keyframes twPulse  { 0%,100%{opacity:0.35} 50%{opacity:1} }
        .twBtn { background:#1f4fd8;color:white;border:none;border-radius:4px;
                 padding:11px 26px;font-size:15px;cursor:pointer;font-family:inherit; }
        .twBtn:hover { background:#2a5ff0; }
      </style>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:16px;background:#000d1a;
        animation:twFlicker 5s infinite;text-align:center;padding:24px;">
        <div style="font-size:60px;">🖥️</div>
        <div style="color:#7fd4ff;font-size:26px;font-weight:bold;">Trapped In Your Computer</div>
        <div style="color:rgba(255,255,255,0.55);font-size:14px;max-width:420px;line-height:1.6;">
          Four horror programs are running. Close them all and you're free.<br>
          You earn <b style="color:#66ddff;">💎 gems</b> for every moment you last.
        </div>
        <div style="background:rgba(255,60,60,0.12);border:1px solid rgba(255,80,80,0.45);
          border-radius:10px;padding:13px 17px;max-width:430px;text-align:left;">
          <div style="color:#ff8888;font-size:14px;font-weight:bold;margin-bottom:6px;">
            🎤 The microphone is the game</div>
          <div style="color:rgba(255,255,255,0.6);font-size:12px;line-height:1.65;">
            It listens for you screaming. <b style="color:#ffbb55;">Scream and you're ejected</b> —
            but you keep the gems you earned.<br><br>
            Audio is analysed on this device only. Nothing is recorded, saved or sent anywhere.<br><br>
            <b style="color:#ff8888;">Turning the mic off mid-run ejects you with nothing.</b>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px;">
          <button id="twStart" class="twBtn">🎤 Allow mic &amp; start</button>
          <button id="twQuit" class="twBtn" style="background:#333a48;">Leave</button>
        </div>
      </div>`;

    this._root.querySelector<HTMLButtonElement>("#twStart")!.onclick = () => this._initMic();
    this._root.querySelector<HTMLButtonElement>("#twQuit")!.onclick  = () => this._exit();
  }

  // ── 2. mic ────────────────────────────────────────────────────────────────
  private async _initMic(): Promise<void> {
    this._phase = "mic";
    this._root.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:14px;background:#000d1a;padding:24px;text-align:center;">
        <div style="font-size:52px;animation:twPulse 1.2s infinite;">🎤</div>
        <div id="twMicMsg" style="color:#7fd4ff;font-size:17px;">Waiting for microphone permission…</div>
        <div style="color:rgba(255,255,255,0.4);font-size:12px;max-width:340px;">
          Your browser will ask. The game can't run without it.
        </div>
      </div>`;
    const msg = () => this._root.querySelector<HTMLElement>("#twMicMsg");

    try {
      this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      const m = msg();
      if (m) {
        m.innerHTML = `<span style="color:#ff8888;">Microphone blocked.</span><br>
          <span style="font-size:13px;color:rgba(255,255,255,0.5);">
          Allow it in your browser's address bar, then try again.</span>`;
      }
      this._later(2600, () => this._intro());
      return;
    }

    // calibrate to the room so a noisy house doesn't instantly eject you
    const ctx = new AudioContext();
    this._ctx = ctx;
    const src = ctx.createMediaStreamSource(this._stream);
    const an  = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    this._an  = an;
    this._buf = new Uint8Array(new ArrayBuffer(an.fftSize));

    const m = msg();
    if (m) m.textContent = "Listening to the room… stay quiet.";

    let peak = 0;
    const t0 = performance.now();
    const sample = () => {
      if (this._dead) return;
      peak = Math.max(peak, this._level());
      if (performance.now() - t0 < CALIBRATE_MS) { this._raf = requestAnimationFrame(sample); return; }
      this._ambient = peak;
      this._watchMic();
      this._desktop();
    };
    sample();
  }

  /** RMS level, 0..1, straight off the analyser. Nothing is retained. */
  private _level(): number {
    if (!this._an) return 0;
    this._an.getByteTimeDomainData(this._buf);
    let sum = 0;
    for (let i = 0; i < this._buf.length; i++) {
      const v = (this._buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / this._buf.length);
  }

  private get _threshold(): number {
    return Math.max(SCREAM_FLOOR, this._ambient * SCREAM_FACTOR);
  }

  /** Ejects with nothing if the mic is cut — muting can't be used to cheat. */
  private _watchMic(): void {
    const track = this._stream?.getAudioTracks()[0];
    if (!track) { this._end("micoff"); return; }
    track.onended = () => this._end("micoff");
    this._micWatch = window.setInterval(() => {
      if (this._dead) return;
      const t = this._stream?.getAudioTracks()[0];
      if (!t || t.readyState === "ended" || !t.enabled || t.muted) this._end("micoff");
    }, 500);
  }

  /** Per-frame scream check, run by every stage's loop. */
  private _listen(): void {
    if (this._dead || !this._an) return;
    const lvl = this._level();
    const now = performance.now();
    if (lvl > this._threshold) {
      if (!this._loudSince) this._loudSince = now;
      else if (now - this._loudSince > SCREAM_HOLD_MS) this._end("scream");
    } else {
      this._loudSince = 0;
    }
    const bar = this._root.querySelector<HTMLElement>("#twMicBar");
    if (bar) {
      const pct = Math.min(100, (lvl / this._threshold) * 100);
      bar.style.width = `${pct}%`;
      bar.style.background = pct > 78 ? "#ff4444" : pct > 45 ? "#ffbb33" : "#44dd77";
    }
  }

  // ── shared chrome ─────────────────────────────────────────────────────────
  private _hud(label: string, right: string): string {
    return `
      <div style="position:absolute;top:0;left:0;right:0;height:34px;background:#0d1420;
        border-bottom:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;
        gap:10px;padding:0 12px;z-index:40;font-size:12px;color:rgba(255,255,255,0.75);">
        <span style="color:#7fd4ff;font-weight:bold;">${label}</span>
        <div style="flex:1;"></div>
        <span style="color:#66ddff;">💎 <span id="twGems">${this._gems}</span></span>
        <span id="twRight" style="color:#ffbb55;">${right}</span>
        <div style="width:52px;height:7px;background:rgba(255,255,255,0.12);
          border-radius:4px;overflow:hidden;" title="microphone">
          <div id="twMicBar" style="height:100%;width:0%;background:#44dd77;transition:width 0.07s;"></div>
        </div>
      </div>`;
  }

  private _setRight(txt: string): void {
    const el = this._root.querySelector<HTMLElement>("#twRight");
    if (el) el.textContent = txt;
  }

  private _bumpGems(n: number): void {
    this._gems += n;
    const el = this._root.querySelector<HTMLElement>("#twGems");
    if (el) el.textContent = String(this._gems);
  }

  /** Full-screen jumpscare. Purely visual — the scream check does the rest. */
  private _jumpscare(): void {
    if (this._dead) return;
    const face = SCARE_FACES[Math.floor(Math.random() * SCARE_FACES.length)];
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;" +
      "background:radial-gradient(circle,#5a0000,#000);animation:twShake 0.42s;pointer-events:none;";
    ov.innerHTML = `<div style="font-size:min(46vw,240px);animation:twScare 0.3s;
      filter:drop-shadow(0 0 30px rgba(255,0,0,0.8));">${face}</div>`;
    this._root.appendChild(ov);
    this._later(620, () => ov.remove());
  }

  // ── 3. desktop ────────────────────────────────────────────────────────────
  private _desktop(): void {
    this._phase = "desktop";
    if (!this._startTs) this._startTs = performance.now();

    const icons = STAGES.map((s, i) => {
      const done   = i < this._cleared;
      const locked = i > this._cleared;
      return `
        <div class="twIcon" data-i="${i}" style="width:96px;display:flex;flex-direction:column;
          align-items:center;gap:5px;padding:9px 5px;border-radius:6px;text-align:center;
          cursor:${locked ? "default" : "pointer"};opacity:${locked ? 0.32 : 1};
          ${done ? "background:rgba(80,220,140,0.1);" : ""}">
          <div style="font-size:38px;filter:${done ? "grayscale(1)" : "none"};">${s.icon}</div>
          <div style="color:${done ? "rgba(120,255,160,0.8)" : "white"};font-size:11px;
            text-shadow:1px 1px 3px black;word-break:break-word;">
            ${done ? "✓ closed" : s.exe}</div>
        </div>`;
    }).join("");

    this._root.innerHTML = `
      ${this._hud("MY COMPUTER", `${this._cleared}/4 closed`)}
      <div style="position:absolute;top:34px;left:0;right:0;bottom:0;
        background:linear-gradient(160deg,#0e2038,#123049,#0a1826);
        padding:22px;display:flex;flex-wrap:wrap;align-content:flex-start;gap:10px;">
        ${icons}
        <div style="position:absolute;bottom:14px;left:0;right:0;text-align:center;
          color:rgba(255,255,255,0.4);font-size:12px;">
          ${this._cleared >= 4 ? "All programs closed. Something is still running…"
            : `Open <b style="color:#7fd4ff;">${STAGES[this._cleared].exe}</b> to continue`}
        </div>
      </div>`;

    this._root.querySelectorAll<HTMLElement>(".twIcon").forEach(el => {
      const i = +el.dataset.i!;
      if (i !== this._cleared) return;
      el.onmouseenter = () => { el.style.background = "rgba(120,190,255,0.18)"; };
      el.onmouseleave = () => { el.style.background = ""; };
      el.onclick = () => { this._stage = i; this._startStage(); };
    });

    if (this._cleared >= 4) { this._end("escaped"); return; }
    this._pulse(); // keep listening while they sit on the desktop
  }

  /** Idle listener so screaming at the desktop still counts. */
  private _pulse(): void {
    const step = () => {
      if (this._dead || this._phase !== "desktop") return;
      this._listen();
      this._raf = requestAnimationFrame(step);
    };
    step();
  }

  private _startStage(): void {
    this._clearTimers();
    this._phase = "playing";
    const s = STAGES[this._stage];
    this._root.innerHTML = `
      <div style="position:absolute;inset:0;background:#000;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:10px;">
        <div style="font-size:52px;">${s.icon}</div>
        <div style="color:#ff6666;font-size:22px;font-weight:bold;">${s.title}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:13px;">${s.hint}</div>
      </div>`;
    this._later(1500, () => {
      if (this._dead) return;
      if      (this._stage === 0) this._stageClicker();
      else if (this._stage === 1) this._stageKiller();
      else if (this._stage === 2) this._stageBeach();
      else                        this._stageBoss();
    });
  }

  private _clearStage(): void {
    if (this._dead) return;
    this._bumpGems(STAGE_BONUS[this._stage]);
    this._cleared = this._stage + 1;
    this._clearTimers();
    this._root.innerHTML = `
      <div style="position:absolute;inset:0;background:#001a0d;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:10px;">
        <div style="font-size:48px;">✅</div>
        <div style="color:#7dff9a;font-size:21px;font-weight:bold;">${STAGES[this._stage].exe} closed</div>
        <div style="color:#66ddff;font-size:15px;">+💎 ${STAGE_BONUS[this._stage]}</div>
      </div>`;
    this._later(1600, () => this._desktop());
  }

  // ── stage 1: cursed clicker ───────────────────────────────────────────────
  private _stageClicker(): void {
    this._clicks = 0;
    this._root.innerHTML = `
      ${this._hud("CookieClicker.exe", "0 / 30")}
      <div style="position:absolute;top:34px;left:0;right:0;bottom:0;background:#1a0f06;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">
        <div id="twCookie" style="font-size:120px;cursor:pointer;transition:transform 0.08s;">🍪</div>
        <div id="twCookieMsg" style="color:rgba(255,255,255,0.4);font-size:13px;height:18px;"></div>
      </div>`;

    const msgs = ["it tastes wrong", "who is clicking with you?", "don't look behind you",
                  "30 more and it stops", "it's closer now", "keep clicking"];
    const cookie = this._root.querySelector<HTMLElement>("#twCookie")!;
    cookie.onclick = () => {
      if (this._dead) return;
      this._clicks++;
      cookie.style.transform = "scale(0.88)";
      this._later(80, () => { cookie.style.transform = ""; });
      this._setRight(`${this._clicks} / 30`);
      if (this._clicks % 5 === 0) {
        const m = this._root.querySelector<HTMLElement>("#twCookieMsg");
        if (m) m.textContent = msgs[Math.floor(Math.random() * msgs.length)];
      }
      if (this._clicks >= 30) this._clearStage();
    };

    // a jumpscare every 10 seconds, as specced
    const scare = () => {
      if (this._dead || this._phase !== "playing") return;
      this._jumpscare();
      this._later(10_000, scare);
    };
    this._later(10_000, scare);
    this._loop();
  }

  // ── stage 2: kill spree ───────────────────────────────────────────────────
  private _stageKiller(): void {
    this._root.innerHTML = `
      ${this._hud("KillSpree.exe", "30s")}
      <div id="twArena" style="position:absolute;top:34px;left:0;right:0;bottom:0;
        background:radial-gradient(circle at 50% 50%,#1a0a0a,#000);cursor:crosshair;overflow:hidden;">
        <div id="twKiller" style="position:absolute;font-size:44px;left:50%;top:20%;
          filter:drop-shadow(0 0 12px rgba(255,0,0,0.7));pointer-events:none;">🔪</div>
        <div id="twYou" style="position:absolute;font-size:26px;pointer-events:none;">🏃</div>
        <div style="position:absolute;bottom:12px;left:0;right:0;text-align:center;
          color:rgba(255,255,255,0.35);font-size:12px;">move your mouse to run</div>
      </div>`;

    const arena  = this._root.querySelector<HTMLElement>("#twArena")!;
    const killer = this._root.querySelector<HTMLElement>("#twKiller")!;
    const you    = this._root.querySelector<HTMLElement>("#twYou")!;

    let px = 200, py = 200, kx = 100, ky = 60;
    arena.onpointermove = e => {
      const r = arena.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
    };

    const t0 = performance.now();
    let lastHit = 0;
    const step = () => {
      if (this._dead || this._phase !== "playing") return;
      this._listen();

      const elapsed = (performance.now() - t0) / 1000;
      this._setRight(`${Math.max(0, 30 - elapsed).toFixed(1)}s`);
      if (elapsed >= 30) { this._clearStage(); return; }

      // killer speeds up over the 30s so the end is the tense part
      const speed = 1.4 + elapsed * 0.11;
      const dx = px - kx, dy = py - ky;
      const d  = Math.hypot(dx, dy) || 1;
      kx += (dx / d) * speed;
      ky += (dy / d) * speed;

      you.style.left    = `${px - 13}px`;
      you.style.top     = `${py - 13}px`;
      killer.style.left = `${kx - 22}px`;
      killer.style.top  = `${ky - 22}px`;

      // caught: scare + knock it back, rather than ending the run
      if (d < 34 && performance.now() - lastHit > 1500) {
        lastHit = performance.now();
        this._jumpscare();
        kx -= (dx / d) * 130;
        ky -= (dy / d) * 130;
      }
      this._raf = requestAnimationFrame(step);
    };
    step();
  }

  // ── stage 3: the empty beach ──────────────────────────────────────────────
  private _stageBeach(): void {
    this._signsFound = 0;
    const picks = [...BEACH_SIGNS].sort(() => Math.random() - 0.5).slice(0, 5);
    const signs = picks.map((txt, i) => `
      <div class="twSign" data-i="${i}" style="position:absolute;
        left:${8 + Math.random() * 78}%;top:${26 + Math.random() * 54}%;
        cursor:pointer;text-align:center;transition:transform 0.15s;">
        <div style="font-size:30px;">🪧</div>
        <div class="twSignTxt" style="color:rgba(255,255,255,0.25);font-size:9px;
          max-width:76px;line-height:1.25;">?</div>
      </div>`).join("");

    this._root.innerHTML = `
      ${this._hud("Beach.exe", "0 / 5 signs")}
      <div id="twBeach" style="position:absolute;top:34px;left:0;right:0;bottom:0;
        background:linear-gradient(180deg,#1a2436 0%,#2e3a4a 42%,#6b5a3e 43%,#8a7248 100%);
        overflow:hidden;">
        <div style="position:absolute;top:6%;left:0;right:0;text-align:center;
          color:rgba(255,255,255,0.3);font-size:12px;font-style:italic;">
          the beach is full of towels. nobody is on them.</div>
        ${signs}
      </div>`;

    this._root.querySelectorAll<HTMLElement>(".twSign").forEach(el => {
      el.onclick = () => {
        if (this._dead || el.dataset.done) return;
        el.dataset.done = "1";
        const t = el.querySelector<HTMLElement>(".twSignTxt")!;
        t.textContent = picks[+el.dataset.i!];
        t.style.color = "#ff8888";
        el.style.transform = "scale(1.2)";
        this._signsFound++;
        this._setRight(`${this._signsFound} / 5 signs`);
        // the last sign is always the one that's looking back
        if (this._signsFound >= 5) { this._jumpscare(); this._later(700, () => this._clearStage()); }
        else if (Math.random() < 0.35) this._jumpscare();
      };
    });
    this._loop();
  }

  // ── stage 4: boss ─────────────────────────────────────────────────────────
  private _stageBoss(): void {
    this._bossHp = 20;
    this._root.innerHTML = `
      ${this._hud("???.exe", "HP 20")}
      <div style="position:absolute;top:34px;left:0;right:0;bottom:0;
        background:radial-gradient(circle at 50% 40%,#2a0000,#000);
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;">
        <div id="twBoss" style="font-size:110px;cursor:crosshair;
          filter:drop-shadow(0 0 26px rgba(255,0,0,0.65));transition:transform 0.09s;">👹</div>
        <div style="color:rgba(255,255,255,0.4);font-size:13px;">click it until it stops</div>
      </div>`;

    const boss = this._root.querySelector<HTMLElement>("#twBoss")!;
    boss.onclick = () => {
      if (this._dead) return;
      this._bossHp--;
      boss.style.transform = "scale(0.9) rotate(-6deg)";
      this._later(90, () => { boss.style.transform = ""; });
      this._setRight(`HP ${Math.max(0, this._bossHp)}`);
      if (this._bossHp <= 0) this._clearStage();
    };

    // lunges get faster as it weakens
    const lunge = () => {
      if (this._dead || this._phase !== "playing") return;
      this._jumpscare();
      this._later(Math.max(2200, 5200 - (20 - this._bossHp) * 160), lunge);
    };
    this._later(3000, lunge);
    this._loop();
  }

  /** Generic listen-only loop for stages without their own animation. */
  private _loop(): void {
    const step = () => {
      if (this._dead || this._phase !== "playing") return;
      this._listen();
      this._raf = requestAnimationFrame(step);
    };
    step();
  }

  // ── end ───────────────────────────────────────────────────────────────────
  private _end(why: "scream" | "micoff" | "escaped"): void {
    if (this._dead) return;
    this._dead = true;
    this._phase = "over";
    this._clearTimers();
    clearInterval(this._micWatch);

    const secs = this._startTs ? Math.floor((performance.now() - this._startTs) / 1000) : 0;
    const survivalGems = Math.floor(secs / 5) * GEMS_PER_5S;

    // muting the mic is the one exit that pays nothing
    let award = why === "micoff" ? 0 : this._gems + survivalGems;
    if (why === "escaped") award += 200; // full clear bonus

    if (award > 0) {
      this._g.state.diamonds += award;
      this._g.save(); // also syncs the diamond leaderboard
    }

    const head =
      why === "scream"  ? { icon: "😱", color: "#ff6666", title: "YOU SCREAMED",
                            sub: "It heard you. Ejected." }
    : why === "micoff"  ? { icon: "🔇", color: "#ff8888", title: "MICROPHONE LOST",
                            sub: "No mic, no reward. That's the deal." }
                        : { icon: "🏆", color: "#7dff9a", title: "YOU ESCAPED",
                            sub: "All four programs closed." };

    this._stream?.getTracks().forEach(t => t.stop());
    this._ctx?.close().catch(() => {});

    this._root.innerHTML = `
      <div style="position:absolute;inset:0;background:#08000c;display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;">
        <div style="font-size:64px;">${head.icon}</div>
        <div style="color:${head.color};font-size:27px;font-weight:900;">${head.title}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:14px;">${head.sub}</div>

        <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);
          border-radius:14px;padding:15px 24px;margin-top:8px;min-width:230px;">
          <div style="color:rgba(255,255,255,0.45);font-size:12px;">Survived</div>
          <div style="color:white;font-size:23px;font-weight:bold;">${secs}s</div>
          <div style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:9px;">Programs closed</div>
          <div style="color:white;font-size:17px;font-weight:bold;">${this._cleared} / 4</div>
          <div style="height:1px;background:rgba(255,255,255,0.12);margin:11px 0;"></div>
          <div style="color:#66ddff;font-size:25px;font-weight:900;">💎 ${award}</div>
          ${why === "micoff"
            ? `<div style="color:#ff8888;font-size:11px;margin-top:4px;">mic cut — nothing earned</div>`
            : `<div style="color:rgba(255,255,255,0.35);font-size:11px;margin-top:4px;">added to your gems</div>`}
        </div>

        <div style="display:flex;gap:9px;margin-top:12px;">
          <button id="twAgain" class="twBtn">↻ Again</button>
          <button id="twBack"  class="twBtn" style="background:#333a48;">← Arcade</button>
        </div>
      </div>`;

    this._root.querySelector<HTMLButtonElement>("#twAgain")!.onclick = () => {
      this._dead = false;
      this._phase = "intro";
      this._stage = 0; this._cleared = 0; this._gems = 0; this._startTs = 0;
      this._ambient = 0; this._loudSince = 0;
      this._stream = null; this._ctx = null; this._an = null;
      this._intro();
    };
    this._root.querySelector<HTMLButtonElement>("#twBack")!.onclick = () => this._exit();
  }
}
