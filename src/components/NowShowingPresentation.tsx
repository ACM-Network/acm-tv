import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Program, Channel } from '../types';
import { BrandingTheme } from '../types';

interface NowShowingPresentationProps {
  program: Program;
  channel: Channel;
  theme: BrandingTheme;
  onDismiss: () => void;
}

export default function NowShowingPresentation({ program, channel, theme, onDismiss }: NowShowingPresentationProps) {
  useEffect(() => {
    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [program.id, onDismiss]);

  const bgImage = program.backdrop || program.thumbnail;

  return (
    <div className="absolute inset-0 z-[100] pointer-events-none flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        <motion.div
          key="now-showing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 bg-black/80"
        />

        {bgImage && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 0.3, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
        )}

        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"
        />

        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="relative z-10 w-full max-w-5xl px-8 md:px-16 flex flex-col items-start justify-end pb-24 md:pb-32 h-full"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex items-center gap-3 mb-6"
          >
            <div 
              className="w-1.5 h-6 rounded-full"
              style={{ backgroundColor: theme.accentColor }}
            />
            <span className="text-white/80 font-mono text-sm md:text-base font-bold uppercase tracking-[0.2em]">
              Now Showing on {channel.name}
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight"
            style={{ textShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
          >
            {program.title}
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex items-center gap-4 text-white/70 text-sm md:text-lg font-medium"
          >
            <span className="px-2.5 py-1 bg-white/10 rounded-sm border border-white/20 uppercase tracking-wider text-xs md:text-sm">
              {program.category}
            </span>
            {program.year && (
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-white/50" />
                {program.year}
              </span>
            )}
            {program.duration > 0 && (
              <span className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-white/50" />
                {Math.round(program.duration / 60)} MIN
              </span>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
