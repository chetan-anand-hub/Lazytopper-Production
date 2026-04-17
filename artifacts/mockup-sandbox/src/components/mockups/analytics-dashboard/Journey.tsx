import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Flame, Calendar, Trophy, ArrowRight, Star, Sparkles, Map, Target } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const activityData = [
  { day: "Mon", learn: 30, practice: 20, test: 0 },
  { day: "Tue", learn: 45, practice: 40, test: 0 },
  { day: "Wed", learn: 20, practice: 50, test: 30 },
  { day: "Thu", learn: 60, practice: 20, test: 0 },
  { day: "Fri", learn: 15, practice: 45, test: 45 },
  { day: "Sat", learn: 80, practice: 60, test: 0 },
  { day: "Sun", learn: 30, practice: 40, test: 60 },
];

type MasteryLevel = "Mastered" | "Needs Practice" | "Unseen";

interface Topic {
  id: string;
  name: string;
  mastery: MasteryLevel;
}

const mathsTopics: Topic[] = [
  { id: "1", name: "Real Numbers", mastery: "Mastered" },
  { id: "2", name: "Polynomials", mastery: "Mastered" },
  { id: "3", name: "Linear Eq.", mastery: "Needs Practice" },
  { id: "4", name: "Quadratic Eq.", mastery: "Needs Practice" },
  { id: "5", name: "AP", mastery: "Mastered" },
  { id: "6", name: "Triangles", mastery: "Unseen" },
  { id: "7", name: "Coordinates", mastery: "Mastered" },
  { id: "8", name: "Trigonometry", mastery: "Needs Practice" },
  { id: "9", name: "Apps of Trig", mastery: "Unseen" },
  { id: "10", name: "Circles", mastery: "Unseen" },
  { id: "11", name: "Constructions", mastery: "Unseen" },
  { id: "12", name: "Areas", mastery: "Needs Practice" },
  { id: "13", name: "Surface Areas", mastery: "Unseen" },
  { id: "14", name: "Statistics", mastery: "Mastered" },
  { id: "15", name: "Probability", mastery: "Mastered" },
];

const scienceTopics: Topic[] = [
  { id: "1", name: "Chemical Rxn", mastery: "Mastered" },
  { id: "2", name: "Acids Bases", mastery: "Needs Practice" },
  { id: "3", name: "Metals", mastery: "Mastered" },
  { id: "4", name: "Carbon", mastery: "Unseen" },
  { id: "5", name: "Periodic", mastery: "Unseen" },
  { id: "6", name: "Life Processes", mastery: "Mastered" },
  { id: "7", name: "Control Coord", mastery: "Needs Practice" },
  { id: "8", name: "Reproduction", mastery: "Unseen" },
  { id: "9", name: "Heredity", mastery: "Unseen" },
  { id: "10", name: "Light", mastery: "Needs Practice" },
  { id: "11", name: "Eye", mastery: "Mastered" },
  { id: "12", name: "Electricity", mastery: "Needs Practice" },
  { id: "13", name: "Magnetic", mastery: "Unseen" },
  { id: "14", name: "Environment", mastery: "Mastered" },
  { id: "15", name: "Nat Resources", mastery: "Mastered" },
];

