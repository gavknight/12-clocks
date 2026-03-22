// GDMultiplayerLobby.ts — host or join a GD multiplayer session
import type { Game } from "../../game/Game";
import { MultiplayerManager } from "../../multiplayer/MultiplayerManager";
import { gdMine, type GDLevel } from "./GDStorage";

export class GDMultiplayerLobby {
  private _g:    Game;
  private _wrap: HTMLDivElement;
  private _mp:   MultiplayerManager | null = null;

  constructor(g: Game) {
    this._g   = g;
    this._wrap = document.createElement('div');
    this._wrap.style.cssText = [
      'position:fixed;inset:0;z-index:9999;pointer-events:all;',
      'display:flex;flex-direction:column;font-family:Arial,sans-serif;',
      'background:#700000;',
      'background-image:',
        'linear-gradient(rgba(0,0,0,0.28) 2px,transparent 2px),',
        'linear-gradient(90deg,rgba(0,0,0,0.28) 2px,transparent 2px);',
      'background-size:64px 64px;',
    ].join('');
    g.ui.innerHTML = '';
    g.ui.appendChild(this._wrap);
    this._render();
  }

  private _render(): void {
    const uid      = this._g.currentAccountId ?? 'guest';
    const username = this._g.state.username   || 'Player';
    const myLevels = gdMine(uid);

    this._wrap.innerHTML = `
      <style>
        .mp-btn {
          padding:12px 24px;border-radius:12px;border:none;cursor:pointer;
          font-size:15px;font-weight:bold;font-family:Arial,sans-serif;
        }
        .mp-btn:disabled { opacity:0.5;cursor:default; }
        .mp-input {
          background:rgba(0,0,0,0.5);color:white;
          border:2px solid rgba(255,255,255,0.25);border-radius:10px;
          padding:10px 14px;font-size:15px;outline:none;width:100%;box-sizing:border-box;
        }
        .mp-card {
          background:rgba(0,0,0,0.45);border:2px solid rgba(255,255,255,0.12);
          border-radius:14px;padding:20px 24px;
          display:flex;flex-direction:column;gap:12px;
          max-width:420px;width:100%;
        }
        .mp-radio-row {
          display:flex;align-items:center;gap:8px;cursor:pointer;
          background:rgba(255,255,255,0.07);border-radius:8px;padding:8px 12px;
        }
      </style>

      <!-- Top bar -->
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;
        background:rgba(0,0,0,0.55);flex-shrink:0;">
        <div id="mp-back" style="width:34px;height:34px;border-radius:50%;cursor:pointer;
          font-size:16px;font-weight:900;color:white;display:flex;align-items:center;
          justify-content:center;background:linear-gradient(135deg,#cc0000,#880000);
          border:3px solid #ff4444;">✕</div>
        <span style="color:#ffcc00;font-size:18px;font-weight:900;letter-spacing:2px;
          font-family:'Arial Black',Arial,sans-serif;">🌐 MULTIPLAYER</span>
      </div>

      <!-- Tabs -->
      <div style="display:flex;gap:4px;padding:10px 14px 0;flex-shrink:0;">
        <button id="mp-tab-host" style="padding:8px 20px;border-radius:10px 10px 0 0;border:none;
          cursor:pointer;font-size:13px;font-weight:bold;background:#ffcc00;color:#3a0000;">
          🏠 Host Server
        </button>
        <button id="mp-tab-join" style="padding:8px 20px;border-radius:10px 10px 0 0;border:none;
          cursor:pointer;font-size:13px;font-weight:bold;
          background:rgba(255,255,255,0.1);color:white;">
          🔍 Join Server
        </button>
      </div>

      <!-- Content area -->
      <div style="flex:1;overflow-y:auto;padding:14px;display:flex;
        align-items:flex-start;justify-content:center;">

        <!-- HOST PANEL -->
        <div id="mp-host-panel" class="mp-card">
          <div style="color:#ffcc00;font-size:16px;font-weight:bold;">Host a Server</div>
          <div style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.5;">
            Your server name: <span style="color:white;font-weight:bold;">${username}</span><br>
            Others join by entering your username.
          </div>

          <div style="color:rgba(255,255,255,0.7);font-size:13px;font-weight:bold;margin-top:4px;">
            Choose Level:
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label class="mp-radio-row">
              <input type="radio" name="mp-lvl" value="__builtin__" checked
                style="accent-color:#ffcc00;width:16px;height:16px;flex-shrink:0;">
              <span style="color:white;font-size:13px;">🎮 Built-in Level (Ship mode)</span>
            </label>
            ${myLevels.map(l => `
              <label class="mp-radio-row">
                <input type="radio" name="mp-lvl" value="${l.id}"
                  style="accent-color:#ffcc00;width:16px;height:16px;flex-shrink:0;">
                <span style="color:#ffcc00;font-size:13px;">${l.name}</span>
                <span style="color:rgba(255,255,255,0.3);font-size:11px;margin-left:auto;">
                  ${l.objects.length} objs
                </span>
              </label>
            `).join('')}
          </div>

          <button id="mp-host-btn" class="mp-btn"
            style="background:linear-gradient(135deg,#22cc00,#116600);color:white;margin-top:4px;">
            ▶ Start Hosting
          </button>
          <div id="mp-host-status" style="color:rgba(255,255,255,0.5);font-size:12px;
            text-align:center;min-height:16px;"></div>
        </div>

        <!-- JOIN PANEL -->
        <div id="mp-join-panel" class="mp-card" style="display:none;">
          <div style="color:#ffcc00;font-size:16px;font-weight:bold;">Join a Server</div>
          <div style="color:rgba(255,255,255,0.6);font-size:13px;">
            Enter the host's username to join their game.
          </div>

          <input id="mp-join-input" class="mp-input" type="text"
            placeholder="Host's username…" maxlength="30" autocomplete="off" />

          <button id="mp-join-btn" class="mp-btn"
            style="background:linear-gradient(135deg,#0077cc,#0044aa);color:white;">
            🔗 Join Server
          </button>
          <div id="mp-join-status" style="color:rgba(255,255,255,0.5);font-size:12px;
            text-align:center;min-height:16px;"></div>
        </div>
      </div>
    `;

    /* ── Back ── */
    document.getElementById('mp-back')!.onclick = () => {
      this._mp?.dispose();
      this._wrap.remove();
      import('./GeometryDash').then(m => new m.GeometryDash(this._g));
    };

    /* ── Tabs ── */
    const tabHost = document.getElementById('mp-tab-host')!;
    const tabJoin = document.getElementById('mp-tab-join')!;
    const panHost = document.getElementById('mp-host-panel')!;
    const panJoin = document.getElementById('mp-join-panel')!;

    tabHost.onclick = () => {
      tabHost.style.cssText += 'background:#ffcc00;color:#3a0000;';
      tabJoin.style.cssText += 'background:rgba(255,255,255,0.1);color:white;';
      panHost.style.display = 'flex';
      panJoin.style.display = 'none';
    };
    tabJoin.onclick = () => {
      tabJoin.style.cssText += 'background:#ffcc00;color:#3a0000;';
      tabHost.style.cssText += 'background:rgba(255,255,255,0.1);color:white;';
      panJoin.style.display = 'flex';
      panHost.style.display = 'none';
    };

    /* ── Host ── */
    const hostBtn    = document.getElementById('mp-host-btn') as HTMLButtonElement;
    const hostStatus = document.getElementById('mp-host-status')!;

    hostBtn.onclick = async () => {
      hostBtn.disabled = true;
      hostStatus.style.color = 'rgba(255,255,255,0.5)';
      hostStatus.textContent  = '⏳ Going online…';

      const selected = (document.querySelector('input[name="mp-lvl"]:checked') as HTMLInputElement)?.value;
      const level    = (selected && selected !== '__builtin__')
        ? (myLevels.find(l => l.id === selected) ?? null)
        : null;

      const mp = new MultiplayerManager(username);
      this._mp = mp;

      try {
        await mp.goOnline();
        hostStatus.style.color = '#7fff7f';
        hostStatus.textContent  = `✅ Online as "${username}" — starting…`;
        await new Promise(r => setTimeout(r, 600));
        this._wrap.remove();
        import('./GeometryDash').then(m =>
          new m.GeometryDash(this._g, level ?? undefined, false, mp)
        );
      } catch {
        hostStatus.style.color = '#ff8888';
        hostStatus.textContent  = '❌ Failed to go online. Try again.';
        hostBtn.disabled = false;
        this._mp = null;
        mp.dispose();
      }
    };

    /* ── Join ── */
    const joinBtn    = document.getElementById('mp-join-btn') as HTMLButtonElement;
    const joinInput  = document.getElementById('mp-join-input') as HTMLInputElement;
    const joinStatus = document.getElementById('mp-join-status')!;

    const doJoin = async () => {
      const hostname = joinInput.value.trim();
      if (!hostname) { joinInput.focus(); return; }

      joinBtn.disabled = true;
      joinStatus.style.color = 'rgba(255,255,255,0.5)';
      joinStatus.textContent  = '🔗 Connecting…';

      const mp = new MultiplayerManager(username);
      this._mp = mp;

      try {
        await mp.joinPlayer(hostname);
        joinStatus.style.color = 'rgba(255,255,255,0.5)';
        joinStatus.textContent  = '✅ Connected! Waiting for host to start…';

        // Fallback: if host doesn't send level within 5s, use built-in
        const timeout = setTimeout(() => {
          this._wrap.remove();
          import('./GeometryDash').then(m => new m.GeometryDash(this._g, undefined, false, mp));
        }, 5000);

        mp.onGdLevel = (rawLevel) => {
          clearTimeout(timeout);
          const level = rawLevel as GDLevel | null;
          this._wrap.remove();
          import('./GeometryDash').then(m =>
            new m.GeometryDash(this._g, level ?? undefined, false, mp)
          );
        };
      } catch {
        joinStatus.style.color = '#ff8888';
        joinStatus.textContent  = `❌ Could not connect to "${hostname}". Are they hosting?`;
        joinBtn.disabled = false;
        this._mp = null;
        mp.dispose();
      }
    };

    joinBtn.onclick = doJoin;
    joinInput.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });
  }
}
