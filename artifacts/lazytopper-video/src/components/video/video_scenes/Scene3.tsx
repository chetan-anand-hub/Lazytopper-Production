import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const cards = [
    { title: "Concept Video", color: "var(--color-secondary)" },
    { title: "3 Must-Crack Questions", color: "var(--color-primary)" },
    { title: "1 Revision Card", color: "var(--color-accent)" },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      {...sceneTransitions.fadeBlur}
    >
      <div className="relative z-10 w-full max-w-[80vw] flex flex-col items-center">
        
        <motion.div
          className="text-[2vw] text-[var(--color-secondary)] font-medium mb-[1vh] uppercase tracking-widest"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Daily Focus Mix
        </motion.div>

        <motion.h2 
          className="text-[4.5vw] font-display font-bold leading-none tracking-tighter text-center mb-[6vh]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Your daily <br/>
          <span className="text-[var(--color-secondary)]">learning playlist.</span>
        </motion.h2>

        <div className="flex gap-[2vw] w-full justify-center mb-[4vh]">
          {cards.map((card, i) => (
            <motion.div 
              key={i}
              className="bg-[var(--color-bg-light)]/80 backdrop-blur-md border border-white/10 rounded-2xl p-[2vw] w-[22vw] h-[25vh] flex items-center justify-center text-center shadow-lg"
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={phase >= i + 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ borderTopColor: card.color, borderTopWidth: '4px' }}
            >
              <div className="text-[1.8vw] font-display font-bold" style={{ color: card.color }}>
                {card.title}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Play Button */}
        <motion.div
          className="w-[8vw] h-[8vw] bg-[var(--color-primary)] rounded-full flex items-center justify-center shadow-[0_0_40px_var(--color-primary)]"
          initial={{ opacity: 0, scale: 0 }}
          animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <motion.div
            animate={phase >= 5 ? { scale: 0.9 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-[4vw] h-[4vw] text-[var(--color-bg-dark)] ml-[0.5vw]">
              <path d="M8 5v14l11-7z" />
            </svg>
          </motion.div>
        </motion.div>

      </div>
    </motion.div>
  );
}
