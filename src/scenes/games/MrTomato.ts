/**
 * Mr. Tomato — Feed the giant tomato or face the consequences!
 */
import type { Game } from "../../game/Game";

// ── Food pools ────────────────────────────────────────────────────────────────
const FOODS = [
  { name: "Pizza",      emoji: "🍕" },
  { name: "Cake",       emoji: "🍰" },
  { name: "Steak",      emoji: "🥩" },
  { name: "Ice Cream",  emoji: "🍦" },
  { name: "Apple",      emoji: "🍎" },
  { name: "Banana",     emoji: "🍌" },
  { name: "Burger",     emoji: "🍔" },
  { name: "Chicken",    emoji: "🍗" },
  { name: "Taco",       emoji: "🌮" },
  { name: "Noodles",    emoji: "🍜" },
  { name: "Sushi",      emoji: "🍣" },
  { name: "Donut",      emoji: "🍩" },
  { name: "Cookie",     emoji: "🍪" },
  { name: "Fries",      emoji: "🍟" },
  { name: "Cupcake",    emoji: "🧁" },
  { name: "Egg",        emoji: "🥚" },
  { name: "Salad",      emoji: "🥗" },
  { name: "Strawberry", emoji: "🍓" },
];
const BODY_PARTS = [
  { name: "Bone",  emoji: "🦴" },
  { name: "Heart", emoji: "🫀" },
  { name: "Brain", emoji: "🧠" },
  { name: "Eye",   emoji: "👁️" },
  { name: "Skull", emoji: "💀" },
];

// ── Shop items ────────────────────────────────────────────────────────────────
const SHOP_ITEMS = [
  { id: "normalizer", name: "Sound Normalizer", emoji: "🔊",
    desc: "When Mr. Tomato crashes out, it sounds like he just said what he wanted.", price: 80 },
  { id: "scissors",   name: "Scissors",         emoji: "✂️",
    desc: "Open mystery bags. Without these, ? bags count as wrong answers.",          price: 60 },
  { id: "candy",      name: "Sweet Candy",       emoji: "🍬",
    desc: "Resets Mr. Tomato's anger to zero instantly.",                               price: 50 },
  { id: "knife",      name: "The Knife",          emoji: "🔪",
    desc: "Use in-game to end Mr. Tomato permanently. Special ending.",                 price: 500 },
  { id: "idcard",     name: "ID Card",            emoji: "🪪",
    desc: "Delete Mr. Tomato from the game. He's gone until you forgive him.",          price: 500 },
] as const;
type ItemId = typeof SHOP_ITEMS[number]["id"];

// ── Blender recipes ───────────────────────────────────────────────────────────
const BLENDS: Record<string, { name: string; emoji: string }> = {
  "🥩🥚": { name: "Steak & Eggs",    emoji: "🍳" },
  "🥚🥩": { name: "Steak & Eggs",    emoji: "🍳" },
  "🍎🍌": { name: "Fruit Smoothie",  emoji: "🥤" },
  "🍌🍎": { name: "Fruit Smoothie",  emoji: "🥤" },
  "🍓🍌": { name: "Berry Shake",     emoji: "🥤" },
  "🍌🍓": { name: "Berry Shake",     emoji: "🥤" },
  "🍕🍕": { name: "Double Pizza",    emoji: "🍕" },
  "🍔🍟": { name: "Combo Meal",      emoji: "🍱" },
  "🍟🍔": { name: "Combo Meal",      emoji: "🍱" },
};

export class MrTomato {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _owned    = new Set<ItemId>();
  private _points   = 0;
  private _round    = 1;
  private _forgiven   = false;
  private _debugState: { foodsLeft: number; anger: number } | null = null;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;background:#1a0000;pointer-events:all;font-family:Arial,sans-serif;";
    g.ui.appendChild(this._wrap);
    this._buildLobby();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // LOBBY
  // ══════════════════════════════════════════════════════════════════════════════

  private _buildLobby(): void {
    this._wrap.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    this._wrap.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    let t = 0;

    const resize = () => {
      canvas.width  = this._wrap.clientWidth  || window.innerWidth;
      canvas.height = this._wrap.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let blenderRect = { x:0,y:0,w:0,h:0 };
    let shopRect    = { x:0,y:0,w:0,h:0 };
    let exitRect    = { x:0,y:0,w:0,h:0 };
    let adminRect   = { x:0,y:0,w:0,h:0 };

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      ctx.clearRect(0, 0, W, H);

      // Sunburst
      for (let i = 0; i < 16; i++) {
        const a1 = (i / 16) * Math.PI * 2 + t * 0.10;
        const a2 = ((i + 0.5) / 16) * Math.PI * 2 + t * 0.10;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, Math.max(W, H) * 1.5, a1, a2);
        ctx.fillStyle = i % 2 === 0 ? "#00cfcf" : "#ff40a0";
        ctx.fill();
      }

      // Title bubble
      const titleW = W * 0.46, titleH = H * 0.14, titleY = H * 0.07;
      ctx.fillStyle = "#cc1010";
      ctx.beginPath();
      ctx.roundRect(cx - titleW/2, titleY, titleW, titleH, titleH/2);
      ctx.fill();
      ctx.strokeStyle = "#ff7070"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#ffe060";
      ctx.font = `900 ${Math.min(titleH * 0.50, 36)}px 'Arial Black',Arial`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("MR. TOMATOS", cx, titleY + titleH / 2);

      // Blender (left)
      const bx = W * 0.18, by = cy + H * 0.02, bs = Math.min(W, H) * 0.27;
      blenderRect = { x: bx - bs*0.38, y: by - bs*0.55, w: bs*0.76, h: bs*1.1 };
      _drawBlender(ctx, bx, by, bs, t);

      // Mr. Tomato (right)
      const tr = Math.min(W, H) * 0.22;
      _drawTomato(ctx, W * 0.80, cy + H * 0.04, tr, { mood: "neutral", t });

      // Menu
      const mcy = H * 0.38, gap = H * 0.13;
      ctx.fillStyle = "#ffe060";
      ctx.font = `900 ${Math.min(H*0.065, 30)}px 'Arial Black',Arial`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("HOW TO PLAY", cx, mcy);

      ctx.fillText("SHOP", cx, mcy + gap);
      const sw = ctx.measureText("SHOP").width;
      shopRect = { x: cx - sw/2, y: mcy + gap - 22, w: sw, h: 44 };

      // EXIT pill
      const exitW = W*0.22, exitH = H*0.10, exitY = mcy + gap*2;
      exitRect = { x: cx-exitW/2, y: exitY-exitH/2, w: exitW, h: exitH };
      ctx.fillStyle = "#cc1010";
      ctx.beginPath();
      ctx.roundRect(cx-exitW/2, exitY-exitH/2, exitW, exitH, exitH/2);
      ctx.fill();
      ctx.strokeStyle = "#ff5050"; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = "#ffe060";
      ctx.font = `900 ${Math.min(exitH*0.5, 26)}px 'Arial Black',Arial`;
      ctx.fillText("EXIT", cx, exitY);

      // Points + round chip
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath(); ctx.roundRect(8, 8, 160, 46, 14); ctx.fill();
      ctx.fillStyle = "#ffcc80"; ctx.font = `bold 13px Arial`;
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`🍅 ${this._points} pts`, 16, 22);
      ctx.fillStyle = "rgba(255,200,100,0.6)"; ctx.font = `12px Arial`;
      ctx.fillText(`Round ${this._round} / 10`, 16, 40);

