import type { Game } from "../game/Game";
import { PETS, ITEMS, GEM_EXCHANGE, type PetDef, type ItemDef } from "../game/Game";
import { bumpStat } from "../game/badges";
import { IS_DEMO } from "../demo";

type Tab = "pets" | "gems";

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(n);
}

/** Coins per minute, so pets can be compared at a glance rather than by vibes. */
function rate(game: Game, p: PetDef): string {
  const perMin = (p.reward * game.petCoinMultiplier) / ((p.interval * game.petSpeedMultiplier) / 60_000);
  return `${fmt(Math.round(perMin))}/min`;
}

export class ShopScene {
  private _tab: Tab = "pets";

  constructor(game: Game) {
    game._disposeScene = () => { game.ui.innerHTML = ""; };
    this._build(game);
  }

  private _petCard(game: Game, pet: PetDef): string {
    const owned  = game.state.pets.includes(pet.id);
    const isGem  = !!pet.gemCost;
    const price  = isGem ? pet.gemCost! : pet.cost;
    const have   = isGem ? game.state.diamonds : game.state.coins;
    const can    = have >= price;
    const accent = isGem ? "#66ddff" : "#FFD700";

    return `
      <div style="background:${owned ? `${accent}1a` : "rgba(255,255,255,0.05)"};
        border:2px solid ${owned ? `${accent}80` : "rgba(255,255,255,0.1)"};
        border-radius:16px;padding:13px 10px;display:flex;flex-direction:column;
        align-items:center;gap:5px;text-align:center;">
        <div style="font-size:38px;line-height:1;">${pet.emoji}</div>
        <div style="color:white;font-size:14px;font-weight:bold;">${pet.name}</div>
        <div style="color:rgba(255,255,255,0.45);font-size:11px;line-height:1.35;">
          🪙 ${fmt(pet.reward)} every ${(pet.interval / 1000).toFixed(pet.interval < 10000 ? 1 : 0)}s
        </div>
        <div style="color:${accent};font-size:11px;font-weight:bold;">${rate(game, pet)}</div>
        ${owned
          ? `<div style="color:${accent};font-size:12px;font-weight:bold;
              background:${accent}22;padding:5px 14px;border-radius:16px;
              border:1px solid ${accent}55;margin-top:3px;">✓ Owned</div>`
          : `<button id="buyPet_${pet.id}" style="
              background:${can ? accent : "rgba(255,255,255,0.1)"};
              color:${can ? (isGem ? "#00202e" : "#1a0060") : "rgba(255,255,255,0.35)"};
              font-size:12px;font-weight:bold;padding:7px 15px;border-radius:16px;border:none;
              cursor:${can ? "pointer" : "default"};font-family:Arial,sans-serif;
              white-space:nowrap;margin-top:3px;">
              ${isGem ? "💎" : "🪙"} ${fmt(price)}</button>`}
      </div>`;
  }

  private _itemCard(game: Game, item: ItemDef): string {
    const owned  = game.hasItem(item.id);
    const isGem  = !!item.gemCost;
    const price  = isGem ? item.gemCost! : item.cost;
    const have   = isGem ? game.state.diamonds : game.state.coins;
    const can    = have >= price;
    const accent = isGem ? "#66ddff" : "#FFD700";

    return `
      <div style="background:${owned ? "rgba(120,255,160,0.08)" : "rgba(255,255,255,0.05)"};
        border:2px solid ${owned ? "rgba(120,255,160,0.4)" : "rgba(255,255,255,0.1)"};
        border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px;">
        <div style="font-size:34px;flex-shrink:0;">${item.emoji}</div>
        <div style="flex:1;min-width:0;">
          <div style="color:white;font-size:15px;font-weight:bold;">${item.name}</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">${item.desc}</div>
        </div>
        ${owned
          ? `<div style="color:#7dff9a;font-size:12px;font-weight:bold;
              background:rgba(120,255,160,0.15);padding:6px 14px;border-radius:16px;
              border:1px solid rgba(120,255,160,0.35);white-space:nowrap;">✓ Owned</div>`
          : `<button id="buyItem_${item.id}" style="
              background:${can ? accent : "rgba(255,255,255,0.1)"};
              color:${can ? (isGem ? "#00202e" : "#1a0060") : "rgba(255,255,255,0.35)"};
              font-size:12px;font-weight:bold;padding:7px 15px;border-radius:16px;border:none;
              cursor:${can ? "pointer" : "default"};font-family:Arial,sans-serif;white-space:nowrap;">
              ${isGem ? "💎" : "🪙"} ${fmt(price)}</button>`}
      </div>`;
  }

  private _build(game: Game): void {
    const render = () => {
      // The demo ships the original coin pets only. The Diamond Aisle and the
      // mythic tier above it are full-version content, so the whole tab goes.
      if (IS_DEMO && this._tab === "gems") this._tab = "pets";
      const shopPets = IS_DEMO ? PETS.filter(p => !p.gemCost) : PETS;

      const coinPets = shopPets.filter(p => !p.gemCost);
      const gemPets  = shopPets.filter(p =>  p.gemCost);
      const coinItems = ITEMS.filter(i => !i.gemCost);
      const gemItems  = ITEMS.filter(i =>  i.gemCost);

      const tabBtn = (id: Tab, label: string, color: string) => `
        <button id="tab_${id}" style="
          flex:1;background:${this._tab === id ? `${color}33` : "rgba(255,255,255,0.06)"};
          color:${this._tab === id ? color : "rgba(255,255,255,0.5)"};
          border:2px solid ${this._tab === id ? `${color}88` : "rgba(255,255,255,0.12)"};
          border-radius:14px;padding:11px;font-size:14px;font-weight:bold;
          cursor:pointer;font-family:Arial,sans-serif;">${label}</button>`;

