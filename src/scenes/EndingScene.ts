import type { Game } from "../game/Game";

function formatEndTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const VLAD_COLOR = "#FF4444";
const NIKI_COLOR = "#4D96FF";

interface EndEvent {
  type: "say" | "wait" | "clockReveal" | "flicker" | "scary" | "finish";
  speaker?: "vlad" | "niki" | "both" | null;
  text?: string;
  vladFace?: string;
  nikiFace?: string;
  pauseAfter?: number; // ms after voice finishes before next event
  ms?: number;         // for "wait" type only
}

const SCRIPT: EndEvent[] = [
  { type: "say",  speaker: "vlad", text: "Niki! We found ALL 12 numbers!",      vladFace: "😁",           pauseAfter: 300 },
  { type: "say",  speaker: "niki", text: "Yay! Let's see what time it says!",                  nikiFace: "😄", pauseAfter: 300 },
  { type: "clockReveal" },
  { type: "wait", ms: 1400 },
  { type: "say",  speaker: "niki", text: "Vlad... it says 3 AM.",                              nikiFace: "😐", pauseAfter: 400 },
  { type: "say",  speaker: "vlad", text: "That's fine. Totally fine.",           vladFace: "😟",           pauseAfter: 400 },
  { type: "say",  speaker: "niki", text: "Vlad.",                                              nikiFace: "😨", pauseAfter: 250 },
  { type: "say",  speaker: "vlad", text: "Yeah?",                                vladFace: "😨",           pauseAfter: 250 },
  { type: "say",  speaker: "niki", text: "Uh oh.",                                             nikiFace: "😱", pauseAfter: 150 },
  { type: "flicker" },
  { type: "wait", ms: 600 },
  { type: "say",  speaker: "vlad", text: "UH OH!",                               vladFace: "😱", nikiFace: "😱", pauseAfter: 200 },
  { type: "scary" },
  { type: "wait", ms: 2200 },
  { type: "say",  speaker: "both", text: "Never doing that again.",              vladFace: "😅", nikiFace: "😅", pauseAfter: 600 },
  { type: "finish" },
];

export class EndingScene {
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private done = false;

  constructor(game: Game) {
    this._buildHTML(game);
    this._runEvent(game, 0);

    game._disposeScene = () => {
      this.done = true;
      this.timeouts.forEach(t => clearTimeout(t));
      window.speechSynthesis?.cancel();
      game.ui.innerHTML = "";
    };
  }

  private _later(ms: number, fn: () => void): void {
    this.timeouts.push(setTimeout(fn, ms));
  }

  private _buildHTML(game: Game): void {
    game.ui.innerHTML = `
      <div id="endingScreen" class="screen" style="
        background:#87CEEB;position:relative;overflow:hidden;">

        <div style="position:absolute;top:40px;left:8%;width:180px;height:55px;
          background:rgba(255,255,255,0.8);border-radius:35px;pointer-events:none;"></div>
        <div style="position:absolute;top:65px;right:12%;width:210px;height:55px;
          background:rgba(255,255,255,0.8);border-radius:35px;pointer-events:none;"></div>

        <div id="clockDisplay" style="
          position:absolute;top:24px;left:50%;transform:translateX(-50%);
          width:180px;height:180px;border-radius:50%;
          border:6px solid white;background:rgba(255,255,255,0.9);
          display:flex;align-items:center;justify-content:center;flex-direction:column;
          pointer-events:none;">
          <div id="clockIcon" style="font-size:44px;">🕛</div>
          <div id="clockTime" style="font-size:20px;font-weight:bold;color:#3a006f;">12:00</div>
        </div>

        <div style="position:absolute;bottom:195px;left:10%;
          display:flex;flex-direction:column;align-items:center;">
          <div id="vladGlow" style="display:none;position:absolute;top:-10px;left:-10px;
            right:-10px;bottom:-10px;border-radius:50%;
            border:5px solid ${VLAD_COLOR};pointer-events:none;"></div>
          <div style="width:100px;height:100px;border-radius:50%;background:${VLAD_COLOR};
            border:3px solid white;display:flex;align-items:center;justify-content:center;
            font-size:40px;"><span id="vladFace">😁</span></div>
          <div style="color:#333;font-weight:bold;font-size:14px;margin-top:6px;">Vlad</div>
        </div>

        <div style="position:absolute;bottom:195px;right:10%;
          display:flex;flex-direction:column;align-items:center;">
          <div id="nikiGlow" style="display:none;position:absolute;top:-10px;left:-10px;
            right:-10px;bottom:-10px;border-radius:50%;
            border:5px solid ${NIKI_COLOR};pointer-events:none;"></div>
          <div style="width:100px;height:100px;border-radius:50%;background:${NIKI_COLOR};
            border:3px solid white;display:flex;align-items:center;justify-content:center;
            font-size:40px;"><span id="nikiFace">😄</span></div>
          <div style="color:#333;font-weight:bold;font-size:14px;margin-top:6px;">Niki</div>
        </div>

        <div id="dialogueBox" style="
          position:absolute;bottom:18px;left:6%;right:6%;
          background:rgba(20,0,50,0.88);border:3px solid white;border-radius:16px;
          padding:14px 20px;min-height:90px;pointer-events:none;">
          <div id="speakerName" style="color:#FFD700;font-size:14px;font-weight:bold;margin-bottom:4px;"></div>
          <div id="dialogueText" style="color:white;font-size:20px;"></div>
        </div>

        <div id="darkOverlay" style="position:absolute;top:0;left:0;right:0;bottom:0;
          background:transparent;pointer-events:none;"></div>
      </div>
    `;
  }

