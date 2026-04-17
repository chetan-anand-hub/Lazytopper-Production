import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Flame, Calendar, BookOpen, PenTool, FileText, Trophy, Zap, TrendingUp, Award, Star } from 'lucide-react';

const activityData = [
  { name: 'Mon', Learn: 45, Practice: 30, Test: 0 },
  { name: 'Tue', Learn: 30, Practice: 45, Test: 0 },
  { name: 'Wed', Learn: 60, Practice: 20, Test: 30 },
  { name: 'Thu', Learn: 20, Practice: 60, Test: 0 },
  { name: 'Fri', Learn: 40, Practice: 40, Test: 45 },
  { name: 'Sat', Learn: 15, Practice: 90, Test: 60 },
  { name: 'Sun', Learn: 0, Practice: 30, Test: 90 },
];

const mathsTopics = [
  { name: 'Real Numbers', status: 'mastered', acc: 91 },
  { name: 'Polynomials', status: 'mastered', acc: 88 },
  { name: 'Linear Eq.', status: 'mastered', acc: 84 },
  { name: 'Quadratic Eq.', status: 'needs_practice', acc: 55 },
  { name: 'Arith. Prog.', status: 'mastered', acc: 79 },
  { name: 'Triangles', status: 'needs_practice', acc: 48 },
  { name: 'Coord. Geo.', status: 'mastered', acc: 82 },
  { name: 'Trigonometry', status: 'needs_practice', acc: 52 },
  { name: 'Apps of Trig', status: 'unseen', acc: 0 },
  { name: 'Circles', status: 'unseen', acc: 0 },
  { name: 'Constructions', status: 'unseen', acc: 0 },
  { name: 'Areas & Circles', status: 'unseen', acc: 0 },
  { name: 'Surface Areas', status: 'needs_practice', acc: 43 },
  { name: 'Statistics', status: 'unseen', acc: 0 },
  { name: 'Probability', status: 'mastered', acc: 77 },
];

const scienceTopics = [
  { name: 'Chem Reactions', status: 'mastered', acc: 86 },
  { name: 'Acids, Bases', status: 'needs_practice', acc: 61 },
  { name: 'Metals & Non', status: 'mastered', acc: 80 },
  { name: 'Carbon Comp.', status: 'unseen', acc: 0 },
  { name: 'Periodic Class.', status: 'unseen', acc: 0 },
  { name: 'Life Processes', status: 'mastered', acc: 90 },
  { name: 'Control & Coord', status: 'needs_practice', acc: 57 },
  { name: 'Reproduction', status: 'unseen', acc: 0 },
  { name: 'Heredity', status: 'unseen', acc: 0 },
  { name: 'Light Reflec.', status: 'needs_practice', acc: 49 },
  { name: 'Human Eye', status: 'unseen', acc: 0 },
  { name: 'Electricity', status: 'needs_practice', acc: 44 },
  { name: 'Magnetic', status: 'unseen', acc: 0 },
  { name: 'Environment', status: 'mastered', acc: 78 },
  { name: 'Nat. Resources', status: 'mastered', acc: 72 },
];

const weakAreas = [
  { rank: 1, topic: 'Triangles', subject: 'Maths', difficulty: 'Hard', acc: 48, action: 'Learn', icon: BookOpen, diffColor: '#ef4444', diffBg: '#fef2f2' },
  { rank: 2, topic: 'Electricity', subject: 'Science', difficulty: 'Medium', acc: 44, action: 'Practice', icon: PenTool, diffColor: '#f59e0b', diffBg: '#fffbeb' },
  { rank: 3, topic: 'Light Reflection', subject: 'Science', difficulty: 'Medium', acc: 49, action: 'Take Test', icon: FileText, diffColor: '#f59e0b', diffBg: '#fffbeb' },
];

const subjectStats = {
  maths: { mastered: 7, total: 15, acc: 72 },
  science: { mastered: 5, total: 15, acc: 68 },
};