      const body = this._tab === "pets"
        ? `
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-bottom:10px;text-align:center;">
            Pets solve puzzles for you while you play
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));
            gap:10px;width:100%;max-width:460px;margin-bottom:16px;">
            ${coinPets.map(p => this._petCard(game, p)).join("")}
          </div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin:6px 0 10px;">Upgrades</div>
          <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:460px;
            margin-bottom:16px;">
            ${coinItems.map(i => this._itemCard(game, i)).join("")}
            ${this._autoClickerCard(game)}
          </div>`
        : `
          <div style="color:rgba(100,220,255,0.6);font-size:12px;margin-bottom:10px;text-align:center;">
            Earn 💎 in <b>Trapped In Your Computer</b> or by trading with other players
          </div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin:2px 0 10px;">Legendary pets</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));
            gap:10px;width:100%;max-width:460px;margin-bottom:16px;">
            ${gemPets.map(p => this._petCard(game, p)).join("")}
          </div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin:6px 0 10px;">Permanent upgrades</div>
          <div style="display:flex;flex-direction:column;gap:10px;width:100%;max-width:460px;
            margin-bottom:16px;">
            ${gemItems.map(i => this._itemCard(game, i)).join("")}
            ${this._adminLiteCard(game)}
          </div>

          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin:6px 0 10px;">
            Exchange — turn 💎 into 🪙</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));
            gap:10px;width:100%;max-width:460px;margin-bottom:16px;">
            ${GEM_EXCHANGE.map(x => {
              const can = game.state.diamonds >= x.gems;
              return `
                <div style="background:rgba(255,255,255,0.05);border:2px solid rgba(255,200,0,0.2);
                  border-radius:16px;padding:13px 10px;display:flex;flex-direction:column;
                  align-items:center;gap:5px;text-align:center;">
                  <div style="font-size:30px;">💰</div>
                  <div style="color:white;font-size:13px;font-weight:bold;">${x.label}</div>
                  <div style="color:#FFD700;font-size:12px;font-weight:bold;">🪙 ${fmt(x.coins)}</div>
                  <button id="buyEx_${x.gems}" style="
                    background:${can ? "#66ddff" : "rgba(255,255,255,0.1)"};
                    color:${can ? "#00202e" : "rgba(255,255,255,0.35)"};font-size:12px;
                    font-weight:bold;padding:7px 15px;border-radius:16px;border:none;
                    cursor:${can ? "pointer" : "default"};white-space:nowrap;margin-top:3px;">
                    💎 ${fmt(x.gems)}</button>
                </div>`;
            }).join("")}
          </div>`;

