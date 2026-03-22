// GDSkins.ts — cube and ship skin definitions + localStorage
export interface GDCubeSkin {
  id:     string;
  name:   string;
  emoji:  string;  // drawn on cube in-game (empty = classic geometric look)
  bg:     string;
  border: string;
}

export interface GDShipSkin {
  id:      string;
  name:    string;
  emoji:   string;  // shown in selector
  body:    string;
  accent:  string;
  cockpit: string;
  glow:    string;
}

export const CUBE_SKINS: GDCubeSkin[] = [
  { id: 'default', name: 'Classic', emoji: '',   bg: '#00ccff', border: '#003366' },
  { id: 'robot',   name: 'Robot',   emoji: '🤖', bg: '#8899aa', border: '#334455' },
  { id: 'fire',    name: 'Fire',    emoji: '🔥', bg: '#cc3300', border: '#661100' },
  { id: 'alien',   name: 'Alien',   emoji: '👽', bg: '#00aa44', border: '#003311' },
  { id: 'ghost',   name: 'Ghost',   emoji: '👻', bg: '#ddeeff', border: '#8899bb' },
  { id: 'star',    name: 'Star',    emoji: '⭐', bg: '#ffcc00', border: '#886600' },
  { id: 'skull',   name: 'Skull',   emoji: '💀', bg: '#cccccc', border: '#444444' },
  { id: 'diamond', name: 'Diamond', emoji: '💎', bg: '#88ddff', border: '#0055aa' },
];

export const SHIP_SKINS: GDShipSkin[] = [
  { id: 'default', name: 'Classic', emoji: '🔵', body: '#00ccff', accent: '#0044aa', cockpit: 'rgba(200,240,255,0.7)', glow: 'rgba(255,180,0,1)'   },
  { id: 'blaze',   name: 'Blaze',   emoji: '🔴', body: '#ff4444', accent: '#aa0000', cockpit: 'rgba(255,200,200,0.7)', glow: 'rgba(255,100,0,1)'   },
  { id: 'phantom', name: 'Phantom', emoji: '🟣', body: '#cc44ff', accent: '#660099', cockpit: 'rgba(220,180,255,0.7)', glow: 'rgba(200,0,255,1)'   },
  { id: 'golden',  name: 'Golden',  emoji: '🌟', body: '#ffcc00', accent: '#886600', cockpit: 'rgba(255,255,200,0.7)', glow: 'rgba(255,220,0,1)'   },
  { id: 'viper',   name: 'Viper',   emoji: '🟢', body: '#00ee77', accent: '#005533', cockpit: 'rgba(180,255,220,0.7)', glow: 'rgba(0,255,150,1)'   },
  { id: 'shadow',  name: 'Shadow',  emoji: '⚫', body: '#445566', accent: '#1a2233', cockpit: 'rgba(150,180,220,0.5)', glow: 'rgba(100,150,255,1)' },
];

const CUBE_KEY = 'gd_cube_skin';
const SHIP_KEY = 'gd_ship_skin';

export function getEquippedCubeSkin(): GDCubeSkin {
  const id = localStorage.getItem(CUBE_KEY) ?? 'default';
  return CUBE_SKINS.find(s => s.id === id) ?? CUBE_SKINS[0];
}
export function getEquippedShipSkin(): GDShipSkin {
  const id = localStorage.getItem(SHIP_KEY) ?? 'default';
  return SHIP_SKINS.find(s => s.id === id) ?? SHIP_SKINS[0];
}
export function setEquippedCubeSkin(id: string): void { localStorage.setItem(CUBE_KEY, id); }
export function setEquippedShipSkin(id: string): void { localStorage.setItem(SHIP_KEY, id); }
