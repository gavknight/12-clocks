import type { Game } from "../game/Game";
import { LEVELS, unlockCost } from "../game/levelData";
import { IS_BEDROCK } from "../bedrock";

export class LevelSelect {
  constructor(game: Game) {
    this._build(game);
    game._disposeScene = () => { game.ui.innerHTML = ""; };
  }

  private _build(game: Game): void {
    game.ui.innerHTML = `
      <div class="screen" style="
        background:linear-gradient(160deg,#0a0020,#1a0850,#2a1460);
        flex-direction:column;gap:0;overflow-y:auto;
        justify-content:flex-start;padding:16px 12px 24px;
      ">
        <!-- Stars -->
        ${Array.from({length:8},(_,i)=>`<div style="position:fixed;
          left:${[5,20,40,60,80,90,30,70][i]}%;top:${[3,8,2,5,2,9,14,11][i]}%;
          width:3px;height:3px;border-radius:50%;background:white;
          opacity:${0.2+i*0.04};pointer-events:none;"></div>`).join("")}

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;
          width:100%;max-width:480px;margin-bottom:14px;flex-shrink:0;">
          <button id="backBtn" style="
            background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
            font-size:14px;padding:7px 14px;border-radius:12px;
            border:1px solid rgba(255,255,255,0.2);cursor:pointer;
            font-family:Arial,sans-serif;">← Back</button>
          <h2 style="color:white;font-size:24px;margin:0;">🗺️ Choose Level</h2>
          <div style="
            background:rgba(255,200,0,0.15);border:2px solid rgba(255,200,0,0.5);
            border-radius:14px;padding:6px 14px;display:flex;align-items:center;gap:6px;">
            <span style="font-size:18px;">🪙</span>
            <span id="coinCount" style="color:#FFD700;font-size:16px;font-weight:bold;">
              ${game.state.coins}
            </span>
          </div>
        </div>

        <!-- Level grid -->
        <div id="levelGrid" style="
          display:grid;grid-template-columns:repeat(4,1fr);
          gap:8px;width:100%;max-width:480px;
        "></div>

        <!-- Difficulty popup (hidden) -->
        <div id="diffPopup" style="
          display:none;position:fixed;inset:0;
          background:rgba(0,0,0,0.75);z-index:500;
          align-items:center;justify-content:center;
        ">
          <div style="
            background:#1a0850;border:3px solid rgba(255,200,0,0.6);
            border-radius:20px;padding:24px 28px;max-width:320px;width:90%;
            display:flex;flex-direction:column;gap:12px;align-items:center;
          ">
            <div id="diffTitle" style="color:white;font-size:20px;font-weight:bold;text-align:center;"></div>
            <div style="color:rgba(255,255,255,0.55);font-size:13px;">Choose difficulty</div>
            <button class="diffBtn" data-diff="4"  style="${this._diffStyle("#4CAF50")}">😊 Easy   <span style="font-size:12px;opacity:0.7">(4 puzzles)</span></button>
            <button class="diffBtn" data-diff="8"  style="${this._diffStyle("#4D96FF")}">😎 Normal <span style="font-size:12px;opacity:0.7">(8 puzzles)</span></button>
            ${IS_BEDROCK
              ? `<button disabled style="${this._diffStyle("#888888")}opacity:0.4;cursor:not-allowed;">
                  🔒 Hard <span style="font-size:12px;opacity:0.7"> — Real Version Required</span>
                </button>`
              : `<button class="diffBtn" data-diff="12" style="${this._diffStyle("#FF5555")}">😤 Hard   <span style="font-size:12px;opacity:0.7">(all 12)</span></button>`
            }
            <button id="diffClose" style="
              background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);
              font-size:13px;padding:6px 18px;border-radius:10px;
              border:1px solid rgba(255,255,255,0.2);cursor:pointer;
              font-family:Arial,sans-serif;margin-top:4px;">Cancel</button>
          </div>
        </div>
      </div>
    `;

    this._renderGrid(game);

    document.getElementById("backBtn")!.onclick = () => game.goTitle();

    // Difficulty popup
    const popup    = document.getElementById("diffPopup")!;
    const diffTitle = document.getElementById("diffTitle")!;
    let selectedLevel = 1;

    const openDiff = (n: number) => {
      selectedLevel = n;
      const th = LEVELS[n - 1];
      diffTitle.textContent = `${th.emoji} ${th.name}`;
      popup.style.display = "flex";
    };

    document.getElementById("diffClose")!.onclick = () => { popup.style.display = "none"; };
    popup.onclick = (e) => { if (e.target === popup) popup.style.display = "none"; };

    document.querySelectorAll<HTMLElement>(".diffBtn").forEach(btn => {
      btn.onclick = () => {
        popup.style.display = "none";
        const diff = parseInt(btn.dataset["diff"]!);
        if (diff === 4) import("../scenes/Tutorial").then(({advanceTutorial})=>advanceTutorial("easy"));
        game.goLevel(selectedLevel, diff);
      };
    });

    // Level tile clicks
    document.getElementById("levelGrid")!.addEventListener("click", e => {
      const tile = (e.target as HTMLElement).closest<HTMLElement>("[data-level]");
      if (!tile) return;
      const n = parseInt(tile.dataset["level"]!);
      const cost = unlockCost(n);

      if (game.isLevelUnlocked(n)) {
        openDiff(n);
      } else if (game.state.coins >= cost) {
        // Confirm unlock
        if (confirm(`Unlock ${LEVELS[n-1].emoji} ${LEVELS[n-1].name} for ${cost} 🪙?`)) {
          game.unlockLevel(n);
          document.getElementById("coinCount")!.textContent = String(game.state.coins);
          this._renderGrid(game);
          openDiff(n);
        }
      } else {
        alert(`You need ${cost} 🪙 to unlock this level. You have ${game.state.coins} 🪙.`);
      }
    });
  }

  private _renderGrid(game: Game): void {
    const grid = document.getElementById("levelGrid");
    if (!grid) return;
    grid.innerHTML = LEVELS.map((th, i) => {
      const n = i + 1;
      const unlocked  = game.isLevelUnlocked(n);
      const completed = game.isLevelCompleted(n);
      const cost      = unlockCost(n);
      const canAfford = game.state.coins >= cost;

      let border = "rgba(255,255,255,0.15)";
      let bg     = "rgba(255,255,255,0.05)";
      let badge  = "";

      if (unlocked && completed) {
        border = "rgba(255,215,0,0.7)";
        bg     = "rgba(255,215,0,0.08)";
        badge  = `<div style="position:absolute;top:4px;right:4px;font-size:12px;">✅</div>`;
      } else if (unlocked) {
        border = "rgba(255,255,255,0.4)";
        bg     = "rgba(255,255,255,0.08)";
      }

      const lockBadge = !unlocked ? `
        <div style="position:absolute;bottom:4px;left:0;right:0;text-align:center;
          font-size:10px;color:${canAfford ? "#FFD700" : "#ff6666"};">
          🔒 ${cost}🪙
        </div>` : "";

      return `
        <div data-level="${n}" style="
          position:relative;
          background:${bg};border:2px solid ${border};border-radius:14px;
          padding:10px 4px 18px;display:flex;flex-direction:column;
          align-items:center;gap:4px;cursor:pointer;
          opacity:${!unlocked && !canAfford ? 0.5 : 1};
          transition:transform 0.12s;
        "
        onmouseenter="this.style.transform='scale(1.06)'"
        onmouseleave="this.style.transform=''">
          ${badge}
          <div style="font-size:26px;">${th.emoji}</div>
          <div style="color:white;font-size:9px;font-weight:bold;text-align:center;
            line-height:1.2;max-width:100%;overflow:hidden;word-break:break-word;">
            ${th.name}
          </div>
          <div style="color:rgba(255,255,255,0.35);font-size:9px;">#${n}</div>
          ${lockBadge}
        </div>`;
    }).join("");
  }

  private _diffStyle(color: string): string {
    return `background:rgba(0,0,0,0.3);color:white;font-size:16px;font-weight:bold;
      padding:11px 24px;border-radius:12px;border:2px solid ${color};cursor:pointer;
      font-family:Arial,sans-serif;width:100%;text-align:left;`;
  }
}
