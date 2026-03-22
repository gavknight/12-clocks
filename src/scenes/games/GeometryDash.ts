// GeometryDash.ts  — Ship + Cube Mode
import type { Game } from "../../game/Game";
import type { GDLevel } from "./GDStorage";
import { GD_DIFFICULTIES, gdLoadAll, gdGetStarCoins, gdAddStarCoins, gdGetProfileDesc, gdSetProfileDesc } from "./GDStorage";

const FEATURED_KEY = 'gd_featured_levels';
type FeaturedEntry = { id: string; req: number };
function getFeaturedEntries(): FeaturedEntry[] { try { return JSON.parse(localStorage.getItem(FEATURED_KEY) ?? '[]'); } catch { return []; } }

/** Draw a GD-style star coin onto any canvas context */
function _drawStarCoin(c: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  /* outer gold circle */
  const grad = c.createRadialGradient(cx - r*0.3, cy - r*0.3, r*0.1, cx, cy, r);
  grad.addColorStop(0, '#ffe066'); grad.addColorStop(0.6, '#f0a800'); grad.addColorStop(1, '#c07000');
  c.fillStyle = grad;
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI*2); c.fill();
  /* dark gold border */
  c.strokeStyle = '#8a5000'; c.lineWidth = r * 0.12;
  c.stroke();
  /* brown star */
  const spikes = 5, outerR = r * 0.62, innerR = r * 0.26;
  c.fillStyle = '#7a3a00';
  c.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? outerR : innerR;
    const ang = (i * Math.PI / spikes) - Math.PI / 2;
    i === 0 ? c.moveTo(cx + rad*Math.cos(ang), cy + rad*Math.sin(ang))
             : c.lineTo(cx + rad*Math.cos(ang), cy + rad*Math.sin(ang));
  }
  c.closePath(); c.fill();
  /* shine */
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath(); c.ellipse(cx - r*0.28, cy - r*0.32, r*0.22, r*0.14, -0.5, 0, Math.PI*2); c.fill();
}
import type { MultiplayerManager } from "../../multiplayer/MultiplayerManager";
import { getEquippedCubeSkin, getEquippedShipSkin, setEquippedCubeSkin, setEquippedShipSkin, CUBE_SKINS, SHIP_SKINS } from "./GDSkins";

/* ── Virtual canvas ───────────────────────────────────────── */
const W = 800, H = 450;
const FLOOR_Y = 390;   // top of floor platform
const CEIL_Y  = 30;    // bottom of ceiling platform
const CORRIDOR = FLOOR_Y - CEIL_Y;  // 360 px of flyable space

/* ── Grid ─────────────────────────────────────────────────── */
const B = 46;

/* ── Ship ─────────────────────────────────────────────────── */
const P      = 32;    // ship hitbox size
const SCR_X  = 180;   // fixed screen x

/* ── Physics ──────────────────────────────────────────────── */
const GRAV      = 580;
const UP_AC     = 1300;
const MAX_VY    = 320;
const CUBE_GRAV = 1500;
const CUBE_JUMP = -500;

const SPD: Record<string,number> = { norm:280, fast:380, vfast:500 };
const WAVE_SPD = 260; // wave vertical speed (px/s)
type SpK = 'norm'|'fast'|'vfast';

/* ── Obstacle types ───────────────────────────────────────── */
type OT = 'block'|'spike'|'spike_d'|'p_norm'|'p_fast'|'p_vfast'|'p_cube'|'p_ship'|'p_wave'|'slope'|'coin';
interface Obj { t:OT; wx:number; wy:number; ww:number; wh:number; }

/* helpers — all measurements in block units from floor/ceiling */
/** Block rising up from the floor */
const flr = (bx:number, bw:number, bh:number): Obj =>
  ({ t:'block', wx:bx*B, wy:FLOOR_Y-bh*B, ww:bw*B, wh:bh*B });

/** Block hanging down from the ceiling */
const top = (bx:number, bw:number, bh:number): Obj =>
  ({ t:'block', wx:bx*B, wy:CEIL_Y, ww:bw*B, wh:bh*B });

/** Spike on the floor (points up) */
const fs = (bx:number, bw=1): Obj =>
  ({ t:'spike', wx:bx*B, wy:FLOOR_Y-B, ww:bw*B, wh:B });

/** Spike on the ceiling (points down) */
const cs = (bx:number, bw=1): Obj =>
  ({ t:'spike_d', wx:bx*B, wy:CEIL_Y, ww:bw*B, wh:B });

/** Speed portal */
const spd = (bx:number, k:SpK): Obj => {
  const wy = CEIL_Y, wh = FLOOR_Y - CEIL_Y;
  return { t: k==='fast'?'p_fast':'p_vfast', wx:bx*B, wy, ww:B, wh };
};
/** Mode portals */
const cub = (bx:number): Obj => ({ t:'p_cube', wx:bx*B, wy:CEIL_Y, ww:B, wh:FLOOR_Y-CEIL_Y });
const shp = (bx:number): Obj => ({ t:'p_ship', wx:bx*B, wy:CEIL_Y, ww:B, wh:FLOOR_Y-CEIL_Y });
const wav = (bx:number): Obj => ({ t:'p_wave', wx:bx*B, wy:CEIL_Y, ww:B, wh:FLOOR_Y-CEIL_Y });
/** Slope rising from floor (right triangle: flat at left, full height at right) */
const slp = (bx:number, bh=1): Obj => ({ t:'slope', wx:bx*B, wy:FLOOR_Y-bh*B, ww:B, wh:bh*B });

/* ── Level layout ─────────────────────────────────────────── */
/*
  Rules:
  - No obstacle before bx=14 (gives ~1.3s reaction at normal speed)
  - Never same bx for both floor AND ceiling obstacle (would create wall)
  - Stagger all gate pairs by 1-2 blocks
  Gap reference (ship hitbox = 22px with HIT inset):
    flr1+top1 staggered = 268px flyable (easy)
    flr2+top2 staggered = 176px (medium)
    flr3+top2 staggered = 130px (hard, fast section only)
*/
const LVL: Obj[] = [
  /* ── Normal speed ─ introduce controls ── */
  fs(14),                        // first obstacle: single floor spike
  cs(18),                        // ceiling spike (plenty of room)
  fs(22),                        // floor spike
  flr(26,2,1),                   // 1-high floor block (gentle bump)
  cs(29),                        // ceiling spike after block
  fs(33), cs(35),                // staggered spike pair (2 blocks apart)
  flr(39,2,2), top(41,1,2),     // staggered gate: floor 2 + ceil 2 → 176px gap
  cs(44,2),                      // 2-wide ceiling spike
  fs(48,2),                      // 2-wide floor spike
  flr(52,1,2), top(54,1,2),     // staggered gate → 176px gap

  spd(58,'fast'),

  /* ── Fast speed ─ tighter but fair ── */
  fs(61), cs(63),                // staggered (2 apart)
  top(66,2,2),                   // ceiling 2 deep
  flr(69,1,2),                   // floor 2 high (3 blocks after, NOT same x)
  fs(73), fs(74),                // 2 consecutive floor spikes
  cs(77), cs(78),                // 2 consecutive ceiling spikes
  flr(82,2,2), top(84,1,2),     // staggered gate → 176px
  cs(87,2), fs(89),              // staggered
  flr(92,1,3),                   // 3-high floor column
  top(95,1,3),                   // 3-deep ceiling (separate column)

  spd(99,'vfast'),

  /* ── Very fast ─ intense finale ── */
  cs(102,2), fs(104,2),          // staggered wide spikes (2 apart)
  flr(107,1,2), top(109,1,2),   // staggered gate → 176px
  cs(112), fs(114),              // staggered (2 apart)
  flr(117,2,2), top(119,2,2),   // wide staggered gate
  fs(123,3),                     // 3-wide floor spike row
  top(127,1,3), flr(129,1,3),   // final gate staggered → 130px (hard but fair)
  cs(132,2), fs(134,2),          // finale staggered spikes
];

const END_X = 138 * B;

/* ── Extra built-in levels ────────────────────────────────── */
/* Level 2 — Speed Surge (Medium) */
const LVL2: Obj[] = [
  fs(12), cs(15), fs(18), cs(20),
  flr(23,1,1), fs(25), cs(27),
  flr(30,2,2), top(32,1,2),
  fs(35), fs(36), cs(38),
  spd(40,'fast'),
  fs(43), cs(45), flr(48,1,2), top(50,1,2),
  fs(53), cs(55), fs(57), cs(59),
  flr(62,2,2), top(64,2,2),
  shp(67),
  flr(71,2,2), top(73,2,2),
  flr(77,1,3), top(79,1,2),
  flr(83,2,2), top(85,1,3),
  flr(89,2,2), top(91,2,2),
  cub(95),
  spd(97,'vfast'),
  fs(100), fs(101), cs(103), cs(104),
  flr(107,1,2), top(109,1,2),
  fs(112), cs(114), fs(116), cs(118),
  fs(121,2), cs(123,2),
];
const END_X2 = 127 * B;

/* Level 3 — The Corridor (Hard) */
const LVL3: Obj[] = [
  fs(12), cs(14), fs(16), cs(18),
  flr(21,1,2), top(23,1,2),
  fs(26), fs(27), cs(29), cs(30),
  spd(33,'fast'),
  flr(36,2,2), top(38,2,2),
  fs(42), cs(44), fs(46), cs(48),
  flr(51,1,3), top(53,1,2),
  shp(57),
  spd(59,'fast'),
  flr(62,2,2), top(64,2,2),
  flr(68,1,3), top(70,1,2),
  flr(74,2,2), top(76,1,3),
  flr(80,2,3), top(82,2,2),
  cub(86),
  spd(88,'vfast'),
  fs(91), fs(92), fs(93), cs(95), cs(96), cs(97),
  flr(100,1,2), top(102,1,2),
  fs(105), cs(107), fs(109), cs(111),
  flr(114,2,3), top(116,2,2),
  fs(120,2), cs(122,2), fs(124,2),
];
const END_X3 = 128 * B;

/* Level 4 — Spike Frenzy (Harder) */
const LVL4: Obj[] = [
  spd(10,'fast'),
  fs(13), cs(14), fs(16), cs(17),
  flr(20,1,2), top(22,1,2),
  fs(25), fs(26), cs(28), cs(29),
  flr(32,2,2), top(34,2,2),
  spd(38,'vfast'),
  fs(41), cs(42), fs(44), cs(45), fs(47), cs(48),
  shp(51),
  spd(53,'vfast'),
  flr(56,2,2), top(58,2,2),
  flr(62,1,3), top(64,1,2),
  flr(68,2,2), top(70,1,3),
  flr(74,2,3), top(76,2,2),
  cub(80),
  fs(83), fs(84), fs(85), cs(87), cs(88), cs(89),
  flr(92,1,2), top(94,1,2),
  fs(97), cs(98), fs(100), cs(101),
  shp(104),
  spd(106,'vfast'),
  flr(109,2,3), top(111,2,2),
  flr(115,1,3), top(117,1,3),
  flr(121,2,2), top(123,2,3),
];
const END_X4 = 127 * B;

/* Level 5 — Nightmare (Insane) */
const LVL5: Obj[] = [
  spd(9,'fast'),
  fs(12), cs(13), fs(15), cs(16), fs(18), cs(19),
  flr(22,1,2), top(24,1,2),
  fs(27), cs(28), fs(30), cs(31),
  spd(34,'vfast'),
  fs(37), fs(38), cs(40), cs(41), fs(43), cs(44),
  flr(47,1,2), top(49,1,2),
  fs(52), cs(53), fs(55), cs(56),
  shp(59),
  spd(61,'vfast'),
  flr(64,2,3), top(66,2,2),
  flr(70,1,3), top(72,1,3),
  flr(76,2,3), top(78,2,2),
  flr(82,1,3), top(84,1,3),
  cub(88),
  fs(91), cs(92), fs(94), cs(95), fs(97), cs(98),
  fs(101,2), cs(103,2), fs(105,2), cs(107,2),
  flr(110,2,3), top(112,2,2),
  shp(116),
  spd(118,'vfast'),
  flr(121,2,3), top(123,2,3),
  flr(127,1,3), top(129,1,3),
  flr(133,2,3), top(135,2,2),
];
const END_X5 = 139 * B;

