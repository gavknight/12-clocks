import type { Game } from "../game/Game";

const SB  = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const H   = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" };

const COOLDOWN_MS = 30_000;
const COOLDOWN_KEY = "12clocks_adminlite_coin_cd";

export class AdminLitePanel {
  private _overlay: HTMLDivElement;
  private game: Game;

  constructor(game: Game) {
    this.game = game;
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
    return `
      <div style="width:100%;max-width:400px;display:flex;flex-direction:column;gap:14px;">

        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="color:#66ddff;font-size:22px;font-weight:900;letter-spacing:1px;">
            🛡️ Admin Panel −
          </div>
          <button id="alp_close" style="background:rgba(255,255,255,0.1);color:white;font-size:14px;
            padding:6px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;">
            ✕ Close
          </button>
        </div>
        <div style="color:rgba(100,220,255,0.6);font-size:11px;margin-top:-8px;">
          Press Alt+P to open · Bought with 💎 diamonds
        </div>

        <!-- Give yourself coins -->
        <div style="background:rgba(255,200,0,0.08);border:2px solid rgba(255,200,0,0.35);
          border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;">
          <div style="color:#FFD700;font-size:15px;font-weight:bold;">🪙 Give Yourself Coins</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;">+1,000 coins, once every 30 seconds.</div>
          <button id="alp_giveCoins" style="background:rgba(255,200,0,0.25);color:#FFD700;font-size:14px;
            font-weight:bold;border:2px solid rgba(255,200,0,0.5);border-radius:10px;padding:12px;cursor:pointer;">
            🪙 +1,000 Coins
          </button>
          <div id="alp_coinFb" style="color:#80ff80;font-size:12px;min-height:14px;"></div>
        </div>

        <!-- Message owner -->
        <div style="background:rgba(100,220,255,0.08);border:2px solid rgba(100,220,255,0.35);
          border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;">
          <div style="color:#66ddff;font-size:15px;font-weight:bold;">💡 Message the Owner</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;">Got an update idea? Send it straight to the owner.</div>
          <input id="alp_ideaMsg" type="text" maxlength="200" placeholder="Type your idea…"
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(100,220,255,0.4);border-radius:8px;
            color:white;font-size:13px;padding:8px 12px;outline:none;" />
          <button id="alp_ideaSend" style="background:rgba(100,220,255,0.25);color:#66ddff;font-size:13px;
            font-weight:bold;border:1px solid rgba(100,220,255,0.5);border-radius:8px;padding:10px;cursor:pointer;">
            💡 Send Idea
          </button>
          <div id="alp_ideaFb" style="color:#80ff80;font-size:12px;min-height:14px;"></div>
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

    $("alp_close").onclick = () => this.destroy();

    // Give yourself coins (cooldown)
    const coinBtn = $("alp_giveCoins") as HTMLButtonElement;
    const updateCoinBtn = () => {
      const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? "0");
      const remaining = last + COOLDOWN_MS - Date.now();
      if (remaining > 0) {
        coinBtn.disabled = true;
        coinBtn.style.opacity = "0.5";
        coinBtn.style.cursor = "default";
        coinBtn.textContent = `⏳ Wait ${Math.ceil(remaining / 1000)}s`;
      } else {
        coinBtn.disabled = false;
        coinBtn.style.opacity = "1";
        coinBtn.style.cursor = "pointer";
        coinBtn.textContent = "🪙 +1,000 Coins";
      }
    };
    updateCoinBtn();
    const cdTimer = setInterval(updateCoinBtn, 1000);
    coinBtn.onclick = () => {
      const last = Number(localStorage.getItem(COOLDOWN_KEY) ?? "0");
      if (Date.now() - last < COOLDOWN_MS) return;
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      this.game.state.coins += 1000;
      this.game.save();
      fb("alp_coinFb", "✓ +1,000 coins!");
      updateCoinBtn();
    };
    const origDestroy = this.destroy.bind(this);
    this.destroy = () => { clearInterval(cdTimer); origDestroy(); };

    // Message owner
    $("alp_ideaSend").onclick = () => {
      const msg = ($("alp_ideaMsg") as HTMLInputElement).value.trim();
      if (!msg) { fb("alp_ideaFb", "❌ Type an idea first.", false); return; }
      fetch(`${SB}/update_ideas`, {
        method: "POST", headers: H,
        body: JSON.stringify({ username: this.game.state.username, message: msg, sent_at: Date.now() }),
      }).then(r => {
        if (!r.ok) throw new Error();
        fb("alp_ideaFb", "✓ Sent to the owner!");
        ($("alp_ideaMsg") as HTMLInputElement).value = "";
      }).catch(() => fb("alp_ideaFb", "❌ Failed to send.", false));
    };
  }

  destroy(): void {
    this._overlay.remove();
  }
}
