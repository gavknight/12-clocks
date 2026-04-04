import type { Game } from "../../game/Game";
import { STUDIO_SAVE_KEY } from "./RobloxStudio";
import type { Roblox3DGame } from "./Roblox3DGame";

// ── Shared ────────────────────────────────────────────────────────────────

const BOT_NAMES  = ["CoolDude99", "XxProGamerxX", "NoodleArms"];
const PLR_COLOR  = "#4499ff";
const BOT_COLORS = ["#ff4444", "#ff9900", "#22cc44"];

interface Ent {
  x: number; y: number; vx: number; vy: number;
  w: number; h: number; color: string; name: string;
  isPlayer: boolean;
  holdTime: number; coins: number; lives: number;
  onGround: boolean; alive: boolean;
}
function mkEnt(x: number, y: number, c: string, n: string, p: boolean): Ent {
  return { x, y, vx: 0, vy: 0, w: 22, h: 28, color: c, name: n, isPlayer: p,
           holdTime: 0, coins: 0, lives: 3, onGround: false, alive: true };
}

export type GameId = "steal" | "lava" | "bombs" | "coins" | "custom" | "brookhaven";
type GameState = "lobby" | "countdown" | "playing" | "result";

const GAMES = [
  { id: "steal" as GameId, name: "Steal a Brainrot", emoji: "🐊", desc: "Steal brainrots, earn passive income, reach $300 first!", bg: "#1a0d00" },
  { id: "lava"  as GameId, name: "Floor is Lava",    emoji: "🌋", desc: "Jump on platforms — don't touch the lava!", bg: "#1a0000" },
  { id: "bombs" as GameId, name: "Bomb Dodge",        emoji: "💣", desc: "Dodge the bombs before they explode!",     bg: "#0d0d1a" },
  { id: "coins"  as GameId, name: "Coin Rush",    emoji: "🪙", desc: "Grab the most coins in 30 seconds!",       bg: "#001a00" },
  { id: "custom" as GameId, name: "Your Game",   emoji: "⭐", desc: "Play the level you built in Roblox Studio!", bg: "#1a001a" },
];

// ── Fake game list (decorative — clicking shows a "connecting" then error) ─
const FAKE_GAMES: { name: string; emoji: string; desc: string; players: string; bg: string }[] = [
  { name: "Adopt Me!",                     emoji: "🐾", desc: "Trade & adopt pets with friends",              players: "523,441", bg: "#0d1a2e" },
  { name: "Brookhaven RP",                 emoji: "🏡", desc: "Live your best life in Brookhaven",            players: "415,003", bg: "#0a1f0a" },
  { name: "Bloxburg",                      emoji: "🏠", desc: "Build your dream house",                       players: "312,004", bg: "#1a1400" },
  { name: "Tower of Hell",                 emoji: "🗼", desc: "Climb the randomly generated tower",          players: "289,872", bg: "#1a0000" },
  { name: "Murder Mystery 2",              emoji: "🔪", desc: "Innocent, Sheriff or Murderer?",              players: "178,344", bg: "#0d0014" },
  { name: "Arsenal",                       emoji: "🔫", desc: "Progress through every weapon to win",        players: "154,902", bg: "#001414" },
  { name: "Jailbreak",                     emoji: "🚔", desc: "Escape prison or chase criminals",            players: "143,211", bg: "#0d0d00" },
  { name: "Pet Simulator X",               emoji: "🐶", desc: "Hatch and upgrade pets",                      players: "134,567", bg: "#14001a" },
  { name: "Piggy",                         emoji: "🐷", desc: "Escape from Piggy before she gets you",       players: "128,902", bg: "#1a0808" },
  { name: "Doors",                         emoji: "🚪", desc: "Open doors, survive what's inside",           players: "119,445", bg: "#080808" },
  { name: "Royale High",                   emoji: "👑", desc: "A royal school fantasy world",                players: "111,222", bg: "#1a0014" },
  { name: "Natural Disaster Survival",     emoji: "🌪️", desc: "Survive floods, earthquakes and more",        players: "104,033", bg: "#001a14" },
  { name: "Work at a Pizza Place",         emoji: "🍕", desc: "Make, deliver and eat pizza",                 players: "98,211",  bg: "#1a0a00" },
  { name: "MeepCity",                      emoji: "🌟", desc: "Hang out and customize your home",            players: "87,654",  bg: "#00140a" },
  { name: "BedWars",                       emoji: "🛏️", desc: "Protect your bed, destroy theirs",            players: "82,334",  bg: "#0a001a" },
  { name: "Anime Adventures",              emoji: "⚔️", desc: "Tower defense with anime heroes",             players: "79,001",  bg: "#001a1a" },
  { name: "Build a Boat for Treasure",     emoji: "⛵", desc: "Build boats and sail to treasure",            players: "73,892",  bg: "#001414" },
  { name: "Super Doomspire",               emoji: "💣", desc: "Knock towers down with bombs",                players: "71,004",  bg: "#1a0d00" },
  { name: "Shindo Life",                   emoji: "🌀", desc: "Naruto-inspired ninja RPG",                   players: "68,334",  bg: "#00001a" },
  { name: "Blox Fruits",                   emoji: "🍎", desc: "Find devil fruits and rule the seas",         players: "65,221",  bg: "#001a00" },
  { name: "Dragon Ball Rage",              emoji: "🐉", desc: "Train and fight in the DBZ universe",         players: "58,441",  bg: "#1a0500" },
  { name: "Islands",                       emoji: "🏝️", desc: "Craft, farm and build on islands",            players: "55,122",  bg: "#0a1400" },
  { name: "Phantom Forces",               emoji: "💥", desc: "Tactical first-person shooter",               players: "52,009",  bg: "#0a0a00" },
  { name: "A Universal Time",              emoji: "⏳", desc: "JoJo-inspired fighting game",                 players: "49,887",  bg: "#00001a" },
  { name: "Project Mugetsu",               emoji: "⚡", desc: "Bleach-inspired soul reaper RPG",             players: "48,334",  bg: "#001a14" },
  { name: "Anime Fruit Simulator",         emoji: "🍊", desc: "Farm fruits and power up",                    players: "45,778",  bg: "#0d0014" },
  { name: "Ro-Ghoul",                      emoji: "🦷", desc: "Tokyo Ghoul-inspired RPG",                    players: "43,221",  bg: "#1a0000" },
  { name: "Funky Friday",                  emoji: "🎵", desc: "Friday Night Funkin rhythm battles",          players: "41,004",  bg: "#0d0028" },
  { name: "Arcane Odyssey",               emoji: "🌊", desc: "Open-world pirate sailing RPG",               players: "39,667",  bg: "#00091a" },
  { name: "Da Hood",                       emoji: "🏙️", desc: "Urban roleplay and street life",              players: "38,002",  bg: "#0d0d0d" },
  { name: "Sky Wars",                      emoji: "☁️", desc: "Fight on floating islands in the sky",        players: "36,445",  bg: "#001428" },
  { name: "Obby Maker",                    emoji: "🧱", desc: "Build and play obstacle courses",             players: "35,122",  bg: "#001400" },
  { name: "Restaurant Tycoon 2",           emoji: "🍔", desc: "Run your own restaurant empire",              players: "33,889",  bg: "#1a0d00" },
  { name: "Dungeon Quest",                 emoji: "🗡️", desc: "Fight through dungeons and level up",         players: "32,667",  bg: "#14001a" },
  { name: "Bee Swarm Simulator",           emoji: "🐝", desc: "Grow your bee swarm and collect honey",      players: "31,004",  bg: "#1a1400" },
  { name: "Fishing Simulator",             emoji: "🎣", desc: "Fish in exotic locations worldwide",          players: "29,887",  bg: "#001a1a" },
  { name: "Squid Game",                    emoji: "🟥", desc: "Play deadly games to survive",                players: "28,445",  bg: "#1a001a" },
  { name: "Car Dealership Tycoon",         emoji: "🚗", desc: "Build and run a car dealership",             players: "27,003",  bg: "#000f1a" },
  { name: "Escape Room",                   emoji: "🔓", desc: "Solve puzzles to escape tricky rooms",       players: "26,221",  bg: "#1a1400" },
  { name: "Tower Defense Simulator",       emoji: "🗼", desc: "Defend against waves of zombies",            players: "25,667",  bg: "#001400" },
  { name: "Driving Empire",               emoji: "🏎️", desc: "Race and trade cars with friends",           players: "24,334",  bg: "#140000" },
  { name: "Legend of Speed",               emoji: "💨", desc: "Train your speed to become the fastest",     players: "23,892",  bg: "#001a00" },
  { name: "Mining Simulator 2",            emoji: "⛏️", desc: "Mine gems and ores deep underground",        players: "23,004",  bg: "#0d0014" },
  { name: "Shadow Fight Arena",            emoji: "🥷", desc: "Master shadow combat arts",                  players: "22,445",  bg: "#000014" },
  { name: "Parkour Reborn",                emoji: "🏃", desc: "Freerun through city environments",          players: "21,887",  bg: "#0a0014" },
  { name: "Survive The Killer",            emoji: "🪓", desc: "Run and hide from the killer",               players: "21,003",  bg: "#140000" },
  { name: "Roblox High School 2",          emoji: "🎓", desc: "Attend classes and socialize",               players: "20,334",  bg: "#001428" },
  { name: "Treasure Hunt Simulator",       emoji: "💰", desc: "Dig for buried treasure and sell it",        players: "19,778",  bg: "#1a1000" },
  { name: "Clicker Simulator",             emoji: "👆", desc: "Click your way to power",                    players: "19,003",  bg: "#001a14" },
  { name: "Fruit Wars",                    emoji: "🍓", desc: "Battle with powerful devil fruits",           players: "18,556",  bg: "#1a0028" },
  { name: "Flight Simulator",              emoji: "✈️", desc: "Pilot planes around the world",              players: "18,003",  bg: "#001428" },
  { name: "Overlook Bay",                  emoji: "🦊", desc: "Collect cute plushies and explore",          players: "17,445",  bg: "#0a001a" },
  { name: "Ragdoll Engine",                emoji: "🤸", desc: "Physics-based ragdoll chaos",                 players: "17,003",  bg: "#0a0a00" },
  { name: "Super Golf",                    emoji: "⛳", desc: "Mini golf with power-ups",                    players: "16,778",  bg: "#001a00" },
  { name: "Two Player Gun Factory",        emoji: "🏭", desc: "Build guns with a partner",                  players: "16,334",  bg: "#140014" },
  { name: "Epic Minigames",                emoji: "🎮", desc: "Random minigames with players",              players: "16,001",  bg: "#001414" },
  { name: "Nuke Simulator",               emoji: "☢️", desc: "Launch increasingly powerful nukes",          players: "15,667",  bg: "#001000" },
  { name: "Raise a Floppa",               emoji: "😾", desc: "Take care of your precious floppa",          players: "15,223",  bg: "#1a0a00" },
  { name: "Speed Run 4",                   emoji: "🏁", desc: "Run through colorful obstacle courses",      players: "14,889",  bg: "#001400" },
  { name: "Zombie Rush",                   emoji: "🧟", desc: "Survive waves of zombies with friends",      players: "14,334",  bg: "#0a0a00" },
  { name: "Roblox Boxing",                emoji: "🥊", desc: "Punch your way to the championship",         players: "13,892",  bg: "#1a0000" },
  { name: "Superhero City",               emoji: "🦸", desc: "Be a superhero or villain",                  players: "13,445",  bg: "#00001a" },
  { name: "Anime Mania",                   emoji: "⚡", desc: "Play as your favorite anime characters",    players: "13,003",  bg: "#1a001a" },
  { name: "Power Simulator",               emoji: "💪", desc: "Train your powers to become unstoppable",  players: "12,667",  bg: "#001a14" },
  { name: "Wacky Wizards",                emoji: "🧙", desc: "Brew potions with crazy ingredients",       players: "12,334",  bg: "#140014" },
  { name: "Theme Park Tycoon 2",           emoji: "🎢", desc: "Build the ultimate theme park",             players: "12,003",  bg: "#1a0a00" },
  { name: "Obby but with Portals",         emoji: "🌀", desc: "Navigate obbies using portal guns",         players: "11,778",  bg: "#001428" },
  { name: "Stop It Slender",               emoji: "👤", desc: "Collect pages before Slenderman gets you",  players: "11,334",  bg: "#0a0a0a" },
  { name: "Ice Cream Simulator",           emoji: "🍦", desc: "Scoop and sell ice cream",                  players: "11,003",  bg: "#00141a" },
  { name: "Wild Horse Islands",            emoji: "🐴", desc: "Explore islands as a wild horse",           players: "10,778",  bg: "#001a0a" },
  { name: "Kick Off",                      emoji: "⚽", desc: "Soccer with power-ups",                     players: "10,556",  bg: "#001400" },
  { name: "Car Crushers 2",               emoji: "🚙", desc: "Destroy cars for points",                   players: "10,223",  bg: "#1a0500" },
  { name: "Loomian Legacy",               emoji: "🦎", desc: "Catch and battle Loomians",                 players: "9,998",   bg: "#001a1a" },
  { name: "Grocery Store Simulator",      emoji: "🛒", desc: "Run your own grocery store",                players: "9,778",   bg: "#0a1400" },
  { name: "Flood Escape 2",               emoji: "🌊", desc: "Escape rising floodwaters",                 players: "9,556",   bg: "#001428" },
  { name: "Time Travel Adventures",       emoji: "⏰", desc: "Travel through different eras",             players: "9,334",   bg: "#1a0014" },
  { name: "Snow Shoveling Simulator",     emoji: "❄️", desc: "Shovel snow to earn money",                 players: "9,112",   bg: "#00101a" },
  { name: "Giant Simulator",              emoji: "🦕", desc: "Grow into an enormous giant",               players: "8,998",   bg: "#001400" },
  { name: "Sword Burst Online",           emoji: "🗡️", desc: "SAO-inspired MMORPG",                       players: "8,778",   bg: "#140014" },
  { name: "Catalog Avatar Creator",       emoji: "👗", desc: "Mix and match avatar looks",                players: "8,556",   bg: "#0a001a" },
  { name: "Find the Noobs 2",             emoji: "🔍", desc: "Hunt for hidden noobs in maps",             players: "8,334",   bg: "#001a00" },
  { name: "Clone Tycoon 2",               emoji: "🧬", desc: "Build an army of clones",                  players: "8,112",   bg: "#1a0028" },
  { name: "Strucid",                       emoji: "🔫", desc: "Fortnite-like building shooter",            players: "7,998",   bg: "#001a0a" },
  { name: "Prison Life",                   emoji: "🏛️", desc: "Prison officer or inmate?",                 players: "7,778",   bg: "#0a0a00" },
  { name: "Roblox Champions",             emoji: "🏆", desc: "Compete in weekly tournaments",             players: "7,556",   bg: "#1a1400" },
  { name: "Hide and Seek Extreme",         emoji: "🙈", desc: "Classic hide and seek, but epic",           players: "7,334",   bg: "#001400" },
  { name: "Ninja Legends",                emoji: "🥷", desc: "Become the ultimate ninja",                 players: "7,112",   bg: "#0a0014" },
  { name: "Tsunami Survival",              emoji: "🌊", desc: "Escape massive wave disasters",             players: "6,998",   bg: "#001428" },
  { name: "Design It",                     emoji: "👘", desc: "Fashion design competitions",              players: "6,778",   bg: "#1a001a" },
  { name: "Bubble Gum Simulator",          emoji: "🫧", desc: "Blow giant bubbles and float",             players: "6,556",   bg: "#1a0a28" },
  { name: "RoBeats",                       emoji: "🎵", desc: "Rhythm game with Roblox music",            players: "6,112",   bg: "#000014" },
  { name: "Entry Point",                   emoji: "🕵️", desc: "Tactical heist game",                      players: "5,998",   bg: "#0a0a0a" },
  { name: "Anime Crossover Defense",       emoji: "🛡️", desc: "Tower defense with anime units",           players: "5,778",   bg: "#14001a" },
  { name: "Gravity Shift",                 emoji: "🔄", desc: "Flip gravity to navigate maps",            players: "5,556",   bg: "#001a14" },
  { name: "Ultimate Driving",              emoji: "🚗", desc: "Realistic driving across huge maps",       players: "5,334",   bg: "#0a0a00" },
  { name: "Recoil",                        emoji: "🎯", desc: "CS:GO-inspired FPS on Roblox",             players: "5,112",   bg: "#0d0000" },
  { name: "Saber Simulator",               emoji: "⚡", desc: "Swing your saber to get stronger",         players: "4,998",   bg: "#001428" },
  { name: "Galaxy",                        emoji: "🌌", desc: "Space exploration and warfare",            players: "4,778",   bg: "#000014" },
  { name: "Plane Crazy",                   emoji: "✈️", desc: "Build and fly your own planes",           players: "4,556",   bg: "#001a00" },
  { name: "Piggy: Book 2",                emoji: "🐷", desc: "Continue Piggy's terrifying story",        players: "4,222",   bg: "#1a0000" },
  { name: "Pls Donate",                    emoji: "💸", desc: "Set up a stand and accept donations",      players: "4,112",   bg: "#001a00" },
  { name: "Blood & Iron",                  emoji: "⚔️", desc: "Napoleonic era warfare",                   players: "3,998",   bg: "#1a0505" },
  { name: "Anime Battle Arena",            emoji: "🔥", desc: "Fight using anime powers",                 players: "3,778",   bg: "#1a0500" },
  { name: "Tower Battles",                 emoji: "🗼", desc: "Strategic tower defense",                  players: "3,667",   bg: "#001400" },
  { name: "RoCitizens",                   emoji: "🏙️", desc: "Life simulation roleplay",                 players: "3,556",   bg: "#0a0a14" },
  { name: "Tropical Resort Tycoon",        emoji: "🏖️", desc: "Build a paradise resort",                  players: "3,445",   bg: "#001a14" },
  { name: "Mad City",                      emoji: "🦹", desc: "Superhero vs villain city battles",        players: "3,334",   bg: "#140014" },
  { name: "Dragon Adventures",             emoji: "🐉", desc: "Hatch and raise your own dragon",         players: "3,112",   bg: "#0a001a" },
  { name: "The Rake",                      emoji: "😱", desc: "Survive encounters with The Rake",        players: "3,001",   bg: "#0a0a0a" },
  { name: "Slayers Unleashed",             emoji: "🗡️", desc: "Demon Slayer-inspired RPG",               players: "2,998",   bg: "#140014" },
  { name: "Combat Warriors",               emoji: "⚔️", desc: "Melee combat with stylish moves",         players: "2,889",   bg: "#1a0000" },
  { name: "Anime Story",                   emoji: "📖", desc: "Your own anime journey",                  players: "2,778",   bg: "#00001a" },
  { name: "Break In",                      emoji: "🏚️", desc: "Survive a night of horror",               players: "2,667",   bg: "#0a0a00" },
  { name: "Retail Tycoon 2",               emoji: "🏪", desc: "Build a retail chain empire",             players: "2,556",   bg: "#001a00" },
  { name: "Type or Die",                   emoji: "⌨️", desc: "Type words or fall to your doom",         players: "2,445",   bg: "#001428" },
  { name: "Epic Minigames: Deluxe",        emoji: "🎲", desc: "50+ random minigame modes",               players: "2,334",   bg: "#1a001a" },
  { name: "Weight Lifting Simulator 3",    emoji: "🏋️", desc: "Get swole and flex on rivals",           players: "2,223",   bg: "#001400" },
  { name: "Doomspire Brickbattle",         emoji: "🧱", desc: "Classic brick battle tower wars",         players: "2,112",   bg: "#140000" },
  { name: "Sushi Counter Obby",            emoji: "🍣", desc: "Dodge sushi in a crazy obstacle course", players: "2,001",   bg: "#001a0a" },
  { name: "Sword Fighting Tournament",     emoji: "⚔️", desc: "Classic Roblox sword duels",             players: "1,998",   bg: "#0a001a" },
  { name: "Doors: Hotel+",                emoji: "🚪", desc: "Extended horror with new entities",        players: "1,889",   bg: "#080808" },
  { name: "One Fruit Simulator",           emoji: "🍍", desc: "Find the one legendary fruit",            players: "1,778",   bg: "#001a14" },
  { name: "Noob Army Tycoon",              emoji: "⚔️", desc: "Build an army of noobs",                  players: "1,667",   bg: "#001400" },
  { name: "Star Wars Battlefront",         emoji: "⭐", desc: "Battle in a galaxy far away",             players: "1,445",   bg: "#000014" },
  { name: "Anime Battlegrounds X",        emoji: "💥", desc: "1v1 anime-style battles",                  players: "1,334",   bg: "#1a0014" },
  { name: "SpongeBob Simulator",           emoji: "🧽", desc: "Become SpongeBob",                        players: "1,223",   bg: "#1a1400" },
  { name: "Maze Runner",                   emoji: "🌿", desc: "Navigate through ever-changing mazes",    players: "1,112",   bg: "#001a00" },
  { name: "Pizza Factory Tycoon",          emoji: "🍕", desc: "Bake and deliver pizzas for profit",      players: "1,001",   bg: "#1a0500" },
  { name: "Skibi Defense",                emoji: "🚽", desc: "Defend against waves of skibidi enemies",  players: "987",     bg: "#001428" },
  { name: "Toilet Tower Defense",          emoji: "🚽", desc: "Classic tower defense with toilets",      players: "934",     bg: "#0a0014" },
  { name: "Pet Ranch Simulator",           emoji: "🐄", desc: "Raise animals and sell their produce",    players: "889",     bg: "#001a00" },
  { name: "Weapon Fighting Simulator",     emoji: "🗡️", desc: "Train strength and weapon mastery",      players: "834",     bg: "#14000a" },
  { name: "Bathroom Obby",                emoji: "🚿", desc: "Obstacle course inside a giant bathroom", players: "789",     bg: "#001a1a" },
  { name: "Expedition Antarctica",         emoji: "🧊", desc: "Survive the frozen wasteland",            players: "745",     bg: "#00101a" },
  { name: "Chapter 2: Season 8",          emoji: "🎯", desc: "Battle royale mayhem",                    players: "712",     bg: "#1a0028" },
  { name: "Find the Button",               emoji: "🔘", desc: "Find cleverly hidden buttons",            players: "678",     bg: "#001414" },
  { name: "Cursed Islands",               emoji: "💀", desc: "Dark survival island horror",              players: "634",     bg: "#0a0a0a" },
  { name: "Bike Obby Extreme",            emoji: "🚴", desc: "Ride bikes through insane obbies",         players: "601",     bg: "#001a00" },
];

