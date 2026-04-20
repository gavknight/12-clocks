import type { Game } from "../game/Game";

const SB = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/clan_applications";
const SB_REPORTS = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/hacker_reports";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const SB_H = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const DOC_URL = "https://docs.google.com/document/d/190eBgCU1vhIKFyHsmHV2iO9i2Cg1lJoe68vZIKXzg88/edit?tab=t.0";

const CHEAT_TYPES = ["Noclip", "Speedhack", "Macro", "Botting", "Frame stepper", "Other"];

export class ClanScene {
  constructor(game: Game) {
    const ui = game.ui;
    ui.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;overflow-y:auto;background:linear-gradient(160deg,#0a0a1a,#1a0a2e);" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;padding:40px 20px 80px;" +
      "pointer-events:all;";

    wrap.innerHTML = `
      <div style="font-size:48px;margin-bottom:10px;">🔍</div>
      <div style="color:white;font-size:26px;font-weight:900;margin-bottom:6px;text-align:center;">
        Creators Expose Clan
      </div>
      <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-bottom:24px;text-align:center;max-width:360px;">
        A clan dedicated to exposing hackers in GD and beyond. Join us if you've got the eyes for it.
      </div>

      <a href="${DOC_URL}" target="_blank" style="
        background:rgba(255,255,255,0.08);color:#7dd3fc;font-size:15px;font-weight:bold;
        padding:10px 24px;border-radius:20px;border:1.5px solid rgba(100,180,255,0.4);
        text-decoration:none;margin-bottom:24px;display:inline-block;">
        📄 View Expose Doc
      </a>

      <!-- Join section -->
      <div id="joinSection" style="width:100%;max-width:400px;background:rgba(255,255,255,0.05);
        border:1.5px solid rgba(180,100,255,0.3);border-radius:16px;padding:20px;margin-bottom:16px;text-align:center;">
        <div style="font-size:32px;margin-bottom:10px;">🕵️</div>
        <div style="color:white;font-size:18px;font-weight:900;margin-bottom:8px;">
          Accept to expose GD hackers?
        </div>
        <div style="color:rgba(255,255,255,0.45);font-size:13px;margin-bottom:20px;">
          Join the Creators Expose Clan and help catch cheaters in Geometry Dash.
        </div>
        <div style="display:flex;gap:10px;">
          <button id="applyBtn" style="flex:1;background:linear-gradient(135deg,#1a6b00,#4caf50);
            color:white;font-size:16px;font-weight:bold;padding:14px;border-radius:12px;
            border:2px solid rgba(100,255,100,0.4);cursor:pointer;">
            ✅ Accept
          </button>
          <button id="rejectBtn" style="flex:1;background:rgba(255,255,255,0.07);
            color:rgba(255,255,255,0.5);font-size:16px;font-weight:bold;padding:14px;border-radius:12px;
            border:2px solid rgba(255,255,255,0.15);cursor:pointer;">
            ❌ Reject
          </button>
        </div>
        <div id="applyMsg" style="margin-top:10px;font-size:13px;text-align:center;min-height:16px;"></div>
      </div>

      <!-- Report a hacker (hidden until accepted) -->
      <div id="reportSection" style="display:none;width:100%;max-width:400px;background:rgba(255,50,50,0.05);
        border:1.5px solid rgba(255,80,80,0.3);border-radius:16px;padding:20px;margin-bottom:16px;">
        <div style="color:white;font-size:18px;font-weight:900;margin-bottom:16px;text-align:center;">
          🚨 Report a Hacker
        </div>
        <input id="hackerName" type="text" placeholder="GD player name" maxlength="50"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:white;
          font-size:14px;padding:10px;outline:none;font-family:Arial,sans-serif;margin-bottom:10px;"/>
        <input id="hackerLevel" type="text" placeholder="Level name (optional)" maxlength="50"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:white;
          font-size:14px;padding:10px;outline:none;font-family:Arial,sans-serif;margin-bottom:10px;"/>
        <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:6px;">Cheat type:</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
          ${CHEAT_TYPES.map(c => `
            <button class="cheatBtn" data-cheat="${c}" style="
              background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.7);font-size:13px;
              padding:6px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
              ${c}
            </button>`).join("")}
        </div>
        <textarea id="hackerDetails" placeholder="Extra details (optional)" maxlength="200"
          style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.08);
          border:1px solid rgba(255,255,255,0.2);border-radius:10px;color:white;
          font-size:14px;padding:10px;resize:none;height:70px;outline:none;font-family:Arial,sans-serif;margin-bottom:10px;"></textarea>
        <button id="submitReportBtn" style="width:100%;background:linear-gradient(135deg,#7a0000,#e63946);
          color:white;font-size:16px;font-weight:bold;padding:12px;border-radius:12px;
          border:2px solid rgba(255,80,80,0.4);cursor:pointer;">
          🚨 Submit Report
        </button>
        <div id="reportMsg" style="margin-top:8px;font-size:13px;text-align:center;min-height:16px;"></div>
      </div>

      <button id="backBtn" style="background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);
        font-size:14px;padding:10px 28px;border-radius:20px;
        border:1px solid rgba(255,255,255,0.15);cursor:pointer;">
        ← Back
      </button>
    `;

    ui.appendChild(wrap);

    document.getElementById("backBtn")!.onclick = () => game.goTitle();

    const applyBtn    = document.getElementById("applyBtn") as HTMLButtonElement;
    const rejectBtn   = document.getElementById("rejectBtn") as HTMLButtonElement;
    const applyMsg    = document.getElementById("applyMsg")!;
    const joinSection = document.getElementById("joinSection")!;
    const reportSection = document.getElementById("reportSection")!;
    const accountId   = game.currentAccountId;

    const showReportSection = () => { reportSection.style.display = "block"; };

    // Check if already in clan
    fetch(`${SB}?account_id=eq.${encodeURIComponent(accountId)}&select=status`, { headers: SB_H })
      .then(r => r.json())
      .then((rows: { status: string }[]) => {
        if (rows.length > 0) {
          const status = rows[0].status;
          if (status === "accepted") {
            applyBtn.textContent = "✅ You're in the clan!";
            applyBtn.disabled = true;
            rejectBtn.style.display = "none";
            showReportSection();
          } else if (status === "pending") {
            applyBtn.textContent = "⏳ Pending...";
            applyBtn.disabled = true;
            rejectBtn.style.display = "none";
            applyMsg.style.color = "rgba(255,255,255,0.4)";
            applyMsg.textContent = "Waiting for the owner to accept you.";
          } else if (status === "rejected") {
            applyBtn.disabled = true;
            applyBtn.style.opacity = "0.4";
            rejectBtn.style.display = "none";
            applyMsg.style.color = "#ff6060";
            applyMsg.textContent = "Your application was not accepted.";
          }
        }
      }).catch(() => {});

    applyBtn.onclick = () => {
      if (!game.isLoggedIn) {
        applyMsg.style.color = "#ff6060";
        applyMsg.textContent = "You need to be logged in!";
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
          status: "pending",
          applied_at: Date.now(),
        }),
      }).then(r => {
        if (r.ok || r.status === 201) {
          applyBtn.textContent = "⏳ Pending...";
          rejectBtn.style.display = "none";
          applyMsg.style.color = "#80ff80";
          applyMsg.textContent = "Applied! Waiting for the owner to accept you.";
        } else {
          applyBtn.disabled = false;
          applyBtn.textContent = "✅ Accept";
          applyMsg.style.color = "#ff6060";
          applyMsg.textContent = "Something went wrong, try again.";
        }
      }).catch(() => {
        applyBtn.disabled = false;
        applyBtn.textContent = "✅ Accept";
        applyMsg.style.color = "#ff6060";
        applyMsg.textContent = "Connection error, try again.";
      });
    };

    rejectBtn.onclick = () => game.goTitle();

    // Cheat type selector
    let selectedCheat = "";
    wrap.querySelectorAll(".cheatBtn").forEach(btn => {
      (btn as HTMLElement).onclick = () => {
        selectedCheat = (btn as HTMLElement).dataset.cheat ?? "";
        wrap.querySelectorAll(".cheatBtn").forEach(b => {
          (b as HTMLElement).style.background = "rgba(255,255,255,0.07)";
          (b as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
          (b as HTMLElement).style.color = "rgba(255,255,255,0.7)";
        });
        (btn as HTMLElement).style.background = "rgba(255,80,80,0.25)";
        (btn as HTMLElement).style.borderColor = "rgba(255,80,80,0.5)";
        (btn as HTMLElement).style.color = "white";
      };
    });

    // Submit report
    const reportMsg = document.getElementById("reportMsg")!;
    const submitBtn = document.getElementById("submitReportBtn") as HTMLButtonElement;
    submitBtn.onclick = () => {
      const name = (document.getElementById("hackerName") as HTMLInputElement).value.trim();
      const level = (document.getElementById("hackerLevel") as HTMLInputElement).value.trim();
      const details = (document.getElementById("hackerDetails") as HTMLTextAreaElement).value.trim();
      if (!name) { reportMsg.style.color = "#ff6060"; reportMsg.textContent = "Enter the hacker's name!"; return; }
      if (!selectedCheat) { reportMsg.style.color = "#ff6060"; reportMsg.textContent = "Pick a cheat type!"; return; }
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
      fetch(SB_REPORTS, {
        method: "POST",
        headers: SB_H,
        body: JSON.stringify({
          reporter: game.state.username,
          reporter_id: accountId,
          hacker_name: name,
          cheat_type: selectedCheat,
          level: level || null,
          details: details || null,
          submitted_at: Date.now(),
        }),
      }).then(r => {
        if (r.ok || r.status === 201) {
          reportMsg.style.color = "#80ff80";
          reportMsg.textContent = "✅ Report submitted!";
          submitBtn.textContent = "🚨 Submit Report";
          submitBtn.disabled = false;
          (document.getElementById("hackerName") as HTMLInputElement).value = "";
          (document.getElementById("hackerLevel") as HTMLInputElement).value = "";
          (document.getElementById("hackerDetails") as HTMLTextAreaElement).value = "";
          selectedCheat = "";
          wrap.querySelectorAll(".cheatBtn").forEach(b => {
            (b as HTMLElement).style.background = "rgba(255,255,255,0.07)";
            (b as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
            (b as HTMLElement).style.color = "rgba(255,255,255,0.7)";
          });
          setTimeout(() => { reportMsg.textContent = ""; }, 3000);
        } else {
          reportMsg.style.color = "#ff6060";
          reportMsg.textContent = "Something went wrong, try again.";
          submitBtn.disabled = false;
          submitBtn.textContent = "🚨 Submit Report";
        }
      }).catch(() => {
        reportMsg.style.color = "#ff6060";
        reportMsg.textContent = "Connection error, try again.";
        submitBtn.disabled = false;
        submitBtn.textContent = "🚨 Submit Report";
      });
    };
  }
}
