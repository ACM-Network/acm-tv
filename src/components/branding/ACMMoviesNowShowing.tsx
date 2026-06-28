import React from 'react';
import { motion } from 'framer-motion';
import { Program, BrandingTheme } from '../../types';

interface Props {
  program: Program;
  theme: BrandingTheme;
  isVisible: boolean;
}

export default function ACMMoviesNowShowing({ program, theme, isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-start drop-shadow-2xl"
    >
      <div className="flex items-center gap-2 mb-1">
        {/* Luxury Gold Line Reveal */}
        <motion.div
          variants={{
            hidden: { width: 0, opacity: 0 },
            visible: { width: '20px', opacity: 1, transition: { duration: 1.2, ease: "easeInOut" } },
            exit: { width: 0, opacity: 0, transition: { duration: 0.5 } }
          }}
          className="h-[1px]"
          style={{ backgroundColor: theme.accentColor }}
        />
        <motion.span 
          variants={{
            hidden: { opacity: 0, filter: 'blur(4px)', y: 5 },
            visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { delay: 0.4, duration: 1.2, ease: "easeOut" } },
            exit: { opacity: 0, filter: 'blur(4px)', transition: { duration: 0.5 } }
          }}
          className="text-[10px] font-medium tracking-[0.3em] uppercase text-white/80"
        >
          NOW SHOWING
        </motion.span>
      </div>

      <div className="relative overflow-hidden pl-2 border-l border-white/20">
        {/* Light streak effect sweeping across */}
        <motion.div
          variants={{
            hidden: { left: '-100%', opacity: 0 },
            visible: { left: '200%', opacity: [0, 0.5, 0], transition: { delay: 0.8, duration: 2, ease: "linear" } },
            exit: { opacity: 0 }
          }}
          className="absolute top-0 bottom-0 w-[50px] z-20 pointer-events-none transform -skew-x-12"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${theme.accentColor}40, transparent)`,
            filter: 'blur(2px)'
          }}
        />

        <motion.h2 
          variants={{
            hidden: { opacity: 0, x: -20, filter: 'blur(8px)' },
            visible: { opacity: 1, x: 0, filter: 'blur(0px)', transition: { delay: 0.6, duration: 1.5, ease: [0.16, 1, 0.3, 1] } },
            exit: { opacity: 0, x: -10, filter: 'blur(4px)', transition: { duration: 0.6 } }
          }}
          className="text-lg sm:text-xl font-serif text-white tracking-wide py-0.5 line-clamp-1 max-w-[200px] sm:max-w-[300px]"
          style={{ textShadow: `0 0 10px ${theme.accentColor}40` }}
        >
          {program.title}
        </motion.h2>
      </div>
    </motion.div>
  );
}
