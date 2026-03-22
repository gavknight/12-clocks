import type { Game } from "../game/Game";

export class BannedScreen {
  constructor(game: Game) {
    const name = game.state.username || "you";

    game.ui.innerHTML = `
      <div class="screen" style="background:#0a0000;flex-direction:column;gap:16px;">
        <div style="
          position:absolute;inset:0;
          border:6px solid #cc0000;border-radius:4px;pointer-events:none;
          box-shadow:0 0 40px rgba(200,0,0,0.6) inset,0 0 40px rgba(200,0,0,0.4);
          animation:banPulse 1.8s ease-in-out infinite;
        "></div>
        <style>
          @keyframes banPulse {
            0%,100% { box-shadow:0 0 40px rgba(200,0,0,0.6) inset,0 0 40px rgba(200,0,0,0.4); }
            50%      { box-shadow:0 0 80px rgba(255,0,0,0.9) inset,0 0 80px rgba(255,0,0,0.7); }
          }
        </style>
        <div style="font-size:72px;">🚫</div>
        <div style="color:#ff3333;font-size:32px;font-weight:bold;text-align:center;
          text-shadow:0 0 20px rgba(255,0,0,0.8);">ACCESS DENIED</div>
        <div style="
          background:rgba(180,0,0,0.2);border:2px solid #cc0000;border-radius:14px;
          padding:20px 32px;text-align:center;max-width:420px;
        ">
          <div style="color:white;font-size:18px;margin-bottom:10px;">
            You have been <strong style="color:#ff4444;">banned</strong> by a owner admin.
          </div>
          <div style="color:rgba(255,255,255,0.5);font-size:14px;">
            Player: <span style="color:#ff8888;">${name}</span>
          </div>
        </div>
        <div style="color:rgba(255,255,255,0.3);font-size:12px;">
          Contact the owner if you think this is a mistake.
        </div>
        <button id="signOutBtn" style="
          margin-top:8px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);
          font-size:14px;padding:8px 20px;border-radius:12px;
          border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-family:Arial,sans-serif;
        ">← Sign out and use a different account</button>
      </div>
    `;

    document.getElementById("signOutBtn")!.onclick = () => {
      game.logout();
      game.goAuth();
    };

    game._disposeScene = () => { game.ui.innerHTML = ""; };
  }
}
