import React, { useEffect } from "react";
import { 
  Target, 
  Calendar, 
  BarChart3, 
  Trophy, 
  CheckCircle2, 
  MessageSquare, 
  Clock, 
  Sparkles, 
  Zap, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  Brain,
  Star,
  TrendingUp
} from "lucide-react";

export function NeonCampus() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-50 font-['Space_Grotesk',sans-serif] selection:bg-lime-500/30 relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] right-[-20%] w-[40vw] h-[40vw] bg-lime-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-blue-600/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <div className="relative z-10">
        {/* Section 1: Hero */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 relative snap-start">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50 mask-image-linear-gradient-to-b" />
          
          <div className="max-w-4xl mx-auto text-center space-y-12 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 shadow-[0_0_15px_rgba(59,130,246,0.15)] backdrop-blur-sm mb-4">
              <Zap className="w-4 h-4 text-lime-400 fill-lime-400" />
              <span className="text-sm font-medium tracking-wide text-slate-300 uppercase">CBSE Class 10</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.1]">
              Know <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-300 drop-shadow-[0_0_20px_rgba(163,230,53,0.3)]">exactly</span> what's in the exam.
            </h1>
            
            <button className="group relative inline-flex items-center justify-center px-10 py-5 font-bold text-xl text-slate-950 transition-all duration-200 bg-lime-400 rounded-2xl hover:bg-lime-300 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(163,230,53,0.4)] hover:shadow-[0_0_60px_rgba(163,230,53,0.6)]">
              <span>Start Free</span>
              <ChevronRight className="w-6 h-6 ml-2 transition-transform group-hover:translate-x-1" />
            </button>
            
            <div className="flex items-center justify-center gap-4 pt-8">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-2 border-[#0a0a0f] bg-slate-800 flex items-center justify-center overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}&backgroundColor=1e293b`} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1 text-lime-400 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <div className="text-sm text-slate-400 font-medium">12,800+ students leveled up</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Prediction Preview */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-24 snap-start">
          <div className="w-full max-w-5xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center">Cracked the CBSE pattern.</h2>
            
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <Brain className="w-8 h-8 text-indigo-400" />
                  <span className="text-xl font-bold text-slate-200">Maths Predictions 2025</span>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.6)]"></span> Must-crack</div>
                  <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.6)]"></span> High-ROI</div>
                  <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.6)]"></span> Good-to-do</div>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { topic: "Quadratic Equations", prob: 92, marks: "12-16 marks", color: "bg-lime-400", shadow: "shadow-[0_0_15px_rgba(163,230,53,0.4)]" },
                  { topic: "Light Reflection", prob: 88, marks: "10-14 marks", color: "bg-lime-400", shadow: "shadow-[0_0_15px_rgba(163,230,53,0.4)]" },
                  { topic: "Arithmetic Progressions", prob: 85, marks: "8-12 marks", color: "bg-blue-400", shadow: "shadow-[0_0_15px_rgba(96,165,250,0.4)]" },
                  { topic: "Chemical Reactions", prob: 82, marks: "8-10 marks", color: "bg-blue-400", shadow: "shadow-[0_0_15px_rgba(96,165,250,0.4)]" },
                  { topic: "Electricity", prob: 78, marks: "6-8 marks", color: "bg-orange-400", shadow: "shadow-[0_0_15px_rgba(251,146,60,0.4)]" },
                ].map((item, i) => (
                  <div key={i} className="group flex items-center gap-6">
                    <div className="w-48 text-right font-medium text-slate-300">{item.topic}</div>
                    <div className="flex-1 h-6 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                      <div 
                        className={`h-full ${item.color} ${item.shadow} relative overflow-hidden transition-all duration-1000 ease-out`}
                        style={{ width: `${item.prob}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 w-full translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                      </div>
                    </div>
                    <div className="w-24 text-2xl font-bold text-slate-100">{item.prob}%</div>
                    <div className="w-28 text-sm text-slate-400 bg-slate-900 py-1 px-3 rounded-full text-center">{item.marks}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: AI Tutor */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-24 snap-start relative">
          <div className="w-full max-w-6xl grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-6xl font-bold mb-12 leading-tight">Your 24/7 personal mastermind.</h2>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: MessageSquare, text: "Step-by-step teaching" },
                  { icon: CheckCircle2, text: "Marking scheme tips" },
                  { icon: Target, text: "Learns your weak spots" },
                  { icon: Clock, text: "Available 24/7" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50 hover:bg-slate-800/50 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-slate-200">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-[100px] rounded-full" />
              <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">Ravi Sir (AI)</div>
                    <div className="text-xs text-indigo-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span> Online
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 rounded-2xl p-4 rounded-tl-none self-start max-w-[85%] border border-slate-700/50">
                  <p className="text-slate-200">Let's crack that tricky trigonometry proof. Where are you stuck?</p>
                </div>
                
                <div className="bg-indigo-600 rounded-2xl p-4 rounded-tr-none self-end max-w-[85%] shadow-[0_0_15px_rgba(79,70,229,0.3)] text-white">
                  <p>I can't figure out step 2. Why divide by cos²θ?</p>
                </div>
                
                <div className="bg-slate-800/50 rounded-2xl p-5 rounded-tl-none self-start max-w-[90%] border border-slate-700/50">
                  <p className="text-slate-200 mb-3">Great question! Look at what we need on the RHS: <span className="font-mono text-lime-300 bg-slate-900 px-2 py-1 rounded">sec²θ</span></p>
                  <p className="text-slate-300 text-sm">Since secθ = 1/cosθ, dividing the entire LHS by cos²θ forces a sec²θ to appear. Try writing it out now.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Smart Study System */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-24 snap-start">
          <div className="w-full max-w-5xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-16 text-center">Play to win.</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="group bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/60 transition-all duration-300 hover:border-lime-500/30 hover:shadow-[0_0_30px_rgba(163,230,53,0.1)]">
                <div className="w-16 h-16 rounded-2xl bg-lime-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Calendar className="w-8 h-8 text-lime-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Daily Mix</h3>
                <p className="text-slate-400">Your daily 20-min session</p>
              </div>

              <div className="group bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/60 transition-all duration-300 hover:border-red-500/30 hover:shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Weak Areas</h3>
                <p className="text-slate-400">AI finds your gaps</p>
              </div>

              <div className="group bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/60 transition-all duration-300 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Study Planner</h3>
                <p className="text-slate-400">Custom plan to your target</p>
              </div>

              <div className="group bg-slate-900/60 backdrop-blur-md border border-slate-800 p-8 rounded-3xl hover:bg-slate-800/60 transition-all duration-300 hover:border-amber-500/30 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Trophy className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Weekly Report</h3>
                <p className="text-slate-400">Track your growth</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Practice & Mock Tests */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-24 snap-start relative">
          <div className="w-full max-w-6xl grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full" />
              <div className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono">
                    <Clock className="w-4 h-4" /> 02:45:12
                  </div>
                  <div className="text-xs font-bold px-3 py-1 bg-slate-800 rounded text-slate-300">CBSE Science Full Mock</div>
                </div>
                <div className="p-8">
                  <div className="space-y-4 mb-8">
                    <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-800 rounded w-full"></div>
                    <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/50">
                        <div className="w-6 h-6 rounded-full border-2 border-slate-600"></div>
                        <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-t from-slate-900 to-transparent absolute bottom-0 left-0 right-0 h-32 flex items-end justify-center pb-6">
                  <button className="bg-emerald-500 text-slate-950 px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)]">Submit Paper</button>
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <h2 className="text-4xl md:text-6xl font-bold mb-12 leading-tight">Simulation mode on.</h2>
              <div className="flex flex-col gap-8">
                <div className="flex items-start gap-4">
                  <FileText className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                  <h3 className="text-2xl font-bold">Full CBSE-format papers</h3>
                </div>
                <div className="flex items-start gap-4">
                  <Zap className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                  <h3 className="text-2xl font-bold">Adaptive difficulty</h3>
                </div>
                <div className="flex items-start gap-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                  <h3 className="text-2xl font-bold">AI checks your answers</h3>
                </div>
                <div className="flex items-start gap-4">
                  <Target className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
                  <h3 className="text-2xl font-bold">Topic-wise mocks</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Score Transformations */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-24 snap-start">
          <div className="w-full max-w-6xl">
            <h2 className="text-4xl md:text-6xl font-bold mb-20 text-center">Unfair advantage? Maybe.</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: "Ananya S.", city: "Delhi", from: 65, to: 91, subject: "Maths", color: "text-lime-400", shadow: "shadow-[0_0_30px_rgba(163,230,53,0.15)]", border: "border-lime-500/30" },
                { name: "Rohan K.", city: "Mumbai", from: 58, to: 88, subject: "Science", color: "text-blue-400", shadow: "shadow-[0_0_30px_rgba(96,165,250,0.15)]", border: "border-blue-500/30" },
                { name: "Priya M.", city: "Bangalore", from: 72, to: 94, subject: "Maths", color: "text-indigo-400", shadow: "shadow-[0_0_30px_rgba(99,102,241,0.15)]", border: "border-indigo-500/30" },
              ].map((student, i) => (
                <div key={i} className={`bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl flex flex-col items-center relative hover:-translate-y-2 transition-transform duration-300 ${student.shadow}`}>
                  <div className={`absolute top-0 right-0 p-4 font-bold text-xs uppercase tracking-wider text-slate-500`}>{student.subject}</div>
                  
                  <div className="flex items-center gap-4 mb-10 w-full justify-center mt-4">
                    <div className="text-5xl font-black text-slate-500">{student.from}</div>
                    <TrendingUp className={`w-8 h-8 ${student.color}`} />
                    <div className={`text-6xl font-black ${student.color} drop-shadow-[0_0_15px_currentColor]`}>{student.to}</div>
                  </div>
                  
                  <div className="text-center mt-auto pt-6 border-t border-slate-800/50 w-full">
                    <div className="font-bold text-xl mb-1 text-slate-200">{student.name}</div>
                    <div className="text-sm text-slate-400">{student.city}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7: Final CTA */}
        <section className="min-h-[80dvh] flex flex-col items-center justify-center px-6 relative snap-start text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(163,230,53,0.1)_0%,rgba(10,10,15,1)_70%)]" />
          
          <div className="relative z-10 max-w-3xl mx-auto space-y-10">
            <h2 className="text-6xl md:text-8xl font-black tracking-tight">
              Start free. <br/>
              <span className="text-slate-500">No signup needed.</span>
            </h2>
            
            <button className="group relative inline-flex items-center justify-center px-12 py-6 font-bold text-2xl text-slate-950 transition-all duration-200 bg-lime-400 rounded-3xl hover:bg-lime-300 hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(163,230,53,0.5)]">
              <span>Enter The App</span>
              <ChevronRight className="w-8 h-8 ml-2 transition-transform group-hover:translate-x-2" />
            </button>
            
            <p className="text-sm text-slate-500 uppercase tracking-widest font-medium mt-12">
              Data-driven predictions, not guaranteed exam content
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default NeonCampus;
