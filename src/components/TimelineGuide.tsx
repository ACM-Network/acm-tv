"use client";

import React, { useState, useEffect } from 'react';
import { Tv, AlertCircle, Play } from 'lucide-react';
import Link from 'next/link';
import { Channel, ProgramInstance } from '../types';
import { getDailyTimeline } from '../utils/scheduleEngine';

interface TimelineGuideProps {
  channel: Channel;
}

export default function TimelineGuide({ channel }: TimelineGuideProps) {
  const [timeline, setTimeline] = useState<ProgramInstance[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    setTimeout(() => {
      setCurrentTimeMs(Date.now());
      setTimeline(getDailyTimeline(channel, Date.now()));
    }, 0);

    const interval = setInterval(() => {
      setCurrentTimeMs(Date.now());
      setTimeline(getDailyTimeline(channel, Date.now()));
    }, 10000);

    return () => clearInterval(interval);
  }, [channel]);

  const categories = ['all', 'content', 'trailer', 'song', 'promo', 'ident'];

  const filteredTimeline = timeline.filter(item => {
    if (activeFilter === 'all') return true;
    return item.program.type === activeFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-signal-border pb-4">
        <span className="text-xs font-bold text-signal-text-secondary font-mono uppercase tracking-widest mr-2">FILTER:</span>
        {categories.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-2.5 py-1 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition-colors border ${
              activeFilter === filter
                ? 'bg-signal-amber-dim text-signal-amber border-signal-border-active'
                : 'bg-signal-surface text-signal-text-secondary border-signal-border hover:text-signal-text-primary hover:bg-signal-surface-hover'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="relative border-l border-signal-border ml-4 md:ml-32 pl-6 md:pl-8 space-y-6">
        {filteredTimeline.map((item) => {
          const isLive = currentTimeMs >= item.startTime && currentTimeMs < item.endTime;
          const isPast = currentTimeMs >= item.endTime;

          return (
            <div 
              key={item.instanceId}
              className={`relative transition-colors duration-300 ${
                isLive 
                  ? 'bg-signal-surface border border-l-4 border-l-signal-red border-signal-border rounded-md p-4 md:p-5' 
                  : isPast 
                    ? 'opacity-50 hover:opacity-75' 
                    : 'hover:bg-signal-surface-hover rounded-md border border-transparent p-4'
              }`}
            >
              <div className={`absolute -left-[31px] md:-left-[39px] top-6 w-3 h-3 rounded-sm border ${
                isLive 
                  ? 'bg-signal-red border-signal-red animate-pulse-live' 
                  : isPast 
                    ? 'bg-signal-black border-signal-border' 
                    : 'bg-signal-surface border-signal-border'
              }`} />

              <div className="hidden md:block absolute -left-36 top-5 w-28 text-right font-mono">
                <span className={`text-sm font-bold ${isLive ? 'text-signal-red' : 'text-signal-text-secondary'}`}>
                  {item.startTimeFormatted}
                </span>
                <span className="block text-[10px] text-signal-text-tertiary mt-0.5">
                  DUR: {Math.round(item.program.duration / 60)}M
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:hidden mb-2">
                <span className={`text-sm font-mono font-bold ${isLive ? 'text-signal-red' : 'text-signal-text-secondary'}`}>
                  {item.startTimeFormatted}
                </span>
                <span className="text-[10px] text-signal-border">•</span>
                <span className="text-[10px] text-signal-text-tertiary font-mono">
                  DUR: {Math.round(item.program.duration / 60)}M
                </span>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-start">
                {!isPast && (
                  <div className="relative w-full md:w-40 aspect-video rounded-sm overflow-hidden bg-signal-black border border-signal-border flex-shrink-0">
                    <img 
                      src={item.program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=200"} 
                      alt={item.program.title}
                      className="w-full h-full object-cover opacity-75"
                    />
                    {isLive && (
                      <span className="absolute top-1.5 left-1.5 flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-sm bg-signal-red opacity-75"></span>
                        <span className="relative inline-flex rounded-sm h-1.5 w-1.5 bg-signal-red"></span>
                      </span>
                    )}
                  </div>
                )}

                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase tracking-wider border ${
                      isLive 
                        ? 'bg-signal-red-dim text-signal-red border-signal-red/30' 
                        : 'bg-signal-black text-signal-text-secondary border-signal-border'
                    }`}>
                      {item.program.type}
                    </span>
                    <span className="text-[10px] text-signal-text-tertiary font-mono font-bold uppercase tracking-wider">
                      {item.program.category}
                    </span>
                    {isLive && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-signal-red tracking-wider uppercase">
                        <Tv className="w-3 h-3" />
                        <span>LIVE</span>
                      </span>
                    )}
                  </div>

                  <h4 className={`text-base font-bold tracking-tight leading-snug truncate ${
                    isLive ? 'text-signal-red' : 'text-signal-text-primary'
                  }`}>
                    {item.program.title}
                  </h4>

                  <p className="text-xs text-signal-text-secondary font-medium leading-relaxed line-clamp-2 max-w-2xl">
                    {item.program.description}
                  </p>

                  {isLive && (
                    <div className="pt-2">
                      <Link 
                        href="/live"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-signal-amber-dim border border-signal-border-active text-signal-amber font-mono font-bold text-xs hover:bg-signal-surface-hover transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>TUNE IN</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {timeline.length === 0 && (
        <div className="text-center py-12 text-signal-text-secondary">
          <AlertCircle className="w-6 h-6 mx-auto text-signal-text-tertiary mb-3 animate-pulse" />
          <p className="text-xs font-mono">NO FEED DATA AVAILABLE</p>
        </div>
      )}
    </div>
  );
}
