// Build public/favicon.ico from public/favicon.svg.
//
// Browsers take the SVG from <link rel="icon" type="image/svg+xml">; the .ico
// at the fixed path is for crawlers and old clients that request it without
// reading the head (it answered 404 before). Chrome rasterizes the SVG at 16,
// 32, and 48 px and the three images are packed as 32-bit BMP entries with
// AND masks, the form every ICO reader understands (PNG-compressed entries
// are not). Regenerate whenever the SVG changes:
//
//   node scripts/make-favicon.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, withChrome } from './qa/cdp.mjs';

const SIZES = [16, 32, 48];
const svgPath = path.join(ROOT, 'public', 'favicon.svg');
const icoPath = path.join(ROOT, 'public', 'favicon.ico');

// The root gets explicit dimensions so Chrome rasterizes the vector at the
// drawn size instead of letterboxing the 300 by 150 default for an SVG that
// carries only a viewBox.
function rasterExpression(svg) {
  const sized = svg.replace(/<svg\b/, '<svg width="64" height="64"');
  const url = `data:image/svg+xml;base64,${Buffer.from(sized).toString('base64')}`;
  return `(async () => {
    const img = new Image();
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('svg failed to load')); img.src = ${JSON.stringify(url)}; });
    const out = {};
    for (const size of ${JSON.stringify(SIZES)}) {
      const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, size, size);
      out[size] = Array.from(ctx.getImageData(0, 0, size, size).data);
    }
    return JSON.stringify(out);
  })()`;
}

// One 32-bit BMP entry: BITMAPINFOHEADER with the doubled height, the XOR
// bitmap as bottom-up BGRA rows, then the 1-bit AND mask (set = transparent)
// with rows padded to four bytes.
function bmpEntry(size, rgba) {
  const xorStride = size * 4;
  const andStride = ((size + 31) >> 5) << 2;
  const xor = Buffer.alloc(xorStride * size);
  const and = Buffer.alloc(andStride * size);
  for (let y = 0; y < size; y += 1) {
    const row = size - 1 - y;
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const o = row * xorStride + x * 4;
      xor[o] = rgba[i + 2]; xor[o + 1] = rgba[i + 1]; xor[o + 2] = rgba[i]; xor[o + 3] = rgba[i + 3];
      if (rgba[i + 3] === 0) and[row * andStride + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(xor.length + and.length, 20);
  return Buffer.concat([header, xor, and]);
}

function packIco(entries) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  const index = [];
  for (const { size, image } of entries) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.length, 8);
    entry.writeUInt32LE(offset, 12);
    index.push(entry);
    offset += image.length;
  }
  return Buffer.concat([dir, ...index, ...entries.map((e) => e.image)]);
}

const svg = readFileSync(svgPath, 'utf8');
const pixels = await withChrome(async (api) => {
  const page = await api.newPage();
  try {
    await page.load('about:blank', { ready: 'true', settle: 0, readyPolls: 1 });
    return JSON.parse(await page.evaluate(rasterExpression(svg), { awaitPromise: true }));
  } finally {
    await page.close();
  }
});
for (const size of SIZES) if (pixels[size]?.length !== size * size * 4) throw new Error(`raster for ${size} px is incomplete`);
const ico = packIco(SIZES.map((size) => ({ size, image: bmpEntry(size, pixels[size]) })));
writeFileSync(icoPath, ico);
console.log(`wrote ${path.relative(ROOT, icoPath)}: ${ico.length} bytes, sizes ${SIZES.join(', ')} px`);
