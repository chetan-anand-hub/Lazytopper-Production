import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-dark)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      {/* Celebration background rays */}
      {phase >= 1 && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center opacity-30"
          initial={{ rotate: 0, scale: 0 }}
          animate={{ rotate: 360, scale: 2 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute w-[2vw] h-[100vh] bg-gradient-to-t from-[var(--color-accent)] to-transparent" style={{ transform: `rotate(${i * 30}deg)` }} />
          ))}
        </motion.div>
      )}

      <div className="relative z-10 flex flex-col items-center">
        
        <motion.div 
          className="relative w-[15vw] h-[15vw] flex items-center justify-center mb-[4vh]"
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1, rotate: 0 } : { scale: 0, opacity: 0, rotate: -180 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <div className="absolute inset-0 bg-[var(--color-accent)]/20 rounded-full blur-2xl" />
          <div className="w-[12vw] h-[12vw] bg-[var(--color-bg-light)] border-4 border-[var(--color-accent)] rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_var(--color-accent)]">
            <div className="text-[var(--color-accent)] font-black text-[4vw] leading-none mb-[-1vh]">14</div>
            <div className="text-white/60 font-bold text-[1.5vw] uppercase tracking-widest">Day Streak</div>
          </div>
          
          {/* Particles */}
          {phase >= 1 && [...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-[1vw] h-[1vw] bg-[var(--color-accent)] rounded-full"
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ 
                x: Math.cos(i * 60 * Math.PI / 180) * 150, 
                y: Math.sin(i * 60 * Math.PI / 180) * 150,
                scale: 0,
                opacity: 0
              }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
          ))}
        </motion.div>

        <motion.h2 
          className="text-[4vw] font-display font-bold text-center leading-tight mb-[6vh]"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          Build the habit. <br/>
          <span className="text-[var(--color-accent)]">Crush the exam.</span>
        </motion.h2>

        <motion.div
          className="flex flex-col items-center gap-[2vh]"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-[1.5vw] text-[3vw] font-display font-bold">
            <div className="w-[3vw] h-[3vw] bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-[1.8vw] h-[1.8vw]"><path d="m13 2-2 2.5h3L11 22l2-2.5h-3L13 2z"/></svg>
            </div>
            LazyTopper
          </div>
          <div className="text-[1.5vw] text-[var(--color-text-secondary)] tracking-wide font-medium">
            We Know What's On The CBSE Board Exam.
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
