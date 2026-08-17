import type { Game } from "../game/Game";
import { MultiplayerManager } from "../multiplayer/MultiplayerManager";
import {
  fetchFriends, sendFriendRequest, respondToRequest, removeFriend, findPlayerByName,
  fetchConversation, sendMessage, markRead, sendInvite,
  type Friend, type FriendLink, type FriendMessage,
} from "../game/friends";

type Tab = "friends" | "requests" | "add";

/**
 * 👥 Friends — add people, see who's online, chat, play together, duel them.
 *
 * Online status comes from the same `player_presence` heartbeat the admin spy
 * uses. "Play" dials their PeerJS peer directly; "Challenge" sends an invite
 * and then waits for them in a friend duel.
 */
export class FriendsScene {
  private _game: Game;
  private _tab: Tab = "friends";
  private _friends: Friend[] = [];
  private _incoming: FriendLink[] = [];
  private _outgoing: FriendLink[] = [];
  private _chatWith: Friend | null = null;
  private _messages: FriendMessage[] = [];
  private _timers: number[] = [];

  constructor(game: Game) {
    this._game = game;
    if (!game.currentAccountId) { game.goAuth(); return; }
    this._render();
    this._load();
    this._timers.push(window.setInterval(() => this._load(), 6_000));
    this._timers.push(window.setInterval(() => { if (this._chatWith) this._loadChat(); }, 4_000));
    game._disposeScene = () => {
      this._timers.forEach(t => clearInterval(t));
      this._timers = [];
      game.ui.innerHTML = "";
    };
  }

  private get _me() {
    return { id: this._game.currentAccountId, name: this._game.state.username || "Player" };
  }

  private _esc(s: string): string {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  }

  // ── Data ────────────────────────────────────────────────────────────────

  private _load(): void {
    fetchFriends(this._me.id).then(({ friends, incoming, outgoing }) => {
      this._friends = friends;
      this._incoming = incoming;
      this._outgoing = outgoing;
      this._paint();
    }).catch(() => {});
  }

  private _loadChat(): void {
    const f = this._chatWith;
    if (!f) return;
    fetchConversation(this._me.id, f.accountId).then(msgs => {
      const grew = msgs.length !== this._messages.length;
      this._messages = msgs;
      this._paintChat(grew);
      markRead(this._me.id, f.accountId).catch(() => {});
    }).catch(() => {});
  }

  // ── Shell ───────────────────────────────────────────────────────────────

  private _render(): void {
    this._game.ui.innerHTML = `
      <div class="screen" style="
        background:linear-gradient(160deg,#050015,#0d1040,#141a55);
        flex-direction:column;align-items:center;justify-content:flex-start;
        padding:22px 14px 40px;gap:12px;overflow-y:auto;font-family:Arial,sans-serif;
      ">
        <div style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:12px;">

          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <div style="color:white;font-size:24px;font-weight:900;">👥 Friends</div>
            <button id="fr_back" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
              font-size:13px;padding:6px 14px;border-radius:10px;
              border:1px solid rgba(255,255,255,0.2);cursor:pointer;">← Back</button>
          </div>

          <div id="fr_tabs" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
            <button data-tab="friends" style="${this._tabStyle(true)}">👥 Friends</button>
            <button data-tab="requests" style="${this._tabStyle(false)}">📨 Requests</button>
            <button data-tab="add" style="${this._tabStyle(false)}">➕ Add</button>
          </div>

          <div id="fr_body"></div>
        </div>
      </div>
    `;
    document.getElementById("fr_back")!.onclick = () => {
      if (this._chatWith) { this._chatWith = null; this._paint(); return; }
      this._game.goTitle();
    };
    document.querySelectorAll<HTMLElement>("#fr_tabs [data-tab]").forEach(b => {
      b.onclick = () => {
        this._tab = b.dataset.tab as Tab;
        this._chatWith = null;
        this._paintTabs();
        this._paint();
      };
    });
  }

  private _tabStyle(active: boolean): string {
    return `background:${active ? "rgba(120,160,255,0.28)" : "rgba(255,255,255,0.06)"};
      color:${active ? "#cfe0ff" : "rgba(255,255,255,0.5)"};font-size:13px;font-weight:bold;
      border:1px solid ${active ? "rgba(120,160,255,0.6)" : "rgba(255,255,255,0.15)"};
      border-radius:10px;padding:9px 4px;cursor:pointer;`;
  }

  private _paintTabs(): void {
    document.querySelectorAll<HTMLElement>("#fr_tabs [data-tab]").forEach(b => {
      b.setAttribute("style", this._tabStyle(b.dataset.tab === this._tab));
    });
  }

