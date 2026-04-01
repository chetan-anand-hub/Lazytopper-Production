// src/utils/getTopicV2Content.ts
//
// Helper for resolving TopicHub v2 content.  This simplified helper
// attempts to retrieve a rich content record from the v2 dataset.  If
// no record is found for a given topic, it builds a minimal object
// containing basic information such as the subject, topic key, topic
// display name and some placeholder sections.  The goal is to ensure
// TopicHub always has something to render for any topic, even if
// that topic has not yet been fully migrated to the v2 schema.

import { topicHubV2Content } from '../data/topicHubV2Full';
import { topicHubV2Enrichment } from '../data/topicHubV2Enrichment';
import { resolveTopicKey, resolveTopicDisplayName } from './topicResolver';

// Define the shape of each content record.  This mirrors the
// TopicHub v2 specification used in the migration plan.  Fields may
// be empty arrays when content is unavailable.
export interface V2Definition {
  title: string;
  description: string;
  examTip?: string;
}

export interface V2Example {
  title: string;
  question: string;
  /** Optional Socratic-friendly solution steps (Gemini/offline packs). */
  steps?: string[];
  /** Optional final answer (Gemini/offline packs). */
  finalAnswer?: string;
}

/**
 * Structured representation of a lab practical activity.  Each lab
 * captures the full experimental workflow from objective through
 * procedure and observations.  The observations array allows for
 * multiple scenario→outcome pairs within a single experiment.  The
 * vivaVoce field reuses the V2Example type to model a simple Q/A
 * prompt used in oral assessment.  A simulationUrl may link to
 * interactive content in the future.
 */
export interface LabActivity {
  id: string;
  title: string;
  objective: string;
  materialsRequired: string;
  procedureSteps: string;
  observations: Array<{
    scenario: string;
    expectedOutcome: string;
    scientificReason: string;
  }>;
  vivaVoce: V2Example;
  safetyPrecautions: string;
  simulationUrl?: string;
}

/**
 * A sub‑question within a case study.  Case studies group several
 * related questions under a common context.  Each sub‑question
 * includes metadata for marks, Bloom level and an NCERT competency
 * code.  Options are provided for MCQ type questions only.
 */
export interface CaseStudySubQuestion {
  id: string;
  questionText: string;
  questionType: 'MCQ' | 'AssertionReason' | 'ShortAnswer';
  marks: number;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
  competencyCode: string;
}

/**
 * A case study groups a contextual passage with multiple
 * sub‑questions.  Tier indicates whether the case study is critical
 * (must‑crack) or high return on investment.  The contextImage is
 * optional and may point to a diagram or chart.
 */
export interface CaseStudy {
  id: string;
  tier: 'must-crack' | 'high-roi' | 'good-to-do';
  contextText: string;
  contextImage?: string;
  subQuestions: CaseStudySubQuestion[];
}

/**
 * A competency ties content items to official NCERT/CBSE learning
 * outcomes.  Each competency has an id code, a descriptive text and
 * an associated Bloom level.  Additional fields such as weight or
 * tags may be added later.
 */
export interface Competency {
  id: string;
  description: string;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
}

/**
 * Captures a common student misconception for a given concept along
 * with the correct reasoning.  This structure helps mentors and
 * explanations target typical errors directly.
 */
export interface Misconception {
  concept: string;
  commonError: string;
  correction: string;
}

export interface TopicHubV2Content {
  subject: string;
  topicKey: string;
  topicName: string;
  tier: string;
  overview: string[];
  definitions: V2Definition[];
  examPatterns: string[];
  markingTips: string[];
  scoreTips: string[];
  workedExamples: V2Example[];
  quickQuiz: V2Example[];

  /**
   * Optional list of lab activities associated with this topic.  Not
   * all topics will have lab components (e.g. purely theoretical
   * chapters).  When absent, the field may be undefined or an empty
   * array.  See LabActivity for the full schema.
   */
  labActivities?: LabActivity[];
  /**
   * Optional collection of case studies for this topic.  Each case
   * study provides a narrative context with multiple sub‑questions.
   */
  caseStudies?: CaseStudy[];
  /**
   * List of competencies covered by this topic.  Use this field to
   * map topic content to NCERT/CBSE learning outcomes.  When no
   * competencies are defined yet, this may be undefined or empty.
   */
  competencies?: Competency[];
  /**
   * Common misconceptions associated with the concepts in this topic.
   * These entries enable mentors to preemptively address typical
   * errors or misunderstandings.
   */
  misconceptions?: Misconception[];
}

/**
 * Look up a v2 content record by subject and topic parameter.  The
 * topic parameter may be a slug or a human‑readable name.  The
 * resolver converts it to a slug and then attempts to find a record in
 * the dataset.  If none exists, a minimal fallback is created.
 */
export default function getTopicV2Content(
  subjectKey: string,
  topicParam: string
): TopicHubV2Content {
  // Compute a canonical slug for the given topic
  const slug = resolveTopicKey({ subjectKey: subjectKey.toLowerCase(), topicParam });
  // Look up a prebuilt record
  const record = (topicHubV2Content as any)[slug];
  const enrichment = (topicHubV2Enrichment as any)[slug] as Partial<TopicHubV2Content> | undefined;
  if (record) {
    // Shallow-merge enrichment for high-value blocks (arrays).
    const base = record as TopicHubV2Content;
    const e = enrichment ?? {};
    return {
      ...base,
      ...e,
      workedExamples: e.workedExamples ?? base.workedExamples,
      labActivities: e.labActivities ?? base.labActivities,
      caseStudies: e.caseStudies ?? base.caseStudies,
      competencies: e.competencies ?? base.competencies,
      misconceptions: e.misconceptions ?? base.misconceptions,
    };
  }
  // Create a minimal fallback record.  We leave arrays empty and
  // provide a single overview line.  The tier is set to 'high-roi' by
  // default.  Future versions can derive tier information from
  // additional sources.
  return {
    subject: subjectKey,
    topicKey: slug,
    topicName: resolveTopicDisplayName(subjectKey.toLowerCase(), slug),
    tier: 'high-roi',
    overview: ['This topic has not been migrated yet. Check back soon!'],
    definitions: [],
    examPatterns: [],
    markingTips: [],
    scoreTips: [],
    workedExamples: [],
    quickQuiz: [],
    labActivities: [],
    caseStudies: [],
    competencies: [],
    misconceptions: [],
  };
}