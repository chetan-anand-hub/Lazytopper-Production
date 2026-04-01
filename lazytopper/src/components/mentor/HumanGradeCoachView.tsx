import React from "react";
import type {
  MentorTutorPracticeNext,
  TutorBlock,
} from "../../types/mentor";

type HumanGradeCoachViewProps = {
  tutorObj?: TutorBlock | null;
  hintLevel: number;
  onNextHint?: () => void;
  onPracticeNext?: (practiceNext: MentorTutorPracticeNext) => void;
  variantLabel?: string;
  compact?: boolean;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((item) => String(item)) : [];

const humanizeKey = (value: string) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const cleanSentence = (value: unknown) => {
  const text = asString(value).trim();
  return text.replace(/\s+/g, " ").trim();
};

export const HumanGradeCoachView: React.FC<HumanGradeCoachViewProps> = ({
  tutorObj,
  hintLevel,
  onNextHint,
  onPracticeNext,
  variantLabel,
  compact = false,
}) => {
  if (!tutorObj || typeof tutorObj !== "object") return null;

  const diagnosis = tutorObj.diagnosis;
  const socratic = tutorObj.socratic;
  const hint = tutorObj.hint_ladder;
  const board = tutorObj.board_steps_ms;
  const next = tutorObj.next;
  const boardTip = tutorObj.board_tip;
  const commonMistake = tutorObj.common_mistake;
  const practiceNext = tutorObj.practice_next;
  const adaptiveStyle = tutorObj.adaptive_style;
  const diagnosisRecord = isRecord(diagnosis) ? diagnosis : null;
  const socraticRecord = isRecord(socratic) ? socratic : null;
  const hintRecord = isRecord(hint) ? hint : null;
  const boardRecord = isRecord(board) ? board : null;
  const nextRecord = isRecord(next) ? next : null;
  const boardTipRecord = isRecord(boardTip) ? boardTip : null;
  const commonMistakeRecord = isRecord(commonMistake) ? commonMistake : null;
  const practiceNextRecord = isRecord(practiceNext) ? practiceNext : null;
  const adaptiveStyleRecord = isRecord(adaptiveStyle) ? adaptiveStyle : null;
  const hasAny =
    diagnosis ||
    socratic ||
    hint ||
    board ||
    next ||
    boardTip ||
    commonMistake ||
    practiceNext ||
    adaptiveStyle;
  if (!hasAny) return null;

  const mistakeTags = Array.isArray(diagnosisRecord?.mistake_tags)
    ? asStringArray(diagnosisRecord.mistake_tags)
    : [];
  const hintText = asString(hintRecord?.hint);
  const hintWarning = asString(hintRecord?._warning);
  const hintBusy = Boolean(hintRecord?._busy);
  const canAdvance =
    typeof hintRecord?._can_advance === "boolean" ? hintRecord._can_advance : Boolean(onNextHint);
  const showSingleHintNote = Boolean(hintRecord?._single_hint_note);
  const steps = Array.isArray(boardRecord?.steps) ? boardRecord.steps : [];
  const deductions = Array.isArray(boardRecord?.deductions) ? boardRecord.deductions : [];
  const totalMarks = Number(boardRecord?.total_marks);
  const diagnosisSummary =
    cleanSentence(diagnosisRecord?.summary_line) ||
    cleanSentence(diagnosisRecord?.misconception_summary) ||
    cleanSentence(boardTipRecord?.summary) ||
    cleanSentence(socraticRecord?.question);
  const primaryAction =
    cleanSentence(nextRecord?.micro_drill) ||
    cleanSentence(hintText) ||
    cleanSentence(socraticRecord?.question) ||
    cleanSentence(boardRecord?.steps && Array.isArray(boardRecord.steps) && boardRecord.steps[0] && isRecord(boardRecord.steps[0]) ? boardRecord.steps[0].line : "");
  const watchOut =
    cleanSentence(commonMistakeRecord?.summary) ||
    cleanSentence(boardTipRecord?.mark_cut_risk) ||
    cleanSentence(diagnosisRecord?.misconception_summary) ||
    cleanSentence(diagnosisRecord?.confusion_type);
  const watchOutFix =
    cleanSentence(commonMistakeRecord?.fix) ||
    cleanSentence(nextRecord?.revision_hook) ||
    cleanSentence(boardTipRecord?.summary);
  const tryOneMore =
    cleanSentence(practiceNextRecord?.reason) ||
    cleanSentence(socraticRecord?.expected_thought) ||
    cleanSentence(nextRecord?.revision_hook);
  const detailMeta = [
    diagnosisRecord?.family_label ? `Family: ${String(diagnosisRecord.family_label)}` : "",
    diagnosisRecord?.confusion_type ? `Bottleneck: ${humanizeKey(String(diagnosisRecord.confusion_type))}` : "",
    diagnosisRecord?.help_mode ? `Help mode: ${humanizeKey(String(diagnosisRecord.help_mode))}` : "",
    diagnosisRecord?.student_profile ? `Style: ${humanizeKey(String(diagnosisRecord.student_profile))}` : "",
    adaptiveStyleRecord?.profile ? `Profile: ${humanizeKey(String(adaptiveStyleRecord.profile))}` : "",
    adaptiveStyleRecord?.tone ? `Tone: ${String(adaptiveStyleRecord.tone)}` : "",
    adaptiveStyleRecord?.depth ? `Depth: ${String(adaptiveStyleRecord.depth)}` : "",
    adaptiveStyleRecord?.pacing ? `Pacing: ${String(adaptiveStyleRecord.pacing)}` : "",
  ].filter(Boolean);

  const containerStyle = compact
    ? { marginTop: 10 }
    : {
        borderRadius: 12,
        padding: "10px 12px",
        border: "1px solid rgba(0,0,0,0.08)",
        background: "rgba(0,0,0,0.03)",
      };

  return (
    <div style={containerStyle}>
      <div style={{ display: "grid", gap: compact ? 10 : 12 }}>
        {diagnosisSummary ? (
          <div style={compact ? { padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.08)" } : { padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.08)" }}>
            <div style={{ fontWeight: compact ? 700 : 800, marginBottom: 4 }}>What this is</div>
            <div style={{ lineHeight: 1.5 }}>{diagnosisSummary}</div>
          </div>
        ) : null}

        {primaryAction ? (
          <div style={compact ? { padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.08)" } : { padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.08)" }}>
            <div style={{ fontWeight: compact ? 700 : 800, marginBottom: 4 }}>Do this now</div>
            <div style={{ lineHeight: 1.5 }}>{primaryAction}</div>
            {hintWarning ? (
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.72 }}>{hintWarning}</div>
            ) : null}
            {hintText && onNextHint ? (
              <button
                type="button"
                className={compact ? "mentor-panel__mode-chip" : "lt-pill"}
                style={{ marginTop: 8 }}
                onClick={onNextHint}
                disabled={hintBusy || !canAdvance}
              >
                {hintBusy ? "Loading..." : "Next hint"}
              </button>
            ) : null}
            {showSingleHintNote ? (
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
                Only one hint is available here.
              </div>
            ) : null}
          </div>
        ) : null}

        {watchOut ? (
          <div style={compact ? { padding: "8px 10px", borderRadius: 10, background: "rgba(254,249,195,0.5)", border: "1px solid rgba(202,138,4,0.18)" } : { padding: "10px 12px", borderRadius: 12, background: "rgba(254,249,195,0.5)", border: "1px solid rgba(202,138,4,0.18)" }}>
            <div style={{ fontWeight: compact ? 700 : 800, marginBottom: 4 }}>Watch out</div>
            <div style={{ lineHeight: 1.5 }}>{watchOut}</div>
            {watchOutFix ? (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82 }}>
                Fix: {watchOutFix}
              </div>
            ) : null}
          </div>
        ) : null}

        {(practiceNext || tryOneMore) ? (
          <div style={compact ? { padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.08)" } : { padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.08)" }}>
            <div style={{ fontWeight: compact ? 700 : 800, marginBottom: 4 }}>Try one more</div>
            {practiceNextRecord?.family_label ? (
              <div style={{ marginBottom: 4 }}>{String(practiceNextRecord.family_label)}</div>
            ) : null}
            {tryOneMore ? (
              <div style={{ fontSize: 12, opacity: 0.82, lineHeight: 1.5, marginBottom: practiceNextRecord && onPracticeNext ? 8 : 0 }}>
                {tryOneMore}
              </div>
            ) : null}
            {practiceNextRecord && onPracticeNext ? (
              <button
                type="button"
                className={compact ? "mentor-panel__mode-chip" : "lt-pill"}
                onClick={() => onPracticeNext(practiceNextRecord as MentorTutorPracticeNext)}
              >
                {String(practiceNextRecord.cta || "Practice this family")}
              </button>
            ) : null}
          </div>
        ) : null}

        <details>
          <summary style={{ cursor: "pointer", fontWeight: compact ? 700 : 800 }}>
            Show more coach details
          </summary>
          <div style={{ marginTop: 8, display: "grid", gap: 10 }}>
            {mistakeTags.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {mistakeTags.map((tag: string, tagIdx: number) => (
                  <span
                    key={`${tag}-${tagIdx}`}
                    className={compact ? "mentor-panel__tag" : undefined}
                    style={
                      compact
                        ? undefined
                        : {
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(15,23,42,0.08)",
                            fontSize: 12,
                          }
                    }
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {detailMeta.length ? (
              <div style={{ fontSize: 12, opacity: 0.8, display: "grid", gap: 4 }}>
                {detailMeta.map((line, idx) => (
                  <div key={`${line}-${idx}`}>{line}</div>
                ))}
              </div>
            ) : null}

            {variantLabel ? (
              <div style={{ fontSize: 10, opacity: 0.55 }}>
                Variant: {variantLabel}
              </div>
            ) : null}

            {socraticRecord?.question ? (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Socratic prompt</div>
                <div>{String(socraticRecord.question)}</div>
                {socraticRecord?.expected_thought ? (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {String(socraticRecord.expected_thought)}
                  </div>
                ) : null}
              </div>
            ) : null}

            {Number.isFinite(totalMarks) ? (
              <div style={{ fontSize: 12, opacity: 0.78 }}>Board answer weight: {totalMarks} marks</div>
            ) : null}

            {steps.length ? (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Board steps</div>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {steps.map((s, stepIdx: number) => {
                    const line = isRecord(s) ? String(s.line || "") : "";
                    const marks = isRecord(s) ? Number(s.marks) : Number.NaN;
                    if (!line) return null;
                    return (
                      <li key={stepIdx} style={{ marginBottom: 6 }}>
                        {line} {Number.isFinite(marks) ? <span>({marks} mark)</span> : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}

            {deductions.length ? (
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Possible mark cuts</div>
                {deductions.map((d, dIdx: number) => (
                  <div key={dIdx} style={{ fontSize: 12, marginBottom: 4 }}>
                    {isRecord(d) ? String(d.reason || "") : ""}{" "}
                    {isRecord(d) && Number.isFinite(Number(d.marks_lost)) ? `(-${Number(d.marks_lost)})` : ""}
                  </div>
                ))}
              </div>
            ) : null}

            {boardRecord?.examiner_note ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>{String(boardRecord.examiner_note)}</div>
            ) : null}

            {boardTipRecord?.question_style ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Question style: {String(boardTipRecord.question_style)}
              </div>
            ) : null}

            {adaptiveStyleRecord?.rationale ? (
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {String(adaptiveStyleRecord.rationale)}
              </div>
            ) : null}

            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Hint level: {hintLevel}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};
