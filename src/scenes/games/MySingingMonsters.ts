import type { Game } from "../../game/Game";

interface ShopMonster {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  freq: number;
  color: string;
  desc: string;
}

const MONSTERS: ShopMonster[] = [
  { id: "mammott", name: "Mammott",  emoji: "🦣", cost: 50,  freq: 130.81, color: "#8B6FD4", desc: "A fluffy mammoth that hums a warm bass groove." },
  { id: "tweedle", name: "Tweedle",  emoji: "🐦", cost: 80,  freq: 329.63, color: "#F4D03F", desc: "A cheerful bird that sings bright high notes." },
  { id: "noggin",  name: "Noggin",   emoji: "🥁", cost: 60,  freq: 98.00,  color: "#E67E22", desc: "A rhythmic creature that pounds out the beat." },
  { id: "wubbox",  name: "Epic Wubbox", emoji: "📦", cost: 75_000_000, freq: 220, color: "#88ddff", desc: "Frozen to the core — please unfreeze me!" },
];

const EPIC_LYRICS = ["frozen core", "can't anymore", "please unfreeze my core", "my core"];

export class MySingingMonsters {
  private _game: Game;
  private _owned = new Set<string>();
  private _tutStep = 0; // 0=point to market, 1=point to buy, 2=done
  private _audioCtx: AudioContext | null = null;
  private _noteTimers: ReturnType<typeof setTimeout>[] = [];
  private _lyricIdx = 0;

  constructor(game: Game) {
    this._game = game;
    this._renderIsland();
  }

  // ── Audio ────────────────────────────────────────────────────────────────────

  private _ctx(): AudioContext {
    if (!this._audioCtx) this._audioCtx = new AudioContext();
    return this._audioCtx;
  }

  private _hit(freq: number, vol: number, dur: number, type: OscillatorType = "sine"): void {
    const ctx = this._ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  }

