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

  // Draw a simple clock icon: purple bg + gold circle + white hands
  const rows = [];
  const cx = size / 2, cy = size / 2, r = size * 0.36;

  for (let y = 0; y < size; y++) {
    const row = Buffer.allocUnsafe(1 + size * 3);
    row[0] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let R = 0x1a, G = 0x0a, B = 0x3e; // dark purple bg

      // Blend purple gradient based on distance from center
      const t = Math.min(dist / (size * 0.5), 1);
      R = Math.round(0x6a * (1 - t) + 0x1a * t);
      G = Math.round(0x20 * (1 - t) + 0x0a * t);
      B = Math.round(0xa0 * (1 - t) + 0x3e * t);

      // Gold clock ring
      if (dist > r - size * 0.03 && dist < r + size * 0.03) {
        R = 0xff; G = 0xd7; B = 0x00;
      }

      // White hour hand (12 o'clock, pointing up)
      // Hand: thin rectangle from center going up
      if (Math.abs(dx) < size * 0.025 && dy < 0 && dy > -r * 0.55) {
        R = G = B = 255;
      }

      // White minute hand (3 o'clock, pointing right)
      if (Math.abs(dy) < size * 0.018 && dx > 0 && dx < r * 0.7) {
        R = G = B = 255;
      }

      // Gold center dot
      if (dist < size * 0.04) {
        R = 0xff; G = 0xd7; B = 0x00;
      }

      // Clip to circle (outside = transparent → black for PNG RGB)
      if (dist > size * 0.49) { R = 0x1a; G = 0x0a; B = 0x3e; }

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
