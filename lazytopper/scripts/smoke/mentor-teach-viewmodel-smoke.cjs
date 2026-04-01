const url = process.env.MENTOR_URL || `http://localhost:${process.env.MENTOR_PORT || 3001}/api/mentor`;

const payload = {
  subject: 'Maths',
  grade: 10,
  topicKey: 'triangles',
  chapter: 'triangles',
  section: 'learn',
  subSection: 'teach',
  explainType: 'teach',
  selectedTab: 'teach',
  selectedMode: 'learn_teach',
  mindmapNodeId: 'gAA',
  mindmapNodeTitle: 'AA similarity',
  mindmapNodeText: 'If two angles are equal, triangles are similar.',
  contextText: 'Teach AA similarity with CBSE exam language.',
  cardTitle: 'AA similarity',
  cardName: 'AA similarity',
  stepIndex: 0,
  vibe: 'beast',
};

function toStringList(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : [];
}

function normalizeTeach(structured) {
  if (!structured || typeof structured !== 'object') return null;

  if (Array.isArray(structured.conceptBullets) || Array.isArray(structured.examLines) || structured.workedExample) {
    const worked = structured.workedExample || {};
    const steps = Array.isArray(worked.steps) ? worked.steps : [];
    return {
      conceptBullets: toStringList(structured.conceptBullets),
      examLines: toStringList(structured.examLines),
      workedExample: {
        question: String(worked.question || '').trim(),
        steps,
        finalAnswer: String(worked.finalAnswer || worked.answer || '').trim(),
      },
      commonError: String(structured.commonError || '').trim(),
      commonFix: String(structured.commonFix || '').trim(),
      checkQuestion: String(structured.checkQuestion || '').trim(),
    };
  }

  if (structured.kind === 'learn_teach' && structured.teach) {
    const teach = structured.teach || {};
    if (Array.isArray(teach.conceptBullets) || Array.isArray(teach.examLines)) {
      const worked = structured.workedExample || {};
      const steps = Array.isArray(worked.steps) ? worked.steps : [];
      return {
        conceptBullets: toStringList(teach.conceptBullets),
        examLines: toStringList(teach.examLines),
        workedExample: {
          question: String(worked.question || '').trim(),
          steps,
          finalAnswer: String(worked.finalAnswer || worked.answer || '').trim(),
        },
        commonError: String(structured.commonError || '').trim(),
        commonFix: String(structured.commonFix || '').trim(),
        checkQuestion: String(structured.checkQuestion || '').trim(),
      };
    }
  }

  if (structured.kind === 'learn_mindmap' && structured.tutor) {
    const t = structured.tutor;
    const conceptBullets = [];
    if (Array.isArray(t.bullets)) conceptBullets.push(...t.bullets.filter(Boolean));
    if (t.hint_ladder?.hint) conceptBullets.push(t.hint_ladder.hint);
    if (Array.isArray(t.board_steps_ms?.steps)) {
      conceptBullets.push(...t.board_steps_ms.steps.map((s) => s?.line).filter(Boolean));
    }
    const examLines = [];
    if (Array.isArray(t.exam_lines)) examLines.push(...t.exam_lines.filter(Boolean));
    if (Array.isArray(t.board_checks)) examLines.push(...t.board_checks.map((c) => c?.line).filter(Boolean));
    const workedExample = {
      question: String(t.next?.micro_drill || '').trim(),
      steps: Array.isArray(t.mini_example?.steps) ? t.mini_example.steps : [],
      finalAnswer: String(t.mini_example?.answer || '').trim(),
    };
    return {
      conceptBullets,
      examLines,
      workedExample,
      commonError: String(t.diagnosis?.misconception_summary || '').trim(),
      commonFix: String(t.next?.micro_drill || t.next?.revision_hook || '').trim(),
      checkQuestion: String(t.socratic?.question || '').trim(),
    };
  }

  if (structured.kind === 'learn_teach' && structured.teach) {
    const teach = structured.teach || {};
    if (Array.isArray(teach.simpleExplanation) || Array.isArray(teach.cbseExamSentence)) {
      const workedExamples = Array.isArray(structured.workedExamples) ? structured.workedExamples : [];
      const firstWorked = workedExamples[0] || {};
      const steps = Array.isArray(firstWorked.steps) ? firstWorked.steps : [];
      return {
        conceptBullets: toStringList(teach.simpleExplanation),
        examLines: toStringList(teach.cbseExamSentence),
        workedExample: {
          question: String(firstWorked.question || '').trim(),
          steps,
          finalAnswer: String(firstWorked.finalAnswer || '').trim(),
        },
        commonError: String((structured.commonMistakes || [])[0] || '').trim(),
        commonFix: String((structured.commonMistakes || [])[1] || '').trim(),
        checkQuestion: String(structured.checkQuestion || '').trim(),
      };
    }
  }

  return null;
}

async function run() {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'learn_teach', payload }),
    });
  } catch (err) {
    console.error('Request failed:', err?.message || err);
    process.exit(1);
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    console.error('Invalid JSON response:', err?.message || err);
    process.exit(1);
  }

  console.log('status', res.status);
  if (!res.ok) {
    console.error('error', json?.error || json);
    process.exit(1);
  }

  const structured = json?.data?.structured;
  if (!structured) {
    console.error('No structured response:', json);
    process.exit(1);
  }

  const normalized = normalizeTeach(structured);
  if (!normalized) {
    console.error('FAIL: could not normalize teach response');
    process.exit(1);
  }

  const bullets = Array.isArray(normalized.conceptBullets) ? normalized.conceptBullets : [];
  const examLines = Array.isArray(normalized.examLines) ? normalized.examLines : [];
  const worked = normalized.workedExample || {};
  const steps = Array.isArray(worked.steps) ? worked.steps : [];

  console.log('bullets', bullets.length);
  console.log('examLines', examLines.length);
  console.log('steps', steps.length);

  const failures = [];
  if (bullets.length < 3) failures.push('conceptBullets needs >= 3 items');
  if (examLines.length < 2) failures.push('examLines needs >= 2 items');
  if (!String(worked.question || '').trim()) failures.push('workedExample.question missing');
  if (steps.length < 2) failures.push('workedExample.steps needs >= 2 items');
  if (!String(worked.finalAnswer || '').trim()) failures.push('workedExample.finalAnswer missing');
  if (!String(normalized.commonError || '').trim()) failures.push('commonError missing');
  if (!String(normalized.commonFix || '').trim()) failures.push('commonFix missing');
  if (!String(normalized.checkQuestion || '').trim()) failures.push('checkQuestion missing');

  if (failures.length) {
    console.error('FAIL', failures.join(' | '));
    process.exit(1);
  }

  console.log('PASS mentor-teach-viewmodel-smoke');
}

run();
