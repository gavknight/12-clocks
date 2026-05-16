import type { Game } from "../game/Game";
import { MultiplayerManager } from "../multiplayer/MultiplayerManager";

const SB      = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/duel_queue";
const SB_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
const SB_H    = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "return=representation" };

export class DuelScene {
  private _game: Game;
  private _mp: MultiplayerManager | null = null;
  private _myRowId = "";
  private _pollTimer = 0;
  private _countdownTimer = 0;
  private _duelActive = false;
  private _opponentName = "";
  private _opponentLocks = 0;
  private _total = 0;
  private _progressInterval = 0;
  private _disposed = false;

  constructor(game: Game) {
    this._game = game;
    if (!game.state.username) { game.goAuth(); return; }
    this._total = game.state.difficulty || 12;
    this._showMatchmaking();
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────
  private _set(html: string) {
    if (this._disposed) return;
    this._game.ui.innerHTML = html;
  }

  // ── Matchmaking screen ─────────────────────────────────────────────────────
  private _showMatchmaking() {
    this._set(`
      <div class="screen" style="background:linear-gradient(160deg,#0a0020,#1a0050,#3a0090);
        flex-direction:column;align-items:center;justify-content:center;gap:24px;
        font-family:'Arial Black',Arial,sans-serif;color:white;">

        <div style="font-size:64px">⚔️</div>
        <div style="font-size:32px;font-weight:900;color:#ffe066;text-shadow:0 0 20px rgba(255,224,102,0.5)">
          DUEL MODE
        </div>
        <div style="color:rgba(255,255,255,0.6);font-size:14px;text-align:center;max-width:260px;line-height:1.6">
          Race a random opponent!<br>
          First to unlock <b style="color:#ffe066">${this._total} clocks</b> wins.
        </div>

        <div id="statusBox" style="background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.15);
          border-radius:16px;padding:20px 32px;text-align:center;min-width:240px;">
          <div style="font-size:28px;margin-bottom:8px">🔍</div>
          <div id="statusText" style="font-size:15px;color:rgba(255,255,255,0.8)">Finding opponent...</div>
          <div id="dotAnim" style="font-size:20px;margin-top:8px;letter-spacing:4px;color:#ffe066">• • •</div>
        </div>

        <div style="color:rgba(255,255,255,0.3);font-size:12px">Playing as: ${this._game.state.username}</div>

        <button id="cancelBtn" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);
          border:1.5px solid rgba(255,255,255,0.2);border-radius:12px;padding:10px 28px;
          font-size:15px;cursor:pointer;font-family:inherit;">
          ✕ Cancel
        </button>
      </div>
    `);
    document.getElementById("cancelBtn")!.onclick = () => this._cancel();

    // Animate dots
    let d = 0;
    const dots = ["•   ", "• • ", "• • •"];
    const dotEl = document.getElementById("dotAnim");
    const dotTimer = setInterval(() => {
      if (this._disposed || !dotEl) { clearInterval(dotTimer); return; }
      dotEl.textContent = dots[d++ % dots.length];
    }, 500);

    this._startMatchmaking();
  }

  // ── Matchmaking logic ──────────────────────────────────────────────────────
  private async _startMatchmaking() {
    try {
      // Set up our PeerJS peer first
      this._mp = new MultiplayerManager(this._game.state.username);
      await this._mp.goOnline();
      const myPeerId = `12clocks-${this._game.state.username.toLowerCase().replace(/\s+/g, "-")}`;

      // Look for a waiting opponent
      const waiting = await this._findWaiting();
      if (waiting) {
        // Someone is waiting — join them
        this._opponentName = waiting.username;
        this._myRowId = "";
        await this._joinOpponent(waiting.peer_id, waiting.id);
      } else {
        // Nobody waiting — put ourselves in the queue
        const row = await this._enqueue(myPeerId);
        this._myRowId = row.id;
        this._waitForOpponent();
      }
    } catch (e) {
      this._showError("Connection failed. Try again.");
    }
  }

  private async _findWaiting(): Promise<{ id: string; username: string; peer_id: string } | null> {
    const r = await fetch(
      `${SB}?status=eq.waiting&username=neq.${encodeURIComponent(this._game.state.username)}&order=created_at.asc&limit=1`,
      { headers: SB_H }
    );
    const rows = await r.json() as Array<{ id: string; username: string; peer_id: string }>;
    return rows[0] ?? null;
  }

  private async _enqueue(peerId: string): Promise<{ id: string }> {
    const r = await fetch(SB, {
      method: "POST",
      headers: SB_H,
      body: JSON.stringify({ username: this._game.state.username, peer_id: peerId, difficulty: this._total, status: "waiting" }),
    });
    const rows = await r.json() as Array<{ id: string }>;
    return rows[0];
  }

  private async _markMatched(rowId: string, opponentName: string) {
    await fetch(`${SB}?id=eq.${rowId}`, {
      method: "PATCH",
      headers: SB_H,
      body: JSON.stringify({ status: "matched", matched_with: opponentName }),
    });
  }

  private async _joinOpponent(opponentPeerId: string, opponentRowId: string) {
    const statusEl = document.getElementById("statusText");
    if (statusEl) statusEl.textContent = `Found ${this._opponentName}! Connecting...`;

    // Mark their row as matched
    await this._markMatched(opponentRowId, this._game.state.username);

    this._mp!.onDuelReady = () => this._startCountdown();
    this._mp!.onDuelProgress = (locks, total) => this._onOpponentProgress(locks, total);
    this._mp!.onDuelWin = () => this._onOpponentWin();
    this._mp!.onDisconnect = () => this._onDisconnect();

    await this._mp!.joinPlayer(this._opponentName);
    this._mp!.sendDuelReady();
  }

  private _waitForOpponent() {
    // Poll every 2s for someone to join our row
    this._pollTimer = window.setInterval(async () => {
      if (this._disposed) return;
      const r = await fetch(`${SB}?id=eq.${this._myRowId}&select=status,matched_with`, { headers: SB_H });
      const rows = await r.json() as Array<{ status: string; matched_with: string | null }>;
      if (!rows[0]) return;
      if (rows[0].status === "matched" && rows[0].matched_with) {
        clearInterval(this._pollTimer);
        this._opponentName = rows[0].matched_with;

        this._mp!.onDuelReady = () => {
          // Opponent connected and sent ready — send ours back, start countdown
          this._mp!.sendDuelReady();
          this._startCountdown();
        };
        this._mp!.onDuelProgress = (locks, total) => this._onOpponentProgress(locks, total);
        this._mp!.onDuelWin = () => this._onOpponentWin();
        this._mp!.onDisconnect = () => this._onDisconnect();
      }
    }, 2000);
  }

  // ── Countdown ──────────────────────────────────────────────────────────────
  private _startCountdown() {
    if (this._disposed) return;
    let count = 3;
    this._set(`
      <div class="screen" style="background:linear-gradient(160deg,#0a0020,#1a0050,#3a0090);
        flex-direction:column;align-items:center;justify-content:center;gap:16px;
        font-family:'Arial Black',Arial,sans-serif;color:white;">
        <div style="color:rgba(255,255,255,0.5);font-size:18px">Get ready to race!</div>
        <div style="font-size:16px;color:rgba(255,255,255,0.4)">vs <b style="color:#ffe066">${this._opponentName}</b></div>
        <div id="countNum" style="font-size:120px;font-weight:900;color:#ffe066;
          text-shadow:0 0 40px rgba(255,224,102,0.8);line-height:1">3</div>
      </div>
    `);
    const el = () => document.getElementById("countNum");
    this._countdownTimer = window.setInterval(() => {
      count--;
      if (count > 0) {
        const e = el(); if (e) e.textContent = String(count);
      } else {
        clearInterval(this._countdownTimer);
        const e = el(); if (e) e.textContent = "GO!";
        setTimeout(() => this._startDuel(), 700);
      }
    }, 1000);
  }

  // ── Duel in progress ────────────────────────────────────────────────────────
  private _startDuel() {
    if (this._disposed) return;
    this._duelActive = true;

    // Reset game state for a fresh run
    this._game.state.unlockedLocks.clear();
    this._game.state.inventory.length = 0;
    this._game.startTimer();

    // Show the duel HUD overlay on top of the game
    const hud = document.createElement("div");
    hud.id = "duelHud";
    hud.style.cssText =
      "position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99990;" +
      "background:rgba(0,0,0,0.75);border-radius:0 0 16px 16px;padding:8px 20px;" +
      "font-family:'Arial Black',Arial,sans-serif;color:white;display:flex;gap:24px;align-items:center;" +
      "pointer-events:none;font-size:13px;";
    hud.innerHTML = this._hudHTML();
    document.body.appendChild(hud);

    // Broadcast progress every 3s
    this._progressInterval = window.setInterval(() => {
      if (!this._duelActive || this._disposed) { clearInterval(this._progressInterval); return; }
      const locks = this._game.state.unlockedLocks.size;
      this._mp?.sendDuelProgress(locks, this._total);
      this._updateHud();
      if (locks >= this._total) this._iWin();
    }, 1500);

    // Go to the explore scene to play
    this._game.goExplore();
  }

  private _hudHTML(): string {
    const mine = this._game.state.unlockedLocks.size;
    const theirs = this._opponentLocks;
    const t = this._total;
    const myPct   = Math.min(100, (mine   / t) * 100);
    const thPct   = Math.min(100, (theirs / t) * 100);
    return `
      <div style="display:flex;flex-direction:column;gap:2px;align-items:center">
        <span style="color:#ffe066;font-size:11px">YOU</span>
        <div style="width:100px;height:8px;background:rgba(255,255,255,0.2);border-radius:4px">
          <div style="width:${myPct}%;height:100%;background:#4caf50;border-radius:4px;transition:width 0.4s"></div>
        </div>
        <span style="font-size:11px;color:rgba(255,255,255,0.7)">${mine}/${t} 🕐</span>
      </div>
      <div style="color:#e63946;font-size:18px;font-weight:900">VS</div>
      <div style="display:flex;flex-direction:column;gap:2px;align-items:center">
        <span style="color:#f9a825;font-size:11px">${this._opponentName.toUpperCase()}</span>
        <div style="width:100px;height:8px;background:rgba(255,255,255,0.2);border-radius:4px">
          <div style="width:${thPct}%;height:100%;background:#f44336;border-radius:4px;transition:width 0.4s"></div>
        </div>
        <span style="font-size:11px;color:rgba(255,255,255,0.7)">${theirs}/${t} 🕐</span>
      </div>
    `;
  }

  private _updateHud() {
    const hud = document.getElementById("duelHud");
    if (hud) hud.innerHTML = this._hudHTML();
  }

  private _onOpponentProgress(locks: number, _total: number) {
    this._opponentLocks = locks;
    this._updateHud();
  }

  // ── Win / Lose ─────────────────────────────────────────────────────────────
  private _iWin() {
    if (!this._duelActive) return;
    this._duelActive = false;
    clearInterval(this._progressInterval);
    this._mp?.sendDuelWin();
    this._showResult(true);
  }

  private _onOpponentWin() {
    if (!this._duelActive) return;
    this._duelActive = false;
    clearInterval(this._progressInterval);
    this._showResult(false);
  }

  private _showResult(won: boolean) {
    this._cleanupHud();
    const mine   = this._game.state.unlockedLocks.size;
    const theirs = this._opponentLocks;
    this._set(`
      <div class="screen" style="background:linear-gradient(160deg,${won?"#0a2a00,#1a5000,#2e7d32":"#2a0000,#500000,#7d0000"});
        flex-direction:column;align-items:center;justify-content:center;gap:20px;
        font-family:'Arial Black',Arial,sans-serif;color:white;">
        <div style="font-size:80px">${won ? "🏆" : "💀"}</div>
        <div style="font-size:36px;font-weight:900;color:${won?"#ffe066":"#ff6b6b"};
          text-shadow:0 0 20px ${won?"rgba(255,224,102,0.5)":"rgba(255,100,100,0.5)"}">
          ${won ? "YOU WIN!" : "YOU LOSE!"}
        </div>
        <div style="color:rgba(255,255,255,0.6);font-size:14px;text-align:center;line-height:1.8">
          You: <b style="color:#ffe066">${mine}/${this._total} clocks</b><br>
          ${this._opponentName}: <b style="color:#f9a825">${theirs}/${this._total} clocks</b>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button id="rematchBtn" style="background:#ffe066;color:#1a0060;border:none;border-radius:14px;
            padding:14px 28px;font-size:18px;font-weight:900;cursor:pointer;font-family:inherit;">
            ⚔️ Rematch
          </button>
          <button id="homeBtn" style="background:rgba(255,255,255,0.1);color:white;
            border:2px solid rgba(255,255,255,0.3);border-radius:14px;
            padding:14px 28px;font-size:18px;cursor:pointer;font-family:inherit;">
            🏠 Home
          </button>
        </div>
      </div>
    `);
    document.getElementById("rematchBtn")!.onclick = () => { this._cleanup(); this._game.goDuel(); };
    document.getElementById("homeBtn")!.onclick    = () => { this._cleanup(); this._game.goTitle(); };
  }

  private _onDisconnect() {
    if (!this._duelActive) return;
    this._duelActive = false;
    clearInterval(this._progressInterval);
    this._cleanupHud();
    this._showError("Opponent disconnected.");
  }

  private _showError(msg: string) {
    this._set(`
      <div class="screen" style="background:linear-gradient(160deg,#0a0020,#1a0050,#3a0090);
        flex-direction:column;align-items:center;justify-content:center;gap:20px;
        font-family:'Arial Black',Arial,sans-serif;color:white;">
        <div style="font-size:56px">😕</div>
        <div style="color:#ff6b6b;font-size:20px;font-weight:bold">${msg}</div>
        <div style="display:flex;gap:12px">
          <button id="retryBtn" style="background:#ffe066;color:#1a0060;border:none;border-radius:14px;
            padding:12px 28px;font-size:17px;font-weight:900;cursor:pointer;font-family:inherit;">
            Try Again
          </button>
          <button id="homeBtn2" style="background:rgba(255,255,255,0.1);color:white;
            border:2px solid rgba(255,255,255,0.3);border-radius:14px;
            padding:12px 28px;font-size:17px;cursor:pointer;font-family:inherit;">
            Home
          </button>
        </div>
      </div>
    `);
    document.getElementById("retryBtn")!.onclick  = () => { this._cleanup(); this._game.goDuel(); };
    document.getElementById("homeBtn2")!.onclick  = () => { this._cleanup(); this._game.goTitle(); };
  }

  private _cancel() {
    this._cleanup();
    this._game.goTitle();
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  private _cleanupHud() {
    document.getElementById("duelHud")?.remove();
  }

  private _cleanup() {
    this._disposed = true;
    clearInterval(this._pollTimer);
    clearInterval(this._progressInterval);
    clearInterval(this._countdownTimer);
    this._cleanupHud();
    if (this._myRowId) {
      fetch(`${SB}?id=eq.${this._myRowId}`, { method: "DELETE", headers: SB_H }).catch(() => {});
    }
    this._mp?.dispose();
    this._mp = null;
  }
}