      // Admin button (bottom-left, small lock icon)
      const abSize = 36;
      const abX = 10, abY = H - abSize - 10;
      adminRect = { x: abX, y: abY, w: abSize, h: abSize };
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.roundRect(abX, abY, abSize, abSize, 8); ctx.fill();
      ctx.font = `18px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🔒", abX + abSize/2, abY + abSize/2);
    };

    const loop = () => {
      if (!this._wrap.isConnected) return;
      requestAnimationFrame(loop);
      t += 0.016;
      draw();
    };
    requestAnimationFrame(loop);

    const hit = (e: MouseEvent, rect: {x:number;y:number;w:number;h:number}) => {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) * (canvas.width  / r.width);
      const my = (e.clientY - r.top)  * (canvas.height / r.height);
      return mx >= rect.x && mx <= rect.x+rect.w && my >= rect.y && my <= rect.y+rect.h;
    };
    canvas.addEventListener("click", (e) => {
      if (hit(e, blenderRect))  this._startGame();
      else if (hit(e, shopRect))  this._buildShop();
      else if (hit(e, exitRect))  this._cleanup();
      else if (hit(e, adminRect)) this._adminPanel();
    });
    canvas.addEventListener("mousemove", (e) => {
      canvas.style.cursor =
        hit(e, blenderRect) || hit(e, shopRect) || hit(e, exitRect) || hit(e, adminRect)
          ? "pointer" : "default";
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SHOP
  // ══════════════════════════════════════════════════════════════════════════════

  private _buildShop(): void {
    this._wrap.innerHTML = "";
    const ui = document.createElement("div");
    ui.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(160deg,#1a0000,#2d0000);" +
      "display:flex;flex-direction:column;align-items:center;overflow-y:auto;padding:24px 16px 60px;";
    this._wrap.appendChild(ui);

    ui.innerHTML = `
      <div style="width:100%;max-width:480px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-size:22px;font-weight:900;color:#ff2020;letter-spacing:2px;">🛒 SHOP</div>
        <div style="background:rgba(255,0,0,0.12);border:1px solid rgba(255,60,60,0.35);border-radius:16px;
          padding:4px 14px;color:#ff8080;font-size:14px;font-weight:bold;">🍅 ${this._points} pts</div>
      </div>`;

    const back = document.createElement("button");
    back.textContent = "← Back to Lobby";
    back.style.cssText =
      "background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);font-size:13px;" +
      "padding:7px 18px;border-radius:16px;border:1px solid rgba(255,255,255,0.15);cursor:pointer;" +
      "margin-bottom:18px;align-self:flex-start;";
    back.onclick = () => this._buildLobby();
    ui.appendChild(back);

    for (const item of SHOP_ITEMS) {
      const owned = this._owned.has(item.id);
      const canAfford = this._points >= item.price;
      const card = document.createElement("div");
      card.style.cssText =
        `width:100%;max-width:480px;background:rgba(255,30,30,0.08);` +
        `border:2px solid ${owned ? "rgba(255,120,120,0.6)" : "rgba(255,30,30,0.25)"};` +
        `border-radius:16px;padding:16px 18px;margin-bottom:12px;display:flex;align-items:center;gap:14px;`;
      card.innerHTML = `
        <div style="font-size:34px;flex-shrink:0;">${item.emoji}</div>
        <div style="flex:1;">
          <div style="color:white;font-size:15px;font-weight:bold;margin-bottom:3px;">${item.name}</div>
          <div style="color:rgba(255,180,180,0.6);font-size:12px;line-height:1.5;">${item.desc}</div>
        </div>`;
      const btn = document.createElement("button");
      if (owned) {
        btn.textContent = "✓ Owned";
        btn.style.cssText = "background:rgba(255,120,120,0.2);color:#ff8080;font-size:13px;font-weight:bold;" +
          "padding:8px 14px;border-radius:12px;border:1px solid rgba(255,120,120,0.4);cursor:default;white-space:nowrap;";
      } else {
        btn.textContent = `${item.price} pts`;
        btn.style.cssText =
          `background:${canAfford ? "rgba(255,40,40,0.3)" : "rgba(60,60,60,0.3)"};` +
          `color:${canAfford ? "#ff6060" : "rgba(255,255,255,0.2)"};font-size:13px;font-weight:bold;` +
          `padding:8px 14px;border-radius:12px;` +
          `border:1px solid ${canAfford ? "rgba(255,60,60,0.4)" : "rgba(80,80,80,0.3)"};` +
          `cursor:${canAfford ? "pointer" : "not-allowed"};white-space:nowrap;`;
        if (canAfford) {
          btn.onclick = () => {
            this._points -= item.price;
            this._owned.add(item.id);
            this._buildShop();
          };
        }
      }
      card.appendChild(btn);
      ui.appendChild(card);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // GAME
  // ══════════════════════════════════════════════════════════════════════════════

  private _startGame(): void {
    this._wrap.innerHTML = "";

    // ── State ──────────────────────────────────────────────────────────────────
    let anger     = this._debugState?.anger    ?? 0;
    let points    = this._points;
    let foodsLeft = this._debugState?.foodsLeft ?? 10;
    const round   = this._round;  // this round's number — fixed for this session
    this._debugState = null; // consume it
    let isEvil   = false;
    let done     = false;
    let t        = 0;
    let mood     = "neutral";
    let moodT    = 0;

    let feedT    = 0;
    let wanted   = FOODS[0];

    // ── Canvas ─────────────────────────────────────────────────────────────────
    const cv = document.createElement("canvas");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    this._wrap.appendChild(cv);
    const ctx = cv.getContext("2d")!;
    const resize = () => {
      cv.width  = this._wrap.clientWidth  || window.innerWidth;
      cv.height = this._wrap.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // ── HUD (HTML) ─────────────────────────────────────────────────────────────
    const hud = document.createElement("div");
    hud.style.cssText = "position:absolute;inset:0;pointer-events:none;font-family:'Arial Black',Arial;";
    this._wrap.appendChild(hud);

    // Anger — top left
    const angerDiv = document.createElement("div");
    angerDiv.style.cssText =
      "position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.65);" +
      "border:2px solid rgba(255,60,60,0.5);border-radius:14px;padding:8px 14px;min-width:150px;";
    hud.appendChild(angerDiv);

    // Points + foods — top right
    const ptsDiv = document.createElement("div");
    ptsDiv.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.65);" +
      "border:2px solid rgba(255,215,0,0.4);border-radius:14px;padding:8px 14px;text-align:right;";
    hud.appendChild(ptsDiv);

    // Feedback message — center
    const feedEl = document.createElement("div");
    feedEl.style.cssText =
      "position:absolute;top:44%;left:50%;transform:translate(-50%,-50%);" +
      "font-size:clamp(18px,4vw,34px);font-weight:900;text-align:center;" +
      "pointer-events:none;opacity:0;text-shadow:2px 2px 8px rgba(0,0,0,0.9);transition:opacity 0.15s;";
    hud.appendChild(feedEl);

    // Back button
    const backBtn = document.createElement("button");
    backBtn.textContent = "✕";
    backBtn.style.cssText =
      "position:absolute;top:14px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,0,0,0.5);color:rgba(255,255,255,0.4);font-size:14px;" +
      "width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,0.2);" +
      "cursor:pointer;pointer-events:all;";
    backBtn.onclick = () => { done = true; this._buildLobby(); };
    hud.appendChild(backBtn);

    const updateHUD = () => {
      const bars = Array.from({length:10}, (_,i) => {
        const col = i < anger ? (anger >= 8 ? "#ff2020" : anger >= 5 ? "#ff8800" : "#ffcc00") : "rgba(255,255,255,0.12)";
        return `<span style="display:inline-block;width:13px;height:13px;border-radius:3px;margin:1px;background:${col};"></span>`;
      }).join("");
      angerDiv.innerHTML =
        `<div style="font-size:10px;color:rgba(255,180,180,0.6);letter-spacing:1px;margin-bottom:3px;">ANGER LEVEL</div>` +
        `<div>${bars}</div>` +
        `<div style="color:#ff8080;font-size:11px;margin-top:2px;">${anger}/10</div>`;

      ptsDiv.innerHTML =
        `<div style="font-size:10px;color:rgba(255,215,0,0.6);letter-spacing:1px;">POINTS</div>` +
        `<div style="font-size:24px;font-weight:900;color:#FFD700;">${points}</div>` +
        `<div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;">Feed ${foodsLeft} more</div>` +
        `<div style="font-size:10px;color:rgba(255,255,255,0.3);">Round ${round}/10</div>`;
    };
    updateHUD();

    // ── Food row (HTML) ────────────────────────────────────────────────────────
    const foodRow = document.createElement("div");
    foodRow.style.cssText =
      "position:absolute;bottom:23%;left:50%;transform:translateX(-50%);" +
      "display:flex;gap:clamp(8px,2vw,22px);pointer-events:all;";
    this._wrap.appendChild(foodRow);

    // ── Utilities bar (HTML) ────────────────────────────────────────────────────
    const utilBar = document.createElement("div");
    utilBar.style.cssText =
      "position:absolute;bottom:14px;right:14px;display:flex;gap:8px;pointer-events:all;";
    this._wrap.appendChild(utilBar);

    const UTILS = [
      { id: "normalizer" as ItemId, emoji: "🔊" },
      { id: "scissors"   as ItemId, emoji: "✂️" },
      { id: "candy"      as ItemId, emoji: "🍬" },
      { id: "knife"      as ItemId, emoji: "🔪" },
      { id: "idcard"     as ItemId, emoji: "🪪" },
    ];

    // ── Voice ──────────────────────────────────────────────────────────────────
    const speak = (text: string, evil = false) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate  = evil ? 0.75 : 1.1;
      u.pitch = evil ? 0.4  : 1.3;
      u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const pick = voices.find(v => /male/i.test(v.name)) ?? voices[0];
      if (pick) u.voice = pick;
      window.speechSynthesis.speak(u);
    };

    const showFeed = (msg: string, color: string) => {
      feedEl.textContent = msg;
      feedEl.style.color = color;
      feedEl.style.opacity = "1";
      feedT = 1.6;
    };

    // ── Chat bar ───────────────────────────────────────────────────────────────
    const chatWrap = document.createElement("div");
    chatWrap.style.cssText =
      "position:absolute;bottom:14px;left:14px;display:flex;gap:8px;pointer-events:all;" +
      "align-items:center;";
    this._wrap.appendChild(chatWrap);

    const chatInp = document.createElement("input");
    chatInp.type = "text";
    chatInp.placeholder = "Say something...";
    chatInp.maxLength = 60;
    chatInp.style.cssText =
      "background:rgba(0,0,0,0.55);border:1px solid rgba(255,60,60,0.35);border-radius:20px;" +
      "color:#ffcccc;font-size:13px;padding:8px 14px;width:170px;outline:none;font-family:Arial;";
    const chatSend = document.createElement("button");
    chatSend.textContent = "➤";
    chatSend.style.cssText =
      "background:rgba(255,20,20,0.25);color:#ff6060;font-size:14px;" +
      "width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,40,40,0.3);cursor:pointer;";

    chatWrap.appendChild(chatInp);
    chatWrap.appendChild(chatSend);

    let refusals = 0;
    const REFUSAL_REPLIES = ["Yes.", "Yes you are.", "You will.", "I said YES.", "..."];

    const CHAT_RESPONSES: Array<[RegExp, string, boolean]> = [
      [/\b(fat|fatty|chubby|obese|huge|big)\b/i,                "__FAT__",                    false],
      [/(not|won'?t|will not|refuse|never).{0,12}feed/i,        "__REFUSE__",                 false],
      [/\bsorry\b/i,                                             "Feed me and we'll talk.",    false],
      [/\b(hi|hello|hey)\b/i,                                    "FEED ME.",                   false],
      [/\bplease\b/i,                                            "NOW.",                       false],
      [/\bno\b/i,                                                "YES.",                       false],
      [/\bwhy\b/i,                                               "Because I said so.",         false],
      [/\blove\b/i,                                              "Feed me more.",              false],
      [/\bhate\b/i,                                              "I don't care. Feed me.",     false],
      [/\bstop\b/i,                                              "Never.",                     false],
      [/\b(help|save me)\b/i,                                    "No one can help you.",       true ],
      [/\b(scared|fear)\b/i,                                     "Good.",                      true ],
    ];

    const sendChat = () => {
      if (done) return;
      const msg = chatInp.value.trim();
      if (!msg) return;
      chatInp.value = "";

      let reply = "...feed me.";
      let useEvil = isEvil;
      for (const [re, res, ev] of CHAT_RESPONSES) {
        if (re.test(msg)) {
          if (res === "__FAT__") {
            done = true;
            window.speechSynthesis?.cancel();
            speak("WHAT did you just call me?!", false);
            setTimeout(() => _fatEnding(this._wrap, () => this._buildLobby()), 800);
            return;
          }
          if (res === "__REFUSE__") {
            refusals++;
            reply = REFUSAL_REPLIES[Math.min(refusals - 1, REFUSAL_REPLIES.length - 1)];
            speak(reply, false);
            showFeed(`🍅 "${reply}"`, "#ffccaa");
            if (refusals >= 5) {
              done = true;
              setTimeout(() => _cryingEnding(this._wrap, () => this._buildLobby()), 900);
            }
            return;
          }
          reply = res; useEvil = ev || isEvil; break;
        }
      }
      speak(reply, useEvil);
      showFeed(`🍅 "${reply}"`, useEvil ? "#ff4040" : "#ffccaa");
    };

    chatSend.onclick = sendChat;
    chatInp.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });

    const useUtil = (id: ItemId) => {
      if (id === "candy" && !isEvil) {
        anger = 0; mood = "happy"; moodT = 1.5;
        showFeed("🍬 Anger reset!", "#ffe060");
        updateHUD();
      } else if (id === "knife") {
        done = true;
        if (isEvil) _heroEnding(this._wrap, points, () => this._buildLobby());
        else _knifeEnding(this._wrap, () => this._buildLobby());
      } else if (id === "idcard") {
        done = true;
        _idEnding(this._wrap, points, () => this._buildLobby());
      }
    };

    for (const u of UTILS) {
      const owned = this._owned.has(u.id);
      const btn = document.createElement("div");
      btn.style.cssText =
        `width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center;` +
        `background:${owned ? "rgba(255,255,180,0.12)" : "rgba(0,0,0,0.55)"};` +
        `border:2px solid ${owned ? "rgba(255,255,100,0.4)" : "rgba(60,60,60,0.5)"};` +
        `cursor:${owned ? "pointer" : "default"};` +
        `filter:${owned ? "none" : "grayscale(1) brightness(0.2)"};font-size:24px;user-select:none;`;
      btn.title = u.id;
      btn.textContent = u.emoji;
      if (owned) btn.addEventListener("click", () => useUtil(u.id));
      utilBar.appendChild(btn);
    }

    // ── Game logic ─────────────────────────────────────────────────────────────

    const mkFoodBtn = (food: {name:string;emoji:string}, correct: boolean, bag: boolean) => {
      const btn = document.createElement("div");
      btn.style.cssText =
        "display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;" +
        "background:rgba(255,255,255,0.10);border:3px solid rgba(255,255,255,0.22);" +
        "border-radius:18px;padding:12px 16px;min-width:72px;transition:transform 0.1s;";
      btn.onmouseenter = () => btn.style.transform = "scale(1.1)";
      btn.onmouseleave = () => btn.style.transform = "";

      if (bag) {
        btn.innerHTML =
          `<div style="font-size:clamp(26px,5vw,46px);">🎒</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.55);">? Bag</div>`;
        btn.addEventListener("click", () => {
          if (this._owned.has("scissors")) {
            btn.innerHTML =
              `<div style="font-size:clamp(26px,5vw,46px);">${food.emoji}</div>` +
              `<div style="font-size:11px;color:rgba(255,255,255,0.55);">${food.name}</div>`;
            setTimeout(() => feed(food, correct), 400);
          } else feed({ name:"?", emoji:"🎒" }, false);
        });
      } else {
        btn.innerHTML =
          `<div style="font-size:clamp(26px,5vw,46px);">${food.emoji}</div>` +
          `<div style="font-size:11px;color:rgba(255,255,255,0.55);">${food.name}</div>`;
        btn.addEventListener("click", () => feed(food, correct));
      }
      return btn;
    };

    const feed = (_food: {name:string;emoji:string}, correct: boolean) => {
      if (done) return;
      foodRow.innerHTML = "";
      if (correct) {
        points += 10; foodsLeft--;
        this._points = points;
        mood = "happy"; moodT = 1.2;
        showFeed("✅ Good for you!", "#80ff80");
        speak(["Mmm!", "Yes!", "More!", "Delicious!", "Finally."][Math.floor(Math.random()*5)]);
        updateHUD();
        setTimeout(() => { if (!done) foodsLeft <= 0 ? roundComplete() : newTurn(); }, 1000);
      } else {
        anger++;
        mood = "angry"; moodT = 1.0;
        showFeed("❌ Wrong!", "#ff6060");
        speak(["WRONG!", "That is NOT what I wanted!", "How dare you.", "Try again!"][Math.floor(Math.random()*4)]);
        updateHUD();
        if (anger >= 10) {
          // Special endings when anger hits 10 on the LAST food
          if (foodsLeft === 1) {
            if (this._forgiven && this._owned.has("knife")) {
              done = true;
              setTimeout(() => _knifeTakenEnding(this._wrap, () => this._buildLobby()), 600);
              return;
            } else if (!this._forgiven) {
              done = true;
              this._forgiven = true;
              setTimeout(() => _forgivenessEnding(this._wrap, () => this._buildLobby()), 600);
              return;
            }
            // Already forgiven but no knife — evil mode continues normally
          }
          isEvil = true;
          mood = "evil";
          setTimeout(() => { if (!done) evilTurn(); }, 900);
        } else {
          setTimeout(() => { if (!done) newTurn(); }, 1000);
        }
      }
    };

    const evilTurn = () => {
      if (done) return;
      foodRow.innerHTML = "";
      showFeed("💀 FEED ME...", "#ff2020");
      speak("Feed me...", true);
      setTimeout(() => {
        if (done) return;
        const parts = [...BODY_PARTS].sort(() => Math.random() - 0.5).slice(0, 3);
        for (const p of parts) {
          const btn = document.createElement("div");
          btn.style.cssText =
            "display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;" +
            "background:rgba(80,0,0,0.5);border:3px solid rgba(200,0,0,0.5);" +
            "border-radius:18px;padding:12px 16px;min-width:72px;transition:transform 0.1s;";
          btn.innerHTML =
            `<div style="font-size:clamp(26px,5vw,46px);">${p.emoji}</div>` +
            `<div style="font-size:11px;color:rgba(255,100,100,0.8);">${p.name}</div>`;
          btn.onmouseenter = () => btn.style.transform = "scale(1.1)";
          btn.onmouseleave = () => btn.style.transform = "";
          btn.addEventListener("click", () => jumpscare());
          foodRow.appendChild(btn);
        }
      }, 1200);
    };

    const jumpscare = () => {
      done = true;
      foodRow.innerHTML = "";
      const ov = document.createElement("div");
      ov.style.cssText =
        "position:fixed;inset:0;z-index:9999;background:#ff0000;" +
        "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;" +
        "font-family:'Arial Black',Arial;animation:shake 0.08s infinite;";
      ov.innerHTML =
        `<div style="font-size:clamp(80px,18vw,150px);">🍅</div>` +
        `<div style="color:white;font-size:clamp(22px,5vw,48px);font-weight:900;text-shadow:3px 3px 0 black;">FEED ME!!!</div>`;
      const retry = document.createElement("button");
      retry.textContent = "🔄 Try Again";
      retry.style.cssText = "margin-top:16px;background:rgba(0,0,0,0.4);color:white;font-size:16px;" +
        "padding:10px 28px;border-radius:20px;border:2px solid rgba(255,255,255,0.4);cursor:pointer;";
      retry.onclick = () => { ov.remove(); this._startGame(); };
      const menuB = document.createElement("button");
      menuB.textContent = "← Lobby";
      menuB.style.cssText = "background:none;color:rgba(255,255,255,0.5);font-size:13px;" +
        "padding:6px 16px;border-radius:16px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;";
      menuB.onclick = () => { ov.remove(); this._buildLobby(); };
      ov.appendChild(retry); ov.appendChild(menuB);
      document.body.appendChild(ov);
    };

    const roundComplete = () => {
      done = true;
      this._points = points;
      if (round >= 10) {
        // Beat all 10 rounds
        _winScreen(this._wrap, points, () => {
          this._round = 1; // reset for new playthrough
          this._buildLobby();
        });
      } else {
        // Advance to next round, go back to lobby
        this._round = round + 1;
        this._buildLobby();
      }
    };

    const newTurn = () => {
      if (done) return;
      foodRow.innerHTML = "";
      if (isEvil) { evilTurn(); return; }
      const pool = [...FOODS].sort(() => Math.random() - 0.5);
      wanted = pool[0];
      const slot = [pool[0], pool[1], pool[2]].sort(() => Math.random() - 0.5);
      const bagChance = Math.random() < 0.2;
      const bagIdx = Math.floor(Math.random() * 3);
      slot.forEach((f, i) => {
        const isBag = bagChance && i === bagIdx && f !== wanted;
        foodRow.appendChild(mkFoodBtn(f, f === wanted, isBag));
      });
      speak(`I want ${wanted.name}!`);
    };

    newTurn();

    // ── Render loop ────────────────────────────────────────────────────────────
    const loop = () => {
      if (!this._wrap.isConnected || done) return;
      requestAnimationFrame(loop);
      t += 0.016;
      if (feedT > 0) { feedT -= 0.016; if (feedT <= 0) feedEl.style.opacity = "0"; }
      if (moodT > 0) { moodT -= 0.016; if (moodT <= 0) mood = isEvil ? "evil" : "neutral"; }

      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      _drawKitchen(ctx, W, H);

      // Table
      const tY = H * 0.57;
      ctx.fillStyle = "#7B4A1E";
      ctx.fillRect(0, tY, W, H - tY);
      ctx.fillStyle = "#5C3210";
      ctx.fillRect(0, tY, W, 10);
      ctx.strokeStyle = "rgba(0,0,0,0.06)"; ctx.lineWidth = 2;
      for (let i = 1; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(W * i / 7, tY);
        ctx.lineTo(W * i / 7 + 40, H);
        ctx.stroke();
      }

      // Mr. Tomato
      const tr = Math.min(W, H) * 0.20;
      const tcy = H * 0.30;
      _drawTomato(ctx, W / 2, tcy, tr, { mood, t });

      // Speech bubble
      if (!isEvil) {
        _drawSpeechBubble(ctx, W/2 + tr*0.55, tcy - tr*0.65, `I want ${wanted.emoji}!`, W);
      } else {
        _drawSpeechBubble(ctx, W/2 + tr*0.55, tcy - tr*0.65, "FEED ME", W, true);
      }
    };
    requestAnimationFrame(loop);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ADMIN PANEL
  // ══════════════════════════════════════════════════════════════════════════════

  private _adminPanel(): void {
    // Password prompt overlay
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.85);" +
      "display:flex;align-items:center;justify-content:center;font-family:'Courier New',monospace;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#0d0d0d;border:2px solid #ff2020;border-radius:12px;" +
      "padding:28px 32px;width:min(380px,90vw);display:flex;flex-direction:column;gap:14px;";

    const title = document.createElement("div");
    title.style.cssText = "color:#ff2020;font-size:18px;font-weight:900;letter-spacing:2px;text-align:center;";
    title.textContent = "🔒 ADMIN PANEL";

    const sub = document.createElement("div");
    sub.style.cssText = "color:rgba(255,80,80,0.5);font-size:12px;text-align:center;";
    sub.textContent = "Enter password to continue";

    const inp = document.createElement("input");
    inp.type = "password";
    inp.placeholder = "password";
    inp.autocomplete = "off";
    inp.style.cssText =
      "background:#1a0000;border:1px solid rgba(255,40,40,0.4);border-radius:8px;" +
      "color:#ff8080;font-size:15px;font-family:'Courier New',monospace;" +
      "padding:10px 14px;outline:none;letter-spacing:3px;";

    const err = document.createElement("div");
    err.style.cssText = "color:#ff4040;font-size:12px;text-align:center;min-height:16px;";

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:flex-end;margin-top:4px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.35);font-size:13px;" +
      "padding:8px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;";
    cancelBtn.onclick = () => ov.remove();

    const enterBtn = document.createElement("button");
    enterBtn.textContent = "Enter";
    enterBtn.style.cssText =
      "background:rgba(255,20,20,0.25);color:#ff6060;font-size:13px;font-weight:bold;" +
      "padding:8px 22px;border-radius:8px;border:1px solid rgba(255,40,40,0.4);cursor:pointer;";

    const tryLogin = () => {
      if (inp.value === "rgr6786") {
        ov.remove();
        this._showAdminDashboard();
      } else {
        err.textContent = "❌ Wrong password";
        inp.value = "";
        inp.focus();
        setTimeout(() => { err.textContent = ""; }, 1800);
      }
    };

    enterBtn.onclick = tryLogin;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(enterBtn);
    box.appendChild(title);
    box.appendChild(sub);
    box.appendChild(inp);
    box.appendChild(err);
    box.appendChild(btnRow);
    ov.appendChild(box);
    document.body.appendChild(ov);
    setTimeout(() => inp.focus(), 50);
  }

  private _showAdminDashboard(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:10000;background:#050505;" +
      "display:flex;flex-direction:column;align-items:center;overflow-y:auto;" +
      "padding:28px 16px 60px;font-family:'Courier New',monospace;";

    const header = document.createElement("div");
    header.style.cssText =
      "width:100%;max-width:500px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;";
    header.innerHTML =
      `<div style="color:#ff2020;font-size:20px;font-weight:900;letter-spacing:3px;">⚙️ ADMIN PANEL</div>` +
      `<div style="color:rgba(255,80,80,0.4);font-size:11px;">Mr. Tomato v1.0</div>`;
    ov.appendChild(header);

    const section = (label: string) => {
      const s = document.createElement("div");
      s.style.cssText =
        "width:100%;max-width:500px;background:#0d0d0d;border:1px solid rgba(255,30,30,0.25);" +
        "border-radius:10px;padding:18px 20px;margin-bottom:14px;";
      s.innerHTML = `<div style="color:rgba(255,80,80,0.6);font-size:11px;letter-spacing:2px;margin-bottom:12px;">${label}</div>`;
      return s;
    };

    // ── Stats ──────────────────────────────────────────────────────────────────
    const stats = section("PLAYER STATS");
    const addStat = (label: string, val: string | number) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;padding:5px 0;" +
        "border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,180,180,0.7);font-size:13px;";
      row.innerHTML = `<span>${label}</span><span style="color:#ff8080;font-weight:bold;">${val}</span>`;
      stats.appendChild(row);
    };
    addStat("Points", this._points);
    addStat("Current Round", `${this._round} / 10`);
    addStat("Owned Items", this._owned.size + " / " + SHOP_ITEMS.length);
    addStat("Owned", [...this._owned].join(", ") || "none");
    addStat("Forgiven", this._forgiven ? "✓ yes" : "✗ no");
    ov.appendChild(stats);

    // ── Edit points ────────────────────────────────────────────────────────────
    const editPts = section("SET POINTS");
    const ptsInp = document.createElement("input");
    ptsInp.type = "number";
    ptsInp.value = String(this._points);
    ptsInp.style.cssText =
      "background:#1a0000;border:1px solid rgba(255,40,40,0.3);border-radius:6px;" +
      "color:#ff8080;font-size:14px;padding:8px 12px;width:120px;margin-right:10px;";
    const setPtsBtn = document.createElement("button");
    setPtsBtn.textContent = "Set";
    setPtsBtn.style.cssText =
      "background:rgba(255,20,20,0.2);color:#ff6060;font-size:13px;font-weight:bold;" +
      "padding:8px 18px;border-radius:6px;border:1px solid rgba(255,40,40,0.3);cursor:pointer;";
    const ptsFeedback = document.createElement("span");
    ptsFeedback.style.cssText = "color:#80ff80;font-size:12px;margin-left:8px;";
    setPtsBtn.onclick = () => {
      const v = parseInt(ptsInp.value, 10);
      if (!isNaN(v) && v >= 0) {
        this._points = v;
        ptsFeedback.textContent = "✓ saved";
        setTimeout(() => { ptsFeedback.textContent = ""; }, 1500);
      }
    };
    editPts.appendChild(ptsInp);
    editPts.appendChild(setPtsBtn);
    editPts.appendChild(ptsFeedback);
    ov.appendChild(editPts);

    // ── Edit round ─────────────────────────────────────────────────────────────
    const editRound = section("SET ROUND");
    const roundInp = document.createElement("input");
    roundInp.type = "number";
    roundInp.min = "1"; roundInp.max = "10";
    roundInp.value = String(this._round);
    roundInp.style.cssText =
      "background:#1a0000;border:1px solid rgba(255,40,40,0.3);border-radius:6px;" +
      "color:#ff8080;font-size:14px;padding:8px 12px;width:80px;margin-right:10px;";
    const setRoundBtn = document.createElement("button");
    setRoundBtn.textContent = "Set";
    setRoundBtn.style.cssText =
      "background:rgba(255,20,20,0.2);color:#ff6060;font-size:13px;font-weight:bold;" +
      "padding:8px 18px;border-radius:6px;border:1px solid rgba(255,40,40,0.3);cursor:pointer;";
    const roundFeedback = document.createElement("span");
    roundFeedback.style.cssText = "color:#80ff80;font-size:12px;margin-left:8px;";
    setRoundBtn.onclick = () => {
      const v = parseInt(roundInp.value, 10);
      if (!isNaN(v) && v >= 1 && v <= 10) {
        this._round = v;
        roundFeedback.textContent = "✓ saved";
        setTimeout(() => { roundFeedback.textContent = ""; }, 1500);
      }
    };
    editRound.appendChild(roundInp);
    editRound.appendChild(setRoundBtn);
    editRound.appendChild(roundFeedback);
    ov.appendChild(editRound);

    // ── Unlock items ───────────────────────────────────────────────────────────
    const unlockSec = section("UNLOCK ITEMS");
    for (const item of SHOP_ITEMS) {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;justify-content:space-between;padding:6px 0;" +
        "border-bottom:1px solid rgba(255,255,255,0.05);";
      const label = document.createElement("span");
      label.style.cssText = "color:rgba(255,180,180,0.7);font-size:13px;";
      label.textContent = `${item.emoji} ${item.name}`;
      const tog = document.createElement("button");
      const refresh = () => {
        const has = this._owned.has(item.id);
        tog.textContent = has ? "✓ Owned" : "Unlock";
        tog.style.cssText =
          `background:${has ? "rgba(0,200,0,0.15)" : "rgba(255,20,20,0.15)"};` +
          `color:${has ? "#80ff80" : "#ff6060"};font-size:12px;font-weight:bold;` +
          "padding:5px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;";
        tog.onclick = () => {
          if (this._owned.has(item.id)) this._owned.delete(item.id);
          else this._owned.add(item.id);
          refresh();
        };
      };
      refresh();
      row.appendChild(label);
      row.appendChild(tog);
      unlockSec.appendChild(row);
    }
    ov.appendChild(unlockSec);

    // ── Quick test ────────────────────────────────────────────────────────────
    const testSec = section("QUICK TEST");
    const testDesc = document.createElement("div");
    testDesc.style.cssText = "color:rgba(255,180,180,0.45);font-size:11px;font-family:Arial;margin-bottom:10px;line-height:1.6;";
    testDesc.textContent = "Start a round pre-loaded at 9 correct answers + 9 anger (one wrong answer away from a special ending).";
    testSec.appendChild(testDesc);
    const testBtn = document.createElement("button");
    testBtn.textContent = "▶ 9 Goods + 9 Bads";
    testBtn.style.cssText =
      "background:rgba(255,150,0,0.15);color:#ffaa40;font-size:13px;font-weight:bold;" +
      "padding:10px 22px;border-radius:8px;border:1px solid rgba(255,150,0,0.3);cursor:pointer;";
    testBtn.onclick = () => {
      this._debugState = { foodsLeft: 1, anger: 9 };
      ov.remove();
      this._startGame();
    };
    testSec.appendChild(testBtn);

    // Knife taken test — sets forgiven + gives knife + last food + anger 9
    const knifeTestBtn = document.createElement("button");
    knifeTestBtn.textContent = "🔪 Test Knife Taken";
    knifeTestBtn.style.cssText =
      "background:rgba(255,0,0,0.15);color:#ff6060;font-size:13px;font-weight:bold;" +
      "padding:10px 22px;border-radius:8px;border:1px solid rgba(255,40,40,0.3);cursor:pointer;margin-top:8px;";
    knifeTestBtn.onclick = () => {
      this._forgiven = true;
      this._owned.add("knife");
      this._debugState = { foodsLeft: 1, anger: 9 };
      ov.remove();
      this._startGame();
    };
    testSec.appendChild(knifeTestBtn);
    ov.appendChild(testSec);

    // ── Reset ──────────────────────────────────────────────────────────────────
    const resetSec = section("DANGER ZONE");
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "🗑️ Reset All Progress";
    resetBtn.style.cssText =
      "background:rgba(255,0,0,0.15);color:#ff4040;font-size:13px;font-weight:bold;" +
      "padding:10px 22px;border-radius:8px;border:1px solid rgba(255,40,40,0.35);cursor:pointer;";
    resetBtn.onclick = () => {
      if (confirm("Reset all points, round, and owned items?")) {
        this._points = 0; this._round = 1; this._owned.clear();
        ov.remove();
        this._buildLobby();
      }
    };
    resetSec.appendChild(resetBtn);
    ov.appendChild(resetSec);

    // ── Close ──────────────────────────────────────────────────────────────────
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "← Back to Lobby";
    closeBtn.style.cssText =
      "width:100%;max-width:500px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);font-size:14px;" +
      "padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;margin-top:6px;";
    closeBtn.onclick = () => { ov.remove(); this._buildLobby(); };
    ov.appendChild(closeBtn);

    document.body.appendChild(ov);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  private _cleanup(): void {
    this._wrap.remove();
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DRAWING HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function _drawKitchen(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  // Wall
  const wallG = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  wallG.addColorStop(0, "#f5e6c8");
  wallG.addColorStop(1, "#e8d4a0");
  ctx.fillStyle = wallG;
  ctx.fillRect(0, 0, W, H * 0.6);
  // Checkerboard trim strip
  const stripH = H * 0.04, stripY = H * 0.56;
  for (let i = 0; i < Math.ceil(W / stripH); i++) {
    ctx.fillStyle = i % 2 === 0 ? "#ff4444" : "#ffffff";
    ctx.fillRect(i * stripH, stripY, stripH, stripH * 0.5);
  }
  // Window
  const wx = W * 0.15, wy = H * 0.06, ww = W * 0.14, wh = H * 0.22;
  ctx.fillStyle = "#a8d8f0";
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = "#8B6914"; ctx.lineWidth = 5;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.strokeStyle = "#8B6914"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(wx + ww/2, wy); ctx.lineTo(wx + ww/2, wy + wh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx, wy + wh/2); ctx.lineTo(wx + ww, wy + wh/2); ctx.stroke();
  // Sunshine through window
  ctx.fillStyle = "rgba(255,240,150,0.15)";
  ctx.beginPath();
  ctx.moveTo(wx, wy); ctx.lineTo(wx - ww*0.3, wy + wh*1.4);
  ctx.lineTo(wx + ww*1.3, wy + wh*1.4); ctx.lineTo(wx + ww, wy);
  ctx.fill();
  // Picture frame
  const px = W * 0.72, py = H * 0.07, pw = W * 0.10, ph = H * 0.14;
  ctx.fillStyle = "#fff8e8"; ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = "#8B4513"; ctx.lineWidth = 4; ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = "#ff6060"; ctx.font = `bold ${ph*0.55}px Arial`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("🍅", px + pw/2, py + ph/2);
}

function _drawBlender(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t: number): void {
  // Motor base
  ctx.fillStyle = "#d03000";
  ctx.beginPath(); ctx.roundRect(cx - s*0.28, cy + s*0.25, s*0.56, s*0.28, s*0.05); ctx.fill();
  ctx.fillStyle = "#ffaa00";
  ctx.beginPath(); ctx.arc(cx, cy + s*0.33, s*0.07, 0, Math.PI*2); ctx.fill();
  // Glass jar
  ctx.fillStyle = "rgba(160,230,240,0.50)";
  ctx.strokeStyle = "#60b0c0"; ctx.lineWidth = s*0.03;
  ctx.beginPath();
  ctx.moveTo(cx - s*0.22, cy + s*0.25);
  ctx.lineTo(cx - s*0.28, cy - s*0.42);
  ctx.lineTo(cx + s*0.28, cy - s*0.42);
  ctx.lineTo(cx + s*0.22, cy + s*0.25);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Liquid swirl
  ctx.save(); ctx.clip();
  ctx.fillStyle = `rgba(255,80,80,${0.22 + 0.10*Math.sin(t*4)})`;
  ctx.beginPath(); ctx.ellipse(cx, cy + s*0.08, s*0.18, s*0.07, t*3, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // Lid
  ctx.fillStyle = "#d03000";
  ctx.beginPath(); ctx.roundRect(cx - s*0.24, cy - s*0.48, s*0.48, s*0.08, s*0.04); ctx.fill();
  // Handle
  ctx.strokeStyle = "#d03000"; ctx.lineWidth = s*0.05;
  ctx.beginPath(); ctx.arc(cx + s*0.38, cy - s*0.05, s*0.15, -Math.PI*0.5, Math.PI*0.5); ctx.stroke();
}

function _drawTomato(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  opts: { mood?: string; t?: number } = {}
): void {
  const { mood = "neutral", t = 0 } = opts;
  const evil = mood === "evil";

  // Body
  const grad = ctx.createRadialGradient(cx - r*0.25, cy - r*0.2, r*0.05, cx, cy, r);
  grad.addColorStop(0, evil ? "#8b0000" : "#ff5050");
  grad.addColorStop(1, evil ? "#3a0000" : "#cc0000");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = evil ? "#5a0000" : "#aa0000";
  ctx.lineWidth = r*0.04; ctx.stroke();

  // Stem
  ctx.fillStyle = evil ? "#115500" : "#22aa22";
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(cx + i*r*0.28, cy - r*0.88, r*0.13, r*0.28, i*0.5, 0, Math.PI*2);
    ctx.fill();
  }

  // Eyes
  const eyeY = cy - r*0.10;
  const eyeOff = mood === "angry" || evil ? -0.06 : 0; // furrowed
  for (const ex of [cx - r*0.30, cx + r*0.30]) {
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.ellipse(ex, eyeY, r*0.18, r*0.22, eyeOff, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = evil ? "#ff0000" : "#7060cc";
    ctx.beginPath(); ctx.ellipse(ex, eyeY, r*0.11, r*0.14, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.ellipse(ex, eyeY, r*0.06, r*0.08, 0, 0, Math.PI*2); ctx.fill();
    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath(); ctx.arc(ex - r*0.04, eyeY - r*0.05, r*0.03, 0, Math.PI*2); ctx.fill();
    // Evil glow
    if (evil) {
      ctx.fillStyle = `rgba(255,0,0,${0.3 + 0.2*Math.sin(t*6)})`;
      ctx.beginPath(); ctx.ellipse(ex, eyeY, r*0.22, r*0.26, 0, 0, Math.PI*2); ctx.fill();
    }
  }
  // Eyebrows (angry/evil)
  if (mood === "angry" || evil) {
    ctx.strokeStyle = evil ? "#800000" : "#660000";
    ctx.lineWidth = r*0.06; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx - r*0.48, eyeY - r*0.26); ctx.lineTo(cx - r*0.14, eyeY - r*0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + r*0.48, eyeY - r*0.26); ctx.lineTo(cx + r*0.14, eyeY - r*0.18); ctx.stroke();
  }

  // Nose
  ctx.fillStyle = evil ? "#880000" : "#bb2222";
  ctx.beginPath(); ctx.ellipse(cx, cy + r*0.12, r*0.07, r*0.05, 0, 0, Math.PI*2); ctx.fill();

  // Mouth
  ctx.strokeStyle = evil ? "#660000" : "#880000";
  ctx.lineWidth = r*0.045; ctx.lineCap = "round";
  ctx.beginPath();
  if (mood === "happy") {
    ctx.arc(cx, cy + r*0.15, r*0.30, 0.1, Math.PI - 0.1); // big smile
  } else if (mood === "angry" || evil) {
    ctx.arc(cx, cy + r*0.42, r*0.30, Math.PI + 0.2, Math.PI*2 - 0.2); // frown
  } else {
    ctx.arc(cx, cy + r*0.18, r*0.26, 0.15, Math.PI - 0.15); // neutral smile
  }
  ctx.stroke();
}

function _drawSpeechBubble(
  ctx: CanvasRenderingContext2D, x: number, y: number,
  text: string, W: number, evil = false
): void {
  const pad = 14, fs = Math.min(W * 0.04, 28);
  ctx.font = `bold ${fs}px Arial`;
  const tw = ctx.measureText(text).width;
  const bw = tw + pad*2, bh = fs + pad*1.4;
  const bx = Math.min(x, W - bw - 10), by = y - bh;
  // Box
  ctx.fillStyle = evil ? "#3a0000" : "white";
  ctx.strokeStyle = evil ? "#ff2020" : "#888";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill(); ctx.stroke();
  // Tail
  ctx.beginPath();
  ctx.moveTo(bx + bw*0.3, by + bh);
  ctx.lineTo(bx + bw*0.2, by + bh + 12);
  ctx.lineTo(bx + bw*0.45, by + bh);
  ctx.fillStyle = evil ? "#3a0000" : "white";
  ctx.fill();
  ctx.strokeStyle = evil ? "#ff2020" : "#888"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx + bw*0.3, by + bh); ctx.lineTo(bx + bw*0.2, by + bh + 12); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + bw*0.45, by + bh); ctx.lineTo(bx + bw*0.2, by + bh + 12); ctx.stroke();
  // Text
  ctx.fillStyle = evil ? "#ff4040" : "#222";
  ctx.font = `bold ${fs}px Arial`;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(text, bx + pad, by + bh/2);
}