/* Level 6 — Storm Zone (Demon) */
const LVL6: Obj[] = [
  flr(14,2,2), top(16,2,2),
  flr(20,1,3), top(22,1,2),
  flr(26,2,2), top(28,1,3),
  spd(32,'fast'),
  flr(35,2,3), top(37,2,2),
  flr(41,1,3), top(43,1,3),
  flr(47,2,2), top(49,1,3),
  cub(53),
  fs(56), cs(57), fs(59), cs(60), fs(62), cs(63),
  fs(66), fs(67), cs(69), cs(70),
  flr(73,1,2), top(75,1,2),
  fs(78,2), cs(80,2),
  spd(83,'vfast'),
  fs(86), cs(87), fs(89), cs(90), fs(92), cs(93),
  shp(96),
  flr(99,2,3), top(101,2,3),
  flr(105,1,3), top(107,1,3),
  flr(111,2,3), top(113,2,2),
  flr(117,1,3), top(119,1,3),
  cub(123),
  fs(126,2), cs(128,2), fs(130,2), cs(132,2),
  flr(135,1,2), top(137,1,2),
];
const END_X6 = 141 * B;

/* Level 7 — Chaos Engine (Easy Demon) */
const LVL7: Obj[] = [
  spd(8,'fast'),
  flr(12,2,2), top(14,2,2),
  flr(18,1,3), top(20,1,2),
  flr(24,2,3), top(26,2,2),
  cub(30),
  fs(33), cs(34), fs(36), cs(37), fs(39), cs(40),
  fs(43), fs(44), cs(46), cs(47),
  flr(50,2,3), top(52,2,2),
  spd(56,'vfast'),
  fs(59), cs(60), fs(62), cs(63), fs(65), cs(66), fs(68), cs(69),
  shp(72),
  flr(75,2,3), top(77,2,3),
  flr(81,1,3), top(83,1,3),
  flr(87,2,3), top(89,2,3),
  flr(93,1,3), top(95,1,3),
  cub(99),
  fs(102), cs(103), fs(105), cs(106), fs(108), cs(109), fs(111), cs(112),
  fs(115,3), cs(118,3),
  shp(122),
  flr(125,2,3), top(127,2,3),
  flr(131,1,3), top(133,1,3),
  flr(137,2,3), top(139,2,2),
];
const END_X7 = 143 * B;

/* Level 8 — Void Rush (Medium Demon) */
const LVL8: Obj[] = [
  spd(7,'fast'),
  flr(11,2,2), top(13,2,2),
  flr(17,1,3), top(19,1,2),
  flr(23,2,2), top(25,1,3),
  spd(29,'vfast'),
  flr(32,2,3), top(34,2,3),
  flr(38,1,3), top(40,1,3),
  cub(44),
  fs(47), cs(48), fs(50), cs(51), fs(53), cs(54),
  fs(57), cs(58), fs(60), cs(61), fs(63), cs(64),
  flr(67,2,3), top(69,2,2),
  fs(73,2), cs(75,2),
  shp(78),
  flr(81,2,3), top(83,2,3),
  flr(87,1,3), top(89,1,3),
  flr(93,2,3), top(95,2,3),
  flr(99,1,3), top(101,1,3),
  cub(105),
  fs(108,2), cs(110,2), fs(112,2), cs(114,2), fs(116,2), cs(118,2),
  flr(121,2,3), top(123,2,2),
  shp(127),
  flr(130,2,3), top(132,2,3),
  flr(136,1,3), top(138,1,3),
];
const END_X8 = 142 * B;

/* Level 9 — Death Wave (Insane Demon) */
const LVL9: Obj[] = [
  spd(6,'vfast'),
  flr(10,2,3), top(12,2,2),
  flr(16,1,3), top(18,1,3),
  flr(22,2,3), top(24,2,3),
  cub(28),
  fs(31), cs(32), fs(34), cs(35), fs(37), cs(38), fs(40), cs(41),
  fs(44,2), cs(46,2), fs(48,2), cs(50,2),
  shp(53),
  flr(56,2,3), top(58,2,3),
  flr(62,1,3), top(64,1,3),
  flr(68,2,3), top(70,2,3),
  flr(74,1,3), top(76,1,3),
  cub(80),
  fs(83), cs(84), fs(86), cs(87), fs(89), cs(90), fs(92), cs(93), fs(95), cs(96),
  fs(99,3), cs(102,3),
  flr(106,2,3), top(108,2,2),
  shp(112),
  flr(115,2,3), top(117,2,3),
  flr(121,1,3), top(123,1,3),
  flr(127,2,3), top(129,2,3),
  flr(133,1,3), top(135,1,3),
];
const END_X9 = 139 * B;

/* Level 10 — Endgame (Extreme Demon) */
const LVL10: Obj[] = [
  spd(5,'vfast'),
  flr(9,2,3), top(11,2,3),
  flr(15,1,3), top(17,1,3),
  flr(21,2,3), top(23,2,3),
  flr(27,1,3), top(29,1,3),
  cub(33),
  /* 6 clear blocks to land before first spike */
  fs(40), cs(41), fs(43), cs(44), fs(46), cs(47), fs(49), cs(50),
  fs(53), cs(54), fs(56), cs(57), fs(59), cs(60), fs(62), cs(63),
  shp(66),
  flr(69,2,3), top(71,2,3),
  flr(75,1,3), top(77,1,3),
  flr(81,2,3), top(83,2,3),
  flr(87,1,3), top(89,1,3),
  flr(93,2,3), top(95,2,3),
  cub(99),
  /* 6 clear blocks to land before first spike */
  fs(106), cs(107), fs(109), cs(110), fs(112), cs(113), fs(115), cs(116),
  fs(119,3), cs(122,3), fs(125,3), cs(128,3),
  shp(132),
  flr(135,2,3), top(137,2,3),
  flr(141,1,3), top(143,1,3),
  flr(147,2,3), top(149,2,3),
  flr(153,1,3), top(155,1,3),
  flr(159,2,3), top(161,2,3),
];
const END_X10 = 165 * B;

/* Level W — Wave Rider (Normal) — introduces wave + slopes */
const LVL_WAVE: Obj[] = [
  wav(10),                          // enter wave immediately
  fs(14), cs(16),                   // staggered spikes — weave through
  fs(19), cs(21),
  slp(24),                          // slope: deadly to wave!
  cub(27),                          // cube portal — respite
  slp(30), slp(31),                 // slopes act as ramps for cube
  fs(34), cs(36),
  wav(39),                          // back to wave
  fs(42), cs(43), fs(45), cs(46),   // tight weaving
  slp(49),                          // another deadly slope
  fs(52), cs(54),
  shp(57),                          // ship section
  slp(60), slp(62),                 // slopes as ramps for ship
  flr(65,1,2), top(67,1,2),
  wav(71),                          // wave finale
  fs(74), cs(75), fs(77), cs(78),
  slp(81),
  fs(84), cs(86),
];
const END_X_WAVE = 91 * B;

/* ── Difficulties (imported from GDStorage) ───────────────── */
const DIFFICULTIES = GD_DIFFICULTIES;

/* ── Built-in level registry ──────────────────────────────── */
interface BuiltinLevel { name:string; defaultDiff:number; objs:Obj[]; endX:number; themes:Theme[]; coinReq:number; }
const BUILTIN_LEVELS: BuiltinLevel[] = [
  { name:'Stereo Dash',  defaultDiff:0, coinReq:0,   objs:LVL,  endX:END_X,  themes:[
    { x:0,      sky1:'#0a1a3a', sky2:'#0a2a5a', ceil:'#081530', floor:'#081530', blk:'#0a2050', blkH:'#1a4080', grid:'rgba(100,180,255,0.06)' },
    { x:56*B,   sky1:'#1a0a3a', sky2:'#2a0a5a', ceil:'#120830', floor:'#120830', blk:'#200850', blkH:'#402080', grid:'rgba(180,100,255,0.06)' },
    { x:95*B,   sky1:'#1a0008', sky2:'#3a0010', ceil:'#150008', floor:'#150008', blk:'#300010', blkH:'#600020', grid:'rgba(255,80,120,0.07)'  },
  ]},
  { name:'Speed Surge',  defaultDiff:1, coinReq:0,   objs:LVL2, endX:END_X2, themes:[
    { x:0,      sky1:'#0a2a1a', sky2:'#0a3a2a', ceil:'#082018', floor:'#082018', blk:'#0a3020', blkH:'#1a6040', grid:'rgba(100,255,180,0.06)' },
    { x:50*B,   sky1:'#1a3a0a', sky2:'#2a4a0a', ceil:'#182008', floor:'#182008', blk:'#203010', blkH:'#406020', grid:'rgba(180,255,80,0.06)'  },
    { x:90*B,   sky1:'#0a2a10', sky2:'#0a3a18', ceil:'#082010', floor:'#082010', blk:'#0a2818', blkH:'#1a5030', grid:'rgba(80,255,150,0.07)'  },
  ]},
  { name:'The Corridor', defaultDiff:2, coinReq:0,   objs:LVL3, endX:END_X3, themes:[
    { x:0,      sky1:'#2a1a0a', sky2:'#3a2a0a', ceil:'#201508', floor:'#201508', blk:'#301a08', blkH:'#604010', grid:'rgba(255,180,80,0.06)'  },
    { x:50*B,   sky1:'#3a1a00', sky2:'#4a2a00', ceil:'#281200', floor:'#281200', blk:'#381800', blkH:'#703000', grid:'rgba(255,130,50,0.06)'  },
    { x:90*B,   sky1:'#2a0a00', sky2:'#3a1000', ceil:'#200800', floor:'#200800', blk:'#300c00', blkH:'#602000', grid:'rgba(255,80,30,0.07)'   },
  ]},
  { name:'Spike Frenzy', defaultDiff:3, coinReq:0,   objs:LVL4, endX:END_X4, themes:[
    { x:0,      sky1:'#1a0a2a', sky2:'#2a0a3a', ceil:'#120820', floor:'#120820', blk:'#180a30', blkH:'#381060', grid:'rgba(180,80,255,0.06)' },
    { x:50*B,   sky1:'#2a0a3a', sky2:'#3a0a4a', ceil:'#200830', floor:'#200830', blk:'#280840', blkH:'#501080', grid:'rgba(220,60,255,0.06)' },
    { x:90*B,   sky1:'#3a0a2a', sky2:'#4a0a3a', ceil:'#280820', floor:'#280820', blk:'#380830', blkH:'#701060', grid:'rgba(255,40,200,0.07)' },
  ]},
  { name:'Nightmare',    defaultDiff:4, coinReq:0,   objs:LVL5, endX:END_X5, themes:[
    { x:0,      sky1:'#0a0008', sky2:'#150010', ceil:'#080006', floor:'#080006', blk:'#150010', blkH:'#300020', grid:'rgba(200,0,100,0.07)'  },
    { x:55*B,   sky1:'#08000f', sky2:'#120018', ceil:'#060008', floor:'#060008', blk:'#100015', blkH:'#250035', grid:'rgba(150,0,255,0.07)'  },
    { x:95*B,   sky1:'#0a0000', sky2:'#180000', ceil:'#070000', floor:'#070000', blk:'#140000', blkH:'#2a0000', grid:'rgba(255,0,50,0.08)'   },
  ]},
  { name:'Storm Zone',   defaultDiff:5, coinReq:30,  objs:LVL6, endX:END_X6, themes:[
    { x:0,      sky1:'#001a2a', sky2:'#002a3a', ceil:'#001520', floor:'#001520', blk:'#003040', blkH:'#006080', grid:'rgba(0,200,255,0.07)'  },
    { x:55*B,   sky1:'#001a3a', sky2:'#00284a', ceil:'#001228', floor:'#001228', blk:'#002840', blkH:'#005080', grid:'rgba(0,150,255,0.07)'  },
    { x:95*B,   sky1:'#00102a', sky2:'#001838', ceil:'#000c1e', floor:'#000c1e', blk:'#001830', blkH:'#003060', grid:'rgba(0,100,220,0.08)'  },
  ]},
  { name:'Chaos Engine', defaultDiff:6, coinReq:75,  objs:LVL7, endX:END_X7, themes:[
    { x:0,      sky1:'#2a0800', sky2:'#3a1000', ceil:'#200600', floor:'#200600', blk:'#3a0800', blkH:'#701800', grid:'rgba(255,120,0,0.07)' },
    { x:55*B,   sky1:'#3a0a00', sky2:'#4a1400', ceil:'#280700', floor:'#280700', blk:'#480a00', blkH:'#882000', grid:'rgba(255,80,0,0.07)'  },
    { x:95*B,   sky1:'#2a0600', sky2:'#400c00', ceil:'#1e0400', floor:'#1e0400', blk:'#3c0600', blkH:'#701200', grid:'rgba(255,50,0,0.08)' },
  ]},
  { name:'Void Rush',    defaultDiff:7, coinReq:150, objs:LVL8, endX:END_X8, themes:[
    { x:0,      sky1:'#000520', sky2:'#000830', ceil:'#000318', floor:'#000318', blk:'#000828', blkH:'#001050', grid:'rgba(40,0,255,0.08)'  },
    { x:55*B,   sky1:'#050020', sky2:'#080030', ceil:'#030015', floor:'#030015', blk:'#060020', blkH:'#100040', grid:'rgba(80,0,255,0.08)'  },
    { x:95*B,   sky1:'#080018', sky2:'#100025', ceil:'#060012', floor:'#060012', blk:'#0a0020', blkH:'#140040', grid:'rgba(120,0,255,0.09)' },
  ]},
  { name:'Death Wave',   defaultDiff:8, coinReq:300, objs:LVL9, endX:END_X9, themes:[
    { x:0,      sky1:'#1a0018', sky2:'#280022', ceil:'#120012', floor:'#120012', blk:'#220018', blkH:'#440030', grid:'rgba(255,0,200,0.08)' },
    { x:50*B,   sky1:'#200010', sky2:'#300018', ceil:'#18000c', floor:'#18000c', blk:'#280010', blkH:'#500020', grid:'rgba(255,0,120,0.08)' },
    { x:90*B,   sky1:'#180020', sky2:'#260030', ceil:'#100018', floor:'#100018', blk:'#1e0028', blkH:'#3c0050', grid:'rgba(200,0,255,0.09)' },
  ]},
  { name:'Wave Rider',   defaultDiff:1, coinReq:0,   objs:LVL_WAVE, endX:END_X_WAVE, themes:[
    { x:0,      sky1:'#1a1a00', sky2:'#2a2a00', ceil:'#121200', floor:'#121200', blk:'#222200', blkH:'#555500', grid:'rgba(255,255,0,0.07)'  },
    { x:40*B,   sky1:'#1a0a00', sky2:'#2a1500', ceil:'#120700', floor:'#120700', blk:'#201000', blkH:'#503000', grid:'rgba(255,150,0,0.07)'  },
    { x:70*B,   sky1:'#0a1a00', sky2:'#142a00', ceil:'#081200', floor:'#081200', blk:'#102000', blkH:'#255000', grid:'rgba(150,255,0,0.07)'  },
  ]},
  { name:'Endgame',      defaultDiff:9, coinReq:600, objs:LVL10,endX:END_X10,themes:[
    { x:0,      sky1:'#050000', sky2:'#0a0000', ceil:'#030000', floor:'#030000', blk:'#0f0000', blkH:'#1e0000', grid:'rgba(255,0,0,0.06)'   },
    { x:55*B,   sky1:'#040002', sky2:'#080004', ceil:'#020001', floor:'#020001', blk:'#0c0003', blkH:'#180006', grid:'rgba(200,0,50,0.07)'  },
    { x:95*B,   sky1:'#030005', sky2:'#06000a', ceil:'#020003', floor:'#020003', blk:'#080008', blkH:'#120012', grid:'rgba(150,0,100,0.08)' },
  ]},
];

