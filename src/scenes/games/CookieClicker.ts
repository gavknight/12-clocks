import type { Game } from "../../game/Game";

interface Building      { id:string; emoji:string; name:string; baseCost:number; cps:number; }
interface Upgrade       { id:string; emoji:string; name:string; desc:string; cost:number; bonus:number; bld?:string; mult?:number; global?:boolean; }
interface Achievement   { id:string; emoji:string; name:string; desc:string; }
interface HeavenlyUpgrade { id:string; emoji:string; name:string; desc:string; cost:number; }

const BUILDINGS: Building[] = [
  { id:"cursor",   emoji:"👆", name:"Cursor",       baseCost:               15, cps:        0.1 },
  { id:"grandma",  emoji:"👵", name:"Grandma",      baseCost:              100, cps:        0.5 },
  { id:"mine",     emoji:"⛏️",  name:"Mine",         baseCost:              500, cps:        4   },
  { id:"factory",  emoji:"🏭", name:"Factory",      baseCost:            3_000, cps:       20   },
  { id:"bank",     emoji:"🏦", name:"Bank",         baseCost:           15_000, cps:      100   },
  { id:"wizard",   emoji:"🔮", name:"Wizard",       baseCost:          100_000, cps:      400   },
  { id:"farm",     emoji:"🌾", name:"Farm",         baseCost:          500_000, cps:    1_600   },
  { id:"temple",   emoji:"🛕", name:"Temple",       baseCost:        3_000_000, cps:    6_400   },
  { id:"shipment", emoji:"🚀", name:"Shipment",     baseCost:       20_000_000, cps:   26_000   },
  { id:"alchemy",  emoji:"⚗️",  name:"Alchemy Lab",  baseCost:      150_000_000, cps:  100_000   },
  { id:"portal",   emoji:"🌀", name:"Portal",                baseCost:    1_000_000_000, cps:    400_000   },
  { id:"timemach", emoji:"⏰", name:"Time Machine",          baseCost:   10_000_000_000, cps:  1_600_000   },
  { id:"antimatter",emoji:"🧲", name:"Antimatter Condenser", baseCost:  100_000_000_000, cps:  6_400_000   },
  { id:"prism",    emoji:"🌈", name:"Prism",                 baseCost:1_000_000_000_000, cps: 25_600_000   },
  { id:"chancemaker",emoji:"🎰",name:"Chancemaker",          baseCost:15_000_000_000_000,cps:100_000_000   },
  { id:"fractal",  emoji:"❄️",  name:"Fractal Engine",       baseCost:200_000_000_000_000,cps:400_000_000  },
  { id:"javascript",emoji:"🖥️", name:"Javascript Console",  baseCost:3_000_000_000_000_000,cps:1_600_000_000},
  { id:"idleverse",emoji:"🪐", name:"Idleverse",             baseCost:50_000_000_000_000_000,cps:6_400_000_000},
];

const UPGRADES: Upgrade[] = [
  // ── Click upgrades ──────────────────────────────────────────────────────────
  { id:"u1",  emoji:"👆", name:"Reinforced Index Finger",  desc:"+1 per click",       cost:           100, bonus:    1 },
  { id:"u2",  emoji:"🩺", name:"Carpal Tunnel Prevention", desc:"+1 per click",       cost:           500, bonus:    1 },
  { id:"u3",  emoji:"✨", name:"Golden Touch",             desc:"+3 per click",       cost:         2_500, bonus:    3 },
  { id:"u4",  emoji:"🤜", name:"Ambidextrous",             desc:"+4 per click",       cost:        10_000, bonus:    4 },
  { id:"u5",  emoji:"💎", name:"Diamond Click",            desc:"+5 per click",       cost:        10_000, bonus:    5 },
  { id:"u6",  emoji:"👌", name:"Triple Click",             desc:"+8 per click",       cost:        50_000, bonus:    8 },
  { id:"u7",  emoji:"🖐️",  name:"Thousand Fingers",        desc:"+20 per click",      cost:       200_000, bonus:   20 },
  { id:"u8",  emoji:"🙌", name:"Million Fingers",          desc:"+50 per click",      cost:     1_000_000, bonus:   50 },
  { id:"u9",  emoji:"💫", name:"Billion Fingers",          desc:"+100 per click",     cost:     5_000_000, bonus:  100 },
  { id:"u10", emoji:"🌌", name:"Trillion Fingers",         desc:"+250 per click",     cost:    25_000_000, bonus:  250 },
  { id:"u11", emoji:"⚡", name:"Quadrillion Fingers",      desc:"+500 per click",     cost:   100_000_000, bonus:  500 },
  { id:"u12", emoji:"🔱", name:"Infinite Clicker",         desc:"+1000 per click",    cost:   500_000_000, bonus: 1000 },
  { id:"u13", emoji:"🌠", name:"Cosmic Touch",             desc:"+2500 per click",    cost: 2_000_000_000, bonus: 2500 },
  { id:"u14", emoji:"👁️",  name:"God Mode",                desc:"+5000 per click",    cost:10_000_000_000, bonus: 5000 },

  // ── Golden cookie upgrades ───────────────────────────────────────────────────
  { id:"gc",  emoji:"🌟", name:"Cookie Shrine",   desc:"Golden cookies every 5 min", cost:        50_000, bonus: 0 },
  { id:"gc2", emoji:"⛈️",  name:"Golden Gust",     desc:"Golden cookies every 2 min", cost:       500_000, bonus: 0 },
  { id:"gc3", emoji:"🌧️",  name:"Golden Rain",     desc:"Golden cookies every 1 min", cost:     5_000_000, bonus: 0 },
  { id:"gc4", emoji:"🌊", name:"Golden Tempest",   desc:"Golden cookies every 30 sec",cost:    50_000_000, bonus: 0 },

  // ── Cursor upgrades ──────────────────────────────────────────────────────────
  { id:"cur1",  emoji:"👆", name:"Plastic Mouse",         desc:"2× Cursor CPS",   cost:              500, bonus:0, bld:"cursor", mult:2 },
  { id:"cur2",  emoji:"🖱️",  name:"Iron Mouse",            desc:"2× Cursor CPS",   cost:           10_000, bonus:0, bld:"cursor", mult:2 },
  { id:"cur3",  emoji:"💻", name:"Quantum Mouse",          desc:"2× Cursor CPS",   cost:          200_000, bonus:0, bld:"cursor", mult:2 },
  { id:"cur4",  emoji:"🔩", name:"Titanium Mouse",         desc:"2× Cursor CPS",   cost:        5_000_000, bonus:0, bld:"cursor", mult:2 },
  { id:"cur5",  emoji:"⚙️",  name:"Adamantium Mouse",      desc:"2× Cursor CPS",   cost:      100_000_000, bonus:0, bld:"cursor", mult:2 },
  { id:"cur6",  emoji:"🌀", name:"Unobtainium Mouse",      desc:"2× Cursor CPS",   cost:    2_000_000_000, bonus:0, bld:"cursor", mult:2 },
  { id:"cur7",  emoji:"🌑", name:"Dark Matter Mouse",      desc:"2× Cursor CPS",   cost:   50_000_000_000, bonus:0, bld:"cursor", mult:2 },
  { id:"cur8",  emoji:"⚛️",  name:"Antimatter Mouse",      desc:"2× Cursor CPS",   cost:1_000_000_000_000, bonus:0, bld:"cursor", mult:2 },
  { id:"cur9",  emoji:"🌌", name:"Cosmic Mouse",           desc:"2× Cursor CPS",   cost:25_000_000_000_000,bonus:0, bld:"cursor", mult:2 },
  { id:"cur10", emoji:"👁️",  name:"Transcendent Mouse",    desc:"2× Cursor CPS",   cost:500_000_000_000_000,bonus:0,bld:"cursor", mult:2 },
  { id:"cur11", emoji:"✨", name:"Enlightened Mouse",      desc:"2× Cursor CPS",   cost:10_000_000_000_000_000,bonus:0,bld:"cursor",mult:2 },
  { id:"cur12", emoji:"🌟", name:"Omniscient Cursor",      desc:"2× Cursor CPS",   cost:200_000_000_000_000_000,bonus:0,bld:"cursor",mult:2 },

  // ── Grandma upgrades ─────────────────────────────────────────────────────────
  { id:"gma1", emoji:"👵", name:"Forwards from Grandma",  desc:"2× Grandma CPS", cost:         2_000, bonus:0, bld:"grandma",  mult:2 },
  { id:"gma2", emoji:"🧓", name:"Steel-plated Rolling Pins", desc:"4× Grandma CPS", cost:      50_000, bonus:0, bld:"grandma",  mult:2 },
  { id:"gma3", emoji:"🧙", name:"Lubricated Dentures",    desc:"8× Grandma CPS", cost:     1_000_000, bonus:0, bld:"grandma",  mult:2 },

  // ── Mine upgrades ────────────────────────────────────────────────────────────
  { id:"mn1",  emoji:"⛏️",  name:"Sugar Gas",             desc:"2× Mine CPS",    cost:        10_000, bonus:0, bld:"mine",     mult:2 },
  { id:"mn2",  emoji:"🪨", name:"Megadrill",              desc:"4× Mine CPS",    cost:       250_000, bonus:0, bld:"mine",     mult:2 },
  { id:"mn3",  emoji:"💎", name:"Ultradrill",             desc:"8× Mine CPS",    cost:     5_000_000, bonus:0, bld:"mine",     mult:2 },

  // ── Factory upgrades ─────────────────────────────────────────────────────────
  { id:"fac1", emoji:"🏭", name:"Sturdier Conveyor Belts", desc:"2× Factory CPS", cost:       50_000, bonus:0, bld:"factory",  mult:2 },
  { id:"fac2", emoji:"⚙️",  name:"Child Labour",           desc:"4× Factory CPS", cost:    1_500_000, bonus:0, bld:"factory",  mult:2 },
  { id:"fac3", emoji:"🤖", name:"Automation",              desc:"8× Factory CPS", cost:   30_000_000, bonus:0, bld:"factory",  mult:2 },

  // ── Bank upgrades ────────────────────────────────────────────────────────────
  { id:"bnk1", emoji:"🏦", name:"Taller Tellers",         desc:"2× Bank CPS",    cost:      250_000, bonus:0, bld:"bank",     mult:2 },
  { id:"bnk2", emoji:"💳", name:"Swanky Offices",         desc:"4× Bank CPS",    cost:    7_500_000, bonus:0, bld:"bank",     mult:2 },
  { id:"bnk3", emoji:"🏛️",  name:"Offshore Accounts",     desc:"8× Bank CPS",    cost:  150_000_000, bonus:0, bld:"bank",     mult:2 },

  // ── Wizard upgrades ──────────────────────────────────────────────────────────
  { id:"wiz1", emoji:"🔮", name:"Pointier Hats",          desc:"2× Wizard CPS",  cost:    1_500_000, bonus:0, bld:"wizard",   mult:2 },
  { id:"wiz2", emoji:"🧿", name:"Bewitched Ovens",        desc:"4× Wizard CPS",  cost:   50_000_000, bonus:0, bld:"wizard",   mult:2 },
  { id:"wiz3", emoji:"🌀", name:"Magic Fertiliser",       desc:"8× Wizard CPS",  cost:1_000_000_000, bonus:0, bld:"wizard",   mult:2 },

  // ── Farm upgrades ────────────────────────────────────────────────────────────
  { id:"frm1", emoji:"🌾", name:"Improved Soil",          desc:"2× Farm CPS",    cost:    7_500_000, bonus:0, bld:"farm",     mult:2 },
  { id:"frm2", emoji:"🚜", name:"Cookie Fertilizer",      desc:"4× Farm CPS",    cost:  250_000_000, bonus:0, bld:"farm",     mult:2 },
  { id:"frm3", emoji:"🌿", name:"Genetically Modified Crops", desc:"8× Farm CPS",cost:5_000_000_000, bonus:0, bld:"farm",     mult:2 },

  // ── Temple upgrades ──────────────────────────────────────────────────────────
  { id:"tmp1", emoji:"🛕", name:"Golden Idols",           desc:"2× Temple CPS",  cost:   50_000_000, bonus:0, bld:"temple",   mult:2 },
  { id:"tmp2", emoji:"📿", name:"Sacrificial Rolling Pins",desc:"4× Temple CPS", cost:1_500_000_000, bonus:0, bld:"temple",   mult:2 },
  { id:"tmp3", emoji:"🌐", name:"Greatly Increased Luck", desc:"8× Temple CPS",  cost:30_000_000_000,bonus:0, bld:"temple",   mult:2 },

  // ── Shipment upgrades ────────────────────────────────────────────────────────
  { id:"shp1", emoji:"🚀", name:"Vanilla Nebulae",        desc:"2× Shipment CPS",cost:  300_000_000, bonus:0, bld:"shipment", mult:2 },
  { id:"shp2", emoji:"🛸", name:"Wormhole Stabilisers",   desc:"4× Shipment CPS",cost:10_000_000_000,bonus:0, bld:"shipment", mult:2 },
  { id:"shp3", emoji:"🌍", name:"Edible Holograms",       desc:"8× Shipment CPS",cost:200_000_000_000,bonus:0,bld:"shipment", mult:2 },

  // ── Alchemy upgrades ─────────────────────────────────────────────────────────
  { id:"alc1", emoji:"⚗️",  name:"Antimatter Condensers", desc:"2× Alchemy CPS", cost:  2_000_000_000, bonus:0, bld:"alchemy",  mult:2 },
  { id:"alc2", emoji:"🧪", name:"Philosopher's Stone",    desc:"4× Alchemy CPS", cost: 75_000_000_000, bonus:0, bld:"alchemy",  mult:2 },
  { id:"alc3", emoji:"🔬", name:"Dark Matter Resolution", desc:"8× Alchemy CPS", cost:1_500_000_000_000,bonus:0,bld:"alchemy",  mult:2 },

  // ── Portal upgrades ──────────────────────────────────────────────────────────
  { id:"prt1", emoji:"🌀", name:"Ancient Tablet",         desc:"2× Portal CPS",  cost: 15_000_000_000, bonus:0, bld:"portal",   mult:2 },
  { id:"prt2", emoji:"🕳️",  name:"Insane Oatling Workers",desc:"4× Portal CPS",  cost:500_000_000_000, bonus:0, bld:"portal",   mult:2 },
  { id:"prt3", emoji:"🌌", name:"Soul Bond",              desc:"8× Portal CPS",  cost:10_000_000_000_000,bonus:0,bld:"portal",   mult:2 },

  // ── Time Machine upgrades ────────────────────────────────────────────────────
  { id:"tm1",  emoji:"⏰", name:"Flux Capacitors",           desc:"2× Time Machine CPS",  cost:   100_000_000_000, bonus:0, bld:"timemach",   mult:2 },
  { id:"tm2",  emoji:"🕰️",  name:"Time Paradox Resolver",    desc:"4× Time Machine CPS",  cost: 3_500_000_000_000, bonus:0, bld:"timemach",   mult:2 },
  { id:"tm3",  emoji:"⌛", name:"Quantum Conundrum",         desc:"8× Time Machine CPS",  cost:75_000_000_000_000, bonus:0, bld:"timemach",   mult:2 },

  // ── Antimatter Condenser upgrades ─────────────────────────────────────────────
  { id:"ant1", emoji:"🧲", name:"Sugar Bosons",              desc:"2× Antimatter CPS",    cost:   500_000_000_000, bonus:0, bld:"antimatter", mult:2 },
  { id:"ant2", emoji:"⚡", name:"String Theory",             desc:"4× Antimatter CPS",    cost:20_000_000_000_000, bonus:0, bld:"antimatter", mult:2 },
  { id:"ant3", emoji:"🔬", name:"Large Hadron Collider",     desc:"8× Antimatter CPS",    cost:400_000_000_000_000,bonus:0, bld:"antimatter", mult:2 },

  // ── Prism upgrades ────────────────────────────────────────────────────────────
  { id:"pri1", emoji:"🌈", name:"Neon Filter",               desc:"2× Prism CPS",         cost: 5_000_000_000_000, bonus:0, bld:"prism",      mult:2 },
  { id:"pri2", emoji:"💎", name:"Gem Polish",                desc:"4× Prism CPS",         cost:150_000_000_000_000,bonus:0, bld:"prism",      mult:2 },
  { id:"pri3", emoji:"🌟", name:"Rainbow Refraction",        desc:"8× Prism CPS",         cost:3_000_000_000_000_000,bonus:0,bld:"prism",     mult:2 },

  // ── Chancemaker upgrades ──────────────────────────────────────────────────────
  { id:"cha1", emoji:"🎰", name:"Lucky Day",                 desc:"2× Chancemaker CPS",   cost:75_000_000_000_000, bonus:0, bld:"chancemaker",mult:2 },
  { id:"cha2", emoji:"🎲", name:"Serendipity",               desc:"4× Chancemaker CPS",   cost:2_000_000_000_000_000,bonus:0,bld:"chancemaker",mult:2 },
  { id:"cha3", emoji:"🍀", name:"Leprechaun Luck",           desc:"8× Chancemaker CPS",   cost:40_000_000_000_000_000,bonus:0,bld:"chancemaker",mult:2},

  // ── Fractal Engine upgrades ───────────────────────────────────────────────────
  { id:"fra1", emoji:"❄️",  name:"Infinite Loop",            desc:"2× Fractal Engine CPS",cost:1_000_000_000_000_000,bonus:0,bld:"fractal",   mult:2 },
  { id:"fra2", emoji:"🔷", name:"Recursion",                 desc:"4× Fractal Engine CPS",cost:30_000_000_000_000_000,bonus:0,bld:"fractal",  mult:2 },
  { id:"fra3", emoji:"💠", name:"Self-Similarity",           desc:"8× Fractal Engine CPS",cost:600_000_000_000_000_000,bonus:0,bld:"fractal", mult:2 },

  // ── Javascript Console upgrades ───────────────────────────────────────────────
  { id:"js1",  emoji:"🖥️",  name:"Minification",            desc:"2× Console CPS",       cost:15_000_000_000_000_000,bonus:0,bld:"javascript",mult:2 },
  { id:"js2",  emoji:"⌨️",  name:"Just-in-Time Compiling",  desc:"4× Console CPS",       cost:450_000_000_000_000_000,bonus:0,bld:"javascript",mult:2 },
  { id:"js3",  emoji:"🤖", name:"Turing Complete",           desc:"8× Console CPS",       cost:9_000_000_000_000_000_000,bonus:0,bld:"javascript",mult:2},

  // ── Idleverse upgrades ────────────────────────────────────────────────────────
  { id:"idl1", emoji:"🪐", name:"Multiverse Theory",         desc:"2× Idleverse CPS",     cost:250_000_000_000_000_000,bonus:0,bld:"idleverse",mult:2 },
  { id:"idl2", emoji:"🌌", name:"Parallel Universes",        desc:"4× Idleverse CPS",     cost:7_500_000_000_000_000_000,bonus:0,bld:"idleverse",mult:2},
  { id:"idl3", emoji:"♾️",  name:"Omniversal Dominion",      desc:"8× Idleverse CPS",     cost:150_000_000_000_000_000_000,bonus:0,bld:"idleverse",mult:2},

  // ── Global synergies ─────────────────────────────────────────────────────────
  { id:"syn1", emoji:"🔗", name:"Synergies Vol. I",       desc:"+10% global CPS",    cost:   1_000_000, bonus:0, global:true, mult:1.1 },
  { id:"syn2", emoji:"🔗", name:"Synergies Vol. II",      desc:"+20% global CPS",    cost:  10_000_000, bonus:0, global:true, mult:1.2 },
  { id:"syn3", emoji:"🔗", name:"Synergies Vol. III",     desc:"+40% global CPS",    cost: 100_000_000, bonus:0, global:true, mult:1.4 },
  { id:"syn4", emoji:"🌋", name:"Grandmapocalypse",       desc:"+75% global CPS",    cost:1_000_000_000, bonus:0, global:true, mult:1.75 },
  { id:"syn5", emoji:"🍪", name:"Cookie Singularity",     desc:"2× global CPS",      cost:10_000_000_000, bonus:0, global:true, mult:2.0 },
  { id:"ovr1", emoji:"🌈", name:"Prism Power",            desc:"2.5× global CPS",    cost:100_000_000_000,bonus:0, global:true, mult:2.5 },
  { id:"ovr2", emoji:"🚀", name:"Hyperspace",             desc:"3× global CPS",      cost:1_000_000_000_000,bonus:0,global:true, mult:3.0 },
];

interface Spell { id:string; emoji:string; name:string; desc:string; mana:number; }
const SPELLS: Spell[] = [
  { id:"sp_conjure",  emoji:"🍪", name:"Conjure Baked Goods",    mana:25,  desc:"Gain 5 min of CPS instantly" },
  { id:"sp_fate",     emoji:"⭐", name:"Force the Hand of Fate",  mana:30,  desc:"Spawn a golden cookie" },
  { id:"sp_edifice",  emoji:"🏗️", name:"Spontaneous Edifice",    mana:45,  desc:"Gain 1 free random building" },
  { id:"sp_pixies",   emoji:"🧚", name:"Summon Crafty Pixies",    mana:35,  desc:"Unlock a free upgrade" },
  { id:"sp_diminish", emoji:"✨", name:"Diminish Ineptitude",     mana:40,  desc:"2× CPS for 60 seconds" },
  { id:"sp_gambler",  emoji:"🎲", name:"Gambler's Fever Dream",   mana:15,  desc:"Random: big bonus OR lose 10% cookies" },
  { id:"sp_haggler",  emoji:"💎", name:"Haggler's Charm",         mana:20,  desc:"Next building purchase costs 25% less" },
  { id:"sp_resurrect",emoji:"💀", name:"Resurrect Abomination",   mana:55,  desc:"Gain 30 min of CPS instantly" },
  { id:"sp_stretch",  emoji:"⏰", name:"Stretch Time",            mana:50,  desc:"Extend active frenzy by 30 seconds" },
];

interface Stock { id:string; emoji:string; name:string; basePrice:number; vol:number; }
const STOCKS: Stock[] = [
  { id:"choc",  emoji:"🍫", name:"Choco Corp",   basePrice:  15, vol:0.07 },
  { id:"van",   emoji:"🍦", name:"Vanilla Inc",  basePrice:  28, vol:0.04 },
  { id:"sugar", emoji:"🍬", name:"SugarTech",    basePrice:  65, vol:0.09 },
  { id:"milk",  emoji:"🥛", name:"MooMarket",    basePrice: 130, vol:0.05 },
  { id:"grain", emoji:"🌾", name:"GrainFutures", basePrice: 280, vol:0.11 },
  { id:"gem",   emoji:"💎", name:"Gem Exchange", basePrice: 600, vol:0.14 },
];

