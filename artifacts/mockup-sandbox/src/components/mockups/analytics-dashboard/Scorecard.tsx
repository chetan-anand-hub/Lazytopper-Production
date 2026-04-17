import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Flame, CalendarDays, BookOpen, PenTool, Target } from 'lucide-react';

const activityData = [
  { name: 'Mon', learn: 45, practice: 20, test: 0 },
  { name: 'Tue', learn: 30, practice: 40, test: 0 },
  { name: 'Wed', learn: 20, practice: 30, test: 45 },
  { name: 'Thu', learn: 60, practice: 10, test: 0 },
  { name: 'Fri', learn: 15, practice: 50, test: 0 },
  { name: 'Sat', learn: 0, practice: 60, test: 60 },
  { name: 'Sun', learn: 40, practice: 40, test: 20 },
];

const mathsTopics = [
  { name: 'Real Numbers', status: 'mastered' },
  { name: 'Polynomials', status: 'mastered' },
  { name: 'Lin. Eqs.', status: 'mastered' },
  { name: 'Quad. Eqs.', status: 'needs_practice' },
  { name: 'Arith. Prog.', status: 'mastered' },
  { name: 'Triangles', status: 'needs_practice' },
  { name: 'Coord. Geo.', status: 'unseen' },
  { name: 'Trigonometry', status: 'needs_practice' },
  { name: 'Apps of Trig', status: 'unseen' },
  { name: 'Circles', status: 'mastered' },
  { name: 'Constructions', status: 'unseen' },
  { name: 'Areas & Circles', status: 'mastered' },
  { name: 'Surface Areas', status: 'needs_practice' },
  { name: 'Statistics', status: 'mastered' },
  { name: 'Probability', status: 'mastered' },
];

const scienceTopics = [
  { name: 'Chem. Reactions', status: 'mastered' },
  { name: 'Acids & Bases', status: 'mastered' },
  { name: 'Metals', status: 'needs_practice' },
  { name: 'Carbon', status: 'unseen' },
  { name: 'Periodic', status: 'unseen' },
  { name: 'Life Processes', status: 'mastered' },
  { name: 'Control & Coord', status: 'needs_practice' },
  { name: 'Reproduction', status: 'unseen' },
  { name: 'Heredity', status: 'needs_practice' },
  { name: 'Light', status: 'mastered' },
  { name: 'Human Eye', status: 'mastered' },
  { name: 'Electricity', status: 'needs_practice' },
  { name: 'Magnetic', status: 'unseen' },
  { name: 'Environment', status: 'mastered' },
  { name: 'Nat. Resources', status: 'mastered' },
];

const weakAreas = {
  maths: [
    { topic: 'Trigonometry', gap: 'Concept Gap', action: 'Learn', icon: BookOpen },
    { topic: 'Surface Areas', gap: 'Speed Issue', action: 'Practice', icon: PenTool },
    { topic: 'Quadratic Roots', gap: 'Accuracy', action: 'Take Test', icon: Target },
  ],
  science: [
    { topic: 'Carbon Compounds', gap: 'Concept Gap', action: 'Learn', icon: BookOpen },
    { topic: 'Electricity', gap: 'Speed Issue', action: 'Practice', icon: PenTool },
    { topic: 'Heredity', gap: 'Accuracy', action: 'Take Test', icon: Target },
  ],
};

const badges = [
  { name: 'No Zero Week', emoji: '🗓️' },
  { name: 'Math Whiz', emoji: '⚡' },
  { name: 'Top 10%', emoji: '🏆' },
  { name: 'Flawless', emoji: '✨' },
  { name: 'Night Owl', emoji: '💎' },
];

