import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative z-10 w-full max-w-[60vw] flex flex-col items-center">
        
        <motion.div
          className="text-[2vw] text-[var(--color-text-secondary)] font-medium mb-[2vh]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Step 1. Set your goal
        </motion.div>

        <motion.h1 
          className="text-[6vw] font-display font-bold leading-none tracking-tighter text-center mb-[6vh]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          What's your target <br/>
          <span className="text-[var(--color-primary)]">CBSE score?</span>
        </motion.h1>

        <div className="relative w-full max-w-[40vw] h-[10vh] bg-[var(--color-bg-muted)] rounded-2xl flex items-center p-[1vw] border border-white/5 overflow-hidden">
          <motion.div 
            className="absolute left-0 top-0 bottom-0 bg-[var(--color-primary)]/20"
            initial={{ width: "0%" }}
            animate={{ width: phase >= 2 ? "95%" : "0%" }}
            transition={{ duration: 1, type: "spring", bounce: 0.2 }}
          />
          <motion.div 
            className="absolute left-[95%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-[3vh] h-[3vh] bg-[var(--color-primary)] rounded-full shadow-[0_0_20px_var(--color-primary)]"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: phase >= 2 ? 1 : 0, opacity: phase >= 2 ? 1 : 0 }}
            transition={{ delay: 0.5, type: "spring" }}
          />
          <div className="relative z-10 flex justify-between w-full font-display text-[2vw] font-bold">
            <span className="text-white/40">50%</span>
            <motion.span 
              className="text-[var(--color-primary)]"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={phase >= 3 ? { opacity: 1, scale: 1.2 } : { opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              95%+
            </motion.span>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