  // ── Painting ────────────────────────────────────────────────────────────

  private _paint(): void {
    const body = document.getElementById("fr_body");
    if (!body) return;

    if (this._chatWith) { this._paintChatShell(); return; }

    const badge = this._incoming.length
      ? `<span style="background:#ff4444;color:white;font-size:10px;font-weight:bold;
          border-radius:9px;padding:1px 6px;margin-left:4px;">${this._incoming.length}</span>` : "";
    const reqTab = document.querySelector<HTMLElement>('#fr_tabs [data-tab="requests"]');
    if (reqTab) reqTab.innerHTML = `📨 Requests${badge}`;

    if (this._tab === "friends")  { body.innerHTML = this._friendsHtml();  this._wireFriends(); }
    if (this._tab === "requests") { body.innerHTML = this._requestsHtml(); this._wireRequests(); }
    if (this._tab === "add")      { body.innerHTML = this._addHtml();      this._wireAdd(); }
  }

  private _friendsHtml(): string {
    if (!this._friends.length) {
      return `<div style="color:rgba(255,255,255,0.45);font-size:13px;text-align:center;padding:26px 10px;">
        No friends yet.<br><span style="color:rgba(255,255,255,0.3);font-size:12px;">
        Use the ➕ Add tab to send someone a request.</span></div>`;
    }
    return `<div style="display:flex;flex-direction:column;gap:8px;">
      ${this._friends.map(f => `
        <div style="background:${f.online ? "rgba(80,255,180,0.07)" : "rgba(255,255,255,0.04)"};
          border:1px solid ${f.online ? "rgba(80,255,180,0.3)" : "rgba(255,255,255,0.1)"};
          border-radius:13px;padding:11px 13px;">
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
            <span style="color:${f.online ? "#7dffc4" : "rgba(255,255,255,0.5)"};
              font-size:15px;font-weight:bold;">${f.online ? "🟢" : "⚪"} ${this._esc(f.username)}</span>
            ${f.unread ? `<span style="background:#ff4444;color:white;font-size:10px;font-weight:bold;
              border-radius:9px;padding:1px 6px;">${f.unread} new</span>` : ""}
          </div>
          <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px;">
            ${f.online ? `📍 ${this._esc(f.scene || "somewhere")}` : "Offline"}
            ${f.online && f.mpState && f.mpState !== "solo" ? " · 🌐 in multiplayer" : ""}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:5px;margin-top:9px;">
            <button data-chat="${f.accountId}" style="${this._btn("#66ccff")}">💬 Chat</button>
            <button data-play="${f.accountId}" style="${this._btn("#7dffc4")}">🎮 Play</button>
            <button data-duel="${f.accountId}" style="${this._btn("#ffe066")}">⚔️ Duel</button>
            <button data-remove="${f.linkId}" data-name="${this._esc(f.username)}"
              style="${this._btn("#ff8888")}">✕</button>
          </div>
          <div data-fb="${f.accountId}" style="color:#80ff80;font-size:11px;min-height:13px;margin-top:4px;"></div>
        </div>`).join("")}
    </div>`;
  }

  private _btn(color: string): string {
    return `background:${color}22;color:${color};font-size:12px;font-weight:bold;
      border:1px solid ${color}66;border-radius:8px;padding:7px 4px;cursor:pointer;`;
  }

  private _requestsHtml(): string {
    const inc = this._incoming.length ? this._incoming.map(l => `
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(120,160,255,0.35);
        border-radius:12px;padding:11px 13px;display:flex;align-items:center;
        justify-content:space-between;gap:8px;flex-wrap:wrap;">
        <div style="color:white;font-size:14px;font-weight:bold;">${this._esc(l.from_name)}</div>
        <div style="display:flex;gap:6px;">
          <button data-accept="${l.id}" style="${this._btn("#7dffc4")}">✓ Accept</button>
          <button data-reject="${l.id}" style="${this._btn("#ff8888")}">✕ Decline</button>
        </div>
      </div>`).join("") : `<div style="color:rgba(255,255,255,0.35);font-size:12px;">No incoming requests.</div>`;

    const out = this._outgoing.length ? this._outgoing.map(l => `
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);
        border-radius:12px;padding:9px 13px;display:flex;align-items:center;
        justify-content:space-between;gap:8px;">
        <div style="color:rgba(255,255,255,0.6);font-size:13px;">${this._esc(l.to_name)}</div>
        <div style="color:rgba(255,255,255,0.3);font-size:11px;">⏳ Waiting</div>
      </div>`).join("") : `<div style="color:rgba(255,255,255,0.3);font-size:12px;">None.</div>`;

    return `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="color:rgba(120,180,255,0.8);font-size:12px;font-weight:bold;
          letter-spacing:1px;text-transform:uppercase;">Incoming</div>
        ${inc}
        <div style="color:rgba(255,255,255,0.4);font-size:12px;font-weight:bold;
          letter-spacing:1px;text-transform:uppercase;margin-top:8px;">Sent by you</div>
        ${out}
      </div>`;
  }