const badges = [
  { id: 1, name: "Early Bird", icon: "🌅", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: 2, name: "Math Wizard", icon: "🧙‍♂️", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { id: 3, name: "7 Day Streak", icon: "🔥", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: 4, name: "Test Ace", icon: "🎯", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { id: 5, name: "Night Owl", icon: "🦉", color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
];

export function Journey() {
  const [subject, setSubject] = useState<"Maths" | "Science">("Maths");

  const currentTopics = subject === "Maths" ? mathsTopics : scienceTopics;
  const weakAreas = currentTopics.filter((t) => t.mastery === "Needs Practice").slice(0, 3);

  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-900 p-4 font-sans">
      <div className="w-[390px] h-[844px] bg-[#FFFbf5] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border-[8px] border-neutral-800">
        
        {/* Header Section */}
        <div className="px-6 pt-12 pb-6 bg-[#FFEFE5] rounded-b-[40px] shadow-sm relative z-10 shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-orange-950 font-serif mb-1">Hi, Kavya!</h1>
              <p className="text-orange-800/80 text-sm font-medium">Your journey is looking beautiful today.</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-200 border-2 border-white flex items-center justify-center shadow-sm">
              <span className="text-orange-800 font-bold text-lg font-serif">KR</span>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-3 flex items-center gap-3 border border-orange-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Flame size={20} className="fill-orange-500 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-950 leading-none">5</div>
                <div className="text-[10px] text-orange-800 uppercase font-bold tracking-wider mt-0.5">Day Streak</div>
              </div>
            </div>
            <div className="flex-1 bg-white/80 backdrop-blur-sm rounded-2xl p-3 flex items-center gap-3 border border-orange-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <Calendar size={20} className="text-rose-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-950 leading-none">72</div>
                <div className="text-[10px] text-rose-800 uppercase font-bold tracking-wider mt-0.5">Days Left</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-12 pt-4 px-5 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          
          {/* Chart Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Map size={18} className="text-orange-400" />
              <h2 className="text-lg font-bold text-orange-950 font-serif">This Week's Path</h2>
            </div>
            <div className="bg-white rounded-[28px] p-5 border border-orange-100 shadow-sm">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fed7aa" opacity={0.5} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#c2410c', fontSize: 12 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#c2410c', fontSize: 12 }} 
                    />
                    <Tooltip 
                      cursor={{fill: '#fff7ed'}}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: '#fff' }}
                    />
                    <Bar dataKey="learn" name="Learn" stackId="a" fill="#fcd34d" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="practice" name="Practice" stackId="a" fill="#fb923c" />
                    <Bar dataKey="test" name="Test" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#fcd34d]"></div><span className="text-xs text-orange-800 font-medium">Learn</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#fb923c]"></div><span className="text-xs text-orange-800 font-medium">Practice</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#f43f5e]"></div><span className="text-xs text-orange-800 font-medium">Test</span></div>
              </div>
            </div>
          </section>

          {/* Mastery Grid Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <h2 className="text-lg font-bold text-orange-950 font-serif">Knowledge Map</h2>
              </div>
              <div className="bg-orange-100/80 p-1 rounded-full flex">
                <button 
                  onClick={() => setSubject("Maths")}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                    subject === "Maths" ? "bg-white text-orange-600 shadow-sm" : "text-orange-800/60"
                  )}
                >
                  Maths
                </button>
                <button 
                  onClick={() => setSubject("Science")}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                    subject === "Science" ? "bg-white text-orange-600 shadow-sm" : "text-orange-800/60"
                  )}
                >
                  Science
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[28px] p-5 border border-orange-100 shadow-sm">
              <div className="grid grid-cols-3 gap-2">
                {currentTopics.map((topic) => (
                  <div 
                    key={topic.id}
                    className={cn(
                      "aspect-square rounded-2xl p-2 flex flex-col items-center justify-center text-center gap-1 border transition-all",
                      topic.mastery === "Mastered" && "bg-amber-50 border-amber-200",
                      topic.mastery === "Needs Practice" && "bg-rose-50 border-rose-200",
                      topic.mastery === "Unseen" && "bg-neutral-50 border-neutral-200 border-dashed opacity-60"
                    )}
                  >
                    {topic.mastery === "Mastered" && <Star size={16} className="text-amber-500 fill-amber-500" />}
                    {topic.mastery === "Needs Practice" && <Target size={16} className="text-rose-500" />}
                    {topic.mastery === "Unseen" && <div className="w-4 h-4 rounded-full border-2 border-neutral-300" />}
                    
                    <span className={cn(
                      "text-[10px] leading-tight font-medium",
                      topic.mastery === "Mastered" && "text-amber-900",
                      topic.mastery === "Needs Practice" && "text-rose-900",
                      topic.mastery === "Unseen" && "text-neutral-500"
                    )}>
                      {topic.name}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center mt-4 px-2">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div><span className="text-[10px] text-neutral-500 uppercase font-bold">Mastered</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400"></div><span className="text-[10px] text-neutral-500 uppercase font-bold">Review</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-neutral-300"></div><span className="text-[10px] text-neutral-500 uppercase font-bold">Unseen</span></div>
              </div>
            </div>
          </section>

          {/* Weak Areas Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Target size={18} className="text-rose-400" />
              <h2 className="text-lg font-bold text-orange-950 font-serif">Focus Areas</h2>
            </div>
            <div className="space-y-3">
              {weakAreas.map((area, idx) => (
                <div key={idx} className="bg-white rounded-[24px] p-4 flex items-center justify-between border border-rose-100 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-200"></div>
                  <div>
                    <h3 className="font-bold text-orange-950">{area.name}</h3>
                    <p className="text-xs text-orange-800/70 mt-0.5">Needs a little more love</p>
                  </div>
                  <button className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold px-4 py-2 rounded-full transition-colors flex items-center gap-1">
                    Practice <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Badges Section */}
          <section className="space-y-3 pb-8">
            <div className="flex items-center gap-2 px-1">
              <Trophy size={18} className="text-yellow-500" />
              <h2 className="text-lg font-bold text-orange-950 font-serif">Passport Stamps</h2>
            </div>
            <div className="flex overflow-x-auto gap-3 pb-4 -mx-5 px-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              {badges.map((badge) => (
                <div 
                  key={badge.id} 
                  className={cn(
                    "flex-shrink-0 w-[100px] h-[110px] rounded-[24px] flex flex-col items-center justify-center p-3 border shadow-sm",
                    badge.color
                  )}
                >
                  <div className="text-3xl mb-2 filter drop-shadow-sm">{badge.icon}</div>
                  <span className="text-xs font-bold text-center leading-tight">{badge.name}</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
