/**
 * OBS Recorder — Record your 12 Clocks gameplay!
 * Directly captures the minigame canvas stream — no compositing, no taint issues.
 * Start recording, close OBS, play a minigame, come back to stop & save.
 */
import type { Game } from "../../game/Game";

const DB_NAME    = "obs_recorder_db";
const DB_VERSION = 1;
const STORE      = "recordings";

export interface Recording {
  id: string;
  name: string;
  blob: Blob;
  date: number;
  duration: number;
}

// ── IndexedDB ─────────────────────────────────────────────────────────────────
function _openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}
export async function obsLoadAll(): Promise<Recording[]> {
  try {
    const db = await _openDB();
    return new Promise((res, rej) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => res((req.result as Recording[]).sort((a,b) => b.date - a.date));
      req.onerror   = () => rej(req.error);
    });
  } catch { return []; }
}
async function _obsSave(rec: Recording) {
  const db = await _openDB();
  return new Promise<void>((res, rej) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(rec);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}
export async function obsDelete(id: string) {
  const db = await _openDB();
  return new Promise<void>((res, rej) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

// ── Global recording state ────────────────────────────────────────────────────
let _recording    = false;
let _finalizing   = false;
let _globalMR:    MediaRecorder | null = null;
let _globalChunks: Blob[]              = [];
let _globalMime:   string              = "video/webm";
let _globalStart:  number              = 0;
let _observer:     MutationObserver | null = null;
let _pendingBlob:  Blob | null         = null;
let _pendingDur:   number              = 0;
let _indicator:    HTMLDivElement | null = null;
let _indTimer:     ReturnType<typeof setInterval> | null = null;
let _gameRef:      import("../../game/Game").Game | null = null;

export function obsIsRecording() { return _recording || _finalizing; }
export function obsHasPending()  { return _pendingBlob !== null; }

function _showIndicator() {
  if (_indicator) return;
  _indicator = document.createElement("div");
  _indicator.style.cssText =
    "position:fixed;top:10px;right:10px;z-index:99998;" +
    "background:rgba(180,0,0,0.92);color:white;" +
    "font-family:'Arial Black',Arial;font-size:12px;font-weight:900;" +
    "padding:5px 11px;border-radius:8px;letter-spacing:1px;" +
    "box-shadow:0 2px 8px rgba(0,0,0,0.6);pointer-events:none;";
  document.body.appendChild(_indicator);
  _indTimer = setInterval(() => {
    if (!_indicator) return;
    const s = Math.floor((Date.now() - _globalStart) / 1000);
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
    _indicator.textContent = h > 0
      ? `🔴 REC ${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`
      : `🔴 REC ${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
  }, 1000);
}
function _hideIndicator() {
  if (_indTimer) { clearInterval(_indTimer); _indTimer = null; }
  if (_indicator) { _indicator.remove(); _indicator = null; }
}

function _pickMime(): string {
  for (const t of ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm","video/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "video/webm";
}

function _findMinigameCanvas(): HTMLCanvasElement | null {
  const gc = document.getElementById("gameCanvas");
  return Array.from(document.querySelectorAll<HTMLCanvasElement>("canvas"))
    .find(c => c !== gc && c.width > 0 && c.height > 0) ?? null;
}

function _startCapturing(canvas: HTMLCanvasElement) {
  if (_globalMR?.state === "recording") return;
  _globalMime = _pickMime();
  _globalChunks = [];
  const stream = canvas.captureStream(30);
  _globalMR = new MediaRecorder(stream, { mimeType: _globalMime, videoBitsPerSecond: 2_000_000 });
  _globalMR.ondataavailable = e => { if (e.data.size > 0) _globalChunks.push(e.data); };
  _globalMR.start(200);
}

export function obsStartGlobal() {
  if (_recording) return;
  _recording   = true;
  _globalStart = Date.now();
  _globalChunks = [];
  _showIndicator();

  // Capture any canvas that already exists (e.g. user starts recording inside a minigame)
  const existing = _findMinigameCanvas();
  if (existing) _startCapturing(existing);

  // Watch for new canvases appearing (user navigates to a minigame after starting)
  _observer = new MutationObserver(() => {
    if (!_recording || _globalMR?.state === "recording") return;
    const c = _findMinigameCanvas();
    if (c) _startCapturing(c);
  });
  _observer.observe(document.body, { childList: true, subtree: true });
}

export function obsStopGlobal() {
  if (!_recording) return;
  _recording = false;
  _observer?.disconnect(); _observer = null;
  _hideIndicator();

  const _finish = () => {
    if (_globalChunks.length > 0) {
      _pendingBlob = new Blob(_globalChunks, { type: _globalMime });
      _pendingDur  = Date.now() - _globalStart;
    }
    _globalMR = null; _globalChunks = []; _finalizing = false;
  };

  if (_globalMR?.state === "recording") {
    _finalizing = true;
    _globalMR.addEventListener("stop", _finish, { once: true });
    _globalMR.stop();
  } else {
    // Recorder auto-stopped (canvas was removed) — still save whatever chunks we have
    _finish();
  }
}

// ── UI ────────────────────────────────────────────────────────────────────────
export class OBSRecorder {
  private _g: Game;
  private _wrap!: HTMLDivElement;
  private _statusEl!: HTMLDivElement;
  private _timerEl!: HTMLDivElement;
  private _recBtn!: HTMLButtonElement;
  private _stopBtn!: HTMLButtonElement;
  private _saveArea!: HTMLDivElement;
  private _nameInput!: HTMLInputElement;
  private _listEl!: HTMLDivElement;
  private _uiIv = 0;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column;" +
      "background:linear-gradient(135deg,#0a0010,#100020,#0a0010);font-family:Arial,sans-serif;pointer-events:all;";
    g.ui.appendChild(this._wrap);
    this._buildUI();
  }

  private _buildUI() {
    const hdr = document.createElement("div");
    hdr.style.cssText =
      "display:flex;align-items:center;gap:12px;padding:12px 16px;" +
      "background:rgba(0,0,0,0.4);border-bottom:1px solid rgba(255,80,80,0.2);flex-shrink:0;";
    hdr.innerHTML =
      `<button id="obsBack" style="background:rgba(255,255,255,0.08);color:white;border:1px solid ` +
      `rgba(255,255,255,0.2);border-radius:10px;padding:6px 14px;font-size:13px;cursor:pointer;">← Arcade</button>` +
      `<div style="color:#ff4444;font-size:18px;font-weight:bold;flex:1;text-align:center;">🔴 OBS Recorder</div>` +
      `<div style="width:80px;"></div>`;
    this._wrap.appendChild(hdr);
    document.getElementById("obsBack")!.onclick = () => this._exit();

    if (typeof MediaRecorder === "undefined") {
      const err = document.createElement("div");
      err.style.cssText = "flex:1;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);font-size:16px;text-align:center;padding:24px;";
      err.textContent = "😔 Your browser doesn't support recording. Try Chrome or Edge!";
      this._wrap.appendChild(err);
      return;
    }

    const panel = document.createElement("div");
    panel.style.cssText =
      "padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:14px;flex-shrink:0;" +
      "border-bottom:1px solid rgba(255,255,255,0.08);";

    this._statusEl = document.createElement("div");
    this._statusEl.style.cssText = "font-size:14px;color:rgba(255,255,255,0.6);text-align:center;max-width:300px;line-height:1.6;";
    panel.appendChild(this._statusEl);

    this._timerEl = document.createElement("div");
    this._timerEl.style.cssText = "font-size:44px;font-family:monospace;color:#ff4444;display:none;font-weight:bold;";
    panel.appendChild(this._timerEl);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;";

    this._recBtn = document.createElement("button");
    this._recBtn.style.cssText =
      "background:linear-gradient(135deg,#cc0000,#880000);color:white;border:none;" +
      "border-radius:14px;padding:14px 32px;font-size:16px;cursor:pointer;font-weight:bold;";
    this._recBtn.onclick = () => { obsStartGlobal(); this._syncUI(); };
    btnRow.appendChild(this._recBtn);

    this._stopBtn = document.createElement("button");
    this._stopBtn.textContent = "⏹ Stop";
    this._stopBtn.style.cssText =
      "background:rgba(20,0,0,0.8);color:#ff6666;border:1.5px solid rgba(255,60,60,0.4);" +
      "border-radius:14px;padding:14px 32px;font-size:16px;cursor:pointer;display:none;font-weight:bold;";
    this._stopBtn.onclick = () => {
      obsStopGlobal();
      const poll = setInterval(() => {
        if (!obsIsRecording()) { clearInterval(poll); this._syncUI(); this._loadAndRenderList(); }
      }, 100);
    };
    btnRow.appendChild(this._stopBtn);
    panel.appendChild(btnRow);

    const hint = document.createElement("div");
    hint.style.cssText = "color:rgba(255,255,255,0.3);font-size:12px;text-align:center;max-width:280px;line-height:1.6;";
    hint.innerHTML = "∞ No time limit • Close OBS and play any minigame<br>🔴 badge stays in the corner while recording!";
    panel.appendChild(hint);

    this._saveArea = document.createElement("div");
    this._saveArea.style.cssText =
      "display:none;flex-direction:column;align-items:center;gap:8px;width:100%;max-width:320px;";
    this._nameInput = document.createElement("input");
    this._nameInput.type = "text"; this._nameInput.maxLength = 40;
    this._nameInput.placeholder = "Name your recording...";
    this._nameInput.style.cssText =
      "background:rgba(255,255,255,0.1);color:white;border:1.5px solid rgba(255,80,80,0.4);" +
      "border-radius:10px;padding:10px 14px;font-size:14px;width:100%;font-family:Arial,sans-serif;";
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "💾 Save Recording";
    saveBtn.style.cssText =
      "background:linear-gradient(135deg,#884400,#cc6600);color:white;border:none;" +
      "border-radius:12px;padding:11px 24px;font-size:14px;cursor:pointer;font-weight:bold;width:100%;";
    saveBtn.onclick = () => this._savePending();
    const discardBtn = document.createElement("button");
    discardBtn.textContent = "🗑 Discard";
    discardBtn.style.cssText = "background:transparent;color:rgba(255,80,80,0.6);border:none;font-size:13px;cursor:pointer;";
    discardBtn.onclick = () => { _pendingBlob = null; _pendingDur = 0; this._syncUI(); };
    this._saveArea.appendChild(this._nameInput);
    this._saveArea.appendChild(saveBtn);
    this._saveArea.appendChild(discardBtn);
    panel.appendChild(this._saveArea);
    this._wrap.appendChild(panel);

    const listHdr = document.createElement("div");
    listHdr.style.cssText = "padding:12px 16px 4px;color:rgba(255,255,255,0.4);font-size:12px;letter-spacing:2px;flex-shrink:0;";
    listHdr.textContent = "SAVED RECORDINGS";
    this._wrap.appendChild(listHdr);

    this._listEl = document.createElement("div");
    this._listEl.style.cssText = "flex:1;overflow-y:auto;padding:0 12px 16px;";
    this._wrap.appendChild(this._listEl);

    this._syncUI();
    this._loadAndRenderList();

    this._uiIv = setInterval(() => {
      if (!obsIsRecording()) return;
      const s = Math.floor((Date.now() - _globalStart) / 1000);
      const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
      this._timerEl.textContent = h > 0
        ? `${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`
        : `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
    }, 500) as unknown as number;
  }

  private _syncUI() {
    if (_pendingBlob) {
      this._recBtn.style.display = "none"; this._stopBtn.style.display = "none";
      this._timerEl.style.display = "none";
      this._statusEl.textContent = "✅ Recording ready — give it a name and save!";
      this._statusEl.style.color = "#44ff88";
      this._saveArea.style.display = "flex";
      obsLoadAll().then(all => { this._nameInput.value = `Recording ${all.length + 1}`; });
      return;
    }
    if (obsIsRecording()) {
      this._recBtn.style.display = "none"; this._stopBtn.style.display = "";
      this._timerEl.style.display = ""; this._timerEl.textContent = "00:00";
      this._statusEl.textContent = "🔴 Close OBS and play a minigame — recording will capture it!";
      this._statusEl.style.color = "#ff4444"; this._saveArea.style.display = "none";
    } else {
      this._recBtn.textContent = "⏺ Start Recording"; this._recBtn.style.display = "";
      this._stopBtn.style.display = "none"; this._timerEl.style.display = "none";
      this._statusEl.textContent = obsHasPending()
        ? ""
        : "Hit Start → close OBS → play any minigame!\nCome back here to stop and save.";
      this._statusEl.style.color = "rgba(255,255,255,0.55)"; this._saveArea.style.display = "none";
    }
  }

  private _savePending() {
    if (!_pendingBlob) return;
    const blob = _pendingBlob, dur = _pendingDur;
    const name = this._nameInput.value.trim() || "Recording";
    _obsSave({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), name, blob, date: Date.now(), duration: dur })
      .then(() => {
        _pendingBlob = null; _pendingDur = 0;
        this._statusEl.textContent = "💾 Saved!"; this._statusEl.style.color = "#44ff88";
        this._saveArea.style.display = "none";
        setTimeout(() => this._syncUI(), 1500);
        this._loadAndRenderList();
      });
  }

  private _loadAndRenderList() {
    obsLoadAll().then(recs => {
      this._listEl.innerHTML = "";
      if (!recs.length) {
        this._listEl.innerHTML = `<div style="text-align:center;padding:32px;color:rgba(255,255,255,0.3);font-size:14px;">🎬 No recordings yet — hit Start Recording!</div>`;
        return;
      }
      for (const rec of recs) {
        const s = Math.floor(rec.duration/1000);
        const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), ss = s%60;
        const dur = h > 0
          ? `${h}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`
          : `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
        const card = document.createElement("div");
        card.style.cssText =
          "display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:8px;" +
          "background:rgba(255,255,255,0.05);border:1px solid rgba(255,80,80,0.2);border-radius:14px;";
        card.innerHTML =
          `<div style="font-size:28px;flex-shrink:0;">🎬</div>` +
          `<div style="flex:1;min-width:0;">` +
            `<div style="color:white;font-weight:bold;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${rec.name}</div>` +
            `<div style="color:rgba(255,255,255,0.4);font-size:12px;">${new Date(rec.date).toLocaleDateString()} • ${dur}</div>` +
          `</div>` +
          `<div style="display:flex;gap:6px;flex-shrink:0;">` +
            `<button data-a="play"     data-id="${rec.id}" style="background:rgba(0,100,255,0.3);color:white;border:1px solid rgba(80,140,255,0.4);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;">▶ Play</button>` +
            `<button data-a="download" data-id="${rec.id}" style="background:rgba(0,150,100,0.3);color:white;border:1px solid rgba(80,220,150,0.4);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;">⬇ Edit</button>` +
            `<button data-a="delete"   data-id="${rec.id}" style="background:rgba(150,0,0,0.3);color:white;border:1px solid rgba(255,60,60,0.3);border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;">🗑</button>` +
          `</div>`;
        card.querySelectorAll<HTMLButtonElement>("button[data-a]").forEach(btn => {
          btn.onclick = () => {
            if (btn.dataset.a === "play")     this._play(rec);
            if (btn.dataset.a === "download") this._download(rec);
            if (btn.dataset.a === "delete")   { obsDelete(rec.id).then(() => this._loadAndRenderList()); }
          };
        });
        this._listEl.appendChild(card);
      }
    });
  }

  private _play(rec: Recording) {
    const url = URL.createObjectURL(rec.blob);
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;";
    const title = document.createElement("div");
    title.style.cssText = "color:white;font-size:16px;font-weight:bold;";
    title.textContent = rec.name;
    const vid = document.createElement("video");
    vid.controls = true; vid.src = url;
    vid.style.cssText = "width:90%;max-width:700px;max-height:65vh;border-radius:10px;background:#000;";
    const close = document.createElement("button");
    close.textContent = "✕ Close";
    close.style.cssText = "background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.25);border-radius:10px;padding:8px 20px;font-size:13px;cursor:pointer;";
    close.onclick = () => { vid.pause(); vid.src = ""; URL.revokeObjectURL(url); overlay.remove(); };
    overlay.appendChild(title); overlay.appendChild(vid); overlay.appendChild(close);
    document.body.appendChild(overlay);
    vid.play().catch(() => {});
  }

  private _download(rec: Recording) {
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement("a");
    a.href = url; a.download = rec.name.replace(/[^a-z0-9]/gi, "_") + ".webm"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    const tip = document.createElement("div");
    tip.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1a4a8a;color:white;padding:12px 20px;border-radius:12px;font-size:13px;z-index:9999;text-align:center;";
    tip.textContent = "📥 Downloaded! Open in Clipchamp to edit — add text, cuts & music!";
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 4000);
  }

  private _exit() {
    clearInterval(this._uiIv);
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}
