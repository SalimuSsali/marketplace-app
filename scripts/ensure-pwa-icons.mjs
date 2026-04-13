/**
 * Ensures raster PWA icons exist under `public/` (required by manifest + layout metadata).
 * Uses pngjs on all platforms so Vercel/Linux builds succeed without PowerShell.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");

/** Brand emerald-600 #0d9488 */
const R = 13;
const G = 148;
const B = 136;

const required = [
  "icon-192.png",
  "icon-512.png",
  "favicon.png",
  "apple-touch-icon.png",
];

function missing() {
  return required.filter((f) => !fs.existsSync(path.join(pub, f)));
}

function writeSolidPng(filepath, size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = R;
      png.data[idx + 1] = G;
      png.data[idx + 2] = B;
      png.data[idx + 3] = 255;
    }
  }
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, PNG.sync.write(png));
}

function generateAll() {
  writeSolidPng(path.join(pub, "icon-192.png"), 192);
  writeSolidPng(path.join(pub, "icon-512.png"), 512);
  fs.copyFileSync(path.join(pub, "icon-192.png"), path.join(pub, "favicon.png"));
  fs.copyFileSync(
    path.join(pub, "icon-192.png"),
    path.join(pub, "apple-touch-icon.png"),
  );
}

const m = missing();
if (m.length === 0) {
  process.exit(0);
}

console.warn(`[pwa] Missing icon files: ${m.join(", ")} — generating via pngjs…`);

try {
  generateAll();
  console.warn("[pwa] Wrote PNG icons under public/.");
} catch (e) {
  console.error("[pwa] Failed to generate icons:", e?.message || e);
  process.exit(1);
}

process.exit(0);
