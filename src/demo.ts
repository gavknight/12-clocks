// Demo Edition — the cut-down build served from its own deployment
// (12-clocks-demo.vercel.app), separate from the full game.
//
// There is no second entry point or second build. The demo switches itself on
// from the hostname, so the same code deploys to both Vercel projects and the
// demo URL is the only thing that decides which one a player gets.

/** True on any deployment whose host contains "demo"
 *  (12-clocks-demo.vercel.app, demo.12clocks.com, …). */
const _hostIsDemo = /(^|[.-])demo([.-]|$)/i.test(location.hostname);

/** True on the /demo path of any deployment — the simplest link of all:
 *  12-clocks.vercel.app/demo, no second Vercel project required. */
const _pathIsDemo = /^\/demo\/?$/i.test(location.pathname);

/** Manual override, mostly for local testing:
 *  ?demo=1 turns it on and remembers it, ?demo=0 turns it back off. */
const _param = new URLSearchParams(location.search).get("demo");
if (_param === "1") localStorage.setItem("demoEdition", "1");
if (_param === "0") localStorage.removeItem("demoEdition");

export const IS_DEMO =
  _hostIsDemo || _pathIsDemo || localStorage.getItem("demoEdition") === "1";

export function enterDemo(): void { localStorage.setItem("demoEdition", "1"); location.reload(); }
export function exitDemo():  void { localStorage.removeItem("demoEdition");   location.reload(); }

/** Levels 1–3 are playable in the demo; the other 25 are full-version only. */
export const DEMO_LEVELS = 3;

/** The only arcade cards the demo shows: the two original mini-games, the ones
 *  v0.2 "First Mini-Games" shipped with. Ids match ArcadeScene's button ids. */
export const DEMO_GAMES = new Set([
  "coinJumpBtn",    // Coin Jump   — OG #1
  "fruitSliceBtn",  // Fruit Slice — OG #2
]);

/** Title-screen buttons the demo doesn't get: everything from the most recent
 *  round of work. Friends and Ohio Mode are full-version features. */
export const DEMO_HIDDEN_BUTTONS = [
  "friendsBtn",   // friends system
  "ohioBtn",      // Ohio Mode
  "badgesBtn",    // badges track stats across content the demo doesn't ship
];

/** Shared "this is full-version only" pill, used wherever content is withheld. */
export const demoLockHTML = (label = "Full version only"): string => `
  <div style="margin:14px auto 0;padding:12px 20px;border-radius:16px;max-width:360px;
    background:rgba(160,60,255,0.12);border:1.5px solid rgba(180,100,255,0.45);
    color:rgba(255,255,255,0.75);font-size:13px;text-align:center;
    font-family:Arial,sans-serif;">
    🔒 ${label}
  </div>`;
