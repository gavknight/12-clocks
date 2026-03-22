export interface LevelTheme {
  name:     string;
  emoji:    string;
  bgTop:    string;  // room wall gradient top
  bgMid:    string;  // room wall gradient mid
  bgBot:    string;  // room wall gradient bottom
  ceiling:  string;
  floorTop: string;
  floorBot: string;
  rug1:     string;  // rug gradient inner
  rug2:     string;  // rug gradient outer
  shelf1:   string;  // shelf top
  shelf2:   string;  // shelf bottom / bracket
  accent:   string;  // clock border + HUD highlight color
}

export const LEVELS: LevelTheme[] = [
  // 1 – Bedroom
  { name:"Bedroom",        emoji:"🛏️",  bgTop:"#1a0850", bgMid:"#2a1470", bgBot:"#3a1e10", ceiling:"#120640", floorTop:"#2e1a08", floorBot:"#1e1004", rug1:"#6a2080", rug2:"#3a1060", shelf1:"#8B5E3C", shelf2:"#6B3E1C", accent:"rgba(255,200,0,0.8)" },
  // 2 – Kitchen
  { name:"Kitchen",        emoji:"🍳",  bgTop:"#3d1a00", bgMid:"#5c2800", bgBot:"#7a3a00", ceiling:"#2a1000", floorTop:"#8B6914", floorBot:"#6b4f0e", rug1:"#c87020", rug2:"#8B4500", shelf1:"#c8a060", shelf2:"#a07840", accent:"rgba(255,160,0,0.8)" },
  // 3 – Living Room
  { name:"Living Room",    emoji:"🛋️",  bgTop:"#2a1a0e", bgMid:"#3d2a1a", bgBot:"#4a3020", ceiling:"#1a0e06", floorTop:"#6B4423", floorBot:"#4a2e16", rug1:"#8B6040", rug2:"#6a4428", shelf1:"#a07850", shelf2:"#7a5830", accent:"rgba(255,180,80,0.8)" },
  // 4 – Garden
  { name:"Garden",         emoji:"🌷",  bgTop:"#0a2010", bgMid:"#142e18", bgBot:"#1e3e20", ceiling:"#061408", floorTop:"#2a5c1a", floorBot:"#1e4010", rug1:"#4a9030", rug2:"#2a6010", shelf1:"#7a5c30", shelf2:"#5a4020", accent:"rgba(100,220,80,0.8)" },
  // 5 – Jungle
  { name:"Jungle",         emoji:"🌿",  bgTop:"#021008", bgMid:"#061a0c", bgBot:"#0a2410", ceiling:"#010806", floorTop:"#1a4010", floorBot:"#0e2c08", rug1:"#2a6020", rug2:"#1a3e10", shelf1:"#5a4020", shelf2:"#3a2a14", accent:"rgba(60,200,60,0.8)" },
  // 6 – Ocean
  { name:"Ocean",          emoji:"🌊",  bgTop:"#001428", bgMid:"#001e3c", bgBot:"#002850", ceiling:"#000e1c", floorTop:"#003060", floorBot:"#001e40", rug1:"#005080", rug2:"#003060", shelf1:"#4a7890", shelf2:"#2a5870", accent:"rgba(0,180,220,0.8)" },
  // 7 – Space
  { name:"Space",          emoji:"🚀",  bgTop:"#000008", bgMid:"#000418", bgBot:"#000820", ceiling:"#000004", floorTop:"#080818", floorBot:"#040410", rug1:"#101040", rug2:"#080828", shelf1:"#202040", shelf2:"#181828", accent:"rgba(100,100,255,0.9)" },
  // 8 – Castle
  { name:"Castle",         emoji:"🏰",  bgTop:"#1a1a1a", bgMid:"#242424", bgBot:"#2e2e2e", ceiling:"#101010", floorTop:"#3a3a3a", floorBot:"#282828", rug1:"#505050", rug2:"#383838", shelf1:"#606060", shelf2:"#484848", accent:"rgba(200,180,100,0.8)" },
  // 9 – Cave
  { name:"Cave",           emoji:"🪨",  bgTop:"#150c06", bgMid:"#1e1208", bgBot:"#28180c", ceiling:"#0c0804", floorTop:"#3a2010", floorBot:"#281408", rug1:"#4a2c18", rug2:"#30180c", shelf1:"#5a3a24", shelf2:"#3a2414", accent:"rgba(180,120,40,0.8)" },
  // 10 – Desert
  { name:"Desert",         emoji:"🏜️",  bgTop:"#3d2800", bgMid:"#5c3c00", bgBot:"#7a5000", ceiling:"#2a1a00", floorTop:"#c89040", floorBot:"#a07030", rug1:"#e0a050", rug2:"#b07830", shelf1:"#d4a060", shelf2:"#a87840", accent:"rgba(255,200,60,0.8)" },
  // 11 – Snow
  { name:"Snow",           emoji:"❄️",  bgTop:"#c0d8f0", bgMid:"#a8c8e8", bgBot:"#90b8e0", ceiling:"#d8ecfc", floorTop:"#e8f4fc", floorBot:"#d0e8f8", rug1:"#b0d0f0", rug2:"#90b8e0", shelf1:"#a0b8d0", shelf2:"#809ab0", accent:"rgba(100,180,255,0.9)" },
  // 12 – Haunted House
  { name:"Haunted House",  emoji:"👻",  bgTop:"#020e04", bgMid:"#041408", bgBot:"#081c0e", ceiling:"#010802", floorTop:"#0c1e08", floorBot:"#080e04", rug1:"#104010", rug2:"#082808", shelf1:"#283820", shelf2:"#182410", accent:"rgba(80,220,80,0.8)" },
  // 13 – School
  { name:"School",         emoji:"🏫",  bgTop:"#1a2a4a", bgMid:"#243460", bgBot:"#2e3e70", ceiling:"#101e38", floorTop:"#c8a060", floorBot:"#a07840", rug1:"#4060a0", rug2:"#2a4080", shelf1:"#c0a870", shelf2:"#a08850", accent:"rgba(200,220,255,0.9)" },
  // 14 – Library
  { name:"Library",        emoji:"📚",  bgTop:"#1e0808", bgMid:"#2e1010", bgBot:"#3e1818", ceiling:"#140404", floorTop:"#5a2c10", floorBot:"#3c1c0a", rug1:"#6a1818", rug2:"#4a1010", shelf1:"#8B4020", shelf2:"#6a3018", accent:"rgba(220,160,60,0.8)" },
  // 15 – Museum
  { name:"Museum",         emoji:"🏛️",  bgTop:"#181c20", bgMid:"#20262c", bgBot:"#282e36", ceiling:"#101418", floorTop:"#c0b8a8", floorBot:"#a09888", rug1:"#808898", rug2:"#606878", shelf1:"#a0a8b0", shelf2:"#808890", accent:"rgba(200,200,220,0.9)" },
  // 16 – Carnival
  { name:"Carnival",       emoji:"🎡",  bgTop:"#3d0028", bgMid:"#5c0040", bgBot:"#7a0058", ceiling:"#2a001c", floorTop:"#b80060", floorBot:"#900048", rug1:"#e00080", rug2:"#a80060", shelf1:"#e0a000", shelf2:"#b87800", accent:"rgba(255,220,0,0.9)" },
  // 17 – Pirate Ship
  { name:"Pirate Ship",    emoji:"🏴‍☠️", bgTop:"#001428", bgMid:"#0a1c30", bgBot:"#142438", ceiling:"#000e1c", floorTop:"#5a3818", floorBot:"#3c2410", rug1:"#2a4860", rug2:"#1a3048", shelf1:"#7a5030", shelf2:"#5a3820", accent:"rgba(200,180,100,0.8)" },
  // 18 – Treehouse
  { name:"Treehouse",      emoji:"🌳",  bgTop:"#142008", bgMid:"#1e3010", bgBot:"#283e18", ceiling:"#0c1804", floorTop:"#6a4820", floorBot:"#4c3014", rug1:"#3a6820", rug2:"#284810", shelf1:"#7a5028", shelf2:"#5a3818", accent:"rgba(120,220,60,0.8)" },
  // 19 – Underwater
  { name:"Underwater",     emoji:"🐠",  bgTop:"#001820", bgMid:"#002030", bgBot:"#002840", ceiling:"#001018", floorTop:"#003848", floorBot:"#002030", rug1:"#006080", rug2:"#004060", shelf1:"#408090", shelf2:"#286070", accent:"rgba(0,220,180,0.8)" },
  // 20 – Volcano
  { name:"Volcano",        emoji:"🌋",  bgTop:"#1e0400", bgMid:"#2e0800", bgBot:"#3e0c00", ceiling:"#140200", floorTop:"#2a0c00", floorBot:"#1a0800", rug1:"#6a1000", rug2:"#4a0800", shelf1:"#3a3030", shelf2:"#2a2020", accent:"rgba(255,80,0,0.9)" },
  // 21 – Cloud Kingdom
  { name:"Cloud Kingdom",  emoji:"☁️",  bgTop:"#6090d0", bgMid:"#80aae0", bgBot:"#a0c4f0", ceiling:"#d0e8fc", floorTop:"#f0f8ff", floorBot:"#e0f0fc", rug1:"#c0d8f8", rug2:"#a0c0f0", shelf1:"#d0d8e8", shelf2:"#b0b8c8", accent:"rgba(255,255,255,0.9)" },
  // 22 – Robot Factory
  { name:"Robot Factory",  emoji:"🤖",  bgTop:"#0c1414", bgMid:"#141e1e", bgBot:"#1c2828", ceiling:"#080e0e", floorTop:"#303838", floorBot:"#202828", rug1:"#004848", rug2:"#003030", shelf1:"#505858", shelf2:"#383e3e", accent:"rgba(0,220,200,0.9)" },
  // 23 – Candy Land
  { name:"Candy Land",     emoji:"🍭",  bgTop:"#3d0030", bgMid:"#5c0048", bgBot:"#7a0060", ceiling:"#2a001e", floorTop:"#f080c0", floorBot:"#d060a0", rug1:"#ff80d0", rug2:"#e060b0", shelf1:"#60d0a0", shelf2:"#40b080", accent:"rgba(255,100,200,0.9)" },
  // 24 – Dinosaur World
  { name:"Dino World",     emoji:"🦕",  bgTop:"#1c1e08", bgMid:"#282e0c", bgBot:"#343e12", ceiling:"#141600", floorTop:"#5a5c20", floorBot:"#3c3e14", rug1:"#606818", rug2:"#484e10", shelf1:"#7a6830", shelf2:"#5a5020", accent:"rgba(160,200,60,0.8)" },
  // 25 – Ninja Dojo
  { name:"Ninja Dojo",     emoji:"🥷",  bgTop:"#080004", bgMid:"#100008", bgBot:"#180010", ceiling:"#040002", floorTop:"#200010", floorBot:"#180008", rug1:"#600010", rug2:"#400008", shelf1:"#282020", shelf2:"#181010", accent:"rgba(220,0,40,0.9)" },
  // 26 – Wizard Tower
  { name:"Wizard Tower",   emoji:"🧙",  bgTop:"#100028", bgMid:"#1a0040", bgBot:"#240058", ceiling:"#0a0018", floorTop:"#180034", floorBot:"#100020", rug1:"#300060", rug2:"#200040", shelf1:"#3a2060", shelf2:"#2a1040", accent:"rgba(200,160,0,0.9)" },
  // 27 – Time Machine
  { name:"Time Machine",   emoji:"⏳",  bgTop:"#2a1e08", bgMid:"#3a2c10", bgBot:"#4a3818", ceiling:"#1c1406", floorTop:"#907040", floorBot:"#705030", rug1:"#c0a060", rug2:"#908040", shelf1:"#a09080", shelf2:"#807060", accent:"rgba(200,180,120,0.9)" },
  // 28 – Secret Lab
  { name:"Secret Lab",     emoji:"🧪",  bgTop:"#001408", bgMid:"#001c0c", bgBot:"#002410", ceiling:"#000c06", floorTop:"#001c08", floorBot:"#001004", rug1:"#004010", rug2:"#002808", shelf1:"#183020", shelf2:"#102018", accent:"rgba(0,255,100,0.9)" },
];

export const LEVEL_COUNT = LEVELS.length; // 28

/** Cost in coins to unlock level n (1-based). Level 1 is always free. */
export function unlockCost(n: number): number {
  return (n - 1) * 100;
}
