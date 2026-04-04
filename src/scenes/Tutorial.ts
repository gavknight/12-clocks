const TUTORIAL_KEY = "12clocks_tutorial_done";

const STEPS = [
  { emoji: "🎮", title: "Start a game", desc: "Tap the big yellow ▶ START GAME button on the main menu to begin your adventure!" },
  { emoji: "🗺️", title: "Choose a map", desc: "Pick a map to play on — each one has a different layout to explore." },
  { emoji: "😊", title: "Choose Easy", desc: "Select Easy mode to start. You'll need to find fewer clocks to win — great for beginners!" },
  { emoji: "🏆", title: "Win!", desc: "Find all the clocks and unlock them by entering the correct number. Unlock them all to win!" },
  { emoji: "🕹️", title: "Go to the Arcade", desc: "Head to the Arcade from the main menu — it's packed with fun mini-games!" },
  { emoji: "🎯", title: "Play a mini-game", desc: "Pick any mini-game and give it a go. Each one has different controls shown in-game." },
  { emoji: "🪙", title: "Earn coins", desc: "Playing mini-games earns you coins. Coins can be used to buy hints if you get stuck on a clock!" },
  { emoji: "⬅️", title: "Go back", desc: "When you're done in the Arcade, tap ← Back to return to the main menu and keep playing." },
  { emoji: "🎉", title: "Enjoy!", desc: "That's everything! You're ready to play 12 Clocks. Have fun and good luck finding all the clocks!" },
];

export function shouldShowTutorial(): boolean {
  return !localStorage.getItem(TUTORIAL_KEY);
}

export function showTutorial(onDone: () => void): void {
  let step = 0;

  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.85);" +
    "display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;padding:20px;";

  const render = () => {
    const s = STEPS[step];
    const isLast = step === STEPS.length - 1;
    ov.innerHTML = `
      <div style="background:linear-gradient(160deg,#1a0a3e,#3a106f);
        border:2px solid rgba(180,100,255,0.5);border-radius:24px;
        padding:32px 28px;max-width:340px;width:100%;text-align:center;
        box-shadow:0 8px 40px rgba(0,0,0,0.7);">

        <!-- Step counter -->
        <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:16px;letter-spacing:1px;">
          STEP ${step + 1} OF ${STEPS.length}
        </div>

        <!-- Dots -->
        <div style="display:flex;justify-content:center;gap:6px;margin-bottom:20px;">
          ${STEPS.map((_, i) => `
            <div style="width:8px;height:8px;border-radius:50%;
              background:${i === step ? "#cc88ff" : "rgba(255,255,255,0.2)"};
              transition:background 0.2s;"></div>
          `).join("")}
        </div>

        <div style="font-size:56px;margin-bottom:12px;">${s.emoji}</div>
        <div style="color:white;font-size:22px;font-weight:900;margin-bottom:12px;
          font-family:'Arial Black',Arial,sans-serif;">${s.title}</div>
        <div style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin-bottom:28px;">
          ${s.desc}
        </div>

        <div style="display:flex;gap:10px;justify-content:center;">
          ${step > 0 ? `<button id="tutBack" style="
            background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);
            font-size:14px;padding:10px 20px;border-radius:20px;
            border:1px solid rgba(255,255,255,0.2);cursor:pointer;">← Back</button>` : ""}
          <button id="tutNext" style="
            background:${isLast ? "#FFD700" : "linear-gradient(135deg,#cc88ff,#6a20a0)"};
            color:${isLast ? "#1a0060" : "white"};
            font-size:15px;font-weight:bold;padding:10px 28px;border-radius:20px;
            border:none;cursor:pointer;">
            ${isLast ? "🎉 Let's Play!" : "Next →"}
          </button>
        </div>

        <button id="tutSkip" style="margin-top:16px;background:none;border:none;
          color:rgba(255,255,255,0.25);font-size:12px;cursor:pointer;font-family:Arial,sans-serif;">
          Skip tutorial
        </button>
      </div>
    `;

    document.getElementById("tutNext")!.onclick = () => {
      if (isLast) finish();
      else { step++; render(); }
    };
    document.getElementById("tutBack")?.addEventListener("click", () => { step--; render(); });
    document.getElementById("tutSkip")!.onclick = finish;
  };

  const finish = () => {
    localStorage.setItem(TUTORIAL_KEY, "1");
    document.body.removeChild(ov);
    onDone();
  };

  document.body.appendChild(ov);
  render();
}
