import type { Game } from "../../game/Game";

const SAVE_KEY = "ytgame_save";
const SB_URL = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/yt_chat";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };
const SB_LIKES_URL = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/yt_likes";

const BOT_MESSAGES = [
  "omg love this channel 🔥", "first!!", "bro this is so good",
  "can you do a collab with me??", "been watching since day 1 🙏",
  "THIS IS FIRE 🔥🔥🔥", "drop a new vid already!!",
  "hit that sub button everyone", "W channel no cap",
  "how do you grow so fast??", "you deserve way more subs",
  "my fav creator fr fr", "this popped up on my feed and im HOOKED",
  "underrated asf 💯", "LETS GOOO", "new sub here hi!!",
];

interface VideoEntry {
  id: number;
  title: string;
  emoji: string;
  views: number;
  cashedViews: number;
}

interface YTSave {
  channelName: string;
  icon: string;
  subs: number;
  videos: VideoEntry[];
  nextId: number;
  subscribedTo: string[]; // AI channel ids
  thankedMilestones: number[]; // milestones already thanked
  lastSeen: number; // timestamp ms
}

const AI_CHANNELS: Array<{ id: string; name: string; icon: string; niche: string; subs: number; videos: string[] }> = [
  { id:"gamer_pro",   name:"GamerPro99",    icon:"🎮", niche:"Gaming",  subs:842_000,
    videos:["I Speedran Every Game EVER","Best Clutch Moments of 2025","TOP 10 Hardest Games"] },
  { id:"artsy_ava",   name:"ArtsyAva",      icon:"🎨", niche:"Art",     subs:310_000,
    videos:["Drawing 100 Fans!","Painting for 24 Hours Straight","Speed Art Compilation"] },
  { id:"foodie_fred", name:"FoodieFred",    icon:"🍕", niche:"Food",    subs:1_200_000,
    videos:["Eating the World's Spiciest Burger","I Only Ate McDonalds for a Week","Blind Taste Test"] },
  { id:"petsworld",   name:"PetsWorld",     icon:"🐾", niche:"Animals", subs:5_600_000,
    videos:["Funniest Cat Compilation EVER","My New Puppy First Day Home","Animals Being Derps"] },
  { id:"music_mike",  name:"MusicMike",     icon:"🎵", niche:"Music",   subs:780_000,
    videos:["I Made a Song in 1 Hour","Reacting to My Old Songs","Can I Hit Every Note?"] },
  { id:"laugh_lab",   name:"LaughLab",      icon:"😂", niche:"Comedy",  subs:2_900_000,
    videos:["Pranking My Little Brother","Try Not to Laugh IMPOSSIBLE","Bloopers Vol. 12"] },
  { id:"travel_tina", name:"TravelTina",    icon:"✈️", niche:"Travel",  subs:430_000,
    videos:["I Went to 5 Countries in 1 Week","Solo Trip Gone WRONG","Most Beautiful Places on Earth"] },
  { id:"study_sam",   name:"StudySam",      icon:"📚", niche:"School",  subs:660_000,
    videos:["How I Got Straight A's","Study With Me (10 Hours)","Best Revision Hacks"] },
];

const RANDOM_SUBSCRIBER_NAMES = [
  "xXGamerXx","CoolKid2010","StarPlayer","NightOwl99","EpicFan","QuickClicker",
  "ProViewer","HyperLad","Blazing88","AwesomeUser","TopFan","LegendWatcher",
  "MegaFollower","FlashView","SuperSub","UltraFan","TurboClicker","RocketUser",
];

function loadSave(): YTSave | null {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null") as YTSave | null;
    if (s && !s.subscribedTo) s.subscribedTo = [];
    if (s && !s.thankedMilestones) s.thankedMilestones = [];
    if (s && !s.lastSeen) s.lastSeen = Date.now();
    return s;
  } catch { return null; }
}
function writeSave(s: YTSave): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
}

const TOPICS: Array<{ emoji: string; name: string; titles: string[] }> = [
  { emoji: "🎮", name: "Gaming", titles: [
    "I Beat the HARDEST Level!", "Epic Gaming Moments!", "Top 10 Games Ever",
    "Gaming ALL Night Long!", "This Game BROKE Me…"] },
  { emoji: "🎨", name: "Art", titles: [
    "Drawing My Fans!", "Art Challenge Gone Wrong",
    "Speed Drawing Tutorial", "Painting a Masterpiece", "I Drew for 24 Hours!"] },
  { emoji: "🍕", name: "Food", titles: [
    "I Ate Only Pizza for a Day!", "Trying WEIRD Foods!",
    "Ultimate Food Review", "Cooking With No Skills", "The BEST Recipe Ever"] },
  { emoji: "🐱", name: "Animals", titles: [
    "My Cat Did Something CRAZY", "Cute Animals Compilation",
    "My Pet's Daily Routine", "Animals Being Silly", "I Got a New Pet!"] },
  { emoji: "🎵", name: "Music", titles: [
    "I Learned to Sing in 1 Day!", "Making a Song in 10 Minutes",
    "Reacting to Viral Music", "My First Song!", "The Most Satisfying Sounds"] },
  { emoji: "🤣", name: "Comedy", titles: [
    "Funniest Moments Ever!", "Pranking My Best Friend",
    "Try Not to Laugh Challenge", "Bloopers & Fails", "I Broke Everything…"] },
  { emoji: "🌍", name: "Travel", titles: [
    "I Visited Every Country!", "Road Trip Gone WRONG",
    "Hidden Places You MUST See", "Solo Travel at 3 AM", "The Scariest Place on Earth"] },
  { emoji: "📚", name: "School", titles: [
    "I Studied for 12 Hours Straight", "How I Got ALL A's",
    "Surprising School Hacks", "Reading Every Book in School", "My Teacher Went CRAZY"] },
];

const ICONS = ["😎","🎮","🎨","🐱","🔥","⭐","🌟","👾","🦄","🍕","🎵","🏆"];

export class YouTubeGame {
  private _game: Game;
  private _save: YTSave | null;
  private _interval = 0;
  private _chatInterval = 0;
  private _recordRaf = 0;
  private _recording = false;
  private _selectedTopic: typeof TOPICS[number] | null = null;
  private _selectedTitle = "";
  private _lastChatId = 0;

  constructor(game: Game) {
    this._game = game;
    this._save = loadSave();
    if (!this._save) {
      this._showSetup();
    } else {
      this._showMain();
    }
  }

  // ── SETUP SCREEN ────────────────────────────────────────────────────────────

