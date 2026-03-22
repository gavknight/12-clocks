import type { Game } from "../game/Game";

export class AdminPanel {
  constructor(game: Game) {
    this._build(game);
    game._disposeScene = () => { game.ui.innerHTML = ""; };
  }

  private _build(game: Game): void {
    const btn = (emoji: string, label: string, color: string, onClick: () => void): string => {
      const id = `adminBtn_${Math.random().toString(36).slice(2)}`;
      setTimeout(() => { document.getElementById(id)?.addEventListener("click", onClick); }, 0);
      return `<button id="${id}" style="
        width:100%;padding:14px 20px;border-radius:14px;
        background:rgba(255,255,255,0.08);color:${color};font-size:15px;font-weight:bold;
        border:2px solid ${color};cursor:pointer;text-align:left;
        font-family:Arial,sans-serif;transition:background 0.15s;
      " onmouseenter="this.style.background='rgba(255,255,255,0.16)'"
         onmouseleave="this.style.background='rgba(255,255,255,0.08)'"
      >${emoji} ${label}</button>`;
    };

    const renderAccounts = () => {
      const el = document.getElementById("accountList");
      if (!el) return;
      const accounts = game.getAllAccounts();
      const bannedIds = game.getBannedIds();
      if (accounts.length === 0) {
        el.innerHTML = `<div style="color:rgba(255,255,255,0.35);font-size:13px;">No accounts yet.</div>`;
        return;
      }
      el.innerHTML = accounts.map(acc => {
        const banned = bannedIds.includes(acc.id);
        const isMe = acc.id === game.currentAccountId;
        return `
          <div style="
            display:flex;align-items:center;justify-content:space-between;gap:8px;
            padding:8px 10px;border-radius:10px;
            background:${banned ? "rgba(180,0,0,0.2)" : "rgba(255,255,255,0.05)"};
            border:1px solid ${banned ? "rgba(200,0,0,0.4)" : "rgba(255,255,255,0.1)"};
          ">
            <div>
              <span style="color:${banned ? "#ff8888" : "white"};font-size:14px;font-weight:bold;">
                ${banned ? "🚫 " : ""}${acc.username}${isMe ? " (you)" : ""}
              </span>
              <div style="color:rgba(255,255,255,0.3);font-size:11px;">
                ID: ${acc.id} · joined ${new Date(acc.createdAt).toLocaleDateString()}
              </div>
            </div>
            ${isMe ? "" : `
              <button data-accountid="${acc.id}" data-banned="${banned}" style="
                background:${banned ? "rgba(0,180,0,0.3)" : "rgba(180,0,0,0.3)"};
                color:${banned ? "#88ff88" : "#ff8888"};font-size:12px;font-weight:bold;
                border:1px solid ${banned ? "#4CAF50" : "#ff4444"};border-radius:8px;
                padding:4px 12px;cursor:pointer;font-family:Arial,sans-serif;white-space:nowrap;
              ">${banned ? "Unban" : "Ban"}</button>
            `}
          </div>`;
      }).join("");

      el.querySelectorAll<HTMLElement>("[data-accountid]").forEach(b => {
        b.onclick = () => {
          const id     = b.dataset["accountid"]!;
          const banned = b.dataset["banned"] === "true";
          if (banned) game.unbanUser(id); else game.banUser(id);
          renderAccounts();
        };
      });
    };

    game.ui.innerHTML = `
      <div class="screen" style="
        background:rgba(0,0,0,0.95);overflow-y:auto;
        display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
        padding:28px 16px;gap:12px;font-family:monospace;
      ">
        <div style="font-size:26px;font-weight:bold;color:#FFD700;text-align:center;">
          🔧 ADMIN PANEL — Gavin Only 👑
        </div>
        <div style="color:rgba(255,255,255,0.45);font-size:12px;margin-bottom:4px;">
          Press Ctrl anywhere · or click 🔧 Admin on the title screen
        </div>

        <!-- Cheat buttons -->
        <div style="width:100%;max-width:360px;display:flex;flex-direction:column;gap:8px;">
          ${btn("🎒", "Give All 12 Numbers", "white", () => {
            for (let n = 1; n <= 12; n++) game.addToInventory(n);
            game.goExplore();
          })}
          ${btn("⚡", "Unlock All Locks Instantly", "#FFD700", () => {
            for (let i = 0; i < 12; i++) game.state.unlockedLocks.add(i);
            game.save();
            game.goExplore();
          })}
          ${btn("🗺️", "Unlock All 28 Levels", "#4D96FF", () => {
            for (let n = 1; n <= 28; n++) (game as any)._unlockedLevels.add(n);
            game.save();
            alert("All 28 levels unlocked!");
          })}
          ${btn("🏁", "Skip to Ending", "#ff66ff", () => {
            for (let i = 0; i < 12; i++) game.state.unlockedLocks.add(i);
            game.save();
            game.goEnding();
          })}
          ${btn("🗑️", "Reset Save", "#ff6666", () => {
            game.resetSave();
            game.goTitle();
          })}
        </div>

        <!-- Coin cheats -->
        <div style="width:100%;max-width:360px;">
          <div style="color:#FFD700;font-size:13px;font-weight:bold;margin-bottom:6px;">
            🪙 Coin Cheats — current: <span id="adminCoinCount">${game.state.coins}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
            ${[100,500,1000].map(amt => btn("🪙", `+${amt}`, "#FFD700", () => {
              game.state.coins += amt;
              game.save();
              const el = document.getElementById("adminCoinCount");
              if (el) el.textContent = String(game.state.coins);
            })).join("")}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">
            ${btn("💰", "+9,999", "#FFD700", () => {
              game.state.coins += 9999;
              game.save();
              const el = document.getElementById("adminCoinCount");
              if (el) el.textContent = String(game.state.coins);
            })}
            ${btn("🤑", "+1,000,000", "#ff9900", () => {
              game.state.coins += 1000000;
              game.save();
              const el = document.getElementById("adminCoinCount");
              if (el) el.textContent = String(game.state.coins);
            })}
          </div>
        </div>

        <!-- Mini-game hacks -->
        <div style="width:100%;max-width:360px;">
          <div style="color:rgba(255,140,0,0.9);font-size:13px;font-weight:bold;margin-bottom:6px;">
            🕹️ Mini-Game Hacks
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            ${btn("⏱️", "60s Timer",  "rgba(255,255,255,0.6)", () => { localStorage.setItem("mg_duration","60");  alert("Mini-games set to 60s"); })}
            ${btn("⏱️", "120s Timer", "#4CAF50",               () => { localStorage.setItem("mg_duration","120"); alert("Mini-games set to 120s"); })}
            ${btn("⏱️", "180s Timer", "#FFD700",               () => { localStorage.setItem("mg_duration","180"); alert("Mini-games set to 180s"); })}
            ${btn("⏱️", "300s Timer", "#FF9900",               () => { localStorage.setItem("mg_duration","300"); alert("Mini-games set to 300s!"); })}
          </div>
          <div style="margin-top:8px;color:rgba(255,255,255,0.35);font-size:11px;">
            ⚡ BOOST button inside each game: 3× coins + 2× speed (admin only)
          </div>
        </div>

        <!-- Account management -->
        <div style="
          width:100%;max-width:360px;
          background:rgba(180,0,0,0.12);
          border:2px solid rgba(200,0,0,0.4);border-radius:16px;
          padding:16px;display:flex;flex-direction:column;gap:10px;
        ">
          <div style="color:#ff8888;font-size:14px;font-weight:bold;">🚫 Player Accounts</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:-6px;">
            Click Ban/Unban next to any player. Banned players can't play.
          </div>
          <div id="accountList" style="display:flex;flex-direction:column;gap:6px;"></div>
        </div>

        ${btn("←", "Back to Title", "rgba(255,255,255,0.55)", () => game.goTitle())}
      </div>
    `;

    renderAccounts();
  }
}
