'use strict';
// graderEval.parity.test.cjs — EVAL-PARITY.
//
// WHY THIS FILE EXISTS: the harness assembled EIGHT numbered rules while the shipped
// structured path assembled SIXTEEN, so every number the harness produced measured a
// DIFFERENT GRADER than the one students meet. A previous drift check verified three
// NAMED clauses and returned CLEAN over that half-missing prompt.
//
// THE DESIGN RULE THAT FOLLOWS FROM THAT: every assertion below compares the harness's
// assembled prompt to a string IMPORTED FROM THE SHIPPED ROUTE, never to a copy typed
// into this file. A test comparing your copy to your copy proves nothing.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { buildGradingRules, CASES, evaluateCase } = require('./graderEval.cjs');

// THE SHIPPED STRINGS — imported from the route that sends them to the model.
const {
  ECF_POLICY_V2_PROMPT,
  ECF_VERIFICATION_STEP_CLAUSE,
  WORD_PROBLEM_FINAL_ANSWER_PROMPT,
  QUESTION_MISCOPY_PROMPT,
  IDENTIFY_EVERY_STEP_PROMPT,
  presentationVsMissingPrompt,
  CORRECTED_WORKING_PROMPT,
  PER_STEP_ATTRIBUTION_PROMPT,
  NO_MANUFACTURED_MISSING_STEPS_PROMPT,
  SCHEME_ASSESSMENT_DIRECTIVES,
  subjectChecklistBody,
} = require('../routes/checkSolution.cjs');

const RULES = buildGradingRules();

// The shipped rule strings the owner ruled IN.
const PORTED = [
  ['ECF_POLICY_V2_PROMPT', ECF_POLICY_V2_PROMPT],
  ['ECF_VERIFICATION_STEP_CLAUSE', ECF_VERIFICATION_STEP_CLAUSE],
  ['WORD_PROBLEM_FINAL_ANSWER_PROMPT', WORD_PROBLEM_FINAL_ANSWER_PROMPT],
  ['QUESTION_MISCOPY_PROMPT', QUESTION_MISCOPY_PROMPT],
  ['IDENTIFY_EVERY_STEP_PROMPT', IDENTIFY_EVERY_STEP_PROMPT],
  ['presentationVsMissingPrompt(3)', presentationVsMissingPrompt(3)],
  ['CORRECTED_WORKING_PROMPT', CORRECTED_WORKING_PROMPT],
  ['PER_STEP_ATTRIBUTION_PROMPT', PER_STEP_ATTRIBUTION_PROMPT],
  ['NO_MANUFACTURED_MISSING_STEPS_PROMPT', NO_MANUFACTURED_MISSING_STEPS_PROMPT],
  ['SCHEME_ASSESSMENT_DIRECTIVES', SCHEME_ASSESSMENT_DIRECTIVES],
  // Rule 10, owner-ruled IN with 'auto'. See §8 for the standing caveat.
  ["subjectChecklistBody('auto')", subjectChecklistBody('auto')],
];

// §1 — REQUIRED CASE 1. Every ruled-IN rule is present, asserted against SHIPPED text.
test('§1 the assembled prompt carries every shipped rule the owner ruled IN', () => {
  for (const [name, text] of PORTED) {
    assert.ok(
      typeof text === 'string' && text.length > 20,
      name + ' did not import as a non-trivial string (got ' + typeof text + ') — if this ' +
        'fails the export was dropped and every other assertion here is vacuous',
    );
    assert.ok(
      RULES.includes(text),
      'MISSING from the harness prompt: ' + name + '\n  shipped text begins: ' + text.slice(0, 90),
    );
  }
});

// §2 — REQUIRED CASE 2. Rule 16 specifically: the rule the owner's live-verify failed on.
test('§2 rule 16 (SCHEME_ASSESSMENT_DIRECTIVES) is present — the live-verify rule', () => {
  assert.ok(
    RULES.includes(SCHEME_ASSESSMENT_DIRECTIVES),
    'The shipped source names this one explicitly: rule 16 is the one the live-verify failed ' +
      'on — a scheme silent about balancing read as permission. Without it the harness cannot ' +
      'measure the central fix of the arc it exists to measure.',
  );
  assert.ok(
    !RULES.includes('SCHEME_ASSESSMENT_DIRECTIVES'),
    'the constant NAME leaked into the prompt instead of its value',
  );
});

// §3 — the ONE constant that must remain a copy, pinned to the shipped source TEXT.
test('§3 the local taxonomy copy is content-identical to the sealed shipped one', () => {
  const routeSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'checkSolution.cjs'), 'utf8');
  const evalSrc = fs.readFileSync(path.join(__dirname, 'graderEval.cjs'), 'utf8');
  const grab = (src) => {
    const i = src.indexOf('STRUCTURED_MISTAKE_TAXONOMY =');
    assert.ok(i > 0, 'taxonomy definition not found');
    const end = src.indexOf('\n\n', i);
    return src.slice(i, end).split('\n').slice(1).map((l) => l.trim()).join('\n');
  };
  assert.equal(
    grab(evalSrc),
    grab(routeSrc),
    'STRUCTURED_MISTAKE_TAXONOMY is sealed inside createCheckSolutionRoute and cannot be ' +
      'imported, so the harness keeps a copy. This pin is the only thing keeping that copy ' +
      'honest — three drifted copies of this taxonomy already shipped in this file family.',
  );
});

