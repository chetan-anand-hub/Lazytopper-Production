import React, { useEffect, useRef } from "react";
import { ArrowRight, CheckCircle2, TrendingUp, Target, Calendar, BrainCircuit, MessageSquare, Zap, ShieldCheck, ChevronRight, Flame, Award, Star, LayoutDashboard, Play } from "lucide-react";

export function StoryScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

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

        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes float-y-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          75% { transform: rotate(6deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 0px currentColor); }
          50% { opacity: 0.85; filter: drop-shadow(0 0 8px currentColor); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-4px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes video-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(34,197,94,0); }
        }

        .anim-float { animation: float-y 3s ease-in-out infinite; }
        .anim-float-slow { animation: float-y-slow 4s ease-in-out infinite; }
        .anim-wiggle { animation: wiggle 2.5s ease-in-out infinite; }
        .anim-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .anim-spin-slow { animation: spin-slow 8s linear infinite; }
        .anim-bounce { animation: bounce-gentle 2s ease-in-out infinite; }
        .anim-fade-in { animation: fade-in-up 0.6s ease-out both; }

        .anim-float-d1 { animation: float-y 3s ease-in-out 0.2s infinite; }
        .anim-float-d2 { animation: float-y 3s ease-in-out 0.5s infinite; }
        .anim-float-d3 { animation: float-y 3s ease-in-out 0.8s infinite; }
        .anim-float-d4 { animation: float-y 3s ease-in-out 1.1s infinite; }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
      `}} />

      {/* 1. HERO SECTION */}
      <section className="section-h relative px-6 md:px-12 py-20 items-center justify-center text-center bg-[#0a0410] overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img src="/__mockup/images/story-scroll-hero-bg.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0410]"></div>
        </div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 h-3/4 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.1] mb-10">
            We Know What's On <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22c55e] to-[#3b82f6]">The CBSE Board Exam.</span>
          </h1>

          <button className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-black bg-[#22c55e] rounded-full text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(34,197,94,0.4)]">
            Start Free
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0a0410] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center overflow-hidden">
                  <span className="text-xs font-bold text-gray-400">{['A','R','P','S'][i-1]}</span>
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-[#0a0410] bg-white/10 backdrop-blur-md flex items-center justify-center text-xs font-bold">+</div>
            </div>
            <span className="text-sm text-gray-400 font-medium">12,800+ students cracking boards</span>
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400 anim-wiggle" />
              <span className="text-xs font-bold text-orange-300">12 day streak</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30">
              <Star className="w-4 h-4 text-purple-400 fill-purple-400 anim-pulse-glow" />
              <span className="text-xs font-bold text-purple-300">2,450 XP</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30">
              <Award className="w-4 h-4 text-blue-400 anim-bounce" />
              <span className="text-xs font-bold text-blue-300">Level 8</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PREDICTION PREVIEW */}
      <section className="section-h relative px-6 md:px-12 py-24 bg-gradient-to-b from-[#0a0410] to-[#0f0c29]">
        <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-6">See the future. <br/><span className="text-purple-400">Study the trends.</span></h2>
          </div>

          <div className="lg:w-1/2 w-full">
            <div className="glass-panel rounded-3xl p-6 md:p-8 relative">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/30 blur-2xl rounded-full"></div>
              
              <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-display text-2xl font-bold">Exam Predictor</h3>
                  <span className="text-sm text-gray-400 block">Maths • Class 10</span>
                </div>
                <div className="flex items-center gap-2 text-[#22c55e] text-sm font-bold bg-[#22c55e]/10 px-3 py-1 rounded-full">
                  <TrendingUp className="w-4 h-4 anim-bounce" /> Live
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
                        <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12" style={{ animation: 'shimmer 2s infinite' }}></div>
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

      {/* 3. AI TUTOR — Running conversation */}
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
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 border border-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-green-700 uppercase">Live</span>
                </div>
              </div>

              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                <div className="flex justify-end" style={{ animation: 'fade-in-up 0.5s ease-out both', animationDelay: '0s' }}>
                  <div className="bg-gray-900 text-white p-3.5 rounded-2xl rounded-tr-sm text-sm max-w-[80%]">
                    Sir, I don't understand congruence of triangles 😕
                  </div>
                </div>

                <div className="flex" style={{ animation: 'fade-in-up 0.5s ease-out both', animationDelay: '0.3s' }}>
                  <div className="bg-white border border-gray-200 shadow-sm p-3.5 rounded-2xl rounded-tl-sm text-sm max-w-[80%]">
                    <span>No worries! Let's start simple. If two triangles have the same shape and size, they're <strong>congruent</strong>. Think of it like photocopies 📄</span>
                  </div>
                </div>

                <div className="flex justify-end" style={{ animation: 'fade-in-up 0.5s ease-out both', animationDelay: '0.6s' }}>
                  <div className="bg-gray-900 text-white p-3.5 rounded-2xl rounded-tr-sm text-sm max-w-[80%]">
                    Ok, but how do I prove two triangles are congruent?
                  </div>
                </div>

                <div className="flex" style={{ animation: 'fade-in-up 0.5s ease-out both', animationDelay: '0.9s' }}>
                  <div className="bg-white border border-gray-200 shadow-sm p-3.5 rounded-2xl rounded-tl-sm text-sm max-w-[80%]">
                    <span>Great question! There are 5 rules: <strong>SSS, SAS, ASA, AAS, RHS</strong>. Let's try SAS first — compare <strong>△ABC</strong> and <strong>△PQR</strong>. What links ∠A to ∠P?</span>
                  </div>
                </div>

                <div className="flex justify-end" style={{ animation: 'fade-in-up 0.5s ease-out both', animationDelay: '1.2s' }}>
                  <div className="bg-gray-900 text-white p-3.5 rounded-2xl rounded-tr-sm text-sm max-w-[80%]">
                    They're both 60°, and the sides around them are equal!
                  </div>
                </div>

                <div className="flex" style={{ animation: 'fade-in-up 0.5s ease-out both', animationDelay: '1.5s' }}>
                  <div className="bg-white border border-gray-200 shadow-sm p-3.5 rounded-2xl rounded-tl-sm text-sm max-w-[80%]">
                    <span>Exactly! 🎯 Two sides + included angle match = <strong>SAS congruence</strong>. You just nailed a 3-mark board answer!</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 pl-2 pt-1" style={{ animation: 'fade-in-up 0.5s ease-out both', animationDelay: '1.8s' }}>
                  <span className="w-2 h-2 rounded-full bg-gray-400" style={{ animation: 'typing-dot 1.4s infinite 0s' }}></span>
                  <span className="w-2 h-2 rounded-full bg-gray-400" style={{ animation: 'typing-dot 1.4s infinite 0.2s' }}></span>
                  <span className="w-2 h-2 rounded-full bg-gray-400" style={{ animation: 'typing-dot 1.4s infinite 0.4s' }}></span>
                  <span className="text-xs text-gray-400 ml-2 font-medium">Ravi Sir is typing...</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-10 leading-tight">Your 24/7 <br/>personal coach.</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: <MessageSquare className="w-6 h-6 text-blue-500" />, text: "Step-by-step teaching", animClass: "anim-float" },
                { icon: <CheckCircle2 className="w-6 h-6 text-green-500" />, text: "Marking scheme tips", animClass: "anim-float-d1" },
                { icon: <BrainCircuit className="w-6 h-6 text-purple-500" />, text: "Learns your weak spots", animClass: "anim-float-d2" },
                { icon: <Zap className="w-6 h-6 text-amber-500" />, text: "Available 24/7", animClass: "anim-float-d3" }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-lg transition-shadow">
                  <div className={`p-2 bg-white rounded-lg shadow-sm ${feature.animClass}`}>{feature.icon}</div>
                  <span className="font-bold text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. SMART STUDY SYSTEM — with video placeholder + Personalised Dashboard */}
      <section className="section-h relative px-6 md:px-12 py-24 bg-[#050505]">
        <div className="max-w-6xl mx-auto w-full flex flex-col items-center">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-16 text-center max-w-2xl">
            Don't work hard. <br/><span className="text-amber-400">Work smart.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-10">
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl hover:border-amber-400/50 transition-colors group">
              <div className="anim-wiggle inline-block">
                <Calendar className="w-10 h-10 text-amber-400 mb-6 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Daily Mix</h3>
              <span className="text-gray-400 block">Your daily 20-min session</span>
            </div>
            
            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl hover:border-red-400/50 transition-colors group">
              <div className="anim-pulse-glow inline-block">
                <Target className="w-10 h-10 text-red-400 mb-6 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Weak Areas</h3>
              <span className="text-gray-400 block">AI finds your gaps</span>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl hover:border-blue-400/50 transition-colors group">
              <div className="anim-float inline-block">
                <TrendingUp className="w-10 h-10 text-blue-400 mb-6 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Study Planner</h3>
              <span className="text-gray-400 block">Custom plan to your target</span>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 p-8 rounded-3xl hover:border-[#22c55e]/50 transition-colors group">
              <div className="anim-spin-slow inline-block">
                <LayoutDashboard className="w-10 h-10 text-[#22c55e] mb-6 group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Personalised Dashboard</h3>
              <span className="text-gray-400 block">Your progress, your way</span>
            </div>
          </div>

          <div className="w-full max-w-3xl mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900 via-gray-950 to-black group cursor-pointer">
              <div className="absolute inset-0 bg-[#22c55e]/5 group-hover:bg-[#22c55e]/10 transition-colors"></div>
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12" style={{ animation: 'shimmer 3s infinite' }}></div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                <div className="w-16 h-16 rounded-full bg-[#22c55e] flex items-center justify-center shadow-lg" style={{ animation: 'video-pulse 2s ease-in-out infinite' }}>
                  <Play className="w-7 h-7 text-black fill-black ml-1" />
                </div>
                <span className="text-sm font-bold text-gray-300 tracking-wide">See how it works — 15 sec</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <div className="h-full w-0 bg-[#22c55e] rounded-r-full group-hover:w-1/3 transition-all duration-1000"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRACTICE & MOCK TESTS */}
      <section className="section-h relative px-6 md:px-12 py-24 bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="/__mockup/images/story-scroll-test-bg.png" alt="" className="w-full h-full object-cover" />
        </div>
        
        <div className="max-w-6xl mx-auto w-full z-10 relative flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="font-display text-4xl md:text-6xl font-bold mb-10 leading-tight">Practice like <br/>it's the real thing.</h2>
            
            <div className="space-y-6">
              {[
                { text: "Full CBSE-format papers", delay: 0 },
                { text: "Adaptive difficulty", delay: 0.15 },
                { text: "AI checks your answers", delay: 0.3 },
                { text: "Topic-wise mocks", delay: 0.45 }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 anim-bounce" style={{ animationDelay: `${item.delay}s` }}>
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
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <div className="text-sm font-mono text-red-400 font-bold bg-red-400/10 px-3 py-1 rounded animate-pulse">
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

      {/* 6. SCORE TRANSFORMATIONS */}
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
                  <span className="text-gray-400 text-sm mb-1 block">{story.name}, {story.city}</span>
                  <span className="font-bold text-lg text-white block">{story.subj}</span>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="text-4xl font-display font-bold text-gray-500">{story.from}</div>
                  <ArrowRight className="w-6 h-6 text-[#22c55e] anim-bounce" />
                  <div className="text-6xl font-display font-black text-[#22c55e]">{story.to}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA — Button only */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-6 md:px-12 py-24 bg-[#0a0410] relative overflow-hidden">
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-[#22c55e]/20 blur-[150px] rounded-full"></div>
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <button className="group inline-flex items-center justify-center px-10 py-5 font-bold text-black bg-[#22c55e] rounded-full text-xl transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(34,197,94,0.5)]">
            Start Free
            <ChevronRight className="ml-2 w-6 h-6 anim-bounce group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>
    </div>
  );
}

export default StoryScroll;
