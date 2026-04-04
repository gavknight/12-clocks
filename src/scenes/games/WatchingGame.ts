/**
 * Watching Game — Watch your saved recordings + community clips!
 */
import type { Game } from "../../game/Game";
import { obsLoadAll, obsDelete, type Recording } from "./OBSRecorder";

const COMMUNITY_KEY  = "watching_community_v1";
const SB_URL  = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/community_recordings";
const SB_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const SB_H    = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json" };


export class WatchingGame {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _tab: "my" | "community" = "my";
  private _communityCache: Array<{ id: string; name: string; date: number; blob: string }> | null = null;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    this._build();
  }

  private _build() {
    const g = this._g;
    g.ui.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.style.cssText =
      "position:absolute;inset:0;background:linear-gradient(160deg,#0a0020,#000a20,#0a0a30);" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;overflow:hidden;pointer-events:all;";
    this._wrap = wrap;

    // ── Header ─────────────────────────────────────────────────────────────────
    const header = document.createElement("div");
    header.style.cssText =
      "flex-shrink:0;padding:14px 16px 10px;display:flex;align-items:center;gap:10px;" +
      "border-bottom:1px solid rgba(255,255,255,0.08);";
    header.innerHTML =
      `<button id="wgBack" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);` +
      `color:rgba(255,255,255,0.8);font-size:14px;padding:7px 14px;border-radius:10px;cursor:pointer;">← Back</button>` +
      `<div style="flex:1;text-align:center;">` +
        `<div style="color:white;font-size:20px;font-weight:900;letter-spacing:2px;">📺 WATCHING</div>` +
        `<div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:2px;">Your clips & community recordings</div>` +
      `</div>` +
      `<div style="width:80px;"></div>`;
    wrap.appendChild(header);

    // ── Tabs ───────────────────────────────────────────────────────────────────
    const tabs = document.createElement("div");
    tabs.style.cssText =
      "flex-shrink:0;display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.08);";
    tabs.innerHTML =
      `<button id="tabMy" style="flex:1;padding:12px;font-size:14px;font-weight:bold;cursor:pointer;border:none;` +
      `background:rgba(255,255,255,0.08);color:white;border-bottom:2px solid #4488ff;">📼 My Recordings</button>` +
      `<button id="tabCom" style="flex:1;padding:12px;font-size:14px;font-weight:bold;cursor:pointer;border:none;` +
      `background:transparent;color:rgba(255,255,255,0.5);border-bottom:2px solid transparent;">🌍 Community</button>`;
    wrap.appendChild(tabs);

    // ── Content area ───────────────────────────────────────────────────────────
    const content = document.createElement("div");
    content.id = "wgContent";
    content.style.cssText = "flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;";
    wrap.appendChild(content);

    g.ui.appendChild(wrap);

    // Events
    document.getElementById("wgBack")!.onclick = () => {
      g.inMiniGame = false;
      g.ui.innerHTML = "";
      import("../ArcadeScene").then(m => new m.ArcadeScene(g));
    };

    const tabMy  = document.getElementById("tabMy")!  as HTMLButtonElement;
    const tabCom = document.getElementById("tabCom")! as HTMLButtonElement;

    tabMy.onclick  = () => { this._tab = "my";        this._styleTab(tabMy, tabCom); this._renderMyTab(content); };
    tabCom.onclick = () => { this._tab = "community"; this._styleTab(tabCom, tabMy); this._renderCommunityTab(content); };

    this._renderMyTab(content);
  }

  private _styleTab(active: HTMLButtonElement, inactive: HTMLButtonElement) {
    active.style.background   = "rgba(255,255,255,0.08)";
    active.style.color        = "white";
    active.style.borderBottom = "2px solid #4488ff";
    inactive.style.background   = "transparent";
    inactive.style.color        = "rgba(255,255,255,0.5)";
    inactive.style.borderBottom = "2px solid transparent";
  }

  // ── MY RECORDINGS tab ───────────────────────────────────────────────────────
  private _renderMyTab(content: HTMLDivElement) {
    content.innerHTML = `<div style="text-align:center;color:rgba(255,255,255,0.4);padding:20px 0;font-size:13px;">Loading…</div>`;
    obsLoadAll().then(recs => {
      content.innerHTML = "";
      if (!recs.length) {
        content.innerHTML =
          `<div style="text-align:center;color:rgba(255,255,255,0.3);margin-top:60px;">` +
          `<div style="font-size:48px;margin-bottom:12px;">📭</div>` +
          `<div style="font-size:16px;font-weight:bold;">No recordings yet</div>` +
          `<div style="font-size:13px;margin-top:8px;">Open OBS Recorder to record your gameplay!</div>` +
          `</div>`;
        return;
      }
      for (const rec of recs) content.appendChild(this._makeCard(rec, true));
    });
  }

  // ── COMMUNITY tab ───────────────────────────────────────────────────────────
  private _renderCommunityTab(content: HTMLDivElement) {
    content.innerHTML =
      `<div style="text-align:center;color:rgba(255,255,255,0.4);padding:20px 0;font-size:13px;">Loading community clips…</div>`;

    if (this._communityCache) {
      this._showCommunity(content, this._communityCache);
      return;
    }

    fetch(`${SB_URL}?select=id,name,date,blob&order=date.desc&limit=20`, { headers: SB_H })
      .then(r => r.json())
      .then((rows: Array<{ id: string; name: string; date: number; blob: string }>) => {
        this._communityCache = rows;
        this._showCommunity(content, rows);
      })
      .catch(() => {
        content.innerHTML =
          `<div style="text-align:center;color:rgba(255,100,100,0.7);margin-top:40px;">` +
          `<div style="font-size:32px;margin-bottom:8px;">😕</div>` +
          `<div>Couldn't load community clips.<br>Check your connection!</div></div>`;
      });
  }

  private _showCommunity(content: HTMLDivElement, rows: Array<{ id: string; name: string; date: number; blob: string }>) {
    content.innerHTML = "";

    // Share my recordings button
    obsLoadAll().then(myRecs => {
      if (!myRecs.length) return;
      const shareBtn = document.createElement("button");
      shareBtn.style.cssText =
        "background:linear-gradient(135deg,#1a5a2a,#2a9a4a);border:2px solid rgba(80,200,100,0.6);" +
        "border-radius:16px;padding:14px 20px;cursor:pointer;color:white;font-size:14px;font-weight:bold;" +
        "display:flex;align-items:center;gap:10px;width:100%;";
      shareBtn.innerHTML = `<span style="font-size:22px;">📤</span> Share my latest recording to Community`;
      shareBtn.onclick = () => this._shareLatest(shareBtn, myRecs[0], content);
      content.insertBefore(shareBtn, content.firstChild);
    });

    if (!rows.length) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;color:rgba(255,255,255,0.3);margin-top:40px;";
      empty.innerHTML =
        `<div style="font-size:48px;margin-bottom:12px;">🌍</div>` +
        `<div style="font-size:16px;font-weight:bold;">No community clips yet</div>` +
        `<div style="font-size:13px;margin-top:8px;">Be the first to share!</div>`;
      content.appendChild(empty);
      return;
    }

    for (const row of rows) {
      content.appendChild(this._makeCard(row as unknown as Recording, false));
    }
  }

  private _shareLatest(btn: HTMLButtonElement, rec: Recording, content: HTMLDivElement) {
    btn.disabled = true;
    btn.innerHTML = `<span style="font-size:22px;">⏳</span> Sharing…`;

    const payload = { id: rec.id, name: rec.name, date: rec.date, blob: rec.blob };
    fetch(SB_URL, {
      method: "POST",
      headers: { ...SB_H, "Prefer": "return=minimal" },
      body: JSON.stringify(payload),
    })
      .then(r => {
        if (!r.ok) throw new Error();
        btn.innerHTML = `<span style="font-size:22px;">✅</span> Shared! Refresh Community tab to see it`;
        this._communityCache = null; // invalidate cache
      })
      .catch(() => {
        btn.innerHTML = `<span style="font-size:22px;">❌</span> Share failed — try again`;
        btn.disabled = false;
      });
  }

  // ── Card ────────────────────────────────────────────────────────────────────
  private _makeCard(rec: Recording, isMine: boolean): HTMLDivElement {
    const card = document.createElement("div");
    card.style.cssText =
      "background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;" +
      "padding:16px;display:flex;flex-direction:column;gap:10px;";

    const dur    = rec.duration ? `${(rec.duration / 1000).toFixed(1)}s` : "?s";
    const date   = rec.date ? new Date(rec.date).toLocaleDateString() : "";
    const label  = isMine ? "📼 Your clip" : "🌍 Community";

    card.innerHTML =
      `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">` +
        `<div style="background:rgba(68,136,255,0.2);border:1px solid rgba(68,136,255,0.4);` +
        `border-radius:8px;padding:2px 10px;font-size:11px;font-weight:bold;color:#88bbff;">${label}</div>` +
        `<div style="color:white;font-size:15px;font-weight:bold;flex:1;">${rec.name || "Untitled"}</div>` +
        `<div style="color:rgba(255,255,255,0.35);font-size:12px;">${dur} · ${date}</div>` +
      `</div>` +
      `<div style="display:flex;gap:8px;flex-wrap:wrap;">` +
        `<button class="wg-play" style="background:linear-gradient(135deg,#1a3a8a,#3a6acc);border:1.5px solid rgba(100,160,255,0.5);` +
        `border-radius:10px;padding:8px 16px;cursor:pointer;color:white;font-size:13px;font-weight:bold;">▶ Play</button>` +
        `<button class="wg-dl" style="background:linear-gradient(135deg,#1a4a2a,#2a8a4a);border:1.5px solid rgba(80,180,100,0.5);` +
        `border-radius:10px;padding:8px 16px;cursor:pointer;color:white;font-size:13px;font-weight:bold;">⬇ Download</button>` +
      `</div>`;

    card.querySelector(".wg-play")!.addEventListener("click", () => this._playRec(rec));
    card.querySelector(".wg-dl")!.addEventListener("click",   () => this._downloadRec(rec));

    return card;
  }

  // ── Play overlay ────────────────────────────────────────────────────────────
  private _playRec(rec: Recording) {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;";

    const video = document.createElement("video");
    video.controls = true;
    video.style.cssText =
      "max-width:90vw;max-height:70vh;border-radius:12px;box-shadow:0 0 40px rgba(0,0,0,0.8);";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close";
    closeBtn.style.cssText =
      "background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);color:white;" +
      "font-size:14px;font-weight:bold;padding:10px 28px;border-radius:30px;cursor:pointer;";
    closeBtn.onclick = () => { video.pause(); video.src = ""; overlay.remove(); };

    overlay.appendChild(video);
    overlay.appendChild(closeBtn);
    overlay.onclick = e => { if (e.target === overlay) { video.pause(); video.src = ""; overlay.remove(); } };
    document.body.appendChild(overlay);

    const blobURL = URL.createObjectURL(rec.blob);
    video.src = blobURL;
    video.play().catch(() => {});
    closeBtn.addEventListener("click", () => URL.revokeObjectURL(blobURL), { once: true });
  }

  // ── Download ─────────────────────────────────────────────────────────────────
  private _downloadRec(rec: Recording) {
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.name || "recording"}.webm`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    // Clipchamp tip toast
    const toast = document.createElement("div");
    toast.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
      "background:linear-gradient(135deg,#1a4a8a,#2a6acc);color:white;" +
      "font-size:13px;font-weight:bold;padding:12px 22px;border-radius:30px;" +
      "box-shadow:0 4px 16px rgba(0,0,0,0.5);z-index:99999;text-align:center;" +
      "pointer-events:none;";
    toast.innerHTML = "⬇ Downloaded! Open in <b>Clipchamp</b> to edit, trim & add text 🎬";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}