function _winScreen(_wrap: HTMLElement, points: number, onBack: () => void): void {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#0a0a00;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:18px;font-family:'Arial Black',Arial;opacity:0;transition:opacity 0.8s;";
  ov.innerHTML =
    `<div style="font-size:72px;">🍅</div>` +
    `<div style="color:#FFD700;font-size:clamp(20px,4vw,40px);font-weight:900;">Mr. Tomato is full!</div>` +
    `<div style="color:rgba(255,255,255,0.55);font-size:16px;font-family:Arial;">Score: ${points} pts</div>`;
  const btn = document.createElement("button");
  btn.textContent = "← Back to Lobby";
  btn.style.cssText = "background:rgba(255,255,255,0.09);color:white;font-size:15px;" +
    "padding:10px 28px;border-radius:22px;border:1px solid rgba(255,255,255,0.28);cursor:pointer;margin-top:8px;";
  btn.onclick = () => { ov.remove(); onBack(); };
  ov.appendChild(btn);
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.opacity = "1"; });
}

function _cryingEnding(_wrap: HTMLElement, onBack: () => void): void {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#0a0a1a;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:18px;font-family:'Arial Black',Arial;opacity:0;transition:opacity 0.8s;";

  // Crying tomato with tears dripping animation
  ov.innerHTML = `
    <style>
      @keyframes tear { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(40px);opacity:0} }
      .tear { position:absolute; font-size:18px; animation:tear 1s ease-in infinite; }
    </style>
    <div style="position:relative;display:inline-block;font-size:clamp(70px,15vw,110px);">
      🍅
      <span class="tear" style="left:18%;top:55%;animation-delay:0s;">💧</span>
      <span class="tear" style="left:55%;top:55%;animation-delay:0.5s;">💧</span>
    </div>
    <div style="color:#80aaff;font-size:clamp(18px,4vw,38px);font-weight:900;text-align:center;
      text-shadow:0 0 20px #4466ff,3px 3px 0 #000;">YOU BROKE HIM.</div>
    <div style="color:rgba(150,180,255,0.65);font-size:clamp(12px,2.2vw,17px);text-align:center;
      max-width:360px;line-height:2;font-family:Arial;font-weight:normal;">
      He just wanted to be fed.<br>
      You said no five times.<br>
      <span style="color:rgba(255,255,255,0.3);font-size:13px;">He is crying very hard right now.</span>
    </div>`;

  const btn = document.createElement("button");
  btn.textContent = "← Back to Lobby";
  btn.style.cssText =
    "background:rgba(80,100,255,0.12);color:#80aaff;font-size:14px;" +
    "padding:10px 28px;border-radius:20px;border:1px solid rgba(80,120,255,0.3);cursor:pointer;margin-top:6px;";
  btn.onclick = () => { ov.remove(); onBack(); };
  ov.appendChild(btn);
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.opacity = "1"; });
}

