import React from 'react';
import { 
  ArrowRight, 
  BarChart3, 
  Target, 
  Calendar, 
  Trophy, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Zap, 
  BookOpen, 
  Sparkles, 
  ChevronRight,
  TrendingUp,
  Brain,
  Flame,
  Award,
  Star
} from 'lucide-react';

const Avatar = ({ src, fallback, index }: { src?: string, fallback: string, index: number }) => (
  <div 
    className={`w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 relative`}
    style={{ marginLeft: index > 0 ? '-12px' : '0', zIndex: 10 - index }}
  >
    {src ? <img src={src} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : fallback}
  </div>
);

const ProgressBar = ({ label, percentage, marks, tier, colorClass }: { label: string; percentage: number; marks: string; tier: string; colorClass: string }) => (
  <div className="mb-4">
    <div className="flex justify-between items-end mb-2">
      <div>
        <span className="font-semibold text-slate-800 block text-sm">{label}</span>
        <span className="text-xs text-slate-500">{marks}</span>
      </div>
      <div className="text-right">
        <span className="font-bold text-slate-800 text-sm block">{percentage}%</span>
        <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${colorClass}`}>{tier}</span>
      </div>
    </div>
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${percentage}%`, backgroundColor: colorClass.includes('green') ? '#58cc02' : colorClass.includes('blue') ? '#3b82f6' : '#f97316' }}
      />
    </div>
  </div>
);

