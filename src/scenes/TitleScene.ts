import type { Game } from "../game/Game";
import { IS_BEDROCK, enterBedrock, exitBedrock } from "../bedrock";

export class TitleScene {
  constructor(game: Game) {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const hasSave = game.state.unlockedLocks.size > 0 || game.state.inventory.length > 0;
    const solved  = game.state.unlockedLocks.size;
    const name    = game.state.username || "Player";

    game.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#1a0a3e,#3a106f,#6a20a0);overflow-y:auto;justify-content:flex-start;padding:40px 0 80px;">

        ${Array.from({length:12},(_,i)=>`<div style="position:absolute;
          left:${[8,15,25,40,55,70,82,90,5,35,65,88][i]}%;
          top:${[10,25,8,15,5,12,8,20,35,30,28,35][i]}%;
          width:3px;height:3px;border-radius:50%;background:white;
          opacity:${0.4+i*0.05};pointer-events:none;"></div>`).join("")}

        <!-- Vlad & Niki -->
        <div style="position:absolute;bottom:30%;left:22%;display:flex;gap:10px;align-items:flex-end;pointer-events:none;">
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:44px;height:44px;border-radius:50%;background:#FFCC99;
              border:3px solid #FF4444;display:flex;align-items:center;justify-content:center;font-size:26px;">😁</div>
            <div style="width:36px;height:42px;background:#FF4444;border-radius:6px 6px 4px 4px;margin-top:2px;"></div>
            <div style="display:flex;gap:4px;margin-top:2px;">
              <div style="width:14px;height:24px;background:#2244AA;border-radius:3px;"></div>
              <div style="width:14px;height:24px;background:#2244AA;border-radius:3px;"></div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:44px;height:44px;border-radius:50%;background:#FFCC99;
              border:3px solid #4D96FF;display:flex;align-items:center;justify-content:center;font-size:26px;">😄</div>
            <div style="width:36px;height:42px;background:#4D96FF;border-radius:6px 6px 4px 4px;margin-top:2px;"></div>
            <div style="display:flex;gap:4px;margin-top:2px;">
              <div style="width:14px;height:24px;background:#CC4488;border-radius:3px;"></div>
              <div style="width:14px;height:24px;background:#CC4488;border-radius:3px;"></div>
            </div>
          </div>
        </div>

        <!-- Title -->
        <div style="font-size:52px;margin-bottom:6px;">🕐</div>
        <h1 style="font-size:46px;color:white;text-shadow:0 0 20px rgba(255,200,0,0.6);margin-bottom:8px;">
          12 Clocks
        </h1>
        <p style="font-size:16px;color:rgba(255,255,255,0.7);margin-bottom:20px;">
          Explore the room · Find 12 puzzles · Discover the secret...
        </p>

        <!-- Coin chip -->
        <div style="
          display:flex;align-items:center;gap:6px;
          background:rgba(255,200,0,0.1);border:2px solid rgba(255,200,0,0.35);
          border-radius:16px;padding:5px 12px;margin-bottom:8px;
        ">
          <span style="font-size:18px;">🪙</span>
          <span style="color:#FFD700;font-size:15px;font-weight:bold;">${game.state.coins} coins</span>
        </div>

        <!-- Account chip -->
        <div id="nameChip" style="
          display:flex;align-items:center;gap:8px;
          background:rgba(255,255,255,0.1);border:2px solid rgba(255,255,255,0.2);
          border-radius:20px;padding:6px 14px;margin-bottom:20px;cursor:pointer;
        " title="Click to rename">
          <span style="font-size:16px;">👤</span>
          <span id="nameLabel" style="color:white;font-size:15px;font-weight:bold;">${name}</span>
          <span style="font-size:11px;color:rgba(255,255,255,0.45);">✏️</span>
        </div>

        <!-- Inline rename (hidden by default) -->
        <div id="renameBox" style="display:none;flex-direction:column;align-items:center;gap:6px;margin-bottom:16px;">
          <input id="renameInput" type="text" maxlength="20"
            value="${name.replace(/"/g, "&quot;")}"
            style="
              background:rgba(255,255,255,0.15);color:white;
              border:2px solid rgba(255,200,0,0.6);border-radius:12px;
              padding:7px 14px;font-size:15px;text-align:center;
              outline:none;width:200px;font-family:Arial,sans-serif;
            " />
          <div style="display:flex;gap:8px;">
            <button id="renameSave" style="
              background:#FFD700;color:#1a0060;font-size:13px;font-weight:bold;
              padding:6px 16px;border-radius:10px;border:2px solid #e6b800;cursor:pointer;
              font-family:Arial,sans-serif;
            ">Save name</button>
            <button id="renameCancel" style="
              background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);font-size:13px;
              padding:6px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);
              cursor:pointer;font-family:Arial,sans-serif;
            ">Cancel</button>
          </div>
        </div>

        <!-- Play button -->
        <button id="playBtn" style="
          background:#FFD700;color:#1a0060;font-size:26px;font-weight:bold;
          padding:18px 48px;border-radius:50px;border:4px solid #e6b800;
          box-shadow:0 6px 0 #b8860b;cursor:pointer;margin-bottom:14px;display:block;">
          ${isTouch ? "👆 TAP TO PLAY" : "▶ START GAME"}
        </button>

        ${hasSave ? `
          <button id="contBtn" style="
            background:rgba(255,255,255,0.15);color:white;font-size:18px;
            padding:12px 32px;border-radius:40px;
            border:2px solid rgba(255,255,255,0.4);cursor:pointer;
            display:block;margin-top:4px;">
            ▷ Continue (${solved}/12 solved)
          </button>` : ""}

        <!-- Multiplayer button (real version only) -->
        ${!IS_BEDROCK ? `<button id="mpBtn" style="
          background:linear-gradient(135deg,#6a11cb,#2575fc);color:white;font-size:18px;
          padding:12px 32px;border-radius:40px;
          border:2px solid rgba(100,150,255,0.5);cursor:pointer;
          display:block;margin-top:8px;">
          🌐 Multiplayer
        </button>` : ""}

        <!-- Mini-Games button -->
        <button id="arcadeBtn" style="
          background:linear-gradient(135deg,#1a6b00,#4caf50);color:white;font-size:18px;
          padding:12px 32px;border-radius:40px;
          border:2px solid rgba(100,255,100,0.5);cursor:pointer;
          display:block;margin-top:8px;">
          🕹️ Mini-Games
        </button>

        ${!IS_BEDROCK ? `
        <!-- World Records button (real only) -->
        <button id="lbBtn" style="
          background:linear-gradient(135deg,#b8860b,#FFD700);color:#1a0060;font-size:18px;
          padding:12px 32px;border-radius:40px;
          border:2px solid rgba(255,215,0,0.5);cursor:pointer;
          display:block;margin-top:8px;font-weight:bold;">
          🏆 World Records
        </button>` : ""}

        <!-- Shop button -->
        <button id="shopBtn" style="
          background:linear-gradient(135deg,#4a0080,#9c27b0);color:white;font-size:18px;
          padding:12px 32px;border-radius:40px;
          border:2px solid rgba(200,100,255,0.5);cursor:pointer;
          display:block;margin-top:8px;">
          🛍️ Shop
        </button>

        <!-- Version History button -->
        <button id="versionBtn" style="
          background:linear-gradient(135deg,#0a2a4a,#1a5a8a);color:white;font-size:18px;
          padding:12px 32px;border-radius:40px;
          border:2px solid rgba(100,180,255,0.5);cursor:pointer;
          display:block;margin-top:8px;">
          ⏳ Version History
        </button>

        ${!IS_BEDROCK ? `
        <!-- Play Bedrock Edition button -->
        <button id="bedrockBtn" style="
          background:linear-gradient(135deg,#1a4a1a,#2e7d32);color:#7fff7f;font-size:15px;
          padding:9px 24px;border-radius:40px;
          border:2px solid rgba(80,200,80,0.45);cursor:pointer;
          display:block;margin-top:10px;font-weight:bold;">
          🟢 Play Bedrock Edition
        </button>` : `
        <!-- Return to Real Version -->
        <button id="realBtn" style="
          background:linear-gradient(135deg,#4a1a00,#b85a00);color:#ffe0a0;font-size:15px;
          padding:9px 24px;border-radius:40px;
          border:2px solid rgba(255,140,0,0.5);cursor:pointer;
          display:block;margin-top:10px;font-weight:bold;">
          ← Return to Real Version
        </button>
        <!-- Bedrock Edition label -->
        <div style="margin-top:10px;background:rgba(0,80,0,0.4);border:1px solid rgba(80,200,80,0.4);
          border-radius:20px;padding:4px 16px;color:#7fff7f;font-size:12px;font-weight:bold;">
          🟢 BEDROCK EDITION
        </div>`}

        <p style="margin-top:20px;font-size:12px;color:rgba(255,255,255,0.4);">
          12 puzzles hidden in a room · Find them all to unlock 3 AM 👀
        </p>

        <!-- Bottom bar: sign out + admin -->
        <div style="position:absolute;bottom:12px;left:0;right:0;
          display:flex;justify-content:space-between;padding:0 12px;">
          <button id="signOutBtn" style="
            background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);
            font-size:13px;padding:6px 12px;border-radius:10px;
            border:1px solid rgba(255,255,255,0.2);cursor:pointer;
            font-family:Arial,sans-serif;">
            🚪 Sign Out
          </button>
          <button id="adminBtn" style="
            background:rgba(0,0,0,0.5);color:rgba(255,255,255,0.5);
            font-size:13px;padding:6px 12px;border-radius:10px;
            border:1px solid rgba(255,255,255,0.2);cursor:pointer;
            font-family:Arial,sans-serif;">
            🔧 Admin
          </button>
        </div>
      </div>
    `;

    // Rename flow
    const chip         = document.getElementById("nameChip")!;
    const renameBox    = document.getElementById("renameBox")!;
    const renameInput  = document.getElementById("renameInput") as HTMLInputElement;
    const nameLabel    = document.getElementById("nameLabel")!;

    const isGuest = game.currentAccountId === "bedrock_guest";
    if (isGuest) {
      chip.style.cursor = "default";
      chip.querySelector<HTMLElement>("span:last-child")!.style.display = "none";
    } else {
      chip.onclick = () => {
        chip.style.display = "none";
        renameBox.style.display = "flex";
        renameInput.focus();
        renameInput.select();
      };
    }
    document.getElementById("renameCancel")!.onclick = () => {
      renameBox.style.display = "none";
      chip.style.display = "flex";
    };
    const saveRename = () => {
      const newName = renameInput.value.trim();
      if (newName) {
        game.changeUsername(newName);
        nameLabel.textContent = newName;
      }
      renameBox.style.display = "none";
      chip.style.display = "flex";
    };
    document.getElementById("renameSave")!.onclick = saveRename;
    renameInput.addEventListener("keydown", e => { if (e.key === "Enter") saveRename(); });

    document.getElementById("playBtn")!.onclick = () => {
      game.resetSave();
      game.goLevelSelect();
    };
    if (hasSave) {
      document.getElementById("contBtn")!.onclick = () => game.goExplore();
    }
    document.getElementById("signOutBtn")!.onclick = () => {
      game.logout();
      game.goAuth();
    };
    document.getElementById("adminBtn")!.onclick = () => game.goAdmin();
    if (!IS_BEDROCK) document.getElementById("mpBtn")!.onclick = () => game.goLobby();
    document.getElementById("arcadeBtn")!.onclick = () => game.goArcade();
    if (!IS_BEDROCK) {
      document.getElementById("lbBtn")!.onclick      = () => game.goLeaderboard();
      document.getElementById("bedrockBtn")!.onclick = () => enterBedrock();
    } else {
      document.getElementById("realBtn")!.onclick    = () => exitBedrock();
    }
    document.getElementById("shopBtn")!.onclick    = () => game.goShop();
    document.getElementById("versionBtn")!.onclick = () => {
      game.ui.innerHTML = "";
      import("./VersionHistory").then(m => new m.VersionHistory(game));
    };
  }
}