// ── Robux System ──────────────────────────────────────────────────────────

const ROBUX_KEY      = "roblox_robux_v1";
const ROBUX_PERKS_KEY = "roblox_perks_v1";

interface RobuxPerk {
  id: string; name: string; emoji: string; desc: string; price: number;
}
const DEFAULT_PERKS: RobuxPerk[] = [
  { id: "instawin",    name: "Insta Win",     emoji: "🏆", desc: "Win the next game instantly!",          price: 500  },
  { id: "botslow",     name: "Bot Slowdown",  emoji: "🐌", desc: "Bots move at 40% speed next game",      price: 300  },
  { id: "speedboost",  name: "Speed Boost",   emoji: "⚡", desc: "You move 1.75× faster next game",       price: 200  },
  { id: "longrespawn", name: "Long Respawn",  emoji: "💀", desc: "Bots respawn 8× slower next game",      price: 400  },
  { id: "admin",       name: "Admin",         emoji: "👑", desc: "Configure the Robux shop prices",       price: 1000 },
];

// ── Steal a Brainrot ──────────────────────────────────────────────────────

const SB_TYPES = [
  { emoji: "🐊", name: "Capybara",    cost: 0,  income: 3  },
  { emoji: "🦆", name: "Quackington", cost: 10, income: 8  },
  { emoji: "🐸", name: "Pepe Frog",   cost: 30, income: 18 },
  { emoji: "🦁", name: "Tralalero",   cost: 80, income: 40 },
];
const SB_WIN   = 250;
const SB_TIME  = 90;
const LOCK_DUR = 25;
const LOCK_CD  = 20;

interface SBBase {
  ownerIdx: number;
  x: number; y: number; w: number; h: number;
  locked: boolean;
  lockTimer: number;
  lockCooldown: number;
  brainrots: number[];   // SB_TYPES indices
  alertTimer: number;
}
interface SBCarry {
  baseIdx: number;
  typeIdx: number;
}

// ── Main class ────────────────────────────────────────────────────────────

export class RobloxGames {
  private _g: Game;
  private _canvas: HTMLCanvasElement;
  private _ctx:    CanvasRenderingContext2D;

  private _state:      GameState = "lobby";
  private _gameId:     GameId    = "steal";
  private _countdown   = 3;
  private _resultTimer = 0;
  private _resultMsg   = "";

  private _ents: Ent[] = [];

  // ── Steal a Brainrot state ─────────────────────────────────────────────
  private _sbBases:     SBBase[]         = [];
  private _sbMoney:     number[]         = [0,0,0,0];
  private _sbIncome:    number[]         = [0,0,0,0];
  private _sbCarrying:  (SBCarry|null)[] = [null,null,null,null];
  private _sbSlowTimer: number[]         = [0,0,0,0];
  private _sbSlapCD:    number[]         = [0,0,0,0];
  private _sbTimer      = SB_TIME;

  private _sbConveyor   = { x:0, y:0, w:0, h:0 };
  private _sbConvAnim   = 0;
  private _sbConvItems: { x: number; typeIdx: number }[] = [];
  private _sbConvSpawn  = 2.0;

  // ── Floor is Lava ─────────────────────────────────────────────────────
  private _platforms: { x: number; y: number; w: number; h: number }[] = [];
  private _lavaY       = 0;
  private _surviveTime = 0;

  // ── Bomb Dodge ────────────────────────────────────────────────────────
  private _bombs: { x: number; y: number; r: number; t: number; phase: "warn"|"boom" }[] = [];
  private _bombNext  = 0;
  private _bombRate  = 2.5;
  private _dodgeTime = 0;

  // ── Coin Rush ─────────────────────────────────────────────────────────
  private _coinItems: { x: number; y: number; taken: boolean }[] = [];
  private _coinSpawn = 0;
  private _rushTimer = 30;

  // ── Input ─────────────────────────────────────────────────────────────
  private _keys       = new Set<string>();
  private _joy        = { active: false, ox: 0, oy: 0, dx: 0, dy: 0 };
  private _jumpBtn    = false;
  private _actBtn     = false;
  private _actBtnPrev = false;

