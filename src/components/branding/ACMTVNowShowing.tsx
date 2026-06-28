import React from 'react';
import { motion } from 'framer-motion';
import { Program, BrandingTheme } from '../../types';

interface Props {
  program: Program;
  theme: BrandingTheme;
  isVisible: boolean;
}

export default function ACMTVNowShowing({ program, theme, isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-start drop-shadow-lg"
    >
      <div className="relative overflow-hidden mb-1">
        <motion.div
          variants={{
            hidden: { x: '-100%' },
            visible: { x: '0%', transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
            exit: { x: '100%', transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] } }
          }}
          className="absolute inset-0 z-0"
          style={{ backgroundColor: theme.primaryColor }}
        />
        <motion.span 
          variants={{
            hidden: { opacity: 0, x: -10 },
            visible: { opacity: 1, x: 0, transition: { delay: 0.2, duration: 0.4 } },
            exit: { opacity: 0, transition: { duration: 0.2 } }
          }}
          className="relative z-10 text-[11px] font-black tracking-[0.2em] uppercase px-2 py-0.5"
          style={{ color: theme.accentColor }}
        >
          NOW
        </motion.span>
      </div>

      <div className="relative overflow-hidden">
        <motion.div
          variants={{
            hidden: { scaleX: 0, originX: 0 },
            visible: { scaleX: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
            exit: { scaleX: 0, originX: 1, transition: { duration: 0.4 } }
          }}
          className="absolute inset-0 z-0"
          style={{ backgroundColor: theme.accentColor }}
        />
        <motion.h2 
          variants={{
            hidden: { y: '100%' },
            visible: { y: '0%', transition: { delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
            exit: { y: '-100%', transition: { duration: 0.3 } }
          }}
          className="relative z-10 text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider px-2 py-1 line-clamp-1 max-w-[200px] sm:max-w-[300px]"
        >
          {program.title}
        </motion.h2>
      </div>
      
      {/* HUD Accent Line */}
      <motion.div 
        variants={{
          hidden: { width: 0, opacity: 0 },
          visible: { width: '100%', opacity: 1, transition: { delay: 0.5, duration: 0.8, ease: "easeOut" } },
          exit: { width: 0, opacity: 0, transition: { duration: 0.3 } }
        }}
        className="h-[2px] mt-1 bg-white/50"
      />
    </motion.div>
  );
}
