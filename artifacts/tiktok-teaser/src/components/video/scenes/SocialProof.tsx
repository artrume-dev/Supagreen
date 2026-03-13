import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

function Counter({ from, to, suffix, duration }: { from: number, to: number, suffix: string, duration: number }) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    let start = performance.now();
    let frameId: number;

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * (to - from) + from));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        // Force precision for floats if needed, but we pass integers and divide if it's rating
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [from, to, duration]);

  return (
    <div className="flex items-baseline font-display text-white">
      <span className="text-[18vw] leading-none">
        {to === 49 ? (count / 10).toFixed(1) : count}
      </span>
      <span className="text-[8vw] text-primary ml-1 leading-none">{suffix}</span>
    </div>
  );
}

export default function SocialProof() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-8 py-12"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="w-full flex flex-col gap-10">
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center bg-bg-muted/80 backdrop-blur-md rounded-3xl p-6 border border-white/5"
        >
          <Counter from={0} to={50} suffix="k+" duration={1500} />
          <p className="font-body text-text-muted text-[4vw] tracking-widest uppercase mt-2">Active Users</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col items-center bg-bg-muted/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden"
        >
          {/* Subtle glow behind rating */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#F97316]/20 blur-3xl rounded-full" />
          
          <Counter from={0} to={49} suffix="★" duration={1500} />
          <p className="font-body text-text-muted text-[4vw] tracking-widest uppercase mt-2">App Store Rating</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col items-center bg-bg-muted/80 backdrop-blur-md rounded-3xl p-6 border border-white/5"
        >
          <Counter from={0} to={2} suffix=".1M" duration={1500} />
          <p className="font-body text-text-muted text-[4vw] tracking-widest uppercase mt-2">Recipes Generated</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