      game.ui.innerHTML = `
        <div class="screen" style="background:linear-gradient(160deg,#0a001e,#1a0840,#0a1808);
          flex-direction:column;gap:0;overflow-y:auto;justify-content:flex-start;padding:24px 14px 44px;">

          <div style="font-size:36px;margin-bottom:4px;">🛍️</div>
          <h2 style="color:#FFD700;font-size:27px;margin:0 0 12px;
            text-shadow:0 0 16px rgba(255,215,0,0.5);">Shop</h2>

          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;
            justify-content:center;">
            <div style="display:flex;align-items:center;gap:6px;background:rgba(255,200,0,0.1);
              border:2px solid rgba(255,200,0,0.35);border-radius:16px;padding:5px 16px;">
              <span style="font-size:17px;">🪙</span>
              <span style="color:#FFD700;font-size:15px;font-weight:bold;">
                ${game.state.coins.toLocaleString()}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;background:rgba(100,220,255,0.1);
              border:2px solid rgba(100,220,255,0.35);border-radius:16px;padding:5px 16px;">
              <span style="font-size:17px;">💎</span>
              <span style="color:#66ddff;font-size:15px;font-weight:bold;">
                ${game.state.diamonds.toLocaleString()}</span>
            </div>
          </div>

          <div style="display:flex;gap:8px;width:100%;max-width:460px;margin-bottom:16px;">
            ${tabBtn("pets", "🪙 Coin Shop",     "#FFD700")}
            ${IS_DEMO ? "" : tabBtn("gems", "💎 Diamond Aisle", "#66ddff")}
          </div>

          ${body}

          ${game.state.pets.length > 0 ? `
            <div style="background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.2);
              border-radius:14px;padding:12px 16px;width:100%;max-width:460px;
              margin-bottom:14px;text-align:center;">
              <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:4px;">
                Your pets — ${game.state.pets.length} / ${shopPets.length}</div>
              <div style="font-size:20px;line-height:1.5;">
                ${game.state.pets.map(id => PETS.find(p => p.id === id)?.emoji ?? "").join(" ")}</div>
            </div>` : ""}

          <button id="shopBack" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);
            font-size:14px;padding:9px 24px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);
            cursor:pointer;font-family:Arial,sans-serif;">← Back</button>
        </div>`;

      document.getElementById("shopBack")!.onclick = () => game.goTitle();
      document.getElementById("tab_pets")!.onclick = () => { this._tab = "pets"; render(); };
      document.getElementById("tab_gems")!.onclick = () => { this._tab = "gems"; render(); };

      // ── pets ──
      PETS.forEach(pet => {
        const btn = document.getElementById(`buyPet_${pet.id}`);
        if (!btn) return;
        btn.onclick = () => {
          if (game.state.pets.includes(pet.id)) return;
          if (pet.gemCost) {
            if (game.state.diamonds < pet.gemCost) return;
            game.state.diamonds -= pet.gemCost;
          } else {
            if (game.state.coins < pet.cost) return;
            game.state.coins -= pet.cost;
          }
          game.state.pets.push(pet.id);
          game.save();
          game.startPetTimer(pet.id);
          game.checkBadges();
          render();
        };
      });