  /** Process each script event sequentially */
  private _runEvent(game: Game, idx: number): void {
    if (this.done || idx >= SCRIPT.length) return;
    const ev = SCRIPT[idx];
    const next = () => { if (!this.done) this._runEvent(game, idx + 1); };

    switch (ev.type) {
      case "say":
        this._showLine(ev.speaker!, ev.text!, ev.vladFace, ev.nikiFace);
        this._speakAndWait(ev.text!, ev.speaker!, ev.pauseAfter ?? 300, next);
        break;

      case "wait":
        this._later(ev.ms ?? 500, next);
        break;

      case "clockReveal":
        this._revealClock();
        next();
        break;

      case "flicker":
        this._flicker();
        next();
        break;

      case "scary":
        this._scaryMoment();
        next();
        break;

      case "finish":
        this._later(500, () => this._showComplete(game));
        break;
    }
  }

  private _showLine(
    speaker: "vlad" | "niki" | "both" | null,
    text: string,
    vladFace?: string,
    nikiFace?: string,
  ): void {
    if (vladFace) {
      const el = document.getElementById("vladFace");
      if (el) el.textContent = vladFace;
    }
    if (nikiFace) {
      const el = document.getElementById("nikiFace");
      if (el) el.textContent = nikiFace;
    }

    const vladGlow = document.getElementById("vladGlow");
    const nikiGlow = document.getElementById("nikiGlow");
    if (vladGlow) vladGlow.style.display = (speaker === "vlad" || speaker === "both") ? "block" : "none";
    if (nikiGlow) nikiGlow.style.display = (speaker === "niki" || speaker === "both") ? "block" : "none";

    const nameEl = document.getElementById("speakerName");
    const textEl = document.getElementById("dialogueText");
    if (nameEl) {
      nameEl.textContent = speaker === "both" ? "Vlad & Niki"
        : speaker === "vlad" ? "Vlad" : "Niki";
      nameEl.style.color = speaker === "vlad" ? "#FF8888"
        : speaker === "niki" ? "#88CCFF" : "#FFD700";
    }
    if (textEl) textEl.textContent = text;
  }

