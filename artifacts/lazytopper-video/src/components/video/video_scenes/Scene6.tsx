import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-dark)]"
      {...sceneTransitions.scaleFade}
    >
      {/* Confetti / Celebration background */}
      {phase >= 1 && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1.5, rotate: 45 }}
          transition={{ duration: 10, ease: "linear" }}
        >
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute w-[1vw] h-[1vw] bg-[var(--color-primary)] rounded-full" 
                 style={{ 
                   transform: `rotate(${i * 18}deg) translateY(-20vw)`,
                   backgroundColor: i % 2 === 0 ? 'var(--color-primary)' : 'var(--color-accent)'
                 }} />
          ))}
        </motion.div>
      )}

      <div className="relative z-10 flex flex-col items-center w-full max-w-[80vw]">
        
        {/* Weekly Wrapped Card */}
        <motion.div 
          className="bg-[var(--color-bg-light)]/80 backdrop-blur-md border border-white/20 rounded-[3vw] p-[3vw] flex flex-col items-center w-[40vw] shadow-2xl mb-[6vh]"
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { y: 0, opacity: 1, scale: 1 } : { y: 50, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="text-[1.5vw] text-white/50 uppercase tracking-widest font-bold mb-[2vh]">Weekly Wrapped</div>
          <div className="flex w-full justify-around mt-[2vh]">
            <div className="flex flex-col items-center">
              <div className="text-[3vw] font-display font-bold text-[var(--color-primary)]">12</div>
              <div className="text-[1vw] text-white/70">Hours Studied</div>
            </div>
            <div className="w-[1px] bg-white/10" />
            <div className="flex flex-col items-center">
              <div className="text-[3vw] font-display font-bold text-[var(--color-accent)] flex items-center gap-[0.5vw]">
                85%
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-[2vw] h-[2vw]"><path d="m18 15-6-6-6 6"/></svg>
              </div>
              <div className="text-[1vw] text-white/70">Accuracy</div>
            </div>
          </div>
        </motion.div>

        {/* Brand Lockup */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-[1.5vw] text-[4vw] font-display font-bold mb-[1vh]">
            <div className="w-[4vw] h-[4vw] bg-[var(--color-primary)] rounded-xl flex items-center justify-center text-white shadow-[0_0_30px_var(--color-primary)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-[2.5vw] h-[2.5vw]"><path d="m13 2-2 2.5h3L11 22l2-2.5h-3L13 2z"/></svg>
            </div>
            LazyTopper
          </div>
          
          <motion.div 
            className="text-[2vw] text-white/80 tracking-wide font-medium"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1 }}
          >
            From Chore to Habit.
          </motion.div>
        </motion.div>

      </div>
    </motion.div>
  );
}
