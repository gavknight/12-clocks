import { Game } from "./game/Game";
import { IS_BEDROCK } from "./bedrock";
import { GamepadManager } from "./input/GamepadManager";

// ── Update alert banner ────────────────────────────────────────────────────
const SB_ALERT = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/update_alerts";
const SB_ALERT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const SB_ALERT_H = { "apikey": SB_ALERT_KEY, "Authorization": `Bearer ${SB_ALERT_KEY}` };

let _alertBanner: HTMLDivElement | null = null;
let _alertChip: HTMLDivElement | null = null;
let _alertInterval: ReturnType<typeof setInterval> | null = null;

const _showAlertBanner = (targetTime: Date, message: string) => {
  if (!_alertBanner) {
    _alertBanner = document.createElement("div");
    _alertBanner.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:99998;" +
      "background:linear-gradient(90deg,#b8000a,#ff4400);" +
      "color:white;font-family:'Arial Black',Arial;font-size:14px;font-weight:900;" +
      "text-align:center;padding:6px 12px;letter-spacing:1px;" +
      "box-shadow:0 2px 8px rgba(0,0,0,0.5);";
    document.body.appendChild(_alertBanner);
  }
  if (!_alertChip) {
    _alertChip = document.createElement("div");
    _alertChip.style.cssText =
      "position:fixed;left:10px;top:50%;transform:translateY(-50%);z-index:99998;" +
      "background:rgba(180,0,10,0.85);color:white;" +
      "font-family:'Arial Black',Arial;font-size:12px;font-weight:900;" +
      "padding:6px 10px;border-radius:8px;letter-spacing:1px;" +
      "box-shadow:0 2px 8px rgba(0,0,0,0.5);pointer-events:none;";
    document.body.appendChild(_alertChip);
  }
  if (_alertInterval) clearInterval(_alertInterval);
  _alertInterval = setInterval(() => {
    const secs = Math.max(0, Math.round((targetTime.getTime() - Date.now()) / 1000));
    if (secs <= 0) {
      if (_alertBanner) { _alertBanner.remove(); _alertBanner = null; }
      if (_alertChip) { _alertChip.remove(); _alertChip = null; }
      if (_alertInterval) clearInterval(_alertInterval);
      return;
    }
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const timeStr = h > 0 ? `${h}H ${m}M` : m > 0 ? `${m}M ${s}S` : `${s}S`;
    _alertBanner!.textContent = `🔧 ${message} — Update in ${timeStr}`;
    _alertChip!.textContent = `UPD IN ${timeStr}`;
  }, 500);
};

const _pollAlerts = () => {
  fetch(`${SB_ALERT}?select=target_time,message&limit=1`, { headers: SB_ALERT_H })
    .then(r => r.json())
    .then((rows: Array<{ target_time: string; message: string }>) => {
      if (!rows.length) return;
      const target = new Date(rows[0].target_time);
      if (target.getTime() > Date.now()) {
        _showAlertBanner(target, rows[0].message);
      }
    }).catch(() => {});
};
setTimeout(_pollAlerts, 3000);
setInterval(_pollAlerts, 30_000);

// ── Sky loading screen ─────────────────────────────────────────────────────
const skyLoader = document.createElement("div");
skyLoader.style.cssText =
  "position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;" +
  "align-items:center;justify-content:center;overflow:hidden;" +
  "background:linear-gradient(180deg,#87CEEB 0%,#b8e4f9 65%,#dff0fb 100%);" +
  "transition:opacity 0.7s;font-family:Arial,sans-serif;";
