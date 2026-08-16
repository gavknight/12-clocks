import type { Game } from "../game/Game";
import { OHIO_TIERS, OHIO_MODIFIERS } from "../game/ohio";

export class OhioScene {
  constructor(game: Game) {
    game._disposeScene = () => { game.ui.innerHTML = ""; };
    this._build(game);
  }

  private _build(game: Game): void {
    const on = game.ohioMode;

    game.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#1a0028,#3d0a5a,#12001e);
        flex-direction:column;overflow-y:auto;justify-content:flex-start;padding:24px 14px 44px;">

        <div style="font-size:44px;">🌀</div>
        <h2 style="color:#e0a0ff;font-size:28px;margin:2px 0 2px;
          text-shadow:0 0 20px rgba(200,100,255,0.6);">OHIO MODE</h2>
        <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0 0 4px;text-align:center;">
          Every room rolls its own difficulty — and its own rules
        </p>
        <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0 0 18px;text-align:center;">
          The puzzle stays 12 numbers. What changes is the room.
        </p>

        <div style="width:100%;max-width:480px;display:flex;flex-direction:column;gap:14px;">

          <button id="ohioToggle" style="
            background:${on ? "linear-gradient(135deg,#8a1a9a,#c040e0)" : "rgba(255,255,255,0.07)"};
            color:${on ? "white" : "rgba(255,255,255,0.6)"};
            border:2px solid ${on ? "rgba(220,120,255,0.8)" : "rgba(255,255,255,0.18)"};
            border-radius:16px;padding:16px;font-size:18px;font-weight:900;
            cursor:pointer;font-family:'Arial Black',Arial;">
            ${on ? "🌀 OHIO MODE IS ON" : "OHIO MODE IS OFF"}
          </button>
          <div style="color:rgba(255,255,255,0.35);font-size:11px;text-align:center;margin-top:-6px;">
            ${on ? "Tap to switch back to the normal game" : "Tap to embrace the chaos"}
          </div>

          <div style="background:rgba(0,0,0,0.32);border:1px solid rgba(255,255,255,0.12);
            border-radius:14px;padding:14px;">
            <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:1px;
              text-transform:uppercase;margin-bottom:9px;">The roll — every single room</div>
            <div style="display:flex;flex-direction:column;gap:7px;">
              ${OHIO_TIERS.map(t => `
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:19px;width:26px;text-align:center;">${t.emoji}</span>
                  <span style="color:${t.color};font-size:13px;font-weight:bold;flex:1;">${t.name}</span>
                  <span style="color:rgba(255,255,255,0.4);font-size:11px;">
                    ${t.mods === 0 ? "no rules" : `${t.mods} rule${t.mods === 1 ? "" : "s"}`}</span>
                  <span style="color:#FFD700;font-size:12px;font-weight:bold;min-width:42px;
                    text-align:right;">${t.bonus}× 🪙</span>
                </div>`).join("")}
            </div>
          </div>

          <div style="background:rgba(0,0,0,0.32);border:1px solid rgba(255,255,255,0.12);
            border-radius:14px;padding:14px;">
            <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:1px;
              text-transform:uppercase;margin-bottom:9px;">
              ${OHIO_MODIFIERS.length} possible rules</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:7px;">
              ${OHIO_MODIFIERS.map(m => `
                <div style="background:rgba(255,255,255,0.05);border-radius:9px;padding:7px 9px;">
                  <div style="color:white;font-size:12px;font-weight:bold;">${m.emoji} ${m.name}</div>
                  <div style="color:rgba(255,255,255,0.38);font-size:10px;">${m.desc}</div>
                </div>`).join("")}
            </div>
          </div>

          <div style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;line-height:1.6;">
            ☠️ NEARLY IMPOSSIBLE stacks 6 rules at once and pays <b style="color:#FFD700;">50× coins</b>.<br>
            It lands about 1 room in 20.
          </div>

          <button id="ohioBack" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);
            font-size:14px;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);
            cursor:pointer;">← Back</button>
        </div>
      </div>`;

    document.getElementById("ohioToggle")!.onclick = () => {
      game.ohioMode = !game.ohioMode;
      if (!game.ohioMode) game.ohioRoll = null;
      this._build(game); // re-render so the button reflects the new state
    };
    document.getElementById("ohioBack")!.onclick = () => game.goTitle();
  }
}
