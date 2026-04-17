import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label
} from 'recharts';
import { Flame, Calendar, Settings, BookOpen, PenTool, FileText, Trophy, Zap, TrendingUp, Award, Star, ChevronDown, ChevronUp } from 'lucide-react';

// ── Mock activity data per time range ──────────────────────────────────────
const ACTIVITY_DATA: Record<string, { name: string; Learn: number; Practice: number; Test: number }[]> = {
  '7D': [
    { name: 'Mon', Learn: 45, Practice: 30, Test: 0 },
    { name: 'Tue', Learn: 30, Practice: 45, Test: 0 },
    { name: 'Wed', Learn: 60, Practice: 20, Test: 30 },
    { name: 'Thu', Learn: 20, Practice: 60, Test: 0 },
    { name: 'Fri', Learn: 40, Practice: 40, Test: 45 },
    { name: 'Sat', Learn: 15, Practice: 90, Test: 60 },
    { name: 'Sun', Learn: 0, Practice: 30, Test: 90 },
  ],
  '4W': [
    { name: 'Wk 1', Learn: 180, Practice: 120, Test: 30 },
    { name: 'Wk 2', Learn: 210, Practice: 160, Test: 45 },
    { name: 'Wk 3', Learn: 150, Practice: 200, Test: 90 },
    { name: 'Wk 4', Learn: 250, Practice: 180, Test: 120 },
  ],
  '3M': [
    { name: 'Feb', Learn: 420, Practice: 310, Test: 80 },
    { name: 'Mar', Learn: 680, Practice: 490, Test: 180 },
    { name: 'Apr', Learn: 590, Practice: 620, Test: 290 },
  ],
  'All': [
    { name: 'Jan', Learn: 120, Practice: 80, Test: 0 },
    { name: 'Feb', Learn: 420, Practice: 310, Test: 80 },
    { name: 'Mar', Learn: 680, Practice: 490, Test: 180 },
    { name: 'Apr', Learn: 590, Practice: 620, Test: 290 },
  ],
};

// ── Topic data with per-topic progress breakdown ────────────────────────────
interface Topic {
  name: string;
  status: 'mastered' | 'needs_practice' | 'learning' | 'unseen';
  learnPct: number;
  practicePct: number;
  masteryPct: number;
}