// §4 — THE FOUR HELD RULES ARE ABSENT, and that is deliberate.
test('§4 the THREE still-held rules are absent — the hold is real and detectable', () => {
  const routeSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'checkSolution.cjs'), 'utf8');
  assert.ok(
    routeSrc.includes('function subjectChecklistBody'),
    'CONTROL: shipped rule 10 still exists in the route — if this fails the hold below is vacuous',
  );
  // (shipped rule 10 is no longer held — owner ruled it IN with 'auto'; see §8)
  assert.ok(
    !RULES.includes('couldNotRead'),
    'the rule 6 couldNotRead HEAD leaked in. Only the crossed-out-answer TAIL was ruled ' +
      'in; the head is image-reading and cannot apply to already-transcribed text.',
  );
  assert.ok(
    !RULES.includes('FENCED'),
    'shipped rule 17 leaked in; it is HELD — the harness sends no fenced typed block',
  );
  assert.ok(
    RULES.includes('grade the transcribed student answer'),
    'the harness own rule 1 framing was lost — it has no PDF and nothing to locate',
  );
  assert.ok(
    !RULES.includes('locate that numbered answer in the PDF'),
    'the shipped PDF-locate rule 1 leaked in; the harness has no PDF',
  );
});

// §5 — REQUIRED CASE 3, THE CONTROL. A deliberately WRONG expected value must FAIL.
// A harness that cannot fail is not measuring anything.
test('§5 CONTROL — a deliberately wrong expected value makes the case FAIL', () => {
  const fullMarks = {
    qNumber: 1,
    couldNotRead: false,
    marksAwarded: 2,
    totalMarks: 2,
    annotatedSteps: [
      { stepNumber: 1, description: 'd', status: 'correct', marksAwarded: 2, marksDeducted: 0, mistakeType: null },
    ],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  };
  assert.deepEqual(
    evaluateCase({ name: 'honest', expect: { status: 'correct' } }, fullMarks),
    [],
    'a correct result against a correct expectation should produce no failures',
  );
  const failures = evaluateCase({ name: 'deliberately wrong', expect: { status: 'incorrect' } }, fullMarks);
  assert.ok(failures.length > 0, 'THE HARNESS CANNOT FAIL — it is not measuring anything');
  const joined = failures.join(' | ');
  assert.ok(/expected/i.test(joined), 'failure text names no EXPECTED value: ' + joined);
  assert.ok(/2\/2|correct/.test(joined), 'failure text names no ACTUAL value: ' + joined);
});

// §6 — REQUIRED CASE 4. Every miss carries expected, actual AND the case label.
test('§6 every miss reports expected, actual and the case label', () => {
  for (const c of CASES) {
    assert.ok(
      typeof c.name === 'string' && c.name.length > 0,
      'a case with no label cannot be reported as a miss',
    );
    assert.ok(
      c.expect && Object.keys(c.expect).length > 0,
      'case "' + c.name + '" carries no expectation, so it can never miss',
    );
  }
  const wrong = evaluateCase(
    { name: 'x', expect: { status: 'correct' } },
    { qNumber: 1, couldNotRead: false, marksAwarded: 0, totalMarks: 2, annotatedSteps: [], mistakeSummary: {} },
  );
  assert.ok(
    wrong.some((f) => /expected/i.test(f) && /got/i.test(f)),
    'a miss must state both expected and actual; got: ' + JSON.stringify(wrong),
  );
});

// §7 — BONUS CONTROL. Stays GREEN under the §1 mutation, proving §1 measures something
// INDEPENDENT of it: this asserts the harness's OWN pre-existing rules, which the
// mutation (removing a newly-PORTED rule) does not touch.
test('§7 CONTROL (mutation-independent) — the harness keeps its own pre-existing rules', () => {
  assert.ok(RULES.startsWith('GRADING RULES:'), 'the prompt header changed');
  assert.ok(RULES.includes('NO WORKING SHOWN'), 'rule 5 lost');
  assert.ok(RULES.includes('Never exceed the question'), 'rule 2 lost');
});

// §8 — THE TWO LATE PORTS, and the standing caveat on rule 10.
test('§8 rule 6 TAIL is ported without its head, and rule 10 runs in AUTO-DETECT mode', () => {
  // Rule 6: the crossed-out-answer GRADING RULING is in...
  assert.ok(
    RULES.includes('crossed out with no replacement written is a NO-ATTEMPT'),
    'the rule 6 crossed-out-answer clause is missing — it is a grading ruling that applies ' +
      'to typed text and was ruled IN',
  );
  // ...and its couldNotRead head is out. Asserted in §4 too; kept here so the split is
  // visible as ONE decision rather than two unrelated assertions.
  assert.ok(!RULES.includes('couldNotRead'), 'the couldNotRead head leaked in');

  // ⚠⚠ STANDING CAVEAT — NOT PARITY. The shipped structured path passes ONE declared
  // subject for the whole set. The harness has none to pass (its CASES carry `topic`),
  // so it runs the checklist in AUTO-DETECT mode, which emits BOTH subjects. This is a
  // KNOWN, DELIBERATE DIVERGENCE FROM PRODUCTION and must not be read as parity.
  assert.ok(
    RULES.includes(subjectChecklistBody('auto')),
    'rule 10 is missing; it was ruled IN in auto-detect mode',
  );
  assert.notEqual(
    subjectChecklistBody('auto'),
    subjectChecklistBody('maths'),
    'CONTROL: if auto and maths were the same string, asserting auto-mode would prove nothing ' +
      'and the divergence above would be invisible',
  );
});
