import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BsreEvaluator } from '../../src/engine/bsre/evaluator.ts';
import type { Fixture } from '../../src/engine/bsre/types.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixturesPath = path.resolve(
  scriptDir,
  '../../src/data/bsre/triangles_bsre_fixtures_v1.json'
);

type FixturesFile = {
  fixtures: Fixture[];
};

const fixturesFile: FixturesFile = JSON.parse(
  readFileSync(fixturesPath, 'utf8')
);

const evaluator = new BsreEvaluator();
let passCount = 0;
const mismatches: string[] = [];

for (const fixture of fixturesFile.fixtures) {
  const { result } = evaluator.evaluateFixture(fixture);

  const scoreMatch = result.score === fixture.expected.score;
  const stepsMatch = result.stepResults.every((step, index) => {
    const expectedStep = fixture.expected.stepResults.find((s) => s.stepId === step.stepId);
    return expectedStep ? expectedStep.passed === step.passed : false;
  });

  if (scoreMatch && stepsMatch) {
    passCount += 1;
    continue;
  }

  const mismatchDetails = [
    `Fixture ${fixture.id}`,
    `  Expected score: ${fixture.expected.score}, actual: ${result.score}`,
    `  Expected steps: ${fixture.expected.stepResults
      .map((s) => `${s.stepId}=${s.passed}`)
      .join(', ')}`,
    `  Actual steps: ${result.stepResults
      .map((s) => `${s.stepId}=${s.passed}`)
      .join(', ')}`
  ].join('\n');

  mismatches.push(mismatchDetails);
}

console.log(`Fixtures run: ${fixturesFile.fixtures.length}`);
console.log(`Matches: ${passCount} / ${fixturesFile.fixtures.length}`);
if (mismatches.length > 0) {
  console.log('Mismatched fixtures:');
  mismatches.forEach((details) => console.log(details));
  process.exitCode = 1;
} else {
  console.log('All fixtures matched expected evaluations.');
}
