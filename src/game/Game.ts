import { Engine } from "@babylonjs/core/Engines/engine";
import type { MultiplayerManager } from "../multiplayer/MultiplayerManager";
import { upsertRecord, fetchRecords, upsertCoinRecord, fetchCoinLeaderboard, type CoinRecord, upsertDiamondRecord, fetchDiamondLeaderboard, type DiamondRecord } from "./cloudRecords";
import { pingMember, setBanStatus } from "./members";
import { unlockCost, LEVEL_COUNT, type LevelTheme } from "./levelData";
import { IS_BEDROCK } from "../bedrock";
import { rollOhio, type OhioRoll } from "./ohio";
import {
  AP_SB, AP_H, AP_H_UPSERT, AP_H_QUIET, ALL_PLAYERS,
  titleDef, eventDef, isBirthdayToday,
  type PlayerCommand,
} from "./adminPlus";

export const MAX_COINS = Infinity;

export interface GameState {
  unlockedLocks: Set<number>;
  inventory: number[];
  username: string;
  difficulty: number; // target puzzles needed to win (4=easy, 8=normal, 12=hard)
  coins: number;
  currentLevel: number; // 1-28
  pets: string[]; // owned pet IDs
  autoClicker: boolean; // owned auto clicker
  wins: number;
  diamonds: number; // admin-gifted, earned in TrappedInWindows, spent in the Trading Plaza
  hasAdminLite: boolean; // bought in Shop with diamonds — grants a reduced admin panel
  items: string[]; // owned ItemDef ids — permanent upgrades
}

export interface PetDef {
  id:       string;
  emoji:    string;
  name:     string;
  cost:     number;  // coin price — 0 when the pet is diamond-only
  gemCost?: number;  // diamond price, for the shop's Diamond Aisle
  interval: number;  // ms between puzzle solves
  reward:   number;  // coins per solve
}

/** One-off purchases with a permanent effect. */
export interface ItemDef {
  id:       string;
  emoji:    string;
  name:     string;
  desc:     string;
  cost:     number;  // coin price — 0 when diamond-only
  gemCost?: number;
}

export const ITEMS: ItemDef[] = [
  { id: "coffee",      emoji: "☕", name: "Endless Coffee",
    desc: "Pets work 15% faster, forever",            cost: 250_000 },
  { id: "lucky_charm", emoji: "🍀", name: "Lucky Charm",
    desc: "Pets earn 25% more coins",                 cost: 0, gemCost:   120 },
  { id: "golden_gear", emoji: "⚙️", name: "Golden Gear",
    desc: "Pets work another 25% faster",             cost: 0, gemCost:   300 },
  { id: "scare_shield",emoji: "🛡️", name: "Scare Shield",
    desc: "Survive your first scream in the computer", cost: 0, gemCost:  500 },
  { id: "gem_magnet",  emoji: "🧲", name: "Gem Magnet",
    desc: "+50% diamonds from the computer",          cost: 0, gemCost:   800 },
  { id: "midas_touch", emoji: "✨", name: "Midas Touch",
    desc: "Pets earn double coins",                   cost: 0, gemCost: 1_500 },

  // ── Deep Diamond Aisle ───────────────────────────────────────────────────
  { id: "lucky_dice",  emoji: "🎲", name: "Lucky Dice",
    desc: "1 in 10 pet payouts pays 10×",             cost: 0, gemCost:  2_500 },
  { id: "diamond_crown", emoji: "💠", name: "Diamond Crown",
    desc: "Pets earn triple coins",                   cost: 0, gemCost:  4_000 },
  { id: "time_machine", emoji: "🕰️", name: "Time Machine",
    desc: "Pets work twice as fast",                  cost: 0, gemCost:  7_500 },
  { id: "gem_forge",   emoji: "🔮", name: "Gem Forge",
    desc: "Double diamonds from the computer",        cost: 0, gemCost: 15_000 },
  { id: "shield_plus", emoji: "🛡️", name: "Aegis",
    desc: "Survive 3 screams per run, not 1",         cost: 0, gemCost: 25_000 },
  { id: "vip_crown",   emoji: "👑", name: "Royal Crown",
    desc: "Wear a 👑 by your name everywhere",         cost: 0, gemCost: 50_000 },
];

/** Coin bundles you can buy with diamonds — the main gem sink for rich players. */
export interface GemExchangeDef { gems: number; coins: number; label: string; }
export const GEM_EXCHANGE: GemExchangeDef[] = [
  { gems:    50, coins:       1_000_000, label: "Pouch"  },
  { gems:   250, coins:       6_000_000, label: "Sack"   },
  { gems: 1_000, coins:      30_000_000, label: "Chest"  },
  { gems: 5_000, coins:     200_000_000, label: "Vault"  },
];

// Ids are permanent — they're what sits in every player's save. Never rename one.
export const PETS: PetDef[] = [
  // ── Coin pets, cheapest first ────────────────────────────────────────────
  { id: "hamster", emoji: "🐹", name: "Hamster", cost:        1_000, interval: 100_000, reward:      15 },
  { id: "duck",    emoji: "🦆", name: "Duck",    cost:        2_500, interval:  90_000, reward:      30 },
  { id: "cat",     emoji: "🐱", name: "Cat",     cost:        5_000, interval:  80_000, reward:      50 },
  { id: "rabbit",  emoji: "🐰", name: "Rabbit",  cost:       12_000, interval:  70_000, reward:      90 },
  { id: "dog",     emoji: "🐶", name: "Dog",     cost:       25_000, interval:  60_000, reward:     150 },
  { id: "owl",     emoji: "🦉", name: "Owl",     cost:       50_000, interval:  55_000, reward:     250 },
  { id: "fox",     emoji: "🦊", name: "Fox",     cost:      100_000, interval:  40_000, reward:     400 },
  { id: "wolf",    emoji: "🐺", name: "Wolf",    cost:      200_000, interval:  35_000, reward:     700 },
  { id: "dragon",  emoji: "🐉", name: "Dragon",  cost:      500_000, interval:  25_000, reward:   1_500 },
  { id: "tiger",   emoji: "🐯", name: "Tiger",   cost:      750_000, interval:  22_000, reward:   2_000 },
  { id: "bear",    emoji: "🐻", name: "Bear",    cost:    1_200_000, interval:  18_000, reward:   3_200 },
  { id: "unicorn", emoji: "🦄", name: "Unicorn", cost:    2_000_000, interval:  10_000, reward:   5_000 },
  { id: "panda",   emoji: "🐼", name: "Panda",   cost:    3_500_000, interval:   9_000, reward:   8_000 },
  { id: "octopus", emoji: "🐙", name: "Octopus", cost:    6_000_000, interval:   8_000, reward:  14_000 },
  { id: "robot",   emoji: "🤖", name: "Robot",   cost:   12_000_000, interval:   6_500, reward:  28_000 },

  // ── Diamond Aisle — bought with gems only ────────────────────────────────
  { id: "ghost",   emoji: "👻", name: "Ghost",         cost: 0, gemCost:   150, interval: 6_000, reward:    45_000 },
  { id: "phoenix", emoji: "🔥", name: "Phoenix",       cost: 0, gemCost:   400, interval: 5_000, reward:   110_000 },
  { id: "kraken",  emoji: "🦑", name: "Kraken",        cost: 0, gemCost:   900, interval: 4_000, reward:   260_000 },
  { id: "alien",   emoji: "👽", name: "Alien",         cost: 0, gemCost: 2_000, interval: 3_000, reward:   650_000 },
  { id: "cosmic",  emoji: "🌌", name: "Cosmic Dragon", cost: 0, gemCost: 5_000, interval: 2_500, reward: 1_800_000 },

  // ── Mythic tier — the deep end of the Diamond Aisle ──────────────────────
  { id: "wyrm",    emoji: "🐲", name: "Void Wyrm",    cost: 0, gemCost:  12_000, interval: 2_200, reward:      5_000_000 },
  { id: "thunder", emoji: "⚡", name: "Thunderbird",  cost: 0, gemCost:  25_000, interval: 2_000, reward:     15_000_000 },
  { id: "blackhole",emoji:"🕳️", name: "Black Hole",   cost: 0, gemCost:  60_000, interval: 1_800, reward:     50_000_000 },
  { id: "comet",   emoji: "☄️", name: "Comet",        cost: 0, gemCost: 120_000, interval: 1_600, reward:    180_000_000 },
  { id: "deity",   emoji: "🌠", name: "The Infinite", cost: 0, gemCost: 300_000, interval: 1_400, reward:    750_000_000 },
];

export interface StoredAccount {
  id: string;
  username: string;
  password: string;
  createdAt: number;
  isOwner?: boolean;
}

const _PFX         = IS_BEDROCK ? "12clocks_bedrock" : "12clocks";
const SAVE_KEY      = `${_PFX}_save`;
const ACCOUNTS_KEY  = `${_PFX}_accounts`;
const SESSION_KEY   = `${_PFX}_session`;
const BANS_KEY      = `${_PFX}_bans`;
const RECORDS_KEY   = `${_PFX}_records`;

export interface GameRecord {
  username:  string;
  accountId: string;
  timeMs:    number;
  date:      number;
}

// Shape stored in localStorage per account
interface SaveData {
  coins:          number;
  currentLevel:   number;
  difficulty:     number;
  unlockedLevels: number[];
  pets:           string[];
  autoClicker:    boolean;
  wins:           number;
  diamonds:       number;
  hasAdminLite:   boolean;
  items:          string[];
  levels: Record<string, { locks: number[]; inv: number[]; completed: boolean }>;
}

export class Game {
  readonly engine: Engine;
  readonly state: GameState = {
    unlockedLocks: new Set(), inventory: [], username: "",
    difficulty: 12, coins: 0, currentLevel: 1, pets: [], autoClicker: false, wins: 0, diamonds: 0,
    hasAdminLite: false, items: [],
  };
  modMode = false;
  private _modSnapshot: string | null = null;
  partyMode = false;
  private _partyOverlay: HTMLDivElement | null = null;
  private _partyAudioStop: (() => void) | null = null;
  private _petTimers = new Map<string, number>(); // petId → intervalId
  inMiniGame = false; // true while CoinJump or FruitSlice is active
  private _acActive   = false;
  private _acInterval = 0;
  private _acMouseX   = 0;
  private _acMouseY   = 0;
  private _acSetup    = false;
  private _acIndicator: HTMLDivElement | null = null;
  private _acHidden   = false;
  readonly ui: HTMLElement;
  /** Set while playing a community-built level; overrides the built-in LevelTheme. */
  customTheme: LevelTheme | null = null;
  customLevelName = "";
  /** 🌀 Ohio Mode — chaos modifiers, re-rolled every time you enter a room. */
  ohioMode = false;
  ohioRoll: OhioRoll | null = null;

  rollOhioIfOn(): void {
    this.ohioRoll = this.ohioMode ? rollOhio() : null;
  }
  _disposeScene: (() => void) | null = null;
  mp: MultiplayerManager | null = null;
  private _runStart = 0;

