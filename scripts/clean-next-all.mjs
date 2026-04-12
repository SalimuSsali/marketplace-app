/**
 * Always remove `.next` (all platforms). Use with `npm run build:fresh` when
 * the default build fails with EPERM / locked `.next`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextDir = path.join(__dirname, "..", ".next");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

if (!fs.existsSync(nextDir)) {
  process.exit(0);
}

const attempts = 6;
for (let i = 0; i < attempts; i++) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("[clean-next-all] Removed .next");
    process.exit(0);
  } catch (err) {
    const msg = err && typeof err === "object" ? err.message : String(err);
    if (i === attempts - 1) {
      console.warn("[clean-next-all] Could not remove .next (may be locked):", msg);
      console.warn("[clean-next-all] Continuing build — on Windows, next.config uses %TEMP% for output.");
      process.exit(0);
    }
    await sleep(300 * (i + 1));
  }
}
