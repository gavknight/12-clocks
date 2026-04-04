const SB = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/rule_reports";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const H = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };

// ── TEST rules — easy to break on purpose so you can verify notifications ──
export const RULES: { id: number; text: string }[] = [
  { id: 1, text: "🧪 TEST: Always say hi before playing" },
  { id: 2, text: "🧪 TEST: Never leave without earning coins" },
  { id: 3, text: "🧪 TEST: Don't open the rules more than once" },
];

export async function sendReport(reporter: string, rule: { id: number; text: string }): Promise<void> {
  await fetch(SB, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ reporter, rule_id: rule.id, rule_text: rule.text }),
  });
}

export function rulesHTML(username: string): string {
  return `
    <div style="color:white;font-size:15px;font-weight:bold;margin-bottom:10px;
      font-family:'Arial Black',Arial,sans-serif;">📋 Server Rules</div>
    <div style="color:rgba(255,200,0,0.7);font-size:11px;margin-bottom:10px;
      font-family:Arial,sans-serif;">Break a rule? Hit 🚩 to report the player.</div>
    ${RULES.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;
        margin-bottom:8px;padding:8px 10px;border-radius:10px;
        background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);">
        <span style="color:rgba(255,255,255,0.85);font-size:12px;font-family:Arial,sans-serif;flex:1;">
          ${r.text}
        </span>
        <button data-ruleid="${r.id}" style="
          background:rgba(255,60,60,0.2);border:1px solid rgba(255,80,80,0.5);
          color:#ff8888;font-size:12px;padding:4px 10px;border-radius:8px;
          cursor:pointer;white-space:nowrap;font-family:Arial,sans-serif;flex-shrink:0;">
          🚩 Report
        </button>
      </div>
    `).join("")}
    <div id="reportFeedback" style="color:#80ff80;font-size:11px;min-height:14px;
      font-family:Arial,sans-serif;margin-top:2px;"></div>
  `;
}

export function bindReportButtons(username: string): void {
  document.querySelectorAll<HTMLElement>("[data-ruleid]").forEach(btn => {
    btn.onclick = async () => {
      const id = parseInt(btn.dataset.ruleid!);
      const rule = RULES.find(r => r.id === id);
      if (!rule) return;
      btn.textContent = "…";
      btn.style.pointerEvents = "none";
      try {
        await sendReport(username || "anonymous", rule);
        btn.textContent = "✓ Sent";
        btn.style.color = "#80ff80";
        const fb = document.getElementById("reportFeedback");
        if (fb) fb.textContent = "Report sent!";
        setTimeout(() => { if (fb) fb.textContent = ""; }, 3000);
      } catch {
        btn.textContent = "❌";
      }
    };
  });
}
