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

const SOURCE_ICON = path.join(pub, "app-icon.png");

const required = [
  "app-icon.png",
  "icon-192.png",
  "icon-512.png",
  "favicon.ico",
  "favicon.png",
  "apple-touch-icon.png",
];

function missing() {
  return required.filter((f) => !fs.existsSync(path.join(pub, f)));
}

function readPng(filepath) {
  const buf = fs.readFileSync(filepath);
  return PNG.sync.read(buf);
}

function writePng(filepath, png) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, PNG.sync.write(png));
}

/**
 * Write a minimal ICO file that embeds a PNG image.
 * Modern browsers accept PNG-compressed entries inside .ico containers.
 * @param {string} filepath
 * @param {Buffer} pngBuf
 * @param {number} size
 */
function writeIcoFromPng(filepath, pngBuf, size) {
  const headerSize = 6;
  const entrySize = 16;
  const imageOffset = headerSize + entrySize;

  const out = Buffer.alloc(imageOffset + pngBuf.length);
  // ICONDIR
  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // type = icon
  out.writeUInt16LE(1, 4); // count
  // ICONDIRENTRY (1 entry)
  out.writeUInt8(size === 256 ? 0 : size, 6); // width (0 means 256)
  out.writeUInt8(size === 256 ? 0 : size, 7); // height
  out.writeUInt8(0, 8); // color count
  out.writeUInt8(0, 9); // reserved
  out.writeUInt16LE(1, 10); // planes
  out.writeUInt16LE(32, 12); // bitcount
  out.writeUInt32LE(pngBuf.length, 14); // bytes in resource
  out.writeUInt32LE(imageOffset, 18); // image offset

  pngBuf.copy(out, imageOffset);
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, out);
}

/** Nearest-neighbor resize (fast, dependency-free). */
function resizePngNearest(src, size) {
  const out = new PNG({ width: size, height: size });
  const sx = src.width / size;
  const sy = src.height / size;
  for (let y = 0; y < size; y++) {
    const srcY = Math.min(src.height - 1, Math.floor(y * sy));
    for (let x = 0; x < size; x++) {
      const srcX = Math.min(src.width - 1, Math.floor(x * sx));
      const sIdx = (src.width * srcY + srcX) << 2;
      const dIdx = (size * y + x) << 2;
      out.data[dIdx] = src.data[sIdx];
      out.data[dIdx + 1] = src.data[sIdx + 1];
      out.data[dIdx + 2] = src.data[sIdx + 2];
      out.data[dIdx + 3] = src.data[sIdx + 3];
    }
  }
  return out;
}

function generateAll() {
  const src = readPng(SOURCE_ICON);
  writePng(path.join(pub, "icon-192.png"), resizePngNearest(src, 192));
  writePng(path.join(pub, "icon-512.png"), resizePngNearest(src, 512));
  const fav64 = resizePngNearest(src, 64);
  const fav64Buf = PNG.sync.write(fav64);
  fs.writeFileSync(path.join(pub, "favicon.png"), fav64Buf);
  writeIcoFromPng(path.join(pub, "favicon.ico"), fav64Buf, 64);
  writePng(path.join(pub, "apple-touch-icon.png"), resizePngNearest(src, 180));
}

const m = missing();
if (m.length === 0) {
  process.exit(0);
}

console.warn(`[pwa] Missing icon files: ${m.join(", ")} — generating via pngjs…`);

try {
  if (!fs.existsSync(SOURCE_ICON)) {
    throw new Error(
      "Missing public/app-icon.png. Place your app icon at public/app-icon.png and re-run.",
    );
  }
  generateAll();
  console.warn("[pwa] Wrote PNG icons under public/.");
} catch (e) {
  console.error("[pwa] Failed to generate icons:", e?.message || e);
  process.exit(1);
}

process.exit(0);