  private _modeSelect    = false;
  private _pvp           = true;
  private _pendingGameId: GameId | null = null;

  private _raf    = 0;
  private _lastTs = 0;
  private _done   = false;
  private _cleanup: (() => void)[] = [];
  private _3dGame:  Roblox3DGame | null = null;
  private _in3dGame = false;
  private _mm2Game: import("./MurderMystery").MurderMystery | null = null;
  private _lobbyConnectMM2 = false;

  // ── Robux ──────────────────────────────────────────────────────────────
  private _robux       = 0;
  private _robuxPerks: RobuxPerk[] = DEFAULT_PERKS.map(p => ({ ...p }));
  private _robuxScreen: "none" | "buy" | "shop" | "admin" = "none";
  private _adTimer     = 0;   // countdown while "watching" ad
  private _adReward    = 0;   // how many Robux the ad gives
  private _adDone      = false;
  // Active perks for next game
  private _perkInstaWin    = false;
  private _perkBotSlow     = false;
  private _perkSpeedBoost  = false;
  private _perkLongRespawn = false;
  private _isAdmin         = false;

  // ── Lobby scroll & fake-game connecting ───────────────────────────────
  private _lobbyScrollY     = 0;
  private _lobbyScrollTgt   = 0;
  private _lobbyConnecting: string | null = null;
  private _lobbyConnectT    = 0;
  private _lobbyConnectMode: GameId = "steal" as GameId;
  private _lobbyTouchX0    = 0;
  private _lobbyTouchY0    = 0;
  private _lobbyTouchSY0    = 0;
  private _lobbyTouchMoved  = false;

  constructor(g: Game) {
    this._g = g;

    g.ui.innerHTML = `
      <div style="position:relative;width:100%;height:100%;overflow:hidden;pointer-events:all;">
        <canvas id="rgCanvas" style="display:block;width:100%;height:100%;touch-action:none;"></canvas>
      </div>`;

    this._canvas = document.getElementById("rgCanvas") as HTMLCanvasElement;
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
    this._ctx = this._canvas.getContext("2d")!;

    g.inMiniGame        = false; // cursor stays visible so controller can navigate/click
    g.autoClickCallback = null;
    g.hideAutoClickerUI();

    this._robux = parseInt(localStorage.getItem(ROBUX_KEY) ?? "0") || 0;
    try {
      const saved = JSON.parse(localStorage.getItem(ROBUX_PERKS_KEY) ?? "[]") as RobuxPerk[];
      if (Array.isArray(saved) && saved.length === DEFAULT_PERKS.length)
        this._robuxPerks = saved;
    } catch { /* use defaults */ }

    const onKD = (e: KeyboardEvent) => {
      this._keys.add(e.code);
      if (e.code === "KeyE" || e.code === "Space") this._actBtn = true;
    };
    const onKU = (e: KeyboardEvent) => {
      this._keys.delete(e.code);
      if (e.code === "KeyE" || e.code === "Space") this._actBtn = false;
    };
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup",   onKU);
    this._cleanup.push(() => { window.removeEventListener("keydown", onKD); window.removeEventListener("keyup", onKU); });

    const onTS = (e: TouchEvent) => { e.preventDefault(); this._touchStart(e); };
    const onTM = (e: TouchEvent) => { e.preventDefault(); this._touchMove(e); };
    const onTE = (e: TouchEvent) => { e.preventDefault(); this._touchEnd(); };
    this._canvas.addEventListener("touchstart", onTS, { passive: false });
    this._canvas.addEventListener("touchmove",  onTM, { passive: false });
    this._canvas.addEventListener("touchend",   onTE, { passive: false });
    this._cleanup.push(() => {
      this._canvas.removeEventListener("touchstart", onTS);
      this._canvas.removeEventListener("touchmove",  onTM);
      this._canvas.removeEventListener("touchend",   onTE);
    });

    const onClick = (e: MouseEvent) => this._handleClick(e.clientX, e.clientY);
    this._canvas.addEventListener("click", onClick);
    this._cleanup.push(() => this._canvas.removeEventListener("click", onClick));

    const onWheel = (e: WheelEvent) => {
      if (this._state === "lobby" && this._robuxScreen === "none" && !this._modeSelect && !this._lobbyConnecting) {
        e.preventDefault();
        this._lobbyScrollTgt += e.deltaY;
      }
    };
    this._canvas.addEventListener("wheel", onWheel, { passive: false });
    this._cleanup.push(() => this._canvas.removeEventListener("wheel", onWheel));

    const onR = () => { this._canvas.width = window.innerWidth; this._canvas.height = window.innerHeight; };
    window.addEventListener("resize", onR);
    this._cleanup.push(() => window.removeEventListener("resize", onR));

    this._lastTs = performance.now();
    this._raf = requestAnimationFrame(ts => this._loop(ts));
  }

  // ── Loop ──────────────────────────────────────────────────────────────

  private _loop(ts: number): void {
    const dt = Math.min((ts - this._lastTs) / 1000, 0.05);
    this._lastTs = ts;
    this._update(dt);
    this._draw();
    if (!this._done) this._raf = requestAnimationFrame(t => this._loop(t));
  }

  private _update(dt: number): void {
    if (this._in3dGame) return;
    // Lobby scroll + connecting animation
    if (this._state === "lobby") {
      const maxS = this._lobbyMaxScroll();
      this._lobbyScrollTgt = Math.max(0, Math.min(maxS, this._lobbyScrollTgt));
      this._lobbyScrollY  += (this._lobbyScrollTgt - this._lobbyScrollY) * Math.min(1, dt * 14);
      if (this._lobbyConnecting !== null) {
        this._lobbyConnectT += dt;
        if (this._lobbyConnectT >= 2.2) {
          this._lobbyConnecting = null;
          if (this._lobbyConnectMM2) {
            this._lobbyConnectMM2 = false;
            this._in3dGame = true;
            import("./MurderMystery").then(({ MurderMystery }) => {
              try {
                this._mm2Game = new MurderMystery(this._g.ui, (_won, msg) => {
                  this._mm2Game?.dispose();
                  this._mm2Game  = null;
                  this._in3dGame = false;
                  this._state    = "result";
                  this._resultMsg   = msg;
                  this._resultTimer = 5;
                });
              } catch (err) {
                console.error("MurderMystery crash:", err);
                this._in3dGame = false;
                this._state    = "lobby";
              }
            }).catch(err => {
              console.error("MurderMystery import failed:", err);
              this._in3dGame = false;
              this._state    = "lobby";
            });
          } else {
            this._pvp = true;
            this._startGame(this._lobbyConnectMode);
          }
        }
      }
    }
    // Ad countdown
    if (this._adTimer > 0 && !this._adDone) {
      this._adTimer -= dt;
      if (this._adTimer <= 0) {
        this._adDone = true;
        this._robux += this._adReward;
        localStorage.setItem(ROBUX_KEY, String(this._robux));
      }
    }
    if (this._state === "countdown") {
      this._countdown -= dt;
      if (this._countdown <= 0) this._state = "playing";
    } else if (this._state === "playing") {
      if (this._gameId === "steal") this._updateSteal(dt);
      if (this._gameId === "lava")  this._updateLava(dt);
      if (this._gameId === "bombs") this._updateBombs(dt);
      if (this._gameId === "coins") this._updateCoins(dt);
    } else if (this._state === "result") {
      this._resultTimer -= dt;
      if (this._resultTimer <= 0) this._state = "lobby";
    }
    this._actBtnPrev = this._actBtn;
  }

  // ── Input ─────────────────────────────────────────────────────────────

  private _modeSelectRects(W: number, H: number) {
    const cw=Math.min(340,W-40), ch=280, bw=cw-40, bh=64;
    const cx=(W-cw)/2, cy=(H-ch)/2, bx=cx+20;
    return { soloY: cy+75, pvpY: cy+158, bx, bw, bh, cx, cy, cw, ch };
  }

  private _handleClick(cx: number, cy: number): void {
    const r = this._canvas.getBoundingClientRect();
    const x = (cx - r.left) * (this._canvas.width  / r.width);
    const y = (cy - r.top)  * (this._canvas.height / r.height);
    const W = this._canvas.width, H = this._canvas.height;

    // Mode select overlay intercepts all clicks
    if (this._modeSelect) {
      const {soloY, pvpY, bx, bw, bh, cy: cy2, ch} = this._modeSelectRects(W, H);
      if (x>=bx&&x<=bx+bw&&y>=soloY&&y<=soloY+bh) {
        this._modeSelect=false; this._pvp=false; this._launchPending();
      } else if (x>=bx&&x<=bx+bw&&y>=pvpY&&y<=pvpY+bh) {
        this._modeSelect=false; this._pvp=true; this._launchPending();
      } else if (y>=cy2+ch-44&&y<=cy2+ch) {
        this._modeSelect=false; this._pendingGameId=null;
      }
      return;
    }

    if (x < 130 && y < 56) { this._end(); return; }

    // Robux screen intercepts lobby clicks
    if (this._robuxScreen !== "none") { this._handleRobuxClick(x, y, W, H); return; }

    if (this._state === "lobby") {
      if (this._lobbyConnecting !== null) return; // still connecting, ignore
      // Robux button (top right)
      if (x >= W - 150 && x <= W - 8 && y >= 10 && y <= 46) {
        this._robuxScreen = "buy"; return;
      }
      // Scrollable grid hit-test
      const headerH = W > 600 ? H * 0.25 : H * 0.25;
      if (y < headerH) return; // click in header, not on a card
      const cols = W > 600 ? 2 : 1;
      const cw = Math.min(320, (W - 48) / cols), ch = 100, gap = 12;
      const totalW = cols * cw + (cols - 1) * gap;
      const sx = (W - totalW) / 2;
      const scrollY = this._lobbyScrollY;
      // grid Y relative to grid origin
      const gy = y - headerH + scrollY;
      const row = Math.floor((gy - gap) / (ch + gap));
      const col = Math.floor((x - sx) / (cw + gap));
      if (row < 0 || col < 0 || col >= cols) return;
      const i = row * cols + col;
      const cx2 = sx + col * (cw + gap);
      // verify click is actually inside card (not in the gap)
      if (x < cx2 || x > cx2 + cw) return;
      const cy2 = gap + row * (ch + gap);
      if (gy < cy2 || gy > cy2 + ch) return;
      if (i < GAMES.length) {
        // Real game
        if (GAMES[i].id === "custom" && !localStorage.getItem(STUDIO_SAVE_KEY)) return;
        this._pendingGameId = GAMES[i].id;
        this._modeSelect    = true;
      } else {
        // Fake game — connect then launch a real game mode
        const fakeIdx = i - GAMES.length;
        if (fakeIdx < FAKE_GAMES.length) {
          const modes: GameId[] = ["steal", "lava", "bombs", "coins", "brookhaven"];
          this._lobbyConnecting = FAKE_GAMES[fakeIdx].name;
          this._lobbyConnectT   = 0;
          if (fakeIdx === 4) {
            // Murder Mystery 2 — launches the real MM2 3D game
            this._lobbyConnectMM2  = true;
          } else {
            this._lobbyConnectMM2  = false;
            // Brookhaven RP (index 1) always launches brookhaven
            this._lobbyConnectMode = fakeIdx === 1 ? "brookhaven" : modes[fakeIdx % 4];
          }
        }
      }
    }
  }

  private _handleRobuxClick(x: number, y: number, W: number, H: number): void {
    // If watching ad — "Skip" after it finishes
    if (this._adTimer > 0 || this._adDone) {
      if (this._adDone) { this._adDone = false; this._adTimer = 0; }
      return;
    }

    const panelW = Math.min(400, W - 32), panelH = Math.min(560, H - 60);
    const px = (W - panelW) / 2, py = (H - panelH) / 2;

    // Close / back button (top-left of panel)
    if (x >= px+8 && x <= px+80 && y >= py+10 && y <= py+42) {
      this._robuxScreen = "none"; return;
    }

    if (this._robuxScreen === "shop") {
      // Perk buy buttons — 5 items starting at py+90, each 76px tall
      this._robuxPerks.forEach((perk, i) => {
        const by = py + 100 + i * 76;
        if (x >= px+panelW-120 && x <= px+panelW-8 && y >= by+8 && y <= by+52) {
          this._buyPerk(perk);
        }
      });
      // Admin config (only if admin)
      if (this._isAdmin) {
        this._robuxPerks.forEach((perk, i) => {
          const by = py + 100 + i * 76;
          // Edit price button (pencil icon area on left)
          if (x >= px+8 && x <= px+80 && y >= by+8 && y <= by+52) {
            const inp = prompt(`Set price for "${perk.name}" (current: ${perk.price} R):`, String(perk.price));
            if (inp !== null) {
              const n = parseInt(inp);
              if (!isNaN(n) && n >= 0) {
                this._robuxPerks[i].price = n;
                localStorage.setItem(ROBUX_PERKS_KEY, JSON.stringify(this._robuxPerks));
              }
            }
          }
        });
      }
    }

    if (this._robuxScreen === "buy") {
      // Pack rows (match draw layout: bannerY=py+52, rowStart=bannerY+80=py+132, rowH=56)
      const bannerY = py + 52, rowStart = bannerY + 80, rowH = 56;
      const packs = [24_000, 11_000, 5_250, 2_000];
      packs.forEach((reward, i) => {
        const ry = rowStart + i * rowH;
        const btnW2 = 110, btnX2 = px + panelW - btnW2 - 8, btnY2 = ry + 9;
        if (x >= btnX2 && x <= btnX2+btnW2 && y >= btnY2 && y <= btnY2+38) {
          this._adReward = reward;
          this._adTimer  = 6;
          this._adDone   = false;
        }
      });
      // Custom amount row
      const custY = rowStart + packs.length * rowH;
      const cbtnW = 110, cbtnX = px + panelW - cbtnW - 8;
      if (x >= cbtnX && x <= cbtnX+cbtnW && y >= custY+9 && y <= custY+47) {
        const inp = prompt("Enter custom Robux amount (max 1,000,000):", "5000");
        if (!inp) return;
        const reward = Math.min(1_000_000, Math.max(1, parseInt(inp) || 0));
        if (reward <= 0) return;
        this._adReward = reward;
        this._adTimer  = 6;
        this._adDone   = false;
      }
      // Set amount row
      const setY = custY + 48;
      if (y >= setY && y <= setY + 48) {
        const inp = prompt(`Set your Robux balance (0 – ${this._robux.toLocaleString()}):`, String(this._robux));
        if (inp !== null) {
          const n = Math.max(0, Math.min(this._robux, Math.floor(Number(inp)) || 0));
          this._robux = n;
          localStorage.setItem(ROBUX_KEY, String(n));
        }
      }
      // Clicking the balance display also sets it
      if (y >= py+18 && y <= py+46) {
        const inp = prompt(`Set your Robux balance (0 – ${this._robux.toLocaleString()}):`, String(this._robux));
        if (inp !== null) {
          const n = Math.max(0, Math.min(this._robux, Math.floor(Number(inp)) || 0));
          this._robux = n;
          localStorage.setItem(ROBUX_KEY, String(n));
        }
      }
    }
  }

