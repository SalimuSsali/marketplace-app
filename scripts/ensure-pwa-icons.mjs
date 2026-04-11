/**
 * Ensures raster PWA icons exist under `public/`.
 * If PNGs are missing, generates them on Windows via System.Drawing (no extra npm deps).
 * Other platforms: prints copy instructions (manifest still lists `icon.svg` as a fallback).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");

const required = [
  "icon-192.png",
  "icon-512.png",
  "favicon.png",
  "apple-touch-icon.png",
];

function missing() {
  return required.filter((f) => !fs.existsSync(path.join(pub, f)));
}

function generateWindows() {
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$pub = ${JSON.stringify(pub)}
if (-not (Test-Path -LiteralPath $pub)) { New-Item -ItemType Directory -Path $pub | Out-Null }
foreach ($s in @(192,512)) {
  $bmp = New-Object System.Drawing.Bitmap($s,$s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(13,148,136))
  $bmp.Save((Join-Path $pub "icon-$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
Copy-Item (Join-Path $pub 'icon-192.png') (Join-Path $pub 'favicon.png') -Force
Copy-Item (Join-Path $pub 'icon-192.png') (Join-Path $pub 'apple-touch-icon.png') -Force
`.trim();

  const tmp = path.join(os.tmpdir(), `pwa-icons-${process.pid}.ps1`);
  fs.writeFileSync(tmp, script, "utf8");
  try {
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmp],
      { stdio: "inherit" },
    );
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

const m = missing();
if (m.length === 0) {
  process.exit(0);
}

console.warn(`[pwa] Missing icon files: ${m.join(", ")}`);

if (process.platform === "win32") {
  try {
    generateWindows();
    console.warn("[pwa] Generated PNG icons under public/.");
    process.exit(0);
  } catch (e) {
    console.warn("[pwa] Auto-generate failed:", e?.message || e);
  }
}

console.warn(
  "[pwa] Add public/icon-192.png and public/icon-512.png (PNG). Copy to favicon.png and apple-touch-icon.png, or use public/icon.svg where clients allow SVG.",
);
process.exit(0);
