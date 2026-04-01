const { initHintState, computeNextHint } = require('../src/tutor/hintLadder.ts');
const { scoreRubric } = require('../src/tutor/rubricScore.ts');

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function pickString(primary, fallback) {
  const value = String(primary || '').trim();
  return value ? value : String(fallback || '').trim();
}

function normalizeConfidence(value) {
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'low' || v === 'med' || v === 'high') return v;
    if (v === 'medium') return 'med';
  }
  const num = Number(value);
  if (Number.isFinite(num)) {
    if (num >= 0.75) return 'high';
    if (num >= 0.45) return 'med';
    return 'low';
  }
  return 'low';
}

function extractAttemptText(payload, messages, attemptLoop) {
  const loopText = String(attemptLoop?.student_attempt?.raw_text || '').trim();
  if (loopText) return loopText;
  const payloadText = String(
    payload?.studentAttempt ||
      payload?.studentAnswer ||
      payload?.student_attempt ||
      payload?.attempt ||
      payload?.attemptText ||
      ''
  ).trim();
  if (payloadText) return payloadText;
  if (Array.isArray(messages)) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (!msg || String(msg.role || '').toLowerCase() !== 'user') continue;
      const text = String(msg.content || '').trim();
      if (text) return text;
    }
  }
  return '';
}

function getLatestUserText(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg || String(msg.role || '').toLowerCase() !== 'user') continue;
    const text = String(msg.content || '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeStudentProfile(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'anxious') return 'anxious';
  if (raw === 'weak_foundation' || raw === 'weak-foundation' || raw === 'weak') return 'weak_foundation';
  if (raw === 'boards_focused' || raw === 'boards-focused' || raw === 'board') return 'boards_focused';
  if (raw === 'doubt_heavy' || raw === 'doubt-heavy' || raw === 'doubt') return 'doubt_heavy';
  if (raw === 'advanced_value_seeking' || raw === 'advanced-value-seeking' || raw === 'advanced') {
    return 'advanced_value_seeking';
  }
  return '';
}

function inferStudentProfile(payload, messages, mode) {
  const explicit = normalizeStudentProfile(
    payload?.studentProfile || payload?.student_profile || payload?.studentStateProfile
  );
  if (explicit) return explicit;

  const intent = String(payload?.studentIntent || '').trim().toLowerCase();
  const solveStyle = String(payload?.solveStyle || '').trim().toLowerCase();
  const text = [
    getLatestUserText(messages),
    payload?.studentQuestion,
    payload?.questionText,
    payload?.contextText,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/(panic|anxious|overwhelm|scared|blank out|stuck badly)/i.test(text)) return 'anxious';
  if (/(shortcut|fastest|quickest|high[- ]value|efficient|just the key step)/i.test(text)) {
    return 'advanced_value_seeking';
  }
  if (intent === 'check_cbse' || solveStyle === 'board' || mode === 'board_steps_ms') {
    return 'boards_focused';
  }
  if (intent === 'explain' || mode === 'learn_teach' || mode === 'learn_mindmap') {
    return /(why|how|confused|doubt)/i.test(text) ? 'doubt_heavy' : 'weak_foundation';
  }
  if (/(why|how|doubt|reason)/i.test(text)) return 'doubt_heavy';
  return 'weak_foundation';
}

function inferHelpMode(payload, mode, messages) {
  const explicit = String(payload?.mentorHelpMode || payload?.helpMode || payload?.quickAction || '').trim().toLowerCase();
  if (explicit) return explicit;
  const userText = getLatestUserText(messages).toLowerCase();
  if (/show (the )?(figure|diagram)/i.test(userText)) return 'show_figure';
  if (/full solve|complete solution|full solution|just answer/i.test(userText)) return 'full_solve';
  if (mode === 'board_steps_ms') return 'proof_check';
  if (mode === 'learn_teach' || mode === 'learn_mindmap' || mode === 'explain') return 'explain';
  if (mode === 'learn_proof') return 'proof_check';
  if (/next step/i.test(userText)) return 'next_step';
  return 'hint';
}

