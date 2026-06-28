import type { Game } from "../game/Game";

const SB   = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const H    = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" };

export class AdminAbusePanel {
  private _overlay: HTMLDivElement;

  constructor(private game: Game) {
    this._overlay = document.createElement("div");
    this._overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      background:rgba(0,0,0,0.92);
      display:flex;flex-direction:column;align-items:center;
      overflow-y:auto;padding:24px 16px 48px;
      font-family:Arial,sans-serif;
    `;
    this._overlay.innerHTML = this._html();
    document.body.appendChild(this._overlay);
    this._wire();
  }

  private _html(): string {
    const accounts = this.game.getAllAccounts();
    const opts = accounts.map(a => `<option value="${a.id}" style="background:#111;">${a.username}</option>`).join("");
    return `
      <div style="width:100%;max-width:400px;display:flex;flex-direction:column;gap:14px;">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="color:#ff4444;font-size:22px;font-weight:900;letter-spacing:1px;">
            😈 Admin Abuse Panel
          </div>
          <button id="aap_close" style="background:rgba(255,255,255,0.1);color:white;font-size:14px;
            padding:6px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;">
            ✕ Close
          </button>
        </div>
        <div style="color:rgba(255,80,80,0.6);font-size:11px;margin-top:-8px;">
          Press Alt+P to open · Admin only 👑
        </div>

        <!-- Global Message -->
        <div style="background:rgba(0,100,255,0.1);border:2px solid rgba(0,140,255,0.4);
          border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;">
          <div style="color:#66aaff;font-size:15px;font-weight:bold;">📢 Global Message</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;">Broadcasts a toast to ALL players right now.</div>
          <input id="aap_chatMsg" type="text" maxlength="120" placeholder="Type a message…"
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(0,140,255,0.4);border-radius:8px;
            color:white;font-size:13px;padding:8px 12px;outline:none;" />
          <button id="aap_chatSend" style="background:rgba(0,100,255,0.35);color:#88ccff;font-size:13px;
            font-weight:bold;border:1px solid rgba(0,140,255,0.5);border-radius:8px;padding:10px;cursor:pointer;">
            📢 Send to All Players
          </button>
          <div id="aap_chatFb" style="color:#80ff80;font-size:12px;min-height:14px;"></div>
        </div>

        <!-- Give Stats -->
        <div style="background:rgba(255,180,0,0.08);border:2px solid rgba(255,200,0,0.35);
          border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;">
          <div style="color:#ffdd66;font-size:15px;font-weight:bold;">🎁 Give Stats</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;">Gift coins &amp; wins to one player or everyone.</div>
          <select id="aap_target" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,200,0,0.35);
            border-radius:8px;color:white;font-size:13px;padding:8px 12px;outline:none;
            appearance:none;-webkit-appearance:none;">
            <option value="ALL" style="background:#111;">🌍 ALL Players</option>
            ${opts}
          </select>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-bottom:4px;">🪙 Coins</div>
              <input id="aap_coins" type="number" min="0" value="0"
                style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);
                border:1px solid rgba(255,200,0,0.3);border-radius:8px;color:white;
                font-size:13px;padding:8px 10px;outline:none;" />
            </div>
            <div>
              <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-bottom:4px;">🏆 Wins</div>
              <input id="aap_wins" type="number" min="0" value="0"
                style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);
                border:1px solid rgba(255,200,0,0.3);border-radius:8px;color:white;
                font-size:13px;padding:8px 10px;outline:none;" />
            </div>
          </div>
          <button id="aap_giveSend" style="background:rgba(255,180,0,0.25);color:#ffdd66;font-size:13px;
            font-weight:bold;border:1px solid rgba(255,200,0,0.45);border-radius:8px;padding:10px;cursor:pointer;">
            🎁 Send Gift
          </button>
          <div id="aap_giveFb" style="color:#80ff80;font-size:12px;min-height:14px;"></div>
        </div>

        <!-- Coin Jump Editor -->
        <div style="background:rgba(255,200,0,0.08);border:2px solid rgba(255,200,0,0.4);
          border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;">
          <div style="color:#FFD700;font-size:15px;font-weight:bold;">🪙 Coin Jump Editor</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;">Open Coin Jump first, then use this to drop coins anywhere!</div>
          <button id="aap_cjEditor" style="background:rgba(255,200,0,0.25);color:#FFD700;font-size:14px;
            font-weight:bold;border:2px solid rgba(255,200,0,0.5);border-radius:10px;padding:12px;cursor:pointer;">
            🗺️ Open Coin Editor Overlay
          </button>
          <div id="aap_cjFb" style="color:#80ff80;font-size:12px;min-height:14px;"></div>
        </div>

        <!-- Party Mode -->
        <div style="background:rgba(255,100,200,0.10);border:2px solid rgba(255,100,200,0.45);
          border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;">
          <div style="color:#ff88dd;font-size:15px;font-weight:bold;">🎉 Party Mode</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;">Confetti &amp; balloons on everyone's screen.</div>
          <button id="aap_partyBtn" style="
            background:${this.game.partyMode ? "rgba(255,80,180,0.4)" : "rgba(255,255,255,0.08)"};
            color:${this.game.partyMode ? "#ffaaee" : "rgba(255,255,255,0.7)"};
            font-size:14px;font-weight:bold;padding:12px;border-radius:10px;
            border:2px solid ${this.game.partyMode ? "rgba(255,80,180,0.7)" : "rgba(255,255,255,0.2)"};
            cursor:pointer;">
            ${this.game.partyMode ? "🎊 ON — Click to Stop" : "🎉 Start Party!"}
          </button>
        </div>


      </div>
    `;
  }

  private _wire(): void {
    const $ = (id: string) => document.getElementById(id)!;
    const fb = (id: string, msg: string, ok = true) => {
      const el = $(id);
      el.style.color = ok ? "#80ff80" : "#ff8888";
      el.textContent = msg;
      setTimeout(() => { el.textContent = ""; }, 3000);
    };

    $("aap_close").onclick = () => this.destroy();

    // Global message
    $("aap_chatSend").onclick = () => {
      const msg = ($("aap_chatMsg") as HTMLInputElement).value.trim();
      if (!msg) { fb("aap_chatFb", "❌ Message cannot be empty.", false); return; }
      fetch(`${SB}/admin_chat`, {
        method: "POST", headers: H,
        body: JSON.stringify({ message: msg, sender: this.game.state.username, sent_at: Date.now() }),
      }).then(r => {
        if (!r.ok) throw new Error();
        fb("aap_chatFb", "✓ Sent to all players!");
        ($("aap_chatMsg") as HTMLInputElement).value = "";
      }).catch(() => fb("aap_chatFb", "❌ Failed to send.", false));
    };

    // Give stats
    $("aap_giveSend").onclick = () => {
      const targetId = ($("aap_target") as HTMLSelectElement).value;
      const coins    = parseInt(($("aap_coins") as HTMLInputElement).value, 10) || 0;
      const wins     = parseInt(($("aap_wins")  as HTMLInputElement).value, 10) || 0;
      if (coins === 0 && wins === 0) { fb("aap_giveFb", "❌ Enter at least 1 coin or 1 win.", false); return; }

      const accounts = targetId === "ALL" ? this.game.getAllAccounts() : this.game.getAllAccounts().filter(a => a.id === targetId);
      Promise.all(accounts.map(acc =>
        fetch(`${SB}/player_gifts`, {
          method: "POST", headers: H,
          body: JSON.stringify({ account_id: acc.id, coins, wins, claimed: false, sent_at: Date.now() }),
        })
      )).then(() => {
        fb("aap_giveFb", `✓ Gifted 🪙${coins.toLocaleString()} + 🏆${wins} to ${targetId === "ALL" ? `all ${accounts.length} players` : accounts[0]?.username}!`);
        ($("aap_coins") as HTMLInputElement).value = "0";
        ($("aap_wins")  as HTMLInputElement).value = "0";
      }).catch(() => fb("aap_giveFb", "❌ Failed.", false));
    };

    // Coin Jump editor — launches Coin Jump then immediately opens the editor overlay
    $("aap_cjEditor").onclick = () => {
      this.destroy();
      import("./games/CoinJump").then(m => {
        new m.CoinJump(this.game);
        setTimeout(() => {
          import("./games/CoinJumpEditor").then(m2 => new m2.CoinJumpEditor(this.game));
        }, 200);
      });
    };

    // Party mode
    $("aap_partyBtn").onclick = () => {
      if (this.game.partyMode) this.game.disablePartyMode(); else this.game.enablePartyMode();
      const btn = $("aap_partyBtn");
      btn.textContent   = this.game.partyMode ? "🎊 ON — Click to Stop" : "🎉 Start Party!";
      btn.style.background   = this.game.partyMode ? "rgba(255,80,180,0.4)"  : "rgba(255,255,255,0.08)";
      btn.style.color        = this.game.partyMode ? "#ffaaee"               : "rgba(255,255,255,0.7)";
      btn.style.borderColor  = this.game.partyMode ? "rgba(255,80,180,0.7)"  : "rgba(255,255,255,0.2)";
    };
  }

  destroy(): void {
    this._overlay.remove();
  }
}
