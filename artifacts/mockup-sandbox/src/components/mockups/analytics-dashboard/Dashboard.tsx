import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Flame,
  Calendar,
  Trophy,
  BookOpen,
  Target,
  Activity,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  PlayCircle,
  PenTool,
  FileText,
  Star,
  Award,
  Zap,
  TrendingUp
} from 'lucide-react';

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
  { name: 'Real Numbers', status: 'mastered' },
  { name: 'Polynomials', status: 'mastered' },
  { name: 'Linear Eq.', status: 'mastered' },
  { name: 'Quadratic Eq.', status: 'needs_practice' },
  { name: 'Arith. Prog.', status: 'mastered' },
  { name: 'Triangles', status: 'needs_practice' },
  { name: 'Coord. Geo.', status: 'mastered' },
  { name: 'Trigonometry', status: 'needs_practice' },
  { name: 'Apps of Trig', status: 'unseen' },
  { name: 'Circles', status: 'unseen' },
  { name: 'Constructions', status: 'unseen' },
  { name: 'Areas of Circles', status: 'unseen' },
  { name: 'Surface Areas', status: 'needs_practice' },
  { name: 'Statistics', status: 'unseen' },
  { name: 'Probability', status: 'mastered' },
];

const scienceTopics = [
  { name: 'Chem Reactions', status: 'mastered' },
  { name: 'Acids, Bases', status: 'needs_practice' },
  { name: 'Metals & Non', status: 'mastered' },
  { name: 'Carbon Comp.', status: 'unseen' },
  { name: 'Periodic Class.', status: 'unseen' },
  { name: 'Life Processes', status: 'mastered' },
  { name: 'Control & Coord', status: 'needs_practice' },
  { name: 'Reproduction', status: 'unseen' },
  { name: 'Heredity', status: 'unseen' },
  { name: 'Light Reflec.', status: 'needs_practice' },
  { name: 'Human Eye', status: 'unseen' },
  { name: 'Electricity', status: 'needs_practice' },
  { name: 'Magnetic Effects', status: 'unseen' },
  { name: 'Environment', status: 'mastered' },
  { name: 'Nat. Resources', status: 'mastered' },
];

const weakAreas = [
  {
    topic: 'Triangles',
    subject: 'Maths',
    gap: 'Similarity Criteria',
    action: 'Learn',
    icon: PlayCircle,
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    topic: 'Electricity',
    subject: 'Science',
    gap: 'Ohm\'s Law Numericals',
    action: 'Practice',
    icon: PenTool,
    color: 'bg-sky-100 text-sky-700',
  },
  {
    topic: 'Light Reflection',
    subject: 'Science',
    gap: 'Sign Conventions',
    action: 'Take Test',
    icon: FileText,
    color: 'bg-violet-100 text-violet-700',
  },
];

const badges = [
  { name: '7-Day Streak', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  { name: 'Maths Whiz', icon: Award, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { name: 'Quick Learner', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
  { name: 'Top 10%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { name: 'Science Pro', icon: Star, color: 'text-blue-500', bg: 'bg-blue-50' },
];

export function Dashboard() {
  const [subject, setSubject] = useState<'maths' | 'science'>('maths');

  const topics = subject === 'maths' ? mathsTopics : scienceTopics;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'mastered':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'needs_practice':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <CircleDashed className="w-3.5 h-3.5 text-slate-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return 'bg-emerald-50 border-emerald-100 text-emerald-800';
      case 'needs_practice':
        return 'bg-amber-50 border-amber-100 text-amber-800';
      default:
        return 'bg-slate-50 border-slate-100 text-slate-500';
    }
  };

  return (
    <div className="w-full max-w-[390px] min-h-[844px] bg-slate-50 mx-auto font-sans shadow-2xl relative overflow-hidden flex flex-col">
      
      {/* Header Profile Section */}
      <header className="bg-white px-5 pt-12 pb-6 border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold">
              PS
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Priya Sharma</h1>
              <p className="text-sm text-slate-500 font-medium">Class 10 • CBSE</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <div className="flex-1 bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-orange-600 font-semibold uppercase tracking-wider">Streak</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">9 Days</p>
            </div>
          </div>
          <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Exams</p>
              <p className="text-lg font-bold text-slate-900 leading-tight">72 Days</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-6">
        
        {/* Activity Chart */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Activity This Week
            </h2>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Minutes</span>
          </div>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                />
                <Bar dataKey="Learn" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Practice" stackId="a" fill="#0ea5e9" />
                <Bar dataKey="Test" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-600"></div>Learn</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500"></div>Practice</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-violet-500"></div>Test</div>
          </div>
        </section>

        {/* Topic Mastery Grid */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              Syllabus Mastery
            </h2>
            
            {/* Pill Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setSubject('maths')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${subject === 'maths' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Maths
              </button>
              <button 
                onClick={() => setSubject('science')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${subject === 'science' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Science
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {topics.map((topic, i) => (
              <div 
                key={i} 
                className={`flex flex-col items-center justify-center text-center p-2 rounded-xl border ${getStatusColor(topic.status)}`}
              >
                {getStatusIcon(topic.status)}
                <span className="text-[10px] font-bold mt-1.5 leading-tight line-clamp-2">{topic.name}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-4 text-[10px] font-semibold text-slate-500 px-1">
            <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Mastered</div>
            <div className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> Review</div>
            <div className="flex items-center gap-1"><CircleDashed className="w-3 h-3 text-slate-300" /> Unseen</div>
          </div>
        </section>

        {/* Weak Areas */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-rose-500" />
            Top Focus Areas
          </h2>
          <div className="space-y-3">
            {weakAreas.map((area, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{area.subject}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{area.topic}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{area.gap}</p>
                </div>
                <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform active:scale-95 ${area.color}`}>
                  <area.icon className="w-3.5 h-3.5" />
                  {area.action}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Badges Earned */}
        <section className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Recent Badges
          </h2>
          <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 snap-x hide-scrollbar">
            {badges.map((badge, i) => (
              <div key={i} className="snap-start flex-shrink-0 w-24 flex flex-col items-center justify-center p-3 rounded-xl border border-slate-100 bg-slate-50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${badge.bg}`}>
                  <badge.icon className={`w-5 h-5 ${badge.color}`} />
                </div>
                <span className="text-[10px] font-bold text-slate-700 text-center leading-tight">{badge.name}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Adding some global CSS for hiding scrollbar if needed, normally tailwind plugins handle this, but adding inline style for safety */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