/* ── Section themes ───────────────────────────────────────── */
interface Theme { x:number; sky1:string; sky2:string; ceil:string; floor:string; blk:string; blkH:string; grid:string; }

/* ── Particles ────────────────────────────────────────────── */
interface Part { x:number; y:number; vx:number; vy:number; life:number; ml:number; col:string; sz:number; }

/* ═════════════════════════════════════════════════════════════ */
export class GeometryDash {
  private _g!: Game;
  private _wrap!: HTMLDivElement;
  private _canvas!: HTMLCanvasElement;
  private _ctx!: CanvasRenderingContext2D;
  private _raf = 0;
  private _lastTs = 0;

  private _over     = false;
  private _won      = false;
  private _attempts = 0;

  /* player state */
  private _px = 0;
  private _py = 0;
  private _vy = 0;
  private _prevPy  = 0;
  private _holding = false;
  private _speed: SpK = 'norm';
  private _mode:    'ship'|'cube'|'wave' = 'ship';
  private _onFloor  = false;

  /* coins */
  private _collectedCoins = new Set<number>();

  /* custom level */
  private _customLevel: GDLevel|null = null;
  private _fromBrowser  = false;
  private _builtinLevelIdx = 0;
  private _activeObjs: Obj[] = [];

  /* multiplayer */
  private _mp: MultiplayerManager | null = null;
  private _otherPlayers = new Map<string, {px:number;py:number;mode:string;name:string;color:string}>();

  private _parts: Part[] = [];
  private _trail: {x:number;y:number}[] = [];

  private _ac: AudioContext|null = null;

  constructor(g: Game, customLevel?: GDLevel, fromBrowser = false, mp?: MultiplayerManager) {
    this._g = g;
    g.ui.innerHTML = '';
    // inMiniGame is set to true when gameplay actually starts (not here, so menu cursor works)

    this._fromBrowser = fromBrowser;
    if (customLevel) {
      this._customLevel = customLevel;
      this._activeObjs  = customLevel.objects as unknown as Obj[];
    } else {
      this._activeObjs = BUILTIN_LEVELS[0].objs;
    }

    /* Multiplayer setup */
    if (mp) {
      this._mp = mp;
      mp.onGdPos = (id, name, color, px, py, mode) => {
        this._otherPlayers.set(id, { px, py, mode, name, color });
      };
      mp.onDisconnect = (id) => this._otherPlayers.delete(id);
      if (mp.isHost) {
        // Send level to any joiner who connects while we're playing
        mp.onConnect = () => mp.sendGdLevel(this._customLevel as object | null);
      }
    }

    this._wrap = document.createElement('div');
    this._wrap.style.cssText =
      'position:fixed;inset:0;background:#000;display:flex;align-items:center;' +
      'justify-content:center;pointer-events:all;user-select:none;touch-action:none;z-index:9999;';
    g.ui.appendChild(this._wrap);

    this._canvas = document.createElement('canvas');
    this._canvas.width  = W;
    this._canvas.height = H;
    this._canvas.style.cssText = 'display:none;image-rendering:pixelated;';
    this._wrap.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d')!;

    window.addEventListener('resize', this._fitCanvas);
    document.addEventListener('visibilitychange', this._onVisibility);

    if (customLevel || mp) {
      /* Skip menu — start directly (custom level OR multiplayer) */
      this._canvas.style.display = 'block';
      this._fitCanvas();
      this._reset();
      g.inMiniGame = true;
      setTimeout(() => {
        window.addEventListener('pointerdown', this._onDown);
        window.addEventListener('pointerup',   this._onUp);
        window.addEventListener('keydown', this._onKey);
        window.addEventListener('keyup',   this._onKey);
      }, 80);
      this._raf = requestAnimationFrame(this._loop);
    } else {
      this._showMenu();
    }
  }

