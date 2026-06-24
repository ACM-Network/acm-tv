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

    // Keep times updated
    const interval = setInterval(() => {
      setCurrentTimeMs(Date.now());
      setTimeline(getDailyTimeline(channel, Date.now()));
    }, 10000);

    return () => clearInterval(interval);
  }, [channel]);

  // Categories list for filtering
  const categories = ['all', 'content', 'trailer', 'song', 'promo', 'ident'];

  const filteredTimeline = timeline.filter(item => {
    if (activeFilter === 'all') return true;
    return item.program.type === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-5">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2">Filter Feed:</span>
        {categories.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
              activeFilter === filter
                ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/10'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-850'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Timeline Layout */}
      <div className="relative border-l border-zinc-800 ml-4 md:ml-32 pl-6 md:pl-8 space-y-6">
        {filteredTimeline.map((item) => {
          const isLive = currentTimeMs >= item.startTime && currentTimeMs < item.endTime;
          const isPast = currentTimeMs >= item.endTime;

          return (
            <div 
              key={item.instanceId}
              className={`relative transition-all duration-300 ${
                isLive 
                  ? 'bg-gradient-to-r from-amber-500/5 via-transparent to-transparent border border-l-4 border-l-amber-500 border-zinc-800 rounded-2xl p-5 md:p-6 shadow-xl shadow-amber-500/[0.01]' 
                  : isPast 
                    ? 'opacity-40 hover:opacity-60' 
                    : 'hover:bg-zinc-900/10 hover:border-zinc-800 rounded-2xl border border-transparent p-4'
              }`}
            >
              {/* Timeline dot / active indicator */}
              <div className={`absolute -left-[31px] md:-left-[39px] top-7 w-4 h-4 rounded-full border-2 ${
                isLive 
                  ? 'bg-amber-500 border-black animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                  : isPast 
                    ? 'bg-zinc-800 border-black' 
                    : 'bg-zinc-900 border-zinc-700'
              }`} />

              {/* Time display for Desktop (on the left of the vertical line) */}
              <div className="hidden md:block absolute -left-36 top-5 w-28 text-right font-mono">
                <span className={`text-sm font-black ${isLive ? 'text-amber-500' : 'text-zinc-400'}`}>
                  {item.startTimeFormatted}
                </span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">
                  Duration: {Math.round(item.program.duration / 60)}m
                </span>
              </div>

              {/* Mobile Time / Meta */}
              <div className="flex flex-wrap items-center gap-2 md:hidden mb-2.5">
                <span className={`text-sm font-mono font-bold ${isLive ? 'text-amber-500' : 'text-zinc-300'}`}>
                  {item.startTimeFormatted}
                </span>
                <span className="text-[10px] text-zinc-500">•</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {Math.round(item.program.duration / 60)}m
                </span>
              </div>

              {/* Content Card Body */}
              <div className="flex flex-col md:flex-row gap-5 items-start">
                {/* Thumbnail (only for live or upcoming) */}
                {!isPast && (
                  <div className="relative w-full md:w-44 aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800/80 flex-shrink-0">
                    <img 
                      src={item.program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=200"} 
                      alt={item.program.title}
                      className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    {isLive && (
                      <span className="absolute top-2 left-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </div>
                )}

                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      isLive 
                        ? 'bg-amber-500 text-black font-bold' 
                        : 'bg-zinc-850 text-zinc-400 border border-zinc-800'
                    }`}>
                      {item.program.type}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {item.program.category}
                    </span>
                    {isLive && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-red-500 tracking-wider uppercase">
                        <Tv className="w-3.5 h-3.5" />
                        <span>LIVE NOW</span>
                      </span>
                    )}
                  </div>

                  <h4 className={`text-base md:text-lg font-black tracking-tight leading-snug truncate ${
                    isLive ? 'text-amber-500' : 'text-white'
                  }`}>
                    {item.program.title}
                  </h4>

                  <p className="text-xs text-zinc-400 font-medium leading-relaxed max-w-2xl">
                    {item.program.description}
                  </p>

                  {/* Actions for Live now card */}
                  {isLive && (
                    <div className="pt-2">
                      <Link 
                        href="/live"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-md shadow-amber-500/10 hover:bg-amber-600 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>WATCH BROADCAST LIVE</span>
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
        <div className="text-center py-12 text-zinc-500">
          <AlertCircle className="w-8 h-8 mx-auto text-zinc-700 mb-3 animate-pulse" />
          <p className="text-sm">No programs scheduled on this feed today.</p>
        </div>
      )}
    </div>
  );
}
