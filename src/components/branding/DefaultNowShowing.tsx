import React from 'react';
import { motion } from 'framer-motion';
import { Program, BrandingTheme } from '../../types';

interface Props {
  program: Program;
  theme: BrandingTheme;
  isVisible: boolean;
}

export default function DefaultNowShowing({ program, theme, isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-start drop-shadow-md"
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, x: -20, scale: 0.98 },
          visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.6, ease: [0.215, 0.61, 0.355, 1] } },
          exit: { opacity: 0, x: -20, scale: 0.98, transition: { duration: 0.4 } }
        }}
        className="flex flex-col items-start gap-0.5"
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
    </motion.div>
  );
}
