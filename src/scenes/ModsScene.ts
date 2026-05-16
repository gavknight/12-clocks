import type { Game } from "../game/Game";

export class ModsScene {
  constructor(game: Game) {
    const render = () => {
      const on = game.modMode;
      const completedLevels = game.completedLevelCount;

      game.ui.innerHTML = `
        <div class="screen" style="
          background:linear-gradient(160deg,#0a001e,#1a0840,#0d1a00);
          overflow-y:auto;justify-content:flex-start;padding:20px 12px 80px;
          font-family:Arial,sans-serif;">

          <!-- Header -->
          <div style="width:100%;max-width:520px;display:flex;align-items:center;
            justify-content:space-between;margin-bottom:18px;">
            <button id="modsBackBtn" style="
              background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7);
              font-size:14px;padding:8px 18px;border-radius:20px;
              border:1.5px solid rgba(255,255,255,0.15);cursor:pointer;">← Back</button>
            <div style="color:white;font-size:20px;font-weight:900;
              font-family:'Arial Black',Arial;">🎮 Mods</div>
            <div style="width:72px;"></div>
          </div>

          <!-- Two-column layout -->
          <div style="width:100%;max-width:520px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;">

            <!-- LEFT: Stats -->
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:2px;
                text-transform:uppercase;margin-bottom:2px;">Stats</div>

              <!-- Wins -->
              <div style="background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,200,0,0.2);
                border-radius:16px;padding:14px 16px;">
                <div style="color:rgba(255,200,0,0.6);font-size:10px;letter-spacing:1px;
                  text-transform:uppercase;margin-bottom:4px;">Wins</div>
                <div style="color:#FFD700;font-size:28px;font-weight:900;
                  font-family:'Arial Black',Arial;">${game.state.wins}</div>
              </div>

              <!-- Coins -->
              <div style="background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,200,0,0.2);
                border-radius:16px;padding:14px 16px;">
                <div style="color:rgba(255,200,0,0.6);font-size:10px;letter-spacing:1px;
                  text-transform:uppercase;margin-bottom:4px;">🪙 Coins</div>
                <div style="color:#FFD700;font-size:22px;font-weight:900;
                  font-family:'Arial Black',Arial;">${game.state.coins.toLocaleString()}</div>
              </div>

              <!-- Completed Levels -->
              <div style="background:rgba(255,255,255,0.06);border:1.5px solid rgba(100,200,255,0.2);
                border-radius:16px;padding:14px 16px;">
                <div style="color:rgba(100,200,255,0.6);font-size:10px;letter-spacing:1px;
                  text-transform:uppercase;margin-bottom:4px;">Completed</div>
                <div style="color:#7dd3fc;font-size:28px;font-weight:900;
                  font-family:'Arial Black',Arial;">${completedLevels}</div>
                <div style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:2px;">levels</div>
              </div>
            </div>

            <!-- RIGHT: Mods -->
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div style="color:rgba(255,255,255,0.4);font-size:10px;letter-spacing:2px;
                text-transform:uppercase;margin-bottom:2px;">Mods</div>

              <!-- Toggle -->
              <div style="background:${on ? "rgba(0,180,80,0.2)" : "rgba(255,255,255,0.06)"};
                border:1.5px solid ${on ? "rgba(0,220,100,0.5)" : "rgba(255,255,255,0.12)"};
                border-radius:16px;padding:14px 16px;
                display:flex;flex-direction:column;gap:8px;">
                <div style="color:white;font-size:13px;font-weight:bold;">Mod Mode</div>
                <div style="color:${on ? "rgba(100,255,150,0.8)" : "rgba(255,255,255,0.35)"};font-size:11px;line-height:1.4;">
                  ${on ? "On — stats won't save" : "Off — turn on to use mods"}
                </div>
                <button id="modToggleBtn" style="
                  padding:8px 0;border-radius:10px;font-size:13px;font-weight:bold;cursor:pointer;
                  ${on
                    ? "background:rgba(0,200,80,0.3);color:#80ffb0;border:1.5px solid rgba(0,220,100,0.5);"
                    : "background:rgba(255,255,255,0.1);color:white;border:1.5px solid rgba(255,255,255,0.2);"}">
                  ${on ? "✓ ON" : "OFF"}
                </button>
              </div>

              <!-- Mod controls (greyed when off) -->
              <div style="${on ? "" : "opacity:0.3;pointer-events:none;"}display:flex;flex-direction:column;gap:10px;">

                <!-- Set Wins -->
                <div style="background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.1);
                  border-radius:16px;padding:14px 16px;">
                  <div style="color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:1px;
                    text-transform:uppercase;margin-bottom:8px;">Set Wins</div>
                  <div style="display:flex;gap:6px;">
                    <input id="winsInput" type="number" min="0" value="${game.state.wins}" style="
                      background:#1a1a2e;border:1.5px solid rgba(255,255,255,0.15);border-radius:8px;
                      color:white;font-size:14px;padding:6px 8px;width:60px;outline:none;">
                    <button id="winsApplyBtn" style="
                      flex:1;background:rgba(255,200,0,0.15);color:#FFD700;font-size:12px;font-weight:bold;
                      padding:6px 8px;border-radius:8px;border:1.5px solid rgba(255,200,0,0.3);cursor:pointer;">
                      Apply</button>
                  </div>
                </div>

                <!-- Set Coins -->
                <div style="background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.1);
                  border-radius:16px;padding:14px 16px;">
                  <div style="color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:1px;
                    text-transform:uppercase;margin-bottom:8px;">Set Coins</div>
                  <div style="display:flex;gap:6px;">
                    <input id="coinsInput" type="number" min="0" value="${game.state.coins}" style="
                      background:#1a1a2e;border:1.5px solid rgba(255,255,255,0.15);border-radius:8px;
                      color:white;font-size:14px;padding:6px 8px;width:80px;outline:none;">
                    <button id="coinsApplyBtn" style="
                      flex:1;background:rgba(255,200,0,0.15);color:#FFD700;font-size:12px;font-weight:bold;
                      padding:6px 8px;border-radius:8px;border:1.5px solid rgba(255,200,0,0.3);cursor:pointer;">
                      Apply</button>
                  </div>
                </div>

                <!-- Join Lobby -->
                <div style="background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.1);
                  border-radius:16px;padding:14px 16px;">
                  <div style="color:rgba(255,255,255,0.45);font-size:10px;letter-spacing:1px;
                    text-transform:uppercase;margin-bottom:8px;">Join Lobby</div>
                  <button id="joinLobbyBtn" style="
                    width:100%;background:linear-gradient(135deg,rgba(106,17,203,0.4),rgba(37,117,252,0.4));
                    color:white;font-size:13px;font-weight:bold;padding:8px;border-radius:10px;
                    border:1.5px solid rgba(100,150,255,0.4);cursor:pointer;">🌐 Join Lobby</button>
                </div>

              </div>
            </div>

          </div>
        </div>
      `;

      document.getElementById("modsBackBtn")!.onclick = () => {
        if (game.modMode) game.exitModMode();
        game.goTitle();
      };

      document.getElementById("modToggleBtn")!.onclick = () => {
        if (game.modMode) game.exitModMode(); else game.enterModMode();
        render();
      };

      if (on) {
        document.getElementById("winsApplyBtn")!.onclick = () => {
          const v = parseInt((document.getElementById("winsInput") as HTMLInputElement).value, 10);
          if (!isNaN(v) && v >= 0) { game.state.wins = v; render(); }
        };
        document.getElementById("coinsApplyBtn")!.onclick = () => {
          const v = parseInt((document.getElementById("coinsInput") as HTMLInputElement).value, 10);
          if (!isNaN(v) && v >= 0) { game.state.coins = v; render(); }
        };
        document.getElementById("joinLobbyBtn")!.onclick = () => game.goLobby();
      }
    };

    render();
  }
}