function _fatEnding(_wrap: HTMLElement, onBack: () => void): void {
  // Phase 1 — shocked face
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#1a0000;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:16px;font-family:'Arial Black',Arial;overflow:hidden;";

  const tomatoEl = document.createElement("div");
  tomatoEl.style.cssText =
    "font-size:clamp(80px,16vw,130px);transition:transform 1.2s cubic-bezier(0.3,-0.5,0.7,1),opacity 0.4s;";
  tomatoEl.textContent = "🍅";

  const speechEl = document.createElement("div");
  speechEl.style.cssText =
    "color:white;font-size:clamp(16px,3.5vw,32px);font-weight:900;text-align:center;text-shadow:2px 2px 0 #000;";
  speechEl.textContent = "...WHAT did you just call me?!";

  ov.appendChild(tomatoEl);
  ov.appendChild(speechEl);
  document.body.appendChild(ov);

  // Phase 2 — he launches himself out the window
  setTimeout(() => {
    speechEl.textContent = "THAT'S IT. I'M LEAVING.";
  }, 1400);

  setTimeout(() => {
    tomatoEl.style.transform = "translateX(150vw) translateY(-60vh) rotate(720deg)";
    tomatoEl.style.transition = "transform 1.0s cubic-bezier(0.4,0,1,1), opacity 0.8s 0.5s";
    tomatoEl.style.opacity = "0";
  }, 2200);

  // Phase 3 — crash + ending screen
  setTimeout(() => {
    ov.innerHTML = "";
    ov.style.background = "#000d1a";

    const glass = document.createElement("div");
    glass.style.cssText =
      "display:flex;flex-direction:column;align-items:center;gap:18px;";
    glass.innerHTML =
      `<div style="font-size:clamp(50px,12vw,90px);">🪟💥</div>` +
      `<div style="color:#80cfff;font-size:clamp(18px,4vw,40px);font-weight:900;text-align:center;
        text-shadow:0 0 20px #0088ff,3px 3px 0 #000;">HE JUMPED OUT THE WINDOW</div>` +
      `<div style="color:rgba(180,220,255,0.55);font-size:clamp(12px,2vw,16px);text-align:center;
        max-width:360px;line-height:2;font-family:Arial;font-weight:normal;">
        You called him fat.<br>
        He could not handle the truth.<br>
        <span style="color:rgba(255,255,255,0.3);font-size:13px;">
          (He landed in the garden. He's fine. Probably.)
        </span>
      </div>`;

    const btn = document.createElement("button");
    btn.textContent = "← Back to Lobby";
    btn.style.cssText =
      "background:rgba(0,100,200,0.15);color:#80cfff;font-size:14px;" +
      "padding:10px 28px;border-radius:20px;border:1px solid rgba(0,150,255,0.3);cursor:pointer;margin-top:6px;";
    btn.onclick = () => { ov.remove(); onBack(); };
    glass.appendChild(btn);
    ov.appendChild(glass);
  }, 3400);
}