function inferFamilyContext(payload) {
  const topicKey = pickString(payload?.topicKey, payload?.chapter || '').toLowerCase();
  const familyIdSeed = pickString(
    payload?.questionFamilyId,
    payload?.familyId || payload?.itemId || ''
  );
  const familyLabelSeed = pickString(
    payload?.questionFamilyLabel,
    payload?.familyLabel || payload?.itemTitle || payload?.practiceNextLabel || ''
  );
  const qtypeId = pickString(payload?.questionTypeId, payload?.qtypeId || '');
  const theoremFocus = Array.isArray(payload?.theoremFocus)
    ? normalizeStringList(payload.theoremFocus)
    : normalizeStringList([payload?.theoremFocus]);
  const haystack = [
    topicKey,
    payload?.questionText,
    payload?.studentQuestion,
    payload?.contextText,
    familyLabelSeed,
    theoremFocus.join(' '),
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let familyId = familyIdSeed;
  let familyLabel = familyLabelSeed;

  if (topicKey.includes('triangles')) {
    if (!familyId && /area\s*ratio|area of similar/i.test(haystack)) {
      familyId = 'TRI_FAMILY_AREA_RATIO';
      familyLabel = 'Area-ratio consequences';
    } else if (!familyId && /(bpt|parallel|converse bpt)/i.test(haystack)) {
      familyId = 'TRI_FAMILY_BPT_PARALLEL';
      familyLabel = 'BPT / parallel-line inference';
    } else if (!familyId && /(proof|justify|given|to prove|conclusion|criterion line)/i.test(haystack)) {
      familyId = 'TRI_FAMILY_PROOF_STRUCTURE';
      familyLabel = 'Proof structure and justification';
    } else if (!familyId && /(aa|sas|sss|similar|correspondence)/i.test(haystack)) {
      familyId = 'TRI_FAMILY_SIMILARITY_CHOICE';
      familyLabel = 'Similarity rule choice';
    } else if (!familyId) {
      familyId = 'TRI_FAMILY_THEOREM_CHOICE';
      familyLabel = 'Which theorem fits first?';
    }
  }

  const focusQuestionIds = normalizeStringList(
    payload?.suggestedPracticeIds || payload?.focusQuestionIds || payload?.focusBankIds
  );
  const sectionFilter = pickString(
    payload?.practiceSectionFilter,
    payload?.section || payload?.cardSection || ''
  );
  const chapterStep = pickString(
    payload?.chapterStep,
    familyId === 'TRI_FAMILY_BOARD_CHECK'
      ? 'board-check'
      : familyId === 'TRI_FAMILY_PROOF_STRUCTURE'
        ? 'proof-repair'
        : familyId === 'TRI_FAMILY_BPT_PARALLEL'
          ? 'bpt-practice'
          : familyId === 'TRI_FAMILY_AREA_RATIO'
            ? 'area-ratio-practice'
            : familyId === 'TRI_FAMILY_SIMILARITY_CHOICE'
              ? 'similarity-choice'
              : 'figure-first'
  );
  const diagramNeeded =
    Boolean(payload?.diagramRequired) ||
    /triangle|figure|diagram|parallel|similar|correspond|proof/i.test(haystack);
  const recommendedDiagramType = pickString(
    payload?.recommendedDiagramType,
    diagramNeeded
      ? familyId === 'TRI_FAMILY_BPT_PARALLEL'
        ? 'geometry_parallel_lines'
        : familyId === 'TRI_FAMILY_AREA_RATIO' || familyId === 'TRI_FAMILY_SIMILARITY_CHOICE'
          ? 'geometry_similarity'
          : 'geometry_triangle'
      : ''
  );

  return {
    topicKey,
    familyId,
    familyLabel,
    qtypeId,
    theoremFocus,
    focusQuestionIds,
    sectionFilter,
    chapterStep,
    diagramNeeded,
    recommendedDiagramType,
  };
}

function inferConfusionType(payload, attemptLoop, mode, familyContext) {
  const status = String(attemptLoop?.diagnosis?.status || '').toLowerCase();
  const mistakeTags = normalizeStringList(attemptLoop?.diagnosis?.mistake_tags).join(' ').toLowerCase();
  if (mode === 'board_steps_ms' || String(payload?.studentIntent || '').toLowerCase() === 'check_cbse') {
    return 'board_answer_weakness';
  }
  if (familyContext.diagramNeeded && /(no_working|figure|diagram|parallel)/i.test(mistakeTags)) {
    return 'diagram_interpretation_issue';
  }
  if (familyContext.familyId === 'TRI_FAMILY_PROOF_STRUCTURE' || familyContext.familyId === 'TRI_FAMILY_BOARD_CHECK') {
    return 'proof_structure_confusion';
  }
  if (
    familyContext.familyId === 'TRI_FAMILY_THEOREM_CHOICE' ||
    familyContext.familyId === 'TRI_FAMILY_SIMILARITY_CHOICE' ||
    familyContext.familyId === 'TRI_FAMILY_BPT_PARALLEL'
  ) {
    return 'theorem_choice_confusion';
  }
  if (status === 'incorrect' && /(algebra|calculation|arithmetic)/i.test(mistakeTags)) {
    return 'calculation_mistake';
  }
  if (mode === 'learn_teach' || mode === 'learn_mindmap' || mode === 'explain') {
    return 'concept_confusion';
  }
  return 'next_step_unclear';
}

function buildSummaryLine(profile, familyContext, confusionType) {
  const profileLead =
    profile === 'anxious'
      ? 'Keep the next move small and calm.'
      : profile === 'boards_focused'
        ? 'Prioritize mark-safe writing.'
        : profile === 'advanced_value_seeking'
          ? 'Use the fastest correct route.'
          : profile === 'doubt_heavy'
            ? 'Clarify the reason before the rule.'
            : 'Lock the concept before speed.';
  const familyLead = familyContext.familyLabel ? `Family: ${familyContext.familyLabel}.` : '';
  const bottleneckLead = confusionType ? `Bottleneck: ${String(confusionType).replace(/_/g, ' ')}.` : '';
  return [profileLead, familyLead, bottleneckLead].filter(Boolean).join(' ');
}

function buildBoardTipBlock(payload, familyContext) {
  const marks = Number(payload?.marks || payload?.totalMarks || payload?.total_marks || 0);
  const questionStyle = pickString(
    payload?.cardSection,
    payload?.section || (Number.isFinite(marks) && marks > 0 ? `${marks}-mark style` : '')
  );
  let summary = 'Name the theorem/criterion before the key relation, then close with the exact target line.';
  let markCutRisk = 'Missing theorem/criterion naming or a weak conclusion line can cost board marks.';

  if (familyContext.familyId === 'TRI_FAMILY_BPT_PARALLEL') {
    summary = 'Write the parallel-line condition first, then apply BPT/converse BPT on the next line.';
    markCutRisk = 'Writing ratios before stating the parallel trigger often loses method marks.';
  } else if (familyContext.familyId === 'TRI_FAMILY_AREA_RATIO') {
    summary = 'Prove similarity first, then square the side ratio explicitly before writing the area ratio.';
    markCutRisk = 'Forgetting the square or skipping the similarity step loses marks quickly.';
  } else if (familyContext.familyId === 'TRI_FAMILY_SIMILARITY_CHOICE') {
    summary = 'Keep the triangle order fixed before using AA, SAS, or SSS.';
    markCutRisk = 'Wrong correspondence order can spoil the entire proof or ratio line.';
  }

  return {
    title: 'Board-smart note',
    summary,
    mark_cut_risk: markCutRisk,
    question_style: questionStyle || 'board-style question',
  };
}

function buildCommonMistakeBlock(familyContext, confusionType) {
  let summary = 'Jumping to the answer before naming the trigger or theorem.';
  let fix = 'First identify the figure trigger, then write one justified line.';
  let markRisk = 'This weakens the opening method step.';

  if (confusionType === 'proof_structure_confusion') {
    summary = 'Skipping the theorem line or the final conclusion in a proof.';
    fix = 'Write Given -> Theorem/Criterion -> Justified relation -> Therefore/Hence.';
    markRisk = 'Board checking often deducts for missing structure even when the maths is close.';
  } else if (familyContext.familyId === 'TRI_FAMILY_BPT_PARALLEL') {
    summary = 'Applying BPT without first proving or using the parallel condition.';
    fix = 'State the parallel line clearly before writing any proportional segments.';
    markRisk = 'The ratio line can be treated as unjustified.';
  } else if (familyContext.familyId === 'TRI_FAMILY_AREA_RATIO') {
    summary = 'Using side ratio directly instead of squaring it for area ratio.';
    fix = 'After similarity, square the corresponding side ratio explicitly.';
    markRisk = 'Final answer becomes numerically wrong.';
  }

  return {
    title: 'Common mistake',
    summary,
    fix,
    mark_risk: markRisk,
  };
}

function buildPracticeNextBlock(payload, familyContext) {
  const focusQuestionIds = normalizeStringList(
    payload?.suggestedPracticeIds || payload?.focusQuestionIds || payload?.focusBankIds
  );
  if (!familyContext.familyLabel && focusQuestionIds.length === 0) return null;
  return {
    cta: pickString(payload?.practiceNextCta, 'Practice this family'),
    topic_key: pickString(payload?.topicKey, payload?.chapter || ''),
    family_id: familyContext.familyId || '',
    family_label: familyContext.familyLabel || '',
    qtype_id: familyContext.qtypeId || '',
    chapter_step: familyContext.chapterStep || '',
    reason: pickString(
      payload?.practiceNextReason,
      familyContext.familyLabel
        ? `Stay in ${familyContext.familyLabel} for one more question before switching topics.`
        : 'Do one closely related question next.'
    ),
    section_filter: familyContext.sectionFilter || '',
    focus_question_ids: focusQuestionIds,
  };
}

function buildAdaptiveStyleBlock(profile) {
  if (profile === 'anxious') {
    return {
      profile,
      tone: 'calm and non-shaming',
      depth: 'small steps',
      pacing: 'hint-first',
      rationale: 'Reduce overload, keep the next action obvious, and avoid answer dumping.',
    };
  }
  if (profile === 'boards_focused') {
    return {
      profile,
      tone: 'examiner-aware',
      depth: 'board-step discipline',
      pacing: 'direct but structured',
      rationale: 'Show where marks are earned or lost, not just whether the maths is valid.',
    };
  }
  if (profile === 'advanced_value_seeking') {
    return {
      profile,
      tone: 'direct and high-signal',
      depth: 'shortcut plus insight',
      pacing: 'fast route',
      rationale: 'Respect speed and reasoning depth while still keeping the route exam-safe.',
    };
  }
  if (profile === 'doubt_heavy') {
    return {
      profile,
      tone: 'reason-first',
      depth: 'clarify why',
      pacing: 'checkpoint style',
      rationale: 'Handle misconception pressure by explaining why the step works before moving on.',
    };
  }
  return {
    profile: 'weak_foundation',
    tone: 'simple and supportive',
    depth: 'concept-first',
    pacing: 'scaffolded',
    rationale: 'Use simpler language, one theorem at a time, then move to application.',
  };
}

function pickBlock(tutorObj, structuredDraft, key) {
  const nested = tutorObj && typeof tutorObj === 'object' ? tutorObj[key] : null;
  if (nested && typeof nested === 'object') return nested;
  const legacy = structuredDraft && typeof structuredDraft[key] === 'object' ? structuredDraft[key] : null;
  if (legacy && typeof legacy === 'object') return legacy;
  return {};
}

function buildDiagnosisBlock(tutorObj, structuredDraft, attemptLoop, payload, messages, mode) {
  const base = pickBlock(tutorObj, structuredDraft, 'diagnosis');
  const loopDiagnosis = attemptLoop?.diagnosis || {};
  const familyContext = inferFamilyContext(payload);
  const studentProfile = inferStudentProfile(payload, messages, mode);
  const helpMode = inferHelpMode(payload, mode, messages);
  const confusionType = inferConfusionType(payload, attemptLoop, mode, familyContext);
  const mistakeTags = Array.isArray(base.mistake_tags)
    ? base.mistake_tags
    : normalizeStringList(loopDiagnosis.mistake_tags);
  const misconceptionSummary = pickString(
    base.misconception_summary,
    loopDiagnosis.summary ||
      attemptLoop?.bsre?.brief ||
      attemptLoop?.bsre?.evaluation?.why ||
      ''
  );
  const confidence = normalizeConfidence(
    base.confidence || attemptLoop?.student_attempt?.confidence || loopDiagnosis.confidence
  );
  return {
    ...base,
    mistake_tags: mistakeTags,
    misconception_summary: misconceptionSummary,
    confidence,
    chapter: pickString(base.chapter, familyContext.topicKey),
    family_id: pickString(base.family_id, familyContext.familyId),
    family_label: pickString(base.family_label, familyContext.familyLabel),
    qtype_id: pickString(base.qtype_id, familyContext.qtypeId),
    theorem_focus:
      Array.isArray(base.theorem_focus) && base.theorem_focus.length
        ? base.theorem_focus
        : familyContext.theoremFocus,
    confusion_type: pickString(base.confusion_type, confusionType),
    help_mode: pickString(base.help_mode, helpMode),
    student_profile: pickString(base.student_profile, studentProfile),
    diagram_needed:
      typeof base.diagram_needed === 'boolean' ? base.diagram_needed : familyContext.diagramNeeded,
    summary_line: pickString(
      base.summary_line,
      buildSummaryLine(studentProfile, familyContext, confusionType)
    ),
  };
}

function buildSocraticBlock(mode, tutorObj, structuredDraft, attemptLoop) {
  const base = pickBlock(tutorObj, structuredDraft, 'socratic');
  let question = pickString(base.question, attemptLoop?.next_action?.prompt || '');
  if (!question) {
    question =
      mode === 'board_steps_ms'
        ? 'Which theorem or similarity criterion should you apply first?'
        : mode === 'solve_with_me'
          ? 'What is the key criterion that links the two triangles?'
          : 'What is the first clear step you would write for this problem?';
  }
  if (!question.endsWith('?')) question += '?';
  const expectedThought = pickString(
    base.expected_thought,
    attemptLoop?.rubric?.recommended_next?.micro_drill_prompt ||
      'Identify matching angles or sides, then state the criterion clearly.'
  );
  return {
    ...base,
    question,
    expected_thought: expectedThought,
  };
}

function buildHintContext(payload, attemptLoop, attemptText) {
  const status = String(attemptLoop?.diagnosis?.status || '').toLowerCase() || 'unclear';
  return {
    status,
    mistakeTags: normalizeStringList(attemptLoop?.diagnosis?.mistake_tags),
    attemptText: attemptText || '',
    topicKey: payload?.topicKey,
    questionText: payload?.questionText || payload?.question || payload?.prompt || '',
    theoremFocus: payload?.theoremFocus,
  };
}

function buildHintLadderBlock(payload, tutorObj, structuredDraft, attemptLoop, attemptText) {
  const base = pickBlock(tutorObj, structuredDraft, 'hint_ladder');
  let level = Number.isFinite(Number(base.level)) ? Number(base.level) : null;
  let hint = pickString(base.hint, '');
  let nextAction = pickString(base.next_action, '');

  const loopHint = attemptLoop?.hint_ladder;
  if (loopHint && typeof loopHint === 'object') {
    if (level == null) {
      const lastLevel = Number(loopHint?.last_hint?.level);
      level = Number.isFinite(lastLevel) ? lastLevel : Number(loopHint.level);
    }
    if (!hint) hint = pickString(loopHint?.last_hint?.text, '');
    if (!nextAction) {
      nextAction = loopHint.next_hint_available
        ? 'Request the next hint if still stuck.'
        : 'Try solving with this hint.';
    }
  }

  if (!hint) {
    const context = buildHintContext(payload, attemptLoop, attemptText);
    const state =
      payload && typeof payload.hintLadderState === 'object' && payload.hintLadderState
        ? payload.hintLadderState
        : initHintState();
    const computed = computeNextHint(state, context, true);
    if (level == null) {
      const computedLevel = Number(computed?.last_hint?.level);
      level = Number.isFinite(computedLevel) ? computedLevel : Number(computed.level);
    }
    hint = pickString(computed?.last_hint?.text, '');
    if (!nextAction) {
      nextAction = computed.next_hint_available
        ? 'Request the next hint if still stuck.'
        : 'Try solving with this hint.';
    }
  }

  if (!hint) hint = 'Start by stating the given data and the target result.';
  if (level == null || !Number.isFinite(level)) level = 0;
  if (!nextAction) nextAction = 'Try the hint and show the next step.';

  return {
    ...base,
    level,
    hint,
    next_action: nextAction,
  };
}

function normalizeBoardSteps(rawSteps, totalMarks) {
  if (!Array.isArray(rawSteps)) return [];
  const steps = rawSteps
    .map((step) => {
      if (typeof step === 'string') return { line: step, marks: null };
      if (!step || typeof step !== 'object') return null;
      return {
        line: pickString(step.line, step.text || step.step || ''),
        marks: step.marks ?? step.mark ?? step.points ?? step.score ?? null,
      };
    })
    .filter((step) => step && String(step.line || '').trim());

  if (!steps.length) return [];
  const marksTotal = Number.isFinite(totalMarks) && totalMarks > 0 ? totalMarks : 0;
  const perStep = marksTotal > 0 ? Number((marksTotal / steps.length).toFixed(1)) : 1;
  let remaining = marksTotal > 0 ? marksTotal : steps.length;
  return steps.map((step, idx) => {
    let marks = Number(step.marks);
    if (!Number.isFinite(marks)) {
      if (idx === steps.length - 1) {
        marks = Number(remaining.toFixed(1));
      } else {
        marks = perStep;
      }
    }
    remaining = Number((remaining - marks).toFixed(1));
    return { line: String(step.line || '').trim(), marks };
  });
}

function normalizeDeductions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const reason = pickString(item.reason, item.issue || '');
      const marksLost = Number(item.marks_lost ?? item.marksLost ?? item.marks ?? 0);
      if (!reason) return null;
      return { reason, marks_lost: Number.isFinite(marksLost) ? marksLost : 0 };
    })
    .filter(Boolean);
}

