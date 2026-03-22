/**
 * IntroCutscene — plays when the player first starts.
 * Vlad & Niki find the mysterious clock with 12 locks and wonder what time it is.
 * Speech-driven: each line waits for voice to FINISH before moving to the next.
 */
import type { Game } from "../game/Game";

interface Line {
  speaker: "vlad" | "niki" | "both" | null;
  text: string;
  vladFace?: string;
  nikiFace?: string;
  pauseAfter: number; // ms to wait AFTER speech ends before next line
}

const SCRIPT: Line[] = [
  { speaker: "vlad", text: "Niki... what is THAT?",                              vladFace: "😮", pauseAfter: 400 },
  { speaker: "niki", text: "It looks like a clock! But it's all locked up!",     nikiFace: "🤔", pauseAfter: 400 },
  { speaker: "vlad", text: "There are 12 locks on it! What time does it say?!",  vladFace: "😲", pauseAfter: 400 },
  { speaker: "niki", text: "We can't see! All the numbers are hidden.",           nikiFace: "😟", pauseAfter: 400 },
  { speaker: "vlad", text: "We have to find all 12 numbers and put them back!",  vladFace: "😤", pauseAfter: 400 },
  { speaker: "niki", text: "Look around the room! The numbers must be hidden somewhere!", nikiFace: "😃", pauseAfter: 400 },
  { speaker: "both", text: "Let's find them ALL!",                               vladFace: "😁", nikiFace: "😄", pauseAfter: 800 },
];

function makeChar(
  shirtColor: string, pantsColor: string, hairColor: string, face: string,
  name: string, isActive: boolean
): string {
  const glow = isActive ? `box-shadow:0 0 0 5px ${shirtColor},0 0 20px ${shirtColor}66;border-radius:50%;` : "";
  return `
    <div style="display:flex;flex-direction:column;align-items:center;
      transition:transform 0.3s;transform:${isActive ? "scale(1.1)" : "scale(0.92)"};">
      <div style="position:relative;width:64px;height:64px;${glow}">
        <div style="position:absolute;top:0;left:0;right:0;height:34px;
          background:${hairColor};border-radius:50% 50% 0 0;"></div>
        <div style="position:absolute;top:12px;left:0;right:0;height:52px;
          background:#FFCC80;border-radius:50%;border:2.5px solid ${shirtColor};"></div>
        <div style="position:absolute;top:26px;left:10px;width:13px;height:15px;
          background:white;border-radius:50%;overflow:hidden;">
          <div style="position:absolute;bottom:1px;left:2px;width:9px;height:9px;
            background:#1a0a00;border-radius:50%;"></div>
          <div style="position:absolute;top:2px;right:1px;width:3px;height:3px;
            background:white;border-radius:50%;"></div>
        </div>
        <div style="position:absolute;top:26px;right:10px;width:13px;height:15px;
          background:white;border-radius:50%;overflow:hidden;">
          <div style="position:absolute;bottom:1px;left:2px;width:9px;height:9px;
            background:#1a0a00;border-radius:50%;"></div>
          <div style="position:absolute;top:2px;right:1px;width:3px;height:3px;
            background:white;border-radius:50%;"></div>
        </div>
        <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
          width:26px;height:10px;border-bottom:3px solid #c47a5a;border-radius:0 0 50% 50%;"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
          padding-top:8px;font-size:${isActive ? "26" : "22"}px;">${face}</div>
      </div>
      <div style="position:relative;width:54px;height:54px;
        background:${shirtColor};border-radius:10px 10px 5px 5px;margin-top:2px;">
        <div style="position:absolute;left:-15px;top:5px;width:17px;height:34px;
          background:${shirtColor};border-radius:6px;transform:rotate(${isActive ? "15" : "8"}deg);
          transform-origin:top center;"></div>
        <div style="position:absolute;right:-15px;top:5px;width:17px;height:34px;
          background:${shirtColor};border-radius:6px;transform:rotate(-${isActive ? "15" : "8"}deg);
          transform-origin:top center;"></div>
        <div style="position:absolute;left:-20px;top:34px;width:12px;height:11px;
          background:#FFCC80;border-radius:50%;"></div>
        <div style="position:absolute;right:-20px;top:34px;width:12px;height:11px;
          background:#FFCC80;border-radius:50%;"></div>
      </div>
      <div style="display:flex;gap:5px;margin-top:3px;">
        <div style="width:20px;height:32px;background:${pantsColor};border-radius:4px 4px 6px 6px;"></div>
        <div style="width:20px;height:32px;background:${pantsColor};border-radius:4px 4px 6px 6px;"></div>
      </div>
      <div style="display:flex;gap:2px;margin-top:2px;">
        <div style="width:26px;height:10px;background:#111;border-radius:3px 7px 7px 3px;transform:translateX(-2px);"></div>
        <div style="width:26px;height:10px;background:#111;border-radius:7px 3px 3px 7px;transform:translateX(2px);"></div>
      </div>
      <div style="margin-top:5px;color:${shirtColor};font-size:13px;font-weight:bold;
        text-shadow:1px 1px 3px black;">${name}</div>
    </div>`;
}