  private _buyPerk(perk: RobuxPerk): void {
    if (this._robux < perk.price) return;
    this._robux -= perk.price;
    localStorage.setItem(ROBUX_KEY, String(this._robux));
    switch (perk.id) {
      case "instawin":    this._perkInstaWin    = true; break;
      case "botslow":     this._perkBotSlow     = true; break;
      case "speedboost":  this._perkSpeedBoost  = true; break;
      case "longrespawn": this._perkLongRespawn = true; break;
      case "admin":       this._isAdmin         = true; break;
    }
  }

  private _lobbyMaxScroll(): number {
    const W = this._canvas.width, H = this._canvas.height;
    const cols = W > 600 ? 2 : 1;
    const ch = 100, gap = 12;
    const total = GAMES.length + FAKE_GAMES.length;
    const rows = Math.ceil(total / cols);
    const totalH = rows * (ch + gap) + gap * 2;
    const headerH = H * 0.25;
    return Math.max(0, totalH - (H - headerH));
  }

  private _launchPending(): void {
    const id = this._pendingGameId;
    if (!id) return;
    this._pendingGameId = null;
    if (id === "custom") {
      import("./RobloxStudio").then(m => {
        this._done = true;
        cancelAnimationFrame(this._raf);
        this._cleanup.forEach(fn => fn());
        this._g.inMiniGame        = false;
        this._g.autoClickCallback = null;
        this._g.ui.innerHTML      = "";
        new m.RobloxStudio(this._g, true, this._pvp);
      });
      return;
    }
    this._startGame(id);
  }

  private _touchStart(e: TouchEvent): void {
    const t = e.touches[0];
    const W = this._canvas.width, H = this._canvas.height;
    const r = this._canvas.getBoundingClientRect();
    const x = (t.clientX - r.left) * (W / r.width);
    const y = (t.clientY - r.top)  * (H / r.height);
    if (this._state === "playing") {
      if (x > W * 0.55 && y > H * 0.6) {
        if (this._gameId === "lava") this._jumpBtn = true;
        else { this._actBtn = true; }
      } else if (x < W / 2) {
        this._joy = { active: true, ox: x, oy: y, dx: 0, dy: 0 };
      }
    }
    // Always track last touch position for tap detection
    this._lobbyTouchX0 = t.clientX;
    this._lobbyTouchY0 = t.clientY;
    // Lobby: also track for scroll
    if (this._state === "lobby" && this._robuxScreen === "none" && !this._modeSelect) {
      this._lobbyTouchSY0   = this._lobbyScrollTgt;
      this._lobbyTouchMoved = false;
    } else if (this._modeSelect || this._state === "result") {
      this._handleClick(t.clientX, t.clientY);
    }
  }
  private _touchMove(e: TouchEvent): void {
    const t = e.touches[0];
    const r = this._canvas.getBoundingClientRect();
    const x = (t.clientX - r.left) * (this._canvas.width  / r.width);
    const y = (t.clientY - r.top)  * (this._canvas.height / r.height);
    // Lobby scroll drag
    if (this._state === "lobby" && this._robuxScreen === "none" && !this._modeSelect) {
      const r2 = this._canvas.getBoundingClientRect();
      const clientY = t.clientY;
      const dy = (clientY - this._lobbyTouchY0) * (this._canvas.height / r2.height);
      if (Math.abs(dy) > 5) this._lobbyTouchMoved = true;
      if (this._lobbyTouchMoved) {
        this._lobbyScrollTgt = Math.max(0, Math.min(this._lobbyMaxScroll(), this._lobbyTouchSY0 - dy));
        return;
      }
    }
    if (!this._joy.active) return;
    const dx = x - this._joy.ox, dy2 = y - this._joy.oy, cap = 55;
    this._joy.dx = Math.max(-1, Math.min(1, dx / cap));
    this._joy.dy = Math.max(-1, Math.min(1, dy2 / cap));
  }
  private _touchEnd(): void {
    if (this._state === "lobby") {
      if (this._robuxScreen !== "none") {
        this._handleClick(this._lobbyTouchX0, this._lobbyTouchY0);
      } else if (!this._modeSelect && !this._lobbyTouchMoved) {
        this._handleClick(this._lobbyTouchX0, this._lobbyTouchY0);
      }
    }
    this._joy = { active: false, ox:0, oy:0, dx:0, dy:0 };
    this._jumpBtn = false;
    this._actBtn  = false;
  }

  private _dx(): number {
    let d = 0;
    if (this._keys.has("ArrowLeft")  || this._keys.has("KeyA")) d -= 1;
    if (this._keys.has("ArrowRight") || this._keys.has("KeyD")) d += 1;
    if (this._joy.active) d += this._joy.dx;
    return Math.max(-1, Math.min(1, d));
  }
  private _dy(): number {
    let d = 0;
    if (this._keys.has("ArrowUp")   || this._keys.has("KeyW")) d -= 1;
    if (this._keys.has("ArrowDown") || this._keys.has("KeyS")) d += 1;
    if (this._joy.active) d += this._joy.dy;
    return Math.max(-1, Math.min(1, d));
  }
  private _jumpPressed(): boolean {
    return this._keys.has("Space") || this._keys.has("ArrowUp") || this._keys.has("KeyW") || this._jumpBtn;
  }
  private _actJustPressed(): boolean { return this._actBtn && !this._actBtnPrev; }

  // ── Game init ─────────────────────────────────────────────────────────

  private _startGame(id: GameId): void {
    // 3D games: all except custom
    if (id !== "custom") {
      this._in3dGame = true;
      const container = this._g.ui;
      import("./Roblox3DGame").then(({ Roblox3DGame }) => {
        try {
          this._3dGame = new Roblox3DGame(container, id as import("./Roblox3DGame").GameId3D, this._pvp, (_won, msg) => {
            this._3dGame?.dispose();
            this._3dGame  = null;
            this._in3dGame = false;
            this._state    = "result";
            this._resultMsg   = msg;
            this._resultTimer = 5;
          });
        } catch (err) {
          console.error("Roblox3DGame crash:", err);
          this._in3dGame = false;
          this._state    = "lobby";
        }
      }).catch(err => {
        console.error("Roblox3DGame import failed:", err);
        this._in3dGame = false;
        this._state    = "lobby";
      });
      return;
    }

    this._gameId    = id;
    this._state     = "countdown";
    this._countdown = 3;
    const W = this._canvas.width, H = this._canvas.height;

    this._ents = [mkEnt(W/2, H/2, PLR_COLOR, "You", true)];
    if (this._pvp) {
      this._ents.push(
        mkEnt(W*0.2, H*0.25, BOT_COLORS[0], BOT_NAMES[0], false),
        mkEnt(W*0.8, H*0.25, BOT_COLORS[1], BOT_NAMES[1], false),
        mkEnt(W*0.2, H*0.75, BOT_COLORS[2], BOT_NAMES[2], false),
      );
    }
    this._ents.forEach(e => { e.holdTime=0; e.coins=0; e.lives=3; e.alive=true; });

    // Custom game uses 2D engine; keep legacy methods alive
    void this._genPlatforms(W, H);
    void this._initSteal(W, H);

    // Apply & consume one-time perks
    if (this._perkInstaWin) {
      this._perkInstaWin = false;
      this._countdown    = 0.5; // near-instant countdown then win
      this._resultMsg    = "🏆 Insta Win activated! You WIN!";
      // Override: after countdown fires, immediately trigger result
      setTimeout(() => {
        if (this._state === "playing" || this._state === "countdown") {
          this._state = "result"; this._resultTimer = 4;
        }
      }, 600);
    }
  }

  private _initSteal(W: number, H: number): void {
    const bs  = Math.min(W, H) * 0.22;
    const pad = 12;
    // [0]=player BL, [1]=bot TR, [2]=bot TL, [3]=bot BR
    const defs = [
      { ox: pad,      oy: H - bs - pad },
      { ox: W-bs-pad, oy: pad           },
      { ox: pad,      oy: pad           },
      { ox: W-bs-pad, oy: H - bs - pad },
    ];
    this._sbBases = defs.map((d, i) => ({
      ownerIdx: i, x: d.ox, y: d.oy, w: bs, h: bs,
      // Player base starts locked for 12s so bots can't swarm immediately
      locked: i === 0, lockTimer: i === 0 ? 12 : 0, lockCooldown: 0,
      brainrots: [0], alertTimer: 0,
    }));
    this._ents.forEach((e, i) => {
      e.x = this._sbBases[i].x + this._sbBases[i].w / 2;
      e.y = this._sbBases[i].y + this._sbBases[i].h / 2;
    });
    this._sbMoney     = [0, 0, 0, 0];
    this._sbIncome    = [1, 1, 1, 1];
    this._sbCarrying  = [null, null, null, null];
    this._sbSlowTimer = [0, 0, 0, 0];
    this._sbSlapCD    = [0, 0, 0, 0];
    this._sbTimer     = SB_TIME;

    this._sbConvAnim  = 0;
    this._sbConvItems = [];
    this._sbConvSpawn = 1.5;
    const cw = Math.min(W * 0.55, 340), ch = 76;
    this._sbConveyor  = { x: W/2-cw/2, y: H/2-ch/2, w: cw, h: ch };
  }

  // ── Steal a Brainrot — Update ──────────────────────────────────────────

  private _updateSteal(dt: number): void {
    const W = this._canvas.width, H = this._canvas.height;

    this._sbConvAnim += dt;
    this._sbTimer -= dt;
    if (this._sbTimer <= 0) { this._sbTimer = 0; this._sbEndSteal(); return; }

    // Passive income — smooth per-frame accumulation
    for (let i = 0; i < 4; i++) {
      this._sbMoney[i] += this._sbIncome[i] * dt;
      if (this._sbMoney[i] >= SB_WIN) { this._sbEndSteal(); return; }
    }

    // Base timers
    for (const b of this._sbBases) {
      if (b.locked) {
        b.lockTimer -= dt;
        if (b.lockTimer <= 0) { b.locked = false; b.lockCooldown = LOCK_CD; }
      } else {
        if (b.lockCooldown > 0) b.lockCooldown -= dt;
      }
      if (b.alertTimer > 0) b.alertTimer -= dt;
    }

    for (let i = 0; i < 4; i++) {
      if (this._sbSlowTimer[i] > 0) this._sbSlowTimer[i] -= dt;
      if (this._sbSlapCD[i]    > 0) this._sbSlapCD[i]    -= dt;
    }

    // Conveyor: spawn items sliding left→right
    this._sbConvSpawn -= dt;
    if (this._sbConvSpawn <= 0) {
      this._sbConvSpawn = 1.8 + Math.random() * 1.2;
      // Pick a random type (weighted toward cheaper ones)
      const roll = Math.random();
      const ti = roll < 0.5 ? 0 : roll < 0.78 ? 1 : roll < 0.93 ? 2 : 3;
      this._sbConvItems.push({ x: this._sbConveyor.x, typeIdx: ti });
    }
    const convSpeed = 55; // px/s
    for (const item of this._sbConvItems) item.x += convSpeed * dt;
    // Remove items that scrolled off
    this._sbConvItems = this._sbConvItems.filter(item => item.x < this._sbConveyor.x + this._sbConveyor.w + 40);

    // Player movement
    const _spdMult = this._perkSpeedBoost ? 1.75 : 1;
    const pSpd  = (this._sbSlowTimer[0] > 0 ? 110 : 210) * _spdMult;
    const player = this._ents[0];
    player.x = Math.max(4, Math.min(W-4, player.x + this._dx() * pSpd * dt));
    player.y = Math.max(58, Math.min(H-4, player.y + this._dy() * pSpd * dt));

    // Player: lock base with E
    if (this._actJustPressed()) {
      const base = this._sbBases[0];
      if (this._sbPointInBase(player.x, player.y, base) && !base.locked && base.lockCooldown <= 0 && !this._sbCarrying[0]) {
        base.locked = true; base.lockTimer = LOCK_DUR;
      }
    }

    // Player auto-buy: walk into a conveyor item
    const cv = this._sbConveyor;
    if (player.y >= cv.y - 10 && player.y <= cv.y + cv.h + 10) {
      for (let i = this._sbConvItems.length - 1; i >= 0; i--) {
        const item = this._sbConvItems[i];
        if (Math.abs(player.x - item.x) < 28) {
          const cost = SB_TYPES[item.typeIdx].cost;
          if (this._sbMoney[0] >= cost) {
            this._sbMoney[0] -= cost;
            this._sbBases[0].brainrots.push(item.typeIdx);
            this._sbIncome[0] = this._sbBases[0].brainrots.reduce((s, t) => s + SB_TYPES[t].income, 0);
            this._sbConvItems.splice(i, 1);
          }
          break;
        }
      }
    }

    // Auto-mechanics for player
    this._sbTryPickup(0);
    this._sbTryDeposit(0);
    this._sbTrySlap(0);

    // Bots
    for (let i = 1; i <= 3; i++) this._updateStealBot(i, dt, W, H);
  }