  private _showSetup(): void {
    const ui = this._game.ui;
    ui.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(135deg,#0f0f0f,#1a0a0a,#0f0f0f);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "font-family:Arial,sans-serif;gap:14px;padding:24px;pointer-events:all;overflow-y:auto;";

    // Back
    const back = document.createElement("button");
    back.textContent = "← Back";
    back.style.cssText =
      "position:absolute;top:16px;left:16px;background:rgba(255,255,255,0.08);" +
      "border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.7);" +
      "font-size:14px;padding:7px 14px;border-radius:10px;cursor:pointer;";
    back.onclick = () => this._goBack();
    wrap.appendChild(back);

    // YT logo
    const logo = document.createElement("div");
    logo.style.cssText = "display:flex;align-items:center;gap:10px;";
    logo.innerHTML =
      `<div style="background:#FF0000;border-radius:8px;padding:6px 12px;display:flex;align-items:center;">` +
        `<div style="width:0;height:0;border-top:8px solid transparent;border-bottom:8px solid transparent;border-left:14px solid white;"></div>` +
      `</div>` +
      `<span style="color:white;font-size:24px;font-weight:900;">YouTube</span>`;
    wrap.appendChild(logo);

    const title = document.createElement("div");
    title.style.cssText = "color:white;font-size:22px;font-weight:bold;";
    title.textContent = "Create Your Channel!";
    wrap.appendChild(title);

    const sub = document.createElement("div");
    sub.style.cssText = "color:rgba(255,255,255,0.45);font-size:13px;";
    sub.textContent = "Pick an icon and name your channel";
    wrap.appendChild(sub);

    // Icon display
    let selectedIcon = ICONS[0];
    const iconDisplay = document.createElement("div");
    iconDisplay.style.cssText =
      "font-size:60px;width:90px;height:90px;border-radius:50%;" +
      "background:rgba(255,255,255,0.08);border:3px solid #FF0000;" +
      "display:flex;align-items:center;justify-content:center;";
    iconDisplay.textContent = selectedIcon;
    wrap.appendChild(iconDisplay);

    // Icon grid
    const iconGrid = document.createElement("div");
    iconGrid.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:280px;";
    const iconBtns: HTMLButtonElement[] = [];
    ICONS.forEach((ic, idx) => {
      const btn = document.createElement("button");
      btn.textContent = ic;
      btn.style.cssText =
        "font-size:22px;width:42px;height:42px;border-radius:50%;" +
        `background:${idx === 0 ? "rgba(255,0,0,0.2)" : "rgba(255,255,255,0.08)"};" +
        "border:2px solid ${idx === 0 ? "#FF0000" : "rgba(255,255,255,0.15)"};cursor:pointer;`;
      btn.onclick = () => {
        selectedIcon = ic;
        iconDisplay.textContent = ic;
        iconBtns.forEach(b => {
          b.style.borderColor = "rgba(255,255,255,0.15)";
          b.style.background = "rgba(255,255,255,0.08)";
        });
        btn.style.borderColor = "#FF0000";
        btn.style.background = "rgba(255,0,0,0.2)";
      };
      iconBtns.push(btn);
      iconGrid.appendChild(btn);
    });
    wrap.appendChild(iconGrid);

    // Name input
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Your channel name...";
    input.maxLength = 24;
    input.style.cssText =
      "background:rgba(255,255,255,0.1);color:white;" +
      "border:2px solid rgba(255,255,255,0.2);border-radius:12px;" +
      "padding:12px 16px;font-size:16px;width:260px;outline:none;" +
      "font-family:Arial,sans-serif;text-align:center;";
    input.onfocus = () => { input.style.borderColor = "#FF0000"; };
    input.onblur  = () => { input.style.borderColor = "rgba(255,255,255,0.2)"; };
    wrap.appendChild(input);

    const createBtn = document.createElement("button");
    createBtn.textContent = "🚀 Create Channel!";
    createBtn.style.cssText =
      "background:#FF0000;color:white;font-size:18px;font-weight:bold;" +
      "padding:14px 32px;border-radius:50px;border:none;cursor:pointer;" +
      "box-shadow:0 4px 20px rgba(255,0,0,0.4);margin-top:6px;";
    createBtn.onclick = () => {
      const name = input.value.trim();
      if (!name) { input.style.borderColor = "#FF0000"; input.focus(); return; }
      this._save = { channelName: name, icon: selectedIcon, subs: 0, videos: [], nextId: 1, subscribedTo: [], thankedMilestones: [], lastSeen: Date.now() };
      writeSave(this._save);
      this._showMain();
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") createBtn.click(); });
    wrap.appendChild(createBtn);

    ui.appendChild(wrap);
  }

  // ── MAIN SCREEN ─────────────────────────────────────────────────────────────

  private _showMain(): void {
    const ui = this._game.ui;
    ui.innerHTML = "";
    const save = this._save!;

    // ── Offline earnings ─────────────────────────────────────────────────────
    const now = Date.now();
    const offlineSecs = Math.floor((now - (save.lastSeen ?? now)) / 1000);
    save.lastSeen = now;
    let offlineViews = 0;
    let offlineSubs = 0;
    if (offlineSecs > 10 && save.videos.length > 0) {
      // Same rate as online tick (every 2s), capped at 8 hours
      const ticks = Math.min(offlineSecs / 2, 14400);
      const baseRate = Math.max(1, Math.floor(Math.sqrt(save.subs + 10)));
      save.videos.forEach(v => {
        const gain = Math.floor(ticks * (baseRate * 0.5));
        v.views += gain;
        offlineViews += gain;
      });
      const subBoost = 1 + save.subscribedTo.length;
      const totalViews = save.videos.reduce((s, v) => s + v.views, 0);
      const targetSubs = Math.floor((totalViews / 100) * subBoost);
      const gained = Math.max(0, targetSubs - save.subs);
      save.subs += gained;
      offlineSubs = gained;
      writeSave(save);
    }

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;background:#0f0f0f;font-family:Arial,sans-serif;" +
      "display:flex;flex-direction:column;pointer-events:all;overflow:hidden;";

    // ── Top bar ──────────────────────────────────────────────────────────────
    const topBar = document.createElement("div");
    topBar.style.cssText =
      "background:#1a1a1a;padding:10px 14px;display:flex;align-items:center;gap:10px;" +
      "border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;";

    const backBtn = document.createElement("button");
    backBtn.textContent = "←";
    backBtn.style.cssText =
      "background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);" +
      "color:white;font-size:16px;padding:6px 12px;border-radius:8px;cursor:pointer;";
    backBtn.onclick = () => this._goBack();
    topBar.appendChild(backBtn);

    const ytLogo = document.createElement("div");
    ytLogo.style.cssText = "background:#FF0000;border-radius:6px;padding:4px 8px;display:flex;align-items:center;flex-shrink:0;";
    ytLogo.innerHTML = `<div style="width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent;border-left:10px solid white;"></div>`;
    topBar.appendChild(ytLogo);

    const chanInfo = document.createElement("div");
    chanInfo.style.cssText = "display:flex;align-items:center;gap:8px;flex:1;min-width:0;";
    chanInfo.innerHTML =
      `<span style="font-size:22px;">${save.icon}</span>` +
      `<span style="color:white;font-size:14px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${save.channelName}</span>`;
    topBar.appendChild(chanInfo);

    const subsEl = document.createElement("div");
    subsEl.id = "yt-subs";
    subsEl.style.cssText = "color:rgba(255,255,255,0.7);font-size:12px;text-align:right;flex-shrink:0;";
    subsEl.innerHTML =
      `<span style="color:#FF0000;font-weight:bold;">${this._fmt(save.subs)}</span>` +
      `<br><span style="font-size:10px;">subs</span>`;
    topBar.appendChild(subsEl);

    wrap.appendChild(topBar);

    // ── Tabs ─────────────────────────────────────────────────────────────────
    const tabBar = document.createElement("div");
    tabBar.style.cssText =
      "display:flex;background:#1a1a1a;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;";

    const contentArea = document.createElement("div");
    contentArea.style.cssText = "flex:1;overflow-y:auto;";

    let activeTab = 0;
    const tabBtns: HTMLButtonElement[] = [];

    const showTab = (idx: number) => {
      activeTab = idx;
      tabBtns.forEach((b, i) => {
        b.style.borderBottom = i === idx ? "2px solid #FF0000" : "2px solid transparent";
        b.style.color = i === idx ? "white" : "rgba(255,255,255,0.4)";
      });
      contentArea.innerHTML = "";
      if (idx === 0) this._renderStudio(contentArea, save);
      if (idx === 1) this._renderVideos(contentArea, save);
      if (idx === 2) this._renderEarnings(contentArea, save);
      if (idx === 3) this._renderBrowse(contentArea, save);
      if (idx === 4) this._renderChat(contentArea, save);
    };

    ["📹 Studio", "📊 Videos", "💰 Earnings", "🌍 Browse", "💬 Chat"].forEach((label, i) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText =
        "flex:1;background:none;border:none;border-bottom:2px solid transparent;" +
        "color:rgba(255,255,255,0.4);font-size:13px;font-weight:bold;" +
        "padding:12px 6px;cursor:pointer;font-family:Arial,sans-serif;";
      btn.onclick = () => showTab(i);
      tabBtns.push(btn);
      tabBar.appendChild(btn);
    });

    wrap.appendChild(tabBar);
    wrap.appendChild(contentArea);
    ui.appendChild(wrap);

    showTab(0);

    // ── Offline earnings popup ───────────────────────────────────────────────
    if (offlineViews > 0) {
      const hrs  = Math.floor(offlineSecs / 3600);
      const mins = Math.floor((offlineSecs % 3600) / 60);
      const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      const overlay = document.createElement("div");
      overlay.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;" +
        "display:flex;align-items:center;justify-content:center;pointer-events:all;padding:20px;";
      const card = document.createElement("div");
      card.style.cssText =
        "background:#1a1a1a;border:2px solid #FF0000;border-radius:20px;" +
        "padding:24px;max-width:300px;width:100%;text-align:center;display:flex;flex-direction:column;gap:12px;";
      card.innerHTML =
        `<div style="font-size:40px;">📴➡️📱</div>` +
        `<div style="color:white;font-size:18px;font-weight:bold;">Welcome back!</div>` +
        `<div style="color:rgba(255,255,255,0.5);font-size:13px;">You were gone for <b style="color:white;">${timeStr}</b></div>` +
        `<div style="background:rgba(255,0,0,0.1);border:1px solid rgba(255,80,80,0.3);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;">` +
          `<div style="display:flex;justify-content:space-between;">` +
            `<span style="color:rgba(255,255,255,0.6);">👁 Views earned</span>` +
            `<span style="color:white;font-weight:bold;">+${this._fmt(offlineViews)}</span>` +
          `</div>` +
          `<div style="display:flex;justify-content:space-between;">` +
            `<span style="color:rgba(255,255,255,0.6);">👥 New subs</span>` +
            `<span style="color:#FF0000;font-weight:bold;">+${this._fmt(offlineSubs)}</span>` +
          `</div>` +
        `</div>`;
      const closeBtn = document.createElement("button");
      closeBtn.textContent = "🎉 Awesome!";
      closeBtn.style.cssText =
        "background:#FF0000;color:white;font-size:16px;font-weight:bold;" +
        "padding:12px;border-radius:12px;border:none;cursor:pointer;";
      closeBtn.onclick = () => overlay.remove();
      card.appendChild(closeBtn);
      overlay.appendChild(card);
      overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
      document.body.appendChild(overlay);
    }

    // ── Chat polling every 4 seconds ────────────────────────────────────────
    this._chatInterval = window.setInterval(() => {
      if (activeTab === 4) this._pollChat();
      // Auto-likes from bots based on subs
      if (save.videos.length > 0 && save.subs >= 100 && Math.random() < Math.min(0.6, save.subs / 10000)) {
        const v = save.videos[Math.floor(Math.random() * save.videos.length)];
        const bot = AI_CHANNELS[Math.floor(Math.random() * AI_CHANNELS.length)];
        fetch(SB_LIKES_URL, { method: "POST",
          headers: { ...SB_HEADERS, "Prefer": "resolution=ignore-duplicates" },
          body: JSON.stringify({ channel_name: save.channelName, video_title: v.title, liker_name: bot.name, liker_icon: bot.icon }) });
      }
      // Bots post occasionally
      if (save.videos.length > 0 && Math.random() < 0.25) {
        const bot = AI_CHANNELS[Math.floor(Math.random() * AI_CHANNELS.length)];
        const msg = BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)];
        fetch(SB_URL, { method: "POST", headers: SB_HEADERS,
          body: JSON.stringify({ username: bot.name, icon: bot.icon, message: msg, is_bot: true }) });
      }
    }, 4000);

