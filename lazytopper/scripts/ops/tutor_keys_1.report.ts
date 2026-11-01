import { promises as fs } from "node:fs";
import { analyse } from "./tutor_keys_1.entry";
const v = analyse();
const by: Record<string, number> = {};
for (const x of v as any[]) { const k = x.status + (x.why ? ":" + x.why : ""); by[k] = (by[k] || 0) + 1; }
console.log(by);
await fs.mkdir(".project_memory/ops/out", { recursive: true });
await fs.writeFile(".project_memory/ops/out/tutor_keys_1.analysis.json", JSON.stringify(v));
