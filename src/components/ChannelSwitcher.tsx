"use client";

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Channel } from '@/types';

interface ChannelSwitcherProps {
  channels: Channel[];
  activeChannelId: string;
}

export default function ChannelSwitcher({ channels, activeChannelId }: ChannelSwitcherProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Convert vertical wheel scrolling to horizontal scrolling for desktop users
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // If pressing shift, let the browser handle it naturally
      if (e.shiftKey) return;
      
      // Prevent default vertical scroll and scroll horizontally instead
      if (e.deltaY !== 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Auto-scroll the active channel into view on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeChannelId]);

  return (
    <div className="w-full bg-signal-surface border-y md:border border-signal-border md:rounded-lg overflow-hidden flex flex-col shadow-sm">
      <div className="px-4 py-3 border-b border-signal-border flex items-center justify-between bg-signal-surface-raised">
        <h3 className="text-xs font-mono font-bold text-signal-text-secondary uppercase tracking-widest">
          Network Switcher
        </h3>
        <span className="text-[10px] text-signal-text-tertiary font-mono">
          {channels.length} NODES ONLINE
        </span>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex items-stretch overflow-x-auto snap-x snap-mandatory custom-scrollbar scroll-smooth p-2 md:p-4 gap-2 md:gap-4 touch-pan-x"
        aria-label="Channel Switcher"
      >
        {channels.map((ch) => {
          const isActive = ch.id === activeChannelId;

          return (
            <Link
              key={ch.id}
              href={`/live?channel=${ch.id}`}
              scroll={false} // Prevent page jump when switching
              data-active={isActive}
              className={`group relative flex-shrink-0 snap-center md:snap-start w-32 sm:w-40 h-28 sm:h-32 flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-amber focus-visible:ring-offset-2 focus-visible:ring-offset-signal-surface ${
                isActive
                  ? 'bg-signal-surface-raised border-signal-amber shadow-[0_0_15px_rgba(232,162,48,0.15)] z-10 scale-105'
                  : 'bg-signal-black border-signal-border hover:bg-signal-surface-hover hover:border-signal-border-active hover:shadow-md'
              }`}
            >
              {/* Active Indicator Glow inside */}
              {isActive && (
                <div className="absolute inset-0 bg-signal-amber/5 rounded-lg animate-pulse pointer-events-none"></div>
              )}

              {/* Channel Number / Label */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-sm bg-signal-black/50 border border-signal-border text-[9px] font-mono text-signal-text-tertiary group-hover:text-signal-text-secondary transition-colors">
                {ch.channelNumber ? `CH ${ch.channelNumber}` : 'NET'}
              </div>

              {/* Logo / Name */}
              <div className="flex-1 flex items-center justify-center w-full px-2 mt-4">
                {ch.logoUrl ? (
                  <img 
                    src={ch.logoUrl} 
                    alt={ch.name} 
                    className={`max-h-12 w-auto object-contain transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105'}`} 
                  />
                ) : (
                  <span className={`text-sm sm:text-base font-bold uppercase tracking-wide text-center transition-colors ${isActive ? 'text-signal-amber drop-shadow-sm' : 'text-signal-text-secondary group-hover:text-signal-text-primary'}`}>
                    {ch.name}
                  </span>
                )}
              </div>

              {/* Channel Category/Tagline below */}
              <div className={`mt-2 w-full text-center truncate text-[10px] font-mono transition-colors ${isActive ? 'text-signal-amber/80 font-bold' : 'text-signal-text-tertiary group-hover:text-signal-text-secondary'}`}>
                {ch.category || 'General'}
              </div>

              {/* Live Pip (Active Only) */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-signal-red rounded-full border-2 border-signal-surface-raised animate-pulse-live shadow-[0_0_8px_rgba(224,64,64,0.6)]"></div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
