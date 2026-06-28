import type { Game } from "../../game/Game";

const GROUND_Y = 0.78;

export class CoinJumpEditor {
  private _overlay: HTMLDivElement;
  private _active = true;
  private _game: Game;

  constructor(_game: Game) {
    this._game = _game;
    this._overlay = document.createElement("div");
    this._overlay.style.cssText = `
      position:fixed;inset:0;z-index:99998;
      cursor:crosshair;
    `;

    // Transparent click layer
    const clickLayer = document.createElement("div");
    clickLayer.style.cssText = "position:absolute;inset:0;";
    clickLayer.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      // Spawn locally
      const cj = (window as any).__coinJump;
      if (cj) cj.spawnAt(x, y, 1);
      // Push globally to Supabase
      this._pushCoin(x, y);
      this._showDrop(e.clientX, e.clientY);
    });

    // UI panel — top bar
    const bar = document.createElement("div");
    bar.style.cssText = `
      position:absolute;top:0;left:0;right:0;
      display:flex;align-items:center;gap:10px;padding:8px 14px;
      background:rgba(0,0,0,0.8);border-bottom:2px solid rgba(255,200,0,0.5);
      font-family:Arial,sans-serif;pointer-events:all;z-index:1;
    `;
    bar.innerHTML = `
      <span style="color:#FFD700;font-size:14px;font-weight:bold;">🪙 Click anywhere to drop coins!</span>
      <span style="color:rgba(255,255,255,0.4);font-size:12px;">Works live on the running game</span>
      <div style="margin-left:auto;display:flex;gap:8px;">
        <button id="cje_flood" style="background:rgba(255,140,0,0.3);color:#ffaa44;font-size:12px;
          font-weight:bold;padding:6px 12px;border-radius:8px;
          border:1px solid rgba(255,140,0,0.5);cursor:pointer;">💰 Flood</button>
        <button id="cje_close" style="background:rgba(255,80,80,0.2);color:#ff8888;font-size:12px;
          font-weight:bold;padding:6px 14px;border-radius:8px;
          border:1px solid rgba(255,80,80,0.4);cursor:pointer;">✕ Close</button>
      </div>
    `;

    this._overlay.appendChild(clickLayer);
    this._overlay.appendChild(bar);
    document.body.appendChild(this._overlay);

    bar.querySelector<HTMLButtonElement>("#cje_flood")!.onclick = () => {
      const cj = (window as any).__coinJump;
      [[0.5, GROUND_Y], [0.5, 0.48], [0.5, 0.28]].forEach(([x, y]) => {
        if (cj) cj.spawnAt(x, y, 8);
        for (let i = 0; i < 8; i++) this._pushCoin(x + i * 0.1, y);
      });
    };

    bar.querySelector<HTMLButtonElement>("#cje_close")!.onclick = () => {
      this.destroy();
      _game.goTitle();
    };

    window.addEventListener("keydown", this._onKey);
  }

  private _pushCoin(x: number, y: number): void {
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    fetch("https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/admin_coins", {
      method: "POST",
      headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ x, y, created_at: Date.now() }),
    });
  }

  private _onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { this.destroy(); this._game.goTitle(); }
  };

  private _showDrop(cx: number, cy: number): void {
    const emoji = document.createElement("div");
    emoji.textContent = "🪙";
    emoji.style.cssText = `
      position:fixed;left:${cx}px;top:${cy}px;
      font-size:28px;pointer-events:none;z-index:99999;
      transform:translate(-50%,-50%);
      animation:cjeDrop 0.5s ease-out forwards;
    `;
    if (!document.getElementById("cjeStyle")) {
      const s = document.createElement("style");
      s.id = "cjeStyle";
      s.textContent = `@keyframes cjeDrop { from{opacity:1;transform:translate(-50%,-80%);} to{opacity:0;transform:translate(-50%,20%);} }`;
      document.head.appendChild(s);
    }
    document.body.appendChild(emoji);
    setTimeout(() => emoji.remove(), 500);
  }

  destroy(): void {
    if (!this._active) return;
    this._active = false;
    window.removeEventListener("keydown", this._onKey);
    this._overlay.remove();
  }
}
