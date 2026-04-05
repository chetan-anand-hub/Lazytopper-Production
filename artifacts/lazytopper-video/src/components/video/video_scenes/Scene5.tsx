import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      {...sceneTransitions.clipPolygon}
    >
      <div className="w-[80vw] flex flex-col items-center">
        
        <motion.h2 
          className="text-[3.5vw] font-display font-bold text-center mb-[4vh]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Expert guidance, <span className="text-[var(--color-secondary)]">24/7.</span>
        </motion.h2>

        <div className="w-[60vw] bg-[var(--color-bg-light)] rounded-3xl border border-white/10 p-[2vw] flex flex-col gap-[2vh] shadow-2xl">
          
          {/* User Message */}
          <motion.div 
            className="self-end bg-[var(--color-bg-muted)] text-white p-[1.5vw] rounded-2xl rounded-tr-sm max-w-[80%] text-[1.4vw]"
            initial={{ opacity: 0, scale: 0.8, transformOrigin: 'top right' }}
            animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            I still don't get Ohm's Law. Can you explain it simply?
          </motion.div>

          {/* AI Typing Indicator */}
          <motion.div 
            className="self-start bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] p-[1.5vw] rounded-2xl rounded-tl-sm text-[1.4vw] flex gap-2 items-center"
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
            className="self-start bg-[var(--color-secondary)]/20 text-white p-[1.5vw] rounded-2xl rounded-tl-sm max-w-[85%] text-[1.4vw] border border-[var(--color-secondary)]/30"
            initial={{ opacity: 0, scale: 0.8, transformOrigin: 'top left' }}
            animate={phase >= 3 ? { opacity: 1, scale: 1, display: 'block' } : { opacity: 0, scale: 0.8, display: 'none' }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <div className="flex items-center gap-[1vw] mb-[1vh] text-[var(--color-secondary)] font-bold text-[1.2vw]">
              <div className="w-[2vw] h-[2vw] rounded-full bg-[var(--color-secondary)]/20 flex items-center justify-center">M</div>
              Mentor
            </div>
            Think of it like water in a pipe! <br/>
            Voltage (V) is the water pressure pushing the water. <br/>
            Current (I) is how much water is flowing. <br/>
            Resistance (R) is how narrow the pipe is.
          </motion.div>

        </div>

      </div>
    </motion.div>
  );
}
