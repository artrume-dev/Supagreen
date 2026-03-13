import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
    word1: 'WHOLE',
    word2: 'FOODS',
    color: 'text-primary'
  },
  {
    src: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80',
    word1: 'YOUR',
    word2: 'GOALS',
    color: 'text-[#F97316]'
  },
  {
    src: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
    word1: 'EVERY',
    word2: 'DAY',
    color: 'text-[#60A5FA]'
  }
];

export default function FoodShowcase() {
  const [index, setIndex] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    if (progressRef.current) {
      tl.fromTo(progressRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power2.out' });
    }

    tl.call(() => setIndex(1), [], 1.3);

    if (progressRef.current) {
      tl.fromTo(progressRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power2.out' }, 1.3);
    }

    tl.call(() => setIndex(2), [], 2.6);

    if (progressRef.current) {
      tl.fromTo(progressRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power2.out' }, 2.6);
    }

    return () => { tl.kill(); };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className="absolute inset-0 z-10 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 0.5 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="absolute inset-0 w-full h-full"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6, ease: "circOut" }}
        >
          <img 
            src={IMAGES[index].src} 
            alt="Food" 
            className="w-full h-full object-cover opacity-60"
          />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <motion.div 
              initial={{ y: 50, opacity: 0, rotateX: 30, transformPerspective: 1000 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
              className={`font-display text-[14vw] leading-[0.8] tracking-tighter text-white font-bold italic`}
            >
              {IMAGES[index].word1}
            </motion.div>
            
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 400, damping: 25 }}
              className={`font-display text-[16vw] leading-[0.8] tracking-tighter font-bold uppercase mt-2 ${IMAGES[index].color}`}
            >
              {IMAGES[index].word2}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-white/20 rounded-full overflow-hidden z-20">
        <div 
          ref={progressRef}
          className="h-full bg-white rounded-full origin-left"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </motion.div>
  );
}
