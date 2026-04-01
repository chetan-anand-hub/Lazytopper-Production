import http from "http";
import fs from "fs";
import yaml from "yaml";

const PORTS = [4179, 5173, 4173, 3000];
const TRACKER_YAML = "docs/project_memory/implementation/tracker_progress.yml";

function get(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 400;
      res.resume();
      resolve(ok);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function checkPort(port) {
  const base = `http://localhost:${port}`;
  const rootOk = await get(`${base}/`);
  if (!rootOk) return false;
  const jsonOk = await get(`${base}/stage_status.json`);
  return jsonOk ? base : false;
}

(async () => {
  try {
    const src = fs.readFileSync(TRACKER_YAML, "utf8");
    yaml.parse(src);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    console.log(`TRACKER_YAML_INVALID: ${TRACKER_YAML}`);
    console.log("Fix escaping: use single quotes or forward slashes");
    console.log(`Details: ${msg}`);
    process.exit(2);
  }

  for (const port of PORTS) {
    const base = await checkPort(port);
    if (base) {
      console.log(`TRACKER_OK: ${base}/`);
      process.exit(0);
    }
  }
  console.log('TRACKER_NOT_RUNNING: start with "npm run tracker:live" then open "npm run tracker:open"');
  process.exit(1);
})();
