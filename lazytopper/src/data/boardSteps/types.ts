export type SubjectKey = "Maths" | "Science";
export type SectionKey = "A" | "B" | "C" | "D" | "E";

export interface BoardStep {
  id: string;
  title: string;
  whatToWrite: string[];
  marks: number;
  commonMistakes?: string[];
}

export interface BoardStepsTemplate {
  subject: SubjectKey;
  section: SectionKey;
  marksTotal: number;
  steps: BoardStep[];
  notes?: string[];
}

export type BoardStepsIndex = Record<SubjectKey, Record<SectionKey, BoardStepsTemplate>>;