function buildBoardStepsBlock(mode, tutorObj, structuredDraft, payload, attemptLoop) {
  const base = pickBlock(tutorObj, structuredDraft, 'board_steps_ms');
  const totalMarksRaw =
    base.total_marks ??
    structuredDraft?.totalMarks ??
    payload?.totalMarks ??
    payload?.total_marks ??
    payload?.marks;
  const totalMarks = Number.isFinite(Number(totalMarksRaw)) && Number(totalMarksRaw) > 0 ? Number(totalMarksRaw) : 3;

  let steps = Array.isArray(base.steps) ? base.steps : null;
  if ((!steps || !steps.length) && mode === 'board_steps_ms' && Array.isArray(structuredDraft?.steps)) {
    steps = structuredDraft.steps;
  }
  let normalizedSteps = normalizeBoardSteps(steps, totalMarks);
  if (!normalizedSteps.length) {
    normalizedSteps = normalizeBoardSteps(
      [
        { line: 'State the given data and the target result.' },
        { line: 'Apply the correct theorem/criterion with a reason.' },
        { line: 'Conclude with the required statement.' },
      ],
      totalMarks
    );
  }

  const examinerNote = pickString(base.examiner_note, attemptLoop?.bsre?.brief || '');
  const deductions = normalizeDeductions(base.deductions);

  return {
    ...base,
    steps: normalizedSteps,
    total_marks: totalMarks,
    deductions,
    examiner_note: examinerNote,
  };
}