skyLoader.innerHTML = `
  <!-- Clouds -->
  <div style="position:absolute;top:8%;left:4%;width:140px;height:50px;background:white;
    border-radius:50px;opacity:0.95;box-shadow:48px 0 0 24px white,96px 0 0 14px white;pointer-events:none;"></div>
  <div style="position:absolute;top:18%;right:5%;width:110px;height:40px;background:white;
    border-radius:50px;opacity:0.9;box-shadow:38px 0 0 18px white,76px 0 0 10px white;pointer-events:none;"></div>
  <div style="position:absolute;top:5%;left:44%;width:120px;height:44px;background:white;
    border-radius:50px;opacity:0.85;box-shadow:42px 0 0 20px white;pointer-events:none;"></div>
  <div style="position:absolute;top:28%;left:18%;width:80px;height:30px;background:white;
    border-radius:50px;opacity:0.7;box-shadow:28px 0 0 12px white;pointer-events:none;"></div>

  <!-- Warning text -->
  <div style="position:absolute;top:20px;color:#1a3a8a;font-size:14px;font-weight:bold;text-align:center;">
    WARNING: Ages 5 and up — Creator recommended this
  </div>

  <!-- Content -->
  <div style="font-size:64px;margin-bottom:10px;">🕐</div>
  <div style="font-size:36px;font-weight:900;color:#1a3a8a;margin-bottom:6px;
    text-shadow:0 2px 6px rgba(0,0,0,0.1);">12 Clocks</div>
  <div style="font-size:15px;color:#1a5a8a;margin-bottom:24px;">A fun clock game!</div>

  <div style="color:#1a5abf;font-size:13px;">Loading...</div>

  <!-- Tip -->
  <div id="skyTip" style="position:absolute;bottom:28px;left:50%;transform:translateX(-50%);
    background:rgba(255,255,255,0.6);border-radius:12px;padding:8px 20px;
    color:#1a3a8a;font-size:13px;text-align:center;max-width:300px;white-space:normal;">
    <b>Tip:</b> <span id="skyTipText"></span>
  </div>
`;
document.body.appendChild(skyLoader);
const _tips = [
  "There are 12 clocks — can you find them all?",
  "Each clock hides a secret. Look closely!",
  "Coins unlock cool stuff in the Shop!",
  "Some clocks are trickier than others. Don't give up!",
  "Challenge your friends — who can finish fastest?",
  "Every clock is different. Stay sharp!",
  "Check every corner — clocks can be sneaky!",
];
const _tipEl = document.getElementById("skyTipText");
if (_tipEl) _tipEl.textContent = _tips[Math.floor(Math.random() * _tips.length)];
setTimeout(() => {
  skyLoader.style.opacity = "0";
  setTimeout(() => skyLoader.remove(), 750);
}, 2200);

if (IS_BEDROCK) {
  // Bedrock loading screen
  const loader = document.createElement("div");
  loader.style.cssText =
    "position:fixed;inset:0;background:#050e05;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;z-index:9999;transition:opacity 0.6s;";
  loader.innerHTML = `
    <div style="font-size:56px;margin-bottom:16px;">🟢</div>
    <div style="color:#7fff7f;font-size:28px;font-weight:900;
      font-family:'Arial Black',Arial,sans-serif;margin-bottom:6px;">
      12 Clocks
    </div>
    <div style="color:#4caf50;font-size:14px;font-weight:bold;
      font-family:'Arial Black',Arial,sans-serif;letter-spacing:3px;margin-bottom:32px;">
      BEDROCK EDITION
    </div>
    <div style="width:180px;height:5px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">
      <div id="bedrockBar" style="height:100%;width:0%;background:#4caf50;border-radius:3px;
        transition:width 1.6s ease-out;"></div>
    </div>
    <div style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:12px;font-family:Arial,sans-serif;">
      Loading…
    </div>`;
  document.body.appendChild(loader);
  requestAnimationFrame(() => {
    (document.getElementById("bedrockBar") as HTMLElement).style.width = "100%";
  });
  setTimeout(() => {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 650);
  }, 1800);
}

// ── PWA install prompt ─────────────────────────────────────────────────────
let _installPrompt: Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null = null;
const _isStandalone = window.matchMedia("(display-mode: standalone)").matches;
const _isMobile = window.matchMedia("(pointer: coarse)").matches;
const _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

// Only show on Android mobile (not iOS, not desktop, not already installed)
if (_isMobile && !_isStandalone && !_isIOS) {
  const btn = document.createElement("button");
  btn.textContent = "📲 DOWNLOAD APP!";
  btn.style.cssText =
    "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99997;" +
    "background:linear-gradient(135deg,#6a20a0,#3a106f);color:white;" +
    "font-size:15px;font-weight:900;padding:12px 28px;border-radius:30px;" +
    "border:2px solid rgba(180,100,255,0.6);cursor:pointer;" +
    "box-shadow:0 4px 20px rgba(100,0,200,0.5);font-family:'Arial Black',Arial,sans-serif;" +
    "white-space:nowrap;letter-spacing:0.5px;";
  btn.onclick = async () => {
    if (_installPrompt) {
      _installPrompt.prompt();
      const { outcome } = await _installPrompt.userChoice;
      if (outcome === "accepted") btn.remove();
      _installPrompt = null;
    }
  };
  document.body.appendChild(btn);
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _installPrompt = e as typeof _installPrompt;
});

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const game = new Game(canvas);
game.start();

