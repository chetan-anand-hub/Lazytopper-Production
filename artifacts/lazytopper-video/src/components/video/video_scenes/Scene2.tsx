import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2800),
      setTimeout(() => setPhase(5), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      {...sceneTransitions.slideUp}
    >
      <div className="relative z-10 w-full h-full flex items-center justify-center gap-[10vw]">
        
        {/* Phone UI Mockup */}
        <motion.div 
          className="relative w-[22vw] h-[45vw] bg-black border-[0.5vw] border-white/20 rounded-[3vw] overflow-hidden flex flex-col p-[2vw] shadow-2xl shadow-[var(--color-primary)]/20"
          initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
          animate={{ rotateY: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {phase >= 1 && (
            <motion.div 
              className="w-full bg-white/10 rounded-xl p-[1vw] mb-[1vw]"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            >
              <div className="text-[1vw] text-white/50">Subjects</div>
              <div className="text-[1.5vw] text-white font-bold">Physics & Math</div>
            </motion.div>
          )}

          {phase >= 2 && (
            <motion.div 
              className="w-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/50 rounded-xl p-[1vw] mb-[1vw]"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring" }}
            >
              <div className="text-[1vw] text-[var(--color-primary)]">Target Score</div>
              <div className="text-[2vw] text-white font-bold tracking-tight">95%+</div>
            </motion.div>
          )}

          {phase >= 3 && (
            <motion.div 
              className="w-full bg-white/10 rounded-xl p-[1vw]"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-[1vw] text-white/50">Mentor Vibe</div>
              <div className="flex gap-[0.5vw] mt-[0.5vw]">
                <div className="px-[1vw] py-[0.5vw] bg-[var(--color-secondary)]/30 border border-[var(--color-secondary)] rounded-full text-[1vw]">Friendly</div>
                <div className="px-[1vw] py-[0.5vw] bg-white/5 rounded-full text-[1vw] text-white/50">Strict</div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Copy */}
        <div className="w-[30vw]">
          <motion.h2 
            className="text-[4vw] font-display font-bold leading-tight"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            Built for <br/><span className="text-[var(--color-primary)]">your success.</span>
          </motion.h2>
        </div>

      </div>
    </motion.div>
  );
}
