import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video/animations';

export default function HookOpener() {
  const line1 = "YOUR AI";
  const line2 = "CHEF IS";
  const line3 = "HERE.";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: {
      opacity: 0,
      scale: 1.1,
      filter: 'blur(10px)',
      transition: { duration: 0.4, ease: 'circIn' }
    }
  };

  const wordVariants = {
    hidden: { y: 100, opacity: 0, rotateX: -45 },
    visible: {
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    }
  };

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="flex flex-col items-center justify-center font-display text-[12vw] leading-[0.85] tracking-tight font-bold uppercase text-center w-full perspective-[1000px]">
        <div className="overflow-hidden w-full pb-2">
          <motion.div variants={wordVariants} className="text-white">
            {line1}
          </motion.div>
        </div>
        <div className="overflow-hidden w-full pb-2 flex items-center justify-center">
          <motion.div 
            variants={wordVariants} 
            className="text-primary"
          >
            {line2}
          </motion.div>
        </div>
        <div className="overflow-hidden w-full pb-2">
          <motion.div variants={wordVariants} className="text-white">
            {line3}
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 0.8, ease: "circOut" }}
        className="w-1/2 h-2 bg-primary mt-6 rounded-full origin-left"
      />

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="mt-4 font-body font-medium text-[4vw] text-text-muted tracking-wide"
      >
        3 RECIPES. EVERY MORNING.
      </motion.p>
    </motion.div>
  );
}
