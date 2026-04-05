const STEP_KEY = "12clocks_tutorial_step";

export const TUTORIAL_STEPS = [
  { id: "start",   instruction: "Tap ▶ START GAME to begin!" },
  { id: "map",     instruction: "Choose a map to play on!" },
  { id: "easy",    instruction: "Select Easy mode!" },
  { id: "win",     instruction: "Find all the clocks and WIN!" },
  { id: "arcade",  instruction: "Go to the 🕹️ Arcade!" },
  { id: "minigame",instruction: "Play any mini-game!" },
  { id: "coins",   instruction: "Earn coins by playing!" },
  { id: "back",    instruction: "Tap ← Back to leave the Arcade!" },
  { id: "enjoy",   instruction: "🎉 You're all set — Enjoy 12 Clocks!" },
];

export function getTutorialStep(): number {
  const v = parseInt(localStorage.getItem(STEP_KEY) ?? "-1");
  return isNaN(v) ? -1 : v;
}

export function isTutorialActive(): boolean {
  const s = getTutorialStep();
  return s >= 0 && s < TUTORIAL_STEPS.length;
}

export function startTutorial(): void {
  localStorage.setItem(STEP_KEY, "0");
  _renderBanner();
}

export function doneTutorial(): void {
  localStorage.setItem(STEP_KEY, String(TUTORIAL_STEPS.length));
  _removeBanner();
}

export function advanceTutorial(expectedId: string): void {
  const step = getTutorialStep();
  if (step < 0 || step >= TUTORIAL_STEPS.length) return;
  if (TUTORIAL_STEPS[step].id !== expectedId) return;

  // Show "Step Complete!" then advance
  const banner = document.getElementById("tutBanner");
  if (banner) {
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:22px;">✅</div>
        <div>
          <div style="color:#80ff80;font-size:13px;font-weight:900;font-family:'Arial Black',Arial;">STEP COMPLETE!</div>
          <div style="color:rgba(255,255,255,0.6);font-size:12px;font-family:Arial,sans-serif;">
            ${step + 1} / ${TUTORIAL_STEPS.length} done
          </div>
        </div>
      </div>`;
  }

  const next = step + 1;
  localStorage.setItem(STEP_KEY, String(next));

  setTimeout(() => {
    if (next >= TUTORIAL_STEPS.length) {
      doneTutorial();
    } else {
      _renderBanner();
    }
  }, 1200);
}

let _banner: HTMLDivElement | null = null;

function _removeBanner(): void {
  if (_banner && document.body.contains(_banner)) document.body.removeChild(_banner);
  _banner = null;
}

function _renderBanner(): void {
  _removeBanner();
  const step = getTutorialStep();
  if (step < 0 || step >= TUTORIAL_STEPS.length) return;

  _banner = document.createElement("div");
  _banner.id = "tutBanner";
  _banner.style.cssText =
    "position:fixed;bottom:64px;left:50%;transform:translateX(-50%);z-index:99990;" +
    "background:linear-gradient(135deg,#6a20a0,#3a106f);" +
    "border:3px solid #cc88ff;border-radius:20px;" +
    "padding:14px 22px;min-width:270px;max-width:340px;width:92%;" +
    "box-shadow:0 0 30px rgba(200,100,255,0.8),0 4px 24px rgba(0,0,0,0.6);pointer-events:none;";

  _banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="flex-shrink:0;background:rgba(180,100,255,0.25);border-radius:50%;
        width:36px;height:36px;display:flex;align-items:center;justify-content:center;
        color:#cc88ff;font-size:14px;font-weight:900;font-family:'Arial Black',Arial;">
        ${step + 1}/${TUTORIAL_STEPS.length}
      </div>
      <div style="flex:1;">
        <div style="color:rgba(200,150,255,0.7);font-size:10px;font-weight:bold;
          font-family:Arial,sans-serif;letter-spacing:1px;margin-bottom:2px;">TUTORIAL</div>
        <div style="color:white;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;">
          ${TUTORIAL_STEPS[step].instruction}
        </div>
      </div>
    </div>
    <!-- Progress bar -->
    <div style="margin-top:10px;height:4px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
      <div style="height:100%;width:${((step) / TUTORIAL_STEPS.length) * 100}%;
        background:linear-gradient(90deg,#cc88ff,#6a20a0);border-radius:4px;
        transition:width 0.4s;"></div>
    </div>`;

  document.body.appendChild(_banner);

  // Step 9 "enjoy" auto-completes after 3 seconds
  if (TUTORIAL_STEPS[step].id === "enjoy") {
    setTimeout(() => advanceTutorial("enjoy"), 3000);
  }
}

// Re-show banner on page load if tutorial is in progress
if (isTutorialActive()) {
  // Small delay so the game UI loads first
  setTimeout(_renderBanner, 800);
}
