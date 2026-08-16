import type { Game } from "../game/Game";
import { PETS } from "../game/Game";
import {
  fetchOpenListings, fetchMyListings, createListing, claimListing,
  cancelListing, paySeller, deleteListing, type Listing,
} from "../game/trading";

type Tab = "buy" | "sell";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ago(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function petOf(id: string) {
  return PETS.find(p => p.id === id);
}

/** "🪙 5,000 + 💎 2" — whatever the listing actually asks for. */
function priceHTML(l: Listing): string {
  const bits: string[] = [];
  if (l.price_coins > 0)    bits.push(`<span style="color:#FFD700;">🪙 ${l.price_coins.toLocaleString()}</span>`);
  if (l.price_diamonds > 0) bits.push(`<span style="color:#66ddff;">💎 ${l.price_diamonds.toLocaleString()}</span>`);
  return bits.length ? bits.join(`<span style="color:rgba(255,255,255,0.3);"> + </span>`) : "Free";
}

export class TradingPlaza {
  private _g: Game;
  private _tab: Tab = "buy";
  private _open: Listing[] = [];
  private _mine: Listing[] = [];
  private _busy = false;

  private _balTick = 0;

  constructor(game: Game) {
    this._g = game;
    // money can land mid-browse (a sale paying out, a pet earning), so keep the
    // header pills live rather than frozen at whatever they were on render
    this._balTick = window.setInterval(() => {
      const c = document.getElementById("tpCoinBal");
      const d = document.getElementById("tpGemBal");
      if (c) c.textContent = game.state.coins.toLocaleString();
      if (d) d.textContent = game.state.diamonds.toLocaleString();
    }, 1000);
    game._disposeScene = () => { clearInterval(this._balTick); game.ui.innerHTML = ""; };
    this._loading();
    this._reload();
  }

  private _loading(): void {
    this._g.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#0a1e14,#0d3524,#06180f);
        flex-direction:column;gap:14px;">
        <div style="font-size:40px;">🏪</div>
        <div style="color:rgba(255,255,255,0.6);font-size:16px;">Opening the plaza…</div>
      </div>`;
  }

  private _reload(): void {
    const id = this._g.currentAccountId ?? "";
    Promise.all([fetchOpenListings(), fetchMyListings(id)]).then(([open, mine]) => {
      this._open = open;
      this._mine = mine;
      this._render();
    });
  }

  // ── Buy tab ───────────────────────────────────────────────────────────────
  private _buyHTML(): string {
    const g = this._g;
    const myId = g.currentAccountId ?? "";
    const others = this._open.filter(l => l.seller_id !== myId);

    if (!others.length) {
      return `<div style="color:rgba(255,255,255,0.4);font-size:14px;text-align:center;padding:26px;">
        Nothing for sale right now.<br>
        <span style="font-size:12px;">Switch to Sell and list one of your pets!</span></div>`;
    }

    return others.map(l => {
      const pet = petOf(l.pet_id);
      const owned      = g.state.pets.includes(l.pet_id);
      const canCoins   = g.state.coins    >= l.price_coins;
      const canGems    = g.state.diamonds >= l.price_diamonds;
      const affordable = canCoins && canGems;
      const blocked    = owned || !affordable;
      const why = owned ? "Already owned"
                : !canCoins ? "Not enough coins"
                : !canGems  ? "Not enough gems"
                : "Buy";
      return `
        <div style="background:rgba(0,0,0,0.34);border:1px solid rgba(255,255,255,0.12);
          border-radius:14px;padding:13px 15px;display:flex;align-items:center;gap:13px;">
          <div style="font-size:36px;line-height:1;">${pet?.emoji ?? "❓"}</div>
          <div style="flex:1;min-width:0;">
            <div style="color:white;font-size:16px;font-weight:bold;">${pet?.name ?? l.pet_id}</div>
            <div style="color:rgba(255,255,255,0.42);font-size:11px;margin-top:2px;">
              from ${esc(l.seller_name)} · ${ago(l.created_at)}
            </div>
            ${pet ? `<div style="color:rgba(255,255,255,0.35);font-size:11px;">
              earns 🪙 ${pet.reward.toLocaleString()} every ${pet.interval / 1000}s</div>` : ""}
            <div style="font-size:14px;font-weight:bold;margin-top:5px;">${priceHTML(l)}</div>
          </div>
          <button class="tpBuy" data-id="${l.id}" ${blocked ? "disabled" : ""} style="
            background:${blocked ? "rgba(255,255,255,0.06)" : "rgba(80,220,140,0.25)"};
            color:${blocked ? "rgba(255,255,255,0.35)" : "#7dffb0"};
            font-size:13px;font-weight:bold;
            border:1px solid ${blocked ? "rgba(255,255,255,0.12)" : "rgba(80,220,140,0.5)"};
            border-radius:10px;padding:10px 15px;cursor:${blocked ? "default" : "pointer"};
            white-space:nowrap;">${why}</button>
        </div>`;
    }).join("");
  }

  // ── Sell tab ──────────────────────────────────────────────────────────────
  private _sellHTML(): string {
    const g = this._g;
    const inp = "background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);" +
                "border-radius:8px;color:white;font-size:14px;padding:8px 11px;outline:none;width:100%;";

    const owned = g.state.pets.map(id => petOf(id)).filter(Boolean);
    const listing = this._mine.filter(l => l.status === "open");
    const sold    = this._mine.filter(l => l.status === "sold").slice(0, 6);

    const newForm = owned.length === 0
      ? `<div style="color:rgba(255,255,255,0.4);font-size:13px;text-align:center;padding:16px;">
           You don't own any pets to sell.<br>
           <span style="font-size:12px;">Buy one in the Shop first.</span></div>`
      : `
        <div style="display:flex;flex-direction:column;gap:9px;">
          <select id="tpPet" style="${inp}">
            ${owned.map(p => `<option value="${p!.id}" style="background:#08281a;">
              ${p!.emoji} ${p!.name}</option>`).join("")}
          </select>
          <div style="display:flex;gap:8px;">
            <div style="flex:1;">
              <div style="color:#FFD700;font-size:11px;margin-bottom:3px;">🪙 Coin price</div>
              <input id="tpCoins" type="number" min="0" value="0" style="${inp}" />
            </div>
            <div style="flex:1;">
              <div style="color:#66ddff;font-size:11px;margin-bottom:3px;">💎 Gem price</div>
              <input id="tpGems" type="number" min="0" value="0" style="${inp}" />
            </div>
          </div>
          <div style="color:rgba(255,255,255,0.35);font-size:11px;">
            Set one, or both — a buyer pays everything you ask for.
          </div>
          <button id="tpList" style="background:rgba(80,220,140,0.25);color:#7dffb0;font-size:14px;
            font-weight:bold;border:2px solid rgba(80,220,140,0.5);border-radius:10px;
            padding:11px;cursor:pointer;">📤 List for sale</button>
        </div>`;

    const mineHTML = listing.length === 0
      ? `<div style="color:rgba(255,255,255,0.3);font-size:12px;">Nothing listed right now.</div>`
      : listing.map(l => {
          const pet = petOf(l.pet_id);
          return `
            <div style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.12);
              border-radius:11px;padding:10px 12px;display:flex;align-items:center;gap:11px;">
              <div style="font-size:26px;">${pet?.emoji ?? "❓"}</div>
              <div style="flex:1;min-width:0;">
                <div style="color:white;font-size:14px;font-weight:bold;">${pet?.name ?? l.pet_id}</div>
                <div style="font-size:12px;margin-top:2px;">${priceHTML(l)}</div>
              </div>
              <button class="tpCancel" data-id="${l.id}" style="background:rgba(255,160,0,0.16);
                color:#ffbb55;font-size:11px;border:1px solid rgba(255,160,0,0.4);
                border-radius:8px;padding:7px 11px;cursor:pointer;white-space:nowrap;">
                Take back</button>
            </div>`;
        }).join("");

    const soldHTML = sold.length === 0 ? "" : `
      <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.5px;
        text-transform:uppercase;margin-top:6px;">Recently sold</div>
      ${sold.map(l => {
        const pet = petOf(l.pet_id);
        return `<div style="color:rgba(255,255,255,0.45);font-size:12px;">
          ${pet?.emoji ?? "❓"} ${pet?.name ?? l.pet_id} → ${esc(l.buyer_name ?? "someone")}
          · ${priceHTML(l)}</div>`;
      }).join("")}`;

    return `
      <div style="display:flex;flex-direction:column;gap:13px;">
        <div style="background:rgba(0,0,0,0.32);border:1px solid rgba(255,255,255,0.12);
          border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:9px;">
          <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.5px;
            text-transform:uppercase;">Sell a pet</div>
          ${newForm}
        </div>
        <div style="background:rgba(0,0,0,0.32);border:1px solid rgba(255,255,255,0.12);
          border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px;">
          <div style="color:rgba(255,255,255,0.5);font-size:11px;letter-spacing:0.5px;
            text-transform:uppercase;">Your listings</div>
          ${mineHTML}
          ${soldHTML}
        </div>
      </div>`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  private _render(): void {
    const g = this._g;
    const tabStyle = (on: boolean) =>
      `flex:1;background:${on ? "rgba(80,220,140,0.25)" : "rgba(255,255,255,0.06)"};
       color:${on ? "#7dffb0" : "rgba(255,255,255,0.5)"};font-size:14px;font-weight:bold;
       border:1px solid ${on ? "rgba(80,220,140,0.5)" : "rgba(255,255,255,0.14)"};
       border-radius:11px;padding:10px;cursor:pointer;`;

    g.ui.innerHTML = `
      <div class="screen" style="background:linear-gradient(160deg,#0a1e14,#0d3524,#06180f);
        flex-direction:column;overflow-y:auto;justify-content:flex-start;padding:22px 14px 44px;">

        <div style="font-size:36px;">🏪</div>
        <h2 style="color:#7dffb0;font-size:26px;margin:2px 0 2px;
          text-shadow:0 0 16px rgba(80,220,140,0.5);">Trading Plaza</h2>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 12px;">
          Buy and sell pets with other players
        </p>

        <div style="display:flex;gap:12px;margin-bottom:14px;">
          <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,215,0,0.3);
            border-radius:20px;padding:6px 14px;color:#FFD700;font-size:13px;font-weight:bold;">
            🪙 <span id="tpCoinBal">${g.state.coins.toLocaleString()}</span></div>
          <div style="background:rgba(0,0,0,0.4);border:1px solid rgba(100,220,255,0.3);
            border-radius:20px;padding:6px 14px;color:#66ddff;font-size:13px;font-weight:bold;">
            💎 <span id="tpGemBal">${g.state.diamonds.toLocaleString()}</span></div>
        </div>

        <div style="width:100%;max-width:520px;display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;gap:8px;">
            <button id="tpTabBuy"  style="${tabStyle(this._tab === "buy")}">🛒 Buy</button>
            <button id="tpTabSell" style="${tabStyle(this._tab === "sell")}">📤 Sell</button>
          </div>

          <div id="tpFb" style="color:#80ff80;font-size:13px;min-height:17px;text-align:center;"></div>

          <div id="tpBody" style="display:flex;flex-direction:column;gap:9px;">
            ${this._tab === "buy" ? this._buyHTML() : this._sellHTML()}
          </div>

          <button id="tpRefresh" style="background:rgba(255,255,255,0.07);
            color:rgba(255,255,255,0.55);font-size:12px;border:1px solid rgba(255,255,255,0.15);
            border-radius:10px;padding:9px;cursor:pointer;">↻ Refresh</button>

          <button id="tpBack" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.55);
            font-size:13px;padding:10px;border-radius:11px;border:1px solid rgba(255,255,255,0.16);
            cursor:pointer;">← Back</button>
        </div>
      </div>`;

    this._wire();
  }

  private _fb(msg: string, ok = true): void {
    const el = document.getElementById("tpFb");
    if (!el) return;
    el.style.color = ok ? "#80ff80" : "#ff8888";
    el.textContent = msg;
  }

  private _wire(): void {
    const g = this._g;

    document.getElementById("tpTabBuy")!.onclick  = () => { this._tab = "buy";  this._render(); };
    document.getElementById("tpTabSell")!.onclick = () => { this._tab = "sell"; this._render(); };
    document.getElementById("tpRefresh")!.onclick = () => { this._loading(); this._reload(); };
    document.getElementById("tpBack")!.onclick    = () => g.goArcade();

    // ── Buy ──
    document.querySelectorAll<HTMLButtonElement>(".tpBuy").forEach(btn => {
      btn.onclick = () => {
        if (this._busy) return;
        const l = this._open.find(x => x.id === btn.dataset.id);
        if (!l) return;
        const myId = g.currentAccountId;
        if (!myId) { this._fb("❌ Log in to trade.", false); return; }
        if (g.state.coins < l.price_coins || g.state.diamonds < l.price_diamonds) {
          this._fb("❌ You can't afford that.", false); return;
        }
        this._busy = true;
        btn.disabled = true;
        btn.textContent = "Buying…";

        // claim first — if someone beat us to it, nothing is charged
        claimListing(l.id, myId, g.state.username).then(won => {
          if (!won) {
            this._busy = false;
            this._fb("❌ Too slow — someone else bought it.", false);
            this._reload();
            return;
          }
          g.state.coins    = Math.max(0, g.state.coins    - l.price_coins);
          g.state.diamonds = Math.max(0, g.state.diamonds - l.price_diamonds);
          g.addPet(l.pet_id); // also saves
          const pet = petOf(l.pet_id);
          return paySeller(l.seller_id, l.price_coins, l.price_diamonds).then(paid => {
            this._busy = false;
            this._fb(paid
              ? `✓ Bought ${pet?.emoji ?? ""} ${pet?.name ?? l.pet_id}! It's earning for you now.`
              : `✓ Bought ${pet?.name ?? l.pet_id} — but paying the seller failed, tell an admin.`,
              paid);
            this._reload();
          });
        });
      };
    });

    // ── Sell ──
    const listBtn = document.getElementById("tpList") as HTMLButtonElement | null;
    if (listBtn) listBtn.onclick = () => {
      if (this._busy) return;
      const petId = (document.getElementById("tpPet")   as HTMLSelectElement).value;
      const coins = Math.max(0, Math.floor(+(document.getElementById("tpCoins") as HTMLInputElement).value || 0));
      const gems  = Math.max(0, Math.floor(+(document.getElementById("tpGems")  as HTMLInputElement).value || 0));
      if (coins <= 0 && gems <= 0) { this._fb("❌ Set a coin price, a gem price, or both.", false); return; }
      if (!g.state.pets.includes(petId)) { this._fb("❌ You don't own that pet.", false); return; }
      const myId = g.currentAccountId;
      if (!myId) { this._fb("❌ Log in to trade.", false); return; }

      this._busy = true;
      listBtn.disabled = true;
      listBtn.textContent = "Listing…";
      createListing({
        sellerId: myId, sellerName: g.state.username,
        petId, priceCoins: coins, priceDiamonds: gems,
      }).then(id => {
        this._busy = false;
        if (!id) {
          listBtn.disabled = false;
          listBtn.textContent = "📤 List for sale";
          this._fb("❌ Couldn't reach the market — try again.", false);
          return;
        }
        // held by the market until sold or taken back, so it can't be duplicated
        g.removePet(petId);
        this._fb("✓ Listed! It's held by the market until it sells.");
        this._reload();
      });
    };

    document.querySelectorAll<HTMLButtonElement>(".tpCancel").forEach(btn => {
      btn.onclick = () => {
        if (this._busy) return;
        const l = this._mine.find(x => x.id === btn.dataset.id);
        if (!l) return;
        this._busy = true;
        btn.disabled = true;
        btn.textContent = "…";
        cancelListing(l.id).then(ok => {
          this._busy = false;
          if (!ok) { this._fb("❌ Already sold — too late to take it back.", false); this._reload(); return; }
          g.addPet(l.pet_id);
          this._fb("✓ Taken back off the market.");
          this._reload();
        });
      };
    });
  }
}

export { deleteListing };
