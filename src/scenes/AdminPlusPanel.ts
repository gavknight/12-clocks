import type { Game } from "../game/Game";
import { mountAdminPlus, type AdminPlusMount } from "./adminPlusSections";

/**
 * 🛰️ Admin Panel+ — standalone overlay (Alt+L).
 *
 * The feature set itself lives in `adminPlusSections.ts`, because the Admin
 * Abuse Panel mounts the very same sections.
 */
export class AdminPlusPanel {
  private _overlay: HTMLDivElement;
  private _game: Game;
  private _mount: AdminPlusMount;

  constructor(game: Game) {
    this._game = game;
    this._overlay = document.createElement("div");
    this._overlay.style.cssText = `
      position:fixed;inset:0;z-index:1000000;
      background:rgba(0,0,12,0.96);
      display:flex;flex-direction:column;align-items:center;
      overflow-y:auto;padding:24px 16px 56px;
      font-family:Arial,sans-serif;
    `;
    this._overlay.innerHTML = `
      <div style="width:100%;max-width:520px;display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="color:#66ffcc;font-size:22px;font-weight:900;letter-spacing:1px;">
            🛰️ ADMIN PANEL+
          </div>
          <button id="app_close" style="background:rgba(255,255,255,0.1);color:white;font-size:14px;
            padding:6px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;">
            ✕ Close
          </button>
        </div>
        <div style="color:rgba(100,255,204,0.55);font-size:11px;margin-top:-8px;">
          Alt+L · live player spy · kick / freeze / puppet · events &amp; titles
        </div>
        <div id="app_sections"></div>
      </div>
    `;
    document.body.appendChild(this._overlay);

    this._mount = mountAdminPlus(game, this._overlay.querySelector<HTMLElement>("#app_sections")!);
    this._overlay.querySelector<HTMLElement>("#app_close")!.onclick = () => this.destroy();
  }

  destroy(): void {
    this._mount.destroy();
    this._overlay.remove();
    this._game.currentScene = "Title Screen";
  }
}
