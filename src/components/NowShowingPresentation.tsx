import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Program, Channel } from '../types';
import { BrandingTheme } from '../types';

interface NowShowingPresentationProps {
  program: Program;
  channel: Channel;
  theme: BrandingTheme;
}

export default function NowShowingPresentation({ program, channel, theme }: NowShowingPresentationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Reset to visible immediately when program changes
    setIsVisible(true);

    const runCycle = () => {
      // Stay visible for 5 seconds, then hide
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        
        // Stay hidden for 50 seconds, then show again
        const showTimer = setTimeout(() => {
          setIsVisible(true);
        }, 50000);
        
        return () => clearTimeout(showTimer);
      }, 5000);
      
      return () => clearTimeout(hideTimer);
    };

    // We need a robust interval that handles the full 55s cycle
    // A simpler way:
    // 0-5s: Visible
    // 5-55s: Hidden
    // Repeat every 55s
    
    const hideTimeout = setTimeout(() => setIsVisible(false), 5000);
    const interval = setInterval(() => {
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    }, 55000);

    return () => {
      clearTimeout(hideTimeout);
      clearInterval(interval);
    };
  }, [program.id]);

  return (
    <div className="absolute top-[24px] left-[24px] z-[100] pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="flex flex-col items-start gap-0.5 drop-shadow-md"
          >
            <span 
              className="text-[11px] font-bold tracking-[0.15em] uppercase px-1.5 py-0.5 rounded-sm bg-black/60 backdrop-blur-sm border border-white/10"
              style={{ color: theme.accentColor || '#fff' }}
            >
              NOW
            </span>
            <h2 
              className="text-sm sm:text-base font-bold text-white uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-black/40 backdrop-blur-sm border border-transparent line-clamp-1 max-w-[200px] sm:max-w-[300px]"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
            >
              {program.title}
            </h2>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