  private _sbTryPickup(idx: number): void {
    if (this._sbCarrying[idx] !== null) return;
    const e = this._ents[idx];
    for (let bi = 0; bi < 4; bi++) {
      if (bi === idx) continue;
      const base = this._sbBases[bi];
      if (base.locked || base.brainrots.length === 0) continue;
      if (!this._sbPointInBase(e.x, e.y, base)) continue;
      const typeIdx = base.brainrots.pop()!;
      this._sbIncome[bi] = base.brainrots.reduce((s, t) => s + SB_TYPES[t].income, 0);
      this._sbCarrying[idx]  = { baseIdx: bi, typeIdx };
      this._sbSlowTimer[idx] = 9999;
      base.alertTimer = 3.5;
      break;
    }
  }

  private _sbTryDeposit(idx: number): void {
    const carry = this._sbCarrying[idx];
    if (!carry) return;
    const base = this._sbBases[idx];
    if (this._sbPointInBase(this._ents[idx].x, this._ents[idx].y, base)) {
      base.brainrots.push(carry.typeIdx);
      this._sbIncome[idx] = base.brainrots.reduce((s, t) => s + SB_TYPES[t].income, 0);
      this._sbCarrying[idx]  = null;
      this._sbSlowTimer[idx] = 0;
    }
  }

  private _sbTrySlap(attackerIdx: number): void {
    if (this._sbSlapCD[attackerIdx] > 0) return;
    const a = this._ents[attackerIdx];
    for (let i = 0; i < 4; i++) {
      if (i === attackerIdx) continue;
      const carry = this._sbCarrying[i];
      if (!carry || carry.baseIdx !== attackerIdx) continue;
      if (Math.hypot(a.x - this._ents[i].x, a.y - this._ents[i].y) < 38) {
        this._sbBases[attackerIdx].brainrots.push(carry.typeIdx);
        this._sbIncome[attackerIdx] = this._sbBases[attackerIdx].brainrots.reduce((s,t)=>s+SB_TYPES[t].income,0);
        this._sbCarrying[i]  = null;
        this._sbSlowTimer[i] = 0;
        this._sbSlapCD[attackerIdx] = 1.0;
        return;
      }
    }
  }

  private _sbPointInBase(x: number, y: number, b: SBBase): boolean {
    return x >= b.x && x <= b.x+b.w && y >= b.y && y <= b.y+b.h;
  }

  private _updateStealBot(idx: number, dt: number, W: number, H: number): void {
    const e    = this._ents[idx];
    const base = this._sbBases[idx];
    const spd  = (this._sbSlowTimer[idx] > 0 ? 120 : 175) * (this._perkBotSlow ? 0.40 : 1);

    this._sbTrySlap(idx);
    this._sbTryDeposit(idx);
    this._sbTryPickup(idx);

    // Lock own base when inside and cooldown ready (not in first 10s so player can steal)
    if (!base.locked && base.lockCooldown <= 0 && base.brainrots.length > 0 && !this._sbCarrying[idx] && this._sbTimer < SB_TIME - 10) {
      if (this._sbPointInBase(e.x, e.y, base)) {
        base.locked = true; base.lockTimer = LOCK_DUR;
      }
    }

    // Bot auto-buy: touch a conveyor item they can afford
    const conv = this._sbConveyor;
    const nearConv = e.y >= conv.y - 10 && e.y <= conv.y + conv.h + 10;
    if (nearConv) {
      for (let i = this._sbConvItems.length - 1; i >= 0; i--) {
        const item = this._sbConvItems[i];
        if (Math.abs(e.x - item.x) < 28 && this._sbMoney[idx] >= SB_TYPES[item.typeIdx].cost) {
          this._sbMoney[idx] -= SB_TYPES[item.typeIdx].cost;
          this._sbBases[idx].brainrots.push(item.typeIdx);
          this._sbIncome[idx] = this._sbBases[idx].brainrots.reduce((s, t) => s + SB_TYPES[t].income, 0);
          this._sbConvItems.splice(i, 1);
          break;
        }
      }
    }

    // Choose move target
    let tx = e.x, ty = e.y;
    if (this._sbCarrying[idx] !== null) {
      tx = base.x + base.w/2; ty = base.y + base.h/2;
    } else {
      // Any affordable item on the conveyor?
      const affordableItem = this._sbConvItems.find(it => this._sbMoney[idx] >= SB_TYPES[it.typeIdx].cost);
      // Prefer stealing from other bots (not the player) — only target player if no bot targets exist
      const botTargets: number[] = [];
      const playerTargets: number[] = [];
      for (let bi = 0; bi < 4; bi++) {
        if (bi === idx) continue;
        const tb = this._sbBases[bi];
        if (tb.locked || tb.brainrots.length === 0) continue;
        if (bi === 0) playerTargets.push(bi);
        else botTargets.push(bi);
      }
      // Pick random bot target first, fall back to player only 20% of the time
      const pool = botTargets.length > 0 && Math.random() > 0.2 ? botTargets : [...botTargets, ...playerTargets];
      const bestBase = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : -1;

      if (affordableItem) {
        tx = affordableItem.x; ty = conv.y + conv.h/2;
      } else if (bestBase >= 0) {
        tx = this._sbBases[bestBase].x + this._sbBases[bestBase].w/2;
        ty = this._sbBases[bestBase].y + this._sbBases[bestBase].h/2;
      } else {
        tx = base.x + base.w/2; ty = base.y + base.h/2;
      }
    }

    const dx = tx - e.x, dy = ty - e.y, len = Math.sqrt(dx*dx+dy*dy)||1;
    if (len > 5) { e.x += dx/len*spd*dt; e.y += dy/len*spd*dt; }
    e.x = Math.max(4, Math.min(W-4, e.x));
    e.y = Math.max(58, Math.min(H-4, e.y));
  }

  private _sbEndSteal(): void {
    const winner = this._sbMoney.reduce((bi, m, i) => m > this._sbMoney[bi] ? i : bi, 0);
    this._resultMsg = winner === 0
      ? `🎉 You Win! $${Math.floor(this._sbMoney[0])} earned!`
      : `😢 ${this._ents[winner].name} won with $${Math.floor(this._sbMoney[winner])}! You had $${Math.floor(this._sbMoney[0])}.`;
    this._state = "result"; this._resultTimer = 5;
  }

  // ── Floor is Lava ─────────────────────────────────────────────────────

  private _genPlatforms(W: number, H: number) {
    const plats = [{ x: 0, y: H - 40, w: W, h: 20 }];
    const heights = [0.72, 0.58, 0.44, 0.32, 0.22];
    const widths  = [160, 140, 130, 120, 110];
    for (let row = 0; row < heights.length; row++) {
      const count = row < 2 ? 3 : 2;
      for (let col = 0; col < count; col++) {
        plats.push({
          x: W * (0.1 + col * (0.8 / (count-1||1))) - widths[row]/2,
          y: H * heights[row], w: widths[row], h: 18,
        });
      }
    }
    return plats;
  }

  private _updateLava(dt: number): void {
    const W = this._canvas.width, H = this._canvas.height;
    const gravity = 900, jumpVel = -480, speed = 220;
    const _sm = this._perkSpeedBoost ? 1.75 : 1;
    const _bm = this._perkBotSlow    ? 0.40 : 1;
    this._surviveTime += dt;
    this._lavaY -= (20 + this._surviveTime * 1.5) * dt;

    this._ents.forEach((e) => {
      if (!e.alive) return;
      if (e.isPlayer) {
        e.vx = this._dx() * speed * _sm;
      } else {
        const nearest = this._platforms
          .filter(p => p.y < e.y - 10 && p.y > this._lavaY)
          .sort((a,b) => Math.abs(a.x+a.w/2-e.x) - Math.abs(b.x+b.w/2-e.x))[0];
        if (nearest) e.vx = nearest.x+nearest.w/2-e.x > 0 ? speed*0.7*_bm : -speed*0.7*_bm;
      }
      e.vy += gravity * dt;
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.x = Math.max(0, Math.min(W - e.w, e.x));
      e.onGround = false;
      for (const p of this._platforms) {
        if (e.x+e.w > p.x && e.x < p.x+p.w && e.y+e.h > p.y && e.y+e.h < p.y+p.h+e.vy*dt+10 && e.vy >= 0) {
          e.y = p.y - e.h; e.vy = 0; e.onGround = true;
        }
      }
      if (e.onGround) {
        if (e.isPlayer && this._jumpPressed()) { e.vy = jumpVel; e.onGround = false; }
        if (!e.isPlayer) {
          const below = this._lavaY - (e.y + e.h);
          if (below < H * 0.25 || Math.random() < 0.02) { e.vy = jumpVel; e.onGround = false; }
        }
      }
      if (e.y + e.h > this._lavaY) {
        e.alive = false;
        if (e.isPlayer) {
          this._resultMsg = `🌋 You survived ${this._surviveTime.toFixed(1)}s before the lava got you!`;
          this._state = "result"; this._resultTimer = 4;
        }
      }
    });
    if (this._lavaY < 0) {
      this._resultMsg = `🌋 ${this._surviveTime.toFixed(1)}s survived! The lava consumed everything!`;
      this._state = "result"; this._resultTimer = 4;
    }
  }

  // ── Bomb Dodge ────────────────────────────────────────────────────────

  private _updateBombs(dt: number): void {
    const W = this._canvas.width, H = this._canvas.height;
    const speed = 190, margin = 50;
    this._dodgeTime += dt;
    this._bombRate = Math.max(0.7, 2.0 - this._dodgeTime * 0.05);
    this._bombNext -= dt;
    if (this._bombNext <= 0) {
      this._bombNext = this._bombRate;
      this._bombs.push({ x: margin+Math.random()*(W-margin*2), y: margin+Math.random()*(H-margin*2-80), r: 70, t: 1.5, phase: "warn" });
    }
    for (const b of this._bombs) {
      b.t -= dt;
      if (b.phase === "warn" && b.t <= 0) { b.phase = "boom"; b.t = 0.4; }
    }
    const _bsm = this._perkSpeedBoost ? 1.75 : 1;
    const _bbm = this._perkBotSlow    ? 0.40 : 1;
    this._ents.forEach(e => {
      if (!e.alive) return;
      if (e.isPlayer) {
        const mx = this._dx(), my = this._dy();
        e.x = Math.max(margin, Math.min(W-margin, e.x + mx*speed*_bsm*dt));
        e.y = Math.max(margin+60, Math.min(H-margin-60, e.y + my*speed*_bsm*dt));
      } else {
        const threat = this._bombs.find(b => b.phase==="warn" && Math.hypot(b.x-e.x,b.y-e.y) < b.r+60);
        if (threat) {
          const dx=e.x-threat.x, dy=e.y-threat.y, l=Math.sqrt(dx*dx+dy*dy)||1;
          e.x = Math.max(margin, Math.min(W-margin, e.x+dx/l*speed*_bbm*dt*1.1));
          e.y = Math.max(margin+60, Math.min(H-margin-60, e.y+dy/l*speed*_bbm*dt*1.1));
        } else {
          e.x += (Math.random()-0.5)*speed*_bbm*dt*0.5;
          e.y += (Math.random()-0.5)*speed*_bbm*dt*0.5;
        }
      }
      for (const b of this._bombs) {
        if (b.phase === "boom" && Math.hypot(b.x-e.x,b.y-e.y) < b.r) {
          if (e.isPlayer) {
            e.lives--;
            if (e.lives <= 0) {
              e.alive = false;
              this._resultMsg = `💣 You survived ${this._dodgeTime.toFixed(1)}s before the bombs got you!`;
              this._state = "result"; this._resultTimer = 4;
            }
          } else { e.alive = false; }
        }
      }
    });
    this._bombs = this._bombs.filter(b => !(b.phase === "boom" && b.t <= 0));
  }

  // ── Coin Rush ─────────────────────────────────────────────────────────

