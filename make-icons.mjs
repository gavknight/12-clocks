// Generates icon-192.png and icon-512.png using only Node built-ins (no npm packages)
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function uint32BE(n) {
  const b = Buffer.allocUnsafe(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = uint32BE(data.length);
  const crc = uint32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function makePNG(size) {
  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  // Grayed-out clock + huge "1" (update countdown) + party confetti corner badge
  const rows = [];
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const bg = { R: 0x14, G: 0x14, B: 0x14 };

  // Party confetti dots (top-right corner)
  const confetti = [
    { x: 0.72, y: 0.14, r: 0.045, R: 0xff, G: 0x55, B: 0x55 },
    { x: 0.84, y: 0.10, r: 0.035, R: 0x55, G: 0xdd, B: 0xff },
    { x: 0.90, y: 0.20, r: 0.04,  R: 0xff, G: 0xd7, B: 0x00 },
    { x: 0.80, y: 0.22, r: 0.03,  R: 0x55, G: 0xff, B: 0x99 },
    { x: 0.94, y: 0.09, r: 0.025, R: 0xff, G: 0x99, B: 0xee },
  ];

  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 3);
    row[0] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let R = bg.R, G = bg.G, B = bg.B;

      // Gray clock ring
      if (dist > r - size * 0.03 && dist < r + size * 0.03) {
        R = 0x66; G = 0x66; B = 0x66;
      }

      // Gray hour hand (12 o'clock, pointing up)
      if (Math.abs(dx) < size * 0.025 && dy < 0 && dy > -r * 0.55) {
        R = G = B = 0x99;
      }

      // Gray minute hand (3 o'clock, pointing right)
      if (Math.abs(dy) < size * 0.018 && dx > 0 && dx < r * 0.7) {
        R = G = B = 0x99;
      }

      // Gray center dot
      if (dist < size * 0.04) {
        R = 0x88; G = 0x88; B = 0x88;
      }

      // Clip to circle (outside = bg)
      if (dist > size * 0.49) { R = bg.R; G = bg.G; B = bg.B; }

      // Huge "1" (vertical bar + small serif foot) dead center over everything
      const barW = size * 0.09, barTop = size * 0.22, barBot = size * 0.74;
      const footW = size * 0.20, footH = size * 0.07;
      const inBar  = Math.abs(dx) < barW / 2 && y > barTop && y < barBot;
      const inFoot = Math.abs(dx) < footW / 2 && y > barBot - footH && y < barBot;
      if (inBar || inFoot) { R = G = B = 255; }

      // Party confetti corner badge
      for (const c of confetti) {
        const ddx = x - c.x * size, ddy = y - c.y * size;
        if (ddx * ddx + ddy * ddy < (c.r * size) * (c.r * size)) {
          R = c.R; G = c.G; B = c.B;
        }
      }

      const i = 1 + x * 3;
      row[i] = R; row[i + 1] = G; row[i + 2] = B;
    }
    rows.push(row);
  }

  const raw = deflateSync(Buffer.concat(rows), { level: 6 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", raw),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icon-192.png", makePNG(192));
writeFileSync("public/icon-512.png", makePNG(512));
console.log("✅ Icons created: public/icon-192.png + public/icon-512.png");
