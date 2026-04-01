const url = process.env.MENTOR_URL || `http://localhost:${process.env.MENTOR_PORT || 3001}/api/mentor`;

const payload = {
  subject: 'Maths',
  grade: 10,
  topicKey: 'triangles',
  chapter: 'triangles',
  section: 'learn',
  subSection: 'board-examples',
  explainType: 'board_examples',
  selectedTab: 'examples',
  selectedMode: 'learn_teach',
  mindmapNodeId: 'gAA',
  mindmapNodeTitle: 'AA similarity',
  mindmapNodeText: 'If two angles are equal, triangles are similar.',
  contextText: 'Board examples for AA similarity with CBSE exam language.',
  cardTitle: 'AA similarity',
  cardName: 'AA similarity',
  stepIndex: 0,
  vibe: 'beast',
};

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

  if (structured.kind === 'learn_mindmap') {
    console.error('FAIL: examples misrouted to learn_mindmap');
    process.exit(1);
  }

  const teach = structured.teach || {};
  const simple = Array.isArray(teach.simpleExplanation) ? teach.simpleExplanation : [];
  const exam = Array.isArray(teach.cbseExamSentence) ? teach.cbseExamSentence : [];
  const worked = Array.isArray(structured.workedExamples) ? structured.workedExamples : [];

  console.log('kind', structured.kind);
  console.log('simpleExplanation', simple.length);
  console.log('cbseExamSentence', exam.length);
  console.log('workedExamples', worked.length);

  const failures = [];
  if (structured.kind !== 'learn_teach') failures.push('kind must be learn_teach');
  if (simple.length < 4) failures.push('teach.simpleExplanation needs >= 4 items');
  if (exam.length < 2) failures.push('teach.cbseExamSentence needs >= 2 items');
  if (worked.length !== 2) failures.push('workedExamples must be exactly 2 items');

  if (failures.length) {
    console.error('FAIL', failures.join(' | '));
    process.exit(1);
  }

  console.log('PASS mentor-examples-smoke');
}

run();
