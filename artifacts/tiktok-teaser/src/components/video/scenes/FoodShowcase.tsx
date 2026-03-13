import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
    word1: 'EAT',
    word2: 'WELL',
    color: 'text-primary'
  },
  {
    src: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80',
    word1: 'FEEL',
    word2: 'GREAT',
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

  useEffect(() => {
    setIndex(0);
    // 4000ms total. Let's do 1200ms per slide roughly
    const intervals = [
      setTimeout(() => setIndex(1), 1300),
      setTimeout(() => setIndex(2), 2600),
    ];
    return () => intervals.forEach(i => clearTimeout(i));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-10 bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)', transition: { duration: 0.5 } }}
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
            
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="h-3 w-1/3 bg-white mt-8 rounded-full"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
