/**
 * Windows often hits EPERM when Next tries to mkdir `.next/types` while an old
 * `.next` tree is locked (dev server, antivirus, Explorer preview, etc.).
 * Tries: delete `.next` → rename to `.next-stale-<time>` (often works when rm fails).
 * Skip entirely with SKIP_CLEAN_NEXT=1.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

if (process.env.SKIP_CLEAN_NEXT === "1") {
  process.exit(0);
}

if (process.platform !== "win32") {
  process.exit(0);
}

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

const attempts = 6;
for (let i = 0; i < attempts; i++) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[clean-next-if-win] Removed .next for a fresh build.");
    process.exit(0);
  } catch {
    if (i === attempts - 1) break;
    await sleep(300 * (i + 1));
  }
}

const stale = path.join(
  root,
  `.next-stale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);
try {
  fs.renameSync(nextDir, stale);
  console.log(
    "[clean-next-if-win] Renamed locked .next to",
    path.basename(stale),
    "(safe to delete that folder later)."
  );
  process.exit(0);
} catch (renameErr) {
  const msg =
    renameErr && typeof renameErr === "object"
      ? renameErr.message
      : String(renameErr);
  console.log(
    "[clean-next-if-win] Could not remove or rename .next:",
    msg.trim()
  );
  console.log(
    "[clean-next-if-win] Continuing — `next build` often still succeeds. If you see EPERM on .next\\types, stop `npm run dev`, close Explorer inside .next, then run `npm run build:fresh` or:"
  );
  console.log(
    "    Remove NEXT_DIST_DIR from .env.local if set, then npm run build (uses TEMP on Windows)."
  );
  console.log(
    "    Or: $env:NEXT_DIST_IN_PROJECT=\"1\"; npm run build  (force .next in repo — may EPERM)"
  );
  process.exit(0);
}
