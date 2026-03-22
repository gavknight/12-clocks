import type { Game } from "../game/Game";

const MEDALS = ["🥇", "🥈", "🥉"];

export class CoinLeaderboardScene {
  constructor(game: Game) {
    game._disposeScene = () => { game.ui.innerHTML = ""; };
    this._showLoading(game);
    // Push current player's coins first, then fetch so they appear immediately
    game.syncCoins().then(() => game.getCoinLeaderboard()).then(records => this._build(game, records));
  }

  private _showLoading(game: Game): void {
    game.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#0a1a00,#1a2800,#0a1800);
        flex-direction:column;gap:16px;">
        <div style="font-size:40px;">🪙</div>
        <div style="color:rgba(255,255,255,0.6);font-size:16px;">Loading leaderboard...</div>
      </div>`;
  }

  private _build(game: Game, records: Awaited<ReturnType<typeof game.getCoinLeaderboard>>): void {
    const myId = game.currentAccountId;

    const rows = records.length === 0
      ? `<div style="color:rgba(255,255,255,0.4);font-size:15px;text-align:center;padding:20px;">
           No coins earned yet!<br>
           <span style="font-size:13px;">Play mini-games to earn coins and appear here.</span>
         </div>`
      : records.map((rec, i) => {
          const isMe  = rec.account_id === myId;
          const medal = MEDALS[i] ?? `#${i + 1}`;
          return `
            <div style="
              display:flex;align-items:center;gap:12px;
              padding:12px 16px;border-radius:14px;
              background:${isMe
                ? "rgba(255,215,0,0.12)"
                : i === 0
                  ? "rgba(255,215,0,0.08)"
                  : "rgba(255,255,255,0.05)"};
              border:${isMe
                ? "2px solid rgba(255,215,0,0.5)"
                : i === 0
                  ? "2px solid rgba(255,215,0,0.25)"
                  : "1px solid rgba(255,255,255,0.08)"};
            ">
              <!-- Rank -->
              <div style="font-size:${i < 3 ? 26 : 16}px;min-width:32px;text-align:center;">
                ${medal}
              </div>

              <!-- Name -->
              <div style="flex:1;min-width:0;">
                <div style="
                  color:${isMe ? "#FFD700" : "white"};
                  font-size:16px;font-weight:bold;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                ">
                  ${rec.username}${isMe ? " 👤" : ""}
                </div>
              </div>

              <!-- Coins -->
              <div style="
                font-size:18px;font-weight:bold;font-family:monospace;
                color:${i === 0 ? "#FFD700" : "rgba(255,255,255,0.85)"};
                white-space:nowrap;
              ">
                🪙 ${rec.coins.toLocaleString()}
              </div>
            </div>`;
        }).join("");

    game.ui.innerHTML = `
      <div class="screen" style="
        background:linear-gradient(160deg,#0a1a00,#1a2800,#0a1808);
        flex-direction:column;gap:0;overflow-y:auto;
        justify-content:flex-start;padding:28px 16px;
      ">
        <!-- Stars -->
        ${Array.from({length:10},(_,i)=>`<div style="position:absolute;
          left:${[5,18,30,55,70,85,92,10,42,68][i]}%;
          top:${[6,18,4,10,3,8,18,28,22,26][i]}%;
          width:3px;height:3px;border-radius:50%;background:white;
          opacity:${0.2+i*0.05};pointer-events:none;"></div>`).join("")}

        <div style="font-size:40px;margin-bottom:6px;">🪙</div>
        <h2 style="color:#FFD700;font-size:30px;margin:0 0 4px;
          text-shadow:0 0 16px rgba(255,215,0,0.5);">
          Coin Leaderboard
        </h2>
        <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0 0 20px;">
          Most coins earned across all mini-games
        </p>

        <div style="width:100%;max-width:440px;display:flex;flex-direction:column;gap:8px;">
          ${rows}
        </div>

        <button id="backBtn" style="
          margin-top:24px;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);
          font-size:14px;padding:9px 24px;border-radius:12px;
          border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-family:Arial,sans-serif;
        ">← Back</button>
      </div>
    `;

    document.getElementById("backBtn")!.onclick = () => game.goArcade();
  }
}
