import type { Game } from "../../game/Game";

export class FakeGoogle {
  private _g: Game;
  private _wrap!: HTMLDivElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow-y:auto;background:white;" +
      "pointer-events:all;font-family:Arial,sans-serif;";
    g.ui.appendChild(this._wrap);
    this._showSearch();
  }

  private _query = "";

  private _showSearch(): void {
    this._wrap.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;padding:60px 20px 20px;">
        <div style="font-size:64px;font-weight:900;margin-bottom:20px;letter-spacing:-2px;">
          <span style="color:#4285F4;">G</span><span style="color:#EA4335;">o</span><span style="color:#FBBC05;">o</span><span style="color:#4285F4;">g</span><span style="color:#34A853;">l</span><span style="color:#EA4335;">e</span>
        </div>
        <div style="display:flex;align-items:center;border:1px solid #dfe1e5;border-radius:24px;
          padding:10px 18px;width:90%;max-width:500px;box-shadow:0 2px 8px rgba(0,0,0,0.1);gap:10px;">
          <span style="font-size:18px;">🔍</span>
          <input id="searchInput" type="text" placeholder="Search Google"
            style="border:none;outline:none;font-size:16px;width:100%;color:#333;"/>
        </div>
        <button id="searchBtn" style="margin-top:20px;background:#f8f9fa;border:1px solid #f8f9fa;
          border-radius:4px;color:#3c4043;font-size:14px;padding:10px 20px;cursor:pointer;">
          Google Search
        </button>
        <button id="exitBtn" style="position:fixed;top:12px;right:12px;background:rgba(0,0,0,0.1);
          color:#333;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;font-size:16px;">✕</button>
      </div>
    `;
    const input = document.getElementById("searchInput") as HTMLInputElement;
    const doSearch = () => {
      this._query = input.value.trim() || "how to make a youtube channel";
      this._showResults();
    };
    document.getElementById("searchBtn")!.onclick = doSearch;
    input.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") doSearch(); });
    document.getElementById("exitBtn")!.onclick = () => this._cleanup();
  }

  private _showResults(): void {
    const q = this._query;
    const count = (Math.floor(Math.random() * 9) + 1) + "," + Math.floor(Math.random() * 900 + 100) + ",000,000";
    const secs = (Math.random() * 0.8 + 0.2).toFixed(2);
    this._wrap.innerHTML = `
      <div style="padding:16px 20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;border-bottom:1px solid #ebebeb;padding-bottom:12px;">
          <div style="font-size:28px;font-weight:900;">
            <span style="color:#4285F4;">G</span><span style="color:#EA4335;">o</span><span style="color:#FBBC05;">o</span><span style="color:#4285F4;">g</span><span style="color:#34A853;">l</span><span style="color:#EA4335;">e</span>
          </div>
          <div style="display:flex;align-items:center;border:1px solid #dfe1e5;border-radius:24px;
            padding:8px 14px;flex:1;max-width:500px;gap:8px;">
            <span>🔍</span>
            <span style="color:#333;font-size:15px;">${q}</span>
          </div>
        </div>

        <div style="max-width:600px;">
          <div style="color:#70757a;font-size:13px;margin-bottom:16px;">About ${count} results (${secs} seconds)</div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;cursor:pointer;text-decoration:underline;" id="result1">How to Start a YouTube Channel — Do YOU want one?</div>
            <div style="color:#006621;font-size:13px;">www.youtube.com › start › channel</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">You searched "<b>${q}</b>" — interesting choice. But have you considered YouTube?</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">${q} — Wikipedia</div>
            <div style="color:#006621;font-size:13px;">en.wikipedia.org › wiki › ${q.replace(/ /g, "_")}</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">${q} is a topic that has been studied extensively. Nobody knows anything about it.</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">Top 10 facts about "${q}" you won't believe</div>
            <div style="color:#006621;font-size:13px;">www.fakeblog.fake › ${q.replace(/ /g, "-")}</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">Number 7 will shock you. Number 3 doesn't exist.</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">Is "${q}" real? Experts disagree</div>
            <div style="color:#006621;font-size:13px;">www.science.fake › research › ${q.replace(/ /g, "-")}</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">Scientists have been arguing about ${q} since 1742. Still no answer.</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">${q} tier list (updated 2026)</div>
            <div style="color:#006621;font-size:13px;">www.tierlistmaker.fake › ${q.replace(/ /g, "-")}</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">Community voted. ${q} ranked S tier by 3 people and F tier by everyone else.</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">I searched "${q}" and this happened</div>
            <div style="color:#006621;font-size:13px;">www.reddit.com › r › ${q.replace(/ /g, "")} › comments</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">Posted 4 hours ago · 2 upvotes · 1 comment · "ok"</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">${q} for dummies — full guide</div>
            <div style="color:#006621;font-size:13px;">www.fordummies.fake › ${q.replace(/ /g, "-")}-for-dummies</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">624 pages. Chapter 1: What is ${q}? Chapter 2: We still don't know.</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">${q} — Amazon results</div>
            <div style="color:#006621;font-size:13px;">www.amazon.com › s › ${q.replace(/ /g, "+")}</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">14,892 results for "${q}". Sponsored: ${q} themed mug — $47.99. Free shipping.</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">My honest review of ${q}</div>
            <div style="color:#006621;font-size:13px;">www.honestreviews.fake › ${q.replace(/ /g, "-")}-review</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">⭐⭐⭐☆☆ — "It was okay I guess. My cat knocked it over." — GamerDude99</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">Why does everyone Google "${q}"?</div>
            <div style="color:#006621;font-size:13px;">www.buzzfeed.fake › ${q.replace(/ /g, "-")}-google-trend</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">You and 4 other people searched this today. You're basically famous.</div>
          </div>

          <div style="margin-bottom:24px;">
            <div style="color:#1a0dab;font-size:18px;">${q} — did you mean something else?</div>
            <div style="color:#006621;font-size:13px;">www.google.com › search › did-you-mean</div>
            <div style="color:#545454;font-size:14px;margin-top:4px;">Did you mean: "<i>how to make a YouTube channel</i>"? We think you did.</div>
          </div>

        </div>

        <button id="exitBtn" style="position:fixed;top:12px;right:12px;background:rgba(0,0,0,0.1);
          color:#333;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;font-size:16px;">✕</button>
      </div>
    `;
    document.getElementById("result1")!.onclick = () => this._showQuiz();
    document.getElementById("exitBtn")!.onclick = () => this._cleanup();
  }

  private _showQuiz(): void {
    this._wrap.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        min-height:100%;padding:40px 20px;text-align:center;">

        <div style="font-size:48px;margin-bottom:16px;">📺</div>
        <div style="font-size:22px;font-weight:bold;color:#333;margin-bottom:8px;">
          Do you want to start a YouTube channel?
        </div>
        <div style="font-size:14px;color:#70757a;margin-bottom:32px;">Think carefully.</div>

        <div style="display:flex;gap:16px;">
          <button id="yesBtn" style="background:#4285F4;color:white;font-size:18px;font-weight:bold;
            padding:14px 36px;border-radius:8px;border:none;cursor:pointer;">Yes</button>
          <button id="noBtn" style="background:#f8f9fa;color:#333;font-size:18px;font-weight:bold;
            padding:14px 36px;border-radius:8px;border:1px solid #ddd;cursor:pointer;">No</button>
        </div>

        <button id="exitBtn" style="position:fixed;top:12px;right:12px;background:rgba(0,0,0,0.1);
          color:#333;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;font-size:16px;">✕</button>
      </div>
    `;
    document.getElementById("yesBtn")!.onclick = () => this._showYes();
    document.getElementById("noBtn")!.onclick = () => this._showNo();
    document.getElementById("exitBtn")!.onclick = () => this._cleanup();
  }

  private _showNo(): void {
    this._wrap.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        min-height:100%;padding:40px 20px;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;">🙈</div>
        <div style="font-size:28px;font-weight:900;color:#EA4335;margin-bottom:12px;">You're blind.</div>
        <div style="font-size:16px;color:#70757a;margin-bottom:32px;">YouTube is RIGHT there. How could you say no??</div>
        <button id="backBtn" style="background:#4285F4;color:white;font-size:16px;
          padding:12px 28px;border-radius:8px;border:none;cursor:pointer;">← Go Back</button>
        <button id="exitBtn" style="position:fixed;top:12px;right:12px;background:rgba(0,0,0,0.1);
          color:#333;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;font-size:16px;">✕</button>
      </div>
    `;
    document.getElementById("backBtn")!.onclick = () => this._showQuiz();
    document.getElementById("exitBtn")!.onclick = () => this._cleanup();
  }

  private _showYes(): void {
    this._wrap.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
        min-height:100%;padding:40px 20px;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;">🎉</div>
        <div style="font-size:28px;font-weight:900;color:#34A853;margin-bottom:16px;">Terrific!</div>
        <div style="font-size:17px;color:#333;margin-bottom:8px;line-height:1.8;">
          Push <span id="ytLink" style="color:#4285F4;font-weight:bold;text-decoration:underline;cursor:pointer;">YouTube</span> to go to YouTube.
        </div>
        <div style="font-size:14px;color:#70757a;margin-bottom:32px;">You're going places. Big places.</div>

        <!-- I am not a robot -->
        <div style="background:#f8f9fa;border:1px solid #ddd;border-radius:8px;
          padding:16px 24px;display:flex;align-items:center;gap:14px;margin-bottom:24px;">
          <input type="checkbox" id="robotCheck" style="width:22px;height:22px;cursor:pointer;"/>
          <label for="robotCheck" style="font-size:15px;color:#333;cursor:pointer;">I am not a robot</label>
          <div style="margin-left:8px;text-align:center;">
            <div style="font-size:24px;">🤖</div>
            <div style="font-size:9px;color:#70757a;">reCAPTCHA</div>
          </div>
        </div>

        <button id="exitBtn" style="position:fixed;top:12px;right:12px;background:rgba(0,0,0,0.1);
          color:#333;width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;font-size:16px;">✕</button>
      </div>
    `;
    document.getElementById("ytLink")!.onclick = () => {
      window.open("https://www.youtube.com", "_blank");
    };
    const check = document.getElementById("robotCheck") as HTMLInputElement;
    check.onchange = () => {
      if (check.checked) {
        setTimeout(() => {
          check.parentElement!.style.background = "#e6f4ea";
          check.parentElement!.style.borderColor = "#34A853";
        }, 800);
      }
    };
    document.getElementById("exitBtn")!.onclick = () => this._cleanup();
  }

  private _cleanup(): void {
    this._wrap.remove();
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}