  private _sing(freq: number, dur: number): void {
    // Vocal-style tone: two formant filters over a sawtooth give an "ooh/aah" quality
    const ctx = this._ctx();
    const osc = ctx.createOscillator();
    const f1 = ctx.createBiquadFilter();
    const f2 = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.connect(f1); f1.connect(f2); f2.connect(gain); gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    // slight vibrato via freq ramp
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(freq * 1.015, ctx.currentTime + dur * 0.4);
    osc.frequency.linearRampToValueAtTime(freq,         ctx.currentTime + dur * 0.8);
    f1.type = "bandpass"; f1.frequency.value = 800;  f1.Q.value = 3;
    f2.type = "bandpass"; f2.frequency.value = 1200; f2.Q.value = 2;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + dur - 0.08);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);
  }

  private _bounce(id: string): void {
    const el = document.getElementById(`msm-mon-${id}`);
    if (el) {
      el.style.transform = "scale(1.3) translateY(-10px)";
      setTimeout(() => { if (el) el.style.transform = ""; }, 260);
    }
    const note = document.getElementById(`msm-note-${id}`);
    if (note) {
      note.style.opacity = "1";
      note.style.transform = "translateY(-16px)";
      setTimeout(() => { if (note) { note.style.opacity = "0"; note.style.transform = ""; } }, 480);
    }
  }

  private _startSinging(): void {
    this._stopSinging();

    // Mammott: s bum s bum bu s s bum s bum  (beat = 250ms)
    if (this._owned.has("mammott")) {
      // s=soft tap, bum=deep bass hit, bu=medium
      const pattern: Array<{ f: number; v: number; d: number }> = [
        { f: 196, v: 0.08, d: 0.12 }, // s
        { f: 98,  v: 0.28, d: 0.35 }, // bum
        { f: 196, v: 0.08, d: 0.12 }, // s
        { f: 98,  v: 0.28, d: 0.35 }, // bum
        { f: 130, v: 0.18, d: 0.22 }, // bu
        { f: 196, v: 0.08, d: 0.12 }, // s
        { f: 196, v: 0.08, d: 0.12 }, // s
        { f: 98,  v: 0.28, d: 0.35 }, // bum
        { f: 196, v: 0.08, d: 0.12 }, // s
        { f: 98,  v: 0.28, d: 0.35 }, // bum
      ];
      const BEAT = 250;
      const LOOP = pattern.length * BEAT; // 2500ms
      const mamLoop = () => {
        pattern.forEach((p, i) => {
          const t = setTimeout(() => {
            this._hit(p.f, p.v, p.d);
            if (p.v >= 0.18) this._bounce("mammott");
          }, i * BEAT);
          this._noteTimers.push(t);
        });
        const again = setTimeout(mamLoop, LOOP);
        this._noteTimers.push(again);
      };
      mamLoop();
    }

    // Tweedle: bright chirp every ~700ms
    if (this._owned.has("tweedle")) {
      const twLoop = () => {
        this._hit(523, 0.15, 0.18, "sine");
        this._bounce("tweedle");
        setTimeout(() => { this._hit(659, 0.12, 0.15, "sine"); }, 200);
        const again = setTimeout(twLoop, 700);
        this._noteTimers.push(again);
      };
      twLoop();
    }

    // Noggin: kick-drum thump every 500ms
    if (this._owned.has("noggin")) {
      const nogLoop = () => {
        this._hit(80, 0.3, 0.3, "sine");
        this._bounce("noggin");
        setTimeout(() => { this._hit(60, 0.2, 0.2, "sine"); }, 250);
        const again = setTimeout(nogLoop, 500);
        this._noteTimers.push(again);
      };
      nogLoop();
    }

    // Epic Wubbox: actually speaks the lyrics using Web Speech API
    if (this._owned.has("wubbox")) {
      const phrases = ["frozen core", "can't anymore", "please unfreeze my core", "my core"];

      const sayNext = () => {
        const text = phrases[this._lyricIdx % phrases.length];

        // show karaoke
        const el = document.getElementById("msm-lyric");
        if (el) { el.textContent = text; el.style.opacity = "1"; }
        this._bounce("wubbox");

        const utt = new SpeechSynthesisUtterance(text);
        utt.pitch = 0.5;   // deep
        utt.rate  = 0.75;  // slow, dramatic
        utt.volume = 1;

        utt.onend = () => {
          const e = document.getElementById("msm-lyric");
          if (e) e.style.opacity = "0";
          this._lyricIdx++;
          const id = setTimeout(sayNext, 400);
          this._noteTimers.push(id);
        };

        window.speechSynthesis.speak(utt);
      };

      window.speechSynthesis.cancel(); // clear any leftover speech
      sayNext();
    }
  }

  private _stopSinging(): void {
    this._noteTimers.forEach(clearTimeout);
    this._noteTimers = [];
  }

  // ── Visuals ──────────────────────────────────────────────────────────────────

  private _monsterVisual(m: ShopMonster): string {
    if (m.id === "wubbox") return `
      <div style="width:54px;height:72px;position:relative;flex-shrink:0;">
        <!-- ice spike hair -->
        <div style="position:absolute;top:0;left:14px;width:0;height:0;
          border-left:4px solid transparent;border-right:4px solid transparent;
          border-bottom:13px solid #c0eeff;"></div>
        <div style="position:absolute;top:0;left:20px;width:0;height:0;
          border-left:5px solid transparent;border-right:5px solid transparent;
          border-bottom:17px solid #d8f4ff;"></div>
        <div style="position:absolute;top:0;left:28px;width:0;height:0;
          border-left:5px solid transparent;border-right:5px solid transparent;
          border-bottom:14px solid #b0e4f8;"></div>
        <div style="position:absolute;top:2px;left:34px;width:0;height:0;
          border-left:3px solid transparent;border-right:3px solid transparent;
          border-bottom:10px solid #c0eeff;"></div>
        <!-- head -->
        <div style="position:absolute;top:12px;left:10px;width:34px;height:26px;
          background:linear-gradient(135deg,#c8eeff,#90c8e8);
          border-radius:6px;border:2px solid #5aaace;"></div>
        <!-- eyes -->
        <div style="position:absolute;top:16px;left:14px;width:9px;height:9px;
          border-radius:50%;background:white;border:2px solid #2a80b0;">
          <div style="width:4px;height:4px;background:#1a5080;border-radius:50%;margin:1px auto;"></div>
        </div>
        <div style="position:absolute;top:16px;right:13px;width:9px;height:9px;
          border-radius:50%;background:white;border:2px solid #2a80b0;">
          <div style="width:4px;height:4px;background:#1a5080;border-radius:50%;margin:1px auto;"></div>
        </div>
        <!-- open mouth -->
        <div style="position:absolute;top:24px;left:14px;width:26px;height:12px;
          background:#0a2a4a;border-radius:2px 2px 8px 8px;border:1.5px solid #3a80b0;overflow:hidden;">
          <div style="display:flex;gap:2px;padding:0 2px;">
            <div style="width:5px;height:5px;background:white;border-radius:0 0 2px 2px;flex-shrink:0;"></div>
            <div style="width:5px;height:5px;background:white;border-radius:0 0 2px 2px;flex-shrink:0;"></div>
            <div style="width:5px;height:5px;background:white;border-radius:0 0 2px 2px;flex-shrink:0;"></div>
          </div>
        </div>
        <!-- body -->
        <div style="position:absolute;top:36px;left:14px;width:26px;height:16px;
          background:linear-gradient(160deg,#a8d8f0,#70aed0);
          border-radius:4px;border:2px solid #4a90ba;"></div>
        <!-- left cannon arm -->
        <div style="position:absolute;top:37px;left:0;width:13px;height:9px;
          background:linear-gradient(90deg,#b0cce0,#80aac8);
          border-radius:4px;border:1.5px solid #4a80a8;"></div>
        <div style="position:absolute;top:38px;left:1px;width:5px;height:3px;
          background:rgba(255,150,200,0.6);border-radius:2px;"></div>
        <!-- right cannon arm -->
        <div style="position:absolute;top:37px;right:0;width:13px;height:9px;
          background:linear-gradient(90deg,#80aac8,#b0cce0);
          border-radius:4px;border:1.5px solid #4a80a8;"></div>
        <div style="position:absolute;top:38px;right:1px;width:5px;height:3px;
          background:rgba(255,150,200,0.6);border-radius:2px;"></div>
        <!-- legs -->
        <div style="position:absolute;top:50px;left:16px;width:8px;height:10px;
          background:#78b0d0;border:1.5px solid #4a90b8;border-radius:3px;"></div>
        <div style="position:absolute;top:50px;right:16px;width:8px;height:10px;
          background:#78b0d0;border:1.5px solid #4a90b8;border-radius:3px;"></div>
        <!-- feet/flippers -->
        <div style="position:absolute;bottom:0;left:10px;width:16px;height:6px;
          background:#a0cce8;border-radius:3px;border:1.5px solid #4a90b8;"></div>
        <div style="position:absolute;bottom:0;right:10px;width:16px;height:6px;
          background:#a0cce8;border-radius:3px;border:1.5px solid #4a90b8;"></div>
      </div>`;
    return `<div style="font-size:50px;line-height:1;">${m.emoji}</div>`;
  }

  // ── Island view ──────────────────────────────────────────────────────────────

  private _renderIsland(): void {
    const coins = this._game.state.coins;
    const placed = MONSTERS.filter(m => this._owned.has(m.id));

    this._game.ui.innerHTML = `
      <div style="position:relative;width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif;pointer-events:all;">

        <!-- Sky -->
        <div style="position:absolute;inset:0;
          background:linear-gradient(180deg,#060d1a 0%,#0d1f3a 40%,#1a3a6a 58%,#d0e8f5 58%,#b8d8ef 70%,#a0c8e8 100%);
          pointer-events:none;"></div>

        <!-- Snow ground bumps -->
        <div style="position:absolute;bottom:0;left:0;right:0;height:42%;pointer-events:none;">
          <svg viewBox="0 0 400 120" preserveAspectRatio="none" style="width:100%;height:100%;">
            <path d="M0,60 Q40,30 80,50 Q120,70 160,40 Q200,10 240,45 Q280,80 320,38 Q360,0 400,50 L400,120 L0,120 Z"
              fill="#c8e8f8"/>
            <path d="M0,80 Q50,60 100,72 Q150,84 200,65 Q250,46 300,70 Q350,94 400,72 L400,120 L0,120 Z"
              fill="#dff0fa"/>
          </svg>
        </div>

        <!-- Ice chunks on ground -->
        <div style="position:absolute;bottom:38%;left:8%;width:28px;height:18px;
          background:linear-gradient(135deg,#a8d8f0,#c8eeff);border-radius:4px;
          transform:rotate(-10deg);pointer-events:none;opacity:0.8;"></div>
        <div style="position:absolute;bottom:36%;right:12%;width:20px;height:14px;
          background:linear-gradient(135deg,#a8d8f0,#c8eeff);border-radius:3px;
          transform:rotate(8deg);pointer-events:none;opacity:0.7;"></div>

        <!-- Snowflakes (CSS animated) -->
        ${Array.from({length:20}, (_, i) => {
          const lx = [5,12,20,28,35,42,50,58,65,72,80,88,95,15,30,45,60,75,90,8][i];
          const delay = (i * 0.7 % 4).toFixed(1);
          const dur = (3 + (i % 4)).toFixed(1);
          const sz = i % 3 === 0 ? 5 : i % 3 === 1 ? 3 : 4;
          return `<div style="position:absolute;left:${lx}%;top:-10px;
            width:${sz}px;height:${sz}px;border-radius:50%;background:white;
            opacity:0.7;pointer-events:none;
            animation:msmSnow${i % 4} ${dur}s ${delay}s linear infinite;"></div>`;
        }).join("")}

        <!-- Stars (visible in sky portion) -->
        ${Array.from({length:14}, (_, i) => {
          const lx = [5,14,22,33,44,56,68,79,88,92,18,38,52,72][i];
          const ty = [3,8,5,2,7,4,10,6,2,9,16,13,18,11][i];
          return `<div style="position:absolute;left:${lx}%;top:${ty}%;
            width:2px;height:2px;border-radius:50%;background:white;opacity:0.5;pointer-events:none;"></div>`;
        }).join("")}

        <!-- Moon -->
        <div style="position:absolute;top:5%;right:10%;font-size:36px;pointer-events:none;
          filter:drop-shadow(0 0 14px rgba(200,230,255,0.8));">🌙</div>

        <!-- Snowy pine trees -->
        <div style="position:absolute;bottom:34%;left:2%;font-size:32px;pointer-events:none;">🌲</div>
        <div style="position:absolute;bottom:36%;left:88%;font-size:28px;pointer-events:none;">🌲</div>

        <!-- Island title -->
        <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);
          color:white;font-size:13px;font-weight:bold;letter-spacing:2px;pointer-events:none;
          text-shadow:0 0 12px rgba(160,210,255,0.9);white-space:nowrap;">❄️ COLD ISLAND</div>


        <!-- Coins -->
        <div style="position:absolute;top:12px;left:12px;
          background:rgba(255,200,0,0.12);border:1.5px solid rgba(255,200,0,0.4);
          border-radius:20px;padding:4px 12px;display:flex;align-items:center;gap:6px;">
          <span style="font-size:14px;">🪙</span>
          <span style="color:#FFD700;font-size:13px;font-weight:bold;">${coins}</span>
        </div>

        <!-- Back -->
        <div style="position:absolute;top:12px;right:12px;">
          <button id="msm-back" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
            font-size:13px;padding:6px 14px;border-radius:12px;
            border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-family:inherit;">← Back</button>
        </div>

        <!-- Karaoke lyric -->
        <div id="msm-lyric" style="position:absolute;bottom:175px;left:0;right:0;
          text-align:center;pointer-events:none;opacity:0;
          transition:opacity 0.3s;
          color:white;font-size:16px;font-weight:bold;
          text-shadow:0 0 10px #88ddff,0 2px 4px rgba(0,0,0,0.8);
          letter-spacing:1px;"></div>

        <!-- Monsters on island -->
        <div style="position:absolute;bottom:100px;left:0;right:0;
          display:flex;justify-content:center;align-items:flex-end;gap:28px;">
          ${placed.length === 0 ? `
            <div style="color:rgba(255,255,255,0.3);font-size:13px;text-align:center;padding-bottom:16px;line-height:1.6;">
              Your island is empty…<br>Visit the <strong style="color:rgba(200,160,255,0.7);">Market</strong> to add monsters!
            </div>
          ` : placed.map(m => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:2px;position:relative;">
              <div id="msm-note-${m.id}" style="font-size:16px;color:#FFD700;
                opacity:0;transition:opacity 0.3s,transform 0.5s;position:absolute;top:-20px;">♪</div>
              <div id="msm-mon-${m.id}" style="transition:transform 0.15s ease;
                filter:drop-shadow(0 0 8px ${m.color});cursor:default;">${this._monsterVisual(m)}</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.65);font-weight:bold;">${m.name}</div>
            </div>
          `).join("")}
        </div>

        <!-- Market button -->
        <div style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);">
          <button id="msm-market" style="
            background:linear-gradient(135deg,rgba(80,40,180,0.9),rgba(140,60,240,0.7));
            border:2px solid rgba(160,100,255,0.7);border-radius:20px;
            padding:12px 36px;cursor:pointer;font-family:inherit;
            display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">🏪</span>
            <span style="color:white;font-size:16px;font-weight:bold;">Market</span>
          </button>
        </div>

        <!-- Tutorial step 0: go to market -->
        ${this._tutStep === 0 ? `
          <div style="position:absolute;bottom:80px;left:50%;transform:translateX(-50%);
            display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;z-index:10;
            animation:msmBounce 0.8s ease-in-out infinite alternate;">
            <div style="background:rgba(0,0,0,0.8);border:1.5px solid rgba(255,255,255,0.35);
              border-radius:20px;padding:7px 18px;color:white;font-size:13px;font-weight:bold;white-space:nowrap;">
              Step 1: Go to the Market!
            </div>
            <div style="font-size:26px;">👇</div>
          </div>
        ` : ""}

        <!-- Tutorial complete -->
        ${this._tutStep === 2 ? `
          <div id="msm-tut-done" style="position:absolute;inset:0;background:rgba(0,0,0,0.6);
            display:flex;align-items:center;justify-content:center;z-index:20;">
            <div style="background:rgba(5,0,20,0.97);border:2px solid rgba(120,255,120,0.5);
              border-radius:20px;padding:28px 32px;text-align:center;max-width:280px;">
              <div style="font-size:40px;margin-bottom:10px;">🎉</div>
              <div style="color:#7fff7f;font-size:18px;font-weight:bold;margin-bottom:8px;">Tutorial Complete!</div>
              <div style="color:rgba(255,255,255,0.65);font-size:13px;line-height:1.5;margin-bottom:18px;">
                Your Mammott is singing on Cold Island!<br>Buy more monsters to build your song.
              </div>
              <button id="msm-tut-ok" style="background:rgba(120,255,120,0.15);
                border:1.5px solid rgba(120,255,120,0.5);color:#7fff7f;
                font-size:14px;font-weight:bold;padding:9px 28px;border-radius:20px;
                cursor:pointer;font-family:inherit;">Keep Playing!</button>
            </div>
          </div>
        ` : ""}

        <style>
          @keyframes msmBounce {
            from { transform: translateX(-50%) translateY(0); }
            to   { transform: translateX(-50%) translateY(-10px); }
          }
          @keyframes msmSnow0 { to { transform: translateY(110vh) translateX(8px); } }
          @keyframes msmSnow1 { to { transform: translateY(110vh) translateX(-6px); } }
          @keyframes msmSnow2 { to { transform: translateY(110vh) translateX(12px); } }
          @keyframes msmSnow3 { to { transform: translateY(110vh) translateX(-10px); } }
        </style>
      </div>
    `;

    document.getElementById("msm-back")!.onclick = () => {
      this._stopSinging();
      window.speechSynthesis.cancel();
      this._audioCtx?.close();
      import("../ArcadeScene").then(m => { this._game.ui.innerHTML = ""; new m.ArcadeScene(this._game); });
    };

    document.getElementById("msm-market")!.onclick = () => {
      this._ctx().resume();
      if (this._tutStep === 0) this._tutStep = 1;
      this._stopSinging();
      window.speechSynthesis.cancel();
      this._renderMarket();
    };

    document.getElementById("msm-tut-ok")?.addEventListener("click", () => {
      this._tutStep = 3; // past done, just keep playing
      document.getElementById("msm-tut-done")?.remove();
    });

    if (this._owned.size > 0) setTimeout(() => this._startSinging(), 600);
  }

  // ── Market view ──────────────────────────────────────────────────────────────

  private _renderMarket(): void {
    const coins = this._game.state.coins;

    this._game.ui.innerHTML = `
      <div style="position:relative;width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif;
        background:linear-gradient(160deg,#0a0a2e,#1a0840,#2d0a50);pointer-events:all;">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.1);">
          <button id="msm-mkt-back" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
            font-size:13px;padding:6px 14px;border-radius:12px;
            border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-family:inherit;">← Island</button>
          <div style="color:white;font-size:17px;font-weight:bold;">🏪 Market</div>
          <div style="background:rgba(255,200,0,0.12);border:1.5px solid rgba(255,200,0,0.4);
            border-radius:20px;padding:4px 12px;display:flex;align-items:center;gap:6px;">
            <span style="font-size:14px;">🪙</span>
            <span style="color:#FFD700;font-size:13px;font-weight:bold;">${coins}</span>
          </div>
        </div>

        <!-- Monster list -->
        <div style="padding:16px;display:flex;flex-direction:column;gap:12px;
          overflow-y:auto;height:calc(100% - 60px);box-sizing:border-box;">

          ${MONSTERS.map(m => {
            const owned = this._owned.has(m.id);
            const canAfford = coins >= m.cost;
            const highlight = this._tutStep === 1 && m.id === "mammott" && !owned;
            return `
              <div style="background:rgba(255,255,255,0.06);
                border:1.5px solid rgba(${owned ? "120,255,120,0.4" : m.id === "wubbox" ? "0,255,200,0.55" : highlight ? "200,160,255,0.6" : "255,255,255,0.12"});
                border-radius:16px;padding:16px;display:flex;align-items:center;gap:14px;
                ${highlight ? "box-shadow:0 0 16px rgba(180,120,255,0.35);" : ""}">
                <div style="flex-shrink:0;filter:drop-shadow(0 0 6px ${m.color});">${this._monsterVisual(m)}</div>
                <div style="flex:1;min-width:0;">
                  <div style="color:white;font-size:16px;font-weight:bold;">${m.name}</div>
                  <div style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:2px;">${m.desc}</div>
                  <div style="color:#FFD700;font-size:12px;margin-top:6px;">🪙 ${m.cost} coins</div>
                </div>
                ${owned ? `
                  <div style="flex-shrink:0;color:#7fff7f;font-size:12px;font-weight:bold;
                    padding:5px 12px;background:rgba(120,255,120,0.12);
                    border:1px solid rgba(120,255,120,0.4);border-radius:20px;">✓ Owned</div>
                ` : `
                  <button id="msm-buy-${m.id}" style="flex-shrink:0;
                    background:${canAfford ? "linear-gradient(135deg,rgba(80,180,80,0.85),rgba(40,140,40,0.6))" : "rgba(50,50,50,0.5)"};
                    border:1.5px solid ${canAfford ? "rgba(120,220,120,0.6)" : "rgba(80,80,80,0.3)"};
                    color:${canAfford ? "white" : "rgba(255,255,255,0.25)"};
                    font-size:13px;font-weight:bold;padding:8px 18px;border-radius:14px;
                    cursor:${canAfford ? "pointer" : "not-allowed"};font-family:inherit;
                    ${highlight && canAfford ? "box-shadow:0 0 12px rgba(120,255,120,0.5);" : ""}">
                    Buy
                  </button>
                `}
              </div>
            `;
          }).join("")}

          <!-- Tip -->
          <div style="color:rgba(255,255,255,0.25);font-size:12px;text-align:center;padding:8px 0;">
            Each monster adds a new layer to your island's song!
          </div>
        </div>

        <!-- Tutorial step 1 arrow -->
        ${this._tutStep === 1 ? `
          <div style="position:absolute;top:80px;right:16px;pointer-events:none;z-index:10;
            display:flex;flex-direction:column;align-items:flex-end;gap:4px;
            animation:msmBounce2 0.8s ease-in-out infinite alternate;">
            <div style="background:rgba(0,0,0,0.8);border:1.5px solid rgba(255,255,255,0.35);
              border-radius:20px;padding:7px 14px;color:white;font-size:13px;font-weight:bold;white-space:nowrap;">
              Step 2: Buy a Mammott!
            </div>
            <div style="font-size:22px;margin-right:44px;">👇</div>
          </div>
        ` : ""}

        <style>
          @keyframes msmBounce2 {
            from { transform: translateY(0); }
            to   { transform: translateY(-10px); }
          }
        </style>
      </div>
    `;

    document.getElementById("msm-mkt-back")!.onclick = () => this._renderIsland();

    MONSTERS.forEach(m => {
      if (this._owned.has(m.id)) return;
      const btn = document.getElementById(`msm-buy-${m.id}`);
      if (!btn) return;
      btn.onclick = () => {
        if (this._game.state.coins < m.cost) return;
        this._ctx().resume(); // unlock AudioContext during user gesture
        this._game.state.coins -= m.cost;
        this._game.save();
        this._owned.add(m.id);
        if (m.id === "mammott" && this._tutStep === 1) this._tutStep = 2;
        this._renderIsland();
      };
    });
  }
}
