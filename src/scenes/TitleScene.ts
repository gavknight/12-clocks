import type { Game } from "../game/Game";
import { IS_BEDROCK, enterBedrock, exitBedrock } from "../bedrock";
import { TIME_MACHINE_KEY, VERSION_NAMES } from "./VersionHistory";
import { getMemberCount } from "../game/members";
import { rulesHTML, bindReportButtons } from "../game/rules";

const SB = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/game_likes";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const SB_H = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

export class TitleScene {
  constructor(game: Game) {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const hasSave = game.state.unlockedLocks.size > 0 || game.state.inventory.length > 0;
    const solved  = game.state.unlockedLocks.size;
    const name    = game.state.username || "Player";
    const tmVersion = sessionStorage.getItem(TIME_MACHINE_KEY);
    const isOldEra  = tmVersion !== null && tmVersion !== "v1.0";
    const isV01     = tmVersion === "v0.1";

    // ── v0.1: the very beginning — just sky + start button ───────────────────
    if (isV01) {
      game.ui.innerHTML = `
        <div class="screen" style="
          background:linear-gradient(180deg,#87CEEB 0%,#b8e4f9 65%,#dff0fb 100%);
          flex-direction:column;align-items:center;justify-content:center;gap:0;
          font-family:Arial,sans-serif;overflow:hidden;position:relative;">

          <!-- Clouds -->
          <div style="position:absolute;top:8%;left:5%;width:120px;height:44px;background:white;border-radius:40px;opacity:0.9;box-shadow:40px 0 0 20px white,80px 0 0 10px white;pointer-events:none;"></div>
          <div style="position:absolute;top:18%;right:8%;width:90px;height:34px;background:white;border-radius:40px;opacity:0.85;box-shadow:30px 0 0 14px white,60px 0 0 8px white;pointer-events:none;"></div>
          <div style="position:absolute;top:5%;left:50%;width:100px;height:36px;background:white;border-radius:40px;opacity:0.8;box-shadow:34px 0 0 16px white;pointer-events:none;"></div>

          <!-- Title -->
          <div style="font-size:52px;margin-bottom:6px;">🕐</div>
          <h1 style="font-size:46px;color:#1a4a8a;text-shadow:0 2px 8px rgba(0,0,0,0.15);margin-bottom:30px;">
            12 Clocks
          </h1>

          <!-- Just the start button -->
          <button id="playBtn" style="
            background:#FFD700;color:#1a0060;font-size:26px;font-weight:bold;
            padding:18px 48px;border-radius:50px;border:4px solid #e6b800;
            box-shadow:0 6px 0 #b8860b;cursor:pointer;">
            ▶ START GAME
          </button>

          <!-- Time machine banner -->
          <div style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
            background:rgba(0,0,0,0.18);border-radius:12px;padding:8px 16px;text-align:center;">
            <div style="color:#1a4a8a;font-size:12px;font-weight:bold;">⏳ v0.1 — The Very Beginning</div>
            <button id="exitTimeMachine" style="margin-top:4px;background:rgba(0,0,0,0.1);
              border:1px solid rgba(0,0,0,0.2);color:#1a4a8a;font-size:11px;
              padding:4px 12px;border-radius:8px;cursor:pointer;">✕ Exit Time Machine</button>
          </div>
        </div>
      `;
      document.getElementById("playBtn")!.onclick = () => game.goExplore();
      document.getElementById("exitTimeMachine")!.onclick = () => {
        sessionStorage.removeItem(TIME_MACHINE_KEY);
        game.ui.innerHTML = "";
        new TitleScene(game);
      };
      return;
    }

    // ── Sky background for old versions ──────────────────────────────────────
    const bgStyle = isOldEra
      ? "linear-gradient(180deg,#87CEEB 0%,#b8e4f9 65%,#dff0fb 100%)"
      : "linear-gradient(160deg,#1a0a3e,#3a106f,#6a20a0)";
    const textColor    = isOldEra ? "#1a3a6a" : "white";
    const subTextColor = isOldEra ? "rgba(20,60,120,0.7)" : "rgba(255,255,255,0.7)";

    game.ui.innerHTML = `
      <div class="screen" style="background:${bgStyle};overflow-y:auto;justify-content:flex-start;padding:40px 0 80px;">

        <!-- Rules button -->
        <button id="rulesBtn" style="position:absolute;top:14px;right:14px;z-index:20;
          background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);
          color:rgba(255,255,255,0.85);font-size:13px;font-weight:bold;padding:6px 14px;
          border-radius:20px;cursor:pointer;font-family:Arial,sans-serif;pointer-events:all;">
          📋 Rules
        </button>

        <!-- Rules panel (hidden by default) -->
        <div id="rulesPanel" style="display:none;position:absolute;top:46px;right:14px;z-index:21;
          background:rgba(10,0,30,0.97);border:1.5px solid rgba(180,100,255,0.4);
          border-radius:16px;padding:16px 18px;width:260px;pointer-events:all;
          box-shadow:0 8px 32px rgba(0,0,0,0.6);">
          <div id="rulesPanelContent"></div>
          <button id="closeRules" style="margin-top:8px;width:100%;background:rgba(255,255,255,0.1);
            border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.7);
            padding:6px;border-radius:10px;cursor:pointer;font-size:12px;font-family:Arial,sans-serif;">
            ✕ Close
          </button>
        </div>

        ${isOldEra ? `
        <!-- Old era clouds -->
        <div style="position:absolute;top:6%;left:4%;width:130px;height:48px;background:white;border-radius:40px;opacity:0.92;box-shadow:44px 0 0 22px white,88px 0 0 12px white;pointer-events:none;"></div>
        <div style="position:absolute;top:16%;right:6%;width:100px;height:38px;background:white;border-radius:40px;opacity:0.88;box-shadow:34px 0 0 16px white,68px 0 0 10px white;pointer-events:none;"></div>
        <div style="position:absolute;top:4%;left:45%;width:110px;height:40px;background:white;border-radius:40px;opacity:0.82;box-shadow:38px 0 0 18px white;pointer-events:none;"></div>
        ` : Array.from({length:12},(_,i)=>`<div style="position:absolute;
          left:${[8,15,25,40,55,70,82,90,5,35,65,88][i]}%;
          top:${[10,25,8,15,5,12,8,20,35,30,28,35][i]}%;
          width:3px;height:3px;border-radius:50%;background:white;
          opacity:${0.4+i*0.05};pointer-events:none;"></div>`).join("")}

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
        <h1 style="font-size:46px;color:${textColor};text-shadow:0 0 20px rgba(255,200,0,0.6);margin-bottom:8px;">
          12 Clocks
        </h1>
        <p style="font-size:16px;color:${subTextColor};margin-bottom:20px;">
          A fun clock game!
        </p>

        <!-- Member count chip -->
        <div id="memberChip" style="
          display:flex;align-items:center;gap:6px;
          background:rgba(100,200,255,0.08);border:2px solid rgba(100,200,255,0.25);
          border-radius:16px;padding:5px 12px;margin-bottom:4px;
        ">
          <span style="font-size:16px;">👥</span>
          <span id="memberCount" style="color:#7dd3fc;font-size:14px;font-weight:bold;">... members</span>
        </div>

        <!-- Like button -->
        <button id="gameLikeBtn" style="
          display:flex;align-items:center;gap:6px;
          background:rgba(255,100,100,0.08);border:2px solid rgba(255,100,100,0.25);
          border-radius:16px;padding:5px 14px;margin-bottom:4px;cursor:pointer;
          font-family:Arial,sans-serif;
        ">
          <span id="gameLikeIcon" style="font-size:16px;">🤍</span>
          <span id="gameLikeCount" style="color:#ff8080;font-size:14px;font-weight:bold;">... likes</span>
        </button>

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
          box-shadow:0 6px 0 #b8860b;cursor:pointer;margin-bottom:20px;display:block;">
          ${isTouch ? "👆 TAP TO PLAY" : "▶ START GAME"}
        </button>

        <!-- Button grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:340px;padding:0 8px;">

          ${hasSave ? `
          <button id="contBtn" style="
            background:rgba(255,255,255,0.15);color:white;font-size:18px;
            padding:12px 24px;border-radius:20px;
            border:2px solid rgba(255,255,255,0.4);cursor:pointer;grid-column:span 2;">
            ▷ Continue (${solved}/12 solved)
          </button>` : ""}

          ${!IS_BEDROCK ? `<button id="mpBtn" style="
            background:linear-gradient(135deg,#6a11cb,#2575fc);color:white;font-size:18px;
            padding:12px 24px;border-radius:20px;
            border:2px solid rgba(100,150,255,0.5);cursor:pointer;">
            🌐 Multiplayer
          </button>` : ""}

          <button id="arcadeBtn" style="
            background:linear-gradient(135deg,#1a6b00,#4caf50);color:white;font-size:18px;
            padding:12px 24px;border-radius:20px;
            border:2px solid rgba(100,255,100,0.5);cursor:pointer;">
            🕹️ Mini-Games
          </button>

          ${!IS_BEDROCK ? `
          <button id="lbBtn" style="
            background:linear-gradient(135deg,#b8860b,#FFD700);color:#1a0060;font-size:18px;
            padding:12px 24px;border-radius:20px;
            border:2px solid rgba(255,215,0,0.5);cursor:pointer;font-weight:bold;">
            🏆 Records
          </button>` : ""}

          <button id="shopBtn" style="
            background:linear-gradient(135deg,#4a0080,#9c27b0);color:white;font-size:18px;
            padding:12px 24px;border-radius:20px;
            border:2px solid rgba(200,100,255,0.5);cursor:pointer;">
            🛍️ Shop
          </button>

          <button id="versionBtn" style="
            background:linear-gradient(135deg,#0a2a4a,#1a5a8a);color:white;font-size:18px;
            padding:12px 24px;border-radius:20px;
            border:2px solid rgba(100,180,255,0.5);cursor:pointer;">
            ⏳ History
          </button>

          ${!IS_BEDROCK ? `
          <button id="bedrockBtn" style="
            background:linear-gradient(135deg,#1a4a1a,#2e7d32);color:#7fff7f;font-size:18px;
            padding:12px 24px;border-radius:20px;
            border:2px solid rgba(80,200,80,0.45);cursor:pointer;font-weight:bold;grid-column:span 2;">
            🟢 Play Bedrock Edition
          </button>` : `
          <button id="realBtn" style="
            background:linear-gradient(135deg,#4a1a00,#b85a00);color:#ffe0a0;font-size:18px;
            padding:12px 24px;border-radius:20px;
            border:2px solid rgba(255,140,0,0.5);cursor:pointer;font-weight:bold;grid-column:span 2;">
            ← Return to Real Version
          </button>
          <div style="grid-column:span 2;background:rgba(0,80,0,0.4);border:1px solid rgba(80,200,80,0.4);
            border-radius:20px;padding:4px 16px;color:#7fff7f;font-size:12px;font-weight:bold;text-align:center;">
            🟢 BEDROCK EDITION
          </div>`}

        </div>

        <p style="margin-top:20px;font-size:12px;color:rgba(255,255,255,0.4);">
          12 puzzles hidden in a room · Find them all to unlock 3 AM 👀
        </p>

        ${sessionStorage.getItem(TIME_MACHINE_KEY) ? `
        <div id="timeMachineBanner" style="
          margin-top:16px;background:linear-gradient(135deg,#0a2a4a,#1a5a8a);
          border:2px solid rgba(100,180,255,0.6);border-radius:16px;
          padding:12px 20px;text-align:center;max-width:320px;width:100%;">
          <div style="color:#7dd3fc;font-size:13px;font-weight:bold;">
            ⏳ TIME MACHINE — ${sessionStorage.getItem(TIME_MACHINE_KEY)} · ${VERSION_NAMES[sessionStorage.getItem(TIME_MACHINE_KEY)!] ?? ""}
          </div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:3px;">Mini-Games shows only what existed then</div>
          <button id="exitTimeMachine" style="margin-top:8px;background:rgba(255,255,255,0.1);
            border:1px solid rgba(255,255,255,0.3);color:white;font-size:12px;
            padding:5px 14px;border-radius:8px;cursor:pointer;">✕ Exit Time Machine</button>
        </div>` : ""}

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

    document.getElementById("rulesBtn")!.onclick = () => {
      const p = document.getElementById("rulesPanel")!;
      if (p.style.display === "none") {
        document.getElementById("rulesPanelContent")!.innerHTML = rulesHTML(name);
        bindReportButtons(name);
        p.style.display = "block";
      } else {
        p.style.display = "none";
      }
    };
    document.getElementById("closeRules")!.onclick = () => {
      document.getElementById("rulesPanel")!.style.display = "none";
    };

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
    document.getElementById("exitTimeMachine")?.addEventListener("click", () => {
      sessionStorage.removeItem(TIME_MACHINE_KEY);
      game.ui.innerHTML = "";
      new TitleScene(game);
    });
    document.getElementById("versionBtn")!.onclick = () => {
      game.ui.innerHTML = "";
      import("./VersionHistory").then(m => new m.VersionHistory(game));
    };

    // Game like button
    const accountId = game.currentAccountId;
    const username  = game.state.username || "Player";
    const likeBtn   = document.getElementById("gameLikeBtn")!;
    const likeIcon  = document.getElementById("gameLikeIcon")!;
    const likeCount = document.getElementById("gameLikeCount")!;

    const refreshLikes = (myLiked: boolean, total: number) => {
      likeIcon.textContent  = myLiked ? "❤️" : "🤍";
      likeCount.textContent = `${total.toLocaleString()} like${total !== 1 ? "s" : ""}`;
      (likeBtn as HTMLButtonElement).style.background = myLiked ? "rgba(255,0,0,0.15)" : "rgba(255,100,100,0.08)";
      (likeBtn as HTMLButtonElement).style.borderColor = myLiked ? "rgba(255,80,80,0.5)" : "rgba(255,100,100,0.25)";
    };

    // Load initial state
    fetch(`${SB}?select=account_id`, { headers: SB_H })
      .then(r => r.json())
      .then((rows: Array<{ account_id: string }>) => {
        const myLiked = rows.some(r => r.account_id === accountId);
        refreshLikes(myLiked, rows.length);
      }).catch(() => { likeCount.textContent = "? likes"; });

    likeBtn.onclick = () => {
      const myLiked = likeIcon.textContent === "❤️";
      if (myLiked) {
        fetch(`${SB}?account_id=eq.${encodeURIComponent(accountId)}`,
          { method: "DELETE", headers: SB_H })
          .then(() => fetch(`${SB}?select=account_id`, { headers: SB_H }))
          .then(r => r.json())
          .then((rows: Array<{ account_id: string }>) => refreshLikes(false, rows.length));
      } else {
        fetch(SB, { method: "POST", headers: { ...SB_H, "Prefer": "resolution=ignore-duplicates" },
          body: JSON.stringify({ account_id: accountId, username }) })
          .then(() => fetch(`${SB}?select=account_id`, { headers: SB_H }))
          .then(r => r.json())
          .then((rows: Array<{ account_id: string }>) => refreshLikes(true, rows.length));
      }
    };

    // Load live member count, refresh every 30s
    const updateCount = () => {
      getMemberCount().then(({ total, active }) => {
        const el = document.getElementById("memberCount");
        if (el) el.textContent = `${active.toLocaleString()} member${active !== 1 ? "s" : ""}${total !== active ? ` (${total - active} banned)` : ""}`;
      });
    };
    setTimeout(() => {
      updateCount();
      setInterval(updateCount, 30_000);
    }, 1500);
  }
}