function buildNextBlock(tutorObj, structuredDraft, payload, attemptLoop, attemptText) {
  const base = pickBlock(tutorObj, structuredDraft, 'next');
  const familyContext = inferFamilyContext(payload);
  const status = String(attemptLoop?.diagnosis?.status || '').toLowerCase() || 'unclear';
  const mistakeTags = normalizeStringList(attemptLoop?.diagnosis?.mistake_tags);
  const rubric =
    attemptLoop?.rubric ||
    scoreRubric({
      status,
      mistakeTags,
      attemptText: attemptText || '',
      theoremFocus: payload?.theoremFocus,
    });

  const microDrill = pickString(
    base.micro_drill,
    rubric?.recommended_next?.micro_drill_prompt ||
      'State the criterion and write one proportionality step.'
  );
  const revisionHook = pickString(
    base.revision_hook,
    rubric?.recommended_next?.focus_skill
      ? `Review ${rubric.recommended_next.focus_skill} with 2 quick examples.`
      : 'Review the key criterion and correspondence once more.'
  );
  let suggestedPracticeIds = base.suggested_practice_ids;
  if (!Array.isArray(suggestedPracticeIds)) {
    const alt = payload?.suggestedPracticeIds || payload?.suggested_practice_ids;
    if (Array.isArray(alt)) suggestedPracticeIds = alt;
  }

  const nextBlock = {
    ...base,
    micro_drill: microDrill,
    revision_hook: revisionHook,
    chapter_step: pickString(base.chapter_step, familyContext.chapterStep),
    practice_next_label: pickString(
      base.practice_next_label,
      familyContext.familyLabel || 'Stay in this family'
    ),
    practice_next_reason: pickString(
      base.practice_next_reason,
      familyContext.familyLabel
        ? `After this explanation, do one more ${familyContext.familyLabel} question.`
        : 'Do one closely related practice question next.'
    ),
    practice_next_section: pickString(base.practice_next_section, familyContext.sectionFilter),
    practice_next_qtype_id: pickString(base.practice_next_qtype_id, familyContext.qtypeId),
  };
  if (Array.isArray(suggestedPracticeIds) && suggestedPracticeIds.length) {
    nextBlock.suggested_practice_ids = suggestedPracticeIds;
  }
  return nextBlock;
}

