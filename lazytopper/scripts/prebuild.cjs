const { spawnSync } = require("child_process");
const { resolve, join } = require("path");
const { existsSync } = require("fs");

const repoRoot = resolve(__dirname, "..");
const scriptPath = join(repoRoot, "scripts", "clean-windows-metadata.ps1");

if (!existsSync(scriptPath)) {
  console.log("[prebuild] clean-windows-metadata.ps1 is missing; skipping cleanup.");
  process.exit(0);
}

const runPowerShell = (exe) =>
  spawnSync(exe, ["-ExecutionPolicy", "Bypass", "-File", scriptPath], { stdio: "inherit" });

if (process.platform === "win32") {
  const result = runPowerShell("powershell");
  if (result.error) {
    console.error("[prebuild] failed to launch powershell:", result.error.message || result.error);
    process.exit(1);
  }
  process.exit(result.status === null ? 1 : result.status);
}

const result = runPowerShell("pwsh");
if (result.error) {
  console.log("[prebuild] pwsh is not available; skipping Windows metadata cleanup on this platform.");
  process.exit(0);
}

if (result.status !== 0) {
  console.log("[prebuild] pwsh reported non-zero status", result.status, "; cleanup is skipped on this platform.");
}

process.exit(0);