interface SpaceBuilding { id:string; emoji:string; name:string; baseCost:number; cps:number; desc:string; }
const SPACE_BUILDINGS: SpaceBuilding[] = [
  { id:"sp_probe",   emoji:"🛸", name:"Space Probe",      baseCost:    200_000_000, cps:      100_000, desc:"Tiny drones that bake as they drift" },
  { id:"sp_colony",  emoji:"🌙", name:"Lunar Colony",     baseCost:  2_000_000_000, cps:      500_000, desc:"Moon base runs on cookie reactors" },
  { id:"sp_orbital", emoji:"🪐", name:"Orbital Ring",     baseCost: 20_000_000_000, cps:    2_000_000, desc:"Megastructure orbits the planet" },
  { id:"sp_forge",   emoji:"⭐", name:"Star Forge",       baseCost:200_000_000_000, cps:   10_000_000, desc:"Fuses stardust directly into cookies" },
  { id:"sp_silo",    emoji:"🌌", name:"Dark Matter Silo", baseCost:2_000_000_000_000,cps:  50_000_000, desc:"Harvests invisible dough from the void" },
  { id:"sp_neutron", emoji:"💀", name:"Neutron Tap",      baseCost:20_000_000_000_000,cps: 200_000_000, desc:"Taps a neutron star's crust for energy" },
  { id:"sp_hole",    emoji:"🕳️", name:"Black Hole",       baseCost:200_000_000_000_000,cps:1_000_000_000, desc:"Event horizon bakes infinitely" },
  { id:"sp_galaxy",  emoji:"🌠", name:"Galaxy Core",      baseCost:2_000_000_000_000_000,cps:5_000_000_000, desc:"The heart of the galaxy, yours" },
];

interface Mission { id:string; emoji:string; name:string; dust:number; desc:string; }
const MISSIONS: Mission[] = [
  { id:"ms_return",   emoji:"🌍", name:"Earth Return",      dust:  5, desc:"Gain 5 minutes of CPS instantly" },
  { id:"ms_moon",     emoji:"🌙", name:"Moon Landing",       dust: 10, desc:"Harvest +1 sugar lump" },
  { id:"ms_mars",     emoji:"🔴", name:"Mars Expedition",    dust: 15, desc:"Gain 1 free random building" },
  { id:"ms_asteroid", emoji:"☄️", name:"Asteroid Mining",    dust: 20, desc:"Gain 15 minutes of CPS instantly" },
  { id:"ms_jovian",   emoji:"🪐", name:"Jovian Flyby",       dust: 25, desc:"Spawn a golden cookie" },
  { id:"ms_stellar",  emoji:"🌟", name:"Stellar Survey",     dust: 30, desc:"2× click value for 45 seconds" },
  { id:"ms_void",     emoji:"🌌", name:"Void Rift",          dust: 35, desc:"Call down a cookie storm!" },
  { id:"ms_warp",     emoji:"🚀", name:"Warp Drive",         dust: 45, desc:"2× CPS for 30 seconds" },
  { id:"ms_nova",     emoji:"💥", name:"Supernova",          dust: 60, desc:"Gain 1 hour of CPS instantly" },
];

interface Prayer { id:string; emoji:string; name:string; faith:number; desc:string; }
const PRAYERS: Prayer[] = [
  { id:"pr_prayer",   emoji:"🙏", name:"Fervent Prayer",   faith:10, desc:"+100% click value for 30 seconds" },
  { id:"pr_offering", emoji:"⛪", name:"Divine Offering",   faith:20, desc:"Gain 10 minutes of CPS instantly" },
  { id:"pr_wrath",    emoji:"⚡", name:"Invoke Wrath",      faith:25, desc:"Spawn a golden cookie immediately" },
  { id:"pr_lunar",    emoji:"🌙", name:"Lunar Blessing",    faith:30, desc:"Golden cookies give 2× rewards for 60s" },
  { id:"pr_miracle",  emoji:"💫", name:"Holy Miracle",      faith:35, desc:"Gain 1 free random building" },
  { id:"pr_ritual",   emoji:"🕯️", name:"Ritual of Plenty",  faith:40, desc:"3× CPS for 45 seconds" },
  { id:"pr_favor",    emoji:"🌟", name:"Divine Favor",      faith:45, desc:"Unlock a free upgrade" },
  { id:"pr_harvest",  emoji:"🎁", name:"Sacred Harvest",    faith:50, desc:"Gain 30 minutes of CPS instantly" },
  { id:"pr_storm",    emoji:"☄️", name:"Grand Ritual",       faith:60, desc:"Call down a cookie storm!" },
];


interface God { id:string; emoji:string; name:string; dDesc:string; rDesc:string; jDesc:string; }
const GODS: God[] = [
  { id:"holobore", emoji:"🧘", name:"Holobore",  dDesc:"+20% CPS",            rDesc:"+12% CPS",             jDesc:"+5% CPS"              },
  { id:"vomitrax", emoji:"🌊", name:"Vomitrax",  dDesc:"+200% click value",   rDesc:"+100% click value",    jDesc:"+50% click value"     },
  { id:"skruuia",  emoji:"💨", name:"Skruuia",   dDesc:"Golden cookies ×3",   rDesc:"Golden cookies ×2",    jDesc:"Golden cookies ×1.5"  },
  { id:"muridal",  emoji:"🐭", name:"Muridal",   dDesc:"+15% CPS +80% click", rDesc:"+8% CPS +40% click",   jDesc:"+4% CPS +20% click"   },
  { id:"cyclius",  emoji:"⏳", name:"Cyclius",   dDesc:"+30% CPS",            rDesc:"+18% CPS",             jDesc:"+8% CPS"              },
];

const ACHIEVEMENTS: Achievement[] = [
  { id:"bake_1",        emoji:"🍪", name:"First Cookie",      desc:"Bake your first cookie"              },
  { id:"bake_1k",       emoji:"🍪", name:"Baker",             desc:"Bake 1,000 cookies"                  },
  { id:"bake_100k",     emoji:"🍪", name:"Master Baker",      desc:"Bake 100,000 cookies"                },
  { id:"bake_1m",       emoji:"🍪", name:"Cookie Tycoon",     desc:"Bake 1,000,000 cookies"              },
  { id:"bake_1b",       emoji:"🍪", name:"Cookie Empire",     desc:"Bake 1 billion cookies"              },
  { id:"bake_1t",       emoji:"🍪", name:"Cookie God",        desc:"Bake 1 trillion cookies"             },
  { id:"click_10",      emoji:"👆", name:"Tapper",            desc:"Click 10 times"                      },
  { id:"click_100",     emoji:"👆", name:"Dedicated Clicker", desc:"Click 100 times"                     },
  { id:"click_1k",      emoji:"👆", name:"Clicking Machine",  desc:"Click 1,000 times"                   },
  { id:"first_bldg",    emoji:"🏗️",  name:"First Purchase",   desc:"Buy your first building"             },
  { id:"buildings_10",  emoji:"🏗️",  name:"Expanding",        desc:"Own 10 buildings"                    },
  { id:"buildings_100", emoji:"🏗️",  name:"Factory Floor",    desc:"Own 100 buildings"                   },
  { id:"all_types",     emoji:"🗂️",  name:"Collector",        desc:"Own at least 1 of every building"    },
  { id:"golden_1",      emoji:"🍪", name:"Golden Find",       desc:"Collect a golden cookie"             },
  { id:"golden_7",      emoji:"🍪", name:"Lucky Number",      desc:"Collect 7 golden cookies"            },
  { id:"golden_77",     emoji:"🍪", name:"Cookie Jackpot",    desc:"Collect 77 golden cookies"           },
  { id:"frenzy",        emoji:"🔥", name:"FRENZY!",           desc:"Trigger a frenzy"                    },
  { id:"all_upgrades",  emoji:"💯", name:"Fully Upgraded",    desc:"Buy all upgrades"                    },
  { id:"ascend_1",      emoji:"🌟", name:"Ascended",          desc:"Ascend for the first time"           },
  { id:"ascend_5",      emoji:"🌟", name:"Reborn",            desc:"Ascend 5 times"                      },
];

const HEAVENLY_UPGRADES: HeavenlyUpgrade[] = [
  // ── Starter bonuses ──────────────────────────────────────────────────────────
  { id:"hv_starter",  emoji:"🌱", name:"Cookie Seeds",       desc:"Start each run with 10 free Cursors",           cost:       1 },
  { id:"hv_rebirth",  emoji:"🍪", name:"Reborn in Cookies",  desc:"Start each run with 1,000 free cookies",        cost:     100 },
  { id:"hv_starter2", emoji:"👵", name:"Cookie Farm",        desc:"Start with 5 free Grandmas",                    cost:      10 },
  { id:"hv_starter3", emoji:"⛏️",  name:"Cookie Workshop",   desc:"Start with 3 free Mines",                       cost:      50 },
  { id:"hv_starter4", emoji:"🏭", name:"Cookie Factory",     desc:"Start with 2 free Factories",                   cost:     500 },
  { id:"hv_starter5", emoji:"🌍", name:"Cookie Dynasty",     desc:"Start with 1 of every building",                cost:  10_000 },

  // ── CPS multipliers ──────────────────────────────────────────────────────────
  { id:"hv_cps1",    emoji:"⚡", name:"Heavenly Chip Secret",  desc:"+5% CPS permanently",                         cost:       5 },
  { id:"hv_cps2",    emoji:"🚀", name:"Synergies Vol. I",      desc:"+10% CPS permanently",                        cost:     100 },
  { id:"hv_cps3",    emoji:"🎶", name:"Heavenly Choir",        desc:"+25% CPS permanently",                        cost:     500 },
  { id:"hv_cps4",    emoji:"🌠", name:"Cosmic Synergy",        desc:"+50% CPS permanently",                        cost:   2_000 },
  { id:"hv_cps5",    emoji:"∞",  name:"Infinity Engine",       desc:"2× CPS permanently",                          cost:   5_000 },
  { id:"hv_cps6",    emoji:"🌀", name:"Cookie Nirvana",        desc:"3× CPS permanently",                          cost:  20_000 },
  { id:"hv_cps7",    emoji:"🌌", name:"Void Resonance",        desc:"6× CPS permanently",                          cost: 100_000 },

  // ── Click bonuses ────────────────────────────────────────────────────────────
  { id:"hv_click1",  emoji:"👆", name:"Heavenly Touch",        desc:"+1 base click value permanently",             cost:       5 },
  { id:"hv_click2",  emoji:"💎", name:"Divine Clicking",       desc:"+2 base click value permanently",             cost:     100 },
  { id:"hv_click3",  emoji:"✋", name:"Heavenly Fingers",      desc:"+5 base click value permanently",             cost:     250 },
  { id:"hv_click4",  emoji:"🤚", name:"Astral Clicker",        desc:"+10 base click value permanently",            cost:   1_000 },
  { id:"hv_click5",  emoji:"🙏", name:"Cosmic Hand",           desc:"+25 base click value permanently",            cost:   5_000 },
  { id:"hv_click6",  emoji:"⚡", name:"Divine Wrath",          desc:"+100 base click value permanently",           cost:  50_000 },
  { id:"hv_synclick",emoji:"🔗", name:"Synergized Clicking",   desc:"+1 click for every 100 CPS",                  cost:   1_500 },

  // ── Golden cookie upgrades ───────────────────────────────────────────────────
  { id:"hv_golden1", emoji:"🍪", name:"Lucky Day",             desc:"Golden cookies spawn 2× faster",              cost:      20 },
  { id:"hv_golden2", emoji:"🌟", name:"Golden Blessing",       desc:"Golden cookies spawn 3× faster",              cost:     150 },
  { id:"hv_golden3", emoji:"✨", name:"Golden Overflow",       desc:"Golden cookies spawn 4× faster",              cost:   1_000 },
  { id:"hv_gclife",  emoji:"⏳", name:"Lasting Fortune",       desc:"Golden cookies last 5 seconds longer",        cost:      75 },
  { id:"hv_gclife2", emoji:"⌛", name:"Eternal Fortune",       desc:"Golden cookies last 10 seconds longer",       cost:     300 },

  // ── Frenzy upgrades ──────────────────────────────────────────────────────────
  { id:"hv_frenzy1", emoji:"🔥", name:"Frenzy Upgrade",        desc:"Frenzy lasts 60 seconds",                     cost:      50 },
  { id:"hv_frenzy2", emoji:"🔥", name:"Eternal Frenzy",        desc:"Frenzy lasts 2 minutes",                      cost:     500 },
  { id:"hv_frenzy3", emoji:"💥", name:"Frenzied Existence",    desc:"Frenzy lasts 5 minutes",                      cost:   5_000 },

  // ── Lucky coin upgrades ──────────────────────────────────────────────────────
  { id:"hv_lucky1",  emoji:"✨", name:"Lucky Payout",          desc:"Lucky coin rewards ×3",                       cost:     200 },
  { id:"hv_lucky2",  emoji:"🍀", name:"Fortune Teller",        desc:"Lucky coin rewards ×10",                      cost:   2_000 },
  { id:"hv_lucky3",  emoji:"🌈", name:"Cosmic Jackpot",        desc:"Lucky coin rewards ×25",                      cost:  10_000 },

  // ── Cookie storm upgrades ────────────────────────────────────────────────────
  { id:"hv_storm1",  emoji:"⛈️",  name:"Storm Seeker",         desc:"Cookie storm cookies worth 3× coins",         cost:     750 },
  { id:"hv_storm2",  emoji:"🌊", name:"Storm Lord",            desc:"Cookie storm cookies worth 8× coins",         cost:   4_000 },

  // ── Prestige upgrades ────────────────────────────────────────────────────────
  { id:"hv_prestige", emoji:"👑", name:"Aura of Prestige",     desc:"+2% CPS for every past ascension",            cost:   1_000 },
  { id:"hv_prestige2",emoji:"⭐", name:"Legacy Mastery",       desc:"+5% CPS for every past ascension",            cost:   5_000 },
  { id:"hv_prestige3",emoji:"🌟", name:"Eternal Legacy",       desc:"+10% CPS for every past ascension",           cost:  25_000 },
  { id:"hv_double",   emoji:"💠", name:"Double Prestige",      desc:"Each Heavenly Chip gives 2% CPS (was 1%)",    cost:  15_000 },

  // ── Special upgrades ─────────────────────────────────────────────────────────
  { id:"hv_ach",     emoji:"🏆", name:"Achievement Hunter",    desc:"+1% CPS for every achievement unlocked",      cost:   3_000 },
];

const NEWS = [
  "Local baker claims cookies are 'practically a vegetable'",
  "Scientists confirm: clicking burns exactly 0.0001 calories",
  "Cookie shortages hit global markets — experts blame overconsumption",
  "Breaking: grandma found hoarding 47 tonnes of flour",
  "New study shows 9 out of 10 cookies prefer to be eaten",
  "Area wizard converts entire mine into cookie mine",
  "Economists baffled as cookie becomes global reserve currency",
  "Time travellers report future ruled by giant sentient cookies",
  "Local factory produces cookies faster than physics allows",
  "Bank offers new 'cookie-backed mortgage' scheme",
  "Portal malfunction: cookies now arriving from parallel universe",
  "Alchemy lab accidentally turns gold into even more cookies",
  "Shipment delayed — captain reportedly ate the cargo",
  "Temple built in honour of the Sacred Golden Cookie",
  "Farm yields record harvest; cows also inexplicably made of cookies",
];

function buildingCost(b: Building, owned: number): number {
  return Math.ceil(b.baseCost * Math.pow(1.15, owned));
}
function bulkCost(b: Building, owned: number, qty: number): number {
  let t = 0; for (let i=0;i<qty;i++) t += buildingCost(b, owned+i); return t;
}
function fmt(n: number): string {
  if (n >= 1e12) return (n/1e12).toFixed(2)+"T";
  if (n >= 1e9)  return (n/1e9).toFixed(2)+"B";
  if (n >= 1e6)  return (n/1e6).toFixed(2)+"M";
  if (n >= 1e3)  return (n/1e3).toFixed(1)+"K";
  return Math.floor(n).toLocaleString();
}
function fmtTime(ms: number): string {
  const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60);
  return h>0 ? `${h}h ${m%60}m ${s%60}s` : `${m}m ${s%60}s`;
}

export class CookieClicker {
  private _g: Game;

  // Run state
  private _coins      = 0;
  private _cps        = 0;
  private _clickValue = 1;
  private _counts     = new Map<string,number>();
  private _seenBuildings = new Set<string>(); // unlocked by first manual purchase
  private _boughtUpgrades = new Set<string>();
  private _raf        = 0;
  private _lastTs     = 0;
  private _startTs    = 0;
  private _done       = false;

  // Stats
  private _totalBaked  = 0;
  private _clickCount  = 0;
  private _frenzyCount = 0;

  // Prestige (persisted in localStorage)
  private _achievements       = new Set<string>();
  private _prestigeChips      = 0; // total chips ever earned
  private _heavenlyChipsSpent = 0; // total chips ever spent
  private _heavenlyUpgrades   = new Set<string>();
  private _allTimeBaked        = 0;
  private _ascensions          = 0;

  // Heavenly bonus cache (computed once per run)
  private _hvCpsMult       = 1;
  private _hvFrenzyMs      = 30_000;
  private _hvGcLifeMs      = 13_000;
  private _hvLuckyMult     = 1;
  private _hvStormMult     = 1;
  private _hvSyncClick     = false;
  private _hvAchBonus      = false;
  private _hvDoublePrestige= false;

  // Options
  private _particlesOn = true;
  private _gcAlerts    = true;

  // Sugar lumps
  private _sugarLumps   = 0;
  private _lumpProgress = 0;     // 0–1 (fraction of grow time)
  private _lumpGrowMs   = 60_000; // 60 seconds to grow a lump
  private _bldgLevels   = new Map<string,number>();

  // Garden (Farm Lv.1)
  private _gardenPlots: {state:"empty"|"growing"|"ready"; progress:number}[] = Array.from({length:9}, () => ({state:"empty" as "empty"|"growing"|"ready", progress:0}));

  // Pantheon (Temple Lv.1) — kept for CPS/click/GC multipliers even after Sanctum replaces UI
  private _pantheonSlots: [string|null,string|null,string|null] = [null,null,null]; // diamond,ruby,jade

  // Sanctum (Temple Lv.1)
  private _faith        = 0;
  private _maxFaith     = 100;
  private _prayersCast  = 0;
  private _prayerCounts = new Map<string,number>();
  private _fervantEnd   = 0;  // +100% click value
  private _lunarEnd     = 0;  // 2x GC rewards
  private _ritualEnd    = 0;  // 3x CPS
  private _sanctumTick  = 0;

  // Space Station (Shipment Lv.1)
  private _spaceCounts   = new Map<string,number>();
  private _stardust      = 0;
  private _maxStardust   = 100;
  private _missionsCast  = 0;
  private _missionCounts = new Map<string,number>();
  private _warpEnd       = 0;  // 2× CPS
  private _orbitEnd      = 0;  // 2× click value
  private _spaceTick     = 0;

  // Stock market (Bank Lv.1)
  private _stockPrices  = new Map<string,number>();
  private _stockOwned   = new Map<string,number>();
  private _stockAvgBuy  = new Map<string,number>();
  private _stockHistory = new Map<string,number[]>();
  private _stockTick    = 0;

  // Grimoire
  private _mana        = 0;
  private _maxMana     = 100;
  private _spellsCast  = 0;
  private _spellCounts = new Map<string,number>();
  private _diminishEnd = 0;
  private _discountNext= false;

  // UI state
  private _activeTab: "buildings"|"stats"|"options"|"achievements"|"info"|"magic" = "buildings";
  private _buyQty:    1|10|100 = 1;
  private _sellMode   = false;
  private _bakeryName = "Your Bakery";
  private _fastNotes  = false;
  private _wobblyOn   = true;
  private _scaryStuff = false;
  private _newsIndex = 0;
  private _newsTimer = 0;
  private _achCheckTimer = 0;

  // Golden cookie
  private _gcInterval = 600_000;
  private _gcTimer    = 60_000;
  private _gcCount    = 0;
  private _gcEl: HTMLDivElement|null = null;
  private _gcTimeout  = 0;
  private _frenzyEnd  = 0;
  private _frenzyEl:  HTMLDivElement|null = null;

  // Cursor ring
  private _cursorEls:   HTMLElement[] = [];
  private _cursorAngle  = 0;
  private _cursorRingId = 0;


  // DOM refs
  private _coinEl!:     HTMLElement;
  private _cpsEl!:      HTMLElement;
  private _cookieEl!:   HTMLElement;
  private _clickValEl!: HTMLElement;
  private _tickerEl!:   HTMLElement;
  private _legacyBtn!:  HTMLButtonElement;

