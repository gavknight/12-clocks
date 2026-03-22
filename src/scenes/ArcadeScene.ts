import type { Game } from "../game/Game";
import { IS_BEDROCK, exitBedrock } from "../bedrock";

export class ArcadeScene {
  constructor(game: Game) {
    if (IS_BEDROCK) {
      game.ui.innerHTML = `
        <div class="screen" style="background:linear-gradient(160deg,#0a0020,#0a2010,#101808);
          flex-direction:column;gap:0;justify-content:flex-start;overflow-y:auto;padding:80px 20px 48px;">
          <button id="backBtn" style="position:absolute;top:16px;left:16px;
            background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
            font-size:14px;padding:8px 18px;border-radius:20px;
            border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;font-family:Arial,sans-serif;">
            ← Back
          </button>
          <div style="color:#7fff7f;font-size:13px;font-weight:bold;margin-bottom:16px;
            background:rgba(0,80,0,0.4);border:1px solid rgba(80,200,80,0.4);
            border-radius:20px;padding:4px 16px;">🟢 BEDROCK EDITION</div>
          <h2 style="color:white;font-size:24px;font-weight:900;margin-bottom:4px;
            font-family:'Arial Black',Arial,sans-serif;">🎮 Bedrock Mini-Games</h2>
          <p style="color:rgba(255,255,255,0.45);font-size:13px;margin-bottom:24px;">Exclusive to Bedrock Edition</p>

          <!-- 67 Clicker -->
          <button id="s67btn" style="
            background:linear-gradient(135deg,rgba(0,80,20,0.9),rgba(0,160,60,0.7));
            border:2px solid rgba(80,220,100,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;width:100%;max-width:360px;">
            <div style="font-size:40px;flex-shrink:0;">6️⃣7️⃣</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">67 Clicker</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Click 67 to earn coins… avoid 69!</div>
              <div style="color:#7fff7f;font-size:12px;margin-top:4px;">∞ Infinite • Combo multipliers!</div>
            </div>
          </button>

          <!-- Minecraft -->
          <button id="mcBtn" style="
            background:linear-gradient(135deg,rgba(10,60,10,0.9),rgba(30,130,30,0.7));
            border:2px solid rgba(80,200,80,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;width:100%;max-width:360px;margin-top:12px;">
            <div style="font-size:40px;flex-shrink:0;">⛏️</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Minecraft</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Mine blocks, build stuff, explore!</div>
              <div style="color:#7fff7f;font-size:12px;margin-top:4px;">∞ Survival & Creative mode</div>
            </div>
          </button>

          <!-- Geometry Dash -->
          <button id="gdBtnBR" style="
            background:linear-gradient(135deg,rgba(60,20,0,0.9),rgba(140,60,0,0.7));
            border:2px solid rgba(255,140,0,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;width:100%;max-width:360px;margin-top:12px;">
            <div style="font-size:40px;flex-shrink:0;">🟡</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Geometry Dash</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Jump, fly, and flip through obstacles!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">🎵 Cube • Ship • Ball modes</div>
            </div>
          </button>

          <!-- Other mini-games locked -->
          <div style="margin-top:20px;padding:14px 20px;border-radius:16px;
            background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
            color:rgba(255,255,255,0.35);font-size:13px;text-align:center;max-width:360px;">
            🔒 More Bedrock mini-games coming soon!
          </div>

          <button id="realBtn" style="
            background:linear-gradient(135deg,#4a1a00,#b85a00);color:#ffe0a0;font-size:14px;
            padding:10px 24px;border-radius:30px;border:2px solid rgba(255,140,0,0.5);
            cursor:pointer;margin-top:24px;font-weight:bold;">
            ← Return to Real Version
          </button>
        </div>`;
      document.getElementById("backBtn")!.onclick = () => game.goTitle();
      document.getElementById("realBtn")!.onclick = () => exitBedrock();
      document.getElementById("s67btn")!.onclick  = () => {
        import("./games/SixtySevenGame").then(m => new m.SixtySevenGame(game));
      };
      document.getElementById("mcBtn")!.onclick = () => {
        import("./games/MinecraftGame").then(m => new m.MinecraftGame(game));
      };
      document.getElementById("gdBtnBR")!.onclick = () => {
        import("./games/GeometryDash").then(m => new m.GeometryDash(game));
      };
      return;
    }

    game.ui.innerHTML = `
      <div class="screen" style="
        background:linear-gradient(160deg,#0a0020,#0a2010,#101808);
        flex-direction:column;gap:0;
        justify-content:flex-start;
        overflow-y:auto;
        padding:80px 20px 48px;
      ">
        <!-- Stars -->
        ${Array.from({length:10},(_,i)=>`<div style="position:absolute;
          left:${[8,18,32,50,65,78,88,25,55,72][i]}%;top:${[5,12,4,8,3,10,6,18,15,20][i]}%;
          width:3px;height:3px;border-radius:50%;background:white;
          opacity:${0.3+i*0.04};pointer-events:none;"></div>`).join("")}

        <!-- Header -->
        <button id="backBtn" style="
          position:absolute;top:16px;left:16px;
          background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
          font-size:14px;padding:7px 14px;border-radius:12px;
          border:1px solid rgba(255,255,255,0.2);cursor:pointer;
          font-family:Arial,sans-serif;">← Back</button>

        <div style="font-size:44px;margin-bottom:6px;">🕹️</div>
        <h1 style="color:white;font-size:32px;margin-bottom:6px;">Mini-Games</h1>
        <p style="color:rgba(255,255,255,0.55);font-size:14px;margin-bottom:28px;">
          Earn coins to unlock new levels!
        </p>

        <!-- Coin display -->
        <div style="
          display:flex;align-items:center;gap:6px;
          background:rgba(255,200,0,0.1);border:2px solid rgba(255,200,0,0.35);
          border-radius:16px;padding:5px 16px;margin-bottom:28px;
        ">
          <span style="font-size:18px;">🪙</span>
          <span style="color:#FFD700;font-size:15px;font-weight:bold;">${game.state.coins} coins</span>
        </div>

        <!-- Leaderboard link -->
        <button id="coinLbBtn" style="
          background:rgba(255,200,0,0.08);border:1px solid rgba(255,200,0,0.3);
          border-radius:14px;padding:10px 20px;cursor:pointer;
          display:flex;align-items:center;gap:10px;width:100%;max-width:360px;
          font-family:Arial,sans-serif;
        ">
          <span style="font-size:22px;">🏆</span>
          <span style="color:#FFD700;font-size:15px;font-weight:bold;">Coin Leaderboard</span>
          <span style="color:rgba(255,255,255,0.4);font-size:13px;margin-left:auto;">See top earners →</span>
        </button>

        <!-- Game cards -->
        <div style="display:flex;flex-direction:column;gap:16px;width:100%;max-width:360px;padding-bottom:8px;">

          <!-- Garden of Banban -->
          <button id="banbanBtn" style="
            background:linear-gradient(135deg,rgba(80,0,100,0.9),rgba(180,0,120,0.7));
            border:2px solid rgba(255,100,220,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🐦</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Garten of Banban</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Survive the kindergarten, collect eggs!</div>
              <div style="color:#ff80d5;font-size:12px;margin-top:4px;">⏱ 60s • Banban 🐦 Opila 🦅 Josh 🦖 Nabnab 🕷️</div>
            </div>
          </button>

          <!-- Coin Jump -->
          <button id="coinJumpBtn" style="
            background:linear-gradient(135deg,rgba(30,60,10,0.8),rgba(60,120,20,0.6));
            border:2px solid rgba(100,220,50,0.5);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🚗</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Coin Jump</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Tap to jump and grab coins!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">⏱ 60 seconds</div>
            </div>
          </button>

          <!-- Fruit Slice -->
          <button id="fruitSliceBtn" style="
            background:linear-gradient(135deg,rgba(60,10,30,0.8),rgba(120,20,80,0.6));
            border:2px solid rgba(255,100,180,0.5);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🍉</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Fruit Slice</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Click fruits to slice them! Each = 3 coins</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">⏱ 60 seconds</div>
            </div>
          </button>

          <!-- Cookie Clicker -->
          <button id="cookieBtn" style="
            background:linear-gradient(135deg,rgba(80,30,0,0.8),rgba(160,60,0,0.6));
            border:2px solid rgba(255,160,0,0.5);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🍪</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Cookie Clicker</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Click cookies, buy buildings, cash out!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">∞ No time limit</div>
            </div>
          </button>

          <!-- 99 Nights -->
          <button id="nightForestBtn" style="
            background:linear-gradient(135deg,rgba(0,10,0,0.9),rgba(5,30,5,0.7));
            border:2px solid rgba(50,180,50,0.4);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🌲</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">99 Nights in the Forest</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Survive the dark. Avoid the eyes.</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">🌙 Survive all 99 nights to win</div>
            </div>
          </button>

          <!-- Coin Rain -->
          <button id="coinRainBtn" style="
            background:linear-gradient(135deg,rgba(0,10,50,0.8),rgba(0,30,100,0.6));
            border:2px solid rgba(100,180,255,0.5);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🪙</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Coin Rain</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Click falling coins before they drop!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">∞ No time limit • Build combos!</div>
            </div>
          </button>

          <!-- Just Draw -->
          <button id="justDrawBtn" style="
            background:linear-gradient(135deg,rgba(10,30,60,0.9),rgba(20,60,120,0.7));
            border:2px solid rgba(100,160,255,0.5);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🎨</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Just Draw</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Draw the word before the timer runs out!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">⏱ 30 seconds per word</div>
            </div>
          </button>

          <!-- Item Creator -->
          <button id="itemCreatorBtn" style="
            background:linear-gradient(135deg,rgba(0,30,60,0.9),rgba(0,60,120,0.7));
            border:2px solid rgba(100,180,255,0.5);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🎨</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Item Creator</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Draw your own block — place it in Roblox Studio!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">🖌️ Pixel art + choose behavior</div>
            </div>
          </button>

          <!-- Roblox Studio -->
          <button id="robloxStudioBtn" style="
            background:linear-gradient(135deg,rgba(20,0,40,0.9),rgba(60,0,100,0.7));
            border:2px solid rgba(180,100,255,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🔨</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Roblox Studio</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Build your own level — then play it!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">🎮 Your creation appears in Roblox Games</div>
            </div>
          </button>

          <!-- Roblox Games -->
          <button id="robloxGamesBtn" style="
            background:linear-gradient(135deg,rgba(10,50,10,0.9),rgba(20,100,20,0.7));
            border:2px solid rgba(0,200,0,0.5);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🎮</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Roblox Games</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Steal the Brainrot, Floor is Lava & more!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">👥 Play with others • 4 mini-games inside</div>
            </div>
          </button>

          <!-- Minecraft -->
          <button id="minecraftBtn" style="
            background:linear-gradient(135deg,rgba(10,60,10,0.9),rgba(30,130,30,0.7));
            border:2px solid rgba(80,200,80,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">⛏️</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Minecraft</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Mine blocks, build stuff, explore!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">∞ No time limit • Survival & Creative</div>
            </div>
          </button>

          <!-- Geometry Dash -->
          <button id="gdBtn" style="
            background:linear-gradient(135deg,rgba(60,20,0,0.9),rgba(140,60,0,0.7));
            border:2px solid rgba(255,140,0,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🟡</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Geometry Dash</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Jump, fly, and flip through obstacles!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">🎵 Cube • Ship • Ball modes</div>
            </div>
          </button>

          <!-- Boldy -->
          <button id="boldyBtn" style="
            background:linear-gradient(135deg,rgba(20,60,100,0.9),rgba(40,100,160,0.7));
            border:2px solid rgba(80,160,255,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">👨‍🦲</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Boldy</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Math class with a bald teacher. Answer 5 questions… if you can.</div>
              <div style="color:#80cfff;font-size:12px;margin-top:4px;">❓ 5 questions • Run from Boldy if you're wrong!</div>
            </div>
          </button>

          <!-- Mr. Tomato -->
          <button id="mrTomatoBtn" style="
            background:linear-gradient(135deg,rgba(80,0,0,0.9),rgba(180,20,20,0.7));
            border:2px solid rgba(255,60,60,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🍅</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Mr. Tomato</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Feed Mr. Tomato… or face the consequences.</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">🍽️ 10 rounds • Don't make him angry!</div>
            </div>
          </button>

          <!-- Minecraft Bee — Coming Soon -->
          <button id="minecraftBeeBtn" style="
            background:linear-gradient(135deg,rgba(40,40,40,0.7),rgba(60,60,60,0.5));
            border:2px solid rgba(120,120,120,0.3);border-radius:20px;
            padding:20px 24px;cursor:not-allowed;text-align:left;
            display:flex;align-items:center;gap:16px;opacity:0.5;
            position:relative;
          ">
            <div style="font-size:40px;flex-shrink:0;filter:grayscale(1);">🐝</div>
            <div>
              <div style="color:rgba(255,255,255,0.6);font-size:18px;font-weight:bold;margin-bottom:4px;">Queen Bee</div>
              <div style="color:rgba(255,255,255,0.35);font-size:13px;">Fly, place your hive, call your bees!</div>
              <div style="color:rgba(180,180,180,0.5);font-size:12px;margin-top:4px;">⏱ 90 seconds • Collect honey!</div>
            </div>
            <div style="position:absolute;top:10px;right:14px;background:rgba(80,80,80,0.9);
              color:#aaa;font-size:11px;font-weight:bold;padding:3px 10px;border-radius:20px;
              letter-spacing:1px;">COMING SOON</div>
          </button>

          <!-- Fire Fighter -->
          <button id="fireFighterBtn" style="
            background:linear-gradient(135deg,rgba(60,10,0,0.9),rgba(120,30,0,0.7));
            border:2px solid rgba(255,100,0,0.6);border-radius:20px;
            padding:20px 24px;cursor:pointer;text-align:left;
            display:flex;align-items:center;gap:16px;
          ">
            <div style="font-size:40px;flex-shrink:0;">🧑‍🚒</div>
            <div>
              <div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">Fire Fighter</div>
              <div style="color:rgba(255,255,255,0.6);font-size:13px;">Put out 8,000 fires across a massive map!</div>
              <div style="color:#FFD700;font-size:12px;margin-top:4px;">∞ No time limit • Progress saves automatically</div>
            </div>
          </button>

          <!-- Custom games (injected by Studio) -->
          <div id="customGamesSection" style="display:none;flex-direction:column;gap:12px;width:100%;margin-top:8px;">
            <div style="color:rgba(255,255,255,0.3);font-size:12px;letter-spacing:2px;padding:0 4px;">YOUR GAMES</div>
          </div>

        </div>
      </div>
    `;

    document.getElementById("backBtn")!.onclick    = () => game.goTitle();
    document.getElementById("coinLbBtn")!.onclick  = () => game.goCoinLeaderboard();
    document.getElementById("banbanBtn")!.onclick  = () => {
      import("./games/GardenBanban").then(m => {
        game.ui.innerHTML = "";
        new m.GardenBanban(game);
      });
    };
    document.getElementById("cookieBtn")!.onclick  = () => {
      import("./games/CookieClicker").then(m => {
        game.ui.innerHTML = "";
        new m.CookieClicker(game);
      });
    };
    document.getElementById("coinJumpBtn")!.onclick = () => {
      import("./games/CoinJump").then(m => {
        game.ui.innerHTML = "";
        new m.CoinJump(game);
      });
    };
    document.getElementById("fruitSliceBtn")!.onclick = () => {
      import("./games/FruitSlice").then(m => {
        game.ui.innerHTML = "";
        new m.FruitSlice(game);
      });
    };
    document.getElementById("nightForestBtn")!.onclick = () => {
      import("./games/NightForestLobby").then(m => {
        game.ui.innerHTML = "";
        new m.NightForestLobby(game);
      });
    };
    document.getElementById("coinRainBtn")!.onclick = () => {
      import("./games/CoinRain").then(m => {
        game.ui.innerHTML = "";
        new m.CoinRain(game);
      });
    };
    document.getElementById("justDrawBtn")!.onclick = () => {
      import("./games/JustDraw").then(m => {
        game.ui.innerHTML = "";
        new m.JustDraw(game);
      });
    };
    document.getElementById("itemCreatorBtn")!.onclick = () => {
      import("./games/ItemCreator").then(m => {
        game.ui.innerHTML = "";
        new m.ItemCreator(game);
      });
    };
    document.getElementById("boldyBtn")!.onclick = () => {
      import("./games/Boldy").then(m => {
        game.ui.innerHTML = "";
        new m.Boldy(game);
      });
    };
    document.getElementById("mrTomatoBtn")!.onclick = () => {
      import("./games/MrTomato").then(m => {
        game.ui.innerHTML = "";
        new m.MrTomato(game);
      });
    };
    document.getElementById("robloxStudioBtn")!.onclick = () => {
      import("./games/RobloxStudio").then(m => {
        game.ui.innerHTML = "";
        new m.RobloxStudio(game);
      });
    };
    document.getElementById("robloxGamesBtn")!.onclick = () => {
      import("./games/RobloxGames").then(m => {
        game.ui.innerHTML = "";
        new m.RobloxGames(game);
      });
    };
    document.getElementById("minecraftBtn")!.onclick = () => {
      import("./games/MinecraftGame").then(m => new m.MinecraftGame(game));
    };
    document.getElementById("gdBtn")!.onclick = () => {
      import("./games/GeometryDash").then(m => new m.GeometryDash(game));
    };
    // Queen Bee is coming soon — no onclick
    document.getElementById("fireFighterBtn")!.onclick = () => {
      import("./games/FireFighter").then(m => {
        game.ui.innerHTML = "";
        new m.FireFighter(game);
      });
    };

    // ── Custom games from Studio ──────────────────────────────────────────────
    import("./games/Studio").then(m => {
      const raw = localStorage.getItem("12clocks_custom_games");
      if (!raw) return;
      const games: Array<{ id: string; name: string; bg: string; objects: unknown[]; win: unknown; createdAt: number }> = JSON.parse(raw);
      if (!games.length) return;

      const container = document.getElementById("customGamesSection");
      if (!container) return;
      container.style.display = "flex";

      for (const cg of games) {
        const btn = document.createElement("button");
        btn.style.cssText =
          "background:linear-gradient(135deg,rgba(30,80,30,0.9),rgba(60,140,60,0.7));" +
          "border:2px solid rgba(100,220,100,0.5);border-radius:20px;" +
          "padding:20px 24px;cursor:pointer;text-align:left;" +
          "display:flex;align-items:center;gap:16px;width:100%;";
        btn.innerHTML =
          `<div style="font-size:40px;flex-shrink:0;">🎮</div>` +
          `<div>` +
          `<div style="color:white;font-size:18px;font-weight:bold;margin-bottom:4px;">${cg.name}</div>` +
          `<div style="color:rgba(255,255,255,0.5);font-size:12px;">Custom game</div>` +
          `</div>`;
        btn.onclick = () => m.runCustomGame(game, cg as Parameters<typeof m.runCustomGame>[1]);
        container.appendChild(btn);
      }
    });
  }
}
