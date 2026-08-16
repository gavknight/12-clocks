import type { Game } from "../game/Game";
import {
  fetchLevels, parseTheme, difficultyOf, bumpPlays, deleteLevel,
  type ClockLevel,
} from "../game/clockLevels";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ago(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export class CommunityLevels {
  private _g: Game;
  private _levels: ClockLevel[] = [];

  constructor(game: Game) {
    this._g = game;
    game._disposeScene = () => { game.ui.innerHTML = ""; };
    this._loading();
    fetchLevels().then(levels => { this._levels = levels; this._render(); });
  }

  private _loading(): void {
    this._g.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#12002e,#241055,#0d0128);
        flex-direction:column;gap:14px;">
        <div style="font-size:40px;">🌍</div>
        <div style="color:rgba(255,255,255,0.6);font-size:16px;">Loading community levels…</div>
      </div>`;
  }

  private _render(): void {
    const g = this._g;
    const isAdmin = g.hasHacks;

    const cards = this._levels.length === 0
      ? `<div style="color:rgba(255,255,255,0.4);font-size:15px;text-align:center;padding:26px;">
           No levels published yet.<br>
           <span style="font-size:13px;">Be the first — open the Level Builder!</span>
         </div>`
      : this._levels.map(lvl => {
          const d = difficultyOf(lvl);
          const badge = d
            ? `<span style="background:${d.color}22;color:${d.color};border:1px solid ${d.color}66;
                 border-radius:20px;padding:3px 10px;font-size:11px;font-weight:bold;white-space:nowrap;">
                 ${d.emoji} ${d.name}</span>`
            : `<span style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4);
                 border:1px solid rgba(255,255,255,0.14);border-radius:20px;padding:3px 10px;
                 font-size:11px;white-space:nowrap;">Unrated</span>`;
          return `
            <div style="background:rgba(0,0,0,0.34);border:1px solid ${lvl.featured
                ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.12)"};
              border-radius:14px;padding:13px 15px;display:flex;align-items:center;gap:13px;">
              <div style="font-size:29px;line-height:1;">${lvl.emoji}</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
                  <span style="color:white;font-size:16px;font-weight:bold;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(lvl.name)}</span>
                  ${lvl.featured ? `<span style="color:#FFD700;font-size:12px;">⭐ Featured</span>` : ""}
                </div>
                <div style="color:rgba(255,255,255,0.42);font-size:11px;margin-top:2px;">
                  by ${esc(lvl.author_name)} · ${ago(lvl.created_at)} · ▶ ${lvl.plays}
                </div>
                <div style="margin-top:6px;">${badge}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:5px;">
                <button class="clPlay" data-id="${lvl.id}" style="background:rgba(160,100,255,0.28);
                  color:#c9a6ff;font-size:13px;font-weight:bold;border:1px solid rgba(160,100,255,0.5);
                  border-radius:9px;padding:8px 15px;cursor:pointer;white-space:nowrap;">▶ Play</button>
                ${isAdmin ? `<button class="clDel" data-id="${lvl.id}"
                  style="background:rgba(255,80,80,0.16);color:#ff8888;font-size:11px;
                  border:1px solid rgba(255,80,80,0.35);border-radius:9px;padding:5px;
                  cursor:pointer;">Delete</button>` : ""}
              </div>
            </div>`;
        }).join("");

    g.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#12002e,#241055,#0d0128);
        flex-direction:column;overflow-y:auto;justify-content:flex-start;padding:24px 14px 44px;">
        <div style="font-size:38px;">🌍</div>
        <h2 style="color:#c9a6ff;font-size:27px;margin:2px 0 2px;
          text-shadow:0 0 16px rgba(160,100,255,0.5);">Community Levels</h2>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 18px;">
          Rooms built by players — featured levels first
        </p>

        <div style="width:100%;max-width:520px;display:flex;flex-direction:column;gap:9px;">
          ${cards}

          <button id="clBuild" style="margin-top:8px;background:rgba(160,100,255,0.2);
            color:#c9a6ff;font-size:15px;font-weight:bold;border:2px solid rgba(160,100,255,0.45);
            border-radius:12px;padding:13px;cursor:pointer;">🛠️ Build Your Own</button>

          <button id="clBack" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.55);
            font-size:13px;padding:10px;border-radius:11px;border:1px solid rgba(255,255,255,0.16);
            cursor:pointer;">← Back</button>
        </div>
      </div>`;

    document.querySelectorAll<HTMLButtonElement>(".clPlay").forEach(btn => {
      btn.onclick = () => {
        const lvl = this._levels.find(l => l.id === btn.dataset.id);
        if (!lvl) return;
        const theme = parseTheme(lvl);
        if (!theme) { btn.textContent = "Broken"; return; }
        bumpPlays(lvl.id, lvl.plays); // fire-and-forget
        g.playCommunityLevel(theme, lvl.name);
      };
    });

    document.querySelectorAll<HTMLButtonElement>(".clDel").forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id!;
        const lvl = this._levels.find(l => l.id === id);
        if (!confirm(`Delete "${lvl?.name ?? id}" for everyone? This cannot be undone.`)) return;
        deleteLevel(id).then(ok => {
          if (!ok) { btn.textContent = "Failed"; return; }
          this._levels = this._levels.filter(l => l.id !== id);
          this._render();
        });
      };
    });

    document.getElementById("clBuild")!.onclick = () => g.goLevelBuilder();
    document.getElementById("clBack")!.onclick  = () => g.goArcade();
  }
}
