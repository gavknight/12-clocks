import type { Game } from "../game/Game";
import {
  AP_SB, AP_H, AP_H_QUIET, AP_H_UPSERT, ALL_PLAYERS,
  TITLES, EVENTS, titleDef, eventDef,
  PUPPET_DESTINATIONS, isOnline, formatDuration, isBirthdayToday, GAME_BIRTHDAY, mpLabel,
  type PresenceRow,
} from "../game/adminPlus";

/**
 * The Admin Panel+ feature set, mountable into any container.
 *
 * Both the standalone AdminPlusPanel overlay (Alt+L) and the Admin Abuse Panel
 * (Alt+P) mount this, so the two can never drift apart. Every DOM lookup is
 * scoped to the container, so mounting twice at once is safe.
 */

interface MemberRow { account_id: string; username: string; is_banned: boolean }

export interface AdminPlusMount { destroy(): void }

export function mountAdminPlus(game: Game, container: HTMLElement): AdminPlusMount {
  let rows: PresenceRow[] = [];
  let members: MemberRow[] = [];
  let titles: Record<string, string> = {};
  let onlineOnly = true;
  let titleFilter = "";
  const timers: number[] = [];

  const $ = <T extends HTMLElement = HTMLElement>(sel: string): T | null =>
    container.querySelector<T>(sel);
  const all = <T extends HTMLElement = HTMLElement>(sel: string): T[] =>
    Array.from(container.querySelectorAll<T>(sel));

  const esc = (s: string): string =>
    String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  // ── Network ────────────────────────────────────────────────────────────

  const send = (accountId: string, command: string, payload: string | null): Promise<unknown> =>
    fetch(`${AP_SB}/player_commands`, {
      method: "POST",
      headers: AP_H_QUIET,
      body: JSON.stringify({
        account_id: accountId,
        command,
        payload,
        issued_by: game.state.username || "admin",
        created_at: Date.now(),
      }),
    }).then(r => { if (!r.ok) throw new Error("send failed"); return r; });

  const setTitle = (accountId: string, username: string, titleId: string): Promise<unknown> => {
    if (!titleId) {
      delete titles[accountId];
      return fetch(`${AP_SB}/player_titles?account_id=eq.${encodeURIComponent(accountId)}`, {
        method: "DELETE", headers: AP_H_QUIET,
      }).then(r => { if (!r.ok) throw new Error("delete failed"); return r; });
    }
    titles[accountId] = titleId;
    return fetch(`${AP_SB}/player_titles`, {
      method: "POST",
      headers: AP_H_UPSERT,
      body: JSON.stringify({
        account_id: accountId,
        username,
        title: titleId,
        granted_by: game.state.username || "owner",
        granted_at: Date.now(),
      }),
    }).then(r => { if (!r.ok) throw new Error("grant failed"); return r; });
  };

  const loadTitles = (): Promise<void> =>
    fetch(`${AP_SB}/player_titles?select=account_id,title`, { headers: AP_H })
      .then(r => r.json()).then((tt: { account_id: string; title: string }[]) => {
        titles = {};
        if (Array.isArray(tt)) for (const t of tt) titles[t.account_id] = t.title;
      }).catch(() => {});

  /**
   * The 5s poll passes refreshRoster=false on purpose. Rebuilding the roster
   * would blow away a dropdown the admin is part-way through using, which
   * looks exactly like the title "resetting" itself.
   */
  const loadPlayers = (refreshRoster = false): void => {
    Promise.all([
      fetch(`${AP_SB}/player_presence?order=last_seen.desc&limit=200`, { headers: AP_H })
        .then(r => r.json()),
      loadTitles(),
    ]).then(([presence]: [PresenceRow[], void]) => {
      rows = Array.isArray(presence) ? presence : [];
      renderPlayers();
      if (refreshRoster) renderTitleRoster();
    }).catch(() => {
      const el = $("#app_players");
      if (el) el.innerHTML = `<div style="color:#ff8888;font-size:12px;">Failed to load players.</div>`;
    });
  };

  /**
   * The global roster — everyone who has ever played, not just whoever the
   * presence heartbeat has seen. This is what makes "give anyone a title" work
   * for offline and never-since-seen players.
   */
  const loadMembers = (): void => {
    fetch(`${AP_SB}/members?select=account_id,username,is_banned&order=username.asc&limit=1000`, {
      headers: AP_H,
    }).then(r => r.json()).then((rs: MemberRow[]) => {
      members = Array.isArray(rs) ? rs : [];
      renderTitleRoster();
    }).catch(() => {
      const el = $("#app_titleRoster");
      if (el) el.innerHTML = `<div style="color:#ff8888;font-size:12px;">Failed to load the roster.</div>`;
    });
  };

  const loadEvent = (): void => {
    fetch(`${AP_SB}/global_settings?key=eq.active_event&select=value`, { headers: AP_H })
      .then(r => r.json()).then((rs: { value: string }[]) => {
        const active = rs[0]?.value ?? "none";
        highlightEvent(active === "none" ? null : active);
      }).catch(() => {});
  };

  const highlightEvent = (id: string | null): void => {
    all<HTMLElement>("#app_eventBtns [data-event]").forEach(b => {
      const def = eventDef(b.dataset.event);
      const on = b.dataset.event === id;
      b.style.background  = on ? `${def?.color ?? "#fff"}33` : "rgba(255,255,255,0.06)";
      b.style.borderColor = on ? (def?.color ?? "#fff") : `${def?.color ?? "#fff"}55`;
    });
  };

  const setEvent = (id: string | null): void => {
    const fb = $("#app_eventFb");
    fetch(`${AP_SB}/global_settings`, {
      method: "POST",
      headers: AP_H_UPSERT,
      body: JSON.stringify({ key: "active_event", value: id ?? "none", updated_at: Date.now() }),
    }).then(r => {
      if (!r.ok) throw new Error();
      const def = eventDef(id);
      if (fb) {
        fb.style.color = "#80ff80";
        fb.textContent = def ? `✓ ${def.emoji} ${def.name} is now live for everyone!` : "✓ Event ended.";
        setTimeout(() => { fb.textContent = ""; }, 4000);
      }
      highlightEvent(id);
    }).catch(() => {
      if (fb) { fb.style.color = "#ff8888"; fb.textContent = "❌ Failed to change the event."; }
    });
  };

  // ── Markup ─────────────────────────────────────────────────────────────

  const titleOptions = (selected: string | null | undefined): string =>
    `<option value="" style="background:#111;">— No title —</option>` +
    TITLES.map(t => `<option value="${t.id}" ${selected === t.id ? "selected" : ""}
      style="background:#111;">${t.emoji} ${t.name} (${t.mult.toLocaleString()}×)</option>`).join("");

  const destOptions = (): string =>
    PUPPET_DESTINATIONS.map(d =>
      `<option value="${d.id}" style="background:#111;">${d.emoji} ${d.label}</option>`).join("");

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">

      <!-- ── Server-wide events ── -->
      <div style="background:rgba(255,100,200,0.08);border:2px solid rgba(255,100,200,0.35);
        border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="color:#ff88dd;font-size:15px;font-weight:bold;">🌍 Server-Wide Events</div>
        <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:-4px;">
          One at a time. Multiplies with each player's title.
        </div>
        ${isBirthdayToday() ? `
          <div style="background:rgba(255,136,221,0.15);border:1px solid rgba(255,136,221,0.5);
            border-radius:10px;padding:8px 10px;color:#ffaaee;font-size:12px;font-weight:bold;">
            🎂 It's the game's birthday — Birthday Boy is running automatically and
            overrides whatever you pick below.
          </div>` : `
          <div style="color:rgba(255,255,255,0.3);font-size:11px;">
            🎂 Birthday Boy switches itself on automatically every
            ${GAME_BIRTHDAY[1]}/${GAME_BIRTHDAY[0]}.
          </div>`}
        <div id="app_eventBtns" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${EVENTS.map(e => `
            <button data-event="${e.id}" style="
              background:rgba(255,255,255,0.06);color:${e.color};font-size:13px;font-weight:bold;
              border:2px solid ${e.color}55;border-radius:10px;padding:10px 8px;cursor:pointer;
              text-align:left;">
              ${e.emoji} ${e.name}
              <div style="color:rgba(255,255,255,0.35);font-size:10px;font-weight:normal;margin-top:2px;">
                ${e.desc}
              </div>
            </button>`).join("")}
        </div>
        <button id="app_eventOff" style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.6);
          font-size:12px;font-weight:bold;border:1px solid rgba(255,255,255,0.2);border-radius:10px;
          padding:9px;cursor:pointer;">⛔ End Event</button>
        <div id="app_eventFb" style="color:#80ff80;font-size:12px;min-height:14px;"></div>
      </div>

      <!-- ── Titles for anyone ── -->
      <div style="background:rgba(255,200,0,0.08);border:2px solid rgba(255,200,0,0.35);
        border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="color:#ffdd66;font-size:15px;font-weight:bold;">🏷️ Titles — Anyone</div>
        <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:-4px;">
          Every player who has ever joined, online or not. Pick a title and it
          saves straight away. Highest title only — it multiplies with the live event.
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${TITLES.map(t => `<span style="color:${t.color};font-size:11px;font-weight:bold;
            border:1px solid ${t.color}66;border-radius:6px;padding:2px 7px;">
            ${t.emoji} ${t.name} ${t.mult.toLocaleString()}×</span>`).join("")}
        </div>
        <input id="app_titleSearch" type="text" placeholder="Search players…"
          style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,200,0,0.35);
          border-radius:8px;color:white;font-size:13px;padding:8px 12px;outline:none;" />
        <div id="app_titleRoster" style="display:flex;flex-direction:column;gap:6px;
          max-height:320px;overflow-y:auto;">
          <div style="color:rgba(255,255,255,0.3);font-size:12px;">Loading roster…</div>
        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;margin-top:2px;">
          <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:6px;">
            Not in the list? Grant by account ID:
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <input id="app_manualId" type="text" placeholder="account_id"
              style="flex:1;min-width:120px;background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,200,0,0.3);border-radius:8px;color:white;
              font-size:12px;padding:7px 10px;outline:none;" />
            <select id="app_manualTitle" style="background:rgba(255,255,255,0.08);
              border:1px solid rgba(255,200,0,0.3);border-radius:8px;color:white;
              font-size:12px;padding:7px 10px;outline:none;">${titleOptions(null)}</select>
            <button id="app_manualSet" style="background:rgba(255,200,0,0.2);color:#ffdd66;
              font-size:12px;font-weight:bold;border:1px solid rgba(255,200,0,0.4);
              border-radius:8px;padding:7px 14px;cursor:pointer;">🏷️ Set</button>
          </div>
          <div id="app_manualFb" style="color:#80ff80;font-size:12px;min-height:14px;margin-top:4px;"></div>
        </div>
      </div>

      <!-- ── Broadcast controls ── -->
      <div style="background:rgba(255,80,0,0.08);border:2px solid rgba(255,120,0,0.35);
        border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="color:#ff9944;font-size:15px;font-weight:bold;">📡 Everyone At Once</div>
        <input id="app_allMsg" type="text" maxlength="120" placeholder="Freeze message for everyone…"
          style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,150,0,0.4);border-radius:8px;
          color:white;font-size:13px;padding:8px 12px;outline:none;" />
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
          <button id="app_allFreeze" style="background:rgba(0,160,255,0.2);color:#88ddff;font-size:12px;
            font-weight:bold;border:1px solid rgba(0,160,255,0.45);border-radius:8px;padding:9px;cursor:pointer;">
            🧊 Freeze All</button>
          <button id="app_allUnfreeze" style="background:rgba(0,200,120,0.2);color:#88ffbb;font-size:12px;
            font-weight:bold;border:1px solid rgba(0,200,120,0.45);border-radius:8px;padding:9px;cursor:pointer;">
            ☀️ Unfreeze All</button>
          <button id="app_allKick" style="background:rgba(200,0,0,0.2);color:#ff8888;font-size:12px;
            font-weight:bold;border:1px solid rgba(200,0,0,0.45);border-radius:8px;padding:9px;cursor:pointer;">
            👢 Kick All</button>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <select id="app_allDest" style="flex:1;background:rgba(255,255,255,0.08);
            border:1px solid rgba(255,150,0,0.35);border-radius:8px;color:white;font-size:12px;
            padding:8px 10px;outline:none;">${destOptions()}</select>
          <button id="app_allGoto" style="background:rgba(180,0,255,0.2);color:#dd99ff;font-size:12px;
            font-weight:bold;border:1px solid rgba(180,0,255,0.45);border-radius:8px;padding:9px 14px;
            cursor:pointer;white-space:nowrap;">🎭 Send All</button>
        </div>
        <div id="app_allFb" style="color:#80ff80;font-size:12px;min-height:14px;"></div>
      </div>

      <!-- ── Live player spy ── -->
      <div style="background:rgba(0,255,180,0.06);border:2px solid rgba(0,255,180,0.3);
        border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="color:#66ffcc;font-size:15px;font-weight:bold;">🛰️ Live Player Spy</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button id="app_toggleOffline" style="background:rgba(255,255,255,0.06);
              color:rgba(255,255,255,0.55);font-size:11px;border:1px solid rgba(255,255,255,0.2);
              border-radius:8px;padding:4px 10px;cursor:pointer;">Online only</button>
            <button id="app_refresh" style="background:transparent;border:none;
              color:rgba(255,255,255,0.4);font-size:11px;cursor:pointer;padding:0 4px;">↻</button>
          </div>
        </div>
        <div style="color:rgba(255,255,255,0.35);font-size:11px;margin-top:-4px;">
          Refreshes every 5s. Players heartbeat every 8s.
        </div>
        <div id="app_players" style="display:flex;flex-direction:column;gap:8px;">
          <div style="color:rgba(255,255,255,0.3);font-size:12px;">Loading…</div>
        </div>
      </div>

    </div>
  `;

  // ── Roster rendering (titles for anyone) ───────────────────────────────

  function renderTitleRoster(): void {
    const el = $("#app_titleRoster");
    if (!el) return;

    // The roster is `members`, but include anyone seen in presence or already
    // titled who somehow isn't in it, so nobody is unreachable.
    const seen = new Map<string, string>();
    for (const m of members) seen.set(m.account_id, m.username);
    for (const r of rows) if (!seen.has(r.account_id)) seen.set(r.account_id, r.username);
    for (const id of Object.keys(titles)) if (!seen.has(id)) seen.set(id, "(unknown)");

    const q = titleFilter.trim().toLowerCase();
    let list = [...seen.entries()].map(([id, username]) => ({ id, username }));
    if (q) list = list.filter(p => p.username.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    // Titled players first, then alphabetical.
    list.sort((a, b) =>
      Number(!!titles[b.id]) - Number(!!titles[a.id]) || a.username.localeCompare(b.username));

    if (!list.length) {
      el.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:12px;">
        ${q ? "Nobody matches that search." : "No players found."}</div>`;
      return;
    }

    const online = new Set(rows.filter(r => isOnline(r)).map(r => r.account_id));

    el.innerHTML = list.map(p => {
      const t = titleDef(titles[p.id]);
      return `
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;
          background:rgba(255,255,255,0.04);border:1px solid ${t ? `${t.color}55` : "rgba(255,255,255,0.08)"};
          border-radius:9px;padding:7px 9px;">
          <div style="flex:1;min-width:110px;">
            <div style="color:white;font-size:12px;font-weight:bold;">
              ${online.has(p.id) ? "🟢" : "⚪"} ${esc(p.username)}
            </div>
            ${t ? `<div style="color:${t.color};font-size:10px;font-weight:bold;margin-top:1px;">
              ${t.emoji} ${t.name} · ${t.mult.toLocaleString()}× stats</div>` : ""}
          </div>
          <select data-rtitle="${esc(p.id)}" data-rname="${esc(p.username)}"
            style="background:rgba(255,255,255,0.08);
            border:1px solid rgba(255,200,0,0.3);border-radius:7px;color:white;font-size:11px;
            padding:5px 7px;outline:none;max-width:190px;">${titleOptions(titles[p.id])}</select>
          <div data-rfb="${esc(p.id)}" style="color:#80ff80;font-size:10px;width:100%;min-height:11px;"></div>
        </div>`;
    }).join("");

    // Applied on change, not behind a Set button — one action, nothing to lose
    // to a refresh, and the row restyles itself in place on success.
    all<HTMLSelectElement>("[data-rtitle]").forEach(sel => {
      sel.onchange = () => {
        const id = sel.dataset.rtitle!;
        const name = sel.dataset.rname ?? "Player";
        const fbEl = $(`[data-rfb="${CSS.escape(id)}"]`);
        const titleId = sel.value;
        if (fbEl) { fbEl.style.color = "rgba(255,255,255,0.5)"; fbEl.textContent = "Saving…"; }
        setTitle(id, name, titleId).then(() => {
          const def = titleDef(titleId);
          if (fbEl) {
            fbEl.style.color = "#80ff80";
            fbEl.textContent = def
              ? `✓ ${name} is now ${def.name} (${def.mult.toLocaleString()}×).`
              : `✓ Title removed from ${name}.`;
          }
          // Recolour this row without rebuilding the list, so the admin doesn't
          // lose their place or their search results.
          const card = sel.closest<HTMLElement>("div[style*='border-radius:9px']");
          if (card) card.style.borderColor = def ? `${def.color}55` : "rgba(255,255,255,0.08)";
          renderPlayers();
        }).catch(() => {
          if (fbEl) { fbEl.style.color = "#ff8888"; fbEl.textContent = "❌ Failed to save."; }
          sel.value = titles[id] ?? "";
        });
      };
    });
  }

  // ── Player card rendering (spy + remote control) ───────────────────────

  function renderPlayers(): void {
    const el = $("#app_players");
    if (!el) return;

    const now = Date.now();
    const visible = rows
      .filter(r => !onlineOnly || isOnline(r, now))
      .sort((a, b) => Number(isOnline(b, now)) - Number(isOnline(a, now)) || b.last_seen - a.last_seen);

    if (!visible.length) {
      el.innerHTML = `<div style="color:rgba(255,255,255,0.3);font-size:12px;">
        ${onlineOnly ? "Nobody is online right now." : "No players have ever checked in."}
      </div>`;
      return;
    }

    el.innerHTML = visible.map(r => {
      const on = isOnline(r, now);
      const t = titleDef(titles[r.account_id] ?? r.title);
      const isMe = r.account_id === game.currentAccountId;
      return `
        <div style="border-radius:12px;padding:10px 12px;
          background:${on ? "rgba(0,255,180,0.07)" : "rgba(255,255,255,0.03)"};
          border:1px solid ${on ? "rgba(0,255,180,0.3)" : "rgba(255,255,255,0.08)"};">

          <div style="min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="color:${on ? "#66ffcc" : "rgba(255,255,255,0.45)"};font-size:14px;font-weight:bold;">
                ${on ? "🟢" : "⚪"} ${esc(r.username)}${isMe ? " (you)" : ""}
              </span>
              ${t ? `<span style="color:${t.color};font-size:11px;font-weight:bold;
                border:1px solid ${t.color}66;border-radius:6px;padding:1px 6px;">
                ${t.emoji} ${t.name} ${t.mult.toLocaleString()}×</span>` : ""}
            </div>
            <div style="color:rgba(255,255,255,0.45);font-size:11px;margin-top:3px;">
              📍 ${esc(r.scene)} · ⏱ ${formatDuration(now - r.session_started)}
              ${on ? "" : ` · last seen ${formatDuration(now - r.last_seen)} ago`}
            </div>
            ${mpLabel(r) ? `<div style="color:#7fd8ff;font-size:11px;font-weight:bold;margin-top:2px;">
              ${mpLabel(r)}</div>` : ""}
            <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px;">
              🪙 ${Number(r.coins).toLocaleString()} · 🏆 ${Number(r.wins).toLocaleString()} · 💎 ${Number(r.diamonds).toLocaleString()}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-top:8px;">
            <button data-kick="${esc(r.account_id)}" style="background:rgba(200,0,0,0.2);color:#ff8888;
              font-size:11px;font-weight:bold;border:1px solid rgba(200,0,0,0.4);border-radius:7px;
              padding:6px;cursor:pointer;">👢 Kick</button>
            <button data-freeze="${esc(r.account_id)}" style="background:rgba(0,160,255,0.2);color:#88ddff;
              font-size:11px;font-weight:bold;border:1px solid rgba(0,160,255,0.4);border-radius:7px;
              padding:6px;cursor:pointer;">🧊 Freeze</button>
            <button data-unfreeze="${esc(r.account_id)}" style="background:rgba(0,200,120,0.2);color:#88ffbb;
              font-size:11px;font-weight:bold;border:1px solid rgba(0,200,120,0.4);border-radius:7px;
              padding:6px;cursor:pointer;">☀️ Unfreeze</button>
          </div>

          <div style="display:flex;gap:5px;margin-top:5px;">
            <select data-dest="${esc(r.account_id)}" style="flex:1;min-width:0;
              background:rgba(255,255,255,0.07);border:1px solid rgba(180,0,255,0.35);border-radius:7px;
              color:white;font-size:11px;padding:6px;outline:none;">${destOptions()}</select>
            <button data-goto="${esc(r.account_id)}" style="background:rgba(180,0,255,0.2);color:#dd99ff;
              font-size:11px;font-weight:bold;border:1px solid rgba(180,0,255,0.4);border-radius:7px;
              padding:6px 12px;cursor:pointer;white-space:nowrap;">🎭 Send</button>
          </div>

          <div data-fb="${esc(r.account_id)}" style="color:#80ff80;font-size:11px;min-height:13px;margin-top:4px;"></div>
        </div>`;
    }).join("");

    wirePlayerButtons();
  }

  function wirePlayerButtons(): void {
    const say = (accountId: string, msg: string, ok = true) => {
      const fb = $(`[data-fb="${CSS.escape(accountId)}"]`);
      if (!fb) return;
      fb.style.color = ok ? "#80ff80" : "#ff8888";
      fb.textContent = msg;
      setTimeout(() => { if (fb.textContent === msg) fb.textContent = ""; }, 3000);
    };

    all<HTMLElement>("[data-kick]").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.kick!;
        send(id, "kick", null)
          .then(() => say(id, "✓ Kicked to the title screen."))
          .catch(() => say(id, "❌ Failed.", false));
      };
    });

    all<HTMLElement>("[data-freeze]").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.freeze!;
        const msg = prompt("Freeze message for this player:", "Stop right there.");
        if (msg === null) return;
        send(id, "freeze", msg)
          .then(() => say(id, "✓ Frozen."))
          .catch(() => say(id, "❌ Failed.", false));
      };
    });

    all<HTMLElement>("[data-unfreeze]").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.unfreeze!;
        send(id, "unfreeze", null)
          .then(() => say(id, "✓ Released."))
          .catch(() => say(id, "❌ Failed.", false));
      };
    });

    all<HTMLElement>("[data-goto]").forEach(b => {
      b.onclick = () => {
        const id = b.dataset.goto!;
        const sel = $<HTMLSelectElement>(`[data-dest="${CSS.escape(id)}"]`);
        const dest = sel?.value ?? "title";
        const label = PUPPET_DESTINATIONS.find(d => d.id === dest)?.label ?? dest;
        send(id, "goto", dest)
          .then(() => say(id, `✓ Sent to ${label}.`))
          .catch(() => say(id, "❌ Failed.", false));
      };
    });
  }

  // ── Wiring ─────────────────────────────────────────────────────────────

  $("#app_refresh")!.onclick = () => { loadPlayers(true); loadMembers(); };

  const toggle = $("#app_toggleOffline")!;
  toggle.onclick = () => {
    onlineOnly = !onlineOnly;
    toggle.textContent = onlineOnly ? "Online only" : "Showing all";
    toggle.style.color = onlineOnly ? "rgba(255,255,255,0.55)" : "#66ffcc";
    renderPlayers();
  };

  const search = $<HTMLInputElement>("#app_titleSearch")!;
  search.oninput = () => { titleFilter = search.value; renderTitleRoster(); };

  all<HTMLElement>("#app_eventBtns [data-event]").forEach(b => {
    b.onclick = () => setEvent(b.dataset.event ?? null);
  });
  $("#app_eventOff")!.onclick = () => setEvent(null);

  // Manual grant by account id
  $("#app_manualSet")!.onclick = () => {
    const idEl = $<HTMLInputElement>("#app_manualId")!;
    const sel  = $<HTMLSelectElement>("#app_manualTitle")!;
    const fb   = $("#app_manualFb")!;
    const id   = idEl.value.trim();
    if (!id) {
      fb.style.color = "#ff8888";
      fb.textContent = "❌ Enter an account ID.";
      return;
    }
    const known = members.find(m => m.account_id === id)?.username
      ?? rows.find(r => r.account_id === id)?.username
      ?? "Player";
    setTitle(id, known, sel.value).then(() => {
      const def = titleDef(sel.value);
      fb.style.color = "#80ff80";
      fb.textContent = def ? `✓ ${known} is now ${def.name}.` : `✓ Title removed.`;
      idEl.value = "";
      renderTitleRoster();
      setTimeout(() => { fb.textContent = ""; }, 4000);
    }).catch(() => {
      fb.style.color = "#ff8888";
      fb.textContent = "❌ Failed to set the title.";
    });
  };

  // Broadcast
  const allFb = (msg: string, ok = true) => {
    const fb = $("#app_allFb");
    if (!fb) return;
    fb.style.color = ok ? "#80ff80" : "#ff8888";
    fb.textContent = msg;
    setTimeout(() => { if (fb.textContent === msg) fb.textContent = ""; }, 3500);
  };
  const broadcast = (command: string, payload: string | null, okMsg: string) => {
    send(ALL_PLAYERS, command, payload)
      .then(() => allFb(okMsg))
      .catch(() => allFb("❌ Failed to broadcast.", false));
  };

  $("#app_allFreeze")!.onclick = () => {
    const msg = $<HTMLInputElement>("#app_allMsg")!.value.trim() || "An admin has frozen the whole server.";
    broadcast("freeze", msg, "✓ Everyone is frozen.");
  };
  $("#app_allUnfreeze")!.onclick = () => broadcast("unfreeze", null, "✓ Everyone released.");
  $("#app_allKick")!.onclick = () => {
    if (!confirm("Kick every player back to the title screen?")) return;
    broadcast("kick", null, "✓ Everyone kicked.");
  };
  $("#app_allGoto")!.onclick = () => {
    const dest = $<HTMLSelectElement>("#app_allDest")!.value;
    const label = PUPPET_DESTINATIONS.find(d => d.id === dest)?.label ?? dest;
    if (!confirm(`Send every player to ${label}?`)) return;
    broadcast("goto", dest, `✓ Everyone sent to ${label}.`);
  };

  loadPlayers(true);
  loadMembers();
  loadEvent();
  timers.push(window.setInterval(() => loadPlayers(false), 5_000));
  timers.push(window.setInterval(loadEvent, 15_000));

  return {
    destroy(): void {
      timers.forEach(t => clearInterval(t));
      timers.length = 0;
      container.innerHTML = "";
    },
  };
}