      // ── items ──
      ITEMS.forEach(item => {
        const btn = document.getElementById(`buyItem_${item.id}`);
        if (!btn) return;
        btn.onclick = () => {
          if (game.hasItem(item.id)) return;
          if (item.gemCost) {
            if (game.state.diamonds < item.gemCost) return;
            game.state.diamonds -= item.gemCost;
            bumpStat("gemItemsBought");
          } else {
            if (game.state.coins < item.cost) return;
            game.state.coins -= item.cost;
          }
          game.state.items.push(item.id);
          game.save();
          // speed items change pet cadence, so the running timers must be rebuilt
          game.restartPetTimers();
          game.checkBadges();
          render();
        };
      });

      GEM_EXCHANGE.forEach(x => {
        const btn = document.getElementById(`buyEx_${x.gems}`);
        if (!btn) return;
        btn.onclick = () => {
          if (game.state.diamonds < x.gems) return;
          game.state.diamonds -= x.gems;
          game.state.coins    += x.coins;
          game.save();
          render();
        };
      });

      const ac = document.getElementById("buyAC");
      if (ac) ac.onclick = () => {
        if (game.state.coins < 10_000) return;
        game.state.coins -= 10_000;
        game.state.autoClicker = true;
        game.save();
        game.setupAutoClicker();
        render();
      };

      const al = document.getElementById("buyAdminLite");
      if (al) al.onclick = () => {
        if (game.state.diamonds < 50_000) return;
        game.state.diamonds -= 50_000;
        game.state.hasAdminLite = true;
        game.save();
        render();
      };
    };

    render();
  }

  private _autoClickerCard(game: Game): string {
    const owned = game.state.autoClicker;
    const can   = game.state.coins >= 10_000;
    return `
      <div style="background:${owned ? "rgba(0,200,0,0.1)" : "rgba(255,255,255,0.05)"};
        border:2px solid ${owned ? "rgba(0,255,0,0.4)" : "rgba(255,255,255,0.1)"};
        border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px;">
        <div style="font-size:34px;">🖱️</div>
        <div style="flex:1;">
          <div style="color:white;font-size:15px;font-weight:bold;">Auto Clicker</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">
            Right-click to toggle on/off · infinite</div>
        </div>
        ${owned
          ? `<div style="color:#00ff88;font-size:12px;font-weight:bold;background:rgba(0,200,0,0.15);
              padding:6px 14px;border-radius:16px;border:1px solid rgba(0,255,0,0.3);">✓ Owned</div>`
          : `<button id="buyAC" style="background:${can ? "#FFD700" : "rgba(255,255,255,0.1)"};
              color:${can ? "#1a0060" : "rgba(255,255,255,0.35)"};font-size:12px;font-weight:bold;
              padding:7px 15px;border-radius:16px;border:none;
              cursor:${can ? "pointer" : "default"};white-space:nowrap;">🪙 10K</button>`}
      </div>`;
  }

  private _adminLiteCard(game: Game): string {
    const owned = game.state.hasAdminLite;
    const can   = game.state.diamonds >= 50_000;
    return `
      <div style="background:${owned ? "rgba(100,220,255,0.1)" : "rgba(255,255,255,0.05)"};
        border:2px solid ${owned ? "rgba(100,220,255,0.4)" : "rgba(255,255,255,0.1)"};
        border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px;">
        <div style="font-size:34px;">🛡️</div>
        <div style="flex:1;">
          <div style="color:white;font-size:15px;font-weight:bold;">Admin Panel −</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:2px;">
            Alt+P · 1,000 coins every 30s + message the owner</div>
        </div>
        ${owned
          ? `<div style="color:#66ddff;font-size:12px;font-weight:bold;background:rgba(100,220,255,0.15);
              padding:6px 14px;border-radius:16px;border:1px solid rgba(100,220,255,0.3);
              white-space:nowrap;">✓ Owned</div>`
          : `<button id="buyAdminLite" style="background:${can ? "#66ddff" : "rgba(255,255,255,0.1)"};
              color:${can ? "#00202e" : "rgba(255,255,255,0.35)"};font-size:12px;font-weight:bold;
              padding:7px 15px;border-radius:16px;border:none;
              cursor:${can ? "pointer" : "default"};white-space:nowrap;">💎 50K</button>`}
      </div>`;
  }
}
