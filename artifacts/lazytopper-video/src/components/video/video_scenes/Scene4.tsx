import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, x: '20vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, y: '20vh', scale: 1.1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[80vw] flex justify-between items-center gap-[4vw]">
        
        <div className="flex-1 flex flex-col gap-[2vh]">
          <motion.div 
            className="bg-[var(--color-bg-light)] border border-white/10 rounded-2xl p-[3vw]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-[1.2vw] text-white/50 font-bold tracking-widest uppercase mb-[2vh]">Practice Mode</div>
            <div className="text-[1.8vw] font-medium leading-relaxed mb-[4vh]">
              Prove that the lengths of tangents drawn from an external point to a circle are equal.
            </div>

            <div className="relative h-[20vh] bg-black/30 rounded-xl border border-white/5 p-[1.5vw] font-mono text-[1.4vw] text-white/80 overflow-hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                In ∆OPA and ∆OQA: <br/>
                OA = OA (Common) <br/>
                OP = OQ (Radii) <br/>
                ∠OPA = ∠OQA = 90°
              </motion.div>
              
              <motion.div 
                className="absolute inset-0 bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)] rounded-xl flex items-center justify-center backdrop-blur-sm"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.1 }}
                transition={{ type: "spring", bounce: 0.4 }}
              >
                <div className="bg-[var(--color-primary)] text-white px-[2vw] py-[1vh] rounded-full font-bold text-[1.5vw] flex items-center gap-[1vw] shadow-[0_0_30px_var(--color-primary)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-[2vw] h-[2vw]"><path d="M20 6L9 17l-5-5"/></svg>
                  Perfect Logic
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <div className="flex-1 pl-[4vw]">
          <motion.h2 
            className="text-[4.5vw] font-display font-bold leading-tight tracking-tighter"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Practice with <br/>
            <span className="text-[var(--color-primary)]">AI-checked</span> <br/>
            step-by-step grading.
          </motion.h2>
        </div>

      </div>
    </motion.div>
  );
}