function _forgivenessEnding(_wrap: HTMLElement, onBack: () => void): void {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#1a0000;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:20px;font-family:'Arial Black',Arial;opacity:0;transition:opacity 0.8s;";

  ov.innerHTML =
    `<div style="font-size:80px;">🍅</div>` +
    `<div style="color:#ff6060;font-size:clamp(18px,3.8vw,38px);font-weight:900;text-align:center;
      text-shadow:2px 2px 0 #000;">you were SO close.</div>` +
    `<div style="color:rgba(255,180,180,0.7);font-size:clamp(13px,2.2vw,18px);text-align:center;
      max-width:380px;line-height:2;font-family:Arial;font-weight:normal;">
      I will forgive you...<br>
      <span style="color:rgba(255,100,100,0.5);font-size:13px;">
        ...until you do this again.
      </span>
    </div>`;

  const btn = document.createElement("button");
  btn.textContent = "← Back to Lobby";
  btn.style.cssText =
    "background:rgba(255,30,30,0.15);color:#ff8080;font-size:14px;" +
    "padding:10px 28px;border-radius:20px;border:1px solid rgba(255,60,60,0.3);cursor:pointer;margin-top:6px;";
  btn.onclick = () => { ov.remove(); onBack(); };
  ov.appendChild(btn);
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.opacity = "1"; });
}

