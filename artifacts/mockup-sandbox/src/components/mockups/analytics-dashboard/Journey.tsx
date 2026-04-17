import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const activityData = [
  { day: 'Mon', learn: 30, practice: 20, test: 0 },
  { day: 'Tue', learn: 45, practice: 40, test: 0 },
  { day: 'Wed', learn: 20, practice: 50, test: 30 },
  { day: 'Thu', learn: 60, practice: 20, test: 0 },
  { day: 'Fri', learn: 15, practice: 45, test: 45 },
  { day: 'Sat', learn: 80, practice: 60, test: 0 },
  { day: 'Sun', learn: 30, practice: 40, test: 60 },
];

type MasteryLevel = 'mastered' | 'needs_practice' | 'unseen';

interface Topic { name: string; mastery: MasteryLevel }

const mathsTopics: Topic[] = [
  { name: 'Real Numbers', mastery: 'mastered' },
  { name: 'Polynomials', mastery: 'mastered' },
  { name: 'Linear Eq.', mastery: 'needs_practice' },
  { name: 'Quadratic Eq.', mastery: 'needs_practice' },
  { name: 'AP', mastery: 'mastered' },
  { name: 'Triangles', mastery: 'unseen' },
  { name: 'Coordinates', mastery: 'mastered' },
  { name: 'Trigonometry', mastery: 'needs_practice' },
  { name: 'Apps of Trig', mastery: 'unseen' },
  { name: 'Circles', mastery: 'unseen' },
  { name: 'Constructions', mastery: 'unseen' },
  { name: 'Areas', mastery: 'needs_practice' },
  { name: 'Surface Areas', mastery: 'unseen' },
  { name: 'Statistics', mastery: 'mastered' },
  { name: 'Probability', mastery: 'mastered' },
];

const scienceTopics: Topic[] = [
  { name: 'Chemical Rxn', mastery: 'mastered' },
  { name: 'Acids Bases', mastery: 'needs_practice' },
  { name: 'Metals', mastery: 'mastered' },
  { name: 'Carbon', mastery: 'unseen' },
  { name: 'Periodic', mastery: 'unseen' },
  { name: 'Life Processes', mastery: 'mastered' },
  { name: 'Control Coord', mastery: 'needs_practice' },
  { name: 'Reproduction', mastery: 'unseen' },
  { name: 'Heredity', mastery: 'unseen' },
  { name: 'Light', mastery: 'needs_practice' },
  { name: 'Eye', mastery: 'mastered' },
  { name: 'Electricity', mastery: 'needs_practice' },
  { name: 'Magnetic', mastery: 'unseen' },
  { name: 'Environment', mastery: 'mastered' },
  { name: 'Nat Resources', mastery: 'mastered' },
];

const weakAreas = {
  maths: [
    { name: 'Linear Equations', action: 'Learn' },
    { name: 'Trigonometry', action: 'Practice' },
    { name: 'Areas', action: 'Take Test' },
  ],
  science: [
    { name: 'Acids & Bases', action: 'Learn' },
    { name: 'Light Reflection', action: 'Practice' },
    { name: 'Electricity', action: 'Take Test' },
  ],
};

const badges = [
  { name: 'Early Bird', icon: '🌅' },
  { name: 'Math Wizard', icon: '🧙‍♂️' },
  { name: '5 Day Streak', icon: '🔥' },
  { name: 'Test Ace', icon: '🎯' },
  { name: 'Night Owl', icon: '🦉' },
];

const actionStyle: Record<string, { bg: string; color: string }> = {
  Learn: { bg: '#fff3e0', color: '#e65100' },
  Practice: { bg: '#fce4ec', color: '#c62828' },
  'Take Test': { bg: '#fff8e1', color: '#f57f17' },
};

