import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Program, Channel, BrandingTheme } from '../types';
import ACMTVNowShowing from './branding/ACMTVNowShowing';
import ACMMoviesNowShowing from './branding/ACMMoviesNowShowing';
import ACMMusicNowShowing from './branding/ACMMusicNowShowing';
import ACMRCUNowShowing from './branding/ACMRCUNowShowing';
import DefaultNowShowing from './branding/DefaultNowShowing';

interface NowShowingPresentationProps {
  program: Program;
  channel: Channel;
  theme: BrandingTheme;
}

export default function NowShowingPresentation({ program, channel, theme }: NowShowingPresentationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const innerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset to visible immediately when program changes
    // eslint-disable-next-line
    setIsVisible(true);

    const hideTimeout = setTimeout(() => setIsVisible(false), 5000);
    const interval = setInterval(() => {
      setIsVisible(true);
      // Track the inner timer so it can be cancelled on unmount
      innerTimerRef.current = setTimeout(() => setIsVisible(false), 5000);
    }, 55000);

    return () => {
      clearTimeout(hideTimeout);
      clearInterval(interval);
      // Cancel the inner timer to prevent state updates on unmounted component
      if (innerTimerRef.current) {
        clearTimeout(innerTimerRef.current);
      }
    };
  }, [program.id]);

  // Router to determine which premium broadcast package to use
  const renderBrandingPackage = () => {
    const props = { program, theme, isVisible };
    switch (channel.id) {
      case 'acm-tv':
        return <ACMTVNowShowing {...props} />;
      case 'acm-movies':
        return <ACMMoviesNowShowing {...props} />;
      case 'acm-music':
        return <ACMMusicNowShowing {...props} />;
      case 'acm-rcu':
        return <ACMRCUNowShowing {...props} />;
      default:
        return <DefaultNowShowing {...props} />;
    }
  };

  return (
    <div className="absolute top-[24px] left-[24px] z-[100] pointer-events-none">
      <AnimatePresence>
        {renderBrandingPackage()}
      </AnimatePresence>
    </div>
  );
}
