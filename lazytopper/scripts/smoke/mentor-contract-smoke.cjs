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

  const teach = structured.teach || {};
  const conceptCount = Array.isArray(teach.conceptBullets) ? teach.conceptBullets.length : 0;
  const examCount = Array.isArray(teach.examLines) ? teach.examLines.length : 0;
  const steps = Array.isArray(structured.workedExample?.steps) ? structured.workedExample.steps : [];
  const diagramTypePresent = Boolean(structured.diagramType);

  console.log('kind', structured.kind);
  console.log('conceptBullets', conceptCount);
  console.log('examLines', examCount);
  console.log('steps', steps.length);
  console.log('diagramRequired', structured.diagramRequired, 'diagramTypePresent', diagramTypePresent);
  if (structured.fallback_used) {
    console.log('fallback_used', structured.fallback_used);
  }

  const failures = [];
  if (structured.kind !== 'learn_teach') failures.push('kind must be learn_teach');
  if (conceptCount < 3) failures.push('teach.conceptBullets needs >= 3 items');
  if (examCount < 2) failures.push('teach.examLines needs >= 2 items');
  if (!String(structured.workedExample?.question || '').trim()) failures.push('workedExample.question missing');
  if (steps.length < 2) failures.push('workedExample.steps needs >= 2 items');
  if (!String(structured.workedExample?.finalAnswer || '').trim()) failures.push('workedExample.finalAnswer missing');
  if (typeof structured.diagramRequired !== 'boolean') failures.push('diagramRequired must be boolean');
  if (structured.diagramRequired && !diagramTypePresent && !structured.diagramSpec) {
    failures.push('diagram required but no diagramType/diagramSpec');
  }

  if (failures.length) {
    console.error('FAIL', failures.join(' | '));
    process.exit(1);
  }
  console.log('PASS mentor-contract-smoke');
}

run();