  constructor(game: Game) {
    this._g = game;
    this._startTs = performance.now();
    for (const b of BUILDINGS) this._counts.set(b.id, 0);

    // Load persisted data
    this._achievements       = new Set(JSON.parse(localStorage.getItem("cc_achievements")        ?? "[]"));
    this._prestigeChips      = parseFloat(localStorage.getItem("cc_prestige_chips")              ?? "0");
    this._heavenlyChipsSpent = parseFloat(localStorage.getItem("cc_heavenly_chips_spent")        ?? "0");
    this._heavenlyUpgrades   = new Set(JSON.parse(localStorage.getItem("cc_heavenly_upgrades")   ?? "[]"));
    this._allTimeBaked        = parseFloat(localStorage.getItem("cc_all_time_baked")              ?? "0");
    this._ascensions          = parseInt(localStorage.getItem("cc_ascensions")                    ?? "0", 10);
    this._bakeryName          = localStorage.getItem("cc_bakery_name") ?? "Your Bakery";
    this._sugarLumps          = parseInt(localStorage.getItem("cc_sugar_lumps") ?? "0", 10);
    this._lumpProgress        = parseFloat(localStorage.getItem("cc_lump_progress") ?? "0");
    const lvls = JSON.parse(localStorage.getItem("cc_bldg_levels") ?? "{}") as Record<string,number>;
    for (const b of BUILDINGS) this._bldgLevels.set(b.id, lvls[b.id] ?? 0);

    const savedGP = JSON.parse(localStorage.getItem("cc_garden_plots") ?? "null") as {state:"empty"|"growing"|"ready";progress:number}[]|null;
    if (Array.isArray(savedGP) && savedGP.length === 9) this._gardenPlots = savedGP;
    const savedPrices = JSON.parse(localStorage.getItem("cc_stock_prices")  ?? "{}") as Record<string,number>;
    const savedOwned  = JSON.parse(localStorage.getItem("cc_stock_owned")   ?? "{}") as Record<string,number>;
    const savedAvg    = JSON.parse(localStorage.getItem("cc_stock_avg_buy") ?? "{}") as Record<string,number>;
    for (const s of STOCKS) {
      this._stockPrices.set(s.id, savedPrices[s.id] ?? s.basePrice);
      this._stockOwned.set(s.id,  savedOwned[s.id]  ?? 0);
      this._stockAvgBuy.set(s.id, savedAvg[s.id]    ?? s.basePrice);
      this._stockHistory.set(s.id, [this._stockPrices.get(s.id)!]);
    }

    const savedSC = JSON.parse(localStorage.getItem("cc_space_counts") ?? "{}") as Record<string,number>;
    for (const sb of SPACE_BUILDINGS) this._spaceCounts.set(sb.id, savedSC[sb.id] ?? 0);

    // Apply permanent heavenly bonuses for this run
    this._applyHeavenlyBonuses();

    // CSS keyframes
    if (!document.getElementById("gcStyle")) {
      const s = document.createElement("style");
      s.id = "gcStyle";
      s.textContent = `@keyframes gcPulse{from{transform:scale(1) rotate(-8deg)}to{transform:scale(1.18) rotate(8deg)}}@keyframes ccWobble{0%,100%{transform:rotate(0deg) scale(1)}25%{transform:rotate(-3deg) scale(1.02)}75%{transform:rotate(3deg) scale(1.02)}}`;
      document.head.appendChild(s);
    }

    const availChips = Math.floor(this._prestigeChips - this._heavenlyChipsSpent);
    const hasHacks = game.hasHacks;

    game.ui.innerHTML = `
      <style>
        #ccRoot, #ccRoot * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M4 2 L4 25 L9 20 L13 29 L16.5 27.5 L12.5 18.5 L20 18.5 Z' fill='%23c8924a' stroke='%235a3010' stroke-width='1.5' stroke-linejoin='round'/%3E%3Ccircle cx='8' cy='8' r='1.8' fill='%234a2800'/%3E%3Ccircle cx='13' cy='12' r='1.5' fill='%234a2800'/%3E%3Ccircle cx='7' cy='16' r='1.4' fill='%234a2800'/%3E%3Ccircle cx='15' cy='7' r='1.2' fill='%234a2800'/%3E%3Ccircle cx='10' cy='20' r='1.3' fill='%234a2800'/%3E%3C/svg%3E") 4 2, pointer !important; }
        #ccRoot button, #ccRoot [style*="cursor:pointer"] { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath d='M4 2 L4 25 L9 20 L13 29 L16.5 27.5 L12.5 18.5 L20 18.5 Z' fill='%23c8924a' stroke='%235a3010' stroke-width='1.5' stroke-linejoin='round'/%3E%3Ccircle cx='8' cy='8' r='1.8' fill='%234a2800'/%3E%3Ccircle cx='13' cy='12' r='1.5' fill='%234a2800'/%3E%3Ccircle cx='7' cy='16' r='1.4' fill='%234a2800'/%3E%3Ccircle cx='15' cy='7' r='1.2' fill='%234a2800'/%3E%3Ccircle cx='10' cy='20' r='1.3' fill='%234a2800'/%3E%3C/svg%3E") 4 2, pointer !important; }
      </style>
      <div id="ccRoot" style="
        position:relative;width:100%;height:100%;
        background:linear-gradient(160deg,#1a0800,#2a1000,#0a0800);
        display:flex;flex-direction:column;overflow:hidden;
        font-family:Arial,sans-serif;user-select:none;
        pointer-events:all;touch-action:none;
      ">
        <!-- HUD -->
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:7px 10px;background:rgba(0,0,0,0.55);flex-shrink:0;
          border-bottom:1px solid rgba(255,160,0,0.2);gap:5px;">
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
            <button id="ccBack" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);
              font-size:11px;padding:4px 8px;border-radius:7px;
              border:1px solid rgba(255,255,255,0.2);cursor:pointer;">← Back</button>
            <button id="ccLegacy" style="font-size:11px;padding:4px 8px;border-radius:7px;cursor:pointer;
              background:rgba(255,215,0,0.2);color:#FFD700;border:1px solid rgba(255,215,0,0.5);"
              title="Ascend — keep achievements &amp; heavenly upgrades">🌟 Legacy</button>
            ${hasHacks ? `<button id="ccAdmin" style="font-size:11px;padding:4px 8px;border-radius:7px;cursor:pointer;
              background:rgba(255,80,0,0.25);color:#ff9944;border:1px solid rgba(255,80,0,0.5);">⚡ Admin</button>` : ""}
          </div>
          <span style="color:#FFD700;font-size:12px;font-weight:bold;flex-shrink:0;">🍪 Cookie Clicker</span>
          <div style="display:flex;gap:7px;align-items:center;flex-shrink:0;">
            <span style="color:#FFD700;font-size:12px;font-weight:bold;">💰<span id="ccCoins">0</span></span>
            <span style="color:rgba(255,200,100,0.75);font-size:10px;">📈<span id="ccCps">0</span>/s</span>
          </div>
        </div>

        <!-- News ticker -->
        <div style="background:rgba(0,0,0,0.6);border-bottom:1px solid rgba(255,160,0,0.1);
          padding:2px 12px;flex-shrink:0;height:18px;display:flex;align-items:center;overflow:hidden;">
          <span style="color:rgba(255,160,0,0.45);font-size:9px;margin-right:4px;white-space:nowrap;">📰</span>
          <span id="ccTicker" style="color:rgba(255,255,255,0.45);font-size:9px;white-space:nowrap;
            overflow:hidden;text-overflow:ellipsis;transition:opacity 0.4s;">${NEWS[0]}</span>
        </div>

        <!-- Main area -->
        <div style="display:flex;flex:1;min-height:0;">

          <!-- Left -->
          <div style="width:42%;display:flex;flex-direction:column;
            align-items:center;justify-content:center;gap:6px;
            border-right:1px solid rgba(255,160,0,0.12);padding:8px;position:relative;">
            <div id="ccBakeryName" style="color:rgba(255,215,0,0.85);font-size:10px;font-weight:bold;
              text-align:center;cursor:pointer;border-bottom:1px dashed rgba(255,215,0,0.25);
              padding-bottom:2px;width:100%;" title="Click to rename">${this._bakeryName}</div>
            <div id="ccCookie" style="font-size:86px;cursor:pointer;line-height:1;
              transition:transform 0.07s;
              filter:drop-shadow(0 0 18px rgba(255,160,0,0.5));touch-action:none;">🍪</div>
            <div style="color:rgba(255,255,255,0.35);font-size:10px;text-align:center;">
              +<span id="ccClickVal">${this._clickValue}</span> per click</div>
            <div style="color:rgba(255,200,100,0.5);font-size:9px;text-align:center;">
              per second: <span id="ccCpsLeft">0</span></div>
            ${availChips > 0 ? `<div style="color:rgba(200,180,255,0.7);font-size:9px;text-align:center;">
              ✨ ${Math.floor(availChips)} chips available</div>` : ""}
            ${this._ascensions > 0 ? `<div style="color:rgba(255,215,0,0.5);font-size:9px;text-align:center;">
              🌟 Ascension ${this._ascensions}</div>` : ""}
            <!-- Sugar lump -->
            <div style="display:flex;flex-direction:column;align-items:center;gap:3px;margin-top:2px;">
              <div style="position:relative;width:44px;height:44px;flex-shrink:0;">
                <div id="ccLump" style="
                  width:44px;height:44px;border-radius:50%;cursor:default;
                  background:radial-gradient(circle at 36% 28%,
                    #ffffff 0%, #f5f0e6 18%, #ddd4be 45%, #bfb09a 70%, #a09078 100%);
                  box-shadow:
                    2px 4px 8px rgba(0,0,0,0.45),
                    inset -2px -3px 6px rgba(0,0,0,0.15),
                    inset 2px 2px 5px rgba(255,255,255,0.6);
                  transform:scale(0.6);transition:transform 0.6s,box-shadow 0.4s,filter 0.4s;
                  flex-shrink:0;" title="Sugar Lump — click when ripe!"></div>
                <!-- lump count badge -->
                <div id="ccLumpCount" style="
                  position:absolute;bottom:-2px;right:-2px;
                  background:rgba(30,20,10,0.85);color:#FFD700;
                  font-size:9px;font-weight:bold;font-family:Arial,sans-serif;
                  min-width:14px;height:14px;border-radius:7px;
                  display:flex;align-items:center;justify-content:center;
                  padding:0 3px;border:1px solid rgba(255,210,0,0.4);
                  pointer-events:none;">${this._sugarLumps}</div>
              </div>
              <!-- progress bar -->
              <div style="background:rgba(0,0,0,0.4);border-radius:3px;width:44px;height:4px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
                <div id="ccLumpBar" style="height:100%;width:0%;background:linear-gradient(90deg,#c8b890,#fff8e0);transition:width 0.5s;border-radius:3px;"></div>
              </div>
              <div style="color:rgba(255,255,255,0.35);font-size:8px;text-align:center;font-family:Arial,sans-serif;">sugar lump</div>
            </div>
            <button id="ccCashOut" style="background:linear-gradient(135deg,#e6b800,#FFD700);
              color:#1a0060;font-size:12px;font-weight:bold;
              padding:7px 18px;border-radius:26px;border:2px solid #e6b800;cursor:pointer;">💸 Cash Out</button>
          </div>

          <!-- Right -->
          <div style="flex:1;display:flex;flex-direction:column;min-height:0;min-width:0;">
            <!-- Tabs -->
            <div style="display:flex;gap:2px;padding:4px 4px 0;background:rgba(0,0,0,0.3);flex-shrink:0;">
              <button id="ccTabBldg"  data-tab="buildings"    style="flex:1;font-size:9px;padding:4px 1px;border-radius:6px 6px 0 0;border:1px solid rgba(255,160,0,0.3);border-bottom:none;cursor:pointer;background:rgba(255,160,0,0.2);color:#FFD700;font-weight:bold;">🏗️ Build</button>
              <button id="ccTabStats" data-tab="stats"        style="flex:1;font-size:9px;padding:4px 1px;border-radius:6px 6px 0 0;border:1px solid rgba(255,255,255,0.1);border-bottom:none;cursor:pointer;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);">📊 Stats</button>
              <button id="ccTabOpts"  data-tab="options"      style="flex:1;font-size:9px;padding:4px 1px;border-radius:6px 6px 0 0;border:1px solid rgba(255,255,255,0.1);border-bottom:none;cursor:pointer;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);">⚙️ Opts</button>
              <button id="ccTabAch"   data-tab="achievements" style="flex:1;font-size:9px;padding:4px 1px;border-radius:6px 6px 0 0;border:1px solid rgba(255,255,255,0.1);border-bottom:none;cursor:pointer;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);">🏆 Ach</button>
              <button id="ccTabInfo"  data-tab="info"         style="flex:1;font-size:9px;padding:4px 1px;border-radius:6px 6px 0 0;border:1px solid rgba(255,255,255,0.1);border-bottom:none;cursor:pointer;background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.5);">ℹ️ Info</button>
              <button id="ccTabMagic" data-tab="magic"        style="flex:1;font-size:9px;padding:4px 1px;border-radius:6px 6px 0 0;border:1px solid rgba(150,80,255,0.3);border-bottom:none;cursor:pointer;background:rgba(150,80,255,0.08);color:rgba(200,160,255,0.7);">🔮 Magic</button>
            </div>

            <!-- Tab: buildings -->
            <div id="ccBuildingsTab" style="flex:1;display:flex;flex-direction:column;min-height:0;">
              <div id="ccUpgradeRow" style="display:flex;flex-wrap:wrap;gap:3px;padding:4px;
                background:rgba(0,0,0,0.18);border-bottom:1px solid rgba(255,160,0,0.07);flex-shrink:0;"></div>
              <div style="display:flex;gap:3px;padding:3px 4px;flex-shrink:0;background:rgba(0,0,0,0.1);">
                <button id="ccModeBuy"  style="flex:1;font-size:9px;font-weight:bold;padding:3px;border-radius:4px;cursor:pointer;border:1px solid rgba(255,160,0,0.5);background:rgba(255,160,0,0.3);color:#FFD700;">Buy</button>
                <button id="ccModeSell" style="flex:1;font-size:9px;font-weight:bold;padding:3px;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.38);">Sell</button>
                <span style="color:rgba(255,255,255,0.18);font-size:9px;align-self:center;">|</span>
                <button id="ccQty1"   data-qty="1"   style="flex:1;font-size:9px;font-weight:bold;padding:3px;border-radius:4px;cursor:pointer;border:1px solid rgba(255,160,0,0.5);background:rgba(255,160,0,0.3);color:#FFD700;">×1</button>
                <button id="ccQty10"  data-qty="10"  style="flex:1;font-size:9px;font-weight:bold;padding:3px;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.38);">×10</button>
                <button id="ccQty100" data-qty="100" style="flex:1;font-size:9px;font-weight:bold;padding:3px;border-radius:4px;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.38);">×100</button>
              </div>
              <div id="ccBuildings" style="flex:1;overflow-y:auto;padding:3px;display:flex;flex-direction:column;gap:2px;"></div>
            </div>

            <div id="ccStatsTab"   style="flex:1;overflow-y:auto;padding:8px;display:none;"></div>
            <div id="ccOptionsTab" style="flex:1;overflow-y:auto;padding:8px;display:none;"></div>
            <div id="ccAchTab"     style="flex:1;overflow-y:auto;padding:6px;display:none;"></div>
            <div id="ccInfoTab"    style="flex:1;overflow-y:auto;padding:8px;display:none;"></div>
            <div id="ccMagicTab"   style="flex:1;overflow-y:auto;padding:6px;display:none;"></div>
          </div>
        </div>
      </div>
    `;

    this._coinEl     = document.getElementById("ccCoins")!;
    this._cpsEl      = document.getElementById("ccCps")!;
    this._cookieEl   = document.getElementById("ccCookie")!;
    this._clickValEl = document.getElementById("ccClickVal")!;
    this._tickerEl   = document.getElementById("ccTicker")!;
    this._legacyBtn  = document.getElementById("ccLegacy") as HTMLButtonElement;

    this._renderBuildings();
    this._renderUpgradeRow();
    this._renderOptions();
    this._renderAchievements();
    this._applyWobbly();
    this._updateLump();

    this._cookieEl.addEventListener("pointerdown", e => { e.preventDefault(); this._clickCookie(); });
    document.getElementById("ccBack")!.onclick    = () => { this._end(); game.goArcade(); };
    document.getElementById("ccCashOut")!.onclick  = () => this._cashOut();
    document.getElementById("ccLump")!.addEventListener("pointerdown", e => {
      e.stopPropagation();
      if (this._lumpProgress >= 1) {
        this._sugarLumps++;
        this._lumpProgress = 0;
        this._saveLumps();
        this._updateLump();
        this._renderBuildings(); // refresh level-up buttons
        this._showGcToast("🍬 Sugar lump harvested!");
      }
    });
    this._legacyBtn.onclick = () => this._showAscendModal();
    if (hasHacks) document.getElementById("ccAdmin")!.onclick = () => this._showAdminPanel();

    // Bakery name — click to rename
    document.getElementById("ccBakeryName")!.addEventListener("pointerdown", e => {
      e.stopPropagation();
      const name = prompt("Enter your bakery name:", this._bakeryName);
      if (name !== null && name.trim()) {
        this._bakeryName = name.trim().slice(0, 40);
        localStorage.setItem("cc_bakery_name", this._bakeryName);
        const el = document.getElementById("ccBakeryName");
        if (el) el.textContent = this._bakeryName;
      }
    });

    // Buy / Sell mode buttons
    document.getElementById("ccModeBuy")!.addEventListener("pointerdown", e => {
      e.stopPropagation(); this._sellMode = false; this._updateModeButtons(); this._renderBuildings();
    });
    document.getElementById("ccModeSell")!.addEventListener("pointerdown", e => {
      e.stopPropagation(); this._sellMode = true; this._updateModeButtons(); this._renderBuildings();
    });

    ["ccTabBldg","ccTabStats","ccTabOpts","ccTabAch","ccTabInfo"].forEach(id => {
      document.getElementById(id)!.addEventListener("pointerdown", e => {
        e.stopPropagation();
        this._switchTab((e.currentTarget as HTMLElement).dataset["tab"] as typeof this._activeTab);
      });
    });
    [1,10,100].forEach(q => {
      document.querySelector<HTMLElement>(`[data-qty="${q}"]`)
        ?.addEventListener("pointerdown", e => {
          e.stopPropagation();
          this._buyQty = q as 1|10|100;
          this._updateQtyButtons();
          this._renderBuildings();
        });
    });

    game.inMiniGame = true;
    game.autoClickCallback = () => this._clickCookie();
    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
    this._runCursorRing();
  }

  // ─── heavenly bonuses ─────────────────────────────────────────────────────

  private _applyHeavenlyBonuses(): void {
    const hv = this._heavenlyUpgrades;

    // ── CPS multiplier ───────────────────────────────────────────────────────
    let m = 1;
    if (hv.has("hv_cps1"))     m *= 1.05;
    if (hv.has("hv_cps2"))     m *= 1.10;
    if (hv.has("hv_cps3"))     m *= 1.25;
    if (hv.has("hv_cps4"))     m *= 1.50;
    if (hv.has("hv_cps5"))     m *= 2.00;
    if (hv.has("hv_cps6"))     m *= 3.00;
    if (hv.has("hv_cps7"))     m *= 6.00;
    if (hv.has("hv_prestige"))  m *= (1 + this._ascensions * 0.02);
    if (hv.has("hv_prestige2")) m *= (1 + this._ascensions * 0.05);
    if (hv.has("hv_prestige3")) m *= (1 + this._ascensions * 0.10);
    this._hvCpsMult = m;

    // ── Click bonus ──────────────────────────────────────────────────────────
    let cb = 0;
    if (hv.has("hv_click1")) cb +=   1;
    if (hv.has("hv_click2")) cb +=   2;
    if (hv.has("hv_click3")) cb +=   5;
    if (hv.has("hv_click4")) cb +=  10;
    if (hv.has("hv_click5")) cb +=  25;
    if (hv.has("hv_click6")) cb += 100;
    this._clickValue = 1 + cb;

    // ── Sync click (CPS → bonus clicks) ─────────────────────────────────────
    this._hvSyncClick = hv.has("hv_synclick");

    // ── Frenzy duration ──────────────────────────────────────────────────────
    if      (hv.has("hv_frenzy3")) this._hvFrenzyMs = 300_000;
    else if (hv.has("hv_frenzy2")) this._hvFrenzyMs = 120_000;
    else if (hv.has("hv_frenzy1")) this._hvFrenzyMs =  60_000;
    else                            this._hvFrenzyMs =  30_000;

    // ── Golden cookie lifetime ───────────────────────────────────────────────
    let gcLife = 13_000;
    if (hv.has("hv_gclife"))  gcLife +=  5_000;
    if (hv.has("hv_gclife2")) gcLife += 10_000;
    this._hvGcLifeMs = gcLife;

    // ── Lucky payout ─────────────────────────────────────────────────────────
    if      (hv.has("hv_lucky3")) this._hvLuckyMult = 25;
    else if (hv.has("hv_lucky2")) this._hvLuckyMult = 10;
    else if (hv.has("hv_lucky1")) this._hvLuckyMult =  3;
    else                           this._hvLuckyMult =  1;

    // ── Storm coin multiplier ────────────────────────────────────────────────
    if      (hv.has("hv_storm2")) this._hvStormMult = 8;
    else if (hv.has("hv_storm1")) this._hvStormMult = 3;
    else                           this._hvStormMult = 1;

    // ── Achievement bonus flag ───────────────────────────────────────────────
    this._hvAchBonus = hv.has("hv_ach");

    // ── Double prestige flag ─────────────────────────────────────────────────
    this._hvDoublePrestige = hv.has("hv_double");

    // ── Golden cookie frequency ──────────────────────────────────────────────
    if (hv.has("hv_golden3")) this._gcInterval = Math.min(this._gcInterval, 150_000);
    else if (hv.has("hv_golden2")) this._gcInterval = Math.min(this._gcInterval, 200_000);
    else if (hv.has("hv_golden1")) this._gcInterval = Math.min(this._gcInterval, 300_000);

    // ── Starter buildings ────────────────────────────────────────────────────
    if (hv.has("hv_starter"))  this._counts.set("cursor",  (this._counts.get("cursor")  ?? 0) + 10);
    if (hv.has("hv_starter2")) this._counts.set("grandma", (this._counts.get("grandma") ?? 0) +  5);
    if (hv.has("hv_starter3")) this._counts.set("mine",    (this._counts.get("mine")    ?? 0) +  3);
    if (hv.has("hv_starter4")) this._counts.set("factory", (this._counts.get("factory") ?? 0) +  2);
    if (hv.has("hv_starter5")) { for (const b of BUILDINGS) this._counts.set(b.id, (this._counts.get(b.id) ?? 0) + 1); }

    // ── Rebirth: start with bonus cookies ────────────────────────────────────
    if (hv.has("hv_rebirth")) this._coins += 1_000;
  }

  private get _availableChips(): number {
    return Math.max(0, Math.floor(this._prestigeChips - this._heavenlyChipsSpent));
  }

  // ─── cookie click ─────────────────────────────────────────────────────────

  private _clickCookie(): void {
    if (this._done) return;
    const fervantMult = this._fervantEnd > performance.now() ? 2 : 1;
    const orbitMult   = this._orbitEnd   > performance.now() ? 2 : 1;
    const cv = (this._clickValue + (this._hvSyncClick ? Math.floor(this._cps / 100) : 0)) * (1 + this._pantheonClickMult()) * (1 + this._gardenClickMult()) * fervantMult * orbitMult;
    this._coins        += cv;
    this._totalBaked   += cv;
    this._allTimeBaked += cv;
    this._clickCount++;
    this._cookieEl.style.transform = "scale(0.88)";
    setTimeout(() => { this._cookieEl.style.transform = "scale(1)"; }, 70);
    if (this._particlesOn) this._spawnParticles();
    const plus = document.createElement("div");
    plus.textContent = `+${this._clickValue}`;
    plus.style.cssText = `position:absolute;left:${8+Math.random()*26}%;top:${22+Math.random()*36}%;
      color:#FFD700;font-size:14px;font-weight:bold;
      pointer-events:none;transition:all 0.6s ease-out;z-index:20;`;
    document.getElementById("ccRoot")!.appendChild(plus);
    requestAnimationFrame(() => { plus.style.transform="translateY(-46px)"; plus.style.opacity="0"; });
    setTimeout(() => plus.remove(), 650);
  }

  private _spawnParticles(): void {
    const root = document.getElementById("ccRoot"); if (!root) return;
    const cr = this._cookieEl.getBoundingClientRect(), rr = root.getBoundingClientRect();
    const cx = cr.left+cr.width/2-rr.left, cy = cr.top+cr.height/2-rr.top;
    for (let i=0;i<4;i++) {
      const angle=(Math.PI*2*i)/4+Math.random()*0.8, dist=40+Math.random()*28;
      const p = document.createElement("div");
      p.textContent="✨";
      p.style.cssText=`position:absolute;left:${cx-8}px;top:${cy-8}px;font-size:13px;
        pointer-events:none;z-index:25;transition:transform 0.42s ease-out,opacity 0.42s ease-out;`;
      root.appendChild(p);
      requestAnimationFrame(()=>{ p.style.transform=`translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`; p.style.opacity="0"; });
      setTimeout(()=>p.remove(),450);
    }
  }

  // ─── game loop ────────────────────────────────────────────────────────────

  private _loop(ts: number): void {
    if (this._done) return;
    const dt = Math.min(ts - this._lastTs, 100);
    this._lastTs = ts;

    const cpsNow  = this._frenzyEnd > ts ? this._cps * 7 : this._cps;
    const earned  = cpsNow * (dt/1000);
    this._coins        += earned;
    this._totalBaked   += earned;
    this._allTimeBaked += earned;

    this._coinEl.textContent = fmt(this._coins);
    this._cpsEl.textContent  = this._frenzyEnd > ts ? `${fmt(cpsNow)}/s🔥` : fmt(this._cps)+"/s";
    const cpsLeftEl = document.getElementById("ccCpsLeft");
    if (cpsLeftEl) cpsLeftEl.textContent = fmt(this._frenzyEnd > ts ? cpsNow : this._cps);

    if (this._frenzyEnd > ts) {
      if (!this._frenzyEl) {
        this._frenzyEl = document.createElement("div");
        this._frenzyEl.style.cssText=`position:absolute;top:46px;left:50%;transform:translateX(-50%);
          background:rgba(255,80,0,0.9);color:white;font-size:10px;font-weight:bold;
          padding:2px 9px;border-radius:14px;z-index:30;pointer-events:none;white-space:nowrap;`;
        document.getElementById("ccRoot")?.appendChild(this._frenzyEl);
      }
      this._frenzyEl.textContent=`🔥 FRENZY! 7× CPS — ${Math.ceil((this._frenzyEnd-ts)/1000)}s`;
    } else if (this._frenzyEl) { this._frenzyEl.remove(); this._frenzyEl=null; }

    this._gcTimer -= dt;
    if (this._gcTimer<=0 && !this._gcEl) { this._spawnGoldenCookie(); this._gcTimer=this._gcInterval/(this._pantheonGcMult()*(1+this._gardenGcMult())); }

    this._newsTimer += dt;
    if (this._newsTimer>=6000) {
      this._newsTimer=0; this._newsIndex=(this._newsIndex+1)%NEWS.length;
      this._tickerEl.style.opacity="0";
      setTimeout(()=>{ this._tickerEl.textContent=NEWS[this._newsIndex]; this._tickerEl.style.opacity="1"; },420);
    }

    this._achCheckTimer += dt;
    if (this._achCheckTimer>=500) { this._achCheckTimer=0; this._checkAchievements(); }

    // Sugar lump growth + auto-harvest
    if (this._lumpProgress < 1) {
      this._lumpProgress = Math.min(1, this._lumpProgress + dt / this._lumpGrowMs);
      if (this._lumpProgress >= 1) {
        // Auto-harvest
        this._sugarLumps++;
        this._lumpProgress = 0;
        this._saveLumps();
        this._renderBuildings();
        this._showGcToast("🍬 Sugar lump harvested!");
      }
      this._updateLump();
    }

    // Garden plot updates
    if ((this._bldgLevels.get("farm") ?? 0) >= 1) this.updateGardenPlots(dt);

    // Stock market price tick (every 5 seconds)
    this._stockTick += dt;
    if (this._stockTick >= 5_000) {
      this._stockTick = 0;
      this._updateStockPrices();
      const smOv = document.getElementById("stockMarketOverlay");
      if (smOv) this._renderStockContent(smOv);
    }

    // Mana regen
    const wizCount = this._counts.get("wizard") ?? 0;
    this._maxMana = Math.min(100, Math.max(10, wizCount * 2));
    const regenRate = Math.max(0.3, wizCount * 0.04); // mana/sec
    this._mana = Math.min(this._maxMana, this._mana + regenRate * dt / 1000);

    // Faith regen (Sanctum)
    const templeCount = this._counts.get("temple") ?? 0;
    this._maxFaith = Math.min(100, Math.max(10, templeCount * 2));
    const faithRegen = Math.max(0.3, templeCount * 0.04);
    this._faith = Math.min(this._maxFaith, this._faith + faithRegen * dt / 1000);

    // Sanctum overlay refresh (~1/sec)
    this._sanctumTick += dt;
    if (this._sanctumTick >= 1_000) {
      this._sanctumTick = 0;
      const sanOv = document.getElementById("sanctumOverlay");
      if (sanOv) this._renderSanctumContent(sanOv);
    }

    // Stardust regen (Space Station)
    const shipCount = this._counts.get("shipment") ?? 0;
    this._maxStardust = Math.min(100, Math.max(10, shipCount * 2));
    const dustRegen = Math.max(0.3, shipCount * 0.04);
    this._stardust = Math.min(this._maxStardust, this._stardust + dustRegen * dt / 1000);

    // Space overlay refresh (~1/sec)
    this._spaceTick += dt;
    if (this._spaceTick >= 1_000) {
      this._spaceTick = 0;
      const spOv = document.getElementById("spaceOverlay");
      if (spOv) this._renderSpaceContent(spOv);
    }

    this._updateBuyButtons();
    this._updateUpgradeRow();
    if (this._activeTab==="stats")  this._renderStats();
    if (this._activeTab==="magic")  this._renderGrimoire();

    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  // ─── golden cookie ────────────────────────────────────────────────────────

  private _spawnGoldenCookie(): void {
    const root = document.getElementById("ccRoot"); if (!root) return;
    const W=root.clientWidth*0.40, H=root.clientHeight;
    const gc = document.createElement("div");
    gc.textContent="🍪";
    gc.style.cssText=`position:absolute;
      left:${18+Math.random()*(W-70)}px;top:${70+Math.random()*(H-160)}px;
      font-size:52px;cursor:pointer;z-index:25;
      animation:gcPulse 0.8s ease-in-out infinite alternate;
      filter:sepia(1) saturate(20) hue-rotate(-10deg) brightness(1.6)
             drop-shadow(0 0 14px rgba(255,220,0,1)) drop-shadow(0 0 28px rgba(255,160,0,0.8));
      transition:opacity 0.5s;`;
    root.appendChild(gc); this._gcEl=gc;
    if (this._gcAlerts) this._showGcToast("🍪 A golden cookie appeared!");
    gc.addEventListener("pointerdown", e=>{ e.stopPropagation(); this._collectGoldenCookie(); });
    this._gcTimeout=window.setTimeout(()=>{
      if(this._gcEl){this._gcEl.style.opacity="0"; setTimeout(()=>{this._gcEl?.remove();this._gcEl=null;},500);}
    }, this._hvGcLifeMs);
  }

  // Spell-spawned golden cookie — independent of _gcEl so multiples can coexist
  private _spawnSpellGoldenCookie(): void {
    const root = document.getElementById("ccRoot"); if (!root) return;
    const W = root.clientWidth * 0.40, H = root.clientHeight;
    const gc = document.createElement("div");
    gc.textContent = "🍪";
    gc.style.cssText = `position:absolute;
      left:${18+Math.random()*(W-70)}px;top:${70+Math.random()*(H-160)}px;
      font-size:52px;cursor:pointer;z-index:26;
      animation:gcPulse 0.8s ease-in-out infinite alternate;
      filter:sepia(1) saturate(20) hue-rotate(-10deg) brightness(1.6)
             drop-shadow(0 0 14px rgba(255,220,0,1)) drop-shadow(0 0 28px rgba(255,160,0,0.8));
      transition:opacity 0.5s;`;
    root.appendChild(gc);
    if (this._gcAlerts) this._showGcToast("⭐ Force the Hand of Fate!");
    const dismiss = () => {
      gc.style.transition = "transform 0.15s,opacity 0.15s";
      gc.style.transform = "scale(2)";
      gc.style.opacity = "0";
      setTimeout(() => gc.remove(), 160);
      this._gcCount++;
      const roll = Math.random();
      if (roll < 0.5) {
        this._frenzyEnd = performance.now() + this._hvFrenzyMs; this._frenzyCount++;
        this._showGoldenCookieEffect();
        this._showGcToast(`🔥 FRENZY! 7× CPS for ${this._hvFrenzyMs/1000}s!`);
      } else {
        const bonus = Math.max(777, Math.floor(this._cps * 60 * 15)) * this._hvLuckyMult;
        this._coins += bonus; this._totalBaked += bonus; this._allTimeBaked += bonus;
        this._showGcToast(`✨ Lucky! +🪙 ${fmt(bonus)} coins!`);
      }
    };
    gc.addEventListener("pointerdown", e => { e.stopPropagation(); dismiss(); });
    // Auto-expire after the same lifetime as normal golden cookies
    setTimeout(() => {
      if (gc.parentNode) { gc.style.opacity = "0"; setTimeout(() => gc.remove(), 500); }
    }, this._hvGcLifeMs);
  }

  private _showGoldenCookieEffect(): void {
    const root = document.getElementById("ccRoot"); if (!root || !this._cookieEl) return;
    const rootR   = root.getBoundingClientRect();
    const cookieR = this._cookieEl.getBoundingClientRect();
    const cx     = cookieR.left - rootR.left + cookieR.width  / 2;
    const cy     = cookieR.top  - rootR.top  + cookieR.height / 2;
    const radius = cookieR.width / 2 + 34;
    const count  = 28;

    // Flash the main cookie golden
    const prevFilter = this._cookieEl.style.filter;
    this._cookieEl.style.transition = "filter 0.12s,transform 0.12s";
    this._cookieEl.style.filter     = "drop-shadow(0 0 36px rgba(255,220,0,1)) drop-shadow(0 0 70px rgba(255,160,0,0.9)) brightness(1.35)";
    this._cookieEl.style.transform  = "scale(1.12)";
    setTimeout(() => {
      this._cookieEl.style.filter    = prevFilter;
      this._cookieEl.style.transform = "scale(1)";
      setTimeout(() => { this._cookieEl.style.transition = "transform 0.07s"; }, 250);
    }, 280);

    // Spawn cursor ring
    const cursors: HTMLElement[] = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.textContent = "👆";
      el.style.cssText = `
        position:absolute;font-size:15px;pointer-events:none;z-index:8;
        text-shadow:0 0 8px rgba(255,220,0,0.9);
        transform:scale(0);transition:transform 0.25s;
      `;
      root.appendChild(el);
      cursors.push(el);
      // Pop in with stagger
      setTimeout(() => { el.style.transform = `rotate(0deg) scale(1)`; }, i * 12);
    }

    let angle = 0;
    let raf: number;
    const tick = () => {
      angle += 0.007;
      cursors.forEach((el, i) => {
        const a = angle + (i / count) * Math.PI * 2;
        el.style.left      = `${cx + Math.cos(a) * radius - 8}px`;
        el.style.top       = `${cy + Math.sin(a) * radius - 8}px`;
        el.style.transform = `rotate(${a * 180 / Math.PI + 90}deg) scale(1)`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Fade out after 3.5s
    setTimeout(() => {
      cursors.forEach(el => { el.style.transition = "opacity 0.7s"; el.style.opacity = "0"; });
      setTimeout(() => { cancelAnimationFrame(raf); cursors.forEach(el => el.remove()); }, 800);
    }, 3_500);
  }

  private _collectGoldenCookie(): void {
    if (!this._gcEl) return;
    clearTimeout(this._gcTimeout); this._gcCount++;
    this._gcEl.style.transition="transform 0.15s,opacity 0.15s";
    this._gcEl.style.transform="scale(2)"; this._gcEl.style.opacity="0";
    setTimeout(()=>{ this._gcEl?.remove(); this._gcEl=null; },160);
    const lunarActive = this._lunarEnd > performance.now();
    const lunarMult   = lunarActive ? 2 : 1;
    const roll = Math.random();
    if (roll < 0.001) {
      this._triggerCookieStorm();
    } else if (roll < 0.5005) {
      this._frenzyEnd=performance.now()+this._hvFrenzyMs*lunarMult; this._frenzyCount++;
      this._showGoldenCookieEffect();
      this._showGcToast(`🔥 FRENZY! 7× CPS for ${this._hvFrenzyMs*lunarMult/1000}s!${lunarActive?" 🌙":""}`);
    } else {
      const bonus=Math.max(777,Math.floor(this._cps*60*15))*this._hvLuckyMult*lunarMult;
      this._coins+=bonus; this._totalBaked+=bonus; this._allTimeBaked+=bonus;
      this._showGcToast(`✨ Lucky! +🪙 ${fmt(bonus)} coins!${lunarActive?" 🌙":""}`);
    }
  }

  private _showGcToast(msg: string): void {
    const t=document.createElement("div"); t.textContent=msg;
    t.style.cssText=`position:absolute;top:26%;left:50%;transform:translateX(-50%);
      background:rgba(0,0,0,0.9);color:#FFD700;font-size:13px;font-weight:bold;
      padding:8px 18px;border-radius:20px;border:2px solid rgba(255,215,0,0.5);
      z-index:40;pointer-events:none;white-space:nowrap;transition:opacity 0.5s;`;
    document.getElementById("ccRoot")?.appendChild(t);
    const fadeMs = this._fastNotes ? 700 : 2500;
    setTimeout(()=>{t.style.opacity="0";},fadeMs); setTimeout(()=>t.remove(),fadeMs+600);
  }

  // ─── buildings ────────────────────────────────────────────────────────────

  private _calcCps(): void {
    let raw = 0;
    for (const sb of SPACE_BUILDINGS) raw += (this._spaceCounts.get(sb.id) ?? 0) * sb.cps;
    for (const b of BUILDINGS) {
      const count = this._counts.get(b.id) ?? 0;
      let bldMult = 1;
      for (const u of UPGRADES) {
        if (u.bld === b.id && u.mult && this._boughtUpgrades.has(u.id)) bldMult *= u.mult;
      }
      const lvl = this._bldgLevels.get(b.id) ?? 0;
      raw += count * b.cps * bldMult * (1 + lvl * 0.1); // +10% CPS per level
    }
    let globalMult = 1;
    for (const u of UPGRADES) {
      if (u.global && u.mult && this._boughtUpgrades.has(u.id)) globalMult *= u.mult;
    }
    const prestigeDivisor = this._hvDoublePrestige ? 50 : 100;
    const achMult = this._hvAchBonus ? (1 + this._achievements.size * 0.01) : 1;
    const diminishMult = this._diminishEnd > performance.now() ? 2 : 1;
    const pantheonMult = 1 + this._pantheonCpsMult();
    const gardenMult   = 1 + this._gardenCpsMult();
    const ritualMult   = this._ritualEnd > performance.now() ? 3 : 1;
    const warpMult     = this._warpEnd   > performance.now() ? 2 : 1;
    this._cps = raw * globalMult * achMult * diminishMult * pantheonMult * gardenMult * ritualMult * warpMult * (1 + this._prestigeChips / prestigeDivisor) * this._hvCpsMult;
  }

  private _totalOwned(): number {
    let n=0; for(const b of BUILDINGS) n+=(this._counts.get(b.id)??0); return n;
  }

  private _renderBuildings(): void {
    const el=document.getElementById("ccBuildings"); if(!el) return;
    const qty=this._buyQty;
    const sell=this._sellMode;
    el.innerHTML=BUILDINGS.map((b,idx)=>{
      const owned=this._counts.get(b.id)??0;
      // Lock building if you haven't bought at least 1 of the previous
      const locked = idx > 0 && (this._counts.get(BUILDINGS[idx-1].id)??0) === 0;
      const ql=qty>1?` ×${qty}`:"";

      // Locked: show ??? until user buys at least 1 of the previous building
      if (locked) {
        const cost=bulkCost(b,0,1);
        return `<div style="display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:7px;
            background:rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.04);opacity:0.55;">
          <span style="font-size:20px;flex-shrink:0;font-weight:bold;color:rgba(255,255,255,0.3);font-family:Arial,sans-serif;">?</span>
          <div style="flex:1;min-width:0;">
            <div style="color:rgba(255,255,255,0.4);font-size:10px;font-weight:bold;">???</div>
            <div style="color:rgba(255,255,255,0.18);font-size:8px;">??? · <span id="cnt_${b.id}">0</span></div>
          </div>
          <button data-bid="${b.id}" style="background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.25);
            font-size:9px;font-weight:bold;padding:3px 5px;border-radius:5px;border:none;cursor:pointer;
            white-space:nowrap;min-width:46px;text-align:center;flex-shrink:0;">🪙${fmt(cost)}</button>
        </div>`;
      }

      const lvl = this._bldgLevels.get(b.id) ?? 0;
      const canLvl = this._sugarLumps > 0 && owned > 0;
      // Minigame button for buildings with unlockable minigames
      const MINIGAMES: Record<string,{emoji:string,label:string}> = {
        wizard:    {emoji:"🔮", label:"Grimoire"},
        farm:      {emoji:"🌾", label:"Garden"},
        temple:    {emoji:"🛕", label:"Sanctum"},
        bank:      {emoji:"📈", label:"Market"},
        shipment:  {emoji:"🚀", label:"Space"},
      };
      const mg = MINIGAMES[b.id];
      const mgUnlocked = mg && lvl >= 1;
      const mgBtn = mg ? `<button data-mgbid="${b.id}" style="
        background:${mgUnlocked?"rgba(150,80,255,0.3)":"rgba(255,255,255,0.04)"};
        color:${mgUnlocked?"#cc88ff":"rgba(255,255,255,0.12)"};font-size:7px;font-weight:bold;
        padding:2px 4px;border-radius:4px;border:1px solid ${mgUnlocked?"rgba(150,80,255,0.5)":"rgba(255,255,255,0.06)"};
        cursor:${mgUnlocked?"pointer":"default"};white-space:nowrap;flex-shrink:0;line-height:1.4;"
        title="${mgUnlocked?`Open ${mg.label}`:`Level up to unlock ${mg.label}`}">
        ${mg.emoji}${mgUnlocked?mg.label:"???"}</button>` : "";
      const lvlBtn = `<button data-lvlbid="${b.id}" style="
        background:${canLvl?"rgba(255,210,80,0.25)":"rgba(255,255,255,0.04)"};
        color:${canLvl?"#FFD700":"rgba(255,255,255,0.15)"};font-size:7px;font-weight:bold;
        padding:2px 4px;border-radius:4px;border:1px solid ${canLvl?"rgba(255,210,80,0.4)":"rgba(255,255,255,0.06)"};
        cursor:${canLvl?"pointer":"default"};white-space:nowrap;flex-shrink:0;line-height:1.4;">
        🍬Lv.${lvl}</button>`;

      if (sell) {
        const sellQty=Math.min(qty,owned);
        const refund=Math.floor(bulkCost(b,Math.max(0,owned-sellQty),sellQty)*0.65);
        const can=owned>=qty;
        return `<div style="display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:7px;
            background:rgba(255,255,255,0.03);border:1px solid rgba(255,80,0,0.1);">
          <span style="font-size:17px;flex-shrink:0;">${this._seenBuildings.has(b.id)?b.emoji:`<span style="font-weight:bold;color:rgba(255,255,255,0.4);font-family:Arial,sans-serif;">?</span>`}</span>
          <div style="flex:1;min-width:0;">
            <div style="color:white;font-size:10px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.name}</div>
            <div style="color:rgba(255,255,255,0.25);font-size:8px;">${fmt(b.cps)}/s · <span id="cnt_${b.id}">${owned}</span></div>
          </div>
          ${mgBtn}${lvlBtn}
          <button data-bid="${b.id}" style="background:${can?"rgba(220,60,0,0.7)":"rgba(255,255,255,0.06)"};
            color:${can?"#fff":"rgba(255,255,255,0.2)"};font-size:9px;font-weight:bold;
            padding:3px 5px;border-radius:5px;border:none;cursor:${can?"pointer":"default"};
            white-space:nowrap;min-width:46px;text-align:center;flex-shrink:0;">
            ${can?`+🪙${fmt(refund)}${ql}`:`none`}</button>
        </div>`;
      }
      const cost=bulkCost(b,owned,qty), can=this._coins>=cost;
      return `<div style="display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:7px;
          background:rgba(255,255,255,0.03);border:1px solid rgba(255,160,0,0.06);">
        <span style="font-size:17px;flex-shrink:0;">${this._seenBuildings.has(b.id)?b.emoji:`<span style="font-weight:bold;color:rgba(255,255,255,0.4);font-family:Arial,sans-serif;">?</span>`}</span>
        <div style="flex:1;min-width:0;">
          <div style="color:white;font-size:10px;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.name}</div>
          <div style="color:rgba(255,255,255,0.25);font-size:8px;">${fmt(b.cps)}/s · <span id="cnt_${b.id}">${owned}</span></div>
        </div>
        ${mgBtn}${lvlBtn}
        <button data-bid="${b.id}" style="background:${can?"#FFD700":"rgba(255,255,255,0.06)"};
          color:${can?"#1a0060":"rgba(255,255,255,0.2)"};font-size:9px;font-weight:bold;
          padding:3px 5px;border-radius:5px;border:none;cursor:${can?"pointer":"default"};
          white-space:nowrap;min-width:46px;text-align:center;flex-shrink:0;">🪙${fmt(cost)}${ql}</button>
      </div>`;
    }).join("");
    el.querySelectorAll<HTMLElement>("[data-bid]").forEach(btn=>{
      btn.addEventListener("pointerdown",e=>{
        e.stopPropagation();
        const bid=btn.dataset["bid"]!, b=BUILDINGS.find(x=>x.id===bid)!;
        if (this._sellMode) {
          const owned=this._counts.get(bid)??0;
          const sellQty=Math.min(this._buyQty,owned);
          if(sellQty<=0) return;
          const refund=Math.floor(bulkCost(b,Math.max(0,owned-sellQty),sellQty)*0.65);
          this._counts.set(bid,owned-sellQty);
          this._coins+=refund; this._calcCps(); this._renderBuildings();
        } else {
          const owned=this._counts.get(bid)??0;
          let cost=bulkCost(b,owned,this._buyQty);
          if(this._discountNext){ cost=Math.floor(cost*0.75); this._discountNext=false; }
          if(this._coins<cost) return;
          this._coins-=cost; this._counts.set(bid,owned+this._buyQty); this._seenBuildings.add(bid); this._calcCps(); this._renderBuildings();
        }
      });
    });
    // Level-up buttons
    el.querySelectorAll<HTMLElement>("[data-lvlbid]").forEach(btn => {
      btn.addEventListener("pointerdown", e => {
        e.stopPropagation();
        const bid = btn.dataset["lvlbid"]!;
        if (this._sugarLumps <= 0) { this._showGcToast("No sugar lumps! 🍬"); return; }
        const owned = this._counts.get(bid) ?? 0;
        if (owned === 0) { this._showGcToast("Buy this building first!"); return; }
        const b = BUILDINGS.find(x => x.id === bid)!;
        this._sugarLumps--;
        this._bldgLevels.set(bid, (this._bldgLevels.get(bid) ?? 0) + 1);
        this._saveLumps();
        this._calcCps();
        this._renderBuildings();
        this._showGcToast(`🍬 ${b.name} leveled up! (+10% CPS)`);
      });
    });
    // Minigame open buttons
    el.querySelectorAll<HTMLElement>("[data-mgbid]").forEach(btn => {
      btn.addEventListener("pointerdown", e => {
        e.stopPropagation();
        const bid = btn.dataset["mgbid"]!;
        const lvl = this._bldgLevels.get(bid) ?? 0;
        if (lvl < 1) { this._showGcToast("Level up this building first! 🍬"); return; }
        if (bid === "wizard")   this._switchTab("magic");
        if (bid === "farm")     this._openGarden();
        if (bid === "temple")   this._openSanctum();
        if (bid === "bank")     this._openStockMarket();
        if (bid === "shipment") this._openSpace();
      });
    });
  }

  private _saveLumps(): void {
    localStorage.setItem("cc_sugar_lumps",    String(this._sugarLumps));
    localStorage.setItem("cc_lump_progress",  String(this._lumpProgress));
    const lvlObj: Record<string,number> = {};
    for (const [k,v] of this._bldgLevels) lvlObj[k] = v;
    localStorage.setItem("cc_bldg_levels", JSON.stringify(lvlObj));
  }

  // ─── garden ───────────────────────────────────────────────────────────────

  updateGardenPlots(dt: number): void {
    const GROW_MS  = 45_000; // 45s to grow
    const READY_MS = 30_000; // stays ready 30s then dies
    let changed = false;
    for (const plot of this._gardenPlots) {
      if (plot.state === "growing") {
        plot.progress += dt / GROW_MS;
        if (plot.progress >= 1) { plot.state = "ready"; plot.progress = 0; changed = true; }
      } else if (plot.state === "ready") {
        plot.progress += dt / READY_MS;
        if (plot.progress >= 1) { plot.state = "empty"; plot.progress = 0; changed = true; }
      }
    }
    if (changed) {
      const ov = document.getElementById("gardenOverlay");
      if (ov) this._renderGardenContent(ov);
    }
  }

  private _openGarden(): void {
    const root = document.getElementById("ccRoot"); if (!root) return;
    const existing = document.getElementById("gardenOverlay");
    if (existing) { existing.remove(); return; }
    const ov = document.createElement("div");
    ov.id = "gardenOverlay";
    ov.style.cssText = `position:absolute;inset:0;z-index:100;
      background:rgba(5,25,5,0.97);display:flex;flex-direction:column;
      font-family:Arial,sans-serif;overflow:hidden;`;
    this._renderGardenContent(ov);
    root.appendChild(ov);
  }

  private _renderGardenContent(ov: HTMLElement): void {
    ov.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:10px 12px;background:rgba(0,0,0,0.5);flex-shrink:0;
        border-bottom:1px solid rgba(100,220,50,0.2);">
        <span style="color:#aaf060;font-size:14px;font-weight:bold;">🌾 Garden</span>
        <span style="color:rgba(255,255,255,0.45);font-size:10px;">Plant seeds · harvest for CPS bonuses</span>
        <button id="gardenClose" style="background:rgba(255,255,255,0.1);color:white;border:none;
          border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">✕ Close</button>
      </div>
      <div style="padding:12px;display:flex;flex-direction:column;align-items:center;gap:10px;flex:1;">
        <div style="color:rgba(255,255,255,0.4);font-size:9px;">
          Click empty plot to plant (costs 50 🍪) · Ready plots auto-harvest for +2 min CPS
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;max-width:280px;">
          ${this._gardenPlots.map((p,i) => {
            const isEmpty  = p.state === "empty";
            const isGrow   = p.state === "growing";
            const isReady  = p.state === "ready";
            const pct      = Math.floor(p.progress * 100);
            return `<div data-plot="${i}" style="
              background:${isEmpty?"rgba(40,80,20,0.5)":isGrow?"rgba(30,60,10,0.7)":"rgba(20,100,20,0.8)"};
              border:2px solid ${isEmpty?"rgba(100,180,50,0.2)":isGrow?"rgba(100,200,50,0.4)":"rgba(100,255,50,0.8)"};
              border-radius:10px;aspect-ratio:1;cursor:${(isEmpty||isReady)?"pointer":"default"};
              display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
              ${isReady?"box-shadow:0 0 10px rgba(100,255,50,0.6);":""}
              transition:border-color 0.3s;">
              <span style="font-size:${isEmpty?16:22}px;">${isEmpty?"🌰":isGrow?"🌱":"🌾"}</span>
              ${!isEmpty?`<div style="background:rgba(0,0,0,0.4);border-radius:2px;width:80%;height:3px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${isReady?"#ff9944":"#44cc22"};border-radius:2px;"></div>
              </div>`:""}
              <span style="color:rgba(255,255,255,0.5);font-size:7px;">${isEmpty?"plant":isGrow?`${pct}%`:"harvest!"}</span>
            </div>`;
          }).join("")}
        </div>
      </div>
    `;
    ov.querySelector("#gardenClose")!.addEventListener("click", () => ov.remove());
    ov.querySelectorAll<HTMLElement>("[data-plot]").forEach(cell => {
      cell.addEventListener("pointerdown", e => {
        e.stopPropagation();
        const idx = parseInt(cell.dataset["plot"]!);
        const plot = this._gardenPlots[idx];
        if (plot.state === "empty") {
          if (this._coins < 50) { this._showGcToast("Need 50 cookies to plant!"); return; }
          this._coins -= 50;
          plot.state = "growing"; plot.progress = 0;
          this._renderGardenContent(ov);
        } else if (plot.state === "ready") {
          const gain = this._cps * 120;
          this._coins += gain; this._totalBaked += gain; this._allTimeBaked += gain;
          plot.state = "empty"; plot.progress = 0;
          this._renderGardenContent(ov);
          this._showGcToast(`🌾 Harvested! +${fmt(gain)} cookies!`);
        }
      });
    });
  }

