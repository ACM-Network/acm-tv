import React from 'react';
import { motion } from 'framer-motion';
import { Program, BrandingTheme } from '../../types';

interface Props {
  program: Program;
  theme: BrandingTheme;
  isVisible: boolean;
}

export default function ACMRCUNowShowing({ program, theme, isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-center justify-center relative drop-shadow-2xl"
    >
      {/* Epic Light Burst Background */}
      <motion.div 
        variants={{
          hidden: { opacity: 0, scale: 0.5 },
          visible: { 
            opacity: [0, 0.4, 0], 
            scale: [0.5, 2, 3],
            transition: { duration: 1.5, ease: "easeOut" }
          },
          exit: { opacity: 0 }
        }}
        className="absolute w-[150px] h-[50px] rounded-full blur-xl pointer-events-none"
        style={{ backgroundColor: theme.accentColor }}
      />

      <motion.div 
        variants={{
          hidden: { opacity: 0, scale: 1.5, filter: 'blur(10px)' },
          visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.8, ease: "easeOut" } },
          exit: { opacity: 0, scale: 1.1, filter: 'blur(10px)', transition: { duration: 0.4 } }
        }}
        className="text-center"
      >
        <span 
          className="text-[10px] font-black tracking-[0.4em] uppercase text-white/70 block mb-1"
          style={{ textShadow: `0 0 10px ${theme.accentColor}` }}
        >
          UNIVERSE
        </span>
        <h2 
          className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter px-2 line-clamp-1 max-w-[250px] sm:max-w-[400px]"
          style={{ 
            textShadow: `0 0 15px ${theme.accentColor}80, 0 4px 6px rgba(0,0,0,0.9)`,
            WebkitTextStroke: '1px rgba(255,255,255,0.2)'
          }}
        >
          {program.title}
        </h2>
      </motion.div>

      {/* Cinematic Letterbox Bars Effect */}
      <motion.div 
        variants={{
          hidden: { height: 0, opacity: 0 },
          visible: { height: '2px', opacity: 1, transition: { delay: 0.5, duration: 0.8, ease: "easeInOut" } },
          exit: { height: 0, opacity: 0, transition: { duration: 0.3 } }
        }}
        className="w-full mt-2 bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />
    </motion.div>
  );
}
