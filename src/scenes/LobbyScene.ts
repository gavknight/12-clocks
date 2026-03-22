import type { Game } from "../game/Game";
import { MultiplayerManager } from "../multiplayer/MultiplayerManager";

export class LobbyScene {
  constructor(game: Game) {
    game.mp?.dispose();
    game.mp = null;
    this._build(game);
    game._disposeScene = () => { game.ui.innerHTML = ""; };
  }

  private _build(game: Game): void {
    const myName = game.state.username || "Player";

    game.ui.innerHTML = `
      <div class="screen" style="
        background:linear-gradient(160deg,#050015,#0d0440,#1a0860);
        flex-direction:column;gap:16px;
      ">
        ${Array.from({length:8},(_,i)=>`<div style="position:absolute;
          left:${[5,20,40,60,80,90,30,70][i]}%;top:${[8,20,6,14,4,22,30,28][i]}%;
          width:3px;height:3px;border-radius:50%;background:white;
          opacity:${0.25+i*0.05};pointer-events:none;"></div>`).join("")}

        <div style="font-size:44px;">🌐</div>
        <h2 style="color:white;font-size:28px;margin:0;">Multiplayer</h2>
        <p style="color:rgba(255,255,255,0.5);font-size:14px;margin:0;">
          Real-time cursors · Shared inventory
        </p>

        <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:10px;">

          <!-- HOST -->
          <button id="hostBtn" style="
            padding:16px;border-radius:14px;font-size:18px;font-weight:bold;
            background:linear-gradient(135deg,#6a11cb,#2575fc);color:white;
            border:none;cursor:pointer;font-family:Arial Black,Arial,sans-serif;
          ">🏠 Host a Game</button>

          <div style="text-align:center;color:rgba(255,255,255,0.3);font-size:13px;">— or join a friend —</div>

          <!-- JOIN -->
          <input id="nameInput" type="text" maxlength="20" placeholder="Friend's username..."
            style="
              padding:12px 16px;border-radius:12px;font-size:17px;
              background:rgba(255,255,255,0.12);color:white;text-align:center;
              border:2px solid rgba(255,255,255,0.25);outline:none;
              font-family:Arial,sans-serif;box-sizing:border-box;width:100%;
            " autocomplete="off" />
          <button id="joinBtn" style="
            padding:16px;border-radius:14px;font-size:18px;font-weight:bold;
            background:linear-gradient(135deg,#11998e,#38ef7d);color:#0a2a1a;
            border:none;cursor:pointer;font-family:Arial Black,Arial,sans-serif;
          ">🚀 Join Their Game</button>

          <div id="mpStatus" style="
            text-align:center;font-size:14px;padding:10px;border-radius:10px;
            background:rgba(255,255,255,0.06);display:none;color:white;
          "></div>

          <button id="backBtn" style="
            background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);
            font-size:14px;padding:9px;border-radius:12px;border:none;
            cursor:pointer;font-family:Arial,sans-serif;
          ">← Back</button>
        </div>
      </div>
    `;

    const statusEl  = document.getElementById("mpStatus")!;
    const nameInput = document.getElementById("nameInput") as HTMLInputElement;

    const showStatus = (msg: string, color = "white") => {
      statusEl.style.display = "block";
      statusEl.style.color   = color;
      statusEl.textContent   = msg;
    };

    const setLoading = (loading: boolean) => {
      (document.getElementById("hostBtn") as HTMLButtonElement).disabled = loading;
      (document.getElementById("joinBtn") as HTMLButtonElement).disabled = loading;
    };

    // ── HOST: go online then immediately into the room ────────────────────────
    document.getElementById("hostBtn")!.onclick = async () => {
      setLoading(true);
      showStatus("⏳ Going online...");
      const mp = new MultiplayerManager(myName);
      try {
        await mp.goOnline();
        game.mp = mp;
        game.goExplore(); // go straight in — friends connect while you're in the room
      } catch {
        setLoading(false);
        showStatus("❌ Couldn't go online. Check your connection.", "#ff6666");
        mp.dispose();
      }
    };

    // ── JOIN: connect then immediately into the room ──────────────────────────
    const doJoin = async () => {
      const target = nameInput.value.trim();
      if (!target) { showStatus("Type your friend's username."); return; }
      if (target.toLowerCase() === myName.toLowerCase()) {
        showStatus("That's you — host a game instead!"); return;
      }
      setLoading(true);
      showStatus(`⏳ Connecting to ${target}...`);
      const mp = new MultiplayerManager(myName);
      try {
        // Go online yourself too so they can see you
        await mp.goOnline().catch(() => {}); // best-effort
        await mp.joinPlayer(target);
        game.mp = mp;
        game.goExplore(); // go straight in — state syncs once you arrive
      } catch {
        setLoading(false);
        showStatus(`❌ Couldn't find "${target}". Are they in a game?`, "#ff6666");
        mp.dispose();
      }
    };

    document.getElementById("joinBtn")!.onclick = doJoin;
    nameInput.addEventListener("keydown", e => { if (e.key === "Enter") doJoin(); });
    document.getElementById("backBtn")!.onclick = () => {
      game.mp?.dispose();
      game.mp = null;
      game.goTitle();
    };
  }
}