function _knifeTakenEnding(_wrap: HTMLElement, onBack: () => void): void {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#000;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:18px;font-family:'Arial Black',Arial;opacity:0;transition:opacity 0.3s;";
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.opacity = "1"; });

  // Phase 1 — he takes the knife
  ov.innerHTML =
    `<div style="font-size:72px;">🍅</div>` +
    `<div style="color:#ff2020;font-size:clamp(16px,3.5vw,34px);font-weight:900;text-align:center;">
      I told you not to do this again.
    </div>` +
    `<div style="font-size:48px;margin-top:6px;animation:slidein 0.5s ease;">🔪</div>` +
    `<div style="color:rgba(255,100,100,0.55);font-size:14px;font-family:Arial;text-align:center;">
      He reaches across the table.
    </div>`;

  // Phase 2 — he uses it
  setTimeout(() => {
    ov.style.transition = "background 0.2s";
    ov.style.background = "#ff0000";
    ov.innerHTML =
      `<div style="font-size:clamp(60px,14vw,110px);">🍅🔪</div>` +
      `<div style="color:white;font-size:clamp(22px,5vw,52px);font-weight:900;text-align:center;
        text-shadow:4px 4px 0 #000;letter-spacing:2px;">YOU LOSE.</div>` +
      `<div style="color:rgba(255,255,255,0.6);font-size:15px;font-family:Arial;text-align:center;">
        He took the knife. You should have listened.
      </div>`;

    const btn = document.createElement("button");
    btn.textContent = "🔄 Try Again";
    btn.style.cssText =
      "background:rgba(0,0,0,0.4);color:white;font-size:15px;" +
      "padding:10px 28px;border-radius:20px;border:2px solid rgba(255,255,255,0.4);cursor:pointer;margin-top:10px;";
    btn.onclick = () => { ov.remove(); onBack(); };
    ov.appendChild(btn);
  }, 2200);
}

