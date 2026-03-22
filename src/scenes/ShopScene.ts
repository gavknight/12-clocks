import type { Game } from "../game/Game";
import { PETS } from "../game/Game";

export class ShopScene {
  constructor(game: Game) {
    game._disposeScene = () => { game.ui.innerHTML = ""; };
    this._build(game);
  }

  private _build(game: Game): void {
    const render = () => {
      const cards = PETS.map(pet => {
        const owned   = game.state.pets.includes(pet.id);
        const canAfford = game.state.coins >= pet.cost;
        const btnId   = `shopBtn_${pet.id}`;

        return `
          <div style="
            background:${owned ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.05)"};
            border:2px solid ${owned ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.1)"};
            border-radius:18px;padding:18px 16px;
            display:flex;flex-direction:column;align-items:center;gap:8px;
          ">
            <div style="font-size:48px;">${pet.emoji}</div>
            <div style="color:white;font-size:17px;font-weight:bold;">${pet.name}</div>
            <div style="color:rgba(255,255,255,0.5);font-size:12px;text-align:center;">
              Solves a puzzle every<br>
              <strong style="color:#FFD700;">${pet.interval / 1000}s</strong>
              → <strong style="color:#FFD700;">🪙 ${pet.reward.toLocaleString()}</strong>
            </div>

            ${owned
              ? `<div style="
                  color:#FFD700;font-size:13px;font-weight:bold;
                  background:rgba(255,215,0,0.15);padding:6px 16px;border-radius:20px;
                  border:1px solid rgba(255,215,0,0.3);margin-top:4px;
                ">✓ Owned</div>`
              : `<button id="${btnId}" style="
                  background:${canAfford ? "#FFD700" : "rgba(255,255,255,0.1)"};
                  color:${canAfford ? "#1a0060" : "rgba(255,255,255,0.35)"};
                  font-size:13px;font-weight:bold;padding:8px 18px;
                  border-radius:20px;border:none;cursor:${canAfford ? "pointer" : "default"};
                  font-family:Arial,sans-serif;margin-top:4px;
                ">
                  🪙 ${pet.cost.toLocaleString()}
                </button>`
            }
          </div>`;
      }).join("");

      game.ui.innerHTML = `
        <div class="screen" style="
          background:linear-gradient(160deg,#0a001e,#1a0840,#0a1808);
          flex-direction:column;gap:0;overflow-y:auto;
          justify-content:flex-start;padding:28px 16px;
        ">
          <!-- Stars -->
          ${Array.from({length:10},(_,i)=>`<div style="position:absolute;
            left:${[5,18,30,55,70,85,92,10,42,68][i]}%;
            top:${[6,18,4,10,3,8,18,28,22,26][i]}%;
            width:3px;height:3px;border-radius:50%;background:white;
            opacity:${0.2+i*0.05};pointer-events:none;"></div>`).join("")}

          <div style="font-size:40px;margin-bottom:6px;">🛍️</div>
          <h2 style="color:#FFD700;font-size:30px;margin:0 0 4px;
            text-shadow:0 0 16px rgba(255,215,0,0.5);">
            Shop
          </h2>
          <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0 0 6px;">
            Pets earn coins automatically every 80 seconds!
          </p>

          <!-- Coin balance -->
          <div style="
            display:flex;align-items:center;gap:6px;
            background:rgba(255,200,0,0.1);border:2px solid rgba(255,200,0,0.35);
            border-radius:16px;padding:5px 16px;margin-bottom:20px;
          ">
            <span style="font-size:18px;">🪙</span>
            <span id="shopCoinCount" style="color:#FFD700;font-size:15px;font-weight:bold;">
              ${game.state.coins.toLocaleString()} coins
            </span>
          </div>

          <!-- Auto clicker -->
          <div style="
            width:100%;max-width:420px;margin-bottom:16px;
            background:${game.state.autoClicker ? "rgba(0,200,0,0.1)" : "rgba(255,255,255,0.05)"};
            border:2px solid ${game.state.autoClicker ? "rgba(0,255,0,0.4)" : "rgba(255,255,255,0.1)"};
            border-radius:18px;padding:18px 20px;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:44px;">🖱️</div>
            <div style="flex:1;">
              <div style="color:white;font-size:17px;font-weight:bold;">Auto Clicker</div>
              <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">
                Click once to turn ON · click again to turn OFF · infinite
              </div>
            </div>
            ${game.state.autoClicker
              ? `<div style="color:#00ff88;font-size:13px;font-weight:bold;
                  background:rgba(0,200,0,0.15);padding:6px 16px;border-radius:20px;
                  border:1px solid rgba(0,255,0,0.3);">✓ Owned</div>`
              : `<button id="buyAC" style="
                  background:${game.state.coins >= 10000 ? "#FFD700" : "rgba(255,255,255,0.1)"};
                  color:${game.state.coins >= 10000 ? "#1a0060" : "rgba(255,255,255,0.35)"};
                  font-size:13px;font-weight:bold;padding:8px 18px;
                  border-radius:20px;border:none;
                  cursor:${game.state.coins >= 10000 ? "pointer" : "default"};
                  font-family:Arial,sans-serif;white-space:nowrap;">
                  🪙 10,000
                </button>`
            }
          </div>

          <!-- Pet grid -->
          <div style="
            display:grid;grid-template-columns:1fr 1fr;gap:12px;
            width:100%;max-width:420px;margin-bottom:20px;
          ">
            ${cards}
          </div>

          <!-- Owned pets summary -->
          ${game.state.pets.length > 0 ? `
            <div style="
              background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.2);
              border-radius:14px;padding:12px 16px;width:100%;max-width:420px;
              margin-bottom:16px;text-align:center;
            ">
              <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:4px;">
                Owned pets
              </div>
              <div style="color:#FFD700;font-size:20px;font-weight:bold;">
                ${game.state.pets.map(id => PETS.find(p => p.id === id)?.emoji ?? "").join(" ")}
              </div>
            </div>
          ` : ""}

          <button id="shopBack" style="
            background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);
            font-size:14px;padding:9px 24px;border-radius:12px;
            border:1px solid rgba(255,255,255,0.2);cursor:pointer;font-family:Arial,sans-serif;
          ">← Back</button>
        </div>
      `;

      document.getElementById("shopBack")!.onclick = () => game.goTitle();

      const acBtn = document.getElementById("buyAC");
      if (acBtn) {
        acBtn.addEventListener("click", () => {
          if (game.state.coins < 10000) return;
          game.state.coins -= 10000;
          game.state.autoClicker = true;
          game.save();
          game.setupAutoClicker();
          render();
        });
      }

      PETS.forEach(pet => {
        if (game.state.pets.includes(pet.id)) return;
        const btn = document.getElementById(`shopBtn_${pet.id}`);
        if (!btn) return;
        btn.addEventListener("click", () => {
          if (game.state.coins < pet.cost) return;
          game.state.coins -= pet.cost;
          game.state.pets.push(pet.id);
          game.save();
          game.startPetTimer(pet.id);
          render(); // re-render with updated state
        });
      });
    };

    render();
  }
}
