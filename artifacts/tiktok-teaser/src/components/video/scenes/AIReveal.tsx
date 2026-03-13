import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function AIReveal() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 800); // Show analyzing
    const t2 = setTimeout(() => setPhase(2), 1600); // Show generating
    const t3 = setTimeout(() => setPhase(3), 2200); // Show recipe card
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ y: '-100%', opacity: 0 }}
      transition={{ duration: 0.6, ease: "circOut" }}
    >
      {/* Top indicator */}
      <motion.div 
        className="absolute top-[10%] flex flex-col items-center"
        animate={{ y: phase >= 3 ? -100 : 0, opacity: phase >= 3 ? 0 : 1 }}
      >
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-12 h-12 border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full mb-4"
        />
        <p className="font-display text-[6vw] tracking-wider text-primary">
          {phase === 0 ? 'CONNECTING AI' : phase === 1 ? 'ANALYZING MACROS' : 'GENERATING RECIPE'}
        </p>
      </motion.div>

      {/* Recipe Card Reveal */}
      <AnimatePresence mode="wait">
        {phase >= 3 && (
          <motion.div
            initial={{ y: 200, opacity: 0, rotateX: 20, transformPerspective: 1000 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            className="w-full max-w-sm bg-bg-muted rounded-3xl p-5 shadow-2xl border border-white/10"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-primary/20 text-primary text-[3vw] px-3 py-1 rounded-full font-bold uppercase"
                >
                  Whole Foods • Tailored to You
                </motion.span>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="font-display text-[8vw] mt-2 leading-none text-white"
                >
                  AVOCADO SUPER BOWL
                </motion.h2>
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.4 }}
                className="w-14 h-14 rounded-full bg-primary flex flex-col items-center justify-center shrink-0"
              >
                <span className="font-display text-white text-[4.5vw] leading-none mt-1">9.4</span>
              </motion.div>
            </div>

            {/* Image */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full aspect-[4/3] rounded-2xl overflow-hidden relative mb-5"
            >
              <img 
                src="https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=600&q=80" 
                alt="Avocado bowl" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-[3vw] font-medium flex items-center gap-1">
                ⏱ 12 min
              </div>
            </motion.div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'PROTEIN', val: '24g', color: 'bg-primary' },
                { label: 'CARBS', val: '45g', color: 'bg-[#F97316]' },
                { label: 'FAT', val: '18g', color: 'bg-[#60A5FA]' }
              ].map((macro, i) => (
                <motion.div 
                  key={macro.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex flex-col items-center bg-black/30 rounded-xl py-3 border border-white/5"
                >
                  <div className={`w-3 h-3 rounded-full ${macro.color} mb-2`} />
                  <span className="text-[3vw] text-text-muted font-display tracking-wider">{macro.label}</span>
                  <span className="text-[4.5vw] font-bold text-white mt-1">{macro.val}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
