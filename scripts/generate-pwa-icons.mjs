import { mkdirSync, createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const outDir = resolve(process.cwd(), 'public/icons');
mkdirSync(outDir, { recursive: true });

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function writePng(size, fileName) {
  const png = new PNG({ width: size, height: size });
  const c0 = hexToRgb('#0b3a57');
  const c1 = hexToRgb('#34aa9e');

  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size * 0.238;
  const innerRadius = size * 0.076;
  const ringThickness = size * 0.06;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (size * y + x) << 2;
      const t = (x + y) / (2 * (size - 1));

      let r = lerp(c0.r, c1.r, t);
      let g = lerp(c0.g, c1.g, t);
      let b = lerp(c0.b, c1.b, t);

      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.hypot(dx, dy);

      if (dist <= outerRadius) {
        r = 240;
        g = 249;
        b = 255;
      }

      const isRing = dist <= outerRadius && dist >= outerRadius - ringThickness;
      if (isRing) {
        r = 186;
        g = 227;
        b = 239;
      }

      if (Math.abs(dx) < innerRadius || Math.abs(dy) < innerRadius) {
        if (dist < outerRadius - ringThickness * 1.15) {
          r = 11;
          g = 58;
          b = 87;
        }
      }

      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  const filePath = resolve(outDir, fileName);
  const stream = createWriteStream(filePath);
  png.pack().pipe(stream);

  return new Promise((resolvePromise, rejectPromise) => {
    stream.on('finish', resolvePromise);
    stream.on('error', rejectPromise);
  });
}

await writePng(192, 'icon-192.png');
await writePng(512, 'icon-512.png');
await writePng(180, 'apple-touch-icon.png');
