import type { Game } from "../game/Game";
import { GamepadMenu } from "../input/GamepadMenu";

export const DEMO_MODE_KEY   = "12clocks_demo_mode";
export const DEMO_GATE_KEY   = "12clocks_demo_gate_passed";

export class DemoGateScene {
  constructor(game: Game, onPlay: () => void) {
    game.ui.innerHTML = `
      <style>
        @keyframes twinkle { from { opacity:0.15; } to { opacity:0.85; } }
        @keyframes floatUp  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes glow     { 0%,100% { box-shadow:0 6px 0 #3a006a,0 0 24px rgba(160,60,255,0.4); }
                              50%     { box-shadow:0 6px 0 #3a006a,0 0 56px rgba(180,80,255,0.85); } }
      </style>
      <div style="position:fixed;inset:0;
        background:linear-gradient(160deg,#0a0020,#18004a,#0a1040);
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        font-family:Arial,sans-serif;z-index:9999;overflow:hidden;pointer-events:all;">

        ${Array.from({length:18},(_,i)=>`<div style="position:absolute;
          left:${[5,15,25,40,55,70,82,90,10,35,60,80,20,50,75,45,30,65][i]}%;
          top:${[10,25,8,15,5,12,8,20,35,30,28,35,50,60,45,70,80,75][i]}%;
          width:3px;height:3px;border-radius:50%;background:white;pointer-events:none;
          animation:twinkle ${1.4+i*0.18}s ${i*0.12}s ease-in-out infinite alternate;"></div>`).join("")}

        <div style="font-size:80px;margin-bottom:20px;animation:floatUp 3.2s ease-in-out infinite;">🕐</div>

        <h1 style="font-size:40px;font-weight:900;color:white;margin:0 0 10px;text-align:center;
          text-shadow:0 0 32px rgba(180,100,255,0.9);">Uh oh...</h1>

        <p style="font-size:19px;color:rgba(255,255,255,0.75);margin:0 0 6px;text-align:center;
          max-width:300px;line-height:1.5;">
          We're still working on the<br>full version!
        </p>
        <p style="font-size:14px;color:rgba(255,255,255,0.38);margin:0 0 44px;text-align:center;">
          But the demo is ready to play right now.
        </p>

        <button id="demoPlayBtn" style="
          background:linear-gradient(135deg,#7200cc,#aa00ff);
          color:white;font-size:26px;font-weight:900;letter-spacing:1px;
          padding:20px 60px;border-radius:50px;
          border:3px solid rgba(210,120,255,0.55);
          cursor:pointer;font-family:Arial,sans-serif;
          animation:glow 2.2s ease-in-out infinite;">
          ▶ Play Demo
        </button>

        <p style="margin-top:28px;font-size:12px;color:rgba(255,255,255,0.2);">
          12 Clocks — Demo Version
        </p>
      </div>
    `;

    const playBtn = document.getElementById("demoPlayBtn")!;
    const gpad = new GamepadMenu([playBtn]);
    playBtn.onclick = () => {
      gpad.destroy();
      sessionStorage.setItem(DEMO_GATE_KEY, "1");
      sessionStorage.setItem(DEMO_MODE_KEY, "1");
      onPlay();
    };
  }
}
