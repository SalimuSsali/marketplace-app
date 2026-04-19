const { execSync } = require("child_process");

function getListeningPids(port) {
  const cmd = `netstat -ano | findstr :${port} | findstr LISTENING`;
  try {
    const out = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString("utf8")
      .trim();
    if (!out) return [];
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
  } catch {
    // ignore
  }
}

const ports = process.argv.slice(2).filter(Boolean);
for (const p of ports) {
  const port = String(p).replace(/[^\d]/g, "");
  if (!port) continue;
  const pids = getListeningPids(port);
  for (const pid of pids) killPid(pid);
}

