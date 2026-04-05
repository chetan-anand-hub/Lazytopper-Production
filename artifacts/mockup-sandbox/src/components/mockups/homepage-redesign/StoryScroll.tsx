import React, { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, TrendingUp, Target, Calendar, Trophy, BrainCircuit, MessageSquare, Zap, ShieldCheck, ChevronRight, Flame, Award, Star } from "lucide-react";

export function StoryScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  // A small script to add Space Grotesk if not present, though standard sans works fine.
  useEffect(() => {
    if (!document.getElementById("story-scroll-fonts")) {
      const link = document.createElement("link");
      link.id = "story-scroll-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full overflow-y-auto overflow-x-hidden bg-[#0a0a0a] text-white selection:bg-[#22c55e] selection:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .glass-panel-light { background: rgba(0, 0, 0, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(0, 0, 0, 0.05); }
        .glow-green { box-shadow: 0 0 40px rgba(34, 197, 94, 0.3); }
        .glow-purple { box-shadow: 0 0 80px rgba(126, 34, 206, 0.3); }
        .section-h { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0a0a0a;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}} />

      {/* 1. HERO SECTION - Dark */}
      <section className="section-h relative px-6 md:px-12 py-20 items-center justify-center text-center bg-[#0a0410] overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 z-0 opacity-40">
          <img src="/__mockup/images/story-scroll-hero-bg.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0410]"></div>
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-8 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
            <span className="text-sm font-medium tracking-wide">CBSE Class 10</span>
          </div>

          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.1] mb-10">
            We Know What's On <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] to-[#3b82f6]">The Exam.</span>
          </h1>

          <button className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-black bg-[#22c55e] rounded-full text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(34,197,94,0.4)]">
            Start Free
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a0410] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="avatar" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-[#0a0410] bg-white/10 backdrop-blur-md flex items-center justify-center text-xs font-bold">+</div>
            </div>
            <span className="text-sm text-gray-400 font-medium">12,800+ students cracking boards</span>
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              <span className="text-xs font-bold text-orange-300">12 day streak</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30">
              <Star className="w-4 h-4 text-purple-400 fill-purple-400" />
              <span className="text-xs font-bold text-purple-300">2,450 XP</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30">
              <Award className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-300">Level 8</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PREDICTION PREVIEW - Dark/Purple */}
      <section className="section-h relative px-6 md:px-12 py-24 bg-gradient-to-b from-[#0a0410] to-[#0f0c29]">
        <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">See the future. <br/><span className="text-purple-400">Study the trends.</span></h2>
            <p className="text-xl text-gray-400 mb-8 max-w-md hidden">Real data. Real predictions. Know exactly where to focus your energy for maximum marks.</p>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="glass-panel rounded-3xl p-6 md:p-8 relative">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/30 blur-2xl rounded-full"></div>
              
              <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-display text-2xl font-bold">Exam Predictor</h3>
                  <p className="text-sm text-gray-400">Maths • Class 10</p>
                </div>
                <div className="flex items-center gap-2 text-[#22c55e] text-sm font-bold bg-[#22c55e]/10 px-3 py-1 rounded-full">
                  <TrendingUp className="w-4 h-4" /> Live
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { topic: "Quadratic Equations", prob: 92, marks: "12-16", color: "bg-[#22c55e]", tier: "Must-crack" },
                  { topic: "Light Reflection", prob: 88, marks: "10-14", color: "bg-[#22c55e]", tier: "Must-crack" },
                  { topic: "Arithmetic Progressions", prob: 85, marks: "8-12", color: "bg-[#3b82f6]", tier: "High-ROI" },
                  { topic: "Chemical Reactions", prob: 82, marks: "8-10", color: "bg-[#3b82f6]", tier: "High-ROI" },
                  { topic: "Electricity", prob: 78, marks: "6-8", color: "bg-orange-500", tier: "Good-to-do" },
                ].map((item, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-white">{item.topic}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400">{item.marks} marks</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.color}/20 text-white`}>{item.tier}</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full ${item.color} relative overflow-hidden`} 
                        style={{ width: `${item.prob}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 animate-[shimmer_2s_infinite]"></div>
                      </div>
                      <div className="ml-2 text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{item.prob}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI TUTOR - Light Contrast */}
      <section className="section-h relative px-6 md:px-12 py-24 bg-white text-black">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
        
        <div className="max-w-6xl mx-auto w-full z-10 relative flex flex-col-reverse lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 w-full">
            <div className="glass-panel-light rounded-3xl p-6 shadow-2xl relative overflow-hidden bg-gray-50/80">
              <div className="flex items-center gap-4 border-b border-gray-200 pb-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border border-blue-200">
                   <img src="/__mockup/images/ai-tutor-avatar.png" alt="Ravi Sir" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">Ravi Sir</h3>
                  <span className="text-xs text-blue-600 font-bold tracking-wider uppercase block">AI Tutor • Online</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 w-full md:w-5/6 float-right justify-end">
                  <div className="bg-gray-900 text-white p-4 rounded-2xl rounded-tr-sm text-sm">
                    I'm stuck on this triangle congruence problem.
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-5/6">
                  <div className="bg-white border border-gray-200 shadow-sm p-4 rounded-2xl rounded-tl-sm text-sm">
                    <span>Compare <strong>△ABC</strong> and <strong>△PQR</strong>. What links ∠A to ∠P?</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-10 leading-tight">Your 24/7 <br/>personal coach.</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: <MessageSquare className="w-6 h-6 text-blue-500" />, text: "Step-by-step teaching" },
                { icon: <CheckCircle2 className="w-6 h-6 text-green-500" />, text: "Marking scheme tips" },
                { icon: <BrainCircuit className="w-6 h-6 text-purple-500" />, text: "Learns your weak spots" },
                { icon: <Zap className="w-6 h-6 text-amber-500" />, text: "Available 24/7" }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="p-2 bg-white rounded-lg shadow-sm">{feature.icon}</div>
                  <span className="font-bold text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. SMART STUDY SYSTEM - Dark/Gold */}
      <section className="section-h relative px-6 md:px-12 py-24 bg-[#050505]">
        <div className="max-w-6xl mx-auto w-full flex flex-col items-center">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-16 text-center max-w-2xl">
            Don't work hard. <br/><span className="text-amber-400">Work smart.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl hover:border-amber-400/50 transition-colors group">
              <Calendar className="w-10 h-10 text-amber-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-2">Daily Mix</h3>
              <p className="text-gray-400">Your daily 20-min session</p>
            </div>
            
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl hover:border-red-400/50 transition-colors group">
              <Target className="w-10 h-10 text-red-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-2">Weak Areas</h3>
              <p className="text-gray-400">AI finds your gaps</p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl hover:border-blue-400/50 transition-colors group">
              <TrendingUp className="w-10 h-10 text-blue-400 mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-2">Study Planner</h3>
              <p className="text-gray-400">Custom plan to your target</p>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl hover:border-[#22c55e]/50 transition-colors group">
              <Trophy className="w-10 h-10 text-[#22c55e] mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-2">Weekly Report</h3>
              <p className="text-gray-400">Track your growth</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRACTICE & MOCK TESTS - Tech Blue/White */}
      <section className="section-h relative px-6 md:px-12 py-24 bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="/__mockup/images/story-scroll-test-bg.png" alt="" className="w-full h-full object-cover" />
        </div>
        
        <div className="max-w-6xl mx-auto w-full z-10 relative flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-10 leading-tight">Practice like <br/>it's the real thing.</h2>
            
            <div className="space-y-6">
              {[
                { text: "Full CBSE-format papers" },
                { text: "Adaptive difficulty" },
                { text: "AI checks your answers" },
                { text: "Topic-wise mocks" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="bg-gradient-to-b from-gray-800 to-gray-950 rounded-3xl p-1 shadow-2xl border border-gray-700 relative">
              <div className="bg-black rounded-[22px] p-6 relative overflow-hidden">
                {/* Simulated UI */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm font-mono text-red-400 font-bold bg-red-400/10 px-3 py-1 rounded">
                    02:45:12
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-4 w-1/4 bg-gray-800 rounded"></div>
                  <div className="h-16 w-full bg-gray-800 rounded-lg"></div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="h-12 w-full bg-blue-600/20 border border-blue-500/50 rounded-lg flex items-center px-4">
                      <div className="w-4 h-4 rounded-full border border-blue-400 mr-3"></div>
                      <div className="h-3 w-1/2 bg-blue-400/50 rounded"></div>
                    </div>
                    <div className="h-12 w-full bg-gray-800 rounded-lg flex items-center px-4">
                      <div className="w-4 h-4 rounded-full border border-gray-600 mr-3"></div>
                      <div className="h-3 w-1/3 bg-gray-600 rounded"></div>
                    </div>
                    <div className="h-12 w-full bg-gray-800 rounded-lg flex items-center px-4">
                      <div className="w-4 h-4 rounded-full border border-gray-600 mr-3"></div>
                      <div className="h-3 w-2/3 bg-gray-600 rounded"></div>
                    </div>
                    <div className="h-12 w-full bg-gray-800 rounded-lg flex items-center px-4">
                      <div className="w-4 h-4 rounded-full border border-gray-600 mr-3"></div>
                      <div className="h-3 w-1/2 bg-gray-600 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SCORE TRANSFORMATIONS - Dark/Green */}
      <section className="section-h relative px-6 md:px-12 py-24 bg-[#020617]">
        <div className="max-w-6xl mx-auto w-full">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-16 text-center">Results that speak.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Ananya S.", city: "Delhi", from: 65, to: 91, subj: "Maths" },
              { name: "Rohan K.", city: "Mumbai", from: 58, to: 88, subj: "Science" },
              { name: "Priya M.", city: "Bangalore", from: 72, to: 94, subj: "Maths" },
            ].map((story, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#22c55e]/10 blur-3xl rounded-full group-hover:bg-[#22c55e]/20 transition-colors"></div>
                
                <div className="mb-8">
                  <p className="text-gray-400 text-sm mb-1">{story.name}, {story.city}</p>
                  <p className="font-bold text-lg text-white">{story.subj}</p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="text-4xl font-display font-bold text-gray-500">{story.from}</div>
                  <ArrowRight className="w-6 h-6 text-[#22c55e]" />
                  <div className="text-6xl font-display font-black text-[#22c55e]">{story.to}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA - Intense Green/Black */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-6 md:px-12 py-24 bg-[#0a0410] relative overflow-hidden">
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-[#22c55e]/20 blur-[150px] rounded-full"></div>
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <h2 className="font-display text-5xl md:text-7xl font-bold mb-10">Start free. <br/>No signup needed.</h2>
          
          <button className="group inline-flex items-center justify-center px-10 py-5 font-bold text-black bg-[#22c55e] rounded-full text-xl transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(34,197,94,0.5)] mb-8">
            Start Free
            <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">
            Data-driven predictions, not guaranteed exam content
          </p>
        </div>
      </section>
    </div>
  );
}

export default StoryScroll;