// Global refresh button — always visible in bottom-left corner
const refreshBtn = document.createElement("button");
refreshBtn.textContent = "🔄";
refreshBtn.title = "Refresh";
refreshBtn.style.cssText =
  "position:fixed;top:10px;left:10px;z-index:99999;" +
  "background:rgba(0,0,0,0.4);color:white;font-size:18px;" +
  "width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);" +
  "cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;" +
  "opacity:0.5;transition:opacity 0.2s;";
refreshBtn.onmouseenter = () => refreshBtn.style.opacity = "1";
refreshBtn.onmouseleave = () => refreshBtn.style.opacity = "0.5";
refreshBtn.onclick = () => location.reload();
document.body.appendChild(refreshBtn);

// Catch any unhandled error/rejection that leaves the screen black
const showBlackScreenFallback = () => {
  const ui = document.getElementById("ui");
  if (!ui || ui.innerHTML.trim() !== "") return; // only act if screen is blank
  const div = document.createElement("div");
  div.style.cssText =
    "position:absolute;inset:0;background:#111;display:flex;flex-direction:column;" +
    "align-items:center;justify-content:center;gap:16px;font-family:Arial,sans-serif;pointer-events:all;";
  div.innerHTML =
    `<div style="font-size:48px;">😵</div>` +
    `<div style="color:white;font-size:18px;font-weight:bold;">Something went wrong</div>` +
    `<div style="color:rgba(255,255,255,0.4);font-size:14px;">A page failed to load</div>`;
  const btn = document.createElement("button");
  btn.textContent = "← Go Back";
  btn.style.cssText =
    "background:#FF0000;color:white;font-size:16px;font-weight:bold;" +
    "padding:14px 32px;border-radius:30px;border:none;cursor:pointer;";
  btn.onclick = () => game.goTitle();
  div.appendChild(btn);
  ui.appendChild(div);
};
window.addEventListener("unhandledrejection", () => setTimeout(showBlackScreenFallback, 300));
window.addEventListener("error", () => setTimeout(showBlackScreenFallback, 300));

// Controller support — works on any screen automatically
new GamepadManager(game);

// Capture phase ensures this fires before BabylonJS engine can swallow the event
document.addEventListener("keydown", e => {
  if (e.key === "Control" && !e.shiftKey && !e.altKey && !e.metaKey) {
    game.goAdmin();
  }
}, { capture: true });

// Dev console helpers — type these in browser DevTools console (F12 → Console):
//   __unlockAll()     → unlock all 12 numbers, go to explore room
//   __goEnding()      → jump straight to the ending cutscene
//   __winHard()       → complete Hard mode + save a world record entry
//   __giveNumbers()   → put all 12 numbers in inventory, go to explore
const w = window as unknown as Record<string, unknown>;
w.__unlockAll = () => {
  game.resetSave();
  for (let i = 0; i < 12; i++) game.state.unlockedLocks.add(i);
  game.save();
  game.goExplore();
};
w.__goEnding = () => {
  for (let i = 0; i < 12; i++) game.state.unlockedLocks.add(i);
  game.save();
  game.goEnding();
};
w.__winHard = () => {
  game.state.difficulty = 12;
  game.startTimer();
  for (let i = 0; i < 12; i++) game.state.unlockedLocks.add(i);
  game.state.inventory.length = 0;
  game.save();
  game.saveRecord();
  game.goEnding();
};
w.__giveNumbers = () => {
  for (let n = 1; n <= 12; n++) game.addToInventory(n);
  game.goExplore();
};
w.__admin = () => {
  // Force-open admin regardless of account
  const orig = game.hasHacks;
  Object.defineProperty(game, "hasHacks", { get: () => true, configurable: true });
  game.goAdmin();
  Object.defineProperty(game, "hasHacks", { get: () => orig, configurable: true });
};
w.__gamepad = () => {
  // Debug: shows what controllers the browser can see right now
  const pads = Array.from(navigator.getGamepads()).filter(Boolean);
  if (pads.length === 0) {
    console.warn("❌ No gamepads detected. Make sure to press a button on the controller first, and close Steam or disable Steam Input.");
  } else {
    pads.forEach(p => p && console.log(`✅ Gamepad ${p.index}: "${p.id}" — ${p.buttons.length} buttons, ${p.axes.length} axes, connected=${p.connected}`));
  }
};
