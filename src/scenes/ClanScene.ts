import type { Game } from "../game/Game";

const SB = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/clan_applications";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const SB_H = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const DOC_URL = ""; // will be filled in when the doc is ready

export class ClanScene {
  constructor(game: Game) {
    const ui = game.ui;
    ui.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;overflow-y:auto;background:linear-gradient(160deg,#0a0a1a,#1a0a2e);" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px 80px;";

    wrap.innerHTML = `
      <div style="font-size:48px;margin-bottom:10px;">🔍</div>
      <div style="color:white;font-size:26px;font-weight:900;margin-bottom:6px;text-align:center;">
        Creators Expose Clan
      </div>
      <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-bottom:24px;text-align:center;max-width:360px;">
        A clan dedicated to exposing hackers in GD and beyond. Join us if you've got the eyes for it.
      </div>

      ${DOC_URL ? `
      <a href="${DOC_URL}" target="_blank" style="
        background:rgba(255,255,255,0.08);color:#7dd3fc;font-size:15px;font-weight:bold;
        padding:10px 24px;border-radius:20px;border:1.5px solid rgba(100,180,255,0.4);
        text-decoration:none;margin-bottom:24px;display:inline-block;">
        📄 View Expose Doc
      </a>` : `
      <div style="color:rgba(255,255,255,0.3);font-size:13px;margin-bottom:24px;
        background:rgba(255,255,255,0.05);border-radius:12px;padding:8px 20px;">
        📄 Expose doc coming soon...
      </div>`}

      <div style="width:100%;max-width:400px;background:rgba(255,255,255,0.05);
        border:1.5px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;margin-bottom:16px;">
        <div style="color:white;font-size:16px;font-weight:bold;margin-bottom:12px;">Apply to Join</div>
        <textarea id="reasonInput" placeholder="Why do you want to join? (optional)"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:white;
          font-size:14px;padding:10px;resize:none;height:80px;outline:none;font-family:Arial,sans-serif;"></textarea>
        <button id="applyBtn" style="margin-top:10px;width:100%;background:linear-gradient(135deg,#6a20a0,#3a106f);
          color:white;font-size:16px;font-weight:bold;padding:12px;border-radius:12px;
          border:2px solid rgba(180,100,255,0.4);cursor:pointer;">
          ✅ Apply to Join
        </button>
        <div id="applyMsg" style="margin-top:8px;font-size:13px;text-align:center;min-height:16px;"></div>
      </div>

      <button id="backBtn" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);
        font-size:14px;padding:10px 28px;border-radius:20px;
        border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
        ← Back
      </button>
    `;

    ui.appendChild(wrap);

    document.getElementById("backBtn")!.onclick = () => game.goTitle();

    const applyBtn = document.getElementById("applyBtn") as HTMLButtonElement;
    const applyMsg = document.getElementById("applyMsg")!;
    const reasonInput = document.getElementById("reasonInput") as HTMLTextAreaElement;

    // Check if already applied
    const accountId = game.currentAccountId;
    fetch(`${SB}?account_id=eq.${encodeURIComponent(accountId)}&select=status`, { headers: SB_H })
      .then(r => r.json())
      .then((rows: { status: string }[]) => {
        if (rows.length > 0) {
          const status = rows[0].status;
          if (status === "accepted") {
            applyBtn.textContent = "✅ You're in the clan!";
            applyBtn.style.background = "linear-gradient(135deg,#1a6b00,#4caf50)";
            applyBtn.disabled = true;
          } else if (status === "pending") {
            applyBtn.textContent = "⏳ Application pending...";
            applyBtn.disabled = true;
          } else if (status === "rejected") {
            applyMsg.style.color = "#ff6060";
            applyMsg.textContent = "Your application was not accepted.";
            applyBtn.disabled = true;
            applyBtn.style.opacity = "0.5";
          }
        }
      }).catch(() => {});

    applyBtn.onclick = () => {
      if (!game.isLoggedIn) {
        applyMsg.style.color = "#ff6060";
        applyMsg.textContent = "You need to be logged in to apply!";
        return;
      }
      applyBtn.disabled = true;
      applyBtn.textContent = "Sending...";
      fetch(SB, {
        method: "POST",
        headers: { ...SB_H, "Prefer": "resolution=ignore-duplicates" },
        body: JSON.stringify({
          username: game.state.username,
          account_id: accountId,
          reason: reasonInput.value.trim() || null,
          status: "pending",
          applied_at: Date.now(),
        }),
      }).then(r => {
        if (r.ok || r.status === 201) {
          applyBtn.textContent = "⏳ Application pending...";
          applyMsg.style.color = "#80ff80";
          applyMsg.textContent = "Applied! Wait for the owner to accept you.";
        } else {
          applyBtn.disabled = false;
          applyBtn.textContent = "✅ Apply to Join";
          applyMsg.style.color = "#ff6060";
          applyMsg.textContent = "Something went wrong, try again.";
        }
      }).catch(() => {
        applyBtn.disabled = false;
        applyBtn.textContent = "✅ Apply to Join";
        applyMsg.style.color = "#ff6060";
        applyMsg.textContent = "Connection error, try again.";
      });
    };
  }
}
