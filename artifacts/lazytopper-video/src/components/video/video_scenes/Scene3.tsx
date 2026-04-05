import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: '-20vw' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[80vw] flex flex-col items-center">
        
        <motion.h2 
          className="text-[3.5vw] font-display font-bold text-center mb-[4vh]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Stuck? Ask <span className="text-[var(--color-secondary)]">Ravi Sir</span>.
        </motion.h2>

        <div className="w-[50vw] bg-[var(--color-bg-light)] rounded-3xl border border-white/10 p-[2vw] flex flex-col gap-[2vh] shadow-2xl">
          
          {/* User Message */}
          <motion.div 
            className="self-end bg-[var(--color-secondary)] text-white p-[1.5vw] rounded-2xl rounded-tr-sm max-w-[80%] text-[1.4vw]"
            initial={{ opacity: 0, scale: 0.8, transformOrigin: 'top right' }}
            animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            I don't understand how to balance this equation: <br/>
            <span className="font-mono mt-[1vh] block opacity-80">Fe + H2O → Fe3O4 + H2</span>
          </motion.div>

          {/* AI Typing Indicator */}
          <motion.div 
            className="self-start bg-[var(--color-bg-muted)] text-white p-[1.5vw] rounded-2xl rounded-tl-sm text-[1.4vw] flex gap-2 items-center"
            initial={{ opacity: 0, scale: 0.8, transformOrigin: 'top left' }}
            animate={phase === 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8, display: 'none' }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}>●</motion.span>
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}>●</motion.span>
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}>●</motion.span>
          </motion.div>

          {/* AI Message */}
          <motion.div 
            className="self-start bg-[var(--color-bg-muted)] text-white p-[1.5vw] rounded-2xl rounded-tl-sm max-w-[85%] text-[1.4vw] border border-[var(--color-secondary)]/30"
            initial={{ opacity: 0, scale: 0.8, transformOrigin: 'top left' }}
            animate={phase >= 3 ? { opacity: 1, scale: 1, display: 'block' } : { opacity: 0, scale: 0.8, display: 'none' }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <div className="flex items-center gap-[1vw] mb-[1vh] text-[var(--color-secondary)] font-bold text-[1.2vw]">
              <div className="w-[2vw] h-[2vw] rounded-full bg-[var(--color-secondary)]/20 flex items-center justify-center">R</div>
              Ravi Sir
            </div>
            Let's break it down! First, count the atoms on both sides. <br/>
            Notice we have 3 Fe atoms on the right, but only 1 on the left. What should we multiply the left Fe by?
          </motion.div>

        </div>

      </div>
    </motion.div>
  );
}
