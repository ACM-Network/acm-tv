import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgramInstance, Channel, BrandingTheme } from '../types';

interface ComingUpNextPresentationProps {
  upNext: ProgramInstance;
  channel: Channel;
  theme: BrandingTheme;
  timeRemaining: number; // in seconds
  onDismiss: () => void;
}

export default function ComingUpNextPresentation({ upNext, channel, theme, timeRemaining, onDismiss }: ComingUpNextPresentationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto dismiss if timeRemaining is <= 0 or if 10 seconds have passed.
    // The parent controls mounting, but we can manage local exit animation state.
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 800); // Wait for exit animation
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const poster = upNext.program.thumbnail || upNext.program.backdrop;

  return (
    <div className="absolute bottom-16 right-16 z-[100] pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-row items-center gap-0 overflow-hidden rounded-lg shadow-2xl bg-black/90 border border-white/10 backdrop-blur-md max-w-[500px]"
          >
            {/* Poster Section */}
            {poster && (
              <div className="relative w-32 h-44 flex-shrink-0 bg-zinc-900">
                <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${poster})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/90" />
              </div>
            )}

            {/* Content Section */}
            <div className="flex flex-col justify-center px-6 py-4 flex-1 h-full min-w-[280px]">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col gap-1"
              >
                <div className="flex justify-between items-center mb-1">
                  <span 
                    className="text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: theme.accentColor }}
                  >
                    Coming Up Next
                  </span>
                  <span className="text-[10px] font-mono text-white/50 bg-white/10 px-1.5 py-0.5 rounded-sm">
                    {Math.max(0, Math.floor(timeRemaining))}s
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white leading-tight line-clamp-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {upNext.program.title}
                </h3>
                
                <div className="flex items-center gap-2 mt-2 text-xs font-medium text-white/70 uppercase tracking-wider">
                  <span className="text-white/90">{upNext.startTimeFormatted}</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span>{channel.name}</span>
                </div>
              </motion.div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="h-full"
                  style={{ backgroundColor: theme.accentColor }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
