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
  const trace = json?.data?.trace || {};
  const hasStructured = Boolean(structured && typeof structured === 'object');
  const kind = structured?.kind || null;

  console.log('hasStructured', hasStructured);
  console.log('kind', kind);
  console.log('fallback_used', Boolean(trace?.fallback_used || structured?.fallback_used));
  console.log('repair_used', Boolean(trace?.repair_used));
  console.log('json_extracted', Boolean(trace?.json_extracted));

  if (!hasStructured || kind !== 'learn_teach') {
    console.error('No structured JSON returned:', json);
    process.exit(1);
  }
}

run();
