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
          ${btn("🎓", "Replay Tutorial", "#cc88ff", () => {
            import("./Tutorial").then(({ startTutorial }) => { startTutorial(); game.goTitle(); });
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

        <!-- Rule reports -->
        <div style="
          width:100%;max-width:360px;
          background:rgba(255,60,60,0.08);
          border:2px solid rgba(255,80,80,0.35);border-radius:16px;
          padding:16px;display:flex;flex-direction:column;gap:8px;
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div style="color:#ff8888;font-size:14px;font-weight:bold;">🚩 Rule Reports</div>
            <button id="refreshReports" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);
              color:rgba(255,255,255,0.6);font-size:11px;padding:4px 10px;border-radius:8px;cursor:pointer;
              font-family:Arial,sans-serif;">↻ Refresh</button>
          </div>
          <div id="reportsList" style="display:flex;flex-direction:column;gap:6px;">
            <div style="color:rgba(255,255,255,0.3);font-size:12px;">Loading…</div>
          </div>
        </div>

        <!-- Update alert -->
        <div style="
          width:100%;max-width:360px;
          background:rgba(255,80,0,0.1);
          border:2px solid rgba(255,100,0,0.4);border-radius:16px;
          padding:16px;display:flex;flex-direction:column;gap:10px;
        ">
          <div style="color:#ff9944;font-size:14px;font-weight:bold;">🔧 Send Update Alert</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:-6px;">
            Shows a countdown banner on everyone's screen.
          </div>
          <input id="alertMsg" type="text" maxlength="60" placeholder="Update incoming!" value="Update incoming!"
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,150,0,0.4);border-radius:8px;
            color:white;font-size:13px;padding:8px 12px;font-family:Arial,sans-serif;outline:none;" />
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;" id="alertTimeBtns">
            ${[["30s",30],["1m",60],["2m",120],["5m",300],["15m",900],["30m",1800],["1h",3600]].map(([label, secs]) => `
              <button data-secs="${secs}" style="
                background:rgba(255,100,0,0.15);color:#ffaa66;font-size:12px;font-weight:bold;
                padding:8px 4px;border-radius:8px;border:1px solid rgba(255,100,0,0.35);cursor:pointer;
                font-family:Arial,sans-serif;">${label}</button>
            `).join("")}
          </div>
          <div id="alertFeedback" style="color:#80ff80;font-size:12px;min-height:16px;"></div>
        </div>

        <!-- Hacker Reports -->
        <div style="width:100%;max-width:500px;background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,80,80,0.3);border-radius:14px;padding:16px 18px;margin-bottom:12px;">
          <div style="color:rgba(255,100,100,0.9);font-size:12px;letter-spacing:2px;
            text-transform:uppercase;margin-bottom:12px;">🚨 Hacker Reports</div>
          <div id="hackerReportsList" style="display:flex;flex-direction:column;gap:8px;">
            <div style="color:rgba(255,255,255,0.3);font-size:12px;">Loading...</div>
          </div>
        </div>

        <!-- Clan Applications -->
        <div style="width:100%;max-width:500px;background:rgba(255,255,255,0.05);
          border:1px solid rgba(180,100,255,0.3);border-radius:14px;padding:16px 18px;margin-bottom:12px;">
          <div style="color:rgba(180,100,255,0.9);font-size:12px;letter-spacing:2px;
            text-transform:uppercase;margin-bottom:12px;">🔍 Clan Applications</div>
          <div id="clanAppsList" style="display:flex;flex-direction:column;gap:8px;">
            <div style="color:rgba(255,255,255,0.3);font-size:12px;">Loading...</div>
          </div>
        </div>

        <!-- Public Chat -->
        <div style="
          width:100%;max-width:360px;
          background:rgba(0,100,255,0.1);
          border:2px solid rgba(0,140,255,0.4);border-radius:16px;
          padding:16px;display:flex;flex-direction:column;gap:10px;
        ">
          <div style="color:#66aaff;font-size:14px;font-weight:bold;">📢 Public Chat</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:-6px;">
            Broadcasts a toast notification to all players.
          </div>
          <input id="chatMsg" type="text" maxlength="120" placeholder="Type a message…"
            style="background:rgba(255,255,255,0.08);border:1px solid rgba(0,140,255,0.4);border-radius:8px;
            color:white;font-size:13px;padding:8px 12px;font-family:Arial,sans-serif;outline:none;" />
          <button id="chatSendBtn" style="
            background:rgba(0,100,255,0.3);color:#88ccff;font-size:13px;font-weight:bold;
            border:1px solid rgba(0,140,255,0.5);border-radius:8px;padding:9px;cursor:pointer;
            font-family:Arial,sans-serif;">📢 Send to All Players</button>
          <div id="chatFeedback" style="color:#80ff80;font-size:12px;min-height:16px;"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
            <span style="color:rgba(255,255,255,0.4);font-size:11px;">Recent messages</span>
            <button id="apChatRefresh" style="background:transparent;border:none;color:rgba(255,255,255,0.35);font-size:11px;cursor:pointer;padding:0;">↻ Refresh</button>
          </div>
          <div id="apChatFeed" style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;"></div>
        </div>

        <!-- Give Stats -->
        <div style="
          width:100%;max-width:360px;
          background:rgba(255,180,0,0.08);
          border:2px solid rgba(255,200,0,0.35);border-radius:16px;
          padding:16px;display:flex;flex-direction:column;gap:10px;
        ">
          <div style="color:#ffdd66;font-size:14px;font-weight:bold;">🎁 Give Stats to Player</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:-6px;">
            Select a player and gift them coins and/or wins.
          </div>
          <select id="giftTarget" style="
            background:rgba(255,255,255,0.08);border:1px solid rgba(255,200,0,0.35);border-radius:8px;
            color:white;font-size:13px;padding:8px 12px;font-family:Arial,sans-serif;outline:none;
            appearance:none;-webkit-appearance:none;">
            <option value="" style="background:#111;">— Select a player —</option>
            ${game.getAllAccounts().map(acc => `<option value="${acc.id}" style="background:#111;">${acc.username}</option>`).join("")}
          </select>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-bottom:4px;">🪙 Coins</div>
              <input id="giftCoins" type="number" min="0" value="0"
                style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);
                border:1px solid rgba(255,200,0,0.3);border-radius:8px;color:white;
                font-size:13px;padding:8px 10px;font-family:Arial,sans-serif;outline:none;" />
            </div>
            <div>
              <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-bottom:4px;">🏆 Wins</div>
              <input id="giftWins" type="number" min="0" value="0"
                style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);
                border:1px solid rgba(255,200,0,0.3);border-radius:8px;color:white;
                font-size:13px;padding:8px 10px;font-family:Arial,sans-serif;outline:none;" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <button id="giftSendBtn" style="
              background:rgba(255,180,0,0.25);color:#ffdd66;font-size:13px;font-weight:bold;
              border:1px solid rgba(255,200,0,0.45);border-radius:8px;padding:9px;cursor:pointer;
              font-family:Arial,sans-serif;">🎁 Send Gift</button>
            <button id="giftAllBtn" style="
              background:rgba(255,120,0,0.25);color:#ffcc88;font-size:13px;font-weight:bold;
              border:1px solid rgba(255,150,0,0.45);border-radius:8px;padding:9px;cursor:pointer;
              font-family:Arial,sans-serif;">🎁 Give All</button>
          </div>
          <div id="giftFeedback" style="color:#80ff80;font-size:12px;min-height:16px;"></div>
        </div>

        <!-- Party Mode -->
        <div style="
          width:100%;max-width:360px;
          background:rgba(255,100,200,0.10);
          border:2px solid rgba(255,100,200,0.45);border-radius:16px;
          padding:16px;display:flex;flex-direction:column;gap:10px;
        ">
          <div style="color:#ff88dd;font-size:14px;font-weight:bold;">🎉 Party Mode</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:-6px;">
            Decorates everyone's screen with confetti, balloons &amp; music.
          </div>
          <button id="partyToggleBtn" style="
            background:${game.partyMode ? "rgba(255,80,180,0.4)" : "rgba(255,255,255,0.08)"};
            color:${game.partyMode ? "#ffaaee" : "rgba(255,255,255,0.7)"};
            font-size:14px;font-weight:bold;padding:10px;border-radius:10px;
            border:2px solid ${game.partyMode ? "rgba(255,80,180,0.7)" : "rgba(255,255,255,0.2)"};
            cursor:pointer;font-family:Arial,sans-serif;">
            ${game.partyMode ? "🎊 ON — Click to Stop" : "🎉 Start Party!"}
          </button>
        </div>

        ${btn("←", "Back to Title", "rgba(255,255,255,0.55)", () => game.goTitle())}
      </div>
    `;

    renderAccounts();

    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    const H = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates" };

    // Clan applications
    const SB_CLAN = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/clan_applications";
    const loadClanApps = () => {
      const el = document.getElementById("clanAppsList");
      if (!el) return;
      fetch(`${SB_CLAN}?order=applied_at.desc&limit=50`, {
        headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
      }).then(r => r.json()).then((rows: { id: number; username: string; account_id: string; reason: string; status: string }[]) => {
        if (!rows.length) {
          el.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:12px;">No applications yet.</div>`;
          return;
        }
        el.innerHTML = rows.map(row => `
          <div style="padding:10px 12px;border-radius:10px;
            background:${row.status === "accepted" ? "rgba(0,180,0,0.1)" : row.status === "rejected" ? "rgba(180,0,0,0.1)" : "rgba(255,255,255,0.06)"};
            border:1px solid ${row.status === "accepted" ? "rgba(0,200,0,0.3)" : row.status === "rejected" ? "rgba(200,0,0,0.3)" : "rgba(255,255,255,0.1)"};">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <div>
                <div style="color:white;font-size:14px;font-weight:bold;">${row.username}</div>
                ${row.reason ? `<div style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:2px;">"${row.reason}"</div>` : ""}
                <div style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:2px;">
                  ${row.status === "accepted" ? "✅ Accepted" : row.status === "rejected" ? "❌ Rejected" : "⏳ Pending"}
                </div>
              </div>
              ${row.status === "pending" ? `
              <div style="display:flex;gap:6px;">
                <button onclick="window.__clanAccept(${row.id})" style="background:rgba(0,180,0,0.3);color:#80ff80;
                  font-size:12px;padding:6px 12px;border-radius:8px;border:1px solid rgba(0,200,0,0.4);cursor:pointer;">
                  ✅ Accept
                </button>
                <button onclick="window.__clanReject(${row.id})" style="background:rgba(180,0,0,0.3);color:#ff8080;
                  font-size:12px;padding:6px 12px;border-radius:8px;border:1px solid rgba(200,0,0,0.4);cursor:pointer;">
                  ❌ Reject
                </button>
              </div>` : ""}
            </div>
          </div>
        `).join("");
      }).catch(() => {
        const el2 = document.getElementById("clanAppsList");
        if (el2) el2.innerHTML = `<div style="color:rgba(255,80,80,0.6);font-size:12px;">Failed to load.</div>`;
      });
    };

    const w = window as unknown as Record<string, unknown>;
    w.__clanAccept = (id: number) => {
      fetch(`${SB_CLAN}?id=eq.${id}`, {
        method: "PATCH",
        headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      }).then(() => loadClanApps());
    };
    w.__clanReject = (id: number) => {
      fetch(`${SB_CLAN}?id=eq.${id}`, {
        method: "PATCH",
        headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      }).then(() => loadClanApps());
    };

    loadClanApps();

    // Hacker reports
    const SB_HACK = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/hacker_reports";
    fetch(`${SB_HACK}?order=submitted_at.desc&limit=50`, {
      headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
    }).then(r => r.json()).then((rows: { id: number; reporter: string; hacker_name: string; cheat_type: string; level: string; details: string; submitted_at: number }[]) => {
      const el = document.getElementById("hackerReportsList");
      if (!el) return;
      if (!rows.length) { el.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:12px;">No reports yet.</div>`; return; }
      el.innerHTML = rows.map(row => `
        <div style="padding:10px 12px;border-radius:10px;
          background:rgba(255,50,50,0.08);border:1px solid rgba(255,80,80,0.2);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div>
              <div style="color:#ff8080;font-size:14px;font-weight:bold;">💀 ${row.hacker_name}</div>
              <div style="color:white;font-size:13px;margin-top:2px;">Cheat: <b>${row.cheat_type}</b>${row.level ? ` · Level: ${row.level}` : ""}</div>
              ${row.details ? `<div style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:2px;">"${row.details}"</div>` : ""}
              <div style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:4px;">Reported by ${row.reporter}</div>
            </div>
          </div>
        </div>
      `).join("");
    }).catch(() => {});

    // Rule reports
    const loadReports = () => {
      const el = document.getElementById("reportsList");
      if (!el) return;
      fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/rule_reports?order=reported_at.desc&limit=20`, {
        headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
      }).then(r => r.json()).then((rows: { id: number; reported_at: string; reporter: string; rule_text: string; seen: boolean }[]) => {
        if (!rows.length) {
          el.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:12px;">No reports yet.</div>`;
          return;
        }
        el.innerHTML = rows.map(row => `
          <div style="padding:8px 10px;border-radius:10px;
            background:${row.seen ? "rgba(255,255,255,0.04)" : "rgba(255,60,60,0.12)"};
            border:1px solid ${row.seen ? "rgba(255,255,255,0.08)" : "rgba(255,80,80,0.4)"};">
            <span style="color:${row.seen ? "rgba(255,255,255,0.5)" : "#ffaaaa"};font-size:13px;font-weight:bold;">
              ${row.seen ? "" : "🔴 "}${row.reporter}
            </span>
            <div style="color:rgba(255,255,255,0.45);font-size:11px;margin-top:2px;">${row.rule_text}</div>
            <div style="color:rgba(255,255,255,0.25);font-size:10px;margin-top:2px;">${new Date(row.reported_at).toLocaleString()}</div>
            ${!row.seen ? `
            <div style="display:flex;gap:6px;margin-top:8px;">
              <button data-ban="${row.reporter}" style="
                flex:1;background:rgba(180,0,0,0.3);color:#ff8888;font-size:12px;font-weight:bold;
                border:1px solid #ff4444;border-radius:8px;padding:5px;cursor:pointer;
                font-family:Arial,sans-serif;">🚫 Ban</button>
              <button data-letgo="${row.id}" style="
                flex:1;background:rgba(0,180,0,0.15);color:#88ff88;font-size:12px;font-weight:bold;
                border:1px solid #4CAF50;border-radius:8px;padding:5px;cursor:pointer;
                font-family:Arial,sans-serif;">✅ Let them be</button>
            </div>` : `<div style="color:rgba(255,255,255,0.2);font-size:11px;margin-top:4px;">Resolved</div>`}
          </div>
        `).join("");
        el.querySelectorAll<HTMLElement>("[data-ban]").forEach(b => {
          b.onclick = () => {
            const username = b.dataset.ban!;
            const acc = game.getAllAccounts().find(a => a.username === username);
            if (!acc) return;
            if (acc.isOwner || acc.id === game.currentAccountId) {
              alert("You can't ban yourself!");
              return;
            }
            game.banUser(acc.id); renderAccounts();
            // also mark report seen
            const reportDiv = b.closest("[style*='border']") as HTMLElement;
            const letgoBtn = reportDiv?.querySelector<HTMLElement>("[data-letgo]");
            if (letgoBtn) letgoBtn.click();
          };
        });
        el.querySelectorAll<HTMLElement>("[data-letgo]").forEach(b => {
          b.onclick = () => {
            const id = b.dataset.letgo;
            fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/rule_reports?id=eq.${id}`, {
              method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
              body: JSON.stringify({ seen: true })
            }).then(() => loadReports());
          };
        });
      }).catch(() => {
        if (el) el.innerHTML = `<div style="color:#ff8888;font-size:12px;">Failed to load reports.</div>`;
      });
    };
    loadReports();
    document.getElementById("refreshReports")!.onclick = loadReports;

    // Public Chat
    const SB_CHAT = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/admin_chat";
    document.getElementById("chatSendBtn")!.addEventListener("click", () => {
      const msg = (document.getElementById("chatMsg") as HTMLInputElement).value.trim();
      const fb  = document.getElementById("chatFeedback")!;
      if (!msg) { fb.style.color = "#ff8888"; fb.textContent = "❌ Message cannot be empty."; setTimeout(() => { fb.textContent = ""; }, 2500); return; }
      fetch(SB_CHAT, {
        method: "POST",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ message: msg, sender: game.state.username, sent_at: Date.now() }),
      }).then(r => {
        if (!r.ok) throw new Error();
        fb.style.color = "#80ff80";
        fb.textContent = "✓ Message sent to all players!";
        (document.getElementById("chatMsg") as HTMLInputElement).value = "";
        setTimeout(() => { fb.textContent = ""; }, 3000);
      }).catch(() => {
        fb.style.color = "#ff8888";
        fb.textContent = "❌ Failed to send.";
      });
    });

    // Chat feed with delete
    const apDelMsg = (id: number) => {
      fetch(`${SB_CHAT}?id=eq.${id}`, { method: "DELETE", headers: H })
        .then(() => apLoadChat()).catch(() => {});
    };
    const apLoadChat = () => {
      fetch(`${SB_CHAT}?order=sent_at.desc&limit=30`, { headers: H })
        .then(r => r.json())
        .then((rows: { id: number; sender: string; message: string; sent_at: number }[]) => {
          const el = document.getElementById("apChatFeed");
          if (!el) return;
          if (!rows.length) { el.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:12px;">No messages yet.</div>`; return; }
          el.innerHTML = rows.map(r => `
            <div style="display:flex;align-items:flex-start;gap:6px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <div style="flex:1;min-width:0;">
                <span style="color:#66ddff;font-size:12px;font-weight:bold;">${r.sender}:</span>
                <span style="color:rgba(255,255,255,0.8);font-size:12px;margin-left:6px;word-break:break-word;">${r.message}</span>
                <div style="color:rgba(255,255,255,0.25);font-size:10px;">${new Date(r.sent_at).toLocaleTimeString()}</div>
              </div>
              <button class="apDelBtn" data-id="${r.id}" style="flex-shrink:0;background:rgba(255,60,60,0.15);color:#ff8888;
                border:1px solid rgba(255,60,60,0.3);border-radius:6px;padding:2px 8px;
                font-size:11px;cursor:pointer;">🗑</button>
            </div>`).join("");
          el.querySelectorAll<HTMLButtonElement>(".apDelBtn").forEach(btn => {
            btn.onclick = () => apDelMsg(Number(btn.dataset.id));
          });
        }).catch(() => {});
    };
    apLoadChat();
    document.getElementById("apChatRefresh")!.addEventListener("click", apLoadChat);
    setInterval(apLoadChat, 8000);

    // Give Stats
    const SB_GIFTS = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/player_gifts";
    document.getElementById("giftSendBtn")!.addEventListener("click", () => {
      const accountId = (document.getElementById("giftTarget") as HTMLSelectElement).value;
      const coins     = parseInt((document.getElementById("giftCoins") as HTMLInputElement).value, 10) || 0;
      const wins      = parseInt((document.getElementById("giftWins")  as HTMLInputElement).value, 10) || 0;
      const fb        = document.getElementById("giftFeedback")!;
      if (!accountId) { fb.style.color = "#ff8888"; fb.textContent = "❌ Select a player first."; setTimeout(() => { fb.textContent = ""; }, 2500); return; }
      if (coins === 0 && wins === 0) { fb.style.color = "#ff8888"; fb.textContent = "❌ Give at least 1 coin or 1 win."; setTimeout(() => { fb.textContent = ""; }, 2500); return; }
      fetch(SB_GIFTS, {
        method: "POST",
        headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ account_id: accountId, coins, wins, claimed: false, sent_at: Date.now() }),
      }).then(r => {
        if (!r.ok) throw new Error();
        fb.style.color = "#80ff80";
        fb.textContent = `✓ Sent 🪙${coins.toLocaleString()} coins + 🏆${wins} wins!`;
        (document.getElementById("giftCoins") as HTMLInputElement).value = "0";
        (document.getElementById("giftWins")  as HTMLInputElement).value = "0";
        setTimeout(() => { fb.textContent = ""; }, 3000);
      }).catch(() => {
        fb.style.color = "#ff8888";
        fb.textContent = "❌ Failed to send gift.";
      });
    });

    // Give All
    document.getElementById("giftAllBtn")!.addEventListener("click", () => {
      const coins = parseInt((document.getElementById("giftCoins") as HTMLInputElement).value, 10) || 0;
      const wins  = parseInt((document.getElementById("giftWins")  as HTMLInputElement).value, 10) || 0;
      const fb    = document.getElementById("giftFeedback")!;
      if (coins === 0 && wins === 0) { fb.style.color = "#ff8888"; fb.textContent = "❌ Enter at least 1 coin or 1 win."; setTimeout(() => { fb.textContent = ""; }, 2500); return; }
      const accounts = game.getAllAccounts();
      if (!accounts.length) { fb.style.color = "#ff8888"; fb.textContent = "❌ No accounts found."; setTimeout(() => { fb.textContent = ""; }, 2500); return; }
      Promise.all(accounts.map(acc =>
        fetch(SB_GIFTS, {
          method: "POST",
          headers: { ...H, "Prefer": "return=minimal" },
          body: JSON.stringify({ account_id: acc.id, coins, wins, claimed: false, sent_at: Date.now() }),
        })
      )).then(() => {
        fb.style.color = "#80ff80";
        fb.textContent = `✓ Gifted 🪙${coins.toLocaleString()} + 🏆${wins} wins to all ${accounts.length} players!`;
        setTimeout(() => { fb.textContent = ""; }, 4000);
      }).catch(() => {
        fb.style.color = "#ff8888";
        fb.textContent = "❌ Some gifts failed to send.";
      });
    });

    // Party Mode toggle
    document.getElementById("partyToggleBtn")!.addEventListener("click", () => {
      if (game.partyMode) game.disablePartyMode(); else game.enablePartyMode();
      const btn = document.getElementById("partyToggleBtn")!;
      btn.textContent = game.partyMode ? "🎊 ON — Click to Stop" : "🎉 Start Party!";
      btn.style.background = game.partyMode ? "rgba(255,80,180,0.4)" : "rgba(255,255,255,0.08)";
      btn.style.color = game.partyMode ? "#ffaaee" : "rgba(255,255,255,0.7)";
      btn.style.borderColor = game.partyMode ? "rgba(255,80,180,0.7)" : "rgba(255,255,255,0.2)";
    });

    // Update alert buttons
    const SB = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/update_alerts";
    document.querySelectorAll("#alertTimeBtns button").forEach(b => {
      b.addEventListener("click", () => {
        const secs = parseInt((b as HTMLElement).dataset.secs ?? "60");
        const msg = (document.getElementById("alertMsg") as HTMLInputElement).value.trim() || "Update incoming!";
        const target = new Date(Date.now() + secs * 1000).toISOString();
        fetch(SB, { method: "POST", headers: H, body: JSON.stringify({ id: 1, target_time: target, message: msg }) })
          .then(() => {
            const fb = document.getElementById("alertFeedback")!;
            fb.textContent = `✓ Alert sent! Players will see a countdown.`;
            setTimeout(() => { fb.textContent = ""; }, 3000);
          }).catch(() => {
            document.getElementById("alertFeedback")!.textContent = "❌ Failed to send.";
          });
      });
    });
  }
}
