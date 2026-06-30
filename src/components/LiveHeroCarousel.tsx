"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Play, Radio, Info } from 'lucide-react';
import { Channel, BroadcastState } from '@/types';

interface LiveHeroCarouselProps {
  channels: Channel[];
  networkStates: { [key: string]: BroadcastState };
}

export default function LiveHeroCarousel({ channels, networkStates }: LiveHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter only channels that have an active broadcast state to avoid blank slides
  const activeChannels = channels.filter(ch => networkStates[ch.id]?.currentProgram);

  useEffect(() => {
    if (!isPaused && activeChannels.length > 1) {
      timerRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % activeChannels.length);
      }, 8000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, activeChannels.length]);

  // Fallback if no channels are live
  if (!isMounted || activeChannels.length === 0) {
    return (
      <section className="relative flex flex-col justify-end h-[60vh] min-h-[450px] border-b border-signal-border bg-signal-surface overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-signal-border-active border-t-signal-amber rounded-full animate-spin"></div>
        </div>
      </section>
    );
  }

  return (
    <section 
      className="relative flex flex-col justify-end h-[60vh] min-h-[450px] md:min-h-[550px] border-b border-signal-border bg-signal-black overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-label="Live Broadcast Carousel"
    >
      {/* Background Matrix Pattern */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:32px_32px] z-0 pointer-events-none"></div>

      {activeChannels.map((channel, index) => {
        const isActive = index === activeIndex;
        const broadcastState = networkStates[channel.id];
        const program = broadcastState.currentProgram.program;
        
        // Priority for background: backdrop > thumbnail > channel standby > fallback gradient
        const bgImage = program.backdrop || program.thumbnail || channel.standbyArtwork || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2000";

        // Runtime formatting
        const durationMins = Math.round(program.duration / 60);

        return (
          <div 
            key={channel.id} 
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
            aria-hidden={!isActive}
          >
            {/* Cinematic Background with Ken Burns */}
            <div className={`absolute inset-0 bg-signal-black overflow-hidden ${isActive ? 'animate-[kenBurns_20s_ease-out_forwards]' : ''}`}>
              <img 
                src={bgImage} 
                alt={program.title}
                className={`w-full h-full object-cover mix-blend-luminosity md:mix-blend-normal transition-transform duration-[20s] ease-out ${isActive ? 'scale-110 opacity-30 md:opacity-40' : 'scale-100 opacity-0'}`}
              />
              {/* Complex gradients for cinematic depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-signal-black via-signal-black/80 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-signal-black via-signal-black/50 to-transparent w-full md:w-3/4"></div>
            </div>

            {/* Content Layer */}
            <div className="relative max-w-7xl mx-auto px-6 lg:px-8 w-full h-full z-20 flex flex-col justify-end pb-12 sm:pb-16 space-y-4 sm:space-y-6">
              
              {/* Top Row: Channel Logo + Live Badge */}
              <div className={`flex items-center gap-3 transition-all duration-700 delay-100 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                {channel.logoUrl ? (
                  <img src={channel.logoUrl} alt={channel.name} className="h-6 object-contain" />
                ) : (
                  <div className="px-2 py-1 bg-signal-surface border border-signal-border rounded-sm">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-signal-text-primary">{channel.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-signal-red-dim border border-signal-red/30">
                  <Radio className="w-3.5 h-3.5 text-signal-red animate-pulse-live" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-signal-red">LIVE</span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-3 max-w-3xl">
                <h2 className={`text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.1] transition-all duration-700 delay-200 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                  {program.title}
                </h2>
                
                <div className={`flex flex-wrap items-center gap-3 transition-all duration-700 delay-300 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                  <span className="px-2 py-0.5 rounded-sm bg-signal-surface border border-signal-border text-xs font-bold text-signal-amber uppercase tracking-widest shadow-sm">
                    {program.category}
                  </span>
                  <span className="text-xs font-mono text-signal-text-secondary">
                    {durationMins} MIN
                  </span>
                  <span className="text-xs font-mono text-signal-text-secondary">
                    •
                  </span>
                  <span className="text-xs font-mono text-signal-text-primary">
                    {broadcastState.currentProgram.startTimeFormatted} - {broadcastState.currentProgram.endTimeFormatted}
                  </span>
                </div>

                <p className={`text-sm sm:text-base text-signal-text-secondary max-w-2xl font-medium leading-relaxed line-clamp-2 md:line-clamp-3 transition-all duration-700 delay-400 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                  {program.description}
                </p>
              </div>

              {/* Actions */}
              <div className={`flex flex-wrap items-center gap-4 pt-4 transition-all duration-700 delay-500 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <Link 
                  href={`/live?channel=${channel.id}`} 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-white text-signal-black font-bold text-sm hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  tabIndex={isActive ? 0 : -1}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>WATCH LIVE</span>
                </Link>
                <button 
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-signal-surface/80 backdrop-blur-md border border-signal-border hover:bg-signal-surface hover:border-signal-border-active text-signal-text-primary font-bold text-sm transition-all duration-200"
                  tabIndex={isActive ? 0 : -1}
                >
                  <Info className="w-4 h-4" />
                  <span>DETAILS</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Indicators */}
      {activeChannels.length > 1 && (
        <div className="absolute bottom-6 right-6 lg:right-8 z-30 flex items-center gap-2">
          {activeChannels.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className="group py-2 px-1 focus:outline-none"
              aria-label={`Go to slide ${index + 1}`}
            >
              <div className={`h-1 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'w-6 bg-signal-amber' 
                  : 'w-2 bg-signal-border-active group-hover:bg-signal-text-tertiary'
              }`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