  // Unlocked level numbers (always includes 1)
  private _unlockedLevels = new Set<number>([1]);
  // Per-level saved progress
  private _levelSaves: Record<string, { locks: number[]; inv: number[]; completed: boolean }> = {};

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.ui = document.getElementById("ui")!;
    window.addEventListener("resize", () => this.engine.resize());
    this._initDevButton();
    this._startReportPoller();
    this._startChatPoller();
    this._startGiftPoller();
    this._startEmojiPoller();
    this._startUpdateAlertPoller();
    this._startIdleWatcher();
    this.fetchAdminUsers();
    setInterval(() => this.fetchAdminUsers(), 15000);
    this._startPresenceHeartbeat();
    this._startCommandPoller();
    this._startEventPoller();
    this._startTitlePoller();
    this._startFriendPoller();
  }

  // ── Friends: incoming invites and requests ───────────────────────────────

  private _seenInviteIds = new Set<number>();
  private _lastRequestCount = -1;

  private _startFriendPoller(): void {
    // Invites are time-sensitive — a challenge nobody sees for 12s feels broken,
    // and they expire after 90s. Friend requests can tick over far more slowly.
    const checkInvites = () => {
      const me = this.currentAccountId;
      if (!me) return;
      import("./friends").then(({ fetchInvites, respondToInvite }) => {
        fetchInvites(me).then(invites => {
          for (const inv of invites) {
            if (this._seenInviteIds.has(inv.id)) continue;
            this._seenInviteIds.add(inv.id);
            this._showInvite(inv.id, inv.from_name, inv.kind, respondToInvite);
          }
        }).catch(() => {});
      }).catch(() => {});
    };

    const checkRequests = () => {
      const me = this.currentAccountId;
      if (!me) return;
      import("./friends").then(({ fetchLinks }) => {
        fetchLinks(me).then(links => {
          const pending = links.filter(l => l.status === "pending" && l.to_id === me).length;
          if (this._lastRequestCount === -1) { this._lastRequestCount = pending; return; }
          if (pending > this._lastRequestCount) {
            this._showAdminNotice("👥 New friend request!",
              "Someone wants to be your friend — open Friends to accept.", "#7dc4ff");
          }
          this._lastRequestCount = pending;
        }).catch(() => {});
      }).catch(() => {});
    };

    checkInvites();
    setInterval(checkInvites, 4_000);
    setInterval(checkRequests, 20_000);
  }

  /** Accept/decline card for a "come play" or "I challenge you" invite. */
  private _showInvite(
    id: number, fromName: string, kind: "play" | "duel",
    respond: (id: number, accept: boolean) => Promise<void>,
  ): void {
    const isDuel = kind === "duel";
    const card = document.createElement("div");
    card.style.cssText =
      "position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:999999;" +
      `background:rgba(8,10,26,0.97);border:2px solid ${isDuel ? "#ffe066" : "#7dffc4"};` +
      "border-radius:16px;padding:14px 18px;max-width:320px;width:90%;" +
      "box-shadow:0 6px 28px rgba(0,0,0,0.7);font-family:Arial,sans-serif;text-align:center;";
    card.innerHTML =
      `<div style="font-size:30px;">${isDuel ? "⚔️" : "🎮"}</div>` +
      `<div style="color:${isDuel ? "#ffe066" : "#7dffc4"};font-size:15px;font-weight:bold;margin-top:3px;">` +
        `${fromName} ${isDuel ? "challenges you!" : "wants to play!"}</div>` +
      `<div style="color:rgba(255,255,255,0.55);font-size:12px;margin-top:3px;">` +
        `${isDuel ? "First to finish wins." : "Join their room and play together."}</div>` +
      `<div style="display:flex;gap:7px;margin-top:11px;">` +
        `<button id="__invYes" style="flex:1;background:${isDuel ? "rgba(255,224,102,0.25)" : "rgba(125,255,196,0.25)"};` +
          `color:${isDuel ? "#ffe066" : "#7dffc4"};font-size:13px;font-weight:bold;` +
          `border:1px solid ${isDuel ? "#ffe066" : "#7dffc4"};border-radius:9px;padding:9px;cursor:pointer;">` +
          `✓ ${isDuel ? "Accept" : "Join"}</button>` +
        `<button id="__invNo" style="flex:1;background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);` +
          `font-size:13px;border:1px solid rgba(255,255,255,0.2);border-radius:9px;padding:9px;cursor:pointer;">` +
          `✕ No thanks</button>` +
      `</div>`;
    document.body.appendChild(card);

    const close = () => card.remove();
    card.querySelector<HTMLElement>("#__invNo")!.onclick = () => { respond(id, false).catch(() => {}); close(); };
    card.querySelector<HTMLElement>("#__invYes")!.onclick = () => {
      respond(id, true).catch(() => {});
      close();
      if (isDuel) {
        this.goFriendDuel(fromName, false);
      } else {
        this._joinFriendGame(fromName);
      }
    };
    // Invites go stale; don't leave a dead card on screen.
    setTimeout(close, 60_000);
  }

  /** Connect to a friend's hosted room and drop straight in. */
  private _joinFriendGame(username: string): void {
    import("../multiplayer/MultiplayerManager").then(async ({ MultiplayerManager }) => {
      if (this.mp) {
        this.mp.dispose();
        this.mp = null;
        await new Promise(r => setTimeout(r, 400));
      }
      const mp = new MultiplayerManager(this.state.username || "Player");
      try {
        await mp.goOnline().catch(() => {});
        await mp.joinPlayer(username);
        this.mp = mp;
        this.goExplore();
      } catch {
        mp.dispose();
        this._showAdminNotice("❌ Couldn't connect", `${username} isn't reachable right now.`, "#ff6666");
      }
    });
  }

  // ── Admin Panel+ : presence, remote commands, events, titles ─────────────

  /** Epoch ms this browser session started — shown in the Live Player Spy. */
  private _sessionStarted = Date.now();

  /** id of the event the owner has switched on, or null. */
  activeEventId: string | null = null;
  /** id of this player's title, or null. */
  myTitleId: string | null = null;

  /** True while an admin has this player frozen. */
  frozen = false;

  /**
   * Birthday Boy runs itself on the game's birthday, so it wins over whatever
   * the owner has toggled. Otherwise the manually chosen event applies.
   */
  get liveEventId(): string | null {
    return isBirthdayToday() ? "birthday_boy" : this.activeEventId;
  }

  /** Stat multiplier from this player's title — 1 when untitled. */
  get titleMultiplier(): number {
    return titleDef(this.myTitleId)?.mult ?? 1;
  }

  /** Coin multiplier from the live event × this player's title. */
  get eventCoinMultiplier(): number {
    return (eventDef(this.liveEventId)?.coins ?? 1) * this.titleMultiplier;
  }
  /** Win multiplier from the live event × this player's title. */
  get eventWinMultiplier(): number {
    return (eventDef(this.liveEventId)?.wins ?? 1) * this.titleMultiplier;
  }
  /** Diamond multiplier from the live event × this player's title. */
  get eventGemMultiplier(): number {
    return (eventDef(this.liveEventId)?.diamonds ?? 1) * this.titleMultiplier;
  }

  /** Tell the server where we are and what we're worth, every 8s. */
  private _startPresenceHeartbeat(): void {
    const beat = () => {
      const accountId = this.currentAccountId;
      if (!accountId) return;
      fetch(`${AP_SB}/player_presence`, {
        method: "POST",
        headers: AP_H_UPSERT,
        body: JSON.stringify({
          account_id:      accountId,
          username:        this.state.username || "Player",
          scene:           this.currentScene,
          coins:           Math.round(this.state.coins),
          wins:            this.state.wins,
          diamonds:        this.state.diamonds,
          title:           this.myTitleId,
          session_started: this._sessionStarted,
          last_seen:       Date.now(),
          mp_state:        this.mp ? (this.mp.isHost ? "hosting" : "joined") : "solo",
          mp_peers:        this.mp ? Math.max(0, this.mp.playerCount - 1) : 0,
        }),
      }).catch(() => {});
    };
    beat();
    setInterval(beat, 8_000);
  }

  /** Watch for kick / freeze / goto commands aimed at us (or at everyone). */
  private _startCommandPoller(): void {
    const check = () => {
      const accountId = this.currentAccountId;
      if (!accountId) return;
      const target = `account_id=in.("${accountId}","${ALL_PLAYERS}")`;
      fetch(`${AP_SB}/player_commands?${target}&consumed=eq.false&order=created_at.asc`, {
        headers: AP_H,
      }).then(r => r.json()).then((rows: PlayerCommand[]) => {
        if (!Array.isArray(rows) || !rows.length) return;
        for (const row of rows) this._runCommand(row);
        // Broadcast commands stay for other players, so only tick off our own.
        const mine = rows.filter(r => r.account_id === accountId).map(r => r.id);
        if (mine.length) {
          fetch(`${AP_SB}/player_commands?id=in.(${mine.join(",")})`, {
            method: "PATCH", headers: AP_H_QUIET, body: JSON.stringify({ consumed: true }),
          }).catch(() => {});
        }
      }).catch(() => {});
    };
    setInterval(check, 3_000);
  }

  private _seenCommandIds = new Set<number>();

  private _runCommand(cmd: PlayerCommand): void {
    // A broadcast row is never marked consumed, so guard against replaying it.
    if (this._seenCommandIds.has(cmd.id)) return;
    this._seenCommandIds.add(cmd.id);

    // Commands are live orders, not a queue. Anything issued before this
    // session began is history — otherwise a week-old "freeze all" would
    // land on every player who opens the game.
    if (cmd.created_at < this._sessionStarted) return;

    switch (cmd.command) {
      case "kick":
        this._showAdminNotice("👢 Kicked", cmd.payload || "An admin sent you back to the title screen.", "#ff6666");
        this.unfreeze();
        this.goTitle();
        break;
      case "freeze":
        this.freeze(cmd.payload || "An admin has frozen your screen.");
        break;
      case "unfreeze":
        this.unfreeze();
        break;
      case "goto":
        this.unfreeze();
        this._gotoDestination(cmd.payload || "title");
        break;
    }
  }

  /** Send a player wherever the admin picked. Ids come from PUPPET_DESTINATIONS. */
  private _gotoDestination(id: string): void {
    const routes: Record<string, () => void> = {
      title:        () => this.goTitle(),
      arcade:       () => this.goArcade(),
      shop:         () => this.goShop(),
      levelSelect:  () => this.goLevelSelect(),
      lobby:        () => this.goLobby(),
      tradingPlaza: () => this.goTradingPlaza(),
      badges:       () => this.goBadges(),
      ohio:         () => this.goOhio(),
      clan:         () => this.goClan(),
      ending:       () => this.goEnding(),
      banned:       () => this.goBanned(),
    };
    (routes[id] ?? routes.title)();
  }

  /** Lock the screen behind an unskippable overlay until an admin lifts it. */
  freeze(message: string): void {
    if (this.frozen) {
      const msgEl = document.getElementById("__freezeMsg");
      if (msgEl) msgEl.textContent = message;
      return;
    }
    this.frozen = true;
    const ov = document.createElement("div");
    ov.id = "__freezeOverlay";
    ov.style.cssText =
      "position:fixed;inset:0;z-index:2000000;background:rgba(0,0,20,0.94);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;" +
      "font-family:Arial,sans-serif;text-align:center;padding:24px;backdrop-filter:blur(3px);";
    ov.innerHTML =
      `<div style="font-size:56px;">🧊</div>` +
      `<div style="color:#88ddff;font-size:24px;font-weight:900;">FROZEN BY AN ADMIN</div>` +
      `<div id="__freezeMsg" style="color:rgba(255,255,255,0.8);font-size:15px;max-width:320px;">${message}</div>` +
      `<div style="color:rgba(255,255,255,0.35);font-size:12px;">You'll be released when the admin says so.</div>`;
    document.body.appendChild(ov);
  }

  unfreeze(): void {
    if (!this.frozen) return;
    this.frozen = false;
    document.getElementById("__freezeOverlay")?.remove();
  }

  /** Small toast used by kick and by title/event announcements. */
  private _showAdminNotice(heading: string, body: string, color: string): void {
    const toast = document.createElement("div");
    toast.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
      `background:rgba(10,10,20,0.96);border:2px solid ${color};border-radius:14px;` +
      "padding:12px 20px;z-index:999999;cursor:pointer;max-width:320px;width:90%;" +
      "box-shadow:0 4px 24px rgba(0,0,0,0.6);font-family:Arial,sans-serif;text-align:center;";
    toast.innerHTML =
      `<div style="color:${color};font-size:15px;font-weight:bold;">${heading}</div>` +
      `<div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">${body}</div>`;
    toast.onclick = () => toast.remove();
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 10_000);
  }

  /** Poll which server-wide event is live. */
  private _startEventPoller(): void {
    const check = () => {
      fetch(`${AP_SB}/global_settings?key=eq.active_event&select=value`, { headers: AP_H })
        .then(r => r.json()).then((rows: { value: string }[]) => {
          const next = rows[0]?.value || null;
          const normalised = next && next !== "none" ? next : null;
          if (normalised === this.activeEventId) return;
          const before = this.liveEventId;
          this.activeEventId = normalised;
          const now = this.liveEventId;
          if (now && now !== before) {
            const def = eventDef(now);
            if (def) this._showAdminNotice(`${def.emoji} ${def.name} is LIVE!`, def.desc, def.color);
          }
        }).catch(() => {});
    };
    check();
    setInterval(check, 15_000);
  }

  /** Poll our own title so a grant takes effect without a reload. */
  private _startTitlePoller(): void {
    const check = () => {
      const accountId = this.currentAccountId;
      if (!accountId) return;
      fetch(`${AP_SB}/player_titles?account_id=eq.${accountId}&select=title`, { headers: AP_H })
        .then(r => r.json()).then((rows: { title: string }[]) => {
          const next = rows[0]?.title ?? null;
          if (next === this.myTitleId) return;
          this.myTitleId = next;
          const def = titleDef(next);
          if (def) {
            this._showAdminNotice(
              `${def.emoji} You are now ${def.name}!`,
              `${def.mult.toLocaleString()}× coins, wins and diamonds.`,
              def.color,
            );
          }
        }).catch(() => {});
    };
    check();
    setInterval(check, 15_000);
  }

  private _lastReportId = 0;
  private _startReportPoller(): void {
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    const check = () => {
      if (!this.currentAccount?.isOwner) return;
      fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/rule_reports?seen=eq.false&order=id.desc&limit=5`, {
        headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
      }).then(r => r.json()).then((rows: { id: number; reporter: string; rule_text: string }[]) => {
        if (!rows.length) return;
        const newest = rows[0];
        if (newest.id <= this._lastReportId) return;
        this._lastReportId = newest.id;
        this._showReportToast(newest.reporter, newest.rule_text);
      }).catch(() => {});
    };
    // seed the last seen ID on first load so old reports don't pop up
    fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/rule_reports?order=id.desc&limit=1`, {
      headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
    }).then(r => r.json()).then((rows: { id: number }[]) => {
      this._lastReportId = rows[0]?.id ?? 0;
    }).catch(() => {});
    setInterval(check, 15_000);
  }

  private _showReportToast(reporter: string, ruleText: string): void {
    const toast = document.createElement("div");
    toast.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
      "background:rgba(180,0,0,0.95);border:2px solid #ff4444;border-radius:14px;" +
      "padding:12px 20px;z-index:999999;cursor:pointer;max-width:300px;width:90%;" +
      "box-shadow:0 4px 24px rgba(0,0,0,0.6);font-family:Arial,sans-serif;text-align:center;";
    toast.innerHTML =
      `<div style="color:white;font-size:15px;font-weight:bold;">🚩 Rule Report!</div>` +
      `<div style="color:#ffaaaa;font-size:13px;margin-top:4px;"><b>${reporter}</b> was reported</div>` +
      `<div style="color:rgba(255,255,255,0.6);font-size:11px;margin-top:2px;">${ruleText}</div>` +
      `<div style="color:rgba(255,255,255,0.45);font-size:11px;margin-top:6px;">Tap to open Admin Panel →</div>`;
    toast.onclick = () => { document.body.removeChild(toast); this.goAdmin(); };
    document.body.appendChild(toast);
    setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 10_000);
  }

  private _lastChatSentAt = 0;
  private _startChatPoller(): void {
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    // Seed last-seen timestamp so old messages don't pop up on first load
    fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/admin_chat?order=sent_at.desc&limit=1`, {
      headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
    }).then(r => r.json()).then((rows: { sent_at: number }[]) => {
      this._lastChatSentAt = rows[0]?.sent_at ?? Date.now();
    }).catch(() => { this._lastChatSentAt = Date.now(); });

    const check = () => {
      const after = this._lastChatSentAt;
      fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/admin_chat?sent_at=gt.${after}&order=sent_at.asc`, {
        headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
      }).then(r => r.json()).then((rows: { sent_at: number; message: string; sender: string }[]) => {
        if (!rows.length) return;
        for (const row of rows) {
          if (row.message.startsWith("GLOBAL")) {
            this._showGlobalBanner(row.sender, row.message.slice("GLOBAL".length));
          } else {
            this._showChatToast(row.sender, row.message);
          }
        }
        this._lastChatSentAt = rows[rows.length - 1].sent_at;
      }).catch(() => {});
    };
    setInterval(check, 10_000);
  }

  private _showChatToast(sender: string, message: string): void {
    const toast = document.createElement("div");
    toast.style.cssText =
      "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);" +
      "background:rgba(0,60,180,0.95);border:2px solid #4488ff;border-radius:14px;" +
      "padding:12px 20px;z-index:999999;cursor:pointer;max-width:320px;width:90%;" +
      "box-shadow:0 4px 24px rgba(0,0,0,0.6);font-family:Arial,sans-serif;text-align:center;";
    toast.innerHTML =
      `<div style="display:flex;align-items:center;justify-content:center;gap:6px;">` +
        `<span style="color:white;font-size:15px;font-weight:bold;">📢 ${sender}</span>` +
        `<span style="display:inline-flex;align-items:center;justify-content:center;` +
          `width:18px;height:18px;border-radius:4px;background:#1a6fff;flex-shrink:0;">` +
          `<svg width="11" height="11" viewBox="0 0 11 11" fill="none"><polyline points="1.5,6 4,8.5 9.5,2" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
        `</span>` +
      `</div>` +
      `<div style="color:#aaddff;font-size:14px;margin-top:6px;">${message}</div>`;
    toast.onclick = () => document.body.removeChild(toast);
    document.body.appendChild(toast);
    setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 12_000);
  }

  private _showGlobalBanner(sender: string, message: string): void {
    const banner = document.createElement("div");
    banner.style.cssText =
      "position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999999;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "background:rgba(0,0,0,0.7);cursor:pointer;";
    banner.innerHTML =
      `<div style="` +
        `background:linear-gradient(135deg,rgba(30,0,80,0.98),rgba(0,40,160,0.98));` +
        `border:3px solid #FFD700;border-radius:22px;padding:32px 40px;text-align:center;` +
        `max-width:440px;width:88%;box-shadow:0 0 60px rgba(255,215,0,0.4),0 8px 40px rgba(0,0,0,0.8);` +
        `font-family:Arial,sans-serif;` +
      `">` +
        `<div style="font-size:36px;margin-bottom:10px;">📣</div>` +
        `<div style="color:#FFD700;font-size:13px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">Global Message from ${sender}</div>` +
        `<div style="color:white;font-size:22px;font-weight:bold;line-height:1.3;">${message}</div>` +
        `<div style="color:rgba(255,255,255,0.35);font-size:11px;margin-top:18px;">Tap anywhere to dismiss</div>` +
      `</div>`;
    banner.onclick = () => { if (document.body.contains(banner)) document.body.removeChild(banner); };
    document.body.appendChild(banner);
    setTimeout(() => { if (document.body.contains(banner)) document.body.removeChild(banner); }, 20_000);
  }

  private _updateAlertPill: HTMLDivElement | null = null;
  private _updateAlertTargetAt = 0;
  private _updateAlertLabel = "";
  private _updateAlertLastUpdatedAt = 0;
  private _updateAlertTickTimer = 0;

  private _startUpdateAlertPoller(): void {
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    const H = { "apikey": KEY, "Authorization": `Bearer ${KEY}` };
    const check = () => {
      fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/global_settings?key=eq.update_alert&select=value,updated_at`, { headers: H })
        .then(r => r.json())
        .then((rows: { value: string; updated_at: number }[]) => {
          if (!rows.length) return;
          const { value, updated_at } = rows[0];
          if (updated_at <= this._updateAlertLastUpdatedAt) return;
          this._updateAlertLastUpdatedAt = updated_at;
          const cfg = JSON.parse(value) as { targetAt?: number; label?: string };
          this._updateAlertTargetAt = cfg.targetAt ?? 0;
          this._updateAlertLabel = cfg.label ?? "";
          if (this._updateAlertTargetAt > 0) this._showUpdateAlertPill();
          else this._hideUpdateAlertPill();
        }).catch(() => {});
    };
    check();
    setInterval(check, 15_000);
  }

  private _showUpdateAlertPill(): void {
    if (!this._updateAlertPill) {
      this._updateAlertPill = document.createElement("div");
      this._updateAlertPill.style.cssText =
        // centred at the top so players actually notice it; the auto-clicker
        // indicator sits below it (see _updateACIndicator) so they never collide
        "position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:99992;" +
        "background:rgba(0,0,0,0.82);border:1px solid rgba(255,215,0,0.4);" +
        "border-radius:22px;padding:8px 18px;display:flex;align-items:center;gap:7px;" +
        "color:#FFD700;font-size:14px;font-weight:bold;font-family:Arial,sans-serif;" +
        "backdrop-filter:blur(6px);user-select:none;pointer-events:none;white-space:nowrap;" +
        "box-shadow:0 2px 14px rgba(255,215,0,0.25);";
      document.body.appendChild(this._updateAlertPill);
    }
    this._updateAlertPill.style.display = "flex";
    clearInterval(this._updateAlertTickTimer);
    const tick = () => {
      if (!this._updateAlertPill) return;
      const remaining = this._updateAlertTargetAt - Date.now();
      const label = this._updateAlertLabel || "Update";
      if (remaining <= 0) {
        this._updateAlertPill.textContent = `🎉 ${label} is live!`;
        return;
      }
      const s = Math.floor(remaining / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      const parts = [];
      if (d) parts.push(`${d}d`);
      if (d || h) parts.push(`${h}h`);
      if (d || h || m) parts.push(`${m}m`);
      parts.push(`${sec}s`);
      this._updateAlertPill.textContent = `🚀 ${label} in ${parts.join(" ")}`;
    };
    tick();
    this._updateAlertTickTimer = window.setInterval(tick, 1000);
  }

  private _hideUpdateAlertPill(): void {
    clearInterval(this._updateAlertTickTimer);
    if (this._updateAlertPill) this._updateAlertPill.style.display = "none";
  }

  private _startGiftPoller(): void {
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    const check = () => {
      const accountId = this.currentAccountId;
      if (!accountId) return;
      fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/player_gifts?account_id=eq.${accountId}&claimed=eq.false&order=sent_at.asc`, {
        headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
      }).then(r => r.json()).then((rows: { id: number; coins: number; wins: number; diamonds?: number }[]) => {
        if (!rows.length) return;
        let totalCoins = 0;
        let totalWins  = 0;
        let totalDiamonds = 0;
        const ids: number[] = [];
        for (const row of rows) {
          totalCoins += row.coins;
          totalWins  += row.wins;
          totalDiamonds += row.diamonds ?? 0;
          ids.push(row.id);
        }
        this.state.coins    = Math.max(0, this.state.coins    + totalCoins);
        this.state.wins     = Math.max(0, this.state.wins     + totalWins);
        this.state.diamonds = Math.max(0, this.state.diamonds + totalDiamonds);
        this.save();
        this._showGiftToast(totalCoins, totalWins, totalDiamonds);
        // Mark all as claimed
        for (const id of ids) {
          fetch(`https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/player_gifts?id=eq.${id}`, {
            method: "PATCH",
            headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
            body: JSON.stringify({ claimed: true }),
          }).catch(() => {});
        }
      }).catch(() => {});
    };
    setInterval(check, 15_000);
  }

  private _showGiftToast(coins: number, wins: number, diamonds = 0): void {
    const fmt = (n: number, label: string) => `${n > 0 ? "+" : "-"}${Math.abs(n).toLocaleString()} ${label}`;
    const parts: string[] = [];
    if (coins    !== 0) parts.push(`🪙 ${fmt(coins, "coins")}`);
    if (wins     !== 0) parts.push(`🏆 ${fmt(wins, wins !== 1 ? "wins" : "win")}`);
    if (diamonds !== 0) parts.push(`💎 ${fmt(diamonds, diamonds !== 1 ? "diamonds" : "diamond")}`);
    if (!parts.length) return;
    const isTake = coins < 0 || wins < 0 || diamonds < 0;
    const toast = document.createElement("div");
    toast.style.cssText =
      `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);` +
      `background:${isTake ? "rgba(160,0,0,0.95)" : "rgba(160,100,0,0.95)"};` +
      `border:2px solid ${isTake ? "#ff4444" : "#FFD700"};border-radius:14px;` +
      "padding:12px 20px;z-index:999999;cursor:pointer;max-width:320px;width:90%;" +
      "box-shadow:0 4px 24px rgba(0,0,0,0.6);font-family:Arial,sans-serif;text-align:center;";
    toast.innerHTML =
      `<div style="color:${isTake ? "#ff8888" : "#FFD700"};font-size:16px;font-weight:bold;">` +
        `${isTake ? "⚠️ Admin took stats away" : "🎁 Admin gave you a gift!"}</div>` +
      `<div style="color:white;font-size:14px;margin-top:6px;">${parts.join(" and ")}</div>`;
    toast.onclick = () => document.body.removeChild(toast);
    document.body.appendChild(toast);
    setTimeout(() => { if (document.body.contains(toast)) document.body.removeChild(toast); }, 10_000);
  }

  // ── Global emoji reactions ────────────────────────────────────────────────
  private _lastEmojiId = 0;
  private _startEmojiPoller(): void {
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    const H = { "apikey": KEY, "Authorization": `Bearer ${KEY}` };
    const SB = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
    // Seed so old reactions don't fire on join
    fetch(`${SB}/global_emoji?order=id.desc&limit=1`, { headers: H })
      .then(r => r.json()).then((rows: { id: number }[]) => {
        if (rows[0]) this._lastEmojiId = rows[0].id;
      }).catch(() => {});
    const check = () => {
      fetch(`${SB}/global_emoji?id=gt.${this._lastEmojiId}&order=id.asc`, { headers: H })
        .then(r => r.json())
        .then((rows: { id: number; emoji: string }[]) => {
          for (const row of rows) {
            this._lastEmojiId = row.id;
            this._showFloatingEmoji(row.emoji);
          }
        }).catch(() => {});
    };
    setInterval(check, 3000);
  }

  private _showFloatingEmoji(emoji: string): void {
    if (!document.getElementById("__emojiStyle")) {
      const s = document.createElement("style");
      s.id = "__emojiStyle";
      s.textContent = `
        @keyframes emojiFloat {
          0%   { opacity:0; transform:translateY(0) scale(0.5); }
          15%  { opacity:1; transform:translateY(-30px) scale(1.2); }
          80%  { opacity:1; }
          100% { opacity:0; transform:translateY(-120px) scale(1); }
        }
        @keyframes emojiDrift {
          0%   { left: var(--ex); }
          100% { left: calc(var(--ex) + var(--drift)); }
        }
      `;
      document.head.appendChild(s);
    }
    // Spawn a burst of 6 emojis scattered across the screen
    for (let i = 0; i < 6; i++) {
      const el = document.createElement("div");
      const startX = 5 + Math.floor(Math.random() * 88);
      const drift  = (Math.random() - 0.5) * 120;
      const delay  = i * 120;
      const size   = 36 + Math.floor(Math.random() * 28);
      el.textContent = emoji;
      el.style.cssText = `
        position:fixed;
        --ex:${startX}vw;
        --drift:${drift}px;
        left:${startX}vw;
        bottom:${10 + Math.floor(Math.random() * 30)}vh;
        font-size:${size}px;
        pointer-events:none;
        z-index:999998;
        animation: emojiFloat 2.2s ease-out ${delay}ms forwards,
                   emojiDrift 2.2s ease-out ${delay}ms forwards;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2500 + delay);
    }
  }

  // ── Idle disconnect ────────────────────────────────────────────────────────
  private static readonly IDLE_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
  private _idleTimer = 0;

  private _startIdleWatcher(): void {
    const reset = () => {
      clearTimeout(this._idleTimer);
      this._idleTimer = window.setTimeout(() => this._showIdleDisconnect(), Game.IDLE_MS);
    };
    ["mousemove","mousedown","keydown","touchstart","touchmove","scroll","click"].forEach(e => {
      window.addEventListener(e, reset, { passive: true });
    });
    reset();
  }

  private _showIdleDisconnect(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:999998;background:rgba(0,0,0,0.92);" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:16px;font-family:Arial,sans-serif;text-align:center;padding:24px;";
    ov.innerHTML =
      `<div style="font-size:56px;">💤</div>` +
      `<div style="color:white;font-size:22px;font-weight:bold;">You have been disconnected</div>` +
      `<div style="color:rgba(255,255,255,0.6);font-size:15px;">for being idle for 2 days</div>` +
      `<button id="idleReconnect" style="margin-top:8px;background:#FFD700;color:#1a0060;` +
      `font-size:16px;font-weight:bold;padding:12px 32px;border-radius:30px;` +
      `border:none;cursor:pointer;">▶ Reconnect</button>`;
    document.body.appendChild(ov);
    document.getElementById("idleReconnect")!.onclick = () => location.reload();
  }

  private _initDevButton(): void {
    const btn = document.createElement("button");
    btn.textContent = "⚙️";
    btn.style.cssText =
      "position:fixed;bottom:60px;right:14px;z-index:99999;" +
      "width:38px;height:38px;border-radius:50%;border:none;background:rgba(0,0,0,0.35);" +
      "font-size:18px;cursor:pointer;opacity:0.35;transition:opacity 0.2s;pointer-events:all;";
    btn.onmouseenter = () => { btn.style.opacity = "0.8"; };
    btn.onmouseleave = () => { btn.style.opacity = "0.35"; };
    btn.onclick = () => this._devPanelLogin();
    document.body.appendChild(btn);
  }

  private _devPanelLogin(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.75);" +
      "display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;";

    const box = document.createElement("div");
    box.style.cssText =
      "background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:12px;" +
      "padding:26px 28px;width:min(320px,88vw);display:flex;flex-direction:column;gap:12px;";

    const inp = document.createElement("input");
    inp.type = "password";
    inp.placeholder = "••••••";
    inp.autocomplete = "off";
    inp.style.cssText =
      "background:#1e1e1e;border:1px solid rgba(255,255,255,0.15);border-radius:8px;" +
      "color:white;font-size:16px;padding:10px 14px;outline:none;letter-spacing:4px;";

    const err = document.createElement("div");
    err.style.cssText = "color:#ff4040;font-size:12px;min-height:14px;";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:8px;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "flex:1;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);font-size:13px;" +
      "padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;";
    cancelBtn.onclick = () => ov.remove();

    const enterBtn = document.createElement("button");
    enterBtn.textContent = "Enter";
    enterBtn.style.cssText =
      "flex:1;background:rgba(255,255,255,0.1);color:white;font-size:13px;font-weight:bold;" +
      "padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;";

    const tryLogin = () => {
      if (inp.value === "gavin") {
        ov.remove();
        this._devDashboard();
      } else {
        err.textContent = "Incorrect.";
        inp.value = "";
        inp.focus();
        setTimeout(() => { err.textContent = ""; }, 1600);
      }
    };

    enterBtn.onclick = tryLogin;
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") tryLogin(); });

    row.appendChild(cancelBtn);
    row.appendChild(enterBtn);
    box.appendChild(inp);
    box.appendChild(err);
    box.appendChild(row);
    ov.appendChild(box);
    document.body.appendChild(ov);
    setTimeout(() => inp.focus(), 50);
  }

  private _devDashboard(): void {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:100000;background:#080808;overflow-y:auto;" +
      "font-family:'Courier New',monospace;display:flex;flex-direction:column;" +
      "align-items:center;padding:28px 16px 60px;";

    const header = document.createElement("div");
    header.style.cssText =
      "width:100%;max-width:500px;display:flex;justify-content:space-between;" +
      "align-items:center;margin-bottom:20px;";
    header.innerHTML =
      `<div style="color:white;font-size:18px;font-weight:900;letter-spacing:2px;">⚙️ DEV PANEL</div>` +
      `<div style="color:rgba(255,255,255,0.25);font-size:11px;">12 Clocks</div>`;
    ov.appendChild(header);

    const section = (label: string) => {
      const s = document.createElement("div");
      s.style.cssText =
        "width:100%;max-width:500px;background:#111;border:1px solid rgba(255,255,255,0.1);" +
        "border-radius:10px;padding:18px 20px;margin-bottom:12px;";
      s.innerHTML =
        `<div style="color:rgba(255,255,255,0.35);font-size:11px;letter-spacing:2px;` +
        `text-transform:uppercase;margin-bottom:12px;">${label}</div>`;
      return s;
    };

    // ── Stats ────────────────────────────────────────────────────────────────
    const stats = section("Stats");
    const addStat = (label: string, val: string | number) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;justify-content:space-between;padding:5px 0;" +
        "border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.6);font-size:13px;";
      row.innerHTML =
        `<span>${label}</span><span style="color:white;font-weight:bold;">${val}</span>`;
      stats.appendChild(row);
    };
    addStat("Coins", this.state.coins.toLocaleString());
    addStat("Level", this.state.currentLevel);
    addStat("Username", this.state.username || "—");
    ov.appendChild(stats);

    // ── Coins editor ─────────────────────────────────────────────────────────
    const coinSec = section("Set Coins");
    const coinInp = document.createElement("input");
    coinInp.type = "number";
    coinInp.value = String(this.state.coins);
    coinInp.style.cssText =
      "background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:6px;" +
      "color:white;font-size:14px;padding:8px 12px;width:140px;margin-right:10px;";
    const setCoinBtn = document.createElement("button");
    setCoinBtn.textContent = "Set";
    setCoinBtn.style.cssText =
      "background:rgba(255,255,255,0.1);color:white;font-size:13px;" +
      "padding:8px 18px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);cursor:pointer;";
    const coinFb = document.createElement("span");
    coinFb.style.cssText = "color:#80ff80;font-size:12px;margin-left:8px;";
    setCoinBtn.onclick = () => {
      const v = parseInt(coinInp.value, 10);
      if (!isNaN(v) && v >= 0) {
        this.state.coins = v;
        this.save();
        coinFb.textContent = "✓ saved";
        setTimeout(() => { coinFb.textContent = ""; }, 1500);
      }
    };
    coinSec.appendChild(coinInp);
    coinSec.appendChild(setCoinBtn);
    coinSec.appendChild(coinFb);
    ov.appendChild(coinSec);

    // ── Create Minigame ───────────────────────────────────────────────────────
    const mgSec = section("Create Minigame");
    const mgBtn = document.createElement("button");
    mgBtn.textContent = "➕ Create Minigame";
    mgBtn.style.cssText =
      "background:rgba(255,255,255,0.08);color:white;font-size:14px;font-weight:bold;" +
      "padding:11px 22px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);cursor:pointer;font-family:Arial;";
    mgBtn.onclick = () => {
      ov.remove();
      import("../scenes/games/Studio").then(m => {
        this.ui.innerHTML = "";
        new m.Studio(this);
      });
    };
    mgSec.appendChild(mgBtn);
    ov.appendChild(mgSec);

    // ── Close ─────────────────────────────────────────────────────────────────
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close";
    closeBtn.style.cssText =
      "width:100%;max-width:500px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);" +
      "font-size:14px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);" +
      "cursor:pointer;margin-top:6px;font-family:Arial;";
    closeBtn.onclick = () => ov.remove();
    ov.appendChild(closeBtn);

    document.body.appendChild(ov);
  }

  private _minigameWizard(): void {
    let gameName = "";
    let is3D = false;

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:100000;background:#080808;overflow-y:auto;" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;" +
      "align-items:center;padding:40px 16px 60px;";

    const title = document.createElement("div");
    title.style.cssText =
      "color:white;font-size:22px;font-weight:900;margin-bottom:8px;letter-spacing:1px;";
    title.textContent = "🎮 Create Minigame";
    ov.appendChild(title);

    const sub = document.createElement("div");
    sub.style.cssText = "color:rgba(255,255,255,0.35);font-size:13px;margin-bottom:32px;";
    sub.textContent = "Answer a couple questions and get your starter code.";
    ov.appendChild(sub);

    const card = (content: HTMLElement) => {
      const c = document.createElement("div");
      c.style.cssText =
        "width:100%;max-width:500px;background:#111;border:1px solid rgba(255,255,255,0.1);" +
        "border-radius:12px;padding:22px 24px;margin-bottom:16px;";
      c.appendChild(content);
      return c;
    };

    // ── Step 1: Name ──────────────────────────────────────────────────────────
    const step1 = document.createElement("div");
    const q1 = document.createElement("div");
    q1.style.cssText = "color:white;font-size:16px;font-weight:bold;margin-bottom:12px;";
    q1.textContent = "1. What is your minigame named?";
    const nameInp = document.createElement("input");
    nameInp.type = "text";
    nameInp.placeholder = "e.g. Speed Clicker";
    nameInp.style.cssText =
      "background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:8px;" +
      "color:white;font-size:15px;padding:10px 14px;width:100%;box-sizing:border-box;outline:none;";
    step1.appendChild(q1);
    step1.appendChild(nameInp);
    ov.appendChild(card(step1));

    // ── Step 2: 2D or 3D ─────────────────────────────────────────────────────
    const step2 = document.createElement("div");
    const q2 = document.createElement("div");
    q2.style.cssText = "color:white;font-size:16px;font-weight:bold;margin-bottom:12px;";
    q2.textContent = "2. Is it 2D or 3D?";
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:12px;";
    let selected = "";
    const makeChoice = (label: string, val: string, desc: string) => {
      const b = document.createElement("button");
      b.style.cssText =
        "flex:1;padding:14px;border-radius:10px;border:2px solid rgba(255,255,255,0.15);" +
        "background:rgba(255,255,255,0.05);color:white;cursor:pointer;font-size:15px;" +
        "font-weight:bold;font-family:Arial;transition:all 0.15s;text-align:center;";
      b.innerHTML = `<div style="font-size:22px;margin-bottom:6px;">${label}</div><div style="font-size:12px;color:rgba(255,255,255,0.45);font-weight:normal;">${desc}</div>`;
      b.onclick = () => {
        selected = val;
        is3D = val === "3d";
        btnRow.querySelectorAll("button").forEach(x => {
          (x as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          (x as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
        });
        b.style.background = "rgba(100,100,255,0.2)";
        b.style.borderColor = "rgba(120,120,255,0.6)";
      };
      return b;
    };
    btnRow.appendChild(makeChoice("🖼️ 2D", "2d", "Canvas drawing, sprites"));
    btnRow.appendChild(makeChoice("🧊 3D", "3d", "BabylonJS, depth, cameras"));
    step2.appendChild(q2);
    step2.appendChild(btnRow);
    ov.appendChild(card(step2));

    // ── Generate button ───────────────────────────────────────────────────────
    const err = document.createElement("div");
    err.style.cssText = "color:#ff4040;font-size:13px;margin-bottom:10px;min-height:16px;";
    ov.appendChild(err);

    const genBtn = document.createElement("button");
    genBtn.textContent = "✨ Generate Template";
    genBtn.style.cssText =
      "width:100%;max-width:500px;background:rgba(100,100,255,0.25);color:white;" +
      "font-size:16px;font-weight:bold;padding:14px;border-radius:12px;" +
      "border:2px solid rgba(120,120,255,0.4);cursor:pointer;margin-bottom:16px;";
    genBtn.onclick = () => {
      gameName = nameInp.value.trim();
      if (!gameName) { err.textContent = "Give your game a name first!"; return; }
      if (!selected)  { err.textContent = "Pick 2D or 3D!"; return; }
      err.textContent = "";
      this._showGeneratedTemplate(gameName, is3D);
      ov.remove();
    };
    ov.appendChild(genBtn);

    const backBtn = document.createElement("button");
    backBtn.textContent = "← Back";
    backBtn.style.cssText =
      "width:100%;max-width:500px;background:none;color:rgba(255,255,255,0.3);" +
      "font-size:13px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;";
    backBtn.onclick = () => { ov.remove(); this._devDashboard(); };
    ov.appendChild(backBtn);

    document.body.appendChild(ov);
    setTimeout(() => nameInp.focus(), 80);
  }

  private _showGeneratedTemplate(name: string, is3D: boolean): void {
    const className = name.replace(/[^a-zA-Z0-9]/g, "");
    const fileName  = `src/scenes/games/${className}.ts`;
    const btnId     = `${className.toLowerCase()}Btn`;

    const template2D = `/**
 * ${name} — minigame
 */
import type { Game } from "../../game/Game";

export class ${className} {
  private _g: Game;
  private _wrap!: HTMLDivElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;background:#1a1a2e;" +
      "pointer-events:all;font-family:Arial,sans-serif;";
    g.ui.appendChild(this._wrap);
    this._build();
  }

  private _build(): void {
    this._wrap.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    this._wrap.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = this._wrap.clientWidth  || window.innerWidth;
      canvas.height = this._wrap.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const loop = () => {
      if (!this._wrap.isConnected) return;
      requestAnimationFrame(loop);
      t += 0.016;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // TODO: draw your game here
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("${name}", W / 2, H / 2);
    };
    requestAnimationFrame(loop);

    // Exit button
    const exitBtn = document.createElement("button");
    exitBtn.textContent = "✕";
    exitBtn.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.5);color:white;" +
      "width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.3);" +
      "cursor:pointer;font-size:16px;";
    exitBtn.onclick = () => this._cleanup();
    this._wrap.appendChild(exitBtn);
  }

  private _cleanup(): void {
    this._wrap.remove();
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}`;

    const template3D = `/**
 * ${name} — 3D minigame
 */
import type { Game } from "../../game/Game";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export class ${className} {
  private _g: Game;
  private _scene!: Scene;
  private _wrap!: HTMLDivElement;

  constructor(g: Game) {
    this._g = g;
    g.inMiniGame = true;
    g.ui.innerHTML = "";
    this._wrap = document.createElement("div");
    this._wrap.style.cssText =
      "position:absolute;inset:0;overflow:hidden;pointer-events:all;";
    g.ui.appendChild(this._wrap);
    this._build();
  }

  private _build(): void {
    this._scene = new Scene(this._g.engine);
    const cam = new ArcRotateCamera("cam", -Math.PI/2, Math.PI/3, 10, Vector3.Zero(), this._scene);
    cam.attachControl(this._g.engine.getRenderingCanvas()!, true);
    new HemisphericLight("light", new Vector3(0, 1, 0), this._scene);

    // TODO: build your 3D scene here
    MeshBuilder.CreateBox("box", { size: 1 }, this._scene);

    this._g.engine.runRenderLoop(() => this._scene.render());

    // Exit button
    const exitBtn = document.createElement("button");
    exitBtn.textContent = "✕";
    exitBtn.style.cssText =
      "position:absolute;top:12px;right:12px;background:rgba(0,0,0,0.5);color:white;" +
      "width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,0.3);" +
      "cursor:pointer;font-size:16px;";
    exitBtn.onclick = () => this._cleanup();
    this._wrap.appendChild(exitBtn);
  }

  private _cleanup(): void {
    this._scene.dispose();
    this._wrap.remove();
    this._g.inMiniGame = false;
    this._g.goArcade();
  }
}`;

    const code = is3D ? template3D : template2D;

    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;z-index:100000;background:#080808;overflow-y:auto;" +
      "font-family:Arial,sans-serif;display:flex;flex-direction:column;" +
      "align-items:center;padding:28px 16px 60px;";

    const title = document.createElement("div");
    title.style.cssText = "color:#80ff80;font-size:20px;font-weight:900;margin-bottom:6px;";
    title.textContent = `✅ "${name}" template ready!`;
    ov.appendChild(title);

    const steps = document.createElement("div");
    steps.style.cssText =
      "width:100%;max-width:600px;background:#111;border:1px solid rgba(255,255,255,0.1);" +
      "border-radius:10px;padding:18px 20px;margin:12px 0 16px;color:rgba(255,255,255,0.7);" +
      "font-size:13px;line-height:2;";
    steps.innerHTML =
      `<b style="color:white;">How to add it to the game:</b><br>` +
      `1. Copy the code below<br>` +
      `2. Create a new file: <code style="color:#80cfff;">${fileName}</code><br>` +
      `3. Paste the code in and save<br>` +
      `4. Add a button with id <code style="color:#80cfff;">${btnId}</code> in ArcadeScene.ts<br>` +
      `5. Add the onclick handler to load it<br>`;
    ov.appendChild(steps);

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "📋 Copy Code";
    copyBtn.style.cssText =
      "width:100%;max-width:600px;background:rgba(100,200,100,0.2);color:#80ff80;" +
      "font-size:15px;font-weight:bold;padding:12px;border-radius:10px;" +
      "border:1px solid rgba(100,200,100,0.3);cursor:pointer;margin-bottom:12px;";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(code).then(() => {
        copyBtn.textContent = "✅ Copied!";
        setTimeout(() => { copyBtn.textContent = "📋 Copy Code"; }, 2000);
      });
    };
    ov.appendChild(copyBtn);

    const pre = document.createElement("pre");
    pre.style.cssText =
      "width:100%;max-width:600px;background:#0d0d0d;border:1px solid rgba(255,255,255,0.08);" +
      "border-radius:10px;padding:18px;color:#c8c8c8;font-size:12px;line-height:1.7;" +
      "overflow-x:auto;white-space:pre;box-sizing:border-box;";
    pre.textContent = code;
    ov.appendChild(pre);

    const doneBtn = document.createElement("button");
    doneBtn.textContent = "← Back to Dev Panel";
    doneBtn.style.cssText =
      "width:100%;max-width:600px;background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);" +
      "font-size:13px;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);" +
      "cursor:pointer;margin-top:12px;";
    doneBtn.onclick = () => { ov.remove(); this._devDashboard(); };
    ov.appendChild(doneBtn);

    document.body.appendChild(ov);
  }

  hasItem(id: string): boolean { return this.state.items.includes(id); }

  /** Coin multiplier from owned items — stacks multiplicatively. */
  get petCoinMultiplier(): number {
    let m = 1;
    if (this.hasItem("lucky_charm"))    m *= 1.25;
    if (this.hasItem("midas_touch"))    m *= 2;
    if (this.hasItem("diamond_crown"))  m *= 3;
    return m * this.eventCoinMultiplier;
  }

  /** Interval multiplier — below 1 means pets tick sooner. */
  get petSpeedMultiplier(): number {
    let m = 1;
    if (this.hasItem("coffee"))       m *= 0.85;
    if (this.hasItem("golden_gear"))  m *= 0.75;
    if (this.hasItem("time_machine")) m *= 0.5;
    return m;
  }

  /** Diamond multiplier applied to minigame payouts. */
  get gemMultiplier(): number {
    let m = 1;
    if (this.hasItem("gem_magnet")) m *= 1.5;
    if (this.hasItem("gem_forge"))  m *= 2;
    return m * this.eventGemMultiplier;
  }

  /** How many screams the player can absorb per horror run. */
  get shieldCharges(): number {
    if (this.hasItem("shield_plus"))  return 3;
    if (this.hasItem("scare_shield")) return 1;
    return 0;
  }

  /** 👑 shown beside the player's name once they own the Royal Crown. */
  get nameCrown(): string {
    return this.hasItem("vip_crown") ? "👑 " : "";
  }

  /** Start a timer for a single pet (skips if already running). */
  startPetTimer(petId: string): void {
    if (this._petTimers.has(petId)) return;
    const def = PETS.find(p => p.id === petId);
    if (!def) return;
    // floor guards against an interval so small it pins the CPU
    const every = Math.max(1200, Math.round(def.interval * this.petSpeedMultiplier));
    const id = window.setInterval(() => {
      if (!this.inMiniGame) return;
      // 🎲 Lucky Dice — 1 in 10 payouts pays 10x
      const jackpot = this.hasItem("lucky_dice") && Math.random() < 0.1;
      const payout = Math.round(def.reward * this.petCoinMultiplier * (jackpot ? 10 : 1));
      this.state.coins += payout;
      this.save();
      this._showPetToast(def, payout, jackpot);
    }, every);
    this._petTimers.set(petId, id);
  }

  /** Buying an item can change pet cadence, so restart the timers. */
  restartPetTimers(): void {
    this.stopAllPetTimers();
    this.startAllPetTimers();
  }

  /** Start timers for all currently owned pets. */
  startAllPetTimers(): void {
    for (const petId of this.state.pets) this.startPetTimer(petId);
  }

  /** Stop one pet's earning timer — used when it leaves the player's inventory. */
  stopPetTimer(petId: string): void {
    const id = this._petTimers.get(petId);
    if (id !== undefined) { clearInterval(id); this._petTimers.delete(petId); }
  }

  /** Hand a pet over to the market: it stops earning and leaves the inventory. */
  removePet(petId: string): void {
    this.stopPetTimer(petId);
    this.state.pets = this.state.pets.filter(p => p !== petId);
    this.save();
  }

  /** Take ownership of a pet bought from another player. */
  addPet(petId: string): void {
    if (!this.state.pets.includes(petId)) this.state.pets.push(petId);
    this.startPetTimer(petId);
    this.save();
  }

  /** Stop every running pet timer (used when switching or wiping accounts). */
  stopAllPetTimers(): void {
    for (const id of this._petTimers.values()) clearInterval(id);
    this._petTimers.clear();
  }

  private _showPetToast(def: PetDef, payout = def.reward, jackpot = false): void {
    const toast = document.createElement("div");
    toast.textContent = jackpot
      ? `🎲 JACKPOT! ${def.emoji} ${def.name} +🪙 ${payout.toLocaleString()}`
      : `${def.emoji} ${def.name} solved a puzzle! +🪙 ${payout.toLocaleString()}`;
    toast.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.85);color:#FFD700;font-size:15px;font-weight:bold;
      padding:10px 20px;border-radius:20px;border:2px solid rgba(255,215,0,0.4);
      font-family:Arial,sans-serif;z-index:9999;pointer-events:none;
      transition:opacity 0.5s;white-space:nowrap;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, 3000);
    setTimeout(() => toast.remove(), 3500);
  }

  // ── Auto clicker ───────────────────────────────────────────────────────────

  /** Callback registered by the active mini-game — called every auto-click tick */
  autoClickCallback: (() => void) | null = null;

  /** Set up right-click toggle. Guard against double-registration. */
  setupAutoClicker(): void {
    if (this._acSetup) return;
    this._acSetup = true;

    // Track cursor so we know where to click
    window.addEventListener("mousemove", e => { this._acMouseX = e.clientX; this._acMouseY = e.clientY; });

    // Right-click toggles on/off
    window.addEventListener("contextmenu", (e: MouseEvent) => {
      if (!this.state.autoClicker) return;
      e.preventDefault();
      if (this._acActive) this._stopAutoClicker(); else this._startAutoClicker();
    });
  }

  private _startAutoClicker(): void {
    this._acActive = true;
    this._updateACIndicator();
    this._acInterval = window.setInterval(() => {
      if (this.autoClickCallback) {
        // In a mini-game — use the game's own handler
        this.autoClickCallback();
      } else {
        // Anywhere else — fire a real left-click at the cursor position
        const el = document.elementFromPoint(this._acMouseX, this._acMouseY);
        if (el) {
          el.dispatchEvent(new MouseEvent("click", {
            bubbles: true, cancelable: true,
            clientX: this._acMouseX, clientY: this._acMouseY,
            view: window,
          }));
          el.dispatchEvent(new PointerEvent("pointerdown", {
            bubbles: true, cancelable: true,
            clientX: this._acMouseX, clientY: this._acMouseY,
            pointerId: 99, isPrimary: false,
          }));
        }
      }
    }, 1);
  }

  private _stopAutoClicker(): void {
    this._acActive = false;
    clearInterval(this._acInterval);
    this._updateACIndicator();
  }

  hideAutoClickerUI(): void { this._acHidden = true;  if (this._acIndicator) this._acIndicator.style.display = "none"; }
  showAutoClickerUI(): void { this._acHidden = false; if (this._acIndicator) this._acIndicator.style.display = ""; }

  private _updateACIndicator(): void {
    if (!this._acIndicator) {
      this._acIndicator = document.createElement("div");
      this._acIndicator.style.cssText = `
        position:fixed;top:52px;left:50%;transform:translateX(-50%);
        font-size:12px;font-weight:bold;font-family:Arial,sans-serif;
        padding:3px 12px;border-radius:20px;z-index:99999;pointer-events:none;
        transition:opacity 0.3s;
      `;
      document.body.appendChild(this._acIndicator);
    }
    if (this._acHidden) { this._acIndicator.style.display = "none"; return; }
    if (this._acActive) {
      this._acIndicator.textContent = "🖱️ AUTO ON";
      this._acIndicator.style.background = "rgba(0,200,0,0.85)";
      this._acIndicator.style.color = "white";
      this._acIndicator.style.border = "1px solid rgba(0,255,0,0.5)";
      this._acIndicator.style.opacity = "1";
    } else {
      this._acIndicator.style.opacity = "0";
    }
  }

  // ── Level helpers ──────────────────────────────────────────────────────────
  get completedLevelCount(): number {
    return Object.values(this._levelSaves).filter(s => s.completed).length;
  }

  isLevelUnlocked(n: number): boolean {
    return n === 1 || this._unlockedLevels.has(n);
  }

  isLevelCompleted(n: number): boolean {
    return !!(this._levelSaves[n]?.completed);
  }

  /** Deduct coins and add level to unlocked set. Call after confirming player can afford it. */
  unlockLevel(n: number): void {
    const cost = unlockCost(n);
    if (this.state.coins < cost) return;
    this.state.coins -= cost;
    this._unlockedLevels.add(n);
    this.save();
  }

  /**
   * Save current unlockedLocks + inventory into the level's save slot.
   * If completed=true: award 100 coins and unlock the next level.
   */
  private _showOhioPayout(reward: number, mult: number): void {
    const t = document.createElement("div");
    t.style.cssText =
      "position:fixed;top:120px;left:50%;transform:translateX(-50%);z-index:99994;" +
      "background:rgba(0,0,0,0.9);border:2px solid rgba(220,120,255,0.7);border-radius:18px;" +
      "padding:11px 22px;color:#e0a0ff;font-size:16px;font-weight:bold;" +
      "font-family:Arial,sans-serif;pointer-events:none;white-space:nowrap;" +
      "box-shadow:0 4px 24px rgba(200,100,255,0.35);transition:opacity 0.5s;";
    t.textContent = `🌀 OHIO ${mult}× — 🪙 ${reward.toLocaleString()}`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; }, 3200);
    setTimeout(() => t.remove(), 3700);
  }

  saveLevelProgress(completed: boolean): void {
    const n = this.state.currentLevel;
    this._levelSaves[n] = {
      locks: [...this.state.unlockedLocks],
      inv:   [...this.state.inventory],
      completed,
    };
    if (completed) {
      // Ohio pays for the chaos you actually put up with
      const mult = this.ohioRoll?.tier.bonus ?? 1;
      const reward = Math.round(100 * mult * this.eventCoinMultiplier);
      this.state.coins += reward;
      this.state.wins += Math.round(this.eventWinMultiplier);
      if (mult > 1) this._showOhioPayout(reward, mult);
      const next = n + 1;
      if (next <= LEVEL_COUNT) this._unlockedLevels.add(next);
    }
    this.save();
    this.checkBadges();
  }

  // ── Account helpers ────────────────────────────────────────────────────────
  private _getAccounts(): StoredAccount[] {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as StoredAccount[]; }
    catch { return []; }
  }
  private _saveAccounts(list: StoredAccount[]): void {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  }

  get currentAccountId(): string { return localStorage.getItem(SESSION_KEY) ?? ""; }
  get currentAccount(): StoredAccount | null {
    const id = this.currentAccountId;
    return id ? (this._getAccounts().find(a => a.id === id) ?? null) : null;
  }
  get isLoggedIn(): boolean { return !!this.currentAccount; }
  private _adminUsernames: Set<string> = new Set(["jackman_nice"]);
  private _adminGrantedNotified = false;
  fetchAdminUsers(): Promise<void> {
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    const wasAdmin = this.hasHacks;
    return fetch("https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1/admin_users?select=username", {
      headers: { "apikey": KEY, "Authorization": `Bearer ${KEY}` }
    }).then(r => r.json()).then((rows: { username: string }[]) => {
      this._adminUsernames = new Set(["jackman_nice", ...rows.map(r => r.username)]);
      if (!wasAdmin && this.hasHacks && !this._adminGrantedNotified) {
        this._adminGrantedNotified = true;
        this._showAdminGrantedToast();
      }
    }).catch(() => {});
  }
  private _showAdminGrantedToast(): void {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:linear-gradient(135deg,#1a0040,#2a006a);
      border:2px solid rgba(255,140,0,0.8);border-radius:20px;
      padding:20px 28px;z-index:999999;text-align:center;
      box-shadow:0 0 40px rgba(255,140,0,0.4);font-family:Arial,sans-serif;
      animation:adminPop 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
    `;
    if (!document.getElementById("__adminPopStyle")) {
      const s = document.createElement("style");
      s.id = "__adminPopStyle";
      s.textContent = `@keyframes adminPop { from{opacity:0;transform:translate(-50%,-50%) scale(0.5);} to{opacity:1;transform:translate(-50%,-50%) scale(1);} }`;
      document.head.appendChild(s);
    }
    toast.innerHTML = `
      <div style="font-size:36px;margin-bottom:8px;">👑</div>
      <div style="color:#FFD700;font-size:18px;font-weight:bold;">Admin gave you Admin+!</div>
      <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:6px;">Press <kbd style="background:rgba(255,255,255,0.15);border-radius:5px;padding:2px 7px;font-family:monospace;">Alt+P</kbd> to open it</div>
      <button style="margin-top:14px;background:rgba(255,200,0,0.2);color:#FFD700;border:1px solid rgba(255,200,0,0.5);
        border-radius:10px;padding:8px 24px;font-size:13px;font-weight:bold;cursor:pointer;font-family:Arial,sans-serif;">
        Got it! 🎉
      </button>
    `;
    toast.querySelector("button")!.onclick = () => toast.remove();
    document.body.appendChild(toast);
  }
  get hasHacks(): boolean {
    return (this.currentAccount?.isOwner ?? false)
      || this.state.username.includes("00")
      || this._adminUsernames.has(this.state.username);
  }

  getAllAccounts(): StoredAccount[] { return this._getAccounts(); }

  private _seedAdminAccount(): void {
    const list = this._getAccounts();
    let owner = list.find(a => a.isOwner);
    if (!owner) {
      const id = "owner-" + Date.now().toString(36);
      owner = { id, username: "WeeklyOwner", password: "gavlaw1517", createdAt: Date.now(), isOwner: true };
      list.push(owner);
      this._saveAccounts(list);
    } else if (owner.username === "00OW") {
      owner.username = "WeeklyOwner";
      this._saveAccounts(list);
    }
  }

  usernameExists(username: string): boolean {
    return this._getAccounts().some(a => a.username.toLowerCase() === username.trim().toLowerCase());
  }

  register(username: string, password: string): StoredAccount {
    const list = this._getAccounts();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const acc: StoredAccount = { id, username: username.trim(), password, createdAt: Date.now() };
    list.push(acc);
    this._saveAccounts(list);
    return acc;
  }

  findAccount(username: string, password: string): StoredAccount | null {
    return this._getAccounts().find(
      a => a.username.toLowerCase() === username.trim().toLowerCase() && a.password === password
    ) ?? null;
  }

  login(id: string): void {
    localStorage.setItem(SESSION_KEY, id);
    this._loadForAccount(id);
    const acc = this._getAccounts().find(a => a.id === id);
    if (acc) {
      // Repair names saved before changeUsername() trimmed. A stray space is
      // invisible on screen but breaks the PeerJS ID built from it.
      const clean = (acc.username ?? "").trim();
      if (clean !== acc.username) {
        acc.username = clean;
        this._saveAccounts(this._getAccounts().map(a => a.id === id ? { ...a, username: clean } : a));
      }
      this.state.username = clean;
      pingMember(id, clean);
    }
  }

  loginAsGuest(): void {
    const GUEST_ID = "bedrock_guest";
    const list = this._getAccounts();
    if (!list.find(a => a.id === GUEST_ID)) {
      list.push({ id: GUEST_ID, username: "Guest", password: "", createdAt: Date.now() });
      this._saveAccounts(list);
    }
    this.login(GUEST_ID);
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    this._resetAccountState();
    this.state.username = "";
  }

  changeUsername(newName: string): void {
    const id = this.currentAccountId;
    if (!id) return;
    const list = this._getAccounts();
    const acc = list.find(a => a.id === id);
    if (acc) {
      acc.username = newName.trim();
      this._saveAccounts(list);
      this.state.username = newName.trim();
      this.save();
    }
  }

  // ── Save / Load ────────────────────────────────────────────────────────────

  /**
   * Wipe every per-account field back to defaults and tear down anything the
   * previous account left running. Must cover the whole of SaveData — a field
   * missed here leaks across accounts, because a save with no stored value for
   * it keeps the old one and save() then writes it back under the new account.
   */
  private _resetAccountState(): void {
    this.stopAllPetTimers();
    if (this._acActive) this._stopAutoClicker(); // guarded: _updateACIndicator() builds the indicator on first call
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    this.state.difficulty   = 12;
    this.state.coins        = 0;
    this.state.currentLevel = 1;
    this.state.pets         = [];
    this.state.autoClicker  = false;
    this.state.wins         = 0;
    this.state.diamonds     = 0;
    this.state.hasAdminLite = false;
    this.state.items        = [];
    this._unlockedLevels = new Set([1]);
    this._levelSaves = {};
  }

  private _saveKey(): string {
    const id = this.currentAccountId;
    return id ? `${SAVE_KEY}_${id}` : SAVE_KEY;
  }

  enterModMode(): void {
    this._modSnapshot = localStorage.getItem(this._saveKey());
    this.modMode = true;
  }

  exitModMode(): void {
    this.modMode = false;
    if (this._modSnapshot !== null) {
      localStorage.setItem(this._saveKey(), this._modSnapshot);
    } else {
      localStorage.removeItem(this._saveKey());
    }
    this._modSnapshot = null;
    const id = this.currentAccountId;
    if (id) this._loadForAccount(id);
  }

  enablePartyMode(): void {
    if (this.partyMode) return;
    this.partyMode = true;
    this._startPartyOverlay();
    this._startPartyMusic();
  }

  disablePartyMode(): void {
    if (!this.partyMode) return;
    this.partyMode = false;
    this._partyOverlay?.remove();
    this._partyOverlay = null;
    document.getElementById("party-style")?.remove();
    this._partyAudioStop?.();
    this._partyAudioStop = null;
  }

  private _startPartyOverlay(): void {
    const style = document.createElement("style");
    style.id = "party-style";
    style.textContent = `
      @keyframes party-fall { 0%{transform:translateY(-30px) rotate(0deg);opacity:1} 100%{transform:translateY(105vh) rotate(720deg);opacity:0.6} }
      @keyframes party-bob  { 0%,100%{transform:translateY(0) rotate(-4deg)} 50%{transform:translateY(-18px) rotate(4deg)} }
      @keyframes party-sway { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "party-overlay";
    overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9998;overflow:hidden;";

    const colors = ["#ff4444","#ff9900","#ffff00","#00cc44","#4488ff","#cc44ff","#ff44cc","#00ccff"];
    for (let i = 0; i < 50; i++) {
      const p = document.createElement("div");
      const color = colors[i % colors.length];
      const size  = 8 + Math.random() * 10;
      const left  = Math.random() * 100;
      const delay = Math.random() * 5;
      const dur   = 3 + Math.random() * 4;
      const round = Math.random() > 0.5 ? "50%" : "2px";
      p.style.cssText = `position:absolute;top:-30px;left:${left}%;width:${size}px;height:${size}px;background:${color};border-radius:${round};animation:party-fall ${dur}s ${delay}s linear infinite;`;
      overlay.appendChild(p);
    }

    [["5%","10%","🎈",44],["15%","4%","🎈",52],["80%","8%","🎈",48],["90%","3%","🎈",40]].forEach(([l, b, e, sz], i) => {
      const balloon = document.createElement("div");
      balloon.style.cssText = `position:absolute;left:${l};bottom:${b};font-size:${sz}px;animation:party-bob ${2+i*0.4}s ${i*0.2}s ease-in-out infinite;`;
      balloon.textContent = e as string;
      overlay.appendChild(balloon);
    });

    ["🎊","🎉","✨","🌟"].forEach((e, i) => {
      const streamer = document.createElement("div");
      streamer.style.cssText = `position:absolute;top:${6+i*6}%;${i%2===0?"left":"right"}:${2+i*3}%;font-size:28px;animation:party-sway ${1.2+i*0.3}s ${i*0.15}s ease-in-out infinite;`;
      streamer.textContent = e;
      overlay.appendChild(streamer);
    });

    const banner = document.createElement("div");
    banner.style.cssText = "position:absolute;top:10px;left:50%;transform:translateX(-50%);font-size:18px;font-family:'Arial Black',Arial;font-weight:900;color:white;text-shadow:0 0 12px rgba(255,200,0,0.9);white-space:nowrap;animation:party-bob 1.8s ease-in-out infinite;";
    banner.textContent = "🎉 PARTY MODE 🎉";
    overlay.appendChild(banner);

    document.body.appendChild(overlay);
    this._partyOverlay = overlay;
  }

  private _startPartyMusic(): void {
    try {
      const ctx = new AudioContext();
      const notes = [523,659,784,1047,784,659,523,392,523,659,784,880,784,659,784,1047];
      let i = 0, stopped = false;
      const tick = () => {
        if (stopped) return;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.value = notes[i % notes.length];
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        i++;
        setTimeout(tick, 320);
      };
      tick();
      this._partyAudioStop = () => { stopped = true; ctx.close(); };
    } catch { /* audio unavailable */ }
  }

  save(): void {
    if (this.modMode) return;
    // Also persist current unlockedLocks + inventory into the current level's slot
    const n = this.state.currentLevel;
    this._levelSaves[n] = {
      locks: [...this.state.unlockedLocks],
      inv:   [...this.state.inventory],
      completed: this._levelSaves[n]?.completed ?? false,
    };
    this.state.coins = Math.min(MAX_COINS, this.state.coins);
    const data: SaveData = {
      coins:          this.state.coins,
      currentLevel:   this.state.currentLevel,
      difficulty:     this.state.difficulty,
      unlockedLevels: [...this._unlockedLevels],
      pets:           [...this.state.pets],
      autoClicker:    this.state.autoClicker,
      wins:           this.state.wins,
      diamonds:       this.state.diamonds,
      hasAdminLite:   this.state.hasAdminLite,
      items:          [...this.state.items],
      levels:         this._levelSaves,
    };
    localStorage.setItem(this._saveKey(), JSON.stringify(data));
    this.syncCoins(); // fire-and-forget
    this.syncDiamonds(); // fire-and-forget
  }

  /** Push current coin count to cloud leaderboard. Returns a promise so callers can await it. */
  syncCoins(): Promise<void> {
    const id = this.currentAccountId;
    if (!id || !this.state.username) return Promise.resolve();
    return upsertCoinRecord({
      account_id: id,
      username:   this.state.username,
      coins:      this.state.coins,
      updated_at: Date.now(),
    });
  }

  /** Push current diamond count to cloud leaderboard. Returns a promise so callers can await it. */
  syncDiamonds(): Promise<void> {
    const id = this.currentAccountId;
    if (!id || !this.state.username) return Promise.resolve();
    return upsertDiamondRecord({
      account_id: id,
      username:   this.state.username,
      diamonds:   this.state.diamonds,
      updated_at: Date.now(),
    });
  }

  private _loadForAccount(id: string): void {
    this._resetAccountState();
    try {
      const raw = localStorage.getItem(`${SAVE_KEY}_${id}`);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<SaveData> & { locks?: number[]; inv?: number[]; diff?: number };

      // Support old save format (pre-levels)
      if (data.locks) {
        data.locks.forEach(n => this.state.unlockedLocks.add(n));
        this.state.inventory.push(...(data.inv ?? []));
        if (data.diff) this.state.difficulty = data.diff;
        return;
      }

      this.state.coins        = Math.min(MAX_COINS, data.coins ?? 0);
      this.state.currentLevel = data.currentLevel ?? 1;
      this.state.difficulty   = data.difficulty   ?? 12;
      this.state.pets         = data.pets         ?? [];
      this.state.autoClicker  = data.autoClicker  ?? false;
      this.state.wins         = data.wins         ?? 0;
      this.state.diamonds     = data.diamonds     ?? 0;
      this.state.hasAdminLite = data.hasAdminLite ?? false;
      this.state.items        = data.items         ?? [];
      if (data.unlockedLevels) {
        this._unlockedLevels = new Set([1, ...data.unlockedLevels]);
      }
      if (data.levels) this._levelSaves = data.levels;

      // Load current level's progress into active state
      const lvSave = this._levelSaves[this.state.currentLevel];
      if (lvSave) {
        lvSave.locks.forEach(n => this.state.unlockedLocks.add(n));
        this.state.inventory.push(...lvSave.inv);
      }
    } catch { /* ignore */ } finally {
      // in a finally so the early returns above (no save yet / legacy format)
      // still (re)arm the pet timers and auto-clicker for this account
      this.startAllPetTimers();
      if (this.state.autoClicker) this.setupAutoClicker();
    }
  }

  /** Resets only the current level's puzzle progress (keeps coins + unlocked levels) */
  resetSave(): void {
    const n = this.state.currentLevel;
    delete this._levelSaves[n];
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    this.save();
  }

  /** Full wipe — used by admin panel */
  resetAllSaves(): void {
    localStorage.removeItem(this._saveKey());
    this._resetAccountState();
  }

  // ── Ban system ────────────────────────────────────────────────────────────
  getBannedIds(): string[] {
    try { return JSON.parse(localStorage.getItem(BANS_KEY) ?? "[]") as string[]; }
    catch { return []; }
  }
  isBanned(accountId: string): boolean {
    const acc = this._getAccounts().find(a => a.id === accountId);
    if (acc?.isOwner) return false; // owner can never be banned
    return this.getBannedIds().includes(accountId);
  }
  banUser(accountId: string): void {
    const list = this.getBannedIds();
    if (!list.includes(accountId)) {
      list.push(accountId);
      localStorage.setItem(BANS_KEY, JSON.stringify(list));
    }
    setBanStatus(accountId, true);
  }
  unbanUser(accountId: string): void {
    localStorage.setItem(BANS_KEY, JSON.stringify(this.getBannedIds().filter(id => id !== accountId)));
    setBanStatus(accountId, false);
  }

  // ── World records ─────────────────────────────────────────────────────────
  startTimer(): void { this._runStart = Date.now(); }

  saveRecord(): void {
    if (this.state.difficulty < 12) return;
    const timeMs = this._runStart > 0 ? Date.now() - this._runStart : 0;
    this._runStart = 0;
    const rec: GameRecord = {
      username:  this.state.username,
      accountId: this.currentAccountId,
      timeMs,
      date: Date.now(),
    };
    const list = this.getLocalRecords();
    const existing = list.findIndex(r => r.accountId === rec.accountId);
    if (existing !== -1) {
      if (rec.timeMs >= list[existing].timeMs) {
        upsertRecord({ account_id: rec.accountId, username: rec.username, time_ms: rec.timeMs, date: rec.date });
        return;
      }
      list.splice(existing, 1);
    }
    list.push(rec);
    list.sort((a, b) => a.timeMs - b.timeMs);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(list.slice(0, 50)));
    upsertRecord({ account_id: rec.accountId, username: rec.username, time_ms: rec.timeMs, date: rec.date });
  }

  async getCoinLeaderboard(): Promise<CoinRecord[]> {
    return fetchCoinLeaderboard();
  }

  async getDiamondLeaderboard(): Promise<DiamondRecord[]> {
    return fetchDiamondLeaderboard();
  }

  async getRecords(): Promise<GameRecord[]> {
    const cloud = await fetchRecords();
    if (cloud.length > 0) {
      return cloud.map(r => ({ username: r.username, accountId: r.account_id, timeMs: r.time_ms, date: r.date }));
    }
    return this.getLocalRecords();
  }

  getLocalRecords(): GameRecord[] {
    try {
      const raw = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? "[]") as GameRecord[];
      const best = new Map<string, GameRecord>();
      for (const r of raw) {
        const existing = best.get(r.accountId);
        if (!existing || r.timeMs < existing.timeMs) best.set(r.accountId, r);
      }
      return [...best.values()].sort((a, b) => a.timeMs - b.timeMs);
    }
    catch { return []; }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  start(): void {
    this.engine.runRenderLoop(() => {});
    this._seedAdminAccount();
    this._startNormal();
    this._startPollWatcher();
    window.addEventListener("keydown", (e) => {
      if (e.altKey && e.key === "p" && this.hasHacks) {
        e.preventDefault();
        this.goAdminAbuse();
      } else if (e.altKey && e.key === "p" && this.state.hasAdminLite) {
        e.preventDefault();
        import("../scenes/AdminLitePanel").then(m => new m.AdminLitePanel(this));
      }
      // Alt+L — 🛰️ Admin Panel+ (live player spy, kick/freeze/puppet, events)
      if (e.altKey && e.key === "l" && this.hasHacks) {
        e.preventDefault();
        this.goAdminPlus();
      }
      if (e.altKey && e.key === "c" && this.hasHacks && (window as any).__coinJump) {
        e.preventDefault();
        import("../scenes/games/CoinJumpEditor").then(m => new m.CoinJumpEditor(this));
      }
    });
  }

  private _startNormal(): void {
    if (this.isLoggedIn) {
      const acc = this.currentAccount!;
      this._loadForAccount(acc.id);
      this.state.username = acc.username;
      if (this.isBanned(acc.id)) { this.goBanned(); return; }
      // Also check server-side ban by account_id AND username
      const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
      const SB = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
      const H2 = { "apikey": KEY, "Authorization": `Bearer ${KEY}` };
      Promise.all([
        fetch(`${SB}/members?account_id=eq.${encodeURIComponent(acc.id)}&select=is_banned`, { headers: H2 }).then(r => r.json()),
        fetch(`${SB}/bans?username=eq.${encodeURIComponent(acc.username)}&select=id`, { headers: H2 }).then(r => r.json()),
      ]).then(([members, bans]: [{ is_banned: boolean }[], { id: number }[]]) => {
        if (members[0]?.is_banned || bans.length > 0) { this.goBanned(); return; }
        pingMember(acc.id, acc.username);
        this.goTitle();
      }).catch(() => {
        pingMember(acc.id, acc.username);
        this.goTitle();
      });
    } else {
      this.goAuth();
    }
  }

  /** Where this player currently is — heartbeated to the Live Player Spy. */
  currentScene = "title";

  private _nav(fn: () => void, label?: string): void {
    if (label) this.currentScene = label;
    this._disposeScene?.();
    this._disposeScene = null;
    this.ui.innerHTML = "";
    fn();
  }

  /** Enter a level: set currentLevel + difficulty, load saved progress, go to intro */
  goLevel(levelNum: number, difficulty: number): void {
    this.customTheme = null; // leaving any community level behind
    this.customLevelName = "";
    this.state.currentLevel = levelNum;
    this.state.difficulty   = difficulty;
    // Load this level's saved progress (or start fresh)
    const lvSave = this._levelSaves[levelNum];
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    if (lvSave && !lvSave.completed) {
      // Resume in-progress level
      lvSave.locks.forEach(n => this.state.unlockedLocks.add(n));
      this.state.inventory.push(...lvSave.inv);
    }
    this.save();
    this.goIntro();
  }

  goMods():             void { this._nav(() => import("../scenes/ModsScene").then(m => new m.ModsScene(this)), "Mods"); }
  goArcade():           void { import("../scenes/Tutorial").then(({advanceTutorial})=>advanceTutorial("arcade")); this._nav(() => import("../scenes/ArcadeScene").then(m => new m.ArcadeScene(this)), "Arcade"); }
  goAuth():             void { this._nav(() => import("../scenes/AuthScene").then(m => new m.AuthScene(this)), "Login"); }
  goLobby():            void { this._nav(() => import("../scenes/LobbyScene").then(m => new m.LobbyScene(this)), "Lobby"); }
  goDuel():             void { this._nav(() => import("../scenes/DuelScene").then(m => new m.DuelScene(this)), "Duel"); }
  goTitle():            void { import("../scenes/Tutorial").then(({advanceTutorial})=>advanceTutorial("back")); this._nav(() => import("../scenes/TitleScene").then(m => new m.TitleScene(this)), "Title Screen"); }
  goLevelSelect():      void { import("../scenes/Tutorial").then(({advanceTutorial})=>advanceTutorial("start")); this._nav(() => import("../scenes/LevelSelect").then(m => new m.LevelSelect(this)), "Level Select"); }
  goLeaderboard():      void { this._nav(() => import("../scenes/LeaderboardScene").then(m => new m.LeaderboardScene(this)), "Leaderboard"); }
  goCoinLeaderboard():  void { this._nav(() => import("../scenes/CoinLeaderboardScene").then(m => new m.CoinLeaderboardScene(this)), "Coin Leaderboard"); }
  goDiamondLeaderboard(): void { this._nav(() => import("../scenes/DiamondLeaderboardScene").then(m => new m.DiamondLeaderboardScene(this)), "Diamond Leaderboard"); }
  goShop():             void { this._nav(() => import("../scenes/ShopScene").then(m => new m.ShopScene(this)), "Shop"); }
  goLevelBuilder():     void { this._nav(() => import("../scenes/LevelBuilder").then(m => new m.LevelBuilder(this)), "Level Builder"); }
  goTradingPlaza():     void { this._nav(() => import("../scenes/TradingPlaza").then(m => new m.TradingPlaza(this)), "Trading Plaza"); }
  goBadges():           void { this._nav(() => import("../scenes/BadgesScene").then(m => new m.BadgesScene(this)), "Badges"); }
  goOhio():             void { this._nav(() => import("../scenes/OhioScene").then(m => new m.OhioScene(this)), "Ohio Mode"); }

  /** Announce anything newly earned. Safe to call often — each badge fires once. */
  checkBadges(): void {
    import("./badges").then(({ takeNewlyEarned }) => {
      // stagger, so two badges at once don't overlap into one unreadable toast
      // and one blurred chime — they land as a satisfying run instead
      takeNewlyEarned(this).forEach((b, i) => {
        setTimeout(() => this._showBadgeToast(b.emoji, b.name), i * 1300);
      });
    }).catch(() => {});
  }

  private _badgeAudio: HTMLAudioElement | null = null;
  private _badgeAudioBroken = false;

  /**
   * Drop a file at public/sounds/badge.mp3 (or .wav / .ogg) and it plays instead
   * of the built-in chime — no code change needed. If the file is missing or the
   * format won't decode, we fall straight back to the synthesised arpeggio, so
   * the game never ends up silent.
   */
  private _playBadgeSound(): void {
    if (this._badgeAudioBroken) { this._synthBadgeSound(); return; }

    if (!this._badgeAudio) {
      const a = new Audio();
      // let the browser pick whichever of these it can actually decode
      for (const [src, type] of [
        ["/sounds/badge.mp3", "audio/mpeg"],
        ["/sounds/badge.ogg", "audio/ogg"],
        ["/sounds/badge.wav", "audio/wav"],
      ] as const) {
        const s = document.createElement("source");
        s.src = src;
        s.type = type;
        a.appendChild(s);
      }
      a.preload = "auto";
      a.volume  = 0.65;
      // fires when every <source> has failed — i.e. no badge sound is installed
      a.onerror = () => { this._badgeAudioBroken = true; };
      this._badgeAudio = a;
    }

    const a = this._badgeAudio;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p) {
        p.catch(() => {
          // no file installed → use the chime. If instead the browser blocked
          // autoplay, the synth is blocked too and simply stays silent.
          this._badgeAudioBroken = true;
          this._synthBadgeSound();
        });
      }
    } catch {
      this._badgeAudioBroken = true;
      this._synthBadgeSound();
    }
  }

  /** Fallback: rising four-note chime, synthesised so it needs no asset. */
  private _synthBadgeSound(): void {
    try {
      const ctx = new AudioContext();
      // C6 E6 G6 C7 — a major arpeggio, reads as "achievement" rather than "alert"
      const notes = [1047, 1319, 1568, 2093];
      notes.forEach((freq, i) => {
        const t0   = ctx.currentTime + i * 0.09;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle"; // softer than the square wave party music uses
        osc.frequency.value = freq;
        // last note rings out longer so the run resolves instead of stopping dead
        const dur = i === notes.length - 1 ? 0.75 : 0.3;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.13, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      });
      // free the hardware context once the tail has finished
      setTimeout(() => ctx.close().catch(() => {}), 1400);
    } catch { /* audio blocked or unavailable — the toast still shows */ }
  }

  private _showBadgeToast(emoji: string, name: string): void {
    this._playBadgeSound();
    const t = document.createElement("div");
    t.style.cssText =
      "position:fixed;top:76px;left:50%;transform:translateX(-50%);z-index:99993;" +
      "background:rgba(0,0,0,0.9);border:2px solid rgba(255,215,0,0.6);border-radius:18px;" +
      "padding:10px 20px;color:#FFD700;font-size:15px;font-weight:bold;" +
      "font-family:Arial,sans-serif;pointer-events:none;white-space:nowrap;" +
      "box-shadow:0 4px 22px rgba(255,215,0,0.3);transition:opacity 0.5s;";
    t.textContent = `🎖️ Badge earned — ${emoji} ${name}!`;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; }, 3400);
    setTimeout(() => t.remove(), 3900);
  }
  goCommunityLevels():  void { this._nav(() => import("../scenes/CommunityLevels").then(m => new m.CommunityLevels(this))); }

  /** Play a player-built level: its theme replaces the built-in one for this run. */
  playCommunityLevel(theme: LevelTheme, name: string): void {
    this.customTheme = theme;
    this.customLevelName = name;
    this.state.difficulty = 12;
    this.state.unlockedLocks.clear();
    this.state.inventory.length = 0;
    this.goExplore();
  }
  goIntro():       void {
    this.startTimer();
    this._nav(() => import("../scenes/IntroCutscene").then(m => new m.IntroCutscene(this)), "Intro");
  }
  goExplore():     void {
    this.rollOhioIfOn();
    if (this._runStart === 0) this.startTimer();
    this._nav(() => import("../scenes/ExploreScene").then(m => new m.ExploreScene(this)), `Level ${this.state.currentLevel}`);
  }
  goClock():       void { this._nav(() => import("../scenes/ClockScene").then(m => new m.ClockScene(this)), "The Clock"); }
  goPuzzle(i: number): void { this._nav(() => import("../scenes/MiniPuzzle").then(m => new m.MiniPuzzle(this, i)), `Puzzle ${i + 1}`); }
  goEnding():      void { import("../scenes/Tutorial").then(({advanceTutorial})=>advanceTutorial("win")); this._nav(() => import("../scenes/EndingScene").then(m => new m.EndingScene(this)), "Ending"); }
  goAdmin():       void { if (!this.hasHacks) return; this._nav(() => import("../scenes/AdminPanel").then(m => new m.AdminPanel(this)), "Admin Panel"); }
  private _activePollId = -1;
  private _startPollWatcher(): void {
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnemdxZGhramNzcmd6aGp5aXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Njc0NjQsImV4cCI6MjA4MDU0MzQ2NH0.jNO90VavTfHfF2adH38kmkRMf2b-qibBz6wnusE_CdE";
    const H = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal" };
    const SB = "https://xgzgqdhkjcsrgzhjyiss.supabase.co/rest/v1";
    const check = () => {
      fetch(`${SB}/polls?active=eq.true&order=id.desc&limit=1`, { headers: H })
        .then(r => r.json())
        .then((rows: { id: number; question: string; options: string[] }[]) => {
          if (!rows.length) { document.getElementById("__pollOverlay")?.remove(); return; }
          const poll = rows[0];
          if (poll.id === this._activePollId) return;
          this._activePollId = poll.id;
          document.getElementById("__pollOverlay")?.remove();
          const overlay = document.createElement("div");
          overlay.id = "__pollOverlay";
          overlay.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99990;
            background:linear-gradient(135deg,#1a003a,#2a005a);border:2px solid rgba(180,0,255,0.6);
            border-radius:20px;padding:16px 20px;font-family:Arial,sans-serif;min-width:280px;max-width:340px;
            box-shadow:0 8px 32px rgba(0,0,0,0.7);`;
          overlay.innerHTML = `
            <div style="color:#dd88ff;font-size:14px;font-weight:bold;margin-bottom:8px;">📊 ${poll.question}</div>
            <div id="__pollBtns" style="display:flex;flex-direction:column;gap:6px;">
              ${poll.options.map((opt, i) => `
                <button data-idx="${i}" style="background:rgba(180,0,255,0.2);color:white;font-size:13px;
                  font-weight:bold;padding:8px 12px;border-radius:10px;border:1.5px solid rgba(180,0,255,0.4);
                  cursor:pointer;text-align:left;">${opt}</button>`).join("")}
            </div>
            <div id="__pollThanks" style="color:#80ff80;font-size:12px;margin-top:6px;min-height:14px;"></div>
            <button id="__pollClose" style="margin-top:8px;width:100%;background:rgba(255,255,255,0.06);
              color:rgba(255,255,255,0.4);font-size:11px;padding:5px;border-radius:8px;
              border:1px solid rgba(255,255,255,0.15);cursor:pointer;">✕ Dismiss</button>
          `;
          document.body.appendChild(overlay);
          overlay.querySelectorAll<HTMLButtonElement>("[data-idx]").forEach(btn => {
            btn.onclick = () => {
              const idx = parseInt(btn.dataset.idx!);
              fetch(`${SB}/poll_votes`, { method: "POST", headers: H,
                body: JSON.stringify({ poll_id: poll.id, account_id: this.currentAccountId, option_index: idx, voted_at: Date.now() }) })
                .then(() => {
                  const t = document.getElementById("__pollThanks");
                  if (t) t.textContent = `✓ Voted for: ${poll.options[idx]}`;
                  overlay.querySelectorAll<HTMLButtonElement>("[data-idx]").forEach(b => b.disabled = true);
                }).catch(() => {});
            };
          });
          document.getElementById("__pollClose")!.onclick = () => overlay.remove();
        }).catch(() => {});
    };
    check();
    setInterval(check, 5000);
  }

  goAdminAbuse():  void {
    if (!this.hasHacks) return;
    import("../scenes/AdminAbusePanel").then(m => new m.AdminAbusePanel(this));
  }
  goClan():        void { this._nav(() => import("../scenes/ClanScene").then(m => new m.ClanScene(this)), "Clan"); }
  goBanned():      void { this._nav(() => import("../scenes/BannedScreen").then(m => new m.BannedScreen(this)), "Banned"); }

  goFriends():     void { this._nav(() => import("../scenes/FriendsScene").then(m => new m.FriendsScene(this)), "Friends"); }

  /** A duel against a specific friend rather than the random queue. */
  goFriendDuel(opponentName: string, host: boolean): void {
    this._nav(
      () => import("../scenes/DuelScene").then(m => new m.DuelScene(this, { opponentName, host })),
      `Duel vs ${opponentName}`,
    );
  }

  goAdminPlus():   void {
    if (!this.hasHacks) return;
    this.currentScene = "Admin Panel+";
    import("../scenes/AdminPlusPanel").then(m => new m.AdminPlusPanel(this));
  }

  addToInventory(num: number): void {
    if (!this.state.inventory.includes(num)) { this.state.inventory.push(num); this.save(); }
  }
  placeNumber(clockNumber: number): void {
    const idx = this.state.inventory.indexOf(clockNumber);
    if (idx !== -1) this.state.inventory.splice(idx, 1);
    this.state.unlockedLocks.add(clockNumber === 12 ? 0 : clockNumber);
    this.save();
  }
}
