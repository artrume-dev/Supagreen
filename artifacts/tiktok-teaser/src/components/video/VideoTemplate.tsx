import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import HookOpener from './scenes/HookOpener';
import AIReveal from './scenes/AIReveal';
import FoodShowcase from './scenes/FoodShowcase';
import SocialProof from './scenes/SocialProof';
import Outro from './scenes/Outro';
import PersistentBackground from './PersistentBackground';

const SCENE_DURATIONS = {
  hook: 2500,
  aiReveal: 4000,
  foodShowcase: 4000,
  socialProof: 3000,
  outro: 4000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
    loop: true
  });

  return (
    <div className="w-full h-screen bg-black flex items-center justify-center overflow-hidden font-body text-text-primary">
      {/* 9:16 Portrait Container — height fills viewport, width derived from aspect ratio */}
      <div 
        className="relative overflow-hidden bg-bg-dark shadow-2xl" 
        style={{ 
          height: '100vh',
          width: 'calc(100vh * 9 / 16)',
          maxWidth: '100vw',
        }}
      >
        <PersistentBackground currentScene={currentScene} />

        <AnimatePresence mode="wait">
          {currentScene === 0 && <HookOpener key="hook" />}
          {currentScene === 1 && <AIReveal key="aiReveal" />}
          {currentScene === 2 && <FoodShowcase key="foodShowcase" />}
          {currentScene === 3 && <SocialProof key="socialProof" />}
          {currentScene === 4 && <Outro key="outro" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
