import { Game } from "./game/Game";
import { IS_BEDROCK } from "./bedrock";
import { GamepadManager } from "./input/GamepadManager";

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

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const game = new Game(canvas);
game.start();

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