  private _updateCoins(dt: number): void {
    const W = this._canvas.width, H = this._canvas.height;
    const speed = 210, margin = 50;
    const _csm = this._perkSpeedBoost ? 1.75 : 1;
    const _cbm = this._perkBotSlow    ? 0.40 : 1;
    this._rushTimer -= dt;
    this._coinSpawn -= dt;
    if (this._coinSpawn <= 0) {
      this._coinSpawn = 0.6;
      this._coinItems.push({ x: margin+Math.random()*(W-margin*2), y: margin+80+Math.random()*(H-margin*2-80), taken: false });
    }
    this._ents.forEach(e => {
      if (e.isPlayer) {
        const mx = this._dx(), my = this._dy();
        e.x = Math.max(margin, Math.min(W-margin, e.x+mx*speed*_csm*dt));
        e.y = Math.max(margin+60, Math.min(H-margin-60, e.y+my*speed*_csm*dt));
      } else {
        const nearest = this._coinItems.filter(c=>!c.taken).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];
        if (nearest) {
          const dx=nearest.x-e.x, dy=nearest.y-e.y, l=Math.sqrt(dx*dx+dy*dy)||1;
          e.x = Math.max(margin, Math.min(W-margin, e.x+dx/l*speed*0.85*_cbm*dt));
          e.y = Math.max(margin+60, Math.min(H-margin-60, e.y+dy/l*speed*0.85*_cbm*dt));
        }
      }
      for (const c of this._coinItems) {
        if (!c.taken && Math.hypot(c.x-e.x,c.y-e.y) < 24) { c.taken = true; e.coins++; }
      }
    });
    if (this._rushTimer <= 0) {
      const player = this._ents[0];
      const best   = [...this._ents].sort((a,b)=>b.coins-a.coins)[0];
      this._resultMsg = best.isPlayer
        ? `🪙 You Win! ${player.coins} coins collected!`
        : `😢 ${best.name} won with ${best.coins} coins. You got ${player.coins}.`;
      this._state = "result"; this._resultTimer = 4;
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────

  private _draw(): void {
    if (this._in3dGame) return;
    const W = this._canvas.width, H = this._canvas.height;
    if (this._state === "lobby")     { this._drawLobby(W, H); }
    else if (this._state === "countdown") { this._drawGameBg(W, H); this._drawGameScene(W, H); this._drawCountdown(W, H); }
    else {
      this._drawGameBg(W, H);
      this._drawGameScene(W, H);
      if (this._state === "playing") this._drawHUD(W, H);
      if (this._state === "result")  this._drawResult(W, H);
      this._drawBackBtn(W, H);
      this._drawJoystick(W, H);
    }
    if (this._modeSelect) this._drawModeSelect(W, H);
  }

  private _drawModeSelect(W: number, H: number): void {
    const ctx = this._ctx;
    const {soloY, pvpY, bx, bw, bh, cx, cy, cw, ch} = this._modeSelectRects(W, H);
    ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "#1a1a2e"; ctx.beginPath(); ctx.roundRect(cx,cy,cw,ch,16); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx,cy,cw,ch,16); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial Black,Arial,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("Choose Game Mode", W/2, cy+36);
    // Solo
    ctx.fillStyle = "rgba(0,160,0,0.85)"; ctx.beginPath(); ctx.roundRect(bx,soloY,bw,bh,10); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 17px Arial Black,Arial,sans-serif";
    ctx.fillText("🧍 Solo", W/2, soloY+22);
    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = "12px Arial,sans-serif";
    ctx.fillText("Just you — no bots, chill run", W/2, soloY+44);
    // PvP
    ctx.fillStyle = "rgba(180,20,20,0.85)"; ctx.beginPath(); ctx.roundRect(bx,pvpY,bw,bh,10); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 17px Arial Black,Arial,sans-serif";
    ctx.fillText("⚔️ PvP — Compete!", W/2, pvpY+22);
    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = "12px Arial,sans-serif";
    ctx.fillText("Race bots, steal, survive — beat them all!", W/2, pvpY+44);
    // Cancel
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.font = "13px Arial,sans-serif";
    ctx.fillText("✕ Cancel", W/2, cy+ch-18);
  }

