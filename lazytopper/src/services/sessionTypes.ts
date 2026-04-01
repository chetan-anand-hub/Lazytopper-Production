export type SessionItemType =
  | "concept_micro"
  | "worked_example"
  | "practice_question"
  | "revision_card"
  | "mistake_fix_micro"
  | "exam_tip_card"
  | "mastery_quiz"
  | "case_based_set"
  | "graph_task";

export interface SessionItem {
  id: string;
  itemType: SessionItemType;
  title: string;
  description?: string;
  refId?: string;
  payload?: unknown;
}