const mathsTopics: Topic[] = [
  { name: 'Real Numbers',     status: 'mastered',       learnPct: 100, practicePct: 91, masteryPct: 95 },
  { name: 'Polynomials',      status: 'mastered',       learnPct: 100, practicePct: 88, masteryPct: 90 },
  { name: 'Linear Eq.',       status: 'mastered',       learnPct: 100, practicePct: 84, masteryPct: 87 },
  { name: 'Quadratic Eq.',    status: 'needs_practice', learnPct:  70, practicePct: 55, masteryPct: 48 },
  { name: 'Arith. Prog.',     status: 'mastered',       learnPct: 100, practicePct: 79, masteryPct: 82 },
  { name: 'Triangles',        status: 'needs_practice', learnPct:  50, practicePct: 48, masteryPct: 32 },
  { name: 'Coord. Geo.',      status: 'mastered',       learnPct: 100, practicePct: 82, masteryPct: 85 },
  { name: 'Trigonometry',     status: 'needs_practice', learnPct:  40, practicePct: 52, masteryPct: 28 },
  { name: 'Apps of Trig',     status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Circles',          status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Constructions',    status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Areas & Circles',  status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Surface Areas',    status: 'needs_practice', learnPct:  30, practicePct: 43, masteryPct: 20 },
  { name: 'Statistics',       status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Probability',      status: 'mastered',       learnPct:  90, practicePct: 77, masteryPct: 80 },
];

const scienceTopics: Topic[] = [
  { name: 'Chem Reactions',   status: 'mastered',       learnPct: 100, practicePct: 86, masteryPct: 88 },
  { name: 'Acids & Bases',    status: 'needs_practice', learnPct:  60, practicePct: 61, masteryPct: 44 },
  { name: 'Metals & Non',     status: 'mastered',       learnPct: 100, practicePct: 80, masteryPct: 83 },
  { name: 'Carbon Comp.',     status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Periodic Class.',  status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Life Processes',   status: 'mastered',       learnPct: 100, practicePct: 90, masteryPct: 92 },
  { name: 'Control & Coord',  status: 'needs_practice', learnPct:  50, practicePct: 57, masteryPct: 38 },
  { name: 'Reproduction',     status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Heredity',         status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Light Reflec.',    status: 'needs_practice', learnPct:  35, practicePct: 49, masteryPct: 25 },
  { name: 'Human Eye',        status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Electricity',      status: 'needs_practice', learnPct:  40, practicePct: 44, masteryPct: 22 },
  { name: 'Magnetic',         status: 'unseen',         learnPct:   0, practicePct:  0, masteryPct:  0 },
  { name: 'Environment',      status: 'mastered',       learnPct:  95, practicePct: 78, masteryPct: 80 },
  { name: 'Nat. Resources',   status: 'mastered',       learnPct:  90, practicePct: 72, masteryPct: 75 },
];

// ── Weak areas with mistake type ────────────────────────────────────────────
const weakAreas = [
  {
    rank: 1,
    topic: 'Triangles',
    subject: 'Maths',
    acc: 48,
    mistakeType: 'Concept Gap' as const,
    mistakeColor: '#ef4444',
    mistakeBg: '#fef2f2',
  },
  {
    rank: 2,
    topic: 'Electricity',
    subject: 'Science',
    acc: 44,
    mistakeType: 'Concept Gap' as const,
    mistakeColor: '#ef4444',
    mistakeBg: '#fef2f2',
  },
  {
    rank: 3,
    topic: 'Light Reflection',
    subject: 'Science',
    acc: 49,
    mistakeType: 'Accuracy' as const,
    mistakeColor: '#f59e0b',
    mistakeBg: '#fffbeb',
  },
];

const subjectStats = {
  maths:   { mastered: 7, total: 15, acc: 72 },
  science: { mastered: 5, total: 15, acc: 68 },
};

const badges = [
  { name: '9-Day Streak',   Icon: Flame,     color: 'text-orange-500', bg: 'bg-orange-50 border-orange-100' },
  { name: 'Maths Whiz',     Icon: Award,     color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100' },
  { name: 'Quick Learner',  Icon: Zap,       color: 'text-amber-500',  bg: 'bg-amber-50 border-amber-100'  },
  { name: 'Top 10%',        Icon: TrendingUp,color: 'text-emerald-500',bg: 'bg-emerald-50 border-emerald-100'},
  { name: 'Science Pro',    Icon: Star,      color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-100'    },
];

// ── Mini progress bar helper ────────────────────────────────────────────────
function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] font-semibold mb-0.5" style={{ color: '#94a3b8' }}>
        <span>{label}</span><span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Custom tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: 'none', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>
      <div style={{ color: '#64748b', marginBottom: 4, fontWeight: 700 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.fill, marginBottom: 2 }}>{p.name}: {p.value} Qs</div>
      ))}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
type Range = '7D' | '4W' | '3M' | 'All';
const RANGES: Range[] = ['7D', '4W', '3M', 'All'];