  private _drawLobby(W: number, H: number): void {
    const ctx = this._ctx;
    // Background
    const bgGrd = ctx.createLinearGradient(0, 0, 0, H);
    bgGrd.addColorStop(0, "#0a0014"); bgGrd.addColorStop(1, "#140028");
    ctx.fillStyle = bgGrd; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + i % 3 * 0.15})`;
      ctx.beginPath(); ctx.arc((i * W / 7) % W, (i * H / 11) % H, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    const headerH = H * 0.25;

    // ── Header ─────────────────────────────────────────────────────────────
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.min(W, H) * 0.065}px Arial Black,Arial,sans-serif`;
    ctx.fillText("🎮  Roblox Games", W / 2, H * 0.09);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = `${Math.min(W, H) * 0.027}px Arial,sans-serif`;
    ctx.fillText(`${GAMES.length + FAKE_GAMES.length} games — scroll to explore!`, W / 2, H * 0.155);

    // Active perk badges
    const active: string[] = [];
    if (this._perkInstaWin)    active.push("🏆 Insta Win");
    if (this._perkBotSlow)     active.push("🐌 Bot Slow");
    if (this._perkSpeedBoost)  active.push("⚡ Speed Boost");
    if (this._perkLongRespawn) active.push("💀 Long Respawn");
    if (active.length > 0) {
      ctx.fillStyle = "rgba(0,255,120,0.15)";
      ctx.beginPath(); ctx.roundRect(W / 2 - 160, H * 0.198, 320, 22, 6); ctx.fill();
      ctx.fillStyle = "#00ff88"; ctx.font = "bold 11px Arial,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Active: " + active.join("  "), W / 2, H * 0.198 + 11);
    }

    // Robux button (top right)
    ctx.fillStyle = "rgba(0,200,80,0.9)";
    ctx.beginPath(); ctx.roundRect(W - 148, 10, 140, 36, 10); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial Black,Arial,sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`💎 Robux  ${this._robux.toLocaleString()} R`, W - 78, 28);

    // ── Scrollable game grid ────────────────────────────────────────────────
    const cols = W > 600 ? 2 : 1;
    const cw = Math.min(320, (W - 48) / cols), ch = 100, gap = 12;
    const totalW = cols * cw + (cols - 1) * gap;
    const sx = (W - totalW) / 2;
    const scrollY = Math.round(this._lobbyScrollY);

    ctx.save();
    ctx.beginPath(); ctx.rect(0, headerH, W, H - headerH); ctx.clip();
    ctx.translate(0, headerH - scrollY);

    const allGames: { name: string; emoji: string; desc: string; bg: string; isReal: boolean; realIdx?: number; players?: string }[] = [
      ...GAMES.map((g, i) => ({ name: g.name, emoji: g.emoji, desc: g.desc, bg: g.bg, isReal: true as const, realIdx: i })),
      ...FAKE_GAMES.map(g => ({ ...g, isReal: false as const })),
    ];

    allGames.forEach((g, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx2 = sx + col * (cw + gap);
      const cy2 = gap + row * (ch + gap);

      // Visibility cull
      if (cy2 + ch < scrollY - 60 || cy2 > scrollY + (H - headerH) + 60) return;

      const grd = ctx.createLinearGradient(cx2, cy2, cx2 + cw, cy2 + ch);
      grd.addColorStop(0, g.bg + "ee"); grd.addColorStop(1, g.bg + "88");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.roundRect(cx2, cy2, cw, ch, 12); ctx.fill();
      ctx.strokeStyle = g.isReal ? "rgba(0,255,120,0.55)" : "rgba(255,255,255,0.18)";
      ctx.lineWidth = g.isReal ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(cx2, cy2, cw, ch, 12); ctx.stroke();

      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.font = `${ch * 0.3}px serif`;
      ctx.fillText(g.emoji, cx2 + 12, cy2 + ch * 0.38);

      if (g.isReal) {
        const id = GAMES[g.realIdx!].id;
        const isCustom = id === "custom";
        const hasCustom = !isCustom || !!localStorage.getItem(STUDIO_SAVE_KEY);
        ctx.fillStyle = hasCustom ? "#fff" : "rgba(255,255,255,0.4)";
        ctx.font = `bold ${Math.min(ch * 0.19, 15)}px Arial Black,Arial,sans-serif`;
        ctx.fillText(g.name, cx2 + 52, cy2 + ch * 0.34);
        ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = `${Math.min(ch * 0.14, 11)}px Arial,sans-serif`;
        ctx.fillText(hasCustom ? g.desc : "Build a level in Roblox Studio first!", cx2 + 52, cy2 + ch * 0.6);
        // PLAY badge
        ctx.fillStyle = "#00cc44";
        ctx.beginPath(); ctx.roundRect(cx2 + cw - 54, cy2 + 8, 46, 20, 8); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "bold 10px Arial Black,Arial,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("● PLAY", cx2 + cw - 31, cy2 + 18);
        ctx.textAlign = "left";
      } else {
        ctx.fillStyle = "#ddd"; ctx.font = `bold ${Math.min(ch * 0.19, 15)}px Arial Black,Arial,sans-serif`;
        ctx.fillText(g.name, cx2 + 52, cy2 + ch * 0.34);
        ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = `${Math.min(ch * 0.14, 11)}px Arial,sans-serif`;
        ctx.fillText(g.desc, cx2 + 52, cy2 + ch * 0.58);
        if (g.players) {
          ctx.fillStyle = "rgba(255,255,255,0.28)"; ctx.font = `${Math.min(ch * 0.13, 10)}px Arial,sans-serif`;
          ctx.fillText(`👥 ${g.players} playing`, cx2 + 52, cy2 + ch * 0.8);
        }
      }
    });
    ctx.restore();

    // Scroll bar
    const totalCards = GAMES.length + FAKE_GAMES.length;
    const rows2 = Math.ceil(totalCards / cols);
    const totalGridH = rows2 * (ch + gap) + gap * 2;
    const scrollAreaH = H - headerH;
    const maxScroll = Math.max(1, totalGridH - scrollAreaH);
    if (maxScroll > 0) {
      const trackH = scrollAreaH - 16;
      const thumbH = Math.max(24, (scrollAreaH / totalGridH) * trackH);
      const thumbY = headerH + 8 + (this._lobbyScrollY / maxScroll) * (trackH - thumbH);
      ctx.fillStyle = "rgba(255,255,255,0.1)"; ctx.fillRect(W - 7, headerH + 8, 4, trackH);
      ctx.fillStyle = "rgba(255,255,255,0.42)"; ctx.fillRect(W - 7, thumbY, 4, thumbH);
    }

    // Back button
    this._drawBackBtn(W, H);

    // ── Connecting overlay ──────────────────────────────────────────────────
    if (this._lobbyConnecting !== null) {
      ctx.fillStyle = "rgba(0,0,0,0.78)"; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const cx3 = W / 2, cy3 = H / 2;
      ctx.fillStyle = "#fff"; ctx.font = "bold 20px Arial Black,Arial,sans-serif";
      ctx.fillText(`Joining ${this._lobbyConnecting}…`, cx3, cy3 - 44);
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "13px Arial,sans-serif";
      ctx.fillText("Searching for an available server", cx3, cy3 - 10);
      const dots = ".".repeat(Math.floor(this._lobbyConnectT * 3) % 4);
      ctx.fillText("Please wait" + dots, cx3, cy3 + 14);
      const pW = Math.min(260, W - 60), prog = this._lobbyConnectT / 2.2;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath(); ctx.roundRect(cx3 - pW / 2, cy3 + 42, pW, 6, 3); ctx.fill();
      ctx.fillStyle = "#0066ff";
      ctx.beginPath(); ctx.roundRect(cx3 - pW / 2, cy3 + 42, pW * Math.min(1, prog), 6, 3); ctx.fill();
    }

    // Robux screen overlay
    if (this._robuxScreen !== "none") this._drawRobuxScreen(W, H);
  }

  private _drawRobuxScreen(W: number, H: number): void {
    const ctx = this._ctx;
    const panelW = Math.min(400, W - 32), panelH = Math.min(560, H - 60);
    const px = (W - panelW) / 2, py = (H - panelH) / 2;

    // Dimmed backdrop
    ctx.fillStyle = "rgba(0,0,0,0.82)"; ctx.fillRect(0,0,W,H);

    // Panel
    ctx.fillStyle = "#0f0f1a";
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 18); ctx.fill();
    ctx.strokeStyle = "rgba(0,255,120,0.35)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 18); ctx.stroke();

    // Back button
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath(); ctx.roundRect(px+8, py+10, 72, 32, 8); ctx.fill();
    ctx.fillStyle="#ccc"; ctx.font="bold 12px Arial,sans-serif";
    ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText("← Back", px+16, py+26);

    // Balance
    ctx.textAlign="center";
    ctx.fillStyle="#00ff88"; ctx.font=`bold 26px Arial Black,Arial,sans-serif`;
    ctx.textBaseline="middle";
    ctx.fillText(`💎 ${this._robux.toLocaleString()} Robux`, px+panelW/2, py+30);

    // Ad watching overlay
    if (this._adTimer > 0) {
      const prog = 1 - this._adTimer / 6;
      ctx.fillStyle="rgba(0,0,0,0.9)"; ctx.fillRect(px,py,panelW,panelH);
      ctx.fillStyle="#fff"; ctx.font=`bold 18px Arial Black,Arial,sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("📺 Watching Ad...", px+panelW/2, py+panelH*0.38);
      ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.fillRect(px+20,py+panelH*0.52,panelW-40,16);
      ctx.fillStyle="#00ff88";             ctx.fillRect(px+20,py+panelH*0.52,(panelW-40)*prog,16);
      ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.font="13px Arial,sans-serif";
      ctx.fillText(`${Math.ceil(this._adTimer)}s remaining...`, px+panelW/2, py+panelH*0.62);
      return;
    }
    if (this._adDone) {
      ctx.fillStyle="rgba(0,0,0,0.9)"; ctx.fillRect(px,py,panelW,panelH);
      ctx.fillStyle="#00ff88"; ctx.font=`bold 22px Arial Black,Arial,sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`✅ +${this._adReward.toLocaleString()} Robux added!`, px+panelW/2, py+panelH*0.46);
      ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font="13px Arial,sans-serif";
      ctx.fillText("Tap anywhere to continue", px+panelW/2, py+panelH*0.58);
      return;
    }

    if (this._robuxScreen === "buy") {
      // White Roblox-style background
      ctx.fillStyle="#fff";
      ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 18); ctx.fill();

      // Back button (re-draw on white bg)
      ctx.fillStyle="rgba(0,0,0,0.08)";
      ctx.beginPath(); ctx.roundRect(px+8, py+10, 72, 32, 8); ctx.fill();
      ctx.fillStyle="#555"; ctx.font="bold 12px Arial,sans-serif";
      ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText("← Back", px+16, py+26);

      // Balance (dark on white) — click to set amount
      ctx.fillStyle="#111"; ctx.font=`bold 18px Arial Black,Arial,sans-serif`;
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`💎 ${this._robux.toLocaleString()} Robux  ✏️`, px+panelW/2, py+32);

      // "Bonus item" banner
      const bannerY = py + 52;
      ctx.fillStyle="#111"; ctx.font="bold 12px Arial,sans-serif";
      ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillText("Bonus item we picked for you", px+14, bannerY);
      // Banner card
      const grad = ctx.createLinearGradient(px+8, bannerY+14, px+panelW-8, bannerY+64);
      grad.addColorStop(0,"#1a2a4a"); grad.addColorStop(1,"#2a4a6a");
      ctx.fillStyle=grad; ctx.beginPath(); ctx.roundRect(px+8,bannerY+14,panelW-16,52,10); ctx.fill();
      // Icon circle
      ctx.fillStyle="#4488ff"; ctx.beginPath(); ctx.arc(px+46,bannerY+40,20,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 14px Arial Black,Arial,sans-serif";
      ctx.textAlign="center"; ctx.fillText("2×",px+46,bannerY+40);
      // Banner text
      ctx.fillStyle="#fff"; ctx.font="bold 14px Arial Black,Arial,sans-serif";
      ctx.textAlign="left"; ctx.fillText("Robux x2 Bonus Pack", px+74, bannerY+32);
      ctx.fillStyle="rgba(255,255,255,0.65)"; ctx.font="11px Arial,sans-serif";
      ctx.fillText("Double the value on every purchase!", px+74, bannerY+50);

      // Packs (Roblox-style rows)
      const packs = [
        { base: 22_500, bonus: 1_500, total: 24_000, reward: 24_000 },
        { base: 10_000, bonus: 1_000, total: 11_000, reward: 11_000 },
        { base:  4_500, bonus:   750, total:  5_250, reward:  5_250 },
        { base:  1_700, bonus:   300, total:  2_000, reward:  2_000 },
      ];
      const rowH = 56, rowStart = bannerY + 80;
      packs.forEach((pack, i) => {
        const ry = rowStart + i * rowH;
        // Separator line
        ctx.strokeStyle="#eee"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(px+8,ry); ctx.lineTo(px+panelW-8,ry); ctx.stroke();

        // Robux icon
        ctx.fillStyle="#0090ff"; ctx.beginPath(); ctx.arc(px+28,ry+28,14,0,Math.PI*2); ctx.fill();
        ctx.fillStyle="#fff"; ctx.font="bold 11px Arial Black,Arial,sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("R",px+28,ry+28);

        // Big amount (strikethrough base + total)
        const totalStr = pack.total.toLocaleString();
        const baseStr  = pack.base.toLocaleString();
        ctx.fillStyle="#111"; ctx.font="bold 20px Arial Black,Arial,sans-serif";
        ctx.textAlign="left"; ctx.textBaseline="middle";
        ctx.fillText(totalStr, px+50, ry+22);
        // Strikethrough base
        const totalW = ctx.measureText(totalStr).width;
        ctx.fillStyle="#aaa"; ctx.font="13px Arial,sans-serif";
        ctx.fillText(baseStr, px+50, ry+42);
        const bw = ctx.measureText(baseStr).width;
        ctx.strokeStyle="#aaa"; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.moveTo(px+50,ry+42); ctx.lineTo(px+50+bw,ry+42); ctx.stroke();

        // Bonus badge
        const bonusTxt = `+ ${pack.bonus.toLocaleString()} more`;
        const badgeX = px+50+Math.max(totalW,bw)+10;
        ctx.fillStyle="#e8f4e8"; ctx.beginPath(); ctx.roundRect(badgeX,ry+14,ctx.measureText(bonusTxt).width+16,22,11); ctx.fill();
        ctx.fillStyle="#2a8a2a"; ctx.font="bold 10px Arial,sans-serif";
        ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText(bonusTxt,badgeX+8,ry+25);

        // Watch Ad button (right side)
        const btnW2=110, btnH2=38, btnX2=px+panelW-btnW2-8, btnY2=ry+9;
        ctx.fillStyle="#e8e8e8"; ctx.beginPath(); ctx.roundRect(btnX2,btnY2,btnW2,btnH2,8); ctx.fill();
        ctx.strokeStyle="#ccc"; ctx.lineWidth=1;
        ctx.beginPath(); ctx.roundRect(btnX2,btnY2,btnW2,btnH2,8); ctx.stroke();
        ctx.fillStyle="#222"; ctx.font="bold 12px Arial,sans-serif";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("📺 Watch Ad", btnX2+btnW2/2, btnY2+btnH2/2);
      });

      // Last separator
      const lastY = rowStart + packs.length * rowH;
      ctx.strokeStyle="#eee"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(px+8,lastY); ctx.lineTo(px+panelW-8,lastY); ctx.stroke();

      // Custom amount row
      const custY = lastY;
      ctx.fillStyle="#555"; ctx.font="13px Arial,sans-serif";
      ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText("🔢 Custom amount", px+14, custY+28);
      const cbtnW=110, cbtnX=px+panelW-cbtnW-8;
      ctx.fillStyle="#e8e8e8"; ctx.beginPath(); ctx.roundRect(cbtnX,custY+9,cbtnW,38,8); ctx.fill();
      ctx.strokeStyle="#ccc"; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(cbtnX,custY+9,cbtnW,38,8); ctx.stroke();
      ctx.fillStyle="#222"; ctx.font="bold 12px Arial,sans-serif";
      ctx.textAlign="center"; ctx.fillText("📺 Watch Ad", cbtnX+cbtnW/2, custY+28);

      // Set amount row
      const setY = custY + 48;
      ctx.strokeStyle="#eee"; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(px+8,setY); ctx.lineTo(px+panelW-8,setY); ctx.stroke();
      ctx.fillStyle="#888"; ctx.font="13px Arial,sans-serif";
      ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText("✏️ Set Robux to exact amount", px+14, setY+24);
      return;
    }

    if (this._robuxScreen === "shop") {
      ctx.fillStyle="#fff"; ctx.font=`bold 16px Arial Black,Arial,sans-serif`;
      ctx.textAlign="center"; ctx.fillText("🛒 Robux Shop", px+panelW/2, py+58);
      if (this._isAdmin) {
        ctx.fillStyle="rgba(255,215,0,0.6)"; ctx.font="10px Arial,sans-serif";
        ctx.fillText("👑 Admin mode — tap left side of item to edit price", px+panelW/2, py+76);
      }

      this._robuxPerks.forEach((perk, i) => {
        const by = py + 90 + i * 76;
        const canAfford = this._robux >= perk.price;
        ctx.fillStyle = canAfford ? "rgba(0,80,0,0.7)" : "rgba(60,60,60,0.7)";
        ctx.beginPath(); ctx.roundRect(px+8, by, panelW-16, 64, 10); ctx.fill();
        ctx.strokeStyle = canAfford ? "rgba(0,200,80,0.5)" : "rgba(100,100,100,0.4)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(px+8, by, panelW-16, 64, 10); ctx.stroke();

        // Perk info
        ctx.font="22px serif"; ctx.textAlign="left"; ctx.textBaseline="middle";
        ctx.fillText(perk.emoji, px+18, by+32);
        ctx.fillStyle="#fff"; ctx.font=`bold 14px Arial Black,Arial,sans-serif`;
        ctx.fillText(perk.name, px+48, by+18);
        ctx.fillStyle="rgba(255,255,255,0.6)"; ctx.font="11px Arial,sans-serif";
        ctx.fillText(perk.desc, px+48, by+38);

        // Price + Buy button
        const btnX = px+panelW-120, btnY = by+10, btnW = 108, btnH = 44;
        ctx.fillStyle = canAfford ? "rgba(0,180,60,0.9)" : "rgba(80,80,80,0.6)";
        ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill();
        ctx.fillStyle="#fff"; ctx.font=`bold 12px Arial Black,Arial,sans-serif`;
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(`💎 ${perk.price.toLocaleString()} R`, btnX+btnW/2, btnY+15);
        ctx.fillStyle = canAfford ? "#ffe066" : "rgba(255,255,255,0.35)";
        ctx.font="10px Arial,sans-serif";
        ctx.fillText(canAfford ? "TAP TO BUY" : "Not enough R", btnX+btnW/2, btnY+31);

        // Admin edit hint
        if (this._isAdmin) {
          ctx.fillStyle="rgba(255,215,0,0.55)"; ctx.font="9px Arial,sans-serif";
          ctx.textAlign="left"; ctx.fillText("✏️ edit", px+14, by+52);
        }
      });
    }
  }

  private _drawGameBg(W: number, H: number): void {
    const ctx = this._ctx;

    if (this._gameId === "steal") {
      // Dark map background
      ctx.fillStyle = "#1a0d00"; ctx.fillRect(0,0,W,H);
      // Subtle grid
      ctx.strokeStyle="rgba(255,180,0,0.07)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

      // Draw 4 bases
      const entColors = [PLR_COLOR, ...BOT_COLORS];
      for (const base of this._sbBases) {
        const col = entColors[base.ownerIdx];
        // Alert flash
        if (base.alertTimer > 0) {
          const flash = Math.sin(base.alertTimer * 12) * 0.5 + 0.5;
          ctx.fillStyle=`rgba(255,50,50,${flash*0.35})`; ctx.fillRect(base.x,base.y,base.w,base.h);
        }
        // Base floor
        ctx.fillStyle=col+"22"; ctx.fillRect(base.x,base.y,base.w,base.h);
        // Border
        if (base.locked) {
          // Shield glow
          const t = performance.now()/800;
          const pulse = Math.sin(t)*0.3+0.7;
          ctx.strokeStyle=`rgba(100,220,255,${pulse})`; ctx.lineWidth=3;
        } else {
          ctx.strokeStyle=col+"bb"; ctx.lineWidth=2;
        }
        ctx.beginPath(); ctx.roundRect(base.x,base.y,base.w,base.h,8); ctx.stroke();

        // Lock icon
        if (base.locked) {
          ctx.font="16px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText("🔒", base.x+base.w-14, base.y+14);
          ctx.fillStyle="rgba(100,220,255,0.2)"; ctx.fillRect(base.x,base.y,base.w,base.h);
        }

        // Cooldown bar (bottom of base)
        if (!base.locked && base.lockCooldown > 0) {
          const pct = 1 - base.lockCooldown / LOCK_CD;
          ctx.fillStyle="rgba(0,0,0,0.4)"; ctx.fillRect(base.x, base.y+base.h-8, base.w, 8);
          ctx.fillStyle="rgba(100,220,255,0.6)"; ctx.fillRect(base.x, base.y+base.h-8, base.w*pct, 8);
        }

        // Owner label
        ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.roundRect(base.x+4,base.y+4,base.w-8,16,4); ctx.fill();
        ctx.fillStyle=col; ctx.font="bold 10px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(base.ownerIdx===0?"YOUR BASE":this._ents[base.ownerIdx].name+"'s Base", base.x+base.w/2, base.y+12);

        // Brainrots inside base
        const cols2 = 4;
        base.brainrots.forEach((ti, i) => {
          const bx = base.x + 12 + (i % cols2) * 22;
          const by = base.y + 28 + Math.floor(i / cols2) * 22;
          ctx.font="16px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
          ctx.fillText(SB_TYPES[ti].emoji, bx, by);
        });

        // Income label
        ctx.fillStyle="rgba(255,215,0,0.85)"; ctx.font="bold 10px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="bottom";
        ctx.fillText(`+$${this._sbIncome[base.ownerIdx]}/s`, base.x+base.w/2, base.y+base.h-10);
      }

      // Conveyor belt (center)
      const cv = this._sbConveyor;
      const convOff = (this._sbConvAnim * 40) % 30;
      // Belt background
      const cg = ctx.createLinearGradient(cv.x, cv.y, cv.x, cv.y+cv.h);
      cg.addColorStop(0,"#2a2a2a"); cg.addColorStop(1,"#1a1a1a");
      ctx.fillStyle=cg; ctx.beginPath(); ctx.roundRect(cv.x,cv.y,cv.w,cv.h,10); ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(cv.x,cv.y,cv.w,cv.h,10); ctx.stroke();
      // Moving belt stripes
      ctx.save(); ctx.beginPath(); ctx.roundRect(cv.x,cv.y,cv.w,cv.h,10); ctx.clip();
      ctx.strokeStyle="rgba(255,255,255,0.07)"; ctx.lineWidth=8;
      for(let bx = cv.x - 30 + convOff; bx < cv.x+cv.w+30; bx+=30) {
        ctx.beginPath(); ctx.moveTo(bx, cv.y); ctx.lineTo(bx+20, cv.y+cv.h); ctx.stroke();
      }
      ctx.restore();
      // SHOP label
      ctx.fillStyle="#FFD700"; ctx.font="bold 11px Arial Black,Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="top";
      ctx.fillText("🛒 Walk into brainrots to buy them!", cv.x+cv.w/2, cv.y+3);
      // Sliding brainrot items
      ctx.save(); ctx.beginPath(); ctx.roundRect(cv.x, cv.y, cv.w, cv.h, 10); ctx.clip();
      for (const item of this._sbConvItems) {
        const bt = SB_TYPES[item.typeIdx];
        const iy = cv.y + cv.h / 2 + 6;
        ctx.font="22px serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(bt.emoji, item.x, iy - 10);
        const canAfford = this._sbMoney[0] >= bt.cost;
        ctx.fillStyle = canAfford ? "#FFD700" : "rgba(255,255,255,0.4)";
        ctx.font="bold 10px Arial,sans-serif"; ctx.textBaseline="top";
        ctx.fillText(bt.cost === 0 ? "FREE" : `$${bt.cost}`, item.x, iy + 4);
        ctx.fillStyle="rgba(100,255,100,0.8)"; ctx.font="9px Arial,sans-serif";
        ctx.fillText(`+$${bt.income}/s`, item.x, iy + 15);
      }
      ctx.restore();

      return;
    }

    if (this._gameId === "lava") {
      const ly = this._lavaY;
      ctx.fillStyle="#1a0000"; ctx.fillRect(0,0,W,H);
      const lgrad = ctx.createLinearGradient(0,ly,0,H);
      lgrad.addColorStop(0,"#ff6600"); lgrad.addColorStop(1,"#cc0000");
      ctx.fillStyle = lgrad; ctx.fillRect(0,ly,W,H-ly);
      const glow = ctx.createLinearGradient(0,ly-30,0,ly+20);
      glow.addColorStop(0,"rgba(255,100,0,0)"); glow.addColorStop(0.5,"rgba(255,160,0,0.5)"); glow.addColorStop(1,"rgba(255,100,0,0)");
      ctx.fillStyle=glow; ctx.fillRect(0,ly-30,W,50);
      for (const p of this._platforms) {
        if (p.y > this._lavaY) continue;
        ctx.fillStyle="#5a3a1a"; ctx.fillRect(p.x,p.y,p.w,p.h);
        ctx.fillStyle="#7a5a2a"; ctx.fillRect(p.x,p.y,p.w,6);
      }
    }
    if (this._gameId === "bombs") {
      ctx.fillStyle="#0d0d1a"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(100,100,255,0.1)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for(let y=0;y<H;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
      for (const b of this._bombs) {
        if (b.phase==="warn") {
          const prog=1-b.t/1.5;
          ctx.strokeStyle=`rgba(255,80,0,${0.4+prog*0.5})`; ctx.lineWidth=2+prog*2;
          ctx.setLineDash([8,5]); ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle=`rgba(255,60,0,${prog*0.15})`; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
          ctx.font=`${24+prog*8}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("💣",b.x,b.y);
        } else {
          const p=1-b.t/0.4;
          ctx.fillStyle=`rgba(255,160,0,${(1-p)*0.7})`; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*(1+p*0.5),0,Math.PI*2); ctx.fill();
          ctx.fillStyle=`rgba(255,255,200,${(1-p)*0.9})`; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*0.4*(1-p),0,Math.PI*2); ctx.fill();
        }
      }
    }
    if (this._gameId === "coins") {
      ctx.fillStyle="#0a2a00"; ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,100,0,0.3)"; ctx.lineWidth=1;
      for(let x=0;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
      for (const c of this._coinItems) {
        if (c.taken) continue;
        ctx.font="22px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("🪙",c.x,c.y);
      }
    }
  }

  private _drawGameScene(_W: number, _H: number): void {
    for (const e of this._ents) {
      if (!e.alive) continue;
      const idx = this._ents.indexOf(e);
      const carry = this._gameId === "steal" ? this._sbCarrying[idx] : null;
      this._drawChar(e, idx, carry);
    }
  }

  private _drawChar(e: Ent, idx: number, carry: SBCarry | null): void {
    const ctx = this._ctx;
    const x=e.x, y=e.y;
    const slow = this._gameId === "steal" && this._sbSlowTimer[idx] > 0;

    ctx.fillStyle="rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(x,y+4,11,5,0,0,Math.PI*2); ctx.fill();

    // Body (flicker red if slowed)
    ctx.fillStyle = slow ? (Math.sin(performance.now()/80) > 0 ? e.color : "#ff9999") : e.color;
    ctx.fillRect(x-11, y-e.h, 22, e.h);
    // Head
    ctx.fillStyle="#f5d5a0"; ctx.fillRect(x-10, y-e.h-17, 20, 17);
    // Eyes
    ctx.fillStyle="#222"; ctx.fillRect(x-6,y-e.h-12,3,3); ctx.fillRect(x+3,y-e.h-12,3,3);
    // Smile
    ctx.strokeStyle="#333"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y-e.h-7,4,0.1,Math.PI-0.1); ctx.stroke();

    // Carried brainrot above head
    if (carry) {
      ctx.font="22px serif"; ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(SB_TYPES[carry.typeIdx].emoji, x, y-e.h-19);
    }

    // Name tag
    ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.roundRect(x-24,y-e.h-32,48,13,3); ctx.fill();
    ctx.fillStyle=e.color; ctx.font="bold 9px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(e.name, x, y-e.h-26);

    // Money tag (steal mode)
    if (this._gameId === "steal") {
      ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.roundRect(x-22,y-e.h-46,44,13,3); ctx.fill();
      ctx.fillStyle="#FFD700"; ctx.font="bold 9px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`$${Math.floor(this._sbMoney[idx])}`, x, y-e.h-40);
    }

    // Lives (bomb dodge)
    if (this._gameId==="bombs" && e.isPlayer) {
      for(let i=0;i<e.lives;i++){ctx.font="14px serif";ctx.textAlign="center";ctx.fillText("❤️",x-e.h*0.5+i*18,y-e.h-50);}
    }
  }

  private _drawHUD(W: number, H: number): void {
    const ctx = this._ctx;
    ctx.fillStyle="rgba(0,0,0,0.78)"; ctx.fillRect(0,0,W,54);
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="#fff"; ctx.font=`bold ${Math.min(W,H)*0.028}px Arial Black,Arial,sans-serif`;

    if (this._gameId === "steal") {
      // Timer
      const tLeft = Math.ceil(this._sbTimer);
      const tColor = tLeft <= 15 ? "#ff4444" : "#fff";
      ctx.fillStyle=tColor; ctx.fillText(`⏱ ${tLeft}s  •  🏁 First to $${SB_WIN} wins`, W/2, 16);
      // Money bar for each player
      const barW = W / 4 - 8, barH = 8, barY = 32;
      const entColors = [PLR_COLOR, ...BOT_COLORS];
      for (let i = 0; i < 4; i++) {
        const bx = i * (barW + 8) + 4;
        const pct = Math.min(1, this._sbMoney[i] / SB_WIN);
        ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.roundRect(bx, barY, barW, barH, 3); ctx.fill();
        ctx.fillStyle=entColors[i]; ctx.beginPath(); ctx.roundRect(bx, barY, barW*pct, barH, 3); ctx.fill();
        ctx.fillStyle=entColors[i]; ctx.font="bold 9px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="top";
        ctx.fillText(`${i===0?"You":this._ents[i].name.split("")[0]+".."} $${Math.floor(this._sbMoney[i])}`, bx+barW/2, barY+10);
      }
      // E key hint
      if (this._sbTimer > 80) {
        ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font="11px Arial,sans-serif"; ctx.textAlign="center"; ctx.textBaseline="bottom";
        ctx.fillText("Walk into sliding brainrots to buy them • Walk into enemy bases to steal • Press E in YOUR base to lock it", W/2, H-8);
      }
    }
    if (this._gameId === "lava")  { ctx.fillText(`⏱ ${this._surviveTime.toFixed(1)}s survived`, W/2, 26); }
    if (this._gameId === "bombs") { ctx.fillText(`💣 ${this._dodgeTime.toFixed(1)}s  •  ❤️ ${this._ents[0].lives}`, W/2, 26); }
    if (this._gameId === "coins") {
      ctx.fillText(`🪙 You: ${this._ents[0].coins}  •  ⏱ ${Math.ceil(this._rushTimer)}s`, W/2, 20);
      const scores = this._ents.slice(1).map(e=>`${e.name.split(" ")[0]}: ${e.coins}`).join("  ");
      ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.font=`${Math.min(W,H)*0.022}px Arial,sans-serif`;
      ctx.fillText(scores, W/2, 38);
    }
  }

  private _drawCountdown(W: number, H: number): void {
    const ctx = this._ctx;
    const n = Math.ceil(this._countdown);
    const g = GAMES.find(g=>g.id===this._gameId)!;
    ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(0,0,W,H);
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="#fff"; ctx.font=`bold ${Math.min(W,H)*0.08}px Arial Black,Arial,sans-serif`;
    ctx.fillText(`${g.emoji}  ${g.name}`, W/2, H*0.38);
    ctx.font=`bold ${Math.min(W,H)*0.18}px Arial Black,Arial,sans-serif`;
    ctx.fillStyle="#ffcc00";
    ctx.fillText(n <= 0 ? "GO!" : String(n), W/2, H*0.58);
    ctx.fillStyle="rgba(255,255,255,0.6)"; ctx.font=`${Math.min(W,H)*0.035}px Arial,sans-serif`;
    ctx.fillText(g.desc, W/2, H*0.72);
  }

  private _drawResult(W: number, H: number): void {
    const ctx = this._ctx;
    ctx.fillStyle="rgba(0,0,0,0.65)"; ctx.fillRect(0,0,W,H);
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle="#ffcc00"; ctx.font=`bold ${Math.min(W,H)*0.07}px Arial Black,Arial,sans-serif`;
    // Word-wrap if needed
    const words = this._resultMsg.split(" ");
    let line = "", lines: string[] = [];
    for (const w of words) {
      const test = line ? line+" "+w : w;
      if (ctx.measureText(test).width > W*0.85) { lines.push(line); line = w; } else { line = test; }
    }
    lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, W/2, H*0.42 + i * Math.min(W,H)*0.09));
    ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.font=`${Math.min(W,H)*0.035}px Arial,sans-serif`;
    ctx.fillText("Returning to lobby...", W/2, H*0.65);
  }

  private _drawBackBtn(_W: number, _H: number): void {
    const ctx = this._ctx;
    ctx.fillStyle="rgba(0,0,0,0.7)"; ctx.beginPath(); ctx.roundRect(10,10,110,36,8); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(10,10,110,36,8); ctx.stroke();
    ctx.fillStyle="#fff"; ctx.font="bold 13px Arial,sans-serif";
    ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText("← Back", 24, 28);
  }

  private _drawJoystick(W: number, H: number): void {
    if (this._state !== "playing") return;
    const ctx = this._ctx;
    const jx = 80, jy = H - 90, jr = 45;
    ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.arc(jx,jy,jr,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(jx,jy,jr,0,Math.PI*2); ctx.stroke();
    const kx=jx+this._joy.dx*jr*0.7, ky=jy+this._joy.dy*jr*0.7;
    ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.arc(kx,ky,22,0,Math.PI*2); ctx.fill();

    if (this._gameId === "lava") {
      const bx=W-80, by=H-90;
      ctx.fillStyle="rgba(255,200,0,0.3)"; ctx.beginPath(); ctx.arc(bx,by,40,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 14px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("JUMP", bx, by);
    } else {
      // Action button
      const bx=W-80, by=H-90;
      const inOwnBase = this._gameId==="steal" && this._sbBases.length > 0 && this._sbPointInBase(this._ents[0].x, this._ents[0].y, this._sbBases[0]);
      const label = inOwnBase ? "LOCK" : "E";
      ctx.fillStyle="rgba(255,200,0,0.3)"; ctx.beginPath(); ctx.arc(bx,by,40,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(255,200,0,0.6)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(bx,by,40,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle="#fff"; ctx.font="bold 14px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(label, bx, by);
    }
  }

  // ── End ───────────────────────────────────────────────────────────────

  private _end(): void {
    this._3dGame?.dispose();
    this._3dGame  = null;
    this._in3dGame = false;
    this._done = true;
    cancelAnimationFrame(this._raf);
    this._cleanup.forEach(fn => fn());
    this._g.inMiniGame        = false;
    this._g.autoClickCallback = null;
    this._g.showAutoClickerUI();
    this._g.goArcade();
  }
}