  // Garden passive multipliers (placeholder — no plant-type tracking in basic garden)
  private _gardenCpsMult(): number    { return 0; }
  private _gardenClickMult(): number  { return 0; }
  private _gardenGcMult(): number     { return 0; }

  // ─── pantheon ─────────────────────────────────────────────────────────────

  private _pantheonCpsMult(): number {
    let mult = 0;
    for (let s = 0; s < 3; s++) {
      const gid = this._pantheonSlots[s]; if (!gid) continue;
      const g = GODS.find(x => x.id === gid); if (!g) continue;
      if (gid === "holobore") mult += [0.20, 0.12, 0.05][s];
      if (gid === "muridal")  mult += [0.15, 0.08, 0.04][s];
      if (gid === "cyclius")  mult += [0.30, 0.18, 0.08][s];
    }
    return mult;
  }

  private _pantheonClickMult(): number {
    let mult = 0;
    for (let s = 0; s < 3; s++) {
      const gid = this._pantheonSlots[s]; if (!gid) continue;
      if (gid === "vomitrax") mult += [2.0, 1.0, 0.5][s];
      if (gid === "muridal")  mult += [0.8, 0.4, 0.2][s];
    }
    return mult;
  }

  private _pantheonGcMult(): number {
    for (let s = 0; s < 3; s++) {
      if (this._pantheonSlots[s] === "skruuia") return [3.0, 2.0, 1.5][s];
    }
    return 1;
  }

