const fs = require("fs");
fs.mkdirSync("artifacts/mockup-sandbox/dist", { recursive: true });
fs.writeFileSync("artifacts/mockup-sandbox/dist/index.html", "ok");
