import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  target: 3500,
  topics: 3500,
  tutor: 4000,
  practice: 3500,
  celebration: 4500,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="w-full h-screen overflow-hidden relative bg-[var(--color-bg-dark)] font-body text-white">
      {/* Persistent Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute w-[80vw] h-[80vw] rounded-full opacity-20 blur-[100px]"
          style={{ background: 'radial-gradient(circle, var(--color-secondary), transparent)' }}
          animate={{ 
            x: ['-20%', '10%', '-10%'], 
            y: ['-20%', '0%', '-20%'],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }} 
        />
        <motion.div 
          className="absolute w-[60vw] h-[60vw] rounded-full opacity-10 blur-[80px] right-[-10%] bottom-[-10%]"
          style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
          animate={{ 
            x: ['10%', '-10%', '0%'], 
            y: ['10%', '-20%', '10%'],
            scale: [1, 1.1, 0.9, 1]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} 
        />
      </div>

      {/* Persistent UI Elements */}
      <motion.div 
        className="absolute top-[5vh] left-[4vw] font-display font-bold text-[2vw] tracking-tighter text-white z-50 flex items-center gap-[1vw]"
        animate={{ opacity: currentScene === 4 ? 0 : 1 }}
      >
        <div className="w-[2vw] h-[2vw] bg-[var(--color-primary)] rounded flex items-center justify-center text-white text-[1.2vw]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-[1.2vw] h-[1.2vw]"><path d="m13 2-2 2.5h3L11 22l2-2.5h-3L13 2z"/></svg>
        </div>
        LazyTopper
      </motion.div>

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="target" />}
        {currentScene === 1 && <Scene2 key="topics" />}
        {currentScene === 2 && <Scene3 key="tutor" />}
        {currentScene === 3 && <Scene4 key="practice" />}
        {currentScene === 4 && <Scene5 key="celebration" />}
      </AnimatePresence>
    </div>
  );
}