  /* ── GD Main Menu ─────────────────────────────────────────── */
  private _showMenu(): void {
    const name = this._g.state.username || 'Player';
    const starCoins = gdGetStarCoins();

    const menu = document.createElement('div');
    menu.id = 'gd-menu';
    menu.style.cssText = [
      'position:absolute;inset:0;overflow:hidden;',
      'display:flex;flex-direction:column;align-items:center;',
      'font-family:"Arial Black",Arial,sans-serif;',
      'background:#6a0000;',
    ].join('');

    /* ── Tiled background blocks (GD red panel pattern) ── */
    menu.innerHTML = `
      <style>
        #gd-menu {
          background-color: #700000;
          background-image:
            linear-gradient(rgba(0,0,0,0.28) 2px, transparent 2px),
            linear-gradient(90deg, rgba(0,0,0,0.28) 2px, transparent 2px),
            linear-gradient(rgba(0,0,0,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.12) 1px, transparent 1px);
          background-size: 64px 64px, 64px 64px, 16px 16px, 16px 16px;
        }
        #gd-menu * { box-sizing:border-box; }
        .gd-icon-btn {
          display:flex;flex-direction:column;align-items:center;
          cursor:pointer;user-select:none;
        }
        .gd-diamond {
          width:90px;height:90px;
          display:flex;align-items:center;justify-content:center;
          border-radius:8px;
          transition:transform 0.1s;
        }
        .gd-diamond:hover { transform:scale(1.08); }
        .gd-diamond:active { transform:scale(0.96); }
        .gd-bot-btn {
          width:54px;height:54px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;border:3px solid rgba(0,0,0,0.3);
          transition:transform 0.1s;font-size:22px;
        }
        .gd-bot-btn:hover { transform:scale(1.1); }
      </style>

      <!-- scattered dark decorative blocks -->
      ${[
        [3,8,7,5],[68,12,5,8],[82,5,4,6],[90,20,6,4],[5,72,8,5],
        [75,70,5,7],[40,80,6,4],[55,15,4,5],[20,55,5,6],[62,45,7,4],
        [12,30,4,8],[85,50,4,5],[30,65,8,4],[48,5,5,6],[70,35,4,5],
      ].map(([x,y,w,h])=>
        `<div style="position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;
          background:rgba(0,0,0,0.22);border-radius:4px;pointer-events:none;"></div>`
      ).join('')}

      <!-- ✕ Back button -->
      <div id="gd-back" style="
        position:absolute;top:10px;left:10px;z-index:10;
        width:38px;height:38px;border-radius:50%;
        background:linear-gradient(135deg,#cc0000,#880000);
        border:3px solid #ff4444;
        display:flex;align-items:center;justify-content:center;
        cursor:pointer;font-size:18px;font-weight:900;color:white;
        box-shadow:0 3px 0 #440000;
        font-family:Arial,sans-serif;
      ">✕</div>

      <!-- Title -->
      <div style="
        margin-top:18px;
        font-size:clamp(28px,6vw,52px);
        color:#7fff00;
        letter-spacing:3px;
        text-shadow:
          3px 3px 0 #3a7a00,
          5px 5px 0 #1a4000,
          -2px -2px 0 #000,
          2px -2px 0 #000,
          -2px 2px 0 #000,
          2px  2px 0 #000;
        line-height:1;
        z-index:1;
      ">GEOMETRY DASH</div>

      <!-- Profile strip (left) -->
      <div style="
        position:absolute;left:12px;top:80px;
        display:flex;flex-direction:column;gap:6px;z-index:1;
      ">
        <!-- controls pills -->
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="background:#aaa;color:#222;font-size:11px;font-weight:900;
            border-radius:20px;padding:2px 10px;font-family:Arial,sans-serif;">L</div>
          <span style="color:white;font-size:12px;font-family:Arial,sans-serif;">Mouse</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="background:#aaa;color:#222;font-size:11px;font-weight:900;
            border-radius:20px;padding:2px 10px;font-family:Arial,sans-serif;">A</div>
          <span style="color:white;font-size:12px;font-family:Arial,sans-serif;">Click</span>
        </div>
        <div style="color:#ffcc00;font-size:12px;font-weight:bold;margin-top:2px;
          font-family:Arial,sans-serif;text-transform:uppercase;">${name}</div>
        <!-- avatar -->
        <div id="gd-profile-btn" style="
          width:52px;height:52px;border-radius:50%;
          background:linear-gradient(135deg,#3366ff,#1133cc);
          border:3px solid #88aaff;
          display:flex;align-items:center;justify-content:center;
          font-size:26px;margin-top:4px;cursor:pointer;
        " title="View Profile">👤</div>
        <!-- star coins -->
        <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
          <canvas id="gd-sc-icon" width="16" height="16" style="display:inline-block;"></canvas>
          <span style="color:#FFD700;font-size:12px;font-weight:bold;font-family:Arial,sans-serif;">${starCoins}</span>
        </div>
      </div>

      <!-- DAILY chest (right) -->
      <div id="gd-daily" style="
        position:absolute;right:14px;top:80px;z-index:1;
        display:flex;flex-direction:column;align-items:center;gap:4px;
        cursor:pointer;
      ">
        <div style="
          width:64px;height:64px;border-radius:10px;
          background:linear-gradient(135deg,#ffcc00,#cc8800);
          border:3px solid #ffee66;
          display:flex;align-items:center;justify-content:center;
          font-size:34px;
          box-shadow:0 4px 0 #885500;
        ">🎁</div>
        <div style="
          background:linear-gradient(135deg,#ffcc00,#cc8800);
          color:#3a0000;font-size:11px;font-weight:900;
          padding:2px 8px;border-radius:10px;
          font-family:'Arial Black',Arial,sans-serif;
          letter-spacing:1px;
        ">DAILY</div>
      </div>

      <!-- 3 center icon buttons -->
      <div style="
        display:flex;align-items:center;gap:18px;
        margin-top:24px;z-index:1;
      ">
        <!-- Cube icon (left) -->
        <div class="gd-icon-btn" id="gd-skin-btn">
          <div class="gd-diamond" style="
            background:linear-gradient(135deg,#ffcc00,#cc8800);
            border:3px solid #ffee66;
            box-shadow:0 5px 0 #885500;
            flex-direction:column;gap:2px;
          ">
            <!-- robot face -->
            <div id="gd-skin-emoji" style="font-size:40px;line-height:1;">${getEquippedCubeSkin().emoji || '🤖'}</div>
          </div>
          <div style="
            color:white;font-size:12px;margin-top:6px;
            background:rgba(0,0,0,0.4);border-radius:20px;
            padding:2px 12px;font-family:Arial,sans-serif;
          ">X</div>
        </div>

        <!-- PLAY button (center — biggest) -->
        <div class="gd-icon-btn" id="gd-play-wrap">
          <div class="gd-diamond" id="gd-play" style="
            width:116px;height:116px;
            background:linear-gradient(135deg,#44ff44,#22cc00);
            border:4px solid #88ff88;
            box-shadow:0 6px 0 #116600;
            position:relative;
          ">
            <!-- cross arms -->
            <div style="
              position:absolute;
              width:100%;height:32%;
              background:linear-gradient(135deg,#44ff44,#22cc00);
              top:34%;left:0;border-radius:4px;
            "></div>
            <div style="
              position:absolute;
              width:32%;height:100%;
              background:linear-gradient(135deg,#44ff44,#22cc00);
              top:0;left:34%;border-radius:4px;
            "></div>
            <!-- play triangle -->
            <div style="
              position:relative;z-index:2;
              width:0;height:0;
              border-top:22px solid transparent;
              border-bottom:22px solid transparent;
              border-left:36px solid white;
              filter:drop-shadow(2px 2px 2px rgba(0,0,0,0.4));
              margin-left:6px;
            "></div>
          </div>
          <!-- small play label -->
          <div style="
            margin-top:8px;
            background:rgba(0,0,0,0.4);border-radius:20px;
            padding:2px 14px;
            display:flex;align-items:center;gap:4px;
          ">
            <div style="width:0;height:0;
              border-top:6px solid transparent;border-bottom:6px solid transparent;
              border-left:10px solid white;"></div>
          </div>
        </div>

        <!-- Tools icon (right) -->
        <div class="gd-icon-btn" id="gd-tools">
          <div class="gd-diamond" style="
            background:linear-gradient(135deg,#ffcc00,#cc8800);
            border:3px solid #ffee66;
            box-shadow:0 5px 0 #885500;
          ">
            <div style="font-size:42px;line-height:1;">⚒️</div>
          </div>
          <div style="
            color:white;font-size:12px;margin-top:6px;
            background:rgba(0,0,0,0.4);border-radius:20px;
            padding:2px 12px;font-family:Arial,sans-serif;
          ">Y</div>
        </div>
      </div>

      <!-- bottom icon row -->
      <div style="
        position:absolute;bottom:14px;left:50%;transform:translateX(-50%);
        display:flex;gap:10px;z-index:1;
        background:rgba(0,0,0,0.3);border-radius:40px;padding:8px 18px;
      ">
        ${[['🏆','#cc9900',''],['⚙️','#888800',''],['📊','#009900',''],['🎵','#cc6600',''],['🛡️','#0066cc',''],['🌐','#006699','gd-mp']]
          .map(([icon, bg, id]) => `<div class="gd-bot-btn"${id ? ` id="${id}"` : ''} style="background:linear-gradient(135deg,${bg},${bg}88);">${icon}</div>`)
          .join('')}
      </div>

      <!-- MORE GAMES (bottom right) -->
      <div style="
        position:absolute;bottom:14px;right:14px;z-index:1;
        background:linear-gradient(135deg,#cc6600,#884400);
        border:3px solid #ffaa44;border-radius:10px;
        padding:8px 12px;text-align:center;cursor:pointer;
        box-shadow:0 4px 0 #442200;
      ">
        <div style="color:#ffdd88;font-size:11px;font-weight:900;
          font-family:'Arial Black',Arial,sans-serif;line-height:1.2;">MORE<br>GAMES</div>
      </div>
    `;

    this._wrap.appendChild(menu);

    /* Back → exit to arcade */
    menu.querySelector<HTMLElement>('#gd-back')!.onclick = () => this._exit();

    /* Draw star coin icon next to count */
    const scIcon = menu.querySelector<HTMLCanvasElement>('#gd-sc-icon');
    if (scIcon) {
      const ic = scIcon.getContext('2d')!;
      _drawStarCoin(ic, 8, 8, 7);
    }

    /* Profile button */
    menu.querySelector<HTMLElement>('#gd-profile-btn')!.onclick = () => {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);font-family:Arial,sans-serif;';
      const renderProfile = () => {
        const sc = gdGetStarCoins();
        const desc = gdGetProfileDesc();
        modal.innerHTML = `
          <div style="background:#1a1a2e;border:2px solid rgba(255,255,255,0.15);border-radius:16px;
            padding:24px;max-width:340px;width:90%;display:flex;flex-direction:column;align-items:center;gap:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
              <span style="color:#ffcc00;font-size:17px;font-weight:900;">👤 PROFILE</span>
              <div id="prof-close" style="cursor:pointer;color:white;font-size:20px;opacity:0.6;">✕</div>
            </div>
            <!-- Avatar -->
            <div style="width:72px;height:72px;border-radius:50%;
              background:linear-gradient(135deg,#3366ff,#1133cc);border:3px solid #88aaff;
              display:flex;align-items:center;justify-content:center;font-size:36px;">👤</div>
            <!-- Name -->
            <div style="color:#ffcc00;font-size:20px;font-weight:900;letter-spacing:1px;">${name}</div>
            <!-- Star coins -->
            <div style="display:flex;align-items:center;gap:8px;
              background:rgba(255,204,0,0.1);border:1px solid rgba(255,204,0,0.3);
              border-radius:20px;padding:6px 18px;">
              <canvas id="prof-sc-icon" width="22" height="22"></canvas>
              <span style="color:#ffcc00;font-size:18px;font-weight:900;">${sc}</span>
              <span style="color:rgba(255,204,0,0.6);font-size:12px;">Star Coins</span>
            </div>
            <!-- Description -->
            <div style="width:100%;">
              <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-bottom:4px;">ABOUT ME</div>
              <textarea id="prof-desc" maxlength="120" style="width:100%;box-sizing:border-box;
                background:rgba(255,255,255,0.07);color:white;border:1px solid rgba(255,255,255,0.2);
                border-radius:8px;padding:8px;font-size:13px;resize:none;height:70px;outline:none;
                font-family:Arial,sans-serif;">${desc}</textarea>
            </div>
            <button id="prof-save" style="background:#ffcc00;color:#3a0000;border:none;
              border-radius:10px;padding:8px 28px;font-weight:900;font-size:14px;cursor:pointer;">
              Save
            </button>
          </div>`;
        modal.querySelector('#prof-close')!.addEventListener('click', () => modal.remove());
        modal.querySelector('#prof-save')!.addEventListener('click', () => {
          const t = (modal.querySelector('#prof-desc') as HTMLTextAreaElement).value;
          gdSetProfileDesc(t);
          modal.remove();
        });
        const profIcon = modal.querySelector<HTMLCanvasElement>('#prof-sc-icon');
        if (profIcon) { const ic2 = profIcon.getContext('2d')!; _drawStarCoin(ic2, 11, 11, 10); }
      };
      renderProfile();
      menu.appendChild(modal);
    };

    /* Tools → search or create levels */
    menu.querySelector<HTMLElement>('#gd-tools')!.onclick = () => {
      const modal = document.createElement('div');
      modal.style.cssText = [
        'position:absolute;inset:0;z-index:20;',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;',
        'background:rgba(0,0,0,0.72);font-family:"Arial Black",Arial,sans-serif;',
      ].join('');
      modal.innerHTML = `
        <div style="font-size:22px;color:#ffcc00;letter-spacing:2px;text-shadow:2px 2px 0 #3a1800;">
          ⚒️ LEVELS
        </div>
        <div style="color:rgba(255,255,255,0.6);font-size:13px;font-family:Arial,sans-serif;
          text-align:center;max-width:260px;line-height:1.5;">
          What do you want to do?
        </div>
        <button id="gd-search-lvl" style="
          width:240px;padding:14px;border-radius:14px;border:none;cursor:pointer;
          background:linear-gradient(135deg,#0077cc,#0044aa);
          color:white;font-size:16px;font-weight:900;
          font-family:'Arial Black',Arial,sans-serif;
          box-shadow:0 5px 0 #002266;
          display:flex;align-items:center;justify-content:center;gap:10px;
        ">
          🔍 Search Published Levels
        </button>
        <button id="gd-create-lvl" style="
          width:240px;padding:14px;border-radius:14px;border:none;cursor:pointer;
          background:linear-gradient(135deg,#cc6600,#884400);
          color:white;font-size:16px;font-weight:900;
          font-family:'Arial Black',Arial,sans-serif;
          box-shadow:0 5px 0 #442200;
          display:flex;align-items:center;justify-content:center;gap:10px;
        ">
          🛠️ Create &amp; Publish Level
        </button>
        <button id="gd-lvl-close" style="
          margin-top:4px;background:transparent;border:none;
          color:rgba(255,255,255,0.4);font-size:13px;cursor:pointer;
          font-family:Arial,sans-serif;
        ">✕ Cancel</button>
      `;
      menu.appendChild(modal);

      modal.querySelector<HTMLElement>('#gd-lvl-close')!.onclick = () => modal.remove();
      modal.querySelector<HTMLElement>('#gd-search-lvl')!.onclick = () => {
        this._cleanup();
        import('./GDLevelBrowser').then(m => new m.GDLevelBrowser(this._g, 'published'));
      };
      modal.querySelector<HTMLElement>('#gd-create-lvl')!.onclick = () => {
        this._cleanup();
        import('./GDLevelBrowser').then(m => new m.GDLevelBrowser(this._g, 'mine'));
      };
    };

    /* Multiplayer → open lobby */
    menu.querySelector<HTMLElement>('#gd-mp')!.onclick = () => {
      this._cleanup();
      import('./GDMultiplayerLobby').then(m => new m.GDMultiplayerLobby(this._g));
    };

    /* Skin button → open skin picker */
    menu.querySelector<HTMLElement>('#gd-skin-btn')!.onclick = () => {
      const modal = document.createElement('div');
      modal.style.cssText = [
        'position:absolute;inset:0;z-index:20;',
        'display:flex;flex-direction:column;align-items:center;justify-content:center;',
        'background:rgba(0,0,0,0.82);font-family:Arial,sans-serif;',
      ].join('');

      const renderModal = (activeTab: 'cube'|'ship') => {
        const cubeSkin = getEquippedCubeSkin();
        const shipSkin = getEquippedShipSkin();
        modal.innerHTML = `
          <div style="background:#1a1a2e;border:2px solid rgba(255,255,255,0.15);
            border-radius:16px;padding:20px;max-width:480px;width:90%;max-height:80vh;
            display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#ffcc00;font-size:18px;font-weight:900;">🎨 SKINS</span>
              <div id="skin-close" style="cursor:pointer;color:white;font-size:20px;opacity:0.6;">✕</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button id="skin-tab-cube" style="flex:1;padding:8px;border-radius:8px;border:none;cursor:pointer;
                font-weight:bold;font-size:13px;
                background:${activeTab==='cube'?'#ffcc00':'rgba(255,255,255,0.1)'};
                color:${activeTab==='cube'?'#3a0000':'white'};">🟦 Cubes</button>
              <button id="skin-tab-ship" style="flex:1;padding:8px;border-radius:8px;border:none;cursor:pointer;
                font-weight:bold;font-size:13px;
                background:${activeTab==='ship'?'#ffcc00':'rgba(255,255,255,0.1)'};
                color:${activeTab==='ship'?'#3a0000':'white'};">🚀 Ships</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;overflow-y:auto;">
              ${activeTab === 'cube'
                ? CUBE_SKINS.map(s => `
                  <div class="skin-card" data-id="${s.id}" data-tab="cube" style="
                    background:${s.bg};border:3px solid ${s.id===cubeSkin.id?'#ffcc00':s.border};
                    border-radius:10px;padding:8px 4px;text-align:center;cursor:pointer;
                    box-shadow:${s.id===cubeSkin.id?'0 0 12px #ffcc00':''};
                  ">
                    <div style="font-size:24px;">${s.emoji || '🟦'}</div>
                    <div style="color:white;font-size:10px;font-weight:bold;margin-top:4px;
                      text-shadow:0 1px 2px rgba(0,0,0,0.8);">${s.name}</div>
                    ${s.id===cubeSkin.id?'<div style="color:#ffcc00;font-size:9px;">✔ Equipped</div>':''}
                  </div>`).join('')
                : SHIP_SKINS.map(s => `
                  <div class="skin-card" data-id="${s.id}" data-tab="ship" style="
                    background:${s.body};border:3px solid ${s.id===shipSkin.id?'#ffcc00':s.accent};
                    border-radius:10px;padding:8px 4px;text-align:center;cursor:pointer;
                    box-shadow:${s.id===shipSkin.id?'0 0 12px #ffcc00':''};
                  ">
                    <div style="font-size:24px;">${s.emoji}</div>
                    <div style="color:white;font-size:10px;font-weight:bold;margin-top:4px;
                      text-shadow:0 1px 2px rgba(0,0,0,0.8);">${s.name}</div>
                    ${s.id===shipSkin.id?'<div style="color:#ffcc00;font-size:9px;">✔ Equipped</div>':''}
                  </div>`).join('')
              }
            </div>
          </div>
        `;
        modal.querySelector('#skin-close')!.addEventListener('click', () => modal.remove());
        modal.querySelector('#skin-tab-cube')!.addEventListener('click', () => renderModal('cube'));
        modal.querySelector('#skin-tab-ship')!.addEventListener('click', () => renderModal('ship'));
        modal.querySelectorAll('.skin-card').forEach(card => {
          card.addEventListener('click', () => {
            const id  = (card as HTMLElement).dataset.id!;
            const tab = (card as HTMLElement).dataset.tab!;
            if (tab === 'cube') {
              setEquippedCubeSkin(id);
              const skinEmoji = CUBE_SKINS.find(s => s.id === id)?.emoji || '🤖';
              const emojiEl = menu.querySelector<HTMLElement>('#gd-skin-emoji');
              if (emojiEl) emojiEl.textContent = skinEmoji;
            } else {
              setEquippedShipSkin(id);
            }
            renderModal(tab as 'cube'|'ship');
          });
        });
      };

      renderModal('cube');
      menu.appendChild(modal);
    };

    /* Daily chests */
    menu.querySelector<HTMLElement>('#gd-daily')!.onclick = () => {
      const SMALL_KEY = 'gd_chest_small';
      const BIG_KEY   = 'gd_chest_big';
      const SMALL_CD  = 20 * 60 * 1000;   // 20 min
      const BIG_CD    = 60 * 60 * 1000;   // 1 hour

      const modal = document.createElement('div');
      modal.style.cssText = 'position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);font-family:Arial,sans-serif;';

      const renderChests = () => {
        const now = Date.now();
        const smallReady = now - (+( localStorage.getItem(SMALL_KEY) ?? 0)) >= SMALL_CD;
        const bigReady   = now - (+(  localStorage.getItem(BIG_KEY)  ?? 0)) >= BIG_CD;
        const smallLeft  = Math.max(0, SMALL_CD - (now - (+(localStorage.getItem(SMALL_KEY) ?? 0))));
        const bigLeft    = Math.max(0, BIG_CD   - (now - (+(localStorage.getItem(BIG_KEY)   ?? 0))));
        const fmt = (ms: number) => {
          const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
          return m > 0 ? `${m}m ${s}s` : `${s}s`;
        };

        const chestBtn = (ready: boolean, timeLeft: number, emoji: string, label: string, rewards: string) => `
          <div style="background:#1a1a2e;border:2px solid rgba(255,255,255,0.15);border-radius:16px;padding:20px;
            display:flex;flex-direction:column;align-items:center;gap:10px;min-width:160px;">
            <div style="font-size:52px;filter:${ready ? 'none' : 'grayscale(0.7)'};">${emoji}</div>
            <div style="color:#ffcc00;font-weight:900;font-size:14px;">${label}</div>
            <div style="color:rgba(255,255,255,0.6);font-size:11px;">${rewards}</div>
            ${ready
              ? `<button class="chest-open" data-chest="${label}" style="background:#ffcc00;color:#3a0000;border:none;
                  border-radius:10px;padding:8px 18px;font-weight:900;font-size:13px;cursor:pointer;">OPEN!</button>`
              : `<div style="color:rgba(255,255,255,0.5);font-size:12px;">⏳ ${fmt(timeLeft)}</div>
                 <button class="chest-ad" data-chest="${label}" style="background:rgba(255,50,50,0.3);color:#ff8888;
                   border:1px solid #ff4444;border-radius:10px;padding:6px 14px;font-size:11px;cursor:pointer;">
                   📺 Skip (watch ad)</button>`
            }
          </div>`;

        modal.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:16px;max-width:420px;width:90%;">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
              <span style="color:#ffcc00;font-size:18px;font-weight:900;">🎁 DAILY CHESTS</span>
              <div id="daily-close" style="cursor:pointer;color:white;font-size:20px;opacity:0.6;">✕</div>
            </div>
            <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
              ${chestBtn(smallReady, smallLeft, '📦', 'Small', '5–15 coins')}
              ${chestBtn(bigReady,   bigLeft,   '🪙', 'Big',   '20–50 coins')}
            </div>
            <div style="color:rgba(255,255,255,0.3);font-size:10px;">Small resets every 20 min · Big resets every 1 hour</div>
          </div>`;

        modal.querySelector('#daily-close')!.addEventListener('click', () => modal.remove());

        modal.querySelectorAll('.chest-open').forEach(btn => {
          btn.addEventListener('click', () => {
            const isBig = (btn as HTMLElement).dataset.chest === 'Big';
            const reward = isBig
              ? 20 + Math.floor(Math.random() * 31)   // 20-50
              : 5  + Math.floor(Math.random() * 11);  // 5-15
            localStorage.setItem(isBig ? BIG_KEY : SMALL_KEY, String(Date.now()));
            gdAddStarCoins(reward);
            modal.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;">
                <div style="font-size:64px;">${isBig ? '🤑' : '😄'}</div>
                <div style="color:#ffcc00;font-size:24px;font-weight:900;">+${reward} coins!</div>
                <button id="daily-done" style="background:#ffcc00;color:#3a0000;border:none;
                  border-radius:12px;padding:10px 28px;font-weight:900;font-size:14px;cursor:pointer;">Nice!</button>
              </div>`;
            modal.querySelector('#daily-done')!.addEventListener('click', () => { modal.remove(); });
          });
        });

        modal.querySelectorAll('.chest-ad').forEach(btn => {
          btn.addEventListener('click', () => {
            const isBig = (btn as HTMLElement).dataset.chest === 'Big';

            const ADS = [
              { bg:'#ff0000', emoji:'▶️', brand:'YouTube', title:'Top 10 Geometry Dash fails #shorts', sub:'GDClips • 4.2M views', body:'Watch people die on level 1 for 8 minutes straight', pill:'#ff0000' },
              { bg:'#1a1a2e', emoji:'🛒', brand:'SPONSOR', title:'RAID: Shadow Legends', sub:'Sponsored • Install now', body:'The most ambitious mobile RPG of all time. 150,000 heroes. 47 currencies. 0 fun.', pill:'#4444ff' },
              { bg:'#0f0f0f', emoji:'▶️', brand:'YouTube', title:'I played Geometry Dash for 1000 hours (emotional)', sub:'DashBro • 892K views', body:'"This game ruined my life and I have never been happier"', pill:'#ff0000' },
              { bg:'#1db954', emoji:'🎵', brand:'Spotify', title:'Premium — 3 months FREE*', sub:'*then $9.99/mo forever lol', body:'Listen to music without ads! (except this ad, and the next one)', pill:'#1db954' },
              { bg:'#ff6600', emoji:'🍕', brand:'DoorDash', title:'Get food delivered to your door!', sub:'Service fee + delivery fee + tip + tax + sadness fee', body:'$2 off your first order of $47 or more', pill:'#ff6600' },
              { bg:'#1a1a2e', emoji:'▶️', brand:'YouTube Premium', title:'Tired of ads? Subscribe!', sub:'Only $13.99/month', body:'You are currently watching an ad about paying to not watch ads.', pill:'#ff0000' },
              { bg:'#0f0f0f', emoji:'▶️', brand:'YouTube', title:'GEOMETRY DASH WORLD RECORD - ALMOST (gone wrong)', sub:'ProDasher99 • 12M views', body:'14 minutes of someone breathing into a mic and failing the last 2%', pill:'#ff0000' },
            ];
            const ad = ADS[Math.floor(Math.random() * ADS.length)];
            let t = 5;

            const showAd = () => {
              modal.innerHTML = `
                <div style="position:relative;width:100%;height:100%;background:${ad.bg};
                  display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;">
                  <!-- fake video area -->
                  <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;">
                    <div style="font-size:64px;">${ad.emoji}</div>
                    <div style="color:white;font-size:16px;font-weight:900;max-width:320px;">${ad.title}</div>
                    <div style="color:rgba(255,255,255,0.5);font-size:11px;">${ad.sub}</div>
                    <div style="color:rgba(255,255,255,0.7);font-size:12px;max-width:300px;font-style:italic;">"${ad.body}"</div>
                  </div>
                  <!-- YouTube-style bottom bar -->
                  <div style="background:rgba(0,0,0,0.8);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div style="background:${ad.pill};color:white;font-size:10px;font-weight:900;
                        padding:3px 8px;border-radius:4px;">${ad.brand}</div>
                      <div style="color:rgba(255,255,255,0.8);font-size:11px;max-width:180px;
                        overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${ad.title}</div>
                    </div>
                    <div id="ad-skip-zone"></div>
                  </div>
                  <!-- fake progress bar -->
                  <div style="height:3px;background:rgba(255,255,255,0.2);">
                    <div id="ad-progress" style="height:100%;background:${ad.pill};width:0%;transition:width 1s linear;"></div>
                  </div>
                </div>`;

              setTimeout(() => {
                const bar = modal.querySelector<HTMLElement>('#ad-progress');
                if (bar) bar.style.width = '100%';
                bar!.style.transitionDuration = `${t}s`;
              }, 50);

              const iv = setInterval(() => {
                t--;
                const zone = modal.querySelector<HTMLElement>('#ad-skip-zone');
                if (!zone) { clearInterval(iv); return; }
                if (t <= 0) {
                  clearInterval(iv);
                  zone.innerHTML = `<button id="ad-skip" style="background:#ffcc00;color:#3a0000;border:none;
                    border-radius:6px;padding:6px 14px;font-weight:900;font-size:12px;cursor:pointer;">Skip Ad ✕</button>`;
                  modal.querySelector('#ad-skip')!.addEventListener('click', () => {
                    localStorage.setItem(isBig ? BIG_KEY : SMALL_KEY, '0');
                    renderChests();
                  });
                } else {
                  zone.innerHTML = `<div style="color:rgba(255,255,255,0.4);font-size:11px;">Skip in ${t}s</div>`;
                }
              }, 1000);
            };

            showAd();
          });
        });
      };

      renderChests();
      menu.appendChild(modal);
    };

    /* Play → level select */
    const startLevel = (idx: number) => {
      this._builtinLevelIdx = idx;
      this._customLevel = null;
      this._activeObjs = BUILTIN_LEVELS[idx].objs;
      menu.remove();
      this._canvas.style.display = 'block';
      this._fitCanvas();
      this._reset();
      this._g.inMiniGame = true;
      setTimeout(() => {
        window.addEventListener('pointerdown', this._onDown);
        window.addEventListener('pointerup',   this._onUp);
        window.addEventListener('keydown', this._onKey);
        window.addEventListener('keyup',   this._onKey);
      }, 80);
      this._raf = requestAnimationFrame(this._loop);
    };
    const startCustomLevel = (lvl: GDLevel) => {
      this._customLevel = lvl;
      menu.remove();
      this._canvas.style.display = 'block';
      this._fitCanvas();
      this._reset();
      this._g.inMiniGame = true;
      setTimeout(() => {
        window.addEventListener('pointerdown', this._onDown);
        window.addEventListener('pointerup',   this._onUp);
        window.addEventListener('keydown', this._onKey);
        window.addEventListener('keyup',   this._onKey);
      }, 80);
      this._raf = requestAnimationFrame(this._loop);
    };

    menu.querySelector<HTMLElement>('#gd-play')!.onclick = () => {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:absolute;inset:0;z-index:20;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.88);font-family:Arial,sans-serif;';

      const renderLevelSelect = () => {
        const featuredEntries = getFeaturedEntries();
        const allLevels = gdLoadAll();
        const playerCoins = gdGetStarCoins();
        modal.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:14px;max-width:520px;width:95%;max-height:90vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
              <span style="color:#ffcc00;font-size:18px;font-weight:900;">🎮 SELECT LEVEL</span>
              <div id="lvlsel-close" style="cursor:pointer;color:white;font-size:20px;opacity:0.6;">✕</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;width:100%;">
              ${BUILTIN_LEVELS.map((lvl, i) => {
                const ratingKey = `gd_rating_${i}`;
                const userDiffIdx = localStorage.getItem(ratingKey);
                const diff = userDiffIdx !== null ? DIFFICULTIES[+userDiffIdx] : DIFFICULTIES[lvl.defaultDiff];
                const locked = lvl.coinReq > 0 && playerCoins < lvl.coinReq;
                return `
                  <div style="background:${locked?'#111':'#1a1a2e'};border:2px solid ${locked?'rgba(255,200,0,0.2)':'rgba(255,255,255,0.1)'};border-radius:12px;
                    padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:${locked?'0.75':'1'};">
                    ${locked ? `<div style="font-size:18px;">🔒</div>` : ''}
                    <div style="color:white;font-weight:900;font-size:13px;">${lvl.name}</div>
                    <div style="background:${diff.color}22;border:1px solid ${diff.color};
                      color:${diff.color};font-size:10px;font-weight:bold;padding:2px 8px;border-radius:20px;">
                      ${diff.emoji} ${diff.name}</div>
                    ${lvl.coinReq > 0 ? `<div style="color:#ffcc00;font-size:10px;">🪙 ${lvl.coinReq} coins</div>` : ''}
                    ${locked
                      ? `<div style="background:#333;color:#888;border:none;border-radius:10px;padding:7px 18px;font-size:13px;width:100%;text-align:center;">🔒 Locked</div>`
                      : `<button class="lvl-rate" data-idx="${i}"
                          style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.15);
                          border-radius:8px;padding:3px 10px;font-size:10px;cursor:pointer;">⭐ Rate</button>
                        <button class="lvl-play" data-idx="${i}"
                          style="background:#22cc00;color:white;border:none;border-radius:10px;
                          padding:7px 18px;font-weight:900;font-size:13px;cursor:pointer;width:100%;">PLAY ▶</button>`
                    }
                  </div>`;
              }).join('')}
              ${featuredEntries.map(entry => {
                const l = allLevels.find(lv => lv.id === entry.id);
                if (!l) return '';
                const ri = localStorage.getItem(`gd_rating_lvl_${l.id}`);
                const diff = ri !== null ? DIFFICULTIES[+ri] : DIFFICULTIES[0];
                const locked = entry.req > 0 && playerCoins < entry.req;
                return `
                  <div style="background:${locked?'#111':'#1a2e1a'};border:2px solid ${locked?'rgba(255,200,0,0.2)':'rgba(100,255,100,0.2)'};border-radius:12px;
                    padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:8px;opacity:${locked?'0.75':'1'};">
                    <div style="color:#aaffaa;font-size:9px;font-weight:bold;opacity:0.7;">CUSTOM</div>
                    ${locked ? `<div style="font-size:18px;">🔒</div>` : ''}
                    <div style="color:white;font-weight:900;font-size:13px;text-align:center;">${l.name}</div>
                    <div style="color:rgba(255,255,255,0.4);font-size:10px;">by ${l.authorName}</div>
                    <div style="background:${diff.color}22;border:1px solid ${diff.color};
                      color:${diff.color};font-size:10px;font-weight:bold;padding:2px 8px;border-radius:20px;">
                      ${diff.emoji} ${diff.name}</div>
                    ${entry.req > 0 ? `<div style="color:#ffcc00;font-size:10px;">🪙 ${entry.req} coins</div>` : ''}
                    ${locked
                      ? `<div style="background:#333;color:#888;border:none;border-radius:10px;padding:7px 18px;font-size:13px;width:100%;text-align:center;">🔒 Locked</div>`
                      : `<button class="lvl-play-custom" data-id="${l.id}"
                          style="background:#22cc00;color:white;border:none;border-radius:10px;
                          padding:7px 18px;font-weight:900;font-size:13px;cursor:pointer;width:100%;">PLAY ▶</button>`
                    }
                  </div>`;
              }).join('')}
            </div>
          </div>`;

        modal.querySelector('#lvlsel-close')!.addEventListener('click', () => modal.remove());

        modal.querySelectorAll('.lvl-play').forEach(btn => {
          btn.addEventListener('click', () => {
            modal.remove();
            startLevel(+(btn as HTMLElement).dataset.idx!);
          });
        });

        modal.querySelectorAll('.lvl-play-custom').forEach(btn => {
          btn.addEventListener('click', () => {
            const lvl = gdLoadAll().find(l => l.id === (btn as HTMLElement).dataset.id);
            if (!lvl) return;
            modal.remove();
            startCustomLevel(lvl);
          });
        });

        modal.querySelectorAll('.lvl-rate').forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = +(btn as HTMLElement).dataset.idx!;
            const ratingKey = `gd_rating_${idx}`;
            const current = +(localStorage.getItem(ratingKey) ?? BUILTIN_LEVELS[idx].defaultDiff);
            /* difficulty picker */
            const picker = document.createElement('div');
            picker.style.cssText = 'position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.9);';
            picker.innerHTML = `
              <div style="background:#1a1a2e;border:2px solid rgba(255,255,255,0.15);border-radius:16px;
                padding:20px;max-width:360px;width:90%;display:flex;flex-direction:column;gap:10px;">
                <div style="color:#ffcc00;font-size:16px;font-weight:900;">Rate: ${BUILTIN_LEVELS[idx].name}</div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                  ${DIFFICULTIES.map((d, di) => `
                    <button class="diff-pick" data-di="${di}" style="
                      background:${di===current?d.color+'33':'rgba(255,255,255,0.05)'};
                      border:2px solid ${di===current?d.color:'rgba(255,255,255,0.1)'};
                      color:${di===current?d.color:'rgba(255,255,255,0.7)'};
                      border-radius:8px;padding:7px 14px;font-size:12px;font-weight:bold;cursor:pointer;text-align:left;">
                      ${d.emoji} ${d.name}</button>`).join('')}
                </div>
                <button id="diff-cancel" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);
                  border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px;font-size:12px;cursor:pointer;">Cancel</button>
              </div>`;
            picker.querySelector('#diff-cancel')!.addEventListener('click', () => picker.remove());
            picker.querySelectorAll('.diff-pick').forEach(pb => {
              pb.addEventListener('click', () => {
                localStorage.setItem(ratingKey, (pb as HTMLElement).dataset.di!);
                picker.remove();
                renderLevelSelect();
              });
            });
            modal.appendChild(picker);
          });
        });
      };

      renderLevelSelect();
      menu.appendChild(modal);
    };
  }

  /* ── Fit 800×450 to window ───────────────────────────────── */
  private _fitCanvas = (): void => {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    this._canvas.style.width  = `${W * s}px`;
    this._canvas.style.height = `${H * s}px`;
  };

  /* ── Reset ───────────────────────────────────────────────── */
  private _reset(): void {
    this._attempts++;
    this._speed   = 'norm';
    this._trail   = [];
    this._parts   = [];
    this._over    = false;
    this._won     = false;
    this._holding = false;
    this._vy      = 0;
    this._px      = SCR_X - B * 3;
    this._collectedCoins.clear();
    if (this._customLevel) {
      /* Custom level starts in cube mode at the floor */
      this._mode    = 'cube';
      this._py      = FLOOR_Y - P;
      this._onFloor = true;
      this._activeObjs = this._customLevel.objects as unknown as Obj[];
    } else {
      /* Built-in level: ship, centered in corridor */
      this._mode    = 'ship';
      this._py      = (FLOOR_Y + CEIL_Y) / 2 - P / 2;
      this._onFloor = false;
      this._activeObjs = BUILTIN_LEVELS[this._builtinLevelIdx].objs;
    }
    this._prevPy = this._py;
  }

  /* ── Input ───────────────────────────────────────────────── */
  private _onVisibility = (): void => {
    if (!document.hidden) this._lastTs = 0; // reset timer so dt doesn't spike on return
  };

  private _onDown = (): void => {
    if (this._over) return;
    if (!this._ac) try { this._ac = new AudioContext(); } catch(_) {}
    this._holding = true;
    if (this._mode === 'cube') {
      if (this._onFloor) { this._vy = CUBE_JUMP; this._onFloor = false; }
    }
  };
  private _onUp = (): void => { this._holding = false; };
  private _onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') { this._exit(); return; }
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (e.type === 'keydown') {
        if (!this._ac) try { this._ac = new AudioContext(); } catch(_) {}
        this._holding = true;
        if (this._mode === 'cube') {
          if (this._onFloor && !this._over) { this._vy = CUBE_JUMP; this._onFloor = false; }
        }
      } else {
        this._holding = false;
      }
    }
  };

  /* ── Loop ────────────────────────────────────────────────── */
  private _loop = (ts: number): void => {
    if (!this._raf) return;
    const dt = Math.min(0.05, (ts - (this._lastTs || ts)) / 1000);
    this._lastTs = ts;
    if (!this._over) this._update(dt);
    this._draw();
    this._raf = requestAnimationFrame(this._loop);
  };

  /* ── Physics ─────────────────────────────────────────────── */
  private _update(dt: number): void {
    /* advance */
    this._px += SPD[this._speed] * dt;

    /* portals */
    for (const o of this._activeObjs) {
      const cx = o.wx + B / 2;
      if (Math.abs(this._px - cx) > B * 0.7) continue;
      if (o.t === 'p_fast')  this._speed = 'fast';
      if (o.t === 'p_vfast') this._speed = 'vfast';
      if (o.t === 'p_cube' && this._mode !== 'cube') {
        this._mode = 'cube'; this._vy = 0; this._onFloor = false;
      }
      if (o.t === 'p_ship' && this._mode !== 'ship') {
        this._mode = 'ship'; this._holding = false;
        this._vy = 0;
        /* centre player in the corridor so they don't spawn inside a block */
        this._py = (CEIL_Y + FLOOR_Y) / 2 - P / 2;
      }
      if (o.t === 'p_wave' && this._mode !== 'wave') {
        this._mode = 'wave'; this._vy = 0;
        this._py = (CEIL_Y + FLOOR_Y) / 2 - P / 2;
      }
    }

    /* physics by mode */
    this._prevPy = this._py;
    if (this._mode === 'ship') {
      if (this._holding) this._vy -= UP_AC * dt;
      else               this._vy += GRAV * dt;
      this._vy = Math.max(-MAX_VY, Math.min(MAX_VY, this._vy));
      this._py += this._vy * dt;
      if (this._py + P >= FLOOR_Y) { this._py = FLOOR_Y - P; this._vy = 0; }
      if (this._py <= CEIL_Y)      { this._py = CEIL_Y;       this._vy = 0; }
    } else if (this._mode === 'wave') {
      /* wave: constant diagonal — hold = up, release = down, dies on any surface */
      this._vy = this._holding ? -WAVE_SPD : WAVE_SPD;
      this._py += this._vy * dt;
      if (this._py <= CEIL_Y || this._py + P >= FLOOR_Y) { this._die(); return; }
    } else {
      /* cube */
      this._vy += CUBE_GRAV * dt;
      this._vy  = Math.min(this._vy, MAX_VY);
      this._py += this._vy * dt;
      if (this._py <= CEIL_Y) { this._die(); return; }
      if (this._py + P >= FLOOR_Y) {
        this._py = FLOOR_Y - P; this._vy = 0; this._onFloor = true;
      } else {
        this._onFloor = false;
      }
    }

    /* obstacle collisions */
    if (!this._collide()) return;

    /* cube auto-jump while holding */
    if (this._mode === 'cube' && this._holding && this._onFloor) {
      this._vy = CUBE_JUMP; this._onFloor = false;
    }

    /* trail */
    this._trail.unshift({ x: SCR_X, y: this._py + P / 2 });
    if (this._trail.length > 22) this._trail.pop();

    /* particles */
    for (let i = this._parts.length - 1; i >= 0; i--) {
      const p = this._parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 350 * dt; p.life -= dt;
      if (p.life <= 0) this._parts.splice(i, 1);
    }

    /* ship engine particles */
    if (this._mode === 'ship' && this._holding && Math.random() < 0.4) {
      this._parts.push({
        x: SCR_X - P / 2 - 4, y: this._py + P / 2 + (Math.random() - 0.5) * 10,
        vx: -80 - Math.random() * 100, vy: (Math.random() - 0.5) * 60,
        life: 0.25, ml: 0.25, col: Math.random() < 0.5 ? '#ff8800' : '#ffcc00', sz: 4 + Math.random() * 4,
      });
    }
    /* wave trail particles */
    if (this._mode === 'wave' && Math.random() < 0.5) {
      this._parts.push({
        x: SCR_X, y: this._py + P / 2 + (Math.random() - 0.5) * 8,
        vx: -50 - Math.random() * 70, vy: (Math.random() - 0.5) * 40,
        life: 0.2, ml: 0.2, col: Math.random() < 0.5 ? '#ffff00' : '#ff8800', sz: 2 + Math.random() * 3,
      });
    }

    /* broadcast multiplayer position */
    this._mp?.sendGdPos(this._px, this._py, this._mode);

    /* win */
    if (this._customLevel) {
      if (this._activeObjs.length) {
        const lastX = Math.max(...this._activeObjs.map(o => o.wx + o.ww));
        if (this._px >= lastX + B * 5) this._win();
      }
    } else {
      if (this._px - SCR_X + W >= BUILTIN_LEVELS[this._builtinLevelIdx].endX) this._win();
    }
  }

  private _camX(): number { return this._px - SCR_X; }

  /* ── Collision (returns false = died) ────────────────────── */
  private _collide(): boolean {
    const cam = this._camX();
    const HIT = 5;
    const pl = this._px - P/2 + HIT, pr = this._px + P/2 - HIT;
    const pt = this._py + HIT,        pb = this._py + P - HIT;

    for (let oi = 0; oi < this._activeObjs.length; oi++) {
      const o = this._activeObjs[oi];
      if (o.t === 'p_fast' || o.t === 'p_vfast' || o.t === 'p_cube' || o.t === 'p_ship' || o.t === 'p_wave') continue;
      if (o.wx + o.ww < cam - B || o.wx > cam + W + B) continue;

      /* coin collection (non-deadly) */
      if (o.t === 'coin' && !this._collectedCoins.has(oi)) {
        const coinCx = o.wx + o.ww/2, coinCy = o.wy + o.wh/2;
        const dx = (this._px) - coinCx, dy = (this._py + P/2) - coinCy;
        if (Math.abs(dx) < P/2 + 8 && Math.abs(dy) < P/2 + 8) {
          this._collectedCoins.add(oi);
          gdAddStarCoins(1);
        }
        continue;
      }

      const ol = o.wx, or_ = o.wx + o.ww;
      const ot = o.wy, ob_ = o.wy + o.wh;

      if (pl >= or_ || pr <= ol || pt >= ob_ || pb <= ot) continue;

      if (o.t === 'block') {
        if (this._mode === 'wave') { this._die(); return false; }
        if (this._mode === 'cube') {
          /* Land on top: cube was above block top, OR block is a floor block (touches FLOOR_Y) */
          const isFloorBlock = ob_ >= FLOOR_Y - 2;
          if (this._vy >= 0 && (this._prevPy <= ot + 2 || isFloorBlock)) {
            this._py = ot - P;
            this._vy = 0;
            this._onFloor = true;
            continue; // landed safely — keep checking others
          }
        } else if (this._mode === 'ship') {
          /* Ship lands on top of block */
          if (this._vy >= 0 && this._prevPy <= ot + 2) {
            this._py = ot - P; this._vy = 0;
            continue;
          }
          /* Ship bumps off underside of block */
          if (this._vy < 0 && this._prevPy + P >= ob_ - 2) {
            this._py = ob_; this._vy = 0;
            continue;
          }
        }
        this._die(); return false;
      } else if (o.t === 'slope') {
        /* slope: triangle from bottom-left (o.wx, FLOOR_Y) to top-right (o.wx+o.ww, o.wy) */
        if (this._mode === 'wave') { this._die(); return false; }
        /* surface y at player centre x */
        const pcx = this._px;
        if (pcx < ol || pcx > or_) continue;
        const sY = ob_ - o.wh * (pcx - ol) / (or_ - ol);
        const pb2 = this._py + P;
        if (pb2 >= sY - 2) {
          if (this._prevPy + P <= sY + 6) {
            /* landed on slope surface from above */
            this._py = sY - P; this._vy = 0;
            if (this._mode === 'cube') this._onFloor = true;
            continue;
          }
          this._die(); return false;
        }
      } else if (o.t === 'spike') {
        const sh = 10;
        if (pl+sh < or_-sh && pr-sh > ol+sh && pb > ot+sh) { this._die(); return false; }
      } else if (o.t === 'spike_d') {
        const sh = 10;
        if (pl+sh < or_-sh && pr-sh > ol+sh && pt < ob_-sh) { this._die(); return false; }
      }
    }
    return true;
  }

  /* ── Death / Win ─────────────────────────────────────────── */
  private _die(): void {
    if (this._over) return;
    this._over = true;
    this._sfx('die');
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, spd = 60 + Math.random() * 220;
      this._parts.push({
        x: SCR_X, y: this._py + P/2,
        vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 60,
        life: 0.9, ml: 0.9,
        col: ['#00ccff','#ffffff','#ffcc00','#0088ff'][Math.floor(Math.random()*4)],
        sz: 3 + Math.random() * 5,
      });
    }
    setTimeout(() => { this._reset(); }, 1100);
  }

  private _win(): void {
    if (this._won) return;
    this._won = true; this._over = true;
    this._sfx('win');
    const coins = Math.max(3, 8 - Math.floor(this._attempts / 3));
    gdAddStarCoins(coins);
    this._showWin(coins);
  }

  /* ── Sound ───────────────────────────────────────────────── */
  private _sfx(t: 'die'|'win'|'spd'): void {
    try {
      if (!this._ac) this._ac = new AudioContext();
      const ac = this._ac, ts = ac.currentTime;
      if (t === 'die') {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(300, ts); o.frequency.exponentialRampToValueAtTime(60, ts+0.4);
        g.gain.setValueAtTime(0.28, ts); g.gain.exponentialRampToValueAtTime(0.001, ts+0.45);
        o.connect(g); g.connect(ac.destination); o.start(ts); o.stop(ts+0.45);
      } else if (t === 'spd') {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(600, ts); o.frequency.exponentialRampToValueAtTime(1000, ts+0.1);
        g.gain.setValueAtTime(0.15, ts); g.gain.exponentialRampToValueAtTime(0.001, ts+0.15);
        o.connect(g); g.connect(ac.destination); o.start(ts); o.stop(ts+0.15);
      } else {
        [523,659,784,1047].forEach((f,i) => {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = 'square'; o.frequency.value = f;
          const s = ts + i * 0.13;
          g.gain.setValueAtTime(0.15, s); g.gain.exponentialRampToValueAtTime(0.001, s+0.22);
          o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s+0.22);
        });
      }
    } catch(_) {}
  }

  /* ── Render ──────────────────────────────────────────────── */
  private _draw(): void {
    const c = this._ctx;
    const cam = this._camX();
    const lvlMeta = this._customLevel ? null : BUILTIN_LEVELS[this._builtinLevelIdx];
    const endX = lvlMeta ? lvlMeta.endX : END_X;
    const themes = lvlMeta ? lvlMeta.themes : BUILTIN_LEVELS[0].themes;
    const pct = Math.min(1, Math.max(0, (this._px - SCR_X) / endX));

    /* theme */
    let th = themes[0];
    for (const t of themes) { if (this._px - SCR_X >= t.x) th = t; }

    /* ── Sky ── */
    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, th.sky1); sky.addColorStop(1, th.sky2);
    c.fillStyle = sky; c.fillRect(0, 0, W, H);

    /* ── Grid lines ── */
    c.strokeStyle = th.grid; c.lineWidth = 1;
    const gx = cam % B;
    for (let x = -gx; x < W + B; x += B) {
      c.beginPath(); c.moveTo(x, CEIL_Y); c.lineTo(x, FLOOR_Y); c.stroke();
    }
    for (let y = CEIL_Y + (CORRIDOR % B); y < FLOOR_Y; y += B) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }

    /* ── Ceiling platform ── */
    c.fillStyle = th.ceil;
    c.fillRect(0, 0, W, CEIL_Y);
    /* bright bottom edge */
    c.fillStyle = 'rgba(100,200,255,0.5)';
    c.fillRect(0, CEIL_Y - 2, W, 2);
    /* inner grid lines on ceiling */
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let x = -gx; x < W + B; x += B) {
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CEIL_Y); c.stroke();
    }

    /* ── Floor platform ── */
    c.fillStyle = th.floor;
    c.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
    /* bright top edge */
    c.fillStyle = 'rgba(100,200,255,0.5)';
    c.fillRect(0, FLOOR_Y, W, 2);
    c.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let x = -gx; x < W + B; x += B) {
      c.beginPath(); c.moveTo(x, FLOOR_Y); c.lineTo(x, H); c.stroke();
    }

    /* ── Level objects ── */
    const isEndgame = !this._customLevel && this._builtinLevelIdx === 9;
    const canSeeBlocks = !isEndgame || this._g.state.username === '67GOD';
    this._activeObjs.forEach((o, oi) => {
      const sx = o.wx - cam;
      if (sx + o.ww < -B || sx > W + B) return;
      /* coins always visible; other objects obey canSeeBlocks */
      if (o.t === 'coin') {
        if (this._collectedCoins.has(oi)) return;
        const cx = sx + o.ww/2, cy = o.wy + o.wh/2, r = 13;
        c.save();
        /* glow */
        const gl = c.createRadialGradient(cx, cy, 2, cx, cy, r+8);
        gl.addColorStop(0, 'rgba(255,220,0,0.5)'); gl.addColorStop(1, 'transparent');
        c.fillStyle = gl; c.beginPath(); c.arc(cx, cy, r+8, 0, Math.PI*2); c.fill();
        _drawStarCoin(c, cx, cy, r);
        c.restore();
        return;
      }
      if (!canSeeBlocks) return;
      this._drawObj(c, o, sx, th);
    });

    /* ── Trail ── */
    for (let i = 1; i < this._trail.length; i++) {
      const tr = this._trail[i];
      const alpha = (1 - i / this._trail.length) * 0.35;
      const s = (P - 4) * (1 - i / this._trail.length * 0.6);
      c.fillStyle = `rgba(0,200,255,${alpha})`;
      c.fillRect(tr.x - s/2, tr.y - s/2, s, s);
    }

    /* ── Particles ── */
    for (const p of this._parts) {
      c.globalAlpha = Math.max(0, p.life / p.ml);
      c.fillStyle = p.col;
      c.fillRect(p.x - p.sz/2, p.y - p.sz/2, p.sz, p.sz);
    }
    c.globalAlpha = 1;

    /* ── Other players (multiplayer ghosts) ── */
    for (const [, p] of this._otherPlayers) {
      const sx = p.px - cam;
      if (sx < -B * 2 || sx > W + B * 2) continue;
      c.save();
      c.globalAlpha = 0.82;
      if (p.mode === 'cube') {
        /* draw cube ghost */
        c.translate(sx, p.py + P / 2);
        c.rotate((p.px / B) * (Math.PI / 2));
        c.fillStyle = p.color;
        c.fillRect(-P/2, -P/2, P, P);
        c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5;
        c.strokeRect(-P/2+4, -P/2+4, P-8, P-8);
        c.beginPath();
        c.moveTo(-P/2+4,-P/2+4); c.lineTo(P/2-4,P/2-4);
        c.moveTo(P/2-4,-P/2+4); c.lineTo(-P/2+4,P/2-4);
        c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1;
        c.stroke();
      } else {
        /* draw ship ghost */
        c.translate(sx, p.py + P / 2);
        const tilt = 0; // no tilt for ghosts
        c.rotate(tilt);
        c.fillStyle = p.color;
        c.beginPath();
        c.moveTo( P/2,     0);
        c.lineTo(-P/2 + 6, -P/2 + 5);
        c.lineTo(-P/2 + 6,  P/2 - 5);
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = 'rgba(200,240,255,0.6)';
        c.beginPath(); c.ellipse(P/6, 0, 5, 4, 0, 0, Math.PI*2); c.fill();
      }
      c.restore();
      /* name label */
      c.font = 'bold 9px Arial'; c.fillStyle = p.color; c.textAlign = 'center';
      c.globalAlpha = 0.9;
      c.fillText(p.name, sx, p.py - 5);
      c.globalAlpha = 1; c.textAlign = 'left';
    }

    /* ── Player ── */
    if (!this._over || this._won) {
      if (this._mode === 'cube') this._drawCube(c);
      else if (this._mode === 'wave') this._drawWave(c);
      else this._drawShip(c);
    }

    /* ── HUD: progress bar (GD style, top) ── */
    const BAR_Y = 8, BAR_H = 7, MARGIN = 55;
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.fillRect(MARGIN, BAR_Y, W - MARGIN*2, BAR_H);
    const fw = (W - MARGIN*2) * pct;
    if (fw > 0) {
      const bg = c.createLinearGradient(MARGIN, 0, MARGIN + fw, 0);
      bg.addColorStop(0, '#00ccff'); bg.addColorStop(1, '#0055ff');
      c.fillStyle = bg; c.fillRect(MARGIN, BAR_Y, fw, BAR_H);
    }
    c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1;
    c.strokeRect(MARGIN, BAR_Y, W - MARGIN*2, BAR_H);

    /* percentage */
    c.font = 'bold 11px Arial'; c.fillStyle = 'rgba(255,255,255,0.85)';
    c.textAlign = 'center';
    c.fillText(`${Math.floor(pct * 100)}%`, W/2, BAR_Y + BAR_H + 13);

    /* attempt */
    c.textAlign = 'right'; c.font = 'bold 11px Arial';
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillText(`Attempt ${this._attempts}`, W - 10, 18);

    /* mode label */
    c.textAlign = 'left'; c.fillStyle = 'rgba(0,200,255,0.7)';
    c.fillText(this._mode === 'cube' ? '🟩 CUBE' : this._mode === 'wave' ? '〰️ WAVE' : '🚀 SHIP', 10, 18);

    /* star coin counter */
    _drawStarCoin(c, 18, 42, 8);
    c.font = 'bold 11px Arial'; c.fillStyle = '#ffcc00'; c.textAlign = 'left';
    c.fillText(`${gdGetStarCoins()}`, 30, 46);

    /* ESC */
    c.font = '10px Arial'; c.fillStyle = 'rgba(255,255,255,0.2)';
    c.textAlign = 'right';
    c.fillText('ESC = back', W - 10, H - 6);

    /* death flash */
    if (this._over && !this._won) {
      const fl = this._parts[0] ? this._parts[0].life / this._parts[0].ml : 0;
      c.fillStyle = `rgba(0,120,255,${Math.min(0.45, fl * 0.6)})`;
      c.fillRect(0, 0, W, H);
    }

    c.textAlign = 'left';
  }

  /* ── Draw obstacle ────────────────────────────────────────── */
  private _drawObj(c: CanvasRenderingContext2D, o: Obj, sx: number, th: Theme): void {
    const y = o.wy, w = o.ww, h = o.wh;

    if (o.t === 'block') {
      c.fillStyle = th.blk;
      c.fillRect(sx, y, w, h);
      /* top highlight */
      c.fillStyle = th.blkH;
      c.fillRect(sx, y, w, 3);
      /* inner grid */
      c.strokeStyle = 'rgba(255,255,255,0.06)'; c.lineWidth = 1;
      for (let bx = sx; bx < sx + w; bx += B) {
        c.beginPath(); c.moveTo(bx, y); c.lineTo(bx, y+h); c.stroke();
      }
      for (let by = y; by < y + h; by += B) {
        c.beginPath(); c.moveTo(sx, by); c.lineTo(sx+w, by); c.stroke();
      }
      /* outline */
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
      c.strokeRect(sx, y, w, h);

    } else if (o.t === 'spike') {
      const cols = Math.round(w / B);
      for (let i = 0; i < cols; i++) {
        const lx = sx + i*B, mx = lx + B/2;
        c.fillStyle = '#00eecc';
        c.beginPath(); c.moveTo(lx+3, y+h); c.lineTo(mx, y+2); c.lineTo(lx+B-3, y+h); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.stroke();
      }

    } else if (o.t === 'spike_d') {
      const cols = Math.round(w / B);
      for (let i = 0; i < cols; i++) {
        const lx = sx + i*B, mx = lx + B/2;
        c.fillStyle = '#00eecc';
        c.beginPath(); c.moveTo(lx+3, y); c.lineTo(mx, y+h-2); c.lineTo(lx+B-3, y); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; c.stroke();
      }

    } else if (o.t === 'p_fast' || o.t === 'p_vfast') {
      const col = o.t === 'p_fast' ? '#ff8800' : '#ff0044';
      c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.roundRect(sx+2, y+4, w-4, h-8, 4); c.stroke();
      c.fillStyle = col + '18'; c.fill();
      c.font = 'bold 10px Arial'; c.fillStyle = col; c.textAlign = 'center';
      c.fillText(o.t==='p_fast'?'FAST':'VFAST', sx+w/2, y+h/2+4);
      c.textAlign = 'left';
    } else if (o.t === 'p_cube') {
      c.strokeStyle = '#00ff88'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(sx+3, y+4, w-6, h-8, 4); c.stroke();
      c.fillStyle = 'rgba(0,255,136,0.12)'; c.fill();
      c.font = 'bold 10px Arial'; c.fillStyle = '#00ff88'; c.textAlign = 'center';
      c.fillText('CUBE', sx+w/2, y+h/2+4); c.textAlign = 'left';
    } else if (o.t === 'p_ship') {
      c.strokeStyle = '#ff44ff'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(sx+3, y+4, w-6, h-8, 4); c.stroke();
      c.fillStyle = 'rgba(255,68,255,0.12)'; c.fill();
      c.font = 'bold 10px Arial'; c.fillStyle = '#ff44ff'; c.textAlign = 'center';
      c.fillText('SHIP', sx+w/2, y+h/2+4); c.textAlign = 'left';
    } else if (o.t === 'p_wave') {
      c.strokeStyle = '#ffff00'; c.lineWidth = 2;
      c.beginPath(); c.roundRect(sx+3, y+4, w-6, h-8, 4); c.stroke();
      c.fillStyle = 'rgba(255,255,0,0.12)'; c.fill();
      c.font = 'bold 10px Arial'; c.fillStyle = '#ffff00'; c.textAlign = 'center';
      c.fillText('WAVE', sx+w/2, y+h/2+4); c.textAlign = 'left';
    } else if (o.t === 'slope') {
      /* right triangle: bottom-left → bottom-right → top-right */
      c.fillStyle = th.blk;
      c.beginPath();
      c.moveTo(sx,     y + h); // bottom-left (floor level)
      c.lineTo(sx + w, y + h); // bottom-right
      c.lineTo(sx + w, y);     // top-right
      c.closePath(); c.fill();
      /* top highlight along hypotenuse */
      c.strokeStyle = th.blkH; c.lineWidth = 2;
      c.beginPath(); c.moveTo(sx, y + h); c.lineTo(sx + w, y); c.stroke();
      /* outline */
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(sx, y + h); c.lineTo(sx + w, y + h); c.lineTo(sx + w, y);
      c.closePath(); c.stroke();
    }
  }

  /* ── Draw ship ────────────────────────────────────────────── */
  private _drawShip(c: CanvasRenderingContext2D): void {
    const skin = getEquippedShipSkin();
    const px = SCR_X, cy = this._py + P/2;
    c.save();
    c.translate(px, cy);
    const tilt = Math.max(-20, Math.min(20, this._vy * 0.035));
    c.rotate(tilt * Math.PI / 180);
    const s = P;
    /* engine glow */
    if (this._holding) {
      const gl = c.createRadialGradient(-s/2, 0, 0, -s/2, 0, 20);
      gl.addColorStop(0, skin.glow); gl.addColorStop(1, 'transparent');
      c.fillStyle = gl;
      c.beginPath(); c.arc(-s/2, 0, 20, 0, Math.PI*2); c.fill();
    }
    /* body */
    c.fillStyle = skin.body;
    c.beginPath();
    c.moveTo( s/2, 0); c.lineTo(-s/2+6, -s/2+5); c.lineTo(-s/2+6, s/2-5);
    c.closePath(); c.fill();
    /* highlight */
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.moveTo(s/2, 0); c.lineTo(0, -s/2+7); c.lineTo(-s/4, 0);
    c.closePath(); c.fill();
    /* accent line */
    c.strokeStyle = skin.accent; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(s/2, 0); c.lineTo(-s/2+6, -s/2+5); c.lineTo(-s/2+6, s/2-5); c.closePath();
    c.stroke();
    /* cockpit */
    c.fillStyle = skin.cockpit;
    c.beginPath(); c.ellipse(s/6, 0, 6, 5, 0, 0, Math.PI*2); c.fill();
    c.restore();
  }

  /* ── Draw cube ────────────────────────────────────────────── */
  private _drawCube(c: CanvasRenderingContext2D): void {
    const skin = getEquippedCubeSkin();
    const s  = P;
    const cx = SCR_X;
    const cy = this._py + s / 2;
    c.save();
    c.translate(cx, cy);
    c.rotate((this._px / B) * (Math.PI / 2));
    c.fillStyle = skin.bg;
    c.fillRect(-s/2, -s/2, s, s);
    /* inner square */
    c.strokeStyle = skin.border; c.lineWidth = 2;
    c.strokeRect(-s/2+5, -s/2+5, s-10, s-10);
    /* diagonals */
    c.beginPath();
    c.moveTo(-s/2+5, -s/2+5); c.lineTo(s/2-5, s/2-5);
    c.moveTo(s/2-5,  -s/2+5); c.lineTo(-s/2+5, s/2-5);
    c.strokeStyle = skin.border + '88'; c.lineWidth = 1.5;
    c.stroke();
    /* outline */
    c.strokeStyle = skin.border; c.lineWidth = 1.5;
    c.strokeRect(-s/2, -s/2, s, s);
    /* emoji on face */
    if (skin.emoji) {
      c.font = `${s - 8}px serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(skin.emoji, 0, 1);
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
    }
    c.restore();
  }

  /* ── Draw wave ────────────────────────────────────────────── */
  private _drawWave(c: CanvasRenderingContext2D): void {
    const px = SCR_X, cy = this._py + P / 2;
    const s = P * 0.55;
    c.save();
    c.translate(px, cy);
    /* tilt toward movement direction */
    const tilt = this._holding ? -28 : 28;
    c.rotate(tilt * Math.PI / 180);
    /* glow */
    const gl = c.createRadialGradient(0, 0, 0, 0, 0, s * 1.6);
    gl.addColorStop(0, 'rgba(255,255,0,0.45)');
    gl.addColorStop(1, 'transparent');
    c.fillStyle = gl;
    c.beginPath(); c.arc(0, 0, s * 1.6, 0, Math.PI * 2); c.fill();
    /* diamond body */
    c.fillStyle = '#ffee00';
    c.beginPath();
    c.moveTo(0, -s / 2); c.lineTo(s / 2, 0);
    c.lineTo(0, s / 2);  c.lineTo(-s / 2, 0);
    c.closePath(); c.fill();
    /* inner highlight */
    c.fillStyle = 'rgba(255,255,255,0.4)';
    c.beginPath();
    c.moveTo(0, -s / 2); c.lineTo(s / 2, 0); c.lineTo(0, 0);
    c.closePath(); c.fill();
    /* outline */
    c.strokeStyle = '#ff9900'; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, -s / 2); c.lineTo(s / 2, 0);
    c.lineTo(0, s / 2);  c.lineTo(-s / 2, 0);
    c.closePath(); c.stroke();
    c.restore();
  }

  /* ── Win screen ───────────────────────────────────────────── */
  private _showWin(coins: number): void {
    cancelAnimationFrame(this._raf); this._raf = 0;
    const ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(0,0,30,0.8);pointer-events:all;';
    ov.innerHTML =
      `<div style="font-size:54px;">🏆</div>` +
      `<div style="color:#00ccff;font-size:28px;font-weight:900;font-family:Arial Black,Arial;text-shadow:0 0 20px #0044ff;">LEVEL COMPLETE!</div>` +
      `<div style="color:rgba(255,255,255,0.55);font-size:14px;">Attempts: ${this._attempts}</div>` +
      `<div style="display:flex;align-items:center;gap:8px;background:rgba(0,180,255,0.1);border:2px solid rgba(0,180,255,0.35);border-radius:14px;padding:8px 20px;">` +
        `<span style="font-size:20px;">🪙</span><span style="color:#FFD700;font-size:16px;font-weight:bold;">+${coins} coins</span>` +
      `</div>`;
    const btn = (txt: string, bg: string, cb: ()=>void) => {
      const b = document.createElement('button');
      b.style.cssText = `background:${bg};color:white;font-size:15px;font-weight:bold;padding:10px 30px;border-radius:14px;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;font-family:Arial,sans-serif;`;
      b.textContent = txt; b.onclick = cb; return b;
    };
    ov.appendChild(btn('🔁 Play Again', 'rgba(0,150,255,0.2)', () => {
      ov.remove(); this._reset(); this._raf = requestAnimationFrame(this._loop);
    }));
    ov.appendChild(btn('← Back to Arcade', 'rgba(255,255,255,0.08)', () => this._exit()));
    this._wrap.appendChild(ov);
  }

  /* ── Cleanup (shared by exit + tools-button shortcuts) ────── */
  private _cleanup(): void {
    cancelAnimationFrame(this._raf); this._raf = 0;
    window.removeEventListener('resize',      this._fitCanvas);
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointerup',   this._onUp);
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('keyup',   this._onKey);
    this._g.inMiniGame = false;
    this._mp?.dispose();
    this._mp = null;
    this._wrap?.remove();
    this._g.ui.innerHTML = '';
  }

  /* ── Exit ────────────────────────────────────────────────── */
  private _exit(): void {
    const wasMp = !!this._mp;
    this._cleanup();
    this._g.ui.innerHTML = '';
    if (wasMp) {
      import('./GDMultiplayerLobby').then(m => new m.GDMultiplayerLobby(this._g));
    } else if (this._fromBrowser) {
      import('./GDLevelBrowser').then(m => new m.GDLevelBrowser(this._g));
    } else {
      import('../ArcadeScene').then(m => new m.ArcadeScene(this._g));
    }
  }
}
