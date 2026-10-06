import { writeFileSync } from "node:fs";
const ROOT = process.env.ROOT!; const OUT = process.env.OUT!;
const S = ROOT + "/lazytopper/src/";
const bank = await import(S + "data/canonicalQuestionBank.ts");
const pm = await import(S + "data/predictedQuestions.ts");
const ps = await import(S + "data/predictedQuestionsScience.ts");
const hpq = await import(S + "data/highlyProbableQuestions.ts");
const pd = await import(S + "data/promptDPracticePacks.ts");
const out = {
  raw: bank.RAW_CANONICAL_QUESTION_BANK,
  withheld: [...bank.WITHHELD_QUESTION_IDS],
  served: bank.canonicalQuestionBank.map((q: any) => q.id),
  servedRows: bank.canonicalQuestionBank,
  predM: pm.predictedQuestions, predS: ps.predictedQuestionsScience,
  hpq: hpq.highlyProbableQuestions, promptD: pd.promptDPracticePacks,
};
writeFileSync(OUT, JSON.stringify(out));
console.log("raw", out.raw.length, "withheld", out.withheld.length, "served", out.served.length);