export class IntroCutscene {
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private done = false;

  constructor(game: Game) {
    this._build(game);
  }

  private _later(ms: number, fn: () => void): void {
    this.timeouts.push(setTimeout(fn, ms));
  }

  private _build(game: Game): void {
    game.ui.innerHTML = `
      <style>
        @keyframes clockAppear { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes lockWiggle  { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-10deg)} 75%{transform:rotate(10deg)} }
      </style>
      <div id="introScreen" class="screen" style="
        background:linear-gradient(160deg,#1a0850,#2e1478,#3a1e10);
        position:relative;overflow:hidden;">

        ${Array.from({length:14},(_,i)=>`<div style="position:absolute;
          left:${[5,12,20,30,40,55,65,75,85,90,8,25,50,78][i]}%;
          top:${[8,15,5,12,20,7,14,10,6,18,25,28,25,22][i]}%;
          width:${i%3===0?4:2}px;height:${i%3===0?4:2}px;border-radius:50%;
          background:white;opacity:${0.3+i*0.04};pointer-events:none;"></div>`).join("")}

        <div style="position:absolute;top:8%;left:50%;transform:translateX(-50%);">
          <div style="position:relative;width:160px;height:160px;
            border-radius:50%;border:8px solid rgba(255,200,0,0.6);
            background:rgba(30,10,80,0.8);
            display:flex;align-items:center;justify-content:center;
            animation:clockAppear 0.8s ease forwards;
            box-shadow:0 0 40px rgba(255,200,0,0.3);">
            ${Array.from({length:12},(_,i)=>{
              const angle = Math.PI/2 - i*(Math.PI/6);
              const lx = 80 + 60*Math.cos(angle) - 10;
              const ly = 80 - 60*Math.sin(angle) - 10;
              return `<div style="position:absolute;left:${lx}px;top:${ly}px;font-size:16px;
                animation:lockWiggle ${1.5+i*0.1}s ease-in-out infinite;">🔒</div>`;
            }).join("")}
            <div style="font-size:52px;pointer-events:none;">❓</div>
          </div>
          <div style="text-align:center;color:rgba(255,200,0,0.8);font-size:14px;
            font-weight:bold;margin-top:8px;text-shadow:0 0 8px rgba(255,200,0,0.5);">
            12 LOCKS
          </div>
        </div>

        <div id="charRow" style="position:absolute;bottom:170px;left:0;right:0;
          display:flex;justify-content:center;gap:60px;align-items:flex-end;">
          <div id="vladChar">${makeChar("#FF4444","#1e3a9e","#3d1c00","😮","Vlad",true)}</div>
          <div id="nikiChar">${makeChar("#4D96FF","#8B1A6B","#7a4a10","🤔","Niki",false)}</div>
        </div>

        <div id="dialogBox" style="position:absolute;bottom:10px;left:5%;right:5%;
          background:rgba(10,0,40,0.92);border:3px solid rgba(255,255,255,0.2);
          border-radius:18px;padding:14px 20px;min-height:80px;">
          <div id="dlgSpeaker" style="color:#FFD700;font-size:13px;font-weight:bold;
            margin-bottom:5px;"></div>
          <div id="dlgText" style="color:white;font-size:19px;line-height:1.4;"></div>
          <div style="position:absolute;bottom:12px;right:16px;
            color:rgba(255,255,255,0.35);font-size:12px;">(tap to skip)</div>
        </div>

        <button id="skipBtn" style="position:absolute;top:10px;right:10px;
          background:rgba(255,255,255,0.12);color:white;font-size:13px;
          padding:6px 14px;border-radius:20px;border:2px solid rgba(255,255,255,0.25);
          cursor:pointer;pointer-events:all;">Skip ▶▶</button>
      </div>
    `;

    document.getElementById("skipBtn")!.onclick = () => this._finish(game);

    // Start playback after short intro delay
    this._later(600, () => this._playLine(game, 0));
  }

  /** Plays line at index, waits for speech to finish, then plays next line */
  private _playLine(game: Game, idx: number): void {
    if (this.done) return;
    if (idx >= SCRIPT.length) {
      // All lines done — wait then go
      this._later(1000, () => this._finish(game));
      return;
    }

    const line = SCRIPT[idx];
    this._applyLine(line);
    this._speakAndWait(line, () => {
      if (!this.done) this._playLine(game, idx + 1);
    });
  }

  /** Speaks the line text and calls onDone when the voice finishes (or falls back on timeout) */
  private _speakAndWait(line: Line, onDone: () => void): void {
    const synth = window.speechSynthesis;
    if (!synth) {
      const readTime = Math.max(1800, line.text.length * 60);
      this._later(readTime + line.pauseAfter, onDone);
      return;
    }

    synth.cancel();

    const clean = line.text.replace(/[^\w\s,.!?'"]/g, "");
    const utt = new SpeechSynthesisUtterance(clean);
    // Kid voices: high pitch + slightly fast rate
    utt.pitch  = line.speaker === "niki" ? 2.0 : (line.speaker === "both" ? 1.8 : 1.6);
    utt.rate   = 1.2;
    utt.volume = 1;

    let finished = false;
    const advance = () => {
      if (finished) return;
      finished = true;
      this._later(line.pauseAfter, onDone);
    };

    utt.onend   = advance;
    utt.onerror = advance;

    // Safety fallback in case onend never fires (Chrome bug)
    const estimatedMs = Math.max(2500, clean.length * 80) + line.pauseAfter + 800;
    this._later(estimatedMs, advance);

    // Small delay after cancel() before speak() — fixes Chrome cutting off new utterances
    this._later(50, () => {
      if (!finished && !this.done) synth.speak(utt);
    });
  }

  private _applyLine(line: Line): void {
    const speaker = document.getElementById("dlgSpeaker");
    const text    = document.getElementById("dlgText");
    const vlad    = document.getElementById("vladChar");
    const niki    = document.getElementById("nikiChar");

    if (line.vladFace && vlad) {
      const faces = vlad.querySelectorAll<HTMLElement>("[style*='font-size:26px']");
      faces.forEach(f => f.textContent = line.vladFace ?? "😁");
    }
    if (line.nikiFace && niki) {
      const faces = niki.querySelectorAll<HTMLElement>("[style*='font-size:26px']");
      faces.forEach(f => f.textContent = line.nikiFace ?? "😄");
    }

    if (vlad && niki) {
      vlad.style.transform = (line.speaker === "vlad" || line.speaker === "both") ? "scale(1.08)" : "scale(0.93)";
      niki.style.transform = (line.speaker === "niki" || line.speaker === "both") ? "scale(1.08)" : "scale(0.93)";
    }

    if (speaker && text) {
      let name = "";
      let color = "#FFD700";
      if (line.speaker === "vlad") { name = "Vlad";        color = "#FF8888"; }
      if (line.speaker === "niki") { name = "Niki";        color = "#88CCFF"; }
      if (line.speaker === "both") { name = "Vlad & Niki"; color = "#FFD700"; }
      speaker.textContent = name;
      speaker.style.color = color;
      text.textContent    = line.text;
    }
  }

  private _finish(game: Game): void {
    this.done = true;
    this.timeouts.forEach(t => clearTimeout(t));
    window.speechSynthesis?.cancel();
    game.goExplore();
  }
}