export default function CleanFocus() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-green-100 selection:text-green-900">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        .font-jakarta {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        
        .hero-gradient {
          background: radial-gradient(circle at 50% 0%, rgba(88, 204, 2, 0.08) 0%, rgba(250, 250, 250, 0) 70%);
        }
        
        .soft-shadow {
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04), 0 0 3px rgba(0,0,0,0.02);
        }
      `}} />

      <div className="font-jakarta hero-gradient max-w-md mx-auto sm:max-w-none">
        
        {/* SECTION 1: Hero */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-20 pb-12 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 mb-8 shadow-sm">
            <Sparkles className="w-3 h-3 text-[#58cc02]" />
            <span>CBSE Class 10 Prep</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 max-w-4xl leading-[1.1]">
            Know exactly what's coming in the exam.
          </h1>
          
          <button className="bg-[#58cc02] hover:bg-[#4ba802] text-white text-lg font-bold py-4 px-10 rounded-2xl shadow-[0_8px_0_#4ba802] active:shadow-[0_0px_0_#4ba802] active:translate-y-2 transition-all flex items-center gap-2 mb-10">
            Start Free
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="flex">
              <Avatar fallback="A" index={0} />
              <Avatar fallback="R" index={1} />
              <Avatar fallback="P" index={2} />
              <Avatar fallback="S" index={3} />
            </div>
            <div className="text-sm font-medium text-slate-600">
              <strong className="text-slate-900">12,800+</strong> students
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span className="text-xs font-bold text-orange-700">12 day streak</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200">
              <Star className="w-4 h-4 text-purple-500 fill-purple-500" />
              <span className="text-xs font-bold text-purple-700">2,450 XP</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
              <Award className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-700">Level 8</span>
            </div>
          </div>
        </section>

        {/* SECTION 2: Prediction Preview */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 bg-white">
          <div className="max-w-5xl w-full mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-[#58cc02]" />
              </div>
              <h2 className="text-4xl font-bold tracking-tight mb-6">Master the high-probability topics first.</h2>
            </div>
            
            <div className="bg-white border border-slate-100 rounded-3xl p-8 soft-shadow w-full">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#58cc02]" />
                  Exam Prediction Model
                </h3>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">LIVE</span>
              </div>
              
              <ProgressBar label="Quadratic Equations" percentage={92} marks="12-16 marks" tier="Must-crack" colorClass="bg-green-100 text-green-700" />
              <ProgressBar label="Light Reflection" percentage={88} marks="10-14 marks" tier="Must-crack" colorClass="bg-green-100 text-green-700" />
              <ProgressBar label="Arithmetic Progressions" percentage={85} marks="8-12 marks" tier="High-ROI" colorClass="bg-blue-100 text-blue-700" />
              <ProgressBar label="Chemical Reactions" percentage={82} marks="8-10 marks" tier="High-ROI" colorClass="bg-blue-100 text-blue-700" />
              <ProgressBar label="Electricity" percentage={78} marks="6-8 marks" tier="Good-to-do" colorClass="bg-orange-100 text-orange-700" />
            </div>
          </div>
        </section>

        {/* SECTION 3: AI Tutor */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 bg-[#fafafa]">
          <div className="max-w-5xl w-full mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="bg-white rounded-3xl p-6 soft-shadow border border-slate-100 relative z-10">
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                  <div className="w-10 h-10 bg-[#58cc02] rounded-full flex items-center justify-center text-white font-bold">
                    R
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Ravi Sir</h4>
                    <span className="text-xs text-green-600 font-medium block">AI Personal Tutor</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-700 max-w-[85%]">
                    What's the formula for tan(θ)?
                  </div>
                  <div className="bg-[#58cc02] text-white rounded-2xl rounded-tr-sm p-4 text-sm max-w-[85%] ml-auto">
                    Opposite / Adjacent?
                  </div>
                  <div className="bg-slate-50 rounded-2xl rounded-tl-sm p-4 text-sm text-slate-700 max-w-[85%]">
                    Correct! Find the opposite side length.
                  </div>
                </div>
              </div>
              
              {/* Decorative background elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-green-100 rounded-full blur-3xl opacity-50 z-0"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 z-0"></div>
            </div>
            
            <div className="order-1 md:order-2">
              <h2 className="text-4xl font-bold tracking-tight mb-10">Your personal AI tutor, always ready.</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-white p-2 rounded-xl soft-shadow text-[#58cc02]"><MessageSquare className="w-4 h-4" /></div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Step-by-step teaching</h5>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-white p-2 rounded-xl soft-shadow text-blue-500"><CheckCircle2 className="w-4 h-4" /></div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Marking scheme tips</h5>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-white p-2 rounded-xl soft-shadow text-orange-500"><Brain className="w-4 h-4" /></div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Learns your weak spots</h5>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-white p-2 rounded-xl soft-shadow text-purple-500"><Clock className="w-4 h-4" /></div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Available 24/7</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: Smart Study System */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 bg-white">
          <div className="max-w-4xl w-full mx-auto text-center">
            <h2 className="text-4xl font-bold tracking-tight mb-16">A system built for focus.</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                <div className="w-14 h-14 bg-white rounded-2xl soft-shadow flex items-center justify-center mb-6 text-blue-500">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">Daily Mix</h3>
                <span className="text-slate-500 text-sm font-medium block">Your daily 20-min session</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                <div className="w-14 h-14 bg-white rounded-2xl soft-shadow flex items-center justify-center mb-6 text-red-500">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">Weak Areas</h3>
                <span className="text-slate-500 text-sm font-medium block">AI finds your gaps</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                <div className="w-14 h-14 bg-white rounded-2xl soft-shadow flex items-center justify-center mb-6 text-indigo-500">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">Study Planner</h3>
                <span className="text-slate-500 text-sm font-medium block">Custom plan to your target</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 flex flex-col items-center text-center transition-transform hover:-translate-y-1">
                <div className="w-14 h-14 bg-white rounded-2xl soft-shadow flex items-center justify-center mb-6 text-amber-500">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">Weekly Report</h3>
                <span className="text-slate-500 text-sm font-medium block">Track your growth</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: Practice & Mock Tests */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 bg-[#fafafa]">
          <div className="max-w-5xl w-full mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight mb-10">Real exam environment. Real results.</h2>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 soft-shadow">
                  <BookOpen className="w-6 h-6 text-[#58cc02]" />
                  <span className="font-bold text-slate-800 text-sm">Full CBSE-format papers</span>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 soft-shadow">
                  <Zap className="w-6 h-6 text-blue-500" />
                  <span className="font-bold text-slate-800 text-sm">Adaptive difficulty</span>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 soft-shadow">
                  <CheckCircle2 className="w-6 h-6 text-purple-500" />
                  <span className="font-bold text-slate-800 text-sm">AI checks your answers</span>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 soft-shadow">
                  <Target className="w-6 h-6 text-orange-500" />
                  <span className="font-bold text-slate-800 text-sm">Topic-wise mocks</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 soft-shadow border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <span className="font-mono font-bold text-xl text-slate-800">02:45:12</span>
                </div>
                <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Live Mock
                </div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="h-4 bg-slate-100 rounded-full w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                <div className="h-4 bg-slate-100 rounded-full w-5/6"></div>
              </div>
              
              <div className="grid grid-cols-5 gap-2 mb-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className={`h-8 rounded-md flex items-center justify-center text-xs font-bold ${
                    i < 4 ? 'bg-[#58cc02] text-white' : i === 4 ? 'bg-blue-500 text-white ring-2 ring-blue-200' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {i + 1}
                  </div>
                ))}
              </div>
              
              <button className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition-colors">
                Submit Section A
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 6: Score Transformations */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 bg-white">
          <h2 className="text-4xl font-bold tracking-tight mb-16 text-center max-w-2xl mx-auto">Real students. Real results.</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 transform group-hover:scale-110 transition-transform duration-500"><TrendingUp className="w-24 h-24 text-[#58cc02]" /></div>
              <div className="relative z-10">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Maths</div>
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="text-4xl font-bold text-slate-300 line-through">65</span>
                  <ArrowRight className="w-6 h-6 text-slate-300" />
                  <span className="text-6xl font-extrabold text-[#58cc02]">91</span>
                </div>
                <div className="font-bold text-slate-900">Ananya S., Delhi</div>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 transform group-hover:scale-110 transition-transform duration-500"><TrendingUp className="w-24 h-24 text-blue-500" /></div>
              <div className="relative z-10">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Science</div>
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="text-4xl font-bold text-slate-300 line-through">58</span>
                  <ArrowRight className="w-6 h-6 text-slate-300" />
                  <span className="text-6xl font-extrabold text-blue-500">88</span>
                </div>
                <div className="font-bold text-slate-900">Rohan K., Mumbai</div>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 transform group-hover:scale-110 transition-transform duration-500"><TrendingUp className="w-24 h-24 text-purple-500" /></div>
              <div className="relative z-10">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Maths</div>
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="text-4xl font-bold text-slate-300 line-through">72</span>
                  <ArrowRight className="w-6 h-6 text-slate-300" />
                  <span className="text-6xl font-extrabold text-purple-500">94</span>
                </div>
                <div className="font-bold text-slate-900">Priya M., Bangalore</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: Final CTA */}
        <section className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-20 text-center relative bg-[#fafafa]">
          <h2 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-12 max-w-3xl leading-[1.1]">
            Start free. No signup needed.
          </h2>
          
          <button className="bg-[#58cc02] hover:bg-[#4ba802] text-white text-lg font-bold py-4 px-10 rounded-2xl shadow-[0_8px_0_#4ba802] active:shadow-[0_0px_0_#4ba802] active:translate-y-2 transition-all flex items-center gap-2 mb-8">
            Start Free
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <span className="text-xs font-medium text-slate-400 max-w-sm block">
            *Data-driven predictions, not guaranteed exam content
          </span>
        </section>

      </div>
    </div>
  );
}