const actionColors: Record<string, { border: string; text: string; btn: string }> = {
  Learn: { border: 'border-cyan-500/40', text: 'text-cyan-400', btn: 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' },
  Practice: { border: 'border-orange-500/40', text: 'text-orange-400', btn: 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30' },
  'Take Test': { border: 'border-pink-500/40', text: 'text-pink-400', btn: 'bg-pink-500/20 text-pink-300 hover:bg-pink-500/30' },
};

export function Scorecard() {
  const [subject, setSubject] = useState<'maths' | 'science'>('maths');
  const topics = subject === 'maths' ? mathsTopics : scienceTopics;
  const currentWeak = weakAreas[subject];

  return (
    <div
      className="font-sans text-slate-200 overflow-y-auto overflow-x-hidden"
      style={{ width: 390, minHeight: 844, background: '#0B0E1C', WebkitOverflowScrolling: 'touch' }}
    >
      {/* ── Header ── */}
      <header style={{ padding: '44px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 16, color: '#fff',
            boxShadow: '0 0 14px rgba(6,182,212,0.55)',
          }}>AM</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>Arjun Mehta</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Class 10 · CBSE 2026</div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#f43f5e', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 8, padding: '4px 8px' }}>
          72 days left
        </div>
      </header>

      {/* ── Hero Strip: 3 oversized numbers ── */}
      <div style={{ display: 'flex', gap: 8, margin: '0 20px 24px' }}>
        <div style={{ flex: 1, background: 'rgba(249,115,22,0.13)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#fb923c', lineHeight: 1, letterSpacing: '-1px' }}>14🔥</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#fb923c', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Day Streak</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#22d3ee', lineHeight: 1, letterSpacing: '-1px' }}>347</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#22d3ee', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Questions</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(163,230,53,0.12)', border: '1px solid rgba(163,230,53,0.3)', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#a3e635', lineHeight: 1, letterSpacing: '-1px' }}>82%</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#a3e635', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Accuracy</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 20px 40px' }}>

        {/* ── Subject Split Cards ── */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Maths', mastered: 7, total: 15, acc: 72, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.3)' },
            { label: 'Science', mastered: 5, total: 15, acc: 68, color: '#a3e635', bg: 'rgba(163,230,53,0.1)', border: 'rgba(163,230,53,0.3)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '14px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-1px', marginBottom: 4 }}>{s.mastered}<span style={{ fontSize: 13, color: s.color, fontWeight: 700 }}>/{s.total}</span></div>
              <div style={{ fontSize: 9, color: s.color, fontWeight: 600, marginBottom: 10 }}>topics mastered</div>
              <div style={{ height: 4, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.acc}%`, background: s.color, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, marginTop: 4 }}>{s.acc}% accuracy</div>
            </div>
          ))}
        </div>

        {/* ── Activity Chart ── */}
        <section>
          <SectionLabel>Combat Log</SectionLabel>
          <div style={{ background: '#111828', borderRadius: 16, border: '1px solid #1e293b', padding: '16px 12px 12px' }}>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', marginBottom: 8 }}>
              {[['Learn', '#06b6d4'], ['Practice', '#a3e635'], ['Test', '#ec4899']].map(([label, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />{label}
                </div>
              ))}
            </div>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barGap={2} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.5 }}
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                    itemStyle={{ fontSize: 11, fontWeight: 700 }}
                  />
                  <Bar dataKey="learn" name="Learn" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={10} />
                  <Bar dataKey="practice" name="Practice" fill="#a3e635" radius={[3, 3, 0, 0]} maxBarSize={10} />
                  <Bar dataKey="test" name="Test" fill="#ec4899" radius={[3, 3, 0, 0]} maxBarSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Subject Toggle + Mastery Grid ── */}
        <section>
          <div style={{ display: 'flex', background: '#111828', borderRadius: 10, border: '1px solid #1e293b', padding: 4, marginBottom: 14, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 4, bottom: 4,
              left: subject === 'maths' ? 4 : '50%',
              width: 'calc(50% - 4px)',
              background: '#1e293b', borderRadius: 7,
              transition: 'left 0.25s ease',
            }} />
            {(['maths', 'science'] as const).map(s => (
              <button key={s} onClick={() => setSubject(s)} style={{
                flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'none', border: 'none', cursor: 'pointer', position: 'relative', zIndex: 1,
                color: subject === s ? '#fff' : '#475569',
                transition: 'color 0.2s',
              }}>{s}</button>
            ))}
          </div>

          <SectionLabel>Mastery Matrix</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {topics.map((t, i) => {
              const bg = t.status === 'mastered' ? 'rgba(163,230,53,0.12)' : t.status === 'needs_practice' ? 'rgba(249,115,22,0.12)' : '#111828';
              const border = t.status === 'mastered' ? 'rgba(163,230,53,0.35)' : t.status === 'needs_practice' ? 'rgba(249,115,22,0.35)' : '#1e293b';
              const dot = t.status === 'mastered' ? '#a3e635' : t.status === 'needs_practice' ? '#fb923c' : '#334155';
              return (
                <div key={i} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '8px 6px', minHeight: 56, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, alignSelf: 'flex-end', boxShadow: t.status !== 'unseen' ? `0 0 5px ${dot}` : 'none' }} />
                  <div style={{ fontSize: 9, fontWeight: 700, color: t.status === 'mastered' ? '#d9f99d' : t.status === 'needs_practice' ? '#fed7aa' : '#475569', lineHeight: 1.3 }}>{t.name}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Weak Areas ── */}
        <section>
          <SectionLabel>Priority Targets</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {currentWeak.map((a, i) => {
              const c = actionColors[a.action];
              return (
                <div key={i} style={{ background: '#111828', border: `1px solid ${c.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <a.icon style={{ width: 16, height: 16 }} className={c.text} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{a.topic}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }} className={c.text}>{a.gap}</div>
                    </div>
                  </div>
                  <button style={{ fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }} className={c.btn}>{a.action}</button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Badges ── */}
        <section>
          <SectionLabel>Achievements</SectionLabel>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, margin: '0 -20px', padding: '0 20px' }}>
            {badges.map((b, i) => (
              <div key={i} style={{ flexShrink: 0, width: 80, height: 88, background: '#111828', border: '1px solid #1e293b', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <div style={{ fontSize: 26 }}>{b.emoji}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textAlign: 'center', lineHeight: 1.3, padding: '0 4px' }}>{b.name}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
      {children}
    </div>
  );
}
