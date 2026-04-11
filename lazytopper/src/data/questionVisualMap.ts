import { canonicalQuestionBank } from "./canonicalQuestionBank";
import { findVisualForQuestion, getVisualsForTopicKey } from "./visualConceptRegistry";
import type { VisualConcept } from "./visualConceptRegistry";
import type { CanonicalQuestion } from "./predictionTypes";

export interface QuestionVisualMapping {
  questionId: string;
  visualId: string;
  visualFilePath: string;
  confidence: "exact" | "topic" | "heuristic";
}

let _cachedMap: Map<string, QuestionVisualMapping> | null = null;

function buildQuestionVisualMap(): Map<string, QuestionVisualMapping> {
  const map = new Map<string, QuestionVisualMapping>();

  for (const q of canonicalQuestionBank) {
    if (q.visualExplainerId) {
      const topicVisuals = getVisualsForTopicKey(q.topicKey);
      const match = topicVisuals.find((v) => v.id === q.visualExplainerId);
      if (match) {
        map.set(q.id, {
          questionId: q.id,
          visualId: match.id,
          visualFilePath: match.filePath,
          confidence: "exact",
        });
        continue;
      }
    }

    const match = findVisualForQuestion(q.questionText, q.topicKey, q.subject);
    if (match) {
      map.set(q.id, {
        questionId: q.id,
        visualId: match.id,
        visualFilePath: match.filePath,
        confidence: "heuristic",
      });
    }
  }

  return map;
}

export function getQuestionVisualMap(): Map<string, QuestionVisualMapping> {
  if (!_cachedMap) {
    _cachedMap = buildQuestionVisualMap();
  }
  return _cachedMap;
}

export function getVisualForQuestionId(questionId: string): QuestionVisualMapping | null {
  return getQuestionVisualMap().get(questionId) || null;
}

export function getVisualConceptForQuestion(question: CanonicalQuestion): VisualConcept | null {
  if (question.visualExplainerId) {
    const topicVisuals = getVisualsForTopicKey(question.topicKey);
    const match = topicVisuals.find((v) => v.id === question.visualExplainerId);
    if (match) return match;
  }
  return findVisualForQuestion(question.questionText, question.topicKey, question.subject);
}
