export const CLOCK_COLORS = [
  "#FF6B6B","#FF8E53","#FFC300","#6BCB77",
  "#4D96FF","#845EC2","#FF9671","#F9F871",
  "#00C9A7","#C34B4B","#926AA6","#D65DB1",
];

// position 0 = 12 o'clock, position 1 = 1 o'clock, etc.
export function positionToNumber(pos: number): number {
  return pos === 0 ? 12 : pos;
}
export function numberToPosition(n: number): number {
  return n === 12 ? 0 : n;
}
export function colorForNumber(n: number): string {
  return CLOCK_COLORS[numberToPosition(n)];
}