function orchestrateTutorResponse({ mode, payload, messages, structuredDraft }) {
  if (!structuredDraft || typeof structuredDraft !== 'object') return structuredDraft;
  const base = {
    ...structuredDraft,
    kind: structuredDraft.kind ?? 'tutor',
    finalAnswer: structuredDraft.finalAnswer ?? '',
  };
  let tutorObj = structuredDraft.tutor;
  if (typeof tutorObj === 'string') tutorObj = { text: tutorObj };
  if (Array.isArray(tutorObj)) tutorObj = { items: tutorObj };
  if (!tutorObj || typeof tutorObj !== 'object') tutorObj = {};

  const attemptLoop =
    structuredDraft.attempt_loop || structuredDraft.attemptLoop || tutorObj.attempt_loop || tutorObj.attemptLoop || null;
  const attemptText = extractAttemptText(payload, messages, attemptLoop);
  const familyContext = inferFamilyContext(payload);
  const studentProfile = inferStudentProfile(payload, messages, mode);

  tutorObj.diagnosis = buildDiagnosisBlock(
    tutorObj,
    structuredDraft,
    attemptLoop,
    payload,
    messages,
    mode
  );
  tutorObj.socratic = buildSocraticBlock(mode, tutorObj, structuredDraft, attemptLoop);
  tutorObj.hint_ladder = buildHintLadderBlock(payload, tutorObj, structuredDraft, attemptLoop, attemptText);
  tutorObj.board_steps_ms = buildBoardStepsBlock(mode, tutorObj, structuredDraft, payload, attemptLoop);
  tutorObj.next = buildNextBlock(tutorObj, structuredDraft, payload, attemptLoop, attemptText);
  tutorObj.board_tip = buildBoardTipBlock(payload, familyContext);
  tutorObj.common_mistake = buildCommonMistakeBlock(
    familyContext,
    tutorObj?.diagnosis?.confusion_type
  );
  tutorObj.practice_next = buildPracticeNextBlock(payload, familyContext);
  tutorObj.adaptive_style = buildAdaptiveStyleBlock(studentProfile);

  return { ...base, tutor: tutorObj };
}

module.exports = {
  orchestrateTutorResponse,
};