  // ─── stock market ─────────────────────────────────────────────────────────

  private _saveSpaceCounts(): void {
    const obj: Record<string,number> = {};
    for (const sb of SPACE_BUILDINGS) obj[sb.id] = this._spaceCounts.get(sb.id) ?? 0;
    localStorage.setItem("cc_space_counts", JSON.stringify(obj));
  }

  private _saveStocks(): void {
    const prices: Record<string,number> = {};
    const owned:  Record<string,number> = {};
    const avg:    Record<string,number> = {};
    for (const s of STOCKS) {
      prices[s.id] = this._stockPrices.get(s.id) ?? s.basePrice;
      owned[s.id]  = this._stockOwned.get(s.id)  ?? 0;
      avg[s.id]    = this._stockAvgBuy.get(s.id)  ?? s.basePrice;
    }
    localStorage.setItem("cc_stock_prices",  JSON.stringify(prices));
    localStorage.setItem("cc_stock_owned",   JSON.stringify(owned));
    localStorage.setItem("cc_stock_avg_buy", JSON.stringify(avg));
  }

  private _updateStockPrices(): void {
    for (const s of STOCKS) {
      const price = this._stockPrices.get(s.id) ?? s.basePrice;
      // Mean-reverting geometric random walk
      const meanRevert = (s.basePrice - price) / s.basePrice * 0.08;
      const change = (Math.random() * 2 - 1) * s.vol + meanRevert;
      const newPrice = Math.max(1, price * (1 + change));
      this._stockPrices.set(s.id, Math.round(newPrice * 100) / 100);
      // Keep last 20 price ticks for sparkline
      const hist = this._stockHistory.get(s.id) ?? [];
      hist.push(newPrice);
      if (hist.length > 20) hist.shift();
      this._stockHistory.set(s.id, hist);
    }
    this._saveStocks();
  }

