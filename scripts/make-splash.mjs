/**
 * Draws assets/splash-mark.png: the "spark bars" mark (src/ui/Logo.tsx geometry, viewBox 40) in white and light
 * indigo on a transparent background, for the indigo native splash screen. Node only (zlib), no image library.
 *
 * Usage: node scripts/make-splash.mjs
 */
import { Buffer } from "node:buffer";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const SIZE = 1024;
const SCALE = SIZE / 40;
const SS = 4; // supersampling per axis, for smooth edges

const WHITE = [255, 255, 255];
const LIGHT = [199, 210, 254]; // indigo-200: the accent on dark
const shapes = [
  { kind: "rect", x: 6, y: 23, w: 7, h: 11, r: 3.5, color: WHITE },
  { kind: "rect", x: 15.5, y: 17, w: 7, h: 17, r: 3.5, color: WHITE },
  { kind: "rect", x: 25, y: 15, w: 7, h: 19, r: 3.5, color: LIGHT },
  { kind: "circle", cx: 28.5, cy: 7.5, r: 3.6, color: LIGHT },
];

function inside(s, x, y) {
  if (s.kind === "circle") return (x - s.cx) ** 2 + (y - s.cy) ** 2 <= s.r ** 2;
  if (x < s.x || x > s.x + s.w || y < s.y || y > s.y + s.h) return false;
  // Rounded corners: outside the inner rectangle, check the corner circle.
  const cx = Math.min(Math.max(x, s.x + s.r), s.x + s.w - s.r);
  const cy = Math.min(Math.max(y, s.y + s.r), s.y + s.h - s.r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= s.r ** 2;
}

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let py = 0; py < SIZE; py++) {
  raw[py * (SIZE * 4 + 1)] = 0; // filter: none
  for (let px = 0; px < SIZE; px++) {
    let hits = 0;
    const sum = [0, 0, 0];
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + 0.5) / SS) / SCALE;
        const y = (py + (sy + 0.5) / SS) / SCALE;
        const s = shapes.find((sh) => inside(sh, x, y));
        if (s) {
          hits++;
          sum[0] += s.color[0];
          sum[1] += s.color[1];
          sum[2] += s.color[2];
        }
      }
    }
    const o = py * (SIZE * 4 + 1) + 1 + px * 4;
    if (hits) {
      raw[o] = Math.round(sum[0] / hits);
      raw[o + 1] = Math.round(sum[1] / hits);
      raw[o + 2] = Math.round(sum[2] / hits);
      raw[o + 3] = Math.round((hits / (SS * SS)) * 255);
    }
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA

const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "splash-mark.png");
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