  private _addHtml(): string {
    return `
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);
        border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="color:white;font-size:15px;font-weight:bold;">➕ Add a Friend</div>
        <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:-4px;">
          Type their exact username. They'll get a request to accept.
        </div>
        <input id="fr_addName" type="text" maxlength="20" placeholder="Their username…"
          style="background:rgba(255,255,255,0.09);border:1px solid rgba(120,160,255,0.4);
          border-radius:10px;color:white;font-size:14px;padding:10px 13px;outline:none;" />
        <button id="fr_addBtn" style="background:rgba(120,160,255,0.28);color:#cfe0ff;
          font-size:14px;font-weight:bold;border:1px solid rgba(120,160,255,0.6);
          border-radius:10px;padding:11px;cursor:pointer;">📨 Send Request</button>
        <div id="fr_addFb" style="color:#80ff80;font-size:12px;min-height:15px;"></div>
      </div>`;
  }

  // ── Chat ────────────────────────────────────────────────────────────────

  private _paintChatShell(): void {
    const body = document.getElementById("fr_body");
    const f = this._chatWith;
    if (!body || !f) return;
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:9px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="fr_chatBack" style="${this._btn("#aaaaaa")}">←</button>
          <div style="color:white;font-size:16px;font-weight:bold;">
            ${f.online ? "🟢" : "⚪"} ${this._esc(f.username)}
          </div>
        </div>
        <div id="fr_msgs" style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.1);
          border-radius:13px;padding:11px;height:320px;overflow-y:auto;
          display:flex;flex-direction:column;gap:6px;">
          <div style="color:rgba(255,255,255,0.3);font-size:12px;">Loading…</div>
        </div>
        <div style="display:flex;gap:6px;">
          <input id="fr_msgInput" type="text" maxlength="200" placeholder="Say something…"
            style="flex:1;min-width:0;background:rgba(255,255,255,0.09);
            border:1px solid rgba(120,160,255,0.4);border-radius:10px;color:white;
            font-size:14px;padding:10px 13px;outline:none;" />
          <button id="fr_msgSend" style="background:rgba(120,160,255,0.3);color:#cfe0ff;
            font-size:14px;font-weight:bold;border:1px solid rgba(120,160,255,0.6);
            border-radius:10px;padding:10px 16px;cursor:pointer;">➤</button>
        </div>
      </div>`;

    document.getElementById("fr_chatBack")!.onclick = () => { this._chatWith = null; this._paint(); };
    const input = document.getElementById("fr_msgInput") as HTMLInputElement;
    const send = () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendMessage(this._me, f.accountId, text)
        .then(() => this._loadChat())
        .catch(() => { input.value = text; });
    };
    document.getElementById("fr_msgSend")!.onclick = send;
    input.addEventListener("keydown", e => { if (e.key === "Enter") send(); });
    input.focus();

    this._loadChat();
  }

  private _paintChat(scrollToEnd: boolean): void {
    const el = document.getElementById("fr_msgs");
    if (!el) return;
    if (!this._messages.length) {
      el.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:12px;">
        No messages yet — say hi!</div>`;
      return;
    }
    el.innerHTML = this._messages.map(m => {
      const mine = m.from_id === this._me.id;
      return `<div style="align-self:${mine ? "flex-end" : "flex-start"};max-width:80%;
        background:${mine ? "rgba(120,160,255,0.3)" : "rgba(255,255,255,0.09)"};
        border:1px solid ${mine ? "rgba(120,160,255,0.5)" : "rgba(255,255,255,0.14)"};
        border-radius:12px;padding:7px 11px;">
        <div style="color:white;font-size:13px;word-break:break-word;">${this._esc(m.message)}</div>
        <div style="color:rgba(255,255,255,0.3);font-size:10px;margin-top:2px;text-align:right;">
          ${new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>`;
    }).join("");
    if (scrollToEnd) el.scrollTop = el.scrollHeight;
  }

  // ── Wiring ──────────────────────────────────────────────────────────────

  private _say(accountId: string, msg: string, ok = true): void {
    const fb = document.querySelector<HTMLElement>(`[data-fb="${CSS.escape(accountId)}"]`);
    if (!fb) return;
    fb.style.color = ok ? "#80ff80" : "#ff8888";
    fb.textContent = msg;
    setTimeout(() => { if (fb.textContent === msg) fb.textContent = ""; }, 4000);
  }

  private _wireFriends(): void {
    document.querySelectorAll<HTMLElement>("[data-chat]").forEach(b => {
      b.onclick = () => {
        this._chatWith = this._friends.find(f => f.accountId === b.dataset.chat) ?? null;
        this._messages = [];
        this._paint();
      };
    });

    document.querySelectorAll<HTMLElement>("[data-remove]").forEach(b => {
      b.onclick = () => {
        if (!confirm(`Remove ${b.dataset.name} from your friends?`)) return;
        removeFriend(Number(b.dataset.remove)).then(() => this._load());
      };
    });

    // Play together — dial straight into their peer and drop into the room.
    document.querySelectorAll<HTMLElement>("[data-play]").forEach(b => {
      b.onclick = () => {
        const f = this._friends.find(x => x.accountId === b.dataset.play);
        if (!f) return;
        if (!f.online) { this._say(f.accountId, "They're offline right now.", false); return; }
        this._say(f.accountId, `Connecting to ${f.username}…`);
        sendInvite(this._me, f.accountId, "play").catch(() => {});
        this._joinFriend(f);
      };
    });

    // Challenge — invite them, then wait for them in a friend duel.
    document.querySelectorAll<HTMLElement>("[data-duel]").forEach(b => {
      b.onclick = () => {
        const f = this._friends.find(x => x.accountId === b.dataset.duel);
        if (!f) return;
        if (!f.online) { this._say(f.accountId, "They're offline right now.", false); return; }
        sendInvite(this._me, f.accountId, "duel").then(() => {
          this._say(f.accountId, `⚔️ Challenge sent to ${f.username}!`);
          setTimeout(() => this._game.goFriendDuel(f.username, true), 600);
        }).catch(() => this._say(f.accountId, "Couldn't send the challenge.", false));
      };
    });
  }

  private async _joinFriend(f: Friend): Promise<void> {
    // Release any peer we're already holding, or it keeps our username ID and
    // the new one can't claim it.
    if (this._game.mp) {
      this._game.mp.dispose();
      this._game.mp = null;
      await new Promise(r => setTimeout(r, 400));
    }
    const mp = new MultiplayerManager(this._me.name);
    try {
      await mp.goOnline().catch(() => {});
      await mp.joinPlayer(f.username);
      this._game.mp = mp;
      this._game.goExplore();
    } catch {
      mp.dispose();
      this._say(f.accountId, `Couldn't reach ${f.username}. Are they in a game?`, false);
    }
  }

  private _wireRequests(): void {
    document.querySelectorAll<HTMLElement>("[data-accept]").forEach(b => {
      b.onclick = () => respondToRequest(Number(b.dataset.accept), true).then(() => this._load());
    });
    document.querySelectorAll<HTMLElement>("[data-reject]").forEach(b => {
      b.onclick = () => respondToRequest(Number(b.dataset.reject), false).then(() => this._load());
    });
  }

  private _wireAdd(): void {
    const input = document.getElementById("fr_addName") as HTMLInputElement;
    const fb = document.getElementById("fr_addFb")!;
    const show = (msg: string, ok = true) => {
      fb.style.color = ok ? "#80ff80" : "#ff8888";
      fb.textContent = msg;
    };

    const submit = async () => {
      const name = input.value.trim();
      if (!name) { show("Type a username first.", false); return; }
      if (name.toLowerCase() === this._me.name.toLowerCase()) {
        show("That's you!", false); return;
      }
      show("Searching…");
      try {
        const player = await findPlayerByName(name);
        if (!player) { show(`No player called "${name}".`, false); return; }
        if (player.account_id === this._me.id) { show("That's you!", false); return; }
        if (this._friends.some(f => f.accountId === player.account_id)) {
          show(`${player.username} is already your friend.`, false); return;
        }
        await sendFriendRequest(this._me, { id: player.account_id, name: player.username });
        show(`📨 Request sent to ${player.username}!`);
        input.value = "";
        this._load();
      } catch {
        show("Couldn't send the request.", false);
      }
    };

    document.getElementById("fr_addBtn")!.onclick = submit;
    input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  }
}