function _heroEnding(_wrap: HTMLElement, points: number, onBack: () => void): void {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#000;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:18px;font-family:'Arial Black',Arial;opacity:0;transition:opacity 0.6s;";

  // Flash red first
  ov.style.background = "#ff0000";
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.opacity = "1"; });

  setTimeout(() => {
    ov.style.transition = "background 1.2s";
    ov.style.background = "#000";

    ov.innerHTML =
      `<div style="font-size:80px;filter:drop-shadow(0 0 24px gold);">🏆</div>` +
      `<div style="color:#FFD700;font-size:clamp(20px,4.5vw,44px);font-weight:900;text-align:center;
        text-shadow:0 0 20px gold,3px 3px 0 #000;">HERO ENDING</div>` +
      `<div style="color:rgba(255,215,0,0.6);font-size:clamp(13px,2.5vw,20px);text-align:center;
        max-width:360px;line-height:1.9;font-family:Arial;">
        You waited until he went full evil...<br>
        <span style="color:#ff6060;">then finished the job.</span><br><br>
        <span style="color:rgba(255,255,255,0.4);font-size:14px;">Score: ${points} pts</span>
      </div>` +
      `<div style="font-size:48px;margin-top:4px;">🔪🍅💀</div>`;

    const btn = document.createElement("button");
    btn.textContent = "← Back to Lobby";
    btn.style.cssText =
      "background:rgba(255,215,0,0.12);color:#FFD700;font-size:15px;font-weight:bold;" +
      "padding:11px 30px;border-radius:22px;border:1px solid rgba(255,215,0,0.35);cursor:pointer;margin-top:8px;";
    btn.onclick = () => { ov.remove(); onBack(); };
    ov.appendChild(btn);
  }, 600);
}

