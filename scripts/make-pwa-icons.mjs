import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const outDir = new URL('../docs/icons/', import.meta.url);
const sizes = [
  ['icon-192.png', 192],
  ['apple-touch-icon.png', 180],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
];
const crcTable = makeCrcTable();

await mkdir(outDir, { recursive: true });

for (const [name, size] of sizes) {
  const bytes = makeIcon(size);
  await writeFile(new URL(name, outDir), bytes);
}

console.log(`Generated ${sizes.length} PWA icons.`);

function makeIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const colors = {
    bg: [15, 118, 110, 255],
    panel: [246, 247, 244, 255],
    ink: [23, 32, 27, 255],
    amber: [196, 122, 32, 255],
  };

  fillRect(pixels, size, 0, 0, size, size, colors.bg);
  fillCircle(pixels, size, size * 0.82, size * 0.18, size * 0.18, [255, 255, 255, 42]);
  fillCircle(pixels, size, size * 0.18, size * 0.84, size * 0.26, [0, 0, 0, 24]);
  fillRoundedRect(pixels, size, size * 0.14, size * 0.2, size * 0.72, size * 0.6, size * 0.08, colors.panel);

  const t = size * 0.045;
  drawP(pixels, size, size * 0.21, size * 0.31, size * 0.18, size * 0.38, t, colors.ink);
  drawDigit(pixels, size, 4, size * 0.42, size * 0.31, size * 0.16, size * 0.38, t, colors.ink);
  drawDigit(pixels, size, 5, size * 0.61, size * 0.31, size * 0.16, size * 0.38, t, colors.ink);

  fillRect(pixels, size, size * 0.22, size * 0.73, size * 0.56, size * 0.035, colors.amber);
  return encodePng(size, size, pixels);
}

function drawP(pixels, size, x, y, w, h, t, color) {
  fillRect(pixels, size, x, y, t, h, color);
  fillRect(pixels, size, x, y, w, t, color);
  fillRect(pixels, size, x, y + h * 0.42, w, t, color);
  fillRect(pixels, size, x + w - t, y, t, h * 0.47, color);
}

function drawDigit(pixels, size, digit, x, y, w, h, t, color) {
  const segments = {
    4: ['b', 'c', 'f', 'g'],
    5: ['a', 'c', 'd', 'f', 'g'],
  }[digit];

  const coords = {
    a: [x, y, w, t],
    b: [x + w - t, y, t, h * 0.5],
    c: [x + w - t, y + h * 0.5, t, h * 0.5],
    d: [x, y + h - t, w, t],
    e: [x, y + h * 0.5, t, h * 0.5],
    f: [x, y, t, h * 0.5],
    g: [x, y + h * 0.48, w, t],
  };

  segments.forEach((segment) => fillRect(pixels, size, ...coords[segment], color));
}

function fillRoundedRect(pixels, size, x, y, w, h, radius, color) {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  const x1 = Math.round(x + w);
  const y1 = Math.round(y + h);
  const r = Math.round(radius);

  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      const dx = Math.max(x0 + r - px, 0, px - (x1 - r));
      const dy = Math.max(y0 + r - py, 0, py - (y1 - r));
      if (dx * dx + dy * dy <= r * r) setPixel(pixels, size, px, py, color);
    }
  }
}

function fillCircle(pixels, size, cx, cy, radius, color) {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(size, Math.ceil(cx + radius));
  const y1 = Math.min(size, Math.ceil(cy + radius));
  const radiusSq = radius * radius;

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radiusSq) setPixel(pixels, size, x, y, color);
    }
  }
}

function fillRect(pixels, size, x, y, w, h, color) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(size, Math.round(x + w));
  const y1 = Math.min(size, Math.round(y + h));

  for (let py = y0; py < y1; py += 1) {
    for (let px = x0; px < x1; px += 1) {
      setPixel(pixels, size, px, py, color);
    }
  }
}

function setPixel(pixels, size, x, y, color) {
  const index = (y * size + x) * 4;
  pixels[index] = color[0];
  pixels[index + 1] = color[1];
  pixels[index + 2] = color[2];
  pixels[index + 3] = color[3];
}

function encodePng(width, height, pixels) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    scanlines[rowStart] = 0;
    pixels.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk('IDAT', deflateSync(scanlines)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type);
  return Buffer.concat([uint32(data.length), typeBytes, data, uint32(crc32(Buffer.concat([typeBytes, data])))]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    return crc >>> 0;
  });
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