const badges = [
  { name: '9-Day Streak', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-100' },
  { name: 'Maths Whiz', icon: Award, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-100' },
  { name: 'Quick Learner', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100' },
  { name: 'Top 10%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100' },
  { name: 'Science Pro', icon: Star, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
];

export function Dashboard() {
  const [subject, setSubject] = useState<'maths' | 'science'>('maths');
  const topics = subject === 'maths' ? mathsTopics : scienceTopics;
  const stats = subjectStats[subject];

  const statusColor = (s: string) =>
    s === 'mastered' ? '#10b981' : s === 'needs_practice' ? '#f59e0b' : '#cbd5e1';
  const accBarColor = (s: string) =>
    s === 'mastered' ? '#6366f1' : s === 'needs_practice' ? '#f59e0b' : '#e2e8f0';

  return (
    <div className="font-sans bg-slate-50" style={{ width: 390, minHeight: 844, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as const }}>

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
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2 text-right">
            <Calendar className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <div>
              <div className="text-base font-black text-rose-600 leading-none">72</div>
              <div className="text-[9px] text-rose-500 font-semibold uppercase tracking-wide leading-tight">days to exam</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-lg px-3 py-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-sm font-bold text-slate-900">9 day streak</span>
          </div>
          <div className="text-xs text-slate-400">·</div>
          <div className="text-xs text-slate-500 font-medium">347 questions solved · 82% accuracy</div>
        </div>
      </header>

      <div className="flex flex-col gap-5 p-5 pb-10">

        {/* ── Activity Chart (hero element, full-width, prominent) ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-bold text-slate-900">Activity This Week</div>
            <div className="flex gap-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {[['Learn', '#4f46e5'], ['Practice', '#0ea5e9'], ['Test', '#8b5cf6']].map(([l, c]) => (
                <div key={l} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{l}
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 4, right: 0, left: -28, bottom: 0 }} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 600 }}
                />
                <Bar dataKey="Learn" fill="#4f46e5" radius={[3, 3, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Practice" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={10} />
                <Bar dataKey="Test" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Subject Split Cards with horizontal accuracy bars ── */}
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
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-0.5"><span>Accuracy</span><span>{st.acc}%</span></div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${st.acc}%`, background: s === 'maths' ? '#4f46e5' : '#0ea5e9' }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Syllabus Mastery with subject toggle ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-slate-900">Syllabus Mastery</div>
            <div className="flex bg-slate-100 p-0.5 rounded-lg">
              {(['maths', 'science'] as const).map(s => (
                <button key={s} onClick={() => setSubject(s)} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${subject === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                  {s === 'maths' ? 'Maths' : 'Science'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {topics.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor(t.status) }} />
                <div className="text-[11px] font-medium text-slate-700 w-28 flex-shrink-0 truncate">{t.name}</div>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${t.acc}%`, background: accBarColor(t.status) }} />
                </div>
                <div className="text-[10px] font-semibold text-slate-400 w-8 text-right flex-shrink-0">
                  {t.acc > 0 ? `${t.acc}%` : '—'}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Mastered</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Review</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />Unseen</div>
          </div>
        </section>

        {/* ── Weak Spots — ranked with difficulty badges ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="text-sm font-bold text-slate-900 mb-4">Top Focus Areas</div>
          <div className="space-y-3">
            {weakAreas.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-black flex-shrink-0">#{a.rank}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{a.subject}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: a.diffColor, background: a.diffBg }}>{a.difficulty}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">{a.topic}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Accuracy: {a.acc}%</div>
                </div>
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 bg-indigo-50 text-indigo-700`}>
                  <a.icon className="w-3 h-3" />{a.action}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Badges ── */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <div className="text-sm font-bold text-slate-900">Earned Badges</div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {badges.map((b, i) => (
              <div key={i} className={`flex-shrink-0 w-20 flex flex-col items-center justify-center p-3 rounded-xl border ${b.bg}`}>
                <div className={`w-9 h-9 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm`}>
                  <b.icon className={`w-5 h-5 ${b.color}`} />
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