function DonutRing({ pct, color, label, sub }: { pct: number; color: string; label: string; sub: string }) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="#f5ebe0" strokeWidth="8" />
        <circle
          cx="38" cy="38" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 38 38)"
        />
        <text x="38" y="43" textAnchor="middle" style={{ fontSize: 14, fontWeight: 800, fill: '#431c1c' }}>{pct}%</text>
      </svg>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3a2a' }}>{label}</div>
      <div style={{ fontSize: 9, fontWeight: 600, color: '#a3715c', textAlign: 'center', lineHeight: 1.3 }}>{sub}</div>
    </div>
  );
}

function ProgressRing({ streak, accuracy }: { streak: number; accuracy: number }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const dash = (accuracy / 100) * circumference;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="136" height="136" viewBox="0 0 136 136">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        <circle cx="68" cy="68" r={r} fill="none" stroke="#f5ebe0" strokeWidth="10" />
        <circle
          cx="68" cy="68" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="10"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 68 68)"
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#431c1c', lineHeight: 1 }}>{accuracy}%</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#a3715c', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>accuracy</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#fb923c', marginTop: 6 }}>🔥 {streak} days</div>
      </div>
    </div>
  );
}

export function Journey() {
  const [subject, setSubject] = useState<'maths' | 'science'>('maths');
  const topics = subject === 'maths' ? mathsTopics : scienceTopics;
  const currentWeak = weakAreas[subject];

  const masteryEmoji = (m: MasteryLevel) =>
    m === 'mastered' ? '✅' : m === 'needs_practice' ? '🔄' : '⭕';
  const masteryTextColor = (m: MasteryLevel) =>
    m === 'mastered' ? '#5c3d11' : m === 'needs_practice' ? '#c45120' : '#9ca3af';
  const masteryBg = (m: MasteryLevel) =>
    m === 'mastered' ? '#fef9c3' : m === 'needs_practice' ? '#fff7ed' : '#f9fafb';
  const masteryBorder = (m: MasteryLevel) =>
    m === 'mastered' ? '#fde68a' : m === 'needs_practice' ? '#fed7aa' : '#e5e7eb';

  return (
    <div className="font-sans" style={{ width: 390, minHeight: 844, background: '#fffbf5', overflowY: 'auto', WebkitOverflowScrolling: 'touch' as const }}>

      {/* ── Header ── */}
      <div style={{ background: '#ffefe5', padding: '44px 20px 20px', borderRadius: '0 0 32px 32px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#431c1c', lineHeight: 1.1, fontFamily: 'Georgia, serif' }}>Hi, Kavya!</div>
            <div style={{ fontSize: 12, color: '#9a5c45', fontWeight: 600, marginTop: 4 }}>72 days left — let's go! 💪</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ffcdb2', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#8b3a3a' }}>KR</div>
        </div>

        {/* Hero: large circular progress ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <ProgressRing streak={5} accuracy={78} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: '#9a5c45', fontWeight: 600 }}>Your journey is looking beautiful today ✨</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '0 16px 40px' }}>

        {/* ── Activity Chart: smooth gradient area chart ── */}
        <section style={{ background: '#fff', borderRadius: 24, border: '1px solid #f5e0d0', padding: '16px 14px 12px', boxShadow: '0 2px 12px rgba(200,120,80,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#431c1c', fontFamily: 'Georgia, serif', marginBottom: 12 }}>This Week's Path 🗺️</div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="gLearn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fcd34d" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#fcd34d" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gPractice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb923c" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#fb923c" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gTest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fed7aa" strokeOpacity={0.4} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#c2410c', fontWeight: 600 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#c2410c', fontWeight: 600 }} />
                <Tooltip
                  cursor={{ stroke: '#fde68a', strokeWidth: 1 }}
                  contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.07)', background: '#fff' }}
                />
                <Area type="monotone" dataKey="learn" name="Learn" stroke="#fcd34d" strokeWidth={2} fill="url(#gLearn)" />
                <Area type="monotone" dataKey="practice" name="Practice" stroke="#fb923c" strokeWidth={2} fill="url(#gPractice)" />
                <Area type="monotone" dataKey="test" name="Test" stroke="#f43f5e" strokeWidth={2} fill="url(#gTest)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {[['Learn', '#fcd34d'], ['Practice', '#fb923c'], ['Test', '#f43f5e']].map(([l, c]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#9a5c45' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
              </div>
            ))}
          </div>
        </section>

        {/* ── Subject split: donut rings side by side ── */}
        <section style={{ background: '#fff', borderRadius: 24, border: '1px solid #f5e0d0', padding: '16px 20px', boxShadow: '0 2px 12px rgba(200,120,80,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#431c1c', fontFamily: 'Georgia, serif', marginBottom: 16 }}>Subject Mastery 🎓</div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <DonutRing pct={47} color="#fb923c" label="Maths" sub="7 of 15 mastered" />
            <DonutRing pct={33} color="#f43f5e" label="Science" sub="5 of 15 mastered" />
          </div>
        </section>

        {/* ── Knowledge Map with emoji icons ── */}
        <section style={{ background: '#fff', borderRadius: 24, border: '1px solid #f5e0d0', padding: '16px 14px', boxShadow: '0 2px 12px rgba(200,120,80,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#431c1c', fontFamily: 'Georgia, serif' }}>Knowledge Map 🧭</div>
            <div style={{ background: '#fff3e0', borderRadius: 100, padding: 3, display: 'flex' }}>
              {(['maths', 'science'] as const).map(s => (
                <button key={s} onClick={() => setSubject(s)} style={{
                  padding: '5px 14px', borderRadius: 100, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: subject === s ? '#fff' : 'transparent',
                  color: subject === s ? '#c45120' : '#a37060',
                  boxShadow: subject === s ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                }}>{s === 'maths' ? 'Maths' : 'Science'}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {topics.map((t, i) => (
              <div key={i} style={{
                background: masteryBg(t.mastery),
                border: `1px solid ${masteryBorder(t.mastery)}`,
                borderRadius: 12, padding: '7px 6px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 16 }}>{masteryEmoji(t.mastery)}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: masteryTextColor(t.mastery), lineHeight: 1.3 }}>{t.name}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
            {[['✅', 'Mastered'], ['🔄', 'Review'], ['⭕', 'Unseen']].map(([e, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#9a5c45' }}>
                <span>{e}</span>{l}
              </div>
            ))}
          </div>
        </section>

        {/* ── Focus Areas ── */}
        <section style={{ background: '#fff', borderRadius: 24, border: '1px solid #f5e0d0', padding: '16px 14px', boxShadow: '0 2px 12px rgba(200,120,80,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#431c1c', fontFamily: 'Georgia, serif', marginBottom: 12 }}>Needs a little love 💛</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentWeak.map((a, i) => {
              const s = actionStyle[a.action];
              return (
                <div key={i} style={{ borderRadius: 18, border: '1px solid #f5e0d0', background: '#fffbf5', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#fb923c', borderRadius: '18px 0 0 18px' }} />
                  <div style={{ paddingLeft: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#431c1c' }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: '#9a5c45', fontWeight: 600, marginTop: 2 }}>Needs a little more love 🌱</div>
                  </div>
                  <button style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                    {a.action}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Badges / Passport Stamps ── */}
        <section style={{ background: '#fff', borderRadius: 24, border: '1px solid #f5e0d0', padding: '16px 14px', boxShadow: '0 2px 12px rgba(200,120,80,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#431c1c', fontFamily: 'Georgia, serif', marginBottom: 12 }}>Passport Stamps 🌟</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {badges.map((b, i) => (
              <div key={i} style={{ flexShrink: 0, width: 88, height: 96, borderRadius: 20, background: '#fff8f0', border: '1px solid #fed7aa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ fontSize: 28 }}>{b.icon}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#6b3a2a', textAlign: 'center', lineHeight: 1.3, padding: '0 6px' }}>{b.name}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
