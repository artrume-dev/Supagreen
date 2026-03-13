import { motion } from 'framer-motion';

export default function Outro() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-bg-dark"
      initial={{ scale: 0.8, opacity: 0, borderRadius: '100%' }}
      animate={{ scale: 1, opacity: 1, borderRadius: '0%' }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.5 }}
          className="w-32 h-32 bg-primary rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(34,197,94,0.4)] mb-8"
        >
          <span className="font-display text-bg-dark text-7xl font-bold mt-2">N</span>
        </motion.div>
        
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="font-display text-[14vw] tracking-tight text-white mb-2"
        >
          NutriSnap
        </motion.h1>
        
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 1.2, duration: 0.8, ease: "circOut" }}
          className="h-px bg-gradient-to-r from-transparent via-white/50 to-transparent w-3/4 mb-6"
        />

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="font-body text-[5vw] text-text-muted font-medium tracking-wide"
        >
          Eat well, every day.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 flex gap-3 px-4"
      >
        <div className="h-10 flex-1 min-w-0 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
          <div className="w-5 h-5 bg-white rounded-full opacity-50 mr-2 flex-shrink-0" />
          <span className="text-white font-body text-[3vw] whitespace-nowrap overflow-hidden">App Store</span>
        </div>
        <div className="h-10 flex-1 min-w-0 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
          <div className="w-5 h-5 bg-white rounded-sm opacity-50 mr-2 flex-shrink-0" />
          <span className="text-white font-body text-[3vw] whitespace-nowrap overflow-hidden">Google Play</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