  /** Speak text with kid voice, call onDone when finished */
  private _speakAndWait(
    text: string,
    speaker: "vlad" | "niki" | "both" | null,
    pauseAfter: number,
    onDone: () => void,
  ): void {
    const synth = window.speechSynthesis;
    if (!synth) {
      this._later(Math.max(1500, text.length * 60) + pauseAfter, onDone);
      return;
    }

    synth.cancel();

    const clean = text.replace(/[^\w\s,.!?'"]/g, "");
    const utt = new SpeechSynthesisUtterance(clean);
    // Kid voices: high pitch, slightly fast
    utt.pitch  = speaker === "niki" ? 2.0 : (speaker === "both" ? 1.8 : 1.6);
    utt.rate   = 1.2;
    utt.volume = 1;

    let finished = false;
    const advance = () => {
      if (finished) return;
      finished = true;
      this._later(pauseAfter, onDone);
    };

    utt.onend   = advance;
    utt.onerror = advance;

    // Safety fallback
    const estimatedMs = Math.max(1800, clean.length * 80) + pauseAfter + 800;
    this._later(estimatedMs, advance);

    // 50ms delay after cancel() — fixes Chrome cutting off new utterance
    this._later(50, () => {
      if (!finished && !this.done) synth.speak(utt);
    });
  }

  private _revealClock(): void {
    const clockTime = document.getElementById("clockTime");
    const clockIcon = document.getElementById("clockIcon");
    if (clockTime) { clockTime.textContent = "3:00 AM"; clockTime.style.color = "#cc0000"; }
    if (clockIcon) clockIcon.textContent = "🕒";
  }

  private _flicker(): void {
    const overlay = document.getElementById("darkOverlay");
    if (!overlay) return;
    let flicks = 0;
    const doFlick = () => {
      overlay.style.background = flicks % 2 === 0 ? "rgba(0,0,0,0.65)" : "transparent";
      flicks++;
      if (flicks <= 6) this._later(110, doFlick);
      else overlay.style.background = "transparent";
    };
    doFlick();
  }

  private _scaryMoment(): void {
    const screen  = document.getElementById("endingScreen");
    const overlay = document.getElementById("darkOverlay");
    if (screen)  screen.style.background  = "#1a0033";
    if (overlay) overlay.style.background = "rgba(0,0,0,0.8)";

    const popup = document.createElement("div");
    popup.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      text-align:center;pointer-events:none;z-index:10;`;
    popup.innerHTML = `
      <div style="font-size:130px;line-height:1;">😈</div>
      <div style="font-size:68px;color:#cc0000;font-weight:bold;
        text-shadow:0 0 20px #ff0000;">BOO!</div>`;
    screen?.appendChild(popup);

    // Speak the BOO with an extra scary high pitch
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const boo = new SpeechSynthesisUtterance("BOO!");
      boo.pitch  = 2.0;
      boo.rate   = 0.7;
      boo.volume = 1;
      setTimeout(() => window.speechSynthesis.speak(boo), 50);
    }

    this._later(2000, () => {
      popup.remove();
      if (overlay) overlay.style.background = "transparent";
      if (screen)  screen.style.background  = "#87CEEB";
    });
  }

  private _showComplete(game: Game): void {
    const dialogueBox = document.getElementById("dialogueBox");
    if (dialogueBox) dialogueBox.style.display = "none";
    document.getElementById("vladGlow")!.style.display = "none";
    document.getElementById("nikiGlow")!.style.display = "none";

    const isHard = game.state.difficulty >= 12;
    const myId   = game.currentAccountId;

    game.getRecords().then(records => {
      this._renderBanner(game, records, isHard, myId);
    });
  }

  private _renderBanner(
    game: Game,
    records: { accountId: string; timeMs: number }[],
    isHard: boolean,
    myId: string,
  ): void {
    const screen = document.getElementById("endingScreen");
    const banner = document.createElement("div");
    banner.style.cssText = `
      position:absolute;bottom:30px;left:5%;right:5%;
      background:#FFD700;border:5px solid #3a006f;border-radius:20px;
      padding:20px;text-align:center;`;
    const myRecord = records.find(r => r.accountId === myId);
    const myRank   = myRecord ? records.indexOf(myRecord) + 1 : null;

    const recordLine = isHard && myRecord
      ? `<div style="font-size:14px;color:#3a006f;margin-top:6px;font-weight:bold;">
           🏆 Your time: ${formatEndTime(myRecord.timeMs)}
           ${myRank === 1 ? " — 🥇 NEW WORLD RECORD!" : myRank === 2 ? " — 🥈 2nd place!" : myRank === 3 ? " — 🥉 3rd place!" : ` — #${myRank} on the board`}
         </div>`
      : "";

    banner.innerHTML = `
      <div style="font-size:26px;font-weight:bold;color:#3a006f;">
        ⭐  COMPLETE!  ⭐</div>
      <div style="font-size:15px;color:#3a006f;margin-top:8px;">
        Vlad &amp; Niki survived 3 AM 😅
      </div>
      ${recordLine}
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px;">
        <button id="playAgainBtn" style="
          background:#3a006f;color:#FFD700;
          font-size:18px;font-weight:bold;padding:12px 28px;
          border-radius:40px;border:none;cursor:pointer;pointer-events:all;">
          ▶ Play Again</button>
        ${isHard ? `<button id="lbBtn" style="
          background:#FFD700;color:#3a006f;
          font-size:18px;font-weight:bold;padding:12px 28px;
          border-radius:40px;border:none;cursor:pointer;pointer-events:all;">
          🏆 Leaderboard</button>` : ""}
      </div>`;
    screen?.appendChild(banner);

    document.getElementById("playAgainBtn")!.onclick = () => {
      game.resetSave();
      game.goTitle();
    };
    if (isHard) {
      document.getElementById("lbBtn")!.onclick = () => game.goLeaderboard();
    }
  }
}
