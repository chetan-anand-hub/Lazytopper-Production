import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { sceneTransitions, charVariants } from '@/lib/video/animations';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      {...sceneTransitions.fadeBlur}
    >
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        
        {/* Floating Chaos Elements */}
        <motion.div className="absolute inset-0 pointer-events-none">
          <motion.div 
            className="absolute top-[20%] left-[20%] w-[15vw] h-[20vh] bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-[1vw] text-white/50 backdrop-blur-sm"
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >Math Notes.pdf</motion.div>
          <motion.div 
            className="absolute top-[60%] left-[10%] w-[20vw] h-[15vh] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 rounded-lg flex items-center justify-center text-[1vw] text-[var(--color-error)]/80 backdrop-blur-sm"
            animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >Overdue Assignment</motion.div>
          <motion.div 
            className="absolute top-[30%] right-[15%] w-[18vw] h-[25vh] bg-white/5 border border-white/10 rounded-lg flex flex-col items-center justify-center gap-2 backdrop-blur-sm"
            animate={{ y: [0, -30, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <div className="w-[80%] h-2 bg-white/20 rounded-full" />
            <div className="w-[60%] h-2 bg-white/20 rounded-full" />
            <div className="w-[90%] h-2 bg-white/20 rounded-full" />
          </motion.div>
        </motion.div>

        <motion.h1 
          className="text-[5vw] font-display font-bold leading-none tracking-tighter text-center z-20"
          initial="hidden"
          animate={phase >= 2 ? "visible" : "hidden"}
          variants={{
            visible: { transition: { staggerChildren: 0.05 } }
          }}
        >
          {"Board prep shouldn't".split(' ').map((word, i) => (
            <span key={i} className="inline-block mr-[1.5vw]">
              {word.split('').map((char, j) => (
                <motion.span key={j} className="inline-block" variants={charVariants}>{char}</motion.span>
              ))}
            </span>
          ))}
          <br/>
          {"feel like this.".split(' ').map((word, i) => (
            <span key={i} className="inline-block mr-[1.5vw] text-[var(--color-error)]">
              {word.split('').map((char, j) => (
                <motion.span key={j} className="inline-block" variants={charVariants}>{char}</motion.span>
              ))}
            </span>
          ))}
        </motion.h1>

        {phase >= 3 && (
          <motion.div 
            className="absolute bottom-[20%] w-[40vw] h-[10vh] bg-[var(--color-error)]/20 blur-[100px] rounded-full"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          />
        )}
      </div>
    </motion.div>
  );
}
