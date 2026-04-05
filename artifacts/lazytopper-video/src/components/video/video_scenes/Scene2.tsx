import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 1600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const topics = [
    { title: "Quadratic Equations", prob: "98%", color: "var(--color-primary)" },
    { title: "Carbon & Its Compounds", prob: "92%", color: "var(--color-secondary)" },
    { title: "Trigonometry Identities", prob: "89%", color: "var(--color-accent)" },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[70vw] flex justify-between items-center gap-[4vw]">
        
        <div className="flex-1">
          <motion.div
            className="text-[2vw] text-[var(--color-secondary)] font-medium mb-[1vh]"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Board Exam Trends
          </motion.div>
          <motion.h2 
            className="text-[4.5vw] font-display font-bold leading-tight tracking-tighter"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            AI reveals your <br/>
            <span className="text-[var(--color-primary)]">Must-Crack</span> topics.
          </motion.h2>
        </div>

        <div className="flex-1 flex flex-col gap-[2vh]">
          {topics.map((topic, i) => (
            <motion.div 
              key={i}
              className="bg-[var(--color-bg-light)]/80 backdrop-blur-md border border-white/10 rounded-2xl p-[2vw] flex justify-between items-center"
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={phase >= i + 1 ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <div>
                <div className="text-[1vw] text-white/50 uppercase tracking-widest font-bold mb-[0.5vh]">High Probability</div>
                <div className="text-[1.8vw] font-display font-bold">{topic.title}</div>
              </div>
              <motion.div 
                className="text-[2.5vw] font-display font-black"
                style={{ color: topic.color }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={phase >= i + 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                {topic.prob}
              </motion.div>
            </motion.div>
          ))}
        </div>

      </div>
    </motion.div>
  );
}
