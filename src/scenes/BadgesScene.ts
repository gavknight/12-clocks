import type { Game } from "../game/Game";
import { BADGES, TIER_STYLE, isEarned, type Badge, type BadgeTier } from "../game/badges";

const TIER_ORDER: BadgeTier[] = ["bronze", "silver", "gold", "legend"];

function fmt(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.floor(n));
}

export class BadgesScene {
  private _tick = 0;

  constructor(game: Game) {
    // progress bars move as pets earn coins, so keep them live
    this._tick = window.setInterval(() => this._paint(game), 1500);
    game._disposeScene = () => { clearInterval(this._tick); game.ui.innerHTML = ""; };
    this._build(game);
  }

  private _cardHTML(b: Badge, game: Game): string {
    const earned = isEarned(b, game);
    const t = TIER_STYLE[b.tier];
    const val = b.value(game);
    const pct = Math.max(0, Math.min(100, (val / b.goal) * 100));

    // an unearned secret gives nothing away — no name, no hint, no progress
    if (b.secret && !earned) {
      return `
        <div style="background:rgba(255,255,255,0.03);border:2px dashed rgba(255,255,255,0.12);
          border-radius:16px;padding:13px 12px;display:flex;flex-direction:column;
          align-items:center;gap:5px;text-align:center;">
          <div style="font-size:34px;line-height:1;opacity:0.3;">❔</div>
          <div style="color:rgba(255,255,255,0.35);font-size:13px;font-weight:900;
            font-family:'Arial Black',Arial;">???</div>
          <div style="color:rgba(255,255,255,0.25);font-size:10px;line-height:1.35;">
            A secret badge. Somewhere in the room.</div>
        </div>`;
    }

    return `
      <div style="background:${earned ? `${t.color}1a` : "rgba(255,255,255,0.04)"};
        border:2px solid ${earned ? `${t.color}88` : "rgba(255,255,255,0.09)"};
        border-radius:16px;padding:13px 12px;display:flex;flex-direction:column;
        align-items:center;gap:5px;text-align:center;position:relative;overflow:hidden;
        ${earned ? `box-shadow:0 0 18px ${t.color}33;` : ""}">

        <div style="font-size:34px;line-height:1;${earned ? "" : "filter:grayscale(1);opacity:0.28;"}">
          ${b.emoji}
        </div>
        <div style="color:${earned ? t.color : "rgba(255,255,255,0.45)"};
          font-size:13px;font-weight:900;font-family:'Arial Black',Arial;">${b.name}</div>
        <div style="color:rgba(255,255,255,0.4);font-size:10px;line-height:1.35;">${b.desc}</div>

        ${earned
          ? `<div style="color:${t.color};font-size:9px;font-weight:bold;letter-spacing:1px;
               text-transform:uppercase;margin-top:2px;">✓ ${t.label}</div>`
          : `<div style="width:100%;margin-top:4px;">
               <div style="height:5px;background:rgba(255,255,255,0.09);border-radius:3px;overflow:hidden;">
                 <div style="height:100%;width:${pct}%;background:${t.color}99;border-radius:3px;"></div>
               </div>
               <div style="color:rgba(255,255,255,0.3);font-size:9px;margin-top:3px;">
                 ${fmt(val)} / ${fmt(b.goal)}
               </div>
             </div>`}
      </div>`;
  }

  /** Re-render just the grid + counter, so the scroll position is kept. */
  private _paint(game: Game): void {
    const grid = document.getElementById("bsGrid");
    const head = document.getElementById("bsCount");
    if (!grid) return;
    const earned = BADGES.filter(b => isEarned(b, game)).length;
    if (head) head.textContent = `${earned} / ${BADGES.length}`;
    grid.innerHTML = TIER_ORDER.map(tier => {
      const inTier = BADGES.filter(b => b.tier === tier);
      if (!inTier.length) return "";
      const t = TIER_STYLE[tier];
      return `
        <div style="grid-column:1/-1;color:${t.color};font-size:11px;font-weight:bold;
          letter-spacing:2px;text-transform:uppercase;margin-top:6px;text-align:left;">
          ${t.label} · ${inTier.filter(b => isEarned(b, game)).length}/${inTier.length}
        </div>
        ${inTier.map(b => this._cardHTML(b, game)).join("")}`;
    }).join("");
  }

  private _build(game: Game): void {
    const earned = BADGES.filter(b => isEarned(b, game)).length;

    game.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#1a0a3e,#3a106f,#12042e);
        flex-direction:column;overflow-y:auto;justify-content:flex-start;padding:24px 14px 44px;">

        <div style="font-size:38px;">🎖️</div>
        <h2 style="color:#FFD700;font-size:27px;margin:2px 0 2px;
          text-shadow:0 0 16px rgba(255,215,0,0.5);">Badges</h2>
        <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0 0 4px;">
          <span id="bsCount" style="color:#FFD700;font-weight:bold;">${earned} / ${BADGES.length}</span> earned
        </p>
        <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0 0 18px;">
          Locked badges show how close you are
        </p>

        <div id="bsGrid" style="width:100%;max-width:560px;display:grid;
          grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;"></div>

        <button id="bsBack" style="margin-top:24px;background:rgba(255,255,255,0.1);
          color:rgba(255,255,255,0.6);font-size:14px;padding:9px 24px;border-radius:12px;
          border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-family:Arial,sans-serif;">
          ← Back</button>
      </div>`;

    this._paint(game);
    document.getElementById("bsBack")!.onclick = () => game.goTitle();
  }
}
