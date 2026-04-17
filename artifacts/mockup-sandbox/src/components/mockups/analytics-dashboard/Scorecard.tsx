import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Flame, 
  CalendarDays, 
  Trophy, 
  Target, 
  ChevronRight, 
  PlayCircle, 
  BookOpen, 
  PenTool,
  Medal,
  Star,
  Zap,
  Shield
} from 'lucide-react';

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
  { name: 'Lin. Equations', status: 'mastered' },
  { name: 'Quad. Equations', status: 'needs_practice' },
  { name: 'Arith. Prog.', status: 'mastered' },
  { name: 'Triangles', status: 'needs_practice' },
  { name: 'Coord. Geo.', status: 'unseen' },
  { name: 'Trigonometry', status: 'needs_practice' },
  { name: 'Apps of Trig.', status: 'unseen' },
  { name: 'Circles', status: 'mastered' },
  { name: 'Constructions', status: 'unseen' },
  { name: 'Areas Circles', status: 'mastered' },
  { name: 'Surface Areas', status: 'needs_practice' },
  { name: 'Statistics', status: 'mastered' },
  { name: 'Probability', status: 'mastered' },
];

const scienceTopics = [
  { name: 'Chem. Reactions', status: 'mastered' },
  { name: 'Acids & Bases', status: 'mastered' },
  { name: 'Metals', status: 'needs_practice' },
  { name: 'Carbon', status: 'unseen' },
  { name: 'Periodic Class.', status: 'unseen' },
  { name: 'Life Processes', status: 'mastered' },
  { name: 'Control & Coord.', status: 'needs_practice' },
  { name: 'Reproduction', status: 'unseen' },
  { name: 'Heredity', status: 'needs_practice' },
  { name: 'Light', status: 'mastered' },
  { name: 'Human Eye', status: 'mastered' },
  { name: 'Electricity', status: 'needs_practice' },
  { name: 'Magnetic Effects', status: 'unseen' },
  { name: 'Environment', status: 'mastered' },
  { name: 'Nat. Resources', status: 'mastered' },
];