export function Dashboard() {
  const [range, setRange]             = useState<Range>('7D');
  const [subject, setSubject]         = useState<'maths' | 'science'>('maths');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [expandedWeak, setExpandedWeak]   = useState<number | null>(null);

  const topics = subject === 'maths' ? mathsTopics : scienceTopics;
  const stats  = subjectStats[subject];
  const chartData = ACTIVITY_DATA[range];

  const statusDot = (s: string) =>
    s === 'mastered' ? '#10b981' : s === 'needs_practice' ? '#f59e0b' : s === 'learning' ? '#6366f1' : '#cbd5e1';

  const toggleTopic = (name: string) => setExpandedTopic(p => p === name ? null : name);
  const toggleWeak  = (idx: number)  => setExpandedWeak(p => p === idx ? null : idx);

  return (
    <div className="font-sans bg-slate-50" style={{ width: 390, minHeight: 844, overflowY: 'auto' }}>

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 px-5" style={{ paddingTop: 44, paddingBottom: 16 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-base font-bold">PS</div>
            <div>
              <div className="text-lg font-bold text-slate-900 leading-tight">Priya Sharma</div>
              <div className="text-xs text-slate-500 font-medium">Class 10 · CBSE</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <div>
                <div className="text-base font-black text-rose-600 leading-none">72</div>
                <div className="text-[9px] text-rose-500 font-semibold uppercase tracking-wide leading-tight">days left</div>
              </div>
            </div>
            <button className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
              <Settings className="w-4.5 h-4.5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-sm font-bold text-slate-900">9 day streak</span>
          </div>
          <div className="text-xs text-slate-400">·</div>
          <div className="text-xs text-slate-500 font-medium">347 questions · 82% accuracy</div>
        </div>
      </header>

      <div className="flex flex-col gap-5 p-5 pb-10">

        {/* ── Activity Chart ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-slate-900">Activity</div>
            {/* Range toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
              {RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${range === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {/* Legend */}
          <div className="flex gap-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            {[['Learn', '#4f46e5'], ['Practice', '#0ea5e9'], ['Test', '#8b5cf6']].map(([l, c]) => (
              <div key={l} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{l}
              </div>
            ))}
          </div>
          <div style={{ height: 175 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 16 }} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={30}>
                  <Label value="Questions" angle={-90} position="insideLeft" offset={12} style={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 700, textAnchor: 'middle' }} />
                </YAxis>
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="Learn"    fill="#4f46e5" radius={[3, 3, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Practice" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Test"     fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Subject Cards ── */}
        <div className="flex gap-3">
          {(['maths', 'science'] as const).map(s => {
            const st = subjectStats[s];
            const pct = Math.round((st.mastered / st.total) * 100);
            return (
              <div key={s} className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">{s === 'maths' ? 'Maths' : 'Science'}</div>
                  <div className="text-[10px] font-semibold text-slate-400">{st.mastered}/{st.total}</div>
                </div>
                <div className="text-2xl font-black text-slate-900 leading-none mb-1">{pct}%</div>
                <div className="text-[10px] text-slate-400 font-medium mb-3">mastered</div>
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-0.5"><span>Accuracy</span><span>{st.acc}%</span></div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${st.acc}%`, background: s === 'maths' ? '#4f46e5' : '#0ea5e9' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Syllabus Mastery — Expandable chips ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-slate-900">Syllabus Mastery</div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              {(['maths', 'science'] as const).map(s => (
                <button key={s} onClick={() => { setSubject(s); setExpandedTopic(null); }}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${subject === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                  {s === 'maths' ? 'Maths' : 'Science'}
                </button>
              ))}
            </div>
          </div>

          {/* Chip grid */}
          <div className="flex flex-wrap gap-2">
            {topics.map((t, i) => {
              const isOpen = expandedTopic === t.name;
              const dotColor = statusDot(t.status);
              return (
                <div key={i} className="w-full">
                  <button
                    onClick={() => toggleTopic(t.name)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all text-left ${
                      isOpen ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                      <span className="text-[12px] font-semibold text-slate-800 truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {t.masteryPct > 0 && (
                        <span className="text-[10px] font-bold" style={{ color: dotColor }}>{t.masteryPct}%</span>
                      )}
                      {isOpen
                        ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                      }
                    </div>
                  </button>

                  {/* Expanded breakdown */}
                  {isOpen && (
                    <div className="mx-1 mt-0.5 mb-1 bg-white border border-indigo-100 rounded-xl px-4 py-3 space-y-2">
                      <MiniBar label="Learn progress"    pct={t.learnPct}    color="#4f46e5" />
                      <MiniBar label="Practice accuracy" pct={t.practicePct} color="#0ea5e9" />
                      <MiniBar label="Mastery"           pct={t.masteryPct}  color="#10b981" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Mastered</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Review</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />Learning</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />Unseen</div>
          </div>
        </section>

        {/* ── Weak Spots — Expandable with mistake type + 3 CTAs ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="text-sm font-bold text-slate-900 mb-4">Top Focus Areas</div>
          <div className="space-y-3">
            {weakAreas.map((a, i) => {
              const isOpen = expandedWeak === i;
              return (
                <div key={i} className="rounded-xl border border-slate-100 overflow-hidden">
                  {/* Card header */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50/60">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-black flex-shrink-0">#{a.rank}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{a.subject}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: a.mistakeColor, background: a.mistakeBg }}>
                          {a.mistakeType}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate">{a.topic}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Accuracy: {a.acc}%</div>
                    </div>
                    <button
                      onClick={() => toggleWeak(i)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 flex-shrink-0"
                    >
                      Fix it {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Expanded CTA row */}
                  {isOpen && (
                    <div className="px-3 py-2.5 bg-indigo-50/60 border-t border-indigo-100 flex gap-2">
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white text-[11px] font-bold">
                        <BookOpen className="w-3.5 h-3.5" /> Learn
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-sky-500 text-white text-[11px] font-bold">
                        <PenTool className="w-3.5 h-3.5" /> Practice
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 text-white text-[11px] font-bold">
                        <FileText className="w-3.5 h-3.5" /> Test
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Badges ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <div className="text-sm font-bold text-slate-900">Earned Badges</div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {badges.map((b, i) => (
              <div key={i} className={`flex-shrink-0 w-20 flex flex-col items-center justify-center p-3 rounded-xl border ${b.bg}`}>
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm">
                  <b.Icon className={`w-5 h-5 ${b.color}`} />
                </div>
                <div className="text-[10px] font-bold text-slate-700 text-center leading-tight">{b.name}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