    // ── Auto-tick: views + subs every 2 seconds ───────────────────────────
    this._interval = window.setInterval(() => {
      if (!this._save || this._save.videos.length === 0) return;
      const baseRate = Math.max(1, Math.floor(Math.sqrt(save.subs + 10)));
      let newViews = 0;
      save.videos.forEach(v => {
        const gain = Math.floor(Math.random() * baseRate) + 1;
        v.views += gain;
        newViews += gain;
      });
      // Subs = ~1% of total views, boosted by subscriptions
      const subBoost = 1 + save.subscribedTo.length;
      const totalViews = save.videos.reduce((s, v) => s + v.views, 0);
      const targetSubs = Math.floor((totalViews / 100) * subBoost);
      const gainedSubs = Math.max(0, Math.min(50, targetSubs - save.subs));
      if (gainedSubs > 0) {
        const old = save.subs;
        save.subs += gainedSubs;
        this._checkMilestone(old, save.subs);
      }
      // Random real-user sub notification (roughly every 10 ticks when you have videos)
      if (save.videos.length > 0 && Math.random() < 0.3) {
        const name = RANDOM_SUBSCRIBER_NAMES[Math.floor(Math.random() * RANDOM_SUBSCRIBER_NAMES.length)];
        this._toast(`🔔 ${name} subscribed!`, "#222", "white");
      }
      writeSave(save);
      // Refresh sub display
      const subsDisplay = document.getElementById("yt-subs");
      if (subsDisplay) {
        subsDisplay.innerHTML =
          `<span style="color:#FF0000;font-weight:bold;">${this._fmt(save.subs)}</span>` +
          `<br><span style="font-size:10px;">subs</span>`;
      }
      if (activeTab === 1) this._renderVideos(contentArea, save);
      if (activeTab === 2) this._refreshEarningsStats(save);
    }, 2000);
  }

  // ── STUDIO TAB ──────────────────────────────────────────────────────────────

  private _renderStudio(container: HTMLElement, save: YTSave): void {
    container.style.cssText = "padding:18px 16px;display:flex;flex-direction:column;gap:14px;";

    if (this._recording) {
      this._renderRecording(container, save);
      return;
    }

    const hdr = document.createElement("div");
    hdr.style.cssText = "color:white;font-size:18px;font-weight:bold;";
    hdr.textContent = "🎬 Upload a Video";
    container.appendChild(hdr);

    const hint = document.createElement("div");
    hint.style.cssText = "color:rgba(255,255,255,0.35);font-size:13px;";
    hint.textContent = "Pick a topic to start recording:";
    container.appendChild(hint);

    TOPICS.forEach(topic => {
      const card = document.createElement("button");
      card.style.cssText =
        "background:#1a1a1a;border:1.5px solid rgba(255,255,255,0.1);border-radius:14px;" +
        "padding:14px 16px;cursor:pointer;text-align:left;" +
        "display:flex;align-items:center;gap:14px;width:100%;font-family:Arial,sans-serif;";
      card.innerHTML =
        `<span style="font-size:32px;">${topic.emoji}</span>` +
        `<div style="flex:1;">` +
          `<div style="color:white;font-size:15px;font-weight:bold;">${topic.name}</div>` +
          `<div style="color:rgba(255,255,255,0.35);font-size:12px;margin-top:2px;">${topic.titles.length} video ideas</div>` +
        `</div>` +
        `<span style="color:rgba(255,255,255,0.25);font-size:18px;">▶</span>`;
      card.onmouseenter = () => { card.style.borderColor = "#FF0000"; card.style.background = "rgba(255,0,0,0.07)"; };
      card.onmouseleave = () => { card.style.borderColor = "rgba(255,255,255,0.1)"; card.style.background = "#1a1a1a"; };
      card.onclick = () => this._renderTitlePicker(container, save, topic);
      container.appendChild(card);
    });
  }

  private _renderTitlePicker(
    container: HTMLElement, save: YTSave,
    topic: typeof TOPICS[number],
  ): void {
    container.innerHTML = "";
    container.style.cssText = "padding:18px 16px;display:flex;flex-direction:column;gap:12px;";

    const backRow = document.createElement("button");
    backRow.textContent = "← Back to topics";
    backRow.style.cssText =
      "background:none;border:none;color:rgba(255,255,255,0.4);font-size:13px;" +
      "cursor:pointer;text-align:left;padding:0;font-family:Arial,sans-serif;";
    backRow.onclick = () => { container.innerHTML = ""; this._renderStudio(container, save); };
    container.appendChild(backRow);

    const hdr = document.createElement("div");
    hdr.style.cssText = "color:white;font-size:17px;font-weight:bold;";
    hdr.innerHTML = `${topic.emoji} Pick a title:`;
    container.appendChild(hdr);

    topic.titles.forEach(t => {
      const btn = document.createElement("button");
      btn.style.cssText =
        "background:#1a1a1a;border:1.5px solid rgba(255,255,255,0.1);border-radius:12px;" +
        "padding:14px 16px;cursor:pointer;text-align:left;color:white;font-size:14px;" +
        "width:100%;font-family:Arial,sans-serif;";
      btn.textContent = `"${t}"`;
      btn.onmouseenter = () => { btn.style.borderColor = "#FF0000"; btn.style.background = "rgba(255,0,0,0.07)"; };
      btn.onmouseleave = () => { btn.style.borderColor = "rgba(255,255,255,0.1)"; btn.style.background = "#1a1a1a"; };
      btn.onclick = () => {
        this._selectedTopic = topic;
        this._selectedTitle = t;
        this._recording = true;
        container.innerHTML = "";
        this._renderStudio(container, save);
      };
      container.appendChild(btn);
    });
  }

  private _renderRecording(container: HTMLElement, save: YTSave): void {
    container.style.cssText =
      "padding:30px 16px;display:flex;flex-direction:column;align-items:center;gap:16px;";

    const card = document.createElement("div");
    card.style.cssText =
      "background:#1a1a1a;border-radius:16px;padding:24px;text-align:center;width:100%;max-width:320px;";
    card.innerHTML =
      `<div style="font-size:56px;margin-bottom:12px;">${this._selectedTopic?.emoji}</div>` +
      `<div style="color:white;font-size:15px;font-weight:bold;margin-bottom:4px;">"${this._selectedTitle}"</div>` +
      `<div style="color:#FF4444;font-size:13px;margin-bottom:16px;">🔴 Recording...</div>` +
      `<div style="background:rgba(255,255,255,0.1);border-radius:6px;height:12px;overflow:hidden;margin-bottom:8px;">` +
        `<div id="yt-recbar" style="height:100%;background:#FF0000;border-radius:6px;width:0%;"></div>` +
      `</div>` +
      `<div id="yt-recpct" style="color:rgba(255,255,255,0.4);font-size:12px;">0%</div>`;
    container.appendChild(card);

    const startTime = performance.now();
    const duration = 3000;
    const loop = () => {
      const pct = Math.min(1, (performance.now() - startTime) / duration);
      const barEl = document.getElementById("yt-recbar");
      const pctEl = document.getElementById("yt-recpct");
      if (barEl) barEl.style.width = `${pct * 100}%`;
      if (pctEl) pctEl.textContent = `${Math.floor(pct * 100)}%`;
      if (pct < 1) {
        this._recordRaf = requestAnimationFrame(loop);
      } else {
        this._recording = false;
        container.innerHTML = "";
        this._renderPublish(container, save);
      }
    };
    this._recordRaf = requestAnimationFrame(loop);
  }

  private _renderPublish(container: HTMLElement, save: YTSave): void {
    container.style.cssText =
      "padding:30px 16px;display:flex;flex-direction:column;align-items:center;gap:16px;";

    const thumb = document.createElement("div");
    thumb.style.cssText =
      "background:#1a1a1a;border-radius:16px;padding:24px;text-align:center;width:100%;max-width:320px;";
    thumb.innerHTML =
      `<div style="font-size:64px;margin-bottom:12px;">${this._selectedTopic?.emoji}</div>` +
      `<div style="color:white;font-size:16px;font-weight:bold;margin-bottom:4px;">"${this._selectedTitle}"</div>` +
      `<div style="color:rgba(255,255,255,0.4);font-size:13px;">by ${save.channelName}</div>` +
      `<div style="margin-top:12px;color:#00ff88;font-size:13px;">✅ Ready to publish!</div>`;
    container.appendChild(thumb);

    const pubBtn = document.createElement("button");
    pubBtn.textContent = "📤 Publish Video!";
    pubBtn.style.cssText =
      "background:#FF0000;color:white;font-size:18px;font-weight:bold;" +
      "padding:14px 32px;border-radius:50px;border:none;cursor:pointer;" +
      "box-shadow:0 4px 20px rgba(255,0,0,0.4);width:100%;max-width:280px;";
    pubBtn.onclick = () => {
      const v: VideoEntry = {
        id: save.nextId++,
        title: this._selectedTitle,
        emoji: this._selectedTopic?.emoji ?? "📹",
        views: 0,
        cashedViews: 0,
      };
      save.videos.unshift(v);
      writeSave(save);
      container.innerHTML = "";
      this._renderStudio(container, save);
      this._toast("🎉 Video Published!", "#FF0000", "white");
    };
    container.appendChild(pubBtn);

    const discardBtn = document.createElement("button");
    discardBtn.textContent = "🗑 Discard";
    discardBtn.style.cssText =
      "background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.45);font-size:14px;" +
      "padding:10px 24px;border-radius:30px;border:1px solid rgba(255,255,255,0.12);cursor:pointer;";
    discardBtn.onclick = () => { container.innerHTML = ""; this._renderStudio(container, save); };
    container.appendChild(discardBtn);
  }

  // ── VIDEOS TAB ──────────────────────────────────────────────────────────────

  private _renderVideos(container: HTMLElement, save: YTSave): void {
    container.innerHTML = "";
    container.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:10px;";

    if (save.videos.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText =
        "text-align:center;padding:50px 20px;color:rgba(255,255,255,0.3);font-size:15px;";
      empty.innerHTML =
        `<div style="font-size:48px;margin-bottom:12px;">📭</div>` +
        `No videos yet!<br><span style="font-size:13px;">Go to Studio to record your first video</span>`;
      container.appendChild(empty);
      return;
    }

    const count = document.createElement("div");
    count.style.cssText = "color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:1px;padding:0 2px;";
    count.textContent = `${save.videos.length} VIDEO${save.videos.length === 1 ? "" : "S"}`;
    container.appendChild(count);

    save.videos.forEach(v => {
      const uncashed = v.views - v.cashedViews;
      const card = document.createElement("div");
      card.style.cssText =
        "background:#1a1a1a;border-radius:14px;padding:14px 16px;" +
        "display:flex;flex-direction:column;gap:8px;";

      const topRow = document.createElement("div");
      topRow.style.cssText = "display:flex;align-items:center;gap:14px;";
      topRow.innerHTML =
        `<div style="font-size:36px;flex-shrink:0;">${v.emoji}</div>` +
        `<div style="flex:1;min-width:0;">` +
          `<div style="color:white;font-size:14px;font-weight:bold;` +
            `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">"${v.title}"</div>` +
          `<div style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:3px;">` +
            `👁 ${this._fmt(v.views)} views</div>` +
          `${uncashed > 0 ? `<div style="color:#FFD700;font-size:11px;margin-top:2px;">` +
            `💰 ${this._fmt(uncashed)} views uncashed</div>` : ""}` +
        `</div>`;
      card.appendChild(topRow);

      // Like row
      const likeRow = document.createElement("div");
      likeRow.style.cssText = "display:flex;align-items:center;gap:10px;padding-left:4px;";

      const likeCount = document.createElement("span");
      likeCount.style.cssText = "color:rgba(255,255,255,0.4);font-size:13px;";
      likeCount.textContent = "👍 ...";

      const likeBtn = document.createElement("button");
      likeBtn.style.cssText =
        "background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.6);font-size:12px;" +
        "padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);cursor:pointer;";
      likeBtn.textContent = "👍 Like";

      // Load likes for this video
      const key = `${save.channelName}::${v.title}`;
      fetch(`${SB_LIKES_URL}?channel_name=eq.${encodeURIComponent(save.channelName)}&video_title=eq.${encodeURIComponent(v.title)}&select=liker_name,liker_icon`, { headers: SB_HEADERS })
        .then(r => r.json())
        .then((rows: Array<{ liker_name: string; liker_icon: string }>) => {
          const myLike = rows.find(r => r.liker_name === save.channelName);
          likeCount.textContent = `👍 ${rows.length} like${rows.length === 1 ? "" : "s"}`;
          if (myLike) {
            likeBtn.textContent = "👍 Liked!";
            likeBtn.style.background = "rgba(255,0,0,0.2)";
            likeBtn.style.color = "#ff8080";
            likeBtn.style.borderColor = "rgba(255,80,80,0.3)";
          }
          // Show who liked
          if (rows.length > 0) {
            const likers = document.createElement("div");
            likers.style.cssText = "color:rgba(255,255,255,0.3);font-size:11px;padding-left:4px;";
            likers.textContent = rows.slice(0, 5).map(r => `${r.liker_icon}${r.liker_name}`).join("  ");
            card.appendChild(likers);
          }
        }).catch(() => { likeCount.textContent = "👍 0 likes"; });

      likeBtn.onclick = () => {
        const alreadyLiked = likeBtn.textContent?.includes("Liked");
        if (alreadyLiked) {
          fetch(`${SB_LIKES_URL}?channel_name=eq.${encodeURIComponent(save.channelName)}&video_title=eq.${encodeURIComponent(v.title)}&liker_name=eq.${encodeURIComponent(save.channelName)}`,
            { method: "DELETE", headers: SB_HEADERS })
            .then(() => this._renderVideos(container, save));
        } else {
          fetch(SB_LIKES_URL, { method: "POST", headers: { ...SB_HEADERS, "Prefer": "resolution=ignore-duplicates" },
            body: JSON.stringify({ channel_name: save.channelName, video_title: v.title, liker_name: save.channelName, liker_icon: save.icon }) })
            .then(() => this._renderVideos(container, save));
        }
      };

      likeRow.appendChild(likeCount);
      likeRow.appendChild(likeBtn);
      card.appendChild(likeRow);
      container.appendChild(card);
    });
  }

  // ── EARNINGS TAB ────────────────────────────────────────────────────────────

  private _renderEarnings(container: HTMLElement, save: YTSave): void {
    container.innerHTML = "";
    container.style.cssText =
      "padding:20px 16px;display:flex;flex-direction:column;gap:14px;align-items:center;";

    const totalViews    = save.videos.reduce((s, v) => s + v.views, 0);
    const cashedViews   = save.videos.reduce((s, v) => s + v.cashedViews, 0);
    const uncashedViews = totalViews - cashedViews;
    const coinsAvail    = Math.floor(uncashedViews / 50);

    // Stats card
    const stats = document.createElement("div");
    stats.style.cssText =
      "background:#1a1a1a;border-radius:16px;padding:20px;width:100%;max-width:320px;";
    stats.innerHTML =
      `<div style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:1px;margin-bottom:14px;">CHANNEL STATS</div>` +
      `<div id="yt-earn-stats" style="display:flex;flex-direction:column;gap:10px;">` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">👁 Total Views</span>` +
          `<span style="color:white;font-size:14px;font-weight:bold;">${this._fmt(totalViews)}</span>` +
        `</div>` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">👥 Subscribers</span>` +
          `<span style="color:#FF0000;font-size:14px;font-weight:bold;">${this._fmt(save.subs)}</span>` +
        `</div>` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">📹 Videos</span>` +
          `<span style="color:white;font-size:14px;font-weight:bold;">${save.videos.length}</span>` +
        `</div>` +
        `<div style="height:1px;background:rgba(255,255,255,0.06);"></div>` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">💰 Uncashed Views</span>` +
          `<span style="color:#FFD700;font-size:14px;font-weight:bold;">${this._fmt(uncashedViews)}</span>` +
        `</div>` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">🪙 Coins Available</span>` +
          `<span style="color:#FFD700;font-size:16px;font-weight:bold;">${coinsAvail}</span>` +
        `</div>` +
      `</div>`;
    container.appendChild(stats);

    const rateHint = document.createElement("div");
    rateHint.style.cssText = "color:rgba(255,255,255,0.25);font-size:12px;";
    rateHint.textContent = "50 views = 1 coin";
    container.appendChild(rateHint);

    // Cash out button
    const cashBtn = document.createElement("button");
    cashBtn.textContent = coinsAvail > 0
      ? `💰 Cash Out ${coinsAvail} Coins!`
      : "No coins to cash out yet";
    cashBtn.style.cssText =
      `background:${coinsAvail > 0 ? "linear-gradient(135deg,#b8860b,#FFD700)" : "rgba(255,255,255,0.05)"};` +
      `color:${coinsAvail > 0 ? "#1a0060" : "rgba(255,255,255,0.25)"};` +
      `font-size:17px;font-weight:bold;padding:16px 32px;border-radius:50px;border:none;` +
      `cursor:${coinsAvail > 0 ? "pointer" : "default"};` +
      `box-shadow:${coinsAvail > 0 ? "0 4px 20px rgba(255,215,0,0.35)" : "none"};` +
      `width:100%;max-width:320px;`;
    if (coinsAvail > 0) {
      cashBtn.onclick = () => {
        save.videos.forEach(v => { v.cashedViews = v.views; });
        this._game.state.coins += coinsAvail;
        this._game.save();
        writeSave(save);
        this._renderEarnings(container, save);
        this._toast(`🪙 +${coinsAvail} coins added!`, "linear-gradient(135deg,#b8860b,#FFD700)", "#1a0060");
      };
    }
    container.appendChild(cashBtn);

    // Thank You posts for reached milestones
    const milestones = [100, 1_000, 10_000, 100_000, 1_000_000];
    const reachedMilestones = milestones.filter(m => save.subs >= m);
    const unthanked = reachedMilestones.filter(m => !save.thankedMilestones.includes(m));
    if (unthanked.length > 0) {
      const thankDiv = document.createElement("div");
      thankDiv.style.cssText =
        "background:linear-gradient(135deg,rgba(255,0,0,0.15),rgba(255,80,80,0.08));" +
        "border:2px solid rgba(255,80,80,0.4);border-radius:16px;padding:16px;width:100%;max-width:320px;";
      thankDiv.innerHTML =
        `<div style="color:#ff8080;font-size:13px;font-weight:bold;margin-bottom:8px;">` +
          `🎉 Thank your fans for ${unthanked.map(m => this._fmt(m)).join(", ")} subs!` +
        `</div>` +
        `<textarea id="yt-thank-input" maxlength="120" placeholder="Write your thank you message..." style="` +
          `width:100%;background:rgba(255,255,255,0.07);color:white;border:1px solid rgba(255,255,255,0.15);` +
          `border-radius:10px;padding:10px;font-size:14px;font-family:Arial,sans-serif;` +
          `resize:none;height:70px;outline:none;box-sizing:border-box;"></textarea>`;
      const postBtn = document.createElement("button");
      postBtn.textContent = "📣 Post Thank You!";
      postBtn.style.cssText =
        "background:#FF0000;color:white;font-size:14px;font-weight:bold;" +
        "padding:10px 20px;border-radius:20px;border:none;cursor:pointer;margin-top:8px;width:100%;";
      postBtn.onclick = () => {
        const input = document.getElementById("yt-thank-input") as HTMLTextAreaElement;
        const msg = input?.value.trim();
        if (!msg) { input.style.borderColor = "#FF0000"; return; }
        unthanked.forEach(m => save.thankedMilestones.push(m));
        writeSave(save);
        this._showThankYouPost(save, msg, unthanked[unthanked.length - 1]);
        this._renderEarnings(container, save);
      };
      thankDiv.appendChild(postBtn);
      container.appendChild(thankDiv);
    }

    // Milestone progress
    const next = milestones.find(m => m > save.subs);
    if (next) {
      const pct = Math.min(1, save.subs / next);
      const milDiv = document.createElement("div");
      milDiv.style.cssText =
        "background:#1a1a1a;border-radius:16px;padding:16px;width:100%;max-width:320px;";
      milDiv.innerHTML =
        `<div style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:1px;margin-bottom:10px;">NEXT MILESTONE</div>` +
        `<div style="display:flex;justify-content:space-between;margin-bottom:8px;">` +
          `<span style="color:white;font-size:14px;">🏆 ${this._fmt(next)} subscribers</span>` +
          `<span style="color:rgba(255,255,255,0.4);font-size:13px;">${this._fmt(save.subs)} / ${this._fmt(next)}</span>` +
        `</div>` +
        `<div style="background:rgba(255,255,255,0.1);border-radius:6px;height:10px;overflow:hidden;">` +
          `<div style="height:100%;width:${(pct * 100).toFixed(1)}%;background:#FF0000;border-radius:6px;"></div>` +
        `</div>`;
      container.appendChild(milDiv);
    } else {
      const done = document.createElement("div");
      done.style.cssText = "color:#FFD700;font-size:15px;font-weight:bold;text-align:center;";
      done.textContent = "🏆 All milestones unlocked!";
      container.appendChild(done);
    }

    // Reset channel button
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "🗑 Delete Channel";
    resetBtn.style.cssText =
      "background:rgba(255,255,255,0.04);color:rgba(255,80,80,0.5);font-size:13px;" +
      "padding:8px 20px;border-radius:20px;border:1px solid rgba(255,80,80,0.2);cursor:pointer;" +
      "margin-top:8px;";
    resetBtn.onclick = () => {
      if (!confirm("Delete your channel and start over?")) return;
      clearInterval(this._interval);
      localStorage.removeItem(SAVE_KEY);
      this._save = null;
      this._showSetup();
    };
    container.appendChild(resetBtn);
  }

  // ── HELPERS ─────────────────────────────────────────────────────────────────

  // ── CHAT TAB ────────────────────────────────────────────────────────────────

  private _renderChat(container: HTMLElement, save: YTSave): void {
    container.innerHTML = "";
    container.style.cssText =
      "display:flex;flex-direction:column;height:100%;overflow:hidden;";

    // Messages area
    const msgs = document.createElement("div");
    msgs.id = "yt-chat-msgs";
    msgs.style.cssText =
      "flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;";
    const loading = document.createElement("div");
    loading.style.cssText = "color:rgba(255,255,255,0.3);font-size:13px;text-align:center;padding:20px;";
    loading.textContent = "Loading chat...";
    msgs.appendChild(loading);
    container.appendChild(msgs);

    // Input row
    const inputRow = document.createElement("div");
    inputRow.style.cssText =
      "display:flex;gap:8px;padding:10px 12px;border-top:1px solid rgba(255,255,255,0.08);" +
      "background:#1a1a1a;flex-shrink:0;";

    const iconEl = document.createElement("div");
    iconEl.style.cssText = "font-size:22px;flex-shrink:0;align-self:center;";
    iconEl.textContent = save.icon;
    inputRow.appendChild(iconEl);

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 120;
    input.placeholder = "Say something...";
    input.style.cssText =
      "flex:1;background:rgba(255,255,255,0.08);color:white;border:1px solid rgba(255,255,255,0.12);" +
      "border-radius:20px;padding:9px 14px;font-size:14px;outline:none;font-family:Arial,sans-serif;";
    inputRow.appendChild(input);

    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    sendBtn.style.cssText =
      "background:#FF0000;color:white;font-size:13px;font-weight:bold;" +
      "padding:9px 16px;border-radius:20px;border:none;cursor:pointer;flex-shrink:0;";

    const sendMsg = () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      fetch(SB_URL, { method: "POST", headers: SB_HEADERS,
        body: JSON.stringify({ username: save.channelName, icon: save.icon, message: text, is_bot: false }) })
        .then(() => this._pollChat());
    };
    sendBtn.onclick = sendMsg;
    input.addEventListener("keydown", e => { if (e.key === "Enter") sendMsg(); });
    inputRow.appendChild(sendBtn);
    container.appendChild(inputRow);

    // Initial load
    this._pollChat();
  }

  private _pollChat(): void {
    fetch(`${SB_URL}?order=created_at.desc&limit=40`, { headers: SB_HEADERS })
      .then(r => r.json())
      .then((rows: Array<{ id: number; username: string; icon: string; message: string; is_bot: boolean }>) => {
        const msgs = document.getElementById("yt-chat-msgs");
        if (!msgs) return;
        // Check if scrolled to bottom before update
        const atBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 40;
        msgs.innerHTML = "";
        // Show oldest first
        [...rows].reverse().forEach(row => {
          const el = document.createElement("div");
          el.style.cssText = "display:flex;gap:8px;align-items:flex-start;";
          el.innerHTML =
            `<span style="font-size:20px;flex-shrink:0;">${row.icon}</span>` +
            `<div>` +
              `<span style="color:${row.is_bot ? "#ff8080" : "#7dd3fc"};font-size:12px;font-weight:bold;">${row.username}</span>` +
              `${row.is_bot ? ` <span style="background:rgba(255,0,0,0.2);color:#ff8080;font-size:10px;padding:1px 5px;border-radius:6px;">BOT</span>` : ""}` +
              `<div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:2px;">${row.message}</div>` +
            `</div>`;
          msgs.appendChild(el);
        });
        if (atBottom) msgs.scrollTop = msgs.scrollHeight;
      })
      .catch(() => {});
  }

  // ── BROWSE TAB ──────────────────────────────────────────────────────────────

  private _renderBrowse(container: HTMLElement, save: YTSave): void {
    container.innerHTML = "";
    container.style.cssText = "padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto;";

    const hdr = document.createElement("div");
    hdr.style.cssText = "color:white;font-size:18px;font-weight:bold;";
    hdr.textContent = "🌍 Discover Channels";
    container.appendChild(hdr);

    const hint = document.createElement("div");
    hint.style.cssText = "color:rgba(255,255,255,0.35);font-size:13px;";
    hint.textContent = "Subscribe to channels you like!";
    container.appendChild(hint);

    const boostEl = document.createElement("div");
    const boost = 1 + save.subscribedTo.length;
    boostEl.style.cssText =
      "background:rgba(255,0,0,0.12);border:1px solid rgba(255,80,80,0.3);" +
      "border-radius:10px;padding:8px 14px;font-size:13px;color:#ff8080;";
    boostEl.textContent = `⚡ Sub Boost: ${boost}x — subscribed to ${save.subscribedTo.length}/${AI_CHANNELS.length} channels`;
    container.appendChild(boostEl);

    AI_CHANNELS.forEach(ch => {
      const isSubbed = save.subscribedTo.includes(ch.id);
      const card = document.createElement("div");
      card.style.cssText =
        "background:#1a1a1a;border-radius:16px;padding:14px 16px;" +
        "display:flex;flex-direction:column;gap:10px;";

      // Top row: icon + name + sub btn
      const topRow = document.createElement("div");
      topRow.style.cssText = "display:flex;align-items:center;gap:12px;";
      topRow.innerHTML =
        `<div style="font-size:36px;">${ch.icon}</div>` +
        `<div style="flex:1;">` +
          `<div style="color:white;font-size:15px;font-weight:bold;">${ch.name}</div>` +
          `<div style="color:rgba(255,255,255,0.4);font-size:12px;">${this._fmt(ch.subs)} subscribers • ${ch.niche}</div>` +
        `</div>`;

      const subBtn = document.createElement("button");
      subBtn.textContent = isSubbed ? "✅ Subscribed" : "Subscribe";
      subBtn.style.cssText =
        `background:${isSubbed ? "rgba(255,255,255,0.08)" : "#FF0000"};` +
        `color:${isSubbed ? "rgba(255,255,255,0.5)" : "white"};` +
        `font-size:13px;font-weight:bold;padding:8px 14px;border-radius:20px;border:none;cursor:pointer;` +
        `white-space:nowrap;`;
      subBtn.onclick = () => {
        if (isSubbed) {
          save.subscribedTo = save.subscribedTo.filter(id => id !== ch.id);
          this._toast(`Unsubscribed from ${ch.name}`, "#333", "white");
        } else {
          save.subscribedTo.push(ch.id);
          this._toast(`🔔 Subscribed to ${ch.name}!`, "#FF0000", "white");
          // They sub back if your channel is popular enough
          if (save.subs >= 1000 && Math.random() < 0.4) {
            setTimeout(() => {
              save.subs += Math.floor(Math.random() * 50) + 10;
              writeSave(save);
              this._toast(`🎉 ${ch.name} subscribed back!`, "#FF0000", "white");
            }, 2000 + Math.random() * 3000);
          }
        }
        writeSave(save);
        this._renderBrowse(container, save);
      };
      topRow.appendChild(subBtn);
      card.appendChild(topRow);

      // Videos list
      const vidList = document.createElement("div");
      vidList.style.cssText = "display:flex;flex-direction:column;gap:4px;padding-left:4px;";
      ch.videos.forEach(v => {
        const vEl = document.createElement("div");
        vEl.style.cssText = "color:rgba(255,255,255,0.45);font-size:12px;";
        vEl.textContent = `▶ "${v}"`;
        vidList.appendChild(vEl);
      });
      card.appendChild(vidList);

      container.appendChild(card);
    });
  }

  private _refreshEarningsStats(save: YTSave): void {
    const totalViews    = save.videos.reduce((s, v) => s + v.views, 0);
    const cashedViews   = save.videos.reduce((s, v) => s + v.cashedViews, 0);
    const uncashedViews = totalViews - cashedViews;
    const coinsAvail    = Math.floor(uncashedViews / 50);
    const el = document.getElementById("yt-earn-stats");
    if (el) {
      el.innerHTML =
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">👁 Total Views</span>` +
          `<span style="color:white;font-size:14px;font-weight:bold;">${this._fmt(totalViews)}</span>` +
        `</div>` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">👥 Subscribers</span>` +
          `<span style="color:#FF0000;font-size:14px;font-weight:bold;">${this._fmt(save.subs)}</span>` +
        `</div>` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">📹 Videos</span>` +
          `<span style="color:white;font-size:14px;font-weight:bold;">${save.videos.length}</span>` +
        `</div>` +
        `<div style="height:1px;background:rgba(255,255,255,0.06);"></div>` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">💰 Uncashed Views</span>` +
          `<span style="color:#FFD700;font-size:14px;font-weight:bold;">${this._fmt(uncashedViews)}</span>` +
        `</div>` +
        `<div style="display:flex;justify-content:space-between;">` +
          `<span style="color:rgba(255,255,255,0.55);font-size:14px;">🪙 Coins Available</span>` +
          `<span style="color:#FFD700;font-size:16px;font-weight:bold;">${coinsAvail}</span>` +
        `</div>`;
    }
  }

  private _showThankYouPost(save: YTSave, msg: string, milestone: number): void {
    const fakeComments = [
      "We love you!! ❤️", "You deserve it!!", "Keep going!! 🔥",
      "So proud of you 🙏", "LETS GOOO 🎉", "Best creator ever!",
      "Can't stop watching your vids!", "YOU EARNED IT!!",
      "This made me cry 😭❤️", "WE'RE ALL HERE FOR YOU!!",
    ];
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;" +
      "display:flex;align-items:center;justify-content:center;pointer-events:all;padding:20px;";

    const card = document.createElement("div");
    card.style.cssText =
      "background:#1a1a1a;border-radius:20px;padding:20px;max-width:340px;width:100%;" +
      "border:2px solid #FF0000;display:flex;flex-direction:column;gap:12px;";
    card.innerHTML =
      `<div style="display:flex;align-items:center;gap:10px;">` +
        `<span style="font-size:32px;">${save.icon}</span>` +
        `<div>` +
          `<div style="color:white;font-weight:bold;font-size:15px;">${save.channelName}</div>` +
          `<div style="color:rgba(255,255,255,0.4);font-size:12px;">📣 Community Post</div>` +
        `</div>` +
      `</div>` +
      `<div style="color:white;font-size:15px;line-height:1.5;">${msg}</div>` +
      `<div style="color:#FFD700;font-size:13px;font-weight:bold;">🎉 Thank you for ${this._fmt(milestone)} subscribers!</div>` +
      `<div style="height:1px;background:rgba(255,255,255,0.08);"></div>` +
      `<div style="color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:4px;">💬 Comments</div>`;

    // Random comments
    const shuffled = [...fakeComments].sort(() => Math.random() - 0.5).slice(0, 5);
    shuffled.forEach(c => {
      const name = RANDOM_SUBSCRIBER_NAMES[Math.floor(Math.random() * RANDOM_SUBSCRIBER_NAMES.length)];
      const cEl = document.createElement("div");
      cEl.style.cssText = "display:flex;gap:8px;align-items:flex-start;";
      cEl.innerHTML =
        `<span style="color:rgba(255,255,255,0.5);font-size:12px;font-weight:bold;white-space:nowrap;">${name}</span>` +
        `<span style="color:rgba(255,255,255,0.75);font-size:13px;">${c}</span>`;
      card.appendChild(cEl);
    });

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close";
    closeBtn.style.cssText =
      "background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);font-size:14px;" +
      "padding:10px;border-radius:12px;border:none;cursor:pointer;margin-top:4px;";
    closeBtn.onclick = () => overlay.remove();
    card.appendChild(closeBtn);

    overlay.appendChild(card);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  private _checkMilestone(oldSubs: number, newSubs: number): void {
    const milestones = [100, 1_000, 10_000, 100_000, 1_000_000];
    for (const m of milestones) {
      if (oldSubs < m && newSubs >= m) {
        const el = document.createElement("div");
        el.style.cssText =
          "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);" +
          "background:linear-gradient(135deg,#FF0000,#ff6666);color:white;" +
          "padding:20px 32px;border-radius:20px;font-size:18px;font-weight:bold;" +
          "z-index:9999;pointer-events:none;text-align:center;" +
          "box-shadow:0 0 50px rgba(255,0,0,0.6);";
        el.innerHTML = `🎉 MILESTONE!<br><span style="font-size:26px;">${this._fmt(m)} Subscribers!</span>`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3500);
        break;
      }
    }
  }

  private _toast(msg: string, bg: string, color: string): void {
    const el = document.createElement("div");
    el.style.cssText =
      `position:fixed;bottom:30px;left:50%;transform:translateX(-50%);` +
      `background:${bg};color:${color};padding:10px 22px;border-radius:20px;` +
      `font-size:14px;font-weight:bold;z-index:9999;pointer-events:none;` +
      `box-shadow:0 4px 20px rgba(0,0,0,0.4);`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }

  private _fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
    return n.toString();
  }

  private _goBack(): void {
    clearInterval(this._interval);
    clearInterval(this._chatInterval);
    cancelAnimationFrame(this._recordRaf);
    if (this._save) { this._save.lastSeen = Date.now(); writeSave(this._save); }
    this._game.ui.innerHTML = "";
    import("../ArcadeScene").then(m => new m.ArcadeScene(this._game));
  }
}
