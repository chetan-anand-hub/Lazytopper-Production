// TOPIC-FIX-1 §2.1 - checks the FROZEN chapter-detection eval set (items.json) against the served bank.
// Run from lazytopper/:  node --import tsx server/eval/golden/topicdetect/buildItems.mts
// The set was picked once, deterministically, from SERVED OFFICIAL bank rows with a known topicKey (typed stems,
// AI-generated ids and figure stems excluded). The baselines in results/ were measured on exactly these ids, so the
// set is not regenerated; this script only proves every item still matches its bank row (id, chapter, stem).
import { readFileSync } from "node:fs";
import { canonicalQuestionBank } from "../../../../src/data/canonicalQuestionBank";

const set = JSON.parse(readFileSync(new URL("./items.json", import.meta.url), "utf8")) as {
  items: Array<{ id: string; topicKey: string; text: string }>;
};
const byId = new Map((canonicalQuestionBank as any[]).map((r) => [r.id, r]));
const drift = set.items.filter((i) => {
  const row = byId.get(i.id);
  return !row || row.topicKey !== i.topicKey || row.questionText !== i.text;
});
console.log(JSON.stringify({ total: set.items.length, drift: drift.map((d) => d.id) }));
if (drift.length) process.exitCode = 1;
