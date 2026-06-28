import React from 'react';
import { motion } from 'framer-motion';
import { Program, BrandingTheme } from '../../types';

interface Props {
  program: Program;
  theme: BrandingTheme;
  isVisible: boolean;
}

export default function ACMMusicNowShowing({ program, theme, isVisible }: Props) {
  if (!isVisible) return null;

  // Staggered equalizer bars
  const bars = [1, 2, 3, 4];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-row items-center gap-3 drop-shadow-xl"
    >
      {/* Equalizer Icon */}
      <div className="flex items-end gap-[2px] h-[24px] pb-1">
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { height: '2px', opacity: 0 },
              visible: { 
                height: ['2px', `${10 + (i * 3 + 7) % 14}px`, '2px'],
                opacity: 1,
                transition: { 
                  opacity: { duration: 0.3, delay: i * 0.1 },
                  height: { repeat: Infinity, duration: 0.4 + (i * 0.1), ease: "easeInOut", repeatType: "mirror" }
                } 
              },
              exit: { height: '2px', opacity: 0, transition: { duration: 0.2 } }
            }}
            className="w-[4px] rounded-t-sm"
            style={{ 
              backgroundColor: i % 2 === 0 ? theme.accentColor : theme.primaryColor,
              boxShadow: `0 0 8px ${i % 2 === 0 ? theme.accentColor : theme.primaryColor}`
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-start justify-center">
        <motion.span 
          variants={{
            hidden: { opacity: 0, x: -10 },
            visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 20, delay: 0.1 } },
            exit: { opacity: 0, x: -10, transition: { duration: 0.2 } }
          }}
          className="text-[9px] font-black tracking-[0.25em] uppercase text-white/90"
          style={{ textShadow: `0 0 5px ${theme.accentColor}` }}
        >
          NOW PLAYING
        </motion.span>
        <motion.h2 
          variants={{
            hidden: { opacity: 0, scale: 0.9, y: 5 },
            visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 25, delay: 0.2 } },
            exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
          }}
          className="text-sm sm:text-base font-bold text-white uppercase tracking-wider line-clamp-1 max-w-[200px] sm:max-w-[300px]"
        >
          {program.title}
        </motion.h2>
      </div>
    </motion.div>
  );
}