  private _sparklineSvg(history: number[]): string {
    if (history.length < 2) return `<span style="font-size:9px;color:rgba(255,255,255,0.2);">—</span>`;
    const W = 56, H = 16;
    const min = Math.min(...history), max = Math.max(...history);
    const range = max - min || 1;
    const pts = history.map((p, i) => {
      const x = (i / (history.length - 1)) * W;
      const y = H - ((p - min) / range) * H * 0.85 - H * 0.05;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    const isUp = history[history.length - 1] >= history[0];
    const color = isUp ? "#44ff88" : "#ff6644";
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible;">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

  private _openStockMarket(): void {
    const root = document.getElementById("ccRoot"); if (!root) return;
    const existing = document.getElementById("stockMarketOverlay");
    if (existing) { existing.remove(); return; }
    const ov = document.createElement("div");
    ov.id = "stockMarketOverlay";
    ov.style.cssText = `position:absolute;inset:0;z-index:100;
      background:rgba(0,5,20,0.97);display:flex;flex-direction:column;
      font-family:Arial,sans-serif;overflow:hidden;`;
    this._renderStockContent(ov);
    root.appendChild(ov);
  }

  private _renderStockContent(ov: HTMLElement): void {
    const portfolioValue = STOCKS.reduce((sum, s) =>
      sum + (this._stockOwned.get(s.id) ?? 0) * (this._stockPrices.get(s.id) ?? s.basePrice), 0);
    const portfolioCost = STOCKS.reduce((sum, s) =>
      sum + (this._stockOwned.get(s.id) ?? 0) * (this._stockAvgBuy.get(s.id) ?? s.basePrice), 0);
    const portfolioGain = portfolioValue - portfolioCost;

    ov.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:10px 12px;background:rgba(0,0,0,0.6);flex-shrink:0;
        border-bottom:1px solid rgba(50,150,255,0.3);">
        <span style="color:#66aaff;font-size:14px;font-weight:bold;">🏦 Stock Market</span>
        <span style="color:rgba(255,255,255,0.35);font-size:9px;">prices update every 5s</span>
        <button id="smClose" style="background:rgba(255,255,255,0.1);color:white;border:none;
          border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">✕ Close</button>
      </div>
      <!-- Portfolio summary -->
      <div style="display:flex;gap:0;padding:0;background:rgba(0,0,0,0.35);flex-shrink:0;
        border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid rgba(255,255,255,0.05);">
          <div style="color:rgba(255,255,255,0.3);font-size:7px;letter-spacing:0.5px;">PORTFOLIO</div>
          <div style="color:#FFD700;font-size:11px;font-weight:bold;">${fmt(portfolioValue)} 🪙</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;border-right:1px solid rgba(255,255,255,0.05);">
          <div style="color:rgba(255,255,255,0.3);font-size:7px;letter-spacing:0.5px;">P&amp;L</div>
          <div style="color:${portfolioGain>=0?"#44ff88":"#ff6644"};font-size:11px;font-weight:bold;">
            ${portfolioGain>=0?"+":""}${fmt(portfolioGain)} 🪙</div>
        </div>
        <div style="flex:1;text-align:center;padding:7px 4px;">
          <div style="color:rgba(255,255,255,0.3);font-size:7px;letter-spacing:0.5px;">COOKIES</div>
          <div style="color:#FFD700;font-size:11px;font-weight:bold;">${fmt(this._coins)} 🪙</div>
        </div>
      </div>
      <!-- Stock rows -->
      <div style="flex:1;overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:5px;">
        ${STOCKS.map(s => {
          const price   = this._stockPrices.get(s.id) ?? s.basePrice;
          const owned   = this._stockOwned.get(s.id) ?? 0;
          const avg     = this._stockAvgBuy.get(s.id) ?? s.basePrice;
          const hist    = this._stockHistory.get(s.id) ?? [price];
          const prevPr  = hist.length >= 2 ? hist[hist.length - 2] : price;
          const pctChg  = ((price - prevPr) / prevPr * 100);
          const up      = price >= prevPr;
          const canBuy  = this._coins >= price;
          const canSell = owned > 0;
          const gainLoss = owned > 0 ? (price - avg) * owned : 0;
          return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(50,100,200,0.14);
            border-radius:10px;padding:8px 10px;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
              <span style="font-size:18px;flex-shrink:0;">${s.emoji}</span>
              <div style="flex:1;min-width:0;">
                <div style="color:white;font-size:10px;font-weight:bold;">${s.name}</div>
                ${owned > 0
                  ? `<div style="color:${gainLoss>=0?"#44ff88":"#ff6644"};font-size:8px;">
                      ${owned} shares · avg ${fmt(avg)} · P&amp;L ${gainLoss>=0?"+":""}${fmt(gainLoss)}</div>`
                  : `<div style="color:rgba(255,255,255,0.2);font-size:8px;">No shares owned</div>`}
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="color:#FFD700;font-size:11px;font-weight:bold;">${fmt(price)} 🪙</div>
                <div style="color:${up?"#44ff88":"#ff6644"};font-size:9px;">
                  ${up?"▲":"▼"} ${Math.abs(pctChg).toFixed(1)}%</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="flex:1;">${this._sparklineSvg(hist)}</div>
              <button data-smstock="${s.id}" data-smaction="buy" style="
                background:${canBuy?"rgba(50,200,100,0.3)":"rgba(255,255,255,0.04)"};
                color:${canBuy?"#88ffaa":"rgba(255,255,255,0.2)"};font-size:9px;font-weight:bold;
                padding:3px 9px;border-radius:6px;cursor:${canBuy?"pointer":"default"};
                border:1px solid ${canBuy?"rgba(50,200,100,0.5)":"rgba(255,255,255,0.07)"};
                white-space:nowrap;">Buy</button>
              <button data-smstock="${s.id}" data-smaction="sell" style="
                background:${canSell?"rgba(220,60,60,0.3)":"rgba(255,255,255,0.04)"};
                color:${canSell?"#ff9999":"rgba(255,255,255,0.2)"};font-size:9px;font-weight:bold;
                padding:3px 9px;border-radius:6px;cursor:${canSell?"pointer":"default"};
                border:1px solid ${canSell?"rgba(220,60,60,0.5)":"rgba(255,255,255,0.07)"};
                white-space:nowrap;">Sell</button>
            </div>
          </div>`;
        }).join("")}
      </div>
      <div style="padding:5px 10px;background:rgba(0,0,0,0.35);flex-shrink:0;
        border-top:1px solid rgba(255,255,255,0.05);">
        <div style="color:rgba(255,255,255,0.2);font-size:8px;text-align:center;">
          1% broker fee on sells · prices mean-revert toward base over time
        </div>
      </div>
    `;

    ov.querySelector("#smClose")!.addEventListener("click", () => ov.remove());
    ov.querySelectorAll<HTMLElement>("[data-smstock]").forEach(btn => {
      btn.addEventListener("pointerdown", e => {
        e.stopPropagation();
        const sid    = btn.dataset["smstock"]!;
        const action = btn.dataset["smaction"]!;
        const s      = STOCKS.find(x => x.id === sid)!;
        const price  = this._stockPrices.get(sid) ?? s.basePrice;
        if (action === "buy") {
          if (this._coins < price) { this._showGcToast("Not enough cookies! 🍪"); return; }
          this._coins -= price;
          const prev   = this._stockOwned.get(sid) ?? 0;
          const prevAv = this._stockAvgBuy.get(sid) ?? price;
          const newOwn = prev + 1;
          this._stockAvgBuy.set(sid, (prevAv * prev + price) / newOwn);
          this._stockOwned.set(sid, newOwn);
          this._saveStocks();
          this._renderStockContent(ov);
          this._showGcToast(`📈 Bought 1 ${s.name} share @ ${fmt(price)}`);
        } else {
          const owned = this._stockOwned.get(sid) ?? 0;
          if (owned <= 0) return;
          const salePrice = Math.floor(price * 0.99); // 1% broker fee
          this._coins      += salePrice;
          this._totalBaked += salePrice;
          this._allTimeBaked += salePrice;
          this._stockOwned.set(sid, owned - 1);
          if (owned - 1 === 0) this._stockAvgBuy.set(sid, s.basePrice);
          this._saveStocks();
          this._renderStockContent(ov);
          const avgPr  = this._stockAvgBuy.get(sid) ?? price;
          const profit = salePrice - avgPr;
          this._showGcToast(`📉 Sold 1 ${s.name} @ ${fmt(salePrice)} (${profit>=0?"+":""}${fmt(profit)})`);
        }
      });
    });
  }

  // ─── sanctum ─────────────────────────────────────────────────────────────

  private _openSanctum(): void {
    const root = document.getElementById("ccRoot"); if (!root) return;
    const existing = document.getElementById("sanctumOverlay");
    if (existing) { existing.remove(); return; }
    const ov = document.createElement("div");
    ov.id = "sanctumOverlay";
    ov.style.cssText = `position:absolute;inset:0;z-index:100;
      background:rgba(20,5,5,0.97);display:flex;flex-direction:column;
      font-family:Arial,sans-serif;overflow-y:auto;`;
    this._renderSanctumContent(ov);
    root.appendChild(ov);
  }

  private _renderSanctumContent(ov: HTMLElement): void {
    const templeLevel = this._bldgLevels.get("temple") ?? 0;
    const fPct        = this._maxFaith > 0 ? (this._faith / this._maxFaith * 100) : 0;
    const now         = performance.now();
    const fervantLeft = this._fervantEnd > now ? Math.ceil((this._fervantEnd - now) / 1000) : 0;
    const lunarLeft   = this._lunarEnd   > now ? Math.ceil((this._lunarEnd   - now) / 1000) : 0;
    const ritualLeft  = this._ritualEnd  > now ? Math.ceil((this._ritualEnd  - now) / 1000) : 0;

    ov.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:10px 12px;background:rgba(0,0,0,0.5);flex-shrink:0;
        border-bottom:1px solid rgba(255,160,60,0.3);">
        <span style="color:#ffaa44;font-size:14px;font-weight:bold;">🛕 Sanctum</span>
        <span style="color:rgba(255,255,255,0.4);font-size:10px;">Offer prayers for divine blessings</span>
        <button id="sanctClose" style="background:rgba(255,255,255,0.1);color:white;border:none;
          border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">✕ Close</button>
      </div>
      <div style="padding:10px;display:flex;flex-direction:column;gap:8px;">
        ${templeLevel < 1 ? `<div style="color:rgba(255,255,255,0.35);font-size:10px;text-align:center;padding:20px 8px;line-height:1.6;">
          <div style="font-size:28px;margin-bottom:6px;">🛕</div>
          Spend a 🍬 sugar lump to level up your<br><b style="color:rgba(255,160,60,0.8);">Temple</b> to unlock prayers!</div>` : `
        <!-- Faith bar -->
        <div style="margin-bottom:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
            <span style="color:rgba(255,160,60,0.9);font-size:9px;font-weight:bold;">✨ Faith</span>
            <span style="color:rgba(255,200,100,0.9);font-size:9px;">${Math.floor(this._faith)} / ${this._maxFaith}</span>
          </div>
          <div style="background:rgba(0,0,0,0.4);border-radius:6px;height:10px;border:1px solid rgba(255,160,0,0.3);overflow:hidden;">
            <div style="width:${fPct}%;height:100%;background:linear-gradient(90deg,#cc6600,#ffaa00);border-radius:5px;
              transition:width 0.3s;box-shadow:0 0 6px rgba(255,160,0,0.6);"></div>
          </div>
        </div>
        <div style="color:rgba(255,255,255,0.25);font-size:8px;margin-bottom:4px;">
          Prayers offered: ${this._prayersCast}
          ${fervantLeft > 0 ? ` · <span style="color:#ffcc88;">🙏 Fervent (${fervantLeft}s)</span>` : ""}
          ${ritualLeft  > 0 ? ` · <span style="color:#ffaa44;">🕯️ Ritual (${ritualLeft}s)</span>` : ""}
          ${lunarLeft   > 0 ? ` · <span style="color:#aaeeff;">🌙 Lunar (${lunarLeft}s)</span>` : ""}
        </div>
        <!-- Prayer grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
          ${PRAYERS.map(p => {
            const canOffer = this._faith >= p.faith;
            return `<div data-prayer="${p.id}" style="
              background:${canOffer?"rgba(200,100,20,0.2)":"rgba(0,0,0,0.25)"};
              border:1px solid ${canOffer?"rgba(255,140,0,0.5)":"rgba(255,255,255,0.06)"};
              border-radius:8px;padding:6px 4px;cursor:${canOffer?"pointer":"default"};
              display:flex;flex-direction:column;align-items:center;gap:2px;
              text-align:center;transition:background 0.15s;">
              <span style="font-size:20px;line-height:1;">${p.emoji}</span>
              <div style="color:${canOffer?"white":"rgba(255,255,255,0.3)"};font-size:7px;font-weight:bold;line-height:1.2;
                word-break:break-word;">${p.name}</div>
              <div style="color:rgba(255,160,0,0.85);font-size:7px;">${p.faith}✨</div>
              <div style="color:rgba(255,255,255,0.2);font-size:6px;">${p.desc}</div>
              <div style="color:rgba(255,255,255,0.2);font-size:7px;">×${this._prayerCounts.get(p.id) ?? 0}</div>
            </div>`;
          }).join("")}
        </div>
        `}
      </div>
    `;

    ov.querySelector("#sanctClose")!.addEventListener("click", () => ov.remove());
    ov.querySelectorAll<HTMLElement>("[data-prayer]").forEach(card => {
      card.addEventListener("pointerdown", e => {
        e.stopPropagation();
        this._offerPrayer(card.dataset["prayer"]!);
        this._renderSanctumContent(ov);
      });
    });
  }

  private _offerPrayer(id: string): void {
    const prayer = PRAYERS.find(p => p.id === id); if (!prayer) return;
    if (this._faith < prayer.faith) { this._showGcToast("Not enough faith! ✨"); return; }
    this._faith -= prayer.faith;
    this._prayersCast++;
    this._prayerCounts.set(id, (this._prayerCounts.get(id) ?? 0) + 1);

    switch (id) {
      case "pr_prayer": {
        this._fervantEnd = performance.now() + 30_000;
        this._showGcToast("🙏 Fervent Prayer! +100% click value for 30s!");
        break;
      }
      case "pr_offering": {
        const gain = this._cps * 600;
        this._coins += gain; this._totalBaked += gain; this._allTimeBaked += gain;
        this._showGcToast(`⛪ Divine Offering! +🪙 ${fmt(gain)} cookies!`);
        break;
      }
      case "pr_wrath": {
        this._spawnSpellGoldenCookie();
        this._showGcToast("⚡ Invoke Wrath! A golden cookie descends!");
        break;
      }
      case "pr_lunar": {
        this._lunarEnd = performance.now() + 60_000;
        this._showGcToast("🌙 Lunar Blessing! 2× golden cookie rewards for 60s!");
        break;
      }
      case "pr_miracle": {
        const owned = BUILDINGS.filter(b => (this._counts.get(b.id) ?? 0) > 0);
        const pool  = owned.length > 0 ? owned : BUILDINGS.slice(0, 3);
        const b     = pool[Math.floor(Math.random() * pool.length)];
        this._counts.set(b.id, (this._counts.get(b.id) ?? 0) + 1);
        this._calcCps(); this._renderBuildings();
        this._showGcToast(`💫 Holy Miracle! Gained a free ${b.name}!`);
        break;
      }
      case "pr_ritual": {
        this._ritualEnd = performance.now() + 45_000;
        this._calcCps();
        this._showGcToast("🕯️ Ritual of Plenty! 3× CPS for 45 seconds!");
        break;
      }
      case "pr_favor": {
        const unowned = UPGRADES.filter(u => !this._boughtUpgrades.has(u.id) && u.cost <= this._coins * 10);
        if (unowned.length === 0) { this._showGcToast("🌟 No upgrades to gift!"); break; }
        const u = unowned[Math.floor(Math.random() * Math.min(unowned.length, 8))];
        this._boughtUpgrades.add(u.id);
        if (u.bonus > 0) { this._clickValue += u.bonus; }
        this._calcCps(); this._renderUpgradeRow();
        this._showGcToast(`🌟 Divine Favor! Gained free upgrade: ${u.name}!`);
        break;
      }
      case "pr_harvest": {
        const gain = this._cps * 1800;
        this._coins += gain; this._totalBaked += gain; this._allTimeBaked += gain;
        this._showGcToast(`🎁 Sacred Harvest! +🪙 ${fmt(gain)} cookies!`);
        break;
      }
      case "pr_storm": {
        this._triggerCookieStorm();
        this._showGcToast("☄️ Grand Ritual! Cookie storm incoming!");
        break;
      }
    }
  }

  // ─── space station ────────────────────────────────────────────────────────

  private _openSpace(): void {
    const root = document.getElementById("ccRoot"); if (!root) return;
    const existing = document.getElementById("spaceOverlay");
    if (existing) { existing.remove(); return; }

    // Build the permanent backdrop once — it never gets cleared by re-renders
    const ov = document.createElement("div");
    ov.id = "spaceOverlay";
    ov.style.cssText = `position:absolute;inset:0;z-index:100;
      background:linear-gradient(160deg,#000008,#00001e,#060012,#000208);
      display:flex;flex-direction:column;font-family:Arial,sans-serif;overflow:hidden;`;

    // Nebula blobs (permanent)
    ov.insertAdjacentHTML("beforeend",`
      <div style="position:absolute;left:58%;top:15%;width:180px;height:120px;
        background:radial-gradient(ellipse,rgba(80,30,160,0.28) 0%,transparent 70%);
        border-radius:50%;pointer-events:none;transform:rotate(-20deg);z-index:0;"></div>
      <div style="position:absolute;left:2%;top:38%;width:150px;height:110px;
        background:radial-gradient(ellipse,rgba(0,80,200,0.22) 0%,transparent 70%);
        border-radius:50%;pointer-events:none;z-index:0;"></div>
      <div style="position:absolute;left:32%;bottom:25%;width:210px;height:90px;
        background:radial-gradient(ellipse,rgba(140,20,80,0.18) 0%,transparent 70%);
        border-radius:50%;pointer-events:none;transform:rotate(12deg);z-index:0;"></div>
    `);

    // Stars (permanent, deterministic RNG)
    const rng = (seed:number) => ((Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
    Array.from({length:70}).forEach((_,i)=>{
      const x  = rng(i*3+1)*100, y = rng(i*3+2)*100;
      const sz = rng(i*3+3)<0.82?1:rng(i*3+3)<0.96?2:3;
      const op = (0.35+rng(i*5)*0.65).toFixed(2);
      const twinkle = i%5===0?`animation:gcPulse ${(0.7+rng(i)*1.5).toFixed(1)}s ease-in-out infinite alternate;`:"";
      const star = document.createElement("div");
      star.style.cssText=`position:absolute;left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:${sz===3?"#ffe8c0":sz===2?"#cce4ff":"white"};
        opacity:${op};pointer-events:none;z-index:0;${twinkle}`;
      ov.appendChild(star);
    });

    // Planets (permanent)
    ov.insertAdjacentHTML("beforeend",`
      <div style="position:absolute;right:7%;top:12%;width:40px;height:40px;
        background:radial-gradient(circle at 32% 30%,#f0a870,#9a3808);
        border-radius:50%;pointer-events:none;z-index:0;
        box-shadow:0 0 18px rgba(220,90,20,0.5),inset -6px -6px 14px rgba(0,0,0,0.5);opacity:0.75;"></div>
      <div style="position:absolute;left:4%;top:8%;width:28px;height:28px;
        background:radial-gradient(circle at 32% 30%,#d8eeff,#4478bb);
        border-radius:50%;pointer-events:none;z-index:0;
        box-shadow:0 0 12px rgba(100,180,255,0.45),inset -4px -4px 10px rgba(0,0,0,0.4);opacity:0.65;"></div>
      <div style="position:absolute;right:8%;bottom:15%;width:58px;height:58px;
        background:radial-gradient(circle at 36% 30%,#f8e898,#c09018);
        border-radius:50%;pointer-events:none;z-index:0;
        box-shadow:0 0 22px rgba(250,200,40,0.4),inset -8px -8px 18px rgba(0,0,0,0.45);opacity:0.55;">
        <div style="position:absolute;top:50%;left:-24%;width:148%;height:12px;
          background:rgba(220,175,40,0.28);border-radius:50%;transform:translateY(-50%) rotate(-9deg);"></div>
      </div>
      <div style="position:absolute;left:8%;bottom:10%;width:20px;height:20px;
        background:radial-gradient(circle at 35% 30%,#ccffee,#228855);
        border-radius:50%;pointer-events:none;z-index:0;
        box-shadow:0 0 10px rgba(60,220,130,0.4);opacity:0.5;"></div>
    `);

    // Scrollable content container — created once, innerHTML rebuilt by _renderSpaceContent
    const content = document.createElement("div");
    content.id = "spaceContent";
    content.style.cssText = `position:relative;z-index:2;display:flex;flex-direction:column;
      width:100%;flex:1;min-height:0;overflow-y:auto;`;
    ov.appendChild(content);

    // Single permanent delegate listener — survives every innerHTML re-render
    content.addEventListener("pointerdown", e => {
      e.stopPropagation();
      const target = e.target as HTMLElement;

      // Close button
      if (target.id === "spaceClose") { ov.remove(); return; }

      // Mission card (or child of one)
      const mCard = target.closest<HTMLElement>("[data-mission]");
      if (mCard) {
        this._launchMission(mCard.dataset["mission"]!);
        this._renderSpaceContent(ov);
        return;
      }

      // Space building buy button (or child of one)
      const bBtn = target.closest<HTMLElement>("[data-spbid]");
      if (bBtn) {
        const sbid  = bBtn.dataset["spbid"]!;
        const sb    = SPACE_BUILDINGS.find(x => x.id === sbid); if (!sb) return;
        const owned = this._spaceCounts.get(sbid) ?? 0;
        const cost  = Math.ceil(sb.baseCost * Math.pow(1.15, owned));
        if (this._coins < cost) { this._showGcToast("Not enough cookies! 🍪"); return; }
        this._coins -= cost;
        this._spaceCounts.set(sbid, owned + 1);
        this._saveSpaceCounts();
        this._calcCps();
        this._renderSpaceContent(ov);
        this._showGcToast(`${sb.emoji} ${sb.name} built! +${fmt(sb.cps)}/s`);
        return;
      }
    });

    this._renderSpaceContent(ov);
    root.appendChild(ov);
  }

  private _renderSpaceContent(ov: HTMLElement): void {
    const content = ov.querySelector<HTMLElement>("#spaceContent"); if (!content) return;
    const shipLevel = this._bldgLevels.get("shipment") ?? 0;
    const dPct      = this._maxStardust > 0 ? (this._stardust / this._maxStardust * 100) : 0;
    const now       = performance.now();
    const warpLeft  = this._warpEnd  > now ? Math.ceil((this._warpEnd  - now) / 1000) : 0;
    const orbitLeft = this._orbitEnd > now ? Math.ceil((this._orbitEnd - now) / 1000) : 0;

    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;
        padding:10px 12px;background:rgba(0,0,16,0.82);flex-shrink:0;
        border-bottom:1px solid rgba(100,160,255,0.2);">
        <span style="color:#88ccff;font-size:14px;font-weight:bold;">🚀 Space Station</span>
        <span style="color:rgba(255,255,255,0.3);font-size:10px;">Launch missions · build in orbit</span>
        <button id="spaceClose" style="background:rgba(255,255,255,0.08);color:white;border:none;
          border-radius:6px;padding:4px 10px;cursor:pointer;font-size:11px;">✕ Close</button>
      </div>
      <div style="padding:10px;display:flex;flex-direction:column;gap:10px;">
        ${shipLevel < 1 ? `<div style="color:rgba(255,255,255,0.35);font-size:10px;text-align:center;padding:20px 8px;line-height:1.6;">
          <div style="font-size:28px;margin-bottom:6px;">🚀</div>
          Spend a 🍬 sugar lump to level up your<br><b style="color:rgba(100,160,255,0.8);">Shipment</b> to unlock the Space Station!</div>` : `

        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
            <span style="color:rgba(160,200,255,0.9);font-size:9px;font-weight:bold;">💫 Stardust</span>
            <span style="color:rgba(180,220,255,0.9);font-size:9px;">${Math.floor(this._stardust)} / ${this._maxStardust}</span>
          </div>
          <div style="background:rgba(0,0,0,0.55);border-radius:6px;height:10px;border:1px solid rgba(100,160,255,0.2);overflow:hidden;">
            <div style="width:${dPct}%;height:100%;background:linear-gradient(90deg,#003ea8,#44aaff);border-radius:5px;
              transition:width 0.3s;box-shadow:0 0 7px rgba(80,160,255,0.8);"></div>
          </div>
          <div style="color:rgba(255,255,255,0.2);font-size:7px;margin-top:3px;">
            Missions: ${this._missionsCast}
            ${warpLeft  > 0 ? ` · <span style="color:#88ccff;">🚀 Warp (${warpLeft}s)</span>` : ""}
            ${orbitLeft > 0 ? ` · <span style="color:#aaddff;">🌟 Orbit (${orbitLeft}s)</span>` : ""}
          </div>
        </div>

        <div style="color:rgba(160,200,255,0.6);font-size:8px;font-weight:bold;letter-spacing:1px;">MISSIONS</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
          ${MISSIONS.map(m => {
            const canLaunch = this._stardust >= m.dust;
            return `<div data-mission="${m.id}" style="
              background:${canLaunch?"rgba(10,40,120,0.55)":"rgba(0,0,0,0.3)"};
              border:1px solid ${canLaunch?"rgba(80,150,255,0.55)":"rgba(255,255,255,0.05)"};
              border-radius:8px;padding:6px 4px;cursor:${canLaunch?"pointer":"default"};
              display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;">
              <span style="font-size:20px;line-height:1;pointer-events:none;">${m.emoji}</span>
              <div style="color:${canLaunch?"white":"rgba(255,255,255,0.25)"};font-size:7px;font-weight:bold;pointer-events:none;">${m.name}</div>
              <div style="color:rgba(100,180,255,0.85);font-size:7px;pointer-events:none;">${m.dust}💫</div>
              <div style="color:rgba(255,255,255,0.16);font-size:6px;pointer-events:none;">${m.desc}</div>
              <div style="color:rgba(255,255,255,0.18);font-size:7px;pointer-events:none;">×${this._missionCounts.get(m.id)??0}</div>
            </div>`;
          }).join("")}
        </div>

        <div style="color:rgba(160,200,255,0.6);font-size:8px;font-weight:bold;letter-spacing:1px;">SPACE STRUCTURES</div>
        <div style="display:flex;flex-direction:column;gap:5px;">
          ${SPACE_BUILDINGS.map(sb => {
            const owned    = this._spaceCounts.get(sb.id) ?? 0;
            const cost     = Math.ceil(sb.baseCost * Math.pow(1.15, owned));
            const canBuy   = this._coins >= cost;
            const totalCps = owned * sb.cps;
            return `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;
              background:${canBuy?"rgba(10,30,80,0.6)":"rgba(0,0,0,0.3)"};
              border:1px solid ${canBuy?"rgba(80,140,255,0.4)":"rgba(255,255,255,0.07)"};
              border-radius:10px;">
              <span style="font-size:24px;flex-shrink:0;pointer-events:none;">${sb.emoji}</span>
              <div style="flex:1;min-width:0;pointer-events:none;">
                <div style="color:white;font-size:10px;font-weight:bold;">${sb.name}
                  <span style="color:rgba(255,255,255,0.4);font-weight:normal;"> ×${owned}</span></div>
                <div style="color:rgba(160,200,255,0.6);font-size:8px;">${sb.desc}</div>
                ${owned>0?`<div style="color:#FFD700;font-size:8px;">${fmt(totalCps)}/s total</div>`:""}
              </div>
              <div data-spbid="${sb.id}" style="
                background:${canBuy?"rgba(40,120,255,0.4)":"rgba(255,255,255,0.05)"};
                color:${canBuy?"#cce8ff":"rgba(255,255,255,0.2)"};font-size:9px;font-weight:bold;
                padding:5px 9px;border-radius:7px;
                border:1px solid ${canBuy?"rgba(80,160,255,0.6)":"rgba(255,255,255,0.07)"};
                cursor:${canBuy?"pointer":"default"};white-space:nowrap;flex-shrink:0;
                user-select:none;">🪙${fmt(cost)}</div>
            </div>`;
          }).join("")}
        </div>
        `}
      </div>
    `;
  }

  private _launchMission(id: string): void {
    const mission = MISSIONS.find(m => m.id === id); if (!mission) return;
    if (this._stardust < mission.dust) { this._showGcToast("Not enough stardust! 💫"); return; }
    this._stardust -= mission.dust;
    this._missionsCast++;
    this._missionCounts.set(id, (this._missionCounts.get(id) ?? 0) + 1);

    switch (id) {
      case "ms_return": {
        const gain = this._cps * 300;
        this._coins += gain; this._totalBaked += gain; this._allTimeBaked += gain;
        this._showGcToast(`🌍 Earth Return! +🪙 ${fmt(gain)} cookies!`);
        break;
      }
      case "ms_moon": {
        this._sugarLumps++;
        this._saveLumps();
        this._renderBuildings();
        this._showGcToast("🌙 Moon Landing! +1 Sugar Lump!");
        break;
      }
      case "ms_mars": {
        const owned = BUILDINGS.filter(b => (this._counts.get(b.id) ?? 0) > 0);
        const pool  = owned.length > 0 ? owned : BUILDINGS.slice(0, 3);
        const b     = pool[Math.floor(Math.random() * pool.length)];
        this._counts.set(b.id, (this._counts.get(b.id) ?? 0) + 1);
        this._calcCps(); this._renderBuildings();
        this._showGcToast(`🔴 Mars Expedition! Free ${b.name}!`);
        break;
      }
      case "ms_asteroid": {
        const gain = this._cps * 900;
        this._coins += gain; this._totalBaked += gain; this._allTimeBaked += gain;
        this._showGcToast(`☄️ Asteroid Mining! +🪙 ${fmt(gain)} cookies!`);
        break;
      }
      case "ms_jovian": {
        this._spawnSpellGoldenCookie();
        this._showGcToast("🪐 Jovian Flyby! A golden cookie drifts by!");
        break;
      }
      case "ms_stellar": {
        this._orbitEnd = performance.now() + 45_000;
        this._showGcToast("🌟 Stellar Survey! 2× click value for 45s!");
        break;
      }
      case "ms_void": {
        this._triggerCookieStorm();
        this._showGcToast("🌌 Void Rift! Cookie storm detected!");
        break;
      }
      case "ms_warp": {
        this._warpEnd = performance.now() + 30_000;
        this._calcCps();
        this._showGcToast("🚀 Warp Drive engaged! 2× CPS for 30s!");
        break;
      }
      case "ms_nova": {
        const gain = this._cps * 3600;
        this._coins += gain; this._totalBaked += gain; this._allTimeBaked += gain;
        this._showGcToast(`💥 Supernova! +🪙 ${fmt(gain)} cookies!`);
        break;
      }
    }
  }

  private _updateLump(): void {
    const lump    = document.getElementById("ccLump");
    const bar     = document.getElementById("ccLumpBar");
    const countEl = document.getElementById("ccLumpCount");
    if (!lump || !bar || !countEl) return;
    const p    = this._lumpProgress;
    const ripe = p >= 1;
    const scale = ripe ? 1.08 : 0.6 + p * 0.4;
    lump.style.transform = `scale(${scale.toFixed(2)})`;
    lump.style.cursor    = ripe ? "pointer" : "default";
    if (ripe) {
      lump.style.boxShadow =
        "2px 4px 8px rgba(0,0,0,0.45), inset -2px -3px 6px rgba(0,0,0,0.15), " +
        "inset 2px 2px 5px rgba(255,255,255,0.6), " +
        "0 0 12px rgba(255,240,180,0.9), 0 0 26px rgba(255,200,80,0.6)";
      lump.style.filter = "brightness(1.15)";
    } else {
      lump.style.boxShadow =
        "2px 4px 8px rgba(0,0,0,0.45), inset -2px -3px 6px rgba(0,0,0,0.15), " +
        "inset 2px 2px 5px rgba(255,255,255,0.6)";
      lump.style.filter = "";
    }
    bar.style.width      = `${(p * 100).toFixed(1)}%`;
    countEl.textContent  = String(this._sugarLumps);
  }

  private _updateModeButtons(): void {
    const buy  = document.getElementById("ccModeBuy");
    const sell = document.getElementById("ccModeSell");
    if (!buy || !sell) return;
    const buyOn = !this._sellMode;
    buy.style.background  = buyOn  ? "rgba(255,160,0,0.3)"  : "rgba(255,255,255,0.04)";
    buy.style.color       = buyOn  ? "#FFD700"               : "rgba(255,255,255,0.38)";
    buy.style.border      = buyOn  ? "1px solid rgba(255,160,0,0.5)" : "1px solid rgba(255,255,255,0.1)";
    sell.style.background = !buyOn ? "rgba(220,60,0,0.3)"   : "rgba(255,255,255,0.04)";
    sell.style.color      = !buyOn ? "#ff8866"               : "rgba(255,255,255,0.38)";
    sell.style.border     = !buyOn ? "1px solid rgba(220,60,0,0.5)" : "1px solid rgba(255,255,255,0.1)";
  }

  private _updateBuyButtons(): void {
    const qty=this._buyQty;
    for(const b of BUILDINGS){
      const btn=document.querySelector<HTMLElement>(`[data-bid="${b.id}"]`); if(!btn) continue;
      const owned=this._counts.get(b.id)??0, cost=bulkCost(b,owned,qty), can=this._coins>=cost;
      btn.style.background=can?"#FFD700":"rgba(255,255,255,0.06)";
      btn.style.color=can?"#1a0060":"rgba(255,255,255,0.2)";
      btn.style.cursor=can?"pointer":"default";
      btn.textContent=`🪙${fmt(cost)}${qty>1?` ×${qty}`:""}`;
      const cntEl=document.getElementById(`cnt_${b.id}`); if(cntEl) cntEl.textContent=String(owned);
    }
  }

  private _updateQtyButtons(): void {
    [1,10,100].forEach(q=>{
      const btn=document.querySelector<HTMLElement>(`[data-qty="${q}"]`); if(!btn) return;
      const a=q===this._buyQty;
      btn.style.background=a?"rgba(255,160,0,0.3)":"rgba(255,255,255,0.04)";
      btn.style.color=a?"#FFD700":"rgba(255,255,255,0.38)";
      btn.style.border=a?"1px solid rgba(255,160,0,0.5)":"1px solid rgba(255,255,255,0.1)";
    });
  }

  // ─── upgrades ────────────────────────────────────────────────────────────

  private _renderUpgradeRow(): void {
    const el=document.getElementById("ccUpgradeRow"); if(!el) return;
    const rem=UPGRADES.filter(u=>!this._boughtUpgrades.has(u.id));
    if(!rem.length){ el.innerHTML=`<span style="color:rgba(255,255,255,0.18);font-size:9px;">All bought!</span>`; return; }
    el.innerHTML=rem.map(u=>{
      const can=this._coins>=u.cost;
      return `<div data-uid="${u.id}" title="${u.name} — 🪙${fmt(u.cost)}: ${u.desc}" style="
        width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;
        font-size:18px;cursor:${can?"pointer":"default"};flex-shrink:0;
        background:${can?"rgba(255,215,0,0.18)":"rgba(255,255,255,0.04)"};
        border:2px solid ${can?"rgba(255,215,0,0.65)":"rgba(255,255,255,0.08)"};
        opacity:${can?1:0.38};">${u.emoji}</div>`;
    }).join("");
    el.querySelectorAll<HTMLElement>("[data-uid]").forEach(tile=>{
      tile.addEventListener("pointerdown",e=>{
        e.stopPropagation();
        const uid=tile.dataset["uid"]!, u=UPGRADES.find(x=>x.id===uid)!;
        if(this._coins<u.cost) return;
        this._coins-=u.cost; this._boughtUpgrades.add(uid);
        if(u.id==="gc"){  this._gcInterval=300_000; this._gcTimer=Math.min(this._gcTimer,300_000); this._showGcToast("🌟 Cookie Shrine! Golden cookies every 5 min!"); }
        else if(u.id==="gc2"){ this._gcInterval=120_000; this._gcTimer=Math.min(this._gcTimer,120_000); this._showGcToast("🌧️ Golden Gust! Golden cookies every 2 min!"); }
        else if(u.id==="gc3"){ this._gcInterval= 60_000; this._gcTimer=Math.min(this._gcTimer, 60_000); this._showGcToast("🌧️ Golden Rain! Golden cookies every 1 min!"); }
        else if(u.id==="gc4"){ this._gcInterval= 30_000; this._gcTimer=Math.min(this._gcTimer, 30_000); this._showGcToast("🌊 Golden Tempest! Golden cookies every 30 sec!"); }
        else if(u.bonus>0){ this._clickValue+=u.bonus; this._clickValEl.textContent=String(this._clickValue); }
        if(u.bld||u.global) this._calcCps();
        this._renderUpgradeRow();
      });
    });
  }

  private _updateUpgradeRow(): void {
    UPGRADES.filter(u=>!this._boughtUpgrades.has(u.id)).forEach(u=>{
      const tile=document.querySelector<HTMLElement>(`[data-uid="${u.id}"]`); if(!tile) return;
      const can=this._coins>=u.cost;
      tile.style.background=can?"rgba(255,215,0,0.18)":"rgba(255,255,255,0.04)";
      tile.style.border=`2px solid ${can?"rgba(255,215,0,0.65)":"rgba(255,255,255,0.08)"}`;
      tile.style.opacity=can?"1":"0.38"; tile.style.cursor=can?"pointer":"default";
    });
  }

  // ─── tabs ─────────────────────────────────────────────────────────────────

  private _switchTab(tab: typeof this._activeTab): void {
    this._activeTab=tab;
    const tabs=["buildings","stats","options","achievements","info","magic"] as const;
    const els=["ccBuildingsTab","ccStatsTab","ccOptionsTab","ccAchTab","ccInfoTab","ccMagicTab"];
    const btns=["ccTabBldg","ccTabStats","ccTabOpts","ccTabAch","ccTabInfo","ccTabMagic"];
    tabs.forEach((t,i)=>{
      const active=t===tab;
      document.getElementById(els[i])!.style.display=active?(t==="buildings"?"flex":"block"):"none";
      const btn=document.getElementById(btns[i])!;
      btn.style.background=active?"rgba(255,160,0,0.2)":"rgba(255,255,255,0.04)";
      btn.style.color=active?"#FFD700":"rgba(255,255,255,0.5)";
      btn.style.border=active?"1px solid rgba(255,160,0,0.3)":"1px solid rgba(255,255,255,0.1)";
      (btn.style as CSSStyleDeclaration).borderBottom="none";
    });
    if(tab==="stats")        this._renderStats();
    if(tab==="options")      this._renderOptions();
    if(tab==="achievements") this._renderAchievements();
    if(tab==="info")         this._renderInfo();
    if(tab==="magic")        this._renderGrimoire();
  }

  private _renderStats(): void {
    const el=document.getElementById("ccStatsTab"); if(!el) return;
    const elapsed=performance.now()-this._startTs;
    const bldgRows=BUILDINGS.filter(b=>(this._counts.get(b.id)??0)>0).map(b=>{
      const cnt=this._counts.get(b.id)!;
      return `<div style="display:flex;justify-content:space-between;padding:1px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span>${b.emoji} ${b.name} ×${cnt}</span><span style="color:#FFD700;">${fmt(cnt*b.cps)}/s</span></div>`;
    }).join("")||`<div style="color:rgba(255,255,255,0.2);font-size:9px;">No buildings yet</div>`;
    el.innerHTML=`
      <div style="color:rgba(255,160,0,0.7);font-size:9px;font-weight:bold;letter-spacing:1px;margin-bottom:7px;">SESSION STATS</div>
      <div style="color:white;font-size:10px;display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">🍪 Total baked</span><span style="color:#FFD700;font-weight:bold;">${fmt(this._totalBaked)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">📅 All-time</span><span style="color:#FFD700;">${fmt(this._allTimeBaked)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">👆 Per click</span><span style="color:#FFD700;">${this._clickValue}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">📈 CPS</span><span style="color:#FFD700;">${fmt(this._cps)}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">🖱️ Clicks</span><span style="color:#FFD700;">${this._clickCount.toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">🍪 Golden cookies</span><span style="color:#FFD700;">${this._gcCount}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">✨ Heavenly Chips</span><span style="color:rgba(200,180,255,0.9);">${Math.floor(this._prestigeChips)} (${this._availableChips} free)</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">🌟 Ascensions</span><span style="color:rgba(200,180,255,0.9);">${this._ascensions}</span></div>
        <div style="display:flex;justify-content:space-between;"><span style="color:rgba(255,255,255,0.42);">⏱ Time played</span><span style="color:#FFD700;">${fmtTime(elapsed)}</span></div>
        <div style="margin-top:6px;color:rgba(255,160,0,0.65);font-size:9px;font-weight:bold;letter-spacing:1px;">BUILDINGS</div>
        <div style="color:rgba(255,255,255,0.6);font-size:9px;">${bldgRows}</div>
      </div>`;
  }

  private _renderOptions(): void {
    const el=document.getElementById("ccOptionsTab"); if(!el) return;
    const tog=(on:boolean)=>on
      ? `background:rgba(255,215,0,0.2);color:#FFD700;border-color:rgba(255,215,0,0.5);`
      : `background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.35);border-color:rgba(255,255,255,0.12);`;
    const btnStyle=`padding:4px 10px;border-radius:16px;font-size:10px;font-weight:bold;border:2px solid;cursor:pointer;`;
    const row=(label:string,id:string,on:boolean,desc:string)=>`
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;">
        <div style="flex:1;">
          <div style="color:white;font-size:11px;">${label}</div>
          <div style="color:rgba(255,255,255,0.3);font-size:8px;margin-top:1px;">${desc}</div>
        </div>
        <button id="${id}" style="${btnStyle}${tog(on)}">${on?"ON":"OFF"}</button>
      </div>`;
    el.innerHTML=`
      <div style="color:rgba(255,160,0,0.7);font-size:9px;font-weight:bold;letter-spacing:1px;margin-bottom:8px;">OPTIONS</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${row("✨ Particle effects",  "ccOptParticles",this._particlesOn, "Click particles on the cookie")}
        ${row("🍪 Wobbly cookie",     "ccOptWobbly",   this._wobblyOn,    "Cookie gently rocks when idle")}
        ${row("🔔 Golden cookie alerts","ccOptAlerts", this._gcAlerts,    "Toast when a golden cookie appears")}
        ${row("⚡ Fast notifications", "ccOptFastNotes",this._fastNotes,  "Notifications disappear much faster")}
        ${row("💀 Scary stuff",       "ccOptScary",    this._scaryStuff,  "Adds ominous atmosphere")}
      </div>
      <div style="color:rgba(255,160,0,0.7);font-size:9px;font-weight:bold;letter-spacing:1px;margin:14px 0 8px;">MODS</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button id="ccModManage"  style="flex:1;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,160,0,0.3);background:rgba(255,160,0,0.08);color:rgba(255,200,100,0.8);font-size:10px;cursor:pointer;">Manage mods</button>
          <button id="ccModCheck"   style="flex:1;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,160,0,0.3);background:rgba(255,160,0,0.08);color:rgba(255,200,100,0.8);font-size:10px;cursor:pointer;">Check mod data</button>
          <button id="ccModPublish" style="flex:1;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,160,0,0.3);background:rgba(255,160,0,0.08);color:rgba(255,200,100,0.8);font-size:10px;cursor:pointer;">Publish mods</button>
        </div>
        <div style="color:rgba(255,255,255,0.2);font-size:8px;text-align:center;">No mods installed</div>
      </div>`;
    const tog2=(id:string,fn:()=>void)=>document.getElementById(id)!.addEventListener("pointerdown",e=>{e.stopPropagation();fn();this._renderOptions();});
    tog2("ccOptParticles", ()=>{ this._particlesOn=!this._particlesOn; });
    tog2("ccOptWobbly",    ()=>{ this._wobblyOn=!this._wobblyOn; this._applyWobbly(); });
    tog2("ccOptAlerts",    ()=>{ this._gcAlerts=!this._gcAlerts; });
    tog2("ccOptFastNotes", ()=>{ this._fastNotes=!this._fastNotes; });
    tog2("ccOptScary",     ()=>{ this._scaryStuff=!this._scaryStuff; this._applyScary(); });
    ["ccModManage","ccModCheck","ccModPublish"].forEach(id=>{
      document.getElementById(id)!.addEventListener("pointerdown",e=>{
        e.stopPropagation();
        this._showGcToast("🧩 Mods are not supported in this version");
      });
    });
  }

  private _applyWobbly(): void {
    if (!this._cookieEl) return;
    this._cookieEl.style.animation = this._wobblyOn ? "ccWobble 2.4s ease-in-out infinite" : "";
  }

  private _applyScary(): void {
    const root = document.getElementById("ccRoot"); if (!root) return;
    root.style.background = this._scaryStuff
      ? "linear-gradient(160deg,#0a0000,#1a0000,#050000)"
      : "linear-gradient(160deg,#1a0800,#2a1000,#0a0800)";
    if (this._cookieEl)
      this._cookieEl.style.filter = this._scaryStuff
        ? "drop-shadow(0 0 18px rgba(255,0,0,0.7)) sepia(0.3)"
        : "drop-shadow(0 0 18px rgba(255,160,0,0.5))";
  }

  // ─── achievements ─────────────────────────────────────────────────────────

  private _checkAchievements(): void {
    const total=this._totalBaked, owned=this._totalOwned();
    const allHas=BUILDINGS.every(b=>(this._counts.get(b.id)??0)>0);
    const checks:[string,boolean][]=[
      ["bake_1",total>=1],["bake_1k",total>=1e3],["bake_100k",total>=1e5],
      ["bake_1m",total>=1e6],["bake_1b",total>=1e9],["bake_1t",total>=1e12],
      ["click_10",this._clickCount>=10],["click_100",this._clickCount>=100],["click_1k",this._clickCount>=1000],
      ["first_bldg",owned>=1],["buildings_10",owned>=10],["buildings_100",owned>=100],
      ["all_types",allHas],["golden_1",this._gcCount>=1],["golden_7",this._gcCount>=7],["golden_77",this._gcCount>=77],
      ["frenzy",this._frenzyCount>=1],["all_upgrades",this._boughtUpgrades.size>=UPGRADES.length],
    ];
    for(const[id,cond] of checks) if(cond && !this._achievements.has(id)) this._unlockAchievement(id);
  }

  private _unlockAchievement(id: string): void {
    if(this._achievements.has(id)) return;
    this._achievements.add(id);
    localStorage.setItem("cc_achievements",JSON.stringify([...this._achievements]));
    const ach=ACHIEVEMENTS.find(a=>a.id===id); if(!ach) return;
    const t=document.createElement("div");
    t.innerHTML=`<div style="font-size:18px;">${ach.emoji}</div><div><div style="font-weight:bold;font-size:11px;">Achievement Unlocked!</div><div style="font-size:10px;opacity:0.85;">${ach.name}</div></div>`;
    t.style.cssText=`position:absolute;bottom:18px;right:12px;background:rgba(20,10,0,0.95);color:#FFD700;
      display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:12px;
      border:2px solid rgba(255,215,0,0.45);z-index:50;pointer-events:none;transition:opacity 0.5s;
      font-family:Arial,sans-serif;box-shadow:0 0 14px rgba(255,215,0,0.2);`;
    document.getElementById("ccRoot")?.appendChild(t);
    setTimeout(()=>{t.style.opacity="0";},3000); setTimeout(()=>t.remove(),3600);
    if(this._activeTab==="achievements") this._renderAchievements();
  }

  private _renderAchievements(): void {
    const el=document.getElementById("ccAchTab"); if(!el) return;
    el.innerHTML=`
      <div style="color:rgba(255,160,0,0.7);font-size:9px;font-weight:bold;letter-spacing:1px;margin-bottom:7px;">
        ACHIEVEMENTS — ${this._achievements.size} / 622</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        ${ACHIEVEMENTS.map(a=>{
          const has=this._achievements.has(a.id);
          return `<div style="display:flex;align-items:center;gap:5px;padding:6px 7px;border-radius:8px;
            background:${has?"rgba(255,215,0,0.1)":"rgba(255,255,255,0.03)"};
            border:1px solid ${has?"rgba(255,215,0,0.3)":"rgba(255,255,255,0.06)"};opacity:${has?1:0.4};">
            <span style="font-size:16px;flex-shrink:0;">${has?a.emoji:"❓"}</span>
            <div style="min-width:0;">
              <div style="color:${has?"#FFD700":"rgba(255,255,255,0.35)"};font-size:9px;font-weight:bold;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${has?a.name:"???"}</div>
              <div style="color:rgba(255,255,255,0.25);font-size:8px;
                white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${has?a.desc:"???"}</div>
            </div>
          </div>`;
        }).join("")}
      </div>`;
  }

  private _renderInfo(): void {
    const el=document.getElementById("ccInfoTab"); if(!el) return;
    el.innerHTML=`
      <div style="color:rgba(255,160,0,0.7);font-size:9px;font-weight:bold;letter-spacing:1px;margin-bottom:10px;">INFO</div>
      <div style="display:flex;flex-direction:column;gap:10px;font-family:Arial,sans-serif;">

        <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.15);border-radius:10px;padding:10px;">
          <div style="color:#FFD700;font-size:12px;font-weight:bold;margin-bottom:4px;">🍪 Cookie Clicker</div>
          <div style="color:rgba(255,255,255,0.55);font-size:9px;line-height:1.5;">
            A cookie-baking idle game. Click the cookie, buy buildings,
            collect golden cookies, and ascend to earn Heavenly Chips
            that give permanent bonuses across runs.
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px;">
          <div style="color:rgba(255,200,100,0.8);font-size:10px;font-weight:bold;margin-bottom:6px;">🎮 Controls</div>
          <div style="color:rgba(255,255,255,0.45);font-size:9px;line-height:1.7;">
            <div>• Tap/click the 🍪 to bake cookies</div>
            <div>• Buy buildings to earn cookies automatically</div>
            <div>• Buy upgrades to boost click & CPS</div>
            <div>• Click ✨ golden cookies for bonuses</div>
            <div>• 💸 Cash Out converts cookies to game coins</div>
            <div>• 🌟 Legacy to ascend &amp; earn Heavenly Chips</div>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px;">
          <div style="color:rgba(255,200,100,0.8);font-size:10px;font-weight:bold;margin-bottom:6px;">✨ Heavenly Chips</div>
          <div style="color:rgba(255,255,255,0.45);font-size:9px;line-height:1.7;">
            <div>Chips = all-time cookies baked ÷ 1,000</div>
            <div>Each chip = +1% CPS permanently</div>
            <div>Spend chips on Heavenly Upgrades</div>
            <div>You keep chips &amp; achievements on ascension</div>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:10px;">
          <div style="color:rgba(255,200,100,0.8);font-size:10px;font-weight:bold;margin-bottom:4px;">🏷️ Version</div>
          <div style="color:rgba(255,255,255,0.3);font-size:9px;">v2.0 — Mini-game edition</div>
          <div style="color:rgba(255,255,255,0.2);font-size:8px;margin-top:2px;">Inspired by Cookie Clicker by Orteil</div>
        </div>

      </div>`;
  }

  // ─── grimoire ─────────────────────────────────────────────────────────────

  private _renderGrimoire(): void {
    const el = document.getElementById("ccMagicTab"); if (!el) return;
    const wizLevel = this._bldgLevels.get("wizard") ?? 0;
    const mPct     = this._maxMana > 0 ? (this._mana / this._maxMana * 100) : 0;
    const diminishActive = this._diminishEnd > performance.now();
    const diminishLeft   = diminishActive ? Math.ceil((this._diminishEnd - performance.now()) / 1000) : 0;

    el.innerHTML = `
      <div style="color:rgba(180,120,255,0.9);font-size:9px;font-weight:bold;letter-spacing:1px;margin-bottom:6px;">🔮 GRIMOIRE</div>

      ${wizLevel < 1 ? `<div style="color:rgba(255,255,255,0.35);font-size:10px;text-align:center;padding:20px 8px;line-height:1.6;">
        <div style="font-size:28px;margin-bottom:6px;">🔮</div>
        Spend a 🍬 sugar lump to level up your<br><b style="color:rgba(180,120,255,0.8);">Wizard Tower</b> to unlock spell casting!</div>` : `

      <!-- Mana bar -->
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
          <span style="color:rgba(180,120,255,0.8);font-size:9px;font-weight:bold;">🔵 Mana</span>
          <span style="color:rgba(200,160,255,0.9);font-size:9px;">${Math.floor(this._mana)} / ${this._maxMana}</span>
        </div>
        <div style="background:rgba(0,0,0,0.4);border-radius:6px;height:10px;border:1px solid rgba(150,80,255,0.3);overflow:hidden;">
          <div style="width:${mPct}%;height:100%;background:linear-gradient(90deg,#5522cc,#aa66ff);border-radius:5px;
            transition:width 0.3s;box-shadow:0 0 6px rgba(170,100,255,0.6);"></div>
        </div>
      </div>

      <div style="color:rgba(255,255,255,0.25);font-size:8px;margin-bottom:8px;">
        Spells cast: ${this._spellsCast}${diminishActive?` · <span style="color:#aaffaa;">✨ Diminished (${diminishLeft}s)</span>`:""}${this._discountNext?` · <span style="color:#FFD700;">💎 Discount ready</span>`:""}
      </div>

      <!-- Spell grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
        ${SPELLS.map(s=>{
          const count = this._spellCounts.get(s.id) ?? 0;
          const canCast = this._mana >= s.mana;
          return `<div data-spell="${s.id}" style="
            background:${canCast?"rgba(150,80,255,0.18)":"rgba(0,0,0,0.25)"};
            border:1px solid ${canCast?"rgba(150,80,255,0.5)":"rgba(255,255,255,0.06)"};
            border-radius:8px;padding:6px 4px;cursor:${canCast?"pointer":"default"};
            display:flex;flex-direction:column;align-items:center;gap:2px;
            text-align:center;transition:background 0.15s;">
            <span style="font-size:20px;line-height:1;">${s.emoji}</span>
            <div style="color:${canCast?"white":"rgba(255,255,255,0.3)"};font-size:7px;font-weight:bold;line-height:1.2;
              word-break:break-word;">${s.name}</div>
            <div style="color:rgba(180,120,255,0.8);font-size:7px;">${s.mana}🔵</div>
            <div style="color:rgba(255,255,255,0.2);font-size:7px;">cast: ${count}</div>
          </div>`;
        }).join("")}
      </div>
      `}
    `;

    el.querySelectorAll<HTMLElement>("[data-spell]").forEach(card => {
      card.addEventListener("pointerdown", e => {
        e.stopPropagation();
        const sid = card.dataset["spell"]!;
        this._castSpell(sid);
      });
    });
  }

  private _castSpell(id: string): void {
    const spell = SPELLS.find(s => s.id === id); if (!spell) return;
    if (this._mana < spell.mana) { this._showGcToast("Not enough mana! 🔵"); return; }
    this._mana -= spell.mana;
    this._spellsCast++;
    this._spellCounts.set(id, (this._spellCounts.get(id) ?? 0) + 1);

    switch (id) {
      case "sp_conjure": {
        const gain = this._cps * 300;
        this._coins += gain;
        this._totalBaked += gain;
        this._allTimeBaked += gain;
        this._showGcToast(`🍪 Conjured ${fmt(gain)} cookies!`);
        break;
      }
      case "sp_fate": {
        this._spawnSpellGoldenCookie();
        break;
      }
      case "sp_edifice": {
        const owned = BUILDINGS.filter(b => (this._counts.get(b.id) ?? 0) > 0);
        const pool  = owned.length > 0 ? owned : BUILDINGS.slice(0, 3);
        const b     = pool[Math.floor(Math.random() * pool.length)];
        this._counts.set(b.id, (this._counts.get(b.id) ?? 0) + 1);
        this._calcCps(); this._renderBuildings();
        this._showGcToast(`🏗️ Gained a free ${b.name}!`);
        break;
      }
      case "sp_pixies": {
        const unowned = UPGRADES.filter(u => !this._boughtUpgrades.has(u.id) && u.cost <= this._coins * 10);
        if (unowned.length === 0) { this._showGcToast("🧚 No upgrades to gift!"); break; }
        const u = unowned[Math.floor(Math.random() * Math.min(unowned.length, 8))];
        this._boughtUpgrades.add(u.id);
        if (u.bonus > 0) { this._clickValue += u.bonus; }
        this._calcCps(); this._renderUpgradeRow();
        this._showGcToast(`🧚 Gained free upgrade: ${u.name}!`);
        break;
      }
      case "sp_diminish": {
        this._diminishEnd = performance.now() + 60_000;
        this._calcCps();
        this._showGcToast("✨ CPS doubled for 60 seconds!");
        break;
      }
      case "sp_gambler": {
        if (Math.random() < 0.6) {
          const gain = this._cps * 600;
          this._coins += gain;
          this._totalBaked += gain;
          this._allTimeBaked += gain;
          this._showGcToast(`🎲 Lucky! +${fmt(gain)} cookies!`);
        } else {
          const loss = this._coins * 0.1;
          this._coins = Math.max(0, this._coins - loss);
          this._showGcToast(`🎲 Bad luck! Lost ${fmt(loss)} cookies...`);
        }
        break;
      }
      case "sp_haggler": {
        this._discountNext = true;
        this._showGcToast("💎 Next building purchase costs 25% less!");
        break;
      }
      case "sp_resurrect": {
        const gain = this._cps * 1_800;
        this._coins += gain;
        this._totalBaked += gain;
        this._allTimeBaked += gain;
        this._showGcToast(`💀 Conjured ${fmt(gain)} cookies from beyond!`);
        break;
      }
      case "sp_stretch": {
        if (this._frenzyEnd > performance.now()) {
          this._frenzyEnd += 30_000;
          this._showGcToast("⏰ Frenzy extended by 30 seconds!");
        } else {
          this._showGcToast("⏰ No active frenzy to stretch!");
          // refund half
          this._mana = Math.min(this._maxMana, this._mana + spell.mana * 0.5);
        }
        break;
      }
    }
  }

  // ─── ascension ────────────────────────────────────────────────────────────

  private _calcChipGain(): number {
    // 1 chip per 1,000 all-time cookies — the more you bake, the more you earn
    const potential = Math.floor(this._allTimeBaked / 1_000);
    return Math.max(0, potential - Math.floor(this._prestigeChips));
  }

  private _showAscendModal(): void {
    const chipGain = this._calcChipGain();
    const newTotal = Math.floor(this._prestigeChips) + chipGain;

    const overlay = document.createElement("div");
    overlay.style.cssText=`position:absolute;inset:0;background:rgba(0,0,0,0.85);
      display:flex;align-items:center;justify-content:center;z-index:100;font-family:Arial,sans-serif;`;
    const box = document.createElement("div");
    box.style.cssText=`background:linear-gradient(160deg,#0a0020,#1a0840);
      border:2px solid rgba(255,215,0,0.4);border-radius:20px;
      padding:24px 22px;max-width:290px;width:90%;text-align:center;
      box-shadow:0 0 40px rgba(255,215,0,0.15);`;
    box.innerHTML=`
      <div style="font-size:42px;margin-bottom:8px;">🌟</div>
      <div style="color:#FFD700;font-size:20px;font-weight:bold;margin-bottom:14px;">Ascend?</div>
      <div style="color:rgba(100,255,180,0.9);font-size:13px;margin-bottom:10px;text-align:left;
        background:rgba(0,255,100,0.05);border:1px solid rgba(0,255,100,0.15);border-radius:10px;padding:9px 11px;">
        <div style="font-weight:bold;margin-bottom:3px;">GAIN:</div>
        <div>✨ ${chipGain} Heavenly Chips</div>
        <div style="color:rgba(200,255,220,0.6);font-size:11px;">Total: ${newTotal} chips → +${newTotal}% CPS</div>
      </div>
      <div style="color:rgba(255,120,100,0.9);font-size:13px;margin-bottom:14px;text-align:left;
        background:rgba(255,50,0,0.05);border:1px solid rgba(255,80,0,0.2);border-radius:10px;padding:9px 11px;">
        <div style="font-weight:bold;margin-bottom:3px;">LOSE:</div>
        <div>• All cookies, buildings &amp; run upgrades</div>
      </div>
      <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-bottom:18px;">
        Achievements &amp; Heavenly Chips are kept forever.
      </div>
      <div style="display:flex;gap:9px;justify-content:center;">
        <button id="ccAscCancel" style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);
          font-size:15px;padding:9px 18px;border-radius:28px;
          border:1px solid rgba(255,255,255,0.22);cursor:pointer;">✗ Cancel</button>
        <button id="ccAscConfirm" style="background:linear-gradient(135deg,#c89600,#FFD700);
          color:#1a0060;font-size:14px;font-weight:bold;
          padding:9px 18px;border-radius:28px;border:2px solid #e6b800;cursor:pointer;">✨ ASCEND</button>
      </div>`;
    overlay.appendChild(box);
    document.getElementById("ccRoot")!.appendChild(overlay);
    document.getElementById("ccAscCancel")!.onclick  = () => overlay.remove();
    document.getElementById("ccAscConfirm")!.onclick = () => { overlay.remove(); this._doAscend(chipGain); };
  }

  private _doAscend(chipGain: number): void {
    // Update prestige state
    this._prestigeChips += chipGain;
    this._ascensions++;
    localStorage.setItem("cc_prestige_chips",  String(this._prestigeChips));
    localStorage.setItem("cc_all_time_baked",  String(this._allTimeBaked));
    localStorage.setItem("cc_ascensions",       String(this._ascensions));
    if (this._ascensions===1) this._unlockAchievement("ascend_1");
    if (this._ascensions>=5)  this._unlockAchievement("ascend_5");

    // Stop the game loop before animation
    cancelAnimationFrame(this._raf);
    clearTimeout(this._gcTimeout);
    this._gcEl?.remove(); this._gcEl=null;
    this._frenzyEl?.remove(); this._frenzyEl=null;
    this._done = true;

    this._showBreakAnimation(chipGain);
  }

  // ─── cookie break animation + heavenly screen ─────────────────────────────

  private _showBreakAnimation(chipGain: number): void {
    const root = document.getElementById("ccRoot")!;

    // Dark overlay
    const overlay = document.createElement("div");
    overlay.style.cssText=`position:absolute;inset:0;background:rgba(0,0,0,0);z-index:200;
      display:flex;align-items:center;justify-content:center;transition:background 0.6s;`;
    root.appendChild(overlay);
    requestAnimationFrame(()=>{ overlay.style.background="rgba(0,0,0,0.92)"; });

    // Big central cookie to "break"
    const bigCookie = document.createElement("div");
    bigCookie.textContent = "🍪";
    bigCookie.style.cssText=`font-size:100px;transition:transform 0.5s ease-in,opacity 0.5s ease-in;`;
    overlay.appendChild(bigCookie);

    // Spawn fragments flying outward
    setTimeout(()=>{
      bigCookie.style.transform="scale(0.1)";
      bigCookie.style.opacity="0";

      const W=root.clientWidth, H=root.clientHeight;
      const cx=W/2, cy=H/2;
      const count=10;
      for(let i=0;i<count;i++){
        const angle=(Math.PI*2*i)/count + Math.random()*0.5;
        const dist=80+Math.random()*120;
        const frag=document.createElement("div");
        frag.textContent="🍪";
        frag.style.cssText=`position:absolute;font-size:${22+Math.random()*20}px;
          left:${cx-20}px;top:${cy-20}px;z-index:201;pointer-events:none;
          transition:transform 0.65s ease-out,opacity 0.65s ease-out;`;
        root.appendChild(frag);
        requestAnimationFrame(()=>{
          frag.style.transform=`translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) rotate(${(Math.random()-0.5)*720}deg) scale(0)`;
          frag.style.opacity="0";
        });
        setTimeout(()=>frag.remove(), 700);
      }

      // Flash white
      const flash=document.createElement("div");
      flash.style.cssText=`position:absolute;inset:0;background:white;opacity:0;z-index:202;
        transition:opacity 0.15s;pointer-events:none;`;
      root.appendChild(flash);
      setTimeout(()=>{ flash.style.opacity="0.8"; },300);
      setTimeout(()=>{ flash.style.opacity="0"; },500);
      setTimeout(()=>{ flash.remove(); overlay.remove(); bigCookie.remove(); this._showHeavenlyScreen(chipGain); }, 750);
    }, 200);
  }

  private _showHeavenlyScreen(newChips: number): void {
    const game = this._g;
    const self  = this;

    const renderScreen = () => {
      const avail = self._availableChips;

      game.ui.innerHTML = `
        <div id="hvRoot" style="
          position:relative;width:100%;height:100%;overflow:hidden;
          background:radial-gradient(ellipse at 50% 30%, #1a0840 0%, #050010 70%);
          display:flex;flex-direction:column;align-items:center;
          font-family:Arial,sans-serif;user-select:none;
          pointer-events:all;touch-action:none;
        ">
          <!-- Stars -->
          ${Array.from({length:20},(_,_i)=>`<div style="position:absolute;
            left:${Math.random()*100}%;top:${Math.random()*70}%;
            width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;
            border-radius:50%;background:white;opacity:${0.2+Math.random()*0.6};
            pointer-events:none;"></div>`).join("")}

          <!-- Header -->
          <div style="margin-top:28px;text-align:center;flex-shrink:0;">
            <div style="font-size:52px;margin-bottom:6px;">✨</div>
            <div style="color:#FFD700;font-size:24px;font-weight:bold;margin-bottom:4px;">Heavenly Upgrades</div>
            <div style="color:rgba(255,255,255,0.5);font-size:12px;">Permanent bonuses that survive every ascension</div>
            <div style="margin-top:10px;background:rgba(255,215,0,0.12);border:1px solid rgba(255,215,0,0.3);
              border-radius:14px;padding:6px 18px;display:inline-block;">
              <span style="color:#FFD700;font-size:15px;font-weight:bold;">✨ <span id="hvAvail">${avail}</span> chips available</span>
              <span style="color:rgba(255,255,255,0.3);font-size:11px;margin-left:6px;">(${Math.floor(self._prestigeChips)} total)</span>
            </div>
            ${newChips > 0 ? `<div style="color:rgba(100,255,180,0.8);font-size:11px;margin-top:4px;">+${newChips} chips gained this ascension!</div>` : ""}
          </div>

          <!-- Upgrade grid -->
          <div style="flex:1;overflow-y:auto;width:100%;max-width:420px;padding:12px;box-sizing:border-box;">
            <div id="hvGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>
          </div>

          <!-- Begin button -->
          <div style="padding:14px;flex-shrink:0;">
            <button id="hvBegin" style="
              background:linear-gradient(135deg,#c89600,#FFD700);
              color:#1a0060;font-size:17px;font-weight:bold;
              padding:13px 40px;border-radius:40px;border:3px solid #e6b800;
              cursor:pointer;font-family:Arial,sans-serif;
              box-shadow:0 0 20px rgba(255,215,0,0.4);">🍪 Begin New Run</button>
          </div>
        </div>
      `;

      const renderGrid = () => {
        const grid = document.getElementById("hvGrid"); if(!grid) return;
        const av = self._availableChips;
        grid.innerHTML = HEAVENLY_UPGRADES.map(u=>{
          const owned = self._heavenlyUpgrades.has(u.id);
          const can   = !owned && av >= u.cost;
          return `<div data-hvid="${u.id}" style="
            padding:10px;border-radius:12px;cursor:${can?"pointer":owned?"default":"default"};
            background:${owned?"rgba(255,215,0,0.12)":can?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)"};
            border:2px solid ${owned?"rgba(255,215,0,0.5)":can?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.08)"};
            opacity:${owned?1:can?1:0.45};
          ">
            <div style="font-size:26px;margin-bottom:5px;text-align:center;">${u.emoji}</div>
            <div style="color:${owned?"#FFD700":"white"};font-size:11px;font-weight:bold;text-align:center;margin-bottom:3px;">${u.name}</div>
            <div style="color:rgba(255,255,255,0.5);font-size:9px;text-align:center;margin-bottom:6px;">${u.desc}</div>
            ${owned
              ? `<div style="color:rgba(100,255,160,0.8);font-size:9px;text-align:center;font-weight:bold;">✓ OWNED</div>`
              : `<div style="color:${can?"#FFD700":"rgba(255,255,255,0.25)"};font-size:10px;text-align:center;font-weight:bold;">✨ ${u.cost} chips</div>`
            }
          </div>`;
        }).join("");

        grid.querySelectorAll<HTMLElement>("[data-hvid]").forEach(card=>{
          card.addEventListener("pointerdown", e=>{
            e.stopPropagation();
            const id=card.dataset["hvid"]!;
            const u=HEAVENLY_UPGRADES.find(x=>x.id===id)!;
            if(self._heavenlyUpgrades.has(id)) return;
            if(self._availableChips < u.cost) return;
            self._heavenlyChipsSpent += u.cost;
            self._heavenlyUpgrades.add(id);
            localStorage.setItem("cc_heavenly_chips_spent", String(self._heavenlyChipsSpent));
            localStorage.setItem("cc_heavenly_upgrades",    JSON.stringify([...self._heavenlyUpgrades]));
            const availEl=document.getElementById("hvAvail");
            if(availEl) availEl.textContent=String(self._availableChips);
            renderGrid();
          });
        });
      };

      renderGrid();

      document.getElementById("hvBegin")!.addEventListener("pointerdown", ()=>{
        game.inMiniGame = false;
        game.autoClickCallback = null;
        new CookieClicker(game);
      });
    };

    renderScreen();
  }

  // ─── cookie storm ─────────────────────────────────────────────────────────

  private _triggerCookieStorm(): void {
    const root = document.getElementById("ccRoot");
    if (!root || this._done) return;

    const count = 80 + Math.floor(Math.random() * 40); // 80–120 cookies
    const W = root.clientWidth;
    const H = root.clientHeight;
    const lifetime = 6_000; // 6 seconds to click them

    this._showGcToast("🍪🍪🍪 COOKIE STORM! 🍪🍪🍪");

    for (let i = 0; i < count; i++) {
      // Stagger spawn over 1.5s so they don't all appear at once
      setTimeout(() => {
        if (this._done) return;
        const gc = document.createElement("div");
        gc.textContent = "🍪";
        const x = 10 + Math.random() * (W - 60);
        const y = 50 + Math.random() * (H - 100);
        gc.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;
          font-size:${20 + Math.floor(Math.random() * 24)}px;
          cursor:pointer;z-index:22;
          filter:sepia(1) saturate(20) hue-rotate(-10deg) brightness(1.6)
                 drop-shadow(0 0 6px rgba(255,220,0,0.9));
          transition:transform 0.2s,opacity 0.4s;
          transform:scale(0);opacity:0;
        `;
        root.appendChild(gc);

        // Pop in
        requestAnimationFrame(() => {
          gc.style.transform = "scale(1)";
          gc.style.opacity   = "1";
        });

        // Each cookie is worth clickValue * 5 * stormMult (or min 10)
        const reward = Math.max(10, this._clickValue * 5 * this._hvStormMult);
        gc.addEventListener("pointerdown", e => {
          e.stopPropagation();
          if (gc.dataset["clicked"]) return;
          gc.dataset["clicked"] = "1";
          this._coins        += reward;
          this._totalBaked   += reward;
          this._allTimeBaked += reward;
          // Float text
          const plus = document.createElement("div");
          plus.textContent = `+${reward}`;
          plus.style.cssText = `position:absolute;left:${x}px;top:${y - 10}px;
            color:#FFD700;font-size:13px;font-weight:bold;
            pointer-events:none;transition:all 0.5s ease-out;z-index:25;`;
          root.appendChild(plus);
          requestAnimationFrame(() => { plus.style.transform="translateY(-36px)"; plus.style.opacity="0"; });
          setTimeout(() => plus.remove(), 520);
          // Pop out
          gc.style.transform = "scale(2)";
          gc.style.opacity   = "0";
          setTimeout(() => gc.remove(), 220);
        });

        // Auto-despawn
        setTimeout(() => {
          gc.style.opacity = "0";
          gc.style.transform = "scale(0)";
          setTimeout(() => gc.remove(), 420);
        }, lifetime - 400);

      }, Math.random() * 1500);
    }
  }

  // ─── admin panel ──────────────────────────────────────────────────────────

  private _showAdminPanel(): void {
    const existing = document.getElementById("ccAdminPanel");
    if (existing) { existing.remove(); return; } // toggle off

    const panel = document.createElement("div");
    panel.id = "ccAdminPanel";
    panel.style.cssText = `
      position:absolute;top:46px;left:0;right:0;z-index:80;
      background:rgba(10,0,0,0.96);border-bottom:2px solid rgba(255,80,0,0.5);
      padding:10px 12px;display:flex;flex-wrap:wrap;gap:7px;
      font-family:Arial,sans-serif;
    `;

    const btnStyle = (color: string) => `
      font-size:11px;font-weight:bold;padding:5px 11px;border-radius:8px;cursor:pointer;
      background:rgba(${color},0.2);color:rgb(${color});
      border:1px solid rgba(${color},0.5);white-space:nowrap;
    `;

    const cmds: [string, string, () => void][] = [
      ["255,160,0",  "+1K cookies",        () => { this._coins+=1_000;           this._totalBaked+=1_000;           this._allTimeBaked+=1_000; }],
      ["255,160,0",  "+1M cookies",        () => { this._coins+=1_000_000;       this._totalBaked+=1_000_000;       this._allTimeBaked+=1_000_000; }],
      ["255,160,0",  "+1B cookies",        () => { this._coins+=1_000_000_000;   this._totalBaked+=1_000_000_000;   this._allTimeBaked+=1_000_000_000; }],
      ["200,180,255","+100 chips",         () => { this._prestigeChips+=100;     localStorage.setItem("cc_prestige_chips", String(this._prestigeChips)); }],
      ["200,180,255","+1000 chips",        () => { this._prestigeChips+=1_000;   localStorage.setItem("cc_prestige_chips", String(this._prestigeChips)); }],
      ["100,220,255","Spawn golden 🍪",    () => { if (!this._gcEl) { this._gcTimer=0; } }],
      ["100,220,255","Cookie Storm 🍪🍪🍪",() => { this._triggerCookieStorm(); }],
      ["100,220,255","Frenzy 🔥",          () => { this._frenzyEnd=performance.now()+this._hvFrenzyMs; this._frenzyCount++; this._showGcToast("🔥 ADMIN FRENZY!"); }],
      ["100,255,160","Max buildings",      () => { for(const b of BUILDINGS) this._counts.set(b.id, (this._counts.get(b.id)??0)+100); this._calcCps(); this._renderBuildings(); }],
      ["100,255,160","Buy all upgrades",   () => { for(const u of UPGRADES){ if(!this._boughtUpgrades.has(u.id)){ this._boughtUpgrades.add(u.id); if(u.bonus>0){ this._clickValue+=u.bonus; this._clickValEl.textContent=String(this._clickValue); } if(u.id==="gc"){ this._gcInterval=300_000; } else if(u.id==="gc2"){ this._gcInterval=120_000; } else if(u.id==="gc3"){ this._gcInterval=60_000; } else if(u.id==="gc4"){ this._gcInterval=30_000; } } } this._calcCps(); this._renderUpgradeRow(); }],
      ["255,100,100","Reset run",          () => { this._end(); new CookieClicker(this._g); }],
    ];

    for (const [color, label, fn] of cmds) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = btnStyle(color);
      btn.addEventListener("pointerdown", e => { e.stopPropagation(); fn(); });
      panel.appendChild(btn);
    }

    document.getElementById("ccRoot")!.appendChild(panel);
  }

  // ─── cash out / end ───────────────────────────────────────────────────────

  private _cashOut(): void {
    if (this._done) return;
    localStorage.setItem("cc_all_time_baked", String(this._allTimeBaked));
    this._saveLumps();
    this._end();
    const earned=Math.floor(this._coins);
    this._g.state.coins+=earned; this._g.save();

    const wrap=document.createElement("div");
    wrap.className="screen";
    wrap.style.cssText="background:linear-gradient(160deg,#1a0800,#2a1000);gap:14px;font-family:Arial,sans-serif;";
    wrap.innerHTML=`
      <div style="font-size:52px;">🍪</div>
      <div style="color:#FFD700;font-size:28px;font-weight:bold;">Cashed Out!</div>
      <div style="color:white;font-size:18px;">You earned <strong style="color:#FFD700;">${earned.toLocaleString()} 🪙</strong></div>
      <div style="color:rgba(255,215,0,0.7);font-size:14px;">Total coins: ${this._g.state.coins.toLocaleString()} 🪙</div>`;
    const btnWrap=document.createElement("div");
    btnWrap.style.cssText="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:8px;";
    const again=document.createElement("button");
    again.textContent="▶ Play Again";
    again.style.cssText="background:#FFD700;color:#1a0060;font-size:17px;font-weight:bold;padding:12px 30px;border-radius:40px;border:3px solid #e6b800;cursor:pointer;font-family:Arial,sans-serif;";
    again.addEventListener("click",()=>new CookieClicker(this._g));
    const back=document.createElement("button");
    back.textContent="← Back to Arcade";
    back.style.cssText="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);font-size:15px;padding:9px 26px;border-radius:40px;border:1px solid rgba(255,255,255,0.3);cursor:pointer;font-family:Arial,sans-serif;";
    back.addEventListener("click",()=>this._g.goArcade());
    btnWrap.appendChild(again); btnWrap.appendChild(back);
    wrap.appendChild(btnWrap);
    this._g.ui.innerHTML=""; this._g.ui.appendChild(wrap);
  }

  private _runCursorRing(): void {
    this._cursorRingId = requestAnimationFrame(() => this._runCursorRing());
    if (this._done) return;

    const root = document.getElementById("ccRoot");
    if (!root || !this._cookieEl) return;

    // Sync element count to cursors owned (cap at 200 for performance)
    const owned  = Math.min(this._counts.get("cursor") ?? 0, 200);  // cursor ring
    while (this._cursorEls.length > owned) this._cursorEls.pop()!.remove();
    while (this._cursorEls.length < owned) {
      const el = document.createElement("div");
      el.textContent = "👆";
      el.style.cssText = `position:absolute;font-size:13px;pointer-events:none;z-index:6;opacity:0.65;transition:none;`;
      root.appendChild(el);
      this._cursorEls.push(el);
    }

    if (owned === 0) return;

    // Orbit animation
    const frenzy = this._frenzyEnd > performance.now();
    this._cursorAngle += frenzy ? 0.012 : 0.004; // spin faster during frenzy

    const rootR   = root.getBoundingClientRect();
    const cookieR = this._cookieEl.getBoundingClientRect();
    const cx      = cookieR.left - rootR.left + cookieR.width  / 2;
    const cy      = cookieR.top  - rootR.top  + cookieR.height / 2;
    const radius  = cookieR.width / 2 + 20;

    this._cursorEls.forEach((el, i) => {
      const a = this._cursorAngle + (i / owned) * Math.PI * 2;
      el.style.left      = `${cx + Math.cos(a) * radius - 7}px`;
      el.style.top       = `${cy + Math.sin(a) * radius - 7}px`;
      el.style.transform = `rotate(${a * 180 / Math.PI + 90}deg)`;
      el.style.opacity   = frenzy ? "1" : "0.65";
      el.style.textShadow= frenzy ? "0 0 8px rgba(255,220,0,0.9)" : "";
    });
  }

  private _end(): void {
    this._done=true;
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._cursorRingId);
    clearTimeout(this._gcTimeout);
    this._gcEl?.remove(); this._frenzyEl?.remove();
    this._cursorEls.forEach(el => el.remove()); this._cursorEls = [];
    this._g.inMiniGame=false; this._g.autoClickCallback=null;
  }
}
