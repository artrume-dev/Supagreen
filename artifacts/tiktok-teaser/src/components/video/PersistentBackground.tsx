import { motion } from 'framer-motion';

export default function PersistentBackground({ currentScene }: { currentScene: number }) {
  // We can animate the background elements based on the current scene.
  
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Abstract blurred blobs */}
      <motion.div
        className="absolute rounded-full bg-primary opacity-20 filter blur-[100px]"
        style={{ width: '80%', height: '80%' }}
        animate={{
          x: currentScene % 2 === 0 ? '-20%' : '40%',
          y: currentScene === 4 ? '50%' : currentScene === 1 ? '-20%' : '10%',
          scale: currentScene === 2 ? 1.5 : 1,
        }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />
      
      <motion.div
        className="absolute rounded-full bg-accent opacity-10 filter blur-[80px]"
        style={{ width: '60%', height: '60%' }}
        animate={{
          x: currentScene === 0 ? '60%' : currentScene === 3 ? '-20%' : '20%',
          y: currentScene === 2 ? '80%' : '40%',
          scale: currentScene === 1 ? 1.5 : 1,
        }}
        transition={{ duration: 4, ease: 'easeInOut' }}
      />

      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-10 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
