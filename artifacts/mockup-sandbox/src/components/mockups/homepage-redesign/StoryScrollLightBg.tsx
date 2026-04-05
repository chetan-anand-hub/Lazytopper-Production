import React, { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, TrendingUp, Target, Calendar, Trophy, BrainCircuit, MessageSquare, Zap, ShieldCheck, ChevronRight, Flame, Award, Star } from "lucide-react";

export function StoryScrollLightBg() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.getElementById("story-scroll-light-bg-fonts")) {
      const link = document.createElement("link");
      link.id = "story-scroll-light-bg-fonts";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="h-full w-full overflow-y-auto overflow-x-hidden bg-white text-[#3c3c3c] selection:bg-[#e6f9e0] selection:text-[#3c3c3c]"
      style={{ fontFamily: "'Nunito', 'Segoe UI', system-ui, sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .font-display-lb { font-family: 'Nunito', sans-serif; }
        .card-shadow-lb { box-shadow: 0 4px 24px -4px rgba(0,0,0,0.06), 0 0 4px rgba(0,0,0,0.02); }
        .section-h-lb { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f7f7f7;
        }
        ::-webkit-scrollbar-thumb {
          background: #e5e5e5;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #ccc;
        }
      `}} />

      {/* 1. HERO SECTION — with background visual from Design C */}
      <section className="section-h-lb relative px-6 md:px-12 py-20 items-center justify-center text-center bg-[#f0fbe8] overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-15 mix-blend-multiply">
          <img src="/__mockup/images/story-scroll-hero-bg.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#f0fbe8]"></div>
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-[#58cc02]/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f0fbe8] to-transparent pointer-events-none z-[1]"></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-[#58cc02]/20 mb-8 backdrop-blur-sm shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#58cc02] animate-pulse"></span>
            <span className="text-sm font-bold tracking-wide text-[#46a302]">CBSE Class 10</span>
          </div>

          <h1 className="font-display-lb text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.1] mb-10 text-[#3c3c3c]">
            We Know What's On <br className="hidden md:block"/>
            <span className="text-[#58cc02]">The Exam.</span>
          </h1>

          <button className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-[#58cc02] rounded-full text-lg transition-all hover:scale-105 hover:bg-[#46a302] shadow-[0_6px_0_#46a302] active:shadow-[0_0px_0_#46a302] active:translate-y-1.5">
            Start Free
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-white flex items-center justify-center overflow-hidden shadow-sm">
                  <span className="text-xs font-bold text-[#777777]">{['A','R','P','S'][i-1]}</span>
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white bg-[#e6f9e0] flex items-center justify-center text-xs font-bold text-[#46a302] shadow-sm">+</div>
            </div>
            <span className="text-sm text-[#777777] font-semibold">12,800+ students cracking boards</span>
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-orange-200 backdrop-blur-sm">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-xs font-bold text-orange-700">12 day streak</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-purple-200 backdrop-blur-sm">
              <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
              <span className="text-xs font-bold text-purple-700">2,450 XP</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#1cb0f6]/30 backdrop-blur-sm">
              <Award className="w-4 h-4 text-[#1cb0f6]" />
              <span className="text-xs font-bold text-[#1cb0f6]">Level 8</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PREDICTION PREVIEW */}
      <section className="section-h-lb relative px-6 md:px-12 py-24 bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="font-display-lb text-4xl md:text-6xl font-black mb-6 text-[#3c3c3c]">See the future. <br/><span className="text-[#58cc02]">Study the trends.</span></h2>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="bg-white rounded-3xl p-6 md:p-8 relative card-shadow-lb border border-[#e5e5e5]">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#58cc02]/10 blur-2xl rounded-full"></div>
              
              <div className="flex justify-between items-end mb-8 border-b border-[#e5e5e5] pb-4">
                <div>
                  <h3 className="font-display-lb text-2xl font-bold text-[#3c3c3c]">Exam Predictor</h3>
                  <span className="text-sm text-[#777777] block">Maths • Class 10</span>
                </div>
                <div className="flex items-center gap-2 text-[#58cc02] text-sm font-bold bg-[#e6f9e0] px-3 py-1 rounded-full">
                  <TrendingUp className="w-4 h-4" /> Live
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { topic: "Quadratic Equations", prob: 92, marks: "12-16", color: "#58cc02", tier: "Must-crack", tierBg: "bg-[#e6f9e0] text-[#46a302]" },
                  { topic: "Light Reflection", prob: 88, marks: "10-14", color: "#58cc02", tier: "Must-crack", tierBg: "bg-[#e6f9e0] text-[#46a302]" },
                  { topic: "Arithmetic Progressions", prob: 85, marks: "8-12", color: "#1cb0f6", tier: "High-ROI", tierBg: "bg-[#ddf4ff] text-[#1cb0f6]" },
                  { topic: "Chemical Reactions", prob: 82, marks: "8-10", color: "#1cb0f6", tier: "High-ROI", tierBg: "bg-[#ddf4ff] text-[#1cb0f6]" },
                  { topic: "Electricity", prob: 78, marks: "6-8", color: "#ff9600", tier: "Good-to-do", tierBg: "bg-orange-100 text-orange-700" },
                ].map((item, i) => (
                  <div key={i} className="group cursor-pointer">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-[#3c3c3c]">{item.topic}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#777777]">{item.marks} marks</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.tierBg}`}>{item.tier}</span>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-[#f7f7f7] rounded-full overflow-hidden flex">
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${item.prob}%`, backgroundColor: item.color }}
                      />
                      <div className="ml-2 text-xs font-bold text-[#777777] group-hover:text-[#3c3c3c] transition-colors">{item.prob}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI TUTOR */}
      <section className="section-h-lb relative px-6 md:px-12 py-24 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
        
        <div className="max-w-6xl mx-auto w-full z-10 relative flex flex-col-reverse lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 w-full">
            <div className="bg-white rounded-3xl p-6 card-shadow-lb border border-[#e5e5e5] relative overflow-hidden">
              <div className="flex items-center gap-4 border-b border-[#e5e5e5] pb-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#58cc02] flex items-center justify-center text-white font-bold text-lg">
                  R
                </div>
                <div>
                  <h3 className="font-display-lb font-bold text-lg text-[#3c3c3c]">Ravi Sir</h3>
                  <span className="text-xs text-[#58cc02] font-bold tracking-wider uppercase block">AI Tutor • Online</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4 w-full md:w-5/6 float-right justify-end">
                  <div className="bg-[#3c3c3c] text-white p-4 rounded-2xl rounded-tr-sm text-sm">
                    I'm stuck on this triangle congruence problem.
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-5/6">
                  <div className="bg-[#f7f7f7] border border-[#e5e5e5] p-4 rounded-2xl rounded-tl-sm text-sm text-[#3c3c3c]">
                    <span>Compare <strong>△ABC</strong> and <strong>△PQR</strong>. What links ∠A to ∠P?</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2">
            <h2 className="font-display-lb text-4xl md:text-6xl font-black mb-10 leading-tight text-[#3c3c3c]">Your 24/7 <br/>personal coach.</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: <MessageSquare className="w-6 h-6 text-[#1cb0f6]" />, text: "Step-by-step teaching" },
                { icon: <CheckCircle2 className="w-6 h-6 text-[#58cc02]" />, text: "Marking scheme tips" },
                { icon: <BrainCircuit className="w-6 h-6 text-purple-500" />, text: "Learns your weak spots" },
                { icon: <Zap className="w-6 h-6 text-[#ffc800]" />, text: "Available 24/7" }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 bg-[#f7f7f7] p-4 rounded-xl border border-[#e5e5e5]">
                  <div className="p-2 bg-white rounded-lg card-shadow-lb">{feature.icon}</div>
                  <span className="font-bold text-sm text-[#3c3c3c]">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. SMART STUDY SYSTEM */}
      <section className="section-h-lb relative px-6 md:px-12 py-24 bg-[#f7f7f7]">
        <div className="max-w-6xl mx-auto w-full flex flex-col items-center">
          <h2 className="font-display-lb text-4xl md:text-6xl font-black mb-16 text-center max-w-2xl text-[#3c3c3c]">
            Don't work hard. <br/><span className="text-[#58cc02]">Work smart.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="bg-white border border-[#e5e5e5] p-8 rounded-3xl hover:border-[#ffc800]/50 transition-colors group card-shadow-lb">
              <Calendar className="w-10 h-10 text-[#ffc800] mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-2 text-[#3c3c3c]">Daily Mix</h3>
              <span className="text-[#777777] block">Your daily 20-min session</span>
            </div>
            
            <div className="bg-white border border-[#e5e5e5] p-8 rounded-3xl hover:border-[#ff9600]/50 transition-colors group card-shadow-lb">
              <Target className="w-10 h-10 text-[#ff9600] mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-2 text-[#3c3c3c]">Weak Areas</h3>
              <span className="text-[#777777] block">AI finds your gaps</span>
            </div>

            <div className="bg-white border border-[#e5e5e5] p-8 rounded-3xl hover:border-[#1cb0f6]/50 transition-colors group card-shadow-lb">
              <TrendingUp className="w-10 h-10 text-[#1cb0f6] mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-2 text-[#3c3c3c]">Study Planner</h3>
              <span className="text-[#777777] block">Custom plan to your target</span>
            </div>

            <div className="bg-white border border-[#e5e5e5] p-8 rounded-3xl hover:border-[#58cc02]/50 transition-colors group card-shadow-lb">
              <Trophy className="w-10 h-10 text-[#58cc02] mb-6 group-hover:scale-110 transition-transform" />
              <h3 className="text-2xl font-bold mb-2 text-[#3c3c3c]">Weekly Report</h3>
              <span className="text-[#777777] block">Track your growth</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRACTICE & MOCK TESTS — with background visual from Design C */}
      <section className="section-h-lb relative px-6 md:px-12 py-24 bg-[#f0fbe8] overflow-hidden">
        <div className="absolute inset-0 opacity-10 mix-blend-multiply">
          <img src="/__mockup/images/story-scroll-test-bg.png" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[#58cc02]/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto w-full z-10 relative flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="font-display-lb text-4xl md:text-6xl font-black mb-10 leading-tight text-[#3c3c3c]">Practice like <br/>it's the real thing.</h2>
            
            <div className="space-y-6">
              {[
                { text: "Full CBSE-format papers" },
                { text: "Adaptive difficulty" },
                { text: "AI checks your answers" },
                { text: "Topic-wise mocks" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/80 flex items-center justify-center text-[#58cc02] shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-xl font-semibold text-[#3c3c3c]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-1 card-shadow-lb border border-[#e5e5e5] relative">
              <div className="bg-[#f7f7f7] rounded-[22px] p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-[#e5e5e5]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-sm font-mono text-[#ff9600] font-bold bg-[#ff9600]/10 px-3 py-1 rounded">
                    02:45:12
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-4 w-1/4 bg-[#e5e5e5] rounded"></div>
                  <div className="h-16 w-full bg-[#e5e5e5] rounded-lg"></div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="h-12 w-full bg-[#ddf4ff] border border-[#1cb0f6]/30 rounded-lg flex items-center px-4">
                      <div className="w-4 h-4 rounded-full border-2 border-[#1cb0f6] mr-3"></div>
                      <div className="h-3 w-1/2 bg-[#1cb0f6]/30 rounded"></div>
                    </div>
                    <div className="h-12 w-full bg-white border border-[#e5e5e5] rounded-lg flex items-center px-4">
                      <div className="w-4 h-4 rounded-full border border-[#afafaf] mr-3"></div>
                      <div className="h-3 w-1/3 bg-[#e5e5e5] rounded"></div>
                    </div>
                    <div className="h-12 w-full bg-white border border-[#e5e5e5] rounded-lg flex items-center px-4">
                      <div className="w-4 h-4 rounded-full border border-[#afafaf] mr-3"></div>
                      <div className="h-3 w-2/3 bg-[#e5e5e5] rounded"></div>
                    </div>
                    <div className="h-12 w-full bg-white border border-[#e5e5e5] rounded-lg flex items-center px-4">
                      <div className="w-4 h-4 rounded-full border border-[#afafaf] mr-3"></div>
                      <div className="h-3 w-1/2 bg-[#e5e5e5] rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SCORE TRANSFORMATIONS */}
      <section className="section-h-lb relative px-6 md:px-12 py-24 bg-white">
        <div className="max-w-6xl mx-auto w-full">
          <h2 className="font-display-lb text-4xl md:text-6xl font-black mb-16 text-center text-[#3c3c3c]">Results that speak.</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Ananya S.", city: "Delhi", from: 65, to: 91, subj: "Maths" },
              { name: "Rohan K.", city: "Mumbai", from: 58, to: 88, subj: "Science" },
              { name: "Priya M.", city: "Bangalore", from: 72, to: 94, subj: "Maths" },
            ].map((story, i) => (
              <div key={i} className="bg-[#f7f7f7] border border-[#e5e5e5] rounded-3xl p-8 relative overflow-hidden group card-shadow-lb">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#58cc02]/5 blur-3xl rounded-full group-hover:bg-[#58cc02]/10 transition-colors"></div>
                
                <div className="mb-8">
                  <span className="text-[#777777] text-sm mb-1 block">{story.name}, {story.city}</span>
                  <span className="font-bold text-lg text-[#3c3c3c] block">{story.subj}</span>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="text-4xl font-display-lb font-bold text-[#afafaf]">{story.from}</div>
                  <ArrowRight className="w-6 h-6 text-[#58cc02]" />
                  <div className="text-6xl font-display-lb font-black text-[#58cc02]">{story.to}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-6 md:px-12 py-24 bg-[#f7f7f7] relative overflow-hidden">
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-[#58cc02]/8 blur-[150px] rounded-full"></div>
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <h2 className="font-display-lb text-5xl md:text-7xl font-black mb-10 text-[#3c3c3c]">Start free. <br/>No signup needed.</h2>
          
          <button className="group inline-flex items-center justify-center px-10 py-5 font-bold text-white bg-[#58cc02] rounded-full text-xl transition-all hover:scale-105 hover:bg-[#46a302] shadow-[0_6px_0_#46a302] active:shadow-[0_0px_0_#46a302] active:translate-y-1.5 mb-8">
            Start Free
            <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>

          <span className="text-xs text-[#afafaf] uppercase tracking-widest font-bold block">
            Data-driven predictions, not guaranteed exam content
          </span>
        </div>
      </section>
    </div>
  );
}

export default StoryScrollLightBg;