const weakAreas = {
  maths: [
    { topic: 'Trigonometry Ident.', gap: 'Concept Gap', action: 'Learn', icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { topic: 'Surface Areas', gap: 'Speed Issue', action: 'Practice', icon: PenTool, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { topic: 'Quadratic Roots', gap: 'Accuracy Issue', action: 'Take Test', icon: Target, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  ],
  science: [
    { topic: 'Carbon Compounds', gap: 'Concept Gap', action: 'Learn', icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { topic: 'Electricity Circ.', gap: 'Speed Issue', action: 'Practice', icon: PenTool, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { topic: 'Heredity Laws', gap: 'Accuracy Issue', action: 'Take Test', icon: Target, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  ]
};

const badges = [
  { name: 'Week Streak', icon: Flame, color: 'text-orange-500' },
  { name: 'Math Whiz', icon: Zap, color: 'text-yellow-400' },
  { name: 'Top 10%', icon: Trophy, color: 'text-lime-400' },
  { name: 'Flawless', icon: Shield, color: 'text-cyan-400' },
  { name: 'Night Owl', icon: Star, color: 'text-indigo-400' },
];

export function Scorecard() {
  const [subject, setSubject] = useState<'maths' | 'science'>('maths');
  
  const topics = subject === 'maths' ? mathsTopics : scienceTopics;
  const currentWeakAreas = weakAreas[subject];

  return (
    <div className="w-[390px] h-[844px] bg-[#0A0D1A] text-slate-200 font-sans overflow-y-auto overflow-x-hidden flex flex-col relative selection:bg-cyan-500/30">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-cyan-500/10 blur-[100px] pointer-events-none rounded-full transform -translate-y-1/2"></div>
      
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400/50">
            AM
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Arjun Mehta</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-sm flex items-center gap-1 border border-lime-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
                Lv. 24
              </span>
              <span className="text-xs text-slate-400 font-medium">Rank #4,092</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col items-center bg-[#151A2D] border border-slate-800 rounded-lg p-1.5 shadow-inner">
            <Flame className="w-5 h-5 text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]" fill="currentColor" />
            <span className="text-xs font-bold text-white">14</span>
          </div>
          <div className="flex flex-col items-center bg-[#151A2D] border border-slate-800 rounded-lg p-1.5 shadow-inner">
            <CalendarDays className="w-5 h-5 text-rose-500" />
            <span className="text-xs font-bold text-white">72</span>
          </div>
        </div>
      </header>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 px-6 pb-12 flex flex-col gap-8 relative z-10">
        
        {/* Activity Chart */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ActivityIcon />
              Combat Log
            </h2>
            <div className="text-xs font-bold bg-[#151A2D] px-2 py-1 rounded-md border border-slate-800 text-cyan-400">
              420 min / week
            </div>
          </div>
          
          <div className="h-[180px] w-full bg-[#111626] rounded-xl border border-slate-800 p-4 pt-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-2 right-4 flex gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Learn</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime-400"></span>Prac</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-500"></span>Test</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748B', fontWeight: 'bold' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#1E293B', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px', fontWeight: 'bold' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="learn" stackId="a" fill="#06B6D4" radius={[0, 0, 4, 4]} barSize={12} />
                <Bar dataKey="practice" stackId="a" fill="#A3E635" barSize={12} />
                <Bar dataKey="test" stackId="a" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MedalIcon />
            Achievements
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x">
            {badges.map((badge, i) => (
              <div key={i} className="flex-shrink-0 snap-center bg-[#111626] border border-slate-800 rounded-xl p-3 flex flex-col items-center justify-center gap-2 w-[88px] h-[96px] shadow-md relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-xl pointer-events-none"></div>
                <div className={`w-10 h-10 rounded-full bg-[#1A2235] flex items-center justify-center ${badge.color} drop-shadow-[0_0_8px_currentColor] border border-slate-700/50`}>
                  <badge.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-300 text-center leading-tight">{badge.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Subject Toggle & Mastery Grid */}
        <section>
          <div className="flex bg-[#111626] p-1 rounded-lg border border-slate-800 mb-6 relative">
            <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-800 rounded-md transition-all duration-300 ease-out shadow-sm ${subject === 'science' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}></div>
            <button 
              className={`flex-1 py-2 text-sm font-bold z-10 transition-colors ${subject === 'maths' ? 'text-white' : 'text-slate-500'}`}
              onClick={() => setSubject('maths')}
            >
              MATHS
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold z-10 transition-colors ${subject === 'science' ? 'text-white' : 'text-slate-500'}`}
              onClick={() => setSubject('science')}
            >
              SCIENCE
            </button>
          </div>

          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <GridIcon />
            Mastery Matrix
          </h2>
          
          <div className="grid grid-cols-3 gap-2">
            {topics.map((topic, i) => {
              let bg = "bg-[#151A2D] border-slate-800 text-slate-500";
              let dot = "bg-slate-700";
              let glow = "";
              
              if (topic.status === 'mastered') {
                bg = "bg-lime-400/10 border-lime-400/30 text-lime-100";
                dot = "bg-lime-400 shadow-[0_0_5px_rgba(163,230,53,0.8)]";
                glow = "shadow-[0_0_15px_rgba(163,230,53,0.05)_inset]";
              } else if (topic.status === 'needs_practice') {
                bg = "bg-orange-500/10 border-orange-500/30 text-orange-100";
                dot = "bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]";
                glow = "shadow-[0_0_15px_rgba(249,115,22,0.05)_inset]";
              }

              return (
                <div key={i} className={`h-16 rounded-lg border ${bg} ${glow} p-2 flex flex-col justify-between transition-colors cursor-default hover:bg-slate-800/50`}>
                  <div className="flex justify-end">
                    <div className={`w-1.5 h-1.5 rounded-full ${dot}`}></div>
                  </div>
                  <span className="text-[10px] font-bold leading-tight line-clamp-2">{topic.name}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Priority Targets (Weak Areas) */}
        <section>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TargetIcon />
            Priority Targets
          </h2>
          <div className="flex flex-col gap-3">
            {currentWeakAreas.map((area, i) => (
              <div key={i} className="bg-[#111626] border border-slate-800 rounded-xl p-4 flex items-center justify-between group hover:border-slate-600 transition-colors cursor-pointer relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${area.bg}`}></div>
                <div className="flex items-center gap-4 pl-2">
                  <div className={`w-10 h-10 rounded-lg bg-[#1A2235] flex items-center justify-center ${area.color} border border-slate-700/50`}>
                    <area.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">{area.topic}</h3>
                    <p className={`text-[10px] font-bold ${area.color} uppercase tracking-wider mt-0.5 opacity-80`}>{area.gap}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{area.action}</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

// Minimal Icons
function ActivityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  );
}

function MedalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7"></circle>
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <circle cx="12" cy="12" r="6"></circle>
      <circle cx="12" cy="12" r="2"></circle>
    </svg>
  );
}
