import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center"
      {...sceneTransitions.splitHorizontal}
    >
      {/* Background that shifts color based on mode */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ backgroundColor: "var(--color-bg-dark)" }}
        animate={{ backgroundColor: phase >= 2 ? "var(--color-bg-light)" : "var(--color-bg-dark)" }}
        transition={{ duration: 1 }}
      />

      <div className="relative z-10 w-[80vw] flex justify-between items-center gap-[4vw]">
        
        <div className="flex-1 flex flex-col gap-[2vh]">
          <motion.div 
            className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-[3vw]"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="flex justify-between items-center mb-[3vh]">
              <div className="text-[1.2vw] text-white/50 font-bold uppercase tracking-widest">HPQ Engine</div>
              <motion.div 
                className="px-[1.5vw] py-[0.5vh] rounded-full text-[1vw] font-bold"
                animate={{ 
                  backgroundColor: phase >= 2 ? "var(--color-accent)" : "var(--color-error)",
                  color: phase >= 2 ? "var(--color-bg-dark)" : "white"
                }}
              >
                {phase >= 2 ? "Zombie Mode" : "Beast Mode"}
              </motion.div>
            </div>

            {/* Simulated physics question */}
            <motion.div className="relative h-[20vh] border border-white/20 rounded-xl overflow-hidden bg-[var(--color-bg-muted)]/50 p-[2vw]">
              <div className="text-[1.5vw] font-medium leading-relaxed">
                {phase >= 2 ? "Simple recall: What is the formula for projectile range?" : "Calculate the exact angle of elevation for a projectile to hit a target at (x, y)."}
              </div>
              
              {/* Physics arc visual */}
              {phase < 2 && (
                <svg className="absolute bottom-0 left-0 w-full h-[10vh] opacity-50" viewBox="0 0 100 50">
                  <motion.path 
                    d="M 10 50 Q 50 -20 90 50" 
                    fill="none" 
                    stroke="var(--color-error)" 
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                  <circle cx="90" cy="50" r="3" fill="var(--color-error)" />
                </svg>
              )}
            </motion.div>
          </motion.div>
        </div>

        <div className="flex-1 pl-[4vw]">
          <motion.h2 
            className="text-[4.5vw] font-display font-bold leading-tight tracking-tighter"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Adapts to <br/>
            <span className="text-[var(--color-accent)]">your energy.</span>
          </motion.h2>
        </div>

      </div>
    </motion.div>
  );
}
