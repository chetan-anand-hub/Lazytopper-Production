import { execSync } from "child_process";

const INTERVAL_MS = 1500;

function runOnce() {
  try {
    execSync("node scripts/trackerAll.mjs", { stdio: "inherit" });
  } catch (e) {
    // keep watcher alive even if a single run fails
    console.error("trackerWatch: trackerAll failed (will retry):", e?.message || e);
  }
}

runOnce();
setInterval(runOnce, INTERVAL_MS);
console.log(`trackerWatch: running every ${INTERVAL_MS}ms`);
