'use strict';
// server/grading/schema.cjs — THE ONE RESPONSE SCHEMA (constrained decoding).
//
// ★ THE RULE IT STILL OBEYS: exactly as loose as the parser, NEVER tighter. A schema
// tighter than the parser constrains the MARKING itself (a required field the parser
// defaults, a non-nullable mistakeType). Every field here is optional and nullable except
// the two the parser genuinely gates on: `results` (the parse gate) and `results[].qNumber`
// (an entry without one cannot be mapped to a sent question and is discarded).
//
// ★ ONE SCHEMA FOR BOTH ENTRY POINTS. A single question is a set of one, so the
// single-question endpoint asks for `{ results: [ { qNumber: 1, ... } ] }` too. (Its
// parser additionally accepts a bare single-question object — see core.cjs — because a
// model occasionally answers a set of one that way, and because the stored PR-1 golden
// responses were recorded in that shape.)
//
// ★ `annotatedSteps` IS OPTIONAL: a `couldNotRead: true` entry legitimately has no steps,
// and requiring them would force the model to FABRICATE steps for an answer it could not
// read. `mistakeType` is nullable with NO enum: the parser enforces the four types, and a
// nullable enum the API might not honour would force a type onto correct / ECF /
// unattempted steps — corrupting Mistake Intelligence to save a retry.

const { MODEL_STEP_STATUSES, ADDRESSES_VALUES } = require('./rules.cjs');

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

function stepSchema() {
  return {
    type: 'OBJECT',
    properties: {
      stepNumber: { type: 'INTEGER', nullable: true },
      part: { type: 'STRING', nullable: true },
      description: { type: 'STRING' },
      studentWork: { type: 'STRING', nullable: true },
      status: { type: 'STRING', enum: MODEL_STEP_STATUSES.slice() },
      marksAvailable: { type: 'NUMBER', nullable: true },
      marksAwarded: { type: 'NUMBER', nullable: true },
      marksDeducted: { type: 'NUMBER', nullable: true },
      teacherAnnotation: { type: 'STRING', nullable: true },
      mistakeType: { type: 'STRING', nullable: true },
      correctedWorking: { type: 'STRING', nullable: true },
      isDeparture: { type: 'BOOLEAN', nullable: true },
      departureKind: { type: 'STRING', nullable: true },
      isReturn: { type: 'BOOLEAN', nullable: true },
    },
    // Ordering hint only: the model QUOTES and DESCRIBES a step before it judges it.
    propertyOrdering: [
      'stepNumber', 'part', 'description', 'studentWork', 'status', 'marksAvailable',
      'marksAwarded', 'marksDeducted', 'teacherAnnotation', 'mistakeType', 'correctedWorking',
      'isDeparture', 'departureKind', 'isReturn',
    ],
    required: ['description'],
  };
}

function mistakeSummarySchema() {
  return {
    type: 'OBJECT',
    nullable: true,
    properties: {
      conceptual: { type: 'NUMBER', nullable: true },
      calculation: { type: 'NUMBER', nullable: true },
      silly: { type: 'NUMBER', nullable: true },
      presentation: { type: 'NUMBER', nullable: true },
    },
    propertyOrdering: ['conceptual', 'calculation', 'silly', 'presentation'],
  };
}

/**
 * @param {{ autoDetect?: boolean }} [opts]  autoDetect adds the (optional) detection fields a
 *        set of one may carry when the caller asked the grader to determine marks/subject/topic.
 */
function buildResponseSchema(opts = {}) {
  const resultProps = {
    qNumber: { type: 'INTEGER' },
    couldNotRead: { type: 'BOOLEAN', nullable: true },
    note: { type: 'STRING', nullable: true },
    addressesQuestion: { type: 'STRING', nullable: true, enum: ADDRESSES_VALUES.slice() },
    mismatchEvidence: {
      type: 'OBJECT',
      nullable: true,
      properties: { question: { type: 'STRING', nullable: true }, work: { type: 'STRING', nullable: true } },
      propertyOrdering: ['question', 'work'],
    },
    rubric: {
      type: 'ARRAY',
      nullable: true,
      items: {
        type: 'OBJECT',
        properties: { point: { type: 'STRING' }, marks: { type: 'NUMBER' } },
        propertyOrdering: ['point', 'marks'],
        required: ['point', 'marks'],
      },
    },
    marksAwarded: { type: 'NUMBER', nullable: true },
    annotatedSteps: { type: 'ARRAY', nullable: true, items: stepSchema() },
    mistakeSummary: mistakeSummarySchema(),
    studentFinalAnswer: { type: 'STRING', nullable: true },
    finalAnswerCorrect: { type: 'BOOLEAN', nullable: true },
    teacherNote: { type: 'STRING', nullable: true },
  };
  const order = [
    'qNumber', 'couldNotRead', 'note', 'addressesQuestion', 'mismatchEvidence', 'rubric',
    'marksAwarded', 'annotatedSteps', 'mistakeSummary', 'studentFinalAnswer', 'finalAnswerCorrect',
    'teacherNote',
  ];
  if (opts.autoDetect) {
    Object.assign(resultProps, {
      detectedSubject: { type: 'STRING', nullable: true },
      detectedTopic: { type: 'STRING', nullable: true },
      detectedMarks: { type: 'NUMBER', nullable: true },
      marksSource: { type: 'STRING', enum: ['stated', 'inferred'] },
    });
    order.splice(1, 0, 'detectedSubject', 'detectedTopic', 'detectedMarks', 'marksSource');
  }
  return {
    type: 'OBJECT',
    properties: {
      results: {
        type: 'ARRAY',
        items: { type: 'OBJECT', properties: resultProps, propertyOrdering: order, required: ['qNumber'] },
      },
      summary: { type: 'STRING', nullable: true },
    },
    propertyOrdering: ['results', 'summary'],
    required: ['results'],
  };
}

const GRADING_RESPONSE_SCHEMA = deepFreeze(buildResponseSchema());
const GRADING_RESPONSE_SCHEMA_AUTODETECT = deepFreeze(buildResponseSchema({ autoDetect: true }));

module.exports = { GRADING_RESPONSE_SCHEMA, GRADING_RESPONSE_SCHEMA_AUTODETECT, buildResponseSchema, deepFreeze };