function _knifeEnding(_wrap: HTMLElement, onBack: () => void): void {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#000;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:18px;font-family:'Arial Black',Arial;opacity:0;transition:opacity 1s;";
  ov.innerHTML =
    `<div style="font-size:80px;">🔪🍅</div>` +
    `<div style="color:#ff2020;font-size:clamp(18px,3.5vw,36px);font-weight:900;">Mr. Tomato has been defeated.</div>` +
    `<div style="color:rgba(255,255,255,0.4);font-size:14px;font-family:Arial;text-align:center;max-width:320px;line-height:1.8;">
      The kitchen falls silent.<br>No one will ever ask to be fed again.
    </div>`;
  const btn = document.createElement("button");
  btn.textContent = "← Back";
  btn.style.cssText = "background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);font-size:14px;" +
    "padding:9px 24px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;margin-top:8px;";
  btn.onclick = () => { ov.remove(); onBack(); };
  ov.appendChild(btn);
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.opacity = "1"; });
}

function _idEnding(_wrap: HTMLElement, points: number, onBack: () => void): void {
  const ov = document.createElement("div");
  ov.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:#000011;" +
    "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "gap:14px;font-family:'Courier New',monospace;opacity:0;transition:opacity 0.5s;";

  const terminal = document.createElement("div");
  terminal.style.cssText =
    "background:#001a00;border:2px solid #00ff00;border-radius:8px;padding:24px 32px;" +
    "max-width:420px;width:90%;";

  const lines = [
    "> LOADING ID CARD...",
    "> SUBJECT: MR. TOMATOS",
    "> POINTS: " + points,
    "> ACTION: DELETE",
    "",
    "> Are you sure? Press ENTER to confirm.",
  ];
  let lineIdx = 0;
  const pre = document.createElement("pre");
  pre.style.cssText = "color:#00ff00;font-size:14px;margin:0;white-space:pre-wrap;line-height:1.8;";
  terminal.appendChild(pre);

  const typeNext = () => {
    if (lineIdx >= lines.length) return;
    pre.textContent += lines[lineIdx] + "\n";
    lineIdx++;
    if (lineIdx < lines.length) setTimeout(typeNext, 400);
  };
  typeNext();

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || lineIdx < lines.length) return;
    document.removeEventListener("keydown", onKey);
    pre.textContent += "\n> DELETING...\n";
    setTimeout(() => {
      ov.innerHTML = "";
      ov.style.background = "#000";
      const glitch = document.createElement("div");
      glitch.style.cssText =
        "display:flex;flex-direction:column;align-items:center;gap:16px;font-family:'Arial Black',Arial;";
      glitch.innerHTML =
        `<div style="font-size:80px;filter:hue-rotate(${Math.random()*360}deg);">🍅</div>` +
        `<div style="color:#ff2020;font-size:clamp(14px,3vw,26px);font-weight:900;letter-spacing:2px;">` +
        `you beat me. i never thought you'd save 500 points.</div>` +
        `<div style="color:rgba(255,255,255,0.35);font-size:13px;font-family:Arial;text-align:center;max-width:300px;line-height:1.8;">` +
        `Mr. Tomato despawns.<br>He will not return…<br>unless you forgive him.</div>`;
      const btn = document.createElement("button");
      btn.textContent = "← Back to Lobby";
      btn.style.cssText = "background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);font-size:14px;" +
        "padding:9px 24px;border-radius:20px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;margin-top:8px;";
      btn.onclick = () => { ov.remove(); onBack(); };
      glitch.appendChild(btn);
      ov.appendChild(glitch);
    }, 1500);
  };
  document.addEventListener("keydown", onKey);

  ov.appendChild(terminal);
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.style.opacity = "1"; });
}